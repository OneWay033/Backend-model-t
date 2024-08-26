const jwt = require('jsonwebtoken');

const secretKey = 'majing'; // Ensure this is the same key used for signing tokens

const authenticateToken = (req, res, next) => {
  // Get token from headers
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer token

  if (token == null) return res.sendStatus(401); // Unauthorized if no token

  jwt.verify(token, secretKey, (err, user) => {
    if (err) return res.sendStatus(403); // Forbidden if token is invalid
    req.user = user; // Attach user information to the request
    next(); // Proceed to the next middleware/route handler
  });
};

module.exports = authenticateToken;
