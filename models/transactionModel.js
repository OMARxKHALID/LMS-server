import mongoose from "mongoose";

const transactionSchema = new mongoose.Schema(
  {
    book: { type: mongoose.Schema.Types.ObjectId, ref: "Book", required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    quantity: { type: Number, required: true },
    total_price: { type: Number, required: true },
    transaction_date: { type: Date, default: Date.now },
    status: {
      type: String,
      enum: ["success", "failed", "pending"],
      default: "success",
    },
  },
  { timestamps: true }
);

// Wallet deduction logic when creating a transaction
transactionSchema.pre("save", async function (next) {
  const user = await mongoose.model("User").findById(this.user);
  if (user) {
    if (user.wallet_balance >= this.total_price) {
      // Deduct wallet balance for the purchase
      user.wallet_balance -= this.total_price;
      await user.save();
    } else {
      return next(new Error("Insufficient funds in wallet"));
    }
  }
  next();
});

const Transaction = mongoose.model("Transaction", transactionSchema);

export default Transaction;
