import { 
  View, 
  Text, 
  ScrollView, RefreshControl, 
  TouchableOpacity, 
  ActivityIndicator, 
  TextInput, 
  Modal, 
  Alert, 
  Platform, 
  Pressable 
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useEffect, useState, useMemo } from 'react';
import { useRouter, Stack, useLocalSearchParams } from 'expo-router';
import { 
  ArrowLeft, Check, Percent, Flame, Calendar, BarChart3, 
  ChevronRight, Activity, BookOpen, Trophy, Sparkles, GraduationCap, 
  AlertCircle, Target, Clock, ChevronDown, ChevronUp, Plus, Trash2, CheckCircle2, 
  X, Compass, BookCopy
} from 'lucide-react-native';
import Svg, { Circle } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import { format, startOfWeek, eachDayOfInterval, subDays, parseISO, parse, startOfMonth, startOfYear, differenceInDays } from 'date-fns';
import { tr } from 'date-fns/locale';
import { useAuth } from '../context/auth-context';
import { useColorScheme } from 'nativewind';
import { 
  onTestsUpdate, 
  onTrackedBooksUpdate, 
  onAllTrackedBookTestsUpdate,
  onPerformanceGoalsUpdate, 
  addPerformanceGoal, 
  deletePerformanceGoal 
} from '../lib/dataService';
import { Test, TrackedBook, TrackedBookTest, PerformanceGoal, FamilyMember } from '../lib/data';

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
  VIOLET:  '#7C3AED',
};

const getCategoryName = (test: Test): string => {
  if (test.sourceType === 'exam') return 'Genel Deneme Sınavları';
  if (test.sourceType === 'mistake') return 'Yanlışlarım';
  return test.subject || 'Diğer';
};

function translateType(type: string) {
  const map: Record<string, string> = {
    exam: 'Deneme', bank: 'Soru Bankası', json: 'Yazılı',
    trackedBook: 'Kitap', html: 'HTML', pdf: 'PDF', quick: 'Hızlı', mistake: 'Yanlış Havuzu', offline: 'Fiziksel / Harici'
  };
  return map[type] || 'Diğer';
}

export default function EducationStatsScreen() {
  const router = useRouter();
  const { studentId } = useLocalSearchParams<{ studentId?: string }>();
  const { familyMembers, familyId } = useAuth();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const insets = useSafeAreaInsets();

  const [tests, setTests] = useState<Test[]>([]);
  const [trackedBooks, setTrackedBooks] = useState<TrackedBook[]>([]);
  const [trackedBookTests, setTrackedBookTests] = useState<TrackedBookTest[]>([]);
  const [performanceGoals, setPerformanceGoals] = useState<PerformanceGoal[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters & Tabs
  const [activeTab, setActiveTab] = useState<'overview' | 'sources' | 'subjects' | 'topics' | 'goals'>('overview');
  const [isAddGoalModalOpen, setIsAddGoalModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  
  const [expandedSubjects, setExpandedSubjects] = useState<Set<string>>(new Set());
  const [expandedSources, setExpandedSources] = useState<Set<string>>(new Set());
  const [expandedSourceItems, setExpandedSourceItems] = useState<Set<string>>(new Set());
  const [expandedSourceSubjects, setExpandedSourceSubjects] = useState<Set<string>>(new Set());

  const toggleSource = (sourceName: string) => {
    setExpandedSources(prev => {
      const next = new Set(prev);
      if (next.has(sourceName)) next.delete(sourceName); else next.add(sourceName);
      return next;
    });
  };

  const toggleSourceItem = (sourceName: string, itemName: string) => {
    const key = `${sourceName}-${itemName}`;
    setExpandedSourceItems(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  const toggleSourceSubject = (sourceName: string, itemName: string, subjectName: string) => {
    const key = `${sourceName}-${itemName}-${subjectName}`;
    setExpandedSourceSubjects(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  // Goal Form State
  const [goalType, setGoalType] = useState<'questions' | 'net' | 'successRate'>('questions');
  const [goalSubject, setGoalSubject] = useState('all');
  const [goalTarget, setGoalTarget] = useState('');
  const [goalLabel, setGoalLabel] = useState('');
  const [goalPeriod, setGoalPeriod] = useState<'weekly' | 'monthly' | 'yearly'>('weekly');

  const toggleSubject = (subjectName: string) => {
    setExpandedSubjects(prev => {
      const next = new Set(prev);
      if (next.has(subjectName)) next.delete(subjectName); else next.add(subjectName);
      return next;
    });
  };

  const student = useMemo(() => 
    familyMembers.find(m => m.id === studentId), 
  [familyMembers, studentId]);

  useEffect(() => {
    if (!studentId || !familyId) {
      setLoading(false);
      return;
    }
    setLoading(true);

    const unsubTests = onTestsUpdate((all) => {
      setTests(all.filter(t => t.studentId === studentId && t.status === 'Sonuçlandı'));
      setLoading(false);
    });
    const unsubBooks = onTrackedBooksUpdate(setTrackedBooks);
    const unsubBookTests = onAllTrackedBookTestsUpdate(setTrackedBookTests);
    const unsubGoals = onPerformanceGoalsUpdate(studentId, setPerformanceGoals);

    return () => {
      unsubTests();
      unsubBooks();
      unsubBookTests();
      unsubGoals();
    };
  }, [studentId, familyId]);

  const onRefresh = async () => {
    setRefreshing(true);
    // Simulate network delay for pull to refresh
    setTimeout(() => {
      setRefreshing(false);
    }, 1200);
  };

  // Data Calculations
  const enrichedData = useMemo(() => {
    const allTopics = trackedBooks.flatMap(b =>
      (b.subjects || []).flatMap(s =>
        (s.topics || []).map(t => ({ ...t, subjectName: s.name }))
      )
    );

    return tests.map(test => {
      const subjectName = getCategoryName(test);
      let topicName = 'Genel';
      if (test.topicId) {
        topicName = allTopics.find(t => t.id === test.topicId)?.name || 'Genel';
      } else if ((test as any).topic) {
        topicName = (test as any).topic;
      }

      let solvedDate = new Date();
      if (test.updatedAt) {
        solvedDate = parseISO(test.updatedAt);
      } else if (test.assignedDate) {
        try {
          solvedDate = parse(test.assignedDate, 'dd MMMM yyyy', new Date(), { locale: tr });
        } catch {
          solvedDate = new Date(test.assignedDate);
        }
      }

      const correct = test.correctAnswers || 0;
      const incorrect = test.incorrectAnswers || 0;
      const totalQ = test.questionCount || 0;
      const blank = Math.max(0, totalQ - correct - incorrect);
      const net = correct - incorrect / 3;

      let sourceItemName = test.title || 'Bilinmeyen Kaynak';
      if (test.sourceType === 'trackedBook' && test.sourceId) {
        const tbTest = trackedBookTests.find(t => t.id === test.sourceId);
        if (tbTest) {
          const book = trackedBooks.find(b => b.id === tbTest.bookId);
          if (book) sourceItemName = book.title;
        }
      }

      return {
        ...test,
        _sourceName: translateType(test.sourceType),
        _sourceItemName: sourceItemName,
        _subjectName: subjectName,
        _topicName: topicName,
        _solvedDate: solvedDate,
        _correct: correct,
        _incorrect: incorrect,
        _blank: blank,
        _totalQ: totalQ,
        _net: net
      };
    });
  }, [tests, trackedBooks, trackedBookTests]);

  const uniqueSubjects = useMemo(() => 
    Array.from(new Set(enrichedData.map(d => d._subjectName))).sort(), 
  [enrichedData]);

  // KPI calculations
  const kpis = useMemo(() => {
    const totalQ = enrichedData.reduce((acc, t) => acc + t._totalQ, 0);
    const totalC = enrichedData.reduce((acc, t) => acc + t._correct, 0);
    const totalI = enrichedData.reduce((acc, t) => acc + t._incorrect, 0);
    const totalNet = enrichedData.reduce((acc, t) => acc + t._net, 0);
    const successRate = totalQ > 0 ? (totalC / totalQ) * 100 : 0;
    const avgScore = totalQ > 0 ? (totalC / totalQ) * 5 : 0;

    return {
      totalQ,
      totalC,
      totalI,
      totalNet,
      successRate,
      avgScore,
      testCount: enrichedData.length
    };
  }, [enrichedData]);

  // Streak calculations
  const streakData = useMemo(() => {
    const uniqueDays = Array.from(new Set(enrichedData.map(t => format(t._solvedDate, 'yyyy-MM-dd'))))
      .sort((a, b) => b.localeCompare(a));
      
    if (!uniqueDays.length) return { current: 0, longest: 0 };
    const today = format(new Date(), 'yyyy-MM-dd');
    const yesterday = format(subDays(new Date(), 1), 'yyyy-MM-dd');
    
    let currentStreak = 0;
    if (uniqueDays[0] === today || uniqueDays[0] === yesterday) {
      currentStreak = 1;
      for (let i = 0; i < uniqueDays.length - 1; i++) {
        if (differenceInDays(parseISO(uniqueDays[i]), parseISO(uniqueDays[i + 1])) === 1) {
          currentStreak++;
        } else {
          break;
        }
      }
    }

    let tempStreak = 1, longestStreak = 1;
    for (let i = 0; i < uniqueDays.length - 1; i++) {
      if (differenceInDays(parseISO(uniqueDays[i]), parseISO(uniqueDays[i + 1])) === 1) {
        tempStreak++;
        if (tempStreak > longestStreak) longestStreak = tempStreak;
      } else {
        tempStreak = 1;
      }
    }
    return { current: currentStreak, longest: longestStreak };
  }, [enrichedData]);

  // Goal Progress Data
  const goalProgressData = useMemo(() => {
    return performanceGoals.map(goal => {
      const now = new Date();
      let startDate: Date;
      switch (goal.period) {
        case 'daily': startDate = startOfMonth(now); break; // daily goals track start of month in practice
        case 'weekly': startDate = startOfWeek(now, { weekStartsOn: 1 }); break;
        case 'monthly': startDate = startOfMonth(now); break;
        case 'yearly': startDate = startOfYear(now); break;
        default: startDate = goal.startDate ? parseISO(goal.startDate) : now;
      }

      const filtered = enrichedData.filter(t => {
        const inPeriod = t._solvedDate >= startDate && t._solvedDate <= now;
        const subjectMatch = goal.subject === 'all' || t._subjectName === goal.subject;
        return inPeriod && subjectMatch;
      });

      let currentValue = 0;
      if (goal.type === 'questions') {
        currentValue = filtered.reduce((acc, t) => acc + t._totalQ, 0);
      } else if (goal.type === 'net') {
        currentValue = filtered.reduce((acc, t) => acc + t._net, 0);
      } else if (goal.type === 'successRate') {
        const q = filtered.reduce((acc, t) => acc + t._totalQ, 0);
        const c = filtered.reduce((acc, t) => acc + t._correct, 0);
        currentValue = q > 0 ? (c / q) * 100 : 0;
      }

      return {
        ...goal,
        current: currentValue,
        isCompleted: currentValue >= goal.target
      };
    });
  }, [performanceGoals, enrichedData]);

  // Subject Stats Breakdown
  
  // Source Stats Breakdown
  const sourceDetailedStats = useMemo(() => {
    const sourceMap = new Map<string, any>();
    
    enrichedData.forEach(t => {
      const src = t._sourceName;
      if (!sourceMap.has(src)) sourceMap.set(src, { name: src, total: 0, correct: 0, incorrect: 0, blank: 0, net: 0, items: new Map() });
      const curSrc = sourceMap.get(src);
      
      curSrc.total += t._totalQ;
      curSrc.correct += t._correct;
      curSrc.incorrect += t._incorrect;
      curSrc.blank += t._blank;
      curSrc.net += t._net;

      const item = t._sourceItemName;
      if (!curSrc.items.has(item)) curSrc.items.set(item, { name: item, total: 0, correct: 0, incorrect: 0, blank: 0, net: 0, subjects: new Map() });
      const curItem = curSrc.items.get(item);

      curItem.total += t._totalQ;
      curItem.correct += t._correct;
      curItem.incorrect += t._incorrect;
      curItem.blank += t._blank;
      curItem.net += t._net;

      const subj = t._subjectName;
      if (!curItem.subjects.has(subj)) curItem.subjects.set(subj, { name: subj, total: 0, correct: 0, incorrect: 0, blank: 0, net: 0, topics: new Map() });
      const curSubj = curItem.subjects.get(subj);
      
      curSubj.total += t._totalQ;
      curSubj.correct += t._correct;
      curSubj.incorrect += t._incorrect;
      curSubj.blank += t._blank;
      curSubj.net += t._net;

      const top = t._topicName || 'Genel';
      if (!curSubj.topics.has(top)) curSubj.topics.set(top, { name: top, total: 0, correct: 0, incorrect: 0, blank: 0, net: 0 });
      const curTop = curSubj.topics.get(top);
      
      curTop.total += t._totalQ;
      curTop.correct += t._correct;
      curTop.incorrect += t._incorrect;
      curTop.blank += t._blank;
      curTop.net += t._net;
    });

    return Array.from(sourceMap.values()).map(s => ({
      ...s,
      successRate: s.total > 0 ? (s.correct / s.total) * 100 : 0,
      items: Array.from(s.items.values()).map((it: any) => ({
        ...it,
        successRate: it.total > 0 ? (it.correct / it.total) * 100 : 0,
        subjects: Array.from(it.subjects.values()).map((su: any) => ({
          ...su,
          successRate: su.total > 0 ? (su.correct / su.total) * 100 : 0,
          topics: Array.from(su.topics.values()).map((to: any) => ({
            ...to,
            successRate: to.total > 0 ? (to.correct / to.total) * 100 : 0
          })).sort((a: any, b: any) => b.total - a.total)
        })).sort((a: any, b: any) => b.total - a.total)
      })).sort((a: any, b: any) => b.total - a.total)
    })).sort((a: any, b: any) => b.total - a.total);
  }, [enrichedData]);


  const subjectDetailedStats = useMemo(() => {
    const map = new Map<string, { subject: string; total: number; correct: number; incorrect: number; blank: number; net: number }>();
    enrichedData.forEach(t => {
      const cur = map.get(t._subjectName) || { subject: t._subjectName, total: 0, correct: 0, incorrect: 0, blank: 0, net: 0 };
      cur.total += t._totalQ;
      cur.correct += t._correct;
      cur.incorrect += t._incorrect;
      cur.blank += t._blank;
      cur.net += t._net;
      map.set(t._subjectName, cur);
    });
    return Array.from(map.values()).map(d => ({
      ...d,
      successRate: d.total > 0 ? (d.correct / d.total) * 100 : 0
    })).sort((a, b) => b.total - a.total);
  }, [enrichedData]);

  // Topics Stats Breakdown (Weak / Strong)
  const topicStats = useMemo(() => {
    const map = new Map<string, { subject: string; topic: string; total: number; correct: number; incorrect: number; blank: number; net: number; lastPracticed: Date }>();
    enrichedData.forEach(t => {
      if (!t._topicName || t._topicName === 'Genel') return;
      const key = `${t._subjectName}-${t._topicName}`;
      const cur = map.get(key) || { subject: t._subjectName, topic: t._topicName, total: 0, correct: 0, incorrect: 0, blank: 0, net: 0, lastPracticed: new Date(0) };

      cur.total += t._totalQ;
      cur.correct += t._correct;
      cur.incorrect += t._incorrect;
      cur.blank += t._blank;
      cur.net += t._net;
      if (t._solvedDate > cur.lastPracticed) cur.lastPracticed = t._solvedDate;

      map.set(key, cur);
    });

    const list = Array.from(map.values()).map(d => ({
      ...d,
      successRate: d.total > 0 ? (d.correct / d.total) * 100 : 0
    }));

    const sorted = [...list].sort((a, b) => b.successRate - a.successRate);
    return {
      best: sorted.filter(t => t.total >= 5 && t.successRate >= 70).slice(0, 5),
      worst: sorted.filter(t => t.total >= 5 && t.successRate < 70).reverse().slice(0, 5)
    };
  }, [enrichedData]);

  const handleSaveGoal = async () => {
    if (!studentId) return;
    const targetVal = parseFloat(goalTarget);
    if (isNaN(targetVal) || targetVal <= 0) {
      Alert.alert("Hata", "Lütfen geçerli bir hedef değeri girin.");
      return;
    }

    setIsSubmitting(true);
    try {
      await addPerformanceGoal({
        memberId: studentId,
        type: goalType,
        subject: goalSubject,
        target: targetVal,
        label: goalLabel || `${goalPeriod === 'weekly' ? 'Haftalık' : goalPeriod === 'monthly' ? 'Aylık' : 'Yıllık'} Hedef`,
        period: goalPeriod,
        startDate: new Date().toISOString()
      });
      setIsAddGoalModalOpen(false);
      // Reset form
      setGoalTarget('');
      setGoalLabel('');
      setGoalSubject('all');
      setGoalType('questions');
    } catch (e) {
      Alert.alert("Hata", "Hedef eklenirken hata oluştu.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteGoal = async (id: string) => {
    Alert.alert(
      "Hedefi Sil",
      "Bu hedefi silmek istediğinizden emin misiniz?",
      [
        { text: "İptal", style: "cancel" },
        { text: "Sil", style: "destructive", onPress: async () => {
            try {
              await deletePerformanceGoal(id);
            } catch (e) {
              Alert.alert("Hata", "Hedef silinemedi.");
            }
          }
        }
      ]
    );
  };

  const bg = isDark ? '#09090f' : '#f4f5fb';
  const cardBg = isDark ? '#141420' : '#ffffff';
  const textMain = isDark ? '#f0f2ff' : '#0f172a';
  const textSub = isDark ? '#7a82a6' : '#64748b';
  const cardBorder = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)';

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: bg }}>
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: bg }}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* ── PREMIUM HEADER ── */}
      <LinearGradient 
        colors={isDark ? ['#1e1b4b', '#312e81'] : ['#4f46e5', '#6366f1']} 
        style={{ paddingTop: insets.top + 16, paddingBottom: 24, paddingHorizontal: 20, borderBottomLeftRadius: 32, borderBottomRightRadius: 32 }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <TouchableOpacity onPress={() => router.back()} style={{ width: 40, height: 40, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 20, alignItems: 'center', justifyContent: 'center' }}>
            <ArrowLeft size={24} color="white" />
          </TouchableOpacity>
          
          <View style={{ alignItems: 'center', flex: 1 }}>
            <Text style={{ color: 'white', fontSize: 20, fontWeight: '900', letterSpacing: -0.5 }}>{student ? student.name : 'Öğrenci'} Analizi</Text>
            <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 10, fontWeight: '700', marginTop: 2, letterSpacing: 1, textTransform: 'uppercase' }}>Eğitim İstatistikleri</Text>
          </View>

          <View style={{ width: 40, height: 40 }}>
            {activeTab === 'goals' && (
              <TouchableOpacity onPress={() => setIsAddGoalModalOpen(true)} style={{ width: 40, height: 40, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 20, alignItems: 'center', justifyContent: 'center' }}>
                <Plus size={20} color="white" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* GLASSMORPHISM TABS */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {(['overview', 'sources', 'subjects', 'topics', 'goals'] as const).map((tab) => {
            const labels = { overview: 'Özet', sources: 'Kaynaklar', subjects: 'Dersler', topics: 'Konular', goals: 'Hedefler' };
            const isActive = activeTab === tab;
            return (
              <TouchableOpacity
                key={tab}
                onPress={() => setActiveTab(tab)}
                activeOpacity={0.8}
                style={{
                  paddingHorizontal: 16, paddingVertical: 10,
                  borderRadius: 20,
                  backgroundColor: isActive ? 'white' : 'rgba(255,255,255,0.15)',
                  borderWidth: 1,
                  borderColor: isActive ? 'white' : 'rgba(255,255,255,0.2)',
                }}
              >
                <Text style={{ fontSize: 13, fontWeight: '800', color: isActive ? '#4f46e5' : 'white' }}>{labels[tab]}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </LinearGradient>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 100 }} showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={isDark ? "#fff" : "#6366f1"} />}>
        
        {/* OVERVIEW TAB */}
        {activeTab === 'overview' && (
          <View style={{ gap: 20 }}>
            {/* HERO STREAK CARD */}
            <LinearGradient
              colors={['#f59e0b', '#ef4444']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{ borderRadius: 28, padding: 20, overflow: 'hidden', position: 'relative' }}
            >
              <View style={{ position: 'absolute', top: -40, right: -40, width: 120, height: 120, borderRadius: 60, backgroundColor: 'rgba(255,255,255,0.1)' }} />
              <View style={{ position: 'absolute', bottom: -30, left: -20, width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(255,255,255,0.05)' }} />

              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', zIndex: 1 }}>
                <View style={{ flex: 1, marginRight: 16 }}>
                  <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 10, fontWeight: '800', letterSpacing: 1.5, textTransform: 'uppercase' }}>Çalışma Serisi</Text>
                  <Text style={{ color: 'white', fontSize: 32, fontWeight: '900', marginTop: 4, letterSpacing: -1 }}>{streakData.current} Gün</Text>
                  
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8, backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12, alignSelf: 'flex-start' }}>
                    <Flame size={12} color="#fef3c7" />
                    <Text style={{ color: '#fef3c7', fontSize: 11, fontWeight: '700' }}>En uzun: {streakData.longest} gün</Text>
                  </View>
                </View>

                <View style={{ width: 64, height: 64, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 32, alignItems: 'center', justifyContent: 'center' }}>
                  <Flame size={32} color="white" />
                </View>
              </View>
            </LinearGradient>

            {/* BENTO GRID KPIs */}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 12 }}>
              {[
                { title: 'Çözülen Sınav', value: kpis.testCount, icon: GraduationCap, color: '#3b82f6', bg: isDark ? '#1e293b' : '#eff6ff', border: isDark ? '#334155' : '#bfdbfe' },
                { title: 'Başarı Oranı', value: `%${kpis.successRate.toFixed(2).replace('.', ',')}`, icon: Percent, color: '#10b981', bg: isDark ? '#1a2e2b' : '#f0fdfa', border: isDark ? '#115e59' : '#99f6e4' },
                { title: 'Toplam Soru', value: kpis.totalQ, icon: BookOpen, color: '#8b5cf6', bg: isDark ? '#1e1a30' : '#f5f3ff', border: isDark ? '#4c1d95' : '#ddd6fe' },
                { title: 'Toplam Net', value: kpis.totalNet.toFixed(1), icon: Target, color: '#f59e0b', bg: isDark ? '#2a2510' : '#fffbeb', border: isDark ? '#78350f' : '#fde68a' },
              ].map((kpi, idx) => {
                const Icon = kpi.icon;
                return (
                  <View key={idx} style={{ width: '48%', backgroundColor: kpi.bg, borderRadius: 24, padding: 16, borderWidth: 1, borderColor: kpi.border }}>
                    <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: `${kpi.color}20`, alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
                      <Icon size={18} color={kpi.color} />
                    </View>
                    <Text style={{ fontSize: 24, fontWeight: '900', color: kpi.color, marginBottom: 4 }}>{kpi.value}</Text>
                    <Text style={{ fontSize: 10, fontWeight: '800', color: textSub, textTransform: 'uppercase', letterSpacing: 0.5 }}>{kpi.title}</Text>
                  </View>
                );
              })}
            </View>

            {/* PERFORMANCE GOALS QUICK VIEW */}
            {goalProgressData.length > 0 && (
              <View style={{ marginTop: 8 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 }}>
                  <Trophy size={16} color="#e11d48" />
                  <Text style={{ fontSize: 16, fontWeight: '800', color: textMain }}>Aktif Hedefler</Text>
                </View>

                <View style={{ gap: 12 }}>
                  {goalProgressData.slice(0, 2).map((goal) => {
                    const pct = goal.target > 0 ? (goal.current / goal.target) * 100 : 0;
                    return (
                      <View 
                        key={goal.id} 
                        style={{ backgroundColor: goal.isCompleted ? (isDark ? '#064e3b' : '#ecfdf5') : cardBg, borderRadius: 20, padding: 16, borderWidth: 1, borderColor: goal.isCompleted ? (isDark ? '#059669' : '#a7f3d0') : cardBorder }}
                      >
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                          <View style={{ flex: 1, marginRight: 12 }}>
                            <Text style={{ fontSize: 14, fontWeight: '800', color: textMain }} numberOfLines={1}>{goal.label}</Text>
                            <Text style={{ fontSize: 10, fontWeight: '700', color: textSub, marginTop: 2 }}>{goal.subject === 'all' ? 'Tüm Dersler' : goal.subject} • {goal.period === 'weekly' ? 'Haftalık' : 'Aylık'}</Text>
                          </View>
                          <Text style={{ fontSize: 16, fontWeight: '900', color: goal.isCompleted ? '#10b981' : '#6366f1' }}>%{Math.min(100, pct).toFixed(2).replace('.', ',')}</Text>
                        </View>
                        <View style={{ height: 6, backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : '#f1f5f9', borderRadius: 3, overflow: 'hidden' }}>
                          <View style={{ width: `${Math.min(100, pct)}%`, height: '100%', backgroundColor: goal.isCompleted ? '#10b981' : '#6366f1', borderRadius: 3 }} />
                        </View>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
                          <Text style={{ fontSize: 10, fontWeight: '700', color: textSub }}>{goal.current.toFixed(0)} çözülen</Text>
                          <Text style={{ fontSize: 10, fontWeight: '700', color: textSub }}>Hedef: {goal.target} {goal.type === 'questions' ? 'Soru' : goal.type === 'net' ? 'Net' : '%'}</Text>
                        </View>
                      </View>
                    );
                  })}
                </View>
              </View>
            )}
          </View>
        )}

        
        {/* SOURCES TAB */}
        {activeTab === 'sources' && (
          <View style={{ gap: 16 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              <BookCopy size={18} color="#f59e0b" />
              <Text style={{ fontSize: 16, fontWeight: '800', color: textMain }}>Kaynaklara Göre İstatistikler (Yeni)</Text>
            </View>

            {sourceDetailedStats.map((srcStat: any, idx: number) => {
              const isSrcExpanded = expandedSources.has(srcStat.name);

              return (
                <View 
                  key={srcStat.name} 
                  style={{ backgroundColor: cardBg, borderRadius: 24, padding: 16, borderWidth: 1, borderColor: cardBorder }}
                >
                  <TouchableOpacity 
                    onPress={() => toggleSource(srcStat.name)}
                    activeOpacity={0.8}
                    style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: isSrcExpanded ? 16 : 0 }}
                  >
                    <View style={{ flex: 1, marginRight: 12 }}>
                      <Text style={{ fontSize: 16, fontWeight: '900', color: textMain }}>{srcStat.name}</Text>
                      <Text style={{ fontSize: 10, fontWeight: '700', color: textSub, textTransform: 'uppercase', marginTop: 4 }}>{srcStat.total} Soru Çözüldü</Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                      <View style={{ backgroundColor: 'rgba(245,158,11,0.1)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12 }}>
                        <Text style={{ fontSize: 12, fontWeight: '900', color: '#f59e0b' }}>%{srcStat.successRate.toFixed(2).replace('.', ',')} Başarı</Text>
                      </View>
                      <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#f1f5f9', alignItems: 'center', justifyContent: 'center' }}>
                        {isSrcExpanded ? <ChevronUp size={14} color={textSub} /> : <ChevronDown size={14} color={textSub} />}
                      </View>
                    </View>
                  </TouchableOpacity>

                  {/* Level 2: Items (Specific Books/Sources) under this Source */}
                  {isSrcExpanded && (
                    <View style={{ gap: 12 }}>
                      {srcStat.items.map((itemStat: any) => {
                        const isItemExpanded = expandedSourceItems.has(`${srcStat.name}-${itemStat.name}`);

                        return (
                          <View key={itemStat.name} style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : '#f8fafc', borderRadius: 20, padding: 12, borderWidth: 1, borderColor: cardBorder }}>
                            <TouchableOpacity 
                              onPress={() => toggleSourceItem(srcStat.name, itemStat.name)}
                              activeOpacity={0.8}
                              style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: isItemExpanded ? 12 : 0 }}
                            >
                              <View style={{ flex: 1, marginRight: 8 }}>
                                <Text style={{ fontSize: 14, fontWeight: '800', color: '#3b82f6' }} numberOfLines={1}>{itemStat.name}</Text>
                                <Text style={{ fontSize: 9, fontWeight: '700', color: textSub, marginTop: 2 }}>{itemStat.total} Soru</Text>
                              </View>
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                <Text style={{ fontSize: 13, fontWeight: '900', color: itemStat.successRate >= 50 ? '#10b981' : '#f59e0b' }}>%{itemStat.successRate.toFixed(2).replace('.', ',')}</Text>
                                {isItemExpanded ? <ChevronUp size={14} color={textSub} /> : <ChevronDown size={14} color={textSub} />}
                              </View>
                            </TouchableOpacity>

                            {/* Level 3: Subjects under this Item */}
                            {isItemExpanded && (
                              <View style={{ gap: 12, paddingTop: 4 }}>
                                {itemStat.subjects.map((subjStat: any) => {
                                  const isSubjExpanded = expandedSourceSubjects.has(`${srcStat.name}-${itemStat.name}-${subjStat.name}`);
                                  
                                  return (
                                    <View key={subjStat.name} style={{ backgroundColor: isDark ? 'rgba(0,0,0,0.1)' : '#ffffff', borderRadius: 16, padding: 10, borderWidth: 1, borderColor: cardBorder }}>
                                      <TouchableOpacity 
                                        onPress={() => toggleSourceSubject(srcStat.name, itemStat.name, subjStat.name)}
                                        activeOpacity={0.8}
                                        style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}
                                      >
                                        <Text style={{ fontSize: 13, fontWeight: '800', color: textMain }}>{subjStat.name}</Text>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                          <Text style={{ fontSize: 12, fontWeight: '900', color: '#6366f1' }}>%{subjStat.successRate.toFixed(2).replace('.', ',')}</Text>
                                          {isSubjExpanded ? <ChevronUp size={12} color={textSub} /> : <ChevronDown size={12} color={textSub} />}
                                        </View>
                                      </TouchableOpacity>

                                      {/* Horizontal Progress Bar for Subject */}
                                      <View style={{ height: 4, backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#e2e8f0', borderRadius: 2, overflow: 'hidden', flexDirection: 'row', marginBottom: 6 }}>
                                        <View style={{ height: '100%', backgroundColor: '#10b981', width: `${subjStat.successRate}%` }} />
                                        <View style={{ height: '100%', backgroundColor: '#f43f5e', width: `${subjStat.total > 0 ? (subjStat.incorrect / subjStat.total) * 100 : 0}%` }} />
                                        <View style={{ height: '100%', backgroundColor: isDark ? '#475569' : '#cbd5e1', width: `${subjStat.total > 0 ? (subjStat.blank / subjStat.total) * 100 : 0}%` }} />
                                      </View>

                                      <View style={{ flexDirection: 'row', gap: 8, marginBottom: isSubjExpanded ? 10 : 0 }}>
                                        <Text style={{ fontSize: 9, fontWeight: '700', color: textSub }}>{subjStat.correct} D</Text>
                                        <Text style={{ fontSize: 9, fontWeight: '700', color: textSub }}>{subjStat.incorrect} Y</Text>
                                        <Text style={{ fontSize: 9, fontWeight: '700', color: textSub }}>{subjStat.net.toFixed(1).replace('.', ',')} Net</Text>
                                      </View>

                                      {/* Level 4: Topics under this Subject */}
                                      {isSubjExpanded && (
                                        <View style={{ paddingTop: 8, borderTopWidth: 1, borderTopColor: cardBorder, gap: 6 }}>
                                          {subjStat.topics.map((topicStat: any) => (
                                            <View key={topicStat.name} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 2 }}>
                                              <View style={{ flex: 1, marginRight: 8 }}>
                                                <Text style={{ fontSize: 11, fontWeight: '700', color: textMain }} numberOfLines={1}>{topicStat.name}</Text>
                                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
                                                  <Text style={{ fontSize: 8, fontWeight: '700', color: textSub }}>{topicStat.total} S</Text>
                                                  <View style={{ width: 2, height: 2, borderRadius: 1, backgroundColor: textSub, opacity: 0.5 }} />
                                                  <Text style={{ fontSize: 8, fontWeight: '700', color: '#10b981' }}>{topicStat.correct} D</Text>
                                                </View>
                                              </View>
                                              <Text style={{ fontSize: 11, fontWeight: '800', color: topicStat.successRate >= 70 ? '#10b981' : topicStat.successRate >= 50 ? '#f59e0b' : '#f43f5e' }}>
                                                %{topicStat.successRate.toFixed(2).replace('.', ',')}
                                              </Text>
                                            </View>
                                          ))}
                                          {subjStat.topics.length === 0 && (
                                            <Text style={{ fontSize: 9, fontWeight: '600', color: textSub, textAlign: 'center' }}>Konu detayı yok.</Text>
                                          )}
                                        </View>
                                      )}
                                    </View>
                                  );
                                })}
                                {itemStat.subjects.length === 0 && (
                                  <Text style={{ fontSize: 10, fontWeight: '700', color: textSub, textAlign: 'center', paddingVertical: 8 }}>Ders detayı bulunamadı.</Text>
                                )}
                              </View>
                            )}
                          </View>
                        );
                      })}
                      {srcStat.items.length === 0 && (
                        <Text style={{ fontSize: 11, fontWeight: '700', color: textSub, textAlign: 'center', paddingVertical: 10 }}>Kayıtlı veri bulunamadı.</Text>
                      )}
                    </View>
                  )}
                </View>
              );
            })}

            {sourceDetailedStats.length === 0 && (
              <View style={{ alignItems: 'center', paddingVertical: 40 }}>
                <AlertCircle size={40} color={textSub} style={{ opacity: 0.5, marginBottom: 12 }} />
                <Text style={{ fontSize: 14, fontWeight: '700', color: textSub }}>Henüz kaynak bazlı veri bulunmuyor.</Text>
              </View>
            )}
          </View>
        )}
        {/* SUBJECTS TAB */}
        {activeTab === 'subjects' && (
          <View style={{ gap: 16 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              <BarChart3 size={18} color="#4f46e5" />
              <Text style={{ fontSize: 16, fontWeight: '800', color: textMain }}>Derslere Göre Detaylar</Text>
            </View>

            {subjectDetailedStats.map((stat, idx) => {
              const isExpanded = expandedSubjects.has(stat.subject);
              const topicList = (() => {
                const map = new Map<string, { topic: string; total: number; correct: number; incorrect: number; blank: number; net: number }>();
                enrichedData.forEach(t => {
                  if (t._subjectName !== stat.subject || !t._topicName || t._topicName === 'Genel') return;
                  const cur = map.get(t._topicName) || { topic: t._topicName, total: 0, correct: 0, incorrect: 0, blank: 0, net: 0 };
                  cur.total += t._totalQ;
                  cur.correct += t._correct;
                  cur.incorrect += t._incorrect;
                  cur.blank += t._blank;
                  cur.net += t._net;
                  map.set(t._topicName, cur);
                });
                return Array.from(map.values()).map(d => ({
                  ...d,
                  successRate: d.total > 0 ? (d.correct / d.total) * 100 : 0
                })).sort((a, b) => b.total - a.total);
              })();

              return (
                <View 
                  key={stat.subject} 
                  style={{ backgroundColor: cardBg, borderRadius: 24, padding: 16, borderWidth: 1, borderColor: cardBorder }}
                >
                  <TouchableOpacity 
                    onPress={() => toggleSubject(stat.subject)}
                    activeOpacity={0.8}
                    style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}
                  >
                    <View style={{ flex: 1, marginRight: 12 }}>
                      <Text style={{ fontSize: 15, fontWeight: '800', color: textMain }}>{stat.subject}</Text>
                      <Text style={{ fontSize: 10, fontWeight: '700', color: textSub, textTransform: 'uppercase', marginTop: 4 }}>{stat.total} Soru Çözüldü</Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                      <View style={{ backgroundColor: 'rgba(99,102,241,0.1)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12 }}>
                        <Text style={{ fontSize: 12, fontWeight: '900', color: '#6366f1' }}>%{stat.successRate.toFixed(2).replace('.', ',')} Başarı</Text>
                      </View>
                      <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#f1f5f9', alignItems: 'center', justifyContent: 'center' }}>
                        {isExpanded ? <ChevronUp size={14} color={textSub} /> : <ChevronDown size={14} color={textSub} />}
                      </View>
                    </View>
                  </TouchableOpacity>

                  {/* Horizontal Progress Bar */}
                  <View style={{ height: 8, backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#f1f5f9', borderRadius: 4, overflow: 'hidden', flexDirection: 'row' }}>
                    <View style={{ height: '100%', backgroundColor: '#10b981', width: `${stat.successRate}%` }} />
                    <View style={{ height: '100%', backgroundColor: '#f43f5e', width: `${stat.total > 0 ? (stat.incorrect / stat.total) * 100 : 0}%` }} />
                    <View style={{ height: '100%', backgroundColor: isDark ? '#475569' : '#cbd5e1', width: `${stat.total > 0 ? (stat.blank / stat.total) * 100 : 0}%` }} />
                  </View>

                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
                    <View style={{ flexDirection: 'row', gap: 12 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#10b981' }} />
                        <Text style={{ fontSize: 11, fontWeight: '800', color: textSub }}>{stat.correct} D</Text>
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#f43f5e' }} />
                        <Text style={{ fontSize: 11, fontWeight: '800', color: textSub }}>{stat.incorrect} Y</Text>
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: isDark ? '#475569' : '#cbd5e1' }} />
                        <Text style={{ fontSize: 11, fontWeight: '800', color: textSub }}>{stat.blank} B</Text>
                      </View>
                    </View>
                    <Text style={{ fontSize: 11, fontWeight: '900', color: textMain }}>Net: <Text style={{ color: '#6366f1' }}>{stat.net.toFixed(1)}</Text></Text>
                  </View>

                  {/* Expanded details */}
                  {isExpanded && (
                    <View style={{ marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: cardBorder, gap: 10 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                        <BookOpen size={12} color="#6366f1" />
                        <Text style={{ fontSize: 10, fontWeight: '800', color: textSub, textTransform: 'uppercase', letterSpacing: 1 }}>Konu Detayları</Text>
                      </View>

                      {topicList.map((topic, i) => (
                        <View 
                          key={i} 
                          style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : '#f8fafc', borderRadius: 16, padding: 12, borderWidth: 1, borderColor: cardBorder, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
                        >
                          <View style={{ flex: 1, marginRight: 12 }}>
                            <Text style={{ fontSize: 13, fontWeight: '800', color: textMain }} numberOfLines={1}>{topic.topic}</Text>
                            <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
                              <Text style={{ fontSize: 9, fontWeight: '800', color: textSub }}>{topic.total} Soru</Text>
                              <View style={{ width: 3, height: 3, borderRadius: 1.5, backgroundColor: textSub, opacity: 0.5 }} />
                              <Text style={{ fontSize: 9, fontWeight: '800', color: '#10b981' }}>{topic.correct} D</Text>
                              <View style={{ width: 3, height: 3, borderRadius: 1.5, backgroundColor: textSub, opacity: 0.5 }} />
                              <Text style={{ fontSize: 9, fontWeight: '800', color: '#f43f5e' }}>{topic.incorrect} Y</Text>
                              <View style={{ width: 3, height: 3, borderRadius: 1.5, backgroundColor: textSub, opacity: 0.5 }} />
                              <Text style={{ fontSize: 9, fontWeight: '800', color: '#6366f1' }}>{topic.net.toFixed(1)} Net</Text>
                            </View>
                          </View>
                          <View style={{ alignItems: 'flex-end' }}>
                            <Text style={{ fontSize: 14, fontWeight: '900', color: topic.successRate >= 70 ? '#10b981' : topic.successRate >= 50 ? '#f59e0b' : '#f43f5e' }}>
                              %{topic.successRate.toFixed(2).replace('.', ',')}
                            </Text>
                            <Text style={{ fontSize: 8, fontWeight: '800', color: textSub, textTransform: 'uppercase', marginTop: 2 }}>Başarı</Text>
                          </View>
                        </View>
                      ))}

                      {topicList.length === 0 && (
                        <Text style={{ fontSize: 11, fontWeight: '700', color: textSub, textAlign: 'center', paddingVertical: 10 }}>Konu bazlı detay bulunamadı.</Text>
                      )}
                    </View>
                  )}
                </View>
              );
            })}

            {subjectDetailedStats.length === 0 && (
              <View style={{ alignItems: 'center', paddingVertical: 40 }}>
                <AlertCircle size={40} color={textSub} style={{ opacity: 0.5, marginBottom: 12 }} />
                <Text style={{ fontSize: 14, fontWeight: '700', color: textSub }}>Henüz veri bulunmuyor.</Text>
              </View>
            )}
          </View>
        )}

        {/* TOPICS TAB */}
        {activeTab === 'topics' && (
          <View style={{ gap: 24 }}>
            <View style={{ gap: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Trophy size={18} color="#f59e0b" />
                <Text style={{ fontSize: 16, fontWeight: '800', color: textMain }}>En Güçlü Konular</Text>
              </View>

              <View style={{ gap: 12 }}>
                {topicStats.best.map((topic, i) => (
                  <View 
                    key={i} 
                    style={{ backgroundColor: cardBg, borderRadius: 20, padding: 16, borderWidth: 1, borderColor: cardBorder, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
                  >
                    <View style={{ flex: 1, marginRight: 12 }}>
                      <Text style={{ fontSize: 10, fontWeight: '900', color: '#f59e0b', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>{topic.subject}</Text>
                      <Text style={{ fontSize: 14, fontWeight: '800', color: textMain }} numberOfLines={1}>{topic.topic}</Text>
                      <Text style={{ fontSize: 10, fontWeight: '700', color: textSub, marginTop: 4 }}>Toplam Soru: {topic.total}</Text>
                    </View>
                    <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(16, 185, 129, 0.1)', borderWidth: 1, borderColor: 'rgba(16, 185, 129, 0.2)', alignItems: 'center', justifyContent: 'center' }}>
                      <Text style={{ fontSize: 13, fontWeight: '900', color: '#10b981' }}>%{topic.successRate.toFixed(2).replace('.', ',')}</Text>
                    </View>
                  </View>
                ))}

                {topicStats.best.length === 0 && (
                  <View style={{ alignItems: 'center', paddingVertical: 30, borderWidth: 1, borderStyle: 'dashed', borderColor: cardBorder, borderRadius: 20 }}>
                    <Sparkles size={24} color={textSub} style={{ opacity: 0.5, marginBottom: 8 }} />
                    <Text style={{ fontSize: 11, fontWeight: '700', color: textSub }}>Veri Yetersiz (En az 5 soru çözülmeli)</Text>
                  </View>
                )}
              </View>
            </View>

            <View style={{ gap: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <AlertCircle size={18} color="#f43f5e" />
                <Text style={{ fontSize: 16, fontWeight: '800', color: textMain }}>Geliştirilmesi Gerekenler</Text>
              </View>

              <View style={{ gap: 12 }}>
                {topicStats.worst.map((topic, i) => (
                  <View 
                    key={i} 
                    style={{ backgroundColor: cardBg, borderRadius: 20, padding: 16, borderWidth: 1, borderColor: cardBorder, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
                  >
                    <View style={{ flex: 1, marginRight: 12 }}>
                      <Text style={{ fontSize: 10, fontWeight: '900', color: '#f43f5e', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>{topic.subject}</Text>
                      <Text style={{ fontSize: 14, fontWeight: '800', color: textMain }} numberOfLines={1}>{topic.topic}</Text>
                      <Text style={{ fontSize: 10, fontWeight: '700', color: textSub, marginTop: 4 }}>Toplam Soru: {topic.total}</Text>
                    </View>
                    <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(244, 63, 94, 0.1)', borderWidth: 1, borderColor: 'rgba(244, 63, 94, 0.2)', alignItems: 'center', justifyContent: 'center' }}>
                      <Text style={{ fontSize: 13, fontWeight: '900', color: '#f43f5e' }}>%{topic.successRate.toFixed(2).replace('.', ',')}</Text>
                    </View>
                  </View>
                ))}

                {topicStats.worst.length === 0 && (
                  <View style={{ alignItems: 'center', paddingVertical: 30, borderWidth: 1, borderStyle: 'dashed', borderColor: cardBorder, borderRadius: 20 }}>
                    <CheckCircle2 size={24} color="#10b981" style={{ opacity: 0.6, marginBottom: 8 }} />
                    <Text style={{ fontSize: 11, fontWeight: '700', color: textSub }}>Zayıf Konu Yok! Harika İş.</Text>
                  </View>
                )}
              </View>
            </View>
          </View>
        )}

        {/* GOALS TAB */}
        {activeTab === 'goals' && (
          <View style={{ gap: 16 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              <Trophy size={18} color="#e11d48" />
              <Text style={{ fontSize: 16, fontWeight: '800', color: textMain }}>Tüm Performans Hedefleri</Text>
            </View>

            {goalProgressData.map((goal) => {
              const pct = goal.target > 0 ? (goal.current / goal.target) * 100 : 0;
              const radius = 24;
              const strokeDasharray = 2 * Math.PI * radius;
              const strokeDashoffset = strokeDasharray - (strokeDasharray * Math.min(100, pct)) / 100;
              
              return (
                <View 
                  key={goal.id} 
                  style={{ backgroundColor: goal.isCompleted ? (isDark ? 'rgba(16,185,129,0.1)' : '#ecfdf5') : cardBg, borderRadius: 24, padding: 20, borderWidth: 1, borderColor: goal.isCompleted ? (isDark ? '#059669' : '#a7f3d0') : cardBorder, flexDirection: 'row', alignItems: 'center' }}
                >
                  <View style={{ width: 64, height: 64, alignItems: 'center', justifyContent: 'center', marginRight: 16 }}>
                    <Svg width={64} height={64} viewBox="0 0 64 64" style={{ transform: [{ rotate: '-90deg' }] }}>
                      <Circle cx="32" cy="32" r={radius} fill="none" stroke={isDark ? 'rgba(255,255,255,0.05)' : '#f1f5f9'} strokeWidth="5" />
                      <Circle cx="32" cy="32" r={radius} fill="none" stroke={goal.isCompleted ? '#10b981' : '#6366f1'} strokeWidth="5" strokeDasharray={strokeDasharray} strokeDashoffset={strokeDashoffset} strokeLinecap="round" />
                    </Svg>
                    <View style={{ position: 'absolute', alignItems: 'center', justifyContent: 'center' }}>
                      {goal.isCompleted ? <CheckCircle2 size={20} color="#10b981" /> : <Text style={{ fontSize: 13, fontWeight: '900', color: textMain }}>%{Math.min(100, pct).toFixed(2).replace('.', ',')}</Text>}
                    </View>
                  </View>

                  <View style={{ flex: 1, marginRight: 12 }}>
                    <Text style={{ fontSize: 15, fontWeight: '800', color: textMain }} numberOfLines={1}>{goal.label}</Text>
                    <Text style={{ fontSize: 10, fontWeight: '700', color: textSub, textTransform: 'uppercase', marginTop: 4 }}>Ders: {goal.subject === 'all' ? 'Tüm Dersler' : goal.subject}</Text>
                    
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 }}>
                      <View style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#f1f5f9', paddingHorizontal: 6, paddingVertical: 3, borderRadius: 6 }}>
                        <Text style={{ fontSize: 9, fontWeight: '900', color: textSub, textTransform: 'uppercase' }}>{goal.period === 'weekly' ? 'Haftalık' : goal.period === 'monthly' ? 'Aylık' : 'Yıllık'}</Text>
                      </View>
                      <Text style={{ fontSize: 11, fontWeight: '800', color: textSub }}>{goal.current.toFixed(0)} / {goal.target} {goal.type === 'questions' ? 'Soru' : goal.type === 'net' ? 'Net' : '%'}</Text>
                    </View>
                  </View>

                  <TouchableOpacity onPress={() => handleDeleteGoal(goal.id)} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(244,63,94,0.1)', alignItems: 'center', justifyContent: 'center' }}>
                    <Trash2 size={16} color="#f43f5e" />
                  </TouchableOpacity>
                </View>
              );
            })}

            {goalProgressData.length === 0 && (
              <View style={{ alignItems: 'center', paddingVertical: 40 }}>
                <Trophy size={48} color={textSub} style={{ opacity: 0.5, marginBottom: 12 }} />
                <Text style={{ fontSize: 14, fontWeight: '800', color: textMain, marginBottom: 4 }}>Hedef Bulunamadı</Text>
                <Text style={{ fontSize: 11, fontWeight: '700', color: textSub, textAlign: 'center', maxWidth: 240 }}>Sağ üstteki "+" butonuna basarak yeni hedefler oluşturabilirsiniz.</Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* ADD GOAL MODAL */}
      <Modal visible={isAddGoalModalOpen} animationType="slide" transparent={true} onRequestClose={() => setIsAddGoalModalOpen(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: bg, borderTopLeftRadius: 40, borderTopRightRadius: 40, maxHeight: '90%', paddingBottom: 40 }}>
            <View style={{ padding: 24, borderBottomWidth: 1, borderBottomColor: cardBorder, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Trophy size={20} color="#6366f1" />
                <Text style={{ fontSize: 20, fontWeight: '900', color: textMain }}>Yeni Hedef Ekle</Text>
              </View>
              <TouchableOpacity onPress={() => setIsAddGoalModalOpen(false)} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#f1f5f9', alignItems: 'center', justifyContent: 'center' }}>
                <X size={18} color={textSub} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ padding: 24 }} contentContainerStyle={{ gap: 20 }}>
              <View>
                <Text style={{ fontSize: 11, fontWeight: '800', color: textSub, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Hedef Başlığı</Text>
                <TextInput
                  placeholder="Örn: Haftalık Matematik Hedefi"
                  placeholderTextColor={textSub}
                  value={goalLabel}
                  onChangeText={setGoalLabel}
                  style={{ backgroundColor: cardBg, borderWidth: 1, borderColor: cardBorder, borderRadius: 20, paddingHorizontal: 20, paddingVertical: 16, fontSize: 15, fontWeight: '700', color: textMain }}
                />
              </View>

              <View>
                <Text style={{ fontSize: 11, fontWeight: '800', color: textSub, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Hedef Türü</Text>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {(['questions', 'net', 'successRate'] as const).map((t) => {
                    const labels = { questions: 'Soru', net: 'Net', successRate: 'Başarı (%)' };
                    const active = goalType === t;
                    return (
                      <TouchableOpacity
                        key={t}
                        onPress={() => setGoalType(t)}
                        style={{ flex: 1, paddingVertical: 14, alignItems: 'center', borderRadius: 16, backgroundColor: active ? '#6366f1' : cardBg, borderWidth: 1, borderColor: active ? '#6366f1' : cardBorder }}
                      >
                        <Text style={{ fontSize: 12, fontWeight: '800', color: active ? 'white' : textMain }}>{labels[t]}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              <View>
                <Text style={{ fontSize: 11, fontWeight: '800', color: textSub, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Dönem</Text>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {(['weekly', 'monthly', 'yearly'] as const).map((p) => {
                    const labels = { weekly: 'Haftalık', monthly: 'Aylık', yearly: 'Yıllık' };
                    const active = goalPeriod === p;
                    return (
                      <TouchableOpacity
                        key={p}
                        onPress={() => setGoalPeriod(p)}
                        style={{ flex: 1, paddingVertical: 14, alignItems: 'center', borderRadius: 16, backgroundColor: active ? '#6366f1' : cardBg, borderWidth: 1, borderColor: active ? '#6366f1' : cardBorder }}
                      >
                        <Text style={{ fontSize: 12, fontWeight: '800', color: active ? 'white' : textMain }}>{labels[p]}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              <View>
                <Text style={{ fontSize: 11, fontWeight: '800', color: textSub, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Ders Seçimi</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                  <TouchableOpacity
                    onPress={() => setGoalSubject('all')}
                    style={{ paddingHorizontal: 16, paddingVertical: 12, borderRadius: 16, backgroundColor: goalSubject === 'all' ? '#6366f1' : cardBg, borderWidth: 1, borderColor: goalSubject === 'all' ? '#6366f1' : cardBorder }}
                  >
                    <Text style={{ fontSize: 12, fontWeight: '800', color: goalSubject === 'all' ? 'white' : textMain }}>Tüm Dersler</Text>
                  </TouchableOpacity>
                  {uniqueSubjects.map(subj => (
                    <TouchableOpacity
                      key={subj}
                      onPress={() => setGoalSubject(subj)}
                      style={{ paddingHorizontal: 16, paddingVertical: 12, borderRadius: 16, backgroundColor: goalSubject === subj ? '#6366f1' : cardBg, borderWidth: 1, borderColor: goalSubject === subj ? '#6366f1' : cardBorder }}
                    >
                      <Text style={{ fontSize: 12, fontWeight: '800', color: goalSubject === subj ? 'white' : textMain }}>{subj}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              <View>
                <Text style={{ fontSize: 11, fontWeight: '800', color: textSub, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Hedef Değeri</Text>
                <TextInput
                  placeholder={goalType === 'successRate' ? 'Örn: 80' : 'Örn: 150'}
                  placeholderTextColor={textSub}
                  value={goalTarget}
                  onChangeText={setGoalTarget}
                  keyboardType="numeric"
                  style={{ backgroundColor: cardBg, borderWidth: 1, borderColor: cardBorder, borderRadius: 20, paddingHorizontal: 20, paddingVertical: 16, fontSize: 16, fontWeight: '800', color: textMain }}
                />
              </View>

              <TouchableOpacity
                onPress={handleSaveGoal}
                disabled={isSubmitting}
                style={{ backgroundColor: '#6366f1', paddingVertical: 18, borderRadius: 20, alignItems: 'center', marginTop: 10 }}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="white" size="small" />
                ) : (
                  <Text style={{ color: 'white', fontSize: 15, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1 }}>Hedefi Kaydet</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}
