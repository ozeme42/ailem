import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useEffect, useState } from 'react';
import { Tag, ChevronLeft, Plus } from 'lucide-react-native';
import { useRouter, Stack } from 'expo-router';
import { onTagsUpdate } from '../lib/dataService';

export default function TagsScreen() {
  const router = useRouter();
  const [tags, setTags] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribe: any;
    try {
      unsubscribe = onTagsUpdate("libraryTags", (data) => {
        setTags(data || []);
        setLoading(false);
      });
    } catch (e) {
      console.log('Error fetching tags:', e);
      setLoading(false);
    }
    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, []);

  return (
    <SafeAreaView className="flex-1 bg-slate-50 dark:bg-slate-950">
      <Stack.Screen options={{ headerShown: false }} />
      <View className="p-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex-row justify-between items-center shadow-sm z-10">
        <TouchableOpacity onPress={() => router.back()} className="w-10 h-10 items-center justify-center bg-slate-100 dark:bg-slate-800 rounded-full">
           <ChevronLeft size={24} color="#64748b" />
        </TouchableOpacity>
        <Text className="text-xl font-bold text-slate-900 dark:text-white">Etiketler</Text>
        <TouchableOpacity className="w-10 h-10 items-center justify-center bg-pink-100 dark:bg-pink-900/50 rounded-full">
           <Plus size={20} color="#ec4899" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerClassName="p-4" showsVerticalScrollIndicator={false}>
         {loading ? (
           <ActivityIndicator size="large" color="#ec4899" className="mt-10" />
         ) : tags.length === 0 ? (
           <View className="items-center justify-center mt-20">
              <View className="w-24 h-24 bg-pink-50 dark:bg-pink-900/30 rounded-full items-center justify-center mb-6 border-4 border-white dark:border-slate-800 shadow-sm">
                 <Tag size={48} color="#ec4899" />
              </View>
              <Text className="text-slate-800 dark:text-slate-100 text-xl font-bold mb-2">Etiket Bulunamadı</Text>
              <Text className="text-slate-500 font-medium text-center px-4">Uygulama genelinde sınıflandırma yapmak için kullandığınız etiketler burada listelenecek.</Text>
           </View>
         ) : (
           <View className="flex-row flex-wrap">
             {tags.map((tag, idx) => (
               <TouchableOpacity 
                 key={idx} 
                 className="bg-white dark:bg-slate-900 rounded-full py-3 px-5 mb-3 mr-3 shadow-sm border border-slate-100 dark:border-slate-800 flex-row items-center"
               >
                  <View className="w-3 h-3 rounded-full mr-2 bg-pink-500" />
                  <Text className="text-slate-800 dark:text-slate-100 font-bold">{tag}</Text>
               </TouchableOpacity>
             ))}
           </View>
         )}
         <View className="h-10"></View>
      </ScrollView>
    </SafeAreaView>
  );
}
