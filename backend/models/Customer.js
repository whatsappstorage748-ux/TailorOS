import mongoose from 'mongoose';

const CustomerSchema = new mongoose.Schema({
  mobile_number: {
    type: String,
    required: true,
    unique: true,
    index: true,
    trim: true
  },
  customer_name: {
    type: String,
    required: true,
    trim: true
  },
  created_at: {
    type: Date,
    default: Date.now
  }
});

export default mongoose.model('Customer', CustomerSchema);
