const express = require('express');
const Genre = require('../models/Genre');
const Book = require('../models/Book');
const { validateGenre, validateGenreId } = require('../middleware/validate');

const router = express.Router();

function asyncRoute(handler) {
  return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
}

router.get('/', asyncRoute(async (req, res) => {
  const genres = await Genre.find().sort({ name: 1 });
  res.status(200).json(genres);
}));

router.get('/:id', validateGenreId, asyncRoute(async (req, res) => {
  const genre = await Genre.findById(req.params.id);
  if (!genre) return res.status(404).json({ error: 'Genre not found.' });
  return res.status(200).json(genre);
}));

router.post('/', validateGenre, asyncRoute(async (req, res) => {
  const genre = await Genre.create(req.body);
  return res.status(201).json(genre);
}));

router.put('/:id', validateGenreId, validateGenre, asyncRoute(async (req, res) => {
  const genre = await Genre.findById(req.params.id);
  if (!genre) return res.status(404).json({ error: 'Genre not found.' });
  Object.assign(genre, req.body);
  await genre.save();
  return res.status(200).json(genre);
}));

router.delete('/:id', validateGenreId, asyncRoute(async (req, res) => {
  const genre = await Genre.findById(req.params.id);
  if (!genre) return res.status(404).json({ error: 'Genre not found.' });
  if (await Book.exists({ genre: genre._id })) {
    return res.status(409).json({ error: 'Genre is in use by one or more books.' });
  }
  await genre.deleteOne();
  return res.status(204).end();
}));

module.exports = router;