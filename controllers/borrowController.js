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

// Helper function to calculate the borrow price
const calculateBorrowPrice = (borrowDays, borrowPrice) => {
  return borrowDays * borrowPrice;
};

// Helper function to update the borrow record and book availability
const updateBorrowAndBook = async (borrow, book, user) => {
  // Reduce available copies of the book
  book.available_copies -= 1;

  // Add the borrow record to the user's borrowedBooks
  user.borrowed_books.push(borrow._id);

  // Save the borrow, book, and user
  await Promise.all([user.save(), book.save(), borrow.save()]);
};

// Borrow a book
export const borrowBook = async (req, res) => {
  try {
    const { borrowed_by, borrowed_book, expected_return_date } = req.body;

    // Validate input fields
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

    // Check if the user exists
    const user = await isUserExists(borrowed_by);

    // Check if the book is available
    const book = await isBookAvailable(borrowed_book);

    // Check if the user already borrowed the same book and hasn't returned it
    await hasUserAlreadyBorrowedBook(borrowed_by, borrowed_book);

    // Calculate borrow price based on expected return date
    const borrowDays = Math.ceil(
      (expectedReturnDate - new Date()) / (1000 * 60 * 60 * 24)
    );
    const totalBorrowPrice = calculateBorrowPrice(
      borrowDays,
      book.borrow_price
    );

    // Create a new borrow record
    const borrow = new Borrow({
      borrowed_by,
      borrowed_book,
      expected_return_date,
      total_borrow_price: totalBorrowPrice,
      total_price: book.price,
    });

    // Update borrow record and book availability
    await updateBorrowAndBook(borrow, book, user);

    res.status(201).json({
      borrow,
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({
      error: error.message || "An error occurred. Please try again later.",
    });
  }
};

// Return a book
export const returnBook = async (req, res) => {
  try {
    const { borrowId } = req.params;

    // Find the borrow record
    const borrow = await Borrow.findById(borrowId);
    if (!borrow) {
      return res.status(404).json({
        message: "Borrow record not found. Please check the Borrow ID.",
      });
    }

    const book = await Book.findById(borrow.borrowed_book);
    if (!book) {
      return res.status(404).json({
        message: "The associated book was not found.",
      });
    }

    if (borrow.return_date) {
      return res.status(400).json({
        message: "This book has already been returned.",
      });
    }

    const currentDate = new Date();

    // Update borrow record with return date and fine
    borrow.return_date = currentDate;
    borrow.status = "returned";

    // Calculate overdue fine if any
    const overdueFine = borrow.total_borrowed_fine;

    // Save the borrow record
    await borrow.save();

    // Increase available copies of the book
    book.available_copies += 1;

    // Save the updated book
    await book.save();

    // Return updated borrow record
    const updatedBorrow = {
      ...borrow.toObject(),
      late_fine: overdueFine,
      total_price_paid: borrow.total_borrow_price + overdueFine,
    };

    res.status(200).json(updatedBorrow);
  } catch (error) {
    console.error(error.message);
    res.status(500).json({
      error:
        error.message ||
        "An error occurred while returning the book. Please try again later.",
    });
  }
};

// Get all borrow records
export const getBorrowRecords = async (req, res) => {
  try {
    // Fetch borrow records with populated user and book details
    const records = await Borrow.find()
      .populate("borrowed_by", " user_name email")
      .populate("borrowed_book", "title authors borrowed_fine pdf_files");

    // Calculate late fine for each record
    const updatedRecords = records.map((record) => {
      return {
        ...record.toObject(),
        late_fine: record.total_borrowed_fine || 0,
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
