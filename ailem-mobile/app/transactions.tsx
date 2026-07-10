import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useEffect, useState } from 'react';
import { onTransactionsUpdate } from '../lib/dataService';
import { Transaction } from '../lib/data';
import { ListOrdered, ChevronLeft, ArrowUpRight, ArrowDownRight } from 'lucide-react-native';
import { useRouter, Stack } from 'expo-router';
import { format, parseISO } from 'date-fns';
import { tr } from 'date-fns/locale';

export default function TransactionsScreen() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    let unsubscribe: any;
    try {
      const start = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
      const end = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0);
      
      unsubscribe = onTransactionsUpdate((data: Transaction[]) => {
        setTransactions(data);
        setLoading(false);
      }, start, end);
    } catch (e) {
      console.log('Error fetching transactions:', e);
      setLoading(false);
    }

    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, []);

  if (loading) {
    return (
      <SafeAreaView className="flex-1 justify-center items-center bg-slate-50 dark:bg-slate-950">
        <ActivityIndicator size="large" color="#0ea5e9" />
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
        <Text className="text-2xl font-bold text-slate-900 dark:text-white">İşlem Geçmişi</Text>
        <View className="w-10 h-10" />
      </View>

      <ScrollView contentContainerClassName="p-4" showsVerticalScrollIndicator={false}>
         {transactions.length === 0 ? (
           <View className="items-center justify-center mt-10">
             <View className="w-20 h-20 bg-sky-50 dark:bg-sky-900/30 rounded-full items-center justify-center mb-4">
                <ListOrdered size={40} color="#0ea5e9" />
             </View>
             <Text className="text-slate-500 text-lg font-medium text-center">Bu ay henüz işlem yapılmamış.</Text>
           </View>
         ) : (
           transactions.map(t => (
             <View key={t.id} className="bg-white dark:bg-slate-900 rounded-3xl p-5 mb-4 shadow-sm border border-slate-100 dark:border-slate-800 flex-row justify-between items-center">
                <View className="flex-row items-center flex-1">
                   <View className={`w-12 h-12 rounded-xl items-center justify-center mr-4 ${t.type === 'income' ? 'bg-emerald-50 dark:bg-emerald-900/30' : 'bg-rose-50 dark:bg-rose-900/30'}`}>
                      {t.type === 'income' ? <ArrowDownRight size={24} color="#10b981" /> : <ArrowUpRight size={24} color="#f43f5e" />}
                   </View>
                   <View className="flex-1 pr-2">
                      <Text className="font-bold text-slate-800 dark:text-slate-100 text-lg" numberOfLines={1}>{t.description}</Text>
                      <Text className="text-slate-500 text-sm">{t.category || 'Genel'} • {format(parseISO(t.date), 'd MMM', { locale: tr })}</Text>
                   </View>
                </View>
                <Text className={`font-bold text-xl ${t.type === 'income' ? 'text-emerald-500' : 'text-rose-500'}`}>
                  {t.type === 'income' ? '+' : '-'}₺{t.amount}
                </Text>
             </View>
           ))
         )}
         <View className="h-10"></View>
      </ScrollView>
    </SafeAreaView>
  );
}
