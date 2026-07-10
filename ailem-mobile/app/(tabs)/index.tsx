// FORCE_RELOAD_TIMESTAMP=639189397993539819
import { NativeModules,
  Platform,
  ScrollView,
  Text,
  View,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Alert,
  Dimensions,
  RefreshControl,
  useWindowDimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useColorScheme } from 'nativewind';
import {
  CheckSquare,
  Calendar as CalendarIcon,
  BookOpen,
  Target,
  ShoppingCart,
  Check,
  Moon,
  Sun,
  Trophy,
  Star,
  GraduationCap,
  UtensilsCrossed,
  ChevronRight,
  Users,
  Heart,
  Zap,
  Flame,
  ListChecks,
  BookCheck,
  PlaySquare,
  LayoutDashboard,
  Settings2,
  Bell,
} from 'lucide-react-native';
import { useAuth } from '../../context/auth-context';
import { useEffect, useState, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  onTasksUpdate,
  onShoppingListsUpdate,
  onCalendarEventsUpdate,
  onBooksUpdate,
  onUserLibrariesUpdate,
  onTestsUpdate,
  onStudyAssignmentsUpdate,
  onGoalsUpdate,
  updateGoal,
  updateTask,
  updateHabitCompletion,
  onMealPlanUpdate,
  onVideosUpdate,
  onMemorizationItemsUpdate,
  onMemorizationProgressUpdate,
  onPrayerProgressUpdate,
} from '../../lib/dataService';
import { Task, Book, UserLibrary, Test, StudyAssignment, CalendarEvent, Goal, MealPlan, Video, MemorizationItem, MemorizationProgress, PrayerProgress } from '../../lib/data';
import MemberDashboardCard from '../../components/MemberDashboardCard';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { format, parseISO, differenceInDays, isFuture, isToday, compareAsc } from 'date-fns';
import { tr } from 'date-fns/locale';

const { width } = Dimensions.get('window');

// ── Ikon kutucuğu: LinearGradient içinde icon (simge için doğru yol)
function IconBox({ colors, icon, size = 40 }: { colors: [string, string]; icon: React.ReactNode; size?: number }) {
  return (
    <LinearGradient
      colors={colors}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{
        width: size, height: size,
        borderRadius: size * 0.36,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {icon}
    </LinearGradient>
  );
}

export default function DashboardScreen() {
  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = () => { setRefreshing(true); setTimeout(() => setRefreshing(false), 1200); };

  const { width: winWidth, height: winHeight } = useWindowDimensions();
  const isTablet = Math.min(winWidth, winHeight) >= 600;
  const isLandscape = winWidth > winHeight;
  const isTabletLandscape = isTablet && isLandscape;
  const { user, familyId, familyName, familyMembers, loading: authLoading } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [shoppingCount, setShoppingCount] = useState(0);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [books, setBooks] = useState<Book[]>([]);
  const [userLibraries, setUserLibraries] = useState<UserLibrary[]>([]);
  const [tests, setTests] = useState<Test[]>([]);
  const [studyAssignments, setStudyAssignments] = useState<StudyAssignment[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [mealPlan, setMealPlan] = useState<MealPlan>({});
  const [videos, setVideos] = useState<Video[]>([]);
  const [memorizationItems, setMemorizationItems] = useState<MemorizationItem[]>([]);
  const [memorizationProgress, setMemorizationProgress] = useState<MemorizationProgress[]>([]);
  const [prayerProgress, setPrayerProgress] = useState<PrayerProgress[]>([]);
  const [activeMemberId, setActiveMemberId] = useState<string>('');
  const [pinnedReadingWidgets, setPinnedReadingWidgets] = useState<string[]>([]);
  const [isAddingReadingWidget, setIsAddingReadingWidget] = useState(false);
  const [loading, setLoading] = useState(true);

  const router = useRouter();
  const { colorScheme, setColorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  useEffect(() => {
    let u1 = () => {}, u2 = () => {}, u3 = () => {}, u4 = () => {},
        u5 = () => {}, u6 = () => {}, u7 = () => {}, u8 = () => {}, u9 = () => {},
        u10 = () => {}, u11 = () => {}, u12 = () => {}, u13 = () => {};
    try {
      u1 = onTasksUpdate(setTasks);
      u2 = onShoppingListsUpdate((data) => {
        setShoppingCount(data.reduce((acc, l) => acc + (l.items?.filter(i => !i.isBought).length ?? 0), 0));
      });
      u3 = onCalendarEventsUpdate(setCalendarEvents);
      u4 = onBooksUpdate(setBooks);
      u5 = onTestsUpdate(setTests);
      u6 = onStudyAssignmentsUpdate(setStudyAssignments);
      u7 = onGoalsUpdate(setGoals);
      u8 = onMealPlanUpdate(setMealPlan);
      u10 = onVideosUpdate(setVideos);
      u11 = onMemorizationItemsUpdate(setMemorizationItems);
      u12 = onMemorizationProgressUpdate(setMemorizationProgress);
      u13 = onPrayerProgressUpdate(setPrayerProgress);
      if (familyId) u9 = onUserLibrariesUpdate(familyId, setUserLibraries);
      setLoading(false);
    } catch (e) { setLoading(false); }
    return () => { u1(); u2(); u3(); u4(); u5(); u6(); u7(); u8(); u9(); u10(); u11(); u12(); u13(); };
  }, [familyId]);

  const pendingTasksCount = tasks.filter(t => !t.completed).length;
  const displayName = user?.displayName || user?.email?.split('@')[0] || 'Kullanıcı';

  const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Günaydın ☀️';
    if (h < 18) return 'İyi günler 🌤️';
    return 'İyi akşamlar 🌙';
  };

  // Eğer familyName veritabanında yoksa, displayName'i baş harfi büyük olarak kullanıp yanına "Ailesi" ekleyelim.
  let formattedName = displayName.charAt(0).toUpperCase() + displayName.slice(1);
  if (formattedName.toLowerCase() === 'ozgurdere') {
    formattedName = 'Özgürdere';
  }
  const displayFamilyName = familyName 
    ? `${familyName} Ailesi`
    : `${formattedName} Ailesi`;

  useEffect(() => {
    if (familyMembers.length > 0 && !activeMemberId) {
      const child = familyMembers.find(m => m.role?.includes('Çocuk'));
      setActiveMemberId(child ? child.id : familyMembers[0].id);
    }
  }, [familyMembers, activeMemberId]);

  useEffect(() => {
    const loadPinned = async () => {
      try {
        const saved = await AsyncStorage.getItem('@ailem_pinned_reading_widgets');
        if (saved) setPinnedReadingWidgets(JSON.parse(saved));
      } catch (e) {}
    };
    loadPinned();
  }, []);

  const addPinnedWidget = async (memberId: string) => {
    if (pinnedReadingWidgets.includes(memberId)) return;
    const next = [...pinnedReadingWidgets, memberId];
    setPinnedReadingWidgets(next);
    setIsAddingReadingWidget(false);
    AsyncStorage.setItem('@ailem_pinned_reading_widgets', JSON.stringify(next));
  };

  const removePinnedWidget = async (memberId: string) => {
    const next = pinnedReadingWidgets.filter(id => id !== memberId);
    setPinnedReadingWidgets(next);
    AsyncStorage.setItem('@ailem_pinned_reading_widgets', JSON.stringify(next));
  };

  const activeMember = useMemo(
    () => familyMembers.find(m => m.id === activeMemberId) || familyMembers[0],
    [familyMembers, activeMemberId]
  );

  const handleToggleTask = async (task: Task) => {
    try {
      if (task.isRecurring) {
        const today = new Date();
        const key = format(today, 'yyyy-MM-dd');
        await updateHabitCompletion(task.id, today, !(task.completedDates || []).includes(key));
      } else {
        await updateTask(task.id, { completed: !task.completed });
      }
    } catch {}
  };

  const handleGoalProgress = (goal: Goal) => {
    const sorted = [...(goal.sections || [])].sort((a, b) => a.order - b.order);
    const sec = sorted.find(s => s.status !== 'completed') || sorted[sorted.length - 1];
    if (!sec) return;
    Alert.alert('Hedef İlerlemesi', `"${goal.title}"`, [
      { text: 'Vazgeç', style: 'cancel' },
      { text: '+1', onPress: () => saveProgress(goal, sec, 1) },
      { text: '+5', onPress: () => saveProgress(goal, sec, 5) },
      { text: 'Tamamla', onPress: () => saveProgress(goal, sec, sec.sectionTotalUnits - (sec.completedUnits || 0)) },
    ]);
  };

  const saveProgress = async (goal: Goal, section: any, inc: number) => {
    const done = Math.min((section.completedUnits || 0) + inc, section.sectionTotalUnits);
    const status = done === section.sectionTotalUnits ? 'completed' : 'unlocked';
    const newSections = goal.sections.map(s => s.id === section.id ? { ...s, completedUnits: done, status } : s);
    try { await updateGoal(goal.id, { sections: newSections as any }); } catch {}
  };

  const activeMemberTasks = useMemo(() => !activeMember ? [] : tasks.filter(t => t.assigneeId === activeMember.id), [activeMember, tasks]);
  const activeMemberTests = useMemo(() => !activeMember ? [] : tests.filter(t => t.studentId === activeMember.id && t.status === 'Atandı'), [activeMember, tests]);
  const activeMemberStudyAssignments = useMemo(() => !activeMember ? [] : studyAssignments.filter(t => t.studentId === activeMember.id && t.status === 'assigned'), [activeMember, studyAssignments]);
  const activeMemberReadingBooks = useMemo(() => {
    if (!activeMember) return [];
    const lib = userLibraries.find(l => l.memberId === activeMember.id);
    return (lib?.books || []).filter(b => b.status === 'reading').map(b => {
      const detail = books.find(bk => bk.id === b.bookId);
      return detail ? { ...detail, progress: b.progress || 0 } : null;
    }).filter(Boolean) as (Book & { progress: number })[];
  }, [activeMember, userLibraries, books]);

  const { pendingTestsCount, pendingStudyAssignmentsCount } = useMemo(() => {
    const child = familyMembers.find(m => m.role?.includes('Çocuk')) || familyMembers[0];
    if (!child) return { pendingTestsCount: 0, pendingStudyAssignmentsCount: 0 };
    return {
      pendingTestsCount: tests.filter(t => t.studentId === child.id && t.status === 'Atandı').length,
      pendingStudyAssignmentsCount: studyAssignments.filter(a => a.studentId === child.id && a.status === 'assigned').length,
    };
  }, [familyMembers, tests, studyAssignments]);

  const upcomingEvent = useMemo(() => {
    const today = new Date();
    return calendarEvents
      .map(e => ({ ...e, date: parseISO(e.startDate), daysLeft: differenceInDays(parseISO(e.startDate), today) }))
      .filter(e => isFuture(e.date) || isToday(e.date))
      .sort((a, b) => compareAsc(a.date, b.date))[0] || null;
  }, [calendarEvents]);

  // Native Android Widget Sync
  useEffect(() => {
    if (Platform.OS === 'android' && NativeModules.WidgetHelper) {
      const activeBooks: any[] = [];
      familyMembers.forEach(member => {
        const memberLib = userLibraries.find(l => l.memberId === member.id);
        if (memberLib && memberLib.books) {
          memberLib.books.filter(b => b.status === 'reading').forEach(b => {
            const bookInfo = books.find(bk => bk.id === b.bookId);
            if (bookInfo) {
              const pagesRead = b.progress || 0;
              const totalPages = bookInfo.pageCount || 0;
              const percent = totalPages > 0 ? Math.round((pagesRead / totalPages) * 100) : 0;
              activeBooks.push({
                memberId: member.id,
                memberName: member.name,
                bookTitle: bookInfo.title,
                pagesRead: pagesRead,
                totalPages: totalPages,
                progress: percent,
                bookImage: bookInfo.image
              });
            }
          });
        }
      });
      NativeModules.WidgetHelper.syncFamilyMembers(JSON.stringify(familyMembers.map(m => ({ id: m.id, name: m.name }))));
      NativeModules.WidgetHelper.updateReadingWidgetData(JSON.stringify(activeBooks.slice(0, 10)));
    }
  }, [familyMembers, userLibraries, books]);

  const readingStats = useMemo(() =>
    familyMembers.map(m => {
      const lib = userLibraries.find(l => l.memberId === m.id);
      let pagesRead = 0;
      const finished = (lib?.books || []).filter(b => {
        if (b.status === 'finished') {
          const d = books.find(bk => bk.id === b.bookId);
          if (d?.pageCount) pagesRead += d.pageCount;
          return true;
        }
        return false;
      });
      return { memberId: m.id, name: m.name, color: m.color, finishedBooks: finished.length, pagesRead };
    }).sort((a, b) => b.finishedBooks - a.finishedBooks),
    [familyMembers, userLibraries, books]
  );

  const latestBooks = useMemo(() =>
    [...books].sort((a, b) => (b.createdAt ? new Date(b.createdAt).getTime() : 0) - (a.createdAt ? new Date(a.createdAt).getTime() : 0)).slice(0, 12),
    [books]
  );

  const activeGoals = useMemo(() =>
    goals.filter(g => g.status === 'in-progress').map(goal => {
      const sorted = [...(goal.sections || [])].sort((a, b) => a.order - b.order);
      const currentSection = sorted.find(s => s.status !== 'completed') || sorted[sorted.length - 1];
      const done = (goal.sections || []).reduce((s, sec) => s + (sec.completedUnits || 0), 0);
      const overallProgress = (goal.totalUnits || 0) > 0 ? (done / goal.totalUnits!) * 100 : 0;
      return { ...goal, currentSection, overallProgress, assignee: familyMembers.find(m => m.id === goal.assigneeId) };
    }),
    [goals, familyMembers]
  );

  const todayMeal = useMemo(() => {
    const plan = mealPlan[format(new Date(), 'yyyy-MM-dd')];
    if (!plan) return null;
    
    const meals = [];
    if (plan['Kahvaltı']?.title) meals.push(`🍳 ${plan['Kahvaltı'].title}`);
    if (plan['Akşam Yemeği']?.title) meals.push(`🍽️ ${plan['Akşam Yemeği'].title}`);
    
    return meals.length > 0 ? meals.join('\n') : null;
  }, [mealPlan]);

  // ── THEME ──
  const bg        = isDark ? '#09090f' : '#f4f5fb';
  const cardBg    = isDark ? '#131320' : '#ffffff';
  const cardBorder = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)';
  const textMain   = isDark ? '#f0f2ff' : '#0d0f1a';
  const textSub    = isDark ? '#8890b0' : '#6b7280';
  const textMuted  = isDark ? '#40465a' : '#b0b6cc';

  if (loading || authLoading) {
    return (
      <LinearGradient colors={['#4f46e5', '#7c3aed', '#c026d3']} style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <View style={{ width: 64, height: 64, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color="white" size="large" />
        </View>
        <Text style={{ color: 'rgba(255,255,255,0.75)', fontWeight: '700', fontSize: 13, marginTop: 20 }}>Yükleniyor...</Text>
      </LinearGradient>
    );
  }

  const renderMemorizationWidget = () => {
    return (
      <View style={{ paddingHorizontal: isTabletLandscape ? 0 : 14 }}>
        <TouchableOpacity onPress={() => router.push('/memorization' as any)} activeOpacity={0.85}>
          <LinearGradient
            colors={['#0ea5e9', '#0284c7']}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={{ borderRadius: 22, padding: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', shadowColor: '#0ea5e9', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 4 }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
              <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' }}>
                <BookOpen size={22} color="white" />
              </View>
              <View>
                <Text style={{ color: 'white', fontWeight: '900', fontSize: 16 }}>Ezberler</Text>
                <Text style={{ color: 'rgba(255,255,255,0.8)', fontWeight: '700', fontSize: 12, marginTop: 2 }}>Sure ve Dua Kütüphanesi</Text>
              </View>
            </View>
            <ChevronRight size={20} color="rgba(255,255,255,0.7)" />
          </LinearGradient>
        </TouchableOpacity>
      </View>
    );
  };

  const renderHeroBanner = () => {
    return (
      <View style={{ paddingHorizontal: isTabletLandscape ? 0 : 14, paddingTop: 14 }}>
        <LinearGradient
          colors={['#4338ca', '#7c3aed', '#a21caf']}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={{
            borderRadius: 24, paddingHorizontal: 20, paddingVertical: 18, overflow: 'hidden',
            shadowColor: '#5b21b6', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.4, shadowRadius: 16, elevation: 10,
          }}
        >
          {/* Dekor */}
          <View style={{ position: 'absolute', top: -50, right: -40, width: 150, height: 150, borderRadius: 75, backgroundColor: 'rgba(255,255,255,0.07)' }} />
          <View style={{ position: 'absolute', bottom: -30, left: -20, width: 110, height: 110, borderRadius: 55, backgroundColor: 'rgba(255,255,255,0.05)' }} />

          <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ color: 'rgba(255,255,255,0.65)', fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 3 }}>
                {format(new Date(), 'd MMMM, EEEE', { locale: tr })}
              </Text>
              <Text style={{ color: 'white', fontSize: 22, fontWeight: '900', letterSpacing: -0.5, lineHeight: 28 }}>{getGreeting()}</Text>
              <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 13, fontWeight: '700', marginTop: 3 }}>{displayFamilyName}</Text>
            </View>
          </View>

          {/* 4 stat */}
          <View style={{ flexDirection: 'row', gap: 7 }}>
            {[
              { label: 'Görev', value: pendingTasksCount, emoji: '📋' },
              { label: 'Ödev', value: pendingTestsCount + pendingStudyAssignmentsCount, emoji: '🎯' },
              { label: 'Alışveriş', value: shoppingCount, emoji: '🛒' },
              { label: 'Kitap', value: books.length, emoji: '📚' },
            ].map(s => (
              <View key={s.label} style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.13)', borderRadius: 14, paddingVertical: 10, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.16)' }}>
                <Text style={{ fontSize: 14, marginBottom: 2 }}>{s.emoji}</Text>
                <Text style={{ color: 'white', fontWeight: '900', fontSize: 16, lineHeight: 20 }}>{s.value}</Text>
                <Text style={{ color: 'rgba(255,255,255,0.65)', fontWeight: '700', fontSize: 9, marginTop: 1 }}>{s.label}</Text>
              </View>
            ))}
          </View>
        </LinearGradient>
      </View>
    );
  };

  const renderBentoGrid = () => {
    return (
      <View style={{ paddingHorizontal: isTabletLandscape ? 0 : 14, gap: 10 }}>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          {/* Alışveriş */}
          <TouchableOpacity onPress={() => router.push('/shopping' as any)} activeOpacity={0.85} style={{ flex: 1 }}>
            <View style={{
              backgroundColor: cardBg, borderRadius: 22, padding: 16, minHeight: 128,
              borderWidth: 1, borderColor: cardBorder, overflow: 'hidden',
              shadowColor: '#10b981', shadowOffset: { width: 0, height: 3 }, shadowOpacity: isDark ? 0.15 : 0.08, shadowRadius: 8, elevation: 3,
            }}>
              <View style={{ position: 'absolute', bottom: -12, right: -10, opacity: 0.06 }}>
                <ShoppingCart size={72} color="#10b981" />
              </View>
              <IconBox colors={['#10b981', '#059669']} icon={<ShoppingCart size={18} color="white" />} size={38} />
              <Text style={{ color: textMain, fontWeight: '900', fontSize: 14, marginTop: 10, marginBottom: 2 }}>Alışveriş</Text>
              <Text style={{ color: '#10b981', fontSize: 11, fontWeight: '800', marginTop: 'auto' }}>
                {shoppingCount > 0 ? `${shoppingCount} ürün bekliyor` : '✓ Tamamlandı'}
              </Text>
            </View>
          </TouchableOpacity>

          {/* Menü */}
          <TouchableOpacity onPress={() => router.push('/yemek' as any)} activeOpacity={0.85} style={{ flex: 1 }}>
            <View style={{
              backgroundColor: cardBg, borderRadius: 22, padding: 16, minHeight: 128,
              borderWidth: 1, borderColor: cardBorder, overflow: 'hidden',
              shadowColor: '#f97316', shadowOffset: { width: 0, height: 3 }, shadowOpacity: isDark ? 0.15 : 0.08, shadowRadius: 8, elevation: 3,
            }}>
              <View style={{ position: 'absolute', bottom: -12, right: -10, opacity: 0.06 }}>
                <UtensilsCrossed size={72} color="#f97316" />
              </View>
              <IconBox colors={['#f97316', '#ea580c']} icon={<UtensilsCrossed size={18} color="white" />} size={38} />
              <Text style={{ color: textMain, fontWeight: '900', fontSize: 14, marginTop: 10, marginBottom: 2 }}>Bugünkü Menü</Text>
              <Text style={{ color: textSub, fontSize: 11, fontWeight: '600', marginTop: 'auto' }} numberOfLines={2}>
                {todayMeal || 'Planlanmadı'}
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        <View style={{ flexDirection: 'row', gap: 10 }}>
          {/* Takvim */}
          <TouchableOpacity onPress={() => router.push('/calendar' as any)} activeOpacity={0.85} style={{ flex: 1 }}>
            <View style={{
              backgroundColor: cardBg, borderRadius: 22, padding: 16, minHeight: 128,
              borderWidth: 1, borderColor: cardBorder, overflow: 'hidden',
              shadowColor: '#ec4899', shadowOffset: { width: 0, height: 3 }, shadowOpacity: isDark ? 0.15 : 0.08, shadowRadius: 8, elevation: 3,
            }}>
              <View style={{ position: 'absolute', bottom: -12, right: -10, opacity: 0.06 }}>
                <CalendarIcon size={72} color="#ec4899" />
              </View>
              <IconBox colors={['#ec4899', '#db2777']} icon={<CalendarIcon size={18} color="white" />} size={38} />
              <Text style={{ color: textMain, fontWeight: '900', fontSize: 14, marginTop: 10, marginBottom: 2 }}>Etkinlik</Text>
              <View style={{ marginTop: 'auto' }}>
                {upcomingEvent ? (
                  <>
                    <Text style={{ color: textMain, fontSize: 11, fontWeight: '700' }} numberOfLines={1}>{upcomingEvent.title}</Text>
                    <Text style={{ color: '#ec4899', fontSize: 10, fontWeight: '800', marginTop: 1 }}>
                      {upcomingEvent.daysLeft === 0 ? 'Bugün!' : `${upcomingEvent.daysLeft} gün sonra`}
                    </Text>
                  </>
                ) : (
                  <Text style={{ color: textMuted, fontSize: 11, fontWeight: '600' }}>Etkinlik yok</Text>
                )}
              </View>
            </View>
          </TouchableOpacity>

          {/* Görevler */}
          <TouchableOpacity onPress={() => router.push('/tasks' as any)} activeOpacity={0.85} style={{ flex: 1 }}>
            <View style={{
              backgroundColor: cardBg, borderRadius: 22, padding: 16, minHeight: 128,
              borderWidth: 1, borderColor: cardBorder, overflow: 'hidden',
              shadowColor: '#8b5cf6', shadowOffset: { width: 0, height: 3 }, shadowOpacity: isDark ? 0.15 : 0.08, shadowRadius: 8, elevation: 3,
            }}>
              <View style={{ position: 'absolute', bottom: -12, right: -10, opacity: 0.06 }}>
                <ListChecks size={72} color="#8b5cf6" />
              </View>
              <IconBox colors={['#8b5cf6', '#6d28d9']} icon={<ListChecks size={18} color="white" />} size={38} />
              <Text style={{ color: textMain, fontWeight: '900', fontSize: 14, marginTop: 10, marginBottom: 2 }}>Görevler</Text>
              <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 4, marginTop: 'auto' }}>
                <Text style={{ color: '#8b5cf6', fontWeight: '900', fontSize: 26, lineHeight: 30 }}>{pendingTasksCount}</Text>
                <Text style={{ color: textMuted, fontWeight: '800', fontSize: 9, textTransform: 'uppercase', letterSpacing: 0.7, marginBottom: 3 }}>Bekleyen</Text>
              </View>
            </View>
          </TouchableOpacity>
        </View>

        {/* Kompakt satırlar */}
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <TouchableOpacity onPress={() => router.push('/notes' as any)} activeOpacity={0.85} style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: cardBg, borderRadius: 18, padding: 14, borderWidth: 1, borderColor: cardBorder, overflow: 'hidden' }}>
              <View style={{ position: 'absolute', right: -8, opacity: 0.05 }}>
                <BookCheck size={56} color="#f59e0b" />
              </View>
              <IconBox colors={['#f59e0b', '#d97706']} icon={<BookCheck size={16} color="white" />} size={34} />
              <View>
                <Text style={{ color: textMain, fontWeight: '900', fontSize: 12 }}>Notlar</Text>
                <Text style={{ color: textMuted, fontSize: 9, fontWeight: '600', marginTop: 1 }}>Çalışma notları</Text>
              </View>
            </View>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => router.push('/videos' as any)} activeOpacity={0.85} style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: cardBg, borderRadius: 18, padding: 14, borderWidth: 1, borderColor: cardBorder, overflow: 'hidden' }}>
              <View style={{ position: 'absolute', right: -8, opacity: 0.05 }}>
                <PlaySquare size={56} color="#f43f5e" />
              </View>
              <IconBox colors={['#f43f5e', '#e11d48']} icon={<PlaySquare size={16} color="white" />} size={34} />
              <View>
                <Text style={{ color: textMain, fontWeight: '900', fontSize: 12 }}>Videolar</Text>
                <Text style={{ color: textMuted, fontSize: 9, fontWeight: '600', marginTop: 1 }}>Eğitim videoları</Text>
              </View>
            </View>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderLibrary = () => {
    return (
      <View style={{ paddingHorizontal: isTabletLandscape ? 0 : 14 }}>
        <View style={{ backgroundColor: cardBg, borderRadius: 22, borderWidth: 1, borderColor: cardBorder, paddingTop: 16, paddingBottom: 18, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, marginBottom: 14 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <IconBox colors={['#f59e0b', '#ea580c']} icon={<BookOpen size={16} color="white" />} size={34} />
              <View>
                <Text style={{ color: textMain, fontWeight: '900', fontSize: 14 }}>Kütüphane</Text>
                <Text style={{ color: textMuted, fontSize: 9, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.8, marginTop: 1 }}>{books.length} kitap</Text>
              </View>
            </View>
            <TouchableOpacity
              onPress={() => router.push('/library' as any)}
              style={{ paddingHorizontal: 12, paddingVertical: 6, backgroundColor: isDark ? 'rgba(99,102,241,0.15)' : 'rgba(99,102,241,0.08)', borderRadius: 16, borderWidth: 1, borderColor: isDark ? 'rgba(99,102,241,0.3)' : 'rgba(99,102,241,0.18)' }}
            >
              <Text style={{ color: '#6366f1', fontWeight: '800', fontSize: 11 }}>Tümü →</Text>
            </TouchableOpacity>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 10 }}>
            {latestBooks.length > 0 ? latestBooks.map(book => (
              <View key={book.id} style={{ width: 72 }}>
                <View style={{ width: 72, height: 100, borderRadius: 12, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 6, elevation: 5, borderWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)' }}>
                  {book.image ? (
                    <Image source={{ uri: book.image }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                  ) : (
                    <LinearGradient colors={['#4f46e5', '#7c3aed']} style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                      <BookOpen size={24} color="rgba(255,255,255,0.7)" />
                    </LinearGradient>
                  )}
                  <LinearGradient colors={['transparent', 'rgba(0,0,0,0.75)']} style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 42, justifyContent: 'flex-end', padding: 5 }}>
                    <Text style={{ color: 'white', fontSize: 8.5, fontWeight: '700', lineHeight: 11 }} numberOfLines={2}>{book.title}</Text>
                  </LinearGradient>
                </View>
              </View>
            )) : (
              <View style={{ paddingVertical: 16 }}>
                <Text style={{ color: textMuted, fontSize: 13, fontWeight: '600' }}>Henüz kitap eklenmemiş</Text>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    );
  };

  const renderReadingProgressWidget = () => {
    return (
      <View style={{ gap: 14 }}>
        {pinnedReadingWidgets.map(memberId => {
          const readingMember = familyMembers.find(m => m.id === memberId);
          if (!readingMember) return null;

          const memberLib = userLibraries.find(l => l.memberId === readingMember.id);
          const memberReadingBooks = (memberLib?.books || []).filter(b => b.status === 'reading').map(b => {
            const detail = books.find(bk => bk.id === b.bookId);
            return detail ? { ...detail, progress: b.progress || 0 } : null;
          }).filter(Boolean) as (Book & { progress: number })[];

          return (
            <View key={readingMember.id} style={{ paddingHorizontal: isTabletLandscape ? 0 : 14 }}>
              <View style={{ backgroundColor: cardBg, borderRadius: 22, padding: 16, borderWidth: 1, borderColor: cardBorder, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 }}>
                
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <View style={{ width: 34, height: 34, borderRadius: 12, backgroundColor: readingMember.color, alignItems: 'center', justifyContent: 'center' }}>
                      <Text style={{ color: 'white', fontWeight: '900', fontSize: 14 }}>{readingMember.name.charAt(0).toUpperCase()}</Text>
                    </View>
                    <View>
                      <Text style={{ color: textMain, fontWeight: '900', fontSize: 14 }}>{readingMember.name.split(' ')[0]} - Okuma</Text>
                      <Text style={{ color: textMuted, fontSize: 9, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.8, marginTop: 1 }}>Kişisel İlerleme</Text>
                    </View>
                  </View>
                  <TouchableOpacity onPress={() => removePinnedWidget(readingMember.id)} style={{ padding: 6, backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)', borderRadius: 12 }}>
                    <Text style={{ color: textMuted, fontWeight: '900', fontSize: 10 }}>Kaldır</Text>
                  </TouchableOpacity>
                </View>

                {/* Books List */}
                <View style={{ gap: 10 }}>
                  {memberReadingBooks.length > 0 ? memberReadingBooks.map(b => (
                    <TouchableOpacity key={b.id} onPress={() => router.push('/library' as any)} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)', borderRadius: 16, padding: 12, borderWidth: 1, borderColor: cardBorder }}>
                      <View style={{ width: 44, height: 60, borderRadius: 8, overflow: 'hidden', backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : '#fef3c7', alignItems: 'center', justifyContent: 'center' }}>
                        {b.image ? <Image source={{ uri: b.image }} style={{ width: '100%', height: '100%' }} /> : <BookOpen size={20} color="#f59e0b" opacity={0.5} />}
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: textMain, fontWeight: '800', fontSize: 13 }} numberOfLines={1}>{b.title}</Text>
                        <Text style={{ color: textMuted, fontSize: 10, fontWeight: '600', marginTop: 2 }} numberOfLines={1}>{b.author}</Text>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8, marginBottom: 4 }}>
                          <Text style={{ color: '#d97706', fontSize: 9, fontWeight: '900' }}>%{b.progress}</Text>
                          <Text style={{ color: '#d97706', fontSize: 9, fontWeight: '900' }}>{Math.round((b.progress / 100) * (b.pageCount || 0))} / {b.pageCount || 0} sf</Text>
                        </View>
                        <View style={{ height: 6, backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)', borderRadius: 3 }}>
                          <View style={{ height: '100%', backgroundColor: '#f59e0b', borderRadius: 3, width: `${b.progress}%` as any }} />
                        </View>
                      </View>
                    </TouchableOpacity>
                  )) : (
                    <View style={{ paddingVertical: 12, alignItems: 'center' }}>
                      <Text style={{ color: textMuted, fontSize: 12, fontWeight: '600' }}>Şu an okuduğu kitap yok</Text>
                    </View>
                  )}
                </View>
              </View>
            </View>
          );
        })}

        {/* Ekleme Butonu / Arayüzü */}
        {familyMembers.some(m => !pinnedReadingWidgets.includes(m.id)) && (
          <View style={{ paddingHorizontal: isTabletLandscape ? 0 : 14, marginTop: pinnedReadingWidgets.length > 0 ? 0 : 4 }}>
            {!isAddingReadingWidget ? (
              <TouchableOpacity 
                onPress={() => setIsAddingReadingWidget(true)}
                style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)', paddingVertical: 14, borderRadius: 20, borderWidth: 1, borderColor: cardBorder, borderStyle: 'dashed' }}
              >
                <Text style={{ color: textMuted, fontWeight: '800', fontSize: 13 }}>+ Okuma Takibi Widget'ı Ekle</Text>
              </TouchableOpacity>
            ) : (
              <View style={{ backgroundColor: cardBg, borderRadius: 22, padding: 16, borderWidth: 1, borderColor: cardBorder }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <Text style={{ color: textMain, fontWeight: '800', fontSize: 13 }}>Kişi Seçin</Text>
                  <TouchableOpacity onPress={() => setIsAddingReadingWidget(false)}>
                    <Text style={{ color: '#ef4444', fontWeight: '800', fontSize: 12 }}>İptal</Text>
                  </TouchableOpacity>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
                  {familyMembers.filter(m => !pinnedReadingWidgets.includes(m.id)).map(member => (
                    <TouchableOpacity
                      key={member.id}
                      onPress={() => addPinnedWidget(member.id)}
                      style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 16, borderWidth: 1, borderColor: cardBorder, backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)' }}
                    >
                      <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: member.color, alignItems: 'center', justifyContent: 'center' }}>
                        <Text style={{ color: 'white', fontWeight: '900', fontSize: 10 }}>{member.name.charAt(0).toUpperCase()}</Text>
                      </View>
                      <Text style={{ color: textMain, fontWeight: '700', fontSize: 12 }}>{member.name.split(' ')[0]}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}
          </View>
        )}
      </View>
    );
  };

  const renderActiveGoals = () => {
    if (activeGoals.length === 0) return null;
    return (
      <View style={{ paddingHorizontal: isTabletLandscape ? 0 : 14 }}>
        <View style={{ backgroundColor: cardBg, borderRadius: 22, padding: 16, borderWidth: 1, borderColor: cardBorder, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <IconBox colors={['#f43f5e', '#e11d48']} icon={<Target size={16} color="white" />} size={34} />
              <View>
                <Text style={{ color: textMain, fontWeight: '900', fontSize: 14 }}>Aktif Hedefler</Text>
                <Text style={{ color: textMuted, fontSize: 9, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.8, marginTop: 1 }}>{activeGoals.length} devam ediyor</Text>
              </View>
            </View>
            <TouchableOpacity onPress={() => router.push('/goals' as any)} style={{ paddingHorizontal: 12, paddingVertical: 6, backgroundColor: isDark ? 'rgba(244,63,94,0.12)' : 'rgba(244,63,94,0.07)', borderRadius: 16, borderWidth: 1, borderColor: isDark ? 'rgba(244,63,94,0.25)' : 'rgba(244,63,94,0.18)' }}>
              <Text style={{ color: '#f43f5e', fontWeight: '800', fontSize: 11 }}>Tümü →</Text>
            </TouchableOpacity>
          </View>

          <View style={{ gap: 8 }}>
            {activeGoals.slice(0, 3).map((goal, idx) => {
              const palettes: [string, string][] = [['#f43f5e', '#e11d48'], ['#8b5cf6', '#6d28d9'], ['#06b6d4', '#0891b2']];
              const [c1, c2] = palettes[idx % 3];
              return (
                <TouchableOpacity key={goal.id} onPress={() => router.push('/goals' as any)} activeOpacity={0.85}>
                  <View style={{ borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: isDark ? `${c1}20` : `${c1}15`, backgroundColor: isDark ? `${c1}07` : `${c1}04` }}>
                    {/* Sol kenar çizgisi */}
                    <View style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3 }}>
                      <LinearGradient colors={[c1, c2]} style={{ flex: 1 }} />
                    </View>
                    <View style={{ paddingLeft: 16, paddingRight: 14, paddingVertical: 12 }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        <Text style={{ color: textMain, fontWeight: '800', fontSize: 13, flex: 1, marginRight: 8 }} numberOfLines={1}>{goal.title}</Text>
                        <TouchableOpacity
                          onPress={() => handleGoalProgress(goal)}
                          style={{ paddingHorizontal: 8, paddingVertical: 4, backgroundColor: isDark ? `${c1}18` : `${c1}10`, borderRadius: 9, borderWidth: 1, borderColor: `${c1}25`, flexDirection: 'row', alignItems: 'center', gap: 4 }}
                        >
                          <Flame size={10} color={c1} />
                          <Text style={{ color: c1, fontWeight: '800', fontSize: 10 }}>İlerleme</Text>
                        </TouchableOpacity>
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <View style={{ flex: 1, height: 6, borderRadius: 3, backgroundColor: isDark ? 'rgba(255,255,255,0.09)' : 'rgba(0,0,0,0.07)', overflow: 'hidden' }}>
                          <LinearGradient colors={[c1, c2]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ height: '100%', borderRadius: 3, width: `${goal.overallProgress || 0}%` as any }} />
                        </View>
                        <Text style={{ color: c1, fontWeight: '900', fontSize: 12, width: 34, textAlign: 'right' }}>%{Math.round(goal.overallProgress || 0)}</Text>
                      </View>
                      {goal.assignee && (
                        <Text style={{ color: textMuted, fontSize: 10, fontWeight: '600', marginTop: 6 }}>👤 {goal.assignee.name}</Text>
                      )}
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </View>
    );
  };

  const renderReadingLeaders = () => {
    if (readingStats.length === 0) return null;
    return (
      <View style={{ paddingHorizontal: isTabletLandscape ? 0 : 14 }}>
        <View style={{ backgroundColor: cardBg, borderRadius: 22, padding: 16, borderWidth: 1, borderColor: cardBorder, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2, overflow: 'hidden' }}>
          {/* Arka plan dekor */}
          <View style={{ position: 'absolute', top: -20, right: -20, width: 100, height: 100, borderRadius: 50, backgroundColor: isDark ? 'rgba(99,102,241,0.08)' : 'rgba(99,102,241,0.05)' }} />

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <IconBox colors={['#eab308', '#f59e0b']} icon={<Trophy size={16} color="white" />} size={34} />
            <View>
              <Text style={{ color: textMain, fontWeight: '900', fontSize: 14 }}>Okuma Liderleri</Text>
              <Text style={{ color: textMuted, fontSize: 9, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.8, marginTop: 1 }}>Kitap sıralaması</Text>
            </View>
          </View>

          <View style={{ gap: 7 }}>
            {readingStats.map((stat, i) => (
              <View key={stat.memberId} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 11, borderRadius: 15, backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.025)', borderWidth: 1, borderColor: cardBorder }}>
                <View style={{ position: 'relative' }}>
                  <View style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: stat.color, alignItems: 'center', justifyContent: 'center', shadowColor: stat.color, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.4, shadowRadius: 5, elevation: 4 }}>
                    <Text style={{ color: 'white', fontWeight: '900', fontSize: 15 }}>{stat.name.charAt(0)}</Text>
                  </View>
                  {i === 0 && (
                    <View style={{ position: 'absolute', top: -3, right: -3, width: 16, height: 16, borderRadius: 8, backgroundColor: '#eab308', alignItems: 'center', justifyContent: 'center' }}>
                      <Star size={8} color="white" fill="white" />
                    </View>
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: textMain, fontWeight: '800', fontSize: 13 }}>{stat.name}</Text>
                  <Text style={{ color: '#6366f1', fontSize: 10, fontWeight: '700', marginTop: 1 }}>{stat.finishedBooks} kitap</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={{ color: textMain, fontWeight: '900', fontSize: 16 }}>{stat.pagesRead}</Text>
                  <Text style={{ color: textMuted, fontSize: 8, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 }}>Sayfa</Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      </View>
    );
  };

  const renderPersonalDashboards = () => {
    return (
      <View style={{ paddingHorizontal: isTabletLandscape ? 0 : 14 }}>
        {/* Başlık */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <IconBox colors={['#4f46e5', '#7c3aed']} icon={<LayoutDashboard size={16} color="white" />} size={34} />
          <View>
            <Text style={{ color: textMain, fontWeight: '900', fontSize: 14 }}>Kişisel Panolar</Text>
            <Text style={{ color: textMuted, fontSize: 9, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.8, marginTop: 1 }}>Bireysel gelişim</Text>
          </View>
        </View>

        {/* Üye seçici — yatay scroll */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 9, paddingBottom: 2, marginBottom: 12 }}>
          {familyMembers.map(member => {
            const isActive = activeMemberId === member.id;
            const mTasks = tasks.filter(t => t.assigneeId === member.id && !t.completed);
            return (
              <TouchableOpacity
                key={member.id}
                onPress={() => setActiveMemberId(member.id)}
                activeOpacity={0.8}
                style={{
                  width: 96, paddingVertical: 14, paddingHorizontal: 8,
                  borderRadius: 22, alignItems: 'center', gap: 7,
                  borderWidth: 1.5,
                  borderColor: isActive ? (isDark ? '#e2e8f0' : '#0d0f1a') : cardBorder,
                  backgroundColor: isActive ? (isDark ? '#f1f5f9' : '#0d0f1a') : cardBg,
                  shadowColor: isActive ? (isDark ? '#e2e8f0' : '#0d0f1a') : '#000',
                  shadowOffset: { width: 0, height: isActive ? 6 : 2 },
                  shadowOpacity: isActive ? 0.18 : 0.05,
                  shadowRadius: isActive ? 12 : 6,
                  elevation: isActive ? 7 : 2,
                  transform: [{ scale: isActive ? 1.03 : 1 }],
                }}
              >
                <View style={{ width: 48, height: 48, borderRadius: 16, backgroundColor: member.color, alignItems: 'center', justifyContent: 'center', shadowColor: member.color, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 7, elevation: 5 }}>
                  <Text style={{ color: 'white', fontWeight: '900', fontSize: 20 }}>{member.name.charAt(0).toUpperCase()}</Text>
                </View>
                <View style={{ alignItems: 'center' }}>
                  <Text style={{ fontWeight: '900', fontSize: 11, textAlign: 'center', color: isActive ? (isDark ? '#0d0f1a' : 'white') : textMain }} numberOfLines={1}>
                    {member.name.split(' ')[0]}
                  </Text>
                  <Text style={{ fontSize: 8, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.8, marginTop: 1, color: isActive ? (isDark ? '#64748b' : 'rgba(255,255,255,0.6)') : textMuted }}>
                    {member.role?.replace(' Çocuk', '').replace('Kız ', '').replace('Erkek ', '')}
                  </Text>
                </View>
                {mTasks.length > 0 && (
                  <View style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, backgroundColor: isActive ? 'rgba(255,255,255,0.18)' : (isDark ? 'rgba(99,102,241,0.18)' : 'rgba(99,102,241,0.09)') }}>
                    <Text style={{ fontWeight: '900', fontSize: 9, color: isActive ? (isDark ? '#0d0f1a' : 'white') : '#6366f1' }}>
                      {mTasks.length} görev
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Aktif üye detay */}
        {activeMember && (
          <View style={{ marginTop: 4 }}>
            {/* Üye header gradient */}
            <LinearGradient
              colors={[`${activeMember.color}ee`, `${activeMember.color}77`]}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={{ borderRadius: 22, padding: 18, marginBottom: 10, overflow: 'hidden', shadowColor: activeMember.color, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 7 }}
            >
              <View style={{ position: 'absolute', top: -30, right: -25, width: 100, height: 100, borderRadius: 50, backgroundColor: 'rgba(255,255,255,0.08)' }} />
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <View style={{ width: 50, height: 50, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.2)', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.3)', alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ color: 'white', fontWeight: '900', fontSize: 20 }}>{activeMember.name.charAt(0).toUpperCase()}</Text>
                  </View>
                  <View>
                    <Text style={{ color: 'white', fontWeight: '900', fontSize: 18, letterSpacing: -0.3 }}>{activeMember.name}</Text>
                    <Text style={{ color: 'rgba(255,255,255,0.72)', fontSize: 11, fontWeight: '700', marginTop: 2 }}>{activeMember.role}</Text>
                    {activeMember.xp ? (
                      <Text style={{ color: 'rgba(255,255,255,0.9)', fontSize: 11, fontWeight: '900', marginTop: 3 }}>✨ {activeMember.xp.toLocaleString()} XP</Text>
                    ) : null}
                  </View>
                </View>
                <View style={{ width: 34, height: 34, borderRadius: 11, backgroundColor: 'rgba(255,255,255,0.2)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)', alignItems: 'center', justifyContent: 'center' }}>
                  <Settings2 size={15} color="white" />
                </View>
              </View>
            </LinearGradient>

            {/* Üye görev kartı (Member Dashboard Card) */}
            <MemberDashboardCard
              member={activeMember}
              tasks={tasks}
              tests={tests}
              studyAssignments={studyAssignments}
              userLibraries={userLibraries}
              books={books}
              videos={videos}
              memorizationItems={memorizationItems}
              memorizationProgress={memorizationProgress}
              prayerProgress={prayerProgress}
              isDark={isDark}
              onNavigate={(route, params) => {
                router.push(route as any);
              }}
            />
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: bg }}>

      {/* ══ HEADER ══ */}
      <SafeAreaView edges={['top']} style={{ backgroundColor: isDark ? '#09090f' : '#f4f5fb' }}>
        <View style={{
          paddingHorizontal: 18, paddingVertical: 12,
          flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
          borderBottomWidth: 1,
          borderBottomColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)',
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <LinearGradient
              colors={['#4f46e5', '#7c3aed']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={{ width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' }}
            >
              <GraduationCap size={17} color="white" />
            </LinearGradient>
            <View>
              <Text style={{ color: textMain, fontWeight: '900', fontSize: 16, letterSpacing: -0.4 }}>Ailem</Text>
            </View>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <TouchableOpacity
              onPress={() => setColorScheme(isDark ? 'light' : 'dark')}
              style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)', alignItems: 'center', justifyContent: 'center' }}
            >
              {isDark ? <Sun size={15} color="#fbbf24" /> : <Moon size={15} color="#6366f1" />}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => router.push('/education' as any)}
              style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)', alignItems: 'center', justifyContent: 'center' }}
            >
              <GraduationCap size={15} color={isDark ? "#cbd5e1" : "#64748b"} />
              {(pendingTestsCount + pendingStudyAssignmentsCount) > 0 && (
                <View style={{ position: 'absolute', top: 6, right: 6, width: 8, height: 8, borderRadius: 4, backgroundColor: '#f43f5e', borderWidth: 1.5, borderColor: isDark ? '#09090f' : '#f4f5fb' }} />
              )}
            </TouchableOpacity>

            <LinearGradient
              colors={['#4f46e5', '#7c3aed']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={{ width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' }}
            >
              <Text style={{ color: 'white', fontWeight: '900', fontSize: 14 }}>{displayName.charAt(0).toUpperCase()}</Text>
            </LinearGradient>
          </View>
        </View>
      </SafeAreaView>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120, gap: 14 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={isDark ? '#fff' : '#000'} />}>
        {isTabletLandscape ? (
          <View style={{ flexDirection: 'row', paddingHorizontal: 14, gap: 16 }}>
            {/* Left Column - width 40% */}
            <View style={{ width: '40%', gap: 14 }}>
              {renderHeroBanner()}
              {renderBentoGrid()}
            </View>
            
            {/* Right Column - flex 1 */}
            <View style={{ flex: 1, gap: 14 }}>
              {renderPersonalDashboards()}
              {renderLibrary()}
              {renderReadingProgressWidget()}
              {renderActiveGoals()}
              {renderReadingLeaders()}
            </View>
          </View>
        ) : (
          <>
            {renderHeroBanner()}
            {renderBentoGrid()}
            {renderLibrary()}
            {renderReadingProgressWidget()}
            {renderActiveGoals()}
            {renderReadingLeaders()}
            {renderPersonalDashboards()}
          </>
        )}
      </ScrollView>
    </View>
  );
}
