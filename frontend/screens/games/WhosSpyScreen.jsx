import { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, TextInput, StatusBar, ScrollView, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSocket } from '../../common/SocketContext';
import { useAuth } from '../../common/AuthContext';

const TURN_DURATION = 30;

export default function WhosSpyScreen({ route, navigation }) {
  const { roomId, isHost } = route.params;
  const { socket } = useSocket();
  const { user } = useAuth();

  const [myRole, setMyRole] = useState(null);
  const [gameState, setGameState] = useState(null);
  const [description, setDescription] = useState('');
  const [phase, setPhase] = useState('waiting'); // waiting | describing | voting | result
  const [result, setResult] = useState(null);
  const [eliminated, setEliminated] = useState(null);
  const [tie, setTie] = useState(false);
  const [timeLeft, setTimeLeft] = useState(TURN_DURATION);

  const timerRef = useRef(null);
  const gameStateRef = useRef(null);
  const userRef = useRef(null);
  const socketRef = useRef(null);

  // Keep refs in sync so timer callback always has fresh values
  gameStateRef.current = gameState;
  userRef.current = user;
  socketRef.current = socket;

  // Socket events
  useEffect(() => {
    if (!socket) return;

    socket.on('game:your_role', (data) => setMyRole(data));

    socket.on('game:started', ({ gameState }) => {
      setGameState(gameState);
      setPhase('describing');
    });

    socket.on('game:state_updated', ({ gameState }) => {
      setGameState(gameState);
      setPhase(gameState.phase);
    });

    socket.on('game:player_eliminated', ({ username, voteCounts }) => {
      setEliminated({ username, voteCounts });
      setTimeout(() => setEliminated(null), 3000);
    });

    socket.on('game:tie', () => {
      setTie(true);
      setTimeout(() => setTie(false), 3000);
    });

    socket.on('game:over', (data) => {
      setResult(data);
      setPhase('result');
    });

    socket.on('game:ended', () => navigation.goBack());

    socket.on('error', ({ message }) => Alert.alert('Error', message));

    return () => {
      socket.off('game:your_role');
      socket.off('game:started');
      socket.off('game:state_updated');
      socket.off('game:player_eliminated');
      socket.off('game:tie');
      socket.off('game:over');
      socket.off('game:ended');
      socket.off('error');
    };
  }, [socket]);

  // Timer — reset on each new turn in describing phase
  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);

    if (phase !== 'describing' || !gameState) {
      setTimeLeft(TURN_DURATION);
      return;
    }

    setTimeLeft(TURN_DURATION);

    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          // Auto-submit if it's our turn
          const gs = gameStateRef.current;
          const u = userRef.current;
          const sock = socketRef.current;
          if (gs && sock) {
            const current = gs.players[gs.currentTurnIndex];
            if (current?.userId === u?.id) {
              sock.emit('game:describe', { roomId, description: '...' });
            }
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timerRef.current);
  }, [gameState?.currentTurnIndex, phase]);

  const startGame = () => socket.emit('game:start_spy', { roomId });

  const sendDescription = () => {
    if (!description.trim()) return;
    socket.emit('game:describe', { roomId, description });
    setDescription('');
  };

  const vote = (targetId) => socket.emit('game:vote', { roomId, targetId });

  const isMyTurn = () => {
    if (!gameState) return false;
    const current = gameState.players[gameState.currentTurnIndex];
    return current?.userId === user?.id;
  };

  const myPlayer = gameState?.players.find(p => p.userId === user?.id);

  const timerColor = timeLeft > 15 ? '#4ADE80' : timeLeft > 7 ? '#FACC15' : '#F87171';

  // ── WAITING ──
  if (phase === 'waiting') {
    return (
      <View className="flex-1 bg-slate-950 items-center justify-center px-8">
        <StatusBar barStyle="light-content" />
        <Text style={{ fontSize: 64 }}>🕵️</Text>
        <Text className="text-white font-bold text-3xl mt-4 text-center">Who's the Spy?</Text>
        <Text className="text-slate-400 text-center mt-3 mb-10">
          Each player gets a secret word. One player is the spy with a different word. Describe your word without saying it!
        </Text>
        {isHost ? (
          <TouchableOpacity onPress={startGame} activeOpacity={0.85} className="w-full">
            <LinearGradient
              colors={['#7C3AED', '#4F46E5']}
              style={{ borderRadius: 14, paddingVertical: 16, alignItems: 'center' }}
            >
              <Text className="text-white font-bold text-base tracking-widest">START GAME</Text>
            </LinearGradient>
          </TouchableOpacity>
        ) : (
          <Text className="text-slate-500">Waiting for host to start...</Text>
        )}
        <TouchableOpacity onPress={() => navigation.goBack()} className="mt-6">
          <Text className="text-violet-400">← Back to Room</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── RESULT ──
  if (phase === 'result' && result) {
    const civWin = result.result === 'civilians_win';
    return (
      <View className="flex-1 bg-slate-950 items-center justify-center px-8">
        <Text style={{ fontSize: 72 }}>{civWin ? '🎉' : '🕵️'}</Text>
        <Text className={`font-bold text-3xl mt-4 ${civWin ? 'text-green-400' : 'text-red-400'}`}>
          {civWin ? 'Civilians Win!' : 'Spy Wins!'}
        </Text>
        <View className="bg-slate-800 rounded-2xl p-5 mt-6 w-full border border-slate-700">
          <Text className="text-slate-400 text-sm text-center mb-2">The spy was</Text>
          <Text className="text-white font-bold text-xl text-center">{result.spy.username} 🕵️</Text>
          <View className="flex-row justify-center gap-6 mt-4">
            <View className="items-center">
              <Text className="text-slate-400 text-xs">Civilian word</Text>
              <Text className="text-violet-400 font-bold text-lg">{result.civilianWord}</Text>
            </View>
            <View className="items-center">
              <Text className="text-slate-400 text-xs">Spy word</Text>
              <Text className="text-red-400 font-bold text-lg">{result.spy.word}</Text>
            </View>
          </View>
        </View>
        <TouchableOpacity onPress={() => navigation.goBack()} className="mt-8">
          <LinearGradient
            colors={['#7C3AED', '#4F46E5']}
            style={{ borderRadius: 14, paddingVertical: 14, paddingHorizontal: 40 }}
          >
            <Text className="text-white font-bold">Back to Room</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    );
  }

  // ── DESCRIBING / VOTING ──
  return (
    <View className="flex-1 bg-slate-950">
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View className="px-6 pt-14 pb-4 border-b border-slate-800">
        <View className="flex-row items-center justify-between">
          <Text className="text-white font-bold text-lg">🕵️ Who's the Spy?</Text>
          <View className={`px-3 py-1 rounded-full ${phase === 'voting' ? 'bg-red-500/20 border border-red-500/40' : 'bg-violet-500/20 border border-violet-500/40'}`}>
            <Text className={`text-xs font-bold ${phase === 'voting' ? 'text-red-400' : 'text-violet-400'}`}>
              {phase === 'voting' ? '🗳️ VOTING' : '💬 DESCRIBING'}
            </Text>
          </View>
        </View>
      </View>

      <ScrollView className="flex-1 px-6 pt-4">
        {/* My Role Card */}
        {myRole && (
          <View className="bg-slate-800/80 border border-slate-700 rounded-2xl p-4 mb-4">
            <Text className="text-slate-400 text-xs mb-1">Your role</Text>
            <View className="flex-row items-center justify-between">
              <Text className={`font-bold text-lg ${myRole.role === 'spy' ? 'text-red-400' : 'text-green-400'}`}>
                {myRole.role === 'spy' ? '🕵️ SPY' : '👤 CIVILIAN'}
              </Text>
              <View className="bg-slate-900 rounded-xl px-4 py-2 border border-slate-600">
                <Text className="text-white font-bold text-base">{myRole.word}</Text>
              </View>
            </View>
          </View>
        )}

        {/* Eliminated notification */}
        {eliminated && (
          <View className="bg-red-500/20 border border-red-500/40 rounded-2xl p-3 mb-4">
            <Text className="text-red-400 text-center font-semibold">
              {eliminated.username} was eliminated!
            </Text>
          </View>
        )}

        {/* Tie notification */}
        {tie && (
          <View className="bg-yellow-500/20 border border-yellow-500/40 rounded-2xl p-3 mb-4">
            <Text className="text-yellow-400 text-center font-semibold">
              🤝 Tie vote! No one eliminated — describe again.
            </Text>
          </View>
        )}

        {/* Players list */}
        <Text className="text-slate-400 text-sm mb-3">Players</Text>
        {gameState?.players.map((player, i) => {
          const isCurrent = phase === 'describing' && gameState.currentTurnIndex === i;
          const isMe = player.userId === user?.id;
          return (
            <TouchableOpacity
              key={player.userId}
              onPress={() => phase === 'voting' && !isMe && !myPlayer?.isEliminated && !myPlayer?.hasVoted && vote(player.userId)}
              disabled={phase !== 'voting' || isMe || myPlayer?.isEliminated || myPlayer?.hasVoted || player.isEliminated}
              activeOpacity={0.8}
              className={`rounded-2xl p-4 mb-2 border ${
                player.isEliminated
                  ? 'bg-slate-900/50 border-slate-800 opacity-50'
                  : isCurrent
                  ? 'bg-violet-500/20 border-violet-500'
                  : 'bg-slate-800/60 border-slate-700'
              }`}
            >
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center gap-3">
                  <Text className="text-white font-semibold">
                    {isMe ? `${player.username} (You)` : player.username}
                  </Text>
                  {player.isEliminated && <Text className="text-red-400 text-xs">Eliminated</Text>}
                  {isCurrent && (
                    <Text className="text-violet-400 text-xs">Speaking...</Text>
                  )}
                </View>
                <View className="flex-row items-center gap-2">
                  {isCurrent && (
                    <View
                      style={{ borderColor: timerColor, borderWidth: 1, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3, backgroundColor: `${timerColor}18` }}
                    >
                      <Text style={{ color: timerColor, fontSize: 13, fontWeight: 'bold' }}>
                        {timeLeft}s
                      </Text>
                    </View>
                  )}
                  {phase === 'voting' && !player.isEliminated && !isMe && !myPlayer?.hasVoted && (
                    <View className="bg-red-500/20 border border-red-500/40 rounded-xl px-3 py-1">
                      <Text className="text-red-400 text-xs font-bold">VOTE</Text>
                    </View>
                  )}
                </View>
              </View>
              {player.description && (
                <Text className="text-slate-400 text-sm mt-2 italic">"{player.description}"</Text>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Description Input (my turn) */}
      {phase === 'describing' && isMyTurn() && !myPlayer?.isEliminated && (
        <View className="px-6 pb-8 pt-3 border-t border-slate-800">
          <View className="flex-row items-center justify-between mb-2">
            <Text className="text-violet-400 text-sm font-medium">Your turn! Describe your word:</Text>
            <Text style={{ color: timerColor, fontWeight: 'bold', fontSize: 15 }}>{timeLeft}s</Text>
          </View>
          <View className="flex-row gap-3">
            <TextInput
              className="flex-1 bg-slate-800 border border-slate-700 rounded-2xl px-4 text-white"
              placeholder="Describe without saying the word..."
              placeholderTextColor="#64748B"
              value={description}
              onChangeText={setDescription}
            />
            <TouchableOpacity
              onPress={() => { socket.emit('game:describe', { roomId, description: '...' }); setDescription(''); }}
              activeOpacity={0.85}
            >
              <View style={{ borderRadius: 14, paddingHorizontal: 14, justifyContent: 'center', height: 52, backgroundColor: '#1E293B', borderWidth: 1, borderColor: '#334155' }}>
                <Text style={{ color: '#94A3B8', fontWeight: 'bold' }}>Pass</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity onPress={sendDescription} activeOpacity={0.85}>
              <LinearGradient
                colors={['#7C3AED', '#4F46E5']}
                style={{ borderRadius: 14, paddingHorizontal: 20, justifyContent: 'center', height: 52 }}
              >
                <Text className="text-white font-bold">Send</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Waiting for other player */}
      {phase === 'describing' && !isMyTurn() && (
        <View className="px-6 pb-8 pt-3 border-t border-slate-800">
          <View className="flex-row items-center justify-between">
            <Text className="text-slate-500">
              Waiting for {gameState?.players[gameState?.currentTurnIndex]?.username}...
            </Text>
            <Text style={{ color: timerColor, fontWeight: 'bold', fontSize: 15 }}>{timeLeft}s</Text>
          </View>
        </View>
      )}

      {phase === 'voting' && myPlayer?.hasVoted && (
        <View className="px-6 pb-8 pt-3 border-t border-slate-800 items-center">
          <Text className="text-slate-500">Waiting for others to vote...</Text>
        </View>
      )}
    </View>
  );
}
