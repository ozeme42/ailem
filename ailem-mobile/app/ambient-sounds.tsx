import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useEffect, useState } from 'react';
import { onAmbientSoundsUpdate } from '../lib/dataService';
import { AmbientSound } from '../lib/data';
import { Headphones, ChevronLeft, Play, Square } from 'lucide-react-native';
import { useRouter, Stack } from 'expo-router';

export default function AmbientSoundsScreen() {
  const [sounds, setSounds] = useState<AmbientSound[]>([]);
  const [loading, setLoading] = useState(true);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    let unsubscribe: any;
    try {
      unsubscribe = onAmbientSoundsUpdate((data: AmbientSound[]) => {
        setSounds(data);
        setLoading(false);
      });
    } catch (e) {
      console.log('Error fetching sounds:', e);
      setLoading(false);
    }

    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, []);

  const toggleSound = (id: string) => {
    if (playingId === id) setPlayingId(null);
    else setPlayingId(id);
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 justify-center items-center bg-slate-50 dark:bg-slate-950">
        <ActivityIndicator size="large" color="#14b8a6" />
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
        <Text className="text-2xl font-bold text-slate-900 dark:text-white">Odaklanma Sesleri</Text>
        <View className="w-10 h-10" />
      </View>

      <ScrollView contentContainerClassName="p-4" showsVerticalScrollIndicator={false}>
         
         <View className="bg-teal-500 rounded-3xl p-6 mb-6 shadow-sm flex-row items-center justify-between">
            <View>
              <Text className="text-teal-100 font-medium mb-1">Odaklanmayı Artırın</Text>
              <Text className="text-white text-lg font-bold w-48">Ders çalışırken veya okurken rahatlatıcı sesler dinleyin.</Text>
            </View>
            <View className="w-16 h-16 bg-white/20 rounded-full items-center justify-center border-4 border-white/30">
               <Headphones size={28} color="white" />
            </View>
         </View>

         {sounds.length === 0 ? (
           <View className="items-center justify-center mt-10">
             <View className="w-20 h-20 bg-teal-50 dark:bg-teal-900/30 rounded-full items-center justify-center mb-4">
                <Headphones size={40} color="#14b8a6" />
             </View>
             <Text className="text-slate-500 text-lg font-medium text-center">Ses kütüphanesi boş.</Text>
           </View>
         ) : (
           sounds.map(sound => (
             <TouchableOpacity 
               key={sound.id} 
               onPress={() => toggleSound(sound.id)}
               className={`flex-row items-center p-4 mb-4 rounded-3xl border shadow-sm ${playingId === sound.id ? 'bg-teal-50 border-teal-200 dark:bg-teal-900/30 dark:border-teal-800' : 'bg-white border-slate-100 dark:bg-slate-900 dark:border-slate-800'}`}
             >
                <View className="w-12 h-12 bg-teal-100 dark:bg-teal-900/50 rounded-xl items-center justify-center mr-4">
                   <Headphones size={24} color="#0d9488" />
                </View>
                <View className="flex-1">
                   <Text className={`font-bold text-lg ${playingId === sound.id ? 'text-teal-700 dark:text-teal-400' : 'text-slate-800 dark:text-slate-100'}`}>{sound.name}</Text>
                   <Text className="text-slate-500 text-sm">Rahatlatıcı Ses</Text>
                </View>
                <View className={`w-10 h-10 rounded-full items-center justify-center ${playingId === sound.id ? 'bg-teal-500' : 'bg-slate-100 dark:bg-slate-800'}`}>
                   {playingId === sound.id ? <Square size={16} color="white" fill="white" /> : <Play size={16} color="#64748b" fill="#64748b" />}
                </View>
             </TouchableOpacity>
           ))
         )}
         <View className="h-10"></View>
      </ScrollView>
    </SafeAreaView>
  );
}
