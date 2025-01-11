import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    full_name: { type: String, required: true },
    password: { type: String, minlength: 5, required: true },
    role: {
      type: String,
      enum: ["admin", "user"],
      default: "user",
    },
    walletBalance: { type: Number, default: 1000000000 },
    transactions: [
      { type: mongoose.Schema.Types.ObjectId, ref: "Transaction" },
    ],
    address: {
      street: { type: String },
      city: { type: String },
      state: { type: String },
      country: { type: String },
      postalCode: { type: String },
    },
    resetPasswordToken: { type: String },
    resetPasswordExpires: { type: Date },
    borrowedBooks: [{ type: mongoose.Schema.Types.ObjectId, ref: "Borrow" }],
  },
  { timestamps: true }
);

const User = mongoose.model("User", userSchema);

export default User;
