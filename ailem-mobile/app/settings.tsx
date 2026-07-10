import { View, Text, ScrollView, TouchableOpacity, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Moon, Bell, Shield, Smartphone, Globe, Sun } from 'lucide-react-native';
import { useRouter, Stack } from 'expo-router';
import { useState, useEffect } from 'react';
import { useColorScheme } from 'nativewind';

export default function SettingsScreen() {
  const router = useRouter();
  const { colorScheme, setColorScheme } = useColorScheme();
  const isDarkMode = colorScheme === 'dark';
  
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  return (
    <SafeAreaView className="flex-1 bg-slate-50 dark:bg-slate-950">
      <Stack.Screen options={{ headerShown: false }} />
      <View className="p-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex-row justify-between items-center shadow-sm z-10">
        <TouchableOpacity onPress={() => router.back()} className="w-10 h-10 items-center justify-center bg-slate-100 dark:bg-slate-800 rounded-full">
           <ChevronLeft size={24} color="#64748b" />
        </TouchableOpacity>
        <Text className="text-xl font-bold text-slate-900 dark:text-white">Ayarlar</Text>
        <View className="w-10 h-10" />
      </View>

      <ScrollView contentContainerClassName="p-4" showsVerticalScrollIndicator={false}>
         
         <Text className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3 ml-2 mt-2">Tercihler</Text>
         <View className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden mb-6">
            <View className="flex-row items-center justify-between p-4 border-b border-slate-100 dark:border-slate-800">
               <View className="flex-row items-center">
                  <View className={`w-10 h-10 ${isDarkMode ? 'bg-indigo-900/30' : 'bg-indigo-50'} rounded-xl items-center justify-center mr-4`}>
                     {isDarkMode ? <Moon size={20} color="#6366f1" /> : <Sun size={20} color="#6366f1" />}
                  </View>
                  <Text className="text-lg font-semibold text-slate-800 dark:text-slate-100">Karanlık Mod</Text>
               </View>
               <Switch 
                 value={isDarkMode} 
                 onValueChange={(val) => setColorScheme(val ? 'dark' : 'light')} 
                 trackColor={{ false: '#cbd5e1', true: '#818cf8' }}
                 thumbColor={isDarkMode ? '#4f46e5' : '#f8fafc'}
               />
            </View>
            <View className="flex-row items-center justify-between p-4 border-b border-slate-100 dark:border-slate-800">
               <View className="flex-row items-center">
                  <View className="w-10 h-10 bg-amber-50 dark:bg-amber-900/30 rounded-xl items-center justify-center mr-4">
                     <Bell size={20} color="#f59e0b" />
                  </View>
                  <Text className="text-lg font-semibold text-slate-800 dark:text-slate-100">Bildirimler</Text>
               </View>
               <Switch 
                 value={notificationsEnabled} 
                 onValueChange={setNotificationsEnabled}
                 trackColor={{ false: '#cbd5e1', true: '#fcd34d' }}
                 thumbColor={notificationsEnabled ? '#f59e0b' : '#f8fafc'}
               />
            </View>
            <TouchableOpacity className="flex-row items-center p-4">
               <View className="w-10 h-10 bg-emerald-50 dark:bg-emerald-900/30 rounded-xl items-center justify-center mr-4">
                  <Globe size={20} color="#10b981" />
               </View>
               <Text className="flex-1 text-lg font-semibold text-slate-800 dark:text-slate-100">Dil Seçenekleri</Text>
               <Text className="text-slate-400 mr-2">Türkçe</Text>
               <ChevronLeft size={20} color="#cbd5e1" style={{ transform: [{ rotate: '180deg' }] }} />
            </TouchableOpacity>
         </View>

         <Text className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3 ml-2">Hesap ve Güvenlik</Text>
         <View className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden mb-6">
            <TouchableOpacity className="flex-row items-center p-4 border-b border-slate-100 dark:border-slate-800">
               <View className="w-10 h-10 bg-blue-50 dark:bg-blue-900/30 rounded-xl items-center justify-center mr-4">
                  <Shield size={20} color="#3b82f6" />
               </View>
               <Text className="flex-1 text-lg font-semibold text-slate-800 dark:text-slate-100">Güvenlik ve Gizlilik</Text>
               <ChevronLeft size={20} color="#cbd5e1" style={{ transform: [{ rotate: '180deg' }] }} />
            </TouchableOpacity>
            <TouchableOpacity className="flex-row items-center p-4">
               <View className="w-10 h-10 bg-pink-50 dark:bg-pink-900/30 rounded-xl items-center justify-center mr-4">
                  <Smartphone size={20} color="#ec4899" />
               </View>
               <Text className="flex-1 text-lg font-semibold text-slate-800 dark:text-slate-100">Bağlı Cihazlar</Text>
               <ChevronLeft size={20} color="#cbd5e1" style={{ transform: [{ rotate: '180deg' }] }} />
            </TouchableOpacity>
         </View>

         <View className="items-center mt-4">
            <Text className="text-slate-400 font-medium">Ailem Uygulaması v1.0.0</Text>
         </View>
         <View className="h-10"></View>
      </ScrollView>
    </SafeAreaView>
  );
}
