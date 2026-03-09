import express from 'express';
import { getRooms, createRoom, getRoom, deleteRoom } from '../controllers/roomController/room.controller.js';
import { protect } from '../middleware/auth.middleware.js';

const router = express.Router();

router.get('/', protect, getRooms);
router.post('/', protect, createRoom);
router.get('/:id', protect, getRoom);
router.delete('/:id', protect, deleteRoom);

export default router;
