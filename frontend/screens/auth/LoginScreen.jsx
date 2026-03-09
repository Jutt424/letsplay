import { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform, StatusBar } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import { useAuth } from '../../common/AuthContext';

export default function LoginScreen({ navigation }) {
  const { login } = useAuth();
  const [form, setForm] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState('');

  const validate = () => {
    const newErrors = {};
    if (!form.email) newErrors.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(form.email)) newErrors.email = 'Enter a valid email';
    if (!form.password) newErrors.password = 'Password is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async () => {
    if (!validate()) return;
    setLoading(true);
    setApiError('');
    try {
      await login(form.email, form.password);
    } catch (err) {
      setApiError(err.message || 'Login failed. Please try again.');
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
        position: 'absolute', bottom: -100, right: -100,
        width: 350, height: 350, borderRadius: 175,
        backgroundColor: '#7C3AED', opacity: 0.1,
      }} />

      <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
        <View className="px-6 pt-14 pb-6">
          <TouchableOpacity onPress={() => navigation.goBack()} className="mb-8">
            <Text className="text-violet-400 text-base">← Back</Text>
          </TouchableOpacity>

          <LinearGradient
            colors={['#7C3AED', '#06B6D4']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={{ height: 3, width: 48, borderRadius: 2, marginBottom: 16 }}
          />
          <Text className="text-white font-bold text-4xl">Welcome{'\n'}Back 👋</Text>
          <Text className="text-slate-400 mt-2 text-base">Log in and jump into the game</Text>
        </View>

        <View className="px-6 flex-1">
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

          <TouchableOpacity className="items-end mb-6">
            <Text className="text-violet-400 text-sm">Forgot Password?</Text>
          </TouchableOpacity>

          {apiError ? <Text className="text-red-400 text-sm mb-3 text-center">{apiError}</Text> : null}
          <Button title="LOG IN" onPress={handleLogin} loading={loading} />

          <View className="flex-row items-center my-6">
            <View className="flex-1 h-px bg-slate-800" />
            <Text className="text-slate-600 mx-3 text-sm">or continue with</Text>
            <View className="flex-1 h-px bg-slate-800" />
          </View>

          <View className="flex-row gap-3">
            <TouchableOpacity className="flex-1 bg-slate-800/80 border border-slate-700 rounded-2xl py-4 items-center">
              <Text className="text-white text-sm font-medium">🔵 Google</Text>
            </TouchableOpacity>
            <TouchableOpacity className="flex-1 bg-slate-800/80 border border-slate-700 rounded-2xl py-4 items-center">
              <Text className="text-white text-sm font-medium">⚫ Apple</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View className="items-center py-8">
          <Text className="text-slate-500 text-sm">
            Don't have an account?{' '}
            <Text className="text-violet-400 font-semibold" onPress={() => navigation.navigate('Register')}>
              Sign up
            </Text>
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
