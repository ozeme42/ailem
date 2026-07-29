"use client";

import * as React from "react";
import { Plus, Wallet, TrendingUp, TrendingDown, ChevronLeft, ChevronRight, Trash2, Banknote, Landmark, CreditCard, BarChart2, ArrowUpRight, ArrowDownLeft, Calendar as CalendarIcon, ArrowLeft, ShoppingCart, Utensils, Bus, FileText, Gamepad2, HeartPulse, Shirt, GraduationCap, DollarSign, Briefcase, PlusCircle, CircleEllipsis, Printer, Check, ListTree } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, LineChart, Line, XAxis, YAxis, CartesianGrid } from 'recharts';
import { NewAccountForm } from "@/components/new-account-form";
import { NewTransactionForm } from "@/components/new-transaction-form";
import { NewBillForm } from "@/components/new-bill-form";
import { useAuth } from "@/components/auth-provider";
import { onAccountsUpdate, deleteAccount, addAccount, updateAccount, addTransaction, updateTransaction, deleteTransaction, onTransactionsUpdate, onBudgetCategoriesUpdate, onBillsUpdate, addBill, updateBill, deleteBill, onTransactionTemplatesUpdate, addTransactionTemplate } from "@/lib/dataService";
import type { Account, Transaction, BudgetCategory, Bill, TransactionTemplate } from "@/lib/data";
import { useToast } from "@/hooks/use-toast";
import { format, startOfYear, endOfYear, subYears, parseISO, addYears, eachMonthOfInterval, subMonths, addMonths, getYear, isSameMonth, isWithinInterval } from "date-fns";
import { tr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useRouter } from "next/navigation";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { computeBudgetNetForMonth, getCardStatementPeriodForMonth } from '@/utils/budget';

// Map of icon names (stored in category.icon) to actual React icon components
const IconMap: Record<string, React.ElementType> = {
    ShoppingCart,
    Utensils,
    Bus,
    FileText,
    Gamepad2,
    HeartPulse,
    Shirt,
    GraduationCap,
    DollarSign,
    Briefcase,
    PlusCircle,
    CircleEllipsis,
    Wallet,
    CreditCard,
    Landmark,
    Banknote,
    ListTree
};

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
    const [transactionTemplates, setTransactionTemplates] = React.useState<TransactionTemplate[]>([]);
    
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
        const unsubTemplates = onTransactionTemplatesUpdate(setTransactionTemplates);
        return () => { unsubAccounts(); unsubTransactions(); unsubCategories(); unsubBills(); unsubTemplates(); };
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

            const currentMonthKey = format(currentDate, 'yyyy-MM');

            function getAssignedMonthKeyForTransaction(t: Transaction) {
                const acc = accounts.find(a => a.id === t.accountId);
                if (acc && acc.type === 'credit-card') {
                    const statementDay = acc.statementDate ?? 1;
                    const txDate = parseISO(t.date);
                    // candidate: month of transaction
                    const candidate = new Date(txDate.getFullYear(), txDate.getMonth(), 1);
                    const candidateKey = format(candidate, 'yyyy-MM');
                    const period1 = getCardStatementPeriodForMonth(candidate, statementDay);
                    if (isWithinInterval(txDate, { start: period1.start, end: period1.end })) return candidateKey;
                    // candidate: next month
                    const candidate2 = addMonths(candidate, 1);
                    const candidate2Key = format(candidate2, 'yyyy-MM');
                    const period2 = getCardStatementPeriodForMonth(candidate2, statementDay);
                    if (isWithinInterval(txDate, { start: period2.start, end: period2.end })) return candidate2Key;
                    // fallback to calendar month
                    return t.date.substring(0,7);
                }
                return t.date.substring(0,7);
            }

            const filteredTransactionsForMonth = allTransactions.filter(t => {
                const assignedKey = getAssignedMonthKeyForTransaction(t);
                return assignedKey === currentMonthKey;
            });

            // build month summaries using assigned months for card transactions
            allTransactions.forEach(t => {
                const assignedKey = getAssignedMonthKeyForTransaction(t);
                if (monthSummaries[assignedKey]) {
                    if (t.type === 'income') monthSummaries[assignedKey].income += t.amount;
                    else monthSummaries[assignedKey].expense += t.amount;
                    monthSummaries[assignedKey].transactions.push(t);
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
        labelTotal = `${format(currentDate, 'yyyy')} Net Durumu`;
    } else {
        // Compute net using card statement periods for the currently displayed month
        const txsForHelper = allTransactions.map(t => {
            const acc = accounts.find(a => a.id === t.accountId);
            const accountType = acc ? (acc.type === 'credit-card' ? 'card' : acc.type) : 'bank';
            return {
                id: t.id,
                date: t.date,
                amount: t.amount,
                type: t.type,
                accountType,
                cardId: accountType === 'card' ? t.accountId : undefined
            };
        });

        const cardsForHelper = accounts
            .filter(a => a.type === 'credit-card')
            .map(a => ({ id: a.id, name: a.name, statementDay: a.statementDate ?? 1 }));

        const budget = computeBudgetNetForMonth(currentDate, txsForHelper, cardsForHelper);

        headerIncome = budget.income;
        headerExpense = budget.nonCardExpenses + budget.totalCardExpenses;
        headerTotal = budget.net;
        labelTotal = `${format(currentDate, 'MMMM', { locale: tr })} Net Durumu`;
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
            const tx = allTransactions.find(t => t.id === id);
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
        catch (error: any) { console.error("İşlem silme hatası:", error); toast({ variant: "destructive", title: "Hata oluştu", description: error?.message || "Bilinmeyen hata" }); }
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
        catch (error: any) { console.error("Fatura silme hatası:", error); toast({ variant: "destructive", title: "Hata oluştu", description: error?.message || "Bilinmeyen hata" }); }
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
                isApplied: true,
                description: payingBill.title
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
        <div className="min-h-[100dvh] font-sans pb-[calc(100px+env(safe-area-inset-bottom))] relative bg-slate-50 dark:bg-[#0a0a14] transition-colors duration-500">
            
            {/* HERO ALANI (FinPlan Tarzı Koyu Gradyan) */}
            <div className="bg-gradient-to-b from-indigo-950 via-indigo-900 to-slate-900 dark:from-black dark:to-[#0a0a14] text-white pt-[calc(env(safe-area-inset-top)+20px)] pb-12 px-4 rounded-b-[40px] relative z-10 overflow-hidden shadow-[0_10px_40px_rgb(0,0,0,0.2)]">
                <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                    <div className="absolute top-[-20%] left-[-10%] w-[300px] h-[300px] bg-indigo-500/20 rounded-full blur-[80px]" />
                    <div className="absolute bottom-[-10%] right-[-10%] w-[250px] h-[250px] bg-purple-500/20 rounded-full blur-[80px]" />
                </div>
                
                <div className="flex justify-between items-center mb-6 relative z-10 max-w-2xl mx-auto">
                    <Button variant="ghost" size="icon" onClick={() => router.back()} className="text-white hover:bg-white/10 rounded-full">
                        <ArrowLeft className="w-6 h-6" />
                    </Button>
                    <h1 className="text-[17px] font-bold tracking-wide">Bütçe Takibi</h1>
                    <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => window.print()} className="text-white hover:bg-white/10 rounded-full print:hidden">
                            <Printer className="w-5 h-5" />
                        </Button>
                        <Link href="/budget/stats" className="print:hidden">
                            <Button variant="ghost" size="icon" className="text-white hover:bg-white/10 rounded-full">
                                <BarChart2 className="w-5 h-5" />
                            </Button>
                        </Link>
                    </div>
                </div>

                <div className="text-center relative z-10 mb-8 max-w-2xl mx-auto">
                    <p className="text-indigo-200/80 text-xs font-bold uppercase tracking-widest mb-1">{labelTotal}</p>
                    <h2 className="text-5xl font-black tracking-tighter flex items-center justify-center gap-1">
                        {headerTotal.toLocaleString('tr-TR')} <span className="text-3xl text-indigo-300 font-bold">₺</span>
                    </h2>
                </div>

                <div className="flex justify-between gap-3 relative z-10 max-w-2xl mx-auto">
                    <div className="flex-1 bg-white/10 backdrop-blur-md rounded-3xl p-3 sm:p-4 border border-white/10 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0">
                            <ArrowDownLeft className="w-5 h-5 text-emerald-400" />
                        </div>
                        <div className="min-w-0">
                            <p className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">{labelIncome}</p>
                            <p className="text-lg sm:text-xl font-bold text-white truncate">{headerIncome.toLocaleString('tr-TR')} ₺</p>
                        </div>
                    </div>
                    <div className="flex-1 bg-white/10 backdrop-blur-md rounded-3xl p-3 sm:p-4 border border-white/10 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-rose-500/20 flex items-center justify-center shrink-0">
                            <ArrowUpRight className="w-5 h-5 text-rose-400" />
                        </div>
                        <div className="min-w-0">
                            <p className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">{labelExpense}</p>
                            <p className="text-lg sm:text-xl font-bold text-white truncate">{headerExpense.toLocaleString('tr-TR')} ₺</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* TABS (FinPlan tarzı modern ikonlu) */}
            <div className="px-4 -mt-6 relative z-20 max-w-2xl mx-auto">
                <div className="bg-white dark:bg-slate-900 rounded-[24px] p-1.5 flex shadow-lg border border-slate-100 dark:border-slate-800">
                    <Tabs value={mainTab} onValueChange={setMainTab} className="w-full">
                        <TabsList className="bg-transparent w-full flex p-0 h-[50px] gap-1">
                            <TabsTrigger value="day" className="flex-1 rounded-[18px] h-full flex flex-col items-center justify-center gap-0.5 text-[10px] sm:text-xs font-bold data-[state=active]:bg-indigo-50 dark:data-[state=active]:bg-indigo-900/30 data-[state=active]:text-indigo-600 dark:data-[state=active]:text-indigo-400 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all">
                                <CalendarIcon className="w-4 h-4 sm:w-5 sm:h-5 mb-0.5" /> Günlük
                            </TabsTrigger>
                            <TabsTrigger value="month" className="flex-1 rounded-[18px] h-full flex flex-col items-center justify-center gap-0.5 text-[10px] sm:text-xs font-bold data-[state=active]:bg-indigo-50 dark:data-[state=active]:bg-indigo-900/30 data-[state=active]:text-indigo-600 dark:data-[state=active]:text-indigo-400 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all">
                                <BarChart2 className="w-4 h-4 sm:w-5 sm:h-5 mb-0.5" /> Aylık
                            </TabsTrigger>
                            <TabsTrigger value="bills" className="flex-1 rounded-[18px] h-full flex flex-col items-center justify-center gap-0.5 text-[10px] sm:text-xs font-bold data-[state=active]:bg-indigo-50 dark:data-[state=active]:bg-indigo-900/30 data-[state=active]:text-indigo-600 dark:data-[state=active]:text-indigo-400 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all">
                                <FileText className="w-4 h-4 sm:w-5 sm:h-5 mb-0.5" /> Faturalar
                            </TabsTrigger>
                            <TabsTrigger value="accounts" className="flex-1 rounded-[18px] h-full flex flex-col items-center justify-center gap-0.5 text-[10px] sm:text-xs font-bold data-[state=active]:bg-indigo-50 dark:data-[state=active]:bg-indigo-900/30 data-[state=active]:text-indigo-600 dark:data-[state=active]:text-indigo-400 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all">
                                <Wallet className="w-4 h-4 sm:w-5 sm:h-5 mb-0.5" /> Hesaplar
                            </TabsTrigger>
                        </TabsList>
                    </Tabs>
                </div>
            </div>

            <div className="max-w-2xl mx-auto pt-6 relative z-10 space-y-6">
                
                {/* TARİH SEÇİCİ (Günlük/Aylık sekmelerinde) */}
                {(mainTab === 'day' || mainTab === 'month') && (
                    <div className="flex items-center justify-between px-4">
                        <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full text-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 dark:text-indigo-400" onClick={() => handleNavDate('prev')}><ChevronLeft className="h-5 w-5"/></Button>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button variant="ghost" className="h-10 text-[16px] font-bold text-slate-800 dark:text-white hover:bg-transparent px-4">
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
                        <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full text-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 dark:text-indigo-400" onClick={() => handleNavDate('next')}><ChevronRight className="h-5 w-5"/></Button>
                    </div>
                )}

                {/* BÜTÇE LİMİTLERİ (Progress Barlar - Sadece Günlük/Aylık'ta gösterilir) */}
                {limitedCategories.length > 0 && (mainTab === 'day' || mainTab === 'month') && (
                    <div className="px-4">
                        <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-3">Bütçe Durumu</h3>
                        <div className="space-y-4 bg-white dark:bg-slate-900 rounded-[24px] p-5 shadow-sm border border-slate-100 dark:border-slate-800">
                            {limitedCategories.map(cat => (
                                <div key={cat.id} className="relative">
                                    <div className="flex justify-between items-end mb-2">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-lg shadow-sm">
                                                {cat.icon}
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{cat.name}</p>
                                                <p className="text-[11px] font-bold text-slate-400">{cat.percent}% kullanıldı</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm font-black text-slate-800 dark:text-slate-200">{cat.spent.toLocaleString('tr-TR')} ₺</p>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Limit: {cat.limit!.toLocaleString('tr-TR')} ₺</p>
                                        </div>
                                    </div>
                                    <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                        <div 
                                            className={cn("h-full rounded-full transition-all duration-1000", cat.percent >= 90 ? "bg-rose-500" : cat.percent >= 75 ? "bg-orange-500" : "bg-indigo-500")}
                                            style={{ width: `${cat.percent}%` }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* --- İÇERİK ALANI --- */}
                <div className="pb-24">
                    
                    {/* GÜNLÜK GÖRÜNÜM - İşlem Listesi */}
                    {mainTab === 'day' && dailyGroups.length > 0 && (
                        <div className="space-y-6 px-4">
                            {dailyGroups.map((group, groupIdx) => (
                                <div key={group.dateISO} className="animate-in fade-in slide-in-from-bottom-4 duration-500" style={{ animationDelay: `${groupIdx * 100}ms` }}>
                                    <div className="flex justify-between items-center mb-3">
                                        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">{group.date}</h3>
                                        <div className="flex gap-2">
                                            {group.dayTotalIncome > 0 && <span className="text-[11px] bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 px-2 py-0.5 rounded-full font-bold">+{group.dayTotalIncome.toLocaleString('tr-TR')} ₺</span>}
                                            {group.dayTotalExpense > 0 && <span className="text-[11px] bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400 px-2 py-0.5 rounded-full font-bold">-{group.dayTotalExpense.toLocaleString('tr-TR')} ₺</span>}
                                        </div>
                                    </div>
                                    
                                    <div className="bg-white dark:bg-slate-900 rounded-[24px] shadow-sm border border-slate-100 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800/50">
                                        {group.transactions.map((tx) => {
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
                                                <div 
                                                    key={tx.id} 
                                                    className="flex items-center justify-between p-4 active:bg-slate-50 dark:active:bg-white/5 transition-colors cursor-pointer first:rounded-t-[24px] last:rounded-b-[24px]"
                                                    onClick={() => openTransactionForm(tx)}
                                                >
                                                    <div className="flex items-center gap-3.5 min-w-0">
                                                        <div className={cn("w-12 h-12 rounded-full flex items-center justify-center shrink-0 shadow-sm border border-black/5 dark:border-white/5", bgClass, textClass)}>
                                                           {dynamicCategory ? (
                                                               (() => {
                                                                   const dynName = String(dynamicCategory.icon || '');
                                                                   const Dyn = IconMap[dynName];
                                                                   return Dyn ? <Dyn className="w-5 h-5" /> : <CategoryIcon className="w-5 h-5" />;
                                                               })()
                                                           ) : <CategoryIcon className="w-5 h-5" />}
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p className="text-[15px] font-bold text-slate-800 dark:text-slate-200 truncate leading-tight">
                                                                {tx.category}
                                                            </p>
                                                            <p className="text-[12px] text-slate-500 font-semibold truncate mt-0.5">
                                                                {account?.name || 'Hesap Yok'}
                                                                {tx.description && <span className="font-medium"> • {tx.description}</span>}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <p className={cn("font-black text-[16px] shrink-0", tx.type === 'expense' ? 'text-slate-800 dark:text-slate-200' : 'text-emerald-500')}>
                                                        {tx.type === 'expense' ? '-' : '+'}{tx.amount.toLocaleString('tr-TR')} ₺
                                                    </p>
                                                </div>
                                            )
                                        })}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                    {mainTab === 'day' && dailyGroups.length === 0 && (
                        <div className="text-center py-20 px-4 text-slate-500">
                            <Wallet className="w-16 h-16 mx-auto mb-4 opacity-20" />
                            <p className="font-bold">İşlem Yok</p>
                            <p className="text-sm mt-1">Bu ay hiç işlem kaydetmediniz.</p>
                        </div>
                    )}

                    {/* AYLIK GÖRÜNÜM */}
                    {mainTab === 'month' && (
                        <div className="px-4 space-y-6">
                            {/* Sabit Giderler Kartı */}
                            {recurringExpenses.length > 0 && (
                                <div>
                                    <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-3">Sabit Giderler</h3>
                                    <div className="bg-white dark:bg-slate-900 rounded-[24px] shadow-sm border border-slate-100 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800/50">
                                        {recurringExpenses.map((tx) => {
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
                                                <div key={tx.id} className="flex items-center justify-between p-4 first:rounded-t-[24px] last:rounded-b-[24px]">
                                                    <div className="flex items-center gap-3.5 min-w-0">
                                                        <div className={cn("w-10 h-10 rounded-full flex items-center justify-center shrink-0", bgClass, textClass)}>
                                                            <CategoryIcon className="w-5 h-5" />
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p className="text-[14px] font-bold text-slate-800 dark:text-slate-200 truncate leading-tight">
                                                                {tx.category} {tx.description && <span className="font-medium text-slate-500">({tx.description})</span>}
                                                            </p>
                                                            <p className="text-[11px] text-slate-500 font-bold uppercase tracking-wider mt-0.5">Her Ay</p>
                                                        </div>
                                                    </div>
                                                    <p className={cn("font-black text-[15px] shrink-0 text-rose-500")}>
                                                        -{tx.amount.toLocaleString('tr-TR')} ₺
                                                    </p>
                                                </div>
                                            )
                                        })}
                                    </div>
                                </div>
                            )}

                            <div>
                                <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-3">Aylık Özet</h3>
                                <div className="bg-white dark:bg-slate-900 rounded-[24px] shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden divide-y divide-slate-100 dark:divide-slate-800/50">
                                    {monthlySummaries.map((summary) => (
                                        <Accordion type="single" collapsible key={summary.monthKey} className="w-full">
                                            <AccordionItem value={summary.monthKey} className="border-0">
                                                <AccordionTrigger className="px-5 py-4 hover:no-underline active:bg-slate-50 dark:active:bg-white/5">
                                                    <div className="flex items-center justify-between w-full">
                                                        <span className="text-[15px] font-bold capitalize text-slate-800 dark:text-slate-200">{summary.month}</span>
                                                        <div className="text-right pr-2">
                                                            <p className={cn("font-black text-[15px]", summary.total >= 0 ? "text-emerald-500" : "text-rose-500")}>
                                                                {summary.total >= 0 ? '+' : ''}{summary.total.toLocaleString('tr-TR')} ₺
                                                            </p>
                                                        </div>
                                                    </div>
                                                </AccordionTrigger>
                                                <AccordionContent className="px-5 pb-5">
                                                    <div className="flex gap-3">
                                                        <div className="flex-1 bg-emerald-50 dark:bg-emerald-900/10 rounded-2xl p-4 text-center border border-emerald-100 dark:border-emerald-800/30">
                                                            <p className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider mb-1">Gelir</p>
                                                            <p className="font-black text-emerald-600 text-lg">{summary.income.toLocaleString()} ₺</p>
                                                        </div>
                                                        <div className="flex-1 bg-rose-50 dark:bg-rose-900/10 rounded-2xl p-4 text-center border border-rose-100 dark:border-rose-800/30">
                                                            <p className="text-[11px] font-bold text-rose-600 uppercase tracking-wider mb-1">Gider</p>
                                                            <p className="font-black text-rose-600 text-lg">{summary.expense.toLocaleString()} ₺</p>
                                                        </div>
                                                    </div>
                                                </AccordionContent>
                                            </AccordionItem>
                                        </Accordion>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* HESAPLAR GÖRÜNÜMÜ - Yatay Kartlar */}
                    {mainTab === 'accounts' && (
                        <div className="space-y-8 pl-4">
                            {/* Varlıklar */}
                            <div>
                                <div className="flex justify-between items-center pr-4 mb-3">
                                    <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">Varlıklar</h3>
                                    <button onClick={() => openAccountForm(null, 'bank')} className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center hover:bg-emerald-200 transition-colors">
                                        <Plus className="w-5 h-5"/>
                                    </button>
                                </div>
                                <div className="flex flex-col gap-4 pb-4 pr-4">
                                    {accountStats.assets.map((account) => {
                                        const Icon = accountIcons[account.type] || Wallet;
                                        return (
                                            <div key={account.id} onClick={() => openAccountForm(account)} className="w-full rounded-2xl sm:rounded-[32px] p-4 sm:p-6 text-white bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg relative overflow-hidden cursor-pointer active:scale-95 transition-transform border border-white/20">
                                                <div className="absolute -top-4 -right-4 sm:-top-6 sm:-right-6 p-4 opacity-10">
                                                    <Icon className="w-24 h-24 sm:w-32 sm:h-32" />
                                                </div>
                                                <div className="relative z-10 flex items-center justify-between sm:block">
                                                    <div>
                                                        <div className="flex items-center gap-3 sm:block">
                                                            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white/20 flex items-center justify-center sm:mb-6 backdrop-blur-md shadow-sm">
                                                                <Icon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                                                            </div>
                                                            <div className="sm:mt-0">
                                                                <p className="text-emerald-100 text-[10px] sm:text-[11px] font-bold uppercase tracking-widest mb-0.5 sm:mb-1">{account.type === 'bank' ? 'Banka Hesabı' : 'Nakit'}</p>
                                                                <p className="text-base sm:text-lg font-bold mb-0 sm:mb-1 truncate">{account.name}</p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <p className="text-2xl sm:text-3xl font-black sm:mt-2 tracking-tight text-right sm:text-left">{account.balance.toLocaleString()} ₺</p>
                                                </div>
                                            </div>
                                        )
                                    })}
                                    {accountStats.assets.length === 0 && (
                                        <div className="w-full rounded-2xl sm:rounded-[32px] p-4 sm:p-6 border-2 border-dashed border-slate-300 dark:border-slate-700 flex flex-col items-center justify-center text-slate-500 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800" onClick={() => openAccountForm(null, 'bank')}>
                                            <Plus className="w-6 h-6 sm:w-8 sm:h-8 mb-2 opacity-50" />
                                            <p className="font-bold text-sm sm:text-base">Hesap Ekle</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Borçlar */}
                            <div>
                                <div className="flex justify-between items-center pr-4 mb-3">
                                    <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">Borçlar & Kartlar</h3>
                                    <button onClick={() => openAccountForm(null, 'credit-card')} className="w-8 h-8 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center hover:bg-rose-200 transition-colors">
                                        <Plus className="w-5 h-5"/>
                                    </button>
                                </div>
                                <div className="flex flex-col gap-4 pb-4 pr-4">
                                    {accountStats.debts.map((account) => {
                                        const Icon = accountIcons[account.type] || Wallet;
                                        return (
                                            <div key={account.id} onClick={() => openAccountForm(account)} className="w-full rounded-2xl sm:rounded-[32px] p-4 sm:p-6 text-white bg-gradient-to-br from-rose-500 to-pink-600 shadow-lg relative overflow-hidden cursor-pointer active:scale-95 transition-transform border border-white/20">
                                                <div className="absolute -top-4 -right-4 sm:-top-6 sm:-right-6 p-4 opacity-10">
                                                    <Icon className="w-24 h-24 sm:w-32 sm:h-32" />
                                                </div>
                                                <div className="relative z-10 flex items-center justify-between sm:block">
                                                    <div>
                                                        <div className="flex items-center gap-3 sm:block">
                                                            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white/20 flex items-center justify-center sm:mb-6 backdrop-blur-md shadow-sm">
                                                                <Icon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                                                            </div>
                                                            <div className="sm:mt-0">
                                                                <p className="text-rose-100 text-[10px] sm:text-[11px] font-bold uppercase tracking-widest mb-0.5 sm:mb-1">{account.type === 'credit-card' ? 'Kredi Kartı' : 'Borç'}</p>
                                                                <p className="text-base sm:text-lg font-bold mb-0 sm:mb-1 truncate">{account.name}</p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <p className="text-2xl sm:text-3xl font-black sm:mt-2 tracking-tight text-right sm:text-left">{account.balance.toLocaleString()} ₺</p>
                                                </div>
                                            </div>
                                        )
                                    })}
                                    {accountStats.debts.length === 0 && (
                                        <div className="w-full rounded-2xl sm:rounded-[32px] p-4 sm:p-6 border-2 border-dashed border-slate-300 dark:border-slate-700 flex flex-col items-center justify-center text-slate-500 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800" onClick={() => openAccountForm(null, 'credit-card')}>
                                            <Plus className="w-6 h-6 sm:w-8 sm:h-8 mb-2 opacity-50" />
                                            <p className="font-bold text-sm sm:text-base">Kart/Borç Ekle</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* FATURALAR GÖRÜNÜMÜ - Kart Grid */}
                    {mainTab === 'bills' && (
                        <div className="px-4 space-y-8">
                            {/* Bekleyenler */}
                            <div>
                                <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-4">Ödenmeyi Bekleyenler</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    {bills.filter(b => !b.isPaid).sort((a,b) => a.dueDate.localeCompare(b.dueDate)).map(bill => {
                                        const isOverdue = new Date(bill.dueDate) < new Date();
                                        return (
                                            <div key={bill.id} className="bg-white dark:bg-slate-900 p-5 rounded-[28px] shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col justify-between relative overflow-hidden group">
                                                {isOverdue && <div className="absolute top-0 right-0 w-full h-1 bg-rose-500" />}
                                                <div className="mb-4" onClick={() => openBillForm(bill)}>
                                                    <div className={cn("w-12 h-12 rounded-full flex items-center justify-center mb-3 shadow-sm", isOverdue ? "bg-rose-100 text-rose-600" : "bg-orange-100 text-orange-500")}>
                                                        <FileText className="w-6 h-6" />
                                                    </div>
                                                    <p className="font-bold text-slate-800 dark:text-slate-200 text-[15px] leading-tight mb-1">{bill.title}</p>
                                                    <p className={cn("text-[11px] font-bold uppercase tracking-wider", isOverdue ? "text-rose-500" : "text-slate-400")}>
                                                        Son: {format(parseISO(bill.dueDate), 'd MMM', {locale: tr})}
                                                    </p>
                                                </div>
                                                <div className="flex items-end justify-between mt-auto">
                                                    <p className="font-black text-xl text-slate-900 dark:text-white tracking-tight">{bill.amount.toLocaleString()} ₺</p>
                                                    <button onClick={() => setPayingBill(bill)} className="w-10 h-10 rounded-full bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 flex items-center justify-center hover:bg-indigo-600 hover:text-white transition-colors active:scale-95 shadow-sm">
                                                        <Check className="w-5 h-5" />
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                                {bills.filter(b => !b.isPaid).length === 0 && (
                                    <div className="text-center py-10 bg-emerald-50 dark:bg-emerald-900/10 rounded-[28px] border border-emerald-100 dark:border-emerald-800/30">
                                        <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-800/50 text-emerald-500 flex items-center justify-center mx-auto mb-3">
                                            <Check className="w-8 h-8" />
                                        </div>
                                        <p className="font-bold text-emerald-700 dark:text-emerald-400">Bekleyen fatura yok!</p>
                                        <p className="text-xs text-emerald-600/70 mt-1">Her şey yolunda.</p>
                                    </div>
                                )}
                            </div>
                            
                            {/* Ödenmiş Faturalar */}
                            <div>
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">Ödenmiş Faturalar</h3>
                                    <button onClick={() => setIsBillArchiveOpen(true)} className="text-indigo-600 text-xs font-bold uppercase tracking-wider bg-indigo-50 px-3 py-1.5 rounded-full hover:bg-indigo-100 transition-colors">
                                        Arşivi Gör
                                    </button>
                                </div>
                                <div className="space-y-4">
                                    {Object.entries(
                                        bills.filter(b => b.isPaid)
                                            .sort((a,b) => (b.paidDate || "").localeCompare(a.paidDate || ""))
                                            .reverse()
                                            .slice(0, 5)
                                            .reduce((groups, bill) => {
                                                const month = bill.paidDate ? format(parseISO(bill.paidDate), 'MMMM yyyy', {locale: tr}) : 'Bilinmeyen Tarih';
                                                if (!groups[month]) groups[month] = [];
                                                groups[month].push(bill);
                                                return groups;
                                            }, {} as Record<string, typeof bills>)
                                    ).map(([month, monthBills]) => (
                                        <div key={month}>
                                            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 ml-4">{month}</h4>
                                            <div className="bg-white dark:bg-slate-900 rounded-[24px] shadow-sm border border-slate-100 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800/50">
                                                {monthBills.map(bill => (
                                                    <div key={bill.id} className="flex items-center justify-between p-4 opacity-70 hover:opacity-100 transition-opacity cursor-pointer first:rounded-t-[24px] last:rounded-b-[24px]" onClick={() => openBillForm(bill)}>
                                                        <div className="flex items-center gap-4">
                                                            <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 flex items-center justify-center">
                                                                <FileText className="w-5 h-5" />
                                                            </div>
                                                            <div>
                                                                <p className="text-[14px] font-bold text-slate-800 dark:text-slate-200 line-through decoration-slate-400">{bill.title}</p>
                                                                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">Ödendi: {bill.paidDate ? format(parseISO(bill.paidDate), 'd MMM', {locale: tr}) : '-'}</p>
                                                            </div>
                                                        </div>
                                                        <p className="font-bold text-[15px] text-slate-500">{bill.amount.toLocaleString()} ₺</p>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* YENİ İŞLEM EKLE BUTONU (FAB - FinPlan Tarzı Büyük ve Belirgin) */}
            <div className="fixed bottom-24 right-6 z-40 print:hidden">
                <Button 
                    className="h-16 w-16 rounded-full shadow-[0_10px_30px_rgb(79,70,229,0.5)] bg-indigo-600 hover:bg-indigo-700 hover:-translate-y-1 active:scale-95 transition-all duration-300 p-0 flex items-center justify-center group"
                    onClick={() => {
                        if (mainTab === 'accounts') openAccountForm(null, 'bank');
                        else if (mainTab === 'bills') openBillForm(null);
                        else openTransactionForm(null);
                    }}
                >
                    <Plus className="h-8 w-8 text-white group-hover:rotate-90 transition-transform duration-300" />
                </Button>
            </div>

            {/* --- Dialoglar (Modallar) --- */}
            <Dialog open={isAccountFormOpen} onOpenChange={(open) => { if (!open) setEditingAccount(null); setIsAccountFormOpen(open); }}>
                <DialogContent className="sm:max-w-md rounded-[32px] bg-white dark:bg-[#1C1C1E] border border-white/20 dark:border-white/10 shadow-2xl p-0 overflow-hidden text-[#1C1C1E] dark:text-white">
                    <DialogTitle className="sr-only">Hesap Formu</DialogTitle>
                    <div className="p-6">
                        <NewAccountForm 
                            familyMembers={familyMembers} 
                            onSubmit={handleAccountSubmit} 
                            initialData={editingAccount} 
                            initialType={initialAccountType}
                        />
                        {editingAccount && (
                             <Button variant="destructive" className="w-full mt-4 rounded-2xl h-12 font-bold" onClick={() => {handleDeleteAccount(editingAccount.id); setIsAccountFormOpen(false);}}>
                                Hesabı Sil
                             </Button>
                        )}
                    </div>
                </DialogContent>
            </Dialog>
            
            <Dialog open={isTransactionFormOpen} onOpenChange={(open) => { if (!open) setEditingTransaction(null); setIsTransactionFormOpen(open); }}>
                <DialogContent className="w-[96vw] max-w-md max-h-[92dvh] h-auto rounded-[32px] bg-white dark:bg-slate-950 border border-white/20 dark:border-white/10 shadow-2xl p-0 flex flex-col overflow-hidden focus:outline-none">
                    <DialogTitle className="sr-only">İşlem Formu</DialogTitle>
                    <div className="flex-1 overflow-hidden flex flex-col h-full w-full">
                        <NewTransactionForm 
                            accounts={accounts} 
                            familyMembers={familyMembers} 
                            onSubmit={handleTransactionSubmit} 
                            initialData={editingTransaction} 
                            transactionTemplates={transactionTemplates}
                            onSaveTemplate={async (data) => {
                                try {
                                    await addTransactionTemplate(data);
                                } catch (error) {
                                    console.error("Error saving template:", error);
                                }
                            }}
                            onAddNewAccount={() => { setIsTransactionFormOpen(false); setIsAccountFormOpen(true); }} 
                        />
                        {editingTransaction && (
                             <div className="px-4 pb-4">
                                <Button variant="destructive" className="w-full rounded-2xl h-12 font-bold" onClick={() => {handleDeleteTransaction(editingTransaction.id); setIsTransactionFormOpen(false);}}>
                                    İşlemi Sil
                                </Button>
                             </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>

            <Dialog open={isBillFormOpen} onOpenChange={(open) => { if (!open) setEditingBill(null); setIsBillFormOpen(open); }}>
                <DialogContent className="sm:max-w-md rounded-[32px] bg-white dark:bg-[#1C1C1E] border border-white/20 dark:border-white/10 shadow-2xl p-0 overflow-hidden text-[#1C1C1E] dark:text-white">
                    <DialogTitle className="sr-only">Fatura Formu</DialogTitle>
                    <div className="p-6">
                        <NewBillForm onSubmit={handleBillSubmit} initialData={editingBill} />
                        {editingBill && (
                             <Button variant="destructive" className="w-full mt-4 rounded-2xl h-12 font-bold" onClick={() => {handleDeleteBill(editingBill.id); setIsBillFormOpen(false);}}>
                                Faturayı Sil
                             </Button>
                        )}
                    </div>
                </DialogContent>
            </Dialog>

            {/* PAY BILL MODAL */}
            <Dialog open={!!payingBill} onOpenChange={(open) => { if (!open) setPayingBill(null); }}>
                <DialogContent className="sm:max-w-md rounded-[32px] bg-white dark:bg-[#1C1C1E] border border-white/20 shadow-2xl p-6 text-[#1C1C1E] dark:text-white">
                    <div className="space-y-4">
                        <DialogTitle className="text-xl font-bold text-center">Faturayı Öde</DialogTitle>
                        <div className="text-center p-6 bg-slate-50 dark:bg-white/5 rounded-[24px]">
                            <p className="text-sm font-bold text-slate-500">{payingBill?.title}</p>
                            <p className="text-4xl font-black text-rose-600 mt-2">{payingBill?.amount.toLocaleString()} ₺</p>
                        </div>
                        <div className="space-y-3 mt-6">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Hangi hesaptan ödenecek?</label>
                            <div className="grid grid-cols-2 gap-3">
                                {accounts.map(acc => {
                                    const Icon = accountIcons[acc.type] || Banknote;
                                    const isSelected = paymentAccountId === acc.id;
                                    return (
                                        <div key={acc.id} onClick={() => setPaymentAccountId(acc.id)} className={cn("relative cursor-pointer flex items-center gap-3 p-4 rounded-[20px] border-2 transition-all", isSelected ? "bg-indigo-50 border-indigo-500 text-indigo-700 shadow-md" : "bg-white border-slate-100 text-slate-700 hover:border-indigo-300 hover:bg-indigo-50/50")}>
                                            <Icon className="h-5 w-5 shrink-0"/>
                                            <span className="text-sm font-bold truncate">{acc.name}</span>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                        <Button 
                            className="w-full h-14 bg-indigo-600 hover:bg-indigo-700 text-white rounded-[20px] mt-6 text-lg font-bold shadow-md"
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
                <DialogContent className="sm:max-w-xl rounded-[32px] bg-white dark:bg-[#1C1C1E] border border-white/20 shadow-2xl p-6 text-[#1C1C1E] dark:text-white max-h-[85vh] overflow-y-auto w-[95%]">
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
                                        formatter={(value) => [`${value.toLocaleString()} ₺`, billArchiveFilter]}
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
                        <div className="space-y-6">
                            {Object.entries(
                                bills.filter(b => b.isPaid && (billArchiveFilter === 'Tümü' || b.title === billArchiveFilter))
                                    .sort((a,b) => (b.paidDate || "").localeCompare(a.paidDate || ""))
                                    .reverse()
                                    .reduce((groups, bill) => {
                                        const month = bill.paidDate ? format(parseISO(bill.paidDate), 'MMMM yyyy', {locale: tr}) : 'Bilinmeyen Tarih';
                                        if (!groups[month]) groups[month] = [];
                                        groups[month].push(bill);
                                        return groups;
                                    }, {} as Record<string, typeof bills>)
                            ).map(([month, monthBills]) => (
                                <div key={month}>
                                    <h5 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 ml-2">{month}</h5>
                                    <div className="space-y-2">
                                        {monthBills.map(bill => (
                                            <div key={bill.id} className="flex justify-between items-center p-4 bg-slate-50 dark:bg-white/5 rounded-[20px] border border-slate-100 dark:border-white/5">
                                                <div>
                                                    <p className="font-bold text-[15px]">{bill.title}</p>
                                                    <p className="text-[12px] font-medium text-slate-500">{bill.paidDate ? format(parseISO(bill.paidDate), 'd MMMM yyyy', {locale: tr}) : '-'}</p>
                                                </div>
                                                <p className="font-black text-lg text-slate-700 dark:text-slate-200">{bill.amount.toLocaleString()} ₺</p>
                                            </div>
                                        ))}
                                    </div>
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
