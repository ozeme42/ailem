import { 
  View, 
  Text, 
  ScrollView, 
  TouchableOpacity, 
  ActivityIndicator, 
  TextInput, 
  Modal, 
  Alert,
  StyleSheet,
  Dimensions,
  Platform,
  Switch,
  RefreshControl
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useEffect, useState, useMemo } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { useColorScheme } from 'nativewind';
import { 
  onTasksUpdate, 
  onStudyAssignmentsUpdate, 
  updateStudyAssignment,
  onMemorizationItemsUpdate, 
  onMemorizationProgressUpdate, 
  updateMemorizationProgress,
  onPrayerProgressUpdate, 
  updatePrayerProgress,
  updateHabitCompletion,
  deleteTask,
  addTask,
  updateTask
} from '../lib/dataService';
import { Task, StudyAssignment, MemorizationItem, MemorizationProgress, PrayerProgress } from '../lib/data';
import { useAuth } from '../context/auth-context';
import { 
  Check, 
  Circle, 
  CheckCircle2, 
  Plus, 
  Search, 
  X, 
  ChevronDown, 
  ChevronUp, 
  Trophy, 
  Flame, 
  BookOpen, 
  Target, 
  TrendingUp,
  Edit2,
  Trash2,
  Trash,
  CheckSquare,
  Star,
  Zap,
  Heart,
} from 'lucide-react-native';
import { 
  format, 
  subDays, 
  isSameDay, 
  startOfDay, 
  addDays, 
} from 'date-fns';
import { tr } from 'date-fns/locale';
import { useRouter, Stack } from 'expo-router';

const { width } = Dimensions.get('window');

const WEEK_DAYS = [
  { id: 'Mon', label: 'Pzt' },
  { id: 'Tue', label: 'Sal' },
  { id: 'Wed', label: 'Çar' },
  { id: 'Thu', label: 'Per' },
  { id: 'Fri', label: 'Cum' },
  { id: 'Sat', label: 'Cmt' },
  { id: 'Sun', label: 'Paz' }
];

// Vibrant color palette for task cards
const CARD_PALETTES = [
  { grad: ['#a855f7', '#7c3aed'] as [string,string], light: 'rgba(168,85,247,0.08)', border: 'rgba(168,85,247,0.2)', text: '#a855f7' },
  { grad: ['#ec4899', '#f43f5e'] as [string,string], light: 'rgba(236,72,153,0.08)', border: 'rgba(236,72,153,0.2)', text: '#ec4899' },
  { grad: ['#06b6d4', '#3b82f6'] as [string,string], light: 'rgba(6,182,212,0.08)', border: 'rgba(6,182,212,0.2)', text: '#06b6d4' },
  { grad: ['#10b981', '#059669'] as [string,string], light: 'rgba(16,185,129,0.08)', border: 'rgba(16,185,129,0.2)', text: '#10b981' },
  { grad: ['#f59e0b', '#ef4444'] as [string,string], light: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.2)', text: '#f59e0b' },
  { grad: ['#f97316', '#ec4899'] as [string,string], light: 'rgba(249,115,22,0.08)', border: 'rgba(249,115,22,0.2)', text: '#f97316' },
];

const MOD_PALETTES: Record<string, typeof CARD_PALETTES[0]> = {
  'Egitim': CARD_PALETTES[2],
  'Ezber': CARD_PALETTES[3],
  'Namaz': CARD_PALETTES[4],
};

export default function TasksScreen() {
  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = () => { setRefreshing(true); setTimeout(() => setRefreshing(false), 1200); };
  const router = useRouter();
  const { user, familyMembers, loading: authLoading } = useAuth();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  // Data States
  const [tasks, setTasks] = useState<Task[]>([]);
  const [studyAssignments, setStudyAssignments] = useState<StudyAssignment[]>([]);
  const [memorizationItems, setMemorizationItems] = useState<MemorizationItem[]>([]);
  const [memorizationProgress, setMemorizationProgress] = useState<MemorizationProgress[]>([]);
  const [prayerProgress, setPrayerProgress] = useState<PrayerProgress[]>([]);
  const [loading, setLoading] = useState(true);

  const [tab, setTab] = useState<'tasks' | 'habits'>('tasks');
  const [filter, setFilter] = useState<'pending' | 'completed'>('pending');
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [openGroups, setOpenGroups] = useState({ personal: true, education: true, memorization: true, namaz: true });

  const [formOpen, setFormOpen] = useState(false);
  const [editTask, setEditTask] = useState<Task | null>(null);
  const [selectedHabit, setSelectedHabit] = useState<Task | null>(null);
  const [isHabitDetailOpen, setIsHabitDetailOpen] = useState(false);

  const [formTitle, setFormTitle] = useState('');
  const [formAssigneeId, setFormAssigneeId] = useState('');
  const [formDueDate, setFormDueDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [formSubtasks, setFormSubtasks] = useState<{ title: string }[]>([]);
  const [formIsRecurring, setFormIsRecurring] = useState(false);
  const [formRecurrenceType, setFormRecurrenceType] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [formRecurrenceDays, setFormRecurrenceDays] = useState<string[]>([]);
  const [formRecurrenceEndDate, setFormRecurrenceEndDate] = useState('');
  const [formTotalOccurrences, setFormTotalOccurrences] = useState('');

  useEffect(() => {
    let unsubTasks: any, unsubSA: any, unsubMI: any, unsubMP: any, unsubPP: any;
    try {
      unsubTasks = onTasksUpdate((data) => { setTasks(data); setLoading(false); });
      unsubSA = onStudyAssignmentsUpdate(setStudyAssignments);
      unsubMI = onMemorizationItemsUpdate(setMemorizationItems);
      unsubMP = onMemorizationProgressUpdate(setMemorizationProgress);
      unsubPP = onPrayerProgressUpdate(setPrayerProgress);
    } catch (e) { setLoading(false); }
    return () => {
      if (typeof unsubTasks === 'function') unsubTasks();
      if (typeof unsubSA === 'function') unsubSA();
      if (typeof unsubMI === 'function') unsubMI();
      if (typeof unsubMP === 'function') unsubMP();
      if (typeof unsubPP === 'function') unsubPP();
    };
  }, []);

  const getMember = (id: string) => familyMembers.find(m => m.id === id);
  const todayStr = format(new Date(), 'yyyy-MM-dd');

  const modTasks = useMemo(() => {
    const list: any[] = [];
    const q = searchQuery.toLowerCase();
    studyAssignments.forEach(x => {
      if (!x.studentId || (selectedMemberId && x.studentId !== selectedMemberId)) return;
      const assignee = getMember(x.studentId);
      if (!x.topic.toLowerCase().includes(q) && !assignee?.name.toLowerCase().includes(q)) return;
      list.push({ id: `edu-${x.id}`, title: `${x.subject} - ${x.topic}`, module: 'Egitim', assigneeId: x.studentId, isCompleted: x.status === 'completed', icon: BookOpen, onToggle: async (c: boolean) => { await updateStudyAssignment(x.id, { status: c ? 'completed' : 'assigned' }); } });
    });
    memorizationItems.forEach(item => {
      familyMembers.forEach(m => {
        if (selectedMemberId && m.id !== selectedMemberId) return;
        const prog = memorizationProgress.find(p => p.itemId === item.id && p.memberId === m.id);
        if (!prog) return;
        if (!item.title.toLowerCase().includes(q) && !m.name.toLowerCase().includes(q)) return;
        list.push({ id: `mem-${item.id}-${m.id}`, title: item.title, module: 'Ezber', assigneeId: m.id, isCompleted: prog.completed, icon: BookOpen, onToggle: async (c: boolean) => { await updateMemorizationProgress(item.id, m.id, c); } });
      });
    });
    const PRAYERS = ['Sabah', 'Ogle', 'Ikindi', 'Aksam', 'Yatsi'];
    familyMembers.forEach(m => {
      if (!m.role.includes('Çocuk') && !m.role.includes('Cocuk')) return;
      if (selectedMemberId && m.id !== selectedMemberId) return;
      const pdata = prayerProgress.find(p => p.memberId === m.id);
      const completedList: string[] = pdata?.completions?.[todayStr] || [];
      PRAYERS.forEach(pr => {
        list.push({ id: `pr-${m.id}-${pr}`, title: `${pr} Namazı`, module: 'Namaz', assigneeId: m.id, isCompleted: completedList.includes(pr), icon: Target, onToggle: async (c: boolean) => { const nextList = c ? [...completedList, pr] : completedList.filter(x => x !== pr); await updatePrayerProgress(m.id, { ...(pdata?.completions || {}), [todayStr]: nextList }); } });
      });
    });
    return list;
  }, [studyAssignments, memorizationItems, memorizationProgress, prayerProgress, familyMembers, searchQuery, selectedMemberId]);

  const { pt, ct, habitsList, stats } = useMemo(() => {
    const q = searchQuery.toLowerCase();
    const filtered = tasks.filter(t => {
      if (selectedMemberId && t.assigneeId !== selectedMemberId) return false;
      return t.title.toLowerCase().includes(q) || getMember(t.assigneeId)?.name.toLowerCase().includes(q);
    });
    const pt = filtered.filter(t => !t.isRecurring && !t.completed);
    const ct = filtered.filter(t => !t.isRecurring && t.completed);
    const habitsList = filtered.filter(t => t.isRecurring);
    const activeMemberXp = selectedMemberId ? getMember(selectedMemberId)?.xp || 0 : (user ? getMember(user.uid)?.xp || 0 : 0);
    const pendingCount = pt.length + modTasks.filter(t => !t.isCompleted).length;
    return { pt, ct, habitsList, stats: { pending: pendingCount, habits: habitsList.length, xp: activeMemberXp } };
  }, [tasks, modTasks, selectedMemberId, searchQuery, user, familyMembers]);

  const toggleGroup = (key: 'personal' | 'education' | 'memorization' | 'namaz') => {
    setOpenGroups(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleOpenAddModal = () => {
    setEditTask(null); setFormTitle(''); setFormAssigneeId(user?.uid || (familyMembers[0]?.id || ''));
    setFormDueDate(format(new Date(), 'yyyy-MM-dd')); setFormSubtasks([]); setFormIsRecurring(false);
    setFormRecurrenceType('daily'); setFormRecurrenceDays([]); setFormRecurrenceEndDate(''); setFormTotalOccurrences(''); setFormOpen(true);
  };

  const handleOpenEditModal = (task: Task) => {
    setEditTask(task); setFormTitle(task.title); setFormAssigneeId(task.assigneeId); setFormDueDate(task.dueDate);
    setFormSubtasks((task.subtasks || []).map(st => ({ title: st.title }))); setFormIsRecurring(task.isRecurring || false);
    setFormRecurrenceType(task.recurrenceType || 'daily'); setFormRecurrenceDays(task.recurrenceDays || []);
    setFormRecurrenceEndDate(task.recurrenceEndDate || ''); setFormTotalOccurrences(task.totalOccurrences ? String(task.totalOccurrences) : ''); setFormOpen(true);
  };

  const handleSaveTask = async () => {
    if (!formTitle.trim()) { Alert.alert('Hata', 'Lütfen görev başlığı girin.'); return; }
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(formDueDate)) { Alert.alert('Hata', 'Lütfen geçerli bir tarih girin (YYYY-AA-GG).'); return; }
    const taskData: any = { title: formTitle, assigneeId: formAssigneeId, dueDate: formDueDate, category: 'Görev' as const, points: 25, completed: editTask ? editTask.completed : false, subtasks: formSubtasks.map(st => ({ id: Math.random().toString(36).substr(2, 9), title: st.title, completed: false })), isRecurring: formIsRecurring, completedOccurrences: editTask ? editTask.completedOccurrences || 0 : 0, streak: editTask ? editTask.streak || 0 : 0, completedDates: editTask ? editTask.completedDates || [] : [] };
    if (formIsRecurring) { taskData.recurrenceType = formRecurrenceType; if (formRecurrenceType === 'weekly') taskData.recurrenceDays = formRecurrenceDays; if (formRecurrenceEndDate) taskData.recurrenceEndDate = formRecurrenceEndDate; if (formTotalOccurrences) taskData.totalOccurrences = Number(formTotalOccurrences); }
    try {
      if (editTask) { await updateTask(editTask.id, taskData); Alert.alert('Başarılı ✨', 'Görev güncellendi.'); }
      else { await addTask(taskData); Alert.alert('Başarılı ✨', 'Yeni görev eklendi.'); }
      setFormOpen(false);
    } catch (e) { Alert.alert('Hata', 'Görev kaydedilemedi.'); }
  };

  const handleDeleteTask = (id: string) => {
    Alert.alert('Görevi Sil', 'Bu görevi tamamen silmek istediğinize emin misiniz?', [
      { text: 'İptal', style: 'cancel' },
      { text: 'Sil', style: 'destructive', onPress: async () => { try { await deleteTask(id); } catch (e) {} } }
    ]);
  };

  const handleToggleTaskCompletion = async (task: Task) => {
    try { await updateTask(task.id, { completed: !task.completed }); } catch (e) {}
  };

  const handleToggleSubtask = async (task: Task, subtaskId: string) => {
    if (!task.subtasks) return;
    const nextSubtasks = task.subtasks.map(st => st.id === subtaskId ? { ...st, completed: !st.completed } : st);
    const allCompleted = nextSubtasks.every(st => st.completed);
    try { await updateTask(task.id, { subtasks: nextSubtasks, completed: allCompleted }); } catch (e) {}
  };

  const recentDays = useMemo(() => Array.from({ length: 4 }).map((_, i) => startOfDay(subDays(new Date(), 3 - i))), []);

  const isHabitCompletedOnDay = (habit: Task, day: Date) => habit.completedDates?.some(d => isSameDay(new Date(d), day)) || false;

  const calculateHabitStats = (habit: Task) => {
    const today = startOfDay(new Date());
    let streak = 0;
    let checkDate = isHabitCompletedOnDay(habit, today) ? today : subDays(today, 1);
    while (habit.completedDates?.some(d => isSameDay(new Date(d), checkDate))) { streak++; checkDate = subDays(checkDate, 1); }
    const best = habit.bestStreak || 0;
    const bestStreak = streak > best ? streak : best;
    const totalCompletions = habit.completedDates?.length || 0;
    const thirtyDaysAgo = subDays(new Date(), 30);
    const completionsLast30 = habit.completedDates?.filter(d => new Date(d) >= thirtyDaysAgo).length || 0;
    const score = Math.round((completionsLast30 / 30) * 100);
    return { streak, bestStreak, totalCompletions, score };
  };

  const handleToggleHabitDay = async (habit: Task, day: Date) => {
    const isCompleted = isHabitCompletedOnDay(habit, day);
    try { await updateHabitCompletion(habit.id, day, !isCompleted); } catch (e) {}
  };

  // Colors
  const bg = isDark ? '#0a0a18' : '#f4f5fb';
  const cardBg = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.9)';
  const cardBorder = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.6)';
  const textPrimary = isDark ? '#f8faff' : '#1a1040';
  const textSecondary = isDark ? '#a0a8d0' : '#5a5585';
  const textMuted = isDark ? '#5a6080' : '#9090b0';

  if (loading || authLoading) {
    return (
      <LinearGradient colors={isDark ? ['#0d0d1a', '#1a0a2e'] : ['#667eea', '#764ba2']} style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <View style={{ width: 72, height: 72, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color="white" size="large" />
        </View>
        <Text style={{ color: 'rgba(255,255,255,0.8)', fontWeight: '700', fontSize: 14, marginTop: 20 }}>Yükleniyor...</Text>
      </LinearGradient>
    );
  }

  const sortedLeaderboard = familyMembers.slice().sort((a, b) => b.xp - a.xp);

  return (
    <View style={{ flex: 1, backgroundColor: bg }}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Background blobs */}
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, overflow: 'hidden' }}>
        <View style={{ position: 'absolute', top: -80, right: -80, width: 250, height: 250, borderRadius: 125, backgroundColor: isDark ? 'rgba(245,158,11,0.1)' : 'rgba(245,158,11,0.15)' }} />
        <View style={{ position: 'absolute', top: 180, left: -80, width: 220, height: 220, borderRadius: 110, backgroundColor: isDark ? 'rgba(168,85,247,0.08)' : 'rgba(168,85,247,0.12)' }} />
        <View style={{ position: 'absolute', bottom: 200, right: -60, width: 200, height: 200, borderRadius: 100, backgroundColor: isDark ? 'rgba(16,185,129,0.07)' : 'rgba(16,185,129,0.1)' }} />
      </View>

      {/* ── HEADER ── */}
      <LinearGradient
        colors={isDark ? ['#1a0a2e', '#2d1058', '#1e0a3c'] as [string,string,string] : ['#f59e0b', '#ef4444', '#ec4899'] as [string,string,string]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ paddingBottom: 16, paddingTop: 12, paddingHorizontal: 16, borderBottomLeftRadius: 24, borderBottomRightRadius: 24, overflow: 'hidden' }}
      >
        <SafeAreaView edges={['top']} className="m-0 p-0" />
        
        {/* Decorative */}
        <View style={{ position: 'absolute', top: -40, right: -40, width: 140, height: 140, borderRadius: 70, backgroundColor: 'rgba(255,255,255,0.07)' }} />
        <View style={{ position: 'absolute', bottom: -30, left: -30, width: 100, height: 100, borderRadius: 50, backgroundColor: 'rgba(255,255,255,0.05)' }} />

        {/* Top Navbar Row */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={{ width: 32, height: 32, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 16, alignItems: 'center', justifyContent: 'center' }}
          >
            <Text style={{ color: 'white', fontWeight: '800', fontSize: 18 }}>←</Text>
          </TouchableOpacity>
          
          <View style={{ alignItems: 'center' }}>
            <Text style={{ color: 'white', fontSize: 18, fontWeight: '900' }}>Görevler</Text>
            <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 10, fontWeight: '600', marginTop: 2 }}>
              {format(new Date(), 'd MMMM yyyy', { locale: tr })}
            </Text>
          </View>

          <TouchableOpacity
            onPress={handleOpenAddModal}
            style={{ width: 32, height: 32, backgroundColor: 'rgba(0,0,0,0.15)', borderRadius: 8, alignItems: 'center', justifyContent: 'center' }}
          >
            <Plus size={18} color="white" />
          </TouchableOpacity>
        </View>

        {/* Stats Row */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12, flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' }}>
              <CheckSquare size={13} color="white" />
              <Text style={{ color: 'white', fontWeight: '800', fontSize: 12 }}>{stats.pending} bekleyen</Text>
            </View>
            <View style={{ backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12, flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' }}>
              <Flame size={13} color="white" />
              <Text style={{ color: 'white', fontWeight: '800', fontSize: 12 }}>{stats.habits} alışkanlık</Text>
            </View>
          </View>

          <LinearGradient
            colors={['rgba(255,255,255,0.25)', 'rgba(255,255,255,0.15)']}
            style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)', flexDirection: 'row', gap: 6 }}
          >
            <Star size={14} color="white" fill="white" />
            <Text style={{ color: 'white', fontWeight: '900', fontSize: 14 }}>{stats.xp} <Text style={{ fontSize: 10, fontWeight: '700', color: 'rgba(255,255,255,0.8)' }}>XP</Text></Text>
          </LinearGradient>
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 120 }} showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={isDark ? '#fff' : '#000'} />}>

        {/* ── SEARCH ── */}
        <View style={{
          flexDirection: 'row', alignItems: 'center', gap: 10,
          backgroundColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.03)',
          borderRadius: 20, paddingHorizontal: 16, paddingVertical: 12,
          borderWidth: 1.5, borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
          marginBottom: 14,
          shadowColor: '#a855f7', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 6, elevation: 2,
        }}>
          <Search size={16} color="#a855f7" />
          <TextInput
            placeholder="Görev veya üye ara..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={{ flex: 1, fontSize: 13, fontWeight: '600', color: textPrimary }}
            placeholderTextColor={textMuted}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)', alignItems: 'center', justifyContent: 'center' }}>
              <X size={12} color={textMuted} />
            </TouchableOpacity>
          )}
        </View>

        {/* ── MEMBER FILTER ── */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 14 }}>
          <TouchableOpacity
            onPress={() => setSelectedMemberId(null)}
            style={{
              paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1.5,
              borderColor: selectedMemberId === null ? '#a855f7' : (isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.1)'),
              backgroundColor: selectedMemberId === null
                ? (isDark ? 'rgba(168,85,247,0.2)' : 'rgba(168,85,247,0.1)')
                : (isDark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.8)'),
            }}
          >
            <Text style={{ color: selectedMemberId === null ? '#a855f7' : textSecondary, fontWeight: '800', fontSize: 12 }}>Tümü</Text>
          </TouchableOpacity>
          {familyMembers.map((member) => {
            const isSelected = selectedMemberId === member.id;
            return (
              <TouchableOpacity
                key={member.id}
                onPress={() => setSelectedMemberId(member.id)}
                style={{
                  flexDirection: 'row', alignItems: 'center', gap: 6,
                  paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1.5,
                  borderColor: isSelected ? member.color : (isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.1)'),
                  backgroundColor: isSelected ? `${member.color}20` : (isDark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.8)'),
                }}
              >
                <View style={{ width: 18, height: 18, borderRadius: 6, backgroundColor: member.color, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ fontSize: 9, fontWeight: '900', color: 'white' }}>{member.name[0]}</Text>
                </View>
                <Text style={{ color: isSelected ? member.color : textSecondary, fontWeight: '800', fontSize: 12 }}>{member.name.split(' ')[0]}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* ── MAIN TABS ── */}
        <View style={{
          flexDirection: 'row', marginBottom: 16, padding: 4,
          backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
          borderRadius: 22, borderWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
        }}>
          {[
            { key: 'tasks', label: `📋 Görevler`, count: stats.pending, colors: ['#f59e0b', '#ef4444'] as [string,string] },
            { key: 'habits', label: `🔥 Alışkanlıklar`, count: stats.habits, colors: ['#a855f7', '#ec4899'] as [string,string] },
          ].map((t) => (
            <TouchableOpacity
              key={t.key}
              onPress={() => setTab(t.key as any)}
              activeOpacity={0.8}
              style={{ flex: 1, borderRadius: 18, overflow: 'hidden' }}
            >
              {tab === t.key ? (
                <LinearGradient
                  colors={t.colors}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={{ paddingVertical: 10, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 6 }}
                >
                  <Text style={{ color: 'white', fontWeight: '900', fontSize: 12 }}>{t.label}</Text>
                  <View style={{ backgroundColor: 'rgba(255,255,255,0.25)', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 10 }}>
                    <Text style={{ color: 'white', fontWeight: '900', fontSize: 10 }}>{t.count}</Text>
                  </View>
                </LinearGradient>
              ) : (
                <View style={{ paddingVertical: 10, alignItems: 'center' }}>
                  <Text style={{ color: textSecondary, fontWeight: '700', fontSize: 12 }}>{t.label} ({t.count})</Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* ── TAB 1: TASKS ── */}
        {tab === 'tasks' && (
          <View style={{ gap: 4 }}>
            {/* Sub-filter */}
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
              {[
                { key: 'pending', label: `Yapılacaklar`, count: pt.length + modTasks.filter(t => !t.isCompleted).length, colors: ['#f59e0b', '#ef4444'] as [string,string] },
                { key: 'completed', label: `Tamamlananlar`, count: ct.length + modTasks.filter(t => t.isCompleted).length, colors: ['#10b981', '#059669'] as [string,string] },
              ].map((f) => (
                <TouchableOpacity
                  key={f.key}
                  onPress={() => setFilter(f.key as any)}
                  activeOpacity={0.8}
                  style={{ flex: 1, borderRadius: 16, overflow: 'hidden' }}
                >
                  {filter === f.key ? (
                    <LinearGradient colors={f.colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ paddingVertical: 10, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 6 }}>
                      <Text style={{ color: 'white', fontWeight: '800', fontSize: 11 }}>{f.label}</Text>
                      <View style={{ backgroundColor: 'rgba(255,255,255,0.25)', paddingHorizontal: 6, paddingVertical: 1, borderRadius: 8 }}>
                        <Text style={{ color: 'white', fontWeight: '900', fontSize: 10 }}>{f.count}</Text>
                      </View>
                    </LinearGradient>
                  ) : (
                    <View style={{ paddingVertical: 10, alignItems: 'center', backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.8)', borderRadius: 16, borderWidth: 1.5, borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)' }}>
                      <Text style={{ color: textSecondary, fontWeight: '700', fontSize: 11 }}>{f.label} ({f.count})</Text>
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>

            {filter === 'pending' ? (
              <View style={{ gap: 12 }}>
                {pt.length > 0 && (
                  <PremiumAccordion emoji="📌" title="Kişisel Görevler" count={pt.length} isOpen={openGroups.personal} onToggle={() => toggleGroup('personal')} gradColors={['#a855f7', '#7c3aed']} isDark={isDark} textPrimary={textPrimary} textMuted={textMuted}>
                    <View style={{ gap: 8 }}>{pt.map((t, idx) => renderTaskRow(t, idx, false))}</View>
                  </PremiumAccordion>
                )}

                {modTasks.filter(t => t.module === 'Egitim' && !t.isCompleted).length > 0 && (
                  <PremiumAccordion emoji="📚" title="Eğitim" count={modTasks.filter(t => t.module === 'Egitim' && !t.isCompleted).length} isOpen={openGroups.education} onToggle={() => toggleGroup('education')} gradColors={['#06b6d4', '#3b82f6']} isDark={isDark} textPrimary={textPrimary} textMuted={textMuted}>
                    <View style={{ gap: 8 }}>{modTasks.filter(t => t.module === 'Egitim' && !t.isCompleted).map((mt) => renderModRow(mt))}</View>
                  </PremiumAccordion>
                )}

                {modTasks.filter(t => t.module === 'Ezber' && !t.isCompleted).length > 0 && (
                  <PremiumAccordion emoji="🧠" title="Ezber" count={modTasks.filter(t => t.module === 'Ezber' && !t.isCompleted).length} isOpen={openGroups.memorization} onToggle={() => toggleGroup('memorization')} gradColors={['#10b981', '#059669']} isDark={isDark} textPrimary={textPrimary} textMuted={textMuted}>
                    <View style={{ gap: 8 }}>{modTasks.filter(t => t.module === 'Ezber' && !t.isCompleted).map((mt) => renderModRow(mt))}</View>
                  </PremiumAccordion>
                )}

                {modTasks.filter(t => t.module === 'Namaz' && !t.isCompleted).length > 0 && (
                  <PremiumAccordion emoji="🕌" title="Namaz" count={modTasks.filter(t => t.module === 'Namaz' && !t.isCompleted).length} isOpen={openGroups.namaz} onToggle={() => toggleGroup('namaz')} gradColors={['#f59e0b', '#d97706']} isDark={isDark} textPrimary={textPrimary} textMuted={textMuted}>
                    <View style={{ gap: 8 }}>{modTasks.filter(t => t.module === 'Namaz' && !t.isCompleted).map((mt) => renderModRow(mt))}</View>
                  </PremiumAccordion>
                )}

                {pt.length === 0 && modTasks.filter(t => !t.isCompleted).length === 0 && (
                  <View style={{ alignItems: 'center', paddingVertical: 40 }}>
                    <LinearGradient colors={['#10b981', '#059669']} style={{ width: 72, height: 72, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: 16, shadowColor: '#10b981', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.4, shadowRadius: 12, elevation: 8 }}>
                      <Text style={{ fontSize: 32 }}>🎉</Text>
                    </LinearGradient>
                    <Text style={{ color: textPrimary, fontWeight: '900', fontSize: 18, marginBottom: 6 }}>Süpersin!</Text>
                    <Text style={{ color: textMuted, fontWeight: '600', fontSize: 13 }}>Yapılacak hiçbir görev kalmadı.</Text>
                  </View>
                )}
              </View>
            ) : (
              <View style={{ gap: 12 }}>
                {ct.length > 0 && (
                  <PremiumAccordion emoji="✅" title="Tamamlanan Görevler" count={ct.length} isOpen={openGroups.personal} onToggle={() => toggleGroup('personal')} gradColors={['#10b981', '#059669']} isDark={isDark} textPrimary={textPrimary} textMuted={textMuted}>
                    <View style={{ gap: 8 }}>{ct.map((t, idx) => renderTaskRow(t, idx, true))}</View>
                  </PremiumAccordion>
                )}

                {modTasks.filter(t => t.isCompleted).length > 0 && (
                  <PremiumAccordion emoji="📖" title="Diğer Tamamlananlar" count={modTasks.filter(t => t.isCompleted).length} isOpen={openGroups.education} onToggle={() => toggleGroup('education')} gradColors={['#06b6d4', '#3b82f6']} isDark={isDark} textPrimary={textPrimary} textMuted={textMuted}>
                    <View style={{ gap: 8 }}>{modTasks.filter(t => t.isCompleted).map((mt) => renderModRow(mt))}</View>
                  </PremiumAccordion>
                )}

                {ct.length === 0 && modTasks.filter(t => t.isCompleted).length === 0 && (
                  <View style={{ alignItems: 'center', paddingVertical: 40 }}>
                    <LinearGradient colors={['#94a3b8', '#64748b']} style={{ width: 72, height: 72, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: 16, shadowColor: '#64748b', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.4, shadowRadius: 12, elevation: 8 }}>
                      <CheckSquare size={32} color="white" />
                    </LinearGradient>
                    <Text style={{ color: textPrimary, fontWeight: '900', fontSize: 18, marginBottom: 6 }}>Henüz Yok</Text>
                    <Text style={{ color: textMuted, fontWeight: '600', fontSize: 13 }}>Hiç tamamlanmış görev bulunmuyor.</Text>
                  </View>
                )}
              </View>
            )}
          </View>
        )}

        {/* ── TAB 2: HABITS ── */}
        {tab === 'habits' && (
          <View style={{ gap: 10 }}>
            {habitsList.length === 0 ? (
              <View style={{ alignItems: 'center', paddingVertical: 48 }}>
                <LinearGradient colors={['#f59e0b', '#ef4444']} style={{ width: 72, height: 72, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                  <Flame size={32} color="white" />
                </LinearGradient>
                <Text style={{ color: textPrimary, fontWeight: '900', fontSize: 18, marginBottom: 6 }}>Alışkanlık Edin</Text>
                <Text style={{ color: textMuted, fontWeight: '600', fontSize: 13 }}>Zinciri kırmadan devam edecek hedefler ekle.</Text>
              </View>
            ) : (
              habitsList.map((h, idx) => {
                const assignee = getMember(h.assigneeId);
                const hStats = calculateHabitStats(h);
                const palette = CARD_PALETTES[idx % CARD_PALETTES.length];
                const isTodayDone = isHabitCompletedOnDay(h, new Date());

                return (
                  <TouchableOpacity
                    key={h.id}
                    onPress={() => { setSelectedHabit(h); setIsHabitDetailOpen(true); }}
                    activeOpacity={0.85}
                    style={{
                      borderRadius: 24, overflow: 'hidden',
                      borderWidth: 1.5,
                      borderColor: isTodayDone ? 'rgba(74,222,128,0.35)' : palette.border,
                      backgroundColor: isTodayDone
                        ? (isDark ? 'rgba(74,222,128,0.08)' : 'rgba(74,222,128,0.07)')
                        : (isDark ? palette.light : palette.light),
                    }}
                  >
                    {/* Color top bar */}
                    <View style={{ height: 3, overflow: 'hidden' }}>
                      <LinearGradient colors={isTodayDone ? ['#4ade80', '#10b981'] : palette.grad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ flex: 1 }} />
                    </View>

                    <View style={{ padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                      {/* Icon */}
                      <LinearGradient
                        colors={isTodayDone ? ['#4ade80', '#10b981'] : palette.grad}
                        style={{ width: 46, height: 46, borderRadius: 16, alignItems: 'center', justifyContent: 'center', shadowColor: palette.grad[0], shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.4, shadowRadius: 6, elevation: 4 }}
                      >
                        {isTodayDone ? <Check size={22} color="white" strokeWidth={3} /> : <Flame size={22} color="white" />}
                      </LinearGradient>

                      <View style={{ flex: 1 }}>
                        <Text style={{ color: textPrimary, fontWeight: '800', fontSize: 14 }} numberOfLines={1}>{h.title}</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }}>
                          {assignee && (
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                              <View style={{ width: 16, height: 16, borderRadius: 5, backgroundColor: assignee.color, alignItems: 'center', justifyContent: 'center' }}>
                                <Text style={{ color: 'white', fontSize: 8, fontWeight: '900' }}>{assignee.name[0]}</Text>
                              </View>
                              <Text style={{ color: textSecondary, fontSize: 11, fontWeight: '600' }}>{assignee.name.split(' ')[0]}</Text>
                            </View>
                          )}
                          {hStats.streak > 0 && (
                            <View style={{ backgroundColor: isDark ? 'rgba(251,146,60,0.2)' : 'rgba(251,146,60,0.15)', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 8, flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                              <Text style={{ color: '#fb923c', fontSize: 10, fontWeight: '900' }}>🔥 {hStats.streak} gün</Text>
                            </View>
                          )}
                        </View>
                      </View>

                      {/* 4-day check bubbles */}
                      <View style={{ flexDirection: 'row', gap: 6 }}>
                        {recentDays.map((day) => {
                          const completed = isHabitCompletedOnDay(h, day);
                          const isToday = isSameDay(day, new Date());
                          return (
                            <View key={day.toISOString()} style={{ alignItems: 'center', gap: 2 }}>
                              <Text style={{ fontSize: 9, fontWeight: '800', color: isToday ? palette.text : textMuted }}>
                                {format(day, 'E', { locale: tr }).slice(0, 1)}
                              </Text>
                              <TouchableOpacity
                                onPress={() => handleToggleHabitDay(h, day)}
                                style={{
                                  width: 28, height: 28, borderRadius: 9,
                                  borderWidth: 2,
                                  borderColor: completed ? palette.grad[0] : (isToday ? palette.grad[0] : (isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.12)')),
                                  backgroundColor: completed ? palette.grad[0] : 'transparent',
                                  alignItems: 'center', justifyContent: 'center',
                                }}
                              >
                                {completed && <Check size={13} color="white" strokeWidth={3.5} />}
                              </TouchableOpacity>
                            </View>
                          );
                        })}
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })
            )}
          </View>
        )}

        {/* ── LEADERBOARD ── */}
        <View style={{ marginTop: 24 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <LinearGradient
              colors={['#fbbf24', '#f59e0b']}
              style={{ width: 34, height: 34, borderRadius: 11, alignItems: 'center', justifyContent: 'center', shadowColor: '#f59e0b', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.5, shadowRadius: 6, elevation: 4 }}
            >
              <Trophy size={16} color="white" />
            </LinearGradient>
            <View>
              <Text style={{ color: textPrimary, fontWeight: '900', fontSize: 18, letterSpacing: -0.4 }}>Liderlik Tablosu</Text>
              <Text style={{ color: textMuted, fontSize: 12, fontWeight: '600', marginTop: 1 }}>XP sıralaması</Text>
            </View>
          </View>

          <View style={{ borderRadius: 24, overflow: 'hidden', borderWidth: 1.5, borderColor: isDark ? 'rgba(251,191,36,0.2)' : 'rgba(251,191,36,0.25)', backgroundColor: isDark ? 'rgba(251,191,36,0.05)' : 'rgba(255,253,235,0.9)' }}>
            {sortedLeaderboard.map((m, idx) => {
              const medalColors = ['#fbbf24', '#94a3b8', '#fb923c'];
              const medalColor = medalColors[idx] || (isDark ? '#334155' : '#e2e8f0');
              const isFirst = idx === 0;
              return (
                <View
                  key={m.id}
                  style={{
                    flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14,
                    borderBottomWidth: idx < sortedLeaderboard.length - 1 ? 1 : 0,
                    borderBottomColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
                    backgroundColor: isFirst ? (isDark ? 'rgba(251,191,36,0.12)' : 'rgba(251,191,36,0.15)') : 'transparent',
                  }}
                >
                  {/* Rank badge */}
                  <View style={{ width: 28, height: 28, borderRadius: 10, backgroundColor: medalColor, alignItems: 'center', justifyContent: 'center', shadowColor: medalColor, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.4, shadowRadius: 4, elevation: 3 }}>
                    {isFirst
                      ? <Star size={13} color="white" fill="white" />
                      : <Text style={{ color: 'white', fontSize: 11, fontWeight: '900' }}>{idx + 1}</Text>}
                  </View>

                  {/* Avatar */}
                  <View style={{ width: 40, height: 40, borderRadius: 13, backgroundColor: m.color, alignItems: 'center', justifyContent: 'center', shadowColor: m.color, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.4, shadowRadius: 6, elevation: 4 }}>
                    <Text style={{ color: 'white', fontWeight: '900', fontSize: 16 }}>{m.name[0]}</Text>
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text style={{ color: textPrimary, fontWeight: '800', fontSize: 14 }}>{m.name}</Text>
                    <Text style={{ color: textMuted, fontSize: 11, fontWeight: '600', marginTop: 1 }}>Seviye {m.level}</Text>
                  </View>

                  <LinearGradient
                    colors={['#fbbf24', '#f59e0b']}
                    style={{ paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12, flexDirection: 'row', alignItems: 'center', gap: 4 }}
                  >
                    <Zap size={11} color="white" />
                    <Text style={{ color: 'white', fontWeight: '900', fontSize: 12 }}>{m.xp.toLocaleString()}</Text>
                  </LinearGradient>
                </View>
              );
            })}
          </View>
        </View>

      </ScrollView>

      {/* ── FAB ── */}
      <TouchableOpacity onPress={handleOpenAddModal} activeOpacity={0.85} style={{ position: 'absolute', bottom: 32, right: 20, zIndex: 99, borderRadius: 22, overflow: 'hidden', shadowColor: '#f59e0b', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.5, shadowRadius: 12, elevation: 8 }}>
        <LinearGradient colors={['#f59e0b', '#ef4444', '#ec4899']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ width: 60, height: 60, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.25)' }}>
          <Plus size={28} color="white" />
        </LinearGradient>
      </TouchableOpacity>

      {/* ── FORM MODAL ── */}
      <Modal visible={formOpen} animationType="slide" transparent={true} onRequestClose={() => setFormOpen(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' }}>
          <SafeAreaView style={{ backgroundColor: isDark ? '#0f0f1e' : '#ffffff', borderTopLeftRadius: 36, borderTopRightRadius: 36, maxHeight: '92%', paddingTop: 8 }}>
            {/* Handle */}
            <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.12)', alignSelf: 'center', marginBottom: 16 }} />

            {/* Header */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)', marginBottom: 4 }}>
              <View>
                <Text style={{ color: textPrimary, fontWeight: '900', fontSize: 20 }}>{editTask ? 'Görevi Düzenle' : 'Yeni Görev'}</Text>
                <Text style={{ color: textMuted, fontSize: 12, fontWeight: '600', marginTop: 2 }}>{editTask ? 'Mevcut görevi güncelle' : 'Aile için yeni görev ekle'}</Text>
              </View>
              <TouchableOpacity onPress={() => setFormOpen(false)} style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)', alignItems: 'center', justifyContent: 'center' }}>
                <X size={18} color={textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ paddingHorizontal: 20 }} showsVerticalScrollIndicator={false}>
              <View style={{ height: 12 }} />

              {/* Title */}
              <Text style={[modalStyles.label, { color: textMuted }]}>Görev Başlığı</Text>
              <TextInput placeholder="Örn: Odanı topla" value={formTitle} onChangeText={setFormTitle} style={[modalStyles.input, { color: textPrimary, backgroundColor: isDark ? 'rgba(255,255,255,0.07)' : '#f8fafc', borderColor: isDark ? 'rgba(255,255,255,0.1)' : '#e2e8f0' }]} placeholderTextColor={textMuted} />

              {/* Assignee */}
              <Text style={[modalStyles.label, { color: textMuted, marginTop: 12 }]}>Sorumlu Kişi</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {familyMembers.map((member) => {
                  const isSel = formAssigneeId === member.id;
                  return (
                    <TouchableOpacity
                      key={member.id}
                      onPress={() => setFormAssigneeId(member.id)}
                      style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 14, borderWidth: 1.5, borderColor: isSel ? member.color : (isDark ? 'rgba(255,255,255,0.12)' : '#e2e8f0'), backgroundColor: isSel ? `${member.color}20` : 'transparent' }}
                    >
                      <Text style={{ fontSize: 12, fontWeight: '800', color: isSel ? member.color : textSecondary }}>{member.name}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Due Date */}
              <Text style={[modalStyles.label, { color: textMuted, marginTop: 12 }]}>Bitiş Tarihi (YYYY-AA-GG)</Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TextInput placeholder="YYYY-MM-DD" value={formDueDate} onChangeText={setFormDueDate} style={[modalStyles.input, { flex: 1, color: textPrimary, backgroundColor: isDark ? 'rgba(255,255,255,0.07)' : '#f8fafc', borderColor: isDark ? 'rgba(255,255,255,0.1)' : '#e2e8f0' }]} placeholderTextColor={textMuted} />
                <TouchableOpacity onPress={() => setFormDueDate(format(new Date(), 'yyyy-MM-dd'))} style={{ backgroundColor: isDark ? 'rgba(168,85,247,0.15)' : 'rgba(168,85,247,0.1)', paddingHorizontal: 12, borderRadius: 14, justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(168,85,247,0.25)' }}>
                  <Text style={{ color: '#a855f7', fontSize: 11, fontWeight: '800' }}>Bugün</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setFormDueDate(format(addDays(new Date(), 1), 'yyyy-MM-dd'))} style={{ backgroundColor: isDark ? 'rgba(6,182,212,0.15)' : 'rgba(6,182,212,0.1)', paddingHorizontal: 12, borderRadius: 14, justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(6,182,212,0.25)' }}>
                  <Text style={{ color: '#06b6d4', fontSize: 11, fontWeight: '800' }}>Yarın</Text>
                </TouchableOpacity>
              </View>

              {/* Recurring toggle */}
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 16, padding: 16, borderRadius: 18, backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)', borderWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)' }}>
                <View>
                  <Text style={{ color: textPrimary, fontWeight: '800', fontSize: 13 }}>Tekrarlı Alışkanlık</Text>
                  <Text style={{ color: textMuted, fontSize: 11, fontWeight: '600', marginTop: 2 }}>Düzenli periyotlarla tekrarlanan görev</Text>
                </View>
                <Switch value={formIsRecurring} onValueChange={setFormIsRecurring} trackColor={{ false: isDark ? '#334155' : '#cbd5e1', true: '#10b981' }} thumbColor={formIsRecurring ? 'white' : '#f4f3f4'} />
              </View>

              {/* Recurrence settings */}
              {formIsRecurring && (
                <View style={{ marginTop: 12, padding: 16, borderRadius: 18, backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)', borderWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }}>
                  <Text style={[modalStyles.label, { color: textMuted }]}>Tekrarlanma Sıklığı</Text>
                  <View style={{ flexDirection: 'row', backgroundColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.05)', padding: 3, borderRadius: 14, marginBottom: 12 }}>
                    {(['daily', 'weekly', 'monthly'] as const).map((type) => (
                      <TouchableOpacity
                        key={type}
                        onPress={() => setFormRecurrenceType(type)}
                        style={{ flex: 1, paddingVertical: 8, borderRadius: 11, backgroundColor: formRecurrenceType === type ? (isDark ? '#1e1e3f' : 'white') : 'transparent', alignItems: 'center' }}
                      >
                        <Text style={{ fontSize: 11, fontWeight: '800', color: formRecurrenceType === type ? '#a855f7' : textMuted }}>
                          {type === 'daily' ? 'Günlük' : type === 'weekly' ? 'Haftalık' : 'Aylık'}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  {formRecurrenceType === 'weekly' && (
                    <View style={{ marginBottom: 12 }}>
                      <Text style={[modalStyles.label, { color: textMuted }]}>Haftanın Günleri</Text>
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                        {WEEK_DAYS.map((day) => {
                          const isSel = formRecurrenceDays.includes(day.id);
                          return (
                            <TouchableOpacity
                              key={day.id}
                              onPress={() => setFormRecurrenceDays(prev => isSel ? prev.filter(x => x !== day.id) : [...prev, day.id])}
                              style={{ paddingHorizontal: 12, paddingVertical: 7, borderRadius: 11, borderWidth: 1.5, borderColor: isSel ? '#a855f7' : (isDark ? 'rgba(255,255,255,0.12)' : '#e2e8f0'), backgroundColor: isSel ? 'rgba(168,85,247,0.15)' : 'transparent' }}
                            >
                              <Text style={{ fontSize: 11, fontWeight: '800', color: isSel ? '#a855f7' : textMuted }}>{day.label}</Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    </View>
                  )}
                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={[modalStyles.label, { color: textMuted }]}>Bitiş Tarihi (Opsiyonel)</Text>
                      <TextInput placeholder="YYYY-MM-DD" value={formRecurrenceEndDate} onChangeText={setFormRecurrenceEndDate} style={[modalStyles.input, { color: textPrimary, backgroundColor: isDark ? 'rgba(255,255,255,0.07)' : '#f8fafc', borderColor: isDark ? 'rgba(255,255,255,0.1)' : '#e2e8f0' }]} placeholderTextColor={textMuted} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[modalStyles.label, { color: textMuted }]}>Tekrar Sayısı</Text>
                      <TextInput placeholder="Örn: 10" value={formTotalOccurrences} onChangeText={setFormTotalOccurrences} keyboardType="numeric" style={[modalStyles.input, { color: textPrimary, backgroundColor: isDark ? 'rgba(255,255,255,0.07)' : '#f8fafc', borderColor: isDark ? 'rgba(255,255,255,0.1)' : '#e2e8f0' }]} placeholderTextColor={textMuted} />
                    </View>
                  </View>
                </View>
              )}

              {/* Subtasks */}
              <Text style={[modalStyles.label, { color: textMuted, marginTop: 16 }]}>Alt Görevler</Text>
              <View style={{ gap: 8 }}>
                {formSubtasks.map((st, idx) => (
                  <View key={idx} style={{ flexDirection: 'row', gap: 8 }}>
                    <TextInput
                      placeholder={`Alt görev ${idx + 1}`}
                      value={st.title}
                      onChangeText={(text) => { const next = [...formSubtasks]; next[idx].title = text; setFormSubtasks(next); }}
                      style={[modalStyles.input, { flex: 1, color: textPrimary, backgroundColor: isDark ? 'rgba(255,255,255,0.07)' : '#f8fafc', borderColor: isDark ? 'rgba(255,255,255,0.1)' : '#e2e8f0' }]}
                      placeholderTextColor={textMuted}
                    />
                    <TouchableOpacity onPress={() => setFormSubtasks(prev => prev.filter((_, i) => i !== idx))} style={{ width: 48, height: 48, borderRadius: 14, backgroundColor: 'rgba(244,63,94,0.1)', borderWidth: 1, borderColor: 'rgba(244,63,94,0.2)', alignItems: 'center', justifyContent: 'center' }}>
                      <Trash size={16} color="#f43f5e" />
                    </TouchableOpacity>
                  </View>
                ))}
                <TouchableOpacity onPress={() => setFormSubtasks(prev => [...prev, { title: '' }])} style={{ borderWidth: 1.5, borderStyle: 'dashed', borderColor: isDark ? 'rgba(168,85,247,0.3)' : 'rgba(168,85,247,0.3)', borderRadius: 14, padding: 12, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 6 }}>
                  <Plus size={14} color="#a855f7" />
                  <Text style={{ color: '#a855f7', fontSize: 12, fontWeight: '800' }}>Alt Görev Ekle</Text>
                </TouchableOpacity>
              </View>
              <View style={{ height: 20 }} />
            </ScrollView>

            {/* Footer */}
            <View style={{ flexDirection: 'row', gap: 10, padding: 16, borderTopWidth: 1, borderTopColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }}>
              <TouchableOpacity onPress={() => setFormOpen(false)} style={{ flex: 1, paddingVertical: 14, borderRadius: 18, backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)', alignItems: 'center' }}>
                <Text style={{ color: textSecondary, fontWeight: '800', fontSize: 13 }}>İptal</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleSaveTask} activeOpacity={0.85} style={{ flex: 2, borderRadius: 18, overflow: 'hidden' }}>
                <LinearGradient colors={['#a855f7', '#ec4899']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ paddingVertical: 14, alignItems: 'center' }}>
                  <Text style={{ color: 'white', fontWeight: '900', fontSize: 14 }}>Kaydet</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </View>
      </Modal>

      {/* ── HABIT DETAIL MODAL ── */}
      {selectedHabit && (
        <Modal visible={isHabitDetailOpen} animationType="slide" transparent={true} onRequestClose={() => setIsHabitDetailOpen(false)}>
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' }}>
            <SafeAreaView style={{ backgroundColor: isDark ? '#0f0f1e' : '#ffffff', borderTopLeftRadius: 36, borderTopRightRadius: 36, maxHeight: '90%', paddingTop: 8 }}>
              <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.12)', alignSelf: 'center', marginBottom: 16 }} />

              {/* Header */}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)', marginBottom: 4 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: textPrimary, fontWeight: '900', fontSize: 18 }} numberOfLines={1}>{selectedHabit.title}</Text>
                  {getMember(selectedHabit.assigneeId) && (
                    <Text style={{ color: textMuted, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, marginTop: 2 }}>
                      Sorumlu: {getMember(selectedHabit.assigneeId)?.name}
                    </Text>
                  )}
                </View>
                <TouchableOpacity onPress={() => setIsHabitDetailOpen(false)} style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)', alignItems: 'center', justifyContent: 'center' }}>
                  <X size={18} color={textMuted} />
                </TouchableOpacity>
              </View>

              <ScrollView style={{ paddingHorizontal: 20 }} showsVerticalScrollIndicator={false}>
                {(() => {
                  const s = calculateHabitStats(selectedHabit);
                  return (
                    <View style={{ gap: 12, paddingTop: 8 }}>
                      {/* Stats top row */}
                      <View style={{ flexDirection: 'row', gap: 10 }}>
                        <LinearGradient colors={['#a855f7', '#7c3aed']} style={{ flex: 1, padding: 16, borderRadius: 20, alignItems: 'center' }}>
                          <TrendingUp size={20} color="white" />
                          <Text style={{ color: 'white', fontWeight: '900', fontSize: 24, marginTop: 8 }}>{s.score}%</Text>
                          <Text style={{ color: 'rgba(255,255,255,0.7)', fontWeight: '700', fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.8, marginTop: 3 }}>Alışkanlık Skoru</Text>
                        </LinearGradient>
                        <LinearGradient colors={['#f97316', '#ef4444']} style={{ flex: 1, padding: 16, borderRadius: 20, alignItems: 'center' }}>
                          <Flame size={20} color="white" />
                          <Text style={{ color: 'white', fontWeight: '900', fontSize: 24, marginTop: 8 }}>{s.streak}</Text>
                          <Text style={{ color: 'rgba(255,255,255,0.7)', fontWeight: '700', fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.8, marginTop: 3 }}>Mevcut Seri</Text>
                        </LinearGradient>
                      </View>

                      {/* Stats bottom row */}
                      <View style={{ flexDirection: 'row', gap: 10 }}>
                        <View style={{ flex: 1, padding: 14, borderRadius: 18, backgroundColor: isDark ? 'rgba(251,191,36,0.12)' : 'rgba(251,191,36,0.1)', borderWidth: 1.5, borderColor: 'rgba(251,191,36,0.25)', flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                          <Trophy size={18} color="#fbbf24" />
                          <View>
                            <Text style={{ color: textMuted, fontSize: 10, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 }}>En İyi Seri</Text>
                            <Text style={{ color: textPrimary, fontWeight: '900', fontSize: 16, marginTop: 2 }}>{s.bestStreak} Gün</Text>
                          </View>
                        </View>
                        <View style={{ flex: 1, padding: 14, borderRadius: 18, backgroundColor: isDark ? 'rgba(16,185,129,0.12)' : 'rgba(16,185,129,0.1)', borderWidth: 1.5, borderColor: 'rgba(16,185,129,0.25)', flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                          <Check size={18} color="#10b981" />
                          <View>
                            <Text style={{ color: textMuted, fontSize: 10, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 }}>Toplam</Text>
                            <Text style={{ color: textPrimary, fontWeight: '900', fontSize: 16, marginTop: 2 }}>{s.totalCompletions} Defa</Text>
                          </View>
                        </View>
                      </View>

                      {/* History (Last 28 days) */}
                      <View style={{ borderTopWidth: 1, borderTopColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)', paddingTop: 16, marginTop: 4 }}>
                        <Text style={{ color: textPrimary, fontWeight: '800', fontSize: 15, marginBottom: 14 }}>Tarihçe (Son 28 Gün)</Text>
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 5, justifyContent: 'space-between' }}>
                          {Array.from({ length: 28 }).map((_, i) => {
                            const d = subDays(new Date(), 27 - i);
                            const completed = isHabitCompletedOnDay(selectedHabit, d);
                            const isToday = isSameDay(d, new Date());
                            return (
                              <View key={d.toISOString()} style={{ width: (width - 72) / 7, alignItems: 'center' }}>
                                {i < 7 && (
                                  <Text style={{ fontSize: 9, fontWeight: '800', color: isToday ? '#a855f7' : textMuted, marginBottom: 3 }}>
                                    {format(d, 'EE', { locale: tr }).slice(0, 1)}
                                  </Text>
                                )}
                                <TouchableOpacity
                                  onPress={() => handleToggleHabitDay(selectedHabit, d)}
                                  style={{
                                    width: 26, height: 26, borderRadius: 8,
                                    backgroundColor: completed ? '#a855f7' : (isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'),
                                    alignItems: 'center', justifyContent: 'center',
                                    borderWidth: isToday && !completed ? 2 : 0,
                                    borderColor: '#a855f7',
                                  }}
                                >
                                  {completed && <Check size={11} color="white" strokeWidth={3.5} />}
                                </TouchableOpacity>
                              </View>
                            );
                          })}
                        </View>
                      </View>
                      <View style={{ height: 8 }} />
                    </View>
                  );
                })()}
              </ScrollView>

              {/* Footer */}
              <View style={{ flexDirection: 'row', gap: 10, padding: 16, borderTopWidth: 1, borderTopColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }}>
                <TouchableOpacity
                  onPress={() => { setIsHabitDetailOpen(false); handleDeleteTask(selectedHabit.id); }}
                  style={{ flex: 1, paddingVertical: 13, borderRadius: 18, backgroundColor: 'rgba(244,63,94,0.1)', alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 6, borderWidth: 1, borderColor: 'rgba(244,63,94,0.2)' }}
                >
                  <Trash2 size={14} color="#f43f5e" />
                  <Text style={{ color: '#f43f5e', fontWeight: '800', fontSize: 13 }}>Sil</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => { setIsHabitDetailOpen(false); handleOpenEditModal(selectedHabit); }}
                  style={{ flex: 1, paddingVertical: 13, borderRadius: 18, backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)', alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 6 }}
                >
                  <Edit2 size={14} color={textSecondary} />
                  <Text style={{ color: textSecondary, fontWeight: '800', fontSize: 13 }}>Düzenle</Text>
                </TouchableOpacity>
              </View>
            </SafeAreaView>
          </View>
        </Modal>
      )}
    </View>
  );

  // ── RENDER HELPERS ──
  function renderTaskRow(task: Task, idx: number, isCompleted: boolean) {
    const palette = CARD_PALETTES[idx % CARD_PALETTES.length];
    const assignee = getMember(task.assigneeId);
    const hasSubtasks = task.subtasks && task.subtasks.length > 0;
    const completedSubCount = task.subtasks ? task.subtasks.filter(st => st.completed).length : 0;

    return (
      <View
        key={task.id}
        style={{
          borderRadius: 20, overflow: 'hidden',
          borderWidth: 1.5,
          borderColor: isCompleted ? (isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)') : palette.border,
          backgroundColor: isCompleted ? (isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)') : palette.light,
          opacity: isCompleted ? 0.65 : 1,
        }}
      >
        {/* Color bar */}
        {!isCompleted && (
          <View style={{ height: 3, overflow: 'hidden' }}>
            <LinearGradient colors={palette.grad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ flex: 1 }} />
          </View>
        )}

        <View style={{ padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          {/* Checkbox */}
          <TouchableOpacity
            onPress={() => handleToggleTaskCompletion(task)}
            style={{
              width: 26, height: 26, borderRadius: 9, borderWidth: 2,
              borderColor: isCompleted ? '#10b981' : palette.grad[0],
              backgroundColor: isCompleted ? '#10b981' : 'transparent',
              alignItems: 'center', justifyContent: 'center',
            }}
          >
            {isCompleted && <Check size={13} color="white" strokeWidth={3} />}
          </TouchableOpacity>

          <View style={{ flex: 1 }}>
            <Text
              style={{ fontWeight: '700', fontSize: 13, color: isCompleted ? textMuted : textPrimary, textDecorationLine: isCompleted ? 'line-through' : 'none' }}
              numberOfLines={1}
            >
              {task.title}
            </Text>
            {hasSubtasks && !isCompleted && (
              <Text style={{ color: textMuted, fontSize: 10, fontWeight: '700', marginTop: 2 }}>
                Alt görev: {completedSubCount}/{task.subtasks?.length}
              </Text>
            )}
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            {assignee && (
              <View style={{ width: 24, height: 24, borderRadius: 8, backgroundColor: assignee.color, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ color: 'white', fontSize: 10, fontWeight: '900' }}>{assignee.name[0]}</Text>
              </View>
            )}
            {task.dueDate && !isCompleted && (
              <View style={{ backgroundColor: `${palette.grad[0]}20`, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 }}>
                <Text style={{ color: palette.text, fontSize: 10, fontWeight: '800' }}>{format(new Date(task.dueDate), 'd MMM', { locale: tr })}</Text>
              </View>
            )}
            {!isCompleted && (
              <View style={{ flexDirection: 'row', gap: 4 }}>
                <TouchableOpacity onPress={() => handleOpenEditModal(task)} style={{ width: 26, height: 26, borderRadius: 8, backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)', alignItems: 'center', justifyContent: 'center' }}>
                  <Edit2 size={11} color={palette.text} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleDeleteTask(task.id)} style={{ width: 26, height: 26, borderRadius: 8, backgroundColor: 'rgba(244,63,94,0.1)', alignItems: 'center', justifyContent: 'center' }}>
                  <Trash2 size={11} color="#f43f5e" />
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>

        {/* Subtasks */}
        {hasSubtasks && !isCompleted && (
          <View style={{ paddingHorizontal: 14, paddingBottom: 10, paddingTop: 0, borderTopWidth: 1, borderTopColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)', gap: 6, marginLeft: 36 }}>
            {task.subtasks?.map((st) => (
              <TouchableOpacity key={st.id} onPress={() => handleToggleSubtask(task, st.id)} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingTop: 6 }}>
                {st.completed
                  ? <CheckCircle2 size={15} color="#10b981" />
                  : <Circle size={15} color={textMuted} />}
                <Text style={{ fontSize: 12, fontWeight: '600', color: st.completed ? textMuted : textPrimary, textDecorationLine: st.completed ? 'line-through' : 'none', flex: 1 }}>
                  {st.title}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
    );
  }

  function renderModRow(mt: any) {
    const palette = MOD_PALETTES[mt.module] || CARD_PALETTES[0];
    const assignee = getMember(mt.assigneeId);
    const Icon = mt.icon;

    return (
      <View
        key={mt.id}
        style={{
          borderRadius: 20, overflow: 'hidden',
          borderWidth: 1.5,
          borderColor: mt.isCompleted ? (isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)') : palette.border,
          backgroundColor: mt.isCompleted ? (isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)') : palette.light,
          opacity: mt.isCompleted ? 0.65 : 1,
        }}
      >
        {!mt.isCompleted && (
          <View style={{ height: 3, overflow: 'hidden' }}>
            <LinearGradient colors={palette.grad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ flex: 1 }} />
          </View>
        )}
        <View style={{ padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <TouchableOpacity
            onPress={() => mt.onToggle(!mt.isCompleted)}
            style={{ width: 26, height: 26, borderRadius: 9, borderWidth: 2, borderColor: mt.isCompleted ? '#10b981' : palette.grad[0], backgroundColor: mt.isCompleted ? '#10b981' : 'transparent', alignItems: 'center', justifyContent: 'center' }}
          >
            {mt.isCompleted && <Check size={13} color="white" strokeWidth={3} />}
          </TouchableOpacity>

          <Text style={{ flex: 1, fontWeight: '700', fontSize: 13, color: mt.isCompleted ? textMuted : textPrimary, textDecorationLine: mt.isCompleted ? 'line-through' : 'none' }} numberOfLines={1}>
            {mt.title}
          </Text>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <View style={{ backgroundColor: `${palette.grad[0]}18`, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 8, flexDirection: 'row', alignItems: 'center', gap: 3, borderWidth: 1, borderColor: palette.border }}>
              <Icon size={9} color={palette.text} />
              <Text style={{ color: palette.text, fontSize: 9, fontWeight: '800' }}>{mt.module}</Text>
            </View>
            {assignee && (
              <View style={{ width: 24, height: 24, borderRadius: 8, backgroundColor: assignee.color, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ color: 'white', fontSize: 10, fontWeight: '900' }}>{assignee.name[0]}</Text>
              </View>
            )}
          </View>
        </View>
      </View>
    );
  }
}

// ── PREMIUM ACCORDION ──
function PremiumAccordion({ emoji, title, count, isOpen, onToggle, gradColors, isDark, textPrimary, textMuted, children }: any) {
  return (
    <View style={{
      borderRadius: 24, overflow: 'hidden',
      borderWidth: 1.5,
      borderColor: isDark ? `${gradColors[0]}25` : `${gradColors[0]}20`,
      backgroundColor: isDark ? `${gradColors[0]}08` : `${gradColors[0]}05`,
    }}>
      {/* Color top bar */}
      <View style={{ height: 3, overflow: 'hidden' }}>
        <LinearGradient colors={gradColors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ flex: 1 }} />
      </View>

      <TouchableOpacity onPress={onToggle} activeOpacity={0.8} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <LinearGradient
            colors={gradColors}
            style={{ width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center', shadowColor: gradColors[0], shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.4, shadowRadius: 6, elevation: 4 }}
          >
            <Text style={{ fontSize: 18 }}>{emoji}</Text>
          </LinearGradient>
          <View>
            <Text style={{ color: textPrimary, fontWeight: '900', fontSize: 15 }}>{title}</Text>
            <Text style={{ color: textMuted, fontSize: 11, fontWeight: '700', marginTop: 1 }}>{count} görev</Text>
          </View>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {count > 0 && (
            <View style={{ backgroundColor: `${gradColors[0]}20`, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, borderWidth: 1, borderColor: `${gradColors[0]}30` }}>
              <Text style={{ color: gradColors[0], fontWeight: '900', fontSize: 12 }}>{count}</Text>
            </View>
          )}
          {isOpen ? <ChevronUp size={18} color={textMuted} /> : <ChevronDown size={18} color={textMuted} />}
        </View>
      </TouchableOpacity>

      {isOpen && (
        <View style={{ paddingHorizontal: 14, paddingBottom: 14, paddingTop: 2, borderTopWidth: 1, borderTopColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }}>
          {children}
        </View>
      )}
    </View>
  );
}

function EmptyState({ text, isDark, textMuted }: any) {
  return (
    <Text style={{ color: textMuted, fontSize: 12, fontStyle: 'italic', textAlign: 'center', padding: 12 }}>{text}</Text>
  );
}

const modalStyles = StyleSheet.create({
  label: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1.5,
    borderRadius: 16,
    height: 48,
    paddingHorizontal: 16,
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 0,
  },
});
