import mongoose from 'mongoose';

const OrderSchema = new mongoose.Schema({
  bill_number: {
    type: String,
    required: true,
    unique: true,
    index: true,
    trim: true
  },
  mobile_number: {
    type: String,
    required: true,
    index: true,
    trim: true
  },
  order_date: {
    type: Date,
    default: Date.now
  },
  measurement_image_path: {
    type: String,
    required: true
  },
  total_amount: {
    type: Number,
    required: true
  },
  advance_amount: {
    type: Number,
    default: 0
  },
  balance_amount: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    enum: ['Undelivered', 'Delivered'],
    default: 'Undelivered'
  },
  delivery_date: {
    type: Date,
    default: null
  },
  created_at: {
    type: Date,
    default: Date.now
  }
});

export default mongoose.model('Order', OrderSchema);
