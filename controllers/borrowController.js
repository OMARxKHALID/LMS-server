import Borrow from "../models/borrowModel.js";
import Book from "../models/bookModel.js";
import User from "../models/userModel.js";

// Borrow a book
export const borrowBook = async (req, res) => {
  try {
    const { borrowed_by, borrowed_book, expected_return_date } = req.body;

    // Validate input
    if (!borrowed_by || !borrowed_book || !expected_return_date) {
      return res.status(400).json({
        message: "User ID, Book ID, and Expected Return Date are required",
      });
    }

    // Validate expected_return_date
    const expectedReturnDate = new Date(expected_return_date);
    if (
      isNaN(expectedReturnDate.getTime()) ||
      expectedReturnDate < new Date()
    ) {
      return res.status(400).json({ message: "Invalid expected return date" });
    }

    // Check if user exists
    const user = await User.findById(borrowed_by);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Check if book exists
    const book = await Book.findById(borrowed_book);
    if (!book) {
      return res.status(404).json({ message: "Book not found" });
    }

    // Check availability of the book
    if (book.available_copies <= 0) {
      return res
        .status(400)
        .json({ message: "No available copies of the book" });
    }

    // Create new borrow record
    const borrow = new Borrow({
      borrowed_by,
      borrowed_book,
      expected_return_date,
    });

    // Decrement available copies of the book
    book.available_copies -= 1;

    // Save borrow record and updated book
    await book.save();
    await borrow.save();

    // Return success response
    res.status(201).json({ message: "Book borrowed successfully", borrow });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ error: error.message || "Internal server error" });
  }
};

// Return a book
export const returnBook = async (req, res) => {
  try {
    const { borrowId } = req.params;

    // Find the borrow record
    const borrow = await Borrow.findById(borrowId);
    if (!borrow) {
      return res.status(404).json({ message: "Borrow record not found" });
    }

    // Find the book related to the borrow record
    const book = await Book.findById(borrow.borrowed_book);
    if (!book) {
      return res.status(404).json({ message: "Book not found" });
    }

    // If the book has already been returned
    if (borrow.return_date) {
      return res.status(400).json({ message: "Book already returned" });
    }

    // Calculate fine if returned late
    const currentDate = new Date();
    let total_borrowed_fine = 0;
    if (currentDate > borrow.expected_return_date) {
      const lateDays = Math.floor(
        (currentDate - borrow.expected_return_date) / (1000 * 60 * 60 * 24)
      );
      total_borrowed_fine = lateDays * book.borrowed_fine;
    }

    // Update return date, fine, and increment available copies
    borrow.return_date = currentDate;
    borrow.total_borrowed_fine = total_borrowed_fine;
    borrow.status = "returned";
    book.available_copies += 1;

    // Save the updated book and borrow record
    await book.save();
    await borrow.save();

    // Return success response
    res.status(200).json({ message: "Book returned successfully", borrow });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ error: error.message || "Internal server error" });
  }
};

// Get all borrow records
export const getBorrowRecords = async (req, res) => {
  try {
    // Fetch borrow records with populated user and book details
    const records = await Borrow.find()
      .populate("borrowed_by", "username email")
      .populate("borrowed_book", "title author");

    // Return the borrow records
    res.json(records);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
};
