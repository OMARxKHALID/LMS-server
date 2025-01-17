import mongoose from "mongoose";

const borrowSchema = new mongoose.Schema(
  {
    borrowed_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    borrowed_book: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Book",
      required: true,
    },
    borrowed_date: { type: Date, default: Date.now },
    expected_return_date: { type: Date, required: true },
    return_date: { type: Date },
    status: {
      type: String,
      enum: ["borrowed", "returned"],
      default: "borrowed",
    },
    total_borrowed_fine: { type: Number, default: 0 },
    total_price: { type: Number, required: true },
    total_borrow_price: { type: Number, default: 0 },
    transaction: { type: mongoose.Schema.Types.ObjectId, ref: "Transaction" },
  },
  { timestamps: true }
);

// Helper to calculate date differences in days
const calculateDays = (start, end) =>
  Math.ceil((end - start) / (1000 * 60 * 60 * 24));

// Pre-save hook to manage book copies and calculate fines/refunds
borrowSchema.pre("save", async function (next) {
  try {
    const Book = mongoose.model("Book");
    const book = await Book.findById(this.borrowed_book);

    if (!book) {
      return next(new Error("Book not found"));
    }

    if (this.isNew) {
      // Handle borrow logic
      if (book.available_copies > 0) {
        book.available_copies -= 1;
        await book.save();
      } else {
        return next(new Error("No copies available to borrow"));
      }
    } else if (this.return_date) {
      // Handle return logic
      book.available_copies += 1;
      await book.save();

      const overdueDays = calculateDays(
        this.expected_return_date,
        this.return_date
      );

      if (this.return_date > this.expected_return_date && book.borrow_fine) {
        this.total_borrowed_fine = overdueDays * book.borrow_fine;
      } else if (this.return_date < this.expected_return_date) {
        const unusedDays = calculateDays(
          this.return_date,
          this.expected_return_date
        );
        const totalDays = calculateDays(
          this.borrowed_date,
          this.expected_return_date
        );
        const dailyPrice = this.total_borrow_price / totalDays;
        this.total_borrow_price = Math.max(
          0,
          this.total_borrow_price - unusedDays * dailyPrice
        );
      }
    }

    next();
  } catch (error) {
    next(error);
  }
});

const Borrow = mongoose.model("Borrow", borrowSchema);

export default Borrow;
