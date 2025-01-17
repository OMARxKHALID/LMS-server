import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    user_name: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    full_name: { type: String, required: true },
    password: { type: String, minlength: 5, required: true },
    role: {
      type: String,
      enum: ["admin", "user"],
      default: "user",
    },
    wallet_balance: { type: Number, default: 1000000000 },
    transactions: [
      { type: mongoose.Schema.Types.ObjectId, ref: "Transaction" },
    ],
    address: {
      street: { type: String },
      city: { type: String },
      state: { type: String },
      country: { type: String },
      postal_code: { type: String },
    },
    reset_password_token: { type: String },
    reset_password_expires: { type: Date },
    borrowed_books: [{ type: mongoose.Schema.Types.ObjectId, ref: "Borrow" }],
    purchased_books: [{ type: mongoose.Schema.Types.ObjectId, ref: "Book" }],
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
  },
  { timestamps: true }
);

// Limit the number of books a user can borrow
userSchema.pre("save", async function (next) {
  const user = this;
  if (user.role === "user" && user.borrowed_books.length >= 5) {
    // Example limit of 5 books
    return next(new Error("You cannot borrow more than 5 books at a time"));
  }
  next();
});

const User = mongoose.model("User", userSchema);

export default User;
