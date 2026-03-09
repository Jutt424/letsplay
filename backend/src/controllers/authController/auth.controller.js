import bcrypt from 'bcryptjs';
import supabase from '../../config/supabase.js';
import { generateAccessToken } from '../../config/jwt.js';

// POST /api/auth/register
export const register = async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ success: false, message: 'Username, email aur password required hain' });
    }

    if (password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password kam az kam 6 characters ka hona chahiye' });
    }

    // Check if email or username already exists
    const { data: existing } = await supabase
      .from('users')
      .select('id, email, username')
      .or(`email.eq.${email},username.eq.${username}`)
      .single();

    if (existing) {
      const field = existing.email === email ? 'Email' : 'Username';
      return res.status(409).json({ success: false, message: `${field} already registered hai` });
    }

    // Hash password
    const password_hash = await bcrypt.hash(password, 12);

    // Create user
    const { data: user, error } = await supabase
      .from('users')
      .insert({ username, email, password_hash })
      .select('id, username, email, avatar_url, coins, level, created_at')
      .single();

    if (error) throw error;

    const token = generateAccessToken({ id: user.id, username: user.username, email: user.email });

    return res.status(201).json({
      success: true,
      message: 'Account ban gaya!',
      token,
      user,
    });
  } catch (err) {
    console.error('Register error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// POST /api/auth/login
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email aur password required hain' });
    }

    // Find user
    const { data: user, error } = await supabase
      .from('users')
      .select('id, username, email, password_hash, avatar_url, coins, level')
      .eq('email', email)
      .single();

    if (error || !user) {
      return res.status(401).json({ success: false, message: 'Email ya password galat hai' });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Email ya password galat hai' });
    }

    // Update online status
    await supabase.from('users').update({ is_online: true }).eq('id', user.id);

    const token = generateAccessToken({ id: user.id, username: user.username, email: user.email });

    const { password_hash, ...userWithoutPassword } = user;

    return res.status(200).json({
      success: true,
      message: 'Login successful!',
      token,
      user: userWithoutPassword,
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// GET /api/auth/me
export const getMe = async (req, res) => {
  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('id, username, email, avatar_url, bio, coins, level, is_online, created_at')
      .eq('id', req.user.id)
      .single();

    if (error || !user) {
      return res.status(404).json({ success: false, message: 'User nahi mila' });
    }

    return res.status(200).json({ success: true, user });
  } catch (err) {
    console.error('GetMe error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// POST /api/auth/logout
export const logout = async (req, res) => {
  try {
    await supabase.from('users').update({ is_online: false }).eq('id', req.user.id);
    return res.status(200).json({ success: true, message: 'Logout ho gaye' });
  } catch (err) {
    console.error('Logout error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};
