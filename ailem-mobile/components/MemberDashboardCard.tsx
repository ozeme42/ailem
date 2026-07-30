import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Image, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { format, isToday, parseISO, subDays } from 'date-fns';
import { tr } from 'date-fns/locale';
import { Clock, Flame, BrainCircuit, PlaySquare, BookOpen, ListChecks, Heart, Check, GraduationCap, ChevronRight } from 'lucide-react-native';
import { useAuth } from '../context/auth-context';
import { FamilyMember, Task, Test, StudyAssignment, UserLibrary, MemorizationProgress, MemorizationItem, Book as BookType, PrayerProgress, Video } from '../lib/data';
import { updateTask, updateHabitCompletion, updatePrayerProgress, updateFamilyMemberInFamily } from '../lib/dataService';

interface MemberDashboardCardProps {
  member: FamilyMember;
  tasks: Task[];
  tests: Test[];
  studyAssignments: StudyAssignment[];
  userLibraries: UserLibrary[];
  books: BookType[];
  videos: Video[];
  memorizationItems: MemorizationItem[];
  memorizationProgress: MemorizationProgress[];
  prayerProgress: PrayerProgress[];
  isDark: boolean;
  onNavigate: (route: string, params?: any) => void;
}

export default function MemberDashboardCard({
  member, tasks, tests, studyAssignments, userLibraries, books, videos,
  memorizationItems, memorizationProgress, prayerProgress, isDark, onNavigate
}: MemberDashboardCardProps) {
  const { familyId } = useAuth();
  
  const bgCard = isDark ? '#1e293b' : 'white';
  const textMain = isDark ? '#f8fafc' : '#0f172a';
  const textMuted = isDark ? '#94a3b8' : '#64748b';
  const border = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)';

  const {
    habits, pendingTasks, pendingTests, pendingStudies, readingBooks, pendingVideos, pendingMemorization, todaysPrayers
  } = useMemo(() => {
    const today = new Date();
    const todayKey = format(today, 'yyyy-MM-dd');
    const memberTasks = tasks.filter(t => t.assigneeId === member.id && !t.completed);
    
    const habits = memberTasks.filter(t => t.isRecurring);
    const otherTasks = memberTasks.filter(t => !t.isRecurring);
    const memberTests = tests.filter(t => t.studentId === member.id && t.status === 'Atandı');
    const memberStudies = studyAssignments.filter(s => s.studentId === member.id && s.status === 'assigned');
    
    const memberLib = userLibraries.find(l => l.memberId === member.id);
    const readingBooks = (memberLib?.books || []).filter(b => b.status === 'reading').map(b => {
      const detail = books.find(bk => bk.id === b.bookId);
      return detail ? { ...detail, progress: b.progress || 0 } : null;
    }).filter(Boolean) as (BookType & { progress: number })[];

    const pendingVideos = videos.filter(v => v.assigneeId === member.id && (v.completedVideos || 0) < v.totalVideos);
    
    const memProg = memorizationProgress.filter(p => p.memberId === member.id && !p.completed);
    const pendingMemorization = Array.from(new Set(memProg.map(p => p.itemId)))
      .map(id => memorizationItems.find(i => i.id === id))
      .filter(Boolean) as MemorizationItem[];

    const pData = prayerProgress.find(p => p.memberId === member.id);
    const todaysCompletions = pData?.completions?.[todayKey] || [];
    const prayerTimes = ["Sabah", "Öğle", "İkindi", "Akşam", "Yatsı"];
    const todaysPrayers = prayerTimes.map(p => ({
      name: p,
      completed: todaysCompletions.includes(p)
    }));

    return { habits, pendingTasks: otherTasks, pendingTests: memberTests, pendingStudies: memberStudies, readingBooks, pendingVideos, pendingMemorization, todaysPrayers };
  }, [member.id, tasks, tests, studyAssignments, userLibraries, books, videos, memorizationItems, memorizationProgress, prayerProgress]);

  const lastSevenDays = Array.from({ length: 7 }).map((_, i) => subDays(new Date(), i)).reverse();

  const handleTaskCompletion = async (task: Task) => {
    if (!familyId) return;
    try {
      await updateTask(task.id, { completed: true });
      const xp = task.points || 0;
      if (xp > 0) {
        await updateFamilyMemberInFamily(familyId, member.id, { xp: (member.xp || 0) + xp });
      }
    } catch (e) { Alert.alert('Hata', 'Görev güncellenemedi'); }
  };

  const handleHabitCompletion = async (habitId: string, day: Date) => {
    const habit = habits.find(h => h.id === habitId);
    if (!habit) return;
    const isCompleted = (habit.completedDates || []).includes(format(day, 'yyyy-MM-dd'));
    try { await updateHabitCompletion(habit.id, day, !isCompleted); } catch (e) {}
  };

  const handlePrayerCompletion = async (prayerName: string) => {
    if (!familyId) return;
    const todayKey = format(new Date(), 'yyyy-MM-dd');
    const pData = prayerProgress.find(p => p.memberId === member.id);
    const current = pData?.completions || {};
    const todays = current[todayKey] || [];
    const isCompleted = todays.includes(prayerName);
    
    const newTodays = isCompleted ? todays.filter((p: string) => p !== prayerName) : [...todays, prayerName];
    try {
      await updatePrayerProgress(member.id, { ...current, [todayKey]: newTodays });
      if (!isCompleted) {
        await updateFamilyMemberInFamily(familyId, member.id, { xp: (member.xp || 0) + 5 });
      }
    } catch (e) { Alert.alert('Hata', 'Namaz kaydedilemedi'); }
  };

  const isEmpty = habits.length === 0 && pendingTasks.length === 0 && pendingTests.length === 0 && pendingStudies.length === 0 && readingBooks.length === 0 && pendingVideos.length === 0 && pendingMemorization.length === 0 && todaysPrayers.filter(p => !p.completed).length === 0;

  if (isEmpty) {
    return (
      <View style={{ alignItems: 'center', padding: 30 }}>
        <Text style={{ fontSize: 40, marginBottom: 10 }}>🎉</Text>
        <Text style={{ color: textMain, fontWeight: '900', fontSize: 18 }}>Harika!</Text>
        <Text style={{ color: textMuted, fontWeight: '600', fontSize: 13, marginTop: 4 }}>Tüm görevler tamamlandı.</Text>
      </View>
    );
  }

  return (
    <View style={{ gap: 16 }}>
      
      {/* 1. NAMAZ TAKİBİ */}
      {member.role?.includes('Çocuk') && todaysPrayers.filter(p => !p.completed).length > 0 && (
        <View style={{ padding: 16, borderRadius: 24, backgroundColor: isDark ? 'rgba(13,148,136,0.1)' : 'rgba(204,251,241,0.5)', borderWidth: 1, borderColor: isDark ? 'rgba(13,148,136,0.2)' : 'rgba(13,148,136,0.2)' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 }}>
            <Clock size={16} color="#0d9488" />
            <Text style={{ color: '#0d9488', fontWeight: '900', fontSize: 11, textTransform: 'uppercase', letterSpacing: 1 }}>Namaz Takibi</Text>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', backgroundColor: bgCard, borderRadius: 16, padding: 8, borderWidth: 1, borderColor: border }}>
            {todaysPrayers.map(p => (
              <TouchableOpacity key={p.name} onPress={() => handlePrayerCompletion(p.name)} style={{ alignItems: 'center', flex: 1, gap: 6 }}>
                <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: p.completed ? '#14b8a6' : (isDark ? 'rgba(255,255,255,0.05)' : '#f0fdfa'), alignItems: 'center', justifyContent: 'center', borderWidth: p.completed ? 0 : 1, borderColor: isDark ? 'rgba(255,255,255,0.1)' : '#ccfbf1' }}>
                  <Heart size={20} color={p.completed ? 'white' : '#94a3b8'} fill={p.completed ? 'white' : 'transparent'} />
                </View>
                <Text style={{ fontSize: 10, fontWeight: '800', color: p.completed ? '#0d9488' : textMuted }}>{p.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* 2. ALIŞKANLIKLAR */}
      {habits.length > 0 && (
        <View style={{ padding: 16, borderRadius: 24, backgroundColor: isDark ? 'rgba(249,115,22,0.1)' : 'rgba(255,237,213,0.5)', borderWidth: 1, borderColor: isDark ? 'rgba(249,115,22,0.2)' : 'rgba(249,115,22,0.2)' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 }}>
            <Flame size={16} color="#ea580c" />
            <Text style={{ color: '#ea580c', fontWeight: '900', fontSize: 11, textTransform: 'uppercase', letterSpacing: 1 }}>Alışkanlık Zinciri</Text>
          </View>
          <View style={{ gap: 8 }}>
            {habits.map(habit => (
              <View key={habit.id} style={{ backgroundColor: bgCard, borderRadius: 16, padding: 12, borderWidth: 1, borderColor: border }}>
                <Text style={{ color: textMain, fontWeight: '800', fontSize: 13, marginBottom: 10 }}>{habit.title}</Text>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  {lastSevenDays.map(day => {
                    const isCompleted = (habit.completedDates || []).includes(format(day, 'yyyy-MM-dd'));
                    const isT = isToday(day);
                    return (
                      <TouchableOpacity key={day.toISOString()} onPress={() => handleHabitCompletion(habit.id, day)} style={{ alignItems: 'center', gap: 4 }}>
                        <View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: isCompleted ? '#f97316' : (isDark ? 'rgba(255,255,255,0.05)' : '#ffedd5'), alignItems: 'center', justifyContent: 'center', borderWidth: isCompleted ? 0 : 1, borderColor: isDark ? 'rgba(255,255,255,0.1)' : '#fed7aa', ...(isT && !isCompleted ? { borderWidth: 2, borderColor: '#fb923c' } : {}) }}>
                          {isCompleted && <Check size={16} color="white" strokeWidth={3} />}
                        </View>
                        <Text style={{ fontSize: 9, fontWeight: '800', textTransform: 'uppercase', color: isT ? '#ea580c' : textMuted }}>{format(day, 'EEE', { locale: tr }).slice(0, 1)}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* 3. EZBERLER */}
      {pendingMemorization.length > 0 && (
        <View style={{ padding: 16, borderRadius: 24, backgroundColor: isDark ? 'rgba(139,92,246,0.1)' : 'rgba(2ede9,213,255,0.5)', borderWidth: 1, borderColor: isDark ? 'rgba(139,92,246,0.2)' : 'rgba(139,92,246,0.2)' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 }}>
            <BrainCircuit size={16} color="#7c3aed" />
            <Text style={{ color: '#7c3aed', fontWeight: '900', fontSize: 11, textTransform: 'uppercase', letterSpacing: 1 }}>Ezberler</Text>
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
            {pendingMemorization.map(item => (
              <TouchableOpacity key={item.id} onPress={() => onNavigate('/memorization')} style={{ width: '48%', backgroundColor: bgCard, borderRadius: 16, padding: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: border }}>
                <Text style={{ color: textMain, fontWeight: '800', fontSize: 13, textAlign: 'center' }} numberOfLines={2}>{item.title}</Text>
                <View style={{ backgroundColor: isDark ? 'rgba(139,92,246,0.2)' : '#ede9fe', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, marginTop: 8 }}>
                  <Text style={{ color: '#7c3aed', fontSize: 9, fontWeight: '900' }}>ÇALIŞILIYOR</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* 4. VİDEOLAR */}
      {pendingVideos.length > 0 && (
        <View style={{ padding: 16, borderRadius: 24, backgroundColor: isDark ? 'rgba(244,63,94,0.1)' : 'rgba(255,228,230,0.5)', borderWidth: 1, borderColor: isDark ? 'rgba(244,63,94,0.2)' : 'rgba(244,63,94,0.2)' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 }}>
            <PlaySquare size={16} color="#e11d48" />
            <Text style={{ color: '#e11d48', fontWeight: '900', fontSize: 11, textTransform: 'uppercase', letterSpacing: 1 }}>Video Dersler</Text>
          </View>
          <View style={{ gap: 8 }}>
            {pendingVideos.map(v => (
              <TouchableOpacity key={v.id} onPress={() => onNavigate('/videos')} style={{ backgroundColor: bgCard, borderRadius: 16, padding: 12, borderWidth: 1, borderColor: border }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <Text style={{ color: textMain, fontWeight: '800', fontSize: 13, flex: 1 }} numberOfLines={1}>{v.title}</Text>
                  <View style={{ backgroundColor: isDark ? 'rgba(244,63,94,0.2)' : '#ffe4e6', padding: 6, borderRadius: 8 }}>
                    <PlaySquare size={14} color="#f43f5e" />
                  </View>
                </View>
                <View style={{ height: 6, backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : '#ffe4e6', borderRadius: 3, marginBottom: 4 }}>
                  <View style={{ height: '100%', backgroundColor: '#f43f5e', borderRadius: 3, width: `${((v.completedVideos || 0) / v.totalVideos) * 100}%` as any }} />
                </View>
                <Text style={{ color: '#f43f5e', fontSize: 10, fontWeight: '800', textAlign: 'right' }}>{v.completedVideos || 0} / {v.totalVideos} izlendi</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* 5. OKUMA KÖŞESİ */}
      {readingBooks.length > 0 && (
        <View style={{ padding: 16, borderRadius: 24, backgroundColor: isDark ? 'rgba(245,158,11,0.1)' : 'rgba(254,243,199,0.5)', borderWidth: 1, borderColor: isDark ? 'rgba(245,158,11,0.2)' : 'rgba(245,158,11,0.2)' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 }}>
            <BookOpen size={16} color="#d97706" />
            <Text style={{ color: '#d97706', fontWeight: '900', fontSize: 11, textTransform: 'uppercase', letterSpacing: 1 }}>Okuma Köşesi</Text>
          </View>
          <View style={{ gap: 8 }}>
            {readingBooks.map(b => (
              <TouchableOpacity key={b.id} onPress={() => onNavigate('/library')} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: bgCard, borderRadius: 16, padding: 12, borderWidth: 1, borderColor: border }}>
                <View style={{ width: 40, height: 56, borderRadius: 8, overflow: 'hidden', backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : '#fef3c7', alignItems: 'center', justifyContent: 'center' }}>
                  {b.image ? <Image source={{ uri: b.image }} style={{ width: '100%', height: '100%' }} /> : <BookOpen size={20} color="#f59e0b" opacity={0.5} />}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: textMain, fontWeight: '800', fontSize: 13 }} numberOfLines={1}>{b.title}</Text>
                  <Text style={{ color: textMuted, fontSize: 10, fontWeight: '600', marginTop: 2 }} numberOfLines={1}>{b.author}</Text>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6, marginBottom: 4 }}>
                    <Text style={{ color: '#d97706', fontSize: 9, fontWeight: '900' }}>%{b.progress}</Text>
                    <Text style={{ color: '#d97706', fontSize: 9, fontWeight: '900' }}>{Math.round((b.progress / 100) * (b.pageCount || 0))} / {b.pageCount} sf</Text>
                  </View>
                  <View style={{ height: 6, backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : '#fef3c7', borderRadius: 3 }}>
                    <View style={{ height: '100%', backgroundColor: '#f59e0b', borderRadius: 3, width: `${b.progress}%` as any }} />
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* 6. YAPILACAKLAR */}
      {(pendingTests.length > 0 || pendingStudies.length > 0 || pendingTasks.length > 0) && (
        <View style={{ padding: 16, borderRadius: 24, backgroundColor: isDark ? 'rgba(99,102,241,0.1)' : 'rgba(224,231,255,0.5)', borderWidth: 1, borderColor: isDark ? 'rgba(99,102,241,0.2)' : 'rgba(99,102,241,0.2)' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 }}>
            <ListChecks size={16} color="#4f46e5" />
            <Text style={{ color: '#4f46e5', fontWeight: '900', fontSize: 11, textTransform: 'uppercase', letterSpacing: 1 }}>Yapılacaklar</Text>
          </View>
          <View style={{ gap: 10 }}>
            {/* Tests & Studies */}
            {pendingTests.map(t => (
              <TouchableOpacity key={t.id} onPress={() => onNavigate('/education')} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: bgCard, borderRadius: 16, padding: 12, borderWidth: 1, borderColor: border }}>
                <View style={{ width: 4, height: '100%', backgroundColor: '#8b5cf6', borderRadius: 2, position: 'absolute', left: 0 }} />
                <View style={{ backgroundColor: isDark ? 'rgba(139,92,246,0.2)' : '#ede9fe', padding: 6, borderRadius: 8, marginLeft: 8 }}>
                  <GraduationCap size={16} color="#8b5cf6" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: textMain, fontWeight: '800', fontSize: 13 }}>{t.title || `${t.subject} - Sınav`}</Text>
                  <Text style={{ color: '#8b5cf6', fontSize: 9, fontWeight: '900', textTransform: 'uppercase', marginTop: 2 }}>{t.subject}</Text>
                </View>
                <ChevronRight size={16} color={textMuted} />
              </TouchableOpacity>
            ))}
            
            {pendingStudies.map(s => (
              <TouchableOpacity key={s.id} onPress={() => onNavigate('/education')} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: bgCard, borderRadius: 16, padding: 12, borderWidth: 1, borderColor: border }}>
                <View style={{ width: 4, height: '100%', backgroundColor: '#3b82f6', borderRadius: 2, position: 'absolute', left: 0 }} />
                <View style={{ backgroundColor: isDark ? 'rgba(59,130,246,0.2)' : '#dbeafe', padding: 6, borderRadius: 8, marginLeft: 8 }}>
                  <BookOpen size={16} color="#3b82f6" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: textMain, fontWeight: '800', fontSize: 13 }}>{s.topic}</Text>
                  <Text style={{ color: '#3b82f6', fontSize: 9, fontWeight: '900', textTransform: 'uppercase', marginTop: 2 }}>{s.subject} • Çalışma</Text>
                </View>
                <ChevronRight size={16} color={textMuted} />
              </TouchableOpacity>
            ))}

            {/* Tasks */}
            {pendingTasks.map(t => (
              <TouchableOpacity key={t.id} onPress={() => handleTaskCompletion(t)} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10, backgroundColor: bgCard, borderRadius: 16, padding: 12, borderWidth: 1, borderColor: border }}>
                <View style={{ width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: '#6366f1', marginTop: 2 }} />
                <View style={{ flex: 1 }}>
                  <Text style={{ color: textMain, fontWeight: '800', fontSize: 13 }}>{t.title}</Text>
                  {t.points > 0 && (
                    <View style={{ alignSelf: 'flex-start', backgroundColor: isDark ? 'rgba(99,102,241,0.2)' : '#e0e7ff', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, marginTop: 6 }}>
                      <Text style={{ color: '#4f46e5', fontSize: 9, fontWeight: '900' }}>+{t.points} XP</Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

    </View>
  );
}
