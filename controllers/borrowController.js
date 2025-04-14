import Borrow from "../models/borrowModel.js";
import Book from "../models/bookModel.js";
import User from "../models/userModel.js";

// Helper function to check if a book is available
const isBookAvailable = async (borrowed_book) => {
  const book = await Book.findById(borrowed_book);
  if (!book || book.available_copies <= 0) {
    throw new Error(
      "This book is currently unavailable, all copies are borrowed."
    );
  }
  return book;
};

// Helper function to check if a user exists
const isUserExists = async (borrowed_by) => {
  const user = await User.findById(borrowed_by);
  if (!user) {
    throw new Error("User not found. Please check the User ID.");
  }
  return user;
};

// Helper function to check if a user has already borrowed the same book
const hasUserAlreadyBorrowedBook = async (borrowed_by, borrowed_book) => {
  const existingBorrow = await Borrow.findOne({
    borrowed_by,
    borrowed_book,
    status: "borrowed",
  });
  if (existingBorrow) {
    throw new Error(
      "You have already borrowed this book and have not returned it yet."
    );
  }
};

// Helper function to calculate overdue days
const calculateOverdueDays = (expectedReturnDate, currentDate) => {
  const returnDate = new Date(expectedReturnDate).setHours(0, 0, 0, 0);
  const today = new Date(currentDate).setHours(0, 0, 0, 0);
  return Math.max(0, Math.floor((today - returnDate) / (1000 * 60 * 60 * 24)));
};

// Borrow a book
export const borrowBook = async (req, res) => {
  try {
    const { borrowed_by, borrowed_book, expected_return_date } = req.body;

    if (!borrowed_by || !borrowed_book || !expected_return_date) {
      return res.status(400).json({
        message: "Please provide User ID, Book ID, and Expected Return Date.",
      });
    }

    const expectedReturnDate = new Date(expected_return_date);
    if (
      isNaN(expectedReturnDate.getTime()) ||
      expectedReturnDate < new Date()
    ) {
      return res.status(400).json({
        message: "Invalid Expected Return Date. It cannot be in the past.",
      });
    }

    const user = await isUserExists(borrowed_by);
    const book = await isBookAvailable(borrowed_book);
    await hasUserAlreadyBorrowedBook(borrowed_by, borrowed_book);

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

    if (book.available_copies > 0) {
      book.available_copies -= 1;
      await Promise.all([book.save(), borrow.save()]);
    }
    res.status(201).json({ borrow });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({
      error: error.message || "An error occurred. Please try again later.",
    });
  }
};

// Return a book with fine calculation
export const returnBook = async (req, res) => {
  try {
    const { borrowId } = req.params;

    const borrow = await Borrow.findById(borrowId);
    if (!borrow) {
      return res.status(404).json({ message: "Borrow record not found." });
    }

    const book = await Book.findById(borrow.borrowed_book);
    if (!book) {
      return res.status(404).json({ message: "Associated book not found." });
    }

    if (borrow.status === "returned") {
      return res
        .status(400)
        .json({ message: "This book has already been returned." });
    }

    const currentDate = new Date();
    const overdueDays = calculateOverdueDays(
      borrow.expected_return_date,
      currentDate
    );

    const overdueFine = overdueDays * book.borrow_fine;

    borrow.return_date = currentDate;
    borrow.status = "returned";
    borrow.total_borrowed_fine = overdueFine;

    book.available_copies += 1;

    await Promise.all([book.save(), borrow.save()]);

    res.status(200).json({
      message: "Book returned successfully",
      borrow: {
        ...borrow.toObject(),
        total_price_paid: borrow.total_borrow_price + overdueFine,
      },
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({
      error: error.message || "An error occurred. Please try again later.",
    });
  }
};

// Get all borrow records with fine calculation
export const getBorrowRecords = async (req, res) => {
  try {
    const records = await Borrow.find()
      .populate("borrowed_by", "user_name email")
      .populate("borrowed_book", "title author borrow_fine pdf_files");

    const updatedRecords = records.map((record) => {
      // Add null check for borrowed_book
      if (!record.borrowed_book) {
        return {
          ...record.toObject(),
          total_borrowed_fine: 0,
        };
      }

      const overdueDays = calculateOverdueDays(
        record.expected_return_date,
        new Date()
      );

      const lateFine =
        overdueDays > 0 && record.status === "borrowed"
          ? overdueDays * (record.borrowed_book.borrow_fine || 0) // Add fallback value
          : 0;

      return {
        ...record.toObject(),
        total_borrowed_fine: lateFine,
      };
    });

    res.json(updatedRecords);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: "An error occurred while retrieving borrow records.",
    });
  }
};
