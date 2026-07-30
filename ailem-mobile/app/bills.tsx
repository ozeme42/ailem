import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useEffect, useState } from 'react';
import { onBillsUpdate } from '../lib/dataService';
import { Bill } from '../lib/data';
import { FileText, ChevronLeft, Plus, CheckCircle2, Clock } from 'lucide-react-native';
import { useRouter, Stack } from 'expo-router';
import { format, parseISO } from 'date-fns';
import { tr } from 'date-fns/locale';

export default function BillsScreen() {
  const [bills, setBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    let unsubscribe: any;
    try {
      unsubscribe = onBillsUpdate((data: Bill[]) => {
        setBills(data);
        setLoading(false);
      });
    } catch (e) {
      console.log('Error fetching bills:', e);
      setLoading(false);
    }

    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, []);

  if (loading) {
    return (
      <SafeAreaView className="flex-1 justify-center items-center bg-slate-50 dark:bg-slate-950">
        <ActivityIndicator size="large" color="#6366f1" />
      </SafeAreaView>
    );
  }

  const unpaidBills = bills.filter(b => !b.isPaid);
  const totalUnpaid = unpaidBills.reduce((acc, curr) => acc + curr.amount, 0);

  return (
    <SafeAreaView className="flex-1 bg-slate-50 dark:bg-slate-950">
      <Stack.Screen options={{ headerShown: false }} />
      <View className="p-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex-row justify-between items-center">
        <TouchableOpacity onPress={() => router.back()} className="w-10 h-10 items-center justify-center bg-slate-100 dark:bg-slate-800 rounded-full">
           <ChevronLeft size={24} color="#64748b" />
        </TouchableOpacity>
        <Text className="text-2xl font-bold text-slate-900 dark:text-white">Faturalar</Text>
        <TouchableOpacity className="bg-indigo-500 w-10 h-10 rounded-full items-center justify-center shadow-sm">
          <Plus size={24} color="white" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerClassName="p-4" showsVerticalScrollIndicator={false}>
         
         <View className="bg-indigo-500 rounded-3xl p-6 mb-6 shadow-sm">
            <Text className="text-indigo-100 font-medium mb-1">Bekleyen Ödemeler</Text>
            <Text className="text-white text-4xl font-bold">₺{totalUnpaid.toLocaleString('tr-TR')}</Text>
            <Text className="text-indigo-200 text-sm mt-2">{unpaidBills.length} adet ödenmemiş fatura var.</Text>
         </View>

         <Text className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-4">Tüm Faturalar</Text>

         {bills.length === 0 ? (
           <View className="items-center justify-center mt-10">
             <View className="w-20 h-20 bg-indigo-50 dark:bg-indigo-900/30 rounded-full items-center justify-center mb-4">
                <FileText size={40} color="#6366f1" />
             </View>
             <Text className="text-slate-500 text-lg font-medium text-center">Kayıtlı fatura bulunmuyor.</Text>
           </View>
         ) : (
           bills.map(bill => (
             <View key={bill.id} className="bg-white dark:bg-slate-900 rounded-3xl p-5 mb-4 shadow-sm border border-slate-100 dark:border-slate-800 flex-row justify-between items-center">
                <View className="flex-row items-center flex-1 pr-2">
                   <View className={`w-12 h-12 rounded-xl items-center justify-center mr-4 ${bill.isPaid ? 'bg-emerald-50 dark:bg-emerald-900/30' : 'bg-indigo-50 dark:bg-indigo-900/30'}`}>
                      {bill.isPaid ? <CheckCircle2 size={24} color="#10b981" /> : <Clock size={24} color="#6366f1" />}
                   </View>
                   <View>
                      <Text className="font-bold text-slate-800 dark:text-slate-100 text-lg">{bill.title}</Text>
                      <Text className="text-slate-500 text-sm">Son Ödeme: {format(parseISO(bill.dueDate), 'd MMM', { locale: tr })}</Text>
                   </View>
                </View>
                <View className="items-end">
                   <Text className="font-bold text-xl text-slate-800 dark:text-slate-100">₺{bill.amount}</Text>
                   <Text className={`text-xs font-bold mt-1 ${bill.isPaid ? 'text-emerald-500' : 'text-amber-500'}`}>
                     {bill.isPaid ? 'ÖDENDİ' : 'BEKLİYOR'}
                   </Text>
                </View>
             </View>
           ))
         )}
         <View className="h-10"></View>
      </ScrollView>
    </SafeAreaView>
  );
}
