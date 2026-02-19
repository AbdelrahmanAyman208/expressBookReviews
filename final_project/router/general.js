const express = require('express');
const axios = require('axios');
let books = require("./booksdb.js");
let isValid = require("./auth_users.js").isValid;
let users = require("./auth_users.js").users;
const public_users = express.Router();
const doesExist = require("./auth_users.js").doesExist;

// --- Utility Functions ---

/**
 * Utility function to handle Axios responses and errors in a modular way.
 * This reduces code redundancy by centralizing the .then() and .catch() logic.
 */
const handleAxiosResponse = (res, axiosPromise) => {
  return axiosPromise
    .then(response => {
      // Send the data received from the internal API call back to the client
      res.status(200).send(response.data);
    })
    .catch(error => {
      // Handle errors globally for all Axios calls in this file
      res.status(500).json({ message: "Error fetching data", error: error.message });
    });
};

// --- Routes ---

// Register a new user in the system
public_users.post("/register", (req, res) => {
  const username = req.body.username;
  const password = req.body.password;

  if (username && password) {
    if (!doesExist(username)) {
      // Add the new user to the local users array if they don't already exist
      users.push({ "username": username, "password": password });
      return res.status(200).json({ message: "User successfully registered. Now you can login." });
    } else {
      return res.status(404).json({ message: "User already exists!" });
    }
  }
  return res.status(400).json({ message: "Unable to register user (Email/Password missing)." });
});

// Task 1: Get the complete book list using a local Promise
public_users.get('/', function (req, res) {
  new Promise((resolve) => {
    resolve(books);
  })
  .then((bookList) => {
    res.status(200).send(JSON.stringify(bookList, null, 4));
  });
});

// Task 10: Get the book list using Axios with Promise Callbacks and Utility Function
public_users.get('/books/promise', function (req, res) {
  handleAxiosResponse(res, axios.get('http://localhost:5000/'));
});

// Task 2: Get book details based on ISBN
public_users.get('/isbn/:isbn', function (req, res) {
  let isbn = req.params.isbn;
  if (books[isbn]) {
    res.status(200).send(books[isbn]);
  } else {
    res.status(404).json({ message: "Book not found" });
  }
});

// Task 11: Get book details by ISBN using Axios and Async-Await
public_users.get('/books/async/isbn/:isbn', async function (req, res) {
  const isbn = req.params.isbn;
  try {
    // Wait for the internal API call to complete using 'await'
    const response = await axios.get(`http://localhost:5000/isbn/${isbn}`);
    res.status(200).send(response.data);
  } catch (error) {
    res.status(500).json({ message: "Error fetching book details", error: error.message });
  }
});

// Task 3: Get book details based on Author
public_users.get('/author/:author', function (req, res) {
  const author = req.params.author;
  const bookKeys = Object.keys(books);
  
  // Filter books to find all titles written by the requested author
  let booksByAuthor = bookKeys
    .filter(key => books[key].author === author)
    .map(key => books[key]);

  if (booksByAuthor.length > 0) {
    res.status(200).send(JSON.stringify(booksByAuthor, null, 4));
  } else {
    res.status(404).json({ message: "Author not found" });
  }
});

// Task 12: Get book details by Author using Axios with Promise Callbacks and Utility Function
public_users.get('/books/promise/author/:author', function (req, res) {
  const author = req.params.author;
  handleAxiosResponse(res, axios.get(`http://localhost:5000/author/${author}`));
});

// Task 4: Get book details based on Title
public_users.get('/title/:title', function (req, res) {
  const title = req.params.title;
  const bookKeys = Object.keys(books);
  
  // Iterate through keys and filter books by title
  let booksByTitle = bookKeys
    .filter(key => books[key].title === title)
    .map(key => books[key]);

  if (booksByTitle.length > 0) {
    res.status(200).send(JSON.stringify(booksByTitle, null, 4));
  } else {
    res.status(404).json({ message: "Book not found" });
  }
});

// Task 13: Get book details by Title using Axios and Async-Await
public_users.get('/books/async/title/:title', async function (req, res) {
  const title = req.params.title;
  try {
    const response = await axios.get(`http://localhost:5000/title/${title}`);
    res.status(200).send(response.data);
  } catch (error) {
    res.status(500).json({ message: "Error fetching book by title", error: error.message });
  }
});

// Task 5: Get book reviews based on ISBN
public_users.get('/review/:isbn', function (req, res) {
  const isbn = req.params.isbn;
  if (books[isbn]) {
    // Return the reviews object for the specific book
    res.status(200).send(JSON.stringify(books[isbn].reviews, null, 4));
  } else {
    res.status(404).json({ message: "Book not found" });
  }
});

module.exports.general = public_users;
