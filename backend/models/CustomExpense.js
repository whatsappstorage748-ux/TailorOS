import mongoose from 'mongoose';

const CustomExpenseSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  amount: {
    type: Number,
    required: true
  },
  month: {
    type: String, // format: YYYY-MM
    required: true,
    index: true
  },
  date: {
    type: Date,
    default: Date.now
  }
});

export default mongoose.model('CustomExpense', CustomExpenseSchema);
