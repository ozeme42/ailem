"use client";

import * as React from "react";
import { Plus, Wallet, TrendingUp, TrendingDown, MoreHorizontal, ChevronLeft, ChevronRight, Edit, Trash2, Banknote, Landmark, CreditCard, BarChart2, PieChart, User, FileOutput, GripVertical, Settings, HandCoins, ArrowUpRight, ArrowDownLeft, DollarSign, Calendar as CalendarIcon, Filter, ArrowLeft, ArrowRight } from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { NewAccountForm } from "@/components/new-account-form";
import { NewTransactionForm } from "@/components/new-transaction-form";
import { useAuth } from "@/components/auth-provider";
import { onAccountsUpdate, deleteAccount, addAccount, updateAccount, addTransaction, updateTransaction, deleteTransaction, onTransactionsUpdate } from "@/lib/dataService";
import type { Account, Transaction, FamilyMember } from "@/lib/data";
import { useToast } from "@/hooks/use-toast";
import { format, startOfMonth, endOfMonth, addMonths, subMonths, getYear, setYear, eachMonthOfInterval, startOfYear, endOfYear, subYears, parseISO, addYears } from "date-fns";
import { tr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { useRouter } from "next/navigation";

// --- DESIGN SYSTEM: Glassmorphism Colors ---
const glassColors = {
    CARD_BG: "bg-white/5 backdrop-blur-md border border-white/10 shadow-lg",
    CARD_HOVER: "hover:bg-white/10 hover:border-white/20 transition-all duration-300",
    TEXT_MAIN: "text-slate-100",
    TEXT_MUTED: "text-slate-400",
    HEADER_BG: "bg-slate-950/70 backdrop-blur-lg border-b border-white/5",
    ICON_BOX: "bg-gradient-to-br from-indigo-500 to-purple-500 p-2 rounded-xl shadow-lg",
    BUTTON_GLASS: "bg-white/10 hover:bg-white/20 text-white border border-white/20",
    ACCENT_GRADIENT: "bg-gradient-to-r from-indigo-600 to-purple-600",
};

const accountIcons: { [key: string]: React.ElementType } = {
    'cash': Banknote,
    'bank': Landmark,
    'credit-card': CreditCard,
    'other': Wallet
};

// --- Kategori Renkleri (Modern Palette) ---
const categoryColors: {[key: string]: string} = {
    'Market': 'bg-orange-500/20 text-orange-300 border-orange-500/30',
    'Yemek': 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
    'Ulaşım': 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    'Fatura': 'bg-red-500/20 text-red-300 border-red-500/30',
    'Eğlence': 'bg-purple-500/20 text-purple-300 border-purple-500/30',
    'Sağlık': 'bg-green-500/20 text-green-300 border-green-500/30',
    'Giyim': 'bg-pink-500/20 text-pink-300 border-pink-500/30',
    'Eğitim': 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
    'Maaş': 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    'Diğer': 'bg-slate-500/20 text-slate-300 border-slate-500/30'
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
        const totalIncome = allTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
        const totalExpense = allTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);

        const assetsTotal = accounts.filter(a => a.type === 'cash' || a.type === 'bank').reduce((sum, a) => sum + a.balance, 0);
        const debtsTotal = accounts.filter(a => a.type === 'credit-card' || a.type === 'other').reduce((sum, a) => sum + a.balance, 0);

        return {
            assets: accounts.filter(a => a.type === 'cash' || a.type === 'bank'),
            debts: accounts.filter(a => a.type === 'credit-card' || a.type === 'other'),
            totalAssets: assetsTotal,
            totalDebts: debtsTotal,
            netWorth: assetsTotal + debtsTotal 
        };
    }, [accounts, allTransactions]);

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

    const headerIncome = mainTab === 'day' ? monthlyIncome : yearlyIncome;
    const headerExpense = mainTab === 'day' ? monthlyExpense : yearlyExpense;
    const headerTotal = headerIncome - headerExpense;

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

    const openAccountForm = (account: Account | null) => { setEditingAccount(account); setIsAccountFormOpen(true); }
    const openTransactionForm = (transaction: Transaction | null) => { setEditingTransaction(transaction); setIsTransactionFormOpen(true); }

    return (
        <div className="min-h-[100dvh] bg-slate-950 font-sans text-slate-100 pb-24 relative overflow-hidden">
            {/* Ambient Background */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-indigo-900/30 rounded-full blur-[120px]" />
                <div className="absolute bottom-[20%] right-[-5%] w-[400px] h-[400px] bg-emerald-900/20 rounded-full blur-[100px]" />
                <div className="absolute top-[40%] left-[30%] w-[300px] h-[300px] bg-purple-900/20 rounded-full blur-[100px]" />
            </div>

            {/* HEADER (Dynamic Glass) */}
            <div className={cn("sticky top-0 z-40 py-4 sm:px-6 transition-all duration-300", glassColors.HEADER_BG)}>
                <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div className="flex items-center gap-3">
                        <Button variant="ghost" size="icon" onClick={() => router.back()} className={cn("rounded-full mr-1 text-slate-400 hover:text-white hover:bg-white/10")}>
                            <ArrowLeft className="w-5 h-5" />
                        </Button>
                        <div className={glassColors.ICON_BOX}>
                            <Wallet className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <p className={cn("text-xs font-semibold uppercase tracking-wider", glassColors.TEXT_MUTED)}>Finans</p>
                            <h1 className={cn("text-lg font-bold leading-none", glassColors.TEXT_MAIN)}>Bütçe Takibi</h1>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end">
                        {/* Tarih Navigasyonu */}
                        <div className={cn("flex items-center p-1 rounded-full border border-white/10", glassColors.CARD_BG)}>
                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-white/10 text-slate-400 hover:text-white" onClick={() => handleNavDate('prev')}><ChevronLeft className="h-4 w-4"/></Button>
                            <span className={cn("text-sm font-bold w-32 text-center", glassColors.TEXT_MAIN)}>{format(currentDate, dateDisplayFormat, { locale: tr })}</span>
                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-white/10 text-slate-400 hover:text-white" onClick={() => handleNavDate('next')}><ChevronRight className="h-4 w-4"/></Button>
                        </div>

                        {/* Raporlar Butonu (Masaüstü) */}
                        <Link href="/budget/stats" className="hidden md:block">
                            <Button variant="outline" className={cn("rounded-full px-4 border-white/20", glassColors.BUTTON_GLASS)}>
                                <BarChart2 className="mr-2 h-4 w-4" /> Raporlar
                            </Button>
                        </Link>
                        {/* Raporlar Butonu (Mobil) */}
                        <Link href="/budget/stats" className="md:hidden">
                            <Button variant="outline" size="icon" className={cn("rounded-full border-white/20", glassColors.BUTTON_GLASS)}>
                                <BarChart2 className="h-4 w-4" />
                            </Button>
                        </Link>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto md:p-6 p-4 relative z-10 space-y-6">
                
                {/* --- ÖZET KARTI (Credit Card Style) --- */}
                {mainTab !== 'accounts' && (
                    <div className="relative overflow-hidden rounded-[2rem] p-6 sm:p-8 shadow-2xl group transition-all duration-500 hover:scale-[1.01]">
                        {/* Card Background Gradient */}
                        <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 to-purple-700 z-0"></div>
                        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
                        <div className="absolute bottom-0 left-0 w-48 h-48 bg-black/20 rounded-full blur-3xl -ml-12 -mb-12 pointer-events-none"></div>
                        
                        <div className="relative z-10">
                            <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                                <div className="text-center md:text-left">
                                    <p className="text-indigo-200 text-sm font-medium mb-1 uppercase tracking-widest opacity-80">Toplam Net Varlık</p>
                                    <h2 className="text-4xl sm:text-5xl font-black tracking-tight text-white flex items-center justify-center md:justify-start gap-3 drop-shadow-sm">
                                        {headerTotal.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY', minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                                        {headerTotal >= 0 ? <TrendingUp className="h-8 w-8 text-emerald-300 animate-pulse" /> : <TrendingDown className="h-8 w-8 text-rose-300 animate-pulse" />}
                                    </h2>
                                </div>
                                
                                <div className="flex gap-4 w-full md:w-auto">
                                    <div className="flex-1 bg-black/20 backdrop-blur-md rounded-2xl p-4 border border-white/10 flex items-center gap-4 hover:bg-black/30 transition-colors">
                                        <div className="h-10 w-10 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-300 shadow-inner border border-emerald-500/30">
                                            <ArrowDownLeft className="h-6 w-6" />
                                        </div>
                                        <div>
                                            <p className="text-xs text-emerald-200 uppercase font-bold tracking-wider opacity-80">Gelir</p>
                                            <p className="text-lg font-bold text-white">{headerIncome.toLocaleString('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} ₺</p>
                                        </div>
                                    </div>
                                    <div className="flex-1 bg-black/20 backdrop-blur-md rounded-2xl p-4 border border-white/10 flex items-center gap-4 hover:bg-black/30 transition-colors">
                                        <div className="h-10 w-10 rounded-full bg-rose-500/20 flex items-center justify-center text-rose-300 shadow-inner border border-rose-500/30">
                                            <ArrowUpRight className="h-6 w-6" />
                                        </div>
                                        <div>
                                            <p className="text-xs text-rose-200 uppercase font-bold tracking-wider opacity-80">Gider</p>
                                            <p className="text-lg font-bold text-white">{headerExpense.toLocaleString('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} ₺</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* --- SEKMELER (Glass) --- */}
                <div className={cn("p-1 rounded-2xl flex relative overflow-x-auto", glassColors.CARD_BG)}>
                    <Tabs value={mainTab} onValueChange={setMainTab} className="w-full">
                        <TabsList className="bg-transparent w-full justify-start md:justify-center p-0 gap-2 h-auto">
                            <TabsTrigger value="day" className="flex-1 rounded-xl py-3 data-[state=active]:bg-white/10 data-[state=active]:text-white font-bold text-slate-400 transition-all min-w-[100px]">
                                Günlük
                            </TabsTrigger>
                            <TabsTrigger value="month" className="flex-1 rounded-xl py-3 data-[state=active]:bg-white/10 data-[state=active]:text-white font-bold text-slate-400 transition-all min-w-[100px]">
                                Aylık
                            </TabsTrigger>
                            <TabsTrigger value="accounts" className="flex-1 rounded-xl py-3 data-[state=active]:bg-white/10 data-[state=active]:text-white font-bold text-slate-400 transition-all min-w-[100px]">
                                Hesaplar
                            </TabsTrigger>
                        </TabsList>
                    </Tabs>
                </div>

                {/* --- İÇERİK --- */}
                <div className="space-y-4">
                    {/* GÜNLÜK GÖRÜNÜM */}
                    {mainTab === 'day' && dailyGroups.map(group => (
                        <div key={group.dateISO} className={cn("rounded-[1.5rem] overflow-hidden", glassColors.CARD_BG)}>
                            <div className="bg-white/5 px-6 py-3 flex justify-between items-center border-b border-white/5 backdrop-blur-sm">
                                <div className={cn("font-bold text-sm", glassColors.TEXT_MAIN)}>{group.date}</div>
                                <div className="flex gap-4 text-xs font-bold">
                                    {group.dayTotalIncome > 0 && <span className="text-emerald-400">+{group.dayTotalIncome.toLocaleString('tr-TR')} ₺</span>}
                                    {group.dayTotalExpense > 0 && <span className="text-rose-400">-{group.dayTotalExpense.toLocaleString('tr-TR')} ₺</span>}
                                </div>
                            </div>
                            <div className="p-2 space-y-1">
                                {group.transactions.map(tx => {
                                    const account = accounts.find(a => a.id === tx.accountId);
                                    return (
                                        <div key={tx.id} className="group flex items-center justify-between p-3 hover:bg-white/5 rounded-2xl transition-all cursor-pointer border border-transparent hover:border-white/5" onClick={() => openTransactionForm(tx)}>
                                            <div className="flex items-center gap-4">
                                                <div className={cn("h-10 w-10 rounded-full flex items-center justify-center shadow-sm text-lg border", categoryColors[tx.category] || 'bg-slate-700 text-slate-300 border-slate-600')}>
                                                    {tx.category.charAt(0)}
                                                </div>
                                                <div>
                                                    <p className={cn("font-bold text-sm", glassColors.TEXT_MAIN)}>{tx.category}</p>
                                                    <div className="flex items-center gap-1.5">
                                                        {account && React.createElement(accountIcons[account.type] || Wallet, { className: "h-3 w-3 text-slate-500" })}
                                                        <p className={cn("text-xs font-medium", glassColors.TEXT_MUTED)}>{account?.name || 'Hesap Yok'}</p>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <p className={cn("font-bold text-sm", tx.type === 'expense' ? 'text-rose-400' : 'text-emerald-400')}>
                                                    {tx.type === 'expense' ? '-' : '+'}{tx.amount.toLocaleString('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} ₺
                                                </p>
                                                <Button 
                                                    variant="ghost" 
                                                    size="icon" 
                                                    className="h-8 w-8 rounded-full text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 opacity-0 group-hover:opacity-100 transition-all"
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
                                <Accordion type="single" collapsible className={cn("rounded-[1.5rem] overflow-hidden", glassColors.CARD_BG)} key={summary.monthKey}>
                                    <AccordionItem value={summary.monthKey} className="border-0">
                                        <AccordionTrigger className="px-6 py-4 hover:no-underline hover:bg-white/5 transition-colors">
                                            <div className="flex items-center justify-between w-full pr-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="h-10 w-10 rounded-full bg-white/5 flex items-center justify-center font-bold text-slate-400 text-xs shadow-inner uppercase border border-white/5">
                                                        {summary.month.substring(0, 3)}
                                                    </div>
                                                    <span className={cn("font-bold capitalize", glassColors.TEXT_MAIN)}>{summary.month}</span>
                                                </div>
                                                <div className="text-right">
                                                    <p className={cn("font-black text-sm", summary.total >= 0 ? "text-emerald-400" : "text-rose-400")}>
                                                        {summary.total >= 0 ? '+' : ''}{summary.total.toLocaleString('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} ₺
                                                    </p>
                                                    <p className={cn("text-[10px] font-bold uppercase", glassColors.TEXT_MUTED)}>Net Durum</p>
                                                </div>
                                            </div>
                                        </AccordionTrigger>
                                        <AccordionContent className="bg-black/20 px-2 pb-2 pt-2">
                                            <div className="grid grid-cols-2 gap-2 mb-2 px-2">
                                                <div className="bg-emerald-500/10 rounded-xl p-2 text-center border border-emerald-500/20">
                                                    <p className="text-[10px] font-bold text-emerald-400 uppercase">Gelir</p>
                                                    <p className="font-bold text-emerald-200">{summary.income.toLocaleString()} ₺</p>
                                                </div>
                                                <div className="bg-rose-500/10 rounded-xl p-2 text-center border border-rose-500/20">
                                                    <p className="text-[10px] font-bold text-rose-400 uppercase">Gider</p>
                                                    <p className="font-bold text-rose-200">{summary.expense.toLocaleString()} ₺</p>
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
                                <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3 px-2 flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-emerald-500"></div> Varlıklar
                                </h3>
                                <div className="grid gap-3">
                                    {accountStats.assets.map((account) => (
                                        <div key={account.id} className={cn("p-4 rounded-[1.5rem] flex justify-between items-center group cursor-pointer", glassColors.CARD_BG, glassColors.CARD_HOVER)} onClick={() => openAccountForm(account)}>
                                            <div className="flex items-center gap-4">
                                                <div className="h-12 w-12 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center shadow-sm">
                                                    {React.createElement(accountIcons[account.type] || Wallet, { className: "h-6 w-6" })}
                                                </div>
                                                <div>
                                                    <p className={cn("font-bold", glassColors.TEXT_MAIN)}>{account.name}</p>
                                                    <p className={cn("text-xs font-medium capitalize", glassColors.TEXT_MUTED)}>{account.type === 'bank' ? 'Banka Hesabı' : 'Nakit'}</p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="font-black text-slate-200 text-lg">{account.balance.toLocaleString()} ₺</p>
                                                <Button variant="ghost" size="icon" className="h-6 w-6 text-slate-500 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => { e.stopPropagation(); handleDeleteAccount(account.id); }}>
                                                    <Trash2 className="h-4 w-4"/>
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                    <Button variant="outline" className={cn("w-full rounded-[1.5rem] h-14 border-dashed border-white/10 hover:border-emerald-500/50 hover:text-emerald-400 hover:bg-emerald-500/10", glassColors.TEXT_MUTED)} onClick={() => openAccountForm(null)}>
                                        <Plus className="mr-2 h-5 w-5" /> Yeni Varlık Ekle
                                    </Button>
                                </div>
                            </div>

                            {/* Borçlar */}
                            <div>
                                <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3 px-2 flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-rose-500"></div> Borçlar & Kredi Kartları
                                </h3>
                                <div className="grid gap-3">
                                    {accountStats.debts.map((account) => (
                                        <div key={account.id} className={cn("p-4 rounded-[1.5rem] flex justify-between items-center group cursor-pointer", glassColors.CARD_BG, glassColors.CARD_HOVER)} onClick={() => openAccountForm(account)}>
                                            <div className="flex items-center gap-4">
                                                <div className="h-12 w-12 rounded-2xl bg-rose-500/10 text-rose-400 border border-rose-500/20 flex items-center justify-center shadow-sm">
                                                    {React.createElement(accountIcons[account.type] || Wallet, { className: "h-6 w-6" })}
                                                </div>
                                                <div>
                                                    <p className={cn("font-bold", glassColors.TEXT_MAIN)}>{account.name}</p>
                                                    <p className={cn("text-xs font-medium capitalize", glassColors.TEXT_MUTED)}>{account.type === 'credit-card' ? 'Kredi Kartı' : 'Borç'}</p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="font-black text-rose-400 text-lg">{account.balance.toLocaleString()} ₺</p>
                                                <Button variant="ghost" size="icon" className="h-6 w-6 text-slate-500 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => { e.stopPropagation(); handleDeleteAccount(account.id); }}>
                                                    <Trash2 className="h-4 w-4"/>
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* --- FLOAT ACTION BUTTON --- */}
            <div className="fixed bottom-24 md:bottom-8 right-6 z-50">
                <Button 
                    className="rounded-full w-16 h-16 bg-white text-slate-900 hover:bg-slate-200 shadow-2xl shadow-indigo-500/40 transition-transform hover:scale-105 active:scale-95"
                    onClick={() => { setEditingTransaction(null); setIsTransactionFormOpen(true); }}
                >
                    <Plus className="h-8 w-8" />
                </Button>
            </div>

            {/* --- Dialoglar (Glass/Dark Mode Uyumlu) --- */}
            <Dialog open={isAccountFormOpen} onOpenChange={setIsAccountFormOpen}>
                <DialogContent className="sm:max-w-md rounded-[2rem] bg-slate-900 border-white/10 text-slate-100">
                    {/* NewAccountForm'u dark mode uyumlu sarmalayarak kullanıyoruz */}
                    <div className="text-slate-100 [&_label]:text-slate-300 [&_input]:bg-white/5 [&_input]:border-white/10 [&_input]:text-slate-100 [&_select]:bg-slate-800 [&_select]:border-white/10">
                        <NewAccountForm familyMembers={familyMembers} onSubmit={handleAccountSubmit} initialData={editingAccount} />
                    </div>
                </DialogContent>
            </Dialog>
            
            <Dialog open={isTransactionFormOpen} onOpenChange={(open) => { if (!open) setEditingTransaction(null); setIsTransactionFormOpen(open); }}>
                <DialogContent className="p-0 border-0 bg-transparent shadow-none max-w-md w-full">
                    <div className="bg-slate-900 rounded-[2rem] shadow-2xl overflow-hidden border border-white/10 text-slate-100">
                         {/* NewTransactionForm'u dark mode uyumlu sarmalayarak kullanıyoruz */}
                        <div className="text-slate-100 [&_label]:text-slate-300 [&_input]:bg-white/5 [&_input]:border-white/10 [&_input]:text-slate-100 [&_select]:bg-slate-800 [&_select]:border-white/10">
                            <NewTransactionForm accounts={accounts} familyMembers={familyMembers} onSubmit={handleTransactionSubmit} initialData={editingTransaction} />
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}