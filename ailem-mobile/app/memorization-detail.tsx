import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, BrainCircuit, Mic, Star } from 'lucide-react-native';
import { useRouter, Stack, useLocalSearchParams } from 'expo-router';

export default function MemorizationDetailScreen() {
  const router = useRouter();
  const { itemId } = useLocalSearchParams();

  return (
    <SafeAreaView className="flex-1 bg-slate-50 dark:bg-slate-950">
      <Stack.Screen options={{ headerShown: false }} />
      <View className="p-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex-row justify-between items-center shadow-sm z-10">
        <TouchableOpacity onPress={() => router.back()} className="w-10 h-10 items-center justify-center bg-slate-100 dark:bg-slate-800 rounded-full">
           <ChevronLeft size={24} color="#64748b" />
        </TouchableOpacity>
        <Text className="text-xl font-bold text-slate-900 dark:text-white">Ezber Detayı</Text>
        <TouchableOpacity className="w-10 h-10 items-center justify-center bg-teal-100 dark:bg-teal-900/50 rounded-full">
           <BrainCircuit size={20} color="#14b8a6" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerClassName="p-4" showsVerticalScrollIndicator={false}>
         
         <View className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-sm border border-slate-100 dark:border-slate-800 items-center mb-6 mt-4">
            <View className="w-20 h-20 bg-teal-50 dark:bg-teal-900/30 rounded-full items-center justify-center mb-4 border-4 border-white dark:border-slate-800 shadow-sm">
               <Star size={40} color="#14b8a6" />
            </View>
            <Text className="text-2xl font-bold text-slate-900 dark:text-white text-center mb-2">Periyodik Tablo (İlk 20 Element)</Text>
            <Text className="text-teal-600 font-bold mb-4 bg-teal-100 px-4 py-1.5 rounded-full">%45 Tamamlandı</Text>
            
            <View className="w-full bg-slate-100 dark:bg-slate-800 p-6 rounded-2xl items-center">
               <Mic size={32} color="#64748b" className="mb-2" />
               <Text className="text-slate-500 font-medium">Sesli okuma pratiği başlat</Text>
            </View>
         </View>

         <View className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-sm border border-slate-100 dark:border-slate-800 mb-6">
            <Text className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-4 border-b border-slate-100 dark:border-slate-800 pb-3">Ezber İçeriği</Text>
            <Text className="text-slate-700 dark:text-slate-300 leading-7 text-lg text-justify">
               Hidrojen (H), Helyum (He), Lityum (Li), Berilyum (Be), Bor (B), Karbon (C), Azot (N), Oksijen (O), Flor (F), Neon (Ne), Sodyum (Na), Magnezyum (Mg), Alüminyum (Al), Silisyum (Si), Fosfor (P), Kükürt (S), Klor (Cl), Argon (Ar), Potasyum (K), Kalsiyum (Ca).
            </Text>
         </View>
      </ScrollView>
    </SafeAreaView>
  );
}
