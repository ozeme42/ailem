import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useEffect, useState } from 'react';
import { onSinglePrayerProgressUpdate } from '../lib/dataService';
import { PrayerProgress } from '../lib/data';
import { Heart, ChevronLeft, Plus, CheckCircle2, Circle, Moon, Sun, Sunrise, Sunset, CloudMoon } from 'lucide-react-native';
import { useRouter, Stack } from 'expo-router';
import { useAuth } from '../context/auth-context';
import { format } from 'date-fns';
import { doc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

const PRAYERS = [
  { id: 'fajr', name: 'Sabah', icon: Sunrise, color: '#f59e0b' },
  { id: 'dhuhr', name: 'Öğle', icon: Sun, color: '#3b82f6' },
  { id: 'asr', name: 'İkindi', icon: CloudMoon, color: '#8b5cf6' },
  { id: 'maghrib', name: 'Akşam', icon: Sunset, color: '#f97316' },
  { id: 'isha', name: 'Yatsı', icon: Moon, color: '#1e293b' },
];

export default function PrayersScreen() {
  const [progress, setProgress] = useState<PrayerProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const { user, familyId } = useAuth();
  
  const today = format(new Date(), 'yyyy-MM-dd');

  useEffect(() => {
    let unsubscribe: any;
    if (user) {
      try {
        unsubscribe = onSinglePrayerProgressUpdate(user.uid, (data) => {
          setProgress(data);
          setLoading(false);
        });
      } catch (e) {
        console.log('Error fetching prayers:', e);
        setLoading(false);
      }
    }

    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, [user]);

  const togglePrayer = async (prayerName: string, isCompleted: boolean) => {
    if (!user || !familyId) return;

    try {
      const allCompletions = JSON.parse(JSON.stringify(progress?.completions || {}));
      const dayCompletions: string[] = allCompletions[today] || [];
      
      const newDayCompletions = isCompleted
          ? dayCompletions.filter((p: string) => p !== prayerName)
          : [...dayCompletions, prayerName];
          
      allCompletions[today] = newDayCompletions;

      await setDoc(doc(db, 'prayerProgress', user.uid), {
        familyId,
        memberId: user.uid,
        completions: allCompletions
      }, { merge: true });
    } catch (e) {
      console.error(e);
    }
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 justify-center items-center bg-slate-50 dark:bg-slate-950">
        <ActivityIndicator size="large" color="#10b981" />
      </SafeAreaView>
    );
  }

  const todayCompletions = progress?.completions?.[today] || [];
  const completedCount = PRAYERS.filter(p => todayCompletions.includes(p.name)).length;

  return (
    <SafeAreaView className="flex-1 bg-slate-50 dark:bg-slate-950">
      <Stack.Screen options={{ headerShown: false }} />
      <View className="p-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex-row justify-between items-center">
        <TouchableOpacity onPress={() => router.back()} className="w-10 h-10 items-center justify-center bg-slate-100 dark:bg-slate-800 rounded-full">
           <ChevronLeft size={24} color="#64748b" />
        </TouchableOpacity>
        <Text className="text-xl font-bold text-slate-900 dark:text-white">İbadet Takibi</Text>
        <TouchableOpacity className="bg-emerald-500 w-10 h-10 rounded-full items-center justify-center shadow-sm">
           <Plus size={24} color="white" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerClassName="p-4" showsVerticalScrollIndicator={false}>
         
         <View className="bg-emerald-500 rounded-3xl p-6 mb-6 shadow-sm flex-row items-center justify-between overflow-hidden relative">
            <View className="absolute -right-5 -bottom-5 opacity-20">
               <Heart size={120} color="white" />
            </View>
            <View>
              <Text className="text-emerald-100 font-medium mb-1">Bugünkü Vakitler</Text>
              <Text className="text-white text-3xl font-bold">{completedCount} / 5</Text>
            </View>
         </View>

         <Text className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-4">Bugün</Text>

         {PRAYERS.map(prayer => {
            const Icon = prayer.icon;
            const isCompleted = todayCompletions.includes(prayer.name);

            return (
              <TouchableOpacity 
                key={prayer.id}
                onPress={() => togglePrayer(prayer.name, isCompleted)}
                className={`flex-row items-center p-4 mb-4 rounded-3xl border ${isCompleted ? 'bg-emerald-50 border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-800' : 'bg-white border-slate-100 dark:bg-slate-900 dark:border-slate-800'}`}
              >
                 <View className="w-12 h-12 rounded-xl items-center justify-center mr-4" style={{ backgroundColor: isCompleted ? '#10b98120' : `${prayer.color}20` }}>
                   {isCompleted ? <CheckCircle2 size={24} color="#10b981" /> : <Icon size={24} color={prayer.color} />}
                 </View>
                 <View className="flex-1">
                   <Text className={`font-bold text-lg ${isCompleted ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-800 dark:text-slate-100'}`}>{prayer.name}</Text>
                   <Text className="text-slate-500 text-sm">{isCompleted ? 'Kılındı' : 'Bekliyor'}</Text>
                 </View>
                 <View className="ml-2">
                    {isCompleted ? (
                      <View className="w-6 h-6 rounded-full bg-emerald-500 items-center justify-center">
                         <CheckCircle2 size={14} color="white" />
                      </View>
                    ) : (
                      <Circle size={24} color="#cbd5e1" />
                    )}
                 </View>
              </TouchableOpacity>
            );
         })}
         <View className="h-10"></View>
      </ScrollView>
    </SafeAreaView>
  );
}
