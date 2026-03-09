import { useState } from 'react';
import { View, TextInput, Text, TouchableOpacity } from 'react-native';

export default function Input({
  label,
  placeholder,
  value,
  onChangeText,
  secureTextEntry = false,
  keyboardType = 'default',
  autoCapitalize = 'none',
  error = '',
}) {
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = secureTextEntry;

  return (
    <View className="mb-4">
      {label && <Text className="text-slate-400 text-sm mb-1 ml-1">{label}</Text>}
      <View className={`flex-row items-center bg-slate-800/80 border rounded-2xl px-4 py-1 ${error ? 'border-red-500' : 'border-slate-700'}`}>
        <TextInput
          className="flex-1 text-white text-base py-3"
          placeholder={placeholder}
          placeholderTextColor="#64748B"
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={isPassword && !showPassword}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
        />
        {isPassword && (
          <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
            <Text className="text-slate-400 text-sm">{showPassword ? 'Hide' : 'Show'}</Text>
          </TouchableOpacity>
        )}
      </View>
      {error ? <Text className="text-red-400 text-xs mt-1 ml-1">{error}</Text> : null}
    </View>
  );
}
