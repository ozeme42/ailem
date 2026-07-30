import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useEffect, useState } from 'react';
import { onPracticeExamsUpdate } from '../lib/dataService';
import { PracticeExam } from '../lib/data';
import { FileBadge, ChevronLeft, Plus, ChevronRight } from 'lucide-react-native';
import { useRouter, Stack } from 'expo-router';

export default function PracticeExamsScreen() {
  const [exams, setExams] = useState<PracticeExam[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    let unsubscribe: any;
    try {
      unsubscribe = onPracticeExamsUpdate((data: PracticeExam[]) => {
        setExams(data);
        setLoading(false);
      });
    } catch (e) {
      console.log('Error fetching exams:', e);
      setLoading(false);
    }

    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, []);

  if (loading) {
    return (
      <SafeAreaView className="flex-1 justify-center items-center bg-slate-50 dark:bg-slate-950">
        <ActivityIndicator size="large" color="#3b82f6" />
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
        <Text className="text-2xl font-bold text-slate-900 dark:text-white">Deneme Arşivi</Text>
        <TouchableOpacity onPress={() => router.push('/new-practice-exam')} className="bg-blue-500 w-10 h-10 rounded-full items-center justify-center shadow-sm">
          <Plus size={24} color="white" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerClassName="p-4" showsVerticalScrollIndicator={false}>
         {exams.length === 0 ? (
           <View className="items-center justify-center mt-10">
             <View className="w-20 h-20 bg-blue-50 dark:bg-blue-900/30 rounded-full items-center justify-center mb-4">
                <FileBadge size={40} color="#3b82f6" />
             </View>
             <Text className="text-slate-500 text-lg font-medium text-center">Kayıtlı deneme sınavı bulunamadı.</Text>
           </View>
         ) : (
           exams.map(exam => (
             <TouchableOpacity 
                key={exam.id} 
                onPress={() => router.push({ pathname: '/practice-exam-detail', params: { id: exam.id } })}
                className="bg-white dark:bg-slate-900 rounded-3xl p-5 mb-4 shadow-sm border border-slate-100 dark:border-slate-800 flex-row items-center justify-between"
             >
                <View className="flex-row items-center">
                   <View className="w-12 h-12 bg-blue-50 dark:bg-blue-900/30 rounded-xl items-center justify-center mr-4">
                      <FileBadge size={24} color="#3b82f6" />
                   </View>
                   <View>
                      <Text className="font-bold text-slate-800 dark:text-slate-100 text-lg">{exam.name}</Text>
                      <Text className="text-slate-500 text-sm">
                        Toplam: {exam.subjects?.reduce((acc, s) => acc + (s.questionCount || 0), 0) || 0} Soru ({exam.subjects?.length || 0} Ders)
                      </Text>
                   </View>
                </View>
                <ChevronRight size={20} color="#94a3b8" />
             </TouchableOpacity>
           ))
         )}
         <View className="h-10"></View>
      </ScrollView>
    </SafeAreaView>
  );
}
