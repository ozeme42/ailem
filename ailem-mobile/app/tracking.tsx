import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useEffect, useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, BookOpen, Video as VideoIcon, Flame, CheckCircle2, Circle, Activity } from 'lucide-react-native';
import { useRouter, Stack } from 'expo-router';
import { useAuth } from '../context/auth-context';
import { 
  onBooksUpdate, onUserLibrariesUpdate, onTasksUpdate, onVideosUpdate, 
  onMemorizationItemsUpdate, onMemorizationProgressUpdate, onDailyTrackingsUpdate, 
  setDailyTrackingStatus 
} from '../lib/dataService';
import { 
  Book as BookType, UserLibrary, FamilyMember, Task, Video, 
  MemorizationItem, MemorizationProgress, DailyTracking, TrackableItemType 
} from '../lib/data';
import { format, startOfWeek, addDays, subDays, isSameDay, isFuture, parseISO } from 'date-fns';
import { tr } from 'date-fns/locale';

type TrackableItem = {
    id: string;
    type: TrackableItemType;
    title: string;
    icon: any;
    color: string;
    bgColor: string;
};

export default function TrackingScreen() {
  const router = useRouter();
  const { user, familyId, familyMembers } = useAuth();
  
  const [selectedMember, setSelectedMember] = useState<FamilyMember | null>(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());

  // Data states
  const [books, setBooks] = useState<BookType[]>([]);
  const [userLibraries, setUserLibraries] = useState<UserLibrary[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [videos, setVideos] = useState<Video[]>([]);
  const [memorizationItems, setMemorizationItems] = useState<MemorizationItem[]>([]);
  const [memorizationProgress, setMemorizationProgress] = useState<MemorizationProgress[]>([]);
  const [dailyTrackings, setDailyTrackings] = useState<DailyTracking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
      if (familyMembers.length > 0 && !selectedMember) {
          const child = familyMembers.find(m => m.role.includes('Çocuk'));
          setSelectedMember(child || familyMembers[0]);
      }
  }, [familyMembers, selectedMember]);

  useEffect(() => {
      if (!selectedMember || !familyId) return;

      setLoading(true);
      const unsubBooks = onBooksUpdate((data) => setBooks(data));
      const unsubLibraries = onUserLibrariesUpdate(familyId, (data) => setUserLibraries(data));
      const unsubTasks = onTasksUpdate((data) => setTasks(data));
      const unsubVideos = onVideosUpdate((data) => setVideos(data));
      const unsubMemorizationItems = onMemorizationItemsUpdate((data) => setMemorizationItems(data));
      const unsubMemorizationProgress = onMemorizationProgressUpdate((data) => setMemorizationProgress(data));
      const unsubDailyTrackings = onDailyTrackingsUpdate(familyId, selectedMember.id, (data) => {
          setDailyTrackings(data || []);
          setLoading(false);
      });

      return () => {
          unsubBooks();
          unsubLibraries();
          unsubTasks();
          unsubVideos();
          unsubMemorizationItems();
          unsubMemorizationProgress();
          unsubDailyTrackings();
      };
  }, [selectedMember, familyId]);

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const trackableItems: TrackableItem[] = useMemo(() => {
      if (!selectedMember) return [];

      const itemsList: TrackableItem[] = [];

      const memberLib = userLibraries.find(lib => lib.memberId === selectedMember.id);
      if (memberLib?.books) {
          memberLib.books.forEach(b => {
              if (b.status === 'reading') {
                  const bookDetail = books.find(bd => bd.id === b.bookId);
                  if (bookDetail) {
                      itemsList.push({
                          id: bookDetail.id,
                          type: 'book',
                          title: bookDetail.title,
                          icon: BookOpen,
                          color: '#10b981',
                          bgColor: '#e8f8f5'
                      });
                  }
              }
          });
      }

      videos.forEach(v => {
          if (v.assigneeId === selectedMember.id && (v.completedVideos || 0) < v.totalVideos) {
              itemsList.push({
                  id: v.id,
                  type: 'video',
                  title: v.title,
                  icon: VideoIcon,
                  color: '#ef4444',
                  bgColor: '#fadbd8'
              });
          }
      });

      tasks.forEach(t => {
          if (t.isRecurring && t.assigneeId === selectedMember.id) {
              itemsList.push({
                  id: t.id,
                  type: 'habit',
                  title: t.title,
                  icon: Flame,
                  color: '#f97316',
                  bgColor: '#fdebd0'
              });
          }
      });

      memorizationProgress.forEach(p => {
          if (p.memberId === selectedMember.id && !p.completed) {
              const itemDetail = memorizationItems.find(mi => mi.id === p.itemId);
              if (itemDetail) {
                  itemsList.push({
                      id: itemDetail.id,
                      type: 'memorization',
                      title: itemDetail.title,
                      icon: Activity,
                      color: '#6366f1',
                      bgColor: '#ebf5fb'
                  });
              }
          }
      });

      return itemsList;
  }, [selectedMember, userLibraries, books, videos, tasks, memorizationItems, memorizationProgress]);

  const handleCheck = async (item: TrackableItem, isChecked: boolean) => {
      if (!selectedMember) return;
      try {
          await setDailyTrackingStatus(selectedMember.id, { id: item.id, type: item.type }, selectedDate, isChecked);
      } catch (error) {
          console.error("Error updating tracking item:", error);
      }
  };

  const isChecked = (item: TrackableItem): boolean => {
      const dateKey = format(selectedDate, 'yyyy-MM-dd');
      return dailyTrackings.some(
          (tracking) =>
              tracking.date === dateKey &&
              tracking.itemId === item.id &&
              tracking.memberId === selectedMember?.id
      );
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-50 dark:bg-slate-950">
      <Stack.Screen options={{ headerShown: false }} />
      
      {/* Header */}
      <View className="p-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex-row justify-between items-center z-10 shadow-sm">
        <TouchableOpacity onPress={() => router.back()} className="w-10 h-10 items-center justify-center bg-slate-100 dark:bg-slate-800 rounded-full">
           <ChevronLeft size={24} color="#64748b" />
        </TouchableOpacity>
        <Text className="text-xl font-bold text-slate-900 dark:text-white">Takip Tablosu</Text>
        <TouchableOpacity className="w-10 h-10 items-center justify-center bg-indigo-50 dark:bg-indigo-900/30 rounded-full">
           <Activity size={20} color="#6366f1" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerClassName="p-4" showsVerticalScrollIndicator={false}>
         
         {/* Family Member Selector */}
         <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row mb-5 overflow-visible">
            {familyMembers.map((member) => (
                <TouchableOpacity
                    key={member.id}
                    className={`flex-row items-center p-2.5 px-4 rounded-full mr-3 border ${
                        selectedMember?.id === member.id 
                        ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm' 
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
                    }`}
                    onPress={() => setSelectedMember(member)}
                >
                     <View 
                        className="w-6 h-6 rounded-full flex items-center justify-center mr-2" 
                        style={{ backgroundColor: selectedMember?.id === member.id ? 'white' : member.color }}
                     >
                        <Text className={`font-bold text-xs ${selectedMember?.id === member.id ? 'text-indigo-600' : 'text-white'}`}>
                           {member.name.charAt(0).toUpperCase()}
                        </Text>
                    </View>
                    <Text className={`font-bold text-sm ${selectedMember?.id === member.id ? 'text-white' : 'text-slate-700 dark:text-slate-200'}`}>
                       {member.name}
                    </Text>
                </TouchableOpacity>
            ))}
         </ScrollView>

         {/* Weekly Navigation Strip */}
         <View className="bg-white dark:bg-slate-900 rounded-3xl p-4 shadow-sm border border-slate-100 dark:border-slate-800 mb-6">
            <View className="flex-row items-center justify-between mb-4">
               <TouchableOpacity onPress={() => setCurrentDate(d => subDays(d, 7))} className="p-1">
                  <ChevronLeft size={20} color="#64748b" />
               </TouchableOpacity>
               <Text className="font-bold text-slate-800 dark:text-slate-200 text-sm">
                  {format(weekStart, 'd MMMM', { locale: tr })} - {format(addDays(weekStart, 6), 'd MMMM yyyy', { locale: tr })}
               </Text>
               <TouchableOpacity onPress={() => setCurrentDate(d => addDays(d, 7))} className="p-1">
                  <ChevronRight size={20} color="#64748b" />
               </TouchableOpacity>
            </View>

            <View className="flex-row justify-between">
               {weekDays.map((day, idx) => {
                  const isSel = isSameDay(day, selectedDate);
                  const isFut = isFuture(day) && !isSameDay(day, new Date());
                  const dayStr = format(day, 'd');
                  const dayName = format(day, 'E', { locale: tr });
                  return (
                     <TouchableOpacity 
                       key={idx}
                       disabled={isFut}
                       onPress={() => setSelectedDate(day)}
                       className={`items-center p-2 rounded-2xl w-[13%] ${isSel ? 'bg-indigo-600 shadow-sm' : ''} ${isFut ? 'opacity-30' : ''}`}
                     >
                        <Text className={`text-[10px] font-bold ${isSel ? 'text-indigo-100' : 'text-slate-400'}`}>{dayName.substring(0, 2)}</Text>
                        <Text className={`text-base font-extrabold mt-1 ${isSel ? 'text-white' : 'text-slate-800 dark:text-slate-200'}`}>{dayStr}</Text>
                     </TouchableOpacity>
                  );
               })}
            </View>
         </View>

         {/* Daily Checklist */}
         <Text className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-4 px-2">
            {format(selectedDate, 'd MMMM yyyy, EEEE', { locale: tr })} İçin Takip
         </Text>

         {loading ? (
            <ActivityIndicator size="large" color="#6366f1" className="mt-10" />
         ) : trackableItems.length === 0 ? (
            <View className="bg-slate-100 dark:bg-slate-800 p-8 rounded-3xl items-center justify-center border border-slate-200 dark:border-slate-700 mt-2">
               <Activity size={32} color="#94a3b8" className="mb-2" />
               <Text className="text-slate-500 font-medium text-center">Bu güne ait aktif takip öğesi (kitap okuma, video ders, alışkanlık veya ezber) bulunmuyor.</Text>
            </View>
         ) : (
            trackableItems.map(item => {
              const checked = isChecked(item);
              const Icon = item.icon;
              return (
                <TouchableOpacity 
                  key={`${item.type}-${item.id}`} 
                  onPress={() => handleCheck(item, !checked)}
                  className={`flex-row items-center p-4 mb-3 rounded-2xl border ${
                     checked 
                     ? 'bg-indigo-50/50 border-indigo-200 dark:bg-indigo-950/20 dark:border-indigo-800' 
                     : 'bg-white border-slate-100 dark:bg-slate-900 dark:border-slate-800 shadow-sm'
                  }`}
                >
                   <View className="w-10 h-10 rounded-xl items-center justify-center mr-4" style={{ backgroundColor: item.bgColor }}>
                      <Icon size={20} color={item.color} />
                   </View>
                   <View className="flex-1">
                      <Text className={`font-bold text-base ${checked ? 'text-slate-400 line-through' : 'text-slate-800 dark:text-slate-200'}`} numberOfLines={1}>
                         {item.title}
                      </Text>
                      <Text className="text-slate-400 text-xs mt-0.5 font-medium uppercase tracking-wider">
                         {item.type === 'book' ? 'Kitap' : item.type === 'video' ? 'Video Ders' : item.type === 'habit' ? 'Alışkanlık' : 'Ezber'}
                      </Text>
                   </View>
                   <View className="ml-2">
                      {checked ? (
                        <CheckCircle2 size={24} color="#6366f1" />
                      ) : (
                        <Circle size={24} color="#cbd5e1" />
                      )}
                   </View>
                </TouchableOpacity>
              );
            })
         )}
         <View className="h-10"></View>
      </ScrollView>
    </SafeAreaView>
  );
}
