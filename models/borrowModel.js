import mongoose from "mongoose";

const borrowSchema = new mongoose.Schema(
  {
    borrowed_by: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    borrowed_book: { type: mongoose.Schema.Types.ObjectId, ref: "Book" },
    borrowed_date: { type: Date, default: Date.now },
    expected_return_date: { type: Date, required: true },
    return_date: { type: Date },
    status: { type: String, default: "borrowed" },
    total_borrowed_fine: { type: Number, default: 0.0 },
  },
  { timestamps: true }
);

const Borrow = mongoose.model("Borrow", borrowSchema);

export default Borrow;
