import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useEffect, useState } from 'react';
import { onPerformanceGoalsUpdate } from '../lib/dataService';
import { PerformanceGoal } from '../lib/data';
import { Trophy, ChevronLeft, Plus } from 'lucide-react-native';
import { useRouter, Stack } from 'expo-router';
import { useAuth } from '../context/auth-context';

export default function PerformanceGoalsScreen() {
  const [goals, setGoals] = useState<PerformanceGoal[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const { user } = useAuth();

  useEffect(() => {
    let unsubscribe: any;
    if (user) {
      try {
        unsubscribe = onPerformanceGoalsUpdate(user.uid, (data) => {
          setGoals(data);
          setLoading(false);
        });
      } catch (e) {
        console.log('Error fetching performance goals:', e);
        setLoading(false);
      }
    }

    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, [user]);

  if (loading) {
    return (
      <SafeAreaView className="flex-1 justify-center items-center bg-slate-50 dark:bg-slate-950">
        <ActivityIndicator size="large" color="#f59e0b" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-slate-50 dark:bg-slate-950">
      <Stack.Screen options={{ headerShown: false }} />
      <View className="p-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex-row justify-between items-center">
        <TouchableOpacity onPress={() => router.back()} className="w-10 h-10 items-center justify-center bg-slate-100 dark:bg-slate-800 rounded-full">
           <ChevronLeft size={24} color="#64748b" />
        </TouchableOpacity>
        <Text className="text-2xl font-bold text-slate-900 dark:text-white">Performans</Text>
        <TouchableOpacity className="bg-amber-500 w-10 h-10 rounded-full items-center justify-center shadow-sm">
          <Plus size={24} color="white" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerClassName="p-4" showsVerticalScrollIndicator={false}>
         {goals.length === 0 ? (
           <View className="items-center justify-center mt-10">
             <View className="w-20 h-20 bg-amber-50 dark:bg-amber-900/30 rounded-full items-center justify-center mb-4">
                <Trophy size={40} color="#f59e0b" />
             </View>
             <Text className="text-slate-500 text-lg font-medium text-center">Performans hedefi bulunmuyor.</Text>
           </View>
         ) : (
           goals.map(g => (
             <View key={g.id} className="bg-white dark:bg-slate-900 rounded-3xl p-5 mb-4 shadow-sm border border-slate-100 dark:border-slate-800 flex-row items-center">
                <View className="w-12 h-12 bg-amber-50 dark:bg-amber-900/30 rounded-xl items-center justify-center mr-4">
                   <Trophy size={24} color="#f59e0b" />
                </View>
                <View className="flex-1">
                   <Text className="font-bold text-slate-800 dark:text-slate-100 text-lg">{g.label}</Text>
                   <Text className="text-slate-500 text-sm">Hedef: {g.target}</Text>
                </View>
             </View>
           ))
         )}
         <View className="h-10"></View>
      </ScrollView>
    </SafeAreaView>
  );
}
