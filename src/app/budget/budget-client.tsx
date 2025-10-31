
"use client";

import * as React from "react";
import { Plus, Wallet, TrendingUp, TrendingDown, MoreHorizontal, ChevronLeft, ChevronRight, Edit, Trash2, Banknote, Landmark, CreditCard, BarChart2, PieChart, User, FileOutput } from "lucide-react";
import { BarChart, Bar, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Pie } from "recharts";

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
import { onAccountsUpdate, deleteAccount, addAccount, updateAccount, addTransaction, updateTransaction, deleteTransaction, onTransactionStatsUpdate, onTransactionsUpdate } from "@/lib/dataService";
import type { Account, Transaction, FamilyMember } from "@/lib/data";
import { useToast } from "@/hooks/use-toast";
import { format, startOfMonth, endOfMonth, addMonths, subMonths, getYear, setYear, eachMonthOfInterval, startOfYear, endOfYear, subYears, parseISO, addYears } from "date-fns";
import { tr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { ChartConfig, ChartContainer, ChartTooltipContent } from "@/components/ui/chart";

const accountIcons: { [key: string]: React.ElementType } = {
    'cash': Banknote,
    'bank': Landmark,
    'credit-card': CreditCard,
};

const chartConfig = {
  gelir: { label: "Gelir", color: "hsl(var(--chart-2))" },
  gider: { label: "Gider", color: "hsl(var(--chart-5))" },
  bakiye: { label: "Bakiye", color: "hsl(var(--chart-1))" },
} satisfies ChartConfig;

type MonthlySummary = {
    month: string;
    monthKey: string; // YYYY-MM
    income: number;
    expense: number;
    total: number;
};

type DailyGroup = {
    date: string;
    dateISO: string;
    dayTotalIncome: number;
    dayTotalExpense: number;
    transactions: Transaction[];
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
        
        const startDate = startOfYear(currentDate);
        const endDate = endOfYear(currentDate);
        
        const unsubTransactions = onTransactionsUpdate(setAllTransactions, startDate, endDate);
        const unsubAccounts = onAccountsUpdate(setAccounts);

        return () => {
            unsubTransactions();
            unsubAccounts();
        };
    }, [familyId, currentDate]);
    
    const handleNavDate = (direction: 'prev' | 'next') => {
        if (mainTab === 'month') {
            setCurrentDate(prev => direction === 'prev' ? subYears(prev, 1) : addYears(prev, 1));
        } else {
            setCurrentDate(prev => direction === 'prev' ? subMonths(prev, 1) : addMonths(prev, 1));
        }
    };
    
    const dateDisplayFormat = mainTab === 'month' ? 'yyyy' : 'MMMM yyyy';

    const { yearlyIncome, yearlyExpense, monthlySummaries, totalViewStats, dailyGroups } = React.useMemo(() => {
        let income = 0;
        let expense = 0;
        const monthSummaries: {[key: string]: {income: number, expense: number, total: number}} = {};

        const yearInterval = eachMonthOfInterval({
          start: startOfYear(currentDate),
          end: endOfYear(currentDate),
        });
        
        yearInterval.forEach(monthStart => {
          const monthKey = format(monthStart, 'yyyy-MM');
          monthSummaries[monthKey] = { income: 0, expense: 0, total: 0 };
        })

        let cashBankExpense = 0;
        let creditCardExpense = 0;
        
        const daily: { [key: string]: DailyGroup } = {};

        const filteredTransactionsForMonth = allTransactions.filter(t => {
            const transactionMonth = t.date.substring(0, 7);
            const currentMonth = format(currentDate, 'yyyy-MM');
            return transactionMonth === currentMonth;
        });

        allTransactions.forEach(t => {
            const monthKey = t.date.substring(0, 7);
            if (t.type === 'income') {
                income += t.amount;
                if(monthSummaries[monthKey]) monthSummaries[monthKey].income += t.amount;
            } else {
                expense += t.amount;
                if(monthSummaries[monthKey]) monthSummaries[monthKey].expense += t.amount;
                
                 const account = accounts.find(acc => acc.id === t.accountId);
                if (account) {
                    if (account.type === 'credit-card') {
                        creditCardExpense += t.amount;
                    } else {
                        cashBankExpense += t.amount;
                    }
                }
            }
        });

        filteredTransactionsForMonth.forEach(t => {
            if (!daily[t.date]) {
                daily[t.date] = {
                    date: format(parseISO(t.date), 'd EEE dd.MM.yyyy', {locale: tr}),
                    dateISO: t.date,
                    dayTotalIncome: 0,
                    dayTotalExpense: 0,
                    transactions: [],
                };
            }
            if (t.type === 'income') {
                daily[t.date].dayTotalIncome += t.amount;
            } else {
                daily[t.date].dayTotalExpense += t.amount;
            }
            daily[t.date].transactions.push(t);
        });
        
        const finalSummaries: MonthlySummary[] = Object.entries(monthSummaries)
            .map(([monthKey, values]) => ({
                monthKey,
                month: format(new Date(monthKey + '-02'), 'MMMM', { locale: tr }),
                ...values,
                total: values.income - values.expense
            }))
            .sort((a,b) => a.monthKey.localeCompare(b.monthKey));

        const finalDailyGroups = Object.values(daily).sort((a,b) => b.dateISO.localeCompare(a.dateISO));
        
        const monthStats = finalSummaries.find(s => s.monthKey === format(currentDate, 'yyyy-MM')) || { income: 0, expense: 0, total: 0 };

        return { 
            yearlyIncome: income, 
            yearlyExpense: expense, 
            monthlyIncome: monthStats.income,
            monthlyExpense: monthStats.expense,
            monthlySummaries: finalSummaries,
            totalViewStats: { cashBankExpense, creditCardExpense },
            dailyGroups: finalDailyGroups,
        };
    }, [allTransactions, currentDate, accounts]);


    const handleAccountSubmit = async (data: Omit<Account, 'id' | 'familyId' | 'balance'>) => {
        try {
            if (editingAccount) {
                await updateAccount(editingAccount.id, data);
                toast({ title: "Hesap güncellendi" });
            } else {
                await addAccount(data);
                toast({ title: "Yeni hesap eklendi" });
            }
            setIsAccountFormOpen(false);
            setEditingAccount(null);
        } catch (error) {
            console.error(error);
            toast({ variant: "destructive", title: "Bir hata oluştu" });
        }
    };

    const handleTransactionSubmit = async (data: any) => {
        try {
            if (editingTransaction) {
                await updateTransaction(editingTransaction.id, data);
                 toast({ title: "İşlem güncellendi" });
            } else {
                await addTransaction(data);
                toast({ title: "Yeni işlem eklendi" });
            }
            setIsTransactionFormOpen(false);
            setEditingTransaction(null);
        } catch (error) {
             console.error(error);
            toast({ variant: "destructive", title: "Bir hata oluştu" });
        }
    }
    
    const handleDeleteAccount = async (id: string) => {
        try {
            await deleteAccount(id);
            toast({ title: "Hesap Silindi", variant: 'destructive'});
        } catch (error) {
            console.error(error);
            toast({ variant: "destructive", title: "Bir hata oluştu" });
        }
    }

    return (
        <div className="bg-gray-800 text-white min-h-screen flex flex-col">
            <header className="p-4 space-y-4">
                 <div className="flex items-center justify-center gap-4 text-xl">
                    <Button variant="ghost" size="icon" onClick={() => handleNavDate('prev')}>
                        <ChevronLeft className="h-6 w-6" />
                    </Button>
                    <h2 className="text-2xl font-semibold w-48 text-center capitalize">
                        {format(currentDate, dateDisplayFormat, { locale: tr })}
                    </h2>
                    <Button variant="ghost" size="icon" onClick={() => handleNavDate('next')}>
                        <ChevronRight className="h-6 w-6" />
                    </Button>
                </div>
                 <Tabs value={mainTab} onValueChange={setMainTab} className="w-full">
                    <TabsList className="grid w-full grid-cols-4 bg-gray-700/50">
                        <TabsTrigger value="day" className={cn(mainTab === 'day' && "data-[state=active]:bg-red-600")}>Gün</TabsTrigger>
                        <TabsTrigger value="month" className={cn(mainTab === 'month' && "data-[state=active]:bg-red-600")}>Ay</TabsTrigger>
                        <TabsTrigger value="total" className={cn(mainTab === 'total' && "data-[state=active]:bg-red-600")}>Toplam</TabsTrigger>
                        <TabsTrigger value="note">Not</TabsTrigger>
                    </TabsList>
                 </Tabs>
                <div className="grid grid-cols-3 text-center">
                    <div>
                        <p className="text-sm text-gray-400">Gelir</p>
                        <p className="font-semibold text-lg text-blue-400">{yearlyIncome.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}</p>
                    </div>
                     <div>
                        <p className="text-sm text-gray-400">Gider</p>
                        <p className="font-semibold text-lg text-red-400">{yearlyExpense.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}</p>
                    </div>
                     <div>
                        <p className="text-sm text-gray-400">Toplam</p>
                        <p className="font-semibold text-lg">{ (yearlyIncome - yearlyExpense).toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}</p>
                    </div>
                </div>
            </header>
            
             <main className="flex-grow overflow-y-auto px-2 space-y-2 pb-24">
                {mainTab === 'day' && dailyGroups.map(group => (
                    <div key={group.dateISO}>
                        <div className="flex justify-between items-center p-2 bg-gray-700/80 rounded-t-lg">
                           <div className="font-semibold capitalize">{group.date}</div>
                           <div className="flex gap-4 items-center">
                                <span className="text-blue-400">{group.dayTotalIncome > 0 ? group.dayTotalIncome.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' }) : ''}</span>
                                <span className="text-red-400">{group.dayTotalExpense > 0 ? group.dayTotalExpense.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' }) : ''}</span>
                           </div>
                        </div>
                        <div className="space-y-px">
                            {group.transactions.map(tx => {
                                const account = accounts.find(a => a.id === tx.accountId);
                                return (
                                <div key={tx.id} className="flex justify-between items-center p-3 bg-gray-700/40 first:rounded-t-none last:rounded-b-lg">
                                    <div className="flex items-center gap-3">
                                        {account && React.createElement(accountIcons[account.type] || Wallet, { className: "h-5 w-5 text-gray-400" })}
                                        <div>
                                            <p>{tx.category}</p>
                                            <p className="text-xs text-gray-400">{account?.name || ''}</p>
                                        </div>
                                    </div>
                                    <p className={cn("font-semibold", tx.type === 'expense' ? 'text-red-400' : 'text-blue-400')}>
                                        {tx.type === 'expense' ? '-' : '+'}
                                        {tx.amount.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
                                    </p>
                                </div>
                            )})}
                        </div>
                    </div>
                ))}
                {mainTab === 'month' && monthlySummaries.map(summary => (
                     <div key={summary.monthKey} className="flex items-center justify-between p-4 bg-gray-700/60 rounded-lg">
                        <div className="font-bold text-lg capitalize">{summary.month}</div>
                        <div className="flex items-center gap-6">
                            <span className="text-blue-400">{summary.income.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}</span>
                            <div className="text-right">
                                <p className="text-red-400 font-semibold text-lg">
                                  {summary.expense > 0 ? '-' : ''}
                                  {summary.expense.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
                                </p>
                                <p className={cn("text-xs", summary.total >= 0 ? "text-gray-400" : "text-red-400")}>
                                    Toplam: {summary.total.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
                                </p>
                            </div>
                        </div>
                    </div>
                ))}
                 {mainTab === 'total' && (
                     <div className="space-y-4 p-2 text-gray-300">
                         <div className="flex items-center justify-between p-3 bg-gray-700/60 rounded-lg">
                            <p className="font-semibold text-lg">Bütçe</p>
                             <Button variant="ghost" className="text-gray-300 hover:bg-gray-600/50">Bütçe Ayarları <ChevronRight className="h-4 w-4 ml-2"/></Button>
                        </div>
                         <div className="p-3 bg-gray-700/60 rounded-lg">
                            <div className="flex justify-between items-center mb-3">
                                <p className="font-semibold text-lg">Hesaplar</p>
                                <p className="text-sm text-gray-400">{format(startOfMonth(currentDate), 'd.MM.yyyy')} ~ {format(endOfMonth(currentDate), 'd.MM')}</p>
                            </div>
                            <div className="space-y-3 p-4 bg-gray-800/50 rounded-md">
                                <div className="flex justify-between items-center"><p>Giderleri Karşılaştır (Son ay)</p><p className="font-semibold text-lg">242%</p></div>
                                <div className="flex justify-between items-center"><p>Gider (Nakit, Banka Hesapları)</p><p className="font-semibold text-lg">{totalViewStats.cashBankExpense.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}</p></div>
                                <div className="flex justify-between items-center"><p>Gider (Kredi Kartı)</p><p className="font-semibold text-lg">{totalViewStats.creditCardExpense.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}</p></div>
                                <div className="flex justify-between items-center"><p>Havale (Nakit, Banka Hesabı →)</p><p className="font-semibold text-lg">₺ 0,00</p></div>
                            </div>
                         </div>
                         <Button variant="outline" className="w-full bg-gray-700/60 border-gray-600 hover:bg-gray-600/60">
                            <FileOutput className="h-5 w-5 mr-2" /> Excel (.xls) e-posta olarak gönder
                         </Button>
                     </div>
                 )}
            </main>

            
            <div className="fixed bottom-20 right-6 z-20">
                <Button 
                    className="rounded-full w-16 h-16 bg-red-600 hover:bg-red-700 shadow-lg"
                    onClick={() => { setEditingTransaction(null); setIsTransactionFormOpen(true); }}
                >
                    <Plus className="h-8 w-8" />
                </Button>
            </div>

            <Dialog open={isAccountFormOpen} onOpenChange={setIsAccountFormOpen}>
                <DialogContent>
                    <NewAccountForm
                        familyMembers={familyMembers}
                        onSubmit={handleAccountSubmit}
                        initialData={editingAccount}
                    />
                </DialogContent>
            </Dialog>
            
            <Dialog open={isTransactionFormOpen} onOpenChange={(open) => { if (!open) setEditingTransaction(null); setIsTransactionFormOpen(open); }}>
                <DialogContent className="p-0 border-0 h-full max-h-screen sm:h-auto sm:max-h-[90vh] sm:max-w-md">
                    <NewTransactionForm
                        accounts={accounts}
                        familyMembers={familyMembers}
                        onSubmit={handleTransactionSubmit}
                        initialData={editingTransaction}
                    />
                </DialogContent>
            </Dialog>
        </div>
    );
}
