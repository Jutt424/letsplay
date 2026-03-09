import { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, RefreshControl, StatusBar, Modal, TextInput, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../common/AuthContext';
import { roomAPI } from '../../common/api';

export default function HomeScreen({ navigation }) {
  const { user, logout } = useAuth();
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [roomName, setRoomName] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  const fetchRooms = useCallback(async () => {
    try {
      const data = await roomAPI.getRooms();
      setRooms(data.rooms || []);
    } catch (err) {
      console.error('fetchRooms error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchRooms(); }, [fetchRooms]);

  const handleCreateRoom = async () => {
    if (!roomName.trim()) {
      setCreateError('Room name is required');
      return;
    }
    setCreating(true);
    setCreateError('');
    try {
      const data = await roomAPI.createRoom({ name: roomName.trim() });
      setShowCreate(false);
      setRoomName('');
      navigation.navigate('Room', { roomId: data.room.id, roomName: data.room.name, isHost: true });
    } catch (err) {
      setCreateError(err.message || 'Could not create room');
    } finally {
      setCreating(false);
    }
  };

  const gameTypeIcon = (type) => {
    const icons = { spy: '🕵️', truth_dare: '🎯', trivia: '🧠', default: '🎮' };
    return icons[type] || icons.default;
  };

  const renderRoom = ({ item }) => (
    <TouchableOpacity
      onPress={() => navigation.navigate('Room', { roomId: item.id, roomName: item.name, isHost: item.users?.id === user?.id })}
      activeOpacity={0.8}
      className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-4 mb-3"
    >
      <View className="flex-row items-center justify-between mb-2">
        <View className="flex-row items-center gap-2">
          <Text style={{ fontSize: 22 }}>{gameTypeIcon(item.game_type)}</Text>
          <Text className="text-white font-semibold text-base" numberOfLines={1}>{item.name}</Text>
        </View>
        <View className="bg-violet-500/20 border border-violet-500/40 rounded-full px-3 py-1">
          <Text className="text-violet-400 text-xs font-medium">
            {item.current_members}/{item.max_members}
          </Text>
        </View>
      </View>
      <View className="flex-row items-center justify-between">
        <Text className="text-slate-400 text-sm">
          Host: {item.users?.username || 'Unknown'}
        </Text>
        <View className="flex-row items-center gap-1">
          <View className="w-2 h-2 rounded-full bg-green-400" />
          <Text className="text-green-400 text-xs">Live</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View className="flex-1 bg-slate-950">
      <StatusBar barStyle="light-content" />

      {/* Background glow */}
      <View style={{
        position: 'absolute', top: -60, right: -60,
        width: 240, height: 240, borderRadius: 120,
        backgroundColor: '#7C3AED', opacity: 0.08,
      }} />

      {/* Header */}
      <View className="px-6 pt-14 pb-4">
        <View className="flex-row items-center justify-between">
          <View>
            <Text className="text-slate-400 text-sm">Welcome back,</Text>
            <Text className="text-white font-bold text-2xl">{user?.username} 👋</Text>
          </View>
          <TouchableOpacity onPress={logout} className="bg-slate-800 rounded-xl px-4 py-2">
            <Text className="text-slate-400 text-sm">Logout</Text>
          </TouchableOpacity>
        </View>

        {/* Stats */}
        <View className="flex-row gap-3 mt-4">
          <LinearGradient
            colors={['#7C3AED20', '#4F46E520']}
            style={{ flex: 1, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#7C3AED40' }}
          >
            <Text className="text-violet-400 text-xl font-bold">{rooms.length}</Text>
            <Text className="text-slate-400 text-xs mt-1">Active Rooms</Text>
          </LinearGradient>
          <LinearGradient
            colors={['#06B6D420', '#0284C720']}
            style={{ flex: 1, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#06B6D440' }}
          >
            <Text className="text-cyan-400 text-xl font-bold">{user?.coins || 0}</Text>
            <Text className="text-slate-400 text-xs mt-1">Coins</Text>
          </LinearGradient>
        </View>
      </View>

      {/* Rooms List */}
      <View className="flex-1 px-6">
        <View className="flex-row items-center justify-between mb-4">
          <Text className="text-white font-bold text-lg">Live Rooms</Text>
          <TouchableOpacity onPress={fetchRooms}>
            <Text className="text-violet-400 text-sm">Refresh</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator color="#7C3AED" size="large" />
          </View>
        ) : rooms.length === 0 ? (
          <View className="flex-1 items-center justify-center">
            <Text style={{ fontSize: 48 }}>🎮</Text>
            <Text className="text-white font-semibold text-lg mt-4">No rooms yet</Text>
            <Text className="text-slate-400 text-sm mt-2 text-center">
              Be the first to create a room!
            </Text>
          </View>
        ) : (
          <FlatList
            data={rooms}
            keyExtractor={(item) => item.id}
            renderItem={renderRoom}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchRooms(); }} tintColor="#7C3AED" />
            }
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>

      {/* Create Room FAB */}
      <TouchableOpacity
        onPress={() => setShowCreate(true)}
        activeOpacity={0.85}
        style={{ position: 'absolute', bottom: 32, right: 24 }}
      >
        <LinearGradient
          colors={['#7C3AED', '#4F46E5']}
          style={{ borderRadius: 20, paddingVertical: 16, paddingHorizontal: 24, flexDirection: 'row', alignItems: 'center', gap: 8 }}
        >
          <Text className="text-white text-xl">+</Text>
          <Text className="text-white font-bold text-sm">Create Room</Text>
        </LinearGradient>
      </TouchableOpacity>

      {/* Create Room Modal */}
      <Modal visible={showCreate} transparent animationType="slide">
        <View style={{ flex: 1, backgroundColor: '#00000090', justifyContent: 'flex-end' }}>
          <View className="bg-slate-900 rounded-t-3xl p-6 pb-10">
            <Text className="text-white font-bold text-xl mb-6">Create a Room</Text>

            <Text className="text-slate-400 text-sm mb-2">Room Name</Text>
            <View className="bg-slate-800 border border-slate-700 rounded-2xl px-4 py-3 mb-4">
              <TextInput
                className="text-white text-base"
                placeholder="e.g. Chill Vibes 🎮"
                placeholderTextColor="#64748B"
                value={roomName}
                onChangeText={setRoomName}
                autoFocus
              />
            </View>

            {createError ? <Text className="text-red-400 text-sm mb-3">{createError}</Text> : null}

            <TouchableOpacity onPress={handleCreateRoom} disabled={creating} activeOpacity={0.85}>
              <LinearGradient
                colors={['#7C3AED', '#4F46E5']}
                style={{ borderRadius: 14, paddingVertical: 15, alignItems: 'center' }}
              >
                {creating
                  ? <ActivityIndicator color="#fff" />
                  : <Text className="text-white font-bold text-base tracking-widest">CREATE</Text>
                }
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => { setShowCreate(false); setRoomName(''); setCreateError(''); }} className="mt-3 py-4 items-center">
              <Text className="text-slate-400">Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}
