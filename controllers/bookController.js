import Book from "../models/bookModel.js";
import User from "../models/userModel.js";
import Transaction from "../models/transactionModel.js";

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
    } = req.body;

    const book = await Book.findById(req.params.id);
    if (!book) return res.status(404).json({ message: "Book not found" });

    // Check if ISBN is unique if changed
    if (isbn !== book.isbn) {
      const existingBook = await checkIfBookExists(isbn);
      if (existingBook)
        return res
          .status(400)
          .json({ message: "Book with this ISBN already exists" });
    }

    const available_copies = total_copies
      ? total_copies - (book.total_copies - book.available_copies)
      : book.available_copies;

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

    if (!purchased_by || !purchased_book || !quantity) {
      return res
        .status(400)
        .json({ message: "User ID, Book ID, and quantity are required" });
    }

    const book = await Book.findById(purchased_book);
    if (!book) return res.status(404).json({ message: "Book not found" });

    if (book.available_copies < quantity) {
      return res.status(400).json({ message: "Not enough copies available" });
    }

    const user = await User.findById(purchased_by);
    if (!user) return res.status(404).json({ message: "User not found" });

    const totalPrice = book.price * quantity;
    if (user.wallet_balance < totalPrice) {
      return res.status(400).json({ message: "Insufficient funds" });
    }

    const transaction = new Transaction({
      user: purchased_by,
      book: purchased_book,
      quantity,
      total_price: totalPrice,
      status: "success",
    });

    await transaction.save();

    user.wallet_balance -= totalPrice;
    await user.save();

    book.available_copies -= quantity;
    book.is_purchased = true;
    book.purchased_date = new Date();
    await book.save();

    user.purchased_books.push(purchased_book);
    await user.save();

    user.transactions.push(transaction._id);
    await user.save();
    res
      .status(200)
      .json({ message: "Book purchased successfully", transaction });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
};
