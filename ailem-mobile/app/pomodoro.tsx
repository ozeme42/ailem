import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useEffect, useState, useRef } from 'react';
import { onPomodoroProjectsUpdate } from '../lib/dataService';
import { PomodoroProject } from '../lib/data';
import { Timer, ChevronLeft, Play, Square, Plus } from 'lucide-react-native';
import { useRouter, Stack } from 'expo-router';
import { useAuth } from '../context/auth-context';
import { collection, addDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

export default function PomodoroScreen() {
  const [projects, setProjects] = useState<PomodoroProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeProject, setActiveProject] = useState<PomodoroProject | null>(null);
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const { user, familyId } = useAuth();
  const router = useRouter();
  const timerRef = useRef<any>(null);

  useEffect(() => {
    let unsubscribe: any;
    if (user) {
      try {
        unsubscribe = onPomodoroProjectsUpdate(user.uid, (data) => {
          setProjects(data);
          setLoading(false);
        });
      } catch (e) {
        console.log('Error fetching pomodoro:', e);
        setLoading(false);
      }
    }

    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [user]);

  const toggleTimer = () => {
    if (isRunning) {
      if (timerRef.current) clearInterval(timerRef.current);
      setIsRunning(false);
    } else {
      setIsRunning(true);
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
             handleSessionComplete();
             return 25 * 60;
          }
          return prev - 1;
        });
      }, 1000);
    }
  };

  const handleSessionComplete = async () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setIsRunning(false);
    setTimeLeft(25 * 60);

    if (activeProject && familyId && user) {
       try {
         await addDoc(collection(db, 'pomodoroSessions'), {
           familyId,
           projectId: activeProject.id,
           memberId: user.uid,
           startTime: new Date(Date.now() - 25 * 60000).toISOString(),
           endTime: new Date().toISOString(),
           durationSeconds: 25 * 60
         });
         
         await updateDoc(doc(db, 'pomodoroProjects', activeProject.id), {
           trackedTimeSeconds: (activeProject.trackedTimeSeconds || 0) + (25 * 60)
         });
       } catch (e) {
         console.error(e);
       }
    }
  };

  const selectProject = (p: PomodoroProject) => {
    if (isRunning) return;
    setActiveProject(p);
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 justify-center items-center bg-slate-50 dark:bg-slate-950">
        <ActivityIndicator size="large" color="#f43f5e" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-slate-50 dark:bg-slate-950">
      <Stack.Screen options={{ headerShown: false }} />
      <View className="p-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex-row justify-between items-center">
        <TouchableOpacity onPress={() => router.back()} className="w-10 h-10 items-center justify-center bg-slate-100 dark:bg-slate-800 rounded-full">
           <ChevronLeft size={24} color="#64748b" />
        </TouchableOpacity>
        <Text className="text-2xl font-bold text-slate-900 dark:text-white">Odaklanma</Text>
        <TouchableOpacity className="bg-rose-500 w-10 h-10 rounded-full items-center justify-center shadow-sm">
          <Plus size={24} color="white" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerClassName="p-4" showsVerticalScrollIndicator={false}>
         <View className="items-center mt-6 mb-10">
            <View className={`w-64 h-64 rounded-full items-center justify-center border-8 ${isRunning ? 'bg-rose-50 border-rose-200 dark:bg-rose-900/30 dark:border-rose-800' : 'bg-slate-50 border-slate-200 dark:bg-slate-900 dark:border-slate-800'}`}>
               <Text className={`text-6xl font-bold ${isRunning ? 'text-rose-500' : 'text-slate-700 dark:text-slate-300'}`}>
                 {formatTime(timeLeft)}
               </Text>
               <Text className="text-slate-500 font-medium mt-2">{activeProject ? activeProject.title : 'Proje Seçin'}</Text>
            </View>

            <View className="flex-row mt-8 space-x-4">
              <TouchableOpacity 
                onPress={toggleTimer}
                disabled={!activeProject}
                className={`${!activeProject ? 'bg-slate-300 dark:bg-slate-800' : (isRunning ? 'bg-amber-500' : 'bg-rose-500')} w-16 h-16 rounded-full items-center justify-center shadow-sm mx-2`}
              >
                {isRunning ? <Square size={24} color="white" fill="white" /> : <Play size={24} color="white" fill="white" />}
              </TouchableOpacity>
            </View>
         </View>

         <Text className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-4">Projeler</Text>
         {projects.length === 0 ? (
           <View className="bg-white dark:bg-slate-900 p-6 rounded-3xl items-center border border-slate-100 dark:border-slate-800">
              <Text className="text-slate-500 text-center">Henüz bir odaklanma projesi eklemediniz.</Text>
           </View>
         ) : (
           projects.map(p => (
             <TouchableOpacity 
               key={p.id}
               onPress={() => selectProject(p)}
               className={`flex-row items-center p-4 mb-3 rounded-3xl border ${activeProject?.id === p.id ? 'bg-rose-50 border-rose-200 dark:bg-rose-900/20 dark:border-rose-800' : 'bg-white border-slate-100 dark:bg-slate-900 dark:border-slate-800'}`}
             >
                <View className="w-12 h-12 rounded-xl items-center justify-center mr-4" style={{ backgroundColor: `${p.color || '#f43f5e'}20` }}>
                  <Timer size={24} color={p.color || '#f43f5e'} />
                </View>
                <View className="flex-1">
                  <Text className="font-bold text-lg text-slate-800 dark:text-slate-100">{p.title}</Text>
                  <Text className="text-slate-500 text-sm">{(p.trackedTimeSeconds / 60).toFixed(0)} dk odaklanıldı</Text>
                </View>
             </TouchableOpacity>
           ))
         )}
         <View className="h-10"></View>
      </ScrollView>
    </SafeAreaView>
  );
}
