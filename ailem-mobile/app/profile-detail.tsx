import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useEffect, useState } from 'react';
import { ChevronLeft, User, Trophy, CalendarDays, TrendingUp } from 'lucide-react-native';
import { useRouter, Stack, useLocalSearchParams } from 'expo-router';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { FamilyMember } from '../lib/data';

export default function ProfileDetailScreen() {
  const router = useRouter();
  const { memberId } = useLocalSearchParams();
  const [member, setMember] = useState<FamilyMember | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!memberId) return;
    
    let unsubscribe: any;
    try {
      unsubscribe = onSnapshot(doc(db, 'familyMembers', memberId as string), (snapshot) => {
        if (snapshot.exists()) {
          setMember({ id: snapshot.id, ...snapshot.data() } as FamilyMember);
        }
        setLoading(false);
      });
    } catch (e) {
      console.log('Error fetching member details:', e);
      setLoading(false);
    }

    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, [memberId]);

  if (loading) {
    return (
      <SafeAreaView className="flex-1 justify-center items-center bg-slate-50 dark:bg-slate-950">
        <ActivityIndicator size="large" color="#0ea5e9" />
      </SafeAreaView>
    );
  }

  if (!member) {
    return (
      <SafeAreaView className="flex-1 bg-slate-50 dark:bg-slate-950">
        <Stack.Screen options={{ headerShown: false }} />
        <View className="p-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex-row items-center">
          <TouchableOpacity onPress={() => router.back()} className="w-10 h-10 items-center justify-center bg-slate-100 dark:bg-slate-800 rounded-full mr-4">
             <ChevronLeft size={24} color="#64748b" />
          </TouchableOpacity>
          <Text className="text-xl font-bold text-slate-900 dark:text-white">Üye Bulunamadı</Text>
        </View>
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
        <Text className="text-2xl font-bold text-slate-900 dark:text-white">Profil Karnesi</Text>
        <TouchableOpacity className="w-10 h-10 items-center justify-center bg-sky-100 dark:bg-sky-900/50 rounded-full">
           <Trophy size={20} color="#0ea5e9" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerClassName="p-4" showsVerticalScrollIndicator={false}>
         
         <View className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-sm border border-slate-100 dark:border-slate-800 items-center mb-6 mt-4">
             {member.avatar ? (
                <Image source={{ uri: member.avatar }} className="w-24 h-24 rounded-full mb-4 border-4 border-sky-100 dark:border-sky-900" />
             ) : (
                <View className="w-24 h-24 bg-sky-100 dark:bg-sky-900/30 rounded-full items-center justify-center mb-4 border-4 border-white dark:border-slate-800 shadow-sm">
                   <User size={48} color="#0ea5e9" />
                </View>
             )}
             <Text className="text-2xl font-bold text-slate-900 dark:text-white mb-1">{member.name}</Text>
             <View className="bg-sky-100 dark:bg-sky-900/30 px-3 py-1 rounded-full">
                <Text className="text-sky-600 dark:text-sky-400 font-bold capitalize">{(member.role === 'Anne' || member.role === 'Baba') ? 'Ebeveyn' : 'Çocuk'}</Text>
             </View>
         </View>

         <View className="flex-row justify-between mb-6">
            <View className="bg-white dark:bg-slate-900 p-4 rounded-3xl flex-1 mr-2 shadow-sm border border-slate-100 dark:border-slate-800 items-center">
               <View className="w-10 h-10 bg-emerald-100 rounded-full items-center justify-center mb-2">
                  <CalendarDays size={20} color="#10b981" />
               </View>
               <Text className="text-xl font-bold text-slate-800 dark:text-slate-100">85</Text>
               <Text className="text-xs text-slate-500 font-medium">Görevler</Text>
            </View>
            <View className="bg-white dark:bg-slate-900 p-4 rounded-3xl flex-1 mx-2 shadow-sm border border-slate-100 dark:border-slate-800 items-center">
               <View className="w-10 h-10 bg-amber-100 rounded-full items-center justify-center mb-2">
                  <Trophy size={20} color="#f59e0b" />
               </View>
               <Text className="text-xl font-bold text-slate-800 dark:text-slate-100">1,250</Text>
               <Text className="text-xs text-slate-500 font-medium">Puan</Text>
            </View>
            <View className="bg-white dark:bg-slate-900 p-4 rounded-3xl flex-1 ml-2 shadow-sm border border-slate-100 dark:border-slate-800 items-center">
               <View className="w-10 h-10 bg-pink-100 rounded-full items-center justify-center mb-2">
                  <TrendingUp size={20} color="#ec4899" />
               </View>
               <Text className="text-xl font-bold text-slate-800 dark:text-slate-100">%92</Text>
               <Text className="text-xs text-slate-500 font-medium">Başarı</Text>
            </View>
         </View>

         <View className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-sm border border-slate-100 dark:border-slate-800">
            <Text className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-4">Son Aktiviteler</Text>
            <View className="border-l-2 border-slate-100 dark:border-slate-800 ml-3 pl-4 pb-4">
               <View className="w-3 h-3 bg-sky-500 rounded-full absolute -left-[7px] top-1"></View>
               <Text className="text-slate-800 dark:text-slate-200 font-bold mb-1">Matematik Denemesi Tamamlandı</Text>
               <Text className="text-slate-500 text-sm">2 saat önce</Text>
            </View>
            <View className="border-l-2 border-slate-100 dark:border-slate-800 ml-3 pl-4 pb-4">
               <View className="w-3 h-3 bg-emerald-500 rounded-full absolute -left-[7px] top-1"></View>
               <Text className="text-slate-800 dark:text-slate-200 font-bold mb-1">Yeni Hedef Eklendi</Text>
               <Text className="text-slate-500 text-sm">Dün, 14:30</Text>
            </View>
            <View className="ml-3 pl-4">
               <View className="w-3 h-3 bg-amber-500 rounded-full absolute -left-[7px] top-1"></View>
               <Text className="text-slate-800 dark:text-slate-200 font-bold mb-1">Kitap Okuma Serisi: 7 Gün</Text>
               <Text className="text-slate-500 text-sm">3 gün önce</Text>
            </View>
         </View>
         <View className="h-10"></View>
      </ScrollView>
    </SafeAreaView>
  );
}
