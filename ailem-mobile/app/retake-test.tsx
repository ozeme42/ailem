import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useEffect, useState } from 'react';
import { ChevronLeft, RotateCcw, AlertCircle, PlayCircle, Hash } from 'lucide-react-native';
import { useRouter, Stack, useLocalSearchParams } from 'expo-router';
import { onMistakesUpdate } from '../lib/dataService';
import { Mistake } from '../lib/data';

export default function RetakeTestScreen() {
  const router = useRouter();
  const { testId } = useLocalSearchParams();
  const [mistakes, setMistakes] = useState<Mistake[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onMistakesUpdate((data) => {
      // Filter by testId if provided, else show all active mistakes
      let activeMistakes = data?.filter(m => m.status === 'active') || [];
      if (testId) {
        activeMistakes = activeMistakes.filter(m => m.testId === testId);
      }
      setMistakes(activeMistakes);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [testId]);

  return (
    <SafeAreaView className="flex-1 bg-slate-50 dark:bg-slate-950">
      <Stack.Screen options={{ headerShown: false }} />
      <View className="p-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex-row justify-between items-center shadow-sm z-10">
        <TouchableOpacity onPress={() => router.back()} className="w-10 h-10 items-center justify-center bg-slate-100 dark:bg-slate-800 rounded-full">
           <ChevronLeft size={24} color="#64748b" />
        </TouchableOpacity>
        <Text className="text-xl font-bold text-slate-900 dark:text-white">Hataları Tekrar Çöz</Text>
        <TouchableOpacity className="w-10 h-10 items-center justify-center bg-pink-100 dark:bg-pink-900/50 rounded-full">
           <RotateCcw size={20} color="#ec4899" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerClassName="p-4" showsVerticalScrollIndicator={false}>
         
         <View className="items-center justify-center mt-6 mb-8">
           <View className="w-24 h-24 bg-pink-50 dark:bg-pink-900/30 rounded-full items-center justify-center mb-4 border-4 border-white dark:border-slate-800 shadow-sm">
              <AlertCircle size={48} color="#ec4899" />
           </View>
           {testId && <Text className="text-slate-800 dark:text-slate-100 text-xl font-bold mt-2">Test ID: {testId}</Text>}
           <Text className="text-slate-500 font-medium text-center px-6 mt-2">Bu listede çözemediğiniz veya boş bıraktığınız sorular özel bir oturumda karşınıza getirilecek.</Text>
         </View>

         {loading ? (
           <ActivityIndicator size="large" color="#ec4899" />
         ) : (
           <View className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-sm border border-slate-100 dark:border-slate-800 mb-8">
              <View className="flex-row justify-between items-center mb-4 border-b border-slate-100 dark:border-slate-800 pb-4">
                 <Text className="text-slate-600 dark:text-slate-300 font-bold">Toplam Bekleyen Hata</Text>
                 <Text className="text-slate-900 dark:text-white font-black text-xl">{mistakes.length}</Text>
              </View>
              
              {mistakes.map((m, idx) => (
                <View key={m.id} className="flex-row items-center mt-3 bg-slate-50 dark:bg-slate-800 p-3 rounded-xl border border-slate-100 dark:border-slate-700">
                   <Hash size={16} color="#ec4899" className="mr-2" />
                   <Text className="flex-1 text-slate-800 dark:text-slate-200 font-medium">{m.topic || `Soru ${idx+1}`}</Text>
                   <View className="bg-pink-100 dark:bg-pink-900/30 px-2 py-1 rounded">
                      <Text className="text-pink-600 dark:text-pink-400 text-xs font-bold">{m.subject}</Text>
                   </View>
                </View>
              ))}
              
              {mistakes.length === 0 && (
                <Text className="text-slate-500 font-medium text-center mt-4">Aktif hata kaydı bulunamadı. Harika!</Text>
              )}
           </View>
         )}

         {mistakes.length > 0 && (
           <TouchableOpacity 
             className="bg-pink-500 p-4 rounded-2xl flex-row justify-center items-center shadow-sm"
             onPress={() => router.push('/test-session')}
           >
              <PlayCircle size={24} color="white" className="mr-2" />
              <Text className="text-white font-bold text-lg">Hataları Çözmeye Başla</Text>
           </TouchableOpacity>
         )}

         <View className="h-10"></View>
      </ScrollView>
    </SafeAreaView>
  );
}
