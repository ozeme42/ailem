"use client";

import * as React from "react";
import { Plus, Wallet, TrendingUp, TrendingDown, ChevronLeft, ChevronRight, Trash2, Banknote, Landmark, CreditCard, BarChart2, ArrowUpRight, ArrowDownLeft, Calendar as CalendarIcon, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { NewAccountForm } from "@/components/new-account-form";
import { NewTransactionForm } from "@/components/new-transaction-form";
import { useAuth } from "@/components/auth-provider";
import { onAccountsUpdate, deleteAccount, addAccount, updateAccount, addTransaction, updateTransaction, deleteTransaction, onTransactionsUpdate } from "@/lib/dataService";
import type { Account, Transaction } from "@/lib/data";
import { useToast } from "@/hooks/use-toast";
import { format, startOfYear, endOfYear, subYears, parseISO, addYears, eachMonthOfInterval, subMonths, addMonths, getYear } from "date-fns";
import { tr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useRouter } from "next/navigation";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";

// --- TASARIM SİSTEMİ: Responsive & Tema Uyumlu Sınıflar ---
const themeClasses = {
    PAGE_BG: "bg-slate-50 dark:bg-slate-950 transition-colors duration-300",
    HEADER_BG: "bg-white/80 dark:bg-slate-950/70 backdrop-blur-xl border-b border-slate-200 dark:border-white/5",
    CARD_BG: "bg-white dark:bg-white/5 backdrop-blur-md border border-slate-200 dark:border-white/10 shadow-sm dark:shadow-xl",
    CARD_HOVER: "hover:shadow-md dark:hover:bg-white/10 dark:hover:border-white/20 hover:-translate-y-1 transition-all duration-300",
    TEXT_MAIN: "text-slate-900 dark:text-slate-100",
    TEXT_MUTED: "text-slate-500 dark:text-slate-400",
    ICON_BOX: "bg-gradient-to-br from-indigo-500 to-purple-600 p-2 rounded-xl shadow-lg text-white",
    BUTTON_GLASS: "bg-white dark:bg-white/10 hover:bg-slate-100 dark:hover:bg-white/20 text-slate-700 dark:text-white border border-slate-200 dark:border-white/20",
    INPUT_BG: "bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-900 dark:text-slate-200 focus:bg-white dark:focus:bg-white/10",
};

const accountIcons: { [key: string]: React.ElementType } = {
    'cash': Banknote,
    'bank': Landmark,
    'credit-card': CreditCard,
    'other': Wallet,
    'debt': Wallet
};

const categoryColors: {[key: string]: string} = {
    'Market': 'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-500/20 dark:text-orange-300 dark:border-orange-500/30',
    'Yemek': 'bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-500/20 dark:text-yellow-300 dark:border-yellow-500/30',
    'Ulaşım': 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-500/20 dark:text-blue-300 dark:border-blue-500/30',
    'Fatura': 'bg-red-100 text-red-700 border-red-200 dark:bg-red-500/20 dark:text-red-300 dark:border-red-500/30',
    'Eğlence': 'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-500/20 dark:text-purple-300 dark:border-purple-500/30',
    'Sağlık': 'bg-green-100 text-green-700 border-green-200 dark:bg-green-500/20 dark:text-green-300 dark:border-green-500/30',
    'Giyim': 'bg-pink-100 text-pink-700 border-pink-200 dark:bg-pink-500/20 dark:text-pink-300 dark:border-pink-500/30',
    'Eğitim': 'bg-indigo-100 text-indigo-700 border-indigo-200 dark:bg-indigo-500/20 dark:text-indigo-300 dark:border-indigo-500/30',
    'Maaş': 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/30',
    'Gelir': 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/30',
    'Ek Gelir': 'bg-teal-100 text-teal-700 border-teal-200 dark:bg-teal-500/20 dark:text-teal-300 dark:border-teal-500/30',
    'Diğer': 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-500/20 dark:text-slate-300 dark:border-slate-500/30'
};

export function BudgetClient() {
    const router = useRouter();
    const { familyId, familyMembers } = useAuth();
    const { toast } = useToast();
    
    const [currentDate, setCurrentDate] = React.useState(new Date());
    const [accounts, setAccounts] = React.useState<Account[]>([]);
    const [allTransactions, setAllTransactions] = React.useState<Transaction[]>([]);
    
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
        return () => { unsubAccounts(); unsubTransactions(); };
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

    // --- DİNAMİK HEADER MANTIĞI (GÜNCELLENDİ) ---
    // Eğer 'accounts' sekmesindeysek Varlıklar/Borçlar/Net Durum gösteriyoruz.
    // Değilse seçili tarihe göre Gelir/Gider/Kalan gösteriyoruz.
    let headerIncome = 0;
    let headerExpense = 0;
    let headerTotal = 0;
    let labelIncome = 'Gelir';
    let labelExpense = 'Gider';
    let labelTotal = 'Toplam Net Durum';

    if (mainTab === 'accounts') {
        headerIncome = accountStats.totalAssets;
        headerExpense = accountStats.totalDebts;
        // Hesaplar sekmesinde Net Durum: Varlıklar - Borçlar (Borçları pozitif girildiğini varsayarak çıkarıyoruz)
        headerTotal = headerIncome - headerExpense; 
        labelIncome = 'Varlıklar';
        labelExpense = 'Borçlar';
        labelTotal = 'Net Varlık';
    } else if (mainTab === 'month') {
        headerIncome = yearlyIncome;
        headerExpense = yearlyExpense;
        headerTotal = headerIncome - headerExpense;
    } else {
        // default: day
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

    return (
        <div className={cn("min-h-[100dvh] font-sans pb-24 relative overflow-hidden transition-colors duration-300", themeClasses.PAGE_BG, themeClasses.TEXT_MAIN)}>
            
            {/* Ambient Background */}
            <div className="fixed inset-0 z-0 pointer-events-none opacity-40 dark:opacity-100 transition-opacity duration-300">
                <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-indigo-200/40 dark:bg-indigo-900/30 rounded-full blur-[120px]" />
                <div className="absolute bottom-[20%] right-[-5%] w-[400px] h-[400px] bg-emerald-200/40 dark:bg-emerald-900/20 rounded-full blur-[100px]" />
                <div className="absolute top-[40%] left-[30%] w-[300px] h-[300px] bg-purple-200/40 dark:bg-purple-900/20 rounded-full blur-[100px]" />
            </div>

            {/* HEADER */}
            <div className={cn("sticky top-0 z-40 py-3 sm:py-4 px-3 sm:px-6 transition-all duration-300", themeClasses.HEADER_BG)}>
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div className="flex items-center gap-3 w-full md:w-auto">
                        <Button variant="ghost" size="icon" onClick={() => router.back()} className={cn("rounded-full mr-1 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10")}>
                            <ArrowLeft className="w-5 h-5" />
                        </Button>
                        <div className={themeClasses.ICON_BOX}>
                            <Wallet className="w-6 h-6 text-white" />
                        </div>
                        <div className="flex-grow md:flex-grow-0">
                            <p className={cn("text-xs font-semibold uppercase tracking-wider", themeClasses.TEXT_MUTED)}>Finans</p>
                            <h1 className={cn("text-lg font-bold leading-none", themeClasses.TEXT_MAIN)}>Bütçe Takibi</h1>
                        </div>
                        {/* Mobil Rapor Butonu */}
                        <Link href="/budget/stats" className="md:hidden">
                            <Button variant="outline" size="icon" className={cn("rounded-full h-10 w-10", themeClasses.BUTTON_GLASS)}>
                                <BarChart2 className="h-5 w-5" />
                            </Button>
                        </Link>
                    </div>

                    <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end">
                        {/* GELİŞMİŞ TARİH NAVİGASYONU (Takvimli) - Sadece Day/Month sekmelerinde anlamlı ama şimdilik kalsın */}
                        <div className={cn("flex items-center p-1 rounded-full border border-slate-200 dark:border-white/10 w-full md:w-auto justify-between md:justify-start", themeClasses.CARD_BG)}>
                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-slate-100 dark:hover:bg-white/10 text-slate-500 dark:text-slate-400" onClick={() => handleNavDate('prev')}><ChevronLeft className="h-4 w-4"/></Button>
                            
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button variant="ghost" className={cn("h-8 px-4 text-sm font-bold w-32 text-center hover:bg-slate-100 dark:hover:bg-white/10 rounded-full", themeClasses.TEXT_MAIN)}>
                                        <CalendarIcon className="mr-2 h-3.5 w-3.5 opacity-70" />
                                        {format(currentDate, dateDisplayFormat, { locale: tr })}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0 bg-white dark:bg-slate-900 border-slate-200 dark:border-white/10 shadow-xl" align="center">
                                    <Calendar
                                        mode="single"
                                        selected={currentDate}
                                        onSelect={(date) => date && setCurrentDate(date)}
                                        initialFocus
                                        className="rounded-md border-0"
                                    />
                                </PopoverContent>
                            </Popover>

                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-slate-100 dark:hover:bg-white/10 text-slate-500 dark:text-slate-400" onClick={() => handleNavDate('next')}><ChevronRight className="h-4 w-4"/></Button>
                        </div>

                        {/* Raporlar Butonu (Masaüstü) */}
                        <Link href="/budget/stats" className="hidden md:block">
                            <Button variant="outline" className={cn("rounded-full px-4", themeClasses.BUTTON_GLASS)}>
                                <BarChart2 className="mr-2 h-4 w-4" /> Raporlar
                            </Button>
                        </Link>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto md:p-6 p-3 relative z-10 space-y-6">
                
                {/* --- ÖZET KARTI (GÜNCELLENMİŞ) --- */}
                {/* Artık her sekmede görünüyor ve başlıkları dinamik */}
                <div className="relative overflow-hidden rounded-[2rem] p-6 sm:p-8 shadow-2xl group transition-all duration-500 hover:scale-[1.01]">
                    {/* Card Background Gradient */}
                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 to-purple-700 z-0"></div>
                    <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
                    <div className="absolute bottom-0 left-0 w-48 h-48 bg-black/20 rounded-full blur-3xl -ml-12 -mb-12 pointer-events-none"></div>
                    
                    <div className="relative z-10">
                        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                            <div className="text-center md:text-left">
                                <p className="text-indigo-200 text-sm font-medium mb-1 uppercase tracking-widest opacity-80">{labelTotal}</p>
                                <h2 className="text-4xl sm:text-5xl font-black tracking-tight text-white flex items-center justify-center md:justify-start gap-3 drop-shadow-sm">
                                    {headerTotal.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY', minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                                    {headerTotal >= 0 ? <TrendingUp className="h-8 w-8 text-emerald-300 animate-pulse" /> : <TrendingDown className="h-8 w-8 text-rose-300 animate-pulse" />}
                                </h2>
                            </div>
                            
                            <div className="flex gap-4 w-full md:w-auto">
                                <div className="flex-1 bg-white/10 dark:bg-black/20 backdrop-blur-md rounded-2xl p-3 sm:p-4 border border-white/20 dark:border-white/10 flex items-center gap-3 sm:gap-4 hover:bg-white/20 dark:hover:bg-black/30 transition-colors">
                                    <div className="h-10 w-10 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-200 dark:text-emerald-300 shadow-inner border border-emerald-500/30">
                                        <ArrowDownLeft className="h-6 w-6" />
                                    </div>
                                    <div>
                                        <p className="text-[10px] sm:text-xs text-emerald-100 dark:text-emerald-200 uppercase font-bold tracking-wider opacity-80">{labelIncome}</p>
                                        <p className="text-base sm:text-lg font-bold text-white">{headerIncome.toLocaleString('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} ₺</p>
                                    </div>
                                </div>
                                <div className="flex-1 bg-white/10 dark:bg-black/20 backdrop-blur-md rounded-2xl p-3 sm:p-4 border border-white/20 dark:border-white/10 flex items-center gap-3 sm:gap-4 hover:bg-white/20 dark:hover:bg-black/30 transition-colors">
                                    <div className="h-10 w-10 rounded-full bg-rose-500/20 flex items-center justify-center text-rose-200 dark:text-rose-300 shadow-inner border border-rose-500/30">
                                        <ArrowUpRight className="h-6 w-6" />
                                    </div>
                                    <div>
                                        <p className="text-[10px] sm:text-xs text-rose-100 dark:text-rose-200 uppercase font-bold tracking-wider opacity-80">{labelExpense}</p>
                                        <p className="text-base sm:text-lg font-bold text-white">{headerExpense.toLocaleString('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} ₺</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* --- SEKMELER --- */}
                <div className={cn("p-1 rounded-2xl flex relative overflow-x-auto", themeClasses.CARD_BG)}>
                    <Tabs value={mainTab} onValueChange={setMainTab} className="w-full">
                        <TabsList className="bg-transparent w-full justify-start md:justify-center p-0 gap-2 h-auto">
                            <TabsTrigger value="day" className="flex-1 rounded-xl py-3 data-[state=active]:bg-slate-100 dark:data-[state=active]:bg-white/10 data-[state=active]:text-slate-900 dark:data-[state=active]:text-white font-bold text-slate-500 dark:text-slate-400 transition-all min-w-[90px]">
                                Günlük
                            </TabsTrigger>
                            <TabsTrigger value="month" className="flex-1 rounded-xl py-3 data-[state=active]:bg-slate-100 dark:data-[state=active]:bg-white/10 data-[state=active]:text-slate-900 dark:data-[state=active]:text-white font-bold text-slate-500 dark:text-slate-400 transition-all min-w-[90px]">
                                Aylık
                            </TabsTrigger>
                            <TabsTrigger value="accounts" className="flex-1 rounded-xl py-3 data-[state=active]:bg-slate-100 dark:data-[state=active]:bg-white/10 data-[state=active]:text-slate-900 dark:data-[state=active]:text-white font-bold text-slate-500 dark:text-slate-400 transition-all min-w-[90px]">
                                Hesaplar
                            </TabsTrigger>
                        </TabsList>
                    </Tabs>
                </div>

                {/* --- İÇERİK --- */}
                <div className="space-y-4">
                    {/* GÜNLÜK GÖRÜNÜM */}
                    {mainTab === 'day' && dailyGroups.map(group => (
                        <div key={group.dateISO} className={cn("rounded-[1.5rem] overflow-hidden", themeClasses.CARD_BG)}>
                            <div className="bg-slate-100 dark:bg-white/5 px-6 py-3 flex justify-between items-center border-b border-slate-200 dark:border-white/5 backdrop-blur-sm">
                                <div className={cn("font-bold text-sm", themeClasses.TEXT_MAIN)}>{group.date}</div>
                                <div className="flex gap-4 text-xs font-bold">
                                    {group.dayTotalIncome > 0 && <span className="text-emerald-500 dark:text-emerald-400">+{group.dayTotalIncome.toLocaleString('tr-TR')} ₺</span>}
                                    {group.dayTotalExpense > 0 && <span className="text-rose-500 dark:text-rose-400">-{group.dayTotalExpense.toLocaleString('tr-TR')} ₺</span>}
                                </div>
                            </div>
                            <div className="p-2 space-y-1">
                                {group.transactions.map(tx => {
                                    const account = accounts.find(a => a.id === tx.accountId);
                                    // Kategoriye özel renk veya varsayılan, HARF GÖRÜNÜRLÜĞÜ İÇİN DÜZENLENDİ
                                    const categoryStyle = categoryColors[tx.category] || 
                                        (tx.type === 'income' 
                                            ? 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/30' 
                                            : 'bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:border-slate-600');

                                    return (
                                        <div key={tx.id} className="group flex items-center justify-between p-3 hover:bg-slate-50 dark:hover:bg-white/5 rounded-2xl transition-all cursor-pointer border border-transparent dark:hover:border-white/5 hover:border-slate-200" onClick={() => openTransactionForm(tx)}>
                                            <div className="flex items-center gap-4">
                                                <div className={cn("h-10 w-10 rounded-full flex items-center justify-center shadow-sm text-lg border font-bold", categoryStyle)}>
                                                    {tx.category.charAt(0).toUpperCase()}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className={cn("font-bold text-sm truncate", themeClasses.TEXT_MAIN)}>{tx.category}</p>
                                                    <div className="flex items-center gap-1.5">
                                                        {account && React.createElement(accountIcons[account.type] || Wallet, { className: "h-3 w-3 text-slate-400" })}
                                                        <p className={cn("text-xs font-medium truncate", themeClasses.TEXT_MUTED)}>{account?.name || 'Hesap Yok'}</p>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <p className={cn("font-bold text-sm whitespace-nowrap", tx.type === 'expense' ? 'text-rose-500 dark:text-rose-400' : 'text-emerald-500 dark:text-emerald-400')}>
                                                    {tx.type === 'expense' ? '-' : '+'}{tx.amount.toLocaleString('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} ₺
                                                </p>
                                                <Button 
                                                    variant="ghost" 
                                                    size="icon" 
                                                    className="h-8 w-8 rounded-full text-slate-400 hover:text-rose-500 hover:bg-rose-100 dark:hover:bg-rose-500/10 opacity-0 group-hover:opacity-100 transition-all hidden sm:flex"
                                                    onClick={(e) => { e.stopPropagation(); handleDeleteTransaction(tx.id); }}
                                                >
                                                    <Trash2 className="h-4 w-4"/>
                                                </Button>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    ))}

                    {/* AYLIK GÖRÜNÜM */}
                    {mainTab === 'month' && (
                        <div className="space-y-3">
                            {monthlySummaries.map(summary => (
                                <Accordion type="single" collapsible className={cn("rounded-[1.5rem] overflow-hidden", themeClasses.CARD_BG)} key={summary.monthKey}>
                                    <AccordionItem value={summary.monthKey} className="border-0">
                                        <AccordionTrigger className="px-6 py-4 hover:no-underline hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                                            <div className="flex items-center justify-between w-full pr-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="h-10 w-10 rounded-full bg-slate-100 dark:bg-white/5 flex items-center justify-center font-bold text-slate-500 dark:text-slate-400 text-xs shadow-inner uppercase border border-slate-200 dark:border-white/5">
                                                        {summary.month.substring(0, 3)}
                                                    </div>
                                                    <span className={cn("font-bold capitalize", themeClasses.TEXT_MAIN)}>{summary.month}</span>
                                                </div>
                                                <div className="text-right">
                                                    <p className={cn("font-black text-sm", summary.total >= 0 ? "text-emerald-500 dark:text-emerald-400" : "text-rose-500 dark:text-rose-400")}>
                                                        {summary.total >= 0 ? '+' : ''}{summary.total.toLocaleString('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} ₺
                                                    </p>
                                                    <p className={cn("text-[10px] font-bold uppercase", themeClasses.TEXT_MUTED)}>Net Durum</p>
                                                </div>
                                            </div>
                                        </AccordionTrigger>
                                        <AccordionContent className="bg-slate-50 dark:bg-black/20 px-2 pb-2 pt-2">
                                            <div className="grid grid-cols-2 gap-2 mb-2 px-2">
                                                <div className="bg-emerald-100 dark:bg-emerald-500/10 rounded-xl p-2 text-center border border-emerald-200 dark:border-emerald-500/20">
                                                    <p className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase">Gelir</p>
                                                    <p className="font-bold text-emerald-800 dark:text-emerald-200">{summary.income.toLocaleString()} ₺</p>
                                                </div>
                                                <div className="bg-rose-100 dark:bg-rose-500/10 rounded-xl p-2 text-center border border-rose-200 dark:border-rose-500/20">
                                                    <p className="text-[10px] font-bold text-rose-600 dark:text-rose-400 uppercase">Gider</p>
                                                    <p className="font-bold text-rose-800 dark:text-rose-200">{summary.expense.toLocaleString()} ₺</p>
                                                </div>
                                            </div>
                                        </AccordionContent>
                                    </AccordionItem>
                                </Accordion>
                            ))}
                        </div>
                    )}

                    {/* HESAPLAR GÖRÜNÜMÜ */}
                    {mainTab === 'accounts' && (
                        <div className="space-y-6">
                            {/* Varlıklar */}
                            <div>
                                <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3 px-2 flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-emerald-500"></div> Varlıklar
                                </h3>
                                <div className="grid gap-3">
                                    {accountStats.assets.map((account) => (
                                        <div key={account.id} className={cn("p-4 rounded-[1.5rem] flex justify-between items-center group cursor-pointer", themeClasses.CARD_BG, themeClasses.CARD_HOVER)} onClick={() => openAccountForm(account)}>
                                            <div className="flex items-center gap-4">
                                                <div className="h-12 w-12 rounded-2xl bg-emerald-100 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20 flex items-center justify-center shadow-sm">
                                                    {React.createElement(accountIcons[account.type] || Wallet, { className: "h-6 w-6" })}
                                                </div>
                                                <div>
                                                    <p className={cn("font-bold", themeClasses.TEXT_MAIN)}>{account.name}</p>
                                                    <p className={cn("text-xs font-medium capitalize", themeClasses.TEXT_MUTED)}>{account.type === 'bank' ? 'Banka Hesabı' : 'Nakit'}</p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className={cn("font-black text-lg", themeClasses.TEXT_MAIN)}>{account.balance.toLocaleString()} ₺</p>
                                                <Button variant="ghost" size="icon" className="h-6 w-6 text-slate-400 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity hidden sm:inline-flex" onClick={(e) => { e.stopPropagation(); handleDeleteAccount(account.id); }}>
                                                    <Trash2 className="h-4 w-4"/>
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                    <Button variant="outline" className={cn("w-full rounded-[1.5rem] h-14 border-dashed border-slate-300 dark:border-white/10 hover:border-emerald-500/50 hover:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-500/10", themeClasses.TEXT_MUTED)} onClick={() => openAccountForm(null, 'bank')}>
                                        <Plus className="mr-2 h-5 w-5" /> Yeni Varlık Ekle
                                    </Button>
                                </div>
                            </div>

                            {/* Borçlar */}
                            <div>
                                <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3 px-2 flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-rose-500"></div> Borçlar & Kredi Kartları
                                </h3>
                                <div className="grid gap-3">
                                    {accountStats.debts.map((account) => (
                                        <div key={account.id} className={cn("p-4 rounded-[1.5rem] flex justify-between items-center group cursor-pointer", themeClasses.CARD_BG, themeClasses.CARD_HOVER)} onClick={() => openAccountForm(account)}>
                                            <div className="flex items-center gap-4">
                                                <div className="h-12 w-12 rounded-2xl bg-rose-100 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-500/20 flex items-center justify-center shadow-sm">
                                                    {React.createElement(accountIcons[account.type] || Wallet, { className: "h-6 w-6" })}
                                                </div>
                                                <div>
                                                    <p className={cn("font-bold", themeClasses.TEXT_MAIN)}>{account.name}</p>
                                                    <p className={cn("text-xs font-medium capitalize", themeClasses.TEXT_MUTED)}>
                                                        {account.type === 'credit-card' ? 'Kredi Kartı' : (account.type === 'debt' ? 'Borç' : 'Diğer')}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="font-black text-rose-500 dark:text-rose-400 text-lg">{account.balance.toLocaleString()} ₺</p>
                                                <Button variant="ghost" size="icon" className="h-6 w-6 text-slate-400 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity hidden sm:inline-flex" onClick={(e) => { e.stopPropagation(); handleDeleteAccount(account.id); }}>
                                                    <Trash2 className="h-4 w-4"/>
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                    <Button 
                                        variant="outline" 
                                        className={cn("w-full rounded-[1.5rem] h-14 border-dashed border-slate-300 dark:border-white/10 hover:border-rose-500/50 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10", themeClasses.TEXT_MUTED)} 
                                        onClick={() => openAccountForm(null, 'credit-card')}
                                    >
                                        <Plus className="mr-2 h-5 w-5" /> Yeni Borç/Kart Ekle
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* --- FLOAT ACTION BUTTON --- */}
            <div className="fixed bottom-24 md:bottom-8 right-6 z-50">
                <Button 
                    className="rounded-full w-14 h-14 sm:w-16 sm:h-16 bg-indigo-600 hover:bg-indigo-700 text-white shadow-2xl shadow-indigo-500/40 transition-transform hover:scale-105 active:scale-95"
                    onClick={() => { setEditingTransaction(null); setIsTransactionFormOpen(true); }}
                >
                    <Plus className="h-7 w-7 sm:h-8 sm:w-8" />
                </Button>
            </div>

            {/* --- Dialoglar (Dark/Light Uyumlu) --- */}
            <Dialog open={isAccountFormOpen} onOpenChange={setIsAccountFormOpen}>
                <DialogContent className="sm:max-w-md rounded-[2rem] bg-white dark:bg-slate-900 border-slate-200 dark:border-white/10 text-slate-900 dark:text-slate-100">
                    <div className="text-slate-900 dark:text-slate-100 [&_label]:text-slate-700 dark:[&_label]:text-slate-300 [&_input]:bg-slate-50 dark:[&_input]:bg-white/5 [&_input]:border-slate-200 dark:[&_input]:border-white/10 [&_input]:text-slate-900 dark:[&_input]:text-slate-100 [&_select]:bg-slate-50 dark:[&_select]:bg-slate-800 [&_select]:border-slate-200 dark:[&_select]:border-white/10">
                        <NewAccountForm 
                            familyMembers={familyMembers} 
                            onSubmit={handleAccountSubmit} 
                            initialData={editingAccount} 
                            initialType={initialAccountType}
                        />
                    </div>
                </DialogContent>
            </Dialog>
            
            <Dialog open={isTransactionFormOpen} onOpenChange={(open) => { if (!open) setEditingTransaction(null); setIsTransactionFormOpen(open); }}>
                <DialogContent className="p-0 border-0 bg-transparent shadow-none max-w-md w-full">
                    <div className="bg-white dark:bg-slate-900 rounded-[2rem] shadow-2xl overflow-hidden border border-slate-200 dark:border-white/10 text-slate-900 dark:text-slate-100">
                        <div className="text-slate-900 dark:text-slate-100 [&_label]:text-slate-700 dark:[&_label]:text-slate-300 [&_input]:bg-slate-50 dark:[&_input]:bg-white/5 [&_input]:border-slate-200 dark:[&_input]:border-white/10 [&_input]:text-slate-900 dark:[&_input]:text-slate-100 [&_select]:bg-slate-50 dark:[&_select]:bg-slate-800 [&_select]:border-slate-200 dark:[&_select]:border-white/10">
                            <NewTransactionForm accounts={accounts} familyMembers={familyMembers} onSubmit={handleTransactionSubmit} initialData={editingTransaction} />
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}