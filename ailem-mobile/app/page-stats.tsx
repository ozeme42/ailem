import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Layers } from 'lucide-react-native';
import { useRouter, Stack } from 'expo-router';

export default function PageStatsScreen() {
  const router = useRouter();

  return (
    <SafeAreaView className="flex-1 bg-slate-50 dark:bg-slate-950">
      <Stack.Screen options={{ headerShown: false }} />
      <View className="p-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex-row justify-between items-center shadow-sm z-10">
        <TouchableOpacity onPress={() => router.back()} className="w-10 h-10 items-center justify-center bg-slate-100 dark:bg-slate-800 rounded-full">
           <ChevronLeft size={24} color="#64748b" />
        </TouchableOpacity>
        <Text className="text-xl font-bold text-slate-900 dark:text-white">Sayfa İstatistikleri</Text>
        <TouchableOpacity className="w-10 h-10 items-center justify-center bg-amber-100 dark:bg-amber-900/50 rounded-full">
           <Layers size={20} color="#f59e0b" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerClassName="p-4" showsVerticalScrollIndicator={false}>
         <View className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-sm border border-slate-100 dark:border-slate-800 mb-6 mt-4 items-center">
            <View className="w-24 h-24 bg-amber-50 dark:bg-amber-900/30 rounded-full items-center justify-center mb-4 border-4 border-white dark:border-slate-800 shadow-sm">
               <Layers size={48} color="#f59e0b" />
            </View>
            <Text className="text-4xl font-black text-slate-900 dark:text-white">14,250</Text>
            <Text className="text-slate-500 font-medium mt-1">Okunan Toplam Sayfa</Text>
         </View>

         <View className="flex-row justify-between mb-6">
            <View className="bg-amber-500 p-6 rounded-3xl flex-1 mr-2 shadow-sm items-center">
               <Text className="text-3xl font-black text-white">45</Text>
               <Text className="text-amber-100 font-medium mt-1 text-xs">Günlük Ort.</Text>
            </View>
            <View className="bg-slate-800 p-6 rounded-3xl flex-1 ml-2 shadow-sm items-center">
               <Text className="text-3xl font-black text-white">1,350</Text>
               <Text className="text-slate-400 font-medium mt-1 text-xs">Aylık Ort.</Text>
            </View>
         </View>
      </ScrollView>
    </SafeAreaView>
  );
}
