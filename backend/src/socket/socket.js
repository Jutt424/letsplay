import { verifyToken } from '../config/jwt.js';
import supabase from '../config/supabase.js';
import { startGame, submitDescription, submitVote, endGame } from '../games/whosSpy.js';
import { getOrCreateRouter, getRoomData, createWebRtcTransport } from '../mediasoup/mediasoup.manager.js';

// Remove sensitive data before broadcasting
const buildPublicState = (gameState) => ({
  roomId: gameState.roomId,
  phase: gameState.phase,
  currentTurnIndex: gameState.currentTurnIndex,
  result: gameState.result,
  players: gameState.roles.map(p => ({
    userId: p.userId,
    username: p.username,
    description: p.description,
    isEliminated: p.isEliminated,
    hasVoted: p.vote !== null,
  })),
});

export const initSocket = (io) => {
  // Auth middleware for socket
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('Unauthorized'));
    try {
      const decoded = verifyToken(token);
      socket.user = decoded;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`User connected: ${socket.user.username} (${socket.id})`);

    // Join a room
    socket.on('room:join', async ({ roomId }) => {
      try {
        const { data: room } = await supabase
          .from('rooms')
          .select('id, current_members, max_members, is_active')
          .eq('id', roomId)
          .single();

        if (!room) {
          return socket.emit('error', { message: 'Room not found' });
        }

        // Check if user is already a member (reconnect case)
        const { data: existingMember } = await supabase
          .from('room_members')
          .select('user_id')
          .eq('room_id', roomId)
          .eq('user_id', socket.user.id)
          .maybeSingle();

        const isRejoining = !!existingMember;

        // Re-activate room if it was closed due to a brief disconnect
        if (!room.is_active) {
          if (isRejoining) {
            await supabase.from('rooms').update({ is_active: true }).eq('id', roomId);
          } else {
            return socket.emit('error', { message: 'Room is closed' });
          }
        }

        // Full check only for new members
        if (!isRejoining && room.current_members >= room.max_members) {
          return socket.emit('error', { message: 'Room is full' });
        }

        await supabase.from('room_members').upsert({
          room_id: roomId,
          user_id: socket.user.id,
        }, { onConflict: 'room_id,user_id' });

        // Only increment count for genuinely new members
        if (!isRejoining) {
          await supabase
            .from('rooms')
            .update({ current_members: room.current_members + 1 })
            .eq('id', roomId);
        }

        socket.join(roomId);
        socket.currentRoom = roomId;

        const { data: members } = await supabase
          .from('room_members')
          .select('is_muted, users:user_id (id, username, avatar_url)')
          .eq('room_id', roomId);

        const { data: roomInfo } = await supabase
          .from('rooms')
          .select('host_id')
          .eq('id', roomId)
          .single();

        const hostId = roomInfo?.host_id;

        io.to(roomId).emit('room:members_updated', { members, hostId });
        if (!isRejoining) {
          socket.to(roomId).emit('room:user_joined', {
            user: { id: socket.user.id, username: socket.user.username },
          });
        }

        socket.emit('room:joined', { roomId, members, hostId });
      } catch (err) {
        console.error('room:join error:', err);
        socket.emit('error', { message: 'Could not join room' });
      }
    });

    // Leave a room
    socket.on('room:leave', async ({ roomId }) => {
      await handleLeaveRoom(socket, io, roomId);
    });

    // Mute/unmute
    socket.on('room:toggle_mute', async ({ roomId, isMuted }) => {
      try {
        await supabase
          .from('room_members')
          .update({ is_muted: isMuted })
          .eq('room_id', roomId)
          .eq('user_id', socket.user.id);

        io.to(roomId).emit('room:mute_updated', {
          userId: socket.user.id,
          isMuted,
        });
      } catch (err) {
        console.error('room:toggle_mute error:', err);
      }
    });

    // ==================== GAME EVENTS ====================

    // Host starts Who's the Spy
    socket.on('game:start_spy', async ({ roomId }) => {
      try {
        const { data: room } = await supabase
          .from('rooms')
          .select('host_id')
          .eq('id', roomId)
          .single();

        if (room?.host_id !== socket.user.id) {
          return socket.emit('error', { message: 'Only host can start the game' });
        }

        const { data: members } = await supabase
          .from('room_members')
          .select('users:user_id (id, username)')
          .eq('room_id', roomId);

        const players = members.map(m => ({
          userId: m.users.id,
          username: m.users.username,
        }));

        const { gameState, error } = startGame(roomId, players);
        if (error) return socket.emit('error', { message: error });

        // Send each player their own role & word privately
        const socketsInRoom = await io.in(roomId).fetchSockets();
        socketsInRoom.forEach(s => {
          const playerRole = gameState.roles.find(r => r.userId === s.user?.id);
          if (playerRole) {
            s.emit('game:your_role', {
              role: playerRole.role,
              word: playerRole.word,
            });
          }
        });

        // Send public game state (no words/roles)
        const publicState = buildPublicState(gameState);
        io.to(roomId).emit('game:started', { gameState: publicState });
      } catch (err) {
        console.error('game:start_spy error:', err);
        socket.emit('error', { message: 'Could not start game' });
      }
    });

    // Player submits description
    socket.on('game:describe', ({ roomId, description }) => {
      if (!description?.trim()) return;
      const { gameState, error } = submitDescription(roomId, socket.user.id, description.trim());
      if (error) return socket.emit('error', { message: error });

      io.to(roomId).emit('game:state_updated', { gameState: buildPublicState(gameState) });
    });

    // Player submits vote
    socket.on('game:vote', ({ roomId, targetId }) => {
      const { gameState, eliminated, tie, voteCounts, error } = submitVote(roomId, socket.user.id, targetId);
      if (error) return socket.emit('error', { message: error });

      if (tie) {
        io.to(roomId).emit('game:tie', { voteCounts });
        io.to(roomId).emit('game:state_updated', { gameState: buildPublicState(gameState) });
        return;
      }

      if (eliminated) {
        io.to(roomId).emit('game:player_eliminated', {
          userId: eliminated.userId,
          username: eliminated.username,
          voteCounts,
        });
      }

      if (gameState.phase === 'result') {
        const spy = gameState.roles.find(r => r.role === 'spy');
        io.to(roomId).emit('game:over', {
          result: gameState.result,
          spy: { userId: spy.userId, username: spy.username, word: spy.word },
          civilianWord: gameState.wordPair.civilian,
        });
        endGame(roomId);
      } else {
        io.to(roomId).emit('game:state_updated', { gameState: buildPublicState(gameState) });
      }
    });

    // Host ends game early
    socket.on('game:end', ({ roomId }) => {
      endGame(roomId);
      io.to(roomId).emit('game:ended', { message: 'Game ended by host' });
    });

    // ==================== VOICE CHAT ====================

    // Client joins voice in a room
    socket.on('voice:join', async ({ roomId }) => {
      try {
        const router = await getOrCreateRouter(roomId);

        const { transport: sendTransport, params: sendParams } = await createWebRtcTransport(router);
        const { transport: recvTransport, params: recvParams } = await createWebRtcTransport(router);

        const room = getRoomData(roomId);
        if (room) {
          if (!room.peers.has(socket.user.id)) {
            room.peers.set(socket.user.id, {
              transports: new Map(),
              producers: new Map(),
              consumers: new Map(),
            });
          }
          const peer = room.peers.get(socket.user.id);
          peer.transports.set(sendTransport.id, sendTransport);
          peer.transports.set(recvTransport.id, recvTransport);
        }

        socket.emit('voice:joined', {
          rtpCapabilities: router.rtpCapabilities,
          sendTransportParams: sendParams,
          recvTransportParams: recvParams,
        });

        // Tell new peer about existing producers
        const existingProducers = [];
        room?.peers.forEach((peer, userId) => {
          if (userId !== socket.user.id) {
            peer.producers.forEach((_, producerId) => {
              existingProducers.push({ producerId, userId });
            });
          }
        });
        if (existingProducers.length > 0) {
          socket.emit('voice:existing_producers', existingProducers);
        }
      } catch (err) {
        console.error('voice:join error:', err);
        socket.emit('error', { message: 'Could not join voice' });
      }
    });

    // Connect a transport (send DTLS params)
    socket.on('voice:connect_transport', ({ roomId, transportId, dtlsParameters }) => {
      try {
        const room = getRoomData(roomId);
        const peer = room?.peers.get(socket.user.id);
        const transport = peer?.transports.get(transportId);
        if (transport) transport.connect({ dtlsParameters });
      } catch (err) {
        console.error('voice:connect_transport error:', err);
      }
    });

    // Client starts producing audio
    socket.on('voice:produce', async ({ roomId, transportId, kind, rtpParameters }) => {
      try {
        const room = getRoomData(roomId);
        const peer = room?.peers.get(socket.user.id);
        const transport = peer?.transports.get(transportId);
        if (!transport) return socket.emit('error', { message: 'Transport not found' });

        const producer = await transport.produce({ kind, rtpParameters });
        peer.producers.set(producer.id, producer);

        socket.emit('voice:produced', { producerId: producer.id });
        socket.to(roomId).emit('voice:new_producer', {
          producerId: producer.id,
          userId: socket.user.id,
        });
      } catch (err) {
        console.error('voice:produce error:', err);
      }
    });

    // Client wants to consume a producer
    socket.on('voice:consume', async ({ roomId, transportId, producerId, rtpCapabilities }) => {
      try {
        const router = await getOrCreateRouter(roomId);
        if (!router.canConsume({ producerId, rtpCapabilities })) {
          return socket.emit('error', { message: 'Cannot consume this producer' });
        }

        const room = getRoomData(roomId);
        const peer = room?.peers.get(socket.user.id);
        const transport = peer?.transports.get(transportId);
        if (!transport) return;

        const consumer = await transport.consume({ producerId, rtpCapabilities, paused: true });
        peer.consumers.set(consumer.id, consumer);

        socket.emit('voice:consumed', {
          consumerId: consumer.id,
          producerId,
          kind: consumer.kind,
          rtpParameters: consumer.rtpParameters,
        });
      } catch (err) {
        console.error('voice:consume error:', err);
      }
    });

    // Client resumes a consumer (start receiving audio)
    socket.on('voice:resume_consumer', ({ roomId, consumerId }) => {
      try {
        const room = getRoomData(roomId);
        const peer = room?.peers.get(socket.user.id);
        peer?.consumers.get(consumerId)?.resume();
      } catch (err) {
        console.error('voice:resume_consumer error:', err);
      }
    });

    // Client leaves voice
    socket.on('voice:leave', ({ roomId }) => {
      try {
        const room = getRoomData(roomId);
        const peer = room?.peers.get(socket.user.id);
        if (peer) {
          peer.producers.forEach(p => p.close());
          peer.consumers.forEach(c => c.close());
          peer.transports.forEach(t => t.close());
          room.peers.delete(socket.user.id);
        }
        socket.to(roomId).emit('voice:peer_left', { userId: socket.user.id });
      } catch (err) {
        console.error('voice:leave error:', err);
      }
    });

    // ==================== TEXT CHAT ====================

    // Text chat in room
    socket.on('room:message', ({ roomId, message }) => {
      if (!message?.trim()) return;
      io.to(roomId).emit('room:message', {
        user: { id: socket.user.id, username: socket.user.username },
        message: message.trim(),
        timestamp: new Date().toISOString(),
      });
    });

    // Disconnect (transport upgrade, network blip, or actual close)
    // Do NOT remove from room_members here — user may reconnect within seconds.
    // Room membership is only cleaned up on explicit room:leave.
    socket.on('disconnect', async () => {
      console.log(`User disconnected: ${socket.user.username}`);
      await supabase.from('users').update({ is_online: false }).eq('id', socket.user.id);
    });
  });
};

const handleLeaveRoom = async (socket, io, roomId) => {
  try {
    await supabase
      .from('room_members')
      .delete()
      .eq('room_id', roomId)
      .eq('user_id', socket.user.id);

    const { data: room } = await supabase
      .from('rooms')
      .select('current_members, host_id')
      .eq('id', roomId)
      .single();

    if (room) {
      const newCount = Math.max(0, room.current_members - 1);

      if (newCount === 0) {
        // Close room if empty
        await supabase.from('rooms').update({ is_active: false, current_members: 0 }).eq('id', roomId);
      } else {
        await supabase.from('rooms').update({ current_members: newCount }).eq('id', roomId);

        // If host left, assign new host
        if (room.host_id === socket.user.id) {
          const { data: members } = await supabase
            .from('room_members')
            .select('user_id')
            .eq('room_id', roomId)
            .limit(1);

          if (members?.length > 0) {
            await supabase.from('rooms').update({ host_id: members[0].user_id }).eq('id', roomId);
          }
        }
      }
    }

    socket.leave(roomId);
    socket.currentRoom = null;

    socket.to(roomId).emit('room:user_left', {
      userId: socket.user.id,
      username: socket.user.username,
    });

    const { data: members } = await supabase
      .from('room_members')
      .select('is_muted, users:user_id (id, username, avatar_url)')
      .eq('room_id', roomId);

    io.to(roomId).emit('room:members_updated', { members: members || [] });
  } catch (err) {
    console.error('handleLeaveRoom error:', err);
  }
};
