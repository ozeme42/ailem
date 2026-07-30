import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, TextInput, KeyboardAvoidingView, Platform, Modal, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useEffect, useState, useMemo } from 'react';
import { onCalorieLogsUpdate, upsertCalorieLog } from '../lib/dataService';
import { CalorieLog, CalorieEntry } from '../lib/data';
import { ChevronLeft, ChevronRight, Flame, Plus, Activity, UtensilsCrossed, X, Trash2, Calendar, CalendarDays } from 'lucide-react-native';
import { useRouter, Stack } from 'expo-router';
import { format, addDays, subDays, parseISO, isSameWeek, isSameMonth } from 'date-fns';
import { tr } from 'date-fns/locale';

export default function CaloriesScreen() {
  const [logs, setLogs] = useState<CalorieLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date());
  
  // Tab State
  const [activeTab, setActiveTab] = useState<'daily' | 'weekly' | 'monthly'>('daily');

  // Modal State
  const [modalVisible, setModalVisible] = useState(false);
  const [entryType, setEntryType] = useState<'food' | 'exercise'>('food');
  const [entryName, setEntryName] = useState('');
  const [entryCal, setEntryCal] = useState('');
  const [entryProt, setEntryProt] = useState('');
  const [entryCarb, setEntryCarb] = useState('');
  const [entryFat, setEntryFat] = useState('');
  const [saving, setSaving] = useState(false);

  const router = useRouter();

  useEffect(() => {
    let unsubscribe: any;
    try {
      unsubscribe = onCalorieLogsUpdate((data: CalorieLog[]) => {
        setLogs(data);
        setLoading(false);
      });
    } catch (e) {
      console.log('Error fetching calories:', e);
      setLoading(false);
    }

    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, []);

  const dateKey = useMemo(() => format(selectedDate, 'yyyy-MM-dd'), [selectedDate]);
  
  const currentLog = useMemo(() => {
    return logs.find(log => log.id === dateKey);
  }, [logs, dateKey]);

  const entries = useMemo(() => currentLog?.entries || [], [currentLog]);

  // Calculations
  const calculated = useMemo(() => {
    let taken = 0, burned = 0, protein = 0, carbs = 0, fat = 0;
    entries.forEach(e => {
      if (e.type === 'food') {
        taken += (e.calories || 0);
        protein += (e.protein || 0);
        carbs += (e.carbs || 0);
        fat += (e.fat || 0);
      } else {
        burned += (e.calories || 0);
      }
    });
    return { taken, burned, protein, carbs, fat, net: taken - burned };
  }, [entries]);

  const weeklyCalculated = useMemo(() => {
    let taken = 0, burned = 0;
    logs.filter(log => {
      try { return isSameWeek(parseISO(log.id), selectedDate, { weekStartsOn: 1 }); } catch { return false; }
    }).forEach(log => {
      taken += log.caloriesTaken || 0;
      burned += log.caloriesBurned || 0;
    });
    return { taken, burned, net: taken - burned };
  }, [logs, selectedDate]);

  const monthlyCalculated = useMemo(() => {
    let taken = 0, burned = 0;
    logs.filter(log => {
      try { return isSameMonth(parseISO(log.id), selectedDate); } catch { return false; }
    }).forEach(log => {
      taken += log.caloriesTaken || 0;
      burned += log.caloriesBurned || 0;
    });
    return { taken, burned, net: taken - burned };
  }, [logs, selectedDate]);

  const handleAddEntry = async () => {
    if (!entryName.trim() || !entryCal.trim()) {
      Alert.alert("Eksik Bilgi", "Lütfen bir ad ve kalori değeri girin.");
      return;
    }
    
    setSaving(true);
    const newEntry: CalorieEntry = {
      id: Date.now().toString() + Math.random().toString(36).substring(7),
      name: entryName.trim(),
      type: entryType,
      calories: Number(entryCal) || 0,
      protein: entryType === 'food' ? (Number(entryProt) || 0) : undefined,
      carbs: entryType === 'food' ? (Number(entryCarb) || 0) : undefined,
      fat: entryType === 'food' ? (Number(entryFat) || 0) : undefined,
    };

    const newEntries = [...entries, newEntry];
    
    let taken = 0, burned = 0, prot = 0, carb = 0, fat = 0;
    newEntries.forEach(e => {
      if (e.type === 'food') {
        taken += (e.calories || 0); prot += (e.protein || 0); carb += (e.carbs || 0); fat += (e.fat || 0);
      } else {
        burned += (e.calories || 0);
      }
    });

    try {
      await upsertCalorieLog({
        id: dateKey,
        caloriesTaken: taken,
        caloriesBurned: burned,
        protein: prot,
        carbs: carb,
        fat: fat,
        entries: newEntries
      });
      setModalVisible(false);
      setEntryName(''); setEntryCal(''); setEntryProt(''); setEntryCarb(''); setEntryFat('');
    } catch (e) {
      console.error('Error saving entry:', e);
      Alert.alert("Hata", "Kayıt eklenemedi.");
    }
    setSaving(false);
  };

  const handleDeleteEntry = async (entryId: string) => {
    const newEntries = entries.filter(e => e.id !== entryId);
    let taken = 0, burned = 0, prot = 0, carb = 0, fat = 0;
    newEntries.forEach(e => {
      if (e.type === 'food') {
        taken += (e.calories || 0); prot += (e.protein || 0); carb += (e.carbs || 0); fat += (e.fat || 0);
      } else {
        burned += (e.calories || 0);
      }
    });

    try {
      await upsertCalorieLog({
        id: dateKey,
        caloriesTaken: taken,
        caloriesBurned: burned,
        protein: prot,
        carbs: carb,
        fat: fat,
        entries: newEntries
      });
    } catch (e) {
      console.error('Error deleting entry:', e);
    }
  };

  const openModal = (type: 'food' | 'exercise') => {
    setEntryType(type);
    setEntryName('');
    setEntryCal('');
    setEntryProt('');
    setEntryCarb('');
    setEntryFat('');
    setModalVisible(true);
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 justify-center items-center bg-slate-50 dark:bg-slate-950">
        <ActivityIndicator size="large" color="#f97316" />
      </SafeAreaView>
    );
  }

  const renderStatsCard = (title: string, data: { net: number, taken: number, burned: number }) => (
    <View className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-sm border border-slate-100 dark:border-slate-800 items-center mb-6">
       <View className="w-40 h-40 rounded-full border-[8px] border-orange-50 dark:border-slate-800 justify-center items-center bg-slate-50/50 dark:bg-slate-950 mb-3 shadow-inner relative">
          <Text className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-1">{title} Net</Text>
          <Text className={`text-4xl font-black ${data.net >= 0 ? 'text-orange-500' : 'text-emerald-500'}`}>
             {data.net}
          </Text>
          <Text className="text-slate-400 text-xs font-bold mt-1">kcal</Text>
       </View>
       <View className="flex-row w-full justify-between mt-4 px-2">
          <View className="items-center">
             <Text className="text-slate-400 text-[10px] uppercase font-bold mb-1">Alınan Toplam</Text>
             <Text className="text-slate-800 dark:text-white font-black text-xl">{data.taken}</Text>
          </View>
          <View className="items-center">
             <Text className="text-slate-400 text-[10px] uppercase font-bold mb-1">Yakılan Toplam</Text>
             <Text className="text-slate-800 dark:text-white font-black text-xl">{data.burned}</Text>
          </View>
       </View>
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-slate-50 dark:bg-slate-950">
      <Stack.Screen options={{ headerShown: false }} />
      
      {/* Header */}
      <View className="p-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex-row justify-between items-center shadow-sm">
        <TouchableOpacity onPress={() => router.back()} className="w-10 h-10 items-center justify-center bg-slate-100 dark:bg-slate-800 rounded-full">
          <ChevronLeft size={24} color="#64748b" />
        </TouchableOpacity>
        <View className="flex-row items-center gap-2">
          <Flame size={20} color="#f97316" fill="#f97316" />
          <Text className="text-lg font-black text-slate-800 dark:text-slate-100 tracking-tight">Kalori Takibi</Text>
        </View>
        <View className="w-10" />
      </View>

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
        className="flex-1"
      >
        <ScrollView contentContainerClassName="p-4" showsVerticalScrollIndicator={false}>
           
           {/* Date Selector */}
           <View className="flex-row items-center justify-between p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 mb-4 mt-2 shadow-sm">
             <TouchableOpacity onPress={() => setSelectedDate(d => subDays(d, 1))} className="p-2 bg-slate-50 dark:bg-slate-800 rounded-xl">
                <ChevronLeft size={20} color="#f97316" />
             </TouchableOpacity>
             <Text className="font-extrabold text-slate-800 dark:text-slate-200 text-base">
                {format(selectedDate, 'dd MMMM yyyy', { locale: tr })}
             </Text>
             <TouchableOpacity onPress={() => setSelectedDate(d => addDays(d, 1))} className="p-2 bg-slate-50 dark:bg-slate-800 rounded-xl">
                <ChevronRight size={20} color="#f97316" />
             </TouchableOpacity>
           </View>

           {/* Tabs */}
           <View className="flex-row bg-slate-200/50 dark:bg-slate-800/50 rounded-xl p-1 mb-6">
              <TouchableOpacity onPress={() => setActiveTab('daily')} className={`flex-1 py-2.5 items-center rounded-lg ${activeTab === 'daily' ? 'bg-white dark:bg-slate-700 shadow-sm' : ''}`}>
                 <Text className={`text-xs font-bold ${activeTab === 'daily' ? 'text-slate-900 dark:text-white' : 'text-slate-500'}`}>Günlük</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setActiveTab('weekly')} className={`flex-1 py-2.5 items-center rounded-lg ${activeTab === 'weekly' ? 'bg-white dark:bg-slate-700 shadow-sm' : ''}`}>
                 <Text className={`text-xs font-bold ${activeTab === 'weekly' ? 'text-slate-900 dark:text-white' : 'text-slate-500'}`}>Haftalık</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setActiveTab('monthly')} className={`flex-1 py-2.5 items-center rounded-lg ${activeTab === 'monthly' ? 'bg-white dark:bg-slate-700 shadow-sm' : ''}`}>
                 <Text className={`text-xs font-bold ${activeTab === 'monthly' ? 'text-slate-900 dark:text-white' : 'text-slate-500'}`}>Aylık</Text>
              </TouchableOpacity>
           </View>

           {activeTab === 'daily' && (
             <>
               {renderStatsCard("Günlük", calculated)}

               {/* Macros */}
               <View className="bg-white dark:bg-slate-900 rounded-3xl p-5 shadow-sm border border-slate-100 dark:border-slate-800 mb-6 flex-row justify-between">
                  <View className="items-center w-1/3 border-r border-slate-100 dark:border-slate-800">
                     <Text className="text-slate-500 text-[10px] font-bold uppercase mb-1">Protein</Text>
                     <Text className="text-violet-500 font-black text-lg">{calculated.protein}g</Text>
                  </View>
                  <View className="items-center w-1/3 border-r border-slate-100 dark:border-slate-800">
                     <Text className="text-slate-500 text-[10px] font-bold uppercase mb-1">Karb.</Text>
                     <Text className="text-blue-500 font-black text-lg">{calculated.carbs}g</Text>
                  </View>
                  <View className="items-center w-1/3">
                     <Text className="text-slate-500 text-[10px] font-bold uppercase mb-1">Yağ</Text>
                     <Text className="text-rose-500 font-black text-lg">{calculated.fat}g</Text>
                  </View>
               </View>

               {/* Action Buttons */}
               <View className="flex-row gap-3 mb-6">
                  <TouchableOpacity 
                    onPress={() => openModal('food')}
                    className="flex-1 bg-indigo-600 p-4 rounded-2xl flex-row items-center justify-center gap-2 shadow-sm"
                  >
                     <UtensilsCrossed size={18} color="white" />
                     <Text className="text-white font-bold text-sm">Yiyecek Ekle</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    onPress={() => openModal('exercise')}
                    className="flex-1 bg-emerald-500 p-4 rounded-2xl flex-row items-center justify-center gap-2 shadow-sm"
                  >
                     <Activity size={18} color="white" />
                     <Text className="text-white font-bold text-sm">Egzersiz Ekle</Text>
                  </TouchableOpacity>
               </View>

               {/* Entries List */}
               <View className="mb-10">
                  <Text className="text-lg font-black text-slate-800 dark:text-slate-100 mb-4 px-1">Günün Kayıtları</Text>
                  {entries.length === 0 ? (
                     <View className="bg-white dark:bg-slate-900 rounded-2xl p-8 border border-slate-100 dark:border-slate-800 items-center shadow-sm">
                        <Text className="text-slate-400 text-center font-medium">Bu güne henüz kayıt eklemediniz.</Text>
                     </View>
                  ) : (
                     <View className="gap-3">
                        {entries.map(entry => (
                           <View key={entry.id} className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm flex-row items-center justify-between">
                              <View className="flex-row items-center gap-3">
                                 <View className={`w-10 h-10 rounded-full items-center justify-center ${entry.type === 'food' ? 'bg-indigo-50 dark:bg-indigo-900/30' : 'bg-emerald-50 dark:bg-emerald-900/30'}`}>
                                    {entry.type === 'food' ? <UtensilsCrossed size={16} color="#6366f1" /> : <Activity size={16} color="#10b981" />}
                                 </View>
                                 <View>
                                    <Text className="font-bold text-slate-800 dark:text-white text-base">{entry.name}</Text>
                                    {entry.type === 'food' ? (
                                       <Text className="text-xs text-slate-500 mt-0.5">P: {entry.protein || 0}g  K: {entry.carbs || 0}g  Y: {entry.fat || 0}g</Text>
                                    ) : (
                                       <Text className="text-xs text-slate-500 mt-0.5">Egzersiz / Aktivite</Text>
                                    )}
                                 </View>
                              </View>
                              <View className="flex-row items-center gap-3">
                                 <Text className={`font-black text-base ${entry.type === 'food' ? 'text-indigo-600 dark:text-indigo-400' : 'text-emerald-500'}`}>
                                    {entry.type === 'food' ? '+' : '-'}{entry.calories}
                                 </Text>
                                 <TouchableOpacity onPress={() => handleDeleteEntry(entry.id)} className="w-8 h-8 rounded-full bg-rose-50 dark:bg-rose-900/20 items-center justify-center">
                                    <Trash2 size={14} color="#f43f5e" />
                                 </TouchableOpacity>
                              </View>
                           </View>
                        ))}
                     </View>
                  )}
               </View>
             </>
           )}

           {activeTab === 'weekly' && renderStatsCard("Haftalık", weeklyCalculated)}
           {activeTab === 'monthly' && renderStatsCard("Aylık", monthlyCalculated)}

        </ScrollView>
      </KeyboardAvoidingView>

      {/* Entry Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
         <View className="flex-1 justify-end bg-black/50">
            <View className="bg-white dark:bg-slate-900 rounded-t-3xl p-6">
               <View className="flex-row justify-between items-center mb-6">
                  <Text className="text-xl font-black text-slate-900 dark:text-white">
                     {entryType === 'food' ? 'Yiyecek Ekle' : 'Egzersiz Ekle'}
                  </Text>
                  <TouchableOpacity onPress={() => setModalVisible(false)} className="w-8 h-8 bg-slate-100 dark:bg-slate-800 rounded-full items-center justify-center">
                     <X size={20} color="#64748b" />
                  </TouchableOpacity>
               </View>

               <View className="gap-4 mb-6">
                  <View>
                     <Text className="text-xs font-bold text-slate-500 uppercase mb-1.5 ml-1">{entryType === 'food' ? 'Yiyecek/Öğün Adı' : 'Egzersiz Adı'}</Text>
                     <TextInput 
                        placeholder={entryType === 'food' ? "Örn: Yulaf Ezmesi" : "Örn: Koşu (30 dk)"}
                        placeholderTextColor="#94a3b8"
                        value={entryName}
                        onChangeText={setEntryName}
                        className="h-12 bg-slate-50 dark:bg-slate-800 rounded-xl px-4 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 font-medium"
                     />
                  </View>
                  <View>
                     <Text className="text-xs font-bold text-slate-500 uppercase mb-1.5 ml-1">Kalori (kcal)</Text>
                     <TextInput 
                        placeholder="Örn: 350"
                        placeholderTextColor="#94a3b8"
                        value={entryCal}
                        onChangeText={setEntryCal}
                        keyboardType="numeric"
                        className="h-12 bg-slate-50 dark:bg-slate-800 rounded-xl px-4 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 font-medium"
                     />
                  </View>

                  {entryType === 'food' && (
                     <View className="flex-row gap-3">
                        <View className="flex-1">
                           <Text className="text-[10px] font-bold text-violet-500 uppercase mb-1.5 ml-1">Protein (g)</Text>
                           <TextInput value={entryProt} onChangeText={setEntryProt} keyboardType="numeric" placeholder="0" placeholderTextColor="#94a3b8" className="h-12 bg-slate-50 dark:bg-slate-800 rounded-xl px-4 text-center text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 font-medium" />
                        </View>
                        <View className="flex-1">
                           <Text className="text-[10px] font-bold text-blue-500 uppercase mb-1.5 ml-1">Karb. (g)</Text>
                           <TextInput value={entryCarb} onChangeText={setEntryCarb} keyboardType="numeric" placeholder="0" placeholderTextColor="#94a3b8" className="h-12 bg-slate-50 dark:bg-slate-800 rounded-xl px-4 text-center text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 font-medium" />
                        </View>
                        <View className="flex-1">
                           <Text className="text-[10px] font-bold text-rose-500 uppercase mb-1.5 ml-1">Yağ (g)</Text>
                           <TextInput value={entryFat} onChangeText={setEntryFat} keyboardType="numeric" placeholder="0" placeholderTextColor="#94a3b8" className="h-12 bg-slate-50 dark:bg-slate-800 rounded-xl px-4 text-center text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 font-medium" />
                        </View>
                     </View>
                  )}
               </View>

               <TouchableOpacity 
                  onPress={handleAddEntry}
                  disabled={saving}
                  className="bg-orange-500 h-14 rounded-2xl items-center justify-center flex-row shadow-sm"
               >
                  {saving ? <ActivityIndicator color="white" /> : <Text className="text-white font-extrabold text-base">Kaydet</Text>}
               </TouchableOpacity>
            </View>
         </View>
      </Modal>
    </SafeAreaView>
  );
}
