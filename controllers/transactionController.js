import Transaction from "../models/transactionModel.js";
import Book from "../models/bookModel.js";
import User from "../models/userModel.js";

// Create a new transaction
export const createTransaction = async (req, res) => {
  try {
    const { userId, bookId, quantity } = req.body;

    // Validate required fields
    if (!userId || !bookId || !quantity) {
      return res.status(400).json({
        message: "All fields (userId, bookId, quantity) are required.",
      });
    }

    // Check if the user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    // Check if the book exists
    const book = await Book.findById(bookId);
    if (!book) {
      return res.status(404).json({ message: "Book not found." });
    }

    // Check book availability
    if (book.available_copies < quantity) {
      return res
        .status(400)
        .json({ message: "Not enough copies available for purchase." });
    }

    // Calculate total price
    const totalPrice = book.price * quantity;

    // Create and save the new transaction
    const transaction = new Transaction({
      user: userId,
      book: bookId,
      quantity,
      total_price: totalPrice,
      status: "success",
    });

    await transaction.save();

    // Update the book's available copies
    book.available_copies -= quantity;
    await book.save();

    // Add transaction to the user's transaction history
    user.transactions.push(transaction._id);
    await user.save();

    res.status(201).json({
      message: "Transaction created successfully.",
      transaction,
    });
  } catch (error) {
    console.error("Error creating transaction:", error);
    res.status(500).json({ error: "Server error. Please try again later." });
  }
};

// Get all transactions
export const getAllTransactions = async (req, res) => {
  try {
    const transactions = await Transaction.find()
      .populate("user", "user_name email")
      .populate("book", "title author")
      .exec();

    res.json(transactions);
  } catch (error) {
    console.error("Error fetching transactions:", error);
    res.status(500).json({ error: "Server error. Please try again later." });
  }
};

// Get a transaction by ID
export const getTransactionById = async (req, res) => {
  try {
    const { transactionId } = req.params;

    const transaction = await Transaction.findById(transactionId)
      .populate("user", "user_name email")
      .populate("book", "title author")
      .exec();

    if (!transaction) {
      return res.status(404).json({ message: "Transaction not found" });
    }

    res.json(transaction);
  } catch (error) {
    console.error("Error fetching transaction:", error);
    res.status(500).json({ error: "Server error. Please try again later." });
  }
};

// Delete a transaction
export const deleteTransaction = async (req, res) => {
  try {
    const { transactionId } = req.params;

    const transaction = await Transaction.findByIdAndDelete(transactionId);
    if (!transaction) {
      return res.status(404).json({ message: "Transaction not found" });
    }

    // Update user's transaction history
    await User.findByIdAndUpdate(transaction.user, {
      $pull: { transactions: transactionId },
    });

    res.json({ message: "Transaction deleted successfully" });
  } catch (error) {
    console.error("Error deleting transaction:", error);
    res.status(500).json({ error: "Server error. Please try again later." });
  }
};

// Get transactions for a specific user
export const getUserTransactions = async (req, res) => {
  try {
    const { userId } = req.params;

    const transactions = await Transaction.find({ user: userId })
      .populate("book", "title author")
      .exec();

    if (!transactions || transactions.length === 0) {
      return res
        .status(404)
        .json({ message: "No transactions found for this user" });
    }

    res.json(transactions);
  } catch (error) {
    console.error("Error fetching user transactions:", error);
    res.status(500).json({ error: "Server error. Please try again later." });
  }
};
