const bcrypt = require('bcryptjs');
const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { COOKIE_NAME, getTokenSecret } = require('../middleware/auth');

const router = express.Router();
const TOKEN_LIFETIME_SECONDS = 60 * 60;

function asyncRoute(handler) {
  return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
}

function cookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
  };
}

function issueToken(user, res) {
  const token = jwt.sign({ sub: user._id.toString() }, getTokenSecret(), {
    algorithm: 'HS256',
    expiresIn: TOKEN_LIFETIME_SECONDS,
  });
  res.cookie(COOKIE_NAME, token, {
    ...cookieOptions(),
    maxAge: TOKEN_LIFETIME_SECONDS * 1000,
  });
}

function validateCredentials(req, res, fields) {
  if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) {
    res.status(400).json({ error: 'Request body must be a JSON object.' });
    return false;
  }

  const errors = {};
  for (const field of Object.keys(req.body)) {
    if (!fields.includes(field)) errors[field] = 'Unknown field.';
  }
  return errors;
}

router.post('/register', asyncRoute(async (req, res) => {
  const errors = validateCredentials(req, res, ['username', 'email', 'password']);
  if (errors === false) return;
  for (const field of ['username', 'email', 'password']) {
    if (typeof req.body[field] !== 'string' || !req.body[field].trim()) {
      errors[field] = 'This field is required and must be a non-empty string.';
    }
  }
  if (typeof req.body.password === 'string' && req.body.password.length < 8) {
    errors.password = 'Must be at least 8 characters.';
  }
  if (Object.keys(errors).length) {
    return res.status(400).json({ error: 'Validation failed.', details: errors });
  }

  const user = await User.create({
    username: req.body.username.trim(),
    email: req.body.email.trim(),
    password: req.body.password,
  });
  return res.status(201).json(user);
}));

router.post('/login', asyncRoute(async (req, res) => {
  const errors = validateCredentials(req, res, ['identifier', 'username', 'email', 'password']);
  if (errors === false) return;

  const identifier = req.body.identifier || req.body.email || req.body.username;
  if (Object.keys(errors).length ||
      typeof identifier !== 'string' || !identifier.trim() ||
      typeof req.body.password !== 'string' || !req.body.password) {
    return res.status(400).json({
      error: 'Validation failed.',
      details: { ...errors, credentials: 'Provide a username or email and a password.' },
    });
  }

  const normalizedIdentifier = identifier.trim().toLowerCase();
  const user = await User.findOne({
    $or: [{ username: normalizedIdentifier }, { email: normalizedIdentifier }],
  }).select('+password');
  if (!user || !(await bcrypt.compare(req.body.password, user.password))) {
    return res.status(401).json({ error: 'Invalid username/email or password.' });
  }

  issueToken(user, res);
  return res.status(200).json({ user: user.toJSON() });
}));

router.post('/logout', (req, res) => {
  res.clearCookie(COOKIE_NAME, cookieOptions());
  return res.status(200).json({ message: 'Logged out.' });
});

module.exports = router;
