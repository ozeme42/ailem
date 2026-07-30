import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Modal, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useEffect, useMemo } from 'react';
import { useRouter, Stack, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Plus, Send, PenTool, Trash2, CheckSquare, Settings, Users, Calendar as CalendarIcon, FileBadge } from 'lucide-react-native';
import { onSinglePracticeExamUpdate, updatePracticeExam, addTest, onCurriculumMapUpdate } from '../lib/dataService';
import { PracticeExam, PracticeExamSubject } from '../lib/data';
import { useAuth } from '../context/auth-context';

export default function PracticeExamDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { familyMembers } = useAuth();
  
  const [exam, setExam] = useState<PracticeExam | null>(null);
  const [loading, setLoading] = useState(true);

  // Modals
  const [subjectModalOpen, setSubjectModalOpen] = useState(false);
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [answerKeyModalOpen, setAnswerKeyModalOpen] = useState(false);

  // States for Subject Modal
  const [subjName, setSubjName] = useState('');
  const [subjCount, setSubjCount] = useState('');

  // States for Answer Key Modal
  const [currentSubject, setCurrentSubject] = useState<PracticeExamSubject | null>(null);
  const [tempAnswerKey, setTempAnswerKey] = useState<{ [key: string]: string }>({});
  const [bulkText, setBulkText] = useState('');

  // States for Assign Modal
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [dueDate, setDueDate] = useState(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
  const [isAssigning, setIsAssigning] = useState(false);

  const students = useMemo(() => familyMembers.filter(m => m.role.includes('Çocuk')), [familyMembers]);
  const [curriculumMap, setCurriculumMap] = useState<Record<string, string[]>>({});

  useEffect(() => {
    if (!id) return;
    const unsubExam = onSinglePracticeExamUpdate(id as string, (data) => {
      setExam(data);
      setLoading(false);
    });
    
    const unsubCurriculum = onCurriculumMapUpdate((data) => {
      setCurriculumMap(data || {});
    });
    
    return () => {
      unsubExam();
      unsubCurriculum();
    };
  }, [id]);

  const totalQuestions = (exam?.subjects || []).reduce((acc, s) => acc + (s.questionCount || 0), 0);

  const handleAddSubject = async () => {
    if (!subjName.trim() || !subjCount.trim()) {
      Alert.alert("Hata", "Lütfen ders adını ve soru sayısını girin.");
      return;
    }
    const count = parseInt(subjCount);
    if (isNaN(count) || count <= 0) {
      Alert.alert("Hata", "Geçerli bir soru sayısı girin.");
      return;
    }
    if (!exam) return;

    const newSubject: PracticeExamSubject = {
      id: Date.now().toString(),
      name: subjName.trim(),
      questionCount: count,
      answerKey: {},
    };

    const newSubjects = [...(exam.subjects || []), newSubject];
    await updatePracticeExam(exam.id, { subjects: newSubjects });
    setSubjectModalOpen(false);
    setSubjName('');
    setSubjCount('');
  };

  const handleDeleteSubject = (subjectId: string) => {
    Alert.alert("Silme Onayı", "Bu dersi silmek istediğinize emin misiniz?", [
      { text: "İptal", style: "cancel" },
      { text: "Sil", style: "destructive", onPress: async () => {
        if (!exam) return;
        const newSubjects = (exam.subjects || []).filter(s => s.id !== subjectId);
        await updatePracticeExam(exam.id, { subjects: newSubjects });
      }}
    ]);
  };

  const openAnswerKeyModal = (subject: PracticeExamSubject) => {
    setCurrentSubject(subject);
    setTempAnswerKey(subject.answerKey || {});
    setBulkText('');
    setAnswerKeyModalOpen(true);
  };

  const saveAnswerKey = async () => {
    if (!exam || !currentSubject) return;
    const newSubjects = (exam.subjects || []).map(s => 
      s.id === currentSubject.id ? { ...s, answerKey: tempAnswerKey } : s
    );
    await updatePracticeExam(exam.id, { subjects: newSubjects });
    setAnswerKeyModalOpen(false);
  };

  const setAnswer = (qNum: number, letter: string) => {
    setTempAnswerKey(prev => ({
      ...prev,
      [qNum.toString()]: prev[qNum.toString()] === letter ? '' : letter
    }));
  };

  const handleBulkEntry = (text: string) => {
    setBulkText(text);
    if (!currentSubject) return;
    const cleanText = text.toUpperCase().replace(/[^A-E]/g, '');
    let newAnswers = { ...tempAnswerKey };
    for (let i = 0; i < cleanText.length && i < currentSubject.questionCount; i++) {
      newAnswers[(i + 1).toString()] = cleanText[i];
    }
    setTempAnswerKey(newAnswers);
  };

  const toggleStudent = (sId: string) => {
    setSelectedStudentIds(prev => 
      prev.includes(sId) ? prev.filter(id => id !== sId) : [...prev, sId]
    );
  };

  const handleAssign = async () => {
    if (selectedStudentIds.length === 0) {
      Alert.alert("Hata", "Lütfen en az bir öğrenci seçin.");
      return;
    }
    if (!exam) return;

    setIsAssigning(true);

    let combinedAnswerKey: { [key: string]: string } = {};
    let questionOffset = 0;
    (exam.subjects || []).forEach(subject => {
        Object.entries(subject.answerKey || {}).forEach(([qNum, answer]) => {
            const newQNum = parseInt(qNum) + questionOffset;
            combinedAnswerKey[newQNum.toString()] = answer;
        });
        questionOffset += subject.questionCount;
    });

    try {
        for (const studentId of selectedStudentIds) {
            await addTest({
                title: exam.name,
                subject: 'Genel Deneme Sınavları',
                studentId: studentId,
                questionCount: totalQuestions,
                assignedDate: new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' }),
                dueDate: new Date(dueDate).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' }),
                sourceType: 'exam',
                sourceId: exam.id,
                gradingType: 'auto',
                answerKey: combinedAnswerKey,
                status: 'Atandı',
                correctAnswers: 0,
                incorrectAnswers: 0,
                emptyAnswers: 0,
                score: 0,
                isArchived: false
            });
        }
        Alert.alert("Başarılı", `Sınav ${selectedStudentIds.length} öğrenciye atandı.`, [
          { text: "Tamam", onPress: () => {
            setAssignModalOpen(false);
            setSelectedStudentIds([]);
          }}
        ]);
    } catch (e) {
        Alert.alert("Hata", "Atama sırasında bir hata oluştu.");
    } finally {
        setIsAssigning(false);
    }
  };

  if (loading || !exam) {
    return (
      <SafeAreaView className="flex-1 bg-slate-50 dark:bg-slate-950 justify-center items-center">
        <ActivityIndicator size="large" color="#6366f1" />
      </SafeAreaView>
    );
  }

  const options = ['A', 'B', 'C', 'D', 'E'];

  return (
    <SafeAreaView className="flex-1 bg-slate-50 dark:bg-slate-950">
      <Stack.Screen options={{ headerShown: false }} />

      {/* HEADER */}
      <View className="p-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex-row justify-between items-center z-10 shadow-sm">
        <View className="flex-row items-center gap-3">
          <TouchableOpacity onPress={() => router.back()} className="w-10 h-10 items-center justify-center bg-slate-100 dark:bg-slate-800 rounded-full">
            <ArrowLeft size={20} color="#64748b" />
          </TouchableOpacity>
          <View>
            <Text className="text-lg font-extrabold text-slate-900 dark:text-white leading-none truncate max-w-[200px]" numberOfLines={1}>
              {exam.name}
            </Text>
            <Text className="text-[9px] font-black text-slate-450 dark:text-slate-400 uppercase tracking-widest mt-1">Deneme Detayı</Text>
          </View>
        </View>

        <TouchableOpacity onPress={() => router.push({ pathname: '/new-practice-exam', params: { id: exam.id } })} className="w-10 h-10 items-center justify-center bg-slate-100 dark:bg-slate-800 rounded-full">
          <PenTool size={18} color="#64748b" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
        
        {/* STATS CARD */}
        <View className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm mb-6 flex-row items-center justify-between">
          <View>
            <Text className="text-sm font-extrabold text-slate-900 dark:text-white">Deneme Özeti</Text>
            <Text className="text-xs font-medium text-slate-500 mt-1">Toplam soru ve ders dağılımı</Text>
          </View>
          <View className="flex-row gap-6">
            <View className="items-center">
              <Text className="text-2xl font-black text-blue-500">{(exam.subjects || []).length}</Text>
              <Text className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Ders</Text>
            </View>
            <View className="items-center">
              <Text className="text-2xl font-black text-emerald-500">{totalQuestions}</Text>
              <Text className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Soru</Text>
            </View>
          </View>
        </View>

        {/* ACTION BUTTONS */}
        <View className="flex-row gap-3 mb-6">
          <TouchableOpacity 
            onPress={() => setSubjectModalOpen(true)}
            className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl flex-row items-center justify-center shadow-sm"
          >
            <Plus size={18} color="#6366f1" className="mr-2" />
            <Text className="font-bold text-slate-700 dark:text-slate-200">Ders Ekle</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            onPress={() => setAssignModalOpen(true)}
            disabled={totalQuestions === 0}
            className={`flex-1 p-4 rounded-2xl flex-row items-center justify-center shadow-sm ${
              totalQuestions === 0 ? 'bg-slate-200 dark:bg-slate-800' : 'bg-indigo-600'
            }`}
          >
            <Send size={18} color={totalQuestions === 0 ? "#94a3b8" : "white"} className="mr-2" />
            <Text className={`font-bold ${totalQuestions === 0 ? 'text-slate-400' : 'text-white'}`}>Ödevi Ata</Text>
          </TouchableOpacity>
        </View>

        {/* SUBJECTS LIST */}
        <Text className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 px-2">Sınav İçeriği</Text>
        
        {(exam.subjects || []).length === 0 ? (
          <View className="items-center justify-center py-10">
            <FileBadge size={40} color="#cbd5e1" className="mb-4" />
            <Text className="text-slate-500 font-medium">Bu denemeye henüz ders eklenmemiş.</Text>
          </View>
        ) : (
          (exam.subjects || []).map((subject, idx) => (
            <View key={subject.id || idx.toString()} className="bg-white dark:bg-slate-900 rounded-3xl p-5 mb-4 shadow-sm border border-slate-200 dark:border-slate-800">
              <View className="flex-row items-center justify-between mb-4">
                <View>
                  <Text className="text-lg font-bold text-slate-800 dark:text-slate-100">{subject.name}</Text>
                  <Text className="text-xs font-semibold text-slate-500 mt-1">{subject.questionCount} Soru</Text>
                </View>
                <TouchableOpacity onPress={() => handleDeleteSubject(subject.id)} className="w-8 h-8 rounded-full bg-rose-50 dark:bg-rose-900/30 items-center justify-center">
                  <Trash2 size={16} color="#ef4444" />
                </TouchableOpacity>
              </View>

              <TouchableOpacity 
                onPress={() => openAnswerKeyModal(subject)}
                className="bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 p-3 rounded-xl flex-row items-center justify-center"
              >
                <CheckSquare size={16} color="#10b981" className="mr-2" />
                <Text className="text-sm font-bold text-slate-700 dark:text-slate-300">Cevap Anahtarını Düzenle</Text>
              </TouchableOpacity>
              
              {/* Preview answers */}
              {subject.answerKey && Object.keys(subject.answerKey).length > 0 && (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mt-4 flex-row gap-2">
                  {Array.from({length: Math.min(10, subject.questionCount)}).map((_, i) => {
                    const ans = subject.answerKey?.[(i+1).toString()];
                    return ans ? (
                      <View key={i} className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-100 dark:border-emerald-800 items-center justify-center">
                        <Text className="text-[9px] text-emerald-600 dark:text-emerald-400 font-black absolute top-0.5">{i+1}</Text>
                        <Text className="text-sm font-black text-emerald-600 dark:text-emerald-400 mt-2">{ans}</Text>
                      </View>
                    ) : null;
                  })}
                  {Object.keys(subject.answerKey).length > 10 && (
                    <View className="w-8 h-8 rounded-lg items-center justify-center">
                      <Text className="text-[10px] font-bold text-slate-400">...</Text>
                    </View>
                  )}
                </ScrollView>
              )}
            </View>
          ))
        )}
      </ScrollView>

      {/* Add Subject Modal */}
      <Modal visible={subjectModalOpen} transparent animationType="fade" onRequestClose={() => setSubjectModalOpen(false)}>
        <View className="flex-1 bg-black/60 justify-center items-center p-4">
          <View className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800">
            <Text className="text-lg font-bold text-slate-900 dark:text-white mb-2">Yeni Ders Ekle</Text>
            <Text className="text-xs text-slate-500 mb-6">Deneme sınavına yeni bir ders alanı ve soru sayısı ekleyin.</Text>
            
            <View className="space-y-4">
              <View>
                <Text className="text-[10px] font-bold text-slate-450 dark:text-slate-400 uppercase tracking-wider mb-2">Ders Adı</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                  {Object.keys(curriculumMap).length > 0 ? Object.keys(curriculumMap).map((subj) => {
                    const active = subjName === subj;
                    return (
                      <TouchableOpacity
                        key={subj}
                        onPress={() => setSubjName(subj)}
                        className={`px-4 py-2.5 rounded-xl border ${active ? 'bg-indigo-650 border-indigo-650' : 'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800'}`}
                        style={{ borderRadius: 14 }}
                      >
                        <Text className={`text-xs font-bold ${active ? 'text-white' : 'text-slate-600 dark:text-slate-400'}`}>{subj}</Text>
                      </TouchableOpacity>
                    );
                  }) : (
                    <Text className="text-slate-500 text-xs italic">Müfredat yükleniyor...</Text>
                  )}
                </ScrollView>
              </View>
              <View>
                <Text className="text-[10px] font-bold text-slate-450 dark:text-slate-400 uppercase tracking-wider mb-2">Soru Sayısı</Text>
                <TextInput
                  placeholder="Örn: 20"
                  placeholderTextColor="#94a3b8"
                  value={subjCount}
                  onChangeText={setSubjCount}
                  keyboardType="numeric"
                  className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3 text-slate-800 dark:text-white font-semibold text-sm"
                />
              </View>
            </View>

            <View className="flex-row gap-3 mt-8">
              <TouchableOpacity onPress={() => setSubjectModalOpen(false)} className="flex-1 py-3 rounded-xl items-center bg-slate-100 dark:bg-slate-800">
                <Text className="font-bold text-slate-600 dark:text-slate-300">İptal</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleAddSubject} className="flex-1 py-3 rounded-xl items-center bg-indigo-600">
                <Text className="font-bold text-white">Ekle</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Answer Key Modal */}
      <Modal visible={answerKeyModalOpen} transparent animationType="slide" onRequestClose={() => setAnswerKeyModalOpen(false)}>
        <View className="flex-1 bg-black/60 pt-20">
          <View className="flex-1 bg-white dark:bg-slate-900 rounded-t-3xl shadow-2xl border-t border-slate-200 dark:border-slate-800 overflow-hidden">
            <View className="p-4 border-b border-slate-200 dark:border-slate-800 flex-row justify-between items-center bg-slate-50 dark:bg-slate-950">
              <View>
                <Text className="text-lg font-bold text-slate-900 dark:text-white">{currentSubject?.name}</Text>
                <Text className="text-xs text-slate-500">Cevap Anahtarı ({currentSubject?.questionCount} Soru)</Text>
              </View>
              <TouchableOpacity onPress={saveAnswerKey} className="bg-indigo-600 px-4 py-2 rounded-xl">
                <Text className="font-bold text-white text-xs">Kaydet</Text>
              </TouchableOpacity>
            </View>
            
            <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 60 }} showsVerticalScrollIndicator={false}>
              {/* Bulk Entry */}
              <View className="mb-6 bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
                <Text className="text-xs font-bold text-slate-500 mb-2">Hızlı Toplu Giriş (Yapıştır)</Text>
                <TextInput
                  placeholder="Örn: ABADCBE..."
                  placeholderTextColor="#94a3b8"
                  value={bulkText}
                  onChangeText={handleBulkEntry}
                  autoCapitalize="characters"
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-slate-800 dark:text-white font-semibold text-sm tracking-widest"
                />
              </View>

              <View className="flex-row flex-wrap justify-between gap-y-4">
                {Array.from({length: currentSubject?.questionCount || 0}).map((_, idx) => {
                  const qNum = idx + 1;
                  const selectedOpt = tempAnswerKey[qNum.toString()];
                  return (
                    <View key={qNum} className="w-[48%] bg-slate-50 dark:bg-slate-950 rounded-2xl p-3 border border-slate-200 dark:border-slate-800">
                      <Text className="text-xs font-bold text-slate-500 mb-2">{qNum}. Soru</Text>
                      <View className="flex-row justify-between">
                        {options.map(opt => {
                          const isActive = selectedOpt === opt;
                          return (
                            <TouchableOpacity 
                              key={opt}
                              onPress={() => setAnswer(qNum, opt)}
                              className={`w-6 h-6 rounded-full items-center justify-center ${
                                isActive ? 'bg-indigo-600' : 'bg-slate-200 dark:bg-slate-800'
                              }`}
                            >
                              <Text className={`text-[10px] font-bold ${isActive ? 'text-white' : 'text-slate-600 dark:text-slate-400'}`}>{opt}</Text>
                            </TouchableOpacity>
                          )
                        })}
                      </View>
                    </View>
                  )
                })}
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Assign Modal */}
      <Modal visible={assignModalOpen} transparent animationType="fade" onRequestClose={() => setAssignModalOpen(false)}>
        <View className="flex-1 bg-black/60 justify-center items-center p-4">
          <View className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800">
            <View className="flex-row items-center gap-2 mb-6">
              <Send size={20} color="#6366f1" />
              <Text className="text-lg font-bold text-slate-900 dark:text-white">Sınavı Ata</Text>
            </View>
            
            <View className="space-y-4">
              <View>
                <Text className="text-[10px] font-bold text-slate-450 dark:text-slate-400 uppercase tracking-wider mb-2">Öğrenciler</Text>
                <ScrollView style={{ maxHeight: 120 }} nestedScrollEnabled>
                  {students.map(student => {
                    const active = selectedStudentIds.includes(student.id);
                    return (
                      <TouchableOpacity 
                        key={student.id} 
                        onPress={() => toggleStudent(student.id)}
                        className={`flex-row items-center gap-3 p-3 rounded-xl mb-2 border ${
                          active ? 'bg-indigo-50 border-indigo-200 dark:bg-indigo-900/30 dark:border-indigo-800' : 'bg-slate-50 border-slate-200 dark:bg-slate-950 dark:border-slate-800'
                        }`}
                      >
                        <View className={`w-5 h-5 rounded-md border items-center justify-center ${
                          active ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300 dark:border-slate-600'
                        }`}>
                          {active && <CheckSquare size={12} color="white" />}
                        </View>
                        <Text className="font-bold text-slate-700 dark:text-slate-200">{student.name}</Text>
                      </TouchableOpacity>
                    )
                  })}
                </ScrollView>
              </View>

              <View>
                <Text className="text-[10px] font-bold text-slate-450 dark:text-slate-400 uppercase tracking-wider mb-2">Son Teslim Tarihi</Text>
                <View className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3 flex-row items-center gap-2">
                  <CalendarIcon size={16} color="#94a3b8" />
                  <TextInput
                    value={dueDate}
                    onChangeText={setDueDate}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor="#94a3b8"
                    className="flex-1 p-0 text-slate-800 dark:text-white font-semibold text-sm"
                  />
                </View>
              </View>
            </View>

            <View className="flex-row gap-3 mt-8">
              <TouchableOpacity onPress={() => setAssignModalOpen(false)} className="flex-1 py-3 rounded-xl items-center bg-slate-100 dark:bg-slate-800">
                <Text className="font-bold text-slate-600 dark:text-slate-300">İptal</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleAssign} disabled={isAssigning} className="flex-1 py-3 rounded-xl items-center bg-indigo-600">
                {isAssigning ? <ActivityIndicator size="small" color="white" /> : <Text className="font-bold text-white">Ata</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}
