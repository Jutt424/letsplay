import {
  getOrCreateRouter,
  createWebRtcTransport,
  getRoomData,
} from '../../mediasoup/mediasoup.manager.js';

// GET /api/voice/rtp-capabilities/:roomId
export const getRtpCapabilities = async (req, res) => {
  try {
    const { roomId } = req.params;
    const router = await getOrCreateRouter(roomId);
    return res.status(200).json({
      success: true,
      rtpCapabilities: router.rtpCapabilities,
    });
  } catch (err) {
    console.error('getRtpCapabilities error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// POST /api/voice/transport/create
export const createTransport = async (req, res) => {
  try {
    const { roomId } = req.body;
    const router = await getOrCreateRouter(roomId);
    const { transport, params } = await createWebRtcTransport(router);

    // Store transport temporarily (will be connected via socket)
    const room = getRoomData(roomId);
    if (room) {
      if (!room.peers.has(req.user.id)) {
        room.peers.set(req.user.id, { transports: new Map(), producers: new Map(), consumers: new Map() });
      }
      room.peers.get(req.user.id).transports.set(transport.id, transport);
    }

    return res.status(200).json({ success: true, params });
  } catch (err) {
    console.error('createTransport error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};
