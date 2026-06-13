import mongoose from 'mongoose';

const ExpenseSchema = new mongoose.Schema({
  month: {
    type: String, // format: YYYY-MM e.g. 2026-06
    required: true,
    unique: true,
    index: true
  },
  rent: {
    type: Number,
    required: true,
    default: 10000 // Default rent for shop
  },
  electricity: {
    type: Number,
    required: true,
    default: 2000 // Default electricity bill
  }
});

export default mongoose.model('Expense', ExpenseSchema);
