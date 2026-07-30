import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useEffect, useState } from 'react';
import { ChevronLeft, Activity, Calendar, Flame, CheckCircle2 } from 'lucide-react-native';
import { useRouter, Stack, useLocalSearchParams } from 'expo-router';
import { onTasksUpdate, updateHabitCompletion } from '../lib/dataService';
import { Task } from '../lib/data';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';

export default function HabitDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const [habit, setHabit] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    
    let unsubscribe: any;
    try {
      unsubscribe = onTasksUpdate((data: Task[]) => {
        const found = data.find(h => h.id === id);
        setHabit(found || null);
        setLoading(false);
      });
    } catch (e) {
      console.log('Error fetching habit detail:', e);
      setLoading(false);
    }

    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, [id]);

  if (loading) {
    return (
      <SafeAreaView className="flex-1 justify-center items-center bg-slate-50 dark:bg-slate-950">
        <ActivityIndicator size="large" color="#8b5cf6" />
      </SafeAreaView>
    );
  }

  if (!habit) {
    return (
      <SafeAreaView className="flex-1 bg-slate-50 dark:bg-slate-950">
        <Stack.Screen options={{ headerShown: false }} />
        <View className="p-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex-row items-center">
          <TouchableOpacity onPress={() => router.back()} className="w-10 h-10 items-center justify-center bg-slate-100 dark:bg-slate-800 rounded-full mr-4">
             <ChevronLeft size={24} color="#64748b" />
          </TouchableOpacity>
          <Text className="text-xl font-bold text-slate-900 dark:text-white">Alışkanlık Bulunamadı</Text>
        </View>
      </SafeAreaView>
    );
  }

  const completedDates = habit.completedDates || [];
  const streak = habit.streak || 0;
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const isTodayCompleted = completedDates.includes(todayStr);

  const handleToggleToday = async () => {
    try {
      await updateHabitCompletion(habit.id, new Date(), !isTodayCompleted);
    } catch (e) {
      console.error('Error toggling today habit:', e);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-50 dark:bg-slate-950">
      <Stack.Screen options={{ headerShown: false }} />
      <View className="p-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex-row justify-between items-center">
        <TouchableOpacity onPress={() => router.back()} className="w-10 h-10 items-center justify-center bg-slate-100 dark:bg-slate-800 rounded-full">
           <ChevronLeft size={24} color="#64748b" />
        </TouchableOpacity>
        <Text className="text-2xl font-bold text-slate-900 dark:text-white" numberOfLines={1}>{habit.title}</Text>
        <View className="w-10 h-10" />
      </View>

      <ScrollView contentContainerClassName="p-4" showsVerticalScrollIndicator={false}>
         <View className="items-center justify-center mt-6 mb-8">
           <View className="w-24 h-24 bg-violet-50 dark:bg-violet-900/30 rounded-full items-center justify-center mb-4 border-4 border-white dark:border-slate-800 shadow-sm">
              <Activity size={48} color="#8b5cf6" />
           </View>
           <Text className="text-slate-800 dark:text-slate-100 text-3xl font-bold mt-2">{habit.title}</Text>
           <View className="flex-row items-center mt-3 bg-orange-100 dark:bg-orange-900/30 px-4 py-2 rounded-full">
              <Flame size={20} color="#f97316" className="mr-2" />
              <Text className="text-orange-600 font-bold">{streak} Günlük Seri!</Text>
           </View>
         </View>

         <View className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-sm border border-slate-100 dark:border-slate-800 mb-6">
            <View className="flex-row items-center mb-6">
               <Calendar size={24} color="#8b5cf6" className="mr-3" />
               <Text className="text-lg font-bold text-slate-800 dark:text-slate-100">Tamamlanan Günler</Text>
            </View>
            
            {completedDates.length === 0 ? (
               <View className="bg-slate-50 dark:bg-slate-800 p-6 rounded-2xl items-center justify-center border border-slate-100 dark:border-slate-700">
                  <Text className="text-slate-400 font-medium text-center">Henüz hiç tamamlanmış gün yok. Bugün ilk günün olsun!</Text>
               </View>
            ) : (
               <View className="flex-row flex-wrap justify-center">
                  {completedDates.slice(-14).map((date: string, index: number) => (
                    <View key={index} className="w-1/4 items-center mb-4">
                       <View className="w-12 h-12 rounded-full bg-violet-500 items-center justify-center mb-1">
                          <CheckCircle2 size={24} color="white" />
                       </View>
                       <Text className="text-xs text-slate-500 font-bold">
                          {format(new Date(date), 'd MMM', { locale: tr })}
                       </Text>
                    </View>
                  ))}
               </View>
            )}
         </View>

         <TouchableOpacity 
            onPress={handleToggleToday}
            className="bg-violet-500 p-4 rounded-2xl flex-row justify-center items-center shadow-sm"
         >
            <CheckCircle2 size={24} color="white" className="mr-2" />
            <Text className="text-white font-bold text-lg">
               {isTodayCompleted ? 'Bugünü İptal Et' : 'Bugün Tamamlandı İşaretle'}
            </Text>
         </TouchableOpacity>

         <View className="h-10"></View>
      </ScrollView>
    </SafeAreaView>
  );
}
