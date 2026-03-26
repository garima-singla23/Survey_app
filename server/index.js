import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import dnaRoutes from './routes/dna.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const defaultVercelUrl = 'https://student-dna-report.vercel.app';

const allowedOrigins = [
  'http://localhost:5173',
  process.env.FRONTEND_URL || defaultVercelUrl
];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    }
  })
);
app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'Student DNA Report API' });
});

app.use('/api/dna', dnaRoutes);

const startServer = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB connected');
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Server startup error:', error.message);
    process.exit(1);
  }
};

startServer();
