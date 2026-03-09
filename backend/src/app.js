import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.routes.js';
import roomRoutes from './routes/room.routes.js';
import voiceRoutes from './routes/voice.routes.js';

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/voice', voiceRoutes);

// Health check
app.get('/', (req, res) => {
  res.json({ success: true, message: 'LetsPlay API is running' });
});

export default app;
