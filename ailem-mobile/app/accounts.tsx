import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useEffect, useState } from 'react';
import { onAccountsUpdate } from '../lib/dataService';
import { Account } from '../lib/data';
import { Landmark, ChevronLeft, Plus } from 'lucide-react-native';
import { useRouter, Stack } from 'expo-router';

export default function AccountsScreen() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    let unsubscribe: any;
    try {
      unsubscribe = onAccountsUpdate((data: Account[]) => {
        setAccounts(data);
        setLoading(false);
      });
    } catch (e) {
      console.log('Error fetching accounts:', e);
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

  const totalBalance = accounts.reduce((sum, acc) => sum + acc.balance, 0);

  return (
    <SafeAreaView className="flex-1 bg-slate-50 dark:bg-slate-950">
      <Stack.Screen options={{ headerShown: false }} />
      <View className="p-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex-row justify-between items-center">
        <TouchableOpacity onPress={() => router.back()} className="w-10 h-10 items-center justify-center bg-slate-100 dark:bg-slate-800 rounded-full">
           <ChevronLeft size={24} color="#64748b" />
        </TouchableOpacity>
        <Text className="text-2xl font-bold text-slate-900 dark:text-white">Hesaplarım</Text>
        <TouchableOpacity className="bg-sky-500 w-10 h-10 rounded-full items-center justify-center shadow-sm">
          <Plus size={24} color="white" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerClassName="p-4" showsVerticalScrollIndicator={false}>
         
         <View className="bg-sky-500 rounded-3xl p-6 mb-6 shadow-sm">
            <Text className="text-sky-100 font-medium mb-1">Toplam Bakiye</Text>
            <Text className="text-white text-4xl font-bold">₺{totalBalance.toLocaleString('tr-TR')}</Text>
         </View>

         {accounts.length === 0 ? (
           <View className="items-center justify-center mt-10">
             <View className="w-20 h-20 bg-sky-50 dark:bg-sky-900/30 rounded-full items-center justify-center mb-4">
                <Landmark size={40} color="#0ea5e9" />
             </View>
             <Text className="text-slate-500 text-lg font-medium text-center">Tanımlı hesap bulunmuyor.</Text>
           </View>
         ) : (
           accounts.map(acc => (
             <View key={acc.id} className="bg-white dark:bg-slate-900 rounded-3xl p-5 mb-4 shadow-sm border border-slate-100 dark:border-slate-800 flex-row justify-between items-center">
                <View className="flex-row items-center">
                   <View className="w-12 h-12 bg-sky-50 dark:bg-sky-900/30 rounded-xl items-center justify-center mr-4">
                      <Landmark size={24} color="#0ea5e9" />
                   </View>
                   <View>
                      <Text className="font-bold text-slate-800 dark:text-slate-100 text-lg">{acc.name}</Text>
                      <Text className="text-slate-500 text-sm">{acc.type === 'bank' ? 'Banka Hesabı' : acc.type === 'cash' ? 'Nakit' : 'Kredi Kartı'}</Text>
                   </View>
                </View>
                <Text className="font-bold text-xl text-slate-800 dark:text-slate-100">₺{acc.balance.toLocaleString('tr-TR')}</Text>
             </View>
           ))
         )}
         <View className="h-10"></View>
      </ScrollView>
    </SafeAreaView>
  );
}
