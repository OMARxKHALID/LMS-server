import Book from "../models/bookModel.js";
import Transaction from "../models/transactionModel.js";
import User from "../models/userModel.js";

// Create a new book
export const createBook = async (req, res) => {
  try {
    const {
      title,
      author,
      isbn,
      description,
      publisher,
      publication_date,
      category,
      total_copies = 1,
      cover_image_url,
      location,
      pdf_files,
      price = 0,
      borrowed_fine = 0,
      uploaded_by,
      borrow_price = 0,
      isPurchased = false,
    } = req.body;

    // Check if essential fields are present
    if (!title || !author || !isbn) {
      return res
        .status(400)
        .json({ message: "Title, author, and ISBN are required" });
    }

    // Validate ISBN format (simple regex for ISBN-13 or ISBN-10)
    const isbnRegex = /^(97(8|9))?\d{9}(\d|X)$/;
    if (!isbnRegex.test(isbn)) {
      return res.status(400).json({ message: "Invalid ISBN format" });
    }

    // Check if book with the same ISBN already exists
    const existingBook = await Book.findOne({ isbn });
    if (existingBook) {
      return res
        .status(400)
        .json({ message: "Book with this ISBN already exists" });
    }

    // Create a new book
    const book = new Book({
      title,
      author,
      isbn,
      description,
      publisher,
      publication_date,
      category,
      total_copies,
      available_copies: total_copies,
      cover_image_url,
      location,
      pdf_files,
      price,
      borrowed_fine,
      uploaded_by,
      borrow_price,
      isPurchased,
    });

    // Save the book to the database
    await book.save();

    res.status(201).json({ message: "Book created successfully", book });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ error: error.message || "Internal server error" });
  }
};

// Get all books
export const getBooks = async (req, res) => {
  try {
    const books = await Book.find().populate("category", "name");
    res.json(books);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
};

// Get a single book by ID
export const getBook = async (req, res) => {
  try {
    const book = await Book.findById(req.params.id).populate(
      "category",
      "name"
    );

    if (!book) {
      return res.status(404).json({ message: "Book not found" });
    }

    res.json(book);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
};

// Delete a book by ID
export const deleteBook = async (req, res) => {
  try {
    const book = await Book.findByIdAndDelete(req.params.id);

    if (!book) {
      return res.status(404).json({ message: "Book not found" });
    }

    res.json({ message: "Book deleted successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
};

// Edit a book by ID
export const editBook = async (req, res) => {
  try {
    const {
      title,
      author,
      isbn,
      description,
      publisher,
      publication_date,
      category,
      total_copies,
      cover_image_url,
      location,
      pdf_files,
      price,
      borrowed_fine,
      uploaded_by,
      borrow_price,
      isPurchased,
    } = req.body;

    // Check if book exists
    const book = await Book.findById(req.params.id);
    if (!book) {
      return res.status(404).json({ message: "Book not found" });
    }

    // If ISBN is being changed, check if the new ISBN already exists
    if (isbn && isbn !== book.isbn) {
      const existingBook = await Book.findOne({ isbn });
      if (existingBook) {
        return res
          .status(400)
          .json({ message: "Book with this ISBN already exists" });
      }
    }

    // Calculate new available copies if total_copies is being updated
    const available_copies = total_copies
      ? total_copies - (book.total_copies - book.available_copies)
      : book.available_copies;

    // Update the book
    const updatedBook = await Book.findByIdAndUpdate(
      req.params.id,
      {
        title,
        author,
        isbn,
        description,
        publisher,
        publication_date,
        category,
        total_copies,
        available_copies,
        cover_image_url,
        location,
        pdf_files,
        price,
        borrowed_fine,
        uploaded_by,
        borrow_price,
        isPurchased,
      },
      { new: true }
    );

    res
      .status(200)
      .json({ message: "Book updated successfully", book: updatedBook });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Purchase a book
export const purchaseBook = async (req, res) => {
  try {
    const { purchased_by, purchased_book, quantity } = req.body;
    console.log("🚀 ~ purchaseBook ~ req.body:", req.body);

    // Validate that required fields are provided
    if (!purchased_by || !purchased_book || !quantity) {
      return res
        .status(400)
        .json({ message: "User ID, Book ID, and quantity are required" });
    }

    // Find the book by ID
    const book = await Book.findById(purchased_book);
    if (!book) {
      return res.status(404).json({ message: "Book not found" });
    }

    // Check if the requested quantity is available
    if (book.available_copies < quantity) {
      return res.status(400).json({ message: "Not enough copies available" });
    }

    // Find the user who is making the purchase
    const user = await User.findById(purchased_by);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Check if the user has enough wallet balance (if applicable)
    const totalPrice = book.price * quantity;
    if (user.walletBalance < totalPrice) {
      return res.status(400).json({ message: "Insufficient funds" });
    }

    // Create a new transaction for this purchase
    const transaction = new Transaction({
      user: purchased_by,
      book: purchased_book,
      quantity,
      totalPrice,
      status: "success",
    });

    // Save the transaction
    await transaction.save();

    // Update the user's wallet balance
    user.walletBalance -= totalPrice;
    await user.save();

    // Update the book's available copies
    book.available_copies -= quantity;
    await book.save();

    // Add the transaction to the user's transaction history
    user.transactions.push(transaction._id);
    await user.save();

    // Return success response
    res
      .status(200)
      .json({ message: "Book purchased successfully", transaction });
  } catch (error) {
    console.error("Error purchasing book:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
