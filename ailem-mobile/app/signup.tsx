import { View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ActivityIndicator, ScrollView } from 'react-native';
import { useState } from 'react';
import { useAuth } from '../context/auth-context';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function SignupScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { signup } = useAuth();
  const router = useRouter();

  const handleSignup = async () => {
    try {
      setLoading(true);
      setError('');
      await signup(email, password);
    } catch (e: any) {
      setError(e.message || 'Kayıt olunamadı.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-slate-950">
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
      >
        <ScrollView 
          contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', paddingHorizontal: 32 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
        <View style={{ width: '100%', maxWidth: 420, alignSelf: 'center' }}>
          <View className="mb-10 items-center">
            <Text className="text-3xl font-bold text-slate-900 dark:text-white mb-2">Aramıza Katıl</Text>
            <Text className="text-slate-500 text-center">Yeni bir hesap oluşturun</Text>
          </View>

          {error ? (
            <View className="bg-red-50 p-4 rounded-xl mb-6 border border-red-100">
              <Text className="text-red-600 text-center">{error}</Text>
            </View>
          ) : null}

          <View className="space-y-4">
            <View className="mb-4">
              <Text className="text-slate-700 dark:text-slate-300 font-medium mb-2">E-posta</Text>
              <TextInput
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-xl text-slate-900 dark:text-white"
                placeholder="ornek@mail.com"
                placeholderTextColor="#94a3b8"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
              />
            </View>

            <View className="mb-6">
              <Text className="text-slate-700 dark:text-slate-300 font-medium mb-2">Şifre</Text>
              <TextInput
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-xl text-slate-900 dark:text-white"
                placeholder="********"
                placeholderTextColor="#94a3b8"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />
            </View>

            <TouchableOpacity 
              onPress={handleSignup}
              disabled={loading}
              className="w-full bg-indigo-500 p-4 rounded-xl items-center shadow-sm"
            >
              {loading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text className="text-white font-bold text-lg">Kayıt Ol</Text>
              )}
            </TouchableOpacity>
          </View>

          <View className="flex-row justify-center mt-8">
            <Text className="text-slate-500">Zaten hesabınız var mı? </Text>
            <TouchableOpacity onPress={() => router.push('/login')}>
              <Text className="text-indigo-500 font-bold">Giriş Yap</Text>
            </TouchableOpacity>
          </View>
        </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
