import mongoose from 'mongoose';

const ClothConfigSchema = new mongoose.Schema({
  cloth_type: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  default_price: {
    type: Number,
    required: true
  },
  created_at: {
    type: Date,
    default: Date.now
  }
});

export default mongoose.model('ClothConfig', ClothConfigSchema);
