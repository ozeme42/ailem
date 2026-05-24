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

const categoryColors: {[key: string]: string} = {
    'Market': 'bg-orange-500/10 text-orange-600 dark:bg-orange-500/20 dark:text-orange-400',
    'Yemek': 'bg-yellow-500/10 text-yellow-600 dark:bg-yellow-500/20 dark:text-yellow-400',
    'Ulaşım': 'bg-blue-500/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400',
    'Fatura': 'bg-red-500/10 text-red-600 dark:bg-red-500/20 dark:text-red-400',
    'Eğlence': 'bg-purple-500/10 text-purple-600 dark:bg-purple-500/20 dark:text-purple-400',
    'Sağlık': 'bg-green-500/10 text-green-600 dark:bg-green-500/20 dark:text-green-400',
    'Giyim': 'bg-pink-500/10 text-pink-600 dark:bg-pink-500/20 dark:text-pink-400',
    'Eğitim': 'bg-indigo-500/10 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400',
    'Maaş': 'bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400',
    'Gelir': 'bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400',
    'Ek Gelir': 'bg-teal-500/10 text-teal-600 dark:bg-teal-500/20 dark:text-teal-400',
    'Diğer': 'bg-slate-500/10 text-slate-600 dark:bg-slate-500/20 dark:text-slate-400'
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

    return (
        <div className={cn("min-h-[100dvh] font-sans pb-[calc(100px+env(safe-area-inset-bottom))] relative", themeClasses.PAGE_BG, themeClasses.TEXT_MAIN)}>
            
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
                
                {/* --- MOBİL ÖZET KARTI (KREDİ KARTI GÖRÜNÜMÜ) --- */}
                <div className="relative overflow-hidden rounded-[24px] p-6 shadow-lg active:scale-[0.98] transition-transform duration-200">
                    <div className="absolute inset-0 bg-gradient-to-br from-[#007AFF] to-[#5856D6] z-0" />
                    <div className="absolute -top-16 -right-16 w-48 h-48 bg-white/20 rounded-full blur-2xl pointer-events-none" />
                    <div className="absolute -bottom-16 -left-16 w-48 h-48 bg-black/20 rounded-full blur-2xl pointer-events-none" />
                    
                    <div className="relative z-10 flex flex-col justify-between min-h-[140px]">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-white/80 text-[13px] font-medium uppercase tracking-wider mb-0.5">{labelTotal}</p>
                                <h2 className="text-3xl font-bold text-white tracking-tight">
                                    {headerTotal.toLocaleString('tr-TR')} ₺
                                </h2>
                            </div>
                            <div className="bg-white/20 p-2 rounded-xl backdrop-blur-md">
                                {headerTotal >= 0 ? <TrendingUp className="h-5 w-5 text-white" /> : <TrendingDown className="h-5 w-5 text-white" />}
                            </div>
                        </div>
                        
                        <div className="flex gap-4 mt-6">
                            <div className="flex-1">
                                <div className="flex items-center gap-1.5 mb-1">
                                    <div className="w-5 h-5 rounded-full bg-[#34C759] flex items-center justify-center">
                                        <ArrowDownLeft className="h-3 w-3 text-white" />
                                    </div>
                                    <p className="text-[11px] text-white/80 uppercase font-bold tracking-wider">{labelIncome}</p>
                                </div>
                                <p className="text-[15px] font-semibold text-white">{headerIncome.toLocaleString('tr-TR')} ₺</p>
                            </div>
                            <div className="w-px bg-white/20" />
                            <div className="flex-1">
                                <div className="flex items-center gap-1.5 mb-1">
                                    <div className="w-5 h-5 rounded-full bg-[#FF3B30] flex items-center justify-center">
                                        <ArrowUpRight className="h-3 w-3 text-white" />
                                    </div>
                                    <p className="text-[11px] text-white/80 uppercase font-bold tracking-wider">{labelExpense}</p>
                                </div>
                                <p className="text-[15px] font-semibold text-white">{headerExpense.toLocaleString('tr-TR')} ₺</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* --- SEGMENTED CONTROL (IOS TARZI SEKMELER) --- */}
                <div className="bg-[#E3E3E8] dark:bg-[#1C1C1E] p-[3px] rounded-lg flex w-full">
                    <Tabs value={mainTab} onValueChange={setMainTab} className="w-full">
                        <TabsList className="bg-transparent w-full grid grid-cols-3 p-0 h-[32px]">
                            <TabsTrigger value="day" className="rounded-md h-full text-[13px] font-medium data-[state=active]:bg-white dark:data-[state=active]:bg-[#2C2C2E] data-[state=active]:text-black dark:data-[state=active]:text-white data-[state=active]:shadow-sm transition-all text-[#8E8E93]">
                                Günlük
                            </TabsTrigger>
                            <TabsTrigger value="month" className="rounded-md h-full text-[13px] font-medium data-[state=active]:bg-white dark:data-[state=active]:bg-[#2C2C2E] data-[state=active]:text-black dark:data-[state=active]:text-white data-[state=active]:shadow-sm transition-all text-[#8E8E93]">
                                Aylık
                            </TabsTrigger>
                            <TabsTrigger value="accounts" className="rounded-md h-full text-[13px] font-medium data-[state=active]:bg-white dark:data-[state=active]:bg-[#2C2C2E] data-[state=active]:text-black dark:data-[state=active]:text-white data-[state=active]:shadow-sm transition-all text-[#8E8E93]">
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
                                    const categoryStyle = categoryColors[tx.category] || 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400';
                                    const isLast = index === group.transactions.length - 1;

                                    return (
                                        <div key={tx.id} className="relative">
                                            <div 
                                                className="flex items-center justify-between p-3.5 active:bg-black/5 dark:active:bg-white/5 transition-colors cursor-pointer" 
                                                onClick={() => openTransactionForm(tx)}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className={cn("h-10 w-10 rounded-full flex items-center justify-center font-bold text-lg", categoryStyle)}>
                                                        {tx.category.charAt(0).toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <p className="text-[16px] font-medium text-[#1C1C1E] dark:text-white leading-tight">{tx.category}</p>
                                                        <p className="text-[13px] text-[#8E8E93] mt-0.5">{account?.name || 'Hesap Yok'}</p>
                                                    </div>
                                                </div>
                                                <p className={cn("font-medium text-[16px]", tx.type === 'expense' ? 'text-[#FF1E1E]' : 'text-[#34C759]')}>
                                                    {tx.type === 'expense' ? '-' : '+'}{tx.amount.toLocaleString('tr-TR')} ₺
                                                </p>
                                            </div>
                                            {/* Liste ayırıcı çizgisi */}
                                            {!isLast && <div className="absolute bottom-0 right-0 left-[60px] h-[0.5px] bg-[#C6C6C8] dark:bg-[#38383A]" />}
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    ))}

                    {/* AYLIK GÖRÜNÜM */}
                    {mainTab === 'month' && (
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

            {/* --- FLOAT ACTION BUTTON (FAB) --- */}
            {/* MOBİL ALT MENÜNÜN (h-16) ÜZERİNDE KALMASI İÇİN bottom DEĞERİ ARTIRILDI */}
            <div className="fixed bottom-[calc(5rem+env(safe-area-inset-bottom))] right-6 z-50">
                <Button 
                    className="rounded-full w-14 h-14 bg-[#007AFF] hover:bg-[#007AFF]/90 text-white shadow-[0_4px_14px_0_rgba(0,122,255,0.39)] transition-transform active:scale-95"
                    onClick={() => { setEditingTransaction(null); setIsTransactionFormOpen(true); }}
                >
                    <Plus className="h-7 w-7" />
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
