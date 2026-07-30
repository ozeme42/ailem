import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Modal, TextInput, Alert, KeyboardAvoidingView, Platform, Share } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useEffect, useState, useMemo } from 'react';
import { ChevronLeft, BookOpen, Layers, Clock, FileBadge, Plus, ChevronDown, ChevronRight, PenTool, Trash2, ListPlus, CopyPlus, X, FileJson, AlertTriangle, Download, CheckSquare, Square, Check, UserCheck, Calendar, Play } from 'lucide-react-native';
import { useRouter, Stack, useLocalSearchParams } from 'expo-router';
import { onTrackedBookUpdate, onTrackedBookTestsUpdate, updateTrackedBook, addTrackedBookTest, deleteTrackedBookTest, addBulkTrackedBookTests, updateTrackedBookTest as updateDataServiceTest, onTestsUpdate, addStudyAssignment } from '../lib/dataService';
import { useAuth } from '../context/auth-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import { TrackedBook, TrackedBookTest, TrackedBookSubject, Topic, Test } from '../lib/data';
import { format, parseISO } from 'date-fns';
import { tr } from 'date-fns/locale';

type MistakeInfo = {
  test: Test;
  testDefinition: TrackedBookTest;
  questionNumber: string;
};

export default function BookDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const [book, setBook] = useState<TrackedBook | null>(null);
  const [tests, setTests] = useState<TrackedBookTest[]>([]);
  const [loading, setLoading] = useState(true);

  // New States for Mistake Analysis
  const [allAssignedTests, setAllAssignedTests] = useState<Test[]>([]);
  const [activeTab, setActiveTab] = useState<'contents' | 'mistakes'>('contents');
  const [mistakeFilterSubject, setMistakeFilterSubject] = useState<string>('all');
  const [mistakeFilterTopic, setMistakeFilterTopic] = useState<string>('all');

  // Accordion State
  const [expandedSubject, setExpandedSubject] = useState<string | null>(null);
  const [expandedTopic, setExpandedTopic] = useState<string | null>(null);

  // Modal States
  const [isSubjectDialogOpen, setIsSubjectDialogOpen] = useState(false);
  const [isTopicDialogOpen, setIsTopicDialogOpen] = useState(false);
  const [isTestDialogOpen, setIsTestDialogOpen] = useState(false);
  const [isBulkTestDialogOpen, setIsBulkTestDialogOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  // Selected Entities
  const [currentSubject, setCurrentSubject] = useState<TrackedBookSubject | null>(null);
  const [currentTopic, setCurrentTopic] = useState<Topic | null>(null);
  const [currentTest, setCurrentTest] = useState<TrackedBookTest | null>(null);

  // Selection & Assignment States
  const { familyMembers } = useAuth();
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedTests, setSelectedTests] = useState<{test: TrackedBookTest, subject: TrackedBookSubject, topic: Topic}[]>([]);
  const [isAssignmentModalOpen, setIsAssignmentModalOpen] = useState(false);
  const [assignmentStudentId, setAssignmentStudentId] = useState("");
  const [assignmentDueDate, setAssignmentDueDate] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Form States
  const [newSubjectName, setNewSubjectName] = useState("");
  const [newTopicName, setNewTopicName] = useState("");
  const [jsonInput, setJsonInput] = useState("");
  const [testFormData, setTestFormData] = useState({ name: "", questionCount: "20" });
  const [tempAnswerKey, setTempAnswerKey] = useState<{ [key: string]: string }>({});
  const [bulkText, setBulkText] = useState("");
  
  const [bulkTestFormData, setBulkTestFormData] = useState({ prefix: "Test", count: "10", questionCount: "20" });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!id) return;
    
    let unsubscribeBook: any;
    let unsubscribeTests: any;
    
    try {
      unsubscribeBook = onTrackedBookUpdate(id as string, (data) => {
        setBook(data);
        setLoading(false);
      });
      
      unsubscribeTests = onTrackedBookTestsUpdate(id as string, (data) => {
        setTests(data);
      });
    } catch (e) {
      console.log('Error fetching book details:', e);
      setLoading(false);
    }

    return () => {
      if (typeof unsubscribeBook === 'function') unsubscribeBook();
      if (typeof unsubscribeTests === 'function') unsubscribeTests();
    };
  }, [id]);

  useEffect(() => {
    if (tests.length === 0) {
      setAllAssignedTests([]);
      return;
    }
    const unsubAllTests = onTestsUpdate((allTests) => {
      const testIds = tests.map(bt => bt.id);
      const relevantTests = allTests.filter(t => t.sourceType === 'trackedBook' && testIds.includes(t.sourceId || ''));
      setAllAssignedTests(relevantTests);
    });
    return () => unsubAllTests();
  }, [tests]);

  const handleImportJson = async () => {
    if (!book || !jsonInput.trim()) return;
    setIsSubmitting(true);
    try {
      const parsedData = JSON.parse(jsonInput);
      if (!parsedData.subjects || !Array.isArray(parsedData.subjects)) {
        throw new Error("Geçersiz format: JSON verisi bir 'subjects' dizisi içermelidir.");
      }

      const existingSubjects = book.subjects || [];
      const updatedSubjects = JSON.parse(JSON.stringify(existingSubjects)); 
      const testsToCreate: any[] = [];

      updatedSubjects.forEach((s: any) => {
        if (!s.id) s.id = "s_" + Date.now().toString() + Math.random().toString(36).substring(2, 9);
        if (s.topics && Array.isArray(s.topics)) {
          s.topics.forEach((t: any) => {
            if (!t.id) t.id = "t_" + Date.now().toString() + Math.random().toString(36).substring(2, 9);
          });
        }
      });

      for (const subjData of parsedData.subjects) {
        if (!subjData.name) continue;

        let subject = updatedSubjects.find((s: any) => s.name?.toLocaleLowerCase('tr-TR') === subjData.name.toLocaleLowerCase('tr-TR'));
        if (!subject) {
          subject = { 
            id: "s_" + Date.now().toString() + Math.random().toString(36).substring(2, 9), 
            name: subjData.name, 
            topics: [] 
          };
          updatedSubjects.push(subject);
        }

        if (subjData.topics && Array.isArray(subjData.topics)) {
          if (!subject.topics) subject.topics = [];
          
          for (const topicData of subjData.topics) {
            if (!topicData.name) continue;

            let topic = subject.topics.find((t: any) => t.name?.toLocaleLowerCase('tr-TR') === topicData.name.toLocaleLowerCase('tr-TR'));
            if (!topic) {
              topic = { 
                id: "t_" + Date.now().toString() + Math.random().toString(36).substring(2, 9), 
                name: topicData.name 
              };
              subject.topics.push(topic);
            }

            if (topicData.tests && Array.isArray(topicData.tests)) {
              for (const testData of topicData.tests) {
                const safeSubjectId = subject.id ? String(subject.id) : ("s_" + Date.now());
                const safeTopicId = topic.id ? String(topic.id) : ("t_" + Date.now());

                const testPayload: any = {
                  subjectId: safeSubjectId,
                  topicId: safeTopicId,
                  name: String(testData.name || "İsimsiz Test"),
                  questionCount: Number(testData.questionCount) || 20,
                  answerKey: {}
                };
                
                if (testData.answerKey) {
                  if (Array.isArray(testData.answerKey)) {
                    testData.answerKey.forEach((ans: any, idx: number) => { 
                      if (ans !== undefined && ans !== null && ans !== "") {
                        testPayload.answerKey[String(idx + 1)] = String(ans); 
                      }
                    });
                  } else if (typeof testData.answerKey === 'object') {
                    Object.entries(testData.answerKey).forEach(([k, v]) => {
                      if (v !== undefined && v !== null && v !== "") {
                        testPayload.answerKey[k] = String(v);
                      }
                    });
                  }
                }
                testsToCreate.push(testPayload);
              }
            }
          }
        }
      }

      await updateTrackedBook(book.id, { subjects: updatedSubjects });
      if (testsToCreate.length > 0) {
        for (const payload of testsToCreate) {
          await addTrackedBookTest(book.id, payload);
        }
      }
      
      Alert.alert("Başarılı", `${book.title} kitabına ${testsToCreate.length} test eklendi.`);
      setJsonInput("");
      setIsImportModalOpen(false);
    } catch (error: any) {
      Alert.alert("Veri Aktarım Hatası", error.message || "Geçersiz JSON formatı.");
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    setMistakeFilterTopic("all");
  }, [mistakeFilterSubject]);

  const mistakeList = useMemo(() => {
    const mistakesBySubject: Record<string, Record<string, MistakeInfo[]>> = {};
    const solvedTests = allAssignedTests.filter(t => t.status === 'Sonuçlandı');

    for (const test of solvedTests) {
      const testDefinition = tests.find(bt => bt.id === test.sourceId);
      if (!testDefinition) continue;
      
      const subject = book?.subjects?.find(s => s.id === testDefinition.subjectId);
      const topic = subject?.topics?.find(t => t.id === testDefinition.topicId);
      if (!subject || !topic) continue;

      if (!test.openEnded) {
        if (!test.studentAnswers || !testDefinition.answerKey) continue;
        for (const qNum in test.studentAnswers) {
          const studentAnswer = test.studentAnswers[qNum];
          const correctAnswer = testDefinition.answerKey[qNum];
          if (studentAnswer && correctAnswer && studentAnswer !== correctAnswer) {
            if (!mistakesBySubject[subject.name]) mistakesBySubject[subject.name] = {};
            if (!mistakesBySubject[subject.name][topic.name]) mistakesBySubject[subject.name][topic.name] = [];
            mistakesBySubject[subject.name][topic.name].push({ test, testDefinition, questionNumber: qNum });
          }
        }
      } else {
        if (!test.studentTextAnswersEvaluation) continue;
        for (const qNum in test.studentTextAnswersEvaluation) {
          const evalStatus = test.studentTextAnswersEvaluation[qNum];
          if (evalStatus === 'incorrect') {
            if (!mistakesBySubject[subject.name]) mistakesBySubject[subject.name] = {};
            if (!mistakesBySubject[subject.name][topic.name]) mistakesBySubject[subject.name][topic.name] = [];
            mistakesBySubject[subject.name][topic.name].push({ test, testDefinition, questionNumber: qNum });
          }
        }
      }
    }
    return mistakesBySubject;
  }, [allAssignedTests, tests, book]);

  const { filteredMistakes, subjectOptions, topicOptions } = useMemo(() => {
    const flatList: (MistakeInfo & { subjectName: string, topicName: string })[] = [];
    Object.entries(mistakeList).forEach(([subjectName, topics]) => {
      Object.entries(topics).forEach(([topicName, mistakes]) => {
        mistakes.forEach(mistake => {
          flatList.push({ subjectName, topicName, ...mistake });
        });
      });
    });

    const filtered = flatList.filter(m => {
      if (mistakeFilterSubject !== 'all' && m.subjectName !== mistakeFilterSubject) return false;
      if (mistakeFilterTopic !== 'all' && m.topicName !== mistakeFilterTopic) return false;
      return true;
    });

    // Sort according to book's internal ordering
    filtered.sort((a, b) => {
      const subjectIndexA = book?.subjects?.findIndex(s => s.name === a.subjectName) ?? -1;
      const subjectIndexB = book?.subjects?.findIndex(s => s.name === b.subjectName) ?? -1;
      if (subjectIndexA !== subjectIndexB) return subjectIndexA - subjectIndexB;

      const subjectA = book?.subjects?.[subjectIndexA];
      const topicIndexA = subjectA?.topics?.findIndex(t => t.name === a.topicName) ?? -1;
      const topicIndexB = subjectA?.topics?.findIndex(t => t.name === b.topicName) ?? -1;
      if (topicIndexA !== topicIndexB) return topicIndexA - topicIndexB;

      const testIndexA = tests.findIndex(t => t.id === a.testDefinition.id);
      const testIndexB = tests.findIndex(t => t.id === b.testDefinition.id);
      if (testIndexA !== testIndexB) return testIndexA - testIndexB;

      return parseInt(a.questionNumber) - parseInt(b.questionNumber);
    });

    const bookSubjectNames = (book?.subjects || []).map(s => s.name);
    const subjects = Array.from(new Set(flatList.map(m => m.subjectName)))
      .sort((a, b) => bookSubjectNames.indexOf(a) - bookSubjectNames.indexOf(b));
    
    const relevantSubject = book?.subjects?.find(s => s.name === mistakeFilterSubject);
    const bookTopicNames = relevantSubject ? (relevantSubject.topics || []).map(t => t.name) : [];
    
    const topics = Array.from(new Set(
      flatList.filter(m => mistakeFilterSubject === 'all' || m.subjectName === mistakeFilterSubject).map(m => m.topicName)
    )).sort((a, b) => {
      if (bookTopicNames.length > 0) {
        return bookTopicNames.indexOf(a) - bookTopicNames.indexOf(b);
      }
      return 0; // fallback if 'all' subjects
    });

    return { filteredMistakes: filtered, subjectOptions: subjects, topicOptions: topics };
  }, [mistakeList, mistakeFilterSubject, mistakeFilterTopic, book, tests]);

  const handleDownloadMistakes = async () => {
    try {
      if (filteredMistakes.length === 0) {
        Alert.alert("Hata", "İndirilecek yanlış bulunamadı.");
        return;
      }
      const header = "Ders,Konu,Test Adi,Soru No\n";
      const rows = filteredMistakes.map(m => `${m.subjectName},${m.topicName},${m.testDefinition.name},${m.questionNumber}`).join("\n");
      const csvData = header + rows;
      
      await Share.share({
        message: csvData,
        title: `${book?.title} - Yanlış Analizi`
      });
    } catch (error: any) {
      Alert.alert("Hata", error.message || "İndirme işlemi başarısız oldu.");
    }
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 justify-center items-center bg-slate-50 dark:bg-slate-950">
        <ActivityIndicator size="large" color="#10b981" />
      </SafeAreaView>
    );
  }

  if (!book) {
    return (
      <SafeAreaView className="flex-1 bg-slate-50 dark:bg-slate-950">
        <Stack.Screen options={{ headerShown: false }} />
        <View className="p-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex-row items-center">
          <TouchableOpacity onPress={() => router.back()} className="w-10 h-10 items-center justify-center bg-slate-100 dark:bg-slate-800 rounded-full mr-4">
             <ChevronLeft size={24} color="#64748b" />
          </TouchableOpacity>
          <Text className="text-xl font-bold text-slate-900 dark:text-white">Kitap Bulunamadı</Text>
        </View>
      </SafeAreaView>
    );
  }



  const handleSubjectSave = async () => {
    if (!book || !newSubjectName.trim()) return;
    setIsSubmitting(true);
    const subjects = book.subjects || [];
    if (currentSubject) {
      const updatedSubjects = subjects.map(s => s.id === currentSubject.id ? { ...s, name: newSubjectName } : s);
      await updateTrackedBook(book.id, { subjects: updatedSubjects });
    } else {
      const newSubject: TrackedBookSubject = { id: Date.now().toString(), name: newSubjectName, topics: [] };
      await updateTrackedBook(book.id, { subjects: [...subjects, newSubject] });
    }
    setIsSubmitting(false);
    setIsSubjectDialogOpen(false);
    setNewSubjectName("");
    setCurrentSubject(null);
  };

  const handleTopicSave = async () => {
    if (!book || !currentSubject || !newTopicName.trim()) return;
    setIsSubmitting(true);
    const subjects = book.subjects.map(subject => {
        if(subject.id === currentSubject.id) {
            const topics = subject.topics || [];
            if (currentTopic) {
                return {...subject, topics: topics.map(t => t.id === currentTopic.id ? { ...t, name: newTopicName } : t)};
            } else {
                 const newTopic: Topic = { id: Date.now().toString(), name: newTopicName };
                 return {...subject, topics: [...topics, newTopic]};
            }
        }
        return subject;
    });
    await updateTrackedBook(book.id, { subjects });
    setIsSubmitting(false);
    setIsTopicDialogOpen(false);
    setNewTopicName("");
    setCurrentTopic(null);
  };

  const openTestDialog = (subject: TrackedBookSubject, topic: Topic, test?: TrackedBookTest) => {
    setCurrentSubject(subject);
    setCurrentTopic(topic);
    if (test) {
      setCurrentTest(test);
      setTestFormData({ name: test.name, questionCount: test.questionCount.toString() });
      setTempAnswerKey(test.answerKey || {});
    } else {
      setCurrentTest(null);
      setTestFormData({ name: "", questionCount: "20" });
      setTempAnswerKey({});
    }
    setBulkText("");
    setIsTestDialogOpen(true);
  };

  const handleTestSave = async () => {
    if (!book || !currentSubject || !currentTopic || !testFormData.name.trim()) return;
    setIsSubmitting(true);
    const qCount = parseInt(testFormData.questionCount) || 20;

    const payload = {
      subjectId: currentSubject.id,
      topicId: currentTopic.id,
      name: testFormData.name,
      questionCount: qCount,
      answerKey: tempAnswerKey
    };

    if (currentTest) {
      await updateDataServiceTest(currentTest.id, payload);
    } else {
      await addTrackedBookTest(book.id, payload);
    }

    setIsSubmitting(false);
    setIsTestDialogOpen(false);
  };

  const handleDeleteTest = async (testId: string) => {
    Alert.alert("Emin Misiniz?", "Bu testi silmek istediğinize emin misiniz?", [
      { text: "İptal", style: "cancel" },
      { text: "Sil", style: "destructive", onPress: () => deleteTrackedBookTest(testId) }
    ]);
  };

  const handleBulkTestSave = async () => {
    if (!book || !currentSubject || !currentTopic || !bulkTestFormData.prefix.trim()) return;
    setIsSubmitting(true);
    await addBulkTrackedBookTests(
      book.id, 
      currentSubject.id, 
      currentTopic.id, 
      parseInt(bulkTestFormData.count) || 10, 
      parseInt(bulkTestFormData.questionCount) || 20, 
      bulkTestFormData.prefix
    );
    setIsSubmitting(false);
    setIsBulkTestDialogOpen(false);
  };

  const handleBulkKeyEntry = (text: string) => {
    setBulkText(text);
    const cleanText = text.toUpperCase().replace(/[^A-E]/g, '');
    let newAnswers = { ...tempAnswerKey };
    const maxQ = parseInt(testFormData.questionCount) || 20;
    for (let i = 0; i < cleanText.length && i < maxQ; i++) {
      newAnswers[(i + 1).toString()] = cleanText[i];
    }
    setTempAnswerKey(newAnswers);
  };

  const setAnswer = (qNum: number, opt: string) => {
    setTempAnswerKey(prev => ({ ...prev, [qNum.toString()]: opt }));
  };

  const options = ['A', 'B', 'C', 'D', 'E'];

  const toggleTestSelection = (test: TrackedBookTest, subject: TrackedBookSubject, topic: Topic) => {
    const isSelected = selectedTests.find(t => t.test.id === test.id);
    if (isSelected) {
      setSelectedTests(prev => prev.filter(t => t.test.id !== test.id));
    } else {
      setSelectedTests(prev => [...prev, {test, subject, topic}]);
    }
  };

  const handleAssignSelected = async () => {
    if (!assignmentStudentId || selectedTests.length === 0) {
      Alert.alert("Hata", "Lütfen bir öğrenci seçin ve en az bir test işaretleyin.");
      return;
    }
    setIsSubmitting(true);
    try {
      let orderCounter = 0;
      const testOrderMap = new Map<string, number>();
      book?.subjects?.forEach(s => {
        s.topics?.forEach(t => {
          const tTests = bookTests.filter(test => test.subjectId === s.id && test.topicId === t.id);
          tTests.forEach(test => {
            testOrderMap.set(test.id, orderCounter++);
          });
        });
      });

      for (const item of selectedTests) {
        await addStudyAssignment({
          studentId: assignmentStudentId,
          studyPlanId: "", // manual
          subject: item.subject.name,
          topic: item.topic.name,
          topicId: item.topic.id,
          sources: [book?.title || 'Kitap', item.test.name],
          bookId: book?.id,
          testId: item.test.id,
          order: testOrderMap.get(item.test.id) || 0,
          dueDate: assignmentDueDate ? assignmentDueDate.toISOString() : "",
          startDate: new Date().toISOString()
        });
      }
      Alert.alert("Başarılı", `${selectedTests.length} test başarıyla atandı.`);
      setIsAssignmentModalOpen(false);
      setIsSelectionMode(false);
      setSelectedTests([]);
      setAssignmentStudentId("");
      setAssignmentDueDate(null);
    } catch (error: any) {
      Alert.alert("Hata", "Ödev atanırken bir sorun oluştu.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-50 dark:bg-slate-950">
      <Stack.Screen options={{ headerShown: false }} />
      <View className="p-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex-row justify-between items-center">
        <TouchableOpacity onPress={() => router.back()} className="w-10 h-10 items-center justify-center bg-slate-100 dark:bg-slate-800 rounded-full">
           <ChevronLeft size={24} color="#64748b" />
        </TouchableOpacity>
        <Text className="text-2xl font-bold text-slate-900 dark:text-white" numberOfLines={1}>{book.title}</Text>
        <View className="flex-row items-center gap-2">
          <TouchableOpacity 
            onPress={() => setIsImportModalOpen(true)} 
            className="bg-indigo-100 dark:bg-indigo-900/30 w-10 h-10 rounded-full items-center justify-center shadow-sm"
          >
            <FileJson size={20} color="#4f46e5" />
          </TouchableOpacity>
          <TouchableOpacity 
            onPress={() => {
              setCurrentSubject(null);
              setNewSubjectName("");
              setIsSubjectDialogOpen(true);
            }} 
            className="bg-emerald-500 w-10 h-10 rounded-full items-center justify-center shadow-sm"
          >
            <Plus size={24} color="white" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerClassName="p-4" showsVerticalScrollIndicator={false}>
         <View className="items-center justify-center mt-4 mb-6">
           <View className="w-24 h-24 bg-emerald-50 dark:bg-emerald-900/30 rounded-full items-center justify-center mb-4 border-4 border-white dark:border-slate-800 shadow-sm">
              <BookOpen size={48} color="#10b981" />
           </View>
           <Text className="text-slate-800 dark:text-slate-100 text-2xl font-bold text-center px-4">{book.title}</Text>
           <View className={`mt-3 px-3 py-1 rounded-full border ${book.bookType === 'open_ended' ? 'bg-violet-50 border-violet-200 dark:bg-violet-900/30 dark:border-violet-800' : 'bg-slate-100 border-slate-200 dark:bg-slate-800 dark:border-slate-700'}`}>
             <Text className={`text-[10px] font-bold uppercase tracking-wider ${book.bookType === 'open_ended' ? 'text-violet-700 dark:text-violet-400' : 'text-slate-600 dark:text-slate-400'}`}>
               {book.bookType === 'open_ended' ? 'Açık Uçlu Kitap' : 'Standart Soru Bankası'}
             </Text>
           </View>
           <Text className="text-emerald-500 font-bold mt-2 uppercase tracking-widest">
              {(book.testCount || 0) > 0 && (book.solvedTestCount || 0) === (book.testCount || 0) ? 'Bitti' : 'Çözülüyor'}
           </Text>
         </View>

         {/* Tabs */}
         <View className="flex-row bg-slate-200/50 dark:bg-slate-800/50 p-1 rounded-2xl mb-6">
            <TouchableOpacity 
               onPress={() => setActiveTab('contents')}
               className={`flex-1 py-3 items-center justify-center rounded-xl ${activeTab === 'contents' ? 'bg-white dark:bg-slate-700 shadow-sm' : ''}`}
            >
               <Text className={`font-bold ${activeTab === 'contents' ? 'text-slate-800 dark:text-white' : 'text-slate-500 dark:text-slate-400'}`}>Kitap İçeriği</Text>
            </TouchableOpacity>
            <TouchableOpacity 
               onPress={() => setActiveTab('mistakes')}
               className={`flex-1 flex-row py-3 items-center justify-center rounded-xl ${activeTab === 'mistakes' ? 'bg-white dark:bg-slate-700 shadow-sm' : ''}`}
            >
               <AlertTriangle size={16} color={activeTab === 'mistakes' ? '#e11d48' : '#64748b'} className="mr-2" />
               <Text className={`font-bold ${activeTab === 'mistakes' ? 'text-slate-800 dark:text-white' : 'text-slate-500 dark:text-slate-400'}`}>Yanlış Analizi</Text>
            </TouchableOpacity>
         </View>

         {activeTab === 'contents' ? (
           /* Hierarchical View: Subjects -> Topics -> Tests */
           <View className="mb-10">
              {/* Selection Mode Header */}
              {(book.subjects || []).length > 0 && (
                <View className="flex-row justify-between items-center bg-white dark:bg-slate-900 p-4 rounded-3xl mb-4 shadow-sm border border-slate-100 dark:border-slate-800">
                  <View>
                    <Text className="font-bold text-slate-800 dark:text-slate-200">Çoklu Seçim Modu</Text>
                    <Text className="text-xs text-slate-500 mt-1">Öğrenciye ödev atamak için testleri seçin</Text>
                  </View>
                  <TouchableOpacity onPress={() => { setIsSelectionMode(!isSelectionMode); setSelectedTests([]); }} className={`w-12 h-7 rounded-full justify-center px-1 ${isSelectionMode ? 'bg-indigo-500' : 'bg-slate-200 dark:bg-slate-700'}`}>
                    <View className={`w-5 h-5 rounded-full bg-white shadow-sm ${isSelectionMode ? 'self-end' : 'self-start'}`} />
                  </TouchableOpacity>
                </View>
              )}
           {(book.subjects || []).length === 0 ? (
             <View className="bg-slate-100 dark:bg-slate-800/50 p-6 rounded-3xl items-center justify-center border border-slate-200 dark:border-slate-700">
               <Layers size={32} color="#94a3b8" className="mb-2" />
               <Text className="text-slate-500 font-medium text-center">Bu kitaba henüz ders eklenmemiş.</Text>
               <TouchableOpacity 
                 onPress={() => { setCurrentSubject(null); setNewSubjectName(""); setIsSubjectDialogOpen(true); }}
                 className="mt-4 bg-emerald-100 dark:bg-emerald-900/30 px-4 py-2 rounded-xl"
               >
                 <Text className="text-emerald-600 dark:text-emerald-400 font-bold">Ders Ekle</Text>
               </TouchableOpacity>
             </View>
           ) : (
             book.subjects.map((subject) => {
               const isSubjectExpanded = expandedSubject === subject.id;
               return (
                 <View key={subject.id} className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800 mb-4 overflow-hidden">
                   <TouchableOpacity 
                     onPress={() => setExpandedSubject(isSubjectExpanded ? null : subject.id)}
                     className="p-5 flex-row justify-between items-center bg-slate-50 dark:bg-slate-800/50"
                   >
                     <View className="flex-row items-center flex-1">
                       <Layers size={20} color="#10b981" className="mr-3" />
                       <Text className="text-lg font-bold text-slate-800 dark:text-slate-100 flex-1">{subject.name}</Text>
                     </View>
                     {isSubjectExpanded ? <ChevronDown size={20} color="#94a3b8" /> : <ChevronRight size={20} color="#94a3b8" />}
                   </TouchableOpacity>

                   {isSubjectExpanded && (
                     <View className="p-4 border-t border-slate-100 dark:border-slate-800">
                       <View className="flex-row justify-end mb-4">
                         <TouchableOpacity 
                           onPress={() => { setCurrentSubject(subject); setCurrentTopic(null); setNewTopicName(""); setIsTopicDialogOpen(true); }}
                           className="flex-row items-center bg-indigo-50 dark:bg-indigo-900/30 px-3 py-1.5 rounded-lg"
                         >
                           <Plus size={14} color="#4f46e5" className="mr-1" />
                           <Text className="text-xs font-bold text-indigo-600 dark:text-indigo-400">Konu Ekle</Text>
                         </TouchableOpacity>
                       </View>

                       {(subject.topics || []).length === 0 ? (
                         <Text className="text-slate-400 text-sm text-center italic py-2">Konu bulunmuyor.</Text>
                       ) : (
                         subject.topics.map((topic) => {
                           const isTopicExpanded = expandedTopic === topic.id;
                           const topicTests = tests.filter(t => t.topicId === topic.id);
                           return (
                             <View key={topic.id} className="mb-3 border border-slate-100 dark:border-slate-800 rounded-2xl overflow-hidden">
                               <TouchableOpacity 
                                 onPress={() => setExpandedTopic(isTopicExpanded ? null : topic.id)}
                                 className="p-4 flex-row justify-between items-center bg-slate-50/50 dark:bg-slate-900/50"
                               >
                                 <Text className="font-bold text-slate-700 dark:text-slate-300 flex-1">{topic.name}</Text>
                                 <View className="flex-row items-center">
                                   <Text className="text-xs text-slate-400 mr-2">{topicTests.length} Test</Text>
                                   {isTopicExpanded ? <ChevronDown size={16} color="#94a3b8" /> : <ChevronRight size={16} color="#94a3b8" />}
                                 </View>
                               </TouchableOpacity>

                               {isTopicExpanded && (
                                 <View className="p-3 bg-white dark:bg-slate-950 border-t border-slate-100 dark:border-slate-800">
                                   <View className="flex-row gap-2 mb-3">
                                      <TouchableOpacity onPress={() => openTestDialog(subject, topic)} className="flex-1 flex-row items-center justify-center bg-emerald-100 dark:bg-emerald-900/30 py-2 rounded-xl">
                                        <ListPlus size={16} color="#10b981" className="mr-1" />
                                        <Text className="text-xs font-bold text-emerald-700 dark:text-emerald-400">Test Ekle</Text>
                                      </TouchableOpacity>
                                      <TouchableOpacity onPress={() => { setCurrentSubject(subject); setCurrentTopic(topic); setIsBulkTestDialogOpen(true); }} className="flex-1 flex-row items-center justify-center bg-blue-100 dark:bg-blue-900/30 py-2 rounded-xl">
                                        <CopyPlus size={16} color="#3b82f6" className="mr-1" />
                                        <Text className="text-xs font-bold text-blue-700 dark:text-blue-400">Toplu Ekle</Text>
                                      </TouchableOpacity>
                                   </View>

                                   {topicTests.length === 0 ? (
                                     <Text className="text-slate-400 text-xs text-center italic py-2">Test bulunmuyor.</Text>
                                   ) : (
                                     topicTests.map(test => {
                                       const assignedTest = allAssignedTests.find(t => t.sourceId === test.id);
                                       let statusDisplay = null;
                                       if (assignedTest) {
                                         if (assignedTest.status === 'Sonuçlandı') {
                                           const rate = assignedTest.score !== undefined ? assignedTest.score : (assignedTest.questionCount ? Math.round(((assignedTest.correctAnswers || 0) / assignedTest.questionCount) * 100) : 0);
                                           statusDisplay = <Text className="text-[10px] font-bold text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-full">% {rate} Başarı</Text>;
                                         } else if (assignedTest.status === 'Değerlendirme Bekliyor') {
                                           statusDisplay = <Text className="text-[10px] font-bold text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full">Bekliyor</Text>;
                                         } else {
                                           statusDisplay = <Text className="text-[10px] font-bold text-indigo-600 bg-indigo-100 px-2 py-0.5 rounded-full">Atandı</Text>;
                                         }
                                       }

                                       return (
                                           <TouchableOpacity 
                                             key={test.id} 
                                             onPress={() => isSelectionMode ? toggleTestSelection(test, subject, topic) : null}
                                             activeOpacity={isSelectionMode ? 0.7 : 1}
                                             className={`flex-row items-center justify-between p-3 rounded-xl mb-2 ${
                                              isSelectionMode && selectedTests.find(t => t.test.id === test.id) 
                                                ? 'bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-800'
                                                : 'bg-slate-50 dark:bg-slate-900 border border-transparent'
                                             }`}
                                           >
                                             {isSelectionMode && (
                                              <View className="mr-3">
                                                {selectedTests.find(t => t.test.id === test.id) ? (
                                                  <CheckSquare size={20} color="#4f46e5" />
                                                ) : (
                                                  <Square size={20} color="#94a3b8" />
                                                )}
                                              </View>
                                             )}
                                             <View className="flex-1">
                                               <Text className="font-bold text-slate-800 dark:text-slate-200">{test.name}</Text>
                                               <View className="flex-row items-center mt-1 gap-2">
                                                 <Text className="text-[10px] text-slate-500">{test.questionCount} Soru</Text>
                                                 {statusDisplay}
                                               </View>
                                               <View className="flex-row items-center gap-2">
                                                 <TouchableOpacity onPress={() => router.push({ pathname: '/book-test-solver', params: { bookId: book.id, subjectId: subject.id, topicId: topic.id, testId: test.id } })} className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/30 items-center justify-center">
                                                   <Play size={14} color="#10b981" />
                                                 </TouchableOpacity>
                                                 <TouchableOpacity onPress={() => openTestDialog(subject, topic, test)} className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/30 items-center justify-center">
                                                   <PenTool size={14} color="#4f46e5" />
                                                 </TouchableOpacity>
                                                 <TouchableOpacity onPress={() => handleDeleteTest(test.id)} className="w-8 h-8 rounded-full bg-rose-100 dark:bg-rose-900/30 items-center justify-center">
                                                   <Trash2 size={14} color="#e11d48" />
                                                 </TouchableOpacity>
                                               </View>
                                             </View>
                                           </TouchableOpacity>
                                       );
                                     })
                                   )}
                                 </View>
                               )}
                             </View>
                           );
                         })
                       )}
                     </View>
                   )}
                 </View>
               );
             })
           )}
           </View>
         ) : (
           /* Mistake Analysis View */
           <View className="mb-10">
             <View className="bg-white dark:bg-slate-900 rounded-3xl p-5 mb-6 shadow-sm border border-slate-100 dark:border-slate-800">
                <View className="flex-row justify-between items-start mb-3">
                  <Text className="text-slate-800 dark:text-slate-200 font-bold">Filtrele</Text>
                  {filteredMistakes.length > 0 && (
                    <TouchableOpacity onPress={handleDownloadMistakes} className="flex-row items-center bg-indigo-50 dark:bg-indigo-900/30 px-3 py-1.5 rounded-lg border border-indigo-100 dark:border-indigo-800">
                      <Download size={14} color="#4f46e5" className="mr-1" />
                      <Text className="text-indigo-600 dark:text-indigo-400 font-bold text-xs">Tabloyu Paylaş</Text>
                    </TouchableOpacity>
                  )}
                </View>
                
                <View className="mb-4">
                  <Text className="text-xs text-slate-500 mb-1">Ders Seç</Text>
                  <View className="flex-row flex-wrap gap-2">
                    <TouchableOpacity onPress={() => setMistakeFilterSubject('all')} className={`px-3 py-1.5 rounded-lg border ${mistakeFilterSubject === 'all' ? 'bg-indigo-100 border-indigo-200 dark:bg-indigo-900/40 dark:border-indigo-800' : 'bg-slate-50 border-slate-200 dark:bg-slate-800 dark:border-slate-700'}`}>
                      <Text className={`text-xs ${mistakeFilterSubject === 'all' ? 'text-indigo-700 dark:text-indigo-300 font-bold' : 'text-slate-600 dark:text-slate-400'}`}>Tümü</Text>
                    </TouchableOpacity>
                    {subjectOptions.map(sub => (
                      <TouchableOpacity key={sub} onPress={() => setMistakeFilterSubject(sub)} className={`px-3 py-1.5 rounded-lg border ${mistakeFilterSubject === sub ? 'bg-indigo-100 border-indigo-200 dark:bg-indigo-900/40 dark:border-indigo-800' : 'bg-slate-50 border-slate-200 dark:bg-slate-800 dark:border-slate-700'}`}>
                        <Text className={`text-xs ${mistakeFilterSubject === sub ? 'text-indigo-700 dark:text-indigo-300 font-bold' : 'text-slate-600 dark:text-slate-400'}`}>{sub}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {mistakeFilterSubject !== 'all' && topicOptions.length > 0 && (
                  <View>
                    <Text className="text-xs text-slate-500 mb-1">Konu Seç</Text>
                    <View className="flex-row flex-wrap gap-2">
                      <TouchableOpacity onPress={() => setMistakeFilterTopic('all')} className={`px-3 py-1.5 rounded-lg border ${mistakeFilterTopic === 'all' ? 'bg-indigo-100 border-indigo-200 dark:bg-indigo-900/40 dark:border-indigo-800' : 'bg-slate-50 border-slate-200 dark:bg-slate-800 dark:border-slate-700'}`}>
                        <Text className={`text-xs ${mistakeFilterTopic === 'all' ? 'text-indigo-700 dark:text-indigo-300 font-bold' : 'text-slate-600 dark:text-slate-400'}`}>Tümü</Text>
                      </TouchableOpacity>
                      {topicOptions.map(top => (
                        <TouchableOpacity key={top} onPress={() => setMistakeFilterTopic(top)} className={`px-3 py-1.5 rounded-lg border ${mistakeFilterTopic === top ? 'bg-indigo-100 border-indigo-200 dark:bg-indigo-900/40 dark:border-indigo-800' : 'bg-slate-50 border-slate-200 dark:bg-slate-800 dark:border-slate-700'}`}>
                          <Text className={`text-xs ${mistakeFilterTopic === top ? 'text-indigo-700 dark:text-indigo-300 font-bold' : 'text-slate-600 dark:text-slate-400'}`}>{top}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                )}
             </View>

             <View className="bg-white dark:bg-slate-900 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800">
               {filteredMistakes.length === 0 ? (
                 <View className="bg-emerald-50 dark:bg-emerald-900/20 p-6 items-center justify-center">
                    <AlertTriangle size={32} color="#10b981" className="mb-3" />
                    <Text className="text-emerald-700 dark:text-emerald-400 font-bold text-center">Harika!</Text>
                    <Text className="text-emerald-600/80 dark:text-emerald-400/80 text-center text-sm mt-1">Seçili filtrede hiç yanlış bulunmuyor.</Text>
                 </View>
               ) : (
                 <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                   <View>
                     {/* Table Header */}
                     <View className="flex-row bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 px-4 py-3">
                       <Text className="w-24 font-bold text-slate-500 text-xs">Ders</Text>
                       <Text className="w-32 font-bold text-slate-500 text-xs">Konu</Text>
                       <Text className="w-32 font-bold text-slate-500 text-xs">Test Adı</Text>
                       <Text className="w-16 font-bold text-slate-500 text-xs text-center">Soru No</Text>
                     </View>
                     {/* Table Rows */}
                     {filteredMistakes.map((mistake, idx) => (
                       <View key={idx} className={`flex-row px-4 py-4 border-b border-slate-100 dark:border-slate-800/50 ${idx % 2 === 0 ? 'bg-white dark:bg-slate-900' : 'bg-slate-50/50 dark:bg-slate-900/50'}`}>
                         <Text className="w-24 text-slate-600 dark:text-slate-300 text-xs" numberOfLines={2}>{mistake.subjectName}</Text>
                         <Text className="w-32 text-indigo-500 dark:text-indigo-400 font-medium text-xs" numberOfLines={2}>{mistake.topicName}</Text>
                         <Text className="w-32 text-slate-500 dark:text-slate-400 text-xs" numberOfLines={2}>{mistake.testDefinition.name}</Text>
                         <Text className="w-16 font-bold text-rose-500 text-center text-xs">{mistake.questionNumber}</Text>
                       </View>
                     ))}
                   </View>
                 </ScrollView>
               )}
             </View>
           </View>
         )}

         <View className="h-10"></View>
      </ScrollView>

      {/* Modals */}
      
      {/* JSON Import Modal */}
      <Modal visible={isImportModalOpen} transparent animationType="slide">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1 bg-black/50 justify-end">
          <View className="bg-white dark:bg-slate-900 rounded-t-3xl p-6 min-h-[50%]">
            <View className="flex-row justify-between items-center mb-4">
               <Text className="text-xl font-bold text-slate-900 dark:text-white flex-row items-center">
                  <FileJson size={24} color="#4f46e5" className="mr-2" /> JSON'dan İçe Aktar
               </Text>
               <TouchableOpacity onPress={() => setIsImportModalOpen(false)} className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 items-center justify-center">
                 <X size={20} color="#64748b" />
               </TouchableOpacity>
            </View>
            <Text className="text-sm text-slate-500 mb-4">Müfredatı (Dersler, Konular, Testler ve Cevap Anahtarları) JSON formatında yapıştırarak anında içeri aktarabilirsiniz.</Text>
            
            <TouchableOpacity 
              onPress={() => {
                const sample = {
                  subjects: [
                    {
                      name: "Matematik",
                      topics: [
                        {
                          name: "Üslü Sayılar",
                          tests: [
                            {
                              name: "Test 1",
                              questionCount: 10,
                              answerKey: { "1": "A", "2": "B", "3": "C", "4": "D", "5": "E", "6": "A", "7": "B", "8": "C", "9": "D", "10": "E" }
                            }
                          ]
                        }
                      ]
                    }
                  ]
                };
                setJsonInput(JSON.stringify(sample, null, 2));
              }}
              className="bg-indigo-50 dark:bg-indigo-900/30 p-3 rounded-xl mb-4 border border-indigo-100 dark:border-indigo-800 flex-row items-center justify-center"
            >
              <CopyPlus size={16} color="#4f46e5" className="mr-2" />
              <Text className="text-indigo-600 dark:text-indigo-400 font-bold text-sm">Örnek Şablon Yükle</Text>
            </TouchableOpacity>

            <TextInput
              multiline
              textAlignVertical="top"
              placeholder='{ "subjects": [ ... ] }'
              placeholderTextColor="#94a3b8"
              value={jsonInput}
              onChangeText={setJsonInput}
              className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 text-slate-800 dark:text-white h-48 mb-6 font-mono text-xs"
            />
            
            <TouchableOpacity onPress={handleImportJson} disabled={isSubmitting || !jsonInput.trim()} className={`py-4 rounded-xl items-center ${isSubmitting || !jsonInput.trim() ? 'bg-indigo-300' : 'bg-indigo-600'}`}>
              {isSubmitting ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text className="font-bold text-white text-lg">Verileri Aktar</Text>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Subject Modal */}
      <Modal visible={isSubjectDialogOpen} transparent animationType="fade">
        <View className="flex-1 bg-black/50 justify-center p-4">
          <View className="bg-white dark:bg-slate-900 rounded-3xl p-6">
            <Text className="text-lg font-bold text-slate-900 dark:text-white mb-4">Ders Ekle</Text>
            <TextInput
              placeholder="Örn: Matematik"
              placeholderTextColor="#94a3b8"
              value={newSubjectName}
              onChangeText={setNewSubjectName}
              className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-slate-800 dark:text-white mb-6"
            />
            <View className="flex-row gap-3">
              <TouchableOpacity onPress={() => setIsSubjectDialogOpen(false)} className="flex-1 py-3 rounded-xl items-center bg-slate-100 dark:bg-slate-800">
                <Text className="font-bold text-slate-600 dark:text-slate-300">İptal</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleSubjectSave} disabled={isSubmitting} className="flex-1 py-3 rounded-xl items-center bg-emerald-600">
                <Text className="font-bold text-white">Kaydet</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Topic Modal */}
      <Modal visible={isTopicDialogOpen} transparent animationType="fade">
        <View className="flex-1 bg-black/50 justify-center p-4">
          <View className="bg-white dark:bg-slate-900 rounded-3xl p-6">
            <Text className="text-lg font-bold text-slate-900 dark:text-white mb-4">Konu Ekle</Text>
            <TextInput
              placeholder="Örn: Üslü Sayılar"
              placeholderTextColor="#94a3b8"
              value={newTopicName}
              onChangeText={setNewTopicName}
              className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-slate-800 dark:text-white mb-6"
            />
            <View className="flex-row gap-3">
              <TouchableOpacity onPress={() => setIsTopicDialogOpen(false)} className="flex-1 py-3 rounded-xl items-center bg-slate-100 dark:bg-slate-800">
                <Text className="font-bold text-slate-600 dark:text-slate-300">İptal</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleTopicSave} disabled={isSubmitting} className="flex-1 py-3 rounded-xl items-center bg-emerald-600">
                <Text className="font-bold text-white">Kaydet</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Bulk Test Modal */}
      <Modal visible={isBulkTestDialogOpen} transparent animationType="fade">
        <View className="flex-1 bg-black/50 justify-center p-4">
          <View className="bg-white dark:bg-slate-900 rounded-3xl p-6">
            <Text className="text-lg font-bold text-slate-900 dark:text-white mb-4">Toplu Test Ekle</Text>
            
            <Text className="text-xs font-bold text-slate-500 mb-2">Test Öneki</Text>
            <TextInput
              value={bulkTestFormData.prefix}
              onChangeText={t => setBulkTestFormData(p => ({...p, prefix: t}))}
              className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-slate-800 dark:text-white mb-4"
            />
            
            <View className="flex-row gap-4 mb-6">
              <View className="flex-1">
                <Text className="text-xs font-bold text-slate-500 mb-2">Kaç Adet Test?</Text>
                <TextInput
                  value={bulkTestFormData.count}
                  onChangeText={t => setBulkTestFormData(p => ({...p, count: t}))}
                  keyboardType="numeric"
                  className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-slate-800 dark:text-white"
                />
              </View>
              <View className="flex-1">
                <Text className="text-xs font-bold text-slate-500 mb-2">Soru Sayısı</Text>
                <TextInput
                  value={bulkTestFormData.questionCount}
                  onChangeText={t => setBulkTestFormData(p => ({...p, questionCount: t}))}
                  keyboardType="numeric"
                  className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-slate-800 dark:text-white"
                />
              </View>
            </View>

            <View className="flex-row gap-3">
              <TouchableOpacity onPress={() => setIsBulkTestDialogOpen(false)} className="flex-1 py-3 rounded-xl items-center bg-slate-100 dark:bg-slate-800">
                <Text className="font-bold text-slate-600 dark:text-slate-300">İptal</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleBulkTestSave} disabled={isSubmitting} className="flex-1 py-3 rounded-xl items-center bg-blue-600">
                <Text className="font-bold text-white">Ekle</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Single Test & Answer Key Modal */}
      <Modal visible={isTestDialogOpen} transparent animationType="slide">
        <View className="flex-1 bg-black/60 pt-20">
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1">
            <View className="flex-1 bg-white dark:bg-slate-900 rounded-t-3xl shadow-2xl border-t border-slate-200 dark:border-slate-800 overflow-hidden">
              <View className="p-4 border-b border-slate-200 dark:border-slate-800 flex-row justify-between items-center bg-slate-50 dark:bg-slate-950">
                <View>
                  <Text className="text-lg font-bold text-slate-900 dark:text-white">{currentTest ? 'Testi Düzenle' : 'Test Ekle'}</Text>
                  <Text className="text-xs text-slate-500">{currentTopic?.name}</Text>
                </View>
                <View className="flex-row items-center gap-2">
                  <TouchableOpacity onPress={() => setIsTestDialogOpen(false)} className="bg-slate-200 dark:bg-slate-800 px-3 py-2 rounded-xl">
                    <X size={18} color="#64748b" />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={handleTestSave} disabled={isSubmitting} className="bg-emerald-600 px-4 py-2 rounded-xl">
                    <Text className="font-bold text-white text-xs">Kaydet</Text>
                  </TouchableOpacity>
                </View>
              </View>
              
              <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 60 }} showsVerticalScrollIndicator={false}>
                <View className="flex-row gap-4 mb-6">
                  <View className="flex-[2]">
                    <Text className="text-xs font-bold text-slate-500 mb-2">Test Adı</Text>
                    <TextInput
                      value={testFormData.name}
                      onChangeText={t => setTestFormData(p => ({...p, name: t}))}
                      placeholder="Örn: Test 1"
                      className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-slate-800 dark:text-white"
                    />
                  </View>
                  <View className="flex-1">
                    <Text className="text-xs font-bold text-slate-500 mb-2">Soru Sayısı</Text>
                    <TextInput
                      value={testFormData.questionCount}
                      onChangeText={t => setTestFormData(p => ({...p, questionCount: t}))}
                      keyboardType="numeric"
                      className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-slate-800 dark:text-white"
                    />
                  </View>
                </View>

                {/* Bulk Entry */}
                <View className="mb-6 bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
                  <Text className="text-xs font-bold text-slate-500 mb-2">Hızlı Toplu Giriş (Cevap Anahtarı Yapıştır)</Text>
                  <TextInput
                    placeholder="Örn: ABADCBE..."
                    placeholderTextColor="#94a3b8"
                    value={bulkText}
                    onChangeText={handleBulkKeyEntry}
                    autoCapitalize="characters"
                    className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-slate-800 dark:text-white font-semibold text-sm tracking-widest"
                  />
                </View>

                {/* Individual Answer Inputs */}
                <View className="flex-row flex-wrap justify-between gap-y-4">
                  {Array.from({length: parseInt(testFormData.questionCount) || 20}).map((_, idx) => {
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
                                  isActive ? 'bg-emerald-600' : 'bg-slate-200 dark:bg-slate-800'
                                }`}
                              >
                                <Text className={`text-[10px] font-bold ${isActive ? 'text-white' : 'text-slate-600 dark:text-slate-400'}`}>{opt}</Text>
                              </TouchableOpacity>
                            );
                          })}
                        </View>
                      </View>
                    );
                  })}
                </View>
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* Bottom Bar for Selection Mode */}
      {isSelectionMode && selectedTests.length > 0 && (
        <View className="absolute bottom-6 left-4 right-4 bg-slate-900 dark:bg-slate-800 p-4 rounded-3xl shadow-2xl flex-row items-center justify-between border border-slate-700">
          <View>
            <Text className="text-white font-bold">{selectedTests.length} test seçildi</Text>
            <Text className="text-slate-400 text-xs mt-1">Öğrenciye atamaya hazır</Text>
          </View>
          <TouchableOpacity 
            onPress={() => setIsAssignmentModalOpen(true)}
            className="bg-indigo-500 px-5 py-3 rounded-2xl flex-row items-center"
          >
            <UserCheck size={18} color="white" className="mr-2" />
            <Text className="text-white font-bold text-sm">Ödev Ata</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Assignment Modal */}
      <Modal visible={isAssignmentModalOpen} transparent animationType="slide">
        <View className="flex-1 bg-black/60 justify-end">
          <View className="bg-white dark:bg-slate-900 rounded-t-3xl p-6 min-h-[50%]">
            <View className="flex-row justify-between items-center mb-6">
              <Text className="text-xl font-bold text-slate-900 dark:text-white">Ödev Ata</Text>
              <TouchableOpacity onPress={() => setIsAssignmentModalOpen(false)} className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 items-center justify-center">
                <X size={20} color="#64748b" />
              </TouchableOpacity>
            </View>

            <Text className="text-sm font-bold text-slate-500 mb-3">Öğrenci Seçin</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-6">
              {familyMembers.map(member => (
                <TouchableOpacity 
                  key={member.id}
                  onPress={() => setAssignmentStudentId(member.id)}
                  className={`mr-3 px-4 py-3 rounded-2xl border ${assignmentStudentId === member.id ? 'bg-indigo-50 border-indigo-200 dark:bg-indigo-900/40 dark:border-indigo-800' : 'bg-slate-50 border-slate-200 dark:bg-slate-800 dark:border-slate-700'}`}
                >
                  <Text className={`font-bold ${assignmentStudentId === member.id ? 'text-indigo-700 dark:text-indigo-300' : 'text-slate-700 dark:text-slate-300'}`}>{member.name}</Text>
                  <Text className="text-[10px] text-slate-500 mt-1">{member.role}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text className="text-sm font-bold text-slate-500 mb-3">Son Teslim Tarihi (İsteğe Bağlı)</Text>
            <TouchableOpacity 
              onPress={() => setShowDatePicker(true)}
              className="flex-row items-center justify-between bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-4 mb-8"
            >
              <View className="flex-row items-center">
                <Calendar size={20} color="#64748b" className="mr-3" />
                <Text className={assignmentDueDate ? "text-slate-800 dark:text-white font-medium" : "text-slate-400 font-medium"}>
                  {assignmentDueDate ? format(assignmentDueDate, 'dd MMMM yyyy, EEEE', { locale: tr }) : 'Tarih Seçilmedi'}
                </Text>
              </View>
              {assignmentDueDate && (
                <TouchableOpacity onPress={() => setAssignmentDueDate(null)} className="bg-slate-200 dark:bg-slate-800 rounded-full p-1">
                  <X size={14} color="#64748b" />
                </TouchableOpacity>
              )}
            </TouchableOpacity>

            {showDatePicker && (
              <DateTimePicker
                value={assignmentDueDate || new Date()}
                mode="date"
                display="default"
                minimumDate={new Date()}
                onChange={(event, date) => {
                  setShowDatePicker(false);
                  if (date) setAssignmentDueDate(date);
                }}
              />
            )}

            <TouchableOpacity 
              onPress={handleAssignSelected}
              disabled={isSubmitting || !assignmentStudentId}
              className={`py-4 rounded-2xl items-center ${isSubmitting || !assignmentStudentId ? 'bg-indigo-300 dark:bg-indigo-800' : 'bg-indigo-600'}`}
            >
              {isSubmitting ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text className="font-bold text-white text-lg">Ödevleri Ata ({selectedTests.length} Test)</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}
