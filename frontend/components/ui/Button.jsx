import { TouchableOpacity, Text, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

export default function Button({ title, onPress, loading = false, variant = 'primary', className = '' }) {
  if (variant === 'primary') {
    return (
      <TouchableOpacity onPress={onPress} disabled={loading} activeOpacity={0.85} className={className}>
        <LinearGradient
          colors={['#7C3AED', '#4F46E5']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{ borderRadius: 14, paddingVertical: 15, alignItems: 'center' }}
        >
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text className="text-white font-bold text-base tracking-widest">{title}</Text>
          }
        </LinearGradient>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={loading}
      activeOpacity={0.85}
      className={`border border-violet-500 rounded-2xl py-4 items-center ${className}`}
    >
      {loading
        ? <ActivityIndicator color="#7C3AED" />
        : <Text className="text-violet-400 font-bold text-base tracking-widest">{title}</Text>
      }
    </TouchableOpacity>
  );
}
