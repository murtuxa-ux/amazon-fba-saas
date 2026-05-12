"""Payload size limit middleware (§2.5 defense-in-depth).

Rejects requests whose declared Content-Length exceeds a fixed cap and
returns 413 (Payload Too Large) instead of letting an oversized body
reach the JSON parser or DB driver — both of which surface as opaque
500s on the audit. Pre-flight only: bodies without Content-Length
(chunked uploads, etc.) fall through to the route, which is fine for
the routes we expose today.

File-upload routes that legitimately need larger bodies are allowlisted
explicitly so the global cap can stay tight for everything else.
"""

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse


# 1 MB cap on JSON / form bodies. Routes that need more must be added
# to UPLOAD_PATH_PREFIXES below with a justification.
MAX_PAYLOAD_BYTES = 1 * 1024 * 1024

# Multipart upload paths bypass the global cap. Currently:
#   /ppc-action-plan/generate — Amazon PPC bulk CSV; weekly reports
#                               for high-volume sellers can exceed
#                               1 MB easily.
UPLOAD_PATH_PREFIXES = (
    "/ppc-action-plan/generate",
)


class PayloadSizeLimitMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        path = request.url.path
        if any(path.startswith(p) for p in UPLOAD_PATH_PREFIXES):
            return await call_next(request)

        content_length = request.headers.get("content-length")
        if content_length:
            try:
                declared = int(content_length)
            except ValueError:
                declared = None
            if declared is not None and declared > MAX_PAYLOAD_BYTES:
                return JSONResponse(
                    status_code=413,
                    content={
                        "detail": "Payload too large. Maximum size is 1 MB.",
                    },
                )
        return await call_next(request)
