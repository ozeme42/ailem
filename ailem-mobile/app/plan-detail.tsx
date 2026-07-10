import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useEffect, useState } from 'react';
import { ChevronLeft, Notebook, Calendar, Clock, CheckSquare } from 'lucide-react-native';
import { useRouter, Stack, useLocalSearchParams } from 'expo-router';
import { onStudyPlanUpdate } from '../lib/dataService';
import { StudyPlan } from '../lib/data';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';

export default function PlanDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const [plan, setPlan] = useState<StudyPlan | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    
    let unsubscribe: any;
    try {
      unsubscribe = onStudyPlanUpdate(id as string, (data) => {
        setPlan(data);
        setLoading(false);
      });
    } catch (e) {
      console.log('Error fetching study plan details:', e);
      setLoading(false);
    }

    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, [id]);

  if (loading) {
    return (
      <SafeAreaView className="flex-1 justify-center items-center bg-slate-50 dark:bg-slate-950">
        <ActivityIndicator size="large" color="#2563eb" />
      </SafeAreaView>
    );
  }

  if (!plan) {
    return (
      <SafeAreaView className="flex-1 bg-slate-50 dark:bg-slate-950">
        <Stack.Screen options={{ headerShown: false }} />
        <View className="p-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex-row items-center">
          <TouchableOpacity onPress={() => router.back()} className="w-10 h-10 items-center justify-center bg-slate-100 dark:bg-slate-800 rounded-full mr-4">
             <ChevronLeft size={24} color="#64748b" />
          </TouchableOpacity>
          <Text className="text-xl font-bold text-slate-900 dark:text-white">Program Bulunamadı</Text>
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
        <Text className="text-xl font-bold text-slate-900 dark:text-white" numberOfLines={1}>{plan.title}</Text>
        <View className="w-10 h-10" />
      </View>

      <ScrollView contentContainerClassName="p-4" showsVerticalScrollIndicator={false}>
         
         <View className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-sm border border-slate-100 dark:border-slate-800 items-center mb-6 mt-4">
            <View className="w-20 h-20 bg-blue-50 dark:bg-blue-900/30 rounded-full items-center justify-center mb-4 border-4 border-white dark:border-slate-800 shadow-sm">
               <Notebook size={40} color="#2563eb" />
            </View>
            <Text className="text-2xl font-bold text-slate-900 dark:text-white text-center mb-2">{plan.title}</Text>
            {plan.description && <Text className="text-slate-500 text-center mb-4">{plan.description}</Text>}
            
            <View className="flex-row bg-slate-50 dark:bg-slate-800 rounded-xl p-3 w-full justify-around">
               <View className="items-center w-full">
                  <Text className="text-slate-500 font-bold text-xs">Müfredat Planı</Text>
               </View>
            </View>
         </View>

         <Text className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-4 px-2">Program İçeriği</Text>

         {plan.subjects && plan.subjects.length > 0 ? (
            plan.subjects.map((subject, index) => (
              <View key={subject.id || String(index)} className="mb-6">
                 <Text className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-3 px-2">{subject.name}</Text>
                 {subject.topics && subject.topics.map((topic, tIdx) => (
                   <View key={topic.id || String(tIdx)} className="bg-white dark:bg-slate-900 rounded-2xl p-4 mb-2 shadow-sm border border-slate-100 dark:border-slate-800 flex-row items-center">
                      <View className="bg-blue-100 dark:bg-blue-900/30 w-10 h-10 rounded-xl items-center justify-center mr-4">
                         <CheckSquare size={20} color="#2563eb" />
                      </View>
                      <View className="flex-1">
                         <Text className="font-bold text-slate-800 dark:text-slate-100 text-base">{topic.name}</Text>
                         {topic.sources && topic.sources.length > 0 && (
                            <Text className="text-slate-500 text-xs mt-1">Kaynaklar: {topic.sources.join(', ')}</Text>
                         )}
                      </View>
                   </View>
                 ))}
              </View>
            ))
         ) : (
            <View className="bg-slate-100 dark:bg-slate-800/50 p-6 rounded-3xl items-center justify-center border border-slate-200 dark:border-slate-700">
               <Text className="text-slate-500 font-medium text-center">Bu programın henüz bir detayı yok.</Text>
            </View>
         )}

         <View className="h-10"></View>
      </ScrollView>
    </SafeAreaView>
  );
}
