const jwt = require('jsonwebtoken');

/**
 * verifyToken middleware
 *
 * Validates the JWT sent in the Authorization header on every protected route.
 * On success, attaches the decoded payload to req.admin and calls next().
 * On failure, returns 401 immediately — the request never reaches the controller.
 *
 * Design decision — req.admin vs req.user:
 * We attach the decoded payload to req.admin (not req.user) by convention.
 * If a future version adds agent-level authentication, req.user would carry
 * agent data while req.admin remains exclusive to admin-level sessions.
 * This keeps the two auth levels clearly separated without naming conflicts.
 *
 * Design decision — same error message for all JWT failures:
 * Both TokenExpiredError and JsonWebTokenError return 'Token invalid or expired'.
 * This prevents attackers from learning whether a token was structurally malformed
 * or simply timed out — both are equally unauthorized.
 */
const verifyToken = (req, res, next) => {
  const authorization = req.headers.authorization;

  // Must be present and follow the "Bearer <token>" format
  if (!authorization || !authorization.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'No token provided' });
  }

  // Split "Bearer eyJ..." and take the token part
  const token = authorization.split(' ')[1];

  try {
    // Verify signature and expiry against the secret in .env
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Attach decoded payload (adminId, email, iat, exp) to the request
    req.admin = decoded;

    next(); // Token valid — pass control to the route handler
  } catch (error) {
    // Handles: TokenExpiredError, JsonWebTokenError, NotBeforeError
    return res.status(401).json({ message: 'Token invalid or expired' });
  }
};

module.exports = { verifyToken };
