const jwt = require('jsonwebtoken');

const protect = (req, res, next) => {
  let token;

  // 1. Check if Authorization header exists and has 'Bearer' prefix
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      // Get token string from the Bearer format: "Bearer <token>"
      token = req.headers.authorization.split(' ')[1];

      // 2. Verify token signature against the private JWT_SECRET
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'super_secret_jwt_key_123!');

      // 3. Attach the decrypted payload details directly to the request object (verify it is an admin token)
      if (!decoded.isAdmin) {
        return res.status(403).json({
          status: 'error',
          message: 'Access denied. Administrator privileges required.',
        });
      }

      req.admin = {
        id: decoded.adminId,
        email: decoded.email,
      };

      // 4. Proceed cleanly to the controller route handler
      return next();

    } catch (error) {
      console.error('Admin JWT validation error:', error);
      return res.status(401).json({
        status: 'error',
        message: 'Not authorized, token validation failed.',
      });
    }
  }

  // 5. If no token is provided in the headers
  if (!token) {
    return res.status(401).json({
      status: 'error',
      message: 'Not authorized, no security token was provided.',
    });
  }
};

module.exports = { protect };
