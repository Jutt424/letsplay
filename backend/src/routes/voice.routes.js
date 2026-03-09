import express from 'express';
import { getRtpCapabilities, createTransport } from '../controllers/voiceController/voice.controller.js';
import { protect } from '../middleware/auth.middleware.js';

const router = express.Router();

router.get('/rtp-capabilities/:roomId', protect, getRtpCapabilities);
router.post('/transport/create', protect, createTransport);

export default router;
