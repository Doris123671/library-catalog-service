require('dotenv').config();

const express = require('express');
const genresRouter = require('./routes/genres');
const booksRouter = require('./routes/books');

const app = express();

app.disable('x-powered-by');
app.use(express.json({ limit: '100kb' }));
app.use('/genres', genresRouter);
app.use('/books', booksRouter);

app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found.' });
});

app.use((error, req, res, next) => {
  if (res.headersSent) return next(error);

  if (error.name === 'ValidationError') {
    const details = Object.fromEntries(
      Object.entries(error.errors).map(([field, issue]) => [field, issue.message])
    );
    return res.status(400).json({ error: 'Validation failed.', details });
  }
  if (error.name === 'CastError') {
    return res.status(400).json({ error: 'Validation failed.', details: { [error.path]: 'Invalid value.' } });
  }
  if (error.code === 11000) {
    const field = Object.keys(error.keyPattern || {})[0] || 'value';
    return res.status(400).json({ error: 'Validation failed.', details: { [field]: 'Must be unique.' } });
  }
  if (error instanceof SyntaxError && error.status === 400 && 'body' in error) {
    return res.status(400).json({ error: 'Invalid JSON request body.' });
  }

  console.error(error);
  return res.status(500).json({ error: 'Internal server error.' });
});

module.exports = app;