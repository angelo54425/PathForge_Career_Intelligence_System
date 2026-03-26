import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

import authRouter from './routes/auth';
import careersRouter from './routes/careers';
import alignmentRouter from './routes/alignment';
import gapRouter from './routes/gap';
import similarityRouter from './routes/similarity';
import assessmentRouter from './routes/assessment';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

const allowedOrigins = [
  process.env.FRONTEND_URL || "http://localhost:3000",
  "https://pathforge.live",
  "https://www.pathforge.live",
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`CORS blocked: ${origin}`));
    }
  },
  credentials: true,
}));
app.use(express.json());

// Routes
app.use('/api/auth', authRouter);
app.use('/careers', careersRouter);
app.use('/api/alignment', alignmentRouter);
app.use('/api/gap', gapRouter);
app.use('/api/similarity', similarityRouter);
app.use('/api/assessment', assessmentRouter);

// Health check
app.get('/health', (req, res) => res.send('OK'));

app.listen(PORT, () => {
  console.log(`PathForge backend running on http://localhost:${PORT}`);
});