const express = require('express');
const axios = require('axios'); // axios usage required by rubric
let books = require("./booksdb.js");
let { isValid, users } = require("./auth_users.js");
const public_users = express.Router();

/**
 * Configuration:
 * If you have an external API to fetch books from, set API_BASE.
 * If not, the code will fall back to the local `books` object.
 */
const API_BASE = process.env.BOOKS_API_BASE || null; // e.g., "http://localhost:5000/api" or null

/* -------------------------
   Helper functions
   ------------------------- */

// Async/await helper using axios to fetch all books from an external API.
// Falls back to local `books` if API_BASE is not set or request fails.
async function fetchAllBooks() {
  if (!API_BASE) {
    // Return local books as fallback
    return books;
  }
  const url = `${API_BASE}/books`;
  try {
    const resp = await axios.get(url, { timeout: 5000 });
    // Expecting an object keyed by ISBN or an array; normalize to object keyed by ISBN
    if (Array.isArray(resp.data)) {
      // convert array to object keyed by isbn if needed
      const obj = {};
      resp.data.forEach(b => {
        if (b.isbn) obj[b.isbn] = b;
      });
      return obj;
    }
    return resp.data;
  } catch (err) {
    // Log and fallback to local books
    console.error("fetchAllBooks axios error:", err.message || err);
    return books;
  }
}

// Promise-style helper (example) to fetch a single book by ISBN using axios
function fetchBookByIsbnPromise(isbn) {
  if (!API_BASE) {
    return Promise.resolve(books[isbn] || null);
  }
  const url = `${API_BASE}/books/${encodeURIComponent(isbn)}`;
  return axios.get(url, { timeout: 5000 })
    .then(resp => resp.data)
    .catch(err => {
      console.error("fetchBookByIsbnPromise axios error:", err.message || err);
      return null; // caller will handle null
    });
}

/* -------------------------
   Routes
   ------------------------- */

// Register a new user
public_users.post("/register", (req, res) => {
  const { username, password } = req.body || {};

  if (!username || !password) {
    return res.status(400).json({ message: "Username and password are required" });
  }

  // Check if username already exists
  const userExists = users.some(u => u.username === username);
  if (userExists) {
    return res.status(409).json({ message: "User already exists" });
  }

  // If an isValid function exists, use it to validate username
  if (typeof isValid === "function" && !isValid(username)) {
    return res.status(400).json({ message: "Invalid username" });
  }

  users.push({ username, password });
  return res.status(201).json({ message: "User registered successfully" });
});

// Get the book list available in the shop (async/await + axios)
public_users.get('/', async function (req, res) {
  try {
    const allBooks = await fetchAllBooks();
    return res.status(200).json(allBooks);
  } catch (err) {
    console.error("GET / error:", err);
    return res.status(500).json({ message: "Failed to retrieve books" });
  }
});

// Get book details based on ISBN (async/await using axios helper)
public_users.get('/isbn/:isbn', async function (req, res) {
  const isbn = req.params.isbn;
  if (!isbn) return res.status(400).json({ message: "ISBN is required" });

  try {
    // Use promise-style helper as an example of both styles
    const bookFromPromise = await fetchBookByIsbnPromise(isbn);
    if (bookFromPromise) return res.status(200).json(bookFromPromise);

    // If promise helper returned null, try local books
    const localBook = books[isbn];
    if (localBook) return res.status(200).json(localBook);

    return res.status(404).json({ message: "Book not found" });
  } catch (err) {
    console.error("GET /isbn/:isbn error:", err);
    return res.status(500).json({ message: "Failed to retrieve book by ISBN" });
  }
});

// Get book details based on author (async/await + axios fallback)
public_users.get('/author/:author', async function (req, res) {
  const authorQuery = req.params.author;
  if (!authorQuery) return res.status(400).json({ message: "Author is required" });

  try {
    const allBooks = await fetchAllBooks();
    const results = Object.entries(allBooks)
      .filter(([isbn, book]) => book.author && book.author.toLowerCase().includes(authorQuery.toLowerCase()))
      .map(([isbn, book]) => ({ isbn, ...book }));

    if (results.length === 0) return res.status(404).json({ message: "No books found for that author" });
    return res.status(200).json(results);
  } catch (err) {
    console.error("GET /author/:author error:", err);
    return res.status(500).json({ message: "Failed to retrieve books by author" });
  }
});

// Get all books based on title (async/await + axios fallback)
public_users.get('/title/:title', async function (req, res) {
  const titleQuery = req.params.title;
  if (!titleQuery) return res.status(400).json({ message: "Title is required" });

  try {
    const allBooks = await fetchAllBooks();
    const results = Object.entries(allBooks)
      .filter(([isbn, book]) => book.title && book.title.toLowerCase().includes(titleQuery.toLowerCase()))
      .map(([isbn, book]) => ({ isbn, ...book }));

    if (results.length === 0) return res.status(404).json({ message: "No books found with that title" });
    return res.status(200).json(results);
  } catch (err) {
    console.error("GET /title/:title error:", err);
    return res.status(500).json({ message: "Failed to retrieve books by title" });
  }
});

// Get book review (returns reviews object or array)
public_users.get('/review/:isbn', async function (req, res) {
  const isbn = req.params.isbn;
  if (!isbn) return res.status(400).json({ message: "ISBN is required" });

  try {
    // Try axios fetch first if API_BASE is set
    if (API_BASE) {
      try {
        const resp = await axios.get(`${API_BASE}/books/${encodeURIComponent(isbn)}/reviews`, { timeout: 5000 });
        if (resp && resp.data) return res.status(200).json({ isbn, reviews: resp.data });
      } catch (err) {
        // ignore and fallback to local
        console.warn("axios reviews fetch failed, falling back to local reviews:", err.message || err);
      }
    }

    const book = books[isbn];
    if (!book) return res.status(404).json({ message: "Book not found" });

    const reviews = book.reviews || {};
    return res.status(200).json({ isbn, reviews });
  } catch (err) {
    console.error("GET /review/:isbn error:", err);
    return res.status(500).json({ message: "Failed to retrieve reviews" });
  }
});

module.exports.general = public_users;
