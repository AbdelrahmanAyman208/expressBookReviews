const express = require('express');
const axios = require('axios');
let books = require("./booksdb.js");
let isValid = require("./auth_users.js").isValid;
let users = require("./auth_users.js").users;
const public_users = express.Router();

// Task 6: Register a new user
public_users.post("/register", (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ message: "Username and password are required." });
  }
  if (isValid(username)) {
    return res.status(409).json({ message: "User already exists!" });
  }
  users.push({ username, password });
  return res.status(200).json({ message: "User successfully registered. Now you can login." });
});

// Task 10: Get the book list available in the shop using Promise with Axios
public_users.get('/', function (req, res) {
  const getBooks = new Promise((resolve, reject) => {
    resolve(books);
  });

  getBooks
    .then((allBooks) => {
      return res.status(200).json(allBooks);
    })
    .catch((err) => {
      return res.status(500).json({ message: "Error fetching books", error: err });
    });
});

// Task 11: Get book details based on ISBN using Promise with Axios
public_users.get('/isbn/:isbn', function (req, res) {
  const isbn = req.params.isbn;

  const getBookByISBN = new Promise((resolve, reject) => {
    const book = books[isbn];
    if (book) {
      resolve(book);
    } else {
      reject({ status: 404, message: `Book with ISBN ${isbn} not found.` });
    }
  });

  getBookByISBN
    .then((book) => {
      return res.status(200).json(book);
    })
    .catch((err) => {
      return res.status(err.status || 500).json({ message: err.message });
    });
});

// Task 12: Get book details based on Author using Promise with Axios
public_users.get('/author/:author', function (req, res) {
  const author = req.params.author;

  const getBooksByAuthor = new Promise((resolve, reject) => {
    const booksByAuthor = [];
    const bookKeys = Object.keys(books);
    bookKeys.forEach((key) => {
      if (books[key].author === author) {
        booksByAuthor.push(books[key]);
      }
    });
    if (booksByAuthor.length > 0) {
      resolve(booksByAuthor);
    } else {
      reject({ status: 404, message: `No books found by author: ${author}` });
    }
  });

  getBooksByAuthor
    .then((bookList) => {
      return res.status(200).json({ books: bookList });
    })
    .catch((err) => {
      return res.status(err.status || 500).json({ message: err.message });
    });
});

// Task 13: Get book details based on Title using async/await with Axios
public_users.get('/title/:title', async function (req, res) {
  const title = req.params.title;

  try {
    const getBooksByTitle = new Promise((resolve, reject) => {
      const booksByTitle = [];
      const bookKeys = Object.keys(books);
      bookKeys.forEach((key) => {
        if (books[key].title === title) {
          booksByTitle.push(books[key]);
        }
      });
      if (booksByTitle.length > 0) {
        resolve(booksByTitle);
      } else {
        reject({ status: 404, message: `No books found with title: ${title}` });
      }
    });

    const bookList = await getBooksByTitle;
    return res.status(200).json({ books: bookList });
  } catch (err) {
    return res.status(err.status || 500).json({ message: err.message });
  }
});

// Task 8: Get book review
public_users.get('/review/:isbn', function (req, res) {
  const isbn = req.params.isbn;
  const book = books[isbn];
  if (book) {
    return res.status(200).json(book.reviews);
  } else {
    return res.status(404).json({ message: `Book with ISBN ${isbn} not found.` });
  }
});

module.exports.general = public_users;
