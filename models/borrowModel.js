import mongoose from "mongoose";

const borrowSchema = new mongoose.Schema(
  {
    borrowed_by: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    borrowed_book: { type: mongoose.Schema.Types.ObjectId, ref: "Book" },
    borrowed_date: { type: Date, default: Date.now },
    expected_return_date: { type: Date, required: true },
    return_date: { type: Date },
    status: { type: String, default: "borrowed" },
    total_borrowed_fine: { type: Number, default: 0 },
    total_price: { type: Number, required: true },
    total_borrow_price: { type: Number, default: 0 },
    transaction: { type: mongoose.Schema.Types.ObjectId, ref: "Transaction" },
  },
  { timestamps: true }
);

// Calculate overdue fine and refunds for early returns
borrowSchema.pre("save", async function (next) {
  if (this.isNew) {
    const book = await mongoose.model("Book").findById(this.borrowed_book);
    if (book) {
      if (book.available_copies > 0) {
        // Reduce the available copies when a book is borrowed
        book.available_copies -= 1;
        await book.save();
      } else {
        return next(new Error("No copies available to borrow"));
      }
    }
  } else if (this.return_date) {
    // When the book is returned
    const book = await mongoose.model("Book").findById(this.borrowed_book);
    if (book) {
      // Increase available copies when the book is returned
      book.available_copies += 1;
      await book.save();
    }
  }

  if (this.return_date) {
    const currentDate = new Date();

    // Calculate overdue fine if return date exceeds expected return date
    if (this.return_date > this.expected_return_date) {
      const overdueDays = Math.ceil(
        (this.return_date - this.expected_return_date) / (1000 * 60 * 60 * 24)
      );
      const book = await mongoose.model("Book").findById(this.borrowed_book);
      if (book && book.borrow_fine) {
        this.total_borrowed_fine = overdueDays * book.borrow_fine;
      }
    }

    // Calculate refund if return date is earlier than expected return date
    if (this.return_date < this.expected_return_date) {
      const unusedDays = Math.floor(
        (this.expected_return_date - this.return_date) / (1000 * 60 * 60 * 24)
      );
      const dailyBorrowPrice =
        this.total_borrow_price /
        Math.ceil(
          (this.expected_return_date - this.borrowed_date) /
            (1000 * 60 * 60 * 24)
        );

      const refundAmount = unusedDays * dailyBorrowPrice;
      this.total_borrow_price -= refundAmount;

      if (this.total_borrow_price < 0) this.total_borrow_price = 0;
    }
  }
  next();
});

const Borrow = mongoose.model("Borrow", borrowSchema);

export default Borrow;
