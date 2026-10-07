# Library Catalog Service

A small MongoDB/Mongoose data layer for a library catalog. It defines separate `Genre` and `Book` collections and provides a repeatable script that loads four genres and fifteen sample books.

## Requirements

- Node.js 18 or newer
- A MongoDB deployment (MongoDB Atlas works)

## Setup and seed

1. From this directory, install dependencies with `npm install`.
2. Copy `.env.example` to `.env` and replace its placeholder with your MongoDB connection string. For Atlas, create a database user, allow your client IP in Network Access, and keep the URI private.
3. Run `npm run seed`.
4. In Atlas Data Explorer, open the database named in the URI and verify that `genres` has 4 documents and `books` has 15. The books' `genre` values are ObjectIds; use **Expand** or populate them in an application to inspect the corresponding genre.

The seed script deletes existing books and genres in the connected database before inserting the catalog. Re-running it is safe with respect to duplicate data, but it is destructive to any other documents in those two collections. Use a dedicated development database. The script validates copy counts and generates valid ISBN-13 check digits for its unique 12-digit prefixes.

## REST API

Start the API with `npm start` after configuring `MONGODB_URI`. The server listens on port `3000` by default; set `PORT` to override it. Routes are mounted at the root (there is no `/api` prefix), and request/response bodies use JSON.

| Method | Endpoint | Behavior |
| --- | --- | --- |
| `GET` | `/genres` | List genres, sorted by name. |
| `GET` | `/genres/:id` | Get one genre (`404` if it does not exist). |
| `POST` | `/genres` | Create a genre; requires non-empty `name` and lowercase kebab-case `slug` (`201`). |
| `PUT` | `/genres/:id` | Update one or more supplied genre fields (`200`). |
| `DELETE` | `/genres/:id` | Delete an unused genre (`204`); returns `409` when books still reference it. |
| `GET` | `/books` | List books, with optional filters and pagination described below. |
| `GET` | `/books/:id` | Get one book with its populated genre (`404` if absent). |
| `POST` | `/books` | Create a book (`201`). |
| `PUT` | `/books/:id` | Update one or more supplied book fields (`200`). |
| `DELETE` | `/books/:id` | Delete a book (`204`). |

Book create requests require `title`, `author`, `isbn`, `description`, `coverImage`, `totalCopies`, `availableCopies`, and `genre`. Counts must be non-negative integers, available copies cannot exceed total copies, `coverImage` must be an HTTP(S) URL, and `genre` must identify an existing genre. Genre create requests require both fields. Updates accept partial payloads but must include at least one field. Unknown fields are rejected.

`GET /books` supports these query parameters (they can be combined):

- `genre=<genreId>` filters by the genre ObjectId.
- `search=<text>` performs a case-insensitive substring match against title or author.
- `page=<positive integer>` selects a 1-based page (default `1`).
- `limit=<positive integer>` sets page size (default `10`, maximum `100`).

For example, `/books?genre=<genreId>&search=clockwork&page=1&limit=5` combines all filters. The response contains `data` and `pagination` (`page`, `limit`, `total`, and `pages`). Invalid input returns `400` JSON with a `details` object keyed by the failing field; unexpected server errors return a generic JSON message without a stack trace.

### Postman

Import [`postman/library-catalog.postman_collection.json`](postman/library-catalog.postman_collection.json) into Postman. The collection uses `baseUrl`, `genreId`, and `bookId` variables and includes requests for every endpoint, a combined book-filter example, and a saved `400` example for an empty book-create payload.

## Schema Design

### Genre

- **`name`** and **`slug`** are required, unique strings. These are stored directly on each genre because they describe that genre itself. The display name can retain normal capitalization and spaces; the lowercase slug is convenient for stable URLs. Uniqueness prevents ambiguous genre labels or routes. The trade-off is the added unique-index write cost, accepted to protect catalog integrity.

### Book

- **`title`** and **`author`** are required strings embedded in the book document. They are the book's own descriptive attributes and are commonly needed whenever a catalog card or search result is shown. Putting them in another collection would add lookups and complexity without meaningful reuse benefits.
- **`isbn`** is a required, unique string. It remains on the book because it identifies a particular publication and is a natural lookup key; a unique index avoids duplicate catalog entries. ISBN is a string rather than a number because it is an identifier, not a value for arithmetic, and may be formatted with leading zeroes or separators.
- **`description`** and **`coverImage`** are required strings embedded with the book. They are usually rendered alongside its title and author, so keeping them together avoids a second read. The URL itself is stored, not image bytes, to keep MongoDB documents small and let a media host handle image delivery. The trade-off is that changing a book's details requires updating its document, which is appropriate because these fields belong to that book record.
- **`totalCopies`** and **`availableCopies`** are required non-negative integers. They are embedded because inventory counts are specific to this catalog's copy of a book and should be available with the book record. `availableCopies` cannot be greater than `totalCopies` in the seed data; a real circulation system should also enforce the invariant atomically when checkouts and returns update counts. Keeping both counts duplicates a derivable value (checked-out copies), but makes availability quick to read; that read-speed benefit is accepted in exchange for maintaining the invariant on writes.
- **`genre`** is a required `ObjectId` reference to the `Genre` collection (`ref: 'Genre'`), not an embedded genre name. A genre is shared by many books, and its name or slug may change. Referencing it avoids repeating those values on every book and keeps category updates consistent. The trade-off is that a query needing genre details may need Mongoose `populate()` or a separate lookup, but the storage and update consistency benefits suit a shared catalog taxonomy.

Timestamps are enabled on both schemas for basic record-creation and update tracking.

## Collections

Mongoose uses the model names `Genre` and `Book` to create the lowercase plural collections `genres` and `books`. The `genre` field in a book stores only the referenced genre document's ObjectId.
