import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Modal, TextInput } from 'react-native';
import { useColorScheme } from 'nativewind';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useEffect, useState, useMemo } from 'react';
import { onGoalsUpdate, addGoal, updateGoal, deleteGoal } from '../lib/dataService';
import { Goal, FamilyMember } from '../lib/data';
import { Target, ChevronLeft, Plus, Check, MoreVertical, Sparkles, Map, User, BookOpen, PlayCircle, AlignLeft, ChevronRight, CheckCircle2, Link2, Layers } from 'lucide-react-native';
import { useRouter, Stack } from 'expo-router';
import { useAuth } from '../context/auth-context';
import { LinearGradient } from 'expo-linear-gradient';

const goalThemes = [
  {
    id: 'blue',
    iconBgLight: 'rgba(219, 234, 254, 0.5)',
    iconBgDark: 'rgba(59, 130, 246, 0.2)',
    titleLight: '#1e293b',
    titleDark: '#dbeafe',
    descLight: '#64748b',
    descDark: 'rgba(191, 219, 254, 0.6)',
    progressBgLight: 'rgba(226, 232, 240, 0.5)',
    progressBgDark: 'rgba(23, 37, 84, 0.5)',
    progressFill: '#3b82f6',
    iconColor: '#3b82f6',
    lightGradient: ['#f0f9ff', '#e0f2fe'],
    darkGradient: ['#172554', '#1e1b4b'],
  },
  {
    id: 'emerald',
    iconBgLight: 'rgba(209, 250, 229, 0.5)',
    iconBgDark: 'rgba(16, 185, 129, 0.2)',
    titleLight: '#1e293b',
    titleDark: '#d1fae5',
    descLight: '#64748b',
    descDark: 'rgba(167, 243, 208, 0.6)',
    progressBgLight: 'rgba(226, 232, 240, 0.5)',
    progressBgDark: 'rgba(2, 44, 34, 0.5)',
    progressFill: '#10b981',
    iconColor: '#10b981',
    lightGradient: ['#ecfdf5', '#d1fae5'],
    darkGradient: ['#022c22', '#064e3b'],
  },
  {
    id: 'violet',
    iconBgLight: 'rgba(237, 233, 254, 0.5)',
    iconBgDark: 'rgba(139, 92, 246, 0.2)',
    titleLight: '#1e293b',
    titleDark: '#ede9fe',
    descLight: '#64748b',
    descDark: 'rgba(221, 214, 254, 0.6)',
    progressBgLight: 'rgba(226, 232, 240, 0.5)',
    progressBgDark: 'rgba(46, 16, 101, 0.5)',
    progressFill: '#8b5cf6',
    iconColor: '#8b5cf6',
    lightGradient: ['#f5f3ff', '#ede9fe'],
    darkGradient: ['#1e1b4b', '#2e1065'],
  },
  {
    id: 'amber',
    iconBgLight: 'rgba(254, 243, 199, 0.5)',
    iconBgDark: 'rgba(245, 158, 11, 0.2)',
    titleLight: '#1e293b',
    titleDark: '#fef3c7',
    descLight: '#64748b',
    descDark: 'rgba(253, 230, 138, 0.6)',
    progressBgLight: 'rgba(226, 232, 240, 0.5)',
    progressBgDark: 'rgba(69, 26, 3, 0.5)',
    progressFill: '#f59e0b',
    iconColor: '#f59e0b',
    lightGradient: ['#fffbeb', '#fef3c7'],
    darkGradient: ['#451a03', '#78350f'],
  },
  {
    id: 'rose',
    iconBgLight: 'rgba(255, 228, 230, 0.5)',
    iconBgDark: 'rgba(244, 63, 94, 0.2)',
    titleLight: '#1e293b',
    titleDark: '#ffe4e6',
    descLight: '#64748b',
    descDark: 'rgba(254, 205, 211, 0.6)',
    progressBgLight: 'rgba(226, 232, 240, 0.5)',
    progressBgDark: 'rgba(76, 5, 25, 0.5)',
    progressFill: '#f43f5e',
    iconColor: '#f43f5e',
    lightGradient: ['#fff5f5', '#ffe4e6'],
    darkGradient: ['#4c0519', '#881337'],
  },
];

export default function GoalsScreen() {
  const { user, familyMembers } = useAuth();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMemberId, setSelectedMemberId] = useState<string | 'all'>('all');
  
  // Form modal states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  
  // Form fields
  const [formType, setFormType] = useState<'book' | 'video'>('book');
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formAssigneeId, setFormAssigneeId] = useState('');
  const [formTotalUnits, setFormTotalUnits] = useState(100);
  const [formUnitName, setFormUnitName] = useState('sayfa');
  const [formSectionCount, setFormSectionCount] = useState(1);
  const [formSections, setFormSections] = useState<{ title: string }[]>([{ title: 'Bölüm 1' }]);
  const [formVideoUrl, setFormVideoUrl] = useState('');

  const router = useRouter();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  useEffect(() => {
    let unsubscribe: any;
    try {
      unsubscribe = onGoalsUpdate((data: Goal[]) => {
        setGoals(data);
        setLoading(false);
      });
    } catch (e) {
      console.log('Error fetching goals:', e);
      setLoading(false);
    }

    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, []);

  // Set form fields on edit
  useEffect(() => {
    if (editingGoal) {
      const isVideo = editingGoal.platform === 'YouTube';
      setFormType(isVideo ? 'video' : 'book');
      setFormTitle(editingGoal.title);
      setFormDescription(editingGoal.description || '');
      setFormAssigneeId(editingGoal.assigneeId);
      setFormTotalUnits(editingGoal.totalUnits);
      setFormUnitName(editingGoal.unitName);
      setFormSectionCount(editingGoal.sectionCount || 1);
      setFormSections(editingGoal.sections ? editingGoal.sections.map(s => ({ title: s.title })) : [{ title: 'Bölüm 1' }]);
      setFormVideoUrl(editingGoal.videoUrl || '');
    } else {
      setFormType('book');
      setFormTitle('');
      setFormDescription('');
      setFormAssigneeId(familyMembers && familyMembers.length > 0 ? familyMembers[0].id : '');
      setFormTotalUnits(100);
      setFormUnitName('sayfa');
      setFormSectionCount(1);
      setFormSections([{ title: 'Bölüm 1' }]);
      setFormVideoUrl('');
    }
  }, [editingGoal, isFormOpen, familyMembers]);

  const handleTypeChange = (type: 'book' | 'video') => {
    setFormType(type);
    if (type === 'video') {
      setFormUnitName('video');
      setFormSectionCount(1);
      setFormSections([{ title: formTitle || 'Video Listesi' }]);
    } else {
      setFormUnitName('sayfa');
      setFormSectionCount(1);
      setFormSections([{ title: 'Bölüm 1' }]);
    }
  };

  const handleSectionCountChange = (text: string) => {
    const count = parseInt(text) || 0;
    setFormSectionCount(count);
    setFormSections(prev => {
      const next = [...prev];
      if (next.length < count) {
        for (let i = next.length; i < count; i++) {
          next.push({ title: `Bölüm ${i + 1}` });
        }
      } else if (next.length > count) {
        next.splice(count);
      }
      return next;
    });
  };

  const handleCreateHatimGoal = async (targetMemberId?: string) => {
    const assigneeId = targetMemberId || (selectedMemberId !== 'all' ? selectedMemberId : (familyMembers && familyMembers.length > 0 ? familyMembers[0].id : ''));
    if (!assigneeId) {
      Alert.alert('Hata', 'Lütfen hatim yapacak aile üyesini seçin.');
      return;
    }
    const assignee = familyMembers.find(m => m.id === assigneeId);

    const sectionsData = Array.from({ length: 30 }, (_, idx) => ({
      id: Date.now().toString() + idx,
      title: `${idx + 1}. Cüz`,
      order: idx + 1,
      sectionTotalUnits: 20,
      completedUnits: 0,
      status: 'unlocked' as const,
    }));

    const goalData = {
      title: '📖 Kutsal Kuran-ı Kerim Hatmi',
      description: '30 Cüzlük (Her Cüz 20 sayfa, Toplam 600 sayfa) Kuran-ı Kerim Hatmi Yol Haritası.',
      assigneeId,
      sections: sectionsData,
      totalUnits: 600,
      unitName: 'Sayfa',
      sectionCount: 30,
      status: 'in-progress' as const,
    };

    try {
      await addGoal(goalData as any);
      Alert.alert('Hayırlı Olsun ✨ 📖', `${assignee?.name || 'Seçilen üye'} için 30 Cüz (600 Sayfa) Kuran-ı Kerim Hatmi yol haritası başarıyla oluşturuldu!`);
    } catch (e: any) {
      Alert.alert('Hata', 'Hatim yol haritası oluşturulamadı: ' + e.message);
    }
  };

  const handleApplyHatimTemplate = () => {
    setFormType('book');
    setFormTitle('📖 Kutsal Kuran-ı Kerim Hatmi');
    setFormDescription('30 Cüz (Her Cüz 20 sayfa, Toplam 600 sayfa) Kuran-ı Kerim Hatmi Yol Haritası.');
    setFormTotalUnits(600);
    setFormUnitName('Sayfa');
    setFormSectionCount(30);
    setFormSections(Array.from({ length: 30 }, (_, i) => ({ title: `${i + 1}. Cüz` })));
  };

  const handleSaveGoal = async () => {
    if (!formTitle.trim()) {
      Alert.alert('Hata', 'Lütfen bir başlık girin.');
      return;
    }
    if (!formAssigneeId) {
      Alert.alert('Hata', 'Lütfen sorumlu aile üyesini seçin.');
      return;
    }
    if (formType === 'video' && !formVideoUrl.trim()) {
      Alert.alert('Hata', 'Lütfen video/playlist linki girin.');
      return;
    }

    const unitsPerSection = formSectionCount > 0 ? Math.floor(formTotalUnits / formSectionCount) : 0;
    const remainderUnits = formSectionCount > 0 ? formTotalUnits % formSectionCount : 0;

    const sectionsData = formSections.map((section, idx) => {
      const existingSec = editingGoal && editingGoal.sections && editingGoal.sections[idx];
      return {
        id: existingSec ? existingSec.id : (Date.now().toString() + idx),
        title: section.title.trim() || `Bölüm ${idx + 1}`,
        order: idx + 1,
        sectionTotalUnits: unitsPerSection + (idx < remainderUnits ? 1 : 0),
        completedUnits: existingSec ? existingSec.completedUnits : 0,
        status: existingSec ? existingSec.status : 'unlocked' as 'unlocked' | 'completed',
      };
    });

    const goalData = {
      title: formTitle,
      description: formDescription,
      assigneeId: formAssigneeId,
      sections: sectionsData,
      totalUnits: formTotalUnits,
      unitName: formUnitName,
      sectionCount: formSectionCount,
      platform: formType === 'video' ? 'YouTube' as const : undefined,
      videoUrl: formType === 'video' ? formVideoUrl : undefined,
    };

    try {
      if (editingGoal) {
        await updateGoal(editingGoal.id, goalData as any);
        Alert.alert('Başarılı', 'Yol haritası güncellendi.');
      } else {
        await addGoal(goalData as any);
        Alert.alert('Başarılı', 'Yeni yol haritası oluşturuldu.');
      }
      setIsFormOpen(false);
      setEditingGoal(null);
    } catch (e: any) {
      Alert.alert('Hata', 'Kayıt sırasında hata oluştu: ' + e.message);
    }
  };

  const handleOpenOptions = (goal: Goal) => {
    Alert.alert(
      'Hedef Seçenekleri',
      `"${goal.title}" hedefini düzenlemek veya silmek mi istiyorsunuz?`,
      [
        {
          text: 'Düzenle',
          onPress: () => {
            setEditingGoal(goal);
            setIsFormOpen(true);
          }
        },
        {
          text: 'Sil',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Silme Onayı',
              `"${goal.title}" hedefini kalıcı olarak silmek istediğinize emin misiniz?`,
              [
                { text: 'İptal', style: 'cancel' },
                {
                  text: 'Evet, Sil',
                  style: 'destructive',
                  onPress: async () => {
                    try {
                      await deleteGoal(goal.id);
                    } catch (e: any) {
                      Alert.alert('Hata', 'Silme başarısız: ' + e.message);
                    }
                  }
                }
              ]
            );
          }
        },
        { text: 'İptal', style: 'cancel' }
      ]
    );
  };

  const calculateOverallProgress = (goal: Goal) => {
    if (!goal.totalUnits || goal.totalUnits === 0) return 0;
    const totalCompletedUnits = goal.sections ? goal.sections.reduce((acc, section) => acc + (section.completedUnits || 0), 0) : 0;
    return (totalCompletedUnits / goal.totalUnits) * 100;
  };

  const getNextStepTitle = (goal: Goal) => {
    const isVideoGoal = goal.platform === 'YouTube';
    const totalCompletedUnits = goal.sections ? goal.sections.reduce((acc, section) => acc + (section.completedUnits || 0), 0) : 0;
    
    if (totalCompletedUnits >= goal.totalUnits) return "Tüm hedefler tamamlandı!";
    if (isVideoGoal) return `Sıradaki: Video ${totalCompletedUnits + 1}`;
    
    if (goal.sections) {
      const sorted = [...goal.sections].sort((a, b) => a.order - b.order);
      for (const section of sorted) {
        if (section.status !== 'completed') return `${section.title}`;
      }
    }
    return "Tüm hedefler tamamlandı!";
  };

  const filteredGoals = useMemo(() => {
    if (selectedMemberId === 'all') return goals;
    return goals.filter(goal => goal.assigneeId === selectedMemberId);
  }, [goals, selectedMemberId]);

  if (loading) {
    return (
      <SafeAreaView className="flex-1 justify-center items-center bg-slate-50 dark:bg-slate-950">
        <ActivityIndicator size="large" color="#6366f1" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-slate-50 dark:bg-slate-950" edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />
      
      {/* HEADER */}
      <View className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex-row justify-between items-center">
        <TouchableOpacity onPress={() => router.back()} className="w-10 h-10 items-center justify-center bg-slate-100 dark:bg-slate-800 rounded-full">
           <ChevronLeft size={24} color={isDark ? '#94a3b8' : '#64748b'} />
        </TouchableOpacity>
        <View className="items-center">
          <Text className="text-xl font-black text-slate-900 dark:text-white">Yol Haritaları</Text>
          <Text className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">HEDEFLER VE GELİŞİM</Text>
        </View>
        <TouchableOpacity 
          onPress={() => { setEditingGoal(null); setIsFormOpen(true); }} 
          className="bg-indigo-600 w-10 h-10 rounded-full items-center justify-center shadow-md shadow-indigo-500/20"
        >
          <Plus size={24} color="white" />
        </TouchableOpacity>
      </View>

      {/* STORY-LIKE AVATARS FILTER */}
      <View className="bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800/50 py-3 px-4">
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="flex-row items-center gap-4">
          {/* Tümü Avatar */}
          <TouchableOpacity 
            onPress={() => setSelectedMemberId('all')}
            className="flex-col items-center gap-1"
          >
            <View className={`w-14 h-14 rounded-full flex items-center justify-center shadow-sm ${
              selectedMemberId === 'all'
                ? 'bg-indigo-50 border-[3px] border-indigo-500 dark:bg-indigo-950/40'
                : 'bg-slate-50 border border-slate-200 dark:bg-slate-800 dark:border-slate-700'
            }`}>
              <Map size={22} color={selectedMemberId === 'all' ? '#6366f1' : '#94a3b8'} />
            </View>
            <Text className={`text-[10px] font-bold tracking-tight w-16 text-center ${
              selectedMemberId === 'all' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'
            }`}>
              Tümü
            </Text>
          </TouchableOpacity>

          {/* Members */}
          {familyMembers && familyMembers.map((member) => {
            const isSelected = selectedMemberId === member.id;
            return (
              <TouchableOpacity
                key={member.id}
                onPress={() => setSelectedMemberId(member.id)}
                className="flex-col items-center gap-1"
              >
                <View 
                  className={`w-14 h-14 rounded-full flex items-center justify-center shadow-sm ${
                    isSelected ? 'border-[3px] border-indigo-500 scale-105' : 'border border-slate-100 dark:border-slate-850'
                  }`}
                  style={{ backgroundColor: member.color }}
                >
                  <Text className="text-white text-lg font-black">{member.name.charAt(0)}</Text>
                </View>
                <Text className={`text-[10px] font-bold tracking-tight w-16 text-center truncate ${
                  isSelected ? 'text-slate-900 dark:text-white' : 'text-slate-400'
                }`}>
                  {member.name.split(' ')[0]}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* CONTENT LIST */}
      <ScrollView contentContainerClassName="p-4 pb-8" showsVerticalScrollIndicator={false}>

        {/* ── KURAN HATMI HIZLI OLUŞTUR BANNER ── */}
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => handleCreateHatimGoal()}
          className="mb-5 rounded-2xl bg-white dark:bg-slate-900 border-l-4 border-l-emerald-500 border border-slate-200/80 dark:border-slate-800 p-4 shadow-sm"
        >
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center gap-3.5 flex-1 pr-2">
              <View className="w-11 h-11 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200/60 dark:border-emerald-800/40 items-center justify-center">
                <BookOpen size={22} color={isDark ? '#34d399' : '#059669'} />
              </View>
              <View className="flex-1">
                <View className="flex-row items-center gap-2 mb-0.5">
                  <Text className="text-xs font-black text-emerald-600 dark:text-emerald-400 tracking-wider uppercase">📖 KURAN HATMİ</Text>
                  <View className="bg-amber-100 dark:bg-amber-950/60 border border-amber-300/40 px-2 py-0.5 rounded-md">
                    <Text className="text-[9px] font-black text-amber-700 dark:text-amber-300">⭐ 30 CÜZ • 600 SAYFA</Text>
                  </View>
                </View>
                <Text className="text-base font-extrabold text-slate-900 dark:text-white">
                  Kutsal Kuran-ı Kerim Hatmi
                </Text>
                <Text className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-0.5" numberOfLines={1}>
                  Sayfa sayfa okuma ve ailece cüz hatim takibi
                </Text>
              </View>
            </View>

            <View className="bg-emerald-600 dark:bg-emerald-500 px-3.5 py-2 rounded-xl flex-row items-center gap-1 shadow-sm">
              <Text className="text-white font-bold text-xs">Başlat</Text>
              <ChevronRight size={14} color="white" />
            </View>
          </View>
        </TouchableOpacity>

        {filteredGoals.length === 0 ? (
          <View className="items-center justify-center py-16 bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 mt-4">
            <View className="w-16 h-16 bg-slate-50 dark:bg-slate-800 rounded-2xl items-center justify-center mb-3">
              <Target size={32} color="#cbd5e1" />
            </View>
            <Text className="text-slate-800 dark:text-slate-200 text-base font-bold">Hedef Bulunamadı</Text>
            <Text className="text-slate-400 text-xs mt-1 text-center px-6 font-medium">Bu filtreye uygun bir hedef bulunmuyor. Yeni bir hedef oluşturarak başlayabilirsiniz.</Text>
            <TouchableOpacity 
              onPress={() => { setEditingGoal(null); setIsFormOpen(true); }}
              className="mt-5 bg-indigo-600 py-2.5 px-5 rounded-xl shadow-sm"
            >
              <Text className="text-white font-bold text-xs">İlk Hedefi Oluştur</Text>
            </TouchableOpacity>
          </View>
        ) : (
          filteredGoals.map((goal, idx) => {
            const isHatmiGoal = goal.unitName === 'Cüz' || goal.unitName === 'Sayfa' || (goal.title && (goal.title.toLowerCase().includes('hatm') || goal.title.toLowerCase().includes('kuran')));
            const assignee = familyMembers.find(m => m.id === goal.assigneeId);
            const isVideoGoal = goal.platform === 'YouTube';
            const totalCompletedUnits = goal.sections ? goal.sections.reduce((acc, s) => acc + (s.completedUnits || 0), 0) : 0;
            const totalGoalUnits = isHatmiGoal ? 600 : (goal.totalUnits || 1);
            const progress = Math.min(100, Math.max(0, (totalCompletedUnits / totalGoalUnits) * 100));
            const totalSections = goal.sections ? goal.sections.length : 0;
            const completedSections = goal.sections ? goal.sections.filter(s => s.status === 'completed').length : 0;
            
            const completedSectionsCount = goal.sections ? goal.sections.filter(s => s.status === 'completed' || (isHatmiGoal ? (s.completedUnits || 0) >= 20 : (s.completedUnits || 0) >= (s.sectionTotalUnits || 1))).length : 0;
            const currentJuzNum = Math.min(30, Math.floor(totalCompletedUnits / 20) + 1);
            const currentJuzPage = totalCompletedUnits % 20;

            const accentBorderColor = isHatmiGoal ? 'border-l-emerald-500' : isVideoGoal ? 'border-l-rose-500' : 'border-l-indigo-500';
            const accentTextColor = isHatmiGoal ? 'text-emerald-600 dark:text-emerald-400' : isVideoGoal ? 'text-rose-600 dark:text-rose-400' : 'text-indigo-600 dark:text-indigo-400';
            const accentBgColor = isHatmiGoal ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200/60 dark:border-emerald-800/40' : isVideoGoal ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-200/60 dark:border-rose-800/40' : 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200/60 dark:border-indigo-800/40';
            const progressFillColor = isHatmiGoal ? 'bg-emerald-500' : isVideoGoal ? 'bg-rose-500' : 'bg-indigo-600';

            return (
              <TouchableOpacity 
                key={goal.id} 
                activeOpacity={0.9}
                onPress={() => router.push({ pathname: '/goal-detail', params: { id: goal.id } })}
                className={`mb-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 border-l-4 ${accentBorderColor} p-5 shadow-sm`}
              >
                {/* Top Header Row */}
                <View className="flex-row justify-between items-center mb-3">
                  <View className="flex-row items-center gap-2 flex-wrap flex-1 pr-2">
                    <View className={`px-2.5 py-1 rounded-lg border flex-row items-center gap-1.5 ${accentBgColor}`}>
                      {isHatmiGoal ? (
                        <BookOpen size={13} color={isDark ? '#34d399' : '#059669'} />
                      ) : isVideoGoal ? (
                        <PlayCircle size={13} color={isDark ? '#fb7185' : '#e11d48'} />
                      ) : (
                        <Target size={13} color={isDark ? '#818cf8' : '#4f46e5'} />
                      )}
                      <Text className={`text-[10px] font-black tracking-wider uppercase ${accentTextColor}`}>
                        {isHatmiGoal ? 'KURAN HATMİ' : isVideoGoal ? 'VİDEO SERİSİ' : 'YOL HARİTASI'}
                      </Text>
                    </View>

                    {assignee && (
                      <View className="bg-slate-100 dark:bg-slate-800 border border-slate-200/70 dark:border-slate-700/70 px-2.5 py-1 rounded-lg flex-row items-center gap-1.5">
                        <View 
                          className="w-3.5 h-3.5 rounded-full items-center justify-center" 
                          style={{ backgroundColor: assignee.color }}
                        >
                          <Text className="text-white text-[8px] font-black">{assignee.name.charAt(0)}</Text>
                        </View>
                        <Text className="text-slate-700 dark:text-slate-300 text-xs font-bold">{assignee.name}</Text>
                      </View>
                    )}
                  </View>

                  <TouchableOpacity 
                    onPress={() => handleOpenOptions(goal)}
                    className="w-8 h-8 items-center justify-center rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60"
                  >
                    <MoreVertical size={16} color={isDark ? '#cbd5e1' : '#64748b'} />
                  </TouchableOpacity>
                </View>

                {/* Title & Description */}
                <View className="mb-3">
                  <Text className="text-lg font-black text-slate-900 dark:text-white leading-snug" numberOfLines={1}>
                    {goal.title}
                  </Text>
                  {goal.description ? (
                    <Text className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed font-medium" numberOfLines={2}>
                      {goal.description}
                    </Text>
                  ) : null}
                </View>

                {/* Next Step Banner Row */}
                <View className="bg-slate-50 dark:bg-slate-950/80 border border-slate-200/60 dark:border-slate-800/60 rounded-xl p-3 mb-3 flex-row items-center justify-between gap-2">
                  <View className="flex-row items-center gap-2 flex-1">
                    <Sparkles size={14} color="#f59e0b" />
                    <Text className="text-xs font-bold text-slate-700 dark:text-slate-300 truncate" numberOfLines={1}>
                      <Text className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider">SIRADAKİ: </Text>
                      {isHatmiGoal 
                        ? `${currentJuzNum}. Cüz (${currentJuzPage} / 20 Sayfa)`
                        : getNextStepTitle(goal)
                      }
                    </Text>
                  </View>
                  {isHatmiGoal && (
                    <Text className="text-[10px] font-black text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950 px-2 py-0.5 rounded-md border border-emerald-300/40">
                      600 SAYFA
                    </Text>
                  )}
                </View>

                {/* Metric & Progress Row */}
                <View className="flex-row justify-between items-end mb-2">
                  <View className="flex-row items-baseline gap-1.5">
                    <Text className={`text-2xl font-black ${accentTextColor}`}>
                      %{Math.round(progress)}
                    </Text>
                    <Text className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">TAMAMLANDI</Text>
                  </View>

                  <Text className="text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700">
                    {isHatmiGoal 
                      ? `${totalCompletedUnits} / 600 Sayfa`
                      : isVideoGoal 
                        ? `${totalCompletedUnits} / ${goal.totalUnits} Video`
                        : `${completedSectionsCount} / ${totalSections} Bölüm`
                    }
                  </Text>
                </View>

                {/* Sleek Slim Progress Bar */}
                <View className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  <View 
                    className={`h-full rounded-full ${progressFillColor}`}
                    style={{ width: `${progress}%` }}
                  />
                </View>

                {/* Tamamlanan Cüzler / Bölümler Şeridi */}
                <View className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800/80 flex-row items-center justify-between">
                  <View className="flex-row items-center gap-1.5">
                    <CheckCircle2 size={14} color={isDark ? '#34d399' : '#059669'} />
                    <Text className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      {isHatmiGoal 
                        ? `${completedSectionsCount} / 30 Cüz Tamamlandı`
                        : isVideoGoal
                          ? `${totalCompletedUnits} / ${goal.totalUnits} Video İzlendi`
                          : `${completedSectionsCount} / ${totalSections} Bölüm Bitti`
                      }
                    </Text>
                  </View>
                  <Text className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                    {isHatmiGoal 
                      ? `${30 - completedSectionsCount} CÜZ KALDI`
                      : isVideoGoal
                        ? `${goal.totalUnits - totalCompletedUnits} VİDEO KALDI`
                        : `${totalSections - completedSectionsCount} BÖLÜM KALDI`
                    }
                  </Text>
                </View>

                {/* Küçük Bölüm / Cüz Zinciri Görünümü (Section Chain Strip) */}
                <View className="mt-2.5 pt-2 border-t border-slate-100/60 dark:border-slate-800/50">
                  <View className="flex-row items-center gap-1 flex-wrap">
                    {Array.from({ length: isHatmiGoal ? 30 : Math.max(1, totalSections) }).map((_, secIdx) => {
                      const isSecDone = isHatmiGoal 
                        ? (goal.sections && goal.sections[secIdx] ? (goal.sections[secIdx].completedUnits || 0) >= 20 : secIdx < completedSectionsCount)
                        : (goal.sections && goal.sections[secIdx] ? goal.sections[secIdx].status === 'completed' : secIdx < completedSectionsCount);
                      
                      const isCurrentSec = !isSecDone && (isHatmiGoal ? secIdx === Math.min(29, completedSectionsCount) : secIdx === completedSectionsCount);

                      return (
                        <View 
                          key={secIdx} 
                          className={`h-2 rounded-full ${
                            isHatmiGoal 
                              ? (isSecDone 
                                  ? 'bg-emerald-500 flex-1 min-w-[7px]' 
                                  : isCurrentSec 
                                    ? 'bg-amber-400 flex-1 min-w-[7px] border border-amber-500' 
                                    : 'bg-slate-200 dark:bg-slate-800 flex-1 min-w-[7px]')
                              : (isSecDone 
                                  ? `${progressFillColor} flex-1 min-w-[14px]` 
                                  : isCurrentSec 
                                    ? 'bg-amber-400 flex-1 min-w-[14px] border border-amber-500' 
                                    : 'bg-slate-200 dark:bg-slate-800 flex-1 min-w-[14px]')
                          }`}
                        />
                      );
                    })}
                  </View>
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>

      {/* CREATE / EDIT GOAL INLINE MODAL */}
      <Modal
        visible={isFormOpen}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsFormOpen(false)}
      >
        <View className="flex-1 justify-end bg-black/50">
          <View className="bg-white dark:bg-slate-900 rounded-t-[2.5rem] h-[85%] px-5 py-6">
            {/* Modal Header */}
            <View className="flex-row justify-between items-center mb-5 pb-3 border-b border-slate-100 dark:border-slate-800">
              <TouchableOpacity onPress={() => setIsFormOpen(false)} className="py-1 px-3 bg-slate-100 dark:bg-slate-800 rounded-full">
                <Text className="text-slate-500 dark:text-slate-450 font-bold text-sm">Vazgeç</Text>
              </TouchableOpacity>
              <Text className="text-lg font-black text-slate-900 dark:text-white">
                {editingGoal ? 'Yol Haritasını Düzenle' : 'Yeni Yol Haritası'}
              </Text>
              <TouchableOpacity onPress={handleSaveGoal} className="py-1 px-4 bg-indigo-600 rounded-full">
                <Text className="text-white font-bold text-sm">Kaydet</Text>
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerClassName="pb-10">
              {/* Type Tabs */}
              <View className="flex-row bg-slate-100 dark:bg-slate-800 p-1.5 rounded-2xl mb-5">
                <TouchableOpacity 
                  onPress={() => handleTypeChange('book')}
                  className={`flex-1 flex-row items-center justify-center py-3 rounded-xl gap-2 ${
                    formType === 'book' ? 'bg-white dark:bg-slate-900 shadow-sm' : ''
                  }`}
                >
                  <BookOpen size={18} color={formType === 'book' ? '#6366f1' : '#94a3b8'} />
                  <Text className={`text-sm font-bold ${
                    formType === 'book' ? 'text-slate-950 dark:text-white' : 'text-slate-400'
                  }`}>
                    Kitap / Döküman
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  onPress={() => handleTypeChange('video')}
                  className={`flex-1 flex-row items-center justify-center py-3 rounded-xl gap-2 ${
                    formType === 'video' ? 'bg-white dark:bg-slate-900 shadow-sm' : ''
                  }`}
                >
                  <PlayCircle size={18} color={formType === 'video' ? '#ef4444' : '#94a3b8'} />
                  <Text className={`text-sm font-bold ${
                    formType === 'video' ? 'text-slate-950 dark:text-white' : 'text-slate-400'
                  }`}>
                    Video / Oynatma Listesi
                  </Text>
                </TouchableOpacity>
              </View>

              {/* HIZLI ŞABLON BUTONU */}
              <TouchableOpacity
                onPress={handleApplyHatimTemplate}
                className="mb-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/40 p-3 rounded-2xl flex-row items-center justify-between"
              >
                <View className="flex-row items-center gap-2.5">
                  <BookOpen size={18} color="#10b981" />
                  <Text className="text-xs font-black text-emerald-800 dark:text-emerald-300">📖 30 Cüz (600 Sayfa) Kuran Hatmi Şablonunu Yükle</Text>
                </View>
                <Sparkles size={14} color="#10b981" />
              </TouchableOpacity>

              {/* Title */}
              <View className="mb-4">
                <Text className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">Başlık</Text>
                <TextInput 
                  placeholder={formType === 'book' ? "Kitap veya hedef konusu adı..." : "YouTube Oynatma Listesi adı..."}
                  placeholderTextColor="#94a3b8"
                  className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-2xl px-4 py-3.5 text-slate-900 dark:text-white font-medium text-base"
                  value={formTitle}
                  onChangeText={setFormTitle}
                />
              </View>

              {/* Assignee selection */}
              <View className="mb-4">
                <Text className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">Sorumlu Kişi</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row">
                  {familyMembers && familyMembers.map((member) => {
                    const isSelected = formAssigneeId === member.id;
                    return (
                      <TouchableOpacity
                        key={member.id}
                        onPress={() => setFormAssigneeId(member.id)}
                        className={`mr-3 p-2 rounded-2xl flex-row items-center border ${
                          isSelected 
                            ? 'bg-indigo-50 border-indigo-500 dark:bg-indigo-950/30 dark:border-indigo-500' 
                            : 'bg-slate-50 border-slate-200 dark:bg-slate-850 dark:border-slate-800'
                        }`}
                      >
                        <View className="w-6 h-6 rounded-full items-center justify-center mr-2" style={{ backgroundColor: member.color }}>
                          <Text className="text-white text-xs font-black">{member.name.charAt(0)}</Text>
                        </View>
                        <Text className={`text-xs font-bold ${isSelected ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-700 dark:text-slate-350'}`}>
                          {member.name}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>

              {/* Video URL or Description */}
              {formType === 'video' ? (
                <View className="mb-4">
                  <Text className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">Oynatma Listesi URL'si (YouTube)</Text>
                  <TextInput 
                    placeholder="https://www.youtube.com/playlist?list=..."
                    placeholderTextColor="#94a3b8"
                    autoCapitalize="none"
                    autoCorrect={false}
                    className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-2xl px-4 py-3.5 text-slate-900 dark:text-white font-medium text-sm"
                    value={formVideoUrl}
                    onChangeText={setFormVideoUrl}
                  />
                </View>
              ) : (
                <View className="mb-4">
                  <Text className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">Açıklama</Text>
                  <View className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-2xl p-3 flex-row items-start">
                    <AlignLeft size={18} color="#94a3b8" className="mr-2 mt-0.5" />
                    <TextInput 
                      placeholder="Hedef hakkında kısa açıklama..."
                      placeholderTextColor="#94a3b8"
                      multiline={true}
                      numberOfLines={2}
                      className="flex-1 text-slate-900 dark:text-white font-medium text-sm p-0 min-h-[50px]"
                      value={formDescription}
                      onChangeText={setFormDescription}
                    />
                  </View>
                </View>
              )}

              {/* Units Configuration */}
              <View className="bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-850 rounded-[2rem] p-4 mb-4">
                <View className="flex-row gap-4 mb-4">
                  <View className="flex-1">
                    <Text className="text-slate-400 text-[10px] uppercase font-black tracking-widest mb-1.5 text-center">Miktar</Text>
                    <TextInput
                      keyboardType="numeric"
                      placeholder="100"
                      placeholderTextColor="#94a3b8"
                      className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-center text-slate-900 dark:text-white font-black text-lg"
                      value={String(formTotalUnits)}
                      onChangeText={(val) => setFormTotalUnits(parseInt(val) || 0)}
                    />
                  </View>
                  <View className="flex-1">
                    <Text className="text-slate-400 text-[10px] uppercase font-black tracking-widest mb-1.5 text-center">Birim</Text>
                    <TextInput
                      placeholder="sayfa"
                      placeholderTextColor="#94a3b8"
                      editable={formType !== 'video'}
                      className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-center text-slate-900 dark:text-white font-bold text-sm"
                      value={formUnitName}
                      onChangeText={setFormUnitName}
                    />
                  </View>
                </View>

                {formType === 'book' ? (
                  <View>
                    <Text className="text-slate-400 text-[10px] uppercase font-black tracking-widest mb-1.5">Bölüm Sayısı</Text>
                    <TextInput
                      keyboardType="numeric"
                      placeholder="1"
                      placeholderTextColor="#94a3b8"
                      className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-slate-900 dark:text-white font-bold text-sm"
                      value={String(formSectionCount)}
                      onChangeText={handleSectionCountChange}
                    />
                  </View>
                ) : null}
              </View>

              {/* Sections Customization */}
              {formType === 'book' && formSections.length > 0 ? (
                <View className="mb-6">
                  <Text className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">Bölüm Başlıkları</Text>
                  {formSections.map((section, idx) => (
                    <View key={idx} className="flex-row items-center mb-2">
                      <View className="w-8 h-8 bg-slate-100 dark:bg-slate-800 rounded-lg items-center justify-center mr-2">
                        <Text className="text-slate-500 font-bold text-xs">{idx + 1}</Text>
                      </View>
                      <TextInput
                        placeholder={`Bölüm ${idx + 1} Başlığı`}
                        placeholderTextColor="#94a3b8"
                        className="flex-1 bg-slate-50 dark:bg-slate-950 border border-slate-250 dark:border-slate-800 rounded-xl px-3 py-2 text-slate-900 dark:text-white font-medium text-sm"
                        value={section.title}
                        onChangeText={(text) => {
                          setFormSections(prev => {
                            const next = [...prev];
                            next[idx] = { ...next[idx], title: text };
                            return next;
                          });
                        }}
                      />
                    </View>
                  ))}
                </View>
              ) : null}

              {/* Save Button */}
              <TouchableOpacity 
                onPress={handleSaveGoal}
                className="bg-indigo-600 py-4 rounded-2xl items-center justify-center shadow-lg shadow-indigo-500/20"
              >
                <Text className="text-white font-bold text-base">Yol Haritasını Kaydet</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
