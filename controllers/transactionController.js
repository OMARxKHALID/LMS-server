import Transaction from "../models/transactionModel.js";
import Book from "../models/bookModel.js";
import User from "../models/userModel.js";
import InstallmentPlan from "../models/installmentModel.js";

// Create a new transaction
export const createTransaction = async (req, res) => {
  try {
    const { userId, bookId, quantity, payment_type, installment_plan } =
      req.body;

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

    if (payment_type === "installment") {
      // Validate if user already has an active plan for this book
      const existingPlan = await InstallmentPlan.findOne({
        user: userId,
        book: bookId,
        status: "active",
      });

      if (existingPlan) {
        return res.status(400).json({
          message: "You already have an active installment plan for this book.",
        });
      }

      // Calculate installment details
      const totalAmount = book.price;
      const months = parseInt(installment_plan);
      const amountPerInstallment = totalAmount / months;
      const nextPaymentDate = new Date();
      nextPaymentDate.setMonth(nextPaymentDate.getMonth() + 1);

      // Create installment plan
      const plan = new InstallmentPlan({
        user: userId,
        book: bookId,
        plan_type: installment_plan,
        total_amount: totalAmount,
        amount_per_installment: amountPerInstallment,
        paid_installments: 1,
        total_installments: months,
        next_payment_date: nextPaymentDate,
        payments: [
          {
            amount: amountPerInstallment,
            date: new Date(),
            payment_number: 1,
          },
        ],
      });

      await plan.save();

      // Create first transaction
      const transaction = new Transaction({
        user: userId,
        book: bookId,
        quantity,
        total_price: amountPerInstallment,
        payment_type: "installment",
        installment_plan: plan._id,
        payment_number: 1,
        status: "success",
        payment_details: req.body.payment_details,
      });

      await transaction.save();

      res.status(201).json({
        message: "Installment plan created successfully.",
        transaction,
        plan,
      });
      return;
    }

    // Calculate total price
    const totalPrice = book.price * quantity;

    // Create and save the new transaction
    const transaction = new Transaction({
      user: userId,
      book: bookId,
      quantity,
      total_price: totalPrice,
      payment_type: "full",
      status: "success",
      payment_details: req.body.payment_details,
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
      .populate("book", "title author price")
      .populate("installment_plan")
      .sort({ createdAt: -1 }) // Sort by most recent first
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

// Process installment payment
export const processInstallmentPayment = async (req, res) => {
  try {
    const { planId } = req.params;
    const plan = await InstallmentPlan.findById(planId);

    if (!plan || plan.is_completed) {
      return res.status(400).json({
        message: "Invalid plan or already completed",
      });
    }

    // Process next payment
    plan.paid_installments += 1;
    plan.payments.push({
      amount: plan.amount_per_installment,
      date: new Date(),
      payment_number: plan.paid_installments,
    });

    // Update next payment date
    const nextDate = new Date(plan.next_payment_date);
    nextDate.setMonth(nextDate.getMonth() + 1);
    plan.next_payment_date = nextDate;

    // Check if plan is completed
    if (plan.paid_installments === plan.total_installments) {
      plan.is_completed = true;
      plan.status = "completed";
    }

    await plan.save();

    res.status(200).json({ message: "Payment processed successfully", plan });
  } catch (error) {
    console.error("Error processing installment:", error);
    res.status(500).json({ error: "Server error" });
  }
};
