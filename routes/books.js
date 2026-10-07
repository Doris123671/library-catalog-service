const express = require('express');
const mongoose = require('mongoose');
const Book = require('../models/Book');
const { validateBook, validateBookId } = require('../middleware/validate');

const router = express.Router();

function asyncRoute(handler) {
  return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function parsePositiveInteger(value, fallback, field, max) {
  if (value === undefined) return { value: fallback };
  if (!/^\d+$/.test(value)) return { error: `${field} must be a positive integer.` };
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 1 || (max && parsed > max)) {
    return { error: max ? `${field} must be between 1 and ${max}.` : `${field} must be a positive integer.` };
  }
  return { value: parsed };
}

router.get('/', asyncRoute(async (req, res) => {
  const pageResult = parsePositiveInteger(req.query.page, 1, 'page');
  const limitResult = parsePositiveInteger(req.query.limit, 10, 'limit', 100);
  if (pageResult.error || limitResult.error) {
    return res.status(400).json({
      error: 'Invalid query parameters.',
      details: { ...(pageResult.error && { page: pageResult.error }), ...(limitResult.error && { limit: limitResult.error }) },
    });
  }

  const filter = {};
  if (req.query.genre !== undefined) {
    if (typeof req.query.genre !== 'string' || !mongoose.isValidObjectId(req.query.genre)) {
      return res.status(400).json({ error: 'Invalid query parameters.', details: { genre: 'Must be a valid Genre id.' } });
    }
    filter.genre = req.query.genre;
  }
  if (req.query.search !== undefined) {
    const search = String(req.query.search).trim();
    if (search.length > 200) {
      return res.status(400).json({ error: 'Invalid query parameters.', details: { search: 'Must be 200 characters or fewer.' } });
    }
    if (search) {
      const pattern = new RegExp(escapeRegex(search), 'i');
      filter.$or = [{ title: pattern }, { author: pattern }];
    }
  }

  const page = pageResult.value;
  const limit = limitResult.value;
  const [books, total] = await Promise.all([
    Book.find(filter).populate('genre', 'name slug').sort({ title: 1 }).skip((page - 1) * limit).limit(limit),
    Book.countDocuments(filter),
  ]);
  return res.status(200).json({
    data: books,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  });
}));

router.get('/:id', validateBookId, asyncRoute(async (req, res) => {
  const book = await Book.findById(req.params.id).populate('genre', 'name slug');
  if (!book) return res.status(404).json({ error: 'Book not found.' });
  return res.status(200).json(book);
}));

router.post('/', validateBook, asyncRoute(async (req, res) => {
  const book = await Book.create(req.body);
  return res.status(201).json(book);
}));

router.put('/:id', validateBookId, validateBook, asyncRoute(async (req, res) => {
  const book = await Book.findById(req.params.id);
  if (!book) return res.status(404).json({ error: 'Book not found.' });
  Object.assign(book, req.body);
  await book.save();
  return res.status(200).json(book);
}));

router.delete('/:id', validateBookId, asyncRoute(async (req, res) => {
  const book = await Book.findByIdAndDelete(req.params.id);
  if (!book) return res.status(404).json({ error: 'Book not found.' });
  return res.status(204).end();
}));

module.exports = router;