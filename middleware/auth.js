const jwt = require('jsonwebtoken');
const User = require('../models/User');

const COOKIE_NAME = 'library_auth';

function getToken(req) {
  const authorization = req.get('authorization');
  const bearerToken = authorization && authorization.match(/^Bearer\s+(.+)$/i);
  if (bearerToken) return bearerToken[1];

  const cookie = req.get('cookie');
  if (!cookie) return null;
  const cookiePair = cookie.split(';').map((part) => part.trim())
    .find((part) => part.startsWith(`${COOKIE_NAME}=`));
  return cookiePair ? cookiePair.slice(COOKIE_NAME.length + 1) : null;
}

function getTokenSecret() {
  const secret = process.env.AUTH_TOKEN_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error('AUTH_TOKEN_SECRET must be configured with at least 32 characters.');
  }
  return secret;
}

function unauthorized(res) {
  return res.status(401).json({ error: 'Authentication required.' });
}

function requireAuth(req, res, next) {
  const token = getToken(req);
  if (!token) return unauthorized(res);

  let claims;
  try {
    claims = jwt.verify(token, getTokenSecret(), { algorithms: ['HS256'] });
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError || error instanceof jwt.TokenExpiredError) {
      return unauthorized(res);
    }
    return next(error);
  }

  return User.findById(claims.sub)
    .select('username email role createdAt updatedAt')
    .then((user) => {
      if (!user) return unauthorized(res);
      req.user = user;
      return next();
    })
    .catch(next);
}

function requireRole(role) {
  return function checkRole(req, res, next) {
    if (!req.user || req.user.role !== role) {
      return res.status(403).json({ error: 'Forbidden.' });
    }
    return next();
  };
}

module.exports = { COOKIE_NAME, getTokenSecret, requireAuth, requireRole };
