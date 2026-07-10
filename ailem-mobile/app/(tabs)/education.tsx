// FORCE_RELOAD_TIMESTAMP=639189393801622631
import { 
  View, 
  Text, 
  ScrollView, 
  TouchableOpacity, 
  ActivityIndicator, 
  Modal,
  TextInput,
  Platform,
  Alert,
  RefreshControl,
  useWindowDimensions
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useEffect, useState, useMemo } from 'react';
import { 
  GraduationCap, 
  ChevronLeft, 
  Plus, 
  FileText, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  AlertCircle, 
  Timer, 
  BookOpen, 
  ChevronRight, 
  ChevronDown,
  ChevronUp,
  Check, 
  Play,
  Sparkles, 
  TrendingUp, 
  Target, 
  Settings, 
  ScrollText, 
  Ruler, 
  TestTube2, 
  BookCopy, 
  Globe, 
  MessageSquare, 
  Gamepad2, 
  ClipboardList, 
  LayoutGrid, 
  CalendarDays, 
  Calendar as CalendarIcon,
  Award,
  BookMarked,
  ListTree,
  Flame,
  Brain,
  Rocket
, BrainCircuit } from 'lucide-react-native';
import { useRouter, Stack } from 'expo-router';
import { format, parseISO, parse, isPast, isToday, addDays, isSameDay } from 'date-fns';
import { tr } from 'date-fns/locale';
import { useAuth } from '../../context/auth-context';
import { useColorScheme } from 'nativewind';
import { 
  onTestsUpdate, 
  onStudyAssignmentsUpdate, 
  onStudyPlansUpdate, 
  onTrackedBooksUpdate,
  addTest,
  updateStudyAssignment,
  onSubjectsUpdate,
  onTopicsUpdate,
  onCurriculumMapUpdate,
  safeParseDate
} from '../../lib/dataService';
import { Test, StudyAssignment, StudyPlan, TrackedBook } from '../../lib/data';
import Svg, { Circle, Defs, LinearGradient as SvgLinearGradient, Stop } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import Animated, { 
  useSharedValue, useAnimatedStyle, withTiming,
  withSpring, withRepeat, withSequence, FadeInDown
} from 'react-native-reanimated';

// Color Themes
const categoryThemes: Record<string, { bg: string; text: string; icon: any; border: string; accent: string; color: string }> = {
  'Matematik': { 
      bg: 'bg-blue-500/10 dark:bg-blue-950/20', 
      text: 'text-blue-600 dark:text-blue-400', 
      icon: Ruler, 
      border: 'border-blue-100 dark:border-blue-900/30',
      accent: 'bg-blue-500',
      color: '#3B82F6'
  },
  'Fen Bilimleri': { 
      bg: 'bg-cyan-500/10 dark:bg-cyan-950/20', 
      text: 'text-cyan-600 dark:text-cyan-400', 
      icon: TestTube2, 
      border: 'border-cyan-100 dark:border-cyan-900/30',
      accent: 'bg-cyan-500',
      color: '#06B6D4'
  },
  'Türkçe': { 
      bg: 'bg-amber-500/10 dark:bg-amber-950/20', 
      text: 'text-amber-600 dark:text-amber-400', 
      icon: BookCopy, 
      border: 'border-amber-100 dark:border-amber-900/30',
      accent: 'bg-amber-500',
      color: '#F59E0B'
  },
  'Sosyal Bilgiler': { 
      bg: 'bg-violet-500/10 dark:bg-violet-950/20', 
      text: 'text-violet-600 dark:text-violet-400', 
      icon: Globe, 
      border: 'border-violet-100 dark:border-violet-900/30',
      accent: 'bg-violet-500',
      color: '#8B5CF6'
  },
  'İngilizce': { 
      bg: 'bg-fuchsia-500/10 dark:bg-fuchsia-950/20', 
      text: 'text-fuchsia-600 dark:text-fuchsia-400', 
      icon: MessageSquare, 
      border: 'border-fuchsia-100 dark:border-fuchsia-900/30',
      accent: 'bg-fuchsia-500',
      color: '#D946EF'
  },
  'Genel Deneme Sınavları': { 
      bg: 'bg-indigo-500/10 dark:bg-indigo-950/20', 
      text: 'text-indigo-600 dark:text-indigo-400', 
      icon: ClipboardList, 
      border: 'border-indigo-100 dark:border-indigo-900/30',
      accent: 'bg-indigo-500',
      color: '#6366F1'
  },
  'Serbest Etkinlikler': { 
      bg: 'bg-emerald-500/10 dark:bg-emerald-950/20', 
      text: 'text-emerald-600 dark:text-emerald-400', 
      icon: Gamepad2, 
      border: 'border-emerald-100 dark:border-emerald-900/30',
      accent: 'bg-emerald-500',
      color: '#10B981'
  },
  'Yanlışlarım': { 
      bg: 'bg-rose-500/10 dark:bg-rose-950/20', 
      text: 'text-rose-600 dark:text-rose-400', 
      icon: AlertCircle, 
      border: 'border-rose-100 dark:border-rose-900/30',
      accent: 'bg-rose-500',
      color: '#E11D48'
  },
  'Diğer': { 
      bg: 'bg-slate-500/10 dark:bg-slate-900/20', 
      text: 'text-slate-600 dark:text-slate-400', 
      icon: FileText, 
      border: 'border-slate-200 dark:border-slate-800',
      accent: 'bg-slate-500',
      color: '#64748B'
  },
};

// ── Gamification helpers (motivational quotes, streak & XP) ──
const motivationalQuotes = [
  'Bugün harika bir öğrenme günü! 🌟',
  'Her gün biraz daha ilerliyorsun! 🚀',
  'Başarı yolunda emin adımlarla ilerliyorsun! ⭐',
  'Öğrenmek en güzel macera! 📚',
  'Küçük adımlar büyük başarılar getirir! 💪',
];

const getCategoryName = (test: Test): string => {
  if (test.sourceType === 'exam') return 'Genel Deneme Sınavları';
  if (test.sourceType === 'mistake') return 'Yanlışlarım';
  return test.subject || 'Diğer';
};

export default function EducationScreen() {
  const router = useRouter();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const insets = useSafeAreaInsets();

  const { width, height } = useWindowDimensions();
  const isTablet = Math.min(width, height) >= 600;
  const isLandscape = width > height;
  const isTabletLandscape = isTablet && isLandscape;

  const { familyMembers, loading: authLoading } = useAuth();
  const [selectedStudent, setSelectedStudent] = useState<any>(null);

  const [allTests, setAllTests] = useState<Test[]>([]);
  const [studyAssignments, setStudyAssignments] = useState<StudyAssignment[]>([]);
  const [studyPlans, setStudyPlans] = useState<StudyPlan[]>([]);
  const [trackedBooks, setTrackedBooks] = useState<TrackedBook[]>([]);
  
  const [todoViewMode, setTodoViewMode] = useState<'list' | 'week'>('week');
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
    }, 800);
  };
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<Date>(new Date());
  const [loading, setLoading] = useState(true);

  // Study plan expand tracker
  const [expandedPlans, setExpandedPlans] = useState<Set<string>>(new Set());

  // Motivational quote — pick once per mount
  const [todayQuote] = useState(() => motivationalQuotes[Math.floor(Math.random() * motivationalQuotes.length)]);

  // ── Premium UI Animations ──
  const pulseScale = useSharedValue(1);
  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }]
  }));
  useEffect(() => {
    pulseScale.value = withRepeat(
      withSequence(
        withTiming(1.12, { duration: 650 }),
        withTiming(1.0, { duration: 650 })
      ), -1
    );
  }, []);

  // Offline result modal states
  const [isOfflineModalOpen, setIsOfflineModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'single' | 'exam'>('single');
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');

  // Single test form states
  const [singleTitle, setSingleTitle] = useState('');
  const [singleDate, setSingleDate] = useState(new Date().toISOString().split('T')[0]);
  const [singleSubject, setSingleSubject] = useState('');
  const [singleTopic, setSingleTopic] = useState('Genel');
  const [singleCorrect, setSingleCorrect] = useState('');
  const [singleIncorrect, setSingleIncorrect] = useState('');
  const [singleBlank, setSingleBlank] = useState('');

  // Exam form states
  const [examName, setExamName] = useState('');
  const [examDate, setExamDate] = useState(new Date().toISOString().split('T')[0]);
  const [examSubjects, setExamSubjects] = useState<any[]>([]);

  // Dropdown options
  const [globalSubjects, setGlobalSubjects] = useState<string[]>([]);
  const [globalTopics, setGlobalTopics] = useState<string[]>([]);
  const [curriculumMap, setCurriculumMap] = useState<Record<string, string[]>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sync selectedStudentId when selectedStudent changes
  useEffect(() => {
    if (selectedStudent) {
      setSelectedStudentId(selectedStudent.id);
    }
  }, [selectedStudent]);

  // Fetch family children
  const studentMembers = useMemo(() =>
    familyMembers.filter(m => m.role && m.role.includes('Çocuk')), [familyMembers]);

  useEffect(() => {
    if (studentMembers.length > 0 && !selectedStudent) {
      setSelectedStudent(studentMembers[0]);
    }
  }, [studentMembers, selectedStudent]);

  // Listeners
  useEffect(() => {
    let unsubTests = () => {};
    let unsubAssignments = () => {};
    let unsubPlans = () => {};
    let unsubBooks = () => {};
    let unsubSubjects = () => {};
    let unsubTopics = () => {};
    let unsubCurriculum = () => {};

    try {
      unsubTests = onTestsUpdate((data) => {
        setAllTests(data || []);
      });
      unsubAssignments = onStudyAssignmentsUpdate((data) => {
        setStudyAssignments(data || []);
      });
      unsubPlans = onStudyPlansUpdate((data) => {
        setStudyPlans(data || []);
      });
      unsubBooks = onTrackedBooksUpdate((data) => {
        setTrackedBooks(data || []);
        setLoading(false);
      });
      unsubSubjects = onSubjectsUpdate((data) => {
        setGlobalSubjects(data || []);
      });
      unsubTopics = onTopicsUpdate((data) => {
        setGlobalTopics(data || []);
      });
      unsubCurriculum = onCurriculumMapUpdate((data) => {
        setCurriculumMap(data || {});
      });
    } catch (e) {
      console.log('Error initializing data listeners:', e);
      setLoading(false);
    }

    return () => {
      unsubTests();
      unsubAssignments();
      unsubPlans();
      unsubBooks();
      unsubSubjects();
      unsubTopics();
      unsubCurriculum();
    };
  }, []);

  // Filtered lists for the selected student
  const tests = useMemo(() =>
    !selectedStudent ? [] : allTests.filter(t => t.studentId === selectedStudent.id),
    [selectedStudent, allTests]);

  const assignments = useMemo(() =>
    !selectedStudent ? [] : studyAssignments.filter(s => s.studentId === selectedStudent.id),
    [selectedStudent, studyAssignments]);

  const assignmentsByBook = useMemo(() => {
    const grouped: Record<string, { title: string; plan: StudyPlan; assignments: StudyAssignment[]; total: number; completed: number }> = {};
    assignments.forEach(a => {
      const plan = studyPlans.find(p => p.id === a.studyPlanId);
      if (!plan) return;
      if (!grouped[plan.id]) grouped[plan.id] = { title: plan.title, plan, assignments: [], total: 0, completed: 0 };
      grouped[plan.id].assignments.push(a);
      grouped[plan.id].total++;
      if (a.status === 'completed') grouped[plan.id].completed++;
    });
    return Object.entries(grouped)
      .map(([id, g]) => {
         const topicOrder: Record<string, number> = {};
         let index = 0;
         if (g.plan.subjects) {
           g.plan.subjects.forEach(subject => {
             if (subject.topics) {
               subject.topics.forEach(topic => {
                 topicOrder[topic.id] = index++;
               });
             }
           });
         }
         g.assignments.sort((a, b) => {
           const idxA = topicOrder[a.topicId] ?? 99999;
           const idxB = topicOrder[b.topicId] ?? 99999;
           return idxA - idxB;
         });
         return { id, ...g };
      })
      .filter(g => g.total > 0);
  }, [assignments, studyPlans]);

  const pendingTasks = useMemo(() => {
    const tTasks = tests
      .filter(t => t.status === 'Atandı')
      .map(t => {
        let dateObj = new Date();
        try {
          dateObj = parse(t.dueDate, 'dd MMMM yyyy', new Date(), { locale: tr });
        } catch (e) {
          try {
            dateObj = parseISO(t.dueDate);
          } catch (e2) {}
        }
        
        let startObj = dateObj;
        if (t.assignedDate) {
          try {
            startObj = parse(t.assignedDate, 'dd MMMM yyyy', new Date(), { locale: tr });
          } catch (e) {
            try {
              startObj = parseISO(t.assignedDate);
            } catch (e2) {}
          }
        }

        return {
          id: t.id,
          type: 'test',
          title: t.title,
          subject: getCategoryName(t),
          dueDateStr: t.dueDate,
          dueDateObj: dateObj,
          startDateObj: startObj,
          questionCount: t.questionCount,
          durationMinutes: (t.questionCount || 0) * 2 || 30,
          planId: null,
          order: 0,
        };
      });

    const aTasks = assignments
      .filter(a => a.status === 'assigned')
      .map(a => {
        let dateObj = new Date();
        if (a.dueDate) {
          const parsed = new Date(a.dueDate);
          if (!isNaN(parsed.getTime())) dateObj = parsed;
        }
        
        let startObj = dateObj;
        if (a.startDate) {
          const parsedStart = new Date(a.startDate);
          if (!isNaN(parsedStart.getTime())) startObj = parsedStart;
        }

        const plan = studyPlans.find(p => p.id === a.studyPlanId);
        return {
          id: a.id,
          type: 'study',
          title: a.sources && a.sources.length > 1 ? `${a.topic} - ${a.sources[1]}` : a.topic,
          subject: a.subject,
          dueDateStr: format(dateObj, 'dd MMMM yyyy', { locale: tr }),
          dueDateObj: dateObj,
          startDateObj: startObj,
          questionCount: null,
          planName: plan?.title || 'Bireysel Çalışma',
          planId: plan?.id || null,
          bookId: a.bookId,
          testId: a.testId,
          order: a.order || 0,
          durationMinutes: a.durationMinutes || 30,
        };
      });

    return [...tTasks, ...aTasks].sort((a, b) => {
      const timeDiff = a.dueDateObj.getTime() - b.dueDateObj.getTime();
      if (timeDiff !== 0) return timeDiff;
      return (a.order || 0) - (b.order || 0);
    });
  }, [tests, assignments, studyPlans]);

  const focusTask = useMemo(() => {
    if (pendingTasks.length === 0) return null;
    return pendingTasks[0];
  }, [pendingTasks]);

  const stats = useMemo(() => {
    const completedTests = tests.filter(t => t.status === 'Sonuçlandı');
    const completedAssignments = assignments.filter(a => a.status === 'completed');
    const totalTasksCount = tests.length + assignments.length;
    const totalCompletedTasksCount = completedTests.length + completedAssignments.length;
    const completedRate = totalTasksCount > 0 ? (totalCompletedTasksCount / totalTasksCount) * 100 : 0;

    let totalQ = 0, totalC = 0;
    completedTests.forEach(t => { totalQ += t.questionCount || 0; totalC += t.correctAnswers || 0; });
    const successRate = totalQ > 0 ? (totalC / totalQ) * 100 : 0;
    
    const overdueCount = tests.filter(t => {
      if (t.status !== 'Atandı') return false;
      try {
        const date = parse(t.dueDate, 'dd MMMM yyyy', new Date(), { locale: tr });
        return isPast(date) && !isToday(date);
      } catch (e) {
        return false;
      }
    }).length;

    return {
      testCount: tests.length,
      pendingCount: (tests.length - completedTests.length) + (assignments.length - completedAssignments.length),
      successRate,
      averageScore: totalQ > 0 ? (totalC / totalQ) * 5 : 0,
      overdueCount,
      completedAssignmentsRate: completedRate
    };
  }, [tests, assignments]);

  // ── Gamification: derive a level & XP bar from real progress data ──
  // Every completed test/assignment is worth 10 XP. Level = every 500 XP.
  const gamification = useMemo(() => {
    const completedTests = tests.filter(t => t.status === 'Sonuçlandı').length;
    const completedAssignments = assignments.filter(a => a.status === 'completed').length;
    const totalXP = (completedTests + completedAssignments) * 10;
    const level = Math.floor(totalXP / 500) + 1;
    const xpIntoLevel = totalXP % 500;
    return { totalXP, level, xpIntoLevel, xpTarget: 500 };
  }, [tests, assignments]);

  // Streak: consecutive days (including today) with at least one completed test/assignment
  const streak = useMemo(() => {
    const completedDates = new Set<string>();
    tests.filter(t => t.status === 'Sonuçlandı' && t.dueDate).forEach(t => {
      try {
        const d = parse(t.dueDate, 'dd MMMM yyyy', new Date(), { locale: tr });
        completedDates.add(format(d, 'yyyy-MM-dd'));
      } catch (e) {}
    });
    assignments.filter(a => a.status === 'completed' && a.completedAt).forEach(a => {
      try {
        completedDates.add(format(new Date(a.completedAt as string), 'yyyy-MM-dd'));
      } catch (e) {}
    });

    let count = 0;
    let cursor = new Date();
    while (completedDates.has(format(cursor, 'yyyy-MM-dd'))) {
      count++;
      cursor = addDays(cursor, -1);
    }
    return count;
  }, [tests, assignments]);

  const subjectStats = useMemo(() => {
    const sStats: Record<string, { total: number, correct: number }> = {};
    const completedTests = tests.filter(t => t.status === 'Sonuçlandı' && t.subject);
    completedTests.forEach(t => {
      if (!sStats[t.subject!]) sStats[t.subject!] = { total: 0, correct: 0 };
      sStats[t.subject!].total += t.questionCount || 0;
      sStats[t.subject!].correct += t.correctAnswers || 0;
    });
    return Object.entries(sStats).map(([subject, data]) => ({
      subject,
      rate: data.total > 0 ? Math.round((data.correct / data.total) * 100) : 0
    })).sort((a, b) => b.rate - a.rate);
  }, [tests]);

  // Available subjects from database config
  const availableSubjects = useMemo(() => {
    return Array.from(new Set([
      ...globalSubjects,
      ...Object.keys(curriculumMap)
    ])).filter(Boolean).sort();
  }, [globalSubjects, curriculumMap]);

  // Subject -> Topics map
  const hierarchyMap = useMemo(() => {
    const map = new Map<string, Set<string>>();
    globalSubjects.forEach(s => map.set(s, new Set()));
    Object.entries(curriculumMap).forEach(([subj, topics]) => {
      if (!map.has(subj)) map.set(subj, new Set());
      topics.forEach(t => map.get(subj)!.add(t));
    });
    return map;
  }, [globalSubjects, curriculumMap]);

  // Filtered topics list for selected subject in single test modal
  const availableTopics = useMemo(() => {
    if (!singleSubject) return ['Genel'];
    return Array.from(new Set([
      ...Array.from(hierarchyMap.get(singleSubject) || new Set<string>()).filter(t => globalTopics.includes(t)),
      'Genel'
    ])).filter(Boolean).sort((a, b) => a.localeCompare(b, 'tr'));
  }, [singleSubject, hierarchyMap, globalTopics]);

  // Autofill exam subjects once subjects are loaded
  useEffect(() => {
    if (availableSubjects.length > 0 && examSubjects.length === 0) {
      setExamSubjects(availableSubjects.map((s: string) => ({
        id: Math.random().toString(36).substring(7),
        subjectName: s,
        correct: 0,
        incorrect: 0,
        blank: 0
      })));
    }
  }, [availableSubjects]);

  // Handlers
  const handleCompleteStudy = async (id: string, currentStatus: string) => {
    try {
      const newStatus = currentStatus === 'completed' ? 'assigned' : 'completed';
      await updateStudyAssignment(id, { 
        status: newStatus as any, 
        completedAt: newStatus === 'completed' ? new Date().toISOString() : undefined 
      });
    } catch (e) {
      console.log('Error completing study topic:', e);
    }
  };

  const togglePlan = (id: string) => {
    setExpandedPlans(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleSaveSingle = async () => {
    if (!selectedStudentId || !singleSubject) {
      Alert.alert("Hata", "Lütfen öğrenci ve ders seçin.");
      return;
    }
    const correct = parseInt(singleCorrect) || 0;
    const incorrect = parseInt(singleIncorrect) || 0;
    const blank = parseInt(singleBlank) || 0;
    const totalQ = correct + incorrect + blank;

    if (totalQ === 0) {
      Alert.alert("Hata", "Lütfen en az bir soru verisi girin.");
      return;
    }

    setIsSubmitting(true);
    try {
      const newTest: Omit<Test, 'id' | 'familyId' | 'questions'> = {
        title: singleTitle || `${singleSubject} - ${singleTopic} (Dışarıdan Eklendi)`,
        subject: singleSubject,
        topicId: singleTopic,
        studentId: selectedStudentId,
        questionCount: totalQ,
        assignedDate: new Date(singleDate).toISOString(),
        dueDate: new Date(singleDate).toISOString(),
        status: 'Sonuçlandı',
        isArchived: false,
        sourceType: 'offline',
        correctAnswers: correct,
        incorrectAnswers: incorrect,
        emptyAnswers: blank,
        score: totalQ > 0 ? (correct / totalQ) * 100 : 0
      };

      await addTest(newTest);
      Alert.alert("Başarılı", "Test sonucu başarıyla kaydedildi.");
      setIsOfflineModalOpen(false);
      // Reset form
      setSingleTitle('');
      setSingleCorrect('');
      setSingleIncorrect('');
      setSingleBlank('');
    } catch (error) {
      console.error(error);
      Alert.alert("Hata", "Kaydedilirken bir hata oluştu.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveExam = async () => {
    if (!selectedStudentId || !examName) {
      Alert.alert("Hata", "Lütfen öğrenci ve deneme adı girin.");
      return;
    }

    const validSubjects = examSubjects.filter((s: any) => s.subjectName && (s.correct + s.incorrect + s.blank) > 0);
    if (validSubjects.length === 0) {
      Alert.alert("Hata", "Lütfen en az bir ders için soru adeti girin.");
      return;
    }

    setIsSubmitting(true);
    try {
      const promises = validSubjects.map((subj: any) => {
        const totalQ = subj.correct + subj.incorrect + subj.blank;
        const newTest: Omit<Test, 'id' | 'familyId' | 'questions'> = {
          title: `${examName} - ${subj.subjectName}`,
          subject: subj.subjectName,
          topicId: "Genel",
          studentId: selectedStudentId,
          questionCount: totalQ,
          assignedDate: new Date(examDate).toISOString(),
          dueDate: new Date(examDate).toISOString(),
          status: 'Sonuçlandı',
          isArchived: false,
          sourceType: 'offline',
          correctAnswers: subj.correct,
          incorrectAnswers: subj.incorrect,
          emptyAnswers: subj.blank,
          score: totalQ > 0 ? (subj.correct / totalQ) * 100 : 0
        };
        return addTest(newTest);
      });

      await Promise.all(promises);
      Alert.alert("Başarılı", "Deneme sınav sonuçları başarıyla kaydedildi.");
      setIsOfflineModalOpen(false);
      // Reset form
      setExamName('');
    } catch (error) {
      console.error(error);
      Alert.alert("Hata", "Kaydedilirken bir hata oluştu.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const calendarDays = useMemo(() => {
    return Array.from({ length: 7 }).map((_, i) => addDays(new Date(), i));
  }, []);

  const activeDayTasks = useMemo(() => {
    return pendingTasks.filter(t => {
      const cTime = new Date(selectedCalendarDate).setHours(0, 0, 0, 0);
      const sTime = new Date(t.startDateObj).setHours(0, 0, 0, 0);
      return isSameDay(selectedCalendarDate, new Date()) ? sTime <= cTime : sTime === cTime;
    });
  }, [pendingTasks, selectedCalendarDate]);

  if (loading || authLoading) {
    return (
      <SafeAreaView className="flex-1 justify-center items-center bg-slate-50 dark:bg-slate-950">
        <ActivityIndicator size="large" color="#6366f1" />
      </SafeAreaView>
    );
  }
  const bg = isDark ? '#07081a' : '#f0f4ff';
  const cardBg = isDark ? 'rgba(255,255,255,0.05)' : '#ffffff';
  const cardBorder = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)';
  const textMain = isDark ? '#f0f2ff' : '#0f172a';
  const textSub = isDark ? '#8892b5' : '#64748b';
  const textMuted = isDark ? '#484f70' : '#cbd5e1';

  const renderFocusBar = () => {
    if (!selectedStudent) return null;
    const isOverdue = focusTask && isPast(focusTask.dueDateObj) && !isToday(focusTask.dueDateObj);
    return (
      <Animated.View entering={FadeInDown.delay(50).springify()} style={{ paddingHorizontal: isTabletLandscape ? 0 : 20, marginBottom: isTabletLandscape ? 0 : 20 }}>
        <LinearGradient
          colors={isOverdue ? ['#f97316', '#dc2626', '#7f1d1d'] : ['#4f46e5', '#9333ea', '#db2777']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ borderRadius: 28, padding: 20, flexDirection: 'row', alignItems: 'center', gap: 16, shadowColor: isOverdue ? '#dc2626' : '#9333ea', shadowOffset: { width: 0, height: 16 }, shadowOpacity: 0.45, shadowRadius: 24, elevation: 10 }}
        >
          {/* Left icon */}
          <View style={{ width: 56, height: 56, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' }}>
            {focusTask ? <Target size={26} color="white" /> : <CheckCircle2 size={26} color="#34d399" />}
          </View>

          {/* Content */}
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 5 }}>
              <Sparkles size={11} color="#fcd34d" />
              <Text style={{ fontSize: 10, fontWeight: '900', color: 'rgba(255,255,255,0.65)', letterSpacing: 1.5, textTransform: 'uppercase' }}>
                {focusTask ? 'Sıradaki Hedef' : 'Harika İş!'}
              </Text>
            </View>
            {focusTask ? (
              <>
                <Text style={{ color: 'white', fontSize: 16, fontWeight: '900', letterSpacing: -0.3 }} numberOfLines={1}>{focusTask.title}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 6 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Clock size={11} color="rgba(255,255,255,0.55)" />
                    <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11, fontWeight: '700' }}>{focusTask.dueDateStr}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Timer size={11} color="rgba(255,255,255,0.55)" />
                    <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11, fontWeight: '700' }}>{focusTask.durationMinutes} dk</Text>
                  </View>
                  {isOverdue && (
                    <View style={{ backgroundColor: 'rgba(239,68,68,0.3)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 }}>
                      <Text style={{ fontSize: 9, fontWeight: '900', color: '#fca5a5' }}>GECİKTİ</Text>
                    </View>
                  )}
                </View>
              </>
            ) : (
              <Text style={{ color: 'white', fontSize: 15, fontWeight: '900' }}>Tüm görevler tamamlandı 🎉</Text>
            )}
          </View>

          {/* Action button */}
          <TouchableOpacity
            onPress={() => {
              if (focusTask) {
                if (focusTask.type === 'test') {
                  router.push({ pathname: '/exam-detail', params: { id: focusTask.id } });
                } else if (focusTask.planId) {
                  router.push({ pathname: '/plan-detail', params: { id: focusTask.planId } });
                } else if ((focusTask as any).bookId && (focusTask as any).testId) {
                  router.push({ pathname: '/book-test-solver', params: { bookId: (focusTask as any).bookId, testId: (focusTask as any).testId, assignmentId: focusTask.id } });
                } else {
                  Alert.alert('Ödevi Tamamla', 'Bu ödevi tamamlandı olarak işaretlemek ister misiniz?', [
                    { text: 'İptal', style: 'cancel' },
                    { text: 'Tamamla', onPress: () => handleCompleteStudy(focusTask.id, 'assigned') }
                  ]);
                }
              }
            }}
            disabled={!focusTask}
            activeOpacity={0.8}
            style={{ alignItems: 'center' }}
          >
            <Animated.View style={[
              { width: 52, height: 52, borderRadius: 26, backgroundColor: 'rgba(255,255,255,0.92)', alignItems: 'center', justifyContent: 'center' },
              focusTask ? pulseStyle : {}
            ]}>
              {focusTask
                ? <Play size={20} color="#9333ea" fill="#9333ea" style={{ marginLeft: 3 }} />
                : <Check size={22} color="#10b981" />
              }
            </Animated.View>
            <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 9, fontWeight: '900', marginTop: 5, textTransform: 'uppercase', letterSpacing: 0.8 }}>
              {focusTask ? 'Başlat' : 'Tamam'}
            </Text>
          </TouchableOpacity>
        </LinearGradient>
      </Animated.View>
    );
  };
  const renderStatsGrid = () => {
    type GC = readonly [string, string, ...string[]];
    // Compact chip-style stat cards, single row, with spring-in animation.
    const statCards: { label: string; value: string | number; icon: any; colors: GC; iconColor: string; trend?: boolean }[] = [
      { label: 'Tamamlanan', value: gamification.totalXP > 0 ? (gamification.totalXP / 10) : 0, icon: Brain, colors: (isDark ? ['#0c1f3d', '#0f2a52'] : ['#eff6ff', '#dbeafe']) as GC, iconColor: '#2563EB', trend: true },
      { label: 'Başarı', value: '%' + stats.successRate.toFixed(0), icon: Rocket, colors: (isDark ? ['#2a1a3d', '#341f4d'] : ['#f5f3ff', '#ede9fe']) as GC, iconColor: '#7C3AED', trend: true },
      { label: 'Bekleyen', value: stats.pendingCount, icon: Clock, colors: (isDark ? ['#3d2c0c', '#4d3a10'] : ['#fffbeb', '#fef3c7']) as GC, iconColor: '#d97706' },
      { label: 'Geciken', value: stats.overdueCount, icon: AlertCircle, colors: (stats.overdueCount > 0 ? (isDark ? ['#3d0c0c', '#4d1010'] : ['#fef2f2', '#fee2e2']) : (isDark ? ['#0c1a12', '#0f2417'] : ['#ecfdf5', '#d1fae5'])) as GC, iconColor: stats.overdueCount > 0 ? '#ef4444' : '#10b981' },
    ];
    return (
      <View style={{ paddingHorizontal: isTabletLandscape ? 0 : 20, marginBottom: isTabletLandscape ? 0 : 24 }}>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {statCards.map((card, idx) => {
            const Icon = card.icon;
            return (
              <Animated.View
                key={idx}
                entering={FadeInDown.delay(60 + idx * 90).springify().damping(11).stiffness(140)}
                style={{ flex: 1 }}
              >
                <LinearGradient
                  colors={card.colors}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={{
                    borderRadius: 18,
                    paddingVertical: 12,
                    paddingHorizontal: 10,
                    alignItems: 'center',
                    borderWidth: 1,
                    borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.03)',
                    shadowColor: card.iconColor,
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: isDark ? 0.25 : 0.12,
                    shadowRadius: 8,
                    elevation: 2,
                  }}
                >
                  <View style={{ width: 28, height: 28, borderRadius: 10, backgroundColor: card.iconColor + '1E', alignItems: 'center', justifyContent: 'center', marginBottom: 6 }}>
                    <Icon size={14} color={card.iconColor} />
                  </View>
                  <Text style={{ fontSize: 17, fontWeight: '900', color: textMain, letterSpacing: -0.5 }} numberOfLines={1}>{card.value}</Text>
                  <Text style={{ fontSize: 9, fontWeight: '700', color: textSub, marginTop: 1 }} numberOfLines={1}>{card.label}</Text>
                </LinearGradient>
              </Animated.View>
            );
          })}
        </View>
      </View>
    );
  };
  const renderQuickActions = () => {
    type GC = readonly [string, string, ...string[]];
    const actions: { name: string; desc: string; icon: any; colors: GC; shadowColor: string; route: string }[] = [
      { name: 'Konu Planı', desc: 'Ders Yol Haritası', icon: BookMarked, colors: ['#4f46e5', '#7c3aed'] as const, shadowColor: '#6366f1', route: '/study-plans' },
      { name: 'Ders Özetleri', desc: 'Akıllı Not Kartları', icon: ScrollText, colors: ['#7c3aed', '#c026d3'] as const, shadowColor: '#a855f7', route: '/summaries' },
      { name: 'Sınav Analiz', desc: 'Net Dağılımları', icon: ListTree, colors: ['#2563eb', '#4f46e5'] as const, shadowColor: '#4f46e5', route: '/education-results' },
      { name: 'Hatalarım', desc: 'Tüm Yanlış Sorular', icon: AlertCircle, colors: ['#c026d3', '#e11d48'] as const, shadowColor: '#db2777', route: '/mistakes' },
    ];
    return (
      <View style={{ paddingHorizontal: isTabletLandscape ? 0 : 20, marginBottom: isTabletLandscape ? 0 : 28 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 }}>
          <Text style={{ fontSize: 11, fontWeight: '900', color: textSub, textTransform: 'uppercase', letterSpacing: 1.5 }}>⚡ Hızlı Erişim</Text>
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
          {actions.map((item, idx) => {
            const Icon = item.icon;
            return (
              <Animated.View key={idx} entering={FadeInDown.delay(160 + idx * 60).springify()} style={{ width: isTabletLandscape ? '100%' : '47%', flexGrow: 1 }}>
                <TouchableOpacity onPress={() => router.push(item.route as any)} activeOpacity={0.75}>
                  <LinearGradient
                    colors={item.colors}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={{ borderRadius: 22, padding: 18, flexDirection: 'row', alignItems: 'center', gap: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)', shadowColor: item.shadowColor, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.4, shadowRadius: 16, elevation: 6 }}
                  >
                    <View style={{ width: 46, height: 46, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' }}>
                      <Icon size={22} color="white" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 13, fontWeight: '900', color: 'white' }} numberOfLines={1}>{item.name}</Text>
                      <Text style={{ fontSize: 10, fontWeight: '700', color: 'rgba(255,255,255,0.6)', marginTop: 2 }}>{item.desc}</Text>
                    </View>
                    <ChevronRight size={16} color="rgba(255,255,255,0.35)" />
                  </LinearGradient>
                </TouchableOpacity>
              </Animated.View>
            );
          })}
        </View>
      </View>
    );
  };
  const renderWeeklyScheduler = () => {
    return (
      <Animated.View entering={FadeInDown.delay(300).springify()} style={{ paddingHorizontal: isTabletLandscape ? 0 : 20, marginBottom: isTabletLandscape ? 0 : 28 }}>

        {/* ── Section Header ── */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: isDark ? 'rgba(99,102,241,0.2)' : 'rgba(99,102,241,0.12)', alignItems: 'center', justifyContent: 'center' }}>
              <CalendarDays size={16} color="#6366f1" />
            </View>
            <View>
              <Text style={{ fontSize: 15, fontWeight: '900', color: textMain, letterSpacing: -0.3 }}>Haftalık Takvim</Text>
              <Text style={{ fontSize: 10, fontWeight: '700', color: textSub, letterSpacing: 0.3 }}>
                {activeDayTasks.length > 0 ? `${activeDayTasks.length} görev planlandı` : 'Seçili gün temiz 🎉'}
              </Text>
            </View>
          </View>

          {/* View Mode Toggle */}
          <View style={{ flexDirection: 'row', backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#f1f5f9', borderRadius: 14, padding: 3, borderWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }}>
            {(['week', 'list'] as const).map(mode => (
              <TouchableOpacity
                key={mode}
                onPress={() => setTodoViewMode(mode)}
                style={{
                  paddingHorizontal: 14, paddingVertical: 6, borderRadius: 11,
                  backgroundColor: todoViewMode === mode
                    ? (isDark ? '#4f46e5' : 'white')
                    : 'transparent',
                  shadowColor: todoViewMode === mode ? '#4f46e5' : 'transparent',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.4,
                  shadowRadius: 6,
                }}
              >
                <Text style={{ fontSize: 11, fontWeight: '800', color: todoViewMode === mode ? (isDark ? 'white' : '#4f46e5') : textSub }}>
                  {mode === 'week' ? 'Hafta' : 'Liste'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {todoViewMode === 'week' ? (
          <View>
            {/* ── Calendar Strip ── */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 18 }}>
              {calendarDays.map((day, i) => {
                const active = isSameDay(selectedCalendarDate, day);
                const isDayToday = isToday(day);
                const dayTasks = pendingTasks.filter(t => {
                  const cTime = new Date(day).setHours(0, 0, 0, 0);
                  const sTime = new Date(t.startDateObj).setHours(0, 0, 0, 0);
                  return isDayToday ? sTime <= cTime : sTime === cTime;
                });
                const taskCount = dayTasks.length;

                return (
                  <TouchableOpacity
                    key={i}
                    onPress={() => setSelectedCalendarDate(day)}
                    activeOpacity={0.8}
                  >
                    {active ? (
                      <LinearGradient
                        colors={['#4f46e5', '#7c3aed']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 0, y: 1 }}
                        style={{
                          width: 62, height: 80, borderRadius: 22,
                          alignItems: 'center', justifyContent: 'center',
                          shadowColor: '#6366f1', shadowOffset: { width: 0, height: 8 },
                          shadowOpacity: 0.55, shadowRadius: 16, elevation: 10,
                        }}
                      >
                        <Text style={{ fontSize: 10, fontWeight: '800', color: 'rgba(255,255,255,0.75)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                          {format(day, 'eee', { locale: tr })}
                        </Text>
                        <Text style={{ fontSize: 22, fontWeight: '900', color: 'white', marginTop: 2 }}>
                          {format(day, 'd')}
                        </Text>
                        {taskCount > 0 ? (
                          <View style={{ marginTop: 5, backgroundColor: 'rgba(255,255,255,0.25)', paddingHorizontal: 7, paddingVertical: 1, borderRadius: 8 }}>
                            <Text style={{ fontSize: 9, fontWeight: '900', color: 'white' }}>{taskCount}</Text>
                          </View>
                        ) : (
                          <View style={{ width: 5, height: 5, borderRadius: 2.5, backgroundColor: '#34d399', marginTop: 5 }} />
                        )}
                      </LinearGradient>
                    ) : (
                      <View
                        style={{
                          width: 62, height: 80, borderRadius: 22,
                          backgroundColor: isDayToday
                            ? (isDark ? 'rgba(99,102,241,0.15)' : 'rgba(99,102,241,0.08)')
                            : cardBg,
                          borderWidth: isDayToday ? 1.5 : 1,
                          borderColor: isDayToday ? 'rgba(99,102,241,0.4)' : cardBorder,
                          alignItems: 'center', justifyContent: 'center',
                        }}
                      >
                        <Text style={{ fontSize: 10, fontWeight: '800', color: isDayToday ? '#6366f1' : textSub, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                          {format(day, 'eee', { locale: tr })}
                        </Text>
                        <Text style={{ fontSize: 20, fontWeight: '900', color: isDayToday ? '#6366f1' : textMain, marginTop: 2 }}>
                          {format(day, 'd')}
                        </Text>
                        {taskCount > 0 ? (
                          <View style={{ flexDirection: 'row', gap: 3, marginTop: 6 }}>
                            {Array.from({ length: Math.min(taskCount, 3) }).map((_, dot) => (
                              <View key={dot} style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: '#6366f1' }} />
                            ))}
                          </View>
                        ) : (
                          <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.1)', marginTop: 6 }} />
                        )}
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* ── Selected Day Task List ── */}
            <View style={{ gap: 10 }}>
              {activeDayTasks.length > 0 ? (
                activeDayTasks.map((task, idx) => {
                  const theme = categoryThemes[task.subject] || categoryThemes['Diğer'];
                  const IconComponent = theme.icon;
                  const overdue = isPast(task.dueDateObj) && !isToday(task.dueDateObj);

                  return (
                    <Animated.View key={task.id} entering={FadeInDown.delay(idx * 60).springify()}>
                      <TouchableOpacity
                        onPress={() => {
                          if (task.type === 'test') router.push({ pathname: '/exam-detail', params: { id: task.id } });
                          else if (task.planId) router.push({ pathname: '/plan-detail', params: { id: task.planId } });
                          else if ((task as any).bookId && (task as any).testId) router.push({ pathname: '/book-test-solver', params: { bookId: (task as any).bookId, testId: (task as any).testId, assignmentId: task.id } });
                          else Alert.alert("Ödevi Tamamla", "Bu ödevi tamamlandı olarak işaretlemek ister misiniz?", [{ text: "İptal", style: "cancel" }, { text: "Tamamla", onPress: () => handleCompleteStudy(task.id, 'assigned') }]);
                        }}
                        activeOpacity={0.75}
                        style={{
                          backgroundColor: cardBg,
                          borderRadius: 20,
                          borderWidth: 1,
                          borderColor: overdue ? '#ef444430' : cardBorder,
                          flexDirection: 'row',
                          alignItems: 'center',
                          overflow: 'hidden',
                          shadowColor: theme.color,
                          shadowOffset: { width: 0, height: 4 },
                          shadowOpacity: isDark ? 0.15 : 0.08,
                          shadowRadius: 12,
                          elevation: 3,
                        }}
                      >
                        {/* Left color accent bar */}
                        <View style={{ width: 4, alignSelf: 'stretch', backgroundColor: overdue ? '#ef4444' : theme.color, borderTopLeftRadius: 20, borderBottomLeftRadius: 20 }} />

                        {/* Icon */}
                        <View style={{ margin: 14, width: 46, height: 46, borderRadius: 16, backgroundColor: theme.color + '18', alignItems: 'center', justifyContent: 'center' }}>
                          <IconComponent size={22} color={theme.color} />
                        </View>

                        {/* Content */}
                        <View style={{ flex: 1, paddingVertical: 14, paddingRight: 4 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                            <View style={{ backgroundColor: theme.color + '20', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 }}>
                              <Text style={{ fontSize: 9, fontWeight: '900', color: theme.color, textTransform: 'uppercase', letterSpacing: 0.6 }}>{task.subject}</Text>
                            </View>
                            {overdue && (
                              <View style={{ backgroundColor: '#ef444420', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 }}>
                                <Text style={{ fontSize: 9, fontWeight: '900', color: '#ef4444' }}>GECİKTİ</Text>
                              </View>
                            )}
                          </View>
                          <Text style={{ fontSize: 13, fontWeight: '800', color: textMain, marginBottom: 6 }} numberOfLines={1}>{task.title}</Text>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                              <Timer size={10} color={textMuted} />
                              <Text style={{ fontSize: 10, fontWeight: '700', color: textSub }}>{task.durationMinutes} dk</Text>
                            </View>
                            {task.questionCount ? (
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                <FileText size={10} color={textMuted} />
                                <Text style={{ fontSize: 10, fontWeight: '700', color: textSub }}>{task.questionCount} soru</Text>
                              </View>
                            ) : null}
                          </View>
                        </View>

                        {/* Arrow */}
                        <View style={{ paddingRight: 14 }}>
                          <View style={{ width: 30, height: 30, borderRadius: 10, backgroundColor: theme.color + '15', alignItems: 'center', justifyContent: 'center' }}>
                            <ChevronRight size={15} color={theme.color} />
                          </View>
                        </View>
                      </TouchableOpacity>
                    </Animated.View>
                  );
                })
              ) : (
                <LinearGradient
                  colors={isDark ? ['#064e3b', '#065f46'] : ['#ecfdf5', '#d1fae5']}
                  style={{ padding: 36, borderRadius: 24, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(52,211,153,0.25)' }}
                >
                  <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(16,185,129,0.2)', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
                    <CheckCircle2 size={30} color="#34d399" />
                  </View>
                  <Text style={{ fontSize: 16, fontWeight: '900', color: isDark ? 'white' : '#065f46', marginBottom: 6 }}>Bugün ödev yok! 🎉</Text>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: isDark ? 'rgba(255,255,255,0.6)' : '#047857' }}>Zihninizi dinlendirmek için harika bir an!</Text>
                </LinearGradient>
              )}
            </View>
          </View>
        ) : (
          /* ── List View ── */
          <View style={{ gap: 10 }}>
            {pendingTasks.length === 0 ? (
              <LinearGradient
                colors={isDark ? ['#064e3b', '#065f46'] : ['#ecfdf5', '#d1fae5']}
                style={{ padding: 36, borderRadius: 24, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(52,211,153,0.25)' }}
              >
                <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(16,185,129,0.2)', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
                  <CheckCircle2 size={30} color="#34d399" />
                </View>
                <Text style={{ fontSize: 16, fontWeight: '900', color: isDark ? 'white' : '#065f46', marginBottom: 6 }}>Tüm görevler tamam! 🎉</Text>
                <Text style={{ fontSize: 12, fontWeight: '700', color: isDark ? 'rgba(255,255,255,0.6)' : '#047857' }}>Müthiş bir iş çıkardınız!</Text>
              </LinearGradient>
            ) : (
              pendingTasks.map((task, idx) => {
                const theme = categoryThemes[task.subject] || categoryThemes['Diğer'];
                const IconComponent = theme.icon;
                const overdue = isPast(task.dueDateObj) && !isToday(task.dueDateObj);
                return (
                  <Animated.View key={task.id} entering={FadeInDown.delay(idx * 50).springify()}>
                    <TouchableOpacity
                      onPress={() => {
                        if (task.type === 'test') router.push({ pathname: '/exam-detail', params: { id: task.id } });
                        else if (task.planId) router.push({ pathname: '/plan-detail', params: { id: task.planId } });
                        else if ((task as any).bookId && (task as any).testId) router.push({ pathname: '/book-test-solver', params: { bookId: (task as any).bookId, testId: (task as any).testId, assignmentId: task.id } });
                        else Alert.alert("Ödevi Tamamla", "Bu ödevi tamamlandı olarak işaretlemek ister misiniz?", [{ text: "İptal", style: "cancel" }, { text: "Tamamla", onPress: () => handleCompleteStudy(task.id, 'assigned') }]);
                      }}
                      activeOpacity={0.75}
                      style={{
                        backgroundColor: cardBg,
                        borderRadius: 20,
                        borderWidth: 1,
                        borderColor: overdue ? '#ef444430' : cardBorder,
                        flexDirection: 'row',
                        alignItems: 'center',
                        overflow: 'hidden',
                        shadowColor: theme.color,
                        shadowOffset: { width: 0, height: 4 },
                        shadowOpacity: isDark ? 0.12 : 0.07,
                        shadowRadius: 12,
                        elevation: 3,
                      }}
                    >
                      {/* Left accent bar */}
                      <View style={{ width: 4, alignSelf: 'stretch', backgroundColor: overdue ? '#ef4444' : theme.color, borderTopLeftRadius: 20, borderBottomLeftRadius: 20 }} />

                      {/* Icon */}
                      <View style={{ margin: 14, width: 44, height: 44, borderRadius: 14, backgroundColor: theme.color + '18', alignItems: 'center', justifyContent: 'center' }}>
                        <IconComponent size={20} color={theme.color} />
                      </View>

                      {/* Content */}
                      <View style={{ flex: 1, paddingVertical: 14, paddingRight: 4 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                          <View style={{ backgroundColor: theme.color + '20', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 }}>
                            <Text style={{ fontSize: 9, fontWeight: '900', color: theme.color, textTransform: 'uppercase', letterSpacing: 0.6 }}>{task.subject}</Text>
                          </View>
                          {overdue && (
                            <View style={{ backgroundColor: '#ef444420', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 }}>
                              <Text style={{ fontSize: 9, fontWeight: '900', color: '#ef4444' }}>GECİKTİ</Text>
                            </View>
                          )}
                        </View>
                        <Text style={{ fontSize: 13, fontWeight: '800', color: textMain, marginBottom: 6 }} numberOfLines={1}>{task.title}</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                            <CalendarIcon size={10} color={textMuted} />
                            <Text style={{ fontSize: 10, fontWeight: '700', color: textSub }}>{task.dueDateStr}</Text>
                          </View>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                            <Timer size={10} color={textMuted} />
                            <Text style={{ fontSize: 10, fontWeight: '700', color: textSub }}>{task.durationMinutes} dk</Text>
                          </View>
                        </View>
                      </View>

                      {/* Arrow */}
                      <View style={{ paddingRight: 14 }}>
                        <View style={{ width: 30, height: 30, borderRadius: 10, backgroundColor: theme.color + '15', alignItems: 'center', justifyContent: 'center' }}>
                          <ChevronRight size={15} color={theme.color} />
                        </View>
                      </View>
                    </TouchableOpacity>
                  </Animated.View>
                );
              })
            )}
          </View>
        )}
      </Animated.View>
    );
  };

  const renderSubjectProgress = () => {
    if (!selectedStudent || subjectStats.length === 0) return null;
    return (
      <View style={{ marginBottom: isTabletLandscape ? 0 : 28 }}>
        <View style={{ paddingHorizontal: isTabletLandscape ? 0 : 20, marginBottom: 12 }}>
          <Text style={{ fontSize: 14, fontWeight: '900', color: textSub, textTransform: 'uppercase', letterSpacing: 0.8 }}>Ders İlerlemeleri</Text>
        </View>
        
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: isTabletLandscape ? 0 : 20, gap: 12 }}>
          {subjectStats.map((stat, idx) => {
            const theme = categoryThemes[stat.subject] || categoryThemes['Diğer'];
            const Icon = theme.icon;
            return (
              <TouchableOpacity
                key={idx}
                onPress={() => router.push({ pathname: '/education-stats', params: { studentId: selectedStudent.id } })}
                activeOpacity={0.85}
                style={{
                  width: 150,
                  backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#ffffff',
                  borderRadius: 24,
                  padding: 16,
                  borderWidth: 1,
                  borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)',
                  shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.25, shadowRadius: 16
                }}
              >
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                  <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: `${theme.color}15`, alignItems: 'center', justifyContent: 'center' }}>
                     <Icon size={18} color={theme.color} />
                  </View>
                  <Text style={{ fontSize: 15, fontWeight: '900', color: theme.color }}>%{stat.rate}</Text>
                </View>
                <Text style={{ fontSize: 13, fontWeight: '900', color: textMain }} numberOfLines={1}>{stat.subject}</Text>
                <View style={{ height: 5, backgroundColor: isDark ? '#1e1e30' : '#f1f5f9', borderRadius: 3, marginTop: 10, overflow: 'hidden' }}>
                  <View style={{ width: `${stat.rate}%`, height: '100%', backgroundColor: theme.color, borderRadius: 3 }} />
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
    );
  };

  const renderLearningPaths = () => {
    if (assignmentsByBook.length === 0) return null;
    return (
      <View style={{ paddingHorizontal: isTabletLandscape ? 0 : 20 }}>
        <View style={{ marginBottom: 12 }}>
          <Text style={{ fontSize: 14, fontWeight: '900', color: textSub, textTransform: 'uppercase', letterSpacing: 0.8 }}>Çalışma Haritaları</Text>
        </View>

        <View style={{ gap: 10 }}>
          {assignmentsByBook.map(book => {
            const progress = Math.round((book.completed / book.total) * 100);
            const isExpanded = expandedPlans.has(book.id);
            const pending = book.assignments.filter(a => a.status !== 'completed');
            const completed = book.assignments.filter(a => a.status === 'completed');

            return (
              <View key={book.id} style={{ backgroundColor: cardBg, borderRadius: 20, overflow: 'hidden', borderWidth: 1, borderColor: cardBorder }}>
                {/* Header */}
                <TouchableOpacity
                  onPress={() => togglePlan(book.id)}
                  activeOpacity={0.8}
                  style={{ padding: 12, flexDirection: 'row', alignItems: 'center' }}
                >
                  <View style={{ flex: 1, marginRight: 12 }}>
                    <Text style={{ fontSize: 13, fontWeight: '800', color: textMain, marginBottom: 4 }} numberOfLines={1}>{book.title}</Text>
                    
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Text style={{ fontSize: 9, fontWeight: '800', color: textSub, textTransform: 'uppercase' }}>
                        {book.completed}/{book.total} Konu
                      </Text>
                      <View style={{ flex: 1, height: 4, backgroundColor: isDark ? '#1e1e30' : '#f1f5f9', borderRadius: 2, marginHorizontal: 8, overflow: 'hidden' }}>
                        <View style={{ height: '100%', backgroundColor: progress === 100 ? '#10b981' : '#6366f1', borderRadius: 2, width: `${progress}%` }} />
                      </View>
                      <Text style={{ fontSize: 10, fontWeight: '900', color: progress === 100 ? '#10b981' : '#6366f1' }}>%{progress}</Text>
                    </View>
                  </View>
                  
                  <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: isDark ? '#1e1e30' : '#f1f5f9', alignItems: 'center', justifyContent: 'center' }}>
                    {isExpanded ? <ChevronUp size={14} color={textSub} /> : <ChevronDown size={14} color={textSub} />}
                  </View>
                </TouchableOpacity>

                {/* Timeline Path Nodes */}
                {isExpanded && (
                  <View style={{ backgroundColor: isDark ? '#0b0b13' : '#f8fafc', borderTopWidth: 1, borderTopColor: cardBorder, paddingHorizontal: 14, paddingVertical: 6 }}>
                    {pending.length > 0 && (
                      <View style={{ marginBottom: completed.length > 0 ? 8 : 0 }}>
                        <Text style={{ fontSize: 9, fontWeight: '900', color: textSub, textTransform: 'uppercase', letterSpacing: 0.8, marginTop: 6, marginBottom: 4 }}>Sıradaki Konular</Text>
                        {pending.map((a, idx) => (
                          <TouchableOpacity
                            key={a.id}
                            onPress={() => handleCompleteStudy(a.id, a.status)}
                            activeOpacity={0.7}
                            style={{ 
                              flexDirection: 'row', 
                              alignItems: 'center', 
                              paddingVertical: 8,
                              borderBottomWidth: idx === pending.length - 1 ? 0 : 1,
                              borderBottomColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)'
                            }}
                          >
                            <View style={{ width: 18, height: 18, borderRadius: 5, borderWidth: 1.5, borderColor: '#6366f1', alignItems: 'center', justifyContent: 'center', marginRight: 10, backgroundColor: cardBg }} />
                            <View style={{ flex: 1 }}>
                              <Text style={{ fontSize: 12, fontWeight: '700', color: textMain }} numberOfLines={1}>{a.topic}</Text>
                              <Text style={{ fontSize: 8, fontWeight: '600', color: textSub, marginTop: 1 }}>
                                {a.subject} {a.dueDate ? `• ${format(safeParseDate(a.dueDate), 'dd MMM', { locale: tr })}` : ''}
                              </Text>
                            </View>
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}
                    {completed.length > 0 && (
                      <View style={{ marginBottom: 6 }}>
                        <Text style={{ fontSize: 9, fontWeight: '900', color: textSub, textTransform: 'uppercase', letterSpacing: 0.8, marginTop: 6, marginBottom: 4 }}>Tamamlananlar</Text>
                        {completed.map((a, idx) => (
                          <TouchableOpacity
                            key={a.id}
                            onPress={() => handleCompleteStudy(a.id, a.status)}
                            activeOpacity={0.7}
                            style={{ 
                              flexDirection: 'row', 
                              alignItems: 'center', 
                              paddingVertical: 8,
                              opacity: 0.5,
                              borderBottomWidth: idx === completed.length - 1 ? 0 : 1,
                              borderBottomColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)'
                            }}
                          >
                            <View style={{ width: 18, height: 18, borderRadius: 5, backgroundColor: '#10b981', alignItems: 'center', justifyContent: 'center', marginRight: 10 }}>
                              <Check size={10} color="white" />
                            </View>
                            <Text style={{ fontSize: 12, fontWeight: '700', color: textSub, textDecorationLine: 'line-through', flex: 1 }} numberOfLines={1}>{a.topic}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}
                  </View>
                )}
              </View>
            );
          })}
        </View>
      </View>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: bg }}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* ── PREMIUM HERO HEADER (gamified: avatar + greeting + streak + level/XP) ── */}
      <Animated.View entering={FadeInDown.springify()}>
        <LinearGradient
          colors={isDark ? ['#0f0c29', '#302b63', '#24243e'] : ['#2563EB', '#7C3AED']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ paddingTop: insets.top + 12, paddingBottom: 20, paddingHorizontal: 20, borderBottomLeftRadius: 32, borderBottomRightRadius: 32 }}
        >
          {/* Top Row: back button + avatar/greeting + streak */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <TouchableOpacity
              onPress={() => router.back()}
              style={{ width: 42, height: 42, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 21, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' }}
            >
              <ChevronLeft size={22} color="white" />
            </TouchableOpacity>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1, justifyContent: 'center' }}>
              <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)' }}>
                <Text style={{ fontSize: 18 }}>{selectedStudent?.avatar || '👧'}</Text>
              </View>
              <View>
                <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 10, fontWeight: '700' }}>Merhaba,</Text>
                <Text style={{ color: 'white', fontSize: 16, fontWeight: '900', letterSpacing: -0.3 }} numberOfLines={1}>
                  {selectedStudent?.name || 'Öğrenci'} 👋
                </Text>
              </View>
            </View>

            {/* Streak indicator */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 16, paddingHorizontal: 12, paddingVertical: 7 }}>
              <Flame size={18} color="#fb923c" />
              <View>
                <Text style={{ fontSize: 8, color: 'rgba(255,255,255,0.75)', fontWeight: '700' }}>Seri</Text>
                <Text style={{ fontSize: 12, color: 'white', fontWeight: '900' }}>{streak} gün</Text>
              </View>
            </View>
          </View>

          {/* Motivational quote */}
          <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 11, fontWeight: '700', fontStyle: 'italic', textAlign: 'center', marginBottom: 14 }}>
            {todayQuote}
          </Text>

          {/* Header action buttons */}
          <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginBottom: studentMembers.length > 0 ? 12 : 0 }}>
            <TouchableOpacity
              onPress={() => setIsOfflineModalOpen(true)}
              style={{ width: 38, height: 38, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 19, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' }}
            >
              <Plus size={18} color="white" />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => router.push('/assign-test')}
              style={{ width: 38, height: 38, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 19, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' }}
            >
              <Settings size={16} color="white" />
            </TouchableOpacity>
          </View>

          {/* Student Selector */}
          {studentMembers.length > 0 && (
            <View style={{ flexDirection: 'row', gap: 10, backgroundColor: 'rgba(0,0,0,0.22)', padding: 6, borderRadius: 22, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' }}>
              {studentMembers.map(student => {
                const active = selectedStudent?.id === student.id;
                return (
                  <TouchableOpacity
                    key={student.id}
                    onPress={() => setSelectedStudent(student)}
                    activeOpacity={0.85}
                    style={{
                      flexDirection: 'row', alignItems: 'center', gap: 8,
                      paddingHorizontal: 14, paddingVertical: 7,
                      borderRadius: 16,
                      backgroundColor: active ? 'rgba(255,255,255,0.95)' : 'transparent',
                    }}
                  >
                    <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: active ? '#6366f1' : 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' }}>
                      <Text style={{ fontSize: 13 }}>{student.avatar || '👧'}</Text>
                    </View>
                    <Text style={{ fontSize: 13, fontWeight: '900', color: active ? '#4f46e5' : 'white' }}>{student.name}</Text>
                    {active && <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#34d399' }} />}
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </LinearGradient>
      </Animated.View>

      <ScrollView 
        showsVerticalScrollIndicator={false} 
        contentContainerStyle={{ paddingTop: 16, paddingBottom: 100 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#6366f1']}
            tintColor={isDark ? '#f0f2ff' : '#6366f1'}
          />
        }
      >
        {isTabletLandscape ? (
          <View style={{ flexDirection: 'row', paddingHorizontal: 20, gap: 20 }}>
            {/* Left Column - width 40% */}
            <View style={{ width: '40%', gap: 20 }}>
              {renderStatsGrid()}
              {renderQuickActions()}
            </View>
            
            {/* Right Column - flex 1 */}
            <View style={{ flex: 1, gap: 20 }}>
              {renderFocusBar()}
              {renderWeeklyScheduler()}
              {renderSubjectProgress()}
              {renderLearningPaths()}
            </View>
          </View>
        ) : (
          <>
            {renderFocusBar()}
            {renderStatsGrid()}
            {renderQuickActions()}
            {renderWeeklyScheduler()}
            {renderSubjectProgress()}
            {renderLearningPaths()}
          </>
        )}
      </ScrollView>

      {/* ── PREMIUM OFFLINE RESULT MODAL ── */}
      <Modal
        visible={isOfflineModalOpen}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsOfflineModalOpen(false)}
      >
        <View className="flex-1 bg-black/60 justify-end">
          <View className="bg-slate-50 dark:bg-slate-900 rounded-t-[2.5rem] max-h-[88%] border-t border-slate-200 dark:border-slate-800">
            
            {/* Modal Header */}
            <View className="p-5 border-b border-slate-200 dark:border-slate-800 flex-row justify-between items-center bg-white dark:bg-slate-950 rounded-t-[2.5rem]">
              <View className="flex-row items-center gap-2">
                <Sparkles size={18} color="#6366f1" />
                <Text className="text-lg font-black text-slate-800 dark:text-white tracking-tight">
                  Dışarıdan Sonuç Ekle
                </Text>
              </View>
              <TouchableOpacity 
                onPress={() => setIsOfflineModalOpen(false)}
                className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 items-center justify-center"
              >
                <XCircle size={18} color={isDark ? '#cbd5e1' : '#64748b'} />
              </TouchableOpacity>
            </View>

            <ScrollView className="p-5" contentContainerStyle={{ paddingBottom: 60 }} keyboardShouldPersistTaps="handled">
              
              {/* Student Selection */}
              <Text className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2.5">Öğrenci Seçin</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-5" contentContainerStyle={{ gap: 8 }}>
                {studentMembers.map(student => {
                  const active = selectedStudentId === student.id;
                  return (
                    <TouchableOpacity 
                      key={student.id}
                      onPress={() => setSelectedStudentId(student.id)}
                      className={`px-4 py-2.5 rounded-2xl border ${active ? 'bg-indigo-50 border-indigo-300 dark:bg-indigo-900/30 dark:border-indigo-800' : 'bg-white border-slate-200 dark:bg-slate-800 dark:border-slate-700'}`}
                    >
                      <Text className={`text-xs font-bold ${active ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-500'}`}>{student.name}</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              {/* Mode Tabs */}
              <View className="bg-slate-100 dark:bg-slate-805 p-1 rounded-2xl flex-row mb-5">
                <TouchableOpacity 
                  onPress={() => setModalMode('single')}
                  className={`flex-1 py-2.5 rounded-xl items-center ${modalMode === 'single' ? 'bg-white dark:bg-slate-700 shadow-sm' : ''}`}
                >
                  <Text className={`text-xs font-black ${modalMode === 'single' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-500'}`}>Tekil Test Sonucu</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  onPress={() => setModalMode('exam')}
                  className={`flex-1 py-2.5 rounded-xl items-center ${modalMode === 'exam' ? 'bg-white dark:bg-slate-700 shadow-sm' : ''}`}
                >
                  <Text className={`text-xs font-black ${modalMode === 'exam' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-500'}`}>Genel Deneme Sonucu</Text>
                </TouchableOpacity>
              </View>

              {/* Mode Content */}
              {modalMode === 'single' ? (
                // --- SINGLE TEST FORM ---
                <View className="space-y-4">
                  
                  {/* Test Title */}
                  <View className="mb-4">
                    <Text className="text-xs font-bold text-slate-500 mb-1.5">Test Adı</Text>
                    <TextInput 
                      value={singleTitle}
                      onChangeText={setSingleTitle}
                      placeholder="Örn: Limit Gelişim Testi - 1"
                      placeholderTextColor={isDark ? '#475569' : '#94a3b8'}
                      className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3 text-slate-800 dark:text-white text-sm font-semibold"
                    />
                  </View>

                  {/* Date */}
                  <View className="mb-4">
                    <Text className="text-xs font-bold text-slate-500 mb-1.5">Tarih (YYYY-MM-DD)</Text>
                    <TextInput 
                      value={singleDate}
                      onChangeText={setSingleDate}
                      placeholder="YYYY-MM-DD"
                      placeholderTextColor={isDark ? '#475569' : '#94a3b8'}
                      className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3 text-slate-800 dark:text-white text-sm font-semibold"
                    />
                  </View>

                  {/* Subject List */}
                  <View className="mb-4">
                    <Text className="text-xs font-bold text-slate-500 mb-2">Ders Seçin</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                      {availableSubjects.map((subject) => {
                        const active = singleSubject === subject;
                        return (
                          <TouchableOpacity
                            key={subject}
                            onPress={() => { setSingleSubject(subject); setSingleTopic('Genel'); }}
                            className={`px-3 py-1.5 rounded-full border ${active ? 'bg-indigo-50 border-indigo-300 dark:bg-indigo-900/30 dark:border-indigo-800' : 'bg-white border-slate-200 dark:bg-slate-800 dark:border-slate-700'}`}
                          >
                            <Text className={`text-xs font-bold ${active ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-500'}`}>{subject}</Text>
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
                  </View>

                  {/* Topic List */}
                  {singleSubject ? (
                    <View className="mb-4">
                      <Text className="text-xs font-bold text-slate-500 mb-2">Konu Seçin (Opsiyonel)</Text>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                        {availableTopics.map((topic) => {
                          const active = singleTopic === topic;
                          return (
                            <TouchableOpacity
                              key={topic}
                              onPress={() => setSingleTopic(topic)}
                              className={`px-3 py-1.5 rounded-full border ${active ? 'bg-indigo-50 border-indigo-300 dark:bg-indigo-900/30 dark:border-indigo-800' : 'bg-white border-slate-200 dark:bg-slate-800 dark:border-slate-700'}`}
                            >
                              <Text className={`text-xs font-bold ${active ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-500'}`}>{topic}</Text>
                            </TouchableOpacity>
                          );
                        })}
                      </ScrollView>
                    </View>
                  ) : null}

                  {/* Stats Input */}
                  <View className="flex-row justify-between pt-2">
                    <View className="w-[30%]">
                      <Text className="text-xs font-bold text-emerald-600 dark:text-emerald-400 mb-1.5 text-center">Doğru</Text>
                      <TextInput 
                        keyboardType="numeric"
                        value={singleCorrect}
                        onChangeText={setSingleCorrect}
                        className="bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 rounded-2xl px-4 py-3 text-emerald-700 dark:text-emerald-300 font-black text-center text-base"
                      />
                    </View>
                    <View className="w-[30%]">
                      <Text className="text-xs font-bold text-rose-600 dark:text-rose-400 mb-1.5 text-center">Yanlış</Text>
                      <TextInput 
                        keyboardType="numeric"
                        value={singleIncorrect}
                        onChangeText={setSingleIncorrect}
                        className="bg-rose-50/50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30 rounded-2xl px-4 py-3 text-rose-700 dark:text-rose-300 font-black text-center text-base"
                      />
                    </View>
                    <View className="w-[30%]">
                      <Text className="text-xs font-bold text-slate-500 mb-1.5 text-center">Boş</Text>
                      <TextInput 
                        keyboardType="numeric"
                        value={singleBlank}
                        onChangeText={setSingleBlank}
                        className="bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-3 text-slate-700 dark:text-slate-350 font-black text-center text-base"
                      />
                    </View>
                  </View>

                  {/* Save Button */}
                  <TouchableOpacity 
                    onPress={handleSaveSingle}
                    disabled={isSubmitting}
                    className="bg-indigo-600 rounded-2xl py-4 items-center justify-center mt-6 active:scale-95 shadow-sm"
                  >
                    {isSubmitting ? (
                      <ActivityIndicator size="small" color="white" />
                    ) : (
                      <Text className="text-white font-bold text-sm">Test Sonucunu Kaydet</Text>
                    )}
                  </TouchableOpacity>

                </View>
              ) : (
                // --- GENERAL EXAM FORM ---
                <View className="space-y-4">
                  
                  {/* Exam Title */}
                  <View className="mb-4">
                    <Text className="text-xs font-bold text-slate-500 mb-1.5">Deneme Sınavı Adı</Text>
                    <TextInput 
                      value={examName}
                      onChangeText={setExamName}
                      placeholder="Örn: Limit LGS Altın Deneme"
                      placeholderTextColor={isDark ? '#475569' : '#94a3b8'}
                      className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3 text-slate-800 dark:text-white text-sm font-semibold"
                    />
                  </View>

                  {/* Date */}
                  <View className="mb-4">
                    <Text className="text-xs font-bold text-slate-500 mb-1.5">Tarih (YYYY-MM-DD)</Text>
                    <TextInput 
                      value={examDate}
                      onChangeText={setExamDate}
                      placeholder="YYYY-MM-DD"
                      placeholderTextColor={isDark ? '#475569' : '#94a3b8'}
                      className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3 text-slate-800 dark:text-white text-sm font-semibold"
                    />
                  </View>

                  {/* Subject List Grid */}
                  <View className="pt-2">
                    <View className="mb-3">
                      <Text className="text-xs font-bold text-slate-500 mb-2">Ders Seçerek Netleri Girin</Text>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                        {availableSubjects.map((subject) => {
                          const exists = examSubjects.some(s => s.subjectName === subject);
                          return (
                            <TouchableOpacity 
                              key={subject}
                              onPress={() => {
                                if (exists) {
                                  setExamSubjects(examSubjects.filter(s => s.subjectName !== subject));
                                } else {
                                  setExamSubjects([
                                    ...examSubjects,
                                    { id: Math.random().toString(36).substring(7), subjectName: subject, correct: 0, incorrect: 0, blank: 0 }
                                  ]);
                                }
                              }}
                              className={`px-3 py-1.5 rounded-full border ${exists ? 'bg-indigo-50 border-indigo-300 dark:bg-indigo-900/30 dark:border-indigo-800' : 'bg-white border-slate-200 dark:bg-slate-800 dark:border-slate-700'}`}
                            >
                              <Text className={`text-xs font-bold ${exists ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-500'}`}>
                                {exists ? `✓ ${subject}` : `+ ${subject}`}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </ScrollView>
                    </View>

                    {/* Table Headers */}
                    {examSubjects.length > 0 ? (
                      <View className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-inner">
                        <View className="flex-row p-3 border-b border-slate-200 dark:border-slate-800 bg-slate-100/50 dark:bg-slate-900/50">
                          <Text className="flex-1 text-[9px] font-bold text-slate-500 pl-1 uppercase tracking-wider">Ders</Text>
                          <Text className="w-12 text-[9px] font-bold text-emerald-600 text-center uppercase tracking-wider">D</Text>
                          <Text className="w-12 text-[9px] font-bold text-rose-600 text-center uppercase tracking-wider">Y</Text>
                          <Text className="w-12 text-[9px] font-bold text-slate-500 text-center uppercase tracking-wider">B</Text>
                          <Text className="w-8"></Text>
                        </View>

                        {examSubjects.map((row, index) => (
                          <View key={row.id} className="flex-row p-2.5 items-center border-b border-slate-100 dark:border-slate-850">
                            <View className="flex-1">
                              <Text className="text-xs font-bold text-slate-750 dark:text-slate-350 pl-1" numberOfLines={1}>
                                {row.subjectName}
                              </Text>
                            </View>

                            {/* Correct */}
                            <TextInput 
                              keyboardType="numeric"
                              value={String(row.correct || '')}
                              onChangeText={(val) => {
                                const updated = [...examSubjects];
                                updated[index].correct = parseInt(val) || 0;
                                setExamSubjects(updated);
                              }}
                              className="w-12 h-7 bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 rounded text-center text-xs font-bold text-emerald-600"
                            />

                            {/* Incorrect */}
                            <TextInput 
                              keyboardType="numeric"
                              value={String(row.incorrect || '')}
                              onChangeText={(val) => {
                                const updated = [...examSubjects];
                                updated[index].incorrect = parseInt(val) || 0;
                                setExamSubjects(updated);
                              }}
                              className="w-12 h-7 bg-rose-50/50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30 rounded text-center text-xs font-bold text-rose-600 ml-1.5"
                            />

                            {/* Blank */}
                            <TextInput 
                              keyboardType="numeric"
                              value={String(row.blank || '')}
                              onChangeText={(val) => {
                                const updated = [...examSubjects];
                                updated[index].blank = parseInt(val) || 0;
                                setExamSubjects(updated);
                              }}
                              className="w-12 h-7 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-center text-xs font-bold text-slate-500 ml-1.5"
                            />

                            {/* Delete Row */}
                            <TouchableOpacity 
                              onPress={() => {
                                setExamSubjects(examSubjects.filter(item => item.id !== row.id));
                              }}
                              className="w-8 h-8 items-center justify-center ml-1"
                            >
                              <XCircle size={14} color="#ef4444" />
                            </TouchableOpacity>
                          </View>
                        ))}
                      </View>
                    ) : (
                      <View className="border border-dashed border-slate-200 dark:border-slate-850 rounded-2xl py-6 items-center justify-center">
                        <Text className="text-xs text-slate-400 font-bold">Net eklemek için yukarıdan ders seçin</Text>
                      </View>
                    )}
                  </View>

                  {/* Save Button */}
                  <TouchableOpacity 
                    onPress={handleSaveExam}
                    disabled={isSubmitting}
                    className="bg-indigo-600 rounded-2xl py-4 items-center justify-center mt-6 active:scale-95 shadow-sm"
                  >
                    {isSubmitting ? (
                      <ActivityIndicator size="small" color="white" />
                    ) : (
                      <Text className="text-white font-bold text-sm">Deneme Sonucunu Kaydet</Text>
                    )}
                  </TouchableOpacity>

                </View>
              )}

            </ScrollView>

          </View>
        </View>
      </Modal>
    </View>
  );
}