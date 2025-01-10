import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    full_name: { type: String, required: true },
    password: { type: String, minLength: 5, required: true },
    userType: {
      type: String,
      enum: ["admin", "user"],
      default: "user",
      required: true,
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
    borrowedBooks: [
      {
        title: { type: String, required: true },
        author: { type: String, required: true },
        pdf: { type: String, required: true },
        borrowed_date: { type: Date, default: Date.now },
        expected_return_date: { type: Date, required: true },
        return_date: { type: Date },
        status: { type: String, required: true },
      },
    ],
  },
  { timestamps: true }
);

const User = mongoose.model("User", userSchema);

export default User;
