import { View, Text, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState } from 'react';
import { useAuth } from '../context/auth-context';
import { useRouter, Stack } from 'expo-router';
import { Users, ChevronLeft } from 'lucide-react-native';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

export default function JoinFamilyScreen() {
  const [familyCode, setFamilyCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { user } = useAuth();
  const router = useRouter();

  const handleJoin = async () => {
    if (!familyCode.trim() || !user) return;
    
    setLoading(true);
    setError('');
    
    try {
      const familyRef = doc(db, 'families', familyCode.trim());
      const familyDoc = await getDoc(familyRef);

      if (!familyDoc.exists()) {
        setError('Bu kodla eşleşen bir aile bulunamadı.');
        setLoading(false);
        return;
      }

      await updateDoc(doc(db, 'users', user.uid), {
        familyId: familyCode.trim()
      });

      // Reload app state essentially by pushing to root
      router.replace('/(tabs)');
    } catch (e: any) {
      setError('Bir hata oluştu: ' + e.message);
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-slate-950">
      <Stack.Screen options={{ headerShown: false }} />
      <View className="flex-1 p-6 justify-center">
         <View className="items-center mb-10">
            <View className="w-24 h-24 bg-indigo-50 dark:bg-indigo-900/30 rounded-full items-center justify-center mb-6">
               <Users size={48} color="#6366f1" />
            </View>
            <Text className="text-3xl font-bold text-slate-900 dark:text-white text-center mb-2">Ailenize Katılın</Text>
            <Text className="text-slate-500 text-center text-lg">Uygulamayı kullanmaya başlamak için ailenizin benzersiz kodunu (familyId) girin.</Text>
         </View>

         {error ? (
           <View className="bg-red-50 p-4 rounded-xl mb-6">
             <Text className="text-red-600 text-center">{error}</Text>
           </View>
         ) : null}

         <View className="mb-6">
            <Text className="text-slate-700 dark:text-slate-300 font-medium mb-2">Aile Kodu</Text>
            <TextInput 
              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-xl text-slate-900 dark:text-white text-center text-lg font-bold tracking-widest"
              placeholder="örn: ailem-1234"
              placeholderTextColor="#94a3b8"
              value={familyCode}
              onChangeText={setFamilyCode}
              autoCapitalize="none"
            />
         </View>

         <TouchableOpacity 
            onPress={handleJoin}
            disabled={loading}
            className="w-full bg-indigo-500 p-4 rounded-xl items-center shadow-sm"
         >
            {loading ? <ActivityIndicator color="white" /> : <Text className="text-white font-bold text-lg">Katıl</Text>}
         </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
