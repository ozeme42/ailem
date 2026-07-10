import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useEffect, useState } from 'react';
import { ChevronLeft, Clock, BookOpen, User, CalendarDays } from 'lucide-react-native';
import { useRouter, Stack, useLocalSearchParams } from 'expo-router';
import { onReadingSessionsUpdate } from '../lib/dataService';
import { ReadingSession } from '../lib/data';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';

export default function ReadingSessionDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const [session, setSession] = useState<ReadingSession | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    
    let unsubscribe: any;
    try {
      unsubscribe = onReadingSessionsUpdate((data) => {
        const found = data?.find(s => s.id === id);
        setSession(found || null);
        setLoading(false);
      });
    } catch (e) {
      console.log('Error fetching reading session detail:', e);
      setLoading(false);
    }

    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, [id]);

  if (loading) {
    return (
      <SafeAreaView className="flex-1 justify-center items-center bg-slate-50 dark:bg-slate-950">
        <ActivityIndicator size="large" color="#14b8a6" />
      </SafeAreaView>
    );
  }

  if (!session) {
    return (
      <SafeAreaView className="flex-1 bg-slate-50 dark:bg-slate-950">
        <Stack.Screen options={{ headerShown: false }} />
        <View className="p-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex-row items-center">
          <TouchableOpacity onPress={() => router.back()} className="w-10 h-10 items-center justify-center bg-slate-100 dark:bg-slate-800 rounded-full mr-4">
             <ChevronLeft size={24} color="#64748b" />
          </TouchableOpacity>
          <Text className="text-xl font-bold text-slate-900 dark:text-white">Oturum Bulunamadı</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-slate-50 dark:bg-slate-950">
      <Stack.Screen options={{ headerShown: false }} />
      <View className="p-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex-row justify-between items-center shadow-sm z-10">
        <TouchableOpacity onPress={() => router.back()} className="w-10 h-10 items-center justify-center bg-slate-100 dark:bg-slate-800 rounded-full">
           <ChevronLeft size={24} color="#64748b" />
        </TouchableOpacity>
        <Text className="text-xl font-bold text-slate-900 dark:text-white">Okuma Oturumu Detayı</Text>
        <View className="w-10 h-10" />
      </View>

      <ScrollView contentContainerClassName="p-4" showsVerticalScrollIndicator={false}>
         
         <View className="bg-teal-500 rounded-3xl p-6 shadow-sm mb-6 mt-4 items-center">
            <View className="w-20 h-20 bg-white/20 rounded-full items-center justify-center mb-4 border-4 border-teal-400">
               <Clock size={40} color="white" />
            </View>
            <Text className="text-white text-4xl font-bold">{Math.round(session.durationSeconds / 60)} Dk</Text>
            <Text className="text-teal-100 font-medium">Toplam Okuma Süresi</Text>
         </View>

         <View className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-sm border border-slate-100 dark:border-slate-800 mb-6">
            <View className="flex-row items-center mb-4 border-b border-slate-100 dark:border-slate-800 pb-4">
               <BookOpen size={24} color="#14b8a6" className="mr-3" />
               <Text className="text-lg font-bold text-slate-800 dark:text-slate-100">Okunan Kitap & Sayfa</Text>
            </View>
            <View className="flex-row justify-between mb-3">
               <Text className="text-slate-500">Kitap ID</Text>
               <Text className="text-slate-800 dark:text-slate-200 font-bold">{session.bookId}</Text>
            </View>
            <View className="flex-row justify-between">
               <Text className="text-slate-500">Okunan Sayfa</Text>
               <Text className="text-teal-500 font-bold">{session.pagesRead} Sayfa</Text>
            </View>
         </View>

         <View className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-sm border border-slate-100 dark:border-slate-800">
            <View className="flex-row items-center mb-4 border-b border-slate-100 dark:border-slate-800 pb-4">
               <CalendarDays size={24} color="#14b8a6" className="mr-3" />
               <Text className="text-lg font-bold text-slate-800 dark:text-slate-100">Zaman Bilgileri</Text>
            </View>
            <View className="flex-row justify-between mb-3">
               <Text className="text-slate-500">Tarih</Text>
                <Text className="text-slate-800 dark:text-slate-200 font-bold">
                  {session.startTime ? format(new Date(session.startTime), 'dd MMMM yyyy', { locale: tr }) : '-'}
                </Text>
            </View>
            <View className="flex-row justify-between mb-3">
               <Text className="text-slate-500">Başlangıç</Text>
               <Text className="text-slate-800 dark:text-slate-200 font-bold">{session.startTime || '-'}</Text>
            </View>
            <View className="flex-row justify-between">
               <Text className="text-slate-500">Bitiş</Text>
               <Text className="text-slate-800 dark:text-slate-200 font-bold">{session.endTime || '-'}</Text>
            </View>
         </View>

         <View className="h-10"></View>
      </ScrollView>
    </SafeAreaView>
  );
}
