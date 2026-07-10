import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useEffect, useState, useMemo } from 'react';
import { useRouter, Stack } from 'expo-router';
import { ChevronLeft, Wallet, Banknote, TrendingUp, TrendingDown, BarChart2, PieChart } from 'lucide-react-native';
import { format, subMonths, startOfMonth, endOfMonth, isWithinInterval, parseISO } from 'date-fns';
import { tr } from 'date-fns/locale';
import { LineChart } from 'react-native-chart-kit';

import { onTransactionsUpdate, onAccountsUpdate } from '../lib/dataService';
import { Transaction, Account } from '../lib/data';

const { width } = Dimensions.get('window');

// iOS Style Theme Colors
const theme = {
  bg: 'bg-[#F2F2F7] dark:bg-black',
  card: 'bg-white dark:bg-[#1C1C1E]',
  textMain: 'text-[#1C1C1E] dark:text-white',
  textMuted: 'text-[#8E8E93] dark:text-[#EBEBF5]/60',
  gelir: '#34C759',
  gider: '#FF3B30',
  bakiye: '#007AFF',
};

const IosStatCard = ({ icon: Icon, title, value, subtext, colorHex, bgHex }: any) => (
  <View className={`flex-1 ${theme.card} p-4 rounded-[22px] shadow-sm min-h-[120px] justify-between`}>
    <View className="flex-row items-center gap-2 mb-2">
      <View style={{ backgroundColor: bgHex }} className="w-7 h-7 rounded-full items-center justify-center">
        <Icon size={16} color={colorHex} />
      </View>
      <Text className={`${theme.textMuted} font-medium text-[11px] uppercase tracking-wide`}>{title}</Text>
    </View>
    <View>
      <Text className={`${theme.textMain} text-[19px] font-bold tracking-tight mb-1`} numberOfLines={1} adjustsFontSizeToFit>{value}</Text>
      <Text style={{ color: colorHex }} className="text-[10px] font-medium">{subtext}</Text>
    </View>
  </View>
);

export default function BudgetReportsScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);

  useEffect(() => {
    let unsubs: any[] = [];
    unsubs.push(onTransactionsUpdate(data => {
      setTransactions(data);
      setLoading(false);
    }));
    unsubs.push(onAccountsUpdate(data => setAccounts(data)));
    
    return () => unsubs.forEach(u => typeof u === 'function' && u());
  }, []);

  // Balance
  const totalBalance = useMemo(() => accounts.reduce((sum, acc) => sum + acc.balance, 0), [accounts]);

  // Generate last 6 months stats
  const monthlyStats = useMemo(() => {
    const stats = [];
    for (let i = 5; i >= 0; i--) {
      const d = subMonths(new Date(), i);
      const start = startOfMonth(d);
      const end = endOfMonth(d);
      const mtx = transactions.filter(tx => tx.isApplied && isWithinInterval(parseISO(tx.date), { start, end }));
      const income = mtx.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
      const expense = mtx.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
      stats.push({
        month: format(d, 'MMM', { locale: tr }),
        income,
        expense,
        net: income - expense
      });
    }
    return stats;
  }, [transactions]);

  const overallStats = useMemo(() => {
    const totalIncome = monthlyStats.reduce((sum, s) => sum + s.income, 0);
    const totalExpense = monthlyStats.reduce((sum, s) => sum + s.expense, 0);
    return {
      totalIncome,
      totalExpense,
      netBalance: totalIncome - totalExpense,
    };
  }, [monthlyStats]);

  const chartConfig = {
    backgroundGradientFrom: '#ffffff',
    backgroundGradientFromOpacity: 0,
    backgroundGradientTo: '#ffffff',
    backgroundGradientToOpacity: 0,
    color: (opacity = 1) => `rgba(142, 142, 147, ${opacity})`,
    strokeWidth: 2,
    useShadowColorFromDataset: false,
    decimalPlaces: 0,
    propsForDots: {
      r: '4',
    }
  };

  const lineDataGelirGider = {
    labels: monthlyStats.map(s => s.month),
    datasets: [
      {
        data: monthlyStats.map(s => s.income),
        color: () => theme.gelir,
        strokeWidth: 3,
      },
      {
        data: monthlyStats.map(s => s.expense),
        color: () => theme.gider,
        strokeWidth: 3,
      }
    ],
    legend: ['Gelir', 'Gider']
  };

  const lineDataNet = {
    labels: monthlyStats.map(s => s.month),
    datasets: [
      {
        data: monthlyStats.map(s => s.net),
        color: () => theme.bakiye,
        strokeWidth: 3,
      }
    ]
  };

  if (loading) {
    return (
      <SafeAreaView className={`flex-1 justify-center items-center ${theme.bg}`}>
        <ActivityIndicator size="large" color={theme.bakiye} />
      </SafeAreaView>
    );
  }

  // If completely empty (no tx)
  if (transactions.length === 0) {
    return (
      <SafeAreaView className={`flex-1 ${theme.bg}`}>
        <View className="flex-row items-center px-4 h-12">
          <TouchableOpacity onPress={() => router.back()} className="w-10 h-10 items-center justify-center">
            <ChevronLeft size={28} color={theme.bakiye} />
          </TouchableOpacity>
        </View>
        <View className="flex-1 items-center justify-center p-6 pb-20">
          <View className="w-24 h-24 bg-[#007AFF]/10 rounded-full flex items-center justify-center mb-6">
            <BarChart2 size={40} color={theme.bakiye} />
          </View>
          <Text className={`${theme.textMain} text-[22px] font-bold tracking-tight mb-2 text-center`}>Rapor Bulunamadı</Text>
          <Text className={`${theme.textMuted} text-[15px] mb-8 px-4 text-center`}>Grafikleri görüntüleyebilmek için bütçenize gelir veya gider eklemelisiniz.</Text>
          <TouchableOpacity 
            onPress={() => router.back()}
            className="w-full h-[50px] bg-[#007AFF] rounded-[14px] items-center justify-center"
          >
            <Text className="text-white font-semibold text-[17px]">Bütçeye Dön</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className={`flex-1 ${theme.bg}`}>
      <Stack.Screen options={{ headerShown: false }} />
      
      {/* App Bar */}
      <View className={`flex-row items-center justify-between px-2 h-14 bg-white/80 dark:bg-[#1C1C1E]/80 border-b border-black/5 dark:border-white/5`}>
        <TouchableOpacity onPress={() => router.back()} className="w-12 h-12 items-center justify-center z-10">
          <ChevronLeft size={28} color={theme.bakiye} />
        </TouchableOpacity>
        <Text className={`${theme.textMain} text-[17px] font-semibold tracking-tight absolute w-full text-center pointer-events-none`}>
          Finansal Analiz
        </Text>
        <View className="w-12" />
      </View>

      <ScrollView className="flex-1 px-4 pt-4" showsVerticalScrollIndicator={false}>
        
        {/* Widget Grid */}
        <View className="flex-row gap-3 mb-3">
          <IosStatCard 
            icon={Wallet} 
            title="Varlık" 
            value={`₺${totalBalance.toLocaleString('tr-TR')}`} 
            subtext="Toplam Bakiye"
            colorHex={theme.bakiye}
            bgHex={`${theme.bakiye}1A`}
          />
          <IosStatCard 
            icon={Banknote} 
            title="Net" 
            value={`₺${overallStats.netBalance.toLocaleString('tr-TR')}`} 
            subtext="Fark"
            colorHex={overallStats.netBalance >= 0 ? theme.gelir : theme.gider}
            bgHex={overallStats.netBalance >= 0 ? `${theme.gelir}1A` : `${theme.gider}1A`}
          />
        </View>
        <View className="flex-row gap-3 mb-5">
          <IosStatCard 
            icon={TrendingUp} 
            title="Gelir" 
            value={`₺${overallStats.totalIncome.toLocaleString('tr-TR')}`} 
            subtext="Son 6 Ay"
            colorHex={theme.gelir}
            bgHex={`${theme.gelir}1A`}
          />
          <IosStatCard 
            icon={TrendingDown} 
            title="Gider" 
            value={`₺${overallStats.totalExpense.toLocaleString('tr-TR')}`} 
            subtext="Son 6 Ay"
            colorHex={theme.gider}
            bgHex={`${theme.gider}1A`}
          />
        </View>

        {/* Line Chart - Gelir Gider */}
        <View className={`${theme.card} rounded-[24px] p-4 pt-5 mb-5`}>
          <View className="flex-row items-center gap-2 mb-4 px-1">
            <BarChart2 size={20} color="#8E8E93" />
            <Text className={`${theme.textMain} font-semibold text-[15px] tracking-tight`}>Aylık Karşılaştırma</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="-ml-4">
            <LineChart
              data={lineDataGelirGider}
              width={Math.max(width, monthlyStats.length * 60)}
              height={220}
              chartConfig={chartConfig}
              bezier
              withDots={false}
              withInnerLines={true}
              yAxisLabel="₺"
              yAxisSuffix=""
              style={{ paddingRight: 0 }}
            />
          </ScrollView>
          <View className="flex-row justify-center gap-4 mt-2">
            <View className="flex-row items-center gap-1">
              <View className="w-3 h-3 rounded-full" style={{backgroundColor: theme.gelir}} />
              <Text className={`${theme.textMuted} text-xs font-medium`}>Gelir</Text>
            </View>
            <View className="flex-row items-center gap-1">
              <View className="w-3 h-3 rounded-full" style={{backgroundColor: theme.gider}} />
              <Text className={`${theme.textMuted} text-xs font-medium`}>Gider</Text>
            </View>
          </View>
        </View>

        {/* Line Chart - Trend */}
        <View className={`${theme.card} rounded-[24px] p-4 pt-5 mb-10`}>
          <View className="flex-row items-center gap-2 mb-4 px-1">
            <PieChart size={20} color="#8E8E93" />
            <Text className={`${theme.textMain} font-semibold text-[15px] tracking-tight`}>Birikim Trendi</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="-ml-4">
            <LineChart
              data={lineDataNet}
              width={Math.max(width, monthlyStats.length * 60)}
              height={220}
              chartConfig={{...chartConfig, color: () => theme.bakiye}}
              bezier
              withDots={false}
              withInnerLines={true}
              yAxisLabel="₺"
              yAxisSuffix=""
              style={{ paddingRight: 0 }}
            />
          </ScrollView>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}
