import mongoose from 'mongoose';

const OrderItemSchema = new mongoose.Schema({
  bill_number: {
    type: String,
    required: true,
    index: true,
    trim: true
  },
  cloth_type: {
    type: String,
    required: true,
    trim: true
  },
  quantity: {
    type: Number,
    required: true
  },
  price_per_cloth: {
    type: Number,
    required: true
  },
  total_amount: {
    type: Number,
    required: true
  }
});

export default mongoose.model('OrderItem', OrderItemSchema);
