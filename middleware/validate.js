const mongoose = require('mongoose');
const Genre = require('../models/Genre');

const bookFields = new Set([
  'title',
  'author',
  'isbn',
  'description',
  'coverImage',
  'totalCopies',
  'availableCopies',
  'genre',
]);
const genreFields = new Set(['name', 'slug']);
const requiredBookFields = [
  'title',
  'author',
  'isbn',
  'description',
  'coverImage',
  'totalCopies',
  'availableCopies',
  'genre',
];
const stringBookFields = ['title', 'author', 'isbn', 'description', 'coverImage'];

function sendValidationErrors(res, errors) {
  return res.status(400).json({ error: 'Validation failed.', details: errors });
}

function validatePayload(kind) {
  const allowedFields = kind === 'book' ? bookFields : genreFields;
  const requiredFields = kind === 'book' ? requiredBookFields : ['name', 'slug'];

  return async function validate(req, res, next) {
    const payload = req.body;
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      return sendValidationErrors(res, { body: 'Must be a JSON object.' });
    }

    const errors = {};
    for (const field of Object.keys(payload)) {
      if (!allowedFields.has(field)) errors[field] = 'Unknown field.';
    }

    if (req.method === 'POST') {
      for (const field of requiredFields) {
        if (payload[field] === undefined || payload[field] === null || payload[field] === '') {
          errors[field] = 'This field is required.';
        }
      }
    } else if (Object.keys(payload).length === 0) {
      errors.body = 'Provide at least one field to update.';
    }

    if (kind === 'genre') {
      if (payload.name !== undefined && (typeof payload.name !== 'string' || !payload.name.trim())) {
        errors.name = 'Must be a non-empty string.';
      }
      if (payload.slug !== undefined &&
          (typeof payload.slug !== 'string' || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(payload.slug.trim()))) {
        errors.slug = 'Must contain lowercase letters, numbers, and single hyphens only.';
      }
    } else {
      for (const field of stringBookFields) {
        if (payload[field] !== undefined && (typeof payload[field] !== 'string' || !payload[field].trim())) {
          errors[field] = 'Must be a non-empty string.';
        }
      }
      if (payload.coverImage !== undefined && typeof payload.coverImage === 'string' && payload.coverImage.trim()) {
        try {
          const url = new URL(payload.coverImage.trim());
          if (!['http:', 'https:'].includes(url.protocol)) errors.coverImage = 'Must be an http or https URL.';
        } catch {
          errors.coverImage = 'Must be a valid http or https URL.';
        }
      }
      for (const field of ['totalCopies', 'availableCopies']) {
        if (payload[field] !== undefined && (!Number.isInteger(payload[field]) || payload[field] < 0)) {
          errors[field] = 'Must be a non-negative integer.';
        }
      }
      if (payload.totalCopies !== undefined && payload.availableCopies !== undefined &&
          Number.isInteger(payload.totalCopies) && Number.isInteger(payload.availableCopies) &&
          payload.availableCopies > payload.totalCopies) {
        errors.availableCopies = 'Cannot exceed totalCopies.';
      }
      if (payload.genre !== undefined) {
        if (typeof payload.genre !== 'string' || !mongoose.isValidObjectId(payload.genre)) {
          errors.genre = 'Must be a valid Genre id.';
        } else {
          try {
            const exists = await Genre.exists({ _id: payload.genre });
            if (!exists) errors.genre = 'No genre exists with this id.';
          } catch (error) {
            return next(error);
          }
        }
      }
    }

    if (Object.keys(errors).length) return sendValidationErrors(res, errors);
    return next();
  };
}

function validateId(label) {
  return function validateDocumentId(req, res, next) {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return sendValidationErrors(res, { id: `Must be a valid ${label} id.` });
    }
    return next();
  };
}

module.exports = {
  validateBook: validatePayload('book'),
  validateGenre: validatePayload('genre'),
  validateBookId: validateId('Book'),
  validateGenreId: validateId('Genre'),
};