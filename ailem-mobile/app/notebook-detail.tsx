import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useEffect, useState } from 'react';
import { ChevronLeft, Notebook, FileText, Plus, Hash } from 'lucide-react-native';
import { useRouter, Stack, useLocalSearchParams } from 'expo-router';
import { onNotebookDetailsUpdate } from '../lib/dataService';
import { Note } from '../lib/data';

export default function NotebookDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const [details, setDetails] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    
    let unsubscribe: any;
    try {
      unsubscribe = onNotebookDetailsUpdate(id as string, (data: any) => {
        setDetails(data);
        setLoading(false);
      });
    } catch (e) {
      console.log('Error fetching notebook details:', e);
      setLoading(false);
    }

    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, [id]);

  if (loading) {
    return (
      <SafeAreaView className="flex-1 justify-center items-center bg-slate-50 dark:bg-slate-950">
        <ActivityIndicator size="large" color="#f59e0b" />
      </SafeAreaView>
    );
  }

  if (!details) {
    return (
      <SafeAreaView className="flex-1 bg-slate-50 dark:bg-slate-950">
        <Stack.Screen options={{ headerShown: false }} />
        <View className="p-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex-row items-center">
          <TouchableOpacity onPress={() => router.back()} className="w-10 h-10 items-center justify-center bg-slate-100 dark:bg-slate-800 rounded-full mr-4">
             <ChevronLeft size={24} color="#64748b" />
          </TouchableOpacity>
          <Text className="text-xl font-bold text-slate-900 dark:text-white">Defter Bulunamadı</Text>
        </View>
      </SafeAreaView>
    );
  }

  const notes: Note[] = details.notes || [];

  return (
    <SafeAreaView className="flex-1 bg-slate-50 dark:bg-slate-950">
      <Stack.Screen options={{ headerShown: false }} />
      <View className="p-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex-row justify-between items-center">
        <TouchableOpacity onPress={() => router.back()} className="w-10 h-10 items-center justify-center bg-slate-100 dark:bg-slate-800 rounded-full">
           <ChevronLeft size={24} color="#64748b" />
        </TouchableOpacity>
        <Text className="text-2xl font-bold text-slate-900 dark:text-white" numberOfLines={1}>{details.name}</Text>
        <TouchableOpacity onPress={() => router.push({ pathname: '/modal', params: { type: 'note', title: 'Yeni Not', notebookId: id } })} className="w-10 h-10 items-center justify-center bg-amber-500 rounded-full">
           <Plus size={24} color="white" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerClassName="p-4" showsVerticalScrollIndicator={false}>
         <View className="bg-amber-500 rounded-3xl p-6 shadow-sm mb-6 flex-row items-center justify-between">
            <View className="flex-1 mr-4">
               <Text className="text-amber-100 font-medium mb-1">{details.category || 'Genel Defter'}</Text>
               <Text className="text-white text-3xl font-bold">{notes.length} Sayfa</Text>
            </View>
            <View className="w-16 h-16 bg-white/20 rounded-full items-center justify-center border-4 border-white/30">
               <Notebook size={28} color="white" />
            </View>
         </View>

         {notes.length === 0 ? (
           <View className="items-center justify-center mt-10">
             <View className="w-20 h-20 bg-amber-50 dark:bg-amber-900/30 rounded-full items-center justify-center mb-4">
                <FileText size={40} color="#f59e0b" />
             </View>
             <Text className="text-slate-500 text-lg font-medium text-center">Bu defter henüz boş.</Text>
           </View>
         ) : (
           notes.map(note => (
             <View key={note.id} className="bg-white dark:bg-slate-900 rounded-3xl p-5 mb-4 shadow-sm border border-slate-100 dark:border-slate-800">
                <View className="flex-row items-center mb-3">
                   <View className="w-10 h-10 bg-amber-50 dark:bg-amber-900/30 rounded-xl items-center justify-center mr-3">
                      <Hash size={20} color="#f59e0b" />
                   </View>
                   <Text className="font-bold text-slate-800 dark:text-slate-100 text-lg flex-1" numberOfLines={1}>{note.title}</Text>
                </View>
                <View className="bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl">
                   <Text className="text-slate-600 dark:text-slate-300" numberOfLines={4}>{note.content?.[0]?.data || 'İçerik yok.'}</Text>
                </View>
             </View>
           ))
         )}
         <View className="h-10"></View>
      </ScrollView>
    </SafeAreaView>
  );
}
