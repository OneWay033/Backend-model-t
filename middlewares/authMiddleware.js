const jwt = require('jsonwebtoken');

const secretKey = 'majing'; // Ensure this is the same key used for signing tokens

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token == null) return res.sendStatus(401);

  jwt.verify(token, secretKey, (err, user) => {
    if (err) {
      console.error('JWT verification failed:', err);
      return res.sendStatus(403);
    }

    console.log('Decoded user:', user);
    req.user = user;
    next();
  });
};

module.exports = authenticateToken;
