require('dotenv').config();

const mongoose = require('mongoose');
const Book = require('./models/Book');
const Genre = require('./models/Genre');

const genreData = [
  { name: 'Science Fiction', slug: 'science-fiction' },
  { name: 'Mystery', slug: 'mystery' },
  { name: 'Fantasy', slug: 'fantasy' },
  { name: 'Historical Fiction', slug: 'historical-fiction' },
];

// Each value is a 12-digit ISBN-13 prefix; add the standard ISBN-13 check digit.
function makeIsbn13(prefix) {
  if (!/^\d{12}$/.test(prefix)) {
    throw new Error(`Invalid ISBN-13 prefix: ${prefix}`);
  }

  const weightedSum = [...prefix].reduce(
    (sum, digit, index) => sum + Number(digit) * (index % 2 === 0 ? 1 : 3),
    0
  );
  const checkDigit = (10 - (weightedSum % 10)) % 10;
  return `${prefix}${checkDigit}`;
}

const bookData = [
  {
    isbnPrefix: '978014032872',
    title: 'The Clockwork Orchard',
    author: 'Mira Ellison',
    description: 'An apprentice cartographer uncovers a city hidden inside a failing clockwork world.',
    coverImage: 'https://placehold.co/400x600?text=Clockwork+Orchard',
    totalCopies: 8,
    availableCopies: 6,
    genreSlug: 'science-fiction',
  },
  {
    isbnPrefix: '978006231500',
    title: 'The Last Signal at Europa',
    author: 'Jonah Reed',
    description: 'A remote research crew receives a message that appears to come from beneath Europa’s ice.',
    coverImage: 'https://placehold.co/400x600?text=Last+Signal',
    totalCopies: 5,
    availableCopies: 2,
    genreSlug: 'science-fiction',
  },
  {
    isbnPrefix: '978055338016',
    title: 'A Map of Quiet Stars',
    author: 'Leah Okafor',
    description: 'A pilot and a linguist search the outer colonies for the origin of an impossible star chart.',
    coverImage: 'https://placehold.co/400x600?text=Quiet+Stars',
    totalCopies: 4,
    availableCopies: 4,
    genreSlug: 'science-fiction',
  },
  {
    isbnPrefix: '978031676948',
    title: 'The Glass Meridian',
    author: 'R. K. Vale',
    description: 'A generation ship’s archivist must decide which memories are worth carrying forward.',
    coverImage: 'https://placehold.co/400x600?text=Glass+Meridian',
    totalCopies: 6,
    availableCopies: 3,
    genreSlug: 'science-fiction',
  },
  {
    isbnPrefix: '978045152493',
    title: 'Murder at Bellweather Pier',
    author: 'Celia North',
    description: 'A harbor detective follows a trail of coded postcards through a rain-soaked town.',
    coverImage: 'https://placehold.co/400x600?text=Bellweather+Pier',
    totalCopies: 7,
    availableCopies: 5,
    genreSlug: 'mystery',
  },
  {
    isbnPrefix: '978074327356',
    title: 'The Missing Chapter',
    author: 'Theo March',
    description: 'A rare-book dealer finds a clue to a decades-old disappearance inside a damaged novel.',
    coverImage: 'https://placehold.co/400x600?text=Missing+Chapter',
    totalCopies: 3,
    availableCopies: 1,
    genreSlug: 'mystery',
  },
  {
    isbnPrefix: '978030747427',
    title: 'Seven Keys to Winter House',
    author: 'Amara Finch',
    description: 'Seven guests arrive at an isolated manor, each holding a key and a different alibi.',
    coverImage: 'https://placehold.co/400x600?text=Winter+House',
    totalCopies: 6,
    availableCopies: 6,
    genreSlug: 'mystery',
  },
  {
    isbnPrefix: '978038549081',
    title: 'The Lantern Keeper’s Alibi',
    author: 'N. J. Calder',
    description: 'A coastal village’s oldest secret resurfaces after the lighthouse goes dark.',
    coverImage: 'https://placehold.co/400x600?text=Lantern+Keeper',
    totalCopies: 5,
    availableCopies: 2,
    genreSlug: 'mystery',
  },
  {
    isbnPrefix: '978067978326',
    title: 'Beneath the Ember Crown',
    author: 'S. L. Rowan',
    description: 'A reluctant heir must unite rival mountain clans before an ancient fire wakes.',
    coverImage: 'https://placehold.co/400x600?text=Ember+Crown',
    totalCopies: 9,
    availableCopies: 7,
    genreSlug: 'fantasy',
  },
  {
    isbnPrefix: '978014044913',
    title: 'The River of Borrowed Names',
    author: 'Ivo Maren',
    description: 'A ferryman journeys upriver to recover the names stolen from his family.',
    coverImage: 'https://placehold.co/400x600?text=Borrowed+Names',
    totalCopies: 4,
    availableCopies: 0,
    genreSlug: 'fantasy',
  },
  {
    isbnPrefix: '978020163361',
    title: 'Witchlight at the Old Observatory',
    author: 'Nadia Bell',
    description: 'Two young magicians discover that a fallen constellation is changing their town.',
    coverImage: 'https://placehold.co/400x600?text=Witchlight',
    totalCopies: 5,
    availableCopies: 4,
    genreSlug: 'fantasy',
  },
  {
    isbnPrefix: '978052547881',
    title: 'A Crown of Paper Moons',
    author: 'Evelyn Hart',
    description: 'An apprentice illusionist enters a royal contest where every trick has a cost.',
    coverImage: 'https://placehold.co/400x600?text=Paper+Moons',
    totalCopies: 6,
    availableCopies: 3,
    genreSlug: 'fantasy',
  },
  {
    isbnPrefix: '978019953556',
    title: 'The Cartographer’s Daughter',
    author: 'Elise Wren',
    description: 'In 1890s Lisbon, a mapmaker’s daughter follows a missing expedition’s last route.',
    coverImage: 'https://placehold.co/400x600?text=Cartographers+Daughter',
    totalCopies: 7,
    availableCopies: 5,
    genreSlug: 'historical-fiction',
  },
  {
    isbnPrefix: '978037453355',
    title: 'Letters from the Salt Road',
    author: 'Mateo Silva',
    description: 'A family’s correspondence reveals the lives of travelers along an ancient trade route.',
    coverImage: 'https://placehold.co/400x600?text=Salt+Road',
    totalCopies: 4,
    availableCopies: 2,
    genreSlug: 'historical-fiction',
  },
  {
    isbnPrefix: '978006112008',
    title: 'The Indigo Seamstress',
    author: 'Ruth Adebayo',
    description: 'A seamstress in wartime Lagos uses her craft to carry messages across a divided city.',
    coverImage: 'https://placehold.co/400x600?text=Indigo+Seamstress',
    totalCopies: 8,
    availableCopies: 8,
    genreSlug: 'historical-fiction',
  },
];

async function seed() {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    throw new Error('MONGODB_URI is not set. Copy .env.example to .env and add your MongoDB URI.');
  }

  await mongoose.connect(mongoUri);

  try {
    // Clearing both collections first makes every successful run produce the same catalog.
    await Book.deleteMany({});
    await Genre.deleteMany({});

    const genres = await Genre.insertMany(genreData);
    const genreIdsBySlug = new Map(genres.map((genre) => [genre.slug, genre._id]));
    const books = bookData.map(({ isbnPrefix, genreSlug, ...book }) => {
      if (book.availableCopies > book.totalCopies) {
        throw new Error(`availableCopies exceeds totalCopies for "${book.title}"`);
      }

      const genreId = genreIdsBySlug.get(genreSlug);
      if (!genreId) {
        throw new Error(`Unknown genre slug: ${genreSlug}`);
      }

      return { ...book, isbn: makeIsbn13(isbnPrefix), genre: genreId };
    });

    await Book.insertMany(books);
    console.log(`Seeded ${genres.length} genres and ${books.length} books.`);
  } finally {
    await mongoose.disconnect();
  }
}

seed().catch((error) => {
  console.error('Catalog seed failed:', error);
  process.exitCode = 1;
});
