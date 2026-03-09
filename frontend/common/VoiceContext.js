import { createContext, useContext, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { Device } from 'mediasoup-client';

const getMediaDevices = () => {
  if (Platform.OS === 'web') return navigator.mediaDevices;
  return require('react-native-webrtc').mediaDevices;
};

// Play audio on web by creating a hidden <audio> element
const playRemoteAudio = (track) => {
  if (Platform.OS !== 'web') return;
  const audio = document.createElement('audio');
  audio.autoplay = true;
  audio.srcObject = new MediaStream([track]);
  document.body.appendChild(audio);
  audio.play().catch(e => console.warn('Audio play error:', e));
  return audio;
};

const VoiceContext = createContext(null);

export function VoiceProvider({ children }) {
  const [isInVoice, setIsInVoice] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  const deviceRef = useRef(null);
  const sendTransportRef = useRef(null);
  const recvTransportRef = useRef(null);
  const producerRef = useRef(null);
  const consumersRef = useRef(new Map());   // producerId => consumer
  const audioElementsRef = useRef(new Map()); // producerId => audio element (web only)
  const localStreamRef = useRef(null);
  const currentRoomRef = useRef(null);
  const socketRef = useRef(null);
  // Map of pending consume callbacks: producerId => resolve fn
  const pendingConsumesRef = useRef(new Map());

  const joinVoice = async (socket, roomId) => {
    if (isInVoice) return;
    socketRef.current = socket;
    currentRoomRef.current = roomId;

    socket.emit('voice:join', { roomId });

    // Handle incoming consumed events (matches by producerId)
    socket.on('voice:consumed', async ({ consumerId, producerId, kind, rtpParameters }) => {
      const resolve = pendingConsumesRef.current.get(producerId);
      if (resolve) {
        pendingConsumesRef.current.delete(producerId);
        resolve({ consumerId, producerId, kind, rtpParameters });
      }
    });

    socket.once('voice:joined', async ({ rtpCapabilities, sendTransportParams, recvTransportParams }) => {
      try {
        const device = new Device();
        await device.load({ routerRtpCapabilities: rtpCapabilities });
        deviceRef.current = device;

        // Send transport
        const sendTransport = device.createSendTransport(sendTransportParams);
        sendTransportRef.current = sendTransport;

        sendTransport.on('connect', ({ dtlsParameters }, callback) => {
          socket.emit('voice:connect_transport', { roomId, transportId: sendTransport.id, dtlsParameters });
          callback();
        });

        sendTransport.on('produce', ({ kind, rtpParameters }, callback) => {
          socket.emit('voice:produce', { roomId, transportId: sendTransport.id, kind, rtpParameters });
          socket.once('voice:produced', ({ producerId }) => callback({ id: producerId }));
        });

        // Recv transport
        const recvTransport = device.createRecvTransport(recvTransportParams);
        recvTransportRef.current = recvTransport;

        recvTransport.on('connect', ({ dtlsParameters }, callback) => {
          socket.emit('voice:connect_transport', { roomId, transportId: recvTransport.id, dtlsParameters });
          callback();
        });

        // Start microphone
        const stream = await getMediaDevices().getUserMedia({ audio: true, video: false });
        localStreamRef.current = stream;
        const audioTrack = stream.getAudioTracks()[0];
        const producer = await sendTransport.produce({ track: audioTrack });
        producerRef.current = producer;

        setIsInVoice(true);
        setIsMuted(false);
      } catch (err) {
        console.error('voice:joined error:', err);
      }
    });

    socket.once('voice:existing_producers', (producers) => {
      producers.forEach(({ producerId }) => consumeProducer(socket, roomId, producerId));
    });

    socket.on('voice:new_producer', ({ producerId }) => {
      consumeProducer(socket, roomId, producerId);
    });

    socket.on('voice:peer_left', ({ userId }) => {
      console.log('Voice peer left:', userId);
    });
  };

  const consumeProducer = (socket, roomId, producerId) => {
    const device = deviceRef.current;
    const recvTransport = recvTransportRef.current;
    if (!device || !recvTransport) return;

    // Register pending callback before emitting
    const promise = new Promise(resolve => {
      pendingConsumesRef.current.set(producerId, resolve);
    });

    socket.emit('voice:consume', {
      roomId,
      transportId: recvTransport.id,
      producerId,
      rtpCapabilities: device.rtpCapabilities,
    });

    promise.then(async ({ consumerId, producerId: pid, kind, rtpParameters }) => {
      try {
        const consumer = await recvTransport.consume({ id: consumerId, producerId: pid, kind, rtpParameters });
        consumersRef.current.set(pid, consumer);

        socket.emit('voice:resume_consumer', { roomId, consumerId });

        // Web: attach to audio element; Native: track plays automatically
        const audioEl = playRemoteAudio(consumer.track);
        if (audioEl) audioElementsRef.current.set(pid, audioEl);
      } catch (err) {
        console.error('consumeProducer error:', err);
      }
    });
  };

  const leaveVoice = () => {
    const socket = socketRef.current;
    const roomId = currentRoomRef.current;

    if (socket && roomId) {
      socket.emit('voice:leave', { roomId });
      socket.off('voice:new_producer');
      socket.off('voice:peer_left');
      socket.off('voice:consumed');
    }

    producerRef.current?.close();
    consumersRef.current.forEach(c => c.close());
    consumersRef.current.clear();
    sendTransportRef.current?.close();
    recvTransportRef.current?.close();
    localStreamRef.current?.getTracks().forEach(t => t.stop());

    // Remove web audio elements
    audioElementsRef.current.forEach(el => {
      el.srcObject = null;
      el.remove();
    });
    audioElementsRef.current.clear();
    pendingConsumesRef.current.clear();

    deviceRef.current = null;
    sendTransportRef.current = null;
    recvTransportRef.current = null;
    producerRef.current = null;
    localStreamRef.current = null;
    currentRoomRef.current = null;

    setIsInVoice(false);
    setIsMuted(false);
  };

  const toggleMute = () => {
    const track = localStreamRef.current?.getAudioTracks()[0];
    if (!track) return;
    track.enabled = !track.enabled;
    setIsMuted(!track.enabled);
  };

  return (
    <VoiceContext.Provider value={{ isInVoice, isMuted, joinVoice, leaveVoice, toggleMute }}>
      {children}
    </VoiceContext.Provider>
  );
}

export const useVoice = () => useContext(VoiceContext);
