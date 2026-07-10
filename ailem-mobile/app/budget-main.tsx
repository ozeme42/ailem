import { View, Text, ScrollView, TouchableOpacity, Pressable, TextInput, ActivityIndicator, Modal, Alert, StyleSheet, Switch , RefreshControl, Platform, KeyboardAvoidingView, Animated } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useEffect, useState, useMemo, useRef } from 'react';
import { 
  onAccountsUpdate, deleteAccount, addAccount, updateAccount, 
  addTransaction, updateTransaction, deleteTransaction, 
  onTransactionsUpdate, onBudgetCategoriesUpdate, onBillsUpdate, 
  addBill, updateBill, deleteBill, onTransactionTemplatesUpdate, 
  addTransactionTemplate 
} from '../lib/dataService';
import { Account, Transaction, BudgetCategory, Bill, TransactionTemplate } from '../lib/data';
import { 
  Wallet, ArrowUpRight, ArrowDownRight, Plus, ChevronLeft, MoreHorizontal, Settings, Info,
  TrendingUp, TrendingDown, ChevronRight, Trash2, Banknote, Landmark, CreditCard, BarChart2,
  ArrowDownLeft, Calendar as CalendarIcon, ArrowLeft, ShoppingCart, Utensils, Bus, FileText,
  Gamepad2, HeartPulse, Shirt, GraduationCap, DollarSign, PlusCircle, CircleEllipsis, Printer, Check, CheckCircle2, X, Edit2
} from 'lucide-react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { format, startOfYear, endOfYear, subYears, parseISO, addYears, eachMonthOfInterval, subMonths, addMonths, getYear, isSameMonth } from 'date-fns';
import { tr } from 'date-fns/locale';

// ─── DESIGN CONFIG ────────────────────────────────────────────────────────────
const theme = {
  purpleGrad: ['#8f628c', '#6b4168'] as [string, string, ...string[]],
  darkPurple: '#8f628c',
  lightPurpleBg: '#fdfbfd',
  cardBg: '#ffffff',
  borderColor: '#f1e6f1',
};

const categoryConfig: Record<string, { color: string, textColor: string, icon: any, bgColor: string }> = {
  'Market': { color: '#f97316', textColor: '#ea580c', bgColor: '#ffedd5', icon: ShoppingCart },
  'Yemek': { color: '#eab308', textColor: '#ca8a04', bgColor: '#fef9c3', icon: Utensils },
  'Ulaşım': { color: '#3b82f6', textColor: '#2563eb', bgColor: '#dbeafe', icon: Bus },
  'Fatura': { color: '#ef4444', textColor: '#dc2626', bgColor: '#fee2e2', icon: FileText },
  'Eğlence': { color: '#a855f7', textColor: '#9333ea', bgColor: '#f3e8ff', icon: Gamepad2 },
  'Sağlık': { color: '#22c55e', textColor: '#16a34a', bgColor: '#dcfce7', icon: HeartPulse },
  'Giyim': { color: '#ec4899', textColor: '#db2777', bgColor: '#fce7f3', icon: Shirt },
  'Eğitim': { color: '#6366f1', textColor: '#4f46e5', bgColor: '#e0e7ff', icon: GraduationCap },
  'Maaş': { color: '#10b981', textColor: '#059669', bgColor: '#d1fae5', icon: DollarSign },
  'Gelir': { color: '#10b981', textColor: '#059669', bgColor: '#d1fae5', icon: DollarSign },
  'Ek Gelir': { color: '#14b8a6', textColor: '#0d9488', bgColor: '#ccfbf1', icon: PlusCircle },
  'Diğer': { color: '#6b7280', textColor: '#4b5563', bgColor: '#f3f4f6', icon: CircleEllipsis }
};

const accountIcons: Record<string, any> = {
  'cash': Banknote,
  'bank': Landmark,
  'credit-card': CreditCard,
  'other': Wallet,
  'debt': Wallet
};

const accountLabels: Record<string, string> = {
  'cash': 'Nakit',
  'bank': 'Banka Hesabı',
  'credit-card': 'Kredi Kartı',
  'other': 'Diğer Hesap',
  'debt': 'Borç Hesabı'
};

const AnimatedLinearGradient = Animated.createAnimatedComponent(LinearGradient);

export default function BudgetScreen() {
  const scrollY = useRef(new Animated.Value(0)).current;
  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = () => { setRefreshing(true); setTimeout(() => setRefreshing(false), 1200); };

  const [currentDate, setCurrentDate] = useState(new Date());
  
  // Data States
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<BudgetCategory[]>([]);
  const [bills, setBills] = useState<Bill[]>([]);
  const [transactionTemplates, setTransactionTemplates] = useState<TransactionTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  // Tab State: 'day' | 'month' | 'bills' | 'accounts'
  const [mainTab, setMainTab] = useState<'day' | 'month' | 'bills' | 'accounts'>('day');

  // FAB Menu Modal
  const [isFabOpen, setIsFabOpen] = useState(false);

  // Form Modals
  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [isBillModalOpen, setIsBillModalOpen] = useState(false);
  const [isPayBillModalOpen, setIsPayBillModalOpen] = useState(false);

  // Option Action Sheets
  const [isAccountActionsOpen, setIsAccountActionsOpen] = useState(false);
  const [isTransactionActionsOpen, setIsTransactionActionsOpen] = useState(false);
  const [isBillActionsOpen, setIsBillActionsOpen] = useState(false);
  const [isBudgetSettingsOpen, setIsBudgetSettingsOpen] = useState(false);

  // Editing Entity States
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [editingBill, setEditingBill] = useState<Bill | null>(null);
  const [payingBill, setPayingBill] = useState<Bill | null>(null);
  const [selectedMenuListAccount, setSelectedMenuListAccount] = useState<Account | null>(null);
  const [selectedMenuListTransaction, setSelectedMenuListTransaction] = useState<Transaction | null>(null);
  const [selectedMenuListBill, setSelectedMenuListBill] = useState<Bill | null>(null);

  // Form Field States
  // 1. Transaction Form
  const [txAmount, setTxAmount] = useState('');
  const [txType, setTxType] = useState<'income' | 'expense'>('expense');
  const [txCategory, setTxCategory] = useState('Diğer');
  const [txAccountId, setTxAccountId] = useState('');
  const [txDate, setTxDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [showTxDatePicker, setShowTxDatePicker] = useState(false);
  const [txDescription, setTxDescription] = useState('');
  const [txIsInstallment, setTxIsInstallment] = useState(false);
  const [txInstallmentsCount, setTxInstallmentsCount] = useState('3');
  const [txIsRecurring, setTxIsRecurring] = useState(false);

  // 2. Account Form
  const [accName, setAccName] = useState('');
  const [accType, setAccType] = useState<'cash' | 'bank' | 'credit-card' | 'other' | 'debt'>('bank');
  const [accBalance, setAccBalance] = useState('');
  const [accCreditLimit, setAccCreditLimit] = useState('');

  // 3. Bill Form
  const [billTitle, setBillTitle] = useState('');
  const [billAmount, setBillAmount] = useState('');
  const [billDueDate, setBillDueDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [showBillDatePicker, setShowBillDatePicker] = useState(false);
  const [billCategory, setBillCategory] = useState('Fatura');
  const [billIsRecurring, setBillIsRecurring] = useState(false);

  // 4. Pay Bill Form
  const [paymentAccountId, setPaymentAccountId] = useState('');

  // Collapsible paid bills state
  const [isPaidBillsArchiveOpen, setIsPaidBillsArchiveOpen] = useState(false);

  // Collapsible month summary state
  const [expandedMonth, setExpandedMonth] = useState<string | null>(null);

  useEffect(() => {
    let unsubs: any[] = [];
    try {
      unsubs.push(onAccountsUpdate(data => setAccounts(data)));
      unsubs.push(onTransactionsUpdate(data => {
        setAllTransactions(data);
        setLoading(false);
      }, subYears(new Date(), 3), addYears(new Date(), 3)));
      unsubs.push(onBudgetCategoriesUpdate(data => setCategories(data)));
      unsubs.push(onBillsUpdate(data => setBills(data)));
      unsubs.push(onTransactionTemplatesUpdate(data => setTransactionTemplates(data)));
    } catch (e) {
      console.log('Error starting subscriptions:', e);
      setLoading(false);
    }
    return () => unsubs.forEach(u => typeof u === 'function' && u());
  }, []);

  // Auto-apply pending transactions when date has arrived
  useEffect(() => {
    if (accounts.length === 0 || allTransactions.length === 0) return;
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const pendingTxs = allTransactions.filter(tx => tx.isApplied === false && tx.date <= todayStr);
    
    if (pendingTxs.length > 0) {
      const applyPending = async () => {
        try {
          const accountDeltas: Record<string, number> = {};
          for (const tx of pendingTxs) {
            if (!accountDeltas[tx.accountId]) accountDeltas[tx.accountId] = 0;
            accountDeltas[tx.accountId] += tx.type === 'income' ? tx.amount : -tx.amount;
          }
          
          for (const [accId, delta] of Object.entries(accountDeltas)) {
            const acc = accounts.find(a => a.id === accId);
            if (acc && delta !== 0) {
              await updateAccount(acc.id, { balance: acc.balance + delta });
            }
          }
          for (const tx of pendingTxs) {
            await updateTransaction(tx.id, { isApplied: true });
          }
        } catch (err) {
          console.error('Error applying pending transactions:', err);
        }
      };
      applyPending();
    }
  }, [allTransactions, accounts]);

  // Date Navigation Helpers
  const handleNavDate = (direction: 'prev' | 'next') => {
    if (mainTab === 'month') {
      setCurrentDate(prev => direction === 'prev' ? subYears(prev, 1) : addYears(prev, 1));
    } else {
      setCurrentDate(prev => direction === 'prev' ? subMonths(prev, 1) : addMonths(prev, 1));
    }
  };

  // Computations
  const accountStats = useMemo(() => {
    const assets = accounts.filter(a => a.type === 'cash' || a.type === 'bank');
    const debts = accounts.filter(a => a.type === 'credit-card' || a.type === 'debt');
    const totalAssets = assets.reduce((sum, a) => sum + a.balance, 0);
    const totalDebts = debts.reduce((sum, a) => sum + a.balance, 0);
    return {
      assets,
      debts,
      totalAssets,
      totalDebts,
      netWorth: totalAssets - totalDebts
    };
  }, [accounts]);

  const financialCalculations = useMemo(() => {
    const currentMonthStr = format(currentDate, 'yyyy-MM');
    const currentYearStr = format(currentDate, 'yyyy');

    // Filter transactions
    const monthTransactions = allTransactions.filter(t => t.date.substring(0, 7) === currentMonthStr);
    const yearTransactions = allTransactions.filter(t => t.date.substring(0, 4) === currentYearStr);

    const monthlyIncome = monthTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    const monthlyExpense = monthTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);

    const yearlyIncome = yearTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    const yearlyExpense = yearTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);

    // Group current month transactions by Date
    const daily: Record<string, { dateStr: string; dateISO: string; dayIncome: number; dayExpense: number; transactions: Transaction[] }> = {};
    monthTransactions.forEach(t => {
      if (!daily[t.date]) {
        daily[t.date] = {
          dateStr: format(parseISO(t.date), 'd MMMM EEEE', { locale: tr }),
          dateISO: t.date,
          dayIncome: 0,
          dayExpense: 0,
          transactions: []
        };
      }
      if (t.type === 'income') daily[t.date].dayIncome += t.amount;
      else daily[t.date].dayExpense += t.amount;
      daily[t.date].transactions.push(t);
    });

    const dailyGroups = Object.values(daily).sort((a, b) => b.dateISO.localeCompare(a.dateISO));
    dailyGroups.forEach(g => g.transactions.sort((a, b) => b.date.localeCompare(a.date)));

    // Group current year by month
    const months = eachMonthOfInterval({
      start: startOfYear(currentDate),
      end: endOfYear(currentDate)
    });
    const monthlySummaries = months.map(mStart => {
      const monthKey = format(mStart, 'yyyy-MM');
      const txs = allTransactions.filter(t => t.date.substring(0, 7) === monthKey);
      const inc = txs.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
      const exp = txs.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
      return {
        monthKey,
        monthName: format(mStart, 'MMMM', { locale: tr }),
        income: inc,
        expense: exp,
        net: inc - exp
      };
    });

    // Limited categories usage progress
    const monthlyCategorySpent = categories
      .filter(c => c.limit && c.limit > 0 && c.type === 'expense')
      .map(cat => {
        const spent = monthTransactions
          .filter(t => t.type === 'expense' && t.category === cat.name)
          .reduce((sum, t) => sum + t.amount, 0);
        const percent = Math.min(Math.round((spent / cat.limit!) * 100), 100);
        return {
          ...cat,
          spent,
          percent
        };
      });

    // Fixed / Recurring Expenses
    const recurringExpenses = allTransactions.filter(tx => tx.isRecurring && tx.type === 'expense' && tx.date.substring(0, 7) === currentMonthStr);

    return {
      monthlyIncome,
      monthlyExpense,
      yearlyIncome,
      yearlyExpense,
      dailyGroups,
      monthlySummaries,
      monthlyCategorySpent,
      recurringExpenses
    };
  }, [allTransactions, categories, currentDate]);

  // Statistics Display Config
  let headerTitle = 'Net Durum';
  let headerIncome = 0;
  let headerExpense = 0;
  let headerTotal = 0;
  let labelIncome = 'Gelir';
  let labelExpense = 'Gider';

  if (mainTab === 'accounts') {
    headerIncome = accountStats.totalAssets;
    headerExpense = accountStats.totalDebts;
    headerTotal = accountStats.netWorth;
    headerTitle = 'Net Varlık';
    labelIncome = 'Varlıklar';
    labelExpense = 'Borçlar';
  } else if (mainTab === 'month') {
    headerIncome = financialCalculations.yearlyIncome;
    headerExpense = financialCalculations.yearlyExpense;
    headerTotal = headerIncome - headerExpense;
    headerTitle = `${format(currentDate, 'yyyy')} Net Birikim`;
  } else if (mainTab === 'bills') {
    const unpaidAmt = bills.filter(b => !b.isPaid).reduce((sum, b) => sum + b.amount, 0);
    const paidAmt = bills.filter(b => b.isPaid).reduce((sum, b) => sum + b.amount, 0);
    headerIncome = paidAmt;
    headerExpense = unpaidAmt;
    headerTotal = unpaidAmt;
    headerTitle = 'Toplam Borç';
    labelIncome = 'Ödenen';
    labelExpense = 'Bekleyen';
  } else {
    headerIncome = financialCalculations.monthlyIncome;
    headerExpense = financialCalculations.monthlyExpense;
    headerTotal = headerIncome - headerExpense;
    headerTitle = `${format(currentDate, 'MMMM', { locale: tr })} Net Kalan`;
  }

  // --- ACTIONS HANDLERS ---
  const handleSaveAccount = async () => {
    if (!accName.trim() || !accBalance.trim()) {
      Alert.alert("Hata", "Lütfen hesap adı ve başlangıç bakiyesini doldurun.");
      return;
    }
    const balanceVal = parseFloat(accBalance.replace(',', '.'));
    const limitVal = accCreditLimit ? parseFloat(accCreditLimit.replace(',', '.')) : 0;
    
    if (isNaN(balanceVal)) {
      Alert.alert("Hata", "Geçersiz bakiye miktarı.");
      return;
    }

    try {
      const data = {
        name: accName.trim(),
        type: accType,
        balance: balanceVal,
        creditLimit: limitVal,
        ownerId: '' // Will default to current user UID inside dataService / family context
      };

      if (editingAccount) {
        await updateAccount(editingAccount.id, data);
        Alert.alert("Başarılı", "Hesap güncellendi.");
      } else {
        await addAccount(data);
        Alert.alert("Başarılı", "Yeni hesap oluşturuldu.");
      }
      setIsAccountModalOpen(false);
      setEditingAccount(null);
    } catch (e) {
      console.error(e);
      Alert.alert("Hata", "İşlem başarısız oldu.");
    }
  };

  const handleDeleteAccount = async (id: string) => {
    Alert.alert(
      "Hesabı Sil",
      "Bu hesabı ve ilişkili verileri silmek istediğinize emin misiniz?",
      [
        { text: "İptal", style: "cancel" },
        { 
          text: "Sil", 
          style: "destructive", 
          onPress: async () => {
            try {
              await deleteAccount(id);
              setIsAccountActionsOpen(false);
              Alert.alert("Silindi", "Hesap başarıyla kaldırıldı.");
            } catch (e) {
              console.error(e);
            }
          }
        }
      ]
    );
  };

  const handleSaveTransaction = async () => {
    if (!txAmount.trim() || !txAccountId) {
      Alert.alert("Hata", "Lütfen tutar ve hesap alanlarını doldurun.");
      return;
    }
    const amountVal = parseFloat(txAmount.replace(',', '.'));
    if (isNaN(amountVal) || amountVal <= 0) {
      Alert.alert("Hata", "Geçersiz tutar miktarı.");
      return;
    }

    try {
      const todayStr = format(new Date(), 'yyyy-MM-dd');
      
      const txData = {
        amount: amountVal,
        type: txType,
        accountId: txAccountId,
        category: txCategory,
        date: txDate,
        description: txDescription.trim(),
        isInstallment: txIsInstallment,
        isRecurring: txIsRecurring,
        isApplied: false
      };

      if (editingTransaction) {
        // Revert old transaction applied effect
        const oldTx = editingTransaction;
        const oldAcc = accounts.find(a => a.id === oldTx.accountId);
        const newAcc = accounts.find(a => a.id === txAccountId);
        const isAppliedNow = txDate <= todayStr;
        txData.isApplied = isAppliedNow;

        if (oldTx.accountId === txAccountId && oldAcc) {
          let tempBal = oldAcc.balance;
          if (oldTx.isApplied) {
            tempBal = oldTx.type === 'income' ? tempBal - oldTx.amount : tempBal + oldTx.amount;
          }
          if (isAppliedNow) {
            tempBal = txType === 'income' ? tempBal + amountVal : tempBal - amountVal;
          }
          await updateAccount(oldAcc.id, { balance: tempBal });
        } else {
          if (oldTx.isApplied && oldAcc) {
            const reverted = oldTx.type === 'income' ? oldAcc.balance - oldTx.amount : oldAcc.balance + oldTx.amount;
            await updateAccount(oldAcc.id, { balance: reverted });
          }
          if (isAppliedNow && newAcc) {
            const applied = txType === 'income' ? newAcc.balance + amountVal : newAcc.balance - amountVal;
            await updateAccount(newAcc.id, { balance: applied });
          }
        }
        await updateTransaction(editingTransaction.id, txData);
        Alert.alert("Başarılı", "İşlem güncellendi.");
      } else {
        // If installments enabled
        const totalInstallments = txIsInstallment ? parseInt(txInstallmentsCount) : 1;
        if (txIsInstallment && totalInstallments > 1) {
          const splitAmount = Math.round((amountVal / totalInstallments) * 100) / 100;
          
          for (let i = 0; i < totalInstallments; i++) {
            const itemDate = addMonths(parseISO(txDate), i);
            const itemDateStr = format(itemDate, 'yyyy-MM-dd');
            const isApplied = itemDateStr <= todayStr;

            const instData = {
              ...txData,
              amount: splitAmount,
              date: itemDateStr,
              isApplied,
              description: `${txDescription.trim() || txCategory} (${i + 1}/${totalInstallments})`,
              installmentDetails: { current: i + 1, total: totalInstallments }
            };

            if (isApplied) {
              const acc = accounts.find(a => a.id === txAccountId);
              if (acc) {
                const newBal = txType === 'income' ? acc.balance + splitAmount : acc.balance - splitAmount;
                await updateAccount(acc.id, { balance: newBal });
              }
            }
            await addTransaction(instData);
          }
          Alert.alert("Başarılı", `${totalInstallments} adet taksitli işlem oluşturuldu.`);
        } else {
          // Standard single transaction
          const isApplied = txDate <= todayStr;
          txData.isApplied = isApplied;
          
          if (isApplied) {
            const acc = accounts.find(a => a.id === txAccountId);
            if (acc) {
              const newBal = txType === 'income' ? acc.balance + amountVal : acc.balance - amountVal;
              await updateAccount(acc.id, { balance: newBal });
            }
          }
          await addTransaction(txData);
          Alert.alert("Başarılı", "İşlem başarıyla eklendi.");
        }
      }
      setIsTransactionModalOpen(false);
      setEditingTransaction(null);
    } catch (e) {
      console.error(e);
      Alert.alert("Hata", "İşlem başarısız oldu.");
    }
  };

  const handleDeleteTransaction = async (id: string) => {
    Alert.alert(
      "İşlemi Sil",
      "Bu işlemi silmek istediğinize emin misiniz?",
      [
        { text: "İptal", style: "cancel" },
        { 
          text: "Sil", 
          style: "destructive", 
          onPress: async () => {
            try {
              const tx = allTransactions.find(t => t.id === id);
              if (tx && tx.isApplied) {
                const acc = accounts.find(a => a.id === tx.accountId);
                if (acc) {
                  const reverted = tx.type === 'income' ? acc.balance - tx.amount : acc.balance + tx.amount;
                  await updateAccount(acc.id, { balance: reverted });
                }
              }
              await deleteTransaction(id);
              setIsTransactionActionsOpen(false);
              Alert.alert("Silindi", "İşlem silindi.");
            } catch (e) {
              console.error(e);
            }
          }
        }
      ]
    );
  };

  const handleSaveBill = async () => {
    if (!billTitle.trim() || !billAmount.trim()) {
      Alert.alert("Hata", "Lütfen fatura başlığını ve tutarını girin.");
      return;
    }
    const amtVal = parseFloat(billAmount.replace(',', '.'));
    if (isNaN(amtVal) || amtVal <= 0) {
      Alert.alert("Hata", "Geçersiz fatura tutarı.");
      return;
    }

    try {
      const data = {
        title: billTitle.trim(),
        amount: amtVal,
        dueDate: billDueDate,
        category: billCategory,
        isRecurring: billIsRecurring,
        isPaid: editingBill ? editingBill.isPaid : false
      };

      if (editingBill) {
        await updateBill(editingBill.id, data);
        Alert.alert("Başarılı", "Fatura güncellendi.");
      } else {
        await addBill(data);
        Alert.alert("Başarılı", "Fatura oluşturuldu.");
      }
      setIsBillModalOpen(false);
      setEditingBill(null);
    } catch (e) {
      console.error(e);
      Alert.alert("Hata", "İşlem kaydedilemedi.");
    }
  };

  const handleDeleteBill = async (id: string) => {
    Alert.alert(
      "Faturayı Sil",
      "Bu faturayı takvimden ve sistemden silmek istediğinize emin misiniz?",
      [
        { text: "İptal", style: "cancel" },
        { 
          text: "Sil", 
          style: "destructive", 
          onPress: async () => {
            try {
              await deleteBill(id);
              setIsBillActionsOpen(false);
              Alert.alert("Silindi", "Fatura başarıyla kaldırıldı.");
            } catch (e) {
              console.error(e);
            }
          }
        }
      ]
    );
  };

  const handlePayBill = async () => {
    if (!payingBill || !paymentAccountId) return;
    try {
      const acc = accounts.find(a => a.id === paymentAccountId);
      if (!acc) return;
      if (acc.balance < payingBill.amount) {
        Alert.alert("Yetersiz Bakiye", "Seçilen hesap bakiyesi fatura tutarından düşüktür. Yine de ödemek ister misiniz?", [
          { text: "İptal", style: "cancel" },
          { text: "Öde", onPress: () => proceedBillPayment(acc) }
        ]);
      } else {
        await proceedBillPayment(acc);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const proceedBillPayment = async (acc: Account) => {
    if (!payingBill) return;
    try {
      // 1. Deduct account balance
      await updateAccount(acc.id, { balance: acc.balance - payingBill.amount });
      
      // 2. Create transaction expense
      const txData = {
        amount: payingBill.amount,
        type: 'expense' as const,
        accountId: acc.id,
        category: 'Fatura',
        date: format(new Date(), 'yyyy-MM-dd'),
        isInstallment: false,
        isRecurring: false,
        isApplied: true,
        description: payingBill.title
      };
      await addTransaction(txData);

      // 3. Mark bill paid
      await updateBill(payingBill.id, {
        isPaid: true,
        paidDate: new Date().toISOString(),
        paidAccountId: acc.id
      });

      setIsPayBillModalOpen(false);
      setPayingBill(null);
      setPaymentAccountId('');
      Alert.alert("Ödeme Tamamlandı", `${payingBill.title} faturası ödendi ve işlem kaydı bütçeye yazıldı.`);
    } catch (e) {
      console.error(e);
      Alert.alert("Hata", "Fatura ödenirken hata oluştu.");
    }
  };

  // Pre-fill Forms helper
  const handleFabPress = () => {
    if (mainTab === 'day' || mainTab === 'month') {
      openNewTransaction();
    } else if (mainTab === 'accounts') {
      openNewAccount();
    } else if (mainTab === 'bills') {
      openNewBill();
    }
  };

  const openNewTransaction = () => {
    setEditingTransaction(null);
    setTxAmount('');
    setTxType('expense');
    setTxCategory('Diğer');
    setTxAccountId(accounts[0]?.id || '');
    setTxDate(format(new Date(), 'yyyy-MM-dd'));
    setTxDescription('');
    setTxIsInstallment(false);
    setTxInstallmentsCount('3');
    setTxIsRecurring(false);
    setIsTransactionModalOpen(true);
  };

  const openEditTransaction = (tx: Transaction) => {
    setEditingTransaction(tx);
    setTxAmount(tx.amount.toString());
    setTxType(tx.type);
    setTxCategory(tx.category || 'Diğer');
    setTxAccountId(tx.accountId);
    setTxDate(tx.date);
    setTxDescription(tx.description || '');
    setTxIsInstallment(tx.isInstallment || false);
    setTxInstallmentsCount(tx.installmentDetails?.total?.toString() || '3');
    setTxIsRecurring(tx.isRecurring || false);
    setIsTransactionModalOpen(true);
  };

  const openNewAccount = () => {
    setEditingAccount(null);
    setAccName('');
    setAccType('bank');
    setAccBalance('');
    setAccCreditLimit('');
    setIsAccountModalOpen(true);
  };

  const openEditAccount = (acc: Account) => {
    setEditingAccount(acc);
    setAccName(acc.name);
    setAccType(acc.type);
    setAccBalance(acc.balance.toString());
    setAccCreditLimit(acc.creditLimit?.toString() || '');
    setIsAccountModalOpen(true);
  };

  const openNewBill = () => {
    setEditingBill(null);
    setBillTitle('');
    setBillAmount('');
    setBillDueDate(format(new Date(), 'yyyy-MM-dd'));
    setBillCategory('Fatura');
    setBillIsRecurring(false);
    setIsBillModalOpen(true);
  };

  const openEditBill = (b: Bill) => {
    setEditingBill(b);
    setBillTitle(b.title);
    setBillAmount(b.amount.toString());
    setBillDueDate(b.dueDate);
    setBillCategory(b.category || 'Fatura');
    setBillIsRecurring(b.isRecurring || false);
    setIsBillModalOpen(true);
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 justify-center items-center bg-slate-50 dark:bg-slate-950">
        <ActivityIndicator size="large" color="#8f628c" />
      </SafeAreaView>
    );
  }

  return (
    <View className="flex-1 bg-slate-50 dark:bg-[#0a0a14]">
      {/* Stack.Screen is handled in _layout.tsx now */}

      {/* ─── STICKY HEADER (FinPlan Purple Gradient) ─── */}
      <AnimatedLinearGradient
        colors={theme.purpleGrad}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={[styles.headerGradient, {
          paddingBottom: Animated.subtract(
            20,
            Animated.multiply(
              scrollY.interpolate({ inputRange: [0, 100], outputRange: [0, 1], extrapolate: 'clamp' }),
              20
            )
          ),
          paddingTop: Animated.subtract(
            16,
            Animated.multiply(
              scrollY.interpolate({ inputRange: [0, 100], outputRange: [0, 1], extrapolate: 'clamp' }),
              16
            )
          ),
          opacity: scrollY.interpolate({ inputRange: [0, 100], outputRange: [1, 0.95], extrapolate: 'clamp' }),
          height: Animated.subtract(
            260,
            Animated.multiply(
              scrollY.interpolate({ inputRange: [0, 150], outputRange: [0, 1], extrapolate: 'clamp' }),
              80
            )
          )
        }]}
>
        <SafeAreaView edges={['top']} className="m-0 p-0" />
        <View className="flex-row justify-between items-center mb-5">
          <TouchableOpacity onPress={() => router.back()} className="w-9 h-9 rounded-full bg-white/20 items-center justify-center">
            <ChevronLeft size={20} color="white" />
          </TouchableOpacity>
          <Text className="text-white font-bold text-base tracking-wide">Bütçe Takibi</Text>
          <TouchableOpacity onPress={() => setIsBudgetSettingsOpen(true)} className="w-9 h-9 rounded-full bg-white/20 items-center justify-center">
            <MoreHorizontal size={20} color="white" />
          </TouchableOpacity>
        </View>

        <View className="items-center mb-6">
          <Text className="text-purple-200/80 text-[10px] font-bold uppercase tracking-wider mb-1">
            {headerTitle}
          </Text>
          <Text className="text-white text-4xl font-black">
            ₺{headerTotal.toLocaleString('tr-TR')}
          </Text>
        </View>

        <View className="flex-row justify-between gap-3 px-1">
          <View className="flex-1 bg-white/10 rounded-2xl p-3 flex-row items-center gap-3">
            <View className="w-8 h-8 rounded-full bg-emerald-500/20 items-center justify-center shrink-0">
              <ArrowDownLeft size={16} color="#34d399" />
            </View>
            <View className="flex-1">
              <Text className="text-purple-100/70 text-[9px] font-bold uppercase tracking-wider">{labelIncome}</Text>
              <Text className="text-white font-bold text-sm" numberOfLines={1}>₺{headerIncome.toLocaleString('tr-TR')}</Text>
            </View>
          </View>
          <View className="flex-1 bg-white/10 rounded-2xl p-3 flex-row items-center gap-3">
            <View className="w-8 h-8 rounded-full bg-rose-500/20 items-center justify-center shrink-0">
              <ArrowUpRight size={16} color="#f87171" />
            </View>
            <View className="flex-1">
              <Text className="text-purple-100/70 text-[9px] font-bold uppercase tracking-wider">{labelExpense}</Text>
              <Text className="text-white font-bold text-sm" numberOfLines={1}>₺{headerExpense.toLocaleString('tr-TR')}</Text>
            </View>
          </View>
        </View>
      </AnimatedLinearGradient>

      {/* ─── TABS SWITCHER (FinPlan Rounded Card) ─── */}
      <View className="px-4 -mt-5 z-20">
        <View className="bg-white dark:bg-slate-900 rounded-[1.5rem] p-1 flex-row shadow-md border border-slate-200/40 dark:border-slate-800">
          {(['day', 'month', 'bills', 'accounts'] as const).map(tab => {
            const isActive = mainTab === tab;
            let label = 'Günlük';
            let TabIcon = CalendarIcon;
            if (tab === 'month') { label = 'Aylık'; TabIcon = BarChart2; }
            else if (tab === 'bills') { label = 'Faturalar'; TabIcon = FileText; }
            else if (tab === 'accounts') { label = 'Hesaplar'; TabIcon = Wallet; }

            return (
              <TouchableOpacity
                key={tab}
                onPress={() => setMainTab(tab)}
                className={`flex-1 py-3 rounded-2xl items-center justify-center flex-row gap-1 ${isActive ? 'bg-purple-50 dark:bg-purple-950/20' : ''}`}
              >
                <TabIcon size={14} color={isActive ? theme.darkPurple : '#94a3b8'} />
                <Text style={{ color: isActive ? theme.darkPurple : '#64748b' }} className="font-bold text-[10px]">
                  {label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* ─── SCROLL CONTENT ─── */}
      <Animated.ScrollView 
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: false })}
        scrollEventThrottle={16}
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 110 }} 
        showsVerticalScrollIndicator={false} 
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={false ? '#fff' : '#000'} />}
      >

        {/* ─── Tab 1: GÜNLÜK (Day) ─── */}
        {mainTab === 'day' && (
          <View className="space-y-5">
            {/* Month Nav */}
            <View className="flex-row justify-between items-center bg-white dark:bg-slate-900 px-4 py-2.5 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
              <TouchableOpacity onPress={() => handleNavDate('prev')} className="w-8 h-8 rounded-full bg-purple-50 dark:bg-purple-950/20 items-center justify-center">
                <ChevronLeft size={16} color={theme.darkPurple} />
              </TouchableOpacity>
              <Text className="text-slate-800 dark:text-white font-extrabold text-sm uppercase">
                {format(currentDate, 'MMMM yyyy', { locale: tr })}
              </Text>
              <TouchableOpacity onPress={() => handleNavDate('next')} className="w-8 h-8 rounded-full bg-purple-50 dark:bg-purple-950/20 items-center justify-center">
                <ChevronRight size={16} color={theme.darkPurple} />
              </TouchableOpacity>
            </View>

            {/* Category Progress Limits */}
            {financialCalculations.monthlyCategorySpent.length > 0 && (
              <View className="space-y-3">
                <Text className="text-slate-800 dark:text-white font-black text-xs uppercase tracking-wider ml-1">Kategori Limitleri</Text>
                <View className="bg-white dark:bg-slate-900 rounded-[1.5rem] p-4 shadow-sm border border-slate-100 dark:border-slate-800 space-y-4.5">
                  {financialCalculations.monthlyCategorySpent.map(cat => {
                    const progress = cat.percent;
                    const isExceeded = progress >= 100;
                    const alertColor = progress >= 90 ? '#ef4444' : progress >= 75 ? '#f59e0b' : '#8f628c';

                    return (
                      <View key={cat.id}>
                        <View className="flex-row justify-between items-center mb-1">
                          <Text className="text-slate-800 dark:text-slate-200 font-bold text-xs">{cat.name}</Text>
                          <Text className="text-slate-800 dark:text-slate-200 font-black text-xs">
                            ₺{cat.spent.toLocaleString('tr-TR')} / <Text className="text-slate-400 font-semibold">₺{cat.limit!.toLocaleString('tr-TR')}</Text>
                          </Text>
                        </View>
                        <View className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                          <View className="h-full rounded-full" style={{ width: `${progress}%`, backgroundColor: alertColor }} />
                        </View>
                      </View>
                    );
                  })}
                </View>
              </View>
            )}

            {/* Grouped Transactions List */}
            <View className="space-y-3">
              <Text className="text-slate-800 dark:text-white font-black text-xs uppercase tracking-wider ml-1">İşlemler</Text>
              
              {financialCalculations.dailyGroups.length === 0 ? (
                <View className="items-center justify-center py-16 bg-white/70 dark:bg-slate-900/60 rounded-[1.5rem] border border-dashed border-slate-200/50">
                  <Wallet size={36} color="#94a3b8" className="opacity-40 mb-2" />
                  <Text className="text-slate-500 font-bold text-xs">Bu ay işlem kaydı bulunmamaktadır.</Text>
                </View>
              ) : (
                financialCalculations.dailyGroups.map(group => (
                  <View key={group.dateISO} className="mb-4">
                    {/* Date Row Header */}
                    <View className="flex-row justify-between items-center px-1 mb-2">
                      <Text className="text-slate-400 dark:text-slate-400 font-bold text-[10px] uppercase tracking-wider">{group.dateStr}</Text>
                      <View className="flex-row gap-2">
                        {group.dayIncome > 0 && (
                          <Text className="text-[10px] bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-full font-bold">
                            +₺{group.dayIncome.toLocaleString('tr-TR')}
                          </Text>
                        )}
                        {group.dayExpense > 0 && (
                          <Text className="text-[10px] bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 px-2 py-0.5 rounded-full font-bold">
                            -₺{group.dayExpense.toLocaleString('tr-TR')}
                          </Text>
                        )}
                      </View>
                    </View>

                    {/* Group Items Panel */}
                    <View className="bg-white dark:bg-slate-900 rounded-[1.5rem] p-1.5 shadow-sm border border-slate-200/40 dark:border-slate-800">
                      {group.transactions.map((tx, idx) => {
                        const acc = accounts.find(a => a.id === tx.accountId);
                        const conf = categoryConfig[tx.category || 'Diğer'] || categoryConfig.Diğer;
                        const CategoryIcon = conf.icon;

                        return (
                          <TouchableOpacity
                            key={tx.id}
                            onPress={() => {
                              setSelectedMenuListTransaction(tx);
                              setIsTransactionActionsOpen(true);
                            }}
                            className={`flex-row items-center justify-between p-3.5 ${idx !== group.transactions.length - 1 ? 'border-b border-slate-100/50 dark:border-slate-800/50' : ''}`}
                          >
                            <View className="flex-row items-center flex-1 min-w-0 mr-3">
                              <View style={{ backgroundColor: conf.bgColor }} className="w-10 h-10 rounded-full items-center justify-center shrink-0 mr-3 shadow-inner">
                                <CategoryIcon size={16} color={conf.color} />
                              </View>
                              <View className="flex-1 min-w-0">
                                <Text className="text-slate-850 dark:text-slate-200 font-bold text-sm truncate leading-tight">
                                  {tx.category}
                                </Text>
                                <Text className="text-slate-400 text-[10px] font-bold truncate mt-0.5">
                                  {acc?.name || 'Hesap Yok'}
                                  {tx.description ? ` • ${tx.description}` : ''}
                                </Text>
                              </View>
                            </View>
                            <Text 
                              style={{ color: tx.type === 'income' ? '#10b981' : '#1e293b' }} 
                              className="font-black text-sm shrink-0 dark:text-slate-200"
                            >
                              {tx.type === 'expense' ? '-' : '+'}₺{tx.amount.toLocaleString('tr-TR')}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>
                ))
              )}
            </View>
          </View>
        )}

        {/* ─── Tab 2: AYLIK (Month) ─── */}
        {mainTab === 'month' && (
          <View className="space-y-5">
            {/* Year Nav */}
            <View className="flex-row justify-between items-center bg-white dark:bg-slate-900 px-4 py-2.5 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
              <TouchableOpacity onPress={() => handleNavDate('prev')} className="w-8 h-8 rounded-full bg-purple-50 dark:bg-purple-950/20 items-center justify-center">
                <ChevronLeft size={16} color={theme.darkPurple} />
              </TouchableOpacity>
              <Text className="text-slate-800 dark:text-white font-extrabold text-sm uppercase">
                {format(currentDate, 'yyyy')} YILI
              </Text>
              <TouchableOpacity onPress={() => handleNavDate('next')} className="w-8 h-8 rounded-full bg-purple-50 dark:bg-purple-950/20 items-center justify-center">
                <ChevronRight size={16} color={theme.darkPurple} />
              </TouchableOpacity>
            </View>

            {/* Monthly Breakdowns */}
            <View className="space-y-3">
              <Text className="text-slate-800 dark:text-white font-black text-xs uppercase tracking-wider ml-1">Aylık Özet</Text>
              <View className="bg-white dark:bg-slate-900 rounded-[1.5rem] p-1.5 shadow-sm border border-slate-200/40 dark:border-slate-800">
                {financialCalculations.monthlySummaries.map((summary, idx) => {
                  const isExpanded = expandedMonth === summary.monthKey;
                  const monthExpenses = allTransactions.filter(
                    t => t.date.substring(0, 7) === summary.monthKey && t.type === 'expense'
                  ).sort((a,b) => b.date.localeCompare(a.date));

                  return (
                    <View key={summary.monthKey} className={idx !== financialCalculations.monthlySummaries.length - 1 ? 'border-b border-slate-100/50 dark:border-slate-800/50' : ''}>
                      <TouchableOpacity 
                        onPress={() => setExpandedMonth(isExpanded ? null : summary.monthKey)}
                        className="flex-row justify-between items-center p-3.5"
                      >
                        <View className="flex-row items-center">
                          <ChevronRight 
                            size={16} 
                            color="#94a3b8" 
                            style={{ transform: [{ rotate: isExpanded ? '90deg' : '0deg' }], marginRight: 8 }} 
                          />
                          <View>
                            <Text className="text-slate-850 dark:text-slate-250 font-bold text-sm capitalize">{summary.monthName}</Text>
                            <Text className="text-slate-400 text-[9px] font-bold mt-0.5">
                              +{summary.income.toLocaleString('tr-TR')} / -{summary.expense.toLocaleString('tr-TR')}
                            </Text>
                          </View>
                        </View>
                        <Text 
                          style={{ color: summary.net >= 0 ? '#10b981' : '#ef4444' }}
                          className="font-black text-sm"
                        >
                          {summary.net >= 0 ? '+' : ''}₺{summary.net.toLocaleString('tr-TR')}
                        </Text>
                      </TouchableOpacity>
                      
                      {isExpanded && (
                        <View className="bg-slate-50 dark:bg-slate-800/30 mx-3 mb-3 p-3 rounded-2xl">
                          {monthExpenses.length === 0 ? (
                            <Text className="text-slate-400 text-xs text-center py-2">Harcama bulunamadı.</Text>
                          ) : (
                            monthExpenses.map((tx, tIdx) => {
                              const conf = categoryConfig[tx.category || 'Diğer'] || categoryConfig.Diğer;
                              const Icon = conf.icon;
                              return (
                                <View key={tx.id} className={`flex-row justify-between items-center py-2 ${tIdx !== monthExpenses.length - 1 ? 'border-b border-slate-100 dark:border-slate-800/50' : ''}`}>
                                  <View className="flex-row items-center flex-1 pr-2">
                                    <View style={{ backgroundColor: conf.bgColor }} className="w-6 h-6 rounded-lg items-center justify-center mr-2">
                                      <Icon size={12} color={conf.color} />
                                    </View>
                                    <View>
                                      <Text className="text-slate-700 dark:text-slate-300 font-bold text-xs" numberOfLines={1}>{tx.name}</Text>
                                      <Text className="text-slate-400 text-[9px] font-bold">{tx.date.substring(8, 10)} {summary.monthName.substring(0, 3)}</Text>
                                    </View>
                                  </View>
                                  <Text className="text-slate-600 dark:text-slate-400 font-bold text-xs">-₺{tx.amount.toLocaleString('tr-TR')}</Text>
                                </View>
                              );
                            })
                          )}
                        </View>
                      )}
                    </View>
                  );
                })}
              </View>
            </View>

            {/* Subscription / Fixed expenses */}
            {financialCalculations.recurringExpenses.length > 0 && (
              <View className="space-y-3">
                <Text className="text-slate-800 dark:text-white font-black text-xs uppercase tracking-wider ml-1">Sabit Giderler</Text>
                <View className="bg-white dark:bg-slate-900 rounded-[1.5rem] p-1.5 shadow-sm border border-slate-200/40 dark:border-slate-800">
                  {financialCalculations.recurringExpenses.map((tx, idx) => {
                    const conf = categoryConfig[tx.category || 'Diğer'] || categoryConfig.Diğer;
                    const CategoryIcon = conf.icon;
                    return (
                      <View 
                        key={tx.id}
                        className={`flex-row justify-between items-center p-3.5 ${idx !== financialCalculations.recurringExpenses.length - 1 ? 'border-b border-slate-100/50' : ''}`}
                      >
                        <View className="flex-row items-center">
                          <View style={{ backgroundColor: conf.bgColor }} className="w-9 h-9 rounded-full items-center justify-center mr-3">
                            <CategoryIcon size={14} color={conf.color} />
                          </View>
                          <View>
                            <Text className="text-slate-800 dark:text-slate-200 font-bold text-xs leading-none mb-1">{tx.category}</Text>
                            <Text className="text-slate-400 text-[8px] font-bold uppercase tracking-wider">Abonelik / Her Ay</Text>
                          </View>
                        </View>
                        <Text className="text-rose-500 font-black text-xs">-₺{tx.amount.toLocaleString('tr-TR')}</Text>
                      </View>
                    );
                  })}
                </View>
              </View>
            )}
          </View>
        )}

        {/* ─── Tab 3: FATURALAR (Bills) ─── */}
        {mainTab === 'bills' && (
          <View className="space-y-5">
            {/* Unpaid Bills */}
            <View className="space-y-3">
              <Text className="text-slate-800 dark:text-white font-black text-xs uppercase tracking-wider ml-1">Ödenmeyen Faturalar</Text>
              
              {bills.filter(b => !b.isPaid).length === 0 ? (
                <View className="items-center justify-center py-16 bg-white/70 dark:bg-slate-900/60 rounded-[1.5rem] border border-dashed border-slate-200/50">
                  <CheckCircle2 size={36} color="#10b981" className="opacity-40 mb-2" />
                  <Text className="text-slate-500 font-bold text-xs">Ödenmemiş fatura kaydı bulunmamaktadır.</Text>
                </View>
              ) : (
                <View className="bg-white dark:bg-slate-900 rounded-[1.5rem] p-1.5 shadow-sm border border-slate-200/40 dark:border-slate-800">
                  {bills.filter(b => !b.isPaid).map((bill, idx, arr) => {
                    const config = categoryConfig[bill.category || 'Fatura'] || categoryConfig.Fatura;
                    const BillIcon = config.icon;

                    return (
                      <TouchableOpacity
                        key={bill.id}
                        onPress={() => {
                          setSelectedMenuListBill(bill);
                          setIsBillActionsOpen(true);
                        }}
                        className={`flex-row items-center justify-between p-3.5 ${idx !== arr.length - 1 ? 'border-b border-slate-100/50 dark:border-slate-800/50' : ''}`}
                      >
                        <View className="flex-row items-center flex-1 min-w-0 mr-3">
                          <View style={{ backgroundColor: '#fee2e2' }} className="w-10 h-10 rounded-full items-center justify-center shrink-0 mr-3">
                            <BillIcon size={16} color="#ef4444" />
                          </View>
                          <View className="flex-1 min-w-0">
                            <Text className="text-slate-800 dark:text-slate-200 font-bold text-sm truncate leading-tight">{bill.title}</Text>
                            <Text className="text-rose-500 text-[10px] font-bold mt-0.5">Vade: {format(parseISO(bill.dueDate), 'd MMM yyyy', { locale: tr })}</Text>
                          </View>
                        </View>
                        <Text className="text-slate-850 dark:text-slate-200 font-black text-sm shrink-0">₺{bill.amount.toLocaleString('tr-TR')}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
            </View>

            {/* Paid Bills Collapsible Archive */}
            <View className="space-y-2">
              <TouchableOpacity 
                onPress={() => setIsPaidBillsArchiveOpen(!isPaidBillsArchiveOpen)}
                className="flex-row justify-between items-center bg-white/70 dark:bg-slate-900/60 p-4 rounded-2xl border border-slate-200/50 dark:border-slate-800"
              >
                <Text className="text-slate-700 dark:text-slate-350 font-bold text-xs">Ödenmiş Arşiv ({bills.filter(b => b.isPaid).length})</Text>
                <ChevronRight size={16} color="#64748b" style={{ transform: [{ rotate: isPaidBillsArchiveOpen ? '90deg' : '0deg' }] }} />
              </TouchableOpacity>

              {isPaidBillsArchiveOpen && (
                <View className="bg-white dark:bg-slate-900 rounded-[1.5rem] p-1.5 shadow-sm border border-slate-200/40 dark:border-slate-800">
                  {bills.filter(b => b.isPaid).length === 0 ? (
                    <Text className="text-center text-slate-400 py-6 text-xs font-semibold">Ödenmiş fatura arşivi boş.</Text>
                  ) : (
                    Object.entries(
                      bills.filter(b => b.isPaid)
                        .sort((a,b) => b.dueDate.localeCompare(a.dueDate)) // newest first
                        .reduce((acc, bill) => {
                          const monthName = format(parseISO(bill.dueDate), 'MMMM yyyy', { locale: tr });
                          if (!acc[monthName]) acc[monthName] = [];
                          acc[monthName].push(bill);
                          return acc;
                        }, {} as Record<string, typeof bills>)
                    ).map(([month, monthBills], monthIdx, monthArr) => (
                      <View key={month} className={monthIdx !== monthArr.length - 1 ? "border-b border-slate-100 dark:border-slate-800 pb-2 mb-2" : ""}>
                        <View className="bg-slate-100 dark:bg-slate-800/80 rounded-lg py-1.5 px-3 mt-1.5 mx-2 mb-2 self-start">
                          <Text className="text-slate-500 dark:text-slate-400 font-bold text-[10px] uppercase tracking-wider">{month}</Text>
                        </View>
                        {monthBills.map((bill, idx) => {
                          const acc = accounts.find(a => a.id === bill.paidAccountId);
                          return (
                            <View 
                              key={bill.id}
                              className={`flex-row items-center justify-between p-3.5 ${idx !== monthBills.length - 1 ? 'border-b border-slate-50 dark:border-slate-800/50' : ''}`}
                            >
                              <View className="flex-row items-center">
                                <View className="w-8 h-8 rounded-full bg-emerald-50 dark:bg-emerald-950/20 items-center justify-center mr-3">
                                  <Check size={14} color="#10b981" />
                                </View>
                                <View>
                                  <Text className="text-slate-600 dark:text-slate-350 font-bold text-xs leading-none mb-1">{bill.title}</Text>
                                  <Text className="text-slate-400 text-[9px] font-bold">
                                    {acc?.name || 'Hesap'} üzerinden ödendi
                                  </Text>
                                </View>
                              </View>
                              <Text className="text-slate-500 font-bold text-xs">₺{bill.amount.toLocaleString('tr-TR')}</Text>
                            </View>
                          );
                        })}
                      </View>
                    ))
                  )}
                </View>
              )}
            </View>
          </View>
        )}

        {/* ─── Tab 4: HESAPLAR (Accounts) ─── */}
        {mainTab === 'accounts' && (
          <View className="space-y-5">
            {/* Varlıklar (Assets) */}
            <View className="space-y-3">
              <Text className="text-slate-800 dark:text-white font-black text-xs uppercase tracking-wider ml-1">Varlıklarım (Nakit / Banka)</Text>
              <View className="bg-white dark:bg-slate-900 rounded-[1.5rem] p-1.5 shadow-sm border border-slate-200/40 dark:border-slate-800">
                {accountStats.assets.length === 0 ? (
                  <Text className="text-center text-slate-400 py-6 text-xs font-semibold">Varlık hesabı bulunmamaktadır.</Text>
                ) : (
                  accountStats.assets.map((acc, idx) => {
                    const AccIcon = accountIcons[acc.type] || Wallet;
                    return (
                      <TouchableOpacity
                        key={acc.id}
                        onPress={() => {
                          setSelectedMenuListAccount(acc);
                          setIsAccountActionsOpen(true);
                        }}
                        className={`flex-row items-center justify-between p-3.5 ${idx !== accountStats.assets.length - 1 ? 'border-b border-slate-100/50 dark:border-slate-800/50' : ''}`}
                      >
                        <View className="flex-row items-center">
                          <View className="w-9 h-9 rounded-xl bg-purple-50 dark:bg-purple-950/20 items-center justify-center mr-3">
                            <AccIcon size={16} color={theme.darkPurple} />
                          </View>
                          <View>
                            <Text className="text-slate-800 dark:text-slate-200 font-bold text-xs leading-none mb-1">{acc.name}</Text>
                            <Text className="text-slate-450 text-[9px] font-bold">{accountLabels[acc.type]}</Text>
                          </View>
                        </View>
                        <Text className="text-emerald-500 font-black text-xs">₺{acc.balance.toLocaleString('tr-TR')}</Text>
                      </TouchableOpacity>
                    );
                  })
                )}
              </View>
            </View>

            {/* Yükümlülükler / Borçlar (Debts / Credit Cards) */}
            <View className="space-y-3">
              <Text className="text-slate-800 dark:text-white font-black text-xs uppercase tracking-wider ml-1">Borçlarım & Kartlarım</Text>
              <View className="bg-white dark:bg-slate-900 rounded-[1.5rem] p-1.5 shadow-sm border border-slate-200/40 dark:border-slate-800">
                {accountStats.debts.length === 0 ? (
                  <Text className="text-center text-slate-400 py-6 text-xs font-semibold">Borç/Kart hesabı bulunmamaktadır.</Text>
                ) : (
                  accountStats.debts.map((acc, idx) => {
                    const AccIcon = accountIcons[acc.type] || Wallet;
                    return (
                      <TouchableOpacity
                        key={acc.id}
                        onPress={() => {
                          setSelectedMenuListAccount(acc);
                          setIsAccountActionsOpen(true);
                        }}
                        className={`flex-row items-center justify-between p-3.5 ${idx !== accountStats.debts.length - 1 ? 'border-b border-slate-100/50 dark:border-slate-800/50' : ''}`}
                      >
                        <View className="flex-row items-center">
                          <View className="w-9 h-9 rounded-xl bg-rose-50 dark:bg-rose-950/20 items-center justify-center mr-3">
                            <AccIcon size={16} color="#ef4444" />
                          </View>
                          <View>
                            <Text className="text-slate-850 dark:text-slate-200 font-bold text-xs leading-none mb-1">{acc.name}</Text>
                            <Text className="text-slate-450 text-[9px] font-bold">
                              {accountLabels[acc.type]}
                              {acc.creditLimit ? ` • Limiter: ₺${acc.creditLimit}` : ''}
                            </Text>
                          </View>
                        </View>
                        <Text className="text-slate-800 dark:text-slate-200 font-black text-xs">₺{acc.balance.toLocaleString('tr-TR')}</Text>
                      </TouchableOpacity>
                    );
                  })
                )}
              </View>
            </View>
          </View>
        )}

      </Animated.ScrollView>

      {/* ─── FLOATING ACTION BUTTON & MENU ─── */}
      <TouchableOpacity
        onPress={handleFabPress}
        className="absolute bottom-24 right-5 w-14 h-14 rounded-full shadow-lg justify-center items-center z-30"
      >
        <LinearGradient
          colors={theme.purpleGrad}
          style={styles.fabGradient}
        >
          <Plus size={24} color="white" />
        </LinearGradient>
      </TouchableOpacity>



      {/* ── MODAL: TRANSACTION FORM (Replaced with View for Context Bug) ── */}
      {isTransactionModalOpen && (
        <View className="absolute inset-0 z-50 elevation-5">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1 justify-end bg-black/60">
          <View className="bg-white dark:bg-slate-900 rounded-t-[2.5rem] p-6 shadow-2xl max-h-[90%]">
            <ScrollView showsVerticalScrollIndicator={false}>
              
              {/* Header */}
              <View className="flex-row justify-between items-center mb-4 pb-2 border-b border-slate-100 dark:border-slate-800">
                <Text className="text-lg font-black text-slate-800 dark:text-white">
                  {editingTransaction ? '✏️ İşlemi Düzenle' : '💵 Yeni İşlem Ekle'}
                </Text>
                <TouchableOpacity onPress={() => setIsTransactionModalOpen(false)} className="p-1">
                  <X size={20} color="#64748b" />
                </TouchableOpacity>
              </View>

              {/* Quick Templates */}
              {!editingTransaction && transactionTemplates.filter(t => t.type === txType).length > 0 && (
                <View className="mb-4">
                  <Text className="text-slate-550 font-bold text-[9px] uppercase tracking-wider mb-2 ml-1">Hızlı Şablonlar</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row overflow-visible">
                    {transactionTemplates.filter(t => t.type === txType).map(t => (
                      <TouchableOpacity
                        key={t.id}
                        onPress={() => {
                          setTxType(t.type);
                          setTxCategory(t.category);
                          if (t.accountId) setTxAccountId(t.accountId);
                          setTxDescription(t.name || '');
                          if (t.amount && t.amount > 0) setTxAmount(t.amount.toString());
                        }}
                        className="bg-purple-50 dark:bg-purple-900/20 px-3.5 py-2 rounded-xl mr-2 border border-purple-100 dark:border-purple-800"
                      >
                        <Text className="text-purple-700 dark:text-purple-300 font-bold text-xs">{t.name}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}

              {/* Type Switcher (Native styles to bypass NativeWind context bugs) */}
              <View className="flex-row bg-slate-100 dark:bg-slate-800 p-1.5 rounded-2xl mb-6">
                <TouchableOpacity 
                  onPress={() => {
                    setTxType('expense');
                    const validCategories = categories.filter(c => c.type === 'expense');
                    if (validCategories.length > 0 && !validCategories.find(c => c.name === txCategory)) {
                      setTxCategory(validCategories[0].name);
                    }
                  }}
                  style={{
                    flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center',
                    backgroundColor: txType === 'expense' ? '#ffffff' : 'transparent',
                    shadowColor: txType === 'expense' ? '#000' : 'transparent',
                    shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2,
                    elevation: txType === 'expense' ? 2 : 0
                  }}
                >
                  <Text style={{ fontWeight: '900', fontSize: 12, color: txType === 'expense' ? '#f43f5e' : '#94a3b8' }}>Gider</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  onPress={() => {
                    setTxType('income');
                    const validAccounts = accounts.filter(a => a.type !== 'credit-card' && a.type !== 'debt');
                    if (validAccounts.length > 0 && !validAccounts.find(a => a.id === txAccountId)) {
                      setTxAccountId(validAccounts[0].id);
                    }
                    const validCategories = categories.filter(c => c.type === 'income');
                    if (validCategories.length > 0 && !validCategories.find(c => c.name === txCategory)) {
                      setTxCategory(validCategories[0].name);
                    }
                  }}
                  style={{
                    flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center',
                    backgroundColor: txType === 'income' ? '#ffffff' : 'transparent',
                    shadowColor: txType === 'income' ? '#000' : 'transparent',
                    shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2,
                    elevation: txType === 'income' ? 2 : 0
                  }}
                >
                  <Text style={{ fontWeight: '900', fontSize: 12, color: txType === 'income' ? '#10b981' : '#94a3b8' }}>Gelir</Text>
                </TouchableOpacity>
              </View>

              {/* Amount Input */}
              <Text className="text-slate-550 font-bold text-[9px] uppercase tracking-wider mb-1.5 ml-1">Tutar (₺)</Text>
              <TextInput 
                className="bg-slate-50 dark:bg-slate-850 border border-slate-205 px-4 py-3 rounded-2xl text-slate-900 dark:text-white text-base font-black mb-4 h-12"
                placeholder="0.00"
                keyboardType="numeric"
                value={txAmount || ''}
                onChangeText={setTxAmount}
              />

              {/* Description Input */}
              <Text className="text-slate-550 font-bold text-[9px] uppercase tracking-wider mb-1.5 ml-1">Açıklama (Opsiyonel)</Text>
              <TextInput 
                className="bg-slate-50 dark:bg-slate-850 border border-slate-205 px-4 py-3 rounded-2xl text-slate-900 dark:text-white text-xs font-semibold mb-4 h-12"
                placeholder="Örn: Haftalık market alışverişi..."
                value={txDescription || ''}
                onChangeText={setTxDescription}
              />

              {/* Category Dropdown */}
              <Text className="text-slate-550 font-bold text-[9px] uppercase tracking-wider mb-1.5 ml-1">Kategori</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row mb-4 gap-2">
                {categories.filter(c => c.type === txType).map(cat => {
                  const catName = cat.name;
                  const isSelected = txCategory === catName;
                  return (
                    <TouchableOpacity
                      key={cat.id || catName}
                      onPress={() => setTxCategory(catName)}
                      className="px-3.5 py-2.5 rounded-full border-2 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                      style={isSelected ? { backgroundColor: '#a855f7', borderColor: '#a855f7' } : undefined}
                    >
                      <Text 
                        className="font-bold text-[10px] text-slate-600 dark:text-slate-400"
                        style={isSelected ? { color: '#ffffff' } : undefined}
                      >
                        {catName}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              {/* Account Dropdown */}
              <Text className="text-slate-550 font-bold text-[9px] uppercase tracking-wider mb-1.5 ml-1">Hesap</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row mb-4 gap-2">
                {accounts.filter(acc => txType === 'income' ? (acc.type !== 'credit-card' && acc.type !== 'debt') : true).map(acc => {
                  const isSelected = txAccountId === acc.id;
                  return (
                    <TouchableOpacity
                      key={acc.id}
                      onPress={() => setTxAccountId(acc.id)}
                      className="px-3.5 py-2.5 rounded-full border-2 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                      style={isSelected ? { backgroundColor: '#a855f7', borderColor: '#a855f7' } : undefined}
                    >
                      <Text 
                        className="font-bold text-[10px] text-slate-650 dark:text-slate-300"
                        style={isSelected ? { color: '#ffffff' } : undefined}
                      >
                        {acc.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              {/* Date Input */}
              <Text className="text-slate-550 font-bold text-[9px] uppercase tracking-wider mb-1.5 ml-1">Tarih</Text>
              <TouchableOpacity onPress={() => setShowTxDatePicker(true)}>
                <View className="bg-slate-50 dark:bg-slate-850 border border-slate-205 px-4 py-3 rounded-2xl mb-4 h-12 justify-center">
                  <Text className="text-slate-900 dark:text-white text-xs font-semibold">
                    {format(parseISO(txDate), 'd MMMM yyyy', { locale: tr })}
                  </Text>
                </View>
              </TouchableOpacity>
              {showTxDatePicker && (
                <DateTimePicker
                  value={parseISO(txDate)}
                  mode="date"
                  display="default"
                  onChange={(event, selectedDate) => {
                    setShowTxDatePicker(false);
                    if (selectedDate) setTxDate(format(selectedDate, 'yyyy-MM-dd'));
                  }}
                />
              )}

              {/* Installments Config */}
              {txType === 'expense' && !editingTransaction && (
                <View className="mb-4">
                  <View className="flex-row justify-between items-center bg-slate-50 dark:bg-slate-850 p-4 rounded-2xl mb-2.5">
                    <View>
                      <Text className="text-slate-800 dark:text-slate-200 font-bold text-sm">Taksitlendir</Text>
                      <Text className="text-slate-500 dark:text-slate-400 text-[10px]">Tutarı aylara böl</Text>
                    </View>
                    <Switch
                      value={txIsInstallment}
                      onValueChange={setTxIsInstallment}
                      trackColor={{ false: '#e2e8f0', true: '#c084fc' }}
                      thumbColor={txIsInstallment ? '#a855f7' : '#94a3b8'}
                    />
                  </View>

                  {txIsInstallment && (
                    <View className="bg-slate-50 dark:bg-slate-850 p-4 rounded-2xl">
                      <Text className="text-slate-550 font-bold text-[9px] uppercase tracking-wider mb-2">Taksit Sayısı</Text>
                      <View className="flex-row items-center bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 px-4 py-1 h-12">
                        <CalendarIcon size={18} color="#94a3b8" />
                        <TextInput
                          value={txInstallmentsCount}
                          onChangeText={setTxInstallmentsCount}
                          keyboardType="number-pad"
                          placeholder="3"
                          placeholderTextColor="#94a3b8"
                          className="flex-1 ml-3 text-slate-800 dark:text-slate-200 font-bold text-base h-full"
                        />
                        <Text className="text-slate-400 font-bold text-xs">Ay</Text>
                      </View>
                    </View>
                  )}
                </View>
              )}

              {/* Recurring Config */}
              <View className="flex-row justify-between items-center bg-slate-50 dark:bg-slate-850 p-4 rounded-2xl mb-6">
                <View>
                  <Text className="text-slate-800 dark:text-white font-bold text-xs leading-none mb-1">Düzenli İşlem</Text>
                  <Text className="text-[9px] text-slate-400 font-bold">Her ay aynı gün otomatik uygulansın.</Text>
                </View>
                <Switch value={txIsRecurring} onValueChange={setTxIsRecurring} />
              </View>

              {/* Save Button */}
              <TouchableOpacity 
                onPress={handleSaveTransaction}
                style={{ backgroundColor: theme.darkPurple }}
                className="rounded-2xl py-3.5 items-center shadow-md mb-4"
              >
                <Text className="text-white font-bold text-sm">Kaydet</Text>
              </TouchableOpacity>

            </ScrollView>
          </View>
        </KeyboardAvoidingView>
        </View>
      )}
      {/* ─── MODAL: ACCOUNT FORM ─── */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={isAccountModalOpen}
        onRequestClose={() => setIsAccountModalOpen(false)}
      >
        <View className="flex-1 justify-end bg-black/60">
          <View className="bg-white dark:bg-slate-900 rounded-t-[2.5rem] p-6 shadow-2xl max-h-[90%]">
            <ScrollView showsVerticalScrollIndicator={false}>
              
              {/* Header */}
              <View className="flex-row justify-between items-center mb-4 pb-2 border-b border-slate-100 dark:border-slate-800">
                <Text className="text-lg font-black text-slate-800 dark:text-white">
                  {editingAccount ? '✏️ Hesabı Düzenle' : '🏦 Yeni Hesap Ekle'}
                </Text>
                <TouchableOpacity onPress={() => setIsAccountModalOpen(false)} className="p-1">
                  <X size={20} color="#64748b" />
                </TouchableOpacity>
              </View>

              {/* Account Name */}
              <Text className="text-slate-550 font-bold text-[9px] uppercase tracking-wider mb-1.5 ml-1">Hesap Adı</Text>
              <TextInput 
                className="bg-slate-50 dark:bg-slate-850 border border-slate-205 px-4 py-3 rounded-2xl text-slate-900 dark:text-white text-xs font-semibold mb-4 h-12"
                placeholder="Örn: Garanti Maaş..."
                value={accName || ''}
                onChangeText={setAccName}
              />

              {/* Account Type Selector */}
              <Text className="text-slate-550 font-bold text-[9px] uppercase tracking-wider mb-1.5 ml-1">Hesap Türü</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row mb-4 gap-2">
                {Object.keys(accountLabels).map(typeKey => {
                  const isSelected = accType === typeKey;
                  return (
                    <TouchableOpacity
                      key={typeKey}
                      onPress={() => setAccType(typeKey as any)}
                      className={`px-3.5 py-2.5 rounded-full border-2 ${isSelected ? 'bg-purple-500 border-purple-500 shadow-sm' : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700'}`}
                    >
                      <Text className={`font-bold text-[10px] ${isSelected ? 'text-white' : 'text-slate-650 dark:text-slate-350'}`}>
                        {accountLabels[typeKey]}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              {/* Balance */}
              <Text className="text-slate-550 font-bold text-[9px] uppercase tracking-wider mb-1.5 ml-1">Mevcut Bakiye (₺)</Text>
              <TextInput 
                className="bg-slate-50 dark:bg-slate-850 border border-slate-205 px-4 py-3 rounded-2xl text-slate-900 dark:text-white text-base font-black mb-4 h-12"
                placeholder="0.00"
                keyboardType="numeric"
                value={accBalance || ''}
                onChangeText={setAccBalance}
              />

              {/* Credit Limit (Only for Credit Cards) */}
              {accType === 'credit-card' && (
                <View className="mb-4">
                  <Text className="text-slate-550 font-bold text-[9px] uppercase tracking-wider mb-1.5 ml-1">Kredi Limiti (₺)</Text>
                  <TextInput 
                    className="bg-slate-50 dark:bg-slate-850 border border-slate-205 px-4 py-3 rounded-2xl text-slate-900 dark:text-white text-base font-black mb-2 h-12"
                    placeholder="0.00"
                    keyboardType="numeric"
                    value={accCreditLimit || ''}
                    onChangeText={setAccCreditLimit}
                  />
                </View>
              )}

              {/* Submit */}
              <TouchableOpacity 
                onPress={handleSaveAccount}
                style={{ backgroundColor: theme.darkPurple }}
                className="rounded-2xl py-3.5 items-center shadow-md mb-4 mt-2"
              >
                <Text className="text-white font-bold text-sm">Kaydet</Text>
              </TouchableOpacity>

            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ─── MODAL: BILL FORM ─── */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={isBillModalOpen}
        onRequestClose={() => setIsBillModalOpen(false)}
      >
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1 justify-end bg-black/60">
          <View className="bg-white dark:bg-slate-900 rounded-t-[2.5rem] p-6 shadow-2xl max-h-[90%]">
            <ScrollView showsVerticalScrollIndicator={false}>
              
              {/* Header */}
              <View className="flex-row justify-between items-center mb-4 pb-2 border-b border-slate-100 dark:border-slate-800">
                <Text className="text-lg font-black text-slate-800 dark:text-white">
                  {editingBill ? '✏️ Faturayı Düzenle' : '📄 Yeni Fatura Ekle'}
                </Text>
                <TouchableOpacity onPress={() => setIsBillModalOpen(false)} className="p-1">
                  <X size={20} color="#64748b" />
                </TouchableOpacity>
              </View>

              {/* Quick Bill Templates */}
              {!editingBill && (
                <View className="mb-4">
                  <Text className="text-slate-550 font-bold text-[9px] uppercase tracking-wider mb-2 ml-1">Hızlı Şablonlar</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row overflow-visible">
                    {['Elektrik', 'Su', 'Doğalgaz', 'Telefon', 'İnternet', 'Kira', 'Aidat'].map(bt => (
                      <TouchableOpacity
                        key={bt}
                        onPress={() => {
                          setBillTitle(`${bt} Faturası`);
                          setBillCategory('Fatura');
                        }}
                        className="bg-rose-50 dark:bg-rose-900/20 px-3.5 py-2 rounded-xl mr-2 border border-rose-100 dark:border-rose-800"
                      >
                        <Text className="text-rose-700 dark:text-rose-300 font-bold text-xs">{bt}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}

              {/* Title */}
              <Text className="text-slate-550 font-bold text-[9px] uppercase tracking-wider mb-1.5 ml-1">Fatura Başlığı</Text>
              <TextInput 
                className="bg-slate-50 dark:bg-slate-850 border border-slate-205 px-4 py-3 rounded-2xl text-slate-900 dark:text-white text-xs font-semibold mb-4 h-12"
                placeholder="Örn: Elektrik Faturası..."
                value={billTitle || ''}
                onChangeText={setBillTitle}
              />

              {/* Amount */}
              <Text className="text-slate-550 font-bold text-[9px] uppercase tracking-wider mb-1.5 ml-1">Fatura Tutarı (₺)</Text>
              <TextInput 
                className="bg-slate-50 dark:bg-slate-850 border border-slate-205 px-4 py-3 rounded-2xl text-slate-900 dark:text-white text-base font-black mb-4 h-12"
                placeholder="0.00"
                keyboardType="numeric"
                value={billAmount || ''}
                onChangeText={setBillAmount}
              />

              {/* Due Date */}
              <Text className="text-slate-550 font-bold text-[9px] uppercase tracking-wider mb-1.5 ml-1">Son Ödeme Tarihi</Text>
              <TouchableOpacity onPress={() => setShowBillDatePicker(true)}>
                <View className="bg-slate-50 dark:bg-slate-850 border border-slate-205 px-4 py-3 rounded-2xl mb-4 h-12 justify-center">
                  <Text className="text-slate-900 dark:text-white text-xs font-semibold">
                    {format(parseISO(billDueDate), 'd MMMM yyyy', { locale: tr })}
                  </Text>
                </View>
              </TouchableOpacity>
              {showBillDatePicker && (
                <DateTimePicker
                  value={parseISO(billDueDate)}
                  mode="date"
                  display="default"
                  onChange={(event, selectedDate) => {
                    setShowBillDatePicker(false);
                    if (selectedDate) setBillDueDate(format(selectedDate, 'yyyy-MM-dd'));
                  }}
                />
              )}

              {/* Recurring */}
              <View className="flex-row justify-between items-center bg-slate-50 dark:bg-slate-850 p-4 rounded-2xl mb-6">
                <View>
                  <Text className="text-slate-800 dark:text-white font-bold text-xs leading-none mb-1">Aylık Tekrarla</Text>
                  <Text className="text-[9px] text-slate-444 font-bold">Her ay aynı gün otomatik olarak oluşturulsun.</Text>
                </View>
                <Switch value={billIsRecurring} onValueChange={setBillIsRecurring} />
              </View>

              {/* Submit */}
              <TouchableOpacity 
                onPress={handleSaveBill}
                style={{ backgroundColor: theme.darkPurple }}
                className="rounded-2xl py-3.5 items-center shadow-md mb-4"
              >
                <Text className="text-white font-bold text-sm">Kaydet</Text>
              </TouchableOpacity>

            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ─── MODAL: PAY BILL ACCOUNT SELECTOR ─── */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={isPayBillModalOpen}
        onRequestClose={() => setIsPayBillModalOpen(false)}
      >
        <View className="flex-1 justify-end bg-black/50">
          <View className="bg-white dark:bg-slate-900 rounded-t-[2.5rem] p-6 shadow-2xl">
            <Text className="text-slate-850 dark:text-white font-black text-sm mb-4">💳 Fatura Ödeme Hesabı</Text>
            <Text className="text-slate-450 text-xs font-semibold mb-4 leading-normal">
              "{payingBill?.title}" faturasını ödemek için kullanılacak banka hesabı veya kredi kartını seçin:
            </Text>

            <ScrollView style={{ maxHeight: 200 }} showsVerticalScrollIndicator={false} className="mb-6 space-y-2">
              {accounts.map(acc => {
                const isSelected = paymentAccountId === acc.id;
                const AccIcon = accountIcons[acc.type] || Wallet;
                return (
                  <TouchableOpacity
                    key={acc.id}
                    onPress={() => setPaymentAccountId(acc.id)}
                    className={`flex-row items-center justify-between p-3.5 rounded-2xl border-2 ${isSelected ? 'bg-purple-50/50 border-purple-500' : 'bg-slate-50 dark:bg-slate-800 border-slate-100 dark:border-slate-700'}`}
                  >
                    <View className="flex-row items-center">
                      <AccIcon size={16} color={isSelected ? theme.darkPurple : '#64748b'} className="mr-3" />
                      <Text className="text-slate-705 dark:text-slate-200 font-bold text-xs">{acc.name}</Text>
                    </View>
                    <Text className="text-slate-800 dark:text-slate-200 font-black text-xs">₺{acc.balance.toLocaleString('tr-TR')}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <View className="flex-row gap-3">
              <TouchableOpacity 
                onPress={() => setIsPayBillModalOpen(false)}
                className="flex-1 bg-slate-100 dark:bg-slate-800 py-3.5 rounded-2xl items-center"
              >
                <Text className="text-slate-650 dark:text-slate-400 font-bold text-xs">İptal</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                onPress={handlePayBill}
                disabled={!paymentAccountId}
                style={{ backgroundColor: paymentAccountId ? theme.darkPurple : '#cbd5e1' }}
                className="flex-1 py-3.5 rounded-2xl items-center shadow-md"
              >
                <Text className="text-white font-bold text-xs">Ödemeyi Onayla</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ─── OPTION MODAL: ACCOUNT ACTIONS ─── */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={isAccountActionsOpen}
        onRequestClose={() => setIsAccountActionsOpen(false)}
      >
        <View className="flex-1 justify-end bg-black/45">
          <View className="bg-white dark:bg-slate-900 rounded-t-[2rem] p-5 shadow-2xl">
            <Text className="text-slate-850 dark:text-white font-black text-center text-sm mb-4">
              {selectedMenuListAccount?.name || 'Hesap İşlemleri'}
            </Text>
            
            {selectedMenuListAccount && (
              <View className="space-y-1">
                
                {/* Edit */}
                <TouchableOpacity 
                  onPress={() => {
                    setIsAccountActionsOpen(false);
                    openEditAccount(selectedMenuListAccount);
                  }}
                  className="flex-row items-center py-3.5 px-4 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  <Edit2 size={16} color="#64748b" className="mr-3" />
                  <Text className="text-slate-700 dark:text-slate-350 font-bold text-xs">Düzenle</Text>
                </TouchableOpacity>

                {/* Delete */}
                <TouchableOpacity 
                  onPress={() => handleDeleteAccount(selectedMenuListAccount.id)}
                  className="flex-row items-center py-3.5 px-4 rounded-xl bg-red-50 dark:bg-red-950/20"
                >
                  <Trash2 size={16} color="#ef4444" className="mr-3" />
                  <Text className="text-red-500 font-bold text-xs">Sil</Text>
                </TouchableOpacity>
                
                {/* Cancel */}
                <TouchableOpacity 
                  onPress={() => setIsAccountActionsOpen(false)}
                  className="mt-2 py-3 bg-slate-100 dark:bg-slate-800 rounded-xl items-center"
                >
                  <Text className="text-slate-650 dark:text-slate-400 font-bold text-xs">İptal</Text>
                </TouchableOpacity>

              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* ─── OPTION MODAL: TRANSACTION ACTIONS ─── */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={isTransactionActionsOpen}
        onRequestClose={() => setIsTransactionActionsOpen(false)}
      >
        <View className="flex-1 justify-end bg-black/45">
          <View className="bg-white dark:bg-slate-900 rounded-t-[2rem] p-5 shadow-2xl">
            <Text className="text-slate-850 dark:text-white font-black text-center text-sm mb-4">
              {selectedMenuListTransaction?.category || 'İşlem Eylemleri'}
            </Text>
            
            {selectedMenuListTransaction && (
              <View className="space-y-1">
                
                {/* Edit */}
                <TouchableOpacity 
                  onPress={() => {
                    setIsTransactionActionsOpen(false);
                    openEditTransaction(selectedMenuListTransaction);
                  }}
                  className="flex-row items-center py-3.5 px-4 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  <Edit2 size={16} color="#64748b" className="mr-3" />
                  <Text className="text-slate-700 dark:text-slate-350 font-bold text-xs">Düzenle</Text>
                </TouchableOpacity>

                {/* Delete */}
                <TouchableOpacity 
                  onPress={() => handleDeleteTransaction(selectedMenuListTransaction.id)}
                  className="flex-row items-center py-3.5 px-4 rounded-xl bg-red-50 dark:bg-red-950/20"
                >
                  <Trash2 size={16} color="#ef4444" className="mr-3" />
                  <Text className="text-red-500 font-bold text-xs">Sil</Text>
                </TouchableOpacity>
                
                {/* Cancel */}
                <TouchableOpacity 
                  onPress={() => setIsTransactionActionsOpen(false)}
                  className="mt-2 py-3 bg-slate-100 dark:bg-slate-800 rounded-xl items-center"
                >
                  <Text className="text-slate-650 dark:text-slate-400 font-bold text-xs">İptal</Text>
                </TouchableOpacity>

              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* ─── OPTION MODAL: BILL ACTIONS ─── */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={isBillActionsOpen}
        onRequestClose={() => setIsBillActionsOpen(false)}
      >
        <View className="flex-1 justify-end bg-black/45">
          <View className="bg-white dark:bg-slate-900 rounded-t-[2rem] p-5 shadow-2xl">
            <Text className="text-slate-850 dark:text-white font-black text-center text-sm mb-4">
              {selectedMenuListBill?.title || 'Fatura Eylemleri'}
            </Text>
            
            {selectedMenuListBill && (
              <View className="space-y-1">
                
                {/* Pay Bill */}
                <TouchableOpacity 
                  onPress={() => {
                    setPayingBill(selectedMenuListBill);
                    setPaymentAccountId(accounts[0]?.id || '');
                    setIsBillActionsOpen(false);
                    setIsPayBillModalOpen(true);
                  }}
                  className="flex-row items-center py-3.5 px-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/20"
                >
                  <Check size={16} color="#10b981" className="mr-3" />
                  <Text className="text-emerald-600 dark:text-emerald-400 font-bold text-xs">Faturayı Öde (Kapat)</Text>
                </TouchableOpacity>

                {/* Edit */}
                <TouchableOpacity 
                  onPress={() => {
                    setIsBillActionsOpen(false);
                    openEditBill(selectedMenuListBill);
                  }}
                  className="flex-row items-center py-3.5 px-4 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  <Edit2 size={16} color="#64748b" className="mr-3" />
                  <Text className="text-slate-700 dark:text-slate-350 font-bold text-xs">Düzenle</Text>
                </TouchableOpacity>

                {/* Delete */}
                <TouchableOpacity 
                  onPress={() => handleDeleteBill(selectedMenuListBill.id)}
                  className="flex-row items-center py-3.5 px-4 rounded-xl bg-red-50 dark:bg-red-950/20"
                >
                  <Trash2 size={16} color="#ef4444" className="mr-3" />
                  <Text className="text-red-500 font-bold text-xs">Sil</Text>
                </TouchableOpacity>
                
                {/* Cancel */}
                <TouchableOpacity 
                  onPress={() => setIsBillActionsOpen(false)}
                  className="mt-2 py-3 bg-slate-100 dark:bg-slate-800 rounded-xl items-center"
                >
                  <Text className="text-slate-650 dark:text-slate-400 font-bold text-xs">İptal</Text>
                </TouchableOpacity>

              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* 🟢 MODAL: BUDGET SETTINGS 🟢 */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={isBudgetSettingsOpen}
        onRequestClose={() => setIsBudgetSettingsOpen(false)}
      >
        <View className="flex-1 justify-end bg-black/45">
          <View className="bg-white dark:bg-slate-900 rounded-t-[2rem] p-5 shadow-2xl">
            <Text className="text-slate-850 dark:text-white font-black text-center text-sm mb-4">
              Bütçe Seçenekleri
            </Text>
            
            <View className="space-y-1">
              <TouchableOpacity
                onPress={() => { setIsBudgetSettingsOpen(false); router.push('/budget-reports'); }}
                className="flex-row items-center p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 active:bg-slate-100"
              >
                <View className="w-8 h-8 rounded-full bg-purple-100 items-center justify-center mr-3">
                  <BarChart2 size={16} color={theme.darkPurple} />
                </View>
                <Text className="text-slate-700 dark:text-slate-300 font-bold text-xs">Bütçe Raporları</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                onPress={() => { setIsBudgetSettingsOpen(false); router.push('/transaction-templates'); }}
                className="flex-row items-center p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 active:bg-slate-100"
              >
                <View className="w-8 h-8 rounded-full bg-blue-100 items-center justify-center mr-3">
                  <FileText size={16} color="#3b82f6" />
                </View>
                <Text className="text-slate-700 dark:text-slate-300 font-bold text-xs">İşlem Şablonları</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => { setIsBudgetSettingsOpen(false); router.push('/budget-categories'); }}
                className="flex-row items-center p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 active:bg-slate-100"
              >
                <View className="w-8 h-8 rounded-full bg-orange-100 items-center justify-center mr-3">
                  <Settings size={16} color="#f97316" />
                </View>
                <Text className="text-slate-700 dark:text-slate-300 font-bold text-xs">Kategori Yönetimi</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                onPress={() => setIsBudgetSettingsOpen(false)}
                className="mt-4 bg-slate-100 dark:bg-slate-800 py-3.5 rounded-2xl items-center"
              >
                <Text className="text-slate-650 dark:text-slate-400 font-bold text-xs">Kapat</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ─── STYLES ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  headerGradient: {
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    paddingBottom: 24,
    paddingTop: 12,
    paddingHorizontal: 16,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  fabGradient: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  }
});
