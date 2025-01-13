import mongoose from "mongoose";

const bookSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    author: { type: String, required: true },
    isbn: { type: String, required: true, unique: true },
    description: { type: String, default: "" },
    category: { type: mongoose.Schema.Types.ObjectId, ref: "Category" },
    cover_image_url: { type: String },
    pdf_files: [{ type: String }],
    borrow_fine: { type: Number },
    price: { type: Number },
    borrow_price: { type: Number },
    publication_date: { type: Date },
    publisher: { type: String },
    total_copies: { type: Number, default: 100 },
    available_copies: { type: Number, default: 100 },
    uploaded_by: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    is_purchased: { type: Boolean, default: false },
    purchased_date: { type: Date },
  },
  { timestamps: true }
);

// Method to check if a book is available for borrowing
bookSchema.statics.isAvailableForBorrow = async function (bookId) {
  const book = await this.findById(bookId);
  return book && book.available_copies > 0;
};

const Book = mongoose.model("Book", bookSchema);

export default Book;
