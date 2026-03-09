import dotenv from 'dotenv';
dotenv.config();

export const mediasoupConfig = {
  worker: {
    rtcMinPort: parseInt(process.env.MEDIASOUP_RTC_MIN_PORT) || 40000,
    rtcMaxPort: parseInt(process.env.MEDIASOUP_RTC_MAX_PORT) || 40100,
    logLevel: 'warn',
    logTags: ['info', 'ice', 'dtls', 'rtp', 'srtp', 'rtcp'],
  },
  router: {
    mediaCodecs: [
      {
        kind: 'audio',
        mimeType: 'audio/opus',
        clockRate: 48000,
        channels: 2,
      },
    ],
  },
  webRtcTransport: {
    listenIps: [
      {
        ip: process.env.MEDIASOUP_LISTEN_IP || '0.0.0.0',
        announcedIp: process.env.MEDIASOUP_ANNOUNCED_IP || '127.0.0.1',
      },
    ],
    maxIncomingBitrate: 1500000,
    initialAvailableOutgoingBitrate: 1000000,
  },
};
