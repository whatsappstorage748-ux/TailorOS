import mongoose from 'mongoose';

const EmployeeSalarySchema = new mongoose.Schema({
  employee_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: true,
    index: true
  },
  month: {
    type: String, // format: YYYY-MM e.g. 2026-06
    required: true,
    index: true
  },
  status: {
    type: String,
    enum: ['Paid', 'Unpaid'],
    default: 'Unpaid'
  },
  amount: {
    type: Number,
    required: true
  }
});

// Compound index to prevent duplicate entries for the same employee in the same month
EmployeeSalarySchema.index({ employee_id: 1, month: 1 }, { unique: true });

export default mongoose.model('EmployeeSalary', EmployeeSalarySchema);
