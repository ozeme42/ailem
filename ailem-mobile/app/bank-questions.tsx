import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Modal,
  Image,
  Alert,
  Platform,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useEffect, useState, useMemo } from 'react';
import { useRouter, Stack } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import {
  Folder,
  FolderOpen,
  LayoutGrid,
  ChevronRight,
  Trash2,
  Edit3,
  Plus,
  Image as ImageIcon,
  Check,
  X,
  Search,
  Database,
  ArrowLeft,
  Send,
  HelpCircle,
  AlertCircle,
  FileQuestion,
  Calendar,
  Clock,
  User,
} from 'lucide-react-native';
import {
  onBankQuestionsUpdate,
  onMistakesUpdate,
  addBankQuestion,
  updateBankQuestion,
  deleteBankQuestion,
  deleteBulkBankQuestions,
  deleteMistake,
  addTest,
  uploadImageToStorage,
  onSubjectsUpdate,
  onTopicsUpdate,
  updateSubjects,
  updateTopics,
} from '../lib/dataService';
import { BankQuestion, Mistake, FamilyMember } from '../lib/data';
import { useAuth } from '../context/auth-context';
import { useColorScheme } from 'nativewind';

const { width } = Dimensions.get('window');

export default function BankQuestionsScreen() {
  const router = useRouter();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const { familyMembers, familyId } = useAuth();

  // Data State
  const [bankQuestions, setBankQuestions] = useState<BankQuestion[]>([]);
  const [mistakes, setMistakes] = useState<Mistake[]>([]);
  const [allSubjects, setAllSubjects] = useState<string[]>([]);
  const [allTopics, setAllTopics] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // Tabs & Views
  const [activeTab, setActiveTab] = useState<'bank' | 'mistakes'>('bank');
  const [activeSubTab, setActiveSubTab] = useState<'mcq' | 'open_ended'>('mcq');
  const [viewLayout, setViewLayout] = useState<'folder' | 'grid'>('folder');
  const [searchQuery, setSearchQuery] = useState('');

  // Folder Path
  const [currentFolder, setCurrentFolder] = useState<{
    subject: string | null;
    topic: string | null;
  }>({ subject: null, topic: null });

  // Selection
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Modals & Previews
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);

  // Edit / Form Fields
  const [editingQuestion, setEditingQuestion] = useState<BankQuestion | null>(null);
  const [formSubject, setFormSubject] = useState('');
  const [formTopic, setFormTopic] = useState('');
  const [formType, setFormType] = useState<'mcq' | 'open_ended'>('mcq');
  const [formImageUri, setFormImageUri] = useState<string | null>(null);
  const [formTitle, setFormTitle] = useState('');
  const [formCorrectAnswer, setFormCorrectAnswer] = useState('A');
  const [formOptions, setFormOptions] = useState<Record<string, string>>({
    A: '',
    B: '',
    C: '',
    D: '',
  });

  // Assign Homework Fields
  const [assignTitle, setAssignTitle] = useState('');
  const [assignDuration, setAssignDuration] = useState('40');
  const [assignDays, setAssignDays] = useState('7');
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);

  useEffect(() => {
    setLoading(true);
    const unsubQuestions = onBankQuestionsUpdate((questions) => {
      setBankQuestions(questions);
      setLoading(false);
    });
    const unsubMistakes = onMistakesUpdate((data) => {
      setMistakes(data);
    });
    const unsubSubjects = onSubjectsUpdate(setAllSubjects);
    const unsubTopics = onTopicsUpdate(setAllTopics);

    return () => {
      unsubQuestions();
      unsubMistakes();
      unsubSubjects();
      unsubTopics();
    };
  }, []);

  // Filter children for assignments
  const childMembers = useMemo(() => {
    return familyMembers.filter(
      (m) => m.role && m.role !== 'Anne' && m.role !== 'Baba'
    );
  }, [familyMembers]);

  // Combined data list based on main tab and sub tab
  const activeDataList = useMemo(() => {
    const list = activeTab === 'bank' ? bankQuestions : mistakes;
    return list.filter((item) => (item.type || 'mcq') === activeSubTab);
  }, [bankQuestions, mistakes, activeTab, activeSubTab]);

  // Stats for folders
  const folderStats = useMemo(() => {
    const query = searchQuery.toLowerCase();
    const baseFiltered = activeDataList.filter((item) => {
      const titleText = ((item as any).title || (item as any).originalFilename || '').toLowerCase();
      const matchSearch =
        !query ||
        titleText.includes(query) ||
        item.subject?.toLowerCase().includes(query) ||
        item.topic?.toLowerCase().includes(query);
      return matchSearch;
    });

    const subjects: Record<string, { count: number; topics: Record<string, any[]> }> = {};
    baseFiltered.forEach((item) => {
      const sub = item.subject || 'Diğer';
      const top = item.topic || 'Genel';
      if (!subjects[sub]) {
        subjects[sub] = { count: 0, topics: {} };
      }
      subjects[sub].count += 1;
      if (!subjects[sub].topics[top]) {
        subjects[sub].topics[top] = [];
      }
      subjects[sub].topics[top].push(item);
    });

    return subjects;
  }, [activeDataList, searchQuery]);

  // Questions to display in grid view or active folder
  const displayedQuestions = useMemo(() => {
    if (viewLayout === 'grid') {
      const query = searchQuery.toLowerCase();
      return activeDataList.filter((item) => {
        const titleText = ((item as any).title || (item as any).originalFilename || '').toLowerCase();
        return (
          !query ||
          titleText.includes(query) ||
          item.subject?.toLowerCase().includes(query) ||
          item.topic?.toLowerCase().includes(query)
        );
      });
    }

    if (currentFolder.subject && currentFolder.topic) {
      return folderStats[currentFolder.subject]?.topics[currentFolder.topic] || [];
    }
    return [];
  }, [viewLayout, currentFolder, folderStats, activeDataList, searchQuery]);

  // Toggle selection
  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  // Image Picking
  const handlePickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('İzin Gerekli', 'Galeriye erişmek için izin vermelisiniz.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });
    if (!result.canceled) {
      setFormImageUri(result.assets[0].uri);
    }
  };

  // Form submit (Add / Edit)
  const handleSaveQuestion = async () => {
    if (!formSubject.trim() || !formTopic.trim()) {
      Alert.alert('Hata', 'Lütfen ders ve konu giriniz.');
      return;
    }
    if (!formImageUri && !editingQuestion) {
      Alert.alert('Hata', 'Lütfen bir soru görseli seçin.');
      return;
    }

    setLoading(true);
    try {
      let finalUrl = editingQuestion?.imageUrl || '';
      if (formImageUri && formImageUri !== editingQuestion?.imageUrl) {
        const response = await fetch(formImageUri);
        const blob = await response.blob();
        const path = `bankQuestions/${familyId}/${Date.now()}`;
        finalUrl = await uploadImageToStorage(blob as any, path);
      }

      // Add to unique subjects & topics
      if (!allSubjects.includes(formSubject.trim())) {
        await updateSubjects([...allSubjects, formSubject.trim()]);
      }
      if (!allTopics.includes(formTopic.trim())) {
        await updateTopics([...allTopics, formTopic.trim()]);
      }

      const questionData: Partial<BankQuestion> = {
        subject: formSubject.trim(),
        topic: formTopic.trim(),
        type: formType,
        imageUrl: finalUrl,
        title: formTitle.trim(),
        correctAnswer: formType === 'mcq' ? formCorrectAnswer : '',
        options: formType === 'mcq' ? formOptions : {},
      };

      if (editingQuestion) {
        await updateBankQuestion(editingQuestion.id, questionData);
        Alert.alert('Başarılı', 'Soru güncellendi.');
      } else {
        await addBankQuestion(questionData);
        Alert.alert('Başarılı', 'Soru bankasına eklendi.');
      }

      setFormOpen(false);
      setEditingQuestion(null);
    } catch (e) {
      console.error(e);
      Alert.alert('Hata', 'Soru kaydedilemedi.');
    } finally {
      setLoading(false);
    }
  };

  // Delete Action
  const handleDeleteSelected = () => {
    const performDelete = async () => {
      setLoading(true);
      try {
        if (activeTab === 'bank') {
          await deleteBulkBankQuestions(selectedIds);
        } else {
          for (const id of selectedIds) {
            await deleteMistake(id);
          }
        }
        Alert.alert('Başarılı', 'Seçilenler silindi.');
        setSelectedIds([]);
      } catch (e) {
        Alert.alert('Hata', 'Silme işlemi gerçekleştirilemedi.');
      } finally {
        setLoading(false);
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm('Seçilen soruları silmek istediğinize emin misiniz?')) {
        performDelete();
      }
    } else {
      Alert.alert('Kayıtları Sil', 'Seçilen sorular kalıcı olarak silinecektir.', [
        { text: 'İptal', style: 'cancel' },
        { text: 'Sil', style: 'destructive', onPress: performDelete },
      ]);
    }
  };

  // Open Edit Form
  const openEditForm = (q: BankQuestion) => {
    setEditingQuestion(q);
    setFormSubject(q.subject || '');
    setFormTopic(q.topic || '');
    setFormType(q.type || 'mcq');
    setFormImageUri(q.imageUrl || null);
    setFormTitle(q.title || '');
    setFormCorrectAnswer(q.correctAnswer || 'A');
    setFormOptions(q.options || { A: '', B: '', C: '', D: '' });
    setFormOpen(true);
  };

  // Open Create Form
  const openCreateForm = () => {
    setEditingQuestion(null);
    setFormSubject(currentFolder.subject || '');
    setFormTopic(currentFolder.topic || '');
    setFormType(activeSubTab);
    setFormImageUri(null);
    setFormTitle('');
    setFormCorrectAnswer('A');
    setFormOptions({ A: '', B: '', C: '', D: '' });
    setFormOpen(true);
  };

  // Assign Homework
  const handleAssignHomework = async () => {
    if (!assignTitle.trim()) {
      Alert.alert('Hata', 'Lütfen ödev başlığı giriniz.');
      return;
    }
    if (selectedStudentIds.length === 0) {
      Alert.alert('Hata', 'Lütfen en az bir öğrenci seçin.');
      return;
    }

    setLoading(true);
    try {
      const source = activeTab === 'bank' ? bankQuestions : mistakes;
      const selectedItems = source.filter((q) => selectedIds.includes(q.id));
      const questionsForTest = selectedItems.map((item) => ({
        questionId: item.id,
        imageUrl: item.imageUrl!,
        type: item.type || 'mcq',
        correctAnswer: item.correctAnswer,
      }));

      const isTestOpenEnded = questionsForTest.some((q) => q.type === 'open_ended');
      const answerKey: Record<string, string> = {};
      if (!isTestOpenEnded) {
        questionsForTest.forEach((q, index) => {
          if (q.correctAnswer) {
            answerKey[(index + 1).toString()] = q.correctAnswer;
          }
        });
      }

      const now = new Date();
      const due = new Date();
      due.setDate(now.getDate() + parseInt(assignDays || '7'));

      const turkishMonths = [
        'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
        'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık',
      ];
      const formatDate = (date: Date) =>
        `${date.getDate()} ${turkishMonths[date.getMonth()]} ${date.getFullYear()}`;

      for (const studentId of selectedStudentIds) {
        const testData = {
          title: assignTitle.trim(),
          subject: selectedItems[0]?.subject || 'Karma',
          studentId,
          questionCount: selectedItems.length,
          durationMinutes: parseInt(assignDuration) || 40,
          assignedDate: formatDate(now),
          dueDate: formatDate(due),
          sourceType: activeTab,
          status: 'Atandı',
          isArchived: false,
          answerKey: isTestOpenEnded ? undefined : answerKey,
          openEnded: isTestOpenEnded,
        };
        await addTest(testData as any, questionsForTest as any);
      }

      Alert.alert('Başarılı', 'Ödev atandı.');
      setAssignOpen(false);
      setSelectedIds([]);
      setAssignTitle('');
      setSelectedStudentIds([]);
    } catch (e) {
      console.error(e);
      Alert.alert('Hata', 'Ödev atanırken bir sorun oluştu.');
    } finally {
      setLoading(false);
    }
  };

  // Breadcrumb action
  const handleBreadcrumb = (level: 'root' | 'subject' | 'topic') => {
    if (level === 'root') {
      setCurrentFolder({ subject: null, topic: null });
    } else if (level === 'subject') {
      setCurrentFolder((prev) => ({ ...prev, topic: null }));
    }
  };

  if (loading && bankQuestions.length === 0) {
    return (
      <SafeAreaView className="flex-1 justify-center items-center bg-slate-50 dark:bg-slate-950">
        <ActivityIndicator size="large" color="#6366f1" />
        <Text className="text-slate-500 font-semibold mt-3">Yükleniyor...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-slate-50 dark:bg-slate-950">
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <LinearGradient
        colors={['#4f46e5', '#6366f1'] as [string, string]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        className="px-5 pt-3 pb-5"
      >
        <View className="flex-row items-center justify-between">
          <TouchableOpacity
            onPress={() => router.back()}
            className="w-9 h-9 bg-white/20 rounded-full items-center justify-center"
          >
            <ArrowLeft size={20} color="white" />
          </TouchableOpacity>

          <View className="items-center">
            <Text className="text-white text-xl font-black">İçerik Havuzu</Text>
            <Text className="text-indigo-100 text-xs font-medium mt-0.5">
              Soru Bankası & Yanlış Havuzu
            </Text>
          </View>

          <TouchableOpacity
            onPress={openCreateForm}
            className="w-9 h-9 bg-white/20 rounded-full items-center justify-center"
          >
            <Plus size={20} color="white" />
          </TouchableOpacity>
        </View>

        {/* Tab Controls */}
        <View className="flex-row mt-4 bg-white/20 rounded-2xl p-1 gap-1">
          <TouchableOpacity
            onPress={() => {
              setActiveTab('bank');
              setCurrentFolder({ subject: null, topic: null });
            }}
            className={`flex-1 py-2.5 rounded-xl items-center justify-center ${
              activeTab === 'bank' ? 'bg-white' : ''
            }`}
          >
            <Text
              className={`text-xs font-black ${
                activeTab === 'bank' ? 'text-indigo-600' : 'text-white/80'
              }`}
            >
              Soru Bankası ({bankQuestions.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => {
              setActiveTab('mistakes');
              setCurrentFolder({ subject: null, topic: null });
            }}
            className={`flex-1 py-2.5 rounded-xl items-center justify-center ${
              activeTab === 'mistakes' ? 'bg-white' : ''
            }`}
          >
            <Text
              className={`text-xs font-black ${
                activeTab === 'mistakes' ? 'text-indigo-600' : 'text-white/80'
              }`}
            >
              Yanlış Havuzu ({mistakes.length})
            </Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* Sub Tabs & Filter Utilities */}
      <View className="bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 px-4 py-3 flex-row items-center justify-between gap-3">
        {/* MCQ vs Open Ended selector */}
        <View className="flex-row bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl gap-0.5">
          <TouchableOpacity
            onPress={() => {
              setActiveSubTab('mcq');
              setCurrentFolder({ subject: null, topic: null });
            }}
            className={`px-3 py-1.5 rounded-lg ${
              activeSubTab === 'mcq' ? 'bg-white dark:bg-slate-700 shadow-sm' : ''
            }`}
          >
            <Text className="text-[10px] font-bold text-slate-800 dark:text-slate-200">
              Çoktan Seçmeli
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => {
              setActiveSubTab('open_ended');
              setCurrentFolder({ subject: null, topic: null });
            }}
            className={`px-3 py-1.5 rounded-lg ${
              activeSubTab === 'open_ended' ? 'bg-white dark:bg-slate-700 shadow-sm' : ''
            }`}
          >
            <Text className="text-[10px] font-bold text-slate-800 dark:text-slate-200">Açık Uçlu</Text>
          </TouchableOpacity>
        </View>

        {/* Layout Switcher */}
        <View className="flex-row bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl gap-0.5">
          <TouchableOpacity
            onPress={() => setViewLayout('folder')}
            className={`p-1.5 rounded-lg ${viewLayout === 'folder' ? 'bg-white dark:bg-slate-700 shadow-sm' : ''}`}
          >
            <Folder size={14} color={viewLayout === 'folder' ? '#4f46e5' : '#64748b'} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setViewLayout('grid')}
            className={`p-1.5 rounded-lg ${viewLayout === 'grid' ? 'bg-white dark:bg-slate-700 shadow-sm' : ''}`}
          >
            <LayoutGrid size={14} color={viewLayout === 'grid' ? '#4f46e5' : '#64748b'} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Search Bar */}
      <View className="px-4 pt-3 bg-slate-50 dark:bg-slate-950">
        <View className="flex-row items-center gap-3 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl px-4 py-2.5 shadow-sm">
          <Search size={15} color="#94a3b8" />
          <TextInput
            placeholder="Soru, ders veya konu ara..."
            placeholderTextColor="#94a3b8"
            value={searchQuery}
            onChangeText={setSearchQuery}
            className="flex-1 text-sm font-semibold text-slate-850 dark:text-white p-0"
          />
          {searchQuery !== '' && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <X size={14} color="#94a3b8" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Main Content Area */}
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
        {/* Breadcrumbs for Folder layout */}
        {viewLayout === 'folder' && (
          <View className="flex-row flex-wrap items-center bg-slate-100 dark:bg-slate-900 px-3.5 py-2.5 rounded-2xl mb-4 gap-1 border border-slate-200/40 dark:border-slate-800">
            <TouchableOpacity onPress={() => handleBreadcrumb('root')} className="flex-row items-center">
              <Folder size={13} color="#6366f1" />
              <Text className="text-slate-600 dark:text-slate-350 text-xs font-bold ml-1">Havuz</Text>
            </TouchableOpacity>

            {currentFolder.subject && (
              <>
                <ChevronRight size={12} color="#94a3b8" />
                <TouchableOpacity onPress={() => handleBreadcrumb('subject')}>
                  <Text className={`text-xs font-bold ${!currentFolder.topic ? 'text-indigo-600' : 'text-slate-500'}`}>
                    {currentFolder.subject}
                  </Text>
                </TouchableOpacity>
              </>
            )}

            {currentFolder.topic && (
              <>
                <ChevronRight size={12} color="#94a3b8" />
                <Text className="text-indigo-600 text-xs font-bold truncate max-w-[150px]">
                  {currentFolder.topic}
                </Text>
              </>
            )}
          </View>
        )}

        {/* ── Folder View Rendering ── */}
        {viewLayout === 'folder' && !currentFolder.subject && (
          <View className="gap-3">
            {Object.keys(folderStats).length === 0 ? (
              <View className="items-center py-16">
                <FileQuestion size={40} color="#cbd5e1" />
                <Text className="text-slate-400 text-sm font-medium mt-2">Ders klasörü bulunamadı</Text>
              </View>
            ) : (
              Object.entries(folderStats).map(([subject, data]) => (
                <TouchableOpacity
                  key={subject}
                  onPress={() => setCurrentFolder({ subject, topic: null })}
                  className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-150 dark:border-slate-800 flex-row items-center justify-between shadow-sm"
                >
                  <View className="flex-row items-center gap-3.5">
                    <View className="w-12 h-12 bg-indigo-50 dark:bg-indigo-950/40 rounded-2xl items-center justify-center">
                      <Folder size={22} color="#6366f1" />
                    </View>
                    <View className="flex-1 max-w-[80%]">
                      <Text className="font-black text-slate-850 dark:text-white text-base truncate">{subject}</Text>
                      <Text className="text-slate-400 text-xs mt-0.5">
                        {data.count} Soru • {Object.keys(data.topics).length} Konu
                      </Text>
                    </View>
                  </View>
                  <ChevronRight size={18} color="#94a3b8" />
                </TouchableOpacity>
              ))
            )}
          </View>
        )}

        {viewLayout === 'folder' && currentFolder.subject && !currentFolder.topic && (
          <View className="gap-3">
            {Object.entries(folderStats[currentFolder.subject]?.topics || {}).map(([topic, items]) => (
              <TouchableOpacity
                key={topic}
                onPress={() => setCurrentFolder((prev) => ({ ...prev, topic }))}
                className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-150 dark:border-slate-800 flex-row items-center justify-between shadow-sm"
              >
                <View className="flex-row items-center gap-3.5">
                  <View className="w-12 h-12 bg-violet-50 dark:bg-violet-950/40 rounded-2xl items-center justify-center">
                    <FolderOpen size={22} color="#8b5cf6" />
                  </View>
                  <View className="flex-1 max-w-[80%]">
                    <Text className="font-black text-slate-850 dark:text-white text-base truncate">{topic}</Text>
                    <Text className="text-slate-400 text-xs mt-0.5">{items.length} Soru</Text>
                  </View>
                </View>
                <ChevronRight size={18} color="#94a3b8" />
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* ── Grid/Card and Folder Deep List View ── */}
        {(viewLayout === 'grid' || (currentFolder.subject && currentFolder.topic)) && (
          <View className="gap-3">
            {displayedQuestions.length === 0 ? (
              <View className="items-center py-16">
                <FileQuestion size={40} color="#cbd5e1" />
                <Text className="text-slate-400 text-sm font-medium mt-2">Soru bulunamadı</Text>
              </View>
            ) : (
              displayedQuestions.map((item) => {
                const isSelected = selectedIds.includes(item.id);
                return (
                  <TouchableOpacity
                    key={item.id}
                    onPress={() => handleToggleSelect(item.id)}
                    activeOpacity={0.9}
                    className={`bg-white dark:bg-slate-900 rounded-3xl overflow-hidden border shadow-sm flex-row items-center p-3 gap-3 ${
                      isSelected
                        ? 'border-indigo-500 bg-indigo-50/20 dark:bg-indigo-950/20'
                        : 'border-slate-100 dark:border-slate-800'
                    }`}
                  >
                    {/* Checkbox badge */}
                    <View className={`w-5 h-5 rounded-md border items-center justify-center ${
                      isSelected ? 'bg-indigo-600 border-indigo-600' : 'border-slate-350 bg-white dark:bg-slate-800'
                    }`}>
                      {isSelected && <Check size={12} color="white" strokeWidth={3} />}
                    </View>

                    {/* Question Image Preview */}
                    <TouchableOpacity
                      onPress={() => setImagePreview(item.imageUrl!)}
                      className="w-16 h-16 bg-slate-100 dark:bg-slate-850 rounded-2xl overflow-hidden border border-slate-200/60 dark:border-slate-800 items-center justify-center flex-shrink-0"
                    >
                      {item.imageUrl ? (
                        <Image source={{ uri: item.imageUrl }} className="w-full h-full" resizeMode="cover" />
                      ) : (
                        <FileQuestion size={18} color="#cbd5e1" />
                      )}
                    </TouchableOpacity>

                    {/* Details */}
                    <View className="flex-1">
                      <Text className="font-bold text-slate-850 dark:text-white text-sm" numberOfLines={1}>
                        {item.title || item.originalFilename || 'Soru'}
                      </Text>
                      <View className="flex-row flex-wrap items-center gap-1.5 mt-1.5">
                        <View className="bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded-md">
                          <Text className="text-indigo-600 dark:text-indigo-300 text-[10px] font-bold">
                            {item.subject}
                          </Text>
                        </View>
                        <View className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                          <Text className="text-slate-500 dark:text-slate-400 text-[10px] font-bold">
                            {item.topic}
                          </Text>
                        </View>
                      </View>
                    </View>

                    {/* Edit button */}
                    {activeTab === 'bank' && (
                      <TouchableOpacity
                        onPress={() => openEditForm(item as BankQuestion)}
                        className="w-8 h-8 bg-slate-100 dark:bg-slate-800 rounded-xl items-center justify-center"
                      >
                        <Edit3 size={13} color="#64748b" />
                      </TouchableOpacity>
                    )}
                  </TouchableOpacity>
                );
              })
            )}
          </View>
        )}
      </ScrollView>

      {/* ── Floating Actions Bottom Bar ── */}
      {selectedIds.length > 0 && (
        <View className="absolute bottom-5 left-4 right-4 bg-slate-900/95 dark:bg-slate-950/95 rounded-3xl p-4 flex-row items-center justify-between border border-slate-800/40 shadow-2xl">
          <View className="flex-row items-center gap-3">
            <View className="w-9 h-9 bg-indigo-600 rounded-xl items-center justify-center">
              <Text className="text-white font-black text-sm">{selectedIds.length}</Text>
            </View>
            <Text className="text-white text-xs font-bold">Soru Seçildi</Text>
          </View>

          <View className="flex-row gap-2">
            <TouchableOpacity
              onPress={() => setSelectedIds([])}
              className="px-4 py-2.5 rounded-2xl bg-white/10 active:bg-white/20"
            >
              <Text className="text-slate-300 font-bold text-xs">Vazgeç</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setAssignOpen(true)}
              className="px-4 py-2.5 rounded-2xl bg-indigo-600 active:bg-indigo-750 flex-row items-center gap-1.5"
            >
              <Send size={12} color="white" />
              <Text className="text-white font-bold text-xs">Ödev Ata</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleDeleteSelected}
              className="w-9 h-9 bg-rose-500/20 rounded-2xl items-center justify-center active:bg-rose-550/30"
            >
              <Trash2 size={15} color="#ef4444" />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* ── Image Lightbox Modal ── */}
      {imagePreview && (
        <Modal visible={true} transparent animationType="fade">
          <View className="flex-1 bg-black/95 justify-center items-center p-4">
            <TouchableOpacity
              onPress={() => setImagePreview(null)}
              className="absolute top-10 right-5 w-10 h-10 bg-white/10 rounded-full items-center justify-center"
            >
              <X size={20} color="white" />
            </TouchableOpacity>
            <Image source={{ uri: imagePreview }} className="w-full h-[70%]" resizeMode="contain" />
          </View>
        </Modal>
      )}

      {/* ── Create / Edit Form Modal ── */}
      <Modal visible={formOpen} animationType="slide" transparent>
        <View className="flex-1 justify-end" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <View className="bg-white dark:bg-slate-900 rounded-t-3xl p-5" style={{ maxHeight: '85%' }}>
            <View className="flex-row items-center justify-between mb-4">
              <Text className="text-lg font-black text-slate-900 dark:text-white">
                {editingQuestion ? 'Soruyu Düzenle' : 'Yeni Soru Ekle'}
              </Text>
              <TouchableOpacity
                onPress={() => setFormOpen(false)}
                className="w-8 h-8 bg-slate-100 dark:bg-slate-800 rounded-full items-center justify-center"
              >
                <X size={16} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} className="gap-3.5 pb-6">
              {/* Question Image Input */}
              <View>
                <Text className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Soru Görseli</Text>
                {formImageUri ? (
                  <View className="relative w-full h-40 bg-slate-100 dark:bg-slate-800 rounded-2xl overflow-hidden items-center justify-center border border-slate-200 dark:border-slate-700">
                    <Image source={{ uri: formImageUri }} className="w-full h-full" resizeMode="contain" />
                    <TouchableOpacity
                      onPress={() => setFormImageUri(null)}
                      className="absolute top-2 right-2 w-7 h-7 bg-red-650 rounded-full items-center justify-center bg-black/60"
                    >
                      <X size={14} color="white" />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity
                    onPress={handlePickImage}
                    className="w-full h-32 border-2 border-dashed border-slate-250 dark:border-slate-700 rounded-2xl items-center justify-center bg-slate-50 dark:bg-slate-850"
                  >
                    <ImageIcon size={28} color="#94a3b8" />
                    <Text className="text-slate-400 text-xs font-semibold mt-2">Görsel Seç</Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Title / Description */}
              <View>
                <Text className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Soru Başlığı (opsiyonel)</Text>
                <TextInput
                  value={formTitle}
                  onChangeText={setFormTitle}
                  placeholder="örn. Matematik Soru 5"
                  placeholderTextColor="#94a3b8"
                  className="bg-slate-100 dark:bg-slate-800 rounded-2xl px-4 py-3 text-sm font-semibold text-slate-900 dark:text-white"
                />
              </View>

              {/* Subject (Ders) */}
              <View>
                <Text className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Ders</Text>
                <TextInput
                  value={formSubject}
                  onChangeText={setFormSubject}
                  placeholder="örn. Matematik"
                  placeholderTextColor="#94a3b8"
                  className="bg-slate-100 dark:bg-slate-800 rounded-2xl px-4 py-3 text-sm font-semibold text-slate-900 dark:text-white"
                />
              </View>

              {/* Topic (Konu) */}
              <View>
                <Text className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Konu</Text>
                <TextInput
                  value={formTopic}
                  onChangeText={setFormTopic}
                  placeholder="örn. Üslü Sayılar"
                  placeholderTextColor="#94a3b8"
                  className="bg-slate-100 dark:bg-slate-800 rounded-2xl px-4 py-3 text-sm font-semibold text-slate-900 dark:text-white"
                />
              </View>

              {/* MCQ Details */}
              {formType === 'mcq' && (
                <View className="gap-3">
                  <Text className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-0.5">Seçenekler</Text>
                  {['A', 'B', 'C', 'D'].map((opt) => (
                    <View key={opt} className="flex-row items-center gap-2">
                      <TouchableOpacity
                        onPress={() => setFormCorrectAnswer(opt)}
                        className={`w-9 h-9 rounded-xl items-center justify-center border-2 ${
                          formCorrectAnswer === opt
                            ? 'bg-indigo-600 border-indigo-600'
                            : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800'
                        }`}
                      >
                        <Text
                          className={`font-black text-sm ${
                            formCorrectAnswer === opt ? 'text-white' : 'text-slate-600 dark:text-slate-400'
                          }`}
                        >
                          {opt}
                        </Text>
                      </TouchableOpacity>
                      <TextInput
                        value={formOptions[opt]}
                        onChangeText={(text) =>
                          setFormOptions((prev) => ({ ...prev, [opt]: text }))
                        }
                        placeholder={`Seçenek ${opt} içeriği (opsiyonel)`}
                        placeholderTextColor="#94a3b8"
                        className="flex-1 bg-slate-105 dark:bg-slate-800 rounded-2xl px-4 py-2.5 text-sm font-semibold text-slate-900 dark:text-white"
                      />
                    </View>
                  ))}
                </View>
              )}

              {/* Save Button */}
              <TouchableOpacity
                onPress={handleSaveQuestion}
                className="bg-indigo-600 rounded-2xl py-4 flex-row items-center justify-center gap-2 mt-4"
              >
                <Check size={18} color="white" />
                <Text className="text-white font-black text-base">
                  {editingQuestion ? 'Güncelle' : 'Soru Ekle'}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ── Assign Homework Modal ── */}
      <Modal visible={assignOpen} animationType="slide" transparent>
        <View className="flex-1 justify-end" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <View className="bg-white dark:bg-slate-900 rounded-t-3xl p-5">
            <View className="flex-row items-center justify-between mb-4">
              <Text className="text-lg font-black text-slate-900 dark:text-white">
                Ödev Ata ({selectedIds.length} Soru)
              </Text>
              <TouchableOpacity
                onPress={() => setAssignOpen(false)}
                className="w-8 h-8 bg-slate-100 dark:bg-slate-800 rounded-full items-center justify-center"
              >
                <X size={16} color="#64748b" />
              </TouchableOpacity>
            </View>

            <View className="gap-3.5 pb-6">
              {/* Title */}
              <View>
                <Text className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Ödev Başlığı</Text>
                <TextInput
                  value={assignTitle}
                  onChangeText={setAssignTitle}
                  placeholder="örn. Matematik Hafta Sonu Ödevi"
                  placeholderTextColor="#94a3b8"
                  className="bg-slate-100 dark:bg-slate-800 rounded-2xl px-4 py-3 text-sm font-semibold text-slate-900 dark:text-white"
                />
              </View>

              {/* Student Select */}
              <View>
                <Text className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Öğrenciler</Text>
                {childMembers.length === 0 ? (
                  <Text className="text-slate-400 text-xs italic">Kayıtlı çocuk üye bulunamadı.</Text>
                ) : (
                  <View className="flex-row flex-wrap gap-2">
                    {childMembers.map((member) => {
                      const isSel = selectedStudentIds.includes(member.id);
                      return (
                        <TouchableOpacity
                          key={member.id}
                          onPress={() =>
                            setSelectedStudentIds((prev) =>
                              prev.includes(member.id)
                                ? prev.filter((x) => x !== member.id)
                                : [...prev, member.id]
                            )
                          }
                          className={`px-3 py-2 rounded-xl border flex-row items-center gap-1.5 ${
                            isSel
                              ? 'bg-indigo-50 border-indigo-500 dark:bg-indigo-950/40'
                              : 'bg-slate-50 border-slate-200 dark:bg-slate-800 dark:border-slate-700'
                          }`}
                        >
                          <View
                            className="w-2.5 h-2.5 rounded-full"
                            style={{ backgroundColor: member.color || '#6366f1' }}
                          />
                          <Text
                            className={`text-xs font-bold ${
                              isSel ? 'text-indigo-600 dark:text-indigo-300' : 'text-slate-650 dark:text-slate-400'
                            }`}
                          >
                            {member.name}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}
              </View>

              {/* Duration & Due days */}
              <View className="flex-row gap-4">
                <View className="flex-1">
                  <Text className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Süre (Dk)</Text>
                  <TextInput
                    value={assignDuration}
                    onChangeText={setAssignDuration}
                    keyboardType="numeric"
                    className="bg-slate-100 dark:bg-slate-800 rounded-2xl px-4 py-3 text-sm font-bold text-slate-900 dark:text-white"
                  />
                </View>
                <View className="flex-1">
                  <Text className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Teslim Süresi (Gün)</Text>
                  <TextInput
                    value={assignDays}
                    onChangeText={setAssignDays}
                    keyboardType="numeric"
                    className="bg-slate-100 dark:bg-slate-800 rounded-2xl px-4 py-3 text-sm font-bold text-slate-900 dark:text-white"
                  />
                </View>
              </View>

              {/* Submit Button */}
              <TouchableOpacity
                onPress={handleAssignHomework}
                className="bg-indigo-600 rounded-2xl py-4 flex-row items-center justify-center gap-2 mt-4"
              >
                <Send size={16} color="white" />
                <Text className="text-white font-black text-base">Ödevi Ata</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
