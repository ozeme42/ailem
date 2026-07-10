import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, TextInput, Alert, Linking, Share } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useEffect, useState, useMemo } from 'react';
import { useRouter, Stack, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, AlertCircle, ChevronRight, BookOpen, Layers, Search, Filter, HelpCircle, GraduationCap, Library, FileText, CheckCircle2, XCircle, BarChart3, ChevronDown, BookCopy, ListTree, TrendingUp, TrendingDown, MinusCircle, Eye, ExternalLink, LayoutGrid, ClipboardList, ListX, Sparkles, Code, ArrowUpDown, Download, RotateCcw, X, Check, Calculator } from 'lucide-react-native';
import { useAuth } from '../context/auth-context';
import { onTestsUpdate, onTrackedBooksUpdate, updateTest } from '../lib/dataService';
import { Test, TrackedBook, FamilyMember } from '../lib/data';
import { format, parseISO, parse } from 'date-fns';
import { tr } from 'date-fns/locale';
import { useColorScheme } from 'nativewind';
import { LinearGradient } from 'expo-linear-gradient';

const typeIcons: Record<string, any> = {
  json: FileText,
  exam: ClipboardList,
  bank: Library,
  quick: Sparkles,
  html: Code,
  trackedBook: BookOpen,
  mistake: AlertCircle
};

function translateType(type: string) {
  const map: Record<string, string> = {
    json: 'Yazılı Test', exam: 'Deneme Sınavı', bank: 'Soru Bankası',
    quick: 'Hızlı Test', mistake: 'Yanlış Havuzu', trackedBook: 'Kitap Takibi',
    html: 'HTML Test', pdf: 'PDF Test', offline: 'Fiziksel / Harici'
  };
  return map[type] || type;
}

const getCategoryName = (test: Test): string => {
  if (test.sourceType === 'exam') return 'Genel Deneme Sınavları';
  if (test.sourceType === 'mistake') return 'Yanlışlarım';
  return test.subject || 'Diğer';
};

type MistakeDetail = {
  id: string;
  questionNumber: string;
  studentAnswer: string | null;
  correctAnswer: string | null;
  testTitle: string;
  testId: string;
  date: string;
  dateRaw: Date;
  subject: string;
  topic: string;
  sourceType: string;
  isEmpty: boolean;
};

export default function MistakesScreen() {
  const router = useRouter();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const { familyMembers, familyId } = useAuth();

  const [tests, setTests] = useState<Test[]>([]);
  const [trackedBooks, setTrackedBooks] = useState<TrackedBook[]>([]);
  const [loading, setLoading] = useState(true);

  // States
  const [selectedStudent, setSelectedStudent] = useState<FamilyMember | null>(null);
  const [groupingMode, setGroupingMode] = useState<'subject' | 'type' | 'timeline'>('subject');
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [selectedSubGroup, setSelectedSubGroup] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  // Sort & Filter states
  const [timelineSubjectFilter, setTimelineSubjectFilter] = useState<string>("all");
  const [timelineSearch, setTimelineSearch] = useState("");
  const [timelineSort, setTimelineSort] = useState<{ key: 'date' | 'title' | 'isReviewed', direction: 'asc' | 'desc' }>({ key: 'date', direction: 'desc' });
  const [sortConfig, setSortConfig] = useState<{ key: keyof MistakeDetail | 'dateRaw', direction: 'asc' | 'desc' }>({ key: 'dateRaw', direction: 'desc' });

  // Load Child members
  const studentMembers = useMemo(() => 
    familyMembers.filter(m => m.role && m.role.includes('Çocuk')), 
  [familyMembers]);

  useEffect(() => {
    if (studentMembers.length > 0 && !selectedStudent) {
      setSelectedStudent(studentMembers[0]);
    }
  }, [studentMembers, selectedStudent]);

  useEffect(() => {
    if (!familyId || !selectedStudent) return;
    setLoading(true);
    const unsubTests = onTestsUpdate((all) => {
      setTests(all.filter(t => t.studentId === selectedStudent.id && t.status === 'Sonuçlandı'));
      setLoading(false);
    });
    const unsubBooks = onTrackedBooksUpdate(setTrackedBooks);
    return () => { unsubTests(); unsubBooks(); };
  }, [familyId, selectedStudent]);

  const handleToggleReview = async (testId: string, currentStatus: boolean) => {
    try {
      await updateTest(testId, { mistakesReviewed: !currentStatus });
    } catch (error) {
      console.error("Failed to update test review status", error);
    }
  };

  // Compile mistakes dynamically
  const allMistakesFlat = useMemo(() => {
    const list: MistakeDetail[] = [];
    const allTopics = trackedBooks.flatMap(b => (b.subjects || []).flatMap(s => (s.topics || []).map(t => ({...t, subjectName: s.name}))));

    tests.forEach(test => {
      const subjectName = getCategoryName(test);
      let topicName = "Genel";
      if (test.topicId) {
        topicName = allTopics.find(t => t.id === test.topicId)?.name || "Genel";
      } else if ((test as any).topic) {
        topicName = (test as any).topic;
      }

      let dateRaw = new Date();
      try { 
        dateRaw = test.updatedAt ? parseISO(test.updatedAt) : parse(test.assignedDate, 'dd MMMM yyyy', new Date(), { locale: tr }); 
      } catch(e) {}

      if (!test.openEnded) {
        const studentAnswers = test.studentAnswers || {};
        let effectiveAnswerKey = test.answerKey || {};
        if (test.sourceType === 'json' && Object.keys(effectiveAnswerKey).length === 0 && test.jsonQuestions) {
          test.jsonQuestions.forEach((q, idx) => { effectiveAnswerKey[(idx + 1).toString()] = q.answer; });
        }
        Object.entries(effectiveAnswerKey).forEach(([qNum, cAns]) => {
          const sAns = studentAnswers[qNum];
          if (!sAns || sAns !== cAns) {
            list.push({ 
              id: `${test.id}_${qNum}`, 
              questionNumber: qNum, 
              studentAnswer: sAns || null, 
              correctAnswer: cAns, 
              testTitle: test.title, 
              testId: test.id, 
              date: test.assignedDate, 
              dateRaw,
              subject: subjectName, 
              topic: topicName, 
              sourceType: test.sourceType, 
              isEmpty: !sAns 
            });
          }
        });
      } else if (test.studentTextAnswersEvaluation) {
        Object.entries(test.studentTextAnswersEvaluation).forEach(([qNum, status]) => {
          if (status === 'incorrect' || status === 'empty') {
            list.push({ 
              id: `${test.id}_${qNum}`, 
              questionNumber: qNum, 
              studentAnswer: test.studentTextAnswers?.[qNum] || null, 
              correctAnswer: test.answerKey?.[qNum] || "Bilinmiyor", 
              testTitle: test.title, 
              testId: test.id, 
              date: test.assignedDate, 
              dateRaw,
              subject: subjectName, 
              topic: topicName, 
              sourceType: test.sourceType, 
              isEmpty: status === 'empty' 
            });
          }
        });
      }
    });
    return list;
  }, [tests, trackedBooks]);

  const recentTestsMistakes = useMemo(() => {
    const testMap: Record<string, { id: string, title: string, date: Date, dateStr: string, wrongQuestions: string[], emptyQuestions: string[], isReviewed: boolean, subject: string, bookName: string }> = {};
    allMistakesFlat.forEach(m => {
      if (!testMap[m.testId]) {
        const originalTest = tests.find(t => t.id === m.testId);
        let bookName = "";
        if (originalTest?.sourceType === 'trackedBook' && originalTest.sourceId) {
          const book = trackedBooks.find(b => b.id === originalTest.sourceId);
          if (book) bookName = book.title;
        }
        testMap[m.testId] = { 
          id: m.testId, 
          title: m.testTitle, 
          date: m.dateRaw, 
          dateStr: m.date, 
          wrongQuestions: [], 
          emptyQuestions: [], 
          isReviewed: originalTest?.mistakesReviewed || false,
          subject: originalTest?.subject || m.subject,
          bookName: bookName
        };
      }
      if (m.isEmpty) {
        testMap[m.testId].emptyQuestions.push(m.questionNumber);
      } else {
        testMap[m.testId].wrongQuestions.push(m.questionNumber);
      }
    });
    return Object.values(testMap).sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [allMistakesFlat, tests, trackedBooks]);

  const uniqueTimelineSubjects = useMemo(() => 
    Array.from(new Set(recentTestsMistakes.map(t => t.subject).filter(Boolean))), 
  [recentTestsMistakes]);

  const filteredAndSortedTimeline = useMemo(() => {
    let result = [...recentTestsMistakes];
    
    if (timelineSubjectFilter !== 'all') {
      result = result.filter(t => t.subject === timelineSubjectFilter);
    }
    
    if (timelineSearch) {
      const q = timelineSearch.toLowerCase();
      result = result.filter(t => t.title.toLowerCase().includes(q) || t.subject.toLowerCase().includes(q));
    }
    
    result.sort((a, b) => {
      let valA, valB;
      if (timelineSort.key === 'date') { valA = a.date.getTime(); valB = b.date.getTime(); }
      else if (timelineSort.key === 'title') { valA = a.title; valB = b.title; }
      else { valA = a.isReviewed ? 1 : 0; valB = b.isReviewed ? 1 : 0; }
      
      if (valA === valB) return 0;
      if (timelineSort.direction === 'asc') return valA > valB ? 1 : -1;
      return valA < valB ? 1 : -1;
    });
    
    return result;
  }, [recentTestsMistakes, timelineSearch, timelineSort, timelineSubjectFilter]);

  const handleTimelineSort = (key: 'date' | 'title' | 'isReviewed') => {
    setTimelineSort(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'desc' ? 'asc' : 'desc'
    }));
  };

  const groups = useMemo(() => {
    const map: Record<string, MistakeDetail[]> = {};
    allMistakesFlat.forEach(m => {
      const key = groupingMode === 'subject' ? m.subject : translateType(m.sourceType);
      if (!map[key]) map[key] = [];
      map[key].push(m);
    });
    return map;
  }, [allMistakesFlat, groupingMode]);

  const subGroups = useMemo(() => {
    if (!selectedGroup) return [];
    const itemsInGroup = groups[selectedGroup] || [];
    const map: Record<string, MistakeDetail[]> = {};
    
    itemsInGroup.forEach(item => {
      const key = groupingMode === 'subject' ? item.topic : item.testTitle;
      if (!map[key]) map[key] = [];
      map[key].push(item);
    });

    return Object.entries(map)
      .map(([name, items]) => ({ name, items, count: items.length }))
      .sort((a, b) => b.count - a.count);
  }, [groups, selectedGroup, groupingMode]);

  const tableData = useMemo(() => {
    if (!selectedGroup) return [];
    let data = groups[selectedGroup] || [];

    if (selectedSubGroup) {
      data = data.filter(d => (groupingMode === 'subject' ? d.topic : d.testTitle) === selectedSubGroup);
    }

    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      data = data.filter(d => 
        d.testTitle.toLowerCase().includes(q) || 
        d.topic.toLowerCase().includes(q) ||
        d.subject.toLowerCase().includes(q)
      );
    }

    data.sort((a: any, b: any) => {
      const valA = a[sortConfig.key];
      const valB = b[sortConfig.key];
      if (valA === valB) return 0;
      if (sortConfig.direction === 'asc') return valA > valB ? 1 : -1;
      return valA < valB ? 1 : -1;
    });

    return data;
  }, [groups, selectedGroup, selectedSubGroup, searchTerm, sortConfig, groupingMode]);

  const handleSort = (key: any) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'desc' ? 'asc' : 'desc'
    }));
  };

  const handleShareCSV = async () => {
    const headers = ["Ders", "Konu", "Sinav", "Soru No", "Senin Cevabin", "Dogru Cevap", "Tarih"];
    const rows = tableData.map(d => [
      `"${d.subject}"`, `"${d.topic}"`, `"${d.testTitle.replace(/"/g, '""')}"`, d.questionNumber, `"${d.studentAnswer || 'BOS'}"`, `"${d.correctAnswer}"`, `"${d.date}"`
    ]);
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    try {
      await Share.share({
        message: csvContent,
        title: `Yanlislarim - ${selectedGroup || 'Tumu'}`
      });
    } catch (e) {
      Alert.alert("Hata", "CSV paylaşılamadı.");
    }
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 justify-center items-center bg-slate-50 dark:bg-slate-950">
        <ActivityIndicator size="large" color="#f43f5e" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-slate-50 dark:bg-slate-950">
      <Stack.Screen options={{ headerShown: false }} />

      {/* HEADER */}
      <View className="p-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex-row justify-between items-center z-10 shadow-sm">
        <View className="flex-row items-center gap-4">
          <TouchableOpacity onPress={() => selectedGroup ? setSelectedGroup(null) : router.back()} className="w-10 h-10 items-center justify-center bg-slate-100 dark:bg-slate-800 rounded-full">
             <ArrowLeft size={20} color="#64748b" />
          </TouchableOpacity>
          <View>
            <Text className="text-xl font-bold bg-gradient-to-r from-red-500 to-rose-600 bg-clip-text text-transparent">Yanlışlarım</Text>
            <Text className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Eksik ve Hata Havuzu</Text>
          </View>
        </View>

        {/* Student Selector */}
        <View className="flex-row items-center gap-2">
          {studentMembers.map(member => {
            const isActive = selectedStudent?.id === member.id;
            return (
              <TouchableOpacity
                key={member.id}
                onPress={() => { setSelectedStudent(member); setSelectedGroup(null); setSelectedSubGroup(null); }}
                className={`px-3 py-1.5 rounded-full border ${
                  isActive 
                    ? 'bg-rose-600 border-rose-600' 
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-850'
                }`}
              >
                <Text className={`text-[10px] font-black uppercase tracking-wider ${isActive ? 'text-white' : 'text-slate-500 dark:text-slate-400'}`}>
                  {member.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* MAIN BODY */}
      {!selectedGroup ? (
        // DASHBOARD MODE
        <View className="flex-1">
          {/* TAB BAR AND HATA SAYACI */}
          <View className="bg-white dark:bg-slate-900 p-4 border-b border-slate-200 dark:border-slate-800 flex-row items-center justify-between gap-3">
            <View className="bg-slate-100 dark:bg-slate-800 p-1 rounded-xl flex-row max-w-xs flex-1">
              <TouchableOpacity 
                onPress={() => setGroupingMode('subject')}
                className={`flex-1 py-2 rounded-lg items-center ${groupingMode === 'subject' ? 'bg-white dark:bg-slate-700 shadow-sm' : ''}`}
              >
                <Text className={`text-[10px] font-bold ${groupingMode === 'subject' ? 'text-slate-800 dark:text-white' : 'text-slate-500'}`}>Dersler</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                onPress={() => setGroupingMode('type')}
                className={`flex-1 py-2 rounded-lg items-center ${groupingMode === 'type' ? 'bg-white dark:bg-slate-700 shadow-sm' : ''}`}
              >
                <Text className={`text-[10px] font-bold ${groupingMode === 'type' ? 'text-slate-800 dark:text-white' : 'text-slate-500'}`}>Sınav Türleri</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                onPress={() => setGroupingMode('timeline')}
                className={`flex-1 py-2 rounded-lg items-center ${groupingMode === 'timeline' ? 'bg-white dark:bg-slate-700 shadow-sm' : ''}`}
              >
                <Text className={`text-[10px] font-bold ${groupingMode === 'timeline' ? 'text-slate-800 dark:text-white' : 'text-slate-500'}`}>Tarih</Text>
              </TouchableOpacity>
            </View>

            <View className="bg-slate-100 dark:bg-slate-800 rounded-full px-3 py-2 border border-slate-250/50 dark:border-slate-700 shadow-inner shrink-0">
              <Text className="text-[9px] font-black text-slate-500 dark:text-slate-350 uppercase tracking-widest">
                {allMistakesFlat.length} Hata
              </Text>
            </View>
          </View>

          <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 60 }} showsVerticalScrollIndicator={false}>
            {groupingMode === 'timeline' ? (
              // TIMELINE MODE
              <View className="space-y-4">
                {/* Timeline Filters */}
                <View className="bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 flex-row items-center gap-3">
                  <Search size={16} color="#94a3b8" />
                  <TextInput
                    placeholder="Sınav veya kitap ara..."
                    placeholderTextColor="#94a3b8"
                    value={timelineSearch}
                    onChangeText={setTimelineSearch}
                    className="flex-1 text-xs font-semibold text-slate-800 dark:text-white p-0"
                  />
                  {uniqueTimelineSubjects.length > 0 && (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row shrink-0 max-w-[150px]">
                      <TouchableOpacity 
                        onPress={() => setTimelineSubjectFilter('all')}
                        className={`px-2 py-1 rounded-md border mr-1 ${timelineSubjectFilter === 'all' ? 'bg-rose-500 border-rose-500' : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-750'}`}
                      >
                        <Text className={`text-[8px] font-black ${timelineSubjectFilter === 'all' ? 'text-white' : 'text-slate-500'}`}>Hepsi</Text>
                      </TouchableOpacity>
                      {uniqueTimelineSubjects.map(s => (
                        <TouchableOpacity 
                          key={s}
                          onPress={() => setTimelineSubjectFilter(s)}
                          className={`px-2 py-1 rounded-md border mr-1 ${timelineSubjectFilter === s ? 'bg-rose-500 border-rose-500' : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-750'}`}
                        >
                          <Text className={`text-[8px] font-black ${timelineSubjectFilter === s ? 'text-white' : 'text-slate-550'}`}>{s}</Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  )}
                </View>

                {/* Timeline List */}
                {filteredAndSortedTimeline.map((t, idx) => (
                  <View 
                    key={idx}
                    className={`bg-white dark:bg-slate-900 rounded-3xl p-4 border border-slate-100 dark:border-slate-800 shadow-sm ${
                      t.isReviewed ? 'opacity-65' : ''
                    }`}
                  >
                    <View className="flex-row items-start justify-between mb-3 flex-wrap gap-2">
                      <View className="flex-1 min-w-[120px]">
                        <Text className="text-[9px] font-bold text-slate-400 font-mono mb-1">{t.dateStr}</Text>
                        <Text className="text-[10px] font-black text-rose-600 uppercase tracking-wider mb-1">{t.subject}</Text>
                        <Text 
                          onPress={() => router.push({ pathname: '/exam-detail', params: { id: t.id } })}
                          className="text-xs font-bold text-slate-800 dark:text-slate-100 underline decoration-indigo-200"
                        >
                          {t.title}
                        </Text>
                      </View>

                      <TouchableOpacity 
                        onPress={() => handleToggleReview(t.id, t.isReviewed)}
                        className={`px-3 py-1.5 rounded-xl border ${
                          t.isReviewed 
                            ? 'bg-slate-50 border-slate-200 dark:bg-slate-950 dark:border-slate-850' 
                            : 'bg-indigo-650 border-indigo-650 shadow-sm'
                        }`}
                      >
                        <Text className={`text-[8px] font-black uppercase tracking-wider ${t.isReviewed ? 'text-slate-400' : 'text-white'}`}>
                          {t.isReviewed ? "İncelendi ✓" : "Kontrol Et"}
                        </Text>
                      </TouchableOpacity>
                    </View>

                    {/* Question summaries */}
                    <View className="space-y-2 pt-2.5 border-t border-slate-100 dark:border-slate-850">
                      {t.wrongQuestions.length > 0 && (
                        <View className="flex-row items-center flex-wrap gap-1.5">
                          <Text className="text-[8px] font-black text-slate-400 uppercase tracking-widest mr-1">Yanlışlar:</Text>
                          {t.wrongQuestions.map(q => (
                            <View key={q} className="w-6 h-6 rounded bg-rose-50 border border-rose-100 items-center justify-center">
                              <Text className="text-[10px] font-black text-rose-600">{q}</Text>
                            </View>
                          ))}
                        </View>
                      )}

                      {t.emptyQuestions.length > 0 && (
                        <View className="flex-row items-center flex-wrap gap-1.5">
                          <Text className="text-[8px] font-black text-slate-400 uppercase tracking-widest mr-1">Boşlar:</Text>
                          {t.emptyQuestions.map(q => (
                            <View key={q} className="w-6 h-6 rounded bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 items-center justify-center">
                              <Text className="text-[10px] font-black text-slate-600 dark:text-slate-300">{q}</Text>
                            </View>
                          ))}
                        </View>
                      )}
                    </View>
                  </View>
                ))}

                {filteredAndSortedTimeline.length === 0 && (
                  <View className="py-20 flex-col items-center justify-center text-center">
                    <CheckCircle2 size={40} color="#10b981" className="mb-4" />
                    <Text className="text-slate-500 font-bold">Temiz Zaman Çizelgesi! Hata Bulunmuyor.</Text>
                  </View>
                )}
              </View>
            ) : (
              // BENTO CARD GROUPS
              <View className="flex-row flex-wrap justify-between">
                {Object.entries(groups).map(([name, items]) => {
                  const Icon = groupingMode === 'type' ? (typeIcons[items[0].sourceType] || Library) : BookCopy;
                  return (
                    <TouchableOpacity
                      key={name}
                      onPress={() => { setSelectedGroup(name); setSelectedSubGroup(null); }}
                      activeOpacity={0.9}
                      className="w-[48%] bg-white dark:bg-slate-900 rounded-[28px] p-4 border border-slate-100 dark:border-slate-800 overflow-hidden mb-4 shadow-sm relative min-h-[140px] justify-between"
                    >
                      <View className="absolute bottom-[-10px] right-[-10px] opacity-5">
                        <Icon size={72} color="#000000" />
                      </View>
                      
                      <View className="flex-row items-center gap-3">
                        <View className={`w-10 h-10 rounded-xl items-center justify-center ${
                          groupingMode === 'subject' ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-600' : 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600'
                        }`}>
                          <Icon size={20} color={groupingMode === 'subject' ? '#e11d48' : '#4f46e5'} />
                        </View>
                      </View>

                      <View className="mt-4">
                        <Text className="text-sm font-black text-slate-850 dark:text-white leading-tight" numberOfLines={2}>{name}</Text>
                        <View className="bg-rose-500 rounded-full px-2.5 py-0.5 mt-2 self-start shadow-sm">
                          <Text className="text-white text-[9px] font-black">{items.length} Hata</Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                })}

                {allMistakesFlat.length === 0 && (
                  <View className="w-full py-20 items-center justify-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-[32px] bg-white/40 dark:bg-slate-900/10 p-6">
                    <CheckCircle2 size={48} color="#10b981" className="mb-4" />
                    <Text className="text-lg font-black text-slate-900 dark:text-white">Mükemmel Skor!</Text>
                    <Text className="text-slate-400 dark:text-slate-500 text-xs text-center mt-2">Henüz hiç yanlışın yok. Sınavları çözmeye devam et!</Text>
                  </View>
                )}
              </View>
            )}
          </ScrollView>
        </View>
      ) : (
        // DRILL DOWN LIST MODE
        <View className="flex-1">
          {/* SubGroup Topic Pills */}
          <View className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 p-4">
            <View className="flex-row items-center justify-between mb-3 px-1">
              <Text className="text-[9px] font-black text-slate-450 uppercase tracking-widest">
                {selectedGroup} Alt Dağılımı
              </Text>
              {selectedSubGroup && (
                <TouchableOpacity onPress={() => setSelectedSubGroup(null)}>
                  <Text className="text-[10px] font-black text-rose-500 uppercase tracking-widest">Filtreyi Kaldır</Text>
                </TouchableOpacity>
              )}
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row">
              <TouchableOpacity
                onPress={() => setSelectedSubGroup(null)}
                className={`px-4 py-2 rounded-2xl mr-2 border ${
                  !selectedSubGroup 
                    ? 'bg-indigo-650 border-indigo-650' 
                    : 'bg-slate-50 border-slate-250 dark:bg-slate-800 dark:border-slate-700 text-slate-600'
                }`}
              >
                <Text className={`text-[10px] font-black uppercase ${!selectedSubGroup ? 'text-white' : 'text-slate-550 dark:text-slate-400'}`}>
                  Tümü ({groups[selectedGroup].length})
                </Text>
              </TouchableOpacity>

              {subGroups.map((sub, i) => {
                const isActive = selectedSubGroup === sub.name;
                return (
                  <TouchableOpacity
                    key={i}
                    onPress={() => setSelectedSubGroup(sub.name)}
                    className={`px-4 py-2 rounded-2xl mr-2 border ${
                      isActive 
                        ? 'bg-rose-600 border-rose-600' 
                        : 'bg-white border-slate-200 dark:bg-slate-800 dark:border-slate-700 text-slate-850'
                    }`}
                  >
                    <Text className={`text-[10px] font-black uppercase ${isActive ? 'text-white' : 'text-slate-750 dark:text-slate-350'}`}>
                      {sub.name} ({sub.count})
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {/* Table Search & Export bar */}
          <View className="bg-white dark:bg-slate-900 p-4 border-b border-slate-200 dark:border-slate-800 flex-row items-center justify-between gap-3">
            <View className="bg-slate-50 dark:bg-slate-950 border border-slate-250 dark:border-slate-800 rounded-xl px-3.5 py-2 flex-row items-center gap-2.5 flex-1">
              <Search size={14} color="#94a3b8" />
              <TextInput
                placeholder="Tabloda ara..."
                placeholderTextColor="#94a3b8"
                value={searchTerm}
                onChangeText={setSearchTerm}
                className="flex-1 text-xs font-semibold text-slate-800 dark:text-white p-0"
              />
            </View>

            <TouchableOpacity 
              onPress={handleShareCSV}
              className="flex-row items-center gap-1.5 bg-emerald-50 dark:bg-emerald-950/40 px-3 py-2.5 rounded-xl border border-emerald-100 dark:border-emerald-900/35 active:scale-95"
            >
              <Download size={13} color="#10b981" />
              <Text className="text-[10px] font-black text-emerald-600 dark:text-emerald-450 uppercase tracking-wider">Excel</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              onPress={() => { setSelectedGroup(null); setSelectedSubGroup(null); }}
              className="w-9 h-9 bg-slate-100 dark:bg-slate-800 rounded-xl items-center justify-center"
            >
              <X size={15} color="#64748b" />
            </TouchableOpacity>
          </View>

          {/* DİKEY TABLO LİSTESİ */}
          <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 60 }} showsVerticalScrollIndicator={false}>
            <View className="space-y-3">
              {tableData.map(m => (
                <View 
                  key={m.id}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-4 shadow-sm flex-row items-center"
                >
                  <View className="flex-1 mr-3">
                    <Text className="text-[10px] font-black text-slate-850 dark:text-slate-100 uppercase tracking-wider mb-1" numberOfLines={1}>{m.subject}</Text>
                    <Text className="text-[11px] font-bold text-indigo-650 dark:text-indigo-400 mb-1" numberOfLines={1}>{m.topic}</Text>
                    <Text className="text-[10px] text-slate-400 dark:text-slate-550 font-bold" numberOfLines={1}>{m.testTitle}</Text>
                  </View>

                  <View className="flex-row items-center gap-3 shrink-0">
                    <View className="items-center">
                      <Text className="text-[7px] font-black text-slate-400 uppercase tracking-widest mb-1.5">No</Text>
                      <Text className="text-xs font-black text-slate-500">{m.questionNumber}</Text>
                    </View>

                    <View className="items-center">
                      <Text className="text-[7px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Sen</Text>
                      <View className={`w-7 h-7 rounded-lg items-center justify-center ${
                        m.isEmpty ? 'bg-slate-100 text-slate-400' : 'bg-rose-50 border border-rose-100 text-rose-600'
                      }`}>
                        <Text className="text-xs font-black">{m.studentAnswer || "B"}</Text>
                      </View>
                    </View>

                    <View className="items-center">
                      <Text className="text-[7px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Doğru</Text>
                      <View className="w-7 h-7 rounded-lg bg-emerald-50 border border-emerald-100 text-emerald-600 items-center justify-center shadow-sm">
                        <Text className="text-xs font-black">{m.correctAnswer}</Text>
                      </View>
                    </View>

                    <TouchableOpacity 
                      onPress={() => router.push({ pathname: '/exam-detail', params: { id: m.testId } })}
                      className="w-8 h-8 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 items-center justify-center active:scale-95"
                    >
                      <ChevronRight size={16} color="#64748b" />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}

              {tableData.length === 0 && (
                <View className="py-20 flex-col items-center justify-center text-center">
                  <Calculator size={40} color="#94a3b8" className="mb-4 opacity-50" />
                  <Text className="text-slate-500 font-bold text-sm">Aradığınız kriterlere uygun hata kaydı bulunamadı.</Text>
                </View>
              )}
            </View>
          </ScrollView>
        </View>
      )}
    </SafeAreaView>
  );
}
