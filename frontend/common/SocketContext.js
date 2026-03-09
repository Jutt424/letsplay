import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { storage } from './storage';

const SocketContext = createContext(null);

const SOCKET_URL = 'https://pleuropneumonic-patty-undemised.ngrok-free.dev';
// const BASE_URL = 'http://192.168.18.224:5000/api';

export function SocketProvider({ children }) {
  const socketRef = useRef(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const connect = async () => {
      const token = await storage.getItem('token');
      if (!token) return;

      socketRef.current = io(SOCKET_URL, {
        auth: { token },
        transports: ['polling', 'websocket'],
        extraHeaders: {
          'ngrok-skip-browser-warning': 'true',
        },
      });

      socketRef.current.on('connect', () => setConnected(true));
      socketRef.current.on('disconnect', () => setConnected(false));
    };

    connect();

    return () => {
      socketRef.current?.disconnect();
    };
  }, []);

  return (
    <SocketContext.Provider value={{ socket: socketRef.current, connected }}>
      {children}
    </SocketContext.Provider>
  );
}

export const useSocket = () => useContext(SocketContext);
