"use client";

import * as React from "react";
import { Plus, Wallet, TrendingUp, TrendingDown, ChevronLeft, ChevronRight, Trash2, Banknote, Landmark, CreditCard, BarChart2, ArrowUpRight, ArrowDownLeft, Calendar as CalendarIcon, ArrowLeft, ShoppingCart, Utensils, Bus, FileText, Gamepad2, HeartPulse, Shirt, GraduationCap, DollarSign, Briefcase, PlusCircle, CircleEllipsis } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts';
import { NewAccountForm } from "@/components/new-account-form";
import { NewTransactionForm } from "@/components/new-transaction-form";
import { useAuth } from "@/components/auth-provider";
import { onAccountsUpdate, deleteAccount, addAccount, updateAccount, addTransaction, updateTransaction, deleteTransaction, onTransactionsUpdate, onBudgetCategoriesUpdate } from "@/lib/dataService";
import type { Account, Transaction, BudgetCategory } from "@/lib/data";
import { useToast } from "@/hooks/use-toast";
import { format, startOfYear, endOfYear, subYears, parseISO, addYears, eachMonthOfInterval, subMonths, addMonths, getYear } from "date-fns";
import { tr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useRouter } from "next/navigation";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";

// --- TASARIM SİSTEMİ: Mobil Odaklı ---
const themeClasses = {
    PAGE_BG: "bg-[#F2F2F7] dark:bg-black transition-colors duration-300",
    HEADER_BG: "bg-white/85 dark:bg-[#1C1C1E]/85 backdrop-blur-xl border-b border-black/[0.05] dark:border-white/[0.05]",
    CARD_BG: "bg-white dark:bg-[#1C1C1E] shadow-sm",
    TEXT_MAIN: "text-[#1C1C1E] dark:text-white",
    TEXT_MUTED: "text-[#8E8E93] dark:text-[#EBEBF5]/60",
    INPUT_BG: "bg-[#F2F2F7] dark:bg-[#2C2C2E] border-transparent text-[#1C1C1E] dark:text-white focus:bg-white dark:focus:bg-[#1C1C1E]",
};

const accountIcons: { [key: string]: React.ElementType } = {
    'cash': Banknote,
    'bank': Landmark,
    'credit-card': CreditCard,
    'other': Wallet,
    'debt': Wallet
};

const categoryConfig: {[key: string]: { color: string, icon: React.ElementType }} = {
    'Market': { color: 'bg-orange-500/10 text-orange-600 dark:bg-orange-500/20 dark:text-orange-400', icon: ShoppingCart },
    'Yemek': { color: 'bg-yellow-500/10 text-yellow-600 dark:bg-yellow-500/20 dark:text-yellow-400', icon: Utensils },
    'Ulaşım': { color: 'bg-blue-500/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400', icon: Bus },
    'Fatura': { color: 'bg-red-500/10 text-red-600 dark:bg-red-500/20 dark:text-red-400', icon: FileText },
    'Eğlence': { color: 'bg-purple-500/10 text-purple-600 dark:bg-purple-500/20 dark:text-purple-400', icon: Gamepad2 },
    'Sağlık': { color: 'bg-green-500/10 text-green-600 dark:bg-green-500/20 dark:text-green-400', icon: HeartPulse },
    'Giyim': { color: 'bg-pink-500/10 text-pink-600 dark:bg-pink-500/20 dark:text-pink-400', icon: Shirt },
    'Eğitim': { color: 'bg-indigo-500/10 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400', icon: GraduationCap },
    'Maaş': { color: 'bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400', icon: DollarSign },
    'Gelir': { color: 'bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400', icon: Briefcase },
    'Ek Gelir': { color: 'bg-teal-500/10 text-teal-600 dark:bg-teal-500/20 dark:text-teal-400', icon: PlusCircle },
    'Diğer': { color: 'bg-slate-500/10 text-slate-600 dark:bg-slate-500/20 dark:text-slate-400', icon: CircleEllipsis }
};

export function BudgetClient() {
    const router = useRouter();
    const { familyId, familyMembers } = useAuth();
    const { toast } = useToast();
    
    const [currentDate, setCurrentDate] = React.useState(new Date());
    const [accounts, setAccounts] = React.useState<Account[]>([]);
    const [allTransactions, setAllTransactions] = React.useState<Transaction[]>([]);
    const [categories, setCategories] = React.useState<BudgetCategory[]>([]);
    
    const [isAccountFormOpen, setIsAccountFormOpen] = React.useState(false);
    const [isTransactionFormOpen, setIsTransactionFormOpen] = React.useState(false);

    const [editingAccount, setEditingAccount] = React.useState<Account | null>(null);
    const [initialAccountType, setInitialAccountType] = React.useState<'cash' | 'bank' | 'credit-card' | 'other' | 'debt'>('bank');
    const [editingTransaction, setEditingTransaction] = React.useState<Transaction | null>(null);
    const [mainTab, setMainTab] = React.useState('day');

    React.useEffect(() => {
        if (!familyId) return;
        const unsubAccounts = onAccountsUpdate(setAccounts);
        const unsubTransactions = onTransactionsUpdate(setAllTransactions, subYears(new Date(), 5), addYears(new Date(), 5));
        const unsubCategories = onBudgetCategoriesUpdate(setCategories);
        return () => { unsubAccounts(); unsubTransactions(); unsubCategories(); };
    }, [familyId]);
    
    const handleNavDate = (direction: 'prev' | 'next') => {
        if (mainTab === 'month') {
            setCurrentDate(prev => direction === 'prev' ? subYears(prev, 1) : addYears(prev, 1));
        } else {
            setCurrentDate(prev => direction === 'prev' ? subMonths(prev, 1) : addMonths(prev, 1));
        }
    };
    
    const dateDisplayFormat = mainTab === 'month' ? 'yyyy' : 'MMMM yyyy';

    const accountStats = React.useMemo(() => {
        const assetsTotal = accounts.filter(a => a.type === 'cash' || a.type === 'bank').reduce((sum, a) => sum + a.balance, 0);
        const debtsTotal = accounts.filter(a => a.type === 'credit-card' || a.type === 'other' || a.type === 'debt').reduce((sum, a) => sum + a.balance, 0);

        return {
            assets: accounts.filter(a => a.type === 'cash' || a.type === 'bank'),
            debts: accounts.filter(a => a.type === 'credit-card' || a.type === 'other' || a.type === 'debt'),
            totalAssets: assetsTotal,
            totalDebts: debtsTotal,
            netWorth: assetsTotal + debtsTotal 
        };
    }, [accounts]);

    const { monthlyIncome, monthlyExpense, yearlyIncome, yearlyExpense, monthlySummaries, dailyGroups } = React.useMemo(() => {
        const yearInterval = eachMonthOfInterval({ start: startOfYear(currentDate), end: endOfYear(currentDate) });
        const monthSummaries: {[key: string]: {income: number, expense: number, total: number, transactions: Transaction[]}} = {};
        
        yearInterval.forEach(monthStart => {
            const monthKey = format(monthStart, 'yyyy-MM');
            monthSummaries[monthKey] = { income: 0, expense: 0, total: 0, transactions: [] };
        });
        
        const daily: { [key: string]: { date: string; dateISO: string; dayTotalIncome: number; dayTotalExpense: number; transactions: Transaction[] } } = {};

        const filteredTransactionsForMonth = allTransactions.filter(t => {
            const transactionMonth = t.date.substring(0, 7);
            const currentMonth = format(currentDate, 'yyyy-MM');
            return transactionMonth === currentMonth;
        });
        
        allTransactions.forEach(t => {
            const transactionYear = getYear(parseISO(t.date));
             if (transactionYear === getYear(currentDate)) {
                const monthKey = t.date.substring(0, 7);
                if(monthSummaries[monthKey]) {
                    if (t.type === 'income') monthSummaries[monthKey].income += t.amount;
                    else monthSummaries[monthKey].expense += t.amount;
                    monthSummaries[monthKey].transactions.push(t);
                }
             }
        });

        filteredTransactionsForMonth.forEach(t => {
             if (!daily[t.date]) {
                daily[t.date] = { date: format(parseISO(t.date), 'd EEEE', {locale: tr}), dateISO: t.date, dayTotalIncome: 0, dayTotalExpense: 0, transactions: [] };
            }
            if (t.type === 'income') daily[t.date].dayTotalIncome += t.amount;
            else daily[t.date].dayTotalExpense += t.amount;
            daily[t.date].transactions.push(t);
        });
        
        const finalSummaries = Object.entries(monthSummaries)
            .map(([monthKey, values]) => ({
                monthKey, month: format(new Date(monthKey + '-02'), 'MMMM', { locale: tr }), ...values, total: values.income - values.expense
            }))
            .sort((a,b) => a.monthKey.localeCompare(b.monthKey));

        finalSummaries.forEach(summary => summary.transactions.sort((a, b) => b.date.localeCompare(a.date)));
        const finalDailyGroups = Object.values(daily).sort((a,b) => b.dateISO.localeCompare(a.dateISO));
        
        const currentMonthKey = format(currentDate, 'yyyy-MM');
        const monthStats = monthSummaries[currentMonthKey] || { income: 0, expense: 0 };
        const yearlyIncomeTotal = Object.values(monthSummaries).reduce((s, m) => s + m.income, 0);
        const yearlyExpenseTotal = Object.values(monthSummaries).reduce((s, m) => s + m.expense, 0);

        return { 
            monthlyIncome: monthStats.income, monthlyExpense: monthStats.expense,
            yearlyIncome: yearlyIncomeTotal, yearlyExpense: yearlyExpenseTotal,
            monthlySummaries: finalSummaries, dailyGroups: finalDailyGroups,
        };
    }, [allTransactions, currentDate]);

    let headerIncome = 0;
    let headerExpense = 0;
    let headerTotal = 0;
    let labelIncome = 'Gelir';
    let labelExpense = 'Gider';
    let labelTotal = 'Net Durum';

    if (mainTab === 'accounts') {
        headerIncome = accountStats.totalAssets;
        headerExpense = accountStats.totalDebts;
        headerTotal = headerIncome - headerExpense; 
        labelIncome = 'Varlıklar';
        labelExpense = 'Borçlar';
        labelTotal = 'Net Varlık';
    } else if (mainTab === 'month') {
        headerIncome = yearlyIncome;
        headerExpense = yearlyExpense;
        headerTotal = headerIncome - headerExpense;
    } else {
        headerIncome = monthlyIncome;
        headerExpense = monthlyExpense;
        headerTotal = headerIncome - headerExpense;
    }

    const handleAccountSubmit = async (data: Omit<Account, 'id' | 'familyId'>) => {
        try {
            if (editingAccount) { await updateAccount(editingAccount.id, data); toast({ title: "Hesap güncellendi" }); } 
            else { await addAccount(data); toast({ title: "Yeni hesap eklendi" }); }
            setIsAccountFormOpen(false); setEditingAccount(null);
        } catch (error) { toast({ variant: "destructive", title: "Hata oluştu" }); }
    };

    const handleTransactionSubmit = async (data: any) => {
        try {
            if (editingTransaction) { await updateTransaction(editingTransaction.id, data); toast({ title: "İşlem güncellendi" }); } 
            else { await addTransaction(data); toast({ title: "Yeni işlem eklendi" }); }
            setIsTransactionFormOpen(false); setEditingTransaction(null);
        } catch (error) { toast({ variant: "destructive", title: "Hata oluştu" }); }
    }
    
    const handleDeleteAccount = async (id: string) => {
        try { await deleteAccount(id); toast({ title: "Hesap Silindi", variant: 'destructive'}); } 
        catch (error) { toast({ variant: "destructive", title: "Hata oluştu" }); }
    }
    
    const handleDeleteTransaction = async (id: string) => {
        try { await deleteTransaction(id); toast({ title: "İşlem silindi", variant: 'destructive' }); } 
        catch (error) { toast({ variant: "destructive", title: "Hata oluştu" }); }
    }
    
    const openAccountForm = (account: Account | null, type: Account['type'] = 'bank') => { 
        setEditingAccount(account); 
        setInitialAccountType(type);
        setIsAccountFormOpen(true); 
    }
    const openTransactionForm = (transaction: Transaction | null) => { setEditingTransaction(transaction); setIsTransactionFormOpen(true); }

    // --- KATEGORİ BÜTÇE LİMİTLERİ (Aylık) ---
    const limitedCategories = React.useMemo(() => {
        const limited = categories.filter(c => c.limit && c.limit > 0 && c.type === 'expense');
        
        return limited.map(cat => {
            const spent = allTransactions.filter(tx => 
                tx.type === 'expense' && 
                tx.category === cat.name &&
                tx.date.startsWith(format(currentDate, 'yyyy-MM'))
            ).reduce((sum, tx) => sum + tx.amount, 0);
            
            return {
                ...cat,
                spent,
                percent: Math.min(Math.round((spent / cat.limit!) * 100), 100)
            };
        });
    }, [categories, allTransactions, currentDate]);

    // --- SABİT GİDERLER (Abonelikler vb.) ---
    const recurringExpenses = React.useMemo(() => {
        return allTransactions.filter(tx => tx.isRecurring && tx.type === 'expense');
    }, [allTransactions]);

    return (
        <div className={cn("min-h-[100dvh] font-sans pb-[calc(100px+env(safe-area-inset-bottom))] relative bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 dark:from-slate-950 dark:via-[#1C1C1E] dark:to-purple-950/30", themeClasses.TEXT_MAIN)}>
            
            {/* MOBİL HEADER (APP BAR) */}
            <header className={cn("sticky top-0 z-40 w-full pt-[env(safe-area-inset-top)]", themeClasses.HEADER_BG)}>
                <div className="flex items-center justify-between px-2 h-12 md:h-14 max-w-2xl mx-auto relative">
                    <Button variant="ghost" size="icon" onClick={() => router.back()} className={cn("text-[#007AFF] dark:text-[#0A84FF] hover:bg-transparent active:opacity-50")}>
                        <ChevronLeft className="w-7 h-7" />
                    </Button>
                    
                    <h1 className="text-[17px] font-semibold tracking-tight absolute left-1/2 -translate-x-1/2">
                        Bütçe Takibi
                    </h1>

                    <Link href="/budget/stats">
                        <Button variant="ghost" size="icon" className="text-[#007AFF] dark:text-[#0A84FF] hover:bg-transparent active:opacity-50">
                            <BarChart2 className="w-6 h-6" />
                        </Button>
                    </Link>
                </div>
            </header>

            <div className="max-w-2xl mx-auto px-4 pt-4 relative z-10 space-y-5">
                
                {/* --- MOBİL ÖZET KARTI (PREMIUM GRADIENT) --- */}
                <div className="relative overflow-hidden rounded-[28px] p-6 shadow-xl active:scale-[0.98] transition-transform duration-300 border border-white/10">
                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 via-purple-600 to-rose-500 z-0" />
                    <div className="absolute -top-20 -right-20 w-56 h-56 bg-white/20 rounded-full blur-[40px] pointer-events-none" />
                    <div className="absolute -bottom-20 -left-20 w-56 h-56 bg-black/30 rounded-full blur-[40px] pointer-events-none" />
                    
                    <div className="relative z-10 flex flex-col justify-between min-h-[150px]">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-white/80 text-[12px] font-bold uppercase tracking-widest mb-1 drop-shadow-sm">{labelTotal}</p>
                                <h2 className="text-4xl font-extrabold text-white tracking-tight drop-shadow-md">
                                    {headerTotal.toLocaleString('tr-TR')} ₺
                                </h2>
                            </div>
                            <div className="bg-white/20 p-2.5 rounded-2xl backdrop-blur-md shadow-sm border border-white/20">
                                {headerTotal >= 0 ? <TrendingUp className="h-6 w-6 text-white" /> : <TrendingDown className="h-6 w-6 text-white" />}
                            </div>
                        </div>
                        
                        <div className="flex gap-4 mt-6">
                            <div className="flex-1 bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/10">
                                <div className="flex items-center gap-1.5 mb-1.5">
                                    <div className="w-6 h-6 rounded-full bg-emerald-400/20 flex items-center justify-center">
                                        <ArrowDownLeft className="h-3.5 w-3.5 text-emerald-300" />
                                    </div>
                                    <p className="text-[10px] text-white/70 uppercase font-bold tracking-widest">{labelIncome}</p>
                                </div>
                                <p className="text-[16px] font-bold text-white">{headerIncome.toLocaleString('tr-TR')} ₺</p>
                            </div>
                            <div className="flex-1 bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/10">
                                <div className="flex items-center gap-1.5 mb-1.5">
                                    <div className="w-6 h-6 rounded-full bg-rose-400/20 flex items-center justify-center">
                                        <ArrowUpRight className="h-3.5 w-3.5 text-rose-300" />
                                    </div>
                                    <p className="text-[10px] text-white/70 uppercase font-bold tracking-widest">{labelExpense}</p>
                                </div>
                                <p className="text-[16px] font-bold text-white">{headerExpense.toLocaleString('tr-TR')} ₺</p>
                            </div>
                        </div>
                    </div>
                    
                    {/* BÜTÇE LİMİTLERİ (Aylık) */}
                    {limitedCategories.length > 0 && (
                        <div className="px-5 mt-6 mb-2">
                            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Bütçe Limitleri</h3>
                            <div className="space-y-3">
                                {limitedCategories.map(cat => (
                                    <div key={cat.id} className="bg-white dark:bg-[#1C1C1E] p-3 rounded-2xl shadow-sm">
                                        <div className="flex justify-between items-center mb-1.5">
                                            <div className="flex items-center gap-2">
                                                <span className="text-lg">{cat.icon}</span>
                                                <span className="text-sm font-semibold">{cat.name}</span>
                                            </div>
                                            <span className="text-[11px] font-medium text-slate-500">{cat.spent.toLocaleString('tr-TR')} / {cat.limit!.toLocaleString('tr-TR')} ₺</span>
                                        </div>
                                        <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                            <div 
                                                className={cn("h-full rounded-full transition-all duration-500", cat.percent >= 90 ? "bg-rose-500" : cat.percent >= 75 ? "bg-orange-500" : "bg-indigo-500")}
                                                style={{ width: `${cat.percent}%` }}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* --- SEGMENTED CONTROL (IOS TARZI SEKMELER) --- */}
                <div className="bg-slate-100 dark:bg-slate-800/50 p-1.5 rounded-[16px] flex w-full mb-4 shadow-inner">
                    <Tabs value={mainTab} onValueChange={setMainTab} className="w-full">
                        <TabsList className="bg-transparent w-full grid grid-cols-3 p-0 h-[38px] gap-1">
                            <TabsTrigger value="day" className="rounded-xl h-full text-[13px] font-bold data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:text-indigo-600 dark:data-[state=active]:text-indigo-400 data-[state=active]:shadow-md transition-all text-slate-500 hover:text-slate-700 dark:hover:text-slate-300">
                                Günlük
                            </TabsTrigger>
                            <TabsTrigger value="month" className="rounded-xl h-full text-[13px] font-bold data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:text-indigo-600 dark:data-[state=active]:text-indigo-400 data-[state=active]:shadow-md transition-all text-slate-500 hover:text-slate-700 dark:hover:text-slate-300">
                                Aylık
                            </TabsTrigger>
                            <TabsTrigger value="accounts" className="rounded-xl h-full text-[13px] font-bold data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:text-indigo-600 dark:data-[state=active]:text-indigo-400 data-[state=active]:shadow-md transition-all text-slate-500 hover:text-slate-700 dark:hover:text-slate-300">
                                Hesaplar
                            </TabsTrigger>
                        </TabsList>
                    </Tabs>
                </div>

                {/* TARİH SEÇİCİ (Günlük/Aylık sekmelerinde) */}
                {mainTab !== 'accounts' && (
                    <div className="flex items-center justify-between px-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-[#007AFF]" onClick={() => handleNavDate('prev')}><ChevronLeft className="h-5 w-5"/></Button>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button variant="ghost" className="h-8 text-[15px] font-semibold text-[#1C1C1E] dark:text-white hover:bg-transparent px-2">
                                    {format(currentDate, dateDisplayFormat, { locale: tr })}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0 rounded-2xl border-0 shadow-xl" align="center">
                                <Calendar
                                    mode="single"
                                    selected={currentDate}
                                    onSelect={(date) => date && setCurrentDate(date)}
                                    initialFocus
                                />
                            </PopoverContent>
                        </Popover>
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-[#007AFF]" onClick={() => handleNavDate('next')}><ChevronRight className="h-5 w-5"/></Button>
                    </div>
                )}

                {/* --- İÇERİK ALANI --- */}
                <div className="space-y-6 pb-6">
                    
                    {/* GÜNLÜK GÖRÜNÜM - IOS Gruplu Liste */}
                    {mainTab === 'day' && dailyGroups.map(group => (
                        <div key={group.dateISO}>
                            <h3 className="px-4 mb-1.5 text-[13px] font-medium text-[#8E8E93] uppercase tracking-wide flex justify-between">
                                <span>{group.date}</span>
                                <span className="normal-case">
                                    {group.dayTotalIncome > 0 && <span className="text-[#34C759] ml-2">+{group.dayTotalIncome}₺</span>}
                                    {group.dayTotalExpense > 0 && <span className="text-[#FF3B30] ml-2">-{group.dayTotalExpense}₺</span>}
                                </span>
                            </h3>
                            <div className={cn("overflow-hidden rounded-2xl", themeClasses.CARD_BG)}>
                                {group.transactions.map((tx, index) => {
                                    const account = accounts.find(a => a.id === tx.accountId);
                                    const dynamicCategory = categories.find(c => c.name === tx.category);
                                    let config = categoryConfig[tx.category];
                                    if (!config) {
                                        config = tx.type === 'income' 
                                            ? { color: 'bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400', icon: PlusCircle }
                                            : { color: 'bg-rose-500/10 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400', icon: CircleEllipsis };
                                    }
                                    const CategoryIcon = config.icon;
                                    const bgClass = config.color.split(' ').find(c => c.startsWith('bg-')) || 'bg-slate-100';
                                    const textClass = config.color.split(' ').find(c => c.startsWith('text-')) || 'text-slate-800';

                                    return (
                                        <div key={tx.id} className="relative mb-3 last:mb-0">
                                            <div 
                                                className={cn("flex items-center justify-between p-4 rounded-2xl active:scale-[0.98] transition-all cursor-pointer shadow-sm border border-white/40 dark:border-white/5", bgClass, "dark:bg-opacity-10 dark:bg-slate-800")} 
                                                onClick={() => openTransactionForm(tx)}
                                            >
                                                <div className="flex items-center gap-3.5">
                                                    <div className={cn("h-12 w-12 rounded-2xl flex items-center justify-center font-bold text-xl shadow-sm bg-white dark:bg-slate-700", textClass)}>
                                                        {dynamicCategory ? <span className="text-2xl">{dynamicCategory.icon}</span> : <CategoryIcon className="w-6 h-6" />}
                                                    </div>
                                                    <div>
                                                        <p className="text-[16px] font-bold text-slate-800 dark:text-white leading-tight">{tx.category}</p>
                                                        <p className="text-[12px] text-slate-500 font-medium mt-0.5">{account?.name || 'Hesap Yok'}</p>
                                                    </div>
                                                </div>
                                                <p className={cn("font-bold text-[17px]", tx.type === 'expense' ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400')}>
                                                    {tx.type === 'expense' ? '-' : '+'}{tx.amount.toLocaleString('tr-TR')} ₺
                                                </p>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    ))}

                    {/* AYLIK GÖRÜNÜM */}
                    {mainTab === 'month' && (
                        <div className="px-5 space-y-6">
                            {/* Sabit Giderler Kartı */}
                            {recurringExpenses.length > 0 && (
                                <div>
                                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">Sabit Giderler (Abonelikler)</h3>
                                    <div className={cn("overflow-hidden rounded-2xl", themeClasses.CARD_BG)}>
                                        {recurringExpenses.map((tx, index) => {
                                            let config = categoryConfig[tx.category];
                                            if (!config) {
                                                config = tx.type === 'income' 
                                                    ? { color: 'bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400', icon: PlusCircle }
                                                    : { color: 'bg-rose-500/10 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400', icon: CircleEllipsis };
                                            }
                                            const CategoryIcon = config.icon;
                                            const bgClass = config.color.split(' ').find(c => c.startsWith('bg-')) || 'bg-slate-100';
                                            const textClass = config.color.split(' ').find(c => c.startsWith('text-')) || 'text-slate-800';

                                            return (
                                                <div key={tx.id} className="relative mb-3 last:mb-0">
                                                    <div className={cn("flex items-center justify-between p-4 rounded-2xl border border-white/40 dark:border-white/5 shadow-sm", bgClass, "dark:bg-opacity-10 dark:bg-slate-800")}>
                                                        <div className="flex items-center gap-3.5">
                                                            <div className={cn("h-10 w-10 rounded-2xl flex items-center justify-center font-bold text-lg bg-white dark:bg-slate-700 shadow-sm", textClass)}>
                                                                <CategoryIcon className="w-5 h-5" />
                                                            </div>
                                                            <div>
                                                                <p className="text-[15px] font-bold text-slate-800 dark:text-white leading-tight">{tx.category}</p>
                                                                <p className="text-[11px] text-slate-500 mt-0.5 uppercase tracking-wider font-semibold">Her Ay</p>
                                                            </div>
                                                        </div>
                                                        <p className="font-bold text-[16px] text-rose-600 dark:text-rose-400">
                                                            -{tx.amount.toLocaleString('tr-TR')} ₺
                                                        </p>
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    </div>
                                </div>
                            )}

                            <div>
                                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Aylık Özet</h3>
                                <div className={cn("overflow-hidden rounded-2xl", themeClasses.CARD_BG)}>
                            {monthlySummaries.map((summary, index) => {
                                const isLast = index === monthlySummaries.length - 1;
                                return (
                                    <Accordion type="single" collapsible key={summary.monthKey} className="w-full">
                                        <AccordionItem value={summary.monthKey} className="border-0 relative">
                                            <AccordionTrigger className="px-4 py-3.5 hover:no-underline active:bg-black/5 dark:active:bg-white/5">
                                                <div className="flex items-center justify-between w-full">
                                                    <span className="text-[16px] font-medium capitalize text-[#1C1C1E] dark:text-white">{summary.month}</span>
                                                    <div className="text-right pr-2">
                                                        <p className={cn("font-medium text-[16px]", summary.total >= 0 ? "text-[#34C759]" : "text-[#FF1E1E]")}>
                                                            {summary.total >= 0 ? '+' : ''}{summary.total.toLocaleString('tr-TR')} ₺
                                                        </p>
                                                    </div>
                                                </div>
                                            </AccordionTrigger>
                                            <AccordionContent className="px-4 pb-4">
                                                <div className="flex gap-3 mt-1">
                                                    <div className="flex-1 bg-[#34C759]/10 rounded-xl p-3 text-center">
                                                        <p className="text-[11px] font-semibold text-[#34C759] uppercase mb-1">Gelir</p>
                                                        <p className="font-bold text-[#34C759]">{summary.income.toLocaleString()} ₺</p>
                                                    </div>
                                                    <div className="flex-1 bg-[#FF3B30]/10 rounded-xl p-3 text-center">
                                                        <p className="text-[11px] font-semibold text-[#FF3B30] uppercase mb-1">Gider</p>
                                                        <p className="font-bold text-[#FF3B30]">{summary.expense.toLocaleString()} ₺</p>
                                                    </div>
                                                </div>
                                            </AccordionContent>
                                            {!isLast && <div className="absolute bottom-0 right-0 left-4 h-[0.5px] bg-[#C6C6C8] dark:bg-[#38383A]" />}
                                        </AccordionItem>
                                    </Accordion>
                                )
                            })}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* HESAPLAR GÖRÜNÜMÜ */}
                    {mainTab === 'accounts' && (
                        <div className="space-y-6">
                            {/* Varlıklar */}
                            <div>
                                <h3 className="px-4 mb-1.5 text-[13px] font-medium text-[#8E8E93] uppercase tracking-wide flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-[#34C759]" /> Varlıklar
                                </h3>
                                <div className={cn("overflow-hidden rounded-2xl", themeClasses.CARD_BG)}>
                                    {accountStats.assets.map((account, index) => {
                                        const isLast = index === accountStats.assets.length - 1;
                                        return (
                                            <div key={account.id} className="relative">
                                                <div className="flex items-center justify-between p-3.5 active:bg-black/5 dark:active:bg-white/5 cursor-pointer" onClick={() => openAccountForm(account)}>
                                                    <div className="flex items-center gap-3">
                                                        <div className="h-10 w-10 rounded-full bg-[#34C759]/10 text-[#34C759] flex items-center justify-center">
                                                            {React.createElement(accountIcons[account.type] || Wallet, { className: "h-5 w-5" })}
                                                        </div>
                                                        <div>
                                                            <p className="text-[16px] font-medium text-[#1C1C1E] dark:text-white leading-tight">{account.name}</p>
                                                            <p className="text-[13px] text-[#8E8E93] mt-0.5 capitalize">{account.type === 'bank' ? 'Banka Hesabı' : 'Nakit'}</p>
                                                        </div>
                                                    </div>
                                                    <p className="font-medium text-[16px] text-[#1C1C1E] dark:text-white">{account.balance.toLocaleString()} ₺</p>
                                                </div>
                                                {!isLast && <div className="absolute bottom-0 right-0 left-[60px] h-[0.5px] bg-[#C6C6C8] dark:bg-[#38383A]" />}
                                            </div>
                                        )
                                    })}
                                    {/* Ekle Butonu */}
                                    <div className="relative">
                                        <div className="absolute top-0 right-0 left-[60px] h-[0.5px] bg-[#C6C6C8] dark:bg-[#38383A]" />
                                        <button className="w-full p-3.5 flex items-center gap-3 active:bg-black/5 dark:active:bg-white/5 text-[#007AFF] text-[16px]" onClick={() => openAccountForm(null, 'bank')}>
                                            <Plus className="h-5 w-5 ml-2.5" /> Yeni Varlık Ekle
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Borçlar */}
                            <div>
                                <h3 className="px-4 mb-1.5 text-[13px] font-medium text-[#8E8E93] uppercase tracking-wide flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-[#FF3B30]" /> Borçlar
                                </h3>
                                <div className={cn("overflow-hidden rounded-2xl", themeClasses.CARD_BG)}>
                                    {accountStats.debts.map((account, index) => {
                                        const isLast = index === accountStats.debts.length - 1;
                                        return (
                                            <div key={account.id} className="relative">
                                                <div className="flex items-center justify-between p-3.5 active:bg-black/5 dark:active:bg-white/5 cursor-pointer" onClick={() => openAccountForm(account)}>
                                                    <div className="flex items-center gap-3">
                                                        <div className="h-10 w-10 rounded-full bg-[#FF3B30]/10 text-[#FF3B30] flex items-center justify-center">
                                                            {React.createElement(accountIcons[account.type] || Wallet, { className: "h-5 w-5" })}
                                                        </div>
                                                        <div>
                                                            <p className="text-[16px] font-medium text-[#1C1C1E] dark:text-white leading-tight">{account.name}</p>
                                                            <p className="text-[13px] text-[#8E8E93] mt-0.5 capitalize">
                                                                {account.type === 'credit-card' ? 'Kredi Kartı' : (account.type === 'debt' ? 'Borç' : 'Diğer')}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <p className="font-medium text-[16px] text-[#FF3B30]">{account.balance.toLocaleString()} ₺</p>
                                                </div>
                                                {!isLast && <div className="absolute bottom-0 right-0 left-[60px] h-[0.5px] bg-[#C6C6C8] dark:bg-[#38383A]" />}
                                            </div>
                                        )
                                    })}
                                    {/* Ekle Butonu */}
                                    <div className="relative">
                                        <div className="absolute top-0 right-0 left-[60px] h-[0.5px] bg-[#C6C6C8] dark:bg-[#38383A]" />
                                        <button className="w-full p-3.5 flex items-center gap-3 active:bg-black/5 dark:active:bg-white/5 text-[#007AFF] text-[16px]" onClick={() => openAccountForm(null, 'credit-card')}>
                                            <Plus className="h-5 w-5 ml-2.5" /> Yeni Borç/Kart Ekle
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* YENİ İŞLEM EKLE BUTONU (FLOATING) */}
            <div className="fixed bottom-[110px] right-6 z-40">
                <Button 
                    className="h-16 w-16 rounded-[24px] rounded-tl-lg shadow-xl hover:shadow-2xl hover:-translate-y-1 bg-gradient-to-br from-blue-500 to-indigo-600 border border-white/20 active:scale-95 transition-all p-0 flex items-center justify-center"
                    onClick={() => openTransactionForm(null)}
                >
                    <Plus className="h-8 w-8 text-white drop-shadow-md" />
                </Button>
            </div>

            {/* --- Dialoglar (Modallar) --- */}
            <Dialog open={isAccountFormOpen} onOpenChange={setIsAccountFormOpen}>
                <DialogContent className="sm:max-w-md rounded-[24px] bg-white dark:bg-[#1C1C1E] border-0 shadow-2xl p-0 overflow-hidden text-[#1C1C1E] dark:text-white">
                    <div className="p-6">
                        <NewAccountForm 
                            familyMembers={familyMembers} 
                            onSubmit={handleAccountSubmit} 
                            initialData={editingAccount} 
                            initialType={initialAccountType}
                        />
                        {/* Silme Butonu (Sadece düzenlemede gösterilir) */}
                        {editingAccount && (
                             <Button variant="destructive" className="w-full mt-4 rounded-xl" onClick={() => {handleDeleteAccount(editingAccount.id); setIsAccountFormOpen(false);}}>
                                Hesabı Sil
                             </Button>
                        )}
                    </div>
                </DialogContent>
            </Dialog>
            
            <Dialog open={isTransactionFormOpen} onOpenChange={(open) => { if (!open) setEditingTransaction(null); setIsTransactionFormOpen(open); }}>
                <DialogContent className="sm:max-w-md rounded-[24px] bg-white dark:bg-[#1C1C1E] border-0 shadow-2xl p-0 overflow-hidden text-[#1C1C1E] dark:text-white">
                    <div className="p-6">
                        <NewTransactionForm accounts={accounts} familyMembers={familyMembers} onSubmit={handleTransactionSubmit} initialData={editingTransaction} />
                        {/* Silme Butonu (Sadece düzenlemede gösterilir) */}
                        {editingTransaction && (
                             <Button variant="destructive" className="w-full mt-4 rounded-xl" onClick={() => {handleDeleteTransaction(editingTransaction.id); setIsTransactionFormOpen(false);}}>
                                İşlemi Sil
                             </Button>
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
