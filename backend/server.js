import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import path from 'path';
import shopRoutes from './routes/shopRoutes.js';
import ClothConfig from './models/ClothConfig.js';

const app = express();
const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/tailor-shop';

// Enable CORS for frontend development server
app.use(cors({
  origin: '*', // Allow all during development, can be locked down to localhost:5173
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS']
}));

// Increase limit to allow large base64 image uploads
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Serve static uploaded measurement sheets
app.use('/uploads', express.static(path.resolve('uploads')));

// API Routes
app.use('/api', shopRoutes);

// Database Connection and Server Start
mongoose.connect(MONGODB_URI)
  .then(async () => {
    console.log('Successfully connected to MongoDB');

    // Seed default cloth configurations if empty
    try {
      const configCount = await ClothConfig.countDocuments();
      if (configCount === 0) {
        await ClothConfig.insertMany([
          { cloth_type: 'Shirt', default_price: 500 },
          { cloth_type: 'Pant', default_price: 600 }
        ]);
        console.log('Successfully seeded default cloth configurations (Shirt: 500, Pant: 600)');
      }
    } catch (err) {
      console.error('Error seeding default cloth configurations:', err);
    }

    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  })
  .catch((error) => {
    console.error('Database connection error:', error);
    process.exit(1);
  });
