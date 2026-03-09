import mediasoup from 'mediasoup';
import { mediasoupConfig } from '../config/mediasoup.config.js';

let worker = null;

// roomId => { router, peers: Map<userId, peer> }
const rooms = new Map();

export const createWorker = async () => {
  worker = await mediasoup.createWorker(mediasoupConfig.worker);
  worker.on('died', () => {
    console.error('Mediasoup worker died, restarting...');
    setTimeout(() => createWorker(), 2000);
  });
  console.log('Mediasoup worker created');
  return worker;
};

export const getOrCreateRouter = async (roomId) => {
  if (!rooms.has(roomId)) {
    const router = await worker.createRouter({ mediaCodecs: mediasoupConfig.router.mediaCodecs });
    rooms.set(roomId, { router, peers: new Map() });
  }
  return rooms.get(roomId).router;
};

export const getRoomData = (roomId) => rooms.get(roomId);

export const createWebRtcTransport = async (router) => {
  const transport = await router.createWebRtcTransport(mediasoupConfig.webRtcTransport);
  return {
    transport,
    params: {
      id: transport.id,
      iceParameters: transport.iceParameters,
      iceCandidates: transport.iceCandidates,
      dtlsParameters: transport.dtlsParameters,
    },
  };
};

export const cleanupRoom = (roomId) => {
  const room = rooms.get(roomId);
  if (room) {
    room.router.close();
    rooms.delete(roomId);
  }
};
