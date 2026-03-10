import dotenv from 'dotenv';
import dns from 'dns';
import { promisify } from 'util';
dotenv.config();

const dnsLookup = promisify(dns.lookup);

const resolveAnnouncedIp = async () => {
  const announced = process.env.MEDIASOUP_ANNOUNCED_IP || '127.0.0.1';
  // If it's already an IP, return as-is
  if (/^\d+\.\d+\.\d+\.\d+$/.test(announced)) return announced;
  try {
    const { address } = await dnsLookup(announced);
    console.log(`Resolved MEDIASOUP_ANNOUNCED_IP ${announced} → ${address}`);
    return address;
  } catch (e) {
    console.warn(`DNS resolve failed for ${announced}, using 127.0.0.1`);
    return '127.0.0.1';
  }
};

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

export { resolveAnnouncedIp };
