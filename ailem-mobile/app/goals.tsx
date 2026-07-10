import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Modal, TextInput } from 'react-native';
import { useColorScheme } from 'nativewind';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useEffect, useState, useMemo } from 'react';
import { onGoalsUpdate, addGoal, updateGoal, deleteGoal } from '../lib/dataService';
import { Goal, FamilyMember } from '../lib/data';
import { Target, ChevronLeft, Plus, Check, MoreVertical, Sparkles, Map, User, BookOpen, PlayCircle, AlignLeft } from 'lucide-react-native';
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
         {filteredGoals.length === 0 ? (
           <View className="items-center justify-center py-20 bg-white dark:bg-slate-900 rounded-[2.5rem] border border-dashed border-slate-200 dark:border-slate-800 mt-6">
             <View className="w-20 h-20 bg-slate-50 dark:bg-slate-800 rounded-full items-center justify-center mb-4">
                <Target size={40} color="#cbd5e1" />
             </View>
             <Text className="text-slate-800 dark:text-slate-200 text-lg font-bold">Hedef Bulunamadı</Text>
             <Text className="text-slate-400 text-sm mt-1 text-center px-6 font-medium">Bu filtreye uygun bir hedef bulunmuyor. Kendinize yeni bir hedef oluşturarak başlayabilirsiniz.</Text>
             <TouchableOpacity 
               onPress={() => { setEditingGoal(null); setIsFormOpen(true); }}
               className="mt-6 bg-indigo-600 py-3 px-6 rounded-full shadow-lg shadow-indigo-500/20"
             >
               <Text className="text-white font-bold text-sm">İlk Hedefi Oluştur</Text>
             </TouchableOpacity>
           </View>
         ) : (
           filteredGoals.map((goal, idx) => {
             const progress = calculateOverallProgress(goal);
             const assignee = familyMembers.find(m => m.id === goal.assigneeId);
             const isVideoGoal = goal.platform === 'YouTube';
             const totalCompletedUnits = goal.sections ? goal.sections.reduce((acc, s) => acc + (s.completedUnits || 0), 0) : 0;
             const totalSections = goal.sections ? goal.sections.length : 0;
             const completedSections = goal.sections ? goal.sections.filter(s => s.status === 'completed').length : 0;
             
             const theme = goalThemes[idx % goalThemes.length];
             const gradientColors = isDark ? theme.darkGradient : theme.lightGradient;

             return (
               <TouchableOpacity 
                 key={goal.id} 
                 onPress={() => router.push({ pathname: '/goal-detail', params: { id: goal.id } })}
                 className="mb-4 rounded-[2rem] overflow-hidden shadow-sm border border-slate-100 dark:border-slate-800/10"
               >
                 <LinearGradient
                   colors={gradientColors as [string, string, ...string[]]}
                   start={{ x: 0, y: 0 }}
                   end={{ x: 1, y: 1 }}
                   className="p-5"
                 >
                   {/* Card Header */}
                   <View className="flex-row justify-between items-start mb-3">
                     <View className="flex-row items-center gap-2.5">
                       <View 
                         className="w-11 h-11 rounded-2xl items-center justify-center"
                         style={{ backgroundColor: isDark ? theme.iconBgDark : theme.iconBgLight }}
                       >
                         {isVideoGoal ? <PlayCircle size={22} color={theme.iconColor} /> : <Target size={22} color={theme.iconColor} />}
                       </View>
                       {assignee && (
                         <View 
                           className="w-8 h-8 rounded-full items-center justify-center shadow-sm border-2 border-white dark:border-slate-900" 
                           style={{ backgroundColor: assignee.color }}
                         >
                           <Text className="text-white text-xs font-black">{assignee.name.charAt(0)}</Text>
                         </View>
                       )}
                     </View>
                     
                     <TouchableOpacity 
                       onPress={() => handleOpenOptions(goal)}
                       className="w-8 h-8 items-center justify-center rounded-full bg-white/40 dark:bg-slate-800/40"
                     >
                       <MoreVertical size={18} color={isDark ? '#cbd5e1' : '#475569'} />
                     </TouchableOpacity>
                   </View>

                   {/* Card Content */}
                   <View className="mb-4">
                     <Text className="text-lg font-black" style={{ color: isDark ? theme.titleDark : theme.titleLight }} numberOfLines={1}>
                       {goal.title}
                     </Text>
                     {goal.description ? (
                       <Text className="text-xs mt-0.5 leading-relaxed font-medium" style={{ color: isDark ? theme.descDark : theme.descLight }} numberOfLines={2}>
                         {goal.description}
                       </Text>
                     ) : null}
                   </View>

                   {/* Next Step Banner */}
                   <View className="bg-white/50 dark:bg-slate-950/30 rounded-2xl p-2.5 mb-4 flex-row items-center gap-2 border border-white/20 dark:border-slate-800/10">
                     <Sparkles size={16} color="#f59e0b" />
                     <View className="flex-1">
                       <Text className="text-[9px] font-black uppercase tracking-wider" style={{ color: isDark ? theme.descDark : theme.descLight }}>SIRADAKİ</Text>
                       <Text className="text-xs font-bold truncate" style={{ color: isDark ? theme.titleDark : theme.titleLight }} numberOfLines={1}>
                         {getNextStepTitle(goal)}
                       </Text>
                     </View>
                   </View>

                   {/* Progress Info */}
                   <View className="flex-row justify-between items-end mb-1.5">
                     <View>
                       <Text className="text-[9px] font-bold uppercase tracking-widest" style={{ color: isDark ? theme.descDark : theme.descLight }}>İlerleme</Text>
                       <Text className="text-xl font-black leading-none mt-0.5" style={{ color: isDark ? theme.titleDark : theme.titleLight }}>
                         %{Math.round(progress)}
                       </Text>
                     </View>
                     <Text className="text-xs font-black" style={{ color: isDark ? theme.titleDark : theme.titleLight }}>
                       {isVideoGoal 
                         ? `${totalCompletedUnits}/${goal.totalUnits}` 
                         : `${completedSections}/${totalSections}`
                       } <Text className="text-[9px] font-bold uppercase" style={{ color: isDark ? theme.descDark : theme.descLight }}>{isVideoGoal ? 'Video' : 'Bölüm'}</Text>
                     </Text>
                   </View>

                   {/* Progress Bar */}
                   <View 
                     className="h-3 w-full rounded-full overflow-hidden border border-white/20 dark:border-slate-800/10 shadow-inner"
                     style={{ backgroundColor: isDark ? theme.progressBgDark : theme.progressBgLight }}
                   >
                     <View 
                       className="h-full rounded-full" 
                       style={{ width: `${progress}%`, backgroundColor: theme.progressFill }} 
                     />
                   </View>
                 </LinearGradient>
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
