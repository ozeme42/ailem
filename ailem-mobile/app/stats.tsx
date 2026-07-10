import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BarChart3, ChevronLeft, TrendingUp, PieChart, LineChart } from 'lucide-react-native';
import { useRouter, Stack } from 'expo-router';

export default function StatsScreen() {
  const router = useRouter();

  return (
    <SafeAreaView className="flex-1 bg-slate-50 dark:bg-slate-950">
      <Stack.Screen options={{ headerShown: false }} />
      <View className="p-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex-row justify-between items-center">
        <TouchableOpacity onPress={() => router.back()} className="w-10 h-10 items-center justify-center bg-slate-100 dark:bg-slate-800 rounded-full">
           <ChevronLeft size={24} color="#64748b" />
        </TouchableOpacity>
        <Text className="text-2xl font-bold text-slate-900 dark:text-white">İstatistikler</Text>
        <View className="w-10 h-10" />
      </View>

      <ScrollView contentContainerClassName="p-4" showsVerticalScrollIndicator={false}>
         
         <View className="bg-indigo-500 rounded-3xl p-6 mb-6 shadow-sm">
            <Text className="text-indigo-100 font-medium mb-1">Genel Başarı Durumu</Text>
            <Text className="text-white text-4xl font-bold">%85</Text>
            <Text className="text-indigo-200 text-sm mt-2">Geçen haftaya göre %5 artış var. Harika gidiyorsunuz!</Text>
         </View>

         <View className="flex-row justify-between mb-4">
            <View className="w-[48%] bg-white dark:bg-slate-900 p-5 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800 items-center">
               <View className="w-12 h-12 bg-blue-50 dark:bg-blue-900/30 rounded-xl items-center justify-center mb-3">
                  <TrendingUp size={24} color="#3b82f6" />
               </View>
               <Text className="text-2xl font-bold text-slate-800 dark:text-slate-100">42</Text>
               <Text className="text-slate-500 text-sm text-center">Çözülen Sınav</Text>
            </View>
            <View className="w-[48%] bg-white dark:bg-slate-900 p-5 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800 items-center">
               <View className="w-12 h-12 bg-emerald-50 dark:bg-emerald-900/30 rounded-xl items-center justify-center mb-3">
                  <PieChart size={24} color="#10b981" />
               </View>
               <Text className="text-2xl font-bold text-slate-800 dark:text-slate-100">₺1.2K</Text>
               <Text className="text-slate-500 text-sm text-center">Tasarruf</Text>
            </View>
         </View>

         <View className="bg-white dark:bg-slate-900 rounded-3xl p-5 mb-4 shadow-sm border border-slate-100 dark:border-slate-800">
            <View className="flex-row items-center mb-4">
               <LineChart size={24} color="#6366f1" className="mr-3" />
               <Text className="text-lg font-bold text-slate-800 dark:text-slate-100">Aylık Aktivite</Text>
            </View>
            <View className="h-40 bg-slate-50 dark:bg-slate-800 rounded-xl items-center justify-center border border-slate-100 dark:border-slate-700">
               <Text className="text-slate-400">Detaylı grafikler web panelinden erişilebilir.</Text>
            </View>
         </View>

         <View className="h-10"></View>
      </ScrollView>
    </SafeAreaView>
  );
}
