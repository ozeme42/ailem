import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, FolderOpen, FileText } from 'lucide-react-native';
import { useRouter, Stack, useLocalSearchParams } from 'expo-router';

export default function EducationCategoryScreen() {
  const router = useRouter();
  const { categoryName } = useLocalSearchParams();

  return (
    <SafeAreaView className="flex-1 bg-slate-50 dark:bg-slate-950">
      <Stack.Screen options={{ headerShown: false }} />
      <View className="p-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex-row justify-between items-center shadow-sm z-10">
        <TouchableOpacity onPress={() => router.back()} className="w-10 h-10 items-center justify-center bg-slate-100 dark:bg-slate-800 rounded-full">
           <ChevronLeft size={24} color="#64748b" />
        </TouchableOpacity>
        <Text className="text-xl font-bold text-slate-900 dark:text-white capitalize">{categoryName || 'Kategori'}</Text>
        <TouchableOpacity className="w-10 h-10 items-center justify-center bg-emerald-100 dark:bg-emerald-900/50 rounded-full">
           <FolderOpen size={20} color="#10b981" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerClassName="p-4" showsVerticalScrollIndicator={false}>
         <View className="items-center justify-center mt-6 mb-8">
            <View className="w-24 h-24 bg-emerald-50 dark:bg-emerald-900/30 rounded-full items-center justify-center mb-4 border-4 border-white dark:border-slate-800 shadow-sm">
               <FolderOpen size={48} color="#10b981" />
            </View>
            <Text className="text-slate-800 dark:text-slate-100 text-2xl font-bold text-center capitalize">{categoryName} Dersleri</Text>
         </View>

         <Text className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-4 px-2">Bu Kategorideki İçerikler</Text>
         
         {[1, 2, 3].map((item) => (
           <TouchableOpacity 
             key={item} 
             className="bg-white dark:bg-slate-900 rounded-2xl p-4 mb-3 shadow-sm border border-slate-100 dark:border-slate-800 flex-row items-center"
           >
              <View className="w-12 h-16 bg-slate-100 dark:bg-slate-800 rounded-md items-center justify-center mr-4">
                 <FileText size={24} color="#64748b" />
              </View>
              <View className="flex-1">
                 <Text className="text-slate-800 dark:text-slate-100 font-bold text-lg" numberOfLines={1}>{(categoryName as string)} Çalışma Kağıdı {item}</Text>
                 <Text className="text-slate-500 text-sm">PDF • 12 Sayfa</Text>
              </View>
           </TouchableOpacity>
         ))}
      </ScrollView>
    </SafeAreaView>
  );
}
