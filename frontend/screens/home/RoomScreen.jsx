import { useState, useEffect, useRef } from 'react';
import { View, Text, FlatList, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform, StatusBar } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSocket } from '../../common/SocketContext';
import { useAuth } from '../../common/AuthContext';
import { useVoice } from '../../common/VoiceContext';

export default function RoomScreen({ route, navigation }) {
  const { roomId, roomName, isHost = false } = route.params;
  const { socket, connected } = useSocket();
  const { user } = useAuth();
  const { isInVoice, isMuted, joinVoice, leaveVoice, toggleMute } = useVoice();
  const [members, setMembers] = useState([]);
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState('');
  const flatListRef = useRef(null);

  // Setup socket event listeners once (doesn't re-run on reconnect)
  useEffect(() => {
    if (!socket) return;

    socket.on('room:joined', ({ members }) => setMembers(members || []));
    socket.on('room:members_updated', ({ members }) => setMembers(members || []));
    socket.on('room:message', (msg) => {
      setMessages((prev) => [...prev, msg]);
      setTimeout(() => flatListRef.current?.scrollToEnd(), 100);
    });
    socket.on('room:user_joined', ({ user: u }) => {
      setMessages((prev) => [...prev, { system: true, text: `${u.username} joined`, id: Date.now() }]);
    });
    socket.on('room:user_left', ({ username }) => {
      setMessages((prev) => [...prev, { system: true, text: `${username} left`, id: Date.now() }]);
    });

    return () => {
      socket.off('room:joined');
      socket.off('room:members_updated');
      socket.off('room:message');
      socket.off('room:user_joined');
      socket.off('room:user_left');
    };
  }, [socket]);

  // Join/rejoin room whenever socket connects or reconnects
  useEffect(() => {
    if (!socket || !connected) return;

    socket.emit('room:join', { roomId });
    joinVoice(socket, roomId);

    return () => {
      leaveVoice();
      // Only send explicit room:leave if still connected (user navigating away, not a disconnect)
      if (socket.connected) {
        socket.emit('room:leave', { roomId });
      }
    };
  }, [socket, connected, roomId]);

  const sendMessage = () => {
    if (!message.trim()) return;
    socket.emit('room:message', { roomId, message });
    setMessage('');
  };

  const handleToggleMute = () => {
    toggleMute();
    socket.emit('room:toggle_mute', { roomId, isMuted: !isMuted });
  };

  const renderMember = ({ item }) => {
    const u = item.users;
    return (
      <View className="items-center mx-3">
        <View className={`w-14 h-14 rounded-full items-center justify-center border-2 ${item.is_muted ? 'border-red-500' : 'border-violet-500'}`}
          style={{ backgroundColor: '#1E1B4B' }}
        >
          <Text className="text-white font-bold text-lg">{u?.username?.[0]?.toUpperCase() || '?'}</Text>
        </View>
        {item.is_muted && (
          <View className="absolute -bottom-1 -right-1 bg-red-500 rounded-full w-5 h-5 items-center justify-center">
            <Text style={{ fontSize: 10 }}>🔇</Text>
          </View>
        )}
        <Text className="text-slate-300 text-xs mt-2 text-center" numberOfLines={1} style={{ maxWidth: 56 }}>
          {u?.username || '?'}
        </Text>
      </View>
    );
  };

  const renderMessage = ({ item }) => {
    if (item.system) {
      return (
        <View className="items-center my-1">
          <Text className="text-slate-600 text-xs">{item.text}</Text>
        </View>
      );
    }
    const isMe = item.user?.id === user?.id;
    return (
      <View className={`flex-row mb-2 ${isMe ? 'justify-end' : 'justify-start'}`}>
        <View className={`max-w-xs px-4 py-2 rounded-2xl ${isMe ? 'bg-violet-600' : 'bg-slate-800'}`}>
          {!isMe && <Text className="text-violet-400 text-xs mb-1">{item.user?.username}</Text>}
          <Text className="text-white text-sm">{item.message}</Text>
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-slate-950"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View className="px-6 pt-14 pb-4 border-b border-slate-800">
        <View className="flex-row items-center justify-between">
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text className="text-violet-400 text-base">← Leave</Text>
          </TouchableOpacity>
          <Text className="text-white font-bold text-base">{roomName}</Text>
          <Text className="text-slate-400 text-sm">{members.length} online</Text>
        </View>
      </View>

      {/* Members */}
      <View className="py-4 border-b border-slate-800">
        <FlatList
          data={members}
          keyExtractor={(_, i) => i.toString()}
          renderItem={renderMember}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16 }}
        />
      </View>

      {/* Games */}
      <View className="px-4 py-3 border-b border-slate-800">
        <Text className="text-slate-400 text-xs mb-2">GAMES</Text>
        <TouchableOpacity
          onPress={() => navigation.navigate('WhosSpy', { roomId, isHost })}
          activeOpacity={0.8}
          className="bg-slate-800/60 border border-slate-700 rounded-2xl px-4 py-3 flex-row items-center gap-3"
        >
          <Text style={{ fontSize: 24 }}>🕵️</Text>
          <View>
            <Text className="text-white font-semibold">Who's the Spy?</Text>
            <Text className="text-slate-400 text-xs">2-8 players</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Chat */}
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(_, i) => i.toString()}
        renderItem={renderMessage}
        contentContainerStyle={{ padding: 16, flexGrow: 1 }}
        ListEmptyComponent={
          <View className="flex-1 items-center justify-center mt-20">
            <Text className="text-slate-600 text-sm">Say hello! 👋</Text>
          </View>
        }
      />

      {/* Bottom Controls */}
      <View className="px-4 pb-8 pt-3 border-t border-slate-800">
        {/* Mute button */}
        <TouchableOpacity onPress={handleToggleMute} className="items-center mb-3">
          <LinearGradient
            colors={isMuted ? ['#EF444430', '#EF444420'] : ['#7C3AED30', '#4F46E520']}
            style={{ borderRadius: 40, paddingVertical: 12, paddingHorizontal: 28, borderWidth: 1, borderColor: isMuted ? '#EF4444' : '#7C3AED' }}
          >
            <Text style={{ fontSize: 22 }}>{isMuted ? '🔇' : '🎤'}</Text>
          </LinearGradient>
        </TouchableOpacity>

        {/* Message input */}
        <View className="flex-row items-center bg-slate-800 border border-slate-700 rounded-2xl px-4 gap-3">
          <TextInput
            className="flex-1 text-white py-3 text-sm"
            placeholder="Type a message..."
            placeholderTextColor="#64748B"
            value={message}
            onChangeText={setMessage}
            onSubmitEditing={sendMessage}
            returnKeyType="send"
          />
          <TouchableOpacity onPress={sendMessage}>
            <LinearGradient
              colors={['#7C3AED', '#4F46E5']}
              style={{ borderRadius: 10, paddingVertical: 8, paddingHorizontal: 14 }}
            >
              <Text className="text-white text-sm font-bold">Send</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
