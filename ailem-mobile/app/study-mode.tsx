import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Brain, Sparkles, MoveRight, MoveLeft } from 'lucide-react-native';
import { useRouter, Stack } from 'expo-router';

export default function StudyModeScreen() {
  const router = useRouter();

  return (
    <SafeAreaView className="flex-1 bg-slate-50 dark:bg-slate-950">
      <Stack.Screen options={{ headerShown: false }} />
      <View className="p-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex-row justify-between items-center shadow-sm z-10">
        <TouchableOpacity onPress={() => router.back()} className="w-10 h-10 items-center justify-center bg-slate-100 dark:bg-slate-800 rounded-full">
           <ChevronLeft size={24} color="#64748b" />
        </TouchableOpacity>
        <Text className="text-xl font-bold text-slate-900 dark:text-white">Odaklı Çalışma Modu</Text>
        <TouchableOpacity className="w-10 h-10 items-center justify-center bg-violet-100 dark:bg-violet-900/50 rounded-full">
           <Brain size={20} color="#8b5cf6" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, flexGrow: 1, justifyContent: 'center' }} showsVerticalScrollIndicator={false}>
         
         <View className="bg-white dark:bg-slate-900 rounded-3xl p-8 shadow-sm border border-slate-100 dark:border-slate-800 h-96 items-center justify-center mb-6">
            <Text className="text-2xl font-bold text-slate-800 dark:text-slate-100 text-center leading-10">
               Mitoz bölünme hangi evrelerden oluşur?
            </Text>
            <TouchableOpacity className="mt-8 flex-row items-center justify-center bg-slate-100 dark:bg-slate-800 py-3 px-6 rounded-full border border-slate-200 dark:border-slate-700">
               <Sparkles size={16} color="#8b5cf6" className="mr-2" />
               <Text className="text-slate-650 dark:text-slate-350 font-bold">Cevabı Göster (Flashcard Çevir)</Text>
            </TouchableOpacity>
         </View>

         <View className="flex-row justify-between">
            <TouchableOpacity className="bg-slate-200 dark:bg-slate-800 flex-row items-center justify-center py-4 px-6 rounded-full w-[48%]">
               <MoveLeft size={20} color="#64748b" className="mr-2" />
               <Text className="text-slate-700 dark:text-slate-305 font-bold">Önceki</Text>
            </TouchableOpacity>
            
            <TouchableOpacity className="bg-violet-500 flex-row items-center justify-center py-4 px-6 rounded-full w-[48%]">
               <Text className="text-white font-bold mr-2">Sonraki Kart</Text>
               <MoveRight size={20} color="white" />
            </TouchableOpacity>
         </View>
      </ScrollView>
    </SafeAreaView>
  );
}
