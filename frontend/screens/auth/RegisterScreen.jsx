import { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform, StatusBar } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import { useAuth } from '../../common/AuthContext';

export default function RegisterScreen({ navigation }) {
  const { register } = useAuth();
  const [form, setForm] = useState({ username: '', email: '', password: '', confirmPassword: '' });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState('');

  const validate = () => {
    const newErrors = {};
    if (!form.username) newErrors.username = 'Username is required';
    else if (form.username.length < 3) newErrors.username = 'At least 3 characters required';
    else if (!/^[a-zA-Z0-9_]+$/.test(form.username)) newErrors.username = 'Only letters, numbers and underscore';

    if (!form.email) newErrors.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(form.email)) newErrors.email = 'Enter a valid email';

    if (!form.password) newErrors.password = 'Password is required';
    else if (form.password.length < 6) newErrors.password = 'At least 6 characters required';

    if (!form.confirmPassword) newErrors.confirmPassword = 'Please confirm your password';
    else if (form.password !== form.confirmPassword) newErrors.confirmPassword = 'Passwords do not match';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleRegister = async () => {
    if (!validate()) return;
    setLoading(true);
    setApiError('');
    try {
      await register(form.username, form.email, form.password);
    } catch (err) {
      setApiError(err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-slate-950"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar barStyle="light-content" />

      <View style={{
        position: 'absolute', top: -80, right: -80,
        width: 280, height: 280, borderRadius: 140,
        backgroundColor: '#4F46E5', opacity: 0.12,
      }} />
      <View style={{
        position: 'absolute', bottom: -60, left: -60,
        width: 220, height: 220, borderRadius: 110,
        backgroundColor: '#06B6D4', opacity: 0.08,
      }} />

      <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
        <View className="px-6 pt-14 pb-6">
          <TouchableOpacity onPress={() => navigation.goBack()} className="mb-8">
            <Text className="text-violet-400 text-base">← Back</Text>
          </TouchableOpacity>

          <LinearGradient
            colors={['#06B6D4', '#7C3AED']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={{ height: 3, width: 48, borderRadius: 2, marginBottom: 16 }}
          />
          <Text className="text-white font-bold text-4xl">Create{'\n'}Account 🚀</Text>
          <Text className="text-slate-400 mt-2 text-base">Welcome to the arena!</Text>
        </View>

        <View className="px-6">
          <Input
            label="Username"
            placeholder="coolplayer_123"
            value={form.username}
            onChangeText={(v) => setForm({ ...form, username: v })}
            autoCapitalize="none"
            error={errors.username}
          />
          <Input
            label="Email"
            placeholder="your@email.com"
            value={form.email}
            onChangeText={(v) => setForm({ ...form, email: v })}
            keyboardType="email-address"
            error={errors.email}
          />
          <Input
            label="Password"
            placeholder="••••••••"
            value={form.password}
            onChangeText={(v) => setForm({ ...form, password: v })}
            secureTextEntry
            error={errors.password}
          />
          <Input
            label="Confirm Password"
            placeholder="••••••••"
            value={form.confirmPassword}
            onChangeText={(v) => setForm({ ...form, confirmPassword: v })}
            secureTextEntry
            error={errors.confirmPassword}
          />

          {apiError ? <Text className="text-red-400 text-sm mb-3 text-center">{apiError}</Text> : null}
          <Button title="CREATE ACCOUNT" onPress={handleRegister} loading={loading} className="mt-2" />
        </View>

        <View className="items-center py-8">
          <Text className="text-slate-500 text-sm">
            Already have an account?{' '}
            <Text className="text-violet-400 font-semibold" onPress={() => navigation.navigate('Login')}>
              Log in
            </Text>
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
