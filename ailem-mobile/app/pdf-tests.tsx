import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useEffect, useState } from 'react';
import { FileText, ChevronLeft, CheckCircle, Plus, PenTool, Copy } from 'lucide-react-native';
import { useRouter, Stack } from 'expo-router';
import { onTestsUpdate } from '../lib/dataService';
import { Test } from '../lib/data';

export default function PdfTestsScreen() {
  const router = useRouter();
  const [tests, setTests] = useState<Test[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onTestsUpdate((data) => {
      const pdfTests = data?.filter(t => t.sourceType === 'pdf') || [];
      setTests(pdfTests);
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
        <Text className="text-xl font-bold text-slate-900 dark:text-white">PDF Testler</Text>
        <TouchableOpacity 
           onPress={() => router.push('/new-pdf-test')} 
           className="w-10 h-10 items-center justify-center bg-rose-600 dark:bg-rose-500 rounded-full shadow-md active:scale-95"
        >
           <Plus size={20} color="#ffffff" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerClassName="p-4" showsVerticalScrollIndicator={false}>
         {loading ? (
           <ActivityIndicator size="large" color="#f43f5e" className="mt-10" />
         ) : tests.length === 0 ? (
           <View className="items-center justify-center mt-20">
              <View className="w-24 h-24 bg-rose-50 dark:bg-rose-900/30 rounded-full items-center justify-center mb-6 border-4 border-white dark:border-slate-800 shadow-sm">
                 <FileText size={48} color="#f43f5e" />
              </View>
              <Text className="text-slate-800 dark:text-slate-100 text-xl font-bold mb-2">PDF Test Bulunamadı</Text>
              <Text className="text-slate-500 font-medium text-center px-4">Veritabanında henüz PDF formatında eklenmiş bir test yok.</Text>
           </View>
         ) : (
           tests.map(test => (
             <TouchableOpacity 
               key={test.id} 
               className="bg-white dark:bg-slate-900 rounded-2xl p-4 mb-3 shadow-sm border border-slate-100 dark:border-slate-800 flex-row items-center relative overflow-hidden"
               onPress={() => router.push({ pathname: '/exam-detail', params: { id: test.id } })}
               activeOpacity={0.7}
             >
                <View className="w-12 h-16 bg-rose-50 dark:bg-rose-900/30 rounded-md items-center justify-center mr-4 shadow-sm border border-rose-100 dark:border-rose-900/30">
                   <FileText size={24} color="#f43f5e" />
                </View>
                <View className="flex-1">
                   <Text className="text-slate-800 dark:text-slate-100 font-bold text-lg mb-1" numberOfLines={1}>{test.title}</Text>
                   <Text className="text-slate-500 dark:text-slate-400 text-xs font-medium bg-slate-100 dark:bg-slate-800 self-start px-2 py-0.5 rounded-md">{test.subject || 'Genel Ders'}</Text>
                </View>

                {/* Edit & Clone Actions */}
                <View className="flex-row items-center gap-2 ml-2">
                  <TouchableOpacity
                    onPress={(e) => {
                      e.stopPropagation();
                      router.push({ pathname: '/new-pdf-test', params: { id: test.id, reassign: 'false' } });
                    }}
                    className="w-9 h-9 items-center justify-center bg-slate-100 dark:bg-slate-800 rounded-xl"
                  >
                    <PenTool size={16} color="#64748b" />
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    onPress={(e) => {
                      e.stopPropagation();
                      router.push({ pathname: '/new-pdf-test', params: { id: test.id, reassign: 'true' } });
                    }}
                    className="w-9 h-9 items-center justify-center bg-indigo-50 dark:bg-indigo-900/30 rounded-xl"
                  >
                    <Copy size={16} color="#6366f1" />
                  </TouchableOpacity>

                  {test.status === 'Sonuçlandı' && (
                    <View className="w-8 h-8 rounded-full bg-emerald-50 dark:bg-emerald-900/30 items-center justify-center ml-1 border border-emerald-100 dark:border-emerald-800">
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
