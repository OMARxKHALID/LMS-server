import Borrow from "../models/borrowModel.js";
import Book from "../models/bookModel.js";
import User from "../models/userModel.js";

// Borrow a book
export const borrowBook = async (req, res) => {
  try {
    const { borrowed_by, borrowed_book, expected_return_date } = req.body;

    if (!borrowed_by || !borrowed_book || !expected_return_date) {
      return res.status(400).json({
        message:
          "Please provide User ID, Book ID, and Expected Return Date to proceed.",
      });
    }

    const expectedReturnDate = new Date(expected_return_date);
    if (
      isNaN(expectedReturnDate.getTime()) ||
      expectedReturnDate < new Date()
    ) {
      return res.status(400).json({
        message:
          "The Expected Return Date is invalid or set in the past. Please provide a valid date.",
      });
    }

    // Check if the user exists
    const user = await User.findById(borrowed_by);
    if (!user) {
      return res.status(404).json({
        message:
          "The specified user could not be found. Please check the User ID and try again.",
      });
    }

    // Check if the book exists
    const book = await Book.findById(borrowed_book);
    if (!book) {
      return res.status(404).json({
        message:
          "The requested book could not be found. Please check the Book ID and try again.",
      });
    }

    if (book.available_copies <= 0) {
      return res.status(400).json({
        message:
          "This book is currently unavailable as all copies are borrowed.",
      });
    }

    // Check if the user already borrowed the same book and hasn't returned it
    const existingBorrow = await Borrow.findOne({
      borrowed_by,
      borrowed_book,
      status: "borrowed",
    });

    if (existingBorrow) {
      return res.status(400).json({
        message:
          "You have already borrowed this book and have not returned it yet. Please return it before borrowing again.",
      });
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
      total_price: book.price,
    });

    // Reduce available copies
    book.available_copies -= 1;

    await book.save();
    await borrow.save();

    res.status(201).json({
      borrow,
      total_borrow_price: totalBorrowPrice,
    });
  } catch (error) {
    console.error(error.message);
    res
      .status(500)
      .json({ error: "An unexpected error occurred. Please try again later." });
  }
};

// Return a book
export const returnBook = async (req, res) => {
  try {
    const { borrowId } = req.params;

    const borrow = await Borrow.findById(borrowId);
    if (!borrow) {
      return res.status(404).json({
        message:
          "The borrow record could not be found. Please check the Borrow ID and try again.",
      });
    }

    const book = await Book.findById(borrow.borrowed_book);
    if (!book) {
      return res.status(404).json({
        message:
          "The associated book could not be found. Please contact support if this issue persists.",
      });
    }

    if (borrow.return_date) {
      return res
        .status(400)
        .json({ message: "This book has already been returned." });
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
      borrow,
      late_fine: totalBorrowedFine,
      total_price_paid: borrow.total_borrow_price + totalBorrowedFine,
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({
      error:
        "An unexpected error occurred while returning the book. Please try again later.",
    });
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
    res.status(500).json({
      error:
        "An unexpected error occurred while retrieving borrow records. Please try again later.",
    });
  }
};
