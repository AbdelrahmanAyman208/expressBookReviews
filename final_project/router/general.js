const express = require('express');
const axios = require('axios');
let books = require("./booksdb.js");
let { isValid, users } = require("./auth_users.js");
const public_users = express.Router();

/**
 * Optional external API base. If you don't use an external API, leave null.
 * If you do use one, set BOOKS_API_BASE in your environment.
 */
const API_BASE = process.env.BOOKS_API_BASE || null;

/* -------------------------
   Helpers
   ------------------------- */

// Fetch all books using async/await (axios). Falls back to local `books`.
async function fetchAllBooks() {
  if (!API_BASE) return books;
  try {
    const resp = await axios.get(`${API_BASE}/books`, { timeout: 5000 });
    // Normalize: if API returns array, convert to object keyed by isbn
    if (Array.isArray(resp.data)) {
      const obj = {};
      resp.data.forEach(b => { if (b.isbn) obj[b.isbn] = b; });
      return obj;
    }
    return resp.data;
  } catch (err) {
    console.error("fetchAllBooks error:", err.message || err);
    return books;
  }
}

// Promise-style example: fetch single book by ISBN
function fetchBookByIsbnPromise(isbn) {
  if (!API_BASE) return Promise.resolve(books[isbn] || null);
  return axios.get(`${API_BASE}/books/${encodeURIComponent(isbn)}`, { timeout: 5000 })
    .then(r => r.data)
    .catch(err => {
      console.error("fetchBookByIsbnPromise error:", err.message || err);
      return null;
    });
}

/* -------------------------
   Routes
   ------------------------- */

// Register a new user
public_users.post("/register", (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) return res.status(400).json({ message: "Username and password are required" });

  if (typeof isValid === "function" && !isValid(username)) {
    return res.status(400).json({ message: "Invalid username" });
  }

  if (users.some(u => u.username === username)) {
    return res.status(409).json({ message: "User already exists" });
  }

  users.push({ username, password });
  return res.status(201).json({ message: "User registered successfully" });
});

// Get the book list available in the shop (async/await + axios)
public_users.get('/', async (req, res) => {
  try {
    const allBooks = await fetchAllBooks();
    return res.status(200).json(allBooks);
  } catch (err) {
    console.error("GET / error:", err.message || err);
    return res.status(500).json({ message: "Failed to retrieve books" });
  }
});

// Get book details based on ISBN (demonstrates promise-style helper)
public_users.get('/isbn/:isbn', async (req, res) => {
  const isbn = req.params.isbn;
  if (!isbn) return res.status(400).json({ message: "ISBN is required" });

  try {
    const book = await fetchBookByIsbnPromise(isbn);
    if (book) return res.status(200).json(book);

    // fallback to local
    const local = books[isbn];
    if (local) return res.status(200).json(local);

    return res.status(404).json({ message: "Book not found" });
  } catch (err) {
    console.error("GET /isbn/:isbn error:", err.message || err);
    return res.status(500).json({ message: "Failed to retrieve book by ISBN" });
  }
});

// Get book details based on author (async/await + axios fallback)
public_users.get('/author/:author', async (req, res) => {
  const authorQuery = req.params.author;
  if (!authorQuery) return res.status(400).json({ message: "Author is required" });

  try {
    const allBooks = await fetchAllBooks();
    const results = Object.entries(allBooks)
      .filter(([_, book]) => book.author && book.author.toLowerCase().includes(authorQuery.toLowerCase()))
      .map(([isbn, book]) => ({ isbn, ...book }));

    if (results.length === 0) return res.status(404).json({ message: "No books found for that author" });
    return res.status(200).json(results);
  } catch (err) {
    console.error("GET /author/:author error:", err.message || err);
    return res.status(500).json({ message: "Failed to retrieve books by author" });
  }
});

// Get all books based on title (async/await + axios fallback)
public_users.get('/title/:title', async (req, res) => {
  const titleQuery = req.params.title;
  if (!titleQuery) return res.status(400).json({ message: "Title is required" });

  try {
    const allBooks = await fetchAllBooks();
    const results = Object.entries(allBooks)
      .filter(([_, book]) => book.title && book.title.toLowerCase().includes(titleQuery.toLowerCase()))
      .map(([isbn, book]) => ({ isbn, ...book }));

    if (results.length === 0) return res.status(404).json({ message: "No books found with that title" });
    return res.status(200).json(results);
  } catch (err) {
    console.error("GET /title/:title error:", err.message || err);
    return res.status(500).json({ message: "Failed to retrieve books by title" });
  }
});

// Get book review
public_users.get('/review/:isbn', async (req, res) => {
  const isbn = req.params.isbn;
  if (!isbn) return res.status(400).json({ message: "ISBN is required" });

  try {
    // Try external API for reviews if available
    if (API_BASE) {
      try {
        const resp = await axios.get(`${API_BASE}/books/${encodeURIComponent(isbn)}/reviews`, { timeout: 5000 });
        if (resp && resp.data) return res.status(200).json({ isbn, reviews: resp.data });
      } catch (e) {
        console.warn("External reviews fetch failed, falling back to local:", e.message || e);
      }
    }

    const book = books[isbn];
    if (!book) return res.status(404).json({ message: "Book not found" });
    return res.status(200).json({ isbn, reviews: book.reviews || {} });
  } catch (err) {
    console.error("GET /review/:isbn error:", err.message || err);
    return res.status(500).json({ message: "Failed to retrieve reviews" });
  }
});

module.exports.general = public_users;
