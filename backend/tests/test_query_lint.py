"""
Static lint rule: every `db.query(<CustomerTable>)` must be followed by
`.filter(<CustomerTable>.org_id == ...)` before the query terminator.

Catches regressions where a developer writes a query that scopes by id
or asin alone, without the org_id check — exactly the leak class that
RLS exists to backstop. With this lint, application-level filtering
stays correct even before any RLS test ever runs.

Status in PR C-1: marked `@pytest.mark.skip` so it ships visibly but
does not gate CI yet. PR C-2 removes the marker and adds a CI workflow
that runs this on every push to main.

Allowlist:
    backend/tests/org_filter_allowlist.txt
Each entry is a single line in the form `path/to/file.py:lineno`,
followed by `# reason: <short justification>`. Entries without a
reason comment are rejected (the lint test fails). This forces every
exception to be documented at the point where it's allowed.

Method:
    1. Walk every backend/*.py (skipping tests/, alembic/, migrations/,
       __pycache__).
    2. For each `db.query(C)` call where C is a class exported by
       models.py and has an `org_id` Column, walk forward in the AST
       to the next terminator (.all/.first/.one/.count/.delete/.update/
       .scalar/.scalars).
    3. Assert that at least one .filter(...) between query and
       terminator references C.org_id.
    4. Sites that fail are checked against the allowlist; entries
       without a reason comment fail the test outright.
"""
from __future__ import annotations

import ast
from pathlib import Path
from typing import Iterator, Set, Tuple

import pytest


SKIP_REASON = "RLS enforcement (and this lint as a CI gate) lands in PR C-2"

REPO_ROOT = Path(__file__).resolve().parents[2]
BACKEND_ROOT = REPO_ROOT / "backend"
ALLOWLIST = REPO_ROOT / "backend" / "tests" / "org_filter_allowlist.txt"

# Directories under backend/ that the lint skips. tests/ is skipped to
# avoid lint-on-self; alembic/ is skipped because it runs as
# migration_role; __pycache__ is artifacts.
SKIPPED_DIRS = {"tests", "alembic", "__pycache__"}


def _load_canonical_models_with_org_id() -> Set[str]:
    """
    Returns the set of class names in models.py that have an `org_id`
    column. Computed at test time by parsing models.py — keeps the
    lint in lockstep with the schema without a hardcoded list.
    """
    models_path = BACKEND_ROOT / "models.py"
    tree = ast.parse(models_path.read_text(encoding="utf-8"))
    classes_with_org_id: Set[str] = set()

    for node in ast.walk(tree):
        if isinstance(node, ast.ClassDef):
            for stmt in node.body:
                if (
                    isinstance(stmt, ast.Assign)
                    and len(stmt.targets) == 1
                    and isinstance(stmt.targets[0], ast.Name)
                    and stmt.targets[0].id == "org_id"
                ):
                    classes_with_org_id.add(node.name)
                    break
    return classes_with_org_id


def _iter_backend_py_files() -> Iterator[Path]:
    for p in BACKEND_ROOT.rglob("*.py"):
        # Skip files under any directory in SKIPPED_DIRS at any depth.
        if any(part in SKIPPED_DIRS for part in p.relative_to(BACKEND_ROOT).parts):
            continue
        yield p


_TERMINATORS = {
    "all", "first", "one", "one_or_none", "count", "delete",
    "update", "scalar", "scalars", "exists",
}


def _has_org_id_filter(call_chain: ast.AST, model_name: str) -> bool:
    """
    Walks an attribute chain from .query(M) to the terminator, looking
    for a .filter(...) whose argument compares M.org_id to anything.
    Returns True if such a filter is found anywhere in the chain.
    """
    node = call_chain
    while isinstance(node, ast.Call) and isinstance(node.func, ast.Attribute):
        attr = node.func.attr
        if attr == "filter":
            for arg in node.args:
                if _filter_arg_references_org_id(arg, model_name):
                    return True
        node = node.func.value
    return False


def _filter_arg_references_org_id(arg: ast.AST, model_name: str) -> bool:
    """
    True if the AST node references `<model_name>.org_id` (e.g.,
    Client.org_id == user.org_id, or Client.org_id == 1).
    """
    for sub in ast.walk(arg):
        if (
            isinstance(sub, ast.Attribute)
            and sub.attr == "org_id"
            and isinstance(sub.value, ast.Name)
            and sub.value.id == model_name
        ):
            return True
    return False


def _find_unsafe_query_sites(canonical: Set[str]) -> Iterator[Tuple[Path, int, str]]:
    """
    Yields (file, line, model_name) for every db.query(<canonical>)
    call that is NOT followed by a .filter on <canonical>.org_id.
    """
    for py_file in _iter_backend_py_files():
        try:
            tree = ast.parse(py_file.read_text(encoding="utf-8"), filename=str(py_file))
        except SyntaxError:
            continue

        # Find every .query(M) invocation, then walk OUT to find the
        # full chain rooted at it. We do this by collecting Call nodes
        # whose .func is .query, then look up the parent chain.
        query_sites: list[Tuple[ast.Call, str]] = []

        class QueryFinder(ast.NodeVisitor):
            def visit_Call(self, node: ast.Call) -> None:
                if (
                    isinstance(node.func, ast.Attribute)
                    and node.func.attr == "query"
                    and node.args
                    and isinstance(node.args[0], ast.Name)
                    and node.args[0].id in canonical
                ):
                    query_sites.append((node, node.args[0].id))
                self.generic_visit(node)

        QueryFinder().visit(tree)

        # For each query site, find the enclosing terminator-bearing
        # call chain. The simplest approach: walk the whole tree
        # collecting all Call chains whose .query(M) appears anywhere,
        # and check the chain's filters.
        for q_call, model_name in query_sites:
            chain_root = _outermost_call_chain(tree, q_call)
            if chain_root is None:
                # No terminator — query result might be passed around.
                # Conservative: flag as needing review.
                yield py_file, q_call.lineno, model_name
                continue
            if not _has_org_id_filter(chain_root, model_name):
                yield py_file, q_call.lineno, model_name


def _outermost_call_chain(tree: ast.AST, query_call: ast.Call) -> ast.Call | None:
    """
    Find the outermost Call node whose attribute chain transitively
    includes `query_call` and ends in a terminator method. Returns the
    outer Call; the caller walks its filters.
    """
    best: ast.Call | None = None
    for node in ast.walk(tree):
        if not isinstance(node, ast.Call):
            continue
        # Does this Call reach query_call by walking .func.value?
        cursor: ast.AST = node
        while isinstance(cursor, ast.Call) and isinstance(cursor.func, ast.Attribute):
            if cursor is query_call:
                # node is an outer wrapper of query_call — keep if it
                # ends in a terminator.
                if (
                    isinstance(node.func, ast.Attribute)
                    and node.func.attr in _TERMINATORS
                ):
                    best = node
                break
            cursor = cursor.func.value
    return best


def _load_allowlist() -> Set[Tuple[str, int]]:
    """
    Returns the set of (relative_file, lineno) entries in the
    allowlist. Each line in the file must contain a `# reason:` comment.
    """
    allowed: Set[Tuple[str, int]] = set()
    if not ALLOWLIST.exists():
        return allowed
    for raw in ALLOWLIST.read_text(encoding="utf-8").splitlines():
        line = raw.split("#", 1)[0].strip()
        if not line:
            continue
        if "# reason:" not in raw and "#reason:" not in raw.replace(" ", ""):
            pytest.fail(
                f"Allowlist entry {line!r} has no `# reason:` comment. "
                "Every exception must be documented."
            )
        try:
            path, lineno = line.rsplit(":", 1)
            allowed.add((path.strip(), int(lineno)))
        except ValueError:
            pytest.fail(f"Malformed allowlist entry: {raw!r}")
    return allowed


@pytest.mark.skip(reason=SKIP_REASON)
def test_canonical_query_sites_filter_by_org_id():
    """
    Every db.query(<CanonicalModel>).<...>.<terminator>() in backend/*.py
    must include a .filter(<CanonicalModel>.org_id == ...) before the
    terminator. Allowlisted exceptions documented in
    backend/tests/org_filter_allowlist.txt.
    """
    canonical = _load_canonical_models_with_org_id()
    assert canonical, "expected to find at least 19 canonical models with org_id"

    allowed = _load_allowlist()
    violations = []
    for path, lineno, model in _find_unsafe_query_sites(canonical):
        rel = str(path.relative_to(REPO_ROOT)).replace("\\", "/")
        if (rel, lineno) in allowed:
            continue
        violations.append(f"{rel}:{lineno} db.query({model}) without .filter({model}.org_id == ...)")

    if violations:
        pytest.fail(
            "Unscoped tenant queries found:\n  - "
            + "\n  - ".join(violations)
            + "\nFix by adding .filter(...) for org_id, or add to "
              "backend/tests/org_filter_allowlist.txt with a # reason: comment."
        )
