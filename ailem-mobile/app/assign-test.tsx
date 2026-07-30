// FORCE_RELOAD_TIMESTAMP=639189377200562499
import { 
  View, 
  Text, 
  ScrollView, 
  TouchableOpacity, 
  ActivityIndicator, 
  TextInput, 
  Modal, 
  Alert, 
  Platform, 
  Pressable 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useEffect, useState, useMemo } from 'react';
import { useRouter, Stack } from 'expo-router';
import { 
  Lock, KeyRound, AlertTriangle, ArrowLeft, PlusCircle, ChevronRight, 
  Layers, Settings, Library, CircleDashed, CheckCircle2, PieChart, 
  FileText, BookMarked, BookOpen, BookCopy, MessageSquare, Globe, 
  Gamepad2, ClipboardList, FileJson, ScrollText, ListTree, BookHeart, 
  Users, Calendar, Send, X, Ruler, TestTube2
} from 'lucide-react-native';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { useAuth } from '../context/auth-context';
import { useColorScheme } from 'nativewind';
import { LinearGradient } from 'expo-linear-gradient';
import { onTestsUpdate, addTest } from '../lib/dataService';
import { Test, FamilyMember } from '../lib/data';

const C = {
  BLUE:    '#3B82F6',
  INDIGO:  '#6366F1',
  PURPLE:  '#8B5CF6',
  EMERALD: '#10B981',
  AMBER:   '#F59E0B',
  ROSE:    '#F43F5E',
  CYAN:    '#06B6D4',
  ORANGE:  '#F97316',
  SLATE:   '#94A3B8',
};

const categoryTheme: Record<string, { base: string; softBg: string; text: string; border: string; color: string }> = {
  'Matematik':               { base: 'bg-rose-500', softBg: 'bg-rose-50 dark:bg-rose-950/20', text: 'text-rose-600 dark:text-rose-450', border: 'border-rose-100 dark:border-rose-900/30', color: C.ROSE },
  'Fen Bilimleri':           { base: 'bg-orange-500', softBg: 'bg-orange-50 dark:bg-orange-950/20', text: 'text-orange-600 dark:text-orange-450', border: 'border-orange-100 dark:border-orange-900/30', color: C.ORANGE },
  'Türkçe':                  { base: 'bg-amber-500', softBg: 'bg-amber-50 dark:bg-amber-950/20', text: 'text-amber-600 dark:text-amber-450', border: 'border-amber-100 dark:border-amber-900/30', color: C.AMBER },
  'Sosyal Bilgiler':         { base: 'bg-cyan-500', softBg: 'bg-cyan-50 dark:bg-cyan-950/20', text: 'text-cyan-600 dark:text-cyan-405', border: 'border-cyan-100 dark:border-cyan-900/30', color: C.CYAN },
  'İngilizce':               { base: 'bg-blue-500', softBg: 'bg-blue-50 dark:bg-blue-950/20', text: 'text-blue-600 dark:text-blue-450', border: 'border-blue-100 dark:border-blue-900/30', color: C.BLUE },
  'Genel Deneme Sınavları':  { base: 'bg-purple-500', softBg: 'bg-purple-50 dark:bg-purple-950/20', text: 'text-purple-600 dark:text-purple-455', border: 'border-purple-100 dark:border-purple-900/30', color: C.PURPLE },
  'Serbest Etkinlikler':     { base: 'bg-emerald-500', softBg: 'bg-emerald-50 dark:bg-emerald-950/20', text: 'text-emerald-600 dark:text-emerald-450', border: 'border-emerald-100 dark:border-emerald-900/30', color: C.EMERALD },
  'Diğer':                   { base: 'bg-slate-500', softBg: 'bg-slate-50 dark:bg-slate-900/50', text: 'text-slate-600 dark:text-slate-400', border: 'border-slate-200 dark:border-slate-800', color: C.SLATE },
};

const categoryIcons: Record<string, any> = {
  'Matematik':              Ruler,
  'Fen Bilimleri':          TestTube2,
  'Türkçe':                 BookCopy,
  'Sosyal Bilgiler':        Globe,
  'İngilizce':              MessageSquare,
  'Serbest Etkinlikler':    Gamepad2,
  'Diğer':                  FileText,
  'Genel Deneme Sınavları': ClipboardList,
};

const getCategoryName = (test: Test): string => {
  if (test.sourceType === 'exam') return 'Genel Deneme Sınavları';
  if (test.sourceType === 'mistake') return 'Yanlışlarım';
  return test.subject || 'Diğer';
};

export default function AssignTestScreen() {
  const router = useRouter();
  const { user, familyMembers, familyId } = useAuth();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [tests, setTests] = useState<Test[]>([]);
  const [loading, setLoading] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);

  // Authentication Lock
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");

  // Assign Modal States
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [testTitle, setTestTitle] = useState("");
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [testSubject, setTestSubject] = useState("");
  const [dueDate, setDueDate] = useState(new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
  const [questionCount, setQuestionCount] = useState("");

  const studentMembers = useMemo(() => 
    familyMembers.filter(m => m.role && m.role.includes('Çocuk')), 
  [familyMembers]);

  useEffect(() => {
    if (studentMembers.length > 0 && !selectedStudentId) {
      setSelectedStudentId(studentMembers[0].id);
    }
  }, [studentMembers, selectedStudentId]);

  useEffect(() => {
    if (!familyId) return;
    const unsub = onTestsUpdate(setTests);
    return () => unsub();
  }, [familyId]);

  // Auth password verify
  const handlePasswordSubmit = async () => {
    if (!user?.email) {
      setAuthError("Kullanıcı oturumu bulunamadı.");
      return;
    }
    setAuthLoading(true);
    setAuthError("");
    try {
      await signInWithEmailAndPassword(auth, user.email, password);
      setIsAuthenticated(true);
      setAuthError("");
      setPassword("");
    } catch (err) {
      setAuthError("Hatalı şifre. Lütfen tekrar deneyin.");
    } finally {
      setAuthLoading(false);
    }
  };

  // Calculations
  const stats = useMemo(() => {
    const total = tests.length;
    const completed = tests.filter(t => t.status === 'Sonuçlandı').length;
    const pending = total - completed;
    const completedTests = tests.filter(t => t.status === 'Sonuçlandı');
    let totalQ = 0, totalC = 0;
    completedTests.forEach(t => {
      totalQ += t.questionCount || 0;
      totalC += t.correctAnswers || 0;
    });
    return {
      total,
      completed,
      pending,
      successRate: totalQ > 0 ? (totalC / totalQ) * 100 : 0
    };
  }, [tests]);

  const testsBySubject = useMemo(() => {
    const grouped: Record<string, Test[]> = {};
    tests.filter(t => t.studentId).forEach(t => {
      const s = getCategoryName(t);
      if (!grouped[s]) grouped[s] = [];
      grouped[s].push(t);
    });
    return grouped;
  }, [tests]);

  const pendingEvaluations = useMemo(() => 
    tests.filter(t => t.status === 'Değerlendirme Bekliyor'), 
  [tests]);

  // Handle Assign doc creation
  const handleAssignSubmit = async () => {
    if (!selectedStudentId || !testSubject) {
      Alert.alert("Hata", "Lütfen öğrenci ve ders seçin.");
      return;
    }

    setIsSubmitting(true);
    try {
      const qCount = parseInt(questionCount) || 10;
      const newTest: Omit<Test, 'id' | 'familyId' | 'questions'> = {
        title: testTitle || `${testSubject} Ödevi`,
        subject: testSubject,
        topicId: "Genel",
        studentId: selectedStudentId,
        questionCount: qCount,
        assignedDate: new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' }),
        dueDate: new Date(dueDate).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' }),
        status: 'Atandı',
        isArchived: false,
        sourceType: 'offline', // offline test solver
        correctAnswers: 0,
        incorrectAnswers: 0,
        emptyAnswers: 0,
        score: 0
      };

      await addTest(newTest);
      Alert.alert("Başarılı", "Ödev başarıyla atandı.");
      setIsAssignModalOpen(false);
      // Reset
      setTestTitle('');
      setQuestionCount('');
    } catch (e) {
      Alert.alert("Hata", "Ödev atanırken hata oluştu.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- PASSWORD LOCK SCREEN ---
  if (!isAuthenticated) {
    return (
      <SafeAreaView className="flex-1 bg-slate-50 dark:bg-slate-950 justify-center items-center px-6">
        <Stack.Screen options={{ headerShown: false }} />
        
        {/* Lock icon */}
        <LinearGradient
          colors={['#4f46e5', '#7c3aed'] as [string, string]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          className="w-20 h-20 rounded-[2rem] items-center justify-center mb-6 shadow-md shadow-indigo-500/20"
          style={{ borderRadius: 28 }}
        >
          <Lock size={32} color="white" />
        </LinearGradient>

        <Text className="text-xl font-black text-slate-900 dark:text-white mb-1.5 text-center">Erişim Korumalı</Text>
        <Text className="text-xs font-semibold text-slate-500 dark:text-slate-400 text-center mb-8">
          Bu alanı görüntülemek için yönetici şifrenizi girin.
        </Text>

        <View className="w-full max-w-xs space-y-4">
          <View className="relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl flex-row items-center px-4 py-3.5 shadow-sm" style={{ borderRadius: 16 }}>
            <KeyRound size={20} color="#94a3b8" className="mr-3 shrink-0" />
            <TextInput
              secureTextEntry
              value={password}
              onChangeText={setPassword}
              placeholder="••••••"
              placeholderTextColor="#94a3b8"
              keyboardType="default"
              className="flex-1 text-slate-900 dark:text-white font-extrabold text-base p-0 text-center tracking-[0.2em]"
            />
          </View>

          {authError ? (
            <View className="flex-row items-center justify-center gap-2 py-2 px-3 bg-rose-50 dark:bg-rose-950/20 rounded-xl border border-rose-100 dark:border-rose-900/30">
              <AlertTriangle size={14} color="#f43f5e" />
              <Text className="text-[10px] font-black text-rose-600 dark:text-rose-400">{authError}</Text>
            </View>
          ) : null}

          <TouchableOpacity 
            onPress={handlePasswordSubmit}
            disabled={authLoading}
            className="w-full bg-indigo-600 py-4 rounded-2xl items-center shadow-md active:scale-95 transition-all"
            style={{ borderRadius: 16 }}
          >
            {authLoading ? (
              <ActivityIndicator color="white" size="small" />
            ) : (
              <Text className="text-white font-black text-sm uppercase tracking-wider">Giriş Yap</Text>
            )}
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // --- MAIN MANAGEMENT PANEL ---
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
            <Text className="text-lg font-extrabold text-slate-900 dark:text-white leading-none">Yönetim Paneli</Text>
            <Text className="text-[9px] font-black text-slate-450 dark:text-slate-400 uppercase tracking-widest mt-1">Sistem Yönetimi & Analiz</Text>
          </View>
        </View>

        <TouchableOpacity 
          onPress={() => setIsAssignModalOpen(true)}
          className="flex-row items-center gap-1.5 bg-indigo-600 px-4 py-2.5 rounded-full shadow-sm active:scale-95"
        >
          <PlusCircle size={16} color="white" />
          <Text className="text-[10px] font-black text-white uppercase tracking-wider">Ödev Ata</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 60 }} showsVerticalScrollIndicator={false}>
        
        {/* ALL ASSIGNMENTS BUTTON */}
        <TouchableOpacity 
          onPress={() => router.push('/all-tests')}
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 mb-6 shadow-sm flex-row items-center justify-between"
          style={{ borderRadius: 16 }}
        >
          <View className="flex-row items-center gap-3">
            <View className="w-10 h-10 bg-indigo-50 dark:bg-indigo-900/30 rounded-full items-center justify-center">
              <Library size={20} color="#4f46e5" />
            </View>
            <View>
              <Text className="text-sm font-bold text-slate-900 dark:text-white">Tüm Ödevler & Sınavlar</Text>
              <Text className="text-[10px] font-medium text-slate-500 mt-0.5">Tüm listeyi görüntüle ve yönet</Text>
            </View>
          </View>
          <ChevronRight size={20} color="#cbd5e1" />
        </TouchableOpacity>
        {/* PENDING EVALUATIONS ALERT */}
        {pendingEvaluations.length > 0 && (
          <View className="mb-6 animate-in fade-in slide-in-from-bottom-4">
            <View className="flex-row items-center gap-2 mb-3 px-1">
              <AlertTriangle size={16} color="#ef4444" />
              <Text className="text-[10px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest">Değerlendirme Bekleyenler</Text>
              <View className="bg-red-500 rounded px-1.5 py-0.5">
                <Text className="text-[8px] font-black text-white">{pendingEvaluations.length}</Text>
              </View>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
              {pendingEvaluations.map((test) => {
                const student = familyMembers.find(m => m.id === test.studentId);
                const theme = categoryTheme[test.subject || 'Diğer'] || categoryTheme['Diğer'];
                return (
                  <TouchableOpacity
                    key={test.id}
                    onPress={() => router.push({ pathname: '/exam-detail', params: { id: test.id } })}
                    activeOpacity={0.9}
                    className="w-64 bg-white dark:bg-slate-900 border-2 border-red-100 dark:border-red-950 p-4 shadow-sm"
                    style={{ borderRadius: 20 }}
                  >
                    <View className="flex-row justify-between items-center mb-2 flex-wrap gap-1">
                      <View className={`px-2 py-0.5 rounded border ${theme.softBg} ${theme.border}`}>
                        <Text className={`text-[8px] font-black uppercase ${theme.text}`}>{test.subject || 'Diğer'}</Text>
                      </View>
                      {student && (
                        <View className="flex-row items-center gap-1">
                          <View className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: student.color }} />
                          <Text className="text-[8px] font-bold text-slate-400">{student.name}</Text>
                        </View>
                      )}
                    </View>
                    <Text className="text-xs font-bold text-slate-800 dark:text-slate-100" numberOfLines={2}>{test.title}</Text>
                    
                    <View className="flex-row items-center justify-between mt-3 pt-2 border-t border-slate-100 dark:border-slate-850">
                      <Text className="text-[9px] font-bold text-rose-500">İŞLEM BEKLİYOR</Text>
                      <ChevronRight size={14} color="#f43f5e" />
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* KPI METRIC CARDS */}
        <View className="flex-row justify-between gap-2.5 mb-6">
          {/* Total assignments */}
          <View className="flex-1 bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 p-3.5 shadow-sm justify-between min-h-[96px]" style={{ borderRadius: 20 }}>
            <View className="flex-row justify-between items-center">
              <Library size={16} color={C.BLUE} />
              <Text className="text-[8px] font-black text-slate-400 uppercase tracking-wider">Toplam</Text>
            </View>
            <Text className="text-2xl font-black text-slate-850 dark:text-white">{stats.total}</Text>
          </View>

          {/* Pending assignments */}
          <View className="flex-1 bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 p-3.5 shadow-sm justify-between min-h-[96px]" style={{ borderRadius: 20 }}>
            <View className="flex-row justify-between items-center">
              <CircleDashed size={16} color={C.ORANGE} />
              <Text className="text-[8px] font-black text-slate-400 uppercase tracking-wider">Bekleyen</Text>
            </View>
            <Text className="text-2xl font-black text-slate-850 dark:text-white">{stats.pending}</Text>
          </View>

          {/* Success rate */}
          <View className="flex-1 bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 p-3.5 shadow-sm justify-between min-h-[96px]" style={{ borderRadius: 20 }}>
            <View className="flex-row justify-between items-center">
              <CheckCircle2 size={16} color={C.EMERALD} />
              <Text className="text-[8px] font-black text-slate-400 uppercase tracking-wider">Başarı</Text>
            </View>
            <Text className="text-2xl font-black text-slate-850 dark:text-white">%{stats.successRate.toFixed(0)}</Text>
          </View>
        </View>

        {/* TOOLS GROUPS */}
        <View className="space-y-6">
          
          {/* GROUP 1: ADD CONTENT */}
          <View>
            <View className="flex-row items-center gap-2 mb-3.5 px-1">
              <Layers size={14} color="#64748b" />
              <Text className="text-[10px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest">İçerik & Ödev Ekleme</Text>
            </View>

            <View className="flex-row flex-wrap justify-between gap-y-3">
              {/* Soru Bankası */}
              <TouchableOpacity 
                onPress={() => router.push('/bank-questions')}
                className="w-[31%] bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 p-3 items-center justify-center shadow-sm min-h-[96px]"
                style={{ borderRadius: 20 }}
              >
                <View className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 items-center justify-center mb-2">
                  <PlusCircle size={20} color={C.EMERALD} />
                </View>
                <Text className="text-[10px] font-extrabold text-slate-800 dark:text-slate-200 text-center leading-tight">Soru Bankası</Text>
              </TouchableOpacity>

              {/* Denemeler */}
              <TouchableOpacity 
                onPress={() => router.push('/practice-exams')}
                className="w-[31%] bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 p-3 items-center justify-center shadow-sm min-h-[96px]"
                style={{ borderRadius: 20 }}
              >
                <View className="w-10 h-10 rounded-xl bg-orange-50 dark:bg-orange-950/40 items-center justify-center mb-2">
                  <ClipboardList size={20} color={C.ORANGE} />
                </View>
                <Text className="text-[10px] font-extrabold text-slate-800 dark:text-slate-200 text-center leading-tight">Denemeler</Text>
              </TouchableOpacity>

              {/* Yazılılar */}
              <TouchableOpacity 
                onPress={() => router.push('/json-tests')}
                className="w-[31%] bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 p-3 items-center justify-center shadow-sm min-h-[96px]"
                style={{ borderRadius: 20 }}
              >
                <View className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/40 items-center justify-center mb-2">
                  <FileJson size={20} color={C.PURPLE} />
                </View>
                <Text className="text-[10px] font-extrabold text-slate-800 dark:text-slate-200 text-center leading-tight">Yazılılar</Text>
              </TouchableOpacity>

              {/* HTML Test */}
              <TouchableOpacity 
                onPress={() => router.push('/html-tests')}
                className="w-[31%] bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 p-3 items-center justify-center shadow-sm min-h-[96px]"
                style={{ borderRadius: 20 }}
              >
                <View className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/40 items-center justify-center mb-2">
                  <FileText size={20} color={C.BLUE} />
                </View>
                <Text className="text-[10px] font-extrabold text-slate-800 dark:text-slate-200 text-center leading-tight">HTML Test</Text>
              </TouchableOpacity>

              {/* PDF Test */}
              <TouchableOpacity 
                onPress={() => router.push('/pdf-tests')}
                className="w-[31%] bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 p-3 items-center justify-center shadow-sm min-h-[96px]"
                style={{ borderRadius: 20 }}
              >
                <View className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 items-center justify-center mb-2">
                  <FileText size={20} color={C.INDIGO} />
                </View>
                <Text className="text-[10px] font-extrabold text-slate-800 dark:text-slate-200 text-center leading-tight">PDF Test</Text>
              </TouchableOpacity>

              {/* Özetler */}
              <TouchableOpacity 
                onPress={() => router.push('/summaries')}
                className="w-[31%] bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 p-3 items-center justify-center shadow-sm min-h-[96px]"
                style={{ borderRadius: 20 }}
              >
                <View className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 items-center justify-center mb-2">
                  <ScrollText size={20} color={C.EMERALD} />
                </View>
                <Text className="text-[10px] font-extrabold text-slate-800 dark:text-slate-200 text-center leading-tight">Özetler</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* GROUP 2: EVALUATION & FOLLOW-UP */}
          <View>
            <View className="flex-row items-center gap-2 mb-3.5 px-1">
              <Settings size={14} color="#64748b" />
              <Text className="text-[10px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest">Takip & Yönetim</Text>
            </View>

            <View className="flex-row flex-wrap justify-between gap-y-3">
              {/* Sonuçlar */}
              <TouchableOpacity 
                onPress={() => router.push('/education-results')}
                className="w-[48%] bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 p-4 flex-row items-center gap-3 shadow-sm min-h-[72px]"
                style={{ borderRadius: 20 }}
              >
                <View className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 items-center justify-center">
                  <ListTree size={20} color={C.INDIGO} />
                </View>
                <Text className="text-[11px] font-extrabold text-slate-800 dark:text-slate-200 flex-1 leading-tight">Sonuçlar</Text>
              </TouchableOpacity>

              {/* Kitap Takibi */}
              <TouchableOpacity 
                onPress={() => router.push('/tracked-books')}
                className="w-[48%] bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 p-4 flex-row items-center gap-3 shadow-sm min-h-[72px]"
                style={{ borderRadius: 20 }}
              >
                <View className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/40 items-center justify-center">
                  <BookMarked size={20} color={C.BLUE} />
                </View>
                <Text className="text-[11px] font-extrabold text-slate-800 dark:text-slate-200 flex-1 leading-tight">Kitap Takibi</Text>
              </TouchableOpacity>

              {/* Ders & Konu Müfredat */}
              <TouchableOpacity 
                onPress={() => router.push('/curriculum')}
                className="w-[48%] bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 p-4 flex-row items-center gap-3 shadow-sm min-h-[72px]"
                style={{ borderRadius: 20 }}
              >
                <View className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/40 items-center justify-center">
                  <BookOpen size={20} color={C.PURPLE} />
                </View>
                <Text className="text-[11px] font-extrabold text-slate-800 dark:text-slate-200 flex-1 leading-tight">Ders & Konu</Text>
              </TouchableOpacity>

              {/* Yol Haritaları */}
              <TouchableOpacity 
                onPress={() => router.push('/study-plans')}
                className="w-[48%] bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 p-4 flex-row items-center gap-3 shadow-sm min-h-[72px]"
                style={{ borderRadius: 20 }}
              >
                <View className="w-10 h-10 rounded-xl bg-pink-50 dark:bg-pink-950/40 items-center justify-center">
                  <BookHeart size={20} color="#ec4899" />
                </View>
                <Text className="text-[11px] font-extrabold text-slate-800 dark:text-slate-200 flex-1 leading-tight">Çalışma Planı</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* SUBJECT PROGRESS LIST */}
          <View>
            <View className="flex-row items-center gap-2 mb-3.5 px-1">
               <PieChart size={14} color="#64748b" />
               <Text className="text-[10px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest">Ders İlerlemeleri</Text>
            </View>
            
            <View className="space-y-3.5">
              {Object.entries(testsBySubject).map(([subject, subjectTests]) => {
                const total = subjectTests.length;
                const completed = subjectTests.filter(t => t.status === 'Sonuçlandı');
                const pending = total - completed.length;
                const totalQ = completed.reduce((s, t) => s + (t.questionCount || 0), 0);
                const totalC = completed.reduce((s, t) => s + (t.correctAnswers || 0), 0);
                const rate = totalQ > 0 ? (totalC / totalQ) * 100 : 0;
                
                const theme = categoryTheme[subject] || categoryTheme['Diğer'];
                const IconComponent = categoryIcons[subject] || FileText;

                return (
                  <TouchableOpacity
                    key={subject}
                    onPress={() => router.push({ pathname: '/education-category', params: { category: subject } })}
                    activeOpacity={0.9}
                    className="bg-white dark:bg-slate-900 rounded-3xl p-4 border border-slate-200/60 dark:border-slate-800 shadow-sm flex-row items-center gap-4 relative overflow-hidden"
                    style={{ borderRadius: 22 }}
                  >
                    <View className="absolute left-0 top-0 bottom-0 w-1.5" style={{ backgroundColor: theme.color }} />

                    <View className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ml-1 bg-slate-50 dark:bg-slate-800`}>
                      <IconComponent size={24} color={theme.color} />
                    </View>

                    <View className="flex-1 min-w-0">
                      <View className="flex-row justify-between items-center mb-2">
                        <Text className="text-sm font-extrabold text-slate-900 dark:text-white truncate flex-1 mr-1">{subject}</Text>
                        {pending > 0 && (
                          <View className={`px-2 py-0.5 rounded border shrink-0 ${theme.softBg} ${theme.border}`}>
                            <Text className={`text-[8px] font-black uppercase ${theme.text}`}>{pending} Bekleyen</Text>
                          </View>
                        )}
                      </View>

                      <View className="flex-row items-center gap-2">
                        <View className="flex-1 h-2 bg-slate-100 dark:bg-slate-850 rounded-full overflow-hidden">
                          <View className="h-full rounded-full" style={{ width: `${rate}%`, backgroundColor: theme.color }} />
                        </View>
                        <Text className="text-[10px] font-black text-slate-505 dark:text-slate-400 w-8 text-right">%{rate.toFixed(0)}</Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>
      </ScrollView>

      {/* ASSIGN TEST MODAL */}
      <Modal
        visible={isAssignModalOpen}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsAssignModalOpen(false)}
      >
        <View className="flex-1 bg-black/60 justify-end">
          <View className="bg-slate-50 dark:bg-slate-900 rounded-t-[2.5rem] max-h-[85%] border-t border-slate-200 dark:border-slate-800 pb-8">
            
            {/* Modal Header */}
            <View 
              className="p-5 border-b border-slate-200 dark:border-slate-800 flex-row justify-between items-center bg-white dark:bg-slate-950"
              style={{ borderTopLeftRadius: 36, borderTopRightRadius: 36 }}
            >
              <View className="flex-row items-center gap-2">
                <Send size={18} color="#6366f1" />
                <Text className="text-lg font-extrabold text-slate-900 dark:text-white">Yeni Ödev Ata</Text>
              </View>
              <TouchableOpacity 
                onPress={() => setIsAssignModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 items-center justify-center"
              >
                <X size={16} color="#64748b" />
              </TouchableOpacity>
            </View>

            {/* Modal Form Content */}
            <ScrollView className="p-5 space-y-5">
              
              {/* Test/Assignment Title */}
              <View>
                <Text className="text-[10px] font-bold text-slate-450 dark:text-slate-400 uppercase tracking-wider mb-2">Ödev Adı</Text>
                <TextInput
                  placeholder="LGS Deneme 4, Limit Test 1 vb."
                  placeholderTextColor="#94a3b8"
                  value={testTitle}
                  onChangeText={setTestTitle}
                  className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-2xl px-4 py-3 text-slate-800 dark:text-white font-semibold text-sm"
                  style={{ borderRadius: 16 }}
                />
              </View>

              {/* Student Target selection */}
              <View>
                <Text className="text-[10px] font-bold text-slate-450 dark:text-slate-400 uppercase tracking-wider mb-2">Atanacak Öğrenci</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
                  {studentMembers.map(student => {
                    const active = selectedStudentId === student.id;
                    return (
                      <TouchableOpacity
                        key={student.id}
                        onPress={() => setSelectedStudentId(student.id)}
                        className={`flex-row items-center gap-2 px-4 py-2 rounded-xl border ${
                          active 
                            ? 'bg-indigo-600 border-indigo-600' 
                            : 'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-850'
                        }`}
                        style={{ borderRadius: 12 }}
                      >
                        <View className={`w-4.5 h-4.5 rounded-full flex items-center justify-center ${
                          active ? 'bg-white/20 border-white/30' : 'bg-slate-250 dark:bg-slate-800'
                        }`}>
                          <Users size={10} color={active ? 'white' : '#64748b'} />
                        </View>
                        <Text className={`text-[10px] font-bold ${active ? 'text-white' : 'text-slate-600 dark:text-slate-400'}`}>
                          {student.name}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>

              {/* Subject Category Selection */}
              <View>
                <Text className="text-[10px] font-bold text-slate-450 dark:text-slate-400 uppercase tracking-wider mb-2">Ders</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
                  {Object.keys(categoryTheme).filter(k => k !== 'Yanlışlarım').map((subj) => {
                    const active = testSubject === subj;
                    const theme = categoryTheme[subj] || categoryTheme['Diğer'];
                    return (
                      <TouchableOpacity
                        key={subj}
                        onPress={() => setTestSubject(subj)}
                        className={`px-3.5 py-2 rounded-xl border ${
                          active 
                            ? 'bg-indigo-600 border-indigo-600' 
                            : 'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-850'
                        }`}
                        style={{ borderRadius: 12 }}
                      >
                        <Text className={`text-[10px] font-bold ${active ? 'text-white' : 'text-slate-600 dark:text-slate-400'}`}>{subj}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>

              {/* Question Count Input */}
              <View>
                <Text className="text-[10px] font-bold text-slate-450 dark:text-slate-400 uppercase tracking-wider mb-2">Soru Sayısı</Text>
                <TextInput
                  placeholder="Örn: 20"
                  placeholderTextColor="#94a3b8"
                  value={questionCount}
                  onChangeText={setQuestionCount}
                  keyboardType="numeric"
                  className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-2xl px-4 py-3 text-slate-800 dark:text-white font-semibold text-sm"
                  style={{ borderRadius: 16 }}
                />
              </View>

              {/* Due Date Input */}
              <View>
                <Text className="text-[10px] font-bold text-slate-450 dark:text-slate-400 uppercase tracking-wider mb-2">Son Teslim Tarihi</Text>
                <View className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-2xl px-4 py-3 text-slate-800 dark:text-white font-semibold text-sm flex-row items-center gap-2" style={{ borderRadius: 16 }}>
                  <Calendar size={16} color="#94a3b8" />
                  <TextInput
                    value={dueDate}
                    onChangeText={setDueDate}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor="#94a3b8"
                    className="flex-1 p-0 text-slate-800 dark:text-white font-semibold text-sm"
                  />
                </View>
              </View>

              {/* Assign Action Button */}
              <TouchableOpacity
                onPress={handleAssignSubmit}
                disabled={isSubmitting}
                className="bg-indigo-600 py-3.5 rounded-2xl items-center shadow-md active:scale-[0.98] mt-3"
                style={{ borderRadius: 16 }}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="white" size="small" />
                ) : (
                  <Text className="text-white font-black text-sm uppercase tracking-wider">Ödevi Gönder</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
