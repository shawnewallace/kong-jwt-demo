const express = require('express');
const jwt = require('jsonwebtoken');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

const SECRET = process.env.JWT_SECRET || 'demo-secret-change-in-production';
const ISSUER = process.env.JWT_ISSUER || 'kong-demo';
const PORT = process.env.PORT || 3001;

// Demo users — in a real app this would be a database
const USERS = {
  alice: { password: 'password123', role: 'admin',  name: 'Alice Admin' },
  bob:   { password: 'letmein',     role: 'viewer', name: 'Bob Viewer' },
};

// ── POST /auth/login ─────────────────────────────────────────────────────────
// Issues a JWT signed with the same secret Kong knows about.
// The `iss` claim MUST match the `key` in kong.yml jwt_secrets.
app.post('/auth/login', (req, res) => {
  const { username, password } = req.body;

  const user = USERS[username];
  if (!user || user.password !== password) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const payload = {
    iss: ISSUER,       // Kong matches this to the consumer credential key
    sub: username,
    name: user.name,
    role: user.role,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 60 * 60, // 1 hour
  };

  const token = jwt.sign(payload, SECRET);
  res.json({ token, user: { username, name: user.name, role: user.role } });
});

// ── GET /api/public ──────────────────────────────────────────────────────────
// No auth — Kong forwards this without checking the JWT.
app.get('/api/public', (req, res) => {
  res.json({
    message: 'This is public data — no JWT required.',
    timestamp: new Date().toISOString(),
    tip: 'Try calling /api/protected/* without a token to see Kong block you.',
  });
});

// ── GET /api/protected/data ──────────────────────────────────────────────────
// Kong validates the JWT before this ever runs.
// Kong injects decoded claims as X-Consumer-* and X-JWT-Claims-* headers.
app.get('/api/protected/data', (req, res) => {
  // Kong has already validated the JWT — we can trust these headers
  const consumer = req.headers['x-consumer-username'];
  const jwtPayload = parseKongJwtHeaders(req.headers);

  res.json({
    message: 'Secret data — you passed JWT validation!',
    consumer,
    authenticatedAs: jwtPayload,
    sensitiveData: [
      { id: 1, value: 'Top secret item A' },
      { id: 2, value: 'Top secret item B' },
    ],
    timestamp: new Date().toISOString(),
  });
});

// ── GET /api/protected/profile ───────────────────────────────────────────────
app.get('/api/protected/profile', (req, res) => {
  const jwtPayload = parseKongJwtHeaders(req.headers);

  res.json({
    message: 'Your profile (read from JWT claims forwarded by Kong)',
    profile: jwtPayload,
    timestamp: new Date().toISOString(),
  });
});

// ── Health check ─────────────────────────────────────────────────────────────
app.get('/health', (req, res) => res.json({ status: 'ok' }));

// Kong forwards JWT claims as X-JWT-Claims-<claim> headers (lowercased).
function parseKongJwtHeaders(headers) {
  const claims = {};
  for (const [key, val] of Object.entries(headers)) {
    if (key.startsWith('x-jwt-claims-') || key.startsWith('x-consumer-')) {
      claims[key] = val;
    }
  }
  return claims;
}

app.listen(PORT, () => {
  console.log(`API listening on port ${PORT}`);
  console.log(`JWT issuer: ${ISSUER}`);
});
