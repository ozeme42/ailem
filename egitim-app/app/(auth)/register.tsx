import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../context/auth-context';

export default function RegisterScreen() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'student' | 'teacher'>('student');
  const { signup } = useAuth();
  const router = useRouter();

  const handleRegister = async () => {
    try {
      await signup(email, password, name, role);
    } catch (e: any) {
      Alert.alert('Hata', e.message);
    }
  };

  return (
    <View style={{ flex: 1, justifyContent: 'center', padding: 24, backgroundColor: '#f8fafc' }}>
      <Text style={{ fontSize: 32, fontWeight: '900', color: '#0f172a', marginBottom: 8 }}>Kayıt Ol</Text>
      <Text style={{ fontSize: 16, color: '#64748b', marginBottom: 32 }}>Eğitim platformuna katılın</Text>
      
      <View style={{ flexDirection: 'row', gap: 12, marginBottom: 20 }}>
         <TouchableOpacity onPress={() => setRole('student')} style={{ flex: 1, padding: 12, borderRadius: 12, borderWidth: 2, borderColor: role === 'student' ? '#4f46e5' : '#e2e8f0', backgroundColor: role === 'student' ? '#e0e7ff' : 'white', alignItems: 'center' }}>
            <Text style={{ fontWeight: '800', color: role === 'student' ? '#4f46e5' : '#64748b' }}>Öğrenci</Text>
         </TouchableOpacity>
         <TouchableOpacity onPress={() => setRole('teacher')} style={{ flex: 1, padding: 12, borderRadius: 12, borderWidth: 2, borderColor: role === 'teacher' ? '#4f46e5' : '#e2e8f0', backgroundColor: role === 'teacher' ? '#e0e7ff' : 'white', alignItems: 'center' }}>
            <Text style={{ fontWeight: '800', color: role === 'teacher' ? '#4f46e5' : '#64748b' }}>Öğretmen</Text>
         </TouchableOpacity>
      </View>

      <View style={{ gap: 16 }}>
        <TextInput 
          placeholder="Ad Soyad" 
          value={name} 
          onChangeText={setName} 
          style={{ backgroundColor: 'white', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', fontSize: 16 }}
        />
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
        <TouchableOpacity onPress={handleRegister} style={{ backgroundColor: '#4f46e5', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 8 }}>
          <Text style={{ color: 'white', fontWeight: '800', fontSize: 16 }}>Kayıt Ol</Text>
        </TouchableOpacity>
        
        <TouchableOpacity onPress={() => router.back()} style={{ alignItems: 'center', marginTop: 16 }}>
          <Text style={{ color: '#4f46e5', fontWeight: '600' }}>Zaten hesabınız var mı? Giriş Yapın</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
