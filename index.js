const express = require('express');
const jwt = require('jsonwebtoken');
const session = require('express-session');
let books = require("./booksdb.js");

const app = express();
app.use(express.json());

// Session middleware
app.use(session({
  secret: "fingerprint_secret",
  resave: true,
  saveUninitialized: true
}));

// Middleware to read JWT from Authorization header and populate session
function verifyTokenFromHeader(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader) return next();
  const parts = authHeader.split(' ');
  if (parts.length !== 2) return next();
  const token = parts[1];
  try {
    const payload = jwt.verify(token, "secretKey");
    req.session = req.session || {};
    req.session.authorization = { accessToken: token, username: payload.username };
  } catch (err) {
    // invalid token — ignore and let route handle auth
  }
  next();
}
app.use(verifyTokenFromHeader);

const regd_users = express.Router();
let users = [];

// Helpers
const isValid = (username) => !users.find(u => u.username === username);
const authenticatedUser = (username, password) => !!users.find(u => u.username === username && u.password === password);

// Register a new user
regd_users.post("/register", (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ message: "Username and password required" });
  if (!isValid(username)) return res.status(409).json({ message: "Username already exists" });
  users.push({ username, password });
  return res.status(201).json({ message: "User registered successfully" });
});

// Login route
regd_users.post("/login", (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ message: "Username and password required" });
  if (!authenticatedUser(username, password)) return res.status(401).json({ message: "Invalid login credentials" });

  const accessToken = jwt.sign({ username }, "secretKey", { expiresIn: "1h" });
  req.session.authorization = { accessToken, username };
  return res.status(200).json({ message: "Login successful", token: accessToken });
});

// Add or modify a book review
regd_users.put("/auth/review/:isbn", (req, res) => {
  const isbn = req.params.isbn;
  const review = req.query.review;
  const username = req.session?.authorization?.username;

  if (!username) return res.status(403).json({ message: "User not logged in" });
  if (!review) return res.status(400).json({ message: "Review text required" });
  if (!books[isbn]) return res.status(404).json({ message: "Book not found" });

  books[isbn].reviews = books[isbn].reviews || {};
  books[isbn].reviews[username] = review;
  return res.status(200).json({ message: "Review added/updated", reviews: books[isbn].reviews });
});

// Delete a book review
regd_users.delete("/auth/review/:isbn", (req, res) => {
  const isbn = req.params.isbn;
  const username = req.session?.authorization?.username;

  if (!username) return res.status(403).json({ message: "User not logged in" });
  if (!books[isbn]) return res.status(404).json({ message: "Book not found" });

  books[isbn].reviews = books[isbn].reviews || {};
  if (!books[isbn].reviews[username]) return res.status(404).json({ message: "No review found for this user" });

  delete books[isbn].reviews[username];
  return res.status(200).json({ message: "Review deleted", reviews: books[isbn].reviews });
});

// Mount routes
app.use("/", regd_users);

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

module.exports.authenticated = regd_users;
module.exports.isValid = isValid;
module.exports.users = users;
