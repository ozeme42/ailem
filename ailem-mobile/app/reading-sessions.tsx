import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useEffect, useState } from 'react';
import { onReadingSessionsUpdate, deleteReadingSession } from '../lib/dataService';
import { ReadingSession } from '../lib/data';
import { BookOpenCheck, ChevronLeft, Clock, Trash2 } from 'lucide-react-native';
import { useRouter, Stack } from 'expo-router';
import { format, parseISO } from 'date-fns';
import { tr } from 'date-fns/locale';

export default function ReadingSessionsScreen() {
  const [sessions, setSessions] = useState<ReadingSession[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    let unsubscribe: any;
    try {
      unsubscribe = onReadingSessionsUpdate(familyId, (data: ReadingSession[]) => {
        setSessions(data);
        setLoading(false);
      });
    } catch (e) {
      console.log('Error fetching sessions:', e);
      setLoading(false);
    }

    return () => {
       if (typeof unsubscribe === 'function') {
           unsubscribe();
       } else if (unsubscribe && typeof unsubscribe.then === 'function') {
           unsubscribe.then((u: any) => typeof u === 'function' && u());
       }
    };
  }, []);

  const handleDelete = (id: string) => {
    Alert.alert(
      "Kaydı Sil",
      "Bu okuma kaydını silmek istediğinizden emin misiniz?",
      [
        { text: "İptal", style: "cancel" },
        { 
          text: "Sil", 
          style: "destructive",
          onPress: async () => {
            try {
              await deleteReadingSession(id);
            } catch (err) {
              Alert.alert("Hata", "Kayıt silinemedi.");
            }
          }
        }
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 justify-center items-center bg-slate-50 dark:bg-slate-950">
        <ActivityIndicator size="large" color="#8b5cf6" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-slate-50 dark:bg-slate-950">
      <Stack.Screen options={{ headerShown: false }} />
      <View className="p-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex-row justify-between items-center z-10">
        <TouchableOpacity onPress={() => router.back()} className="w-10 h-10 items-center justify-center bg-slate-100 dark:bg-slate-800 rounded-full">
           <ChevronLeft size={24} color="#64748b" />
        </TouchableOpacity>
        <Text className="text-2xl font-bold text-slate-900 dark:text-white">Okuma Kayıtları</Text>
        <View className="w-10 h-10" />
      </View>

      <ScrollView contentContainerClassName="p-4" showsVerticalScrollIndicator={false}>
         {sessions.length === 0 ? (
           <View className="items-center justify-center mt-10">
             <View className="w-20 h-20 bg-violet-50 dark:bg-violet-900/30 rounded-full items-center justify-center mb-4">
                <BookOpenCheck size={40} color="#8b5cf6" />
             </View>
             <Text className="text-slate-500 text-lg font-medium text-center">Okuma oturumu kaydı bulunmuyor.</Text>
           </View>
         ) : (
           sessions.map(s => (
             <View key={s.id} className="bg-white dark:bg-slate-900 rounded-3xl p-5 mb-4 shadow-sm border border-slate-100 dark:border-slate-800 flex-row justify-between items-center">
                 <View className="flex-row items-center flex-1">
                    <View className="w-12 h-12 bg-violet-50 dark:bg-violet-900/30 rounded-xl items-center justify-center mr-4">
                       <Clock size={24} color="#8b5cf6" />
                    </View>
                    <View className="flex-1 mr-2">
                       <Text className="font-bold text-slate-800 dark:text-slate-100 text-lg">{s.pagesRead} Sayfa Okundu</Text>
                       <Text className="text-slate-500 text-sm">{s.startTime ? format(parseISO(s.startTime), 'd MMM yyyy', { locale: tr }) : 'Tarih yok'}</Text>
                    </View>
                 </View>
                 
                 <View className="items-end justify-between h-full">
                    <View className="bg-slate-50 dark:bg-slate-800 px-3 py-1 rounded-lg mb-2">
                       <Text className="font-bold text-slate-700 dark:text-slate-300 text-xs">{Math.round((s.durationSeconds || 0) / 60)} dk</Text>
                    </View>
                    <TouchableOpacity onPress={() => handleDelete(s.id)} className="w-8 h-8 bg-red-50 dark:bg-red-900/30 items-center justify-center rounded-full">
                       <Trash2 size={16} color="#ef4444" />
                    </TouchableOpacity>
                 </View>
             </View>
           ))
         )}
         <View className="h-10"></View>
      </ScrollView>
    </SafeAreaView>
  );
}
