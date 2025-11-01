
"use client";

import * as React from "react";
import { Plus, Wallet, TrendingUp, TrendingDown, MoreHorizontal, ChevronLeft, ChevronRight, Edit, Trash2, Banknote, Landmark, CreditCard, BarChart2, PieChart, User, FileOutput, GripVertical, Settings } from "lucide-react";

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
        
        const unsubTransactions = onTransactionsUpdate(setAllTransactions, startOfYear(currentDate), endOfYear(currentDate));
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

    const { yearlyIncome, yearlyExpense, monthlySummaries, accountStats, dailyGroups } = React.useMemo(() => {
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
            }
        });
        
        const assets = accounts.filter(a => a.type === 'cash' || a.type === 'bank');
        const debts = accounts.filter(a => a.type === 'credit-card');
        const totalAssets = assets.reduce((sum, acc) => sum + acc.balance, 0);
        const totalDebts = debts.reduce((sum, acc) => sum + acc.balance, 0);
        
        const accStats = {
          assets,
          debts,
          totalAssets,
          totalDebts,
          netWorth: totalAssets - totalDebts
        };


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
            accountStats: accStats,
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
    
    const openAccountForm = (account: Account | null) => {
        setEditingAccount(account);
        setIsAccountFormOpen(true);
    }

    return (
        <div className="bg-background text-foreground min-h-screen flex flex-col">
            <header className="p-4 space-y-4">
                 <div className="flex items-center justify-center gap-4 text-xl">
                    <Button variant="ghost" size="icon" onClick={() => handleNavDate('prev')}>
                        <ChevronLeft className="h-6 w-6" />
                    </Button>
                    <h2 className="text-lg font-semibold w-48 text-center capitalize">
                        {format(currentDate, dateDisplayFormat, { locale: tr })}
                    </h2>
                    <Button variant="ghost" size="icon" onClick={() => handleNavDate('next')}>
                        <ChevronRight className="h-6 w-6" />
                    </Button>
                </div>
                 <Tabs value={mainTab} onValueChange={setMainTab} className="w-full">
                    <TabsList className="grid w-full grid-cols-3 bg-muted">
                        <TabsTrigger value="day">Gün</TabsTrigger>
                        <TabsTrigger value="month">Ay</TabsTrigger>
                        <TabsTrigger value="accounts">Hesaplar</TabsTrigger>
                    </TabsList>
                 </Tabs>
                <div className="grid grid-cols-3 text-center">
                    <div>
                        <p className="text-xs text-muted-foreground">Gelir</p>
                        <p className="font-semibold text-sm text-primary">{yearlyIncome.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}</p>
                    </div>
                     <div>
                        <p className="text-xs text-muted-foreground">Gider</p>
                        <p className="font-semibold text-sm text-destructive">{yearlyExpense.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}</p>
                    </div>
                     <div>
                        <p className="text-xs text-muted-foreground">Toplam</p>
                        <p className="font-semibold text-sm">{ (yearlyIncome - yearlyExpense).toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}</p>
                    </div>
                </div>
            </header>
            
             <main className="flex-grow overflow-y-auto px-2 space-y-2 pb-24">
                {mainTab === 'day' && dailyGroups.map(group => (
                    <div key={group.dateISO}>
                        <div className="flex justify-between items-center p-2 bg-muted/50 rounded-t-lg">
                           <div className="font-medium text-xs capitalize">{group.date}</div>
                           <div className="flex gap-4 items-center text-xs">
                                <span className="text-primary">{group.dayTotalIncome > 0 ? group.dayTotalIncome.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' }) : ''}</span>
                                <span className="text-destructive">{group.dayTotalExpense > 0 ? group.dayTotalExpense.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' }) : ''}</span>
                           </div>
                        </div>
                        <div className="space-y-px">
                            {group.transactions.map(tx => {
                                const account = accounts.find(a => a.id === tx.accountId);
                                return (
                                <div key={tx.id} className="flex justify-between items-center p-3 bg-card first:rounded-t-none last:rounded-b-lg">
                                    <div className="flex items-center gap-3">
                                        {account && React.createElement(accountIcons[account.type] || Wallet, { className: "h-5 w-5 text-muted-foreground" })}
                                        <div>
                                            <p className="text-xs">{tx.category}</p>
                                            <p className="text-xs text-muted-foreground">{account?.name || ''}</p>
                                        </div>
                                    </div>
                                    <p className={cn("font-semibold text-xs", tx.type === 'expense' ? 'text-destructive' : 'text-primary')}>
                                        {tx.type === 'expense' ? '-' : '+'}
                                        {tx.amount.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
                                    </p>
                                </div>
                            )})}
                        </div>
                    </div>
                ))}
                {mainTab === 'month' && monthlySummaries.map(summary => (
                     <div key={summary.monthKey} className="flex items-center justify-between p-4 bg-card rounded-lg">
                        <div className="font-bold text-sm capitalize">{summary.month}</div>
                        <div className="flex items-center gap-6 text-xs">
                            <span className="text-primary">{summary.income.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}</span>
                            <div className="text-right">
                                <p className="text-destructive font-semibold text-sm">
                                  {summary.expense > 0 ? '-' : ''}
                                  {summary.expense.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
                                </p>
                                <p className={cn("text-xs", summary.total >= 0 ? "text-muted-foreground" : "text-destructive")}>
                                    Toplam: {summary.total.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
                                </p>
                            </div>
                        </div>
                    </div>
                ))}
                 {mainTab === 'accounts' && (
                     <div className="space-y-4 p-2 text-foreground">
                        <Card>
                            <CardHeader>
                                <CardTitle>Hesap Özeti</CardTitle>
                            </CardHeader>
                            <CardContent className="grid grid-cols-3 gap-2 text-center text-xs">
                                <div><p className="text-muted-foreground">Varlıklar</p><p className="font-semibold">{accountStats.totalAssets.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}</p></div>
                                <div><p className="text-muted-foreground">Borçlar</p><p className="font-semibold text-destructive">{accountStats.totalDebts.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}</p></div>
                                <div><p className="text-muted-foreground">Net Değer</p><p className="font-semibold">{accountStats.netWorth.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}</p></div>
                            </CardContent>
                        </Card>
                        
                         <Card>
                            <CardHeader className="flex flex-row items-center justify-between pb-2">
                                <CardTitle className="text-base">Varlıklar ({accountStats.assets.length})</CardTitle>
                                <p className="font-bold">{accountStats.totalAssets.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}</p>
                            </CardHeader>
                            <CardContent className="space-y-px">
                                {accountStats.assets.map(account => (
                                    <AccountRow key={account.id} account={account} onEdit={() => openAccountForm(account)} onDelete={() => handleDeleteAccount(account.id)} />
                                ))}
                            </CardContent>
                        </Card>
                        
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between pb-2">
                                <CardTitle className="text-base">Borçlar ({accountStats.debts.length})</CardTitle>
                                <p className="font-bold text-destructive">{accountStats.totalDebts.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}</p>
                            </CardHeader>
                            <CardContent className="space-y-px">
                                {accountStats.debts.map(account => (
                                    <AccountRow key={account.id} account={account} onEdit={() => openAccountForm(account)} onDelete={() => handleDeleteAccount(account.id)} />
                                ))}
                            </CardContent>
                        </Card>

                         <Button variant="outline" className="w-full text-sm" onClick={() => openAccountForm(null)}>
                            <Plus className="h-4 w-4 mr-2" /> Yeni Hesap Ekle
                         </Button>
                         <Button variant="outline" className="w-full text-sm">
                            <Settings className="h-4 w-4 mr-2" /> Bütçe Ayarları
                         </Button>
                     </div>
                 )}
            </main>

            
            <div className="fixed bottom-20 right-6 z-20">
                <Button 
                    className="rounded-full w-16 h-16 bg-primary hover:bg-primary/90 shadow-lg"
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

function AccountRow({ account, onEdit, onDelete }: { account: Account, onEdit: () => void, onDelete: () => void }) {
    const Icon = accountIcons[account.type] || Wallet;
    return (
        <div className="flex justify-between items-center p-3 bg-muted/30 first:rounded-t-lg last:rounded-b-lg">
            <div className="flex items-center gap-3">
                <Icon className="h-5 w-5 text-muted-foreground" />
                <p className="text-sm font-medium">{account.name}</p>
            </div>
            <div className="flex items-center gap-2">
                <p className={cn("font-semibold text-sm", account.type === 'credit-card' && 'text-destructive')}>{account.balance.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}</p>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4"/></Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                        <DropdownMenuItem onSelect={onEdit}><Edit className="mr-2 h-4 w-4"/> Düzenle</DropdownMenuItem>
                         <AlertDialog>
                            <AlertDialogTrigger asChild><DropdownMenuItem onSelect={e => e.preventDefault()} className="text-destructive focus:text-destructive"><Trash2 className="mr-2 h-4 w-4"/>Sil</DropdownMenuItem></AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>Hesabı Sil</AlertDialogTitle>
                                    <AlertDialogDescription>"{account.name}" hesabını kalıcı olarak silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.</AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>İptal</AlertDialogCancel>
                                    <AlertDialogAction onClick={onDelete}>Evet, Sil</AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </div>
    );
}
    
