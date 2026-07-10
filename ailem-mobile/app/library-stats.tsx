import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, BarChart3, BookMarked, UserCheck, Layers } from 'lucide-react-native';
import { useRouter, Stack } from 'expo-router';
import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/auth-context';
import { onSingleUserLibraryUpdate, onReadingSessionsUpdate, onBooksUpdate } from '../lib/dataService';
import type { UserLibrary, ReadingSession, Book } from '../lib/data';

export default function LibraryStatsScreen() {
  const router = useRouter();
  const { user } = useAuth();

  const [userLibrary, setUserLibrary] = useState<UserLibrary | null>(null);
  const [readingSessions, setReadingSessions] = useState<ReadingSession[]>([]);
  const [books, setBooks] = useState<Book[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    
    let unsubLib: any;
    let unsubSessions: any;
    let unsubBooks: any;

    const setup = async () => {
       unsubLib = onSingleUserLibraryUpdate(user.uid, setUserLibrary);
       unsubSessions = onReadingSessionsUpdate(setReadingSessions);
       unsubBooks = onBooksUpdate(setBooks);
       setTimeout(() => setIsLoading(false), 500);
    };
    setup();

    return () => {
       if (typeof unsubLib === 'function') unsubLib();
       if (typeof unsubBooks === 'function') unsubBooks();
       
       if (typeof unsubSessions === 'function') {
           unsubSessions();
       } else if (unsubSessions && typeof unsubSessions.then === 'function') {
           unsubSessions.then((u: any) => typeof u === 'function' && u());
       }
    };
  }, [user]);

  const stats = useMemo(() => {
    if (!user) return { totalBooks: 0, uniqueAuthors: 0, totalPages: 0, totalTimeStr: '0dk', monthlyStats: [] };

    const totalBooks = userLibrary?.books?.length || 0;
    
    const uniqueAuthors = new Set(
        (userLibrary?.books || [])
          .map(b => books.find(book => book.id === b.bookId)?.author)
          .filter(a => a && a.trim() !== '')
    ).size;

    const userSessions = readingSessions.filter(s => s.memberId === user.uid);
    const totalPages = userSessions.reduce((sum, s) => sum + (s.pagesRead || 0), 0);
    const totalSeconds = userSessions.reduce((sum, s) => sum + (s.durationSeconds || 0), 0);
    
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const totalTimeStr = hours > 0 ? `${hours}sa ${minutes}dk` : `${minutes}dk`;

    const monthNames = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
    const now = new Date();
    const monthlyData: any[] = [];
    
    for (let i = 4; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        monthlyData.push({
            monthIndex: d.getMonth(),
            year: d.getFullYear(),
            label: monthNames[d.getMonth()],
            pages: 0
        });
    }

    userSessions.forEach(s => {
        if (!s.startTime) return;
        const sd = new Date(s.startTime);
        const match = monthlyData.find(m => m.monthIndex === sd.getMonth() && m.year === sd.getFullYear());
        if (match) {
            match.pages += (s.pagesRead || 0);
        }
    });

    const maxPages = Math.max(...monthlyData.map(m => m.pages), 1); 
    const monthlyStats = monthlyData.map(m => ({
        ...m,
        heightPercent: Math.max((m.pages / maxPages) * 100, 5) // min 5% for visibility
    }));

    return { totalBooks, uniqueAuthors, totalPages, totalTimeStr, monthlyStats };
  }, [userLibrary, readingSessions, books, user]);

  const formatNumber = (num: number) => {
      if (num >= 1000) return (num / 1000).toFixed(1).replace('.0', '') + 'K';
      return num.toString();
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-50 dark:bg-slate-950">
      <Stack.Screen options={{ headerShown: false }} />
      <View className="p-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex-row justify-between items-center shadow-sm z-10">
        <TouchableOpacity onPress={() => router.back()} className="w-10 h-10 items-center justify-center bg-slate-100 dark:bg-slate-800 rounded-full">
           <ChevronLeft size={24} color="#64748b" />
        </TouchableOpacity>
        <Text className="text-xl font-bold text-slate-900 dark:text-white">Kütüphane İstatistikleri</Text>
        <TouchableOpacity className="w-10 h-10 items-center justify-center bg-indigo-100 dark:bg-indigo-900/50 rounded-full">
           <BarChart3 size={20} color="#6366f1" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerClassName="p-4" showsVerticalScrollIndicator={false}>
         
         {isLoading ? (
             <View className="py-20 items-center justify-center">
                 <ActivityIndicator size="large" color="#6366f1" />
             </View>
         ) : (
             <>
                 <View className="flex-row flex-wrap justify-between">
                    <View className="bg-white dark:bg-slate-900 p-5 rounded-3xl w-[48%] mb-4 shadow-sm border border-slate-100 dark:border-slate-800">
                       <View className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/30 rounded-full items-center justify-center mb-3">
                          <BookMarked size={24} color="#10b981" />
                       </View>
                       <Text className="text-3xl font-bold text-slate-800 dark:text-slate-100 mb-1">{stats.totalBooks}</Text>
                       <Text className="text-sm text-slate-500 font-medium">Toplam Kitap</Text>
                    </View>

                    <View className="bg-white dark:bg-slate-900 p-5 rounded-3xl w-[48%] mb-4 shadow-sm border border-slate-100 dark:border-slate-800">
                       <View className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-full items-center justify-center mb-3">
                          <UserCheck size={24} color="#3b82f6" />
                       </View>
                       <Text className="text-3xl font-bold text-slate-800 dark:text-slate-100 mb-1">{stats.uniqueAuthors}</Text>
                       <Text className="text-sm text-slate-500 font-medium">Farklı Yazar</Text>
                    </View>

                    <View className="bg-white dark:bg-slate-900 p-5 rounded-3xl w-[48%] mb-4 shadow-sm border border-slate-100 dark:border-slate-800">
                       <View className="w-12 h-12 bg-amber-100 dark:bg-amber-900/30 rounded-full items-center justify-center mb-3">
                          <Layers size={24} color="#f59e0b" />
                       </View>
                       <Text className="text-3xl font-bold text-slate-800 dark:text-slate-100 mb-1">{formatNumber(stats.totalPages)}</Text>
                       <Text className="text-sm text-slate-500 font-medium">Okunan Sayfa</Text>
                    </View>

                    <View className="bg-white dark:bg-slate-900 p-5 rounded-3xl w-[48%] mb-4 shadow-sm border border-slate-100 dark:border-slate-800">
                       <View className="w-12 h-12 bg-pink-100 dark:bg-pink-900/30 rounded-full items-center justify-center mb-3">
                          <BarChart3 size={24} color="#ec4899" />
                       </View>
                       <Text className="text-3xl font-bold text-slate-800 dark:text-slate-100 mb-1" numberOfLines={1} adjustsFontSizeToFit>{stats.totalTimeStr}</Text>
                       <Text className="text-sm text-slate-500 font-medium">Okuma Süresi</Text>
                    </View>
                 </View>

                 <View className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-sm border border-slate-100 dark:border-slate-800 mt-2">
                    <Text className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-4">Aylara Göre Okuma (Sayfa)</Text>
                    <View className="h-40 flex-row items-end justify-between px-2">
                       {stats.monthlyStats.map((ms, idx) => (
                           <View key={idx} className="items-center flex-1">
                              <View 
                                style={{ height: `${ms.heightPercent}%` }}
                                className={`w-8 rounded-t-lg ${idx === 4 ? 'bg-indigo-600' : 'bg-indigo-300 dark:bg-indigo-900/50'}`} 
                              />
                              <Text className={`text-xs mt-2 ${idx === 4 ? 'text-slate-800 dark:text-slate-200 font-bold' : 'text-slate-400'}`}>
                                {ms.label}
                              </Text>
                           </View>
                       ))}
                    </View>
                 </View>

                 <TouchableOpacity 
                   onPress={() => router.push('/reading-sessions')}
                   className="bg-indigo-600 rounded-2xl p-4 mt-6 flex-row justify-center items-center shadow-sm"
                 >
                    <Layers size={20} color="white" className="mr-2" />
                    <Text className="text-white font-bold text-lg">Okuma Geçmişini Görüntüle</Text>
                 </TouchableOpacity>
             </>
         )}
         
         <View className="h-10"></View>
      </ScrollView>
    </SafeAreaView>
  );
}
