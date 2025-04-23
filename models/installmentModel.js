import mongoose from "mongoose";

const installmentPlanSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  book: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Book",
    required: true,
  },
  plan_type: {
    type: String,
    enum: ["3months", "6months", "12months"],
    required: true,
  },
  total_amount: {
    type: Number,
    required: true,
  },
  amount_per_installment: {
    type: Number,
    required: true,
  },
  paid_installments: {
    type: Number,
    default: 0,
  },
  total_installments: {
    type: Number,
    required: true,
  },
  start_date: {
    type: Date,
    default: Date.now,
  },
  next_payment_date: {
    type: Date,
    required: true,
  },
  is_completed: {
    type: Boolean,
    default: false,
  },
  payments: [
    {
      amount: Number,
      date: Date,
      payment_number: Number,
    },
  ],
  status: {
    type: String,
    enum: ["active", "completed", "defaulted", "cancelled"],
    default: "active",
  },
  last_payment_status: {
    type: String,
    enum: ["pending", "success", "failed"],
    default: "pending",
  },
  payment_history: [
    {
      amount: Number,
      date: Date,
      payment_number: Number,
      status: {
        type: String,
        enum: ["success", "failed"],
        default: "success",
      },
    },
  ],
});

export default mongoose.model("InstallmentPlan", installmentPlanSchema);
