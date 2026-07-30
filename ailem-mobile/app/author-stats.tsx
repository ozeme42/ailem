import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, BarChart2, UserCheck } from 'lucide-react-native';
import { useRouter, Stack } from 'expo-router';

export default function AuthorStatsScreen() {
  const router = useRouter();

  return (
    <SafeAreaView className="flex-1 bg-slate-50 dark:bg-slate-950">
      <Stack.Screen options={{ headerShown: false }} />
      <View className="p-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex-row justify-between items-center shadow-sm z-10">
        <TouchableOpacity onPress={() => router.back()} className="w-10 h-10 items-center justify-center bg-slate-100 dark:bg-slate-800 rounded-full">
           <ChevronLeft size={24} color="#64748b" />
        </TouchableOpacity>
        <Text className="text-xl font-bold text-slate-900 dark:text-white">Yazar İstatistikleri</Text>
        <TouchableOpacity className="w-10 h-10 items-center justify-center bg-pink-100 dark:bg-pink-900/50 rounded-full">
           <UserCheck size={20} color="#ec4899" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerClassName="p-4" showsVerticalScrollIndicator={false}>
         <View className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-sm border border-slate-100 dark:border-slate-800 mb-6 mt-4">
            <View className="flex-row items-center mb-6">
               <BarChart2 size={24} color="#ec4899" className="mr-3" />
               <Text className="text-lg font-bold text-slate-800 dark:text-slate-100">En Çok Okunan Yazarlar</Text>
            </View>
            
            <View className="mb-4">
               <View className="flex-row justify-between mb-1">
                  <Text className="text-slate-700 dark:text-slate-300 font-bold">Stefan Zweig</Text>
                  <Text className="text-slate-500 font-medium">12 Kitap</Text>
               </View>
               <View className="h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <View className="h-full bg-pink-500 rounded-full w-[90%]" />
               </View>
            </View>

            <View className="mb-4">
               <View className="flex-row justify-between mb-1">
                  <Text className="text-slate-700 dark:text-slate-300 font-bold">Sabahattin Ali</Text>
                  <Text className="text-slate-500 font-medium">8 Kitap</Text>
               </View>
               <View className="h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <View className="h-full bg-pink-400 rounded-full w-[60%]" />
               </View>
            </View>

            <View className="mb-2">
               <View className="flex-row justify-between mb-1">
                  <Text className="text-slate-700 dark:text-slate-300 font-bold">George Orwell</Text>
                  <Text className="text-slate-500 font-medium">5 Kitap</Text>
               </View>
               <View className="h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <View className="h-full bg-pink-300 rounded-full w-[40%]" />
               </View>
            </View>
         </View>
      </ScrollView>
    </SafeAreaView>
  );
}
