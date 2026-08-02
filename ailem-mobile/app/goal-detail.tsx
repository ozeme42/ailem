import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Modal, TextInput, Linking } from 'react-native';
import { useColorScheme } from 'nativewind';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useEffect, useState } from 'react';
import { ChevronLeft, Target, Play, Sparkles, Lock, ChevronDown, ChevronUp, Plus, Minus, X, Check, BookOpen } from 'lucide-react-native';
import { useRouter, Stack, useLocalSearchParams } from 'expo-router';
import { onGoalsUpdate, updateGoal } from '../lib/dataService';
import { Goal, GoalSection } from '../lib/data';
import Svg, { Circle } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';

export default function GoalDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const [goal, setGoal] = useState<Goal | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Expanded sections state
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  
  // Edit progress state
  const [editingSection, setEditingSection] = useState<GoalSection | null>(null);
  const [formProgress, setFormProgress] = useState('');

  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  useEffect(() => {
    if (!id) return;
    
    let unsubscribe: any;
    try {
      unsubscribe = onGoalsUpdate((data: Goal[]) => {
        const found = data.find(g => g.id === id);
        setGoal(found || null);
        setLoading(false);
      });
    } catch (e) {
      console.log('Error fetching goal detail:', e);
      setLoading(false);
    }

    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, [id]);

  // Automatically expand the current active section where user left off
  useEffect(() => {
    if (goal && goal.sections && Object.keys(expandedSections).length === 0) {
      const isHatmiGoal = goal.unitName === 'Cüz' || goal.unitName === 'Sayfa' || (goal.title && (goal.title.toLowerCase().includes('hatm') || goal.title.toLowerCase().includes('kuran')));
      const sorted = [...goal.sections].sort((a, b) => a.order - b.order);
      
      // Find the first section that is currently in-progress or not completed
      const activeSection = sorted.find(s => {
        const maxUnits = isHatmiGoal ? 20 : (s.sectionTotalUnits || 1);
        return s.status !== 'completed' && (s.completedUnits || 0) < maxUnits;
      }) || sorted[sorted.length - 1] || sorted[0];

      if (activeSection) {
        setExpandedSections({ [activeSection.id]: true });
      }
    }
  }, [goal]);

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId]
    }));
  };

  const handleProgressSubmit = async () => {
    if (!goal || !editingSection) return;
    const progressVal = parseInt(formProgress) || 0;
    if (progressVal <= 0) {
      Alert.alert('Hata', 'Lütfen en az 1 birim ilerleme girin.');
      return;
    }

    const remaining = editingSection.sectionTotalUnits - (editingSection.completedUnits || 0);
    if (progressVal > remaining) {
      Alert.alert('Hata', `Girebileceğiniz maksimum miktar: ${remaining} ${goal.unitName}`);
      return;
    }

    const newCompletedUnits = (editingSection.completedUnits || 0) + progressVal;
    const sectionProgress = Math.min(newCompletedUnits, editingSection.sectionTotalUnits);

    const newSections = goal.sections.map(s => {
      if (s.id === editingSection.id) {
        const isSecCompleted = sectionProgress >= s.sectionTotalUnits;
        return {
          ...s,
          completedUnits: sectionProgress,
          status: (isSecCompleted ? 'completed' : 'unlocked') as 'completed' | 'unlocked'
        };
      }
      return s;
    });

    const isGoalComplete = newSections.every(s => s.status === 'completed');
    const newGoalStatus = isGoalComplete ? 'completed' : 'in-progress';

    try {
      await updateGoal(goal.id, { sections: newSections, status: newGoalStatus });
      setEditingSection(null);
      setFormProgress('');
      Alert.alert('Başarılı', 'İlerleme kaydedildi.');
    } catch (e: any) {
      Alert.alert('Hata', 'Kaydetme başarısız: ' + e.message);
    }
  };

  const handleQuickProgress = () => {
    if (!goal || !goal.sections) return;
    const isHatmi = goal.unitName === 'Cüz' || goal.unitName === 'Sayfa' || (goal.title && (goal.title.toLowerCase().includes('hatm') || goal.title.toLowerCase().includes('kuran')));
    const sorted = [...goal.sections].sort((a, b) => a.order - b.order);
    const firstUncompleted = sorted.find(s => s.status !== 'completed');
    if (firstUncompleted) {
      setEditingSection(firstUncompleted);
      setExpandedSections(prev => ({ ...prev, [firstUncompleted.id]: true }));
      // Pre-fill with 1 page for Hatim goals instead of whole section
      setFormProgress(isHatmi ? '1' : String((firstUncompleted.sectionTotalUnits || 1) - (firstUncompleted.completedUnits || 0)));
    }
  };

  const handleVideoComplete = async (videoIndex: number) => {
    if (!goal || !goal.sections) return;
    const videoSection = goal.sections[0];
    if (!videoSection) return;

    // A YouTube goal is updated by incrementing its single section completedUnits by 1
    const newCompletedUnits = Math.min(videoIndex, videoSection.sectionTotalUnits);
    const sectionProgress = newCompletedUnits;

    const newSections = [{
      ...videoSection,
      completedUnits: sectionProgress,
      status: (sectionProgress >= videoSection.sectionTotalUnits ? 'completed' : 'unlocked') as 'completed' | 'unlocked'
    }];

    const isGoalComplete = sectionProgress >= goal.totalUnits;
    const newGoalStatus = isGoalComplete ? 'completed' : 'in-progress';

    try {
      await updateGoal(goal.id, { sections: newSections, status: newGoalStatus });
      Alert.alert('Başarılı', `Video ${newCompletedUnits} tamamlandı olarak işaretlendi.`);
    } catch (e: any) {
      Alert.alert('Hata', 'Güncelleme başarısız: ' + e.message);
    }
  };

  const handleSetExactPage = async (section: GoalSection, targetPage: number) => {
    if (!goal) return;
    const isHatmi = goal.unitName === 'Cüz' || goal.unitName === 'Sayfa' || (goal.title && (goal.title.toLowerCase().includes('hatm') || goal.title.toLowerCase().includes('kuran')));
    const maxUnits = isHatmi ? 20 : (section.sectionTotalUnits || 1);
    const newCompletedUnits = Math.min(maxUnits, Math.max(0, targetPage));

    const newSections = goal.sections.map(s => {
      if (s.id === section.id) {
        const isSecCompleted = newCompletedUnits >= maxUnits;
        return {
          ...s,
          sectionTotalUnits: maxUnits,
          completedUnits: newCompletedUnits,
          status: (isSecCompleted ? 'completed' : 'unlocked') as 'completed' | 'unlocked',
        };
      }
      return {
        ...s,
        sectionTotalUnits: isHatmi ? 20 : (s.sectionTotalUnits || 1)
      };
    });

    const isGoalComplete = newSections.every(s => s.status === 'completed');
    const newGoalStatus = isGoalComplete ? 'completed' : 'in-progress';
    const totalUnitsCount = isHatmi ? 600 : (goal.totalUnits || 1);

    try {
      await updateGoal(goal.id, { sections: newSections, status: newGoalStatus, totalUnits: totalUnitsCount, unitName: isHatmi ? 'Sayfa' : goal.unitName });
      if (isGoalComplete) {
        Alert.alert('Tebrikler 🌟 📖', '600 sayfalık Kuran-ı Kerim Hatminizi başarıyla tamamladınız! Allah kabul etsin.');
      }
    } catch (e: any) {
      Alert.alert('Hata', 'Kaydetme başarısız: ' + e.message);
    }
  };

  const handleAddPagesToSection = async (section: GoalSection, pagesToAdd: number) => {
    if (!goal) return;
    const currentDone = section.completedUnits || 0;
    const isHatmi = goal.unitName === 'Cüz' || goal.unitName === 'Sayfa' || (goal.title && (goal.title.toLowerCase().includes('hatm') || goal.title.toLowerCase().includes('kuran')));
    const maxUnits = isHatmi ? 20 : (section.sectionTotalUnits || 1);
    await handleSetExactPage(section, currentDone + pagesToAdd);
  };

  const handleToggleSectionCompletion = async (section: GoalSection) => {
    if (!goal) return;
    const isHatmi = goal.unitName === 'Cüz' || goal.unitName === 'Sayfa' || (goal.title && (goal.title.toLowerCase().includes('hatm') || goal.title.toLowerCase().includes('kuran')));
    const maxUnits = isHatmi ? 20 : (section.sectionTotalUnits || 1);
    const currentDone = section.completedUnits || 0;

    // For Hatim goals, tapping the circle icon adds +1 page (or completes if on page 19, or resets if full)
    if (isHatmi) {
      if (currentDone >= maxUnits) {
        await handleSetExactPage(section, 0);
      } else {
        await handleSetExactPage(section, currentDone + 1);
      }
      return;
    }

    const isNowCompleted = section.status !== 'completed';
    const newCompletedUnits = isNowCompleted ? maxUnits : 0;

    const newSections = goal.sections.map(s => {
      if (s.id === section.id) {
        return {
          ...s,
          completedUnits: newCompletedUnits,
          status: (isNowCompleted ? 'completed' : 'unlocked') as 'completed' | 'unlocked',
        };
      }
      return s;
    });

    const isGoalComplete = newSections.every(s => s.status === 'completed');
    const newGoalStatus = isGoalComplete ? 'completed' : 'in-progress';

    try {
      await updateGoal(goal.id, { sections: newSections, status: newGoalStatus });
      if (isGoalComplete) {
        Alert.alert('Tebrikler 🌟 📖', 'Yol haritanızı başarıyla tamamladınız!');
      }
    } catch (e: any) {
      Alert.alert('Hata', 'Kaydetme başarısız: ' + e.message);
    }
  };

  const handleWatchVideo = () => {
    if (goal && goal.videoUrl) {
      Linking.openURL(goal.videoUrl).catch(err => Alert.alert('Hata', 'Playlist açılamadı: ' + err.message));
    }
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 justify-center items-center bg-slate-50 dark:bg-slate-950">
        <ActivityIndicator size="large" color="#6366f1" />
      </SafeAreaView>
    );
  }

  if (!goal) {
    return (
      <SafeAreaView className="flex-1 bg-slate-50 dark:bg-slate-950">
        <Stack.Screen options={{ headerShown: false }} />
        <View className="p-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex-row items-center">
          <TouchableOpacity onPress={() => router.back()} className="w-10 h-10 items-center justify-center bg-slate-100 dark:bg-slate-800 rounded-full mr-4">
             <ChevronLeft size={24} color={isDark ? '#94a3b8' : '#64748b'} />
          </TouchableOpacity>
          <Text className="text-xl font-bold text-slate-900 dark:text-white">Hedef Bulunamadı</Text>
        </View>
      </SafeAreaView>
    );
  }

  const isHatmiGoal = goal ? (goal.unitName === 'Cüz' || goal.unitName === 'Sayfa' || (goal.title && (goal.title.toLowerCase().includes('hatm') || goal.title.toLowerCase().includes('kuran')))) : false;
  const sortedSections = goal.sections ? [...goal.sections].sort((a, b) => a.order - b.order) : [];
  const isVideoGoal = goal ? goal.platform === 'YouTube' : false;
  const totalCompletedUnits = goal.sections ? goal.sections.reduce((sum, section) => sum + (section.completedUnits || 0), 0) : 0;
  const goalTotalUnitsCount = isHatmiGoal ? 600 : (goal.totalUnits || 1);
  const overallProgress = goalTotalUnitsCount > 0 ? (totalCompletedUnits / goalTotalUnitsCount) * 100 : 0;

  const CircularProgress = ({ progress }: { progress: number }) => {
    const radius = 18;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (Math.min(100, Math.max(0, progress)) / 100) * circumference;

    return (
      <View className="relative w-12 h-12 items-center justify-center">
        <Svg width={44} height={44} viewBox="0 0 44 44" style={{ transform: [{ rotate: '-90deg' }] }}>
          <Circle
            cx="22"
            cy="22"
            r={radius}
            fill="none"
            stroke={isDark ? '#1e293b' : '#f1f5f9'}
            strokeWidth="4"
          />
          <Circle
            cx="22"
            cy="22"
            r={radius}
            fill="none"
            stroke="#6366f1"
            strokeWidth="4"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
          />
        </Svg>
        <View className="absolute inset-0 items-center justify-center">
          <Text className="text-[10px] font-black text-slate-700 dark:text-slate-350">
            {Math.round(progress)}%
          </Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-50 dark:bg-slate-950" edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* HEADER */}
      <View className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex-row items-center">
        <TouchableOpacity onPress={() => router.back()} className="w-10 h-10 items-center justify-center bg-slate-100 dark:bg-slate-800 rounded-full mr-3">
           <ChevronLeft size={24} color={isDark ? '#94a3b8' : '#64748b'} />
        </TouchableOpacity>
        <Text className="text-lg font-black text-slate-900 dark:text-white flex-1 truncate" numberOfLines={1}>
          {goal.title}
        </Text>
      </View>

      <ScrollView contentContainerClassName="p-4 pb-8" showsVerticalScrollIndicator={false}>
        {/* Executive Sleek Top Summary Card */}
        <View className={`mb-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 border-l-4 ${isHatmiGoal ? 'border-l-emerald-500' : 'border-l-indigo-500'} p-5 shadow-sm`}>
          <View className="flex-row items-center justify-between">
            <View className="flex-1 pr-3">
              <View className="flex-row items-center gap-1.5 mb-1.5">
                <Text className={`text-[10px] font-black tracking-wider uppercase ${isHatmiGoal ? 'text-emerald-600 dark:text-emerald-400' : 'text-indigo-600 dark:text-indigo-400'}`}>
                  {isHatmiGoal ? '📖 KURAN HATMİ GELİŞİMİ' : 'YOL HARİTASI HEDEFİ'}
                </Text>
              </View>
              <Text className="text-xl font-black text-slate-900 dark:text-white leading-tight" numberOfLines={1}>
                {goal.title}
              </Text>
              <Text className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium leading-relaxed" numberOfLines={2}>
                {isHatmiGoal 
                  ? `Sıradaki: ${Math.min(30, Math.floor(totalCompletedUnits / 20) + 1)}. Cüz (${totalCompletedUnits % 20} / 20 Sayfa)` 
                  : (goal.sections && goal.sections.length > 0
                      ? `Sıradaki: ${sortedSections.find(s => s.status !== 'completed')?.title || 'Tamamlandı'}`
                      : `Sıradaki: ${goal.unitName} ${totalCompletedUnits + 1}`)
                }
              </Text>
            </View>

            <View className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-3 rounded-xl items-center justify-center">
              <Text className={`text-2xl font-black ${isHatmiGoal ? 'text-emerald-600 dark:text-emerald-400' : 'text-indigo-600 dark:text-indigo-400'}`}>
                %{Math.round(overallProgress)}
              </Text>
              <Text className="text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">TAMAMLANDI</Text>
            </View>
          </View>

          <View className="mt-4">
            <View className="flex-row justify-between items-end mb-1.5">
              <Text className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider">GENEL DURUM</Text>
              <Text className="text-xs font-bold text-slate-700 dark:text-slate-300">
                {totalCompletedUnits} / {goalTotalUnitsCount} {isHatmiGoal ? 'Sayfa' : goal.unitName}
                {isHatmiGoal ? ` (${(totalCompletedUnits / 20).toFixed(1)} Cüz)` : ''}
              </Text>
            </View>
            
            <View className="h-2.5 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
              <View 
                className={`h-full rounded-full ${isHatmiGoal ? 'bg-emerald-500' : 'bg-indigo-600'}`}
                style={{ width: `${overallProgress}%` }}
              />
            </View>
          </View>

          {/* Quick Action Button */}
          {goal.status !== 'completed' && (
            <View className="mt-4">
              {isVideoGoal ? (
                goal.videoUrl ? (
                  <TouchableOpacity 
                    onPress={handleWatchVideo}
                    className="bg-red-600 py-3 rounded-xl items-center justify-center flex-row gap-2 shadow-sm"
                  >
                    <Play size={16} color="white" fill="white" />
                    <Text className="text-white font-bold text-xs">Oynatma Listesini Aç</Text>
                  </TouchableOpacity>
                ) : null
              ) : (
                <TouchableOpacity 
                  onPress={handleQuickProgress}
                  className={`py-3 rounded-xl items-center justify-center flex-row gap-1.5 shadow-sm ${isHatmiGoal ? 'bg-emerald-600' : 'bg-indigo-600'}`}
                >
                  <Plus size={16} color="white" />
                  <Text className="text-white font-bold text-xs">Hızlı İlerleme Ekle</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>

        {/* Bölümler veya Videolar Listesi */}
        <View className="space-y-4">
          <Text className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-2">
            {isVideoGoal ? 'Video Akışı' : 'Bölümler ve Hedefler'}
          </Text>

          {isVideoGoal ? (
            /* YOUTUBE VIDEO GRID / LIST */
            <View className="gap-3">
              {Array.from({ length: goal.totalUnits }, (_, index) => {
                const videoNum = index + 1;
                const isCompleted = videoNum <= totalCompletedUnits;
                const isUnlocked = videoNum === totalCompletedUnits + 1;
                const isLocked = videoNum > totalCompletedUnits + 1;

                return (
                  <View 
                    key={index}
                    className={`rounded-2xl p-4 flex-row items-center border ${
                      isCompleted
                        ? 'bg-emerald-50/20 border-emerald-100 dark:bg-emerald-950/10 dark:border-emerald-900/30'
                        : isUnlocked
                          ? 'bg-white dark:bg-slate-900 border-indigo-200 dark:border-indigo-900/40 shadow-sm'
                          : 'bg-slate-100/50 dark:bg-slate-900/30 border-slate-200/50 dark:border-slate-800 opacity-60'
                    }`}
                  >
                    {/* Left Icon */}
                    <View className="mr-4">
                      {isCompleted ? (
                        <View className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-500/20 items-center justify-center">
                          <Check size={20} color="#10b981" strokeWidth={3} />
                        </View>
                      ) : isUnlocked ? (
                        <TouchableOpacity 
                          onPress={() => handleVideoComplete(videoNum)}
                          className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-500/20 items-center justify-center"
                        >
                          <Play size={18} color="#6366f1" fill="#6366f1" />
                        </TouchableOpacity>
                      ) : (
                        <View className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-800 items-center justify-center">
                          <Lock size={16} color={isDark ? '#475569' : '#94a3b8'} />
                        </View>
                      )}
                    </View>

                    {/* Title */}
                    <View className="flex-1">
                      <Text className={`text-sm font-bold ${
                        isCompleted ? 'text-slate-500 line-through dark:text-slate-400' : 'text-slate-800 dark:text-white'
                      }`}>
                        Video {videoNum}
                      </Text>
                      <Text className="text-[10px] font-bold text-slate-400 mt-0.5">
                        {isCompleted ? 'Tamamlandı' : isUnlocked ? 'Sıradaki Adım' : 'Kilitli'}
                      </Text>
                    </View>

                    {/* Unlocked Complete Action Button */}
                    {isUnlocked && (
                      <TouchableOpacity
                        onPress={() => handleVideoComplete(videoNum)}
                        className="bg-indigo-600 px-3.5 py-1.5 rounded-xl"
                      >
                        <Text className="text-white text-xs font-bold">Tamamla</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                );
              })}
            </View>
          ) : (
            /* STANDARD ACCORDION SECTIONS */
            sortedSections.map((section, index) => {
              const isHatmiGoal = goal.unitName === 'Cüz' || (goal.title && (goal.title.toLowerCase().includes('hatm') || goal.title.toLowerCase().includes('kuran')));
              const sectionProgress = section.sectionTotalUnits > 0 ? ((section.completedUnits || 0) / section.sectionTotalUnits) * 100 : 0;
              const isUnlocked = isHatmiGoal || index === 0 || sortedSections[index - 1].status === 'completed';
              const isCompleted = section.status === 'completed';
              const isExpanded = !!expandedSections[section.id];

              return (
                <View 
                  key={section.id} 
                  className={`mb-3 rounded-[1.5rem] overflow-hidden border ${
                    isUnlocked 
                      ? 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-850' 
                      : 'bg-slate-100/50 dark:bg-slate-900/30 border-slate-200/50 dark:border-slate-800 opacity-60'
                  }`}
                >
                  <TouchableOpacity 
                    onPress={() => isUnlocked && toggleSection(section.id)}
                    activeOpacity={isUnlocked ? 0.7 : 1}
                    className="px-5 py-4 flex-row items-center justify-between"
                  >
                    <View className="flex-row items-center gap-4 flex-1">
                      <TouchableOpacity 
                        disabled={!isUnlocked}
                        onPress={() => (isHatmiGoal || section.sectionTotalUnits === 1) ? handleToggleSectionCompletion(section) : toggleSection(section.id)}
                        className="shrink-0"
                      >
                        {isCompleted ? (
                          <View className="w-12 h-12 rounded-full bg-emerald-50 dark:bg-emerald-950/20 flex items-center justify-center border border-emerald-150 dark:border-emerald-800/30 shadow-sm">
                            <Check size={22} color="#10b981" strokeWidth={3} />
                          </View>
                        ) : isUnlocked ? (
                          <CircularProgress progress={sectionProgress} />
                        ) : (
                          <View className="w-12 h-12 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center border border-slate-300 dark:border-slate-700">
                            <Lock size={18} color={isDark ? '#475569' : '#94a3b8'} />
                          </View>
                        )}
                      </TouchableOpacity>
                      
                      <View className="flex-1 pr-2">
                        <Text className={`text-base font-bold leading-tight ${
                          isCompleted ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-800 dark:text-white'
                        }`}>
                          {section.title}
                        </Text>
                        <Text className="text-xs text-slate-500 font-semibold mt-1">
                          <Text className={isCompleted ? 'text-emerald-600 dark:text-emerald-450' : 'text-slate-700 dark:text-slate-300'}>
                            {section.completedUnits || 0}
                          </Text>
                          {' '} / {isHatmiGoal ? 20 : (section.sectionTotalUnits || 1)} <Text className="uppercase text-[9px] font-bold text-slate-400">{isHatmiGoal ? 'Sayfa' : goal.unitName}</Text>
                        </Text>
                      </View>
                    </View>
                    
                    {isUnlocked && (
                      <View>
                        {isExpanded ? (
                          <ChevronUp size={20} color={isDark ? '#94a3b8' : '#64748b'} />
                        ) : (
                          <ChevronDown size={20} color={isDark ? '#94a3b8' : '#64748b'} />
                        )}
                      </View>
                    )}
                  </TouchableOpacity>

                  {/* Collapsed section details */}
                  {isUnlocked && isExpanded && (
                    <View className="px-5 pb-5 pt-1 pl-[4.5rem] border-t border-slate-50 dark:border-slate-800/30">
                      <View className="space-y-4">
                        <View className="space-y-1">
                          <View className="flex-row justify-between text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                            <Text className="text-[9px] font-black text-slate-400 uppercase">Bölüm İlerlemesi</Text>
                            <Text className={isCompleted ? 'text-emerald-500' : 'text-indigo-500'}>
                              %{Math.round(sectionProgress)}
                            </Text>
                          </View>
                          <View className="h-2.5 w-full bg-slate-100 dark:bg-slate-950 rounded-full overflow-hidden border border-slate-200/30 dark:border-slate-800">
                            <View 
                              className={`h-full rounded-full ${isCompleted ? 'bg-emerald-500' : 'bg-indigo-500'}`} 
                              style={{ width: `${sectionProgress}%` }} 
                            />
                          </View>
                        </View>

                        {/* Stepper (+1 Sayfa Ekle / Çıkar) */}
                        <View className="mt-3 flex-row items-center gap-2 bg-slate-50 dark:bg-slate-950 p-2 rounded-2xl border border-slate-200/70 dark:border-slate-800">
                          <TouchableOpacity
                            disabled={(section.completedUnits || 0) <= 0}
                            onPress={() => handleSetExactPage(section, (section.completedUnits || 0) - 1)}
                            className={`w-10 h-10 rounded-xl items-center justify-center border ${
                              (section.completedUnits || 0) > 0
                                ? 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'
                                : 'bg-slate-100 dark:bg-slate-900 border-transparent opacity-40'
                            }`}
                          >
                            <Minus size={18} color={isDark ? '#cbd5e1' : '#475569'} />
                          </TouchableOpacity>

                          <TouchableOpacity
                            onPress={() => handleSetExactPage(section, (section.completedUnits || 0) + 1)}
                            className="flex-1 bg-emerald-600 dark:bg-emerald-500 py-2.5 rounded-xl items-center justify-center flex-row gap-2 shadow-sm"
                          >
                            <Plus size={16} color="white" />
                            <Text className="text-white font-black text-xs">
                              +1 Sayfa Okudum ({(section.completedUnits || 0) + 1}. Sayfadayım)
                            </Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            disabled={(section.completedUnits || 0) >= (section.sectionTotalUnits || 20)}
                            onPress={() => handleSetExactPage(section, (section.completedUnits || 0) + 1)}
                            className={`w-10 h-10 rounded-xl items-center justify-center border ${
                              (section.completedUnits || 0) < (section.sectionTotalUnits || 20)
                                ? 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'
                                : 'bg-slate-100 dark:bg-slate-900 border-transparent opacity-40'
                            }`}
                          >
                            <Plus size={18} color={isDark ? '#cbd5e1' : '#475569'} />
                          </TouchableOpacity>
                        </View>

                        {/* 20 Sayfa Kutucuk Grid'i (1'den 20'ye Tek Tek Dokunup İşaretleme) */}
                        {section.sectionTotalUnits > 1 && (
                          <View className="mt-3 gap-2">
                            <View className="flex-row items-center justify-between">
                              <Text className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                                20 Sayfa İşaretleme Kutucukları
                              </Text>
                              <Text className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                                {section.completedUnits || 0} / {section.sectionTotalUnits} Sayfa
                              </Text>
                            </View>

                            <View className="flex-row flex-wrap gap-1.5 justify-start">
                              {Array.from({ length: section.sectionTotalUnits || 20 }, (_, idx) => {
                                const pageNum = idx + 1;
                                const isPageDone = (section.completedUnits || 0) >= pageNum;

                                return (
                                  <TouchableOpacity
                                    key={pageNum}
                                    onPress={() => {
                                      if (isPageDone && (section.completedUnits || 0) === pageNum) {
                                        handleSetExactPage(section, pageNum - 1);
                                      } else {
                                        handleSetExactPage(section, pageNum);
                                      }
                                    }}
                                    className={`w-[18%] py-2 rounded-xl items-center justify-center border ${
                                      isPageDone
                                        ? 'bg-emerald-500 border-emerald-600 dark:bg-emerald-600 dark:border-emerald-500 shadow-sm'
                                        : 'bg-slate-50 dark:bg-slate-800/80 border-slate-200/80 dark:border-slate-700/60'
                                    }`}
                                  >
                                    <Text className={`text-xs font-black ${isPageDone ? 'text-white' : 'text-slate-700 dark:text-slate-300'}`}>
                                      {pageNum}. S
                                    </Text>
                                  </TouchableOpacity>
                                );
                              })}
                            </View>
                          </View>
                        )}

                        {/* Quick 20-Page Progress Buttons for Cüz */}
                        {section.sectionTotalUnits > 1 && (
                          <View className="mt-3 gap-2">
                            <Text className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider">Hızlı Sayfa Miktarı Ekle</Text>
                            <View className="flex-row gap-2">
                              <TouchableOpacity
                                onPress={() => handleAddPagesToSection(section, 5)}
                                className="flex-1 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/40 py-2.5 rounded-xl items-center"
                              >
                                <Text className="text-emerald-700 dark:text-emerald-300 font-bold text-xs">+5 Sayfa</Text>
                              </TouchableOpacity>

                              <TouchableOpacity
                                onPress={() => handleAddPagesToSection(section, 10)}
                                className="flex-1 bg-emerald-100 dark:bg-emerald-900/50 border border-emerald-300 dark:border-emerald-700/50 py-2.5 rounded-xl items-center"
                              >
                                <Text className="text-emerald-800 dark:text-emerald-200 font-black text-xs">+10 Sayfa</Text>
                              </TouchableOpacity>

                              <TouchableOpacity
                                onPress={() => handleAddPagesToSection(section, section.sectionTotalUnits - (section.completedUnits || 0))}
                                className="flex-1 bg-emerald-600 dark:bg-emerald-500 py-2.5 rounded-xl items-center shadow-sm"
                              >
                                <Text className="text-white font-black text-xs">Cüzü Bitir</Text>
                              </TouchableOpacity>
                            </View>
                          </View>
                        )}

                        {/* Fast 1-tap complete button or custom modal edit */}
                        <View className="flex-row gap-2 mt-3">
                          <TouchableOpacity 
                            onPress={() => handleToggleSectionCompletion(section)}
                            className={`flex-1 py-3 rounded-xl items-center justify-center border ${
                              isCompleted
                                ? 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700'
                                : 'bg-indigo-600 dark:bg-indigo-500 border-indigo-600 dark:border-indigo-500 shadow-md'
                            }`}
                          >
                            <Text className={`font-bold text-xs ${isCompleted ? 'text-slate-600 dark:text-slate-300' : 'text-white'}`}>
                              {isCompleted ? 'İptal Et / Sıfırla' : (isHatmiGoal ? 'Cüzün Tümünü Tamamla' : 'Bölümü Tamamla')}
                            </Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            onPress={() => {
                              setEditingSection(section);
                              setFormProgress(String(section.sectionTotalUnits - (section.completedUnits || 0)));
                            }}
                            className="bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3.5 py-3 rounded-xl items-center justify-center"
                          >
                            <Text className="text-slate-700 dark:text-slate-300 font-bold text-xs">✏️ Özel Miktar</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    </View>
                  )}
                </View>
              );
            })
          )}
        </View>
      </ScrollView>

      {/* ADD PROGRESS MODAL (Bottom Sheet) */}
      <Modal
        visible={editingSection !== null}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setEditingSection(null)}
      >
        <View className="flex-1 justify-end bg-black/50">
          <View className="bg-white dark:bg-slate-900 rounded-t-[2.5rem] px-5 py-6">
            <View className="flex-row justify-between items-center mb-5 pb-3 border-b border-slate-100 dark:border-slate-800">
              <Text className="text-lg font-black text-slate-900 dark:text-white">İlerleme Ekle</Text>
              <TouchableOpacity 
                onPress={() => setEditingSection(null)}
                className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 items-center justify-center"
              >
                <X size={18} color={isDark ? '#cbd5e1' : '#475569'} />
              </TouchableOpacity>
            </View>

            {editingSection && (
              <View className="mb-6">
                <Text className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">
                  Bölüm: <Text className="text-slate-700 dark:text-slate-200 font-bold">"{editingSection.title}"</Text>
                </Text>

                <View className="mb-4">
                  <Text className="text-slate-400 text-[10px] uppercase font-black tracking-widest mb-1.5">Eklenen Miktar ({goal.unitName})</Text>
                  <View className="relative">
                    <TextInput
                      keyboardType="numeric"
                      placeholder="0"
                      placeholderTextColor="#94a3b8"
                      className="bg-slate-50 dark:bg-slate-950 border border-slate-250 dark:border-slate-800 rounded-2xl px-5 py-4 text-slate-900 dark:text-white font-black text-xl"
                      value={formProgress}
                      onChangeText={setFormProgress}
                      autoFocus={true}
                    />
                    <View className="absolute right-5 top-1/2 -translate-y-1/2">
                      <Text className="text-xs font-bold text-slate-400">
                        / {editingSection.sectionTotalUnits - (editingSection.completedUnits || 0)}
                      </Text>
                    </View>
                  </View>
                </View>

                <TouchableOpacity 
                  onPress={handleProgressSubmit}
                  className="bg-indigo-600 py-4 rounded-2xl items-center justify-center shadow-lg shadow-indigo-500/20 mt-4"
                >
                  <Text className="text-white font-bold text-base">İlerlemeyi Kaydet</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
