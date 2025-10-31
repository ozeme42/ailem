
"use client";

import * as React from "react";
import { Plus, Wallet, TrendingUp, TrendingDown, MoreHorizontal, ChevronLeft, ChevronRight, Edit, Trash2, Banknote, Landmark, CreditCard, BarChart2, PieChart, User } from "lucide-react";
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
import { onAccountsUpdate, deleteAccount, onTransactionsUpdate, addAccount, updateAccount, addTransaction, updateTransaction, deleteTransaction, onTransactionStatsUpdate } from "@/lib/dataService";
import type { Account, Transaction, FamilyMember } from "@/lib/data";
import { useToast } from "@/hooks/use-toast";
import { format, startOfMonth, endOfMonth, addMonths, subMonths, getYear, setYear, eachMonthOfInterval, startOfYear, endOfYear } from "date-fns";
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

export function BudgetClient() {
    const { familyId, familyMembers } = useAuth();
    const { toast } = useToast();
    
    const [currentYear, setCurrentYear] = React.useState(new Date());
    const [accounts, setAccounts] = React.useState<Account[]>([]);
    const [allTransactions, setAllTransactions] = React.useState<Transaction[]>([]);
    
    const [isAccountFormOpen, setIsAccountFormOpen] = React.useState(false);
    const [isTransactionFormOpen, setIsTransactionFormOpen] = React.useState(false);

    const [editingAccount, setEditingAccount] = React.useState<Account | null>(null);
    const [editingTransaction, setEditingTransaction] = React.useState<Transaction | null>(null);
    const [activeTab, setActiveTab] = React.useState('transactions');

    React.useEffect(() => {
        if (!familyId) return;
        
        // Fetch all transactions for the selected year
        const unsubTransactions = onTransactionsUpdate(setAllTransactions, startOfYear(currentYear), endOfYear(currentYear));
        const unsubAccounts = onAccountsUpdate(setAccounts);

        return () => {
            unsubTransactions();
            unsubAccounts();
        };
    }, [familyId, currentYear]);

    const { yearlyIncome, yearlyExpense, monthlySummaries } = React.useMemo(() => {
        let income = 0;
        let expense = 0;
        const monthSummaries: {[key: string]: {income: number, expense: number, total: number}} = {};

        // Initialize all months of the year
        const yearInterval = eachMonthOfInterval({
          start: startOfYear(currentYear),
          end: endOfYear(currentYear),
        });
        
        yearInterval.forEach(monthStart => {
          const monthKey = format(monthStart, 'yyyy-MM');
          monthSummaries[monthKey] = { income: 0, expense: 0, total: 0 };
        })

        allTransactions.forEach(t => {
            const monthKey = t.date.substring(0, 7); // "YYYY-MM"
            if (t.type === 'income') {
                income += t.amount;
                if(monthSummaries[monthKey]) monthSummaries[monthKey].income += t.amount;
            } else {
                expense += t.amount;
                if(monthSummaries[monthKey]) monthSummaries[monthKey].expense += t.amount;
            }
        });
        
        const finalSummaries: MonthlySummary[] = Object.entries(monthSummaries)
            .map(([monthKey, values]) => ({
                monthKey,
                month: format(new Date(monthKey + '-02'), 'MMMM', { locale: tr }),
                ...values,
                total: values.income - values.expense
            }))
            .sort((a,b) => b.monthKey.localeCompare(a.monthKey)); // Sort descending

        return { yearlyIncome: income, yearlyExpense: expense, monthlySummaries: finalSummaries };
    }, [allTransactions, currentYear]);


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
                    <Button variant="ghost" size="icon" onClick={() => setCurrentYear(prev => setYear(prev, getYear(prev) - 1))}>
                        <ChevronLeft className="h-6 w-6" />
                    </Button>
                    <h2 className="text-2xl font-semibold w-24 text-center">
                        {format(currentYear, 'yyyy')}
                    </h2>
                    <Button variant="ghost" size="icon" onClick={() => setCurrentYear(prev => setYear(prev, getYear(prev) + 1))}>
                        <ChevronRight className="h-6 w-6" />
                    </Button>
                </div>
                 <Tabs defaultValue="month" className="w-full">
                    <TabsList className="grid w-full grid-cols-5 bg-gray-700/50">
                        <TabsTrigger value="day">Gün</TabsTrigger>
                        <TabsTrigger value="calendar">Takvim</TabsTrigger>
                        <TabsTrigger value="month" className="data-[state=active]:bg-red-600">Ay</TabsTrigger>
                        <TabsTrigger value="total">Toplam</TabsTrigger>
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
                {monthlySummaries.map(summary => (
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
            </main>
            
            <div className="fixed bottom-20 right-6 z-20">
                <Button 
                    className="rounded-full w-16 h-16 bg-red-600 hover:bg-red-700 shadow-lg"
                    onClick={() => { setEditingTransaction(null); setIsTransactionFormOpen(true); }}
                >
                    <Plus className="h-8 w-8" />
                </Button>
            </div>
            
            <footer className="fixed bottom-0 left-0 right-0 bg-gray-900 border-t border-gray-700 grid grid-cols-4 h-16 z-10">
                <Button variant="ghost" onClick={() => setActiveTab('transactions')} className={cn("flex-col h-full rounded-none", activeTab === 'transactions' && 'text-red-500')}>
                    <Wallet className="h-6 w-6"/>
                    <span className="text-xs">İşlemler</span>
                </Button>
                 <Button variant="ghost" onClick={() => setActiveTab('stats')} className={cn("flex-col h-full rounded-none", activeTab === 'stats' && 'text-red-500')}>
                    <BarChart2 className="h-6 w-6"/>
                    <span className="text-xs">İstatistik</span>
                </Button>
                <Button variant="ghost" onClick={() => { setIsAccountFormOpen(true) }} className={cn("flex-col h-full rounded-none", activeTab === 'accounts' && 'text-red-500')}>
                    <CreditCard className="h-6 w-6"/>
                    <span className="text-xs">Hesaplar</span>
                </Button>
                <Button variant="ghost" onClick={() => {}} className={cn("flex-col h-full rounded-none", activeTab === 'more' && 'text-red-500')}>
                    <MoreHorizontal className="h-6 w-6"/>
                    <span className="text-xs">Daha</span>
                </Button>
            </footer>

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
                <DialogContent>
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

// Dummy onTransactionsUpdate for year
function onTransactionsUpdate(
  callback: (transactions: Transaction[]) => void,
  startDate: Date,
  endDate: Date
): () => void {
  // This would be a real Firestore listener in a real app
  console.log("Fetching transactions between", startDate, "and", endDate);
  const dummyTransactions: Transaction[] = []; // Populate with dummy data if needed
  callback(dummyTransactions);
  return () => {}; // Return unsubscribe function
}

```