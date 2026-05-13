// Phase A: shared password strength checklist for signup / reset / change /
// forced-rotation. Mirrors backend/auth.py:validate_password — keep the
// regexes here in sync if the policy changes.
//
// Order of checks matches the backend so the rule that surfaces first in
// the API's 400 detail is the same one users were already looking at.

const SYMBOL = /[^A-Za-z0-9]/;
const UPPER = /[A-Z]/;
const LOWER = /[a-z]/;
const DIGIT = /\d/;

export function passwordChecks(pw) {
  const p = pw || '';
  return {
    length: p.length >= 12,
    upper: UPPER.test(p),
    lower: LOWER.test(p),
    digit: DIGIT.test(p),
    symbol: SYMBOL.test(p),
  };
}

export function passwordValid(pw) {
  const c = passwordChecks(pw);
  return c.length && c.upper && c.lower && c.digit && c.symbol;
}

export default function PasswordStrength({ password, compact = false }) {
  const c = passwordChecks(password);
  const items = [
    ['At least 12 characters', c.length],
    ['One uppercase letter', c.upper],
    ['One lowercase letter', c.lower],
    ['One digit', c.digit],
    ['One symbol', c.symbol],
  ];
  return (
    <ul
      style={{
        listStyle: 'none',
        padding: 0,
        margin: compact ? '4px 0 0 0' : '8px 0 12px 0',
        fontSize: '12px',
        lineHeight: '1.6',
      }}
    >
      {items.map(([label, ok]) => (
        <li
          key={label}
          style={{
            color: ok ? '#4ade80' : '#888',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <span style={{ fontWeight: 'bold', minWidth: '12px' }}>{ok ? '✓' : '○'}</span>
          {label}
        </li>
      ))}
    </ul>
  );
}
