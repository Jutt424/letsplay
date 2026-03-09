import { View, Text, StatusBar } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Button from '../../components/ui/Button';

export default function WelcomeScreen({ navigation }) {
  return (
    <View className="flex-1 bg-slate-950">
      <StatusBar barStyle="light-content" />

      {/* Background glow effects */}
      <View style={{
        position: 'absolute', top: -80, left: -80,
        width: 300, height: 300, borderRadius: 150,
        backgroundColor: '#7C3AED', opacity: 0.15,
      }} />
      <View style={{
        position: 'absolute', top: 100, right: -60,
        width: 200, height: 200, borderRadius: 100,
        backgroundColor: '#4F46E5', opacity: 0.12,
      }} />

      {/* Top Section - Logo */}
      <View className="flex-1 items-center justify-center px-8">
        <LinearGradient
          colors={['#7C3AED', '#4F46E5', '#06B6D4']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ borderRadius: 26, padding: 24, marginBottom: 20 }}
        >
          <Text style={{ fontSize: 48 }}>🎮</Text>
        </LinearGradient>

        <Text className="text-white font-bold text-5xl tracking-tight mb-2">
          Lets<Text className="text-violet-400">Play</Text>
        </Text>

        <Text className="text-slate-400 text-center text-base mt-2 px-4 leading-6">
          Join rooms, play games, and vibe with people — all in one place.
        </Text>

        <View className="flex-row mt-10 gap-4">
          {['🃏', '🎲', '🕵️', '🎯', '🎤'].map((icon, i) => (
            <View key={i} className="bg-slate-800/70 rounded-2xl p-3 border border-slate-700/50">
              <Text style={{ fontSize: 22 }}>{icon}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Bottom Section */}
      <View className="px-8 pb-12">
        <Button
          title="GET STARTED"
          onPress={() => navigation.navigate('Register')}
          className="mb-3"
        />
        <Button
          title="LOG IN"
          variant="outline"
          onPress={() => navigation.navigate('Login')}
        />
        <Text className="text-slate-600 text-center text-xs mt-6">
          By continuing, you agree to our Terms & Privacy Policy
        </Text>
      </View>
    </View>
  );
}
