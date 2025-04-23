import Book from "../models/bookModel.js";
import User from "../models/userModel.js";
import Transaction from "../models/transactionModel.js";
import InstallmentPlan from "../models/installmentModel.js"; // Fix import path

// Helper function to check if a book with given ISBN exists
const checkIfBookExists = async (isbn) => {
  return await Book.findOne({ isbn });
};

// Create a new book
export const createBook = async (req, res) => {
  try {
    const {
      title,
      author,
      isbn,
      description = "",
      category,
      publisher,
      publication_date,
      total_copies = 1,
      price = 0,
      borrow_price = 0,
      borrow_fine = 0,
      pdf_files = [],
      uploaded_by,
      is_purchased,
    } = req.body;

    // Check if essential fields are present
    if (!title || !author || !isbn) {
      return res
        .status(400)
        .json({ message: "Title, author, and ISBN are required" });
    }

    // Check if ISBN is unique
    const existingBook = await checkIfBookExists(isbn);
    if (existingBook) {
      return res
        .status(400)
        .json({ message: "Book with this ISBN already exists" });
    }

    // Create and save the new book
    const book = new Book({
      title,
      author,
      isbn,
      description,
      category,
      publisher,
      publication_date,
      total_copies,
      available_copies: total_copies,
      price,
      borrow_price,
      borrow_fine,
      pdf_files,
      uploaded_by,
      is_purchased,
    });

    await book.save();
    res.status(201).json({ message: "Book created successfully", book });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Get all books
export const getBooks = async (req, res) => {
  try {
    const books = await Book.find();
    res.json(books);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Get a single book by ID
export const getBook = async (req, res) => {
  try {
    const book = await Book.findById(req.params.id);
    if (!book) return res.status(404).json({ message: "Book not found" });
    res.json(book);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Delete a book by ID
export const deleteBook = async (req, res) => {
  try {
    const book = await Book.findByIdAndDelete(req.params.id);
    if (!book) return res.status(404).json({ message: "Book not found" });
    res.json({ message: "Book deleted successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Edit a book by ID
export const editBook = async (req, res) => {
  console.log("Server: Received edit book request for ID:", req.params.id);
  console.log("Request body:", req.body);

  try {
    const {
      title,
      author,
      isbn,
      description,
      category,
      publisher,
      publication_date,
      total_copies,
      price,
      borrow_price,
      borrow_fine,
      pdf_files,
      uploaded_by,
      is_purchased,
      cover_image_url, // Make sure to include this
    } = req.body;

    const book = await Book.findById(req.params.id);
    console.log("Found existing book:", book);

    if (!book) return res.status(404).json({ message: "Book not found" });

    // Check if ISBN is unique if changed
    if (isbn !== book.isbn) {
      console.log("ISBN changed, checking uniqueness...");
      const existingBook = await checkIfBookExists(isbn);
      if (existingBook)
        return res
          .status(400)
          .json({ message: "Book with this ISBN already exists" });
    }

    const available_copies = total_copies
      ? total_copies - (book.total_copies - book.available_copies)
      : book.available_copies;

    console.log("Calculated available copies:", available_copies);

    const updatedBook = await Book.findByIdAndUpdate(
      req.params.id,
      {
        title,
        author,
        isbn,
        description,
        category,
        publisher,
        publication_date,
        total_copies,
        available_copies,
        price,
        borrow_price,
        borrow_fine,
        pdf_files,
        uploaded_by,
        is_purchased,
        cover_image_url, // Make sure to include this in the update
      },
      { new: true }
    );

    console.log("Updated book in database:", updatedBook);
    res
      .status(200)
      .json({ message: "Book updated successfully", book: updatedBook });
  } catch (error) {
    console.error("Server error during book update:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Purchase a book
export const purchaseBook = async (req, res) => {
  try {
    const {
      purchased_by,
      purchased_book,
      quantity,
      payment_details,
      payment_type,
      installment_plan,
    } = req.body;

    // Validate request data
    if (!purchased_by || !purchased_book || !quantity) {
      return res.status(400).json({
        message: "User ID, Book ID, and quantity are required",
      });
    }

    if (payment_type === "installment" && !installment_plan) {
      return res.status(400).json({
        message: "Installment plan is required for installment payments",
      });
    }

    // Check if payment type is valid
    if (!["full", "installment"].includes(payment_type)) {
      return res.status(400).json({
        message: "Invalid payment type",
      });
    }

    const book = await Book.findById(purchased_book);
    if (!book) return res.status(404).json({ message: "Book not found" });

    const user = await User.findById(purchased_by);
    if (!user) return res.status(404).json({ message: "User not found" });

    const totalPrice = book.price * quantity;

    if (payment_type === "installment") {
      // Check existing active installment plan
      const existingPlan = await InstallmentPlan.findOne({
        user: purchased_by,
        book: purchased_book,
        status: "active",
      });

      if (existingPlan) {
        return res.status(400).json({
          message: "You already have an active installment plan for this book",
          existingPlan,
        });
      }

      // Validate installment plan duration
      const months = parseInt(installment_plan);
      if (!["3", "6", "12"].includes(String(months))) {
        return res.status(400).json({
          message: "Invalid installment plan duration",
        });
      }

      // Create installment plan with interest
      const interest = 0.05;
      const totalWithInterest = totalPrice * (1 + interest);
      const amountPerInstallment = +(totalWithInterest / months).toFixed(2);

      const nextPaymentDate = new Date();
      nextPaymentDate.setMonth(nextPaymentDate.getMonth() + 1);

      const plan = new InstallmentPlan({
        user: purchased_by,
        book: purchased_book,
        plan_type: installment_plan,
        total_amount: totalWithInterest,
        amount_per_installment: amountPerInstallment,
        paid_installments: 1,
        total_installments: months,
        next_payment_date: nextPaymentDate,
        status: "active",
        last_payment_status: "success",
        payment_history: [
          {
            amount: amountPerInstallment,
            date: new Date(),
            payment_number: 1,
            status: "success",
          },
        ],
        payments: [
          {
            amount: amountPerInstallment,
            date: new Date(),
            payment_number: 1,
          },
        ],
      });

      await plan.save();

      // Create transaction with the saved plan ID
      const transaction = new Transaction({
        user: purchased_by,
        book: purchased_book,
        quantity,
        total_price: amountPerInstallment, // First installment amount
        status: "success",
        payment_type: "installment",
        payment_details,
        installment_plan: plan._id, // Use the saved plan's ID
        payment_number: 1,
      });

      await transaction.save();

      // Update book and user
      book.available_copies -= quantity;
      book.is_purchased = true;
      book.purchased_date = new Date();
      await book.save();

      user.purchased_books.push(purchased_book);
      user.transactions.push(transaction._id);
      await user.save();

      res.status(200).json({
        message: "Book purchased successfully with installment plan",
        transaction,
        plan,
      });
    } else {
      // Handle full payment
      const transaction = new Transaction({
        user: purchased_by,
        book: purchased_book,
        quantity,
        total_price: totalPrice,
        status: "success",
        payment_type: "full",
        payment_details,
      });

      await transaction.save();

      book.available_copies -= quantity;
      book.is_purchased = true;
      book.purchased_date = new Date();
      await book.save();

      user.purchased_books.push(purchased_book);
      user.transactions.push(transaction._id);
      await user.save();

      res.status(200).json({
        message: "Book purchased successfully",
        transaction,
      });
    }
  } catch (error) {
    console.error("Purchase error:", error);
    res.status(500).json({
      error: "Internal server error",
      details: error.message,
    });
  }
};
