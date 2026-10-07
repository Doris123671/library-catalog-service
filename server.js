require('dotenv').config();

const mongoose = require('mongoose');
const app = require('./app');

const port = Number(process.env.PORT) || 3000;
const mongoUri = process.env.MONGODB_URI;

if (!mongoUri) {
  console.error('MONGODB_URI is not set. Copy .env.example to .env and configure MongoDB.');
  process.exit(1);
}

mongoose.connect(mongoUri)
  .then(() => {
    app.listen(port, () => console.log(`Library Catalog API listening on port ${port}.`));
  })
  .catch((error) => {
    console.error('Could not connect to MongoDB:', error.message);
    process.exit(1);
  });