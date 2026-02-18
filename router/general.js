// general.js
// Functions to retrieve books and their details by author, title, or ISBN.
// Two styles provided: async/await (recommended) and Promise callbacks (alternative).
// Uses axios for HTTP requests. Adjust BASE_URL to your API endpoint.

const axios = require("axios");

const BASE_URL = process.env.BOOKS_API_URL || "http://localhost:5000"; // change if needed

/**
 * Get all books (returns the raw books object from the API)
 * Async/await style
 */
async function getAllBooks() {
  const url = `${BASE_URL}/books`;
  const res = await axios.get(url);
  return res.data;
}

/**
 * Find books by author (async/await)
 * Returns an array of matching book objects (ISBN as key preserved in each object)
 */
async function getBooksByAuthor(author) {
  if (!author) return [];
  const books = await getAllBooks();
  const results = [];

  for (const [isbn, book] of Object.entries(books)) {
    if (book.author && book.author.toLowerCase().includes(author.toLowerCase())) {
      results.push({ isbn, ...book });
    }
  }

  return results;
}

/**
 * Find books by title (async/await)
 */
async function getBooksByTitle(title) {
  if (!title) return [];
  const books = await getAllBooks();
  const results = [];

  for (const [isbn, book] of Object.entries(books)) {
    if (book.title && book.title.toLowerCase().includes(title.toLowerCase())) {
      results.push({ isbn, ...book });
    }
  }

  return results;
}

/**
 * Get book details by ISBN (async/await)
 * Returns the book object or null if not found
 */
async function getBookByIsbn(isbn) {
  if (!isbn) return null;
  const books = await getAllBooks();
  return books[isbn] ? { isbn, ...books[isbn] } : null;
}

/* -------------------------
   Promise / callback style
   ------------------------- */

/**
 * getAllBooksPromise: returns a Promise resolving to the books object
 */
function getAllBooksPromise() {
  const url = `${BASE_URL}/books`;
  return axios.get(url).then(res => res.data);
}

/**
 * getBooksByAuthorPromise: returns a Promise resolving to an array of matches
 */
function getBooksByAuthorPromise(author) {
  if (!author) return Promise.resolve([]);
  return getAllBooksPromise().then(books => {
    return Object.entries(books)
      .filter(([isbn, book]) => book.author && book.author.toLowerCase().includes(author.toLowerCase()))
      .map(([isbn, book]) => ({ isbn, ...book }));
  });
}

/**
 * getBooksByTitlePromise: returns a Promise resolving to an array of matches
 */
function getBooksByTitlePromise(title) {
  if (!title) return Promise.resolve([]);
  return getAllBooksPromise().then(books => {
    return Object.entries(books)
      .filter(([isbn, book]) => book.title && book.title.toLowerCase().includes(title.toLowerCase()))
      .map(([isbn, book]) => ({ isbn, ...book }));
  });
}

/**
 * getBookByIsbnPromise: returns a Promise resolving to the book object or null
 */
function getBookByIsbnPromise(isbn) {
  if (!isbn) return Promise.resolve(null);
  return getAllBooksPromise().then(books => (books[isbn] ? { isbn, ...books[isbn] } : null));
}

module.exports = {
  // async/await exports
  getAllBooks,
  getBooksByAuthor,
  getBooksByTitle,
  getBookByIsbn,
  // promise exports
  getAllBooksPromise,
  getBooksByAuthorPromise,
  getBooksByTitlePromise,
  getBookByIsbnPromise
};
