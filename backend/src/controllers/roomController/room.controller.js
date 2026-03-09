import supabase from '../../config/supabase.js';

// GET /api/rooms — all active public rooms
export const getRooms = async (req, res) => {
  try {
    const { data: rooms, error } = await supabase
      .from('rooms')
      .select(`
        id, name, room_type, max_members, current_members, game_type, created_at,
        users:host_id (id, username, avatar_url)
      `)
      .eq('is_active', true)
      .eq('room_type', 'public')
      .order('created_at', { ascending: false });

    if (error) throw error;

    return res.status(200).json({ success: true, rooms });
  } catch (err) {
    console.error('getRooms error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// POST /api/rooms — create a room
export const createRoom = async (req, res) => {
  try {
    const { name, room_type = 'public', max_members = 8, game_type } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, message: 'Room name is required' });
    }

    const { data: room, error } = await supabase
      .from('rooms')
      .insert({
        name,
        host_id: req.user.id,
        room_type,
        max_members,
        game_type: game_type || null,
        current_members: 1,
      })
      .select(`
        id, name, room_type, max_members, current_members, game_type, created_at,
        users:host_id (id, username, avatar_url)
      `)
      .single();

    if (error) throw error;

    // Auto join host as member
    await supabase.from('room_members').insert({
      room_id: room.id,
      user_id: req.user.id,
    });

    return res.status(201).json({ success: true, room });
  } catch (err) {
    console.error('createRoom error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// GET /api/rooms/:id — single room with members
export const getRoom = async (req, res) => {
  try {
    const { id } = req.params;

    const { data: room, error } = await supabase
      .from('rooms')
      .select(`
        id, name, room_type, max_members, current_members, game_type, is_active, created_at,
        users:host_id (id, username, avatar_url)
      `)
      .eq('id', id)
      .single();

    if (error || !room) {
      return res.status(404).json({ success: false, message: 'Room not found' });
    }

    const { data: members } = await supabase
      .from('room_members')
      .select('is_muted, joined_at, users:user_id (id, username, avatar_url)')
      .eq('room_id', id);

    return res.status(200).json({ success: true, room: { ...room, members: members || [] } });
  } catch (err) {
    console.error('getRoom error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// DELETE /api/rooms/:id — delete room (host only)
export const deleteRoom = async (req, res) => {
  try {
    const { id } = req.params;

    const { data: room } = await supabase
      .from('rooms')
      .select('host_id')
      .eq('id', id)
      .single();

    if (!room) return res.status(404).json({ success: false, message: 'Room not found' });
    if (room.host_id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Only host can delete the room' });
    }

    await supabase.from('rooms').update({ is_active: false }).eq('id', id);

    return res.status(200).json({ success: true, message: 'Room closed' });
  } catch (err) {
    console.error('deleteRoom error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};
