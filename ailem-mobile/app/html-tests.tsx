import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useEffect, useState } from 'react';
import { Code, ChevronLeft, Search, CheckCircle, Plus, PenTool, Copy } from 'lucide-react-native';
import { useRouter, Stack } from 'expo-router';
import { onTestsUpdate } from '../lib/dataService';
import { Test } from '../lib/data';

export default function HtmlTestsScreen() {
  const router = useRouter();
  const [tests, setTests] = useState<Test[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onTestsUpdate((data) => {
      const htmlTests = data?.filter(t => t.sourceType === 'html') || [];
      setTests(htmlTests);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  return (
    <SafeAreaView className="flex-1 bg-slate-50 dark:bg-slate-950">
      <Stack.Screen options={{ headerShown: false }} />
      <View className="p-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex-row justify-between items-center shadow-sm z-10">
        <TouchableOpacity onPress={() => router.back()} className="w-10 h-10 items-center justify-center bg-slate-100 dark:bg-slate-800 rounded-full">
           <ChevronLeft size={24} color="#64748b" />
        </TouchableOpacity>
        <Text className="text-xl font-bold text-slate-900 dark:text-white">HTML Testler</Text>
        <TouchableOpacity 
           onPress={() => router.push('/new-html-test')}
           className="w-10 h-10 items-center justify-center bg-blue-500 rounded-full shadow-sm">
           <Plus size={20} color="white" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerClassName="p-4" showsVerticalScrollIndicator={false}>
         {loading ? (
           <ActivityIndicator size="large" color="#3b82f6" className="mt-10" />
         ) : tests.length === 0 ? (
           <View className="items-center justify-center mt-20">
              <View className="w-24 h-24 bg-blue-50 dark:bg-blue-900/30 rounded-full items-center justify-center mb-6 border-4 border-white dark:border-slate-800 shadow-sm">
                 <Code size={48} color="#3b82f6" />
              </View>
              <Text className="text-slate-800 dark:text-slate-100 text-xl font-bold mb-2">HTML Test Bulunamadı</Text>
              <Text className="text-slate-500 font-medium text-center px-4">Veritabanında henüz HTML formatında eklenmiş bir test yok.</Text>
           </View>
         ) : (
           tests.map(test => (
             <TouchableOpacity 
               key={test.id} 
               className="bg-white dark:bg-slate-900 rounded-2xl p-4 mb-3 shadow-sm border border-slate-100 dark:border-slate-800 flex-row items-center"
               onPress={() => router.push({ pathname: '/exam-detail', params: { id: test.id } })}
             >
                <View className="w-12 h-16 bg-blue-50 dark:bg-blue-900/30 rounded-md items-center justify-center mr-4">
                   <Code size={24} color="#3b82f6" />
                </View>
                <View className="flex-1">
                   <Text className="text-slate-800 dark:text-slate-100 font-bold text-lg" numberOfLines={1}>{test.title}</Text>
                   <Text className="text-slate-500 text-sm font-medium">{test.subject || 'Genel Ders'}</Text>
                </View>
                <View className="flex-row items-center gap-2">
                  <TouchableOpacity 
                    onPress={() => router.push({ pathname: '/new-html-test', params: { id: test.id, reassign: 'true' } })}
                    className="w-8 h-8 rounded-full bg-blue-50 dark:bg-blue-900/30 items-center justify-center"
                  >
                    <Copy size={14} color="#3b82f6" />
                  </TouchableOpacity>
                  {test.status !== 'Sonuçlandı' ? (
                    <TouchableOpacity 
                      onPress={() => router.push({ pathname: '/new-html-test', params: { id: test.id } })}
                      className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 items-center justify-center"
                    >
                      <PenTool size={14} color="#64748b" />
                    </TouchableOpacity>
                  ) : (
                    <View className="w-8 h-8 rounded-full bg-emerald-50 dark:bg-emerald-900/30 items-center justify-center">
                       <CheckCircle size={16} color="#10b981" />
                    </View>
                  )}
                </View>
             </TouchableOpacity>
           ))
         )}
         <View className="h-10"></View>
      </ScrollView>
    </SafeAreaView>
  );
}
