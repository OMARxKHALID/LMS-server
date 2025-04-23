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
      default: "pending",
    },
    payment_details: {
      last_four: {
        type: String,
        required: true,
        minlength: 4,
        maxlength: 4,
      },
      card_holder: {
        type: String,
        required: true,
      },
      expiry_date: {
        type: String,
        required: true,
        validate: {
          validator: function (v) {
            return /^(0[1-9]|1[0-2])\/\d{2}$/.test(v);
          },
          message: (props) =>
            `${props.value} is not a valid expiry date format (MM/YY)!`,
        },
      },
      card_type: {
        type: String,
        enum: ["Visa", "Mastercard", "American Express", "Invalid Card"],
        required: true,
        validate: {
          validator: function (v) {
            return ["Visa", "Mastercard", "American Express"].includes(v);
          },
          message: (props) => `${props.value} is not a valid card type`,
        },
      },
    },
    payment_type: {
      type: String,
      enum: ["full", "installment"],
      required: true,
    },
    installment_plan: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "InstallmentPlan",
    },
    payment_number: Number,
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
