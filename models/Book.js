const mongoose = require('mongoose');

const bookSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    author: {
      type: String,
      required: true,
      trim: true,
    },
    isbn: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    coverImage: {
      type: String,
      required: true,
      trim: true,
      match: /^https?:\/\/.+/i,
    },
    totalCopies: {
      type: Number,
      required: true,
      min: 0,
      validate: Number.isInteger,
    },
    availableCopies: {
      type: Number,
      required: true,
      min: 0,
      validate: [
        { validator: Number.isInteger, message: 'availableCopies must be an integer.' },
        {
          validator: function (value) {
            return value <= this.totalCopies;
          },
          message: 'availableCopies cannot exceed totalCopies.',
        },
      ],
    },
    genre: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Genre',
      required: true,
    },
  },
  { timestamps: true }
);

bookSchema.index({ genre: 1 });

module.exports = mongoose.model('Book', bookSchema);
