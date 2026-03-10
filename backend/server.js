import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';
import app from './src/app.js';
import { initSocket } from './src/socket/socket.js';
import { createWorker } from './src/mediasoup/mediasoup.manager.js';
import { resolveAnnouncedIp, mediasoupConfig } from './src/config/mediasoup.config.js';

dotenv.config();

const PORT = process.env.PORT || 5000;

const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: { origin: '*' },
});

initSocket(io);

// Resolve announced IP then start
resolveAnnouncedIp().then((resolvedIp) => {
  mediasoupConfig.webRtcTransport.listenIps[0].announcedIp = resolvedIp;
  return createWorker();
}).then(() => {
  httpServer.listen(PORT, () => {
    console.log(`LetsPlay server running on port ${PORT}`);
    console.log(`Socket.io ready`);
    console.log(`Mediasoup worker ready`);
  });
}).catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
