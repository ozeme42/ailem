import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Modal, TextInput, Linking } from 'react-native';
import { useColorScheme } from 'nativewind';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useEffect, useState } from 'react';
import { ChevronLeft, Target, Play, Sparkles, Lock, ChevronDown, ChevronUp, Plus, X, Check } from 'lucide-react-native';
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

  // Expand first section by default
  useEffect(() => {
    if (goal && goal.sections && Object.keys(expandedSections).length === 0) {
      const sorted = [...goal.sections].sort((a, b) => a.order - b.order);
      if (sorted.length > 0) {
        setExpandedSections({ [sorted[0].id]: true });
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
    const sorted = [...goal.sections].sort((a, b) => a.order - b.order);
    const firstUncompleted = sorted.find(s => s.status !== 'completed');
    if (firstUncompleted) {
      setEditingSection(firstUncompleted);
      setExpandedSections(prev => ({ ...prev, [firstUncompleted.id]: true }));
      setFormProgress(String(firstUncompleted.sectionTotalUnits - (firstUncompleted.completedUnits || 0)));
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

  const sortedSections = goal.sections ? [...goal.sections].sort((a, b) => a.order - b.order) : [];
  const isVideoGoal = goal.platform === 'YouTube';
  const totalCompletedUnits = goal.sections ? goal.sections.reduce((sum, section) => sum + (section.completedUnits || 0), 0) : 0;
  const overallProgress = goal.totalUnits > 0 ? (totalCompletedUnits / goal.totalUnits) * 100 : 0;

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
        {/* Genel İlerleme Kartı */}
        <View className="bg-white dark:bg-slate-900 rounded-[2rem] overflow-hidden shadow-sm border border-slate-100 dark:border-slate-800/10 mb-6">
          <View className="h-1.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />
          <View className="p-5">
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center gap-2">
                <Target size={20} color="#6366f1" />
                <Text className="text-lg font-black text-slate-900 dark:text-white">Genel İlerleme</Text>
              </View>
              <Text className="text-3xl font-black text-indigo-600 dark:text-indigo-400">
                %{Math.round(overallProgress)}
              </Text>
            </View>

            <Text className="text-slate-450 dark:text-slate-400 text-xs mt-1.5 font-medium">
              {isVideoGoal 
                ? `Sıradaki: Video ${totalCompletedUnits + 1}` 
                : goal.sections && goal.sections.length > 0
                  ? `Sıradaki: ${sortedSections.find(s => s.status !== 'completed')?.title || 'Tamamlandı'}`
                  : `Sıradaki: ${goal.unitName} ${totalCompletedUnits + 1}`
              }
            </Text>

            <View className="mt-6">
              <View className="flex-row justify-between items-end mb-2">
                <Text className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider">Durum</Text>
                <Text className="text-sm font-black text-slate-700 dark:text-slate-350">
                  {totalCompletedUnits} <Text className="text-slate-400 text-xs font-bold">/</Text> {goal.totalUnits} <Text className="text-[10px] text-slate-400 uppercase">{goal.unitName}</Text>
                </Text>
              </View>
              
              <View className="h-4 w-full bg-slate-100 dark:bg-slate-950 rounded-full overflow-hidden border border-slate-200/30 dark:border-slate-800">
                <View 
                  className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full"
                  style={{ width: `${overallProgress}%` }}
                />
              </View>
            </View>

            {/* Quick Action Button for Standard goals, Play playlist for Video goals */}
            {goal.status !== 'completed' && (
              <View className="mt-5">
                {isVideoGoal ? (
                  goal.videoUrl ? (
                    <TouchableOpacity 
                      onPress={handleWatchVideo}
                      className="bg-red-600 hover:bg-red-750 py-3.5 rounded-2xl items-center justify-center flex-row gap-2 shadow-lg shadow-red-500/20"
                    >
                      <Play size={18} color="white" fill="white" />
                      <Text className="text-white font-bold text-base">Oynatma Listesini Aç</Text>
                    </TouchableOpacity>
                  ) : null
                ) : (
                  <TouchableOpacity 
                    onPress={handleQuickProgress}
                    className="bg-indigo-600 hover:bg-indigo-755 py-3.5 rounded-2xl items-center justify-center flex-row gap-1.5 shadow-lg shadow-indigo-500/20"
                  >
                    <Plus size={18} color="white" />
                    <Text className="text-white font-bold text-base">Hızlı İlerleme Ekle</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>
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
              const sectionProgress = section.sectionTotalUnits > 0 ? ((section.completedUnits || 0) / section.sectionTotalUnits) * 100 : 0;
              const isUnlocked = index === 0 || sortedSections[index - 1].status === 'completed';
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
                      <View className="shrink-0">
                        {isCompleted ? (
                          <View className="w-12 h-12 rounded-full bg-emerald-50 dark:bg-emerald-950/20 flex items-center justify-center border border-emerald-150 dark:border-emerald-800/30">
                            <Check size={22} color="#10b981" strokeWidth={3} />
                          </View>
                        ) : isUnlocked ? (
                          <CircularProgress progress={sectionProgress} />
                        ) : (
                          <View className="w-12 h-12 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center border border-slate-300 dark:border-slate-700">
                            <Lock size={18} color={isDark ? '#475569' : '#94a3b8'} />
                          </View>
                        )}
                      </View>
                      
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
                          {' '} / {section.sectionTotalUnits} <Text className="uppercase text-[9px] font-bold text-slate-400">{goal.unitName}</Text>
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

                        {!isCompleted && (
                          <TouchableOpacity 
                            onPress={() => {
                              setEditingSection(section);
                              setFormProgress(String(section.sectionTotalUnits - (section.completedUnits || 0)));
                            }}
                            className="w-full bg-slate-50 dark:bg-slate-850 hover:bg-slate-100 py-3 rounded-xl items-center justify-center mt-3 border border-slate-200/60 dark:border-slate-800"
                          >
                            <Text className="text-slate-700 dark:text-slate-350 font-bold text-sm">İlerleme Ekle</Text>
                          </TouchableOpacity>
                        )}
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
