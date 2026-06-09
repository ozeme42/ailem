"use client";

import * as React from "react";
import { Plus, Wallet, TrendingUp, TrendingDown, ChevronLeft, ChevronRight, Trash2, Banknote, Landmark, CreditCard, BarChart2, ArrowUpRight, ArrowDownLeft, Calendar as CalendarIcon, ArrowLeft, ShoppingCart, Utensils, Bus, FileText, Gamepad2, HeartPulse, Shirt, GraduationCap, DollarSign, Briefcase, PlusCircle, CircleEllipsis } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, LineChart, Line, XAxis, YAxis, CartesianGrid } from 'recharts';
import { NewAccountForm } from "@/components/new-account-form";
import { NewTransactionForm } from "@/components/new-transaction-form";
import { NewBillForm } from "@/components/new-bill-form";
import { useAuth } from "@/components/auth-provider";
import { onAccountsUpdate, deleteAccount, addAccount, updateAccount, addTransaction, updateTransaction, deleteTransaction, onTransactionsUpdate, onBudgetCategoriesUpdate, onBillsUpdate, addBill, updateBill, deleteBill } from "@/lib/dataService";
import type { Account, Transaction, BudgetCategory, Bill } from "@/lib/data";
import { useToast } from "@/hooks/use-toast";
import { format, startOfYear, endOfYear, subYears, parseISO, addYears, eachMonthOfInterval, subMonths, addMonths, getYear, isSameMonth } from "date-fns";
import { tr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useRouter } from "next/navigation";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";

// --- TASARIM SİSTEMİ: Mobil Odaklı ---
const themeClasses = {
    PAGE_BG: "bg-transparent transition-colors duration-300",
    HEADER_BG: "bg-white/40 dark:bg-black/20 backdrop-blur-3xl border-b border-black/[0.05] dark:border-white/[0.05]",
    CARD_BG: "bg-white/70 dark:bg-[#1C1C1E]/60 backdrop-blur-2xl border border-white/60 dark:border-white/10 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-none hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all duration-300",
    TEXT_MAIN: "text-[#1C1C1E] dark:text-white",
    TEXT_MUTED: "text-[#8E8E93] dark:text-[#EBEBF5]/60",
    INPUT_BG: "bg-white/50 dark:bg-white/5 border-transparent text-[#1C1C1E] dark:text-white focus:bg-white dark:focus:bg-[#1C1C1E] backdrop-blur-sm shadow-inner",
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
    const [bills, setBills] = React.useState<Bill[]>([]);
    
    const [isAccountFormOpen, setIsAccountFormOpen] = React.useState(false);
    const [isTransactionFormOpen, setIsTransactionFormOpen] = React.useState(false);
    const [isBillFormOpen, setIsBillFormOpen] = React.useState(false);
    const [isBillArchiveOpen, setIsBillArchiveOpen] = React.useState(false);
    const [billArchiveFilter, setBillArchiveFilter] = React.useState<string>('Tümü');

    const [editingAccount, setEditingAccount] = React.useState<Account | null>(null);
    const [initialAccountType, setInitialAccountType] = React.useState<'cash' | 'bank' | 'credit-card' | 'other' | 'debt'>('bank');
    const [editingTransaction, setEditingTransaction] = React.useState<Transaction | null>(null);
    const [editingBill, setEditingBill] = React.useState<Bill | null>(null);
    
    const [payingBill, setPayingBill] = React.useState<Bill | null>(null);
    const [paymentAccountId, setPaymentAccountId] = React.useState<string>("");

    const [mainTab, setMainTab] = React.useState('day');

    React.useEffect(() => {
        if (!familyId) return;
        const unsubAccounts = onAccountsUpdate(setAccounts);
        const unsubTransactions = onTransactionsUpdate(setAllTransactions, subYears(new Date(), 5), addYears(new Date(), 5));
        const unsubCategories = onBudgetCategoriesUpdate(setCategories);
        const unsubBills = onBillsUpdate(setBills);
        return () => { unsubAccounts(); unsubTransactions(); unsubCategories(); unsubBills(); };
    }, [familyId]);
    
    // İleri tarihli (pending) işlemleri günü geldiğinde otomatik olarak hesaplara yansıt
    React.useEffect(() => {
        if (accounts.length === 0 || allTransactions.length === 0) return;
        
        const todayStr = format(new Date(), 'yyyy-MM-dd');
        const pendingTxs = allTransactions.filter(tx => tx.isApplied === false && tx.date <= todayStr);
        
        if (pendingTxs.length > 0) {
            const applyPending = async () => {
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
            };
            applyPending();
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [allTransactions, accounts]);
    
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
            const todayStr = format(new Date(), 'yyyy-MM-dd');
            
            if (editingTransaction) { 
                const oldTx = editingTransaction;
                let targetAccount1 = accounts.find(a => a.id === oldTx.accountId);
                let targetAccount2 = accounts.find(a => a.id === data.accountId);
                
                const isSameAccount = oldTx.accountId === data.accountId;
                const newIsApplied = data.date <= todayStr;
                data.isApplied = newIsApplied;
                
                if (isSameAccount && targetAccount1) {
                     let tempBalance = targetAccount1.balance;
                     if (oldTx.isApplied || oldTx.isApplied === undefined) {
                         tempBalance = oldTx.type === 'income' ? tempBalance - oldTx.amount : tempBalance + oldTx.amount;
                     }
                     if (newIsApplied) {
                         tempBalance = data.type === 'income' ? tempBalance + data.amount : tempBalance - data.amount;
                     }
                     await updateAccount(targetAccount1.id, { balance: tempBalance });
                } else {
                     if ((oldTx.isApplied || oldTx.isApplied === undefined) && targetAccount1) {
                         const revertedBalance = oldTx.type === 'income' ? targetAccount1.balance - oldTx.amount : targetAccount1.balance + oldTx.amount;
                         await updateAccount(targetAccount1.id, { balance: revertedBalance });
                     }
                     if (newIsApplied && targetAccount2) {
                         const newBalance = data.type === 'income' ? targetAccount2.balance + data.amount : targetAccount2.balance - data.amount;
                         await updateAccount(targetAccount2.id, { balance: newBalance });
                     }
                }
                await updateTransaction(editingTransaction.id, data); 
                toast({ title: "İşlem güncellendi" }); 
            } 
            else { 
                if (data.isInstallment && data.installmentDetails?.total > 1) {
                    const totalCount = data.installmentDetails.total;
                    const amountPerInstallment = Math.round((data.amount / totalCount) * 100) / 100;
                    
                    for (let i = 0; i < totalCount; i++) {
                        const date = addMonths(parseISO(data.date), i);
                        const dateStr = format(date, 'yyyy-MM-dd');
                        const isApplied = dateStr <= todayStr;
                        
                        const txData = {
                            ...data,
                            amount: amountPerInstallment,
                            date: dateStr,
                            isApplied,
                            title: `${data.category || 'Taksit'} (${i + 1}/${totalCount})`,
                            installmentDetails: { current: i + 1, total: totalCount }
                        };
                        
                        if (isApplied) {
                            const acc = accounts.find(a => a.id === txData.accountId);
                            if (acc) {
                                const newBalance = txData.type === 'income' ? acc.balance + txData.amount : acc.balance - txData.amount;
                                await updateAccount(acc.id, { balance: newBalance });
                            }
                        }
                        await addTransaction(txData);
                    }
                    toast({ title: "Taksitli işlemler eklendi" });
                } else {
                    const isApplied = data.date <= todayStr;
                    data.isApplied = isApplied;
                    
                    if (isApplied) {
                        const acc = accounts.find(a => a.id === data.accountId);
                        if (acc) {
                            const newBalance = data.type === 'income' ? acc.balance + data.amount : acc.balance - data.amount;
                            await updateAccount(acc.id, { balance: newBalance });
                        }
                    }
                    await addTransaction(data); 
                    toast({ title: "Yeni işlem eklendi" }); 
                }
            }
            setIsTransactionFormOpen(false); setEditingTransaction(null);
        } catch (error) { toast({ variant: "destructive", title: "Hata oluştu" }); }
    }
    
    const handleDeleteAccount = async (id: string) => {
        try { await deleteAccount(id); toast({ title: "Hesap Silindi", variant: 'destructive'}); } 
        catch (error) { toast({ variant: "destructive", title: "Hata oluştu" }); }
    }
    
    const handleDeleteTransaction = async (id: string) => {
        try { 
            const tx = transactions.find(t => t.id === id);
            if (tx) {
                if (tx.isApplied || tx.isApplied === undefined) {
                    const acc = accounts.find(a => a.id === tx.accountId);
                    if (acc) {
                        const newBalance = tx.type === 'income' ? acc.balance - tx.amount : acc.balance + tx.amount;
                        await updateAccount(acc.id, { balance: newBalance });
                    }
                }
            }
            await deleteTransaction(id); 
            toast({ title: "İşlem silindi", variant: 'destructive' }); 
        } 
        catch (error) { toast({ variant: "destructive", title: "Hata oluştu" }); }
    }
    
    const openAccountForm = (account: Account | null, type: Account['type'] = 'bank') => { 
        setEditingAccount(account); 
        setInitialAccountType(type);
        setIsAccountFormOpen(true); 
    }
    const openTransactionForm = (transaction: Transaction | null) => { setEditingTransaction(transaction); setIsTransactionFormOpen(true); }

    const handleBillSubmit = async (data: any) => {
        try {
            if (editingBill) { await updateBill(editingBill.id, data); toast({ title: "Fatura güncellendi" }); } 
            else { await addBill(data); toast({ title: "Yeni fatura eklendi" }); }
            setIsBillFormOpen(false); setEditingBill(null);
        } catch (error) { toast({ variant: "destructive", title: "Hata oluştu" }); }
    };
    
    const handleDeleteBill = async (id: string) => {
        try { await deleteBill(id); toast({ title: "Fatura silindi", variant: 'destructive'}); } 
        catch (error) { toast({ variant: "destructive", title: "Hata oluştu" }); }
    };
    
    const openBillForm = (bill: Bill | null) => { setEditingBill(bill); setIsBillFormOpen(true); };

    const handlePayBill = async () => {
        if (!payingBill || !paymentAccountId) return;
        try {
            const acc = accounts.find(a => a.id === paymentAccountId);
            if (acc) {
                await updateAccount(acc.id, { balance: acc.balance - payingBill.amount });
            }
            
            const txData = {
                amount: payingBill.amount,
                type: 'expense' as const,
                accountId: paymentAccountId,
                category: 'Fatura',
                date: format(new Date(), 'yyyy-MM-dd'),
                isInstallment: false,
                isRecurring: false,
                isApplied: true
            };
            await addTransaction(txData);
            await updateBill(payingBill.id, {
                isPaid: true,
                paidDate: new Date().toISOString(),
                paidAccountId: paymentAccountId
            });
            toast({ title: "Fatura başarıyla ödendi" });
            setPayingBill(null);
            setPaymentAccountId("");
        } catch (error) {
            toast({ variant: "destructive", title: "Ödeme başarısız" });
        }
    };

    const billArchiveData = React.useMemo(() => {
        const paidBills = bills.filter(b => b.isPaid && b.paidDate);
        if (paidBills.length === 0) return [];
        
        const last6Months = Array.from({length: 6}).map((_, i) => subMonths(new Date(), 5 - i));
        
        const data = last6Months.map(monthDate => {
            const monthName = format(monthDate, 'MMM', { locale: tr });
            const monthBills = paidBills.filter(b => isSameMonth(parseISO(b.paidDate!), monthDate));
            
            const point: any = { name: monthName };
            
            if (billArchiveFilter === 'Tümü') {
                point['Toplam'] = monthBills.reduce((acc, b) => acc + b.amount, 0);
            } else {
                point[billArchiveFilter] = monthBills
                    .filter(b => b.title === billArchiveFilter)
                    .reduce((acc, b) => acc + b.amount, 0);
            }
            return point;
        });
        
        return data;
    }, [bills, billArchiveFilter]);

    const uniqueBillTitles = React.useMemo(() => {
        const titles = new Set<string>();
        bills.filter(b => b.isPaid).forEach(b => titles.add(b.title));
        return Array.from(titles);
    }, [bills]);

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
        <div className={cn("min-h-[100dvh] font-sans pb-[calc(100px+env(safe-area-inset-bottom))] relative bg-[#f8fafc] dark:bg-[#09090b] transition-colors duration-500", themeClasses.TEXT_MAIN)}>
            
            {/* AMBIENT BACKGROUND */}
            <div className="fixed top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0 opacity-50 dark:opacity-30">
                <div className="absolute top-[-5%] left-[-10%] w-[300px] h-[300px] md:w-[600px] md:h-[600px] bg-indigo-300/40 dark:bg-indigo-900/40 rounded-full blur-[120px] mix-blend-multiply dark:mix-blend-lighten animate-pulse-slow" />
                <div className="absolute bottom-[10%] right-[-10%] w-[250px] h-[250px] md:w-[500px] md:h-[500px] bg-fuchsia-300/40 dark:bg-fuchsia-900/40 rounded-full blur-[120px] mix-blend-multiply dark:mix-blend-lighten animate-pulse-slow" style={{animationDelay: '2s'}} />
                <div className="absolute top-[40%] left-[20%] w-[200px] h-[200px] md:w-[400px] md:h-[400px] bg-sky-300/30 dark:bg-sky-900/30 rounded-full blur-[100px] mix-blend-multiply dark:mix-blend-lighten animate-pulse-slow" style={{animationDelay: '4s'}} />
            </div>

            {/* MOBİL HEADER (APP BAR) */}
            <header className={cn("sticky top-0 z-40 w-full pt-[env(safe-area-inset-top)] transition-all duration-300", themeClasses.HEADER_BG)}>
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
                <div className="relative overflow-hidden rounded-[32px] p-7 shadow-[0_20px_40px_-15px_rgba(79,70,229,0.3)] hover:shadow-[0_20px_50px_-15px_rgba(79,70,229,0.4)] hover:-translate-y-1 transition-all duration-500 border border-white/20">
                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-500 via-purple-600 to-fuchsia-500 z-0" />
                    <div className="absolute -top-24 -right-24 w-64 h-64 bg-white/20 rounded-full blur-[40px] pointer-events-none mix-blend-overlay" />
                    <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-black/20 rounded-full blur-[40px] pointer-events-none mix-blend-overlay" />
                    <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-soft-light pointer-events-none" />
                    
                    <div className="relative z-10 flex flex-col justify-between min-h-[160px]">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-white/80 text-[13px] font-bold uppercase tracking-widest mb-1.5 drop-shadow-sm">{labelTotal}</p>
                                <h2 className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-br from-white via-white/90 to-white/70 tracking-tight drop-shadow-md">
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
                <div className="bg-white/40 dark:bg-black/30 backdrop-blur-md p-1.5 rounded-[20px] flex w-full mb-4 shadow-[inset_0_2px_10px_rgba(0,0,0,0.02)] border border-white/50 dark:border-white/10 relative z-10">
                    <Tabs value={mainTab} onValueChange={setMainTab} className="w-full">
                        <TabsList className="bg-transparent w-full grid grid-cols-4 p-0 h-[38px] gap-1">
                            <TabsTrigger value="day" className="rounded-xl h-full text-[12px] sm:text-[13px] font-bold data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:text-indigo-600 dark:data-[state=active]:text-indigo-400 data-[state=active]:shadow-md transition-all text-slate-500 hover:text-slate-700 dark:hover:text-slate-300">
                                Günlük
                            </TabsTrigger>
                            <TabsTrigger value="month" className="rounded-xl h-full text-[12px] sm:text-[13px] font-bold data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:text-indigo-600 dark:data-[state=active]:text-indigo-400 data-[state=active]:shadow-md transition-all text-slate-500 hover:text-slate-700 dark:hover:text-slate-300">
                                Aylık
                            </TabsTrigger>
                            <TabsTrigger value="bills" className="rounded-xl h-full text-[12px] sm:text-[13px] font-bold data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:text-indigo-600 dark:data-[state=active]:text-indigo-400 data-[state=active]:shadow-md transition-all text-slate-500 hover:text-slate-700 dark:hover:text-slate-300">
                                Faturalar
                            </TabsTrigger>
                            <TabsTrigger value="accounts" className="rounded-xl h-full text-[12px] sm:text-[13px] font-bold data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:text-indigo-600 dark:data-[state=active]:text-indigo-400 data-[state=active]:shadow-md transition-all text-slate-500 hover:text-slate-700 dark:hover:text-slate-300">
                                Hesaplar
                            </TabsTrigger>
                        </TabsList>
                    </Tabs>
                </div>

                {/* TARİH SEÇİCİ (Günlük/Aylık sekmelerinde) */}
                {(mainTab === 'day' || mainTab === 'month') && (
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
                    {/* FATURALAR GÖRÜNÜMÜ */}
                    {mainTab === 'bills' && (
                        <div className="space-y-6">
                            {/* Ödenmemiş Faturalar */}
                            <div>
                                <h3 className="px-4 mb-1.5 text-[13px] font-medium text-[#8E8E93] uppercase tracking-wide flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-[#FF3B30]" /> Ödenmeyi Bekleyenler
                                </h3>
                                <div className={cn("overflow-hidden rounded-2xl", themeClasses.CARD_BG)}>
                                    {bills.filter(b => !b.isPaid).sort((a,b) => a.dueDate.localeCompare(b.dueDate)).map((bill, index, arr) => {
                                        const isLast = index === arr.length - 1;
                                        const isOverdue = new Date(bill.dueDate) < new Date();
                                        return (
                                            <div key={bill.id} className="relative">
                                                <div className="flex items-center justify-between p-3.5">
                                                    <div className="flex items-center gap-3 cursor-pointer flex-1" onClick={() => openBillForm(bill)}>
                                                        <div className={cn("h-10 w-10 rounded-full flex items-center justify-center shadow-sm", isOverdue ? "bg-rose-100 text-rose-600" : "bg-orange-100 text-orange-600")}>
                                                            <FileText className="h-5 w-5" />
                                                        </div>
                                                        <div>
                                                            <p className="text-[16px] font-medium text-[#1C1C1E] dark:text-white leading-tight">{bill.title}</p>
                                                            <p className={cn("text-[13px] mt-0.5", isOverdue ? "text-rose-500 font-bold" : "text-[#8E8E93]")}>
                                                                Son: {format(parseISO(bill.dueDate), 'd MMM yyyy', {locale: tr})}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div className="flex flex-col items-end gap-2 ml-2">
                                                        <p className="font-bold text-[16px] text-[#1C1C1E] dark:text-white">{bill.amount.toLocaleString()} ₺</p>
                                                        <Button size="sm" className="h-7 text-[11px] bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg px-3 uppercase tracking-wider font-bold" onClick={() => setPayingBill(bill)}>Öde</Button>
                                                    </div>
                                                </div>
                                                {!isLast && <div className="absolute bottom-0 right-0 left-[60px] h-[0.5px] bg-[#C6C6C8] dark:bg-[#38383A]" />}
                                            </div>
                                        )
                                    })}
                                    {bills.filter(b => !b.isPaid).length === 0 && (
                                        <div className="p-6 text-center text-slate-500 text-sm">Bekleyen fatura yok. Harika! 🎉</div>
                                    )}
                                </div>
                            </div>
                            
                            {/* Ödenmiş Faturalar */}
                            <div>
                                <div className="flex items-center justify-between pr-4">
                                    <h3 className="px-4 mb-1.5 text-[13px] font-medium text-[#8E8E93] uppercase tracking-wide flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-[#34C759]" /> Ödenmiş Faturalar
                                    </h3>
                                    <Button variant="ghost" size="sm" className="text-indigo-600 font-bold mb-1.5 h-7 text-xs px-3 rounded-full bg-indigo-50 hover:bg-indigo-100" onClick={() => setIsBillArchiveOpen(true)}>
                                        Arşivi / Analizi Gör
                                    </Button>
                                </div>
                                <div className={cn("overflow-hidden rounded-2xl", themeClasses.CARD_BG)}>
                                    {bills.filter(b => b.isPaid).sort((a,b) => (b.paidDate || "").localeCompare(a.paidDate || "")).reverse().slice(0, 10).map((bill, index, arr) => {
                                        const isLast = index === arr.length - 1;
                                        return (
                                            <div key={bill.id} className="relative">
                                                <div className="flex items-center justify-between p-3.5 opacity-70 cursor-pointer" onClick={() => openBillForm(bill)}>
                                                    <div className="flex items-center gap-3">
                                                        <div className="h-10 w-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
                                                            <FileText className="h-5 w-5" />
                                                        </div>
                                                        <div>
                                                            <p className="text-[16px] font-medium text-[#1C1C1E] dark:text-white leading-tight line-through decoration-slate-400">{bill.title}</p>
                                                            <p className="text-[13px] text-[#8E8E93] mt-0.5">Ödendi: {bill.paidDate ? format(parseISO(bill.paidDate), 'd MMM yyyy', {locale: tr}) : '-'}</p>
                                                        </div>
                                                    </div>
                                                    <p className="font-medium text-[16px] text-slate-500">{bill.amount.toLocaleString()} ₺</p>
                                                </div>
                                                {!isLast && <div className="absolute bottom-0 right-0 left-[60px] h-[0.5px] bg-[#C6C6C8] dark:bg-[#38383A]" />}
                                            </div>
                                        )
                                    })}
                                    {bills.filter(b => b.isPaid).length === 0 && (
                                        <div className="p-6 text-center text-slate-500 text-sm">Henüz ödenmiş fatura yok.</div>
                                    )}
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
                    onClick={() => {
                        if (mainTab === 'accounts') openAccountForm(null, 'bank');
                        else if (mainTab === 'bills') openBillForm(null);
                        else openTransactionForm(null);
                    }}
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
                        <NewTransactionForm accounts={accounts} familyMembers={familyMembers} onSubmit={handleTransactionSubmit} initialData={editingTransaction} onAddNewAccount={() => { setIsTransactionFormOpen(false); setIsAccountFormOpen(true); }} />
                        {editingTransaction && (
                             <Button variant="destructive" className="w-full mt-4 rounded-xl" onClick={() => {handleDeleteTransaction(editingTransaction.id); setIsTransactionFormOpen(false);}}>
                                İşlemi Sil
                             </Button>
                        )}
                    </div>
                </DialogContent>
            </Dialog>

            <Dialog open={isBillFormOpen} onOpenChange={(open) => { if (!open) setEditingBill(null); setIsBillFormOpen(open); }}>
                <DialogContent className="sm:max-w-md rounded-[24px] bg-white dark:bg-[#1C1C1E] border-0 shadow-2xl p-0 overflow-hidden text-[#1C1C1E] dark:text-white">
                    <div className="p-6">
                        <NewBillForm onSubmit={handleBillSubmit} initialData={editingBill} />
                        {editingBill && (
                             <Button variant="destructive" className="w-full mt-4 rounded-xl" onClick={() => {handleDeleteBill(editingBill.id); setIsBillFormOpen(false);}}>
                                Faturayı Sil
                             </Button>
                        )}
                    </div>
                </DialogContent>
            </Dialog>

            {/* PAY BILL MODAL */}
            <Dialog open={!!payingBill} onOpenChange={(open) => { if (!open) setPayingBill(null); }}>
                <DialogContent className="sm:max-w-md rounded-[24px] bg-white dark:bg-[#1C1C1E] border-0 shadow-2xl p-6 text-[#1C1C1E] dark:text-white">
                    <div className="space-y-4">
                        <h2 className="text-xl font-bold text-center">Faturayı Öde</h2>
                        <div className="text-center p-4 bg-slate-50 dark:bg-white/5 rounded-2xl">
                            <p className="text-sm text-slate-500">{payingBill?.title}</p>
                            <p className="text-3xl font-black text-rose-600 mt-1">{payingBill?.amount.toLocaleString()} ₺</p>
                        </div>
                        <div className="space-y-2 mt-4">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Hangi hesaptan ödenecek?</label>
                            <div className="grid grid-cols-2 gap-2">
                                {accounts.map(acc => {
                                    const Icon = accountIcons[acc.type] || Banknote;
                                    const isSelected = paymentAccountId === acc.id;
                                    return (
                                        <div key={acc.id} onClick={() => setPaymentAccountId(acc.id)} className={cn("relative cursor-pointer flex items-center gap-2 p-3 rounded-xl border transition-all", isSelected ? "bg-indigo-50 border-indigo-500 text-indigo-700" : "bg-slate-50 border-slate-200 text-slate-700 hover:border-indigo-400")}>
                                            <Icon className="h-4 w-4 shrink-0"/>
                                            <span className="text-xs font-semibold truncate">{acc.name}</span>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                        <Button 
                            className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl mt-4 text-lg font-bold"
                            onClick={handlePayBill}
                            disabled={!paymentAccountId}
                        >
                            Ödemeyi Onayla
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* BILL ARCHIVE MODAL */}
            <Dialog open={isBillArchiveOpen} onOpenChange={setIsBillArchiveOpen}>
                <DialogContent className="sm:max-w-xl rounded-[24px] bg-white dark:bg-[#1C1C1E] border-0 shadow-2xl p-6 text-[#1C1C1E] dark:text-white max-h-[85vh] overflow-y-auto w-[95%]">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-black text-center mb-2">Fatura Arşivi ve Analizi</DialogTitle>
                    </DialogHeader>
                    
                    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                        <Button 
                            variant={billArchiveFilter === 'Tümü' ? 'default' : 'outline'} 
                            size="sm" 
                            className={cn("rounded-full font-bold", billArchiveFilter === 'Tümü' ? "bg-indigo-600" : "")}
                            onClick={() => setBillArchiveFilter('Tümü')}
                        >
                            Tümü
                        </Button>
                        {uniqueBillTitles.map(title => (
                            <Button 
                                key={title} 
                                variant={billArchiveFilter === title ? 'default' : 'outline'} 
                                size="sm" 
                                className={cn("rounded-full font-bold", billArchiveFilter === title ? "bg-indigo-600" : "")}
                                onClick={() => setBillArchiveFilter(title)}
                            >
                                {title}
                            </Button>
                        ))}
                    </div>

                    <div className="h-64 w-full mt-4 bg-slate-50 dark:bg-white/5 rounded-2xl p-4">
                        {billArchiveData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={billArchiveData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#94a3b8'}} />
                                    <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#94a3b8'}} tickFormatter={(value) => `₺${value}`} width={40} />
                                    <RechartsTooltip 
                                        contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 4px 14px 0 rgba(0,0,0,0.1)'}} 
                                        formatter={(value: number) => [`${value.toLocaleString()} ₺`, billArchiveFilter]}
                                    />
                                    <Line 
                                        type="monotone" 
                                        dataKey={billArchiveFilter === 'Tümü' ? 'Toplam' : billArchiveFilter} 
                                        stroke="#4f46e5" 
                                        strokeWidth={4} 
                                        dot={{r: 4, strokeWidth: 2}} 
                                        activeDot={{r: 6}} 
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="flex h-full items-center justify-center text-slate-500 font-medium">Yeterli veri yok</div>
                        )}
                    </div>

                    <div className="mt-6">
                        <h4 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3">Geçmiş Faturalar Listesi</h4>
                        <div className="space-y-2">
                            {bills.filter(b => b.isPaid && (billArchiveFilter === 'Tümü' || b.title === billArchiveFilter)).sort((a,b) => (b.paidDate || "").localeCompare(a.paidDate || "")).reverse().map(bill => (
                                <div key={bill.id} className="flex justify-between items-center p-3 bg-slate-50 dark:bg-white/5 rounded-xl border border-slate-100 dark:border-white/5">
                                    <div>
                                        <p className="font-bold text-sm">{bill.title}</p>
                                        <p className="text-xs text-slate-500">{bill.paidDate ? format(parseISO(bill.paidDate), 'd MMMM yyyy', {locale: tr}) : '-'}</p>
                                    </div>
                                    <p className="font-black text-slate-700 dark:text-slate-200">{bill.amount.toLocaleString()} ₺</p>
                                </div>
                            ))}
                            {bills.filter(b => b.isPaid && (billArchiveFilter === 'Tümü' || b.title === billArchiveFilter)).length === 0 && (
                                <p className="text-center text-sm text-slate-500 py-4">Fatura bulunamadı.</p>
                            )}
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
