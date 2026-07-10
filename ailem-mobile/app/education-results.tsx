import { 
  View, 
  Text, 
  ScrollView, 
  TouchableOpacity, 
  ActivityIndicator, 
  TextInput,
  Image
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useEffect, useState, useMemo } from 'react';
import { useRouter, Stack } from 'expo-router';
import { onTestsUpdate, updateTest, safeParseDate } from '../lib/dataService';
import { Test, FamilyMember } from '../lib/data';
import { useAuth } from '../context/auth-context';
import { 
  ChevronLeft, 
  ChevronRight,
  Search, 
  Award, 
  FileText,
  Calendar,
  X,
  CheckCircle,
  XCircle,
  AlertCircle,
  FileBadge,
  Check,
  BarChart3,
  TrendingUp,
  Target,
  Clock,
  BookOpen,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useColorScheme } from 'nativewind';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';

const translateType = (type: string) => {
    switch (type) {
        case 'json': return 'Yazılı';
        case 'exam': return 'Deneme';
        case 'bank': return 'Soru Bankası';
        case 'quick': return 'Hızlı';
        case 'mistake': return 'Yanlış Havuzu';
        case 'trackedBook': return 'Kitap';
        case 'html': return 'HTML';
        case 'pdf': return 'PDF';
        case 'offline': return 'Fiziksel';
        default: return type;
    }
};

const typeGradient = (type: string): [string, string] => {
    switch (type) {
        case 'exam': return ['#7c3aed', '#6366f1'];
        case 'bank': return ['#0ea5e9', '#3b82f6'];
        case 'quick': return ['#f59e0b', '#f97316'];
        case 'mistake': return ['#f43f5e', '#e11d48'];
        case 'trackedBook': return ['#10b981', '#059669'];
        case 'json': return ['#8b5cf6', '#7c3aed'];
        case 'html': return ['#06b6d4', '#0284c7'];
        case 'pdf': return ['#ef4444', '#dc2626'];
        default: return ['#64748b', '#475569'];
    }
};

export default function EducationResultsScreen() {
  const router = useRouter();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const { familyMembers } = useAuth();

  const [completedTests, setCompletedTests] = useState<Test[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("Tümü");
  const [selectedType, setSelectedType] = useState("Tümü");

  const children = useMemo(() => {
    return familyMembers.filter(m => m.role && (m.role === 'Kız Çocuk' || m.role === 'Erkek Çocuk' || m.role.includes('Çocuk')));
  }, [familyMembers]);

  const [selectedStudent, setSelectedStudent] = useState<FamilyMember | null>(null);

  useEffect(() => {
    if (children.length > 0 && !selectedStudent) {
      setSelectedStudent(children[0]);
    }
  }, [children, selectedStudent]);

  useEffect(() => {
    if (!selectedStudent) return;
    setLoading(true);
    const unsubscribe = onTestsUpdate((data) => {
      const completed = data?.filter(t => t.studentId === selectedStudent.id && (t.status === 'Sonuçlandı' || t.status === 'Değerlendirme Bekliyor')) || [];
      setCompletedTests(completed);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [selectedStudent]);

  const subjects = useMemo(() => {
    const unique = new Set(completedTests.map(t => t.subject).filter(Boolean));
    return ["Tümü", ...Array.from(unique).sort()];
  }, [completedTests]);

  const testTypes = useMemo(() => {
    const unique = new Set(completedTests.map(t => t.sourceType).filter(Boolean));
    return [{ value: "Tümü", label: "Tümü" }, ...Array.from(unique).map(t => ({ value: t, label: translateType(t as string) }))];
  }, [completedTests]);

  const filteredTests = useMemo(() => {
    const list = completedTests.filter(t => {
      const matchesSearch = t.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          t.subject.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesSubject = selectedSubject === "Tümü" || t.subject === selectedSubject;
      const matchesType = selectedType === "Tümü" || t.sourceType === selectedType;
      return matchesSearch && matchesSubject && matchesType;
    });

    // Sort from newest (completedDate or assignedDate) to oldest
    return list.sort((a, b) => {
      const dateA = safeParseDate(a.completedDate || a.assignedDate);
      const dateB = safeParseDate(b.completedDate || b.assignedDate);
      return dateB.getTime() - dateA.getTime();
    });
  }, [completedTests, searchTerm, selectedSubject, selectedType]);

  const stats = useMemo(() => {
    const finished = completedTests.filter(t => t.status === 'Sonuçlandı');
    const total = finished.length;
    if (total === 0) return { avgScore: 0, totalNet: 0, unreviewedCount: 0, totalTests: 0 };

    let sumScore = 0;
    let sumNet = 0;
    let unreviewedCount = 0;

    completedTests.forEach(t => {
      if (t.status === 'Sonuçlandı') {
        sumScore += t.score || 0;
        const correct = t.correctAnswers || 0;
        const incorrect = t.incorrectAnswers || 0;
        sumNet += correct - (incorrect / 3);
        if (!t.mistakesReviewed) unreviewedCount++;
      } else if (t.status === 'Değerlendirme Bekliyor') {
        unreviewedCount++;
      }
    });

    return {
      avgScore: Math.round(sumScore / total),
      totalNet: Math.round(sumNet * 10) / 10,
      unreviewedCount,
      totalTests: completedTests.length,
    };
  }, [completedTests]);

  const handleToggleReview = async (testId: string, currentStatus?: boolean) => {
    try {
      await updateTest(testId, { mistakesReviewed: !currentStatus });
    } catch (e) {
      console.error("Error updating review status:", e);
    }
  };

  const formatDateStr = (dateStr?: string) => {
    if (!dateStr) return "-";
    try {
      return format(safeParseDate(dateStr), 'dd MMM yyyy', { locale: tr });
    } catch (e) {
      return dateStr;
    }
  };

  if (loading && !selectedStudent) {
    return (
      <SafeAreaView className="flex-1 justify-center items-center bg-slate-50 dark:bg-slate-950">
        <ActivityIndicator size="large" color="#6366f1" />
        <Text className="text-slate-500 dark:text-slate-400 font-semibold mt-4">Yükleniyor...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-slate-100 dark:bg-slate-950">
      <Stack.Screen options={{ headerShown: false }} />

      {/* HEADER */}
      <LinearGradient
        colors={['#4f46e5', '#7c3aed'] as [string, string]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        className="px-5 pt-3 pb-6"
      >
        {/* Navbar */}
        <View className="flex-row justify-between items-center mb-5">
          <TouchableOpacity
            onPress={() => router.back()}
            className="w-9 h-9 items-center justify-center bg-white/20 rounded-full"
          >
            <ChevronLeft size={20} color="white" />
          </TouchableOpacity>
          <Text className="text-white text-lg font-black">Sınav Sonuçları</Text>
          <View className="w-9 h-9" />
        </View>

        {/* Student Switcher */}
        {children.length > 1 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4 -mx-1">
            {children.map(student => {
              const isSel = selectedStudent?.id === student.id;
              return (
                <TouchableOpacity
                  key={student.id}
                  onPress={() => setSelectedStudent(student)}
                  className={`flex-row items-center gap-2 px-3 py-2 rounded-full mr-2 border ${
                    isSel
                      ? 'bg-white border-white'
                      : 'bg-white/15 border-white/30'
                  }`}
                >
                  <Image source={{ uri: student.avatar }} className="w-5 h-5 rounded-full" />
                  <Text className={`text-xs font-bold ${isSel ? 'text-indigo-600' : 'text-white'}`}>
                    {student.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}

        {/* Stats Cards in Header */}
        {completedTests.length > 0 && (
          <View className="flex-row gap-3">
            {/* Ortalama Başarı - büyük kart */}
            <View className="flex-1 bg-white/20 rounded-2xl p-4 border border-white/20">
              <View className="flex-row items-center gap-1.5 mb-2">
                <Award size={14} color="rgba(255,255,255,0.8)" />
                <Text className="text-white/80 text-[10px] font-bold uppercase tracking-wider">Ort. Başarı</Text>
              </View>
              <Text className="text-white text-3xl font-black">%{stats.avgScore}</Text>
            </View>

            <View className="gap-3" style={{ flex: 1 }}>
              {/* Toplam Net */}
              <View className="bg-white/20 rounded-2xl px-4 py-3 border border-white/20 flex-row items-center gap-2">
                <Target size={14} color="rgba(255,255,255,0.8)" />
                <View>
                  <Text className="text-white/70 text-[9px] font-bold uppercase tracking-wider">Toplam Net</Text>
                  <Text className="text-white text-base font-black">{stats.totalNet}</Text>
                </View>
              </View>

              {/* Kontrol Bekleyen */}
              <View className={`rounded-2xl px-4 py-3 border flex-row items-center gap-2 ${
                stats.unreviewedCount > 0
                  ? 'bg-amber-400/30 border-amber-300/40'
                  : 'bg-white/20 border-white/20'
              }`}>
                <AlertCircle size={14} color={stats.unreviewedCount > 0 ? '#fde68a' : 'rgba(255,255,255,0.8)'} />
                <View>
                  <Text className="text-white/70 text-[9px] font-bold uppercase tracking-wider">Bekleyen</Text>
                  <Text className={`text-base font-black ${stats.unreviewedCount > 0 ? 'text-amber-200' : 'text-white'}`}>
                    {stats.unreviewedCount}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        )}
      </LinearGradient>

      {/* SEARCH & FILTERS */}
      <View className="bg-white dark:bg-slate-900 px-4 pt-3 pb-3 border-b border-slate-200 dark:border-slate-800 shadow-sm">
        <View className="flex-row items-center gap-3 bg-slate-100 dark:bg-slate-800 rounded-xl px-3 py-2.5 mb-3">
          <Search size={15} color="#94a3b8" />
          <TextInput
            placeholder="Sınav ara..."
            placeholderTextColor="#94a3b8"
            className="flex-1 text-sm font-medium text-slate-800 dark:text-white p-0"
            value={searchTerm}
            onChangeText={setSearchTerm}
          />
          {searchTerm !== "" && (
            <TouchableOpacity onPress={() => setSearchTerm("")}>
              <X size={14} color="#94a3b8" />
            </TouchableOpacity>
          )}
        </View>

        {subjects.length > 2 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-2">
            {subjects.map(subject => {
              const isActive = selectedSubject === subject;
              return (
                <TouchableOpacity
                  key={subject}
                  onPress={() => setSelectedSubject(subject)}
                  className={`px-3 py-1.5 rounded-full mr-2 border ${
                    isActive
                      ? 'bg-indigo-600 border-indigo-600'
                      : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700'
                  }`}
                >
                  <Text className={`text-[11px] font-bold ${isActive ? 'text-white' : 'text-slate-600 dark:text-slate-400'}`}>
                    {subject}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}

        {testTypes.length > 2 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {testTypes.map((type: any) => {
              const isActive = selectedType === type.value;
              return (
                <TouchableOpacity
                  key={type.value}
                  onPress={() => setSelectedType(type.value)}
                  className={`px-3 py-1.5 rounded-full mr-2 border ${
                    isActive
                      ? 'bg-violet-600 border-violet-600'
                      : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700'
                  }`}
                >
                  <Text className={`text-[11px] font-bold ${isActive ? 'text-white' : 'text-slate-600 dark:text-slate-400'}`}>
                    {type.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}
      </View>

      {/* TEST LIST */}
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        {loading ? (
          <ActivityIndicator size="large" color="#6366f1" className="mt-16" />
        ) : filteredTests.length === 0 ? (
          <View className="items-center justify-center py-20">
            <View className="w-20 h-20 bg-indigo-50 dark:bg-indigo-950/30 rounded-full items-center justify-center mb-4">
              <FileBadge size={36} color="#6366f1" />
            </View>
            <Text className="text-slate-800 dark:text-slate-200 text-base font-bold mb-1">Sonuç Bulunamadı</Text>
            <Text className="text-slate-400 text-xs text-center">Kriterlere uygun tamamlanmış sınav yok.</Text>
          </View>
        ) : (
          filteredTests.map(test => {
            const [c1, c2] = typeGradient(test.sourceType);
            const isFinished = test.status === 'Sonuçlandı';
            const correct = test.correctAnswers || 0;
            const incorrect = test.incorrectAnswers || 0;
            const empty = test.emptyAnswers || 0;
            const net = isFinished ? (correct - (incorrect / 3)) : 0;
            const successRate = test.score || 0;

            return (
              <View
                key={test.id}
                className="bg-white dark:bg-slate-900 rounded-3xl mb-4 overflow-hidden shadow-sm border border-slate-100 dark:border-slate-800"
              >
                {/* Colored top strip */}
                <LinearGradient
                  colors={[c1, c2] as [string, string]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={{ height: 4 }}
                />

                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => router.push({ pathname: '/exam-detail', params: { id: test.id } })}
                  className="px-4 pt-4 pb-3"
                >
                  <View className="flex-row justify-between items-start">
                    <View className="flex-1 mr-3">
                      {/* Subject + Type badges */}
                      <View className="flex-row items-center gap-2 mb-2 flex-wrap">
                        <View className="flex-row items-center gap-1 px-2 py-0.5 rounded-full" style={{ backgroundColor: c1 + '22' }}>
                          <Text className="text-[10px] font-black uppercase tracking-wide" style={{ color: c1 }}>
                            {translateType(test.sourceType)}
                          </Text>
                        </View>
                        <Text className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">
                          {test.subject}
                        </Text>
                      </View>

                      <Text className="text-slate-900 dark:text-white font-bold text-base leading-snug" numberOfLines={2}>
                        {test.title}
                      </Text>

                      <View className="flex-row items-center gap-1 mt-1.5">
                        <Calendar size={11} color="#94a3b8" />
                        <Text className="text-slate-400 text-[10px] font-medium">
                          {formatDateStr(test.updatedAt || test.assignedDate)}
                        </Text>
                      </View>
                    </View>

                    {/* Score badge */}
                    <View className="items-end gap-1">
                      {isFinished ? (
                        <View className="px-3 py-1.5 rounded-xl" style={{ backgroundColor: c1 + '18' }}>
                          <Text className="font-black text-sm" style={{ color: c1 }}>%{successRate.toFixed(0)}</Text>
                        </View>
                      ) : (
                        <View className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 px-2.5 py-1 rounded-xl">
                          <Text className="text-amber-600 dark:text-amber-400 font-bold text-[9px] uppercase tracking-wide">Bekliyor</Text>
                        </View>
                      )}
                      <ChevronRight size={14} color="#cbd5e1" />
                    </View>
                  </View>
                </TouchableOpacity>

                {/* Score breakdown */}
                {isFinished && (
                  <View className="px-4 pb-4">
                    <View className="flex-row items-center bg-slate-50 dark:bg-slate-800/60 rounded-2xl p-3 gap-0">
                      {/* Doğru */}
                      <View className="flex-1 items-center">
                        <Text className="text-[9px] font-bold text-emerald-500 uppercase tracking-wide mb-0.5">Doğru</Text>
                        <Text className="text-emerald-600 dark:text-emerald-400 font-black text-base">{correct}</Text>
                      </View>
                      <View className="w-px h-8 bg-slate-200 dark:bg-slate-700" />
                      {/* Yanlış */}
                      <View className="flex-1 items-center">
                        <Text className="text-[9px] font-bold text-rose-500 uppercase tracking-wide mb-0.5">Yanlış</Text>
                        <Text className="text-rose-600 dark:text-rose-400 font-black text-base">{incorrect}</Text>
                      </View>
                      <View className="w-px h-8 bg-slate-200 dark:bg-slate-700" />
                      {/* Boş */}
                      <View className="flex-1 items-center">
                        <Text className="text-[9px] font-bold text-slate-400 uppercase tracking-wide mb-0.5">Boş</Text>
                        <Text className="text-slate-500 dark:text-slate-400 font-black text-base">{empty}</Text>
                      </View>
                      <View className="w-px h-8 bg-slate-200 dark:bg-slate-700" />
                      {/* Net */}
                      <View className="flex-1 items-center">
                        <Text className="text-[9px] font-bold text-indigo-500 uppercase tracking-wide mb-0.5">Net</Text>
                        <Text className="text-indigo-600 dark:text-indigo-400 font-black text-base">{net.toFixed(1)}</Text>
                      </View>

                      <View className="w-px h-8 bg-slate-200 dark:bg-slate-700" />

                      {/* Review button */}
                      <TouchableOpacity
                        onPress={() => handleToggleReview(test.id, test.mistakesReviewed)}
                        className={`ml-2 w-9 h-9 rounded-xl items-center justify-center ${
                          test.mistakesReviewed
                            ? 'bg-emerald-100 dark:bg-emerald-950/40'
                            : 'bg-indigo-600'
                        }`}
                      >
                        {test.mistakesReviewed
                          ? <Check size={16} color="#10b981" />
                          : <BookOpen size={15} color="white" />
                        }
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </View>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
