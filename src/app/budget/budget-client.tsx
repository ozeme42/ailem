"use client";

import * as React from "react";
import { Plus, Wallet, TrendingUp, TrendingDown, MoreHorizontal, ChevronLeft, ChevronRight, Edit, Trash2, Banknote, Landmark, CreditCard, BarChart2, PieChart, User, FileOutput, GripVertical, Settings, HandCoins, ArrowUpRight, ArrowDownLeft, DollarSign, Calendar as CalendarIcon, Filter } from "lucide-react";
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

const accountIcons: { [key: string]: React.ElementType } = {
    'cash': Banknote,
    'bank': Landmark,
    'credit-card': CreditCard,
    'other': Wallet
};

// --- Kategori Renkleri ---
const categoryColors: {[key: string]: string} = {
    'Market': 'bg-orange-100 text-orange-700',
    'Yemek': 'bg-yellow-100 text-yellow-700',
    'Ulaşım': 'bg-blue-100 text-blue-700',
    'Fatura': 'bg-red-100 text-red-700',
    'Eğlence': 'bg-purple-100 text-purple-700',
    'Sağlık': 'bg-green-100 text-green-700',
    'Giyim': 'bg-pink-100 text-pink-700',
    'Eğitim': 'bg-indigo-100 text-indigo-700',
    'Maaş': 'bg-emerald-100 text-emerald-700',
    'Diğer': 'bg-slate-100 text-slate-700'
};

export function BudgetClient() {
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
        <div className="min-h-[100dvh] bg-[#F3F6F8] font-sans pb-24">
            {/* Dekoratif Arkaplan */}
            <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
                <div className="absolute top-0 left-0 w-[50%] h-[50%] bg-blue-100/60 rounded-full blur-[120px]" />
                <div className="absolute bottom-0 right-0 w-[40%] h-[40%] bg-indigo-100/50 rounded-full blur-[120px]" />
            </div>

            <div className="max-w-7xl mx-auto md:p-6 p-4 relative z-10 space-y-6">
                
                {/* --- HEADER (Modern & Dinamik) --- */}
                <div className="flex flex-col gap-6 pt-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-3xl md:text-4xl font-black tracking-tight mb-1 text-slate-800 flex items-center gap-3">
                                Bütçe <span className="text-indigo-600 text-lg md:text-xl font-bold bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100">Takibi</span>
                            </h1>
                            <p className="text-slate-500 font-medium ml-1">Gelir ve giderlerini kontrol et.</p>
                        </div>
                        
                        {/* --- YENİ: RAPORLAR BUTONU (Mobil ve Masaüstü Uyumlu) --- */}
                        <Link href="/budget/stats">
                            {/* Mobilde İkon */}
                            <Button variant="outline" size="icon" className="rounded-full border-indigo-200 text-indigo-600 bg-white hover:bg-indigo-50 md:hidden shadow-sm">
                                <BarChart2 className="h-5 w-5" />
                            </Button>
                            {/* Masaüstünde Yazılı */}
                            <Button variant="outline" className="rounded-2xl border-indigo-200 text-indigo-600 bg-white hover:bg-indigo-50 hidden md:flex font-bold shadow-sm">
                                <BarChart2 className="mr-2 h-4 w-4" /> Raporlar & Analiz
                            </Button>
                        </Link>
                    </div>

                    {/* Tarih Navigasyonu & Filtre */}
                    <div className="flex items-center justify-between bg-white/60 backdrop-blur-md p-2 rounded-[2rem] shadow-sm border border-white">
                        <div className="flex items-center gap-2">
                            <Button variant="ghost" size="icon" className="rounded-full h-10 w-10 hover:bg-white" onClick={() => handleNavDate('prev')}><ChevronLeft className="h-5 w-5 text-slate-600" /></Button>
                            <div className="px-4 py-2 bg-white rounded-xl shadow-sm min-w-[140px] text-center font-bold text-slate-700 border border-slate-100 flex items-center justify-center gap-2">
                                <CalendarIcon className="h-4 w-4 text-indigo-500" />
                                {format(currentDate, dateDisplayFormat, { locale: tr })}
                            </div>
                            <Button variant="ghost" size="icon" className="rounded-full h-10 w-10 hover:bg-white" onClick={() => handleNavDate('next')}><ChevronRight className="h-5 w-5 text-slate-600" /></Button>
                        </div>
                        
                        <Tabs value={mainTab} onValueChange={setMainTab} className="hidden sm:block">
                            <TabsList className="bg-slate-100/50 p-1 rounded-full h-12">
                                <TabsTrigger value="day" className="rounded-full px-6 h-full data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-md font-bold text-slate-500 transition-all">Günlük</TabsTrigger>
                                <TabsTrigger value="month" className="rounded-full px-6 h-full data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-md font-bold text-slate-500 transition-all">Aylık</TabsTrigger>
                                <TabsTrigger value="accounts" className="rounded-full px-6 h-full data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-md font-bold text-slate-500 transition-all">Hesaplar</TabsTrigger>
                            </TabsList>
                        </Tabs>
                        
                        <div className="sm:hidden">
                             <DropdownMenu>
                                <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="rounded-full"><Filter className="h-5 w-5 text-slate-600"/></Button></DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => setMainTab('day')}>Günlük</DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => setMainTab('month')}>Aylık</DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => setMainTab('accounts')}>Hesaplar</DropdownMenuItem>
                                </DropdownMenuContent>
                             </DropdownMenu>
                        </div>
                    </div>
                </div>

                {/* --- ÖZET KARTI (Credit Card Style) --- */}
                {mainTab !== 'accounts' && (
                    <div className="bg-gradient-to-br from-indigo-600 to-violet-700 rounded-[2rem] p-6 text-white shadow-xl shadow-indigo-200 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
                        <div className="absolute bottom-0 left-0 w-48 h-48 bg-black/10 rounded-full blur-3xl -ml-12 -mb-12 pointer-events-none"></div>
                        
                        <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-6">
                            <div className="text-center md:text-left">
                                <p className="text-indigo-200 text-sm font-medium mb-1 uppercase tracking-wider">Toplam Bakiye (Net)</p>
                                <h2 className="text-4xl font-black tracking-tight flex items-center gap-2">
                                    {headerTotal.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY', minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                                    {headerTotal >= 0 ? <TrendingUp className="h-6 w-6 text-emerald-300" /> : <TrendingDown className="h-6 w-6 text-rose-300" />}
                                </h2>
                            </div>
                            
                            <div className="flex gap-4 w-full md:w-auto">
                                <div className="flex-1 bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10 flex items-center gap-4">
                                    <div className="h-10 w-10 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-300">
                                        <ArrowDownLeft className="h-6 w-6" />
                                    </div>
                                    <div>
                                        <p className="text-xs text-indigo-200 uppercase font-bold">Gelir</p>
                                        <p className="text-lg font-bold text-emerald-300">{headerIncome.toLocaleString('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} ₺</p>
                                    </div>
                                </div>
                                <div className="flex-1 bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10 flex items-center gap-4">
                                    <div className="h-10 w-10 rounded-full bg-rose-500/20 flex items-center justify-center text-rose-300">
                                        <ArrowUpRight className="h-6 w-6" />
                                    </div>
                                    <div>
                                        <p className="text-xs text-indigo-200 uppercase font-bold">Gider</p>
                                        <p className="text-lg font-bold text-rose-300">{headerExpense.toLocaleString('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} ₺</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* --- İÇERİK --- */}
                <main className="space-y-4">
                    {/* GÜNLÜK GÖRÜNÜM */}
                    {mainTab === 'day' && dailyGroups.map(group => (
                        <div key={group.dateISO} className="bg-white/60 backdrop-blur-md rounded-[1.5rem] border border-white shadow-sm overflow-hidden">
                            <div className="bg-slate-50/80 px-6 py-3 flex justify-between items-center border-b border-slate-100">
                                <div className="font-bold text-slate-700 text-sm">{group.date}</div>
                                <div className="flex gap-4 text-xs font-bold">
                                    {group.dayTotalIncome > 0 && <span className="text-emerald-600">+{group.dayTotalIncome.toLocaleString('tr-TR')} ₺</span>}
                                    {group.dayTotalExpense > 0 && <span className="text-rose-600">-{group.dayTotalExpense.toLocaleString('tr-TR')} ₺</span>}
                                </div>
                            </div>
                            <div className="p-2 space-y-1">
                                {group.transactions.map(tx => {
                                    const account = accounts.find(a => a.id === tx.accountId);
                                    return (
                                        <div key={tx.id} className="group flex items-center justify-between p-3 hover:bg-white rounded-2xl transition-all cursor-pointer border border-transparent hover:border-slate-100 hover:shadow-sm" onClick={() => openTransactionForm(tx)}>
                                            <div className="flex items-center gap-4">
                                                <div className={cn("h-10 w-10 rounded-full flex items-center justify-center shadow-sm text-lg", categoryColors[tx.category] || 'bg-slate-100 text-slate-600')}>
                                                    {/* Kategoriye özel ikon eklenebilir, şimdilik ilk harf */}
                                                    {tx.category.charAt(0)}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-sm text-slate-700">{tx.category}</p>
                                                    <div className="flex items-center gap-1.5">
                                                        {account && React.createElement(accountIcons[account.type] || Wallet, { className: "h-3 w-3 text-slate-400" })}
                                                        <p className="text-xs text-slate-400 font-medium">{account?.name || 'Hesap Yok'}</p>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <p className={cn("font-bold text-sm", tx.type === 'expense' ? 'text-rose-600' : 'text-emerald-600')}>
                                                    {tx.type === 'expense' ? '-' : '+'}{tx.amount.toLocaleString('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} ₺
                                                </p>
                                                <Button 
                                                    variant="ghost" 
                                                    size="icon" 
                                                    className="h-8 w-8 rounded-full text-slate-300 hover:text-rose-500 hover:bg-rose-50 opacity-0 group-hover:opacity-100 transition-all"
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
                                <Accordion type="single" collapsible className="bg-white rounded-[1.5rem] border border-slate-100 shadow-sm overflow-hidden" key={summary.monthKey}>
                                    <AccordionItem value={summary.monthKey} className="border-0">
                                        <AccordionTrigger className="px-6 py-4 hover:no-underline hover:bg-slate-50/50">
                                            <div className="flex items-center justify-between w-full pr-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-500 text-xs shadow-inner uppercase">
                                                        {summary.month.substring(0, 3)}
                                                    </div>
                                                    <span className="font-bold text-slate-700 capitalize">{summary.month}</span>
                                                </div>
                                                <div className="text-right">
                                                    <p className={cn("font-black text-sm", summary.total >= 0 ? "text-emerald-600" : "text-rose-600")}>
                                                        {summary.total >= 0 ? '+' : ''}{summary.total.toLocaleString('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} ₺
                                                    </p>
                                                    <p className="text-[10px] text-slate-400 font-bold uppercase">Net Durum</p>
                                                </div>
                                            </div>
                                        </AccordionTrigger>
                                        <AccordionContent className="bg-slate-50/50 px-2 pb-2">
                                            <div className="grid grid-cols-2 gap-2 mb-2 px-2">
                                                <div className="bg-emerald-50 rounded-xl p-2 text-center border border-emerald-100">
                                                    <p className="text-[10px] font-bold text-emerald-400 uppercase">Gelir</p>
                                                    <p className="font-bold text-emerald-700">{summary.income.toLocaleString()} ₺</p>
                                                </div>
                                                <div className="bg-rose-50 rounded-xl p-2 text-center border border-rose-100">
                                                    <p className="text-[10px] font-bold text-rose-400 uppercase">Gider</p>
                                                    <p className="font-bold text-rose-700">{summary.expense.toLocaleString()} ₺</p>
                                                </div>
                                            </div>
                                            {/* İşlemler listesi burada da gösterilebilir */}
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
                                        <div key={account.id} className="bg-white p-4 rounded-[1.5rem] border border-slate-100 shadow-sm flex justify-between items-center group cursor-pointer hover:shadow-md transition-all" onClick={() => openAccountForm(account)}>
                                            <div className="flex items-center gap-4">
                                                <div className="h-12 w-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shadow-sm">
                                                    {React.createElement(accountIcons[account.type] || Wallet, { className: "h-6 w-6" })}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-slate-800">{account.name}</p>
                                                    <p className="text-xs text-slate-400 font-medium capitalize">{account.type === 'bank' ? 'Banka Hesabı' : 'Nakit'}</p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="font-black text-slate-800 text-lg">{account.balance.toLocaleString()} ₺</p>
                                                <Button variant="ghost" size="icon" className="h-6 w-6 text-slate-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => { e.stopPropagation(); handleDeleteAccount(account.id); }}>
                                                    <Trash2 className="h-4 w-4"/>
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                    <Button variant="outline" className="w-full rounded-[1.5rem] border-dashed border-slate-300 h-14 text-slate-500 hover:border-emerald-400 hover:text-emerald-600 hover:bg-emerald-50" onClick={() => openAccountForm(null)}>
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
                                        <div key={account.id} className="bg-white p-4 rounded-[1.5rem] border border-slate-100 shadow-sm flex justify-between items-center group cursor-pointer hover:shadow-md transition-all" onClick={() => openAccountForm(account)}>
                                            <div className="flex items-center gap-4">
                                                <div className="h-12 w-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center shadow-sm">
                                                    {React.createElement(accountIcons[account.type] || Wallet, { className: "h-6 w-6" })}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-slate-800">{account.name}</p>
                                                    <p className="text-xs text-slate-400 font-medium capitalize">{account.type === 'credit-card' ? 'Kredi Kartı' : 'Borç'}</p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="font-black text-rose-600 text-lg">{account.balance.toLocaleString()} ₺</p>
                                                <Button variant="ghost" size="icon" className="h-6 w-6 text-slate-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => { e.stopPropagation(); handleDeleteAccount(account.id); }}>
                                                    <Trash2 className="h-4 w-4"/>
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            
                            {/* --- YENİ: Raporlara Git Kısa Yolu --- */}
                            <div className="pt-4">
                                <Link href="/budget/stats">
                                    <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-[1.5rem] p-6 text-white text-center shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all cursor-pointer">
                                        <div className="flex flex-col items-center gap-2">
                                            <div className="h-12 w-12 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm mb-1">
                                                <BarChart2 className="h-6 w-6 text-white" />
                                            </div>
                                            <h3 className="text-lg font-black">Detaylı Raporlar</h3>
                                            <p className="text-indigo-100 text-sm">Harcama alışkanlıklarını grafiklerle incele.</p>
                                        </div>
                                    </div>
                                </Link>
                            </div>
                        </div>
                    )}
                </main>
            </div>

            {/* --- FLOAT ACTION BUTTON --- */}
            <div className="fixed bottom-24 md:bottom-8 right-6 z-50">
                <Button 
                    className="rounded-full w-16 h-16 bg-slate-900 hover:bg-slate-800 shadow-[0_10px_40px_rgba(0,0,0,0.3)] transition-transform hover:scale-105 active:scale-95 border-4 border-white"
                    onClick={() => { setEditingTransaction(null); setIsTransactionFormOpen(true); }}
                >
                    <Plus className="h-8 w-8 text-white" />
                </Button>
            </div>

            {/* --- Dialoglar --- */}
            <Dialog open={isAccountFormOpen} onOpenChange={setIsAccountFormOpen}>
                <DialogContent className="sm:max-w-md rounded-[2rem]">
                    <NewAccountForm familyMembers={familyMembers} onSubmit={handleAccountSubmit} initialData={editingAccount} />
                </DialogContent>
            </Dialog>
            
            <Dialog open={isTransactionFormOpen} onOpenChange={(open) => { if (!open) setEditingTransaction(null); setIsTransactionFormOpen(open); }}>
                <DialogContent className="p-0 border-0 bg-transparent shadow-none max-w-md w-full">
                    <div className="bg-white rounded-[2rem] shadow-2xl overflow-hidden">
                        <NewTransactionForm accounts={accounts} familyMembers={familyMembers} onSubmit={handleTransactionSubmit} initialData={editingTransaction} />
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}