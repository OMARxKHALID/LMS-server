import mongoose from "mongoose";

const bookSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    author: { type: String, required: true },
    isbn: { type: String, required: true, unique: true },
    description: { type: String },
    publisher: { type: String },
    publication_date: { type: Date },
    category: { type: mongoose.Schema.Types.ObjectId, ref: "Category" },
    total_copies: { type: Number, default: 1 },
    available_copies: { type: Number, default: 1 },
    cover_image_url: { type: String },
    location: { type: String },
    price: { type: Number },
    borrow_price: { type: Number },
    borrowed_fine: { type: Number },
    pdf_files: { type: Array },
    uploaded_by: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

const Book = mongoose.model("Book", bookSchema);

export default Book;
