import Borrow from "../models/borrowModel.js";
import Book from "../models/bookModel.js";
import User from "../models/userModel.js";

// Borrow a book
export const borrowBook = async (req, res) => {
  try {
    const { borrowed_by, borrowed_book, expected_return_date, borrow_price } =
      req.body;

    if (!borrowed_by || !borrowed_book || !expected_return_date) {
      return res.status(400).json({
        message: "User ID, Book ID, and Expected Return Date are required",
      });
    }

    const expectedReturnDate = new Date(expected_return_date);
    if (
      isNaN(expectedReturnDate.getTime()) ||
      expectedReturnDate < new Date()
    ) {
      return res.status(400).json({ message: "Invalid expected return date" });
    }

    const user = await User.findById(borrowed_by);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const book = await Book.findById(borrowed_book);
    if (!book) {
      return res.status(404).json({ message: "Book not found" });
    }

    if (book.available_copies <= 0) {
      return res
        .status(400)
        .json({ message: "No available copies of the book" });
    }

    const borrowDays = Math.ceil(
      (expectedReturnDate - new Date()) / (1000 * 60 * 60 * 24)
    );

    const totalBorrowPrice = borrowDays * book.borrow_price;

    const borrow = new Borrow({
      borrowed_by,
      borrowed_book,
      expected_return_date,
      total_borrow_price: totalBorrowPrice,
    });

    book.available_copies -= 1;

    await book.save();
    await borrow.save();

    res.status(201).json({
      message: "Book borrowed successfully",
      borrow,
      total_borrow_price: totalBorrowPrice,
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ error: error.message || "Internal server error" });
  }
};

// Return a book
export const returnBook = async (req, res) => {
  try {
    const { borrowId } = req.params;

    const borrow = await Borrow.findById(borrowId);
    if (!borrow) {
      return res.status(404).json({ message: "Borrow record not found" });
    }

    const book = await Book.findById(borrow.borrowed_book);
    if (!book) {
      return res.status(404).json({ message: "Book not found" });
    }

    if (borrow.return_date) {
      return res.status(400).json({ message: "Book already returned" });
    }

    const currentDate = new Date();
    let totalBorrowedFine = 0;

    if (currentDate > borrow.expected_return_date) {
      const lateDays = Math.floor(
        (currentDate - borrow.expected_return_date) / (1000 * 60 * 60 * 24)
      );
      totalBorrowedFine = lateDays * book.borrowed_fine;
    }

    borrow.return_date = currentDate;
    borrow.total_borrowed_fine = totalBorrowedFine;
    borrow.status = "returned";
    book.available_copies += 1;

    await book.save();
    await borrow.save();

    res.status(200).json({
      message: "Book returned successfully",
      borrow,
      late_fine: totalBorrowedFine,
      total_price_paid: borrow.total_borrow_price + totalBorrowedFine,
    });
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
