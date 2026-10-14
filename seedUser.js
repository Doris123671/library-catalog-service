require('dotenv').config();

const mongoose = require('mongoose');
const User = require('./models/User');

const librarianCredentials = {
  username: 'librarian',
  email: 'librarian@example.com',
  password: 'LibraryCatalog!2026',
};

async function seedUser() {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    throw new Error('MONGODB_URI is not set. Copy .env.example to .env and add your MongoDB URI.');
  }

  await mongoose.connect(mongoUri);
  try {
    let librarian = await User.findOne({ username: librarianCredentials.username });
    if (!librarian) librarian = new User({ username: librarianCredentials.username });
    librarian.email = librarianCredentials.email;
    librarian.password = librarianCredentials.password;
    librarian.role = 'librarian';
    await librarian.save();

    await User.updateMany(
      { _id: { $ne: librarian._id }, role: 'librarian' },
      { $set: { role: 'patron' } }
    );

    console.log('Seeded exactly one librarian account: librarian@example.com.');
  } finally {
    await mongoose.disconnect();
  }
}

seedUser().catch((error) => {
  console.error('Librarian seed failed:', error);
  process.exitCode = 1;
});
