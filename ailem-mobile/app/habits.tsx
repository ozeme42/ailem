import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useEffect, useState } from 'react';
import { onTasksUpdate, updateHabitCompletion } from '../lib/dataService';
import { Task } from '../lib/data';
import { ChevronLeft, Plus, Check, Circle, Flame, Target } from 'lucide-react-native';
import { useRouter, Stack } from 'expo-router';
import { useAuth } from '../context/auth-context';
import { format } from 'date-fns';

export default function HabitsScreen() {
  const [habits, setHabits] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const { user } = useAuth();
  
  const todayStr = format(new Date(), 'yyyy-MM-dd');

  useEffect(() => {
    let unsubscribe: any;
    if (user) {
      try {
        unsubscribe = onTasksUpdate((data: Task[]) => {
          const userHabits = data.filter(t => t.isRecurring && t.assigneeId === user.uid);
          setHabits(userHabits);
          setLoading(false);
        });
      } catch (e) {
        console.log('Error fetching habits:', e);
        setLoading(false);
      }
    }

    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, [user]);

  const toggleHabit = async (habit: Task, isCurrentlyCompleted: boolean) => {
    try {
      await updateHabitCompletion(habit.id, new Date(), !isCurrentlyCompleted);
    } catch (e) {
      console.error('Error toggling habit:', e);
    }
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 justify-center items-center bg-slate-50 dark:bg-slate-950">
        <ActivityIndicator size="large" color="#8b5cf6" />
      </SafeAreaView>
    );
  }

  const completedCount = habits.filter(h => h.completedDates?.includes(todayStr)).length;
  const progressPercent = habits.length > 0 ? Math.round((completedCount / habits.length) * 100) : 0;

  return (
    <SafeAreaView className="flex-1 bg-slate-50 dark:bg-slate-950">
      <Stack.Screen options={{ headerShown: false }} />
      <View className="p-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex-row justify-between items-center">
        <TouchableOpacity onPress={() => router.back()} className="w-10 h-10 items-center justify-center bg-slate-100 dark:bg-slate-800 rounded-full">
           <ChevronLeft size={24} color="#64748b" />
        </TouchableOpacity>
        <Text className="text-2xl font-bold text-slate-900 dark:text-white">Alışkanlıklar</Text>
        <TouchableOpacity onPress={() => router.push({ pathname: '/modal', params: { type: 'habit' } })} className="bg-violet-500 w-10 h-10 rounded-full items-center justify-center shadow-sm">
          <Plus size={24} color="white" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerClassName="p-4" showsVerticalScrollIndicator={false}>
         <View className="bg-violet-500 rounded-3xl p-6 mb-6 shadow-sm flex-row items-center justify-between">
            <View>
              <Text className="text-violet-100 font-medium mb-1">Bugünkü İlerleme</Text>
              <Text className="text-white text-3xl font-bold">{completedCount} / {habits.length}</Text>
            </View>
            <View className="w-16 h-16 bg-white/20 rounded-full items-center justify-center border-4 border-white/30">
               <Text className="text-white font-bold text-xl">{progressPercent}%</Text>
            </View>
         </View>

         <Text className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-4">Bugün</Text>

         {habits.length === 0 ? (
            <View className="items-center justify-center mt-10">
              <View className="w-20 h-20 bg-violet-50 dark:bg-violet-900/30 rounded-full items-center justify-center mb-4">
                 <Target size={40} color="#8b5cf6" />
              </View>
              <Text className="text-slate-500 text-lg font-medium text-center">Henüz bir alışkanlık oluşturmadınız.</Text>
            </View>
         ) : (
            habits.map(habit => {
              const isCompleted = habit.completedDates?.includes(todayStr) || false;
              const streak = habit.streak || 0;

              return (
                <TouchableOpacity 
                  key={habit.id}
                  onPress={() => toggleHabit(habit, isCompleted)}
                  className={`flex-row items-center p-4 mb-4 rounded-3xl border ${isCompleted ? 'bg-emerald-50 border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-800' : 'bg-white border-slate-100 dark:bg-slate-900 dark:border-slate-800'}`}
                >
                   <View className="w-12 h-12 rounded-xl items-center justify-center mr-4 bg-violet-50 dark:bg-violet-900/30">
                     {isCompleted ? <Check size={24} color="#10b981" /> : <Flame size={24} color="#8b5cf6" />}
                   </View>
                   <View className="flex-1">
                     <Text className={`font-bold text-lg ${isCompleted ? 'text-emerald-700 dark:text-emerald-400 line-through' : 'text-slate-800 dark:text-slate-100'}`}>{habit.title}</Text>
                     <Text className="text-slate-500 text-sm">
                       Seri: {streak} Gün • {habit.recurrenceType === 'daily' ? 'Günlük' : 'Haftalık'}
                     </Text>
                   </View>
                   <View className="ml-2">
                      {isCompleted ? (
                        <View className="w-6 h-6 rounded-full bg-emerald-500 items-center justify-center">
                           <Check size={14} color="white" />
                        </View>
                      ) : (
                        <Circle size={24} color="#cbd5e1" />
                      )}
                   </View>
                </TouchableOpacity>
              );
            })
         )}
         <View className="h-10"></View>
      </ScrollView>
    </SafeAreaView>
  );
}
