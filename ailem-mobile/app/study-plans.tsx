import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useEffect, useState, useMemo } from 'react';
import { useRouter, Stack } from 'expo-router';
import { parseISO, isPast, isToday, differenceInDays } from 'date-fns';
import { tr } from 'date-fns/locale';
import { ArrowLeft, Clock, BookOpen, Sparkles, GraduationCap, LayoutGrid, CheckSquare, Square, ChevronDown, ChevronUp } from "lucide-react-native";
import { useAuth } from '../context/auth-context';
import { onStudyPlansUpdate, onStudyAssignmentsUpdate, updateStudyAssignment } from '../lib/dataService';
import { StudyPlan, StudyAssignment, FamilyMember } from '../lib/data';
import { LinearGradient } from 'expo-linear-gradient';
import { useColorScheme } from 'nativewind';

const subjectThemes: Record<string, { bg: string, text: string, border: string, gradient: [string, string] }> = {
  'Matematik': { bg: 'bg-blue-50/70 dark:bg-blue-950/20', text: 'text-blue-600 dark:text-blue-400', border: 'border-blue-100 dark:border-blue-900/30', gradient: ['#3b82f6', '#4f46e5'] },
  'Fen Bilimleri': { bg: 'bg-teal-50/70 dark:bg-teal-950/20', text: 'text-teal-600 dark:text-teal-400', border: 'border-teal-100 dark:border-teal-900/30', gradient: ['#34d399', '#059669'] },
  'Türkçe': { bg: 'bg-orange-50/70 dark:bg-orange-950/20', text: 'text-orange-600 dark:text-orange-400', border: 'border-orange-100 dark:border-orange-900/30', gradient: ['#fb923c', '#d97706'] },
  'Sosyal Bilgiler': { bg: 'bg-purple-50/70 dark:bg-purple-950/20', text: 'text-purple-600 dark:text-purple-400', border: 'border-purple-100 dark:border-purple-900/30', gradient: ['#a855f7', '#db2777'] },
  'İngilizce': { bg: 'bg-rose-50/70 dark:bg-rose-950/20', text: 'text-rose-600 dark:text-rose-400', border: 'border-rose-100 dark:border-rose-900/30', gradient: ['#f43f5e', '#dc2626'] },
  'Diğer': { bg: 'bg-slate-50/70 dark:bg-slate-900/20', text: 'text-slate-600 dark:text-slate-400', border: 'border-slate-200 dark:border-slate-800', gradient: ['#94a3b8', '#475569'] },
};

export default function StudyPageScreen() {
  const router = useRouter();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const { familyMembers } = useAuth();
  
  const [selectedStudent, setSelectedStudent] = useState<FamilyMember | null>(null);
  const [studyPlans, setStudyPlans] = useState<StudyPlan[]>([]);
  const [assignments, setAssignments] = useState<StudyAssignment[]>([]);
  const [activeTab, setActiveTab] = useState<'pending' | 'completed'>('pending');
  const [loading, setLoading] = useState(true);

  // Group collapses for completed tab
  const [collapsedPlans, setCollapsedPlans] = useState<Set<string>>(new Set());

  // Child members filter
  const studentMembers = useMemo(() => 
    familyMembers.filter(m => m.role && m.role.includes('Çocuk')), 
  [familyMembers]);

  useEffect(() => {
    if (studentMembers.length > 0 && !selectedStudent) {
      setSelectedStudent(studentMembers[0]);
    }
  }, [studentMembers, selectedStudent]);

  useEffect(() => {
    let unsubPlans = () => {};
    let unsubAssignments = () => {};
    
    try {
      unsubPlans = onStudyPlansUpdate((plans) => {
        setStudyPlans(plans || []);
      });
      unsubAssignments = onStudyAssignmentsUpdate((data) => {
        setAssignments(data || []);
        setLoading(false);
      });
    } catch (e) {
      console.log('Error initializing listeners in StudyPlansScreen:', e);
      setLoading(false);
    }

    return () => {
      unsubPlans();
      unsubAssignments();
    };
  }, []);

  const handleStatusChange = async (assignment: StudyAssignment) => {
    const newStatus = assignment.status === 'assigned' ? 'completed' : 'assigned';
    const updateData: Partial<StudyAssignment> = {
      status: newStatus as any,
      completedAt: newStatus === 'completed' ? new Date().toISOString() : undefined,
    };
    try {
      await updateStudyAssignment(assignment.id, updateData);
      if (newStatus === 'completed') {
        Alert.alert('✅ Harika İş!', `"${assignment.topic}" konusunu tamamladın.`);
      }
    } catch (error) {
      Alert.alert('Hata', 'Durum güncellenirken bir hata oluştu.');
    }
  };

  const getStatusBadge = (assignment: StudyAssignment) => {
    const dueDate = parseISO(assignment.dueDate);
    if (assignment.status === 'completed') {
      return { 
        label: 'Tamamlandı', 
        bg: 'bg-emerald-50 dark:bg-emerald-950/20', 
        text: 'text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/30' 
      };
    }
    if (isPast(dueDate) && !isToday(dueDate)) {
      return { 
        label: 'Süresi Geçti', 
        bg: 'bg-rose-50 dark:bg-rose-950/20', 
        text: 'text-rose-600 dark:text-rose-450 border border-rose-100 dark:border-rose-900/30 font-bold' 
      };
    }
    if (isToday(dueDate)) {
      return { 
        label: 'Bugün Bitiyor', 
        bg: 'bg-amber-50 dark:bg-amber-950/20', 
        text: 'text-amber-600 dark:text-amber-450 border border-amber-100 dark:border-amber-900/30' 
      };
    }
    const diff = differenceInDays(dueDate, new Date());
    const daysLeft = diff > 0 ? diff : 1;
    return { 
      label: `${daysLeft} gün kaldı`, 
      bg: 'bg-blue-50 dark:bg-blue-950/20', 
      text: 'text-blue-650 dark:text-blue-400 border border-blue-100 dark:border-blue-900/30' 
    };
  };

  // Filter tasks for selected child
  const { pendingTasks, completedTasks } = useMemo(() => {
    if (!selectedStudent) return { pendingTasks: [], completedTasks: [] };
    
    const filtered = assignments
      .filter(a => a.studentId === selectedStudent.id)
      .sort((a, b) => parseISO(a.dueDate).getTime() - parseISO(b.dueDate).getTime());
      
    return {
      pendingTasks: filtered.filter(a => a.status !== 'completed'),
      completedTasks: filtered.filter(a => a.status === 'completed').reverse()
    };
  }, [selectedStudent, assignments]);

  const groupTasksByPlan = (tasks: StudyAssignment[]) => {
    const grouped: { [planId: string]: StudyAssignment[] } = {};
    tasks.forEach(t => {
      const p = t.studyPlanId || 'uncategorized';
      if (!grouped[p]) grouped[p] = [];
      grouped[p].push(t);
    });
    return Object.entries(grouped);
  };

  const pendingGrouped = useMemo(() => {
    return groupTasksByPlan(pendingTasks).map(([planId, tasks]) => {
      const plan = studyPlans.find(p => p.id === planId);
      if (plan) {
         const topicOrder: Record<string, number> = {};
         let index = 0;
         if (plan.subjects) {
           plan.subjects.forEach(subject => {
             if (subject.topics) {
               subject.topics.forEach(topic => {
                 topicOrder[topic.id] = index++;
               });
             }
           });
         }
         tasks.sort((a, b) => {
           const idxA = topicOrder[a.topicId] ?? 99999;
           const idxB = topicOrder[b.topicId] ?? 99999;
           return idxA - idxB;
         });
      }
      return [planId, tasks] as [string, StudyAssignment[]];
    });
  }, [pendingTasks, studyPlans]);

  const completedGrouped = useMemo(() => {
    return groupTasksByPlan(completedTasks).map(([planId, tasks]) => {
      const plan = studyPlans.find(p => p.id === planId);
      if (plan) {
         const topicOrder: Record<string, number> = {};
         let index = 0;
         if (plan.subjects) {
           plan.subjects.forEach(subject => {
             if (subject.topics) {
               subject.topics.forEach(topic => {
                 topicOrder[topic.id] = index++;
               });
             }
           });
         }
         tasks.sort((a, b) => {
           const idxA = topicOrder[a.topicId] ?? 99999;
           const idxB = topicOrder[b.topicId] ?? 99999;
           return idxA - idxB;
         });
      }
      return [planId, tasks] as [string, StudyAssignment[]];
    });
  }, [completedTasks, studyPlans]);

  const toggleCollapse = (planId: string) => {
    setCollapsedPlans(prev => {
      const next = new Set(prev);
      if (next.has(planId)) next.delete(planId);
      else next.add(planId);
      return next;
    });
  };

  const openSourceUrl = async (url: string) => {
    const formattedUrl = url.startsWith('http') ? url : `https://${url}`;
    try {
      const supported = await Linking.canOpenURL(formattedUrl);
      if (supported) {
        await Linking.openURL(formattedUrl);
      } else {
        Alert.alert('Hata', 'Bu bağlantı adresi açılamıyor: ' + url);
      }
    } catch (e) {
      Alert.alert('Hata', 'Bağlantı açılırken hata oluştu.');
    }
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 justify-center items-center bg-slate-50 dark:bg-slate-950">
        <ActivityIndicator size="large" color="#2563eb" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-slate-50 dark:bg-slate-950">
      <Stack.Screen options={{ headerShown: false }} />
      
      {/* HEADER */}
      <View className="p-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex-row justify-between items-center z-10 shadow-sm">
        <View className="flex-row items-center gap-4">
          <TouchableOpacity onPress={() => router.back()} className="w-10 h-10 items-center justify-center bg-slate-100 dark:bg-slate-800 rounded-full">
             <ArrowLeft size={20} color="#64748b" />
          </TouchableOpacity>
          <View>
            <Text className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">Konu Çalışma</Text>
            <Text className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Platform Education</Text>
          </View>
        </View>

        {/* Child Selector */}
        <View className="flex-row items-center gap-2">
          {studentMembers.map(student => {
            const isActive = selectedStudent?.id === student.id;
            return (
              <TouchableOpacity
                key={student.id}
                onPress={() => setSelectedStudent(student)}
                className={`w-9 h-9 rounded-full items-center justify-center border-2 overflow-hidden ${
                  isActive ? 'border-blue-500 shadow-md' : 'border-slate-200 dark:border-slate-800 opacity-60'
                }`}
                style={{ backgroundColor: student.color || '#4f46e5' }}
              >
                <Text className="text-white font-black text-xs uppercase">
                  {student.name.charAt(0)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* TABS TRAY */}
      <View className="p-3 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex-row justify-center">
        <View className="bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl flex-row w-full max-w-sm border border-slate-200/50 dark:border-slate-700/50">
          <TouchableOpacity
            onPress={() => setActiveTab('pending')}
            className={`flex-1 flex-row items-center justify-center py-2.5 rounded-xl ${
              activeTab === 'pending' ? 'bg-white dark:bg-slate-700 shadow-sm' : ''
            }`}
          >
            <Clock size={16} color={activeTab === 'pending' ? '#2563eb' : '#64748b'} className="mr-2" />
            <Text className={`text-xs font-bold ${activeTab === 'pending' ? 'text-blue-600 dark:text-white' : 'text-slate-500'}`}>
              Bekleyenler
            </Text>
            {pendingTasks.length > 0 && (
              <View className="bg-rose-500 rounded-full px-1.5 py-0.5 ml-1.5">
                <Text className="text-white text-[8px] font-bold">{pendingTasks.length}</Text>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setActiveTab('completed')}
            className={`flex-1 flex-row items-center justify-center py-2.5 rounded-xl ${
              activeTab === 'completed' ? 'bg-white dark:bg-slate-700 shadow-sm' : ''
            }`}
          >
            <CheckSquare size={16} color={activeTab === 'completed' ? '#10b981' : '#64748b'} className="mr-2" />
            <Text className={`text-xs font-bold ${activeTab === 'completed' ? 'text-emerald-600 dark:text-white' : 'text-slate-500'}`}>
              Tamamlananlar
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* LIST CONTENT */}
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 60 }} showsVerticalScrollIndicator={false}>
        {selectedStudent ? (
          activeTab === 'pending' ? (
            pendingTasks.length > 0 ? (
              pendingGrouped.map(([planId, tasks]) => {
                const plan = studyPlans.find(p => p.id === planId);
                const planTitle = plan?.title || "Genel Plan";
                const planDesc = plan?.description || "Atanmış genel görevler.";

                return (
                  <View key={planId} className="mb-8">
                    {/* Category Header */}
                    <View className="flex-row items-center gap-3 mb-4 pb-2 border-b border-slate-200/50 dark:border-slate-800/50">
                      <View className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-900/40 items-center justify-center">
                        <LayoutGrid size={18} color="#4f46e5" />
                      </View>
                      <View className="flex-1">
                        <Text className="text-base font-black text-slate-850 dark:text-white leading-tight">{planTitle}</Text>
                        <Text className="text-[10px] text-slate-400 dark:text-slate-500 font-bold mt-0.5" numberOfLines={1}>{planDesc}</Text>
                      </View>
                      <View className="bg-slate-100 dark:bg-slate-800 rounded-full px-2 py-0.5">
                        <Text className="text-slate-500 dark:text-slate-350 text-[10px] font-bold">{tasks.length}</Text>
                      </View>
                    </View>

                    {/* Task Cards Grid/List */}
                    <View className="space-y-4">
                      {tasks.map(assignment => {
                        const subject = assignment.subject || 'Diğer';
                        const theme = subjectThemes[subject] || subjectThemes['Diğer'];
                        const badge = getStatusBadge(assignment);

                        return (
                          <View
                            key={assignment.id}
                            className="bg-white dark:bg-slate-900 rounded-[24px] border border-slate-200/60 dark:border-slate-800 shadow-sm relative overflow-hidden flex-row"
                          >
                            {/* Decorative Left Side Gradient Strip */}
                            <LinearGradient
                              colors={theme.gradient}
                              start={{ x: 0, y: 0 }}
                              end={{ x: 0, y: 1 }}
                              className="w-2.5 absolute left-0 top-0 bottom-0"
                            />

                            <View className="flex-1 p-4 pl-6">
                              {/* Header info */}
                              <View className="flex-row items-center gap-2 mb-2 flex-wrap">
                                <View className={`px-2 py-0.5 rounded-lg border ${theme.bg} ${theme.border}`}>
                                  <Text className={`text-[8px] font-black uppercase tracking-wider ${theme.text}`}>
                                    {subject}
                                  </Text>
                                </View>
                                <View className={`px-2 py-0.5 rounded-lg ${badge.bg} ${badge.text}`}>
                                  <Text className="text-[8px] font-bold uppercase tracking-wider">
                                    {badge.label}
                                  </Text>
                                </View>
                              </View>

                              {/* Title */}
                              <Text className="text-sm font-bold text-slate-800 dark:text-slate-100 leading-snug mb-4">
                                {assignment.topic}
                              </Text>

                              {/* Footer Action items */}
                              <View className="flex-row items-center justify-between">
                                {/* Completed Checkbox */}
                                <TouchableOpacity
                                  onPress={() => handleStatusChange(assignment)}
                                  className="flex-row items-center gap-2"
                                  activeOpacity={0.7}
                                >
                                  {assignment.status === 'completed' ? (
                                    <CheckSquare size={22} color="#10b981" />
                                  ) : (
                                    <Square size={22} color={isDark ? '#475569' : '#cbd5e1'} />
                                  )}
                                  <Text className="text-xs font-black text-slate-500 dark:text-slate-400">
                                    Ödevi Bitirdim
                                  </Text>
                                </TouchableOpacity>

                                {/* Source Link button */}
                                {assignment.sources && assignment.sources.length > 0 && (
                                  <TouchableOpacity
                                    onPress={() => openSourceUrl(assignment.sources[0])}
                                    className="flex-row items-center gap-1.5 bg-slate-100 dark:bg-slate-800 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 active:scale-95"
                                  >
                                    <BookOpen size={13} color={isDark ? '#cbd5e1' : '#475569'} />
                                    <Text className="text-[10px] font-bold text-slate-700 dark:text-slate-350">
                                      Kaynak
                                    </Text>
                                  </TouchableOpacity>
                                )}
                              </View>
                            </View>
                          </View>
                        );
                      })}
                    </View>
                  </View>
                );
              })
            ) : (
              <View className="flex-col items-center justify-center py-20 text-center bg-white/50 dark:bg-slate-900/50 rounded-[32px] border border-slate-250/60 dark:border-slate-800 p-6 shadow-sm">
                <View className="w-16 h-16 rounded-2xl bg-emerald-100 dark:bg-emerald-900/40 items-center justify-center mb-4">
                  <Sparkles size={32} color="#10b981" />
                </View>
                <Text className="text-lg font-black text-slate-850 dark:text-white mb-1">Harika İş!</Text>
                <Text className="text-slate-400 dark:text-slate-500 text-xs text-center leading-relaxed">
                  Bekleyen hiçbir çalışma görevi kalmadı. Yeni konular eklenene kadar dinlenebilirsin.
                </Text>
              </View>
            )
          ) : (
            // COMPLETED TAB (Accordion-style grouped lists)
            completedTasks.length > 0 ? (
              <View className="space-y-4">
                {completedGrouped.map(([planId, tasks]) => {
                  const plan = studyPlans.find(p => p.id === planId);
                  const planTitle = plan?.title || "Genel Plan";
                  const isCollapsed = collapsedPlans.has(planId);

                  return (
                    <View 
                      key={`completed-${planId}`}
                      className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-850 shadow-sm overflow-hidden"
                    >
                      {/* Accordion Trigger Header */}
                      <TouchableOpacity
                        onPress={() => toggleCollapse(planId)}
                        activeOpacity={0.8}
                        className="p-4 flex-row items-center justify-between bg-slate-50/50 dark:bg-slate-950/20"
                      >
                        <View className="flex-row items-center gap-3 flex-1 mr-2">
                          <View className="w-1.5 h-5 rounded-full bg-slate-300 dark:bg-slate-700" />
                          <Text className="text-sm font-bold text-slate-500 dark:text-slate-400 truncate" numberOfLines={1}>
                            {planTitle}
                          </Text>
                          <Text className="text-xs text-slate-400 dark:text-slate-550 font-semibold">
                            ({tasks.length})
                          </Text>
                        </View>
                        <View className="w-7 h-7 bg-white dark:bg-slate-800 rounded-full items-center justify-center shadow-sm">
                          {isCollapsed ? (
                            <ChevronDown size={14} color="#94a3b8" />
                          ) : (
                            <ChevronUp size={14} color="#94a3b8" />
                          )}
                        </View>
                      </TouchableOpacity>

                      {/* Accordion Content */}
                      {!isCollapsed && (
                        <View className="border-t border-slate-100 dark:border-slate-850/50 divide-y divide-slate-100 dark:divide-slate-850/40">
                          {tasks.map(assignment => {
                            const subject = assignment.subject || 'Diğer';
                            const badge = getStatusBadge(assignment);

                            return (
                              <View 
                                key={assignment.id}
                                className="p-4 flex-row items-center justify-between gap-3"
                              >
                                <View className="flex-row items-start gap-3 flex-1">
                                  <TouchableOpacity
                                    onPress={() => handleStatusChange(assignment)}
                                    className="mt-0.5"
                                    activeOpacity={0.7}
                                  >
                                    <CheckSquare size={20} color="#94a3b8" />
                                  </TouchableOpacity>
                                  <View className="flex-1">
                                    <Text className="text-sm font-bold text-slate-400 dark:text-slate-500 line-through decoration-slate-300">
                                      {assignment.topic}
                                    </Text>
                                    <Text className="text-[9px] font-black text-slate-400 mt-1 uppercase tracking-wider">
                                      {subject}
                                    </Text>
                                  </View>
                                </View>
                                <View className={`px-2 py-0.5 rounded-lg ${badge.bg} ${badge.text}`}>
                                  <Text className="text-[8px] font-bold uppercase tracking-wider">
                                    {badge.label}
                                  </Text>
                                </View>
                              </View>
                            );
                          })}
                        </View>
                      )}
                    </View>
                  );
                })}
              </View>
            ) : (
              <View className="flex-col items-center justify-center py-20 text-center">
                <GraduationCap size={48} color="#cbd5e1" className="mb-4 opacity-70" />
                <Text className="text-slate-500 dark:text-slate-400 text-sm font-black mb-1">Henüz Tamamlanan Yok</Text>
                <Text className="text-slate-400 dark:text-slate-550 text-xs">Çalışmalarını bitirdikçe burada arşivlenecek.</Text>
              </View>
            )
          )
        ) : (
          <ActivityIndicator size="large" color="#2563eb" className="py-20" />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
