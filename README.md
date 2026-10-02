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
