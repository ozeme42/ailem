import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useEffect, useState, useMemo } from 'react';
import { ChevronLeft, FileText, Search, GraduationCap, Trash2 } from 'lucide-react-native';
import { useRouter, Stack } from 'expo-router';
import { onTestsUpdate, safeParseDate, deleteTest, onStudyAssignmentsUpdate, deleteStudyAssignment } from '../lib/dataService';
import { Test, StudyAssignment } from '../lib/data';
import { format, parseISO } from 'date-fns';
import { tr } from 'date-fns/locale';

export type UnifiedTest = Test & {
  isStudyAssignment?: boolean;
  bookId?: string;
  testId?: string;
  originalAssignmentId?: string;
};

export default function AllTestsScreen() {
  const router = useRouter();
  const [tests, setTests] = useState<UnifiedTest[]>([]);
  const [assignments, setAssignments] = useState<StudyAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'completed'>('all');

  useEffect(() => {
    const unsubscribeTests = onTestsUpdate((data) => {
      setTests(data || []);
      setLoading(false);
    });
    const unsubscribeAssignments = onStudyAssignmentsUpdate((data) => {
      setAssignments(data || []);
    });
    return () => {
      unsubscribeTests();
      unsubscribeAssignments();
    };
  }, []);

  const unifiedTests = useMemo(() => {
    const mappedAssignments: UnifiedTest[] = assignments
      .filter(a => a.bookId && a.testId)
      .map(a => ({
      id: a.id,
      familyId: a.familyId,
      title: a.sources?.join(' - ') || a.topic || 'Kitap Görevi',
      subject: a.subject,
      studentId: a.studentId,
      questionCount: 0,
      assignedDate: a.startDate,
      dueDate: a.dueDate,
      status: a.status === 'completed' ? 'Sonuçlandı' : 'Atandı',
      isArchived: false,
      sourceType: 'trackedBook',
      isStudyAssignment: true,
      originalAssignmentId: a.id,
      bookId: a.bookId,
      testId: a.testId,
    } as UnifiedTest));

    return [...tests, ...mappedAssignments];
  }, [tests, assignments]);

  const handleDeleteTest = (id: string, isStudyAssignment?: boolean, fileUrl?: string) => {
    Alert.alert(
      "Sınavı Sil",
      "Bu sınavı ve içindeki sonuçları kalıcı olarak silmek istediğinize emin misiniz?",
      [
        { text: "İptal", style: "cancel" },
        { 
          text: "Sil", 
          style: "destructive",
          onPress: async () => {
            try {
              if (isStudyAssignment) {
                await deleteStudyAssignment(id);
              } else {
                await deleteTest(id, fileUrl);
              }
            } catch (error) {
              console.error("Test silinemedi:", error);
              Alert.alert("Hata", "Test silinirken bir hata oluştu.");
            }
          }
        }
      ]
    );
  };

  const getStrictTime = (dateStr: any) => {
    if (!dateStr) return 0;
    try {
      const parsedIso = parseISO(dateStr);
      if (!isNaN(parsedIso.getTime())) return parsedIso.getTime();
    } catch(e) {}
    try {
      const parsedDate = new Date(dateStr);
      if (!isNaN(parsedDate.getTime())) return parsedDate.getTime();
    } catch(e) {}
    return 0; // Fallback to epoch if invalid, pushing it to the bottom
  };

  const filteredTests = unifiedTests.filter(t => {
    const matchesSearch = t.title?.toLowerCase().includes(search.toLowerCase()) || 
                          t.subject?.toLowerCase().includes(search.toLowerCase());
    
    if (!matchesSearch) return false;

    if (activeTab === 'pending') {
      return t.status !== 'Sonuçlandı';
    } else if (activeTab === 'completed') {
      return t.status === 'Sonuçlandı';
    }
    return true; // 'all'
  }).sort((a, b) => getStrictTime(b.assignedDate || b.dueDate) - getStrictTime(a.assignedDate || a.dueDate));

  return (
    <SafeAreaView className="flex-1 bg-slate-50 dark:bg-slate-950">
      <Stack.Screen options={{ headerShown: false }} />
      <View className="p-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex-row justify-between items-center z-10 shadow-sm">
        <TouchableOpacity onPress={() => router.back()} className="w-10 h-10 items-center justify-center bg-slate-100 dark:bg-slate-800 rounded-full">
           <ChevronLeft size={24} color="#64748b" />
        </TouchableOpacity>
        <Text className="text-xl font-bold text-slate-900 dark:text-white">Tüm Sınavlar</Text>
        <TouchableOpacity className="w-10 h-10 items-center justify-center bg-blue-100 dark:bg-blue-900/50 rounded-full">
           <GraduationCap size={20} color="#3b82f6" />
        </TouchableOpacity>
      </View>

      <View className="bg-white dark:bg-slate-900 px-4 py-3 border-b border-slate-200 dark:border-slate-800">
         <View className="flex-row items-center bg-slate-100 dark:bg-slate-800 rounded-full px-4 py-2 mb-3">
            <Search size={20} color="#94a3b8" />
            <TextInput 
              placeholder="Sınav adı veya ders ara..."
              placeholderTextColor="#94a3b8"
              value={search}
              onChangeText={setSearch}
              className="flex-1 ml-2 text-slate-900 dark:text-white h-10"
            />
         </View>
         
         <View className="flex-row gap-2">
           <TouchableOpacity 
             onPress={() => setActiveTab('all')}
             className={`px-4 py-2 rounded-full ${activeTab === 'all' ? 'bg-slate-800 dark:bg-slate-200' : 'bg-slate-100 dark:bg-slate-800'}`}
           >
             <Text className={`font-bold text-sm ${activeTab === 'all' ? 'text-white dark:text-slate-900' : 'text-slate-600 dark:text-slate-400'}`}>Tümü</Text>
           </TouchableOpacity>
           <TouchableOpacity 
             onPress={() => setActiveTab('pending')}
             className={`px-4 py-2 rounded-full ${activeTab === 'pending' ? 'bg-amber-500' : 'bg-slate-100 dark:bg-slate-800'}`}
           >
             <Text className={`font-bold text-sm ${activeTab === 'pending' ? 'text-white' : 'text-slate-600 dark:text-slate-400'}`}>Bekleyenler</Text>
           </TouchableOpacity>
           <TouchableOpacity 
             onPress={() => setActiveTab('completed')}
             className={`px-4 py-2 rounded-full ${activeTab === 'completed' ? 'bg-emerald-500' : 'bg-slate-100 dark:bg-slate-800'}`}
           >
             <Text className={`font-bold text-sm ${activeTab === 'completed' ? 'text-white' : 'text-slate-600 dark:text-slate-400'}`}>Bitenler</Text>
           </TouchableOpacity>
         </View>
      </View>

      <ScrollView contentContainerClassName="p-4" showsVerticalScrollIndicator={false}>
         {loading ? (
           <ActivityIndicator size="large" color="#3b82f6" className="mt-10" />
         ) : filteredTests.length === 0 ? (
           <View className="items-center justify-center mt-10">
              <View className="w-20 h-20 bg-blue-50 dark:bg-blue-900/30 rounded-full items-center justify-center mb-4">
                 <FileText size={40} color="#3b82f6" />
              </View>
              <Text className="text-slate-500 font-medium">Test bulunamadı.</Text>
           </View>
         ) : (
           filteredTests.map(test => (
             <TouchableOpacity 
               key={test.id} 
               className="bg-white dark:bg-slate-900 rounded-2xl p-4 mb-3 shadow-sm border border-slate-100 dark:border-slate-800 flex-row items-center"
               onPress={() => {
                 if (test.isStudyAssignment && test.bookId && test.testId) {
                   router.push({ pathname: '/book-test-solver', params: { bookId: test.bookId, testId: test.testId, assignmentId: test.originalAssignmentId } });
                 } else {
                   router.push({ pathname: '/exam-detail', params: { id: test.id } });
                 }
               }}
             >
                <View className="w-12 h-16 bg-blue-50 dark:bg-blue-900/30 rounded-md items-center justify-center mr-4">
                   <FileText size={24} color="#3b82f6" />
                </View>
                <View className="flex-1">
                   <Text className="text-slate-800 dark:text-slate-100 font-bold text-lg" numberOfLines={1}>{test.title}</Text>
                   <Text className="text-slate-500 text-sm font-medium">{test.subject || 'Genel'}</Text>
                </View>
                <View className="items-end justify-center mr-3">
                   <Text className="text-xs text-slate-400 font-medium mb-1">
                     {test.assignedDate ? format(safeParseDate(test.assignedDate), 'd MMM', { locale: tr }) : '-'}
                   </Text>
                   <View className={`px-2 py-1 rounded-full ${test.status === 'Sonuçlandı' ? 'bg-emerald-100 dark:bg-emerald-900/30' : 'bg-amber-100 dark:bg-amber-900/30'}`}>
                      <Text className={`text-[10px] font-bold ${test.status === 'Sonuçlandı' ? 'text-emerald-600' : 'text-amber-600'}`}>
                         {test.status === 'Sonuçlandı' ? 'Çözüldü' : 'Bekliyor'}
                      </Text>
                   </View>
                </View>
                <TouchableOpacity
                  onPress={() => handleDeleteTest(test.id, test.isStudyAssignment, test.fileUrl)}
                  className="w-10 h-10 items-center justify-center bg-red-50 dark:bg-red-900/20 rounded-full"
                >
                  <Trash2 size={18} color="#ef4444" />
                </TouchableOpacity>
             </TouchableOpacity>
           ))
         )}
         <View className="h-10"></View>
      </ScrollView>
    </SafeAreaView>
  );
}
