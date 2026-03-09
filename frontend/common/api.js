import { storage } from './storage';

const BASE_URL = 'https://pleuropneumonic-patty-undemised.ngrok-free.dev/api';
// const BASE_URL = 'http://192.168.18.224:5000/api';

const request = async (endpoint, options = {}) => {
  const token = await storage.getItem('token');

  const config = {
    headers: {
      'Content-Type': 'application/json',
      'ngrok-skip-browser-warning': 'true',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
    ...options,
  };

  const response = await fetch(`${BASE_URL}${endpoint}`, config);
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || 'Something went wrong');
  }

  return data;
};

export const authAPI = {
  register: (body) => request('/auth/register', { method: 'POST', body: JSON.stringify(body) }),
  login: (body) => request('/auth/login', { method: 'POST', body: JSON.stringify(body) }),
  getMe: () => request('/auth/me'),
  logout: () => request('/auth/logout', { method: 'POST' }),
};

export const roomAPI = {
  getRooms: () => request('/rooms'),
  createRoom: (body) => request('/rooms', { method: 'POST', body: JSON.stringify(body) }),
  getRoom: (id) => request(`/rooms/${id}`),
  deleteRoom: (id) => request(`/rooms/${id}`, { method: 'DELETE' }),
};
