import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Clock, Save, FileBadge } from 'lucide-react-native';
import { useRouter, Stack, useLocalSearchParams } from 'expo-router';

import { useState } from 'react';
import { updateTest } from '../lib/dataService';

export default function TestSessionScreen() {
  const router = useRouter();
  const { testId } = useLocalSearchParams();
  const [loading, setLoading] = useState(false);

  const handleFinish = async () => {
    if (!testId) {
      router.back();
      return;
    }
    setLoading(true);
    try {
      await updateTest(testId as string, {
        status: 'Sonuçlandı',
        score: 85,
        correctAnswers: 17,
        incorrectAnswers: 2,
        emptyAnswers: 1,
        timeSpentSeconds: 1245
      });
      router.replace('/education-results');
    } catch (e) {
      console.log('Error finishing test:', e);
      router.back();
    }
    setLoading(false);
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-50 dark:bg-slate-950">
      <Stack.Screen options={{ headerShown: false }} />
      <View className="p-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex-row justify-between items-center shadow-sm z-10">
        <TouchableOpacity onPress={() => router.back()} className="w-10 h-10 items-center justify-center bg-slate-100 dark:bg-slate-800 rounded-full">
           <ChevronLeft size={24} color="#64748b" />
        </TouchableOpacity>
        <View className="flex-row items-center">
           <Clock size={20} color="#ef4444" className="mr-2" />
           <Text className="text-xl font-bold text-red-500">12:45</Text>
        </View>
        <TouchableOpacity onPress={handleFinish} disabled={loading} className="bg-blue-500 px-4 py-2 rounded-full">
           <Text className="text-white font-bold text-sm">{loading ? '...' : 'Bitir'}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerClassName="p-4" showsVerticalScrollIndicator={false}>
         <View className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-sm border border-slate-100 dark:border-slate-800 mb-6">
            <View className="flex-row justify-between items-center mb-6 border-b border-slate-100 dark:border-slate-800 pb-4">
               <Text className="text-slate-500 font-bold uppercase tracking-widest text-xs">Soru 1 / 20</Text>
               <View className="bg-amber-100 dark:bg-amber-900/50 px-3 py-1 rounded-full">
                  <Text className="text-amber-600 font-bold text-xs">Boş</Text>
               </View>
            </View>

            <Text className="text-xl font-medium text-slate-800 dark:text-slate-100 mb-8 leading-8">
               Aşağıdaki hücre bölünmesi evrelerinden hangisi sadece mayoz bölünmeye özgüdür?
            </Text>

            <TouchableOpacity className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-4 rounded-2xl mb-3 flex-row items-center">
               <View className="w-8 h-8 rounded-full border border-slate-300 dark:border-slate-600 items-center justify-center mr-3">
                  <Text className="text-slate-500 font-bold">A</Text>
               </View>
               <Text className="text-slate-700 dark:text-slate-300 font-medium text-lg">Krossing-over</Text>
            </TouchableOpacity>

            <TouchableOpacity className="bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-500 p-4 rounded-2xl mb-3 flex-row items-center">
               <View className="w-8 h-8 rounded-full bg-blue-500 items-center justify-center mr-3">
                  <Text className="text-white font-bold">B</Text>
               </View>
               <Text className="text-blue-700 dark:text-blue-300 font-bold text-lg">Sentromer bölünmesi</Text>
            </TouchableOpacity>

            <TouchableOpacity className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-4 rounded-2xl mb-3 flex-row items-center">
               <View className="w-8 h-8 rounded-full border border-slate-300 dark:border-slate-600 items-center justify-center mr-3">
                  <Text className="text-slate-500 font-bold">C</Text>
               </View>
               <Text className="text-slate-700 dark:text-slate-300 font-medium text-lg">İğ ipliği oluşumu</Text>
            </TouchableOpacity>

         </View>

         <View className="flex-row justify-between mb-8">
            <TouchableOpacity className="bg-slate-200 dark:bg-slate-800 py-4 px-6 rounded-2xl w-[48%] items-center">
               <Text className="text-slate-700 dark:text-slate-300 font-bold">Önceki Soru</Text>
            </TouchableOpacity>
            <TouchableOpacity className="bg-blue-500 py-4 px-6 rounded-2xl w-[48%] items-center">
               <Text className="text-white font-bold">Sonraki Soru</Text>
            </TouchableOpacity>
         </View>
      </ScrollView>
    </SafeAreaView>
  );
}
