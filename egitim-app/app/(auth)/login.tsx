import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../context/auth-context';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login } = useAuth();
  const router = useRouter();

  const handleLogin = async () => {
    try {
      await login(email, password);
    } catch (e: any) {
      Alert.alert('Hata', e.message);
    }
  };

  return (
    <View style={{ flex: 1, justifyContent: 'center', padding: 24, backgroundColor: '#f8fafc' }}>
      <Text style={{ fontSize: 32, fontWeight: '900', color: '#0f172a', marginBottom: 8 }}>Hoş Geldiniz</Text>
      <Text style={{ fontSize: 16, color: '#64748b', marginBottom: 32 }}>Eğitim platformuna giriş yapın</Text>
      
      <View style={{ gap: 16 }}>
        <TextInput 
          placeholder="E-posta" 
          value={email} 
          onChangeText={setEmail} 
          autoCapitalize="none"
          style={{ backgroundColor: 'white', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', fontSize: 16 }}
        />
        <TextInput 
          placeholder="Şifre" 
          value={password} 
          onChangeText={setPassword} 
          secureTextEntry 
          style={{ backgroundColor: 'white', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', fontSize: 16 }}
        />
        <TouchableOpacity onPress={handleLogin} style={{ backgroundColor: '#4f46e5', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 8 }}>
          <Text style={{ color: 'white', fontWeight: '800', fontSize: 16 }}>Giriş Yap</Text>
        </TouchableOpacity>
        
        <TouchableOpacity onPress={() => router.push('/(auth)/register')} style={{ alignItems: 'center', marginTop: 16 }}>
          <Text style={{ color: '#4f46e5', fontWeight: '600' }}>Hesabınız yok mu? Kayıt Olun</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
