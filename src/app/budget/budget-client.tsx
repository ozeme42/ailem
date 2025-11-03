
"use client";

import * as React from "react";
import { Plus, Wallet, TrendingUp, TrendingDown, MoreHorizontal, ChevronLeft, ChevronRight, Edit, Trash2, Banknote, Landmark, CreditCard, BarChart2, PieChart, User, FileOutput, GripVertical, Settings, HandCoins } from "lucide-react";
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


const accountIcons: { [key: string]: React.ElementType } = {
    'cash': Banknote,
    'bank': Landmark,
    'credit-card': CreditCard,
    'other': Wallet
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

        return () => {
            unsubAccounts();
            unsubTransactions();
        };
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
        const totalIncome = allTransactions
          .filter(t => t.type === 'income')
          .reduce((sum, t) => sum + t.amount, 0);
        const totalExpense = allTransactions
          .filter(t => t.type === 'expense')
          .reduce((sum, t) => sum + t.amount, 0);

        return {
          assets: accounts.filter(a => a.type === 'cash' || a.type === 'bank'),
          debts: accounts.filter(a => a.type === 'credit-card' || a.type === 'other'),
          totalAssets: totalIncome,
          totalDebts: totalExpense,
          netWorth: totalIncome - totalExpense
        };
    }, [accounts, allTransactions]);


    const { monthlyIncome, monthlyExpense, yearlyIncome, yearlyExpense, monthlySummaries, dailyGroups } = React.useMemo(() => {
        
        const yearInterval = eachMonthOfInterval({
          start: startOfYear(currentDate),
          end: endOfYear(currentDate),
        });

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
                    if (t.type === 'income') {
                        monthSummaries[monthKey].income += t.amount;
                    } else {
                        monthSummaries[monthKey].expense += t.amount;
                    }
                    monthSummaries[monthKey].transactions.push(t);
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
        

        const finalSummaries = Object.entries(monthSummaries)
            .map(([monthKey, values]) => ({
                monthKey,
                month: format(new Date(monthKey + '-02'), 'MMMM', { locale: tr }),
                ...values,
                total: values.income - values.expense
            }))
            .sort((a,b) => a.monthKey.localeCompare(b.monthKey));

        finalSummaries.forEach(summary => {
            summary.transactions.sort((a, b) => b.date.localeCompare(a.date));
        });

        const finalDailyGroups = Object.values(daily).sort((a,b) => b.dateISO.localeCompare(a.dateISO));
        
        // Stats for the selected month to display in the header
        const currentMonthKey = format(currentDate, 'yyyy-MM');
        const monthStats = monthSummaries[currentMonthKey] || { income: 0, expense: 0 };
        
        // Yearly stats
        const yearlyIncomeTotal = Object.values(monthSummaries).reduce((s, m) => s + m.income, 0);
        const yearlyExpenseTotal = Object.values(monthSummaries).reduce((s, m) => s + m.expense, 0);


        return { 
            monthlyIncome: monthStats.income,
            monthlyExpense: monthStats.expense,
            yearlyIncome: yearlyIncomeTotal,
            yearlyExpense: yearlyExpenseTotal,
            monthlySummaries: finalSummaries,
            dailyGroups: finalDailyGroups,
        };
    }, [allTransactions, currentDate]);

    const headerIncome = mainTab === 'day' ? monthlyIncome : yearlyIncome;
    const headerExpense = mainTab === 'day' ? monthlyExpense : yearlyExpense;
    const headerTotal = headerIncome - headerExpense;


    const handleAccountSubmit = async (data: Omit<Account, 'id' | 'familyId'>) => {
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
    
    const handleDeleteTransaction = async (id: string) => {
        try {
            await deleteTransaction(id);
            toast({ title: "İşlem silindi", variant: 'destructive' });
        } catch (error) {
             console.error(error);
            toast({ variant: "destructive", title: "İşlem silinirken hata" });
        }
    }

    const openAccountForm = (account: Account | null) => {
        setEditingAccount(account);
        setIsAccountFormOpen(true);
    }
    
    const openTransactionForm = (transaction: Transaction | null) => {
        setEditingTransaction(transaction);
        setIsTransactionFormOpen(true);
    }

    return (
        <div className="bg-background text-foreground min-h-screen flex flex-col">
            <header className="p-4 space-y-4 bg-gradient-to-br from-primary to-accent text-primary-foreground rounded-b-xl shadow-lg -mx-4 -mt-4 sm:-mx-6 sm:-mt-8 mb-6">
                 <h1 className="text-5xl font-bold text-center pt-8">Harcamalarım</h1>
                 <div className="flex w-full items-center justify-between gap-4 text-xl">
                    <Button variant="ghost" size="icon" onClick={() => handleNavDate('prev')} className="text-white hover:bg-white/20 hover:text-white">
                        <ChevronLeft className="h-6 w-6" />
                    </Button>
                    <h2 className="font-semibold text-center w-48">
                        {format(currentDate, dateDisplayFormat, { locale: tr })}
                    </h2>
                    <Button variant="ghost" size="icon" onClick={() => handleNavDate('next')} className="text-white hover:bg-white/20 hover:text-white">
                        <ChevronRight className="h-6 w-6" />
                    </Button>
                </div>
                <Tabs value={mainTab} onValueChange={setMainTab} className="w-full">
                    <TabsList className="grid w-full grid-cols-3 bg-black/30 p-1 h-auto rounded-lg">
                        <TabsTrigger value="day" className="data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-md text-white/90">Gün</TabsTrigger>
                        <TabsTrigger value="month" className="data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-md text-white/90">Ay</TabsTrigger>
                        <TabsTrigger value="accounts" className="data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-md text-white/90">Hesaplar</TabsTrigger>
                    </TabsList>
                 </Tabs>
                {mainTab !== 'accounts' && (
                    <div className="grid grid-cols-3 text-center gap-2 p-3 bg-black/20 rounded-lg">
                        <div>
                            <p className="text-xs text-white/80">Gelir</p>
                            <p className="font-semibold text-sm">{headerIncome.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY', minimumFractionDigits: 0, maximumFractionDigits: 0 })}</p>
                        </div>
                        <div>
                            <p className="text-xs text-white/80">Gider</p>
                            <p className="font-semibold text-sm text-red-300">{headerExpense.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY', minimumFractionDigits: 0, maximumFractionDigits: 0 })}</p>
                        </div>
                        <div>
                            <p className="text-xs text-white/80">Toplam</p>
                            <p className={cn("font-semibold text-sm", headerTotal < 0 && 'text-red-300')}>{headerTotal.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY', minimumFractionDigits: 0, maximumFractionDigits: 0 })}</p>
                        </div>
                    </div>
                )}
            </header>
            
             <main className="flex-grow overflow-y-auto px-2 space-y-2 pb-24">
                {mainTab === 'day' && dailyGroups.map(group => (
                    <div key={group.dateISO}>
                        <div className="flex justify-between items-center p-2 bg-muted/50 rounded-t-lg">
                           <div className="font-medium text-xs capitalize">{group.date}</div>
                           <div className="flex gap-4 items-center text-xs">
                                <span className="text-primary">{group.dayTotalIncome > 0 ? group.dayTotalIncome.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY', minimumFractionDigits: 0, maximumFractionDigits: 0 }) : ''}</span>
                                <span className="text-destructive">{group.dayTotalExpense > 0 ? group.dayTotalExpense.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY', minimumFractionDigits: 0, maximumFractionDigits: 0 }) : ''}</span>
                           </div>
                        </div>
                        <div className="space-y-px">
                            {group.transactions.map(tx => {
                                const account = accounts.find(a => a.id === tx.accountId);
                                return (
                                <div key={tx.id} className={cn("flex justify-between items-center p-3 bg-card first:rounded-t-none last:rounded-b-lg", tx.type === 'income' ? 'bg-green-500/10' : 'bg-red-500/10')}>
                                    <div className="flex items-center gap-3">
                                        {account && React.createElement(accountIcons[account.type] || Wallet, { className: "h-5 w-5 text-muted-foreground" })}
                                        <div>
                                            <p className="text-xs">{tx.category}</p>
                                            <p className="text-xs text-muted-foreground">{account?.name || ''}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <p className={cn("font-semibold text-xs", tx.type === 'expense' ? 'text-destructive' : 'text-primary')}>
                                          {tx.type === 'expense' ? '-' : '+'}
                                          {tx.amount.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY', minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                                      </p>
                                      <DropdownMenu>
                                          <DropdownMenuTrigger asChild>
                                              <Button variant="ghost" size="icon" className="h-7 w-7"><MoreHorizontal className="h-4 w-4"/></Button>
                                          </DropdownMenuTrigger>
                                          <DropdownMenuContent>
                                              <DropdownMenuItem onSelect={() => openTransactionForm(tx)}><Edit className="mr-2 h-4 w-4"/> Düzenle</DropdownMenuItem>
                                              <AlertDialog>
                                                  <AlertDialogTrigger asChild><DropdownMenuItem onSelect={e => e.preventDefault()} className="text-destructive focus:text-destructive"><Trash2 className="mr-2 h-4 w-4"/>Sil</DropdownMenuItem></AlertDialogTrigger>
                                                  <AlertDialogContent>
                                                      <AlertDialogHeader>
                                                          <AlertDialogTitle>İşlemi Sil</AlertDialogTitle>
                                                          <AlertDialogDescription>Bu işlemi kalıcı olarak silmek istediğinizden emin misiniz?</AlertDialogDescription>
                                                      </AlertDialogHeader>
                                                      <AlertDialogFooter>
                                                          <AlertDialogCancel>İptal</AlertDialogCancel>
                                                          <AlertDialogAction onClick={() => handleDeleteTransaction(tx.id)}>Evet, Sil</AlertDialogAction>
                                                      </AlertDialogFooter>
                                                  </AlertDialogContent>
                                              </AlertDialog>
                                          </DropdownMenuContent>
                                      </DropdownMenu>
                                    </div>
                                </div>
                            )})}
                        </div>
                    </div>
                ))}
                {mainTab === 'month' && (
                    <Accordion type="single" collapsible className="w-full space-y-2">
                        {monthlySummaries.map(summary => (
                             <AccordionItem value={summary.monthKey} key={summary.monthKey} className="border-b-0">
                                <Card className="overflow-hidden shadow-sm">
                                     <AccordionTrigger className={cn("p-4 hover:no-underline", summary.total >= 0 ? "bg-green-500/10" : "bg-red-500/10")}>
                                         <div className="flex items-center justify-between w-full">
                                            <div className="font-bold text-sm capitalize">{summary.month}</div>
                                            <div className="flex items-center gap-4 text-xs">
                                                <span className="text-primary">{summary.income.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY', minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
                                                <div className="text-right">
                                                    <p className="text-destructive font-semibold text-sm">
                                                      {summary.expense > 0 ? '-' : ''}
                                                      {summary.expense.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY', minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                                                    </p>
                                                    <p className={cn("text-xs font-bold", summary.total >= 0 ? "text-primary" : "text-destructive")}>
                                                        Toplam: {summary.total.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY', minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                                                    </p>
                                                </div>
                                            </div>
                                         </div>
                                     </AccordionTrigger>
                                     <AccordionContent className="bg-card">
                                         <div className="p-2 space-y-px">
                                             {summary.transactions.map(tx => {
                                                 const account = accounts.find(a => a.id === tx.accountId);
                                                 return (
                                                 <div key={tx.id} className={cn("flex justify-between items-center p-3 bg-card first:rounded-t-lg last:rounded-b-lg", tx.type === 'income' ? 'bg-green-500/10' : 'bg-red-500/10')}>
                                                     <div className="flex items-center gap-3">
                                                         {account && React.createElement(accountIcons[account.type] || Wallet, { className: "h-5 w-5 text-muted-foreground" })}
                                                         <div>
                                                             <p className="text-xs">{tx.category}</p>
                                                             <p className="text-xs text-muted-foreground">{account?.name || ''}</p>
                                                         </div>
                                                     </div>
                                                      <div className="flex items-center gap-1">
                                                          <p className={cn("font-semibold text-xs", tx.type === 'expense' ? 'text-destructive' : 'text-primary')}>
                                                              {tx.type === 'expense' ? '-' : '+'}
                                                              {tx.amount.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY', minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                                                          </p>
                                                           <DropdownMenu>
                                                              <DropdownMenuTrigger asChild>
                                                                  <Button variant="ghost" size="icon" className="h-7 w-7"><MoreHorizontal className="h-4 w-4"/></Button>
                                                              </DropdownMenuTrigger>
                                                              <DropdownMenuContent>
                                                                  <DropdownMenuItem onSelect={() => openTransactionForm(tx)}><Edit className="mr-2 h-4 w-4"/> Düzenle</DropdownMenuItem>
                                                                  <AlertDialog>
                                                                      <AlertDialogTrigger asChild><DropdownMenuItem onSelect={e => e.preventDefault()} className="text-destructive focus:text-destructive"><Trash2 className="mr-2 h-4 w-4"/>Sil</DropdownMenuItem></AlertDialogTrigger>
                                                                      <AlertDialogContent>
                                                                          <AlertDialogHeader>
                                                                              <AlertDialogTitle>İşlemi Sil</AlertDialogTitle>
                                                                              <AlertDialogDescription>Bu işlemi kalıcı olarak silmek istediğinizden emin misiniz?</AlertDialogDescription>
                                                                          </AlertDialogHeader>
                                                                          <AlertDialogFooter>
                                                                              <AlertDialogCancel>İptal</AlertDialogCancel>
                                                                              <AlertDialogAction onClick={() => handleDeleteTransaction(tx.id)}>Evet, Sil</AlertDialogAction>
                                                                          </AlertDialogFooter>
                                                                      </AlertDialogContent>
                                                                  </AlertDialog>
                                                              </DropdownMenuContent>
                                                          </DropdownMenu>
                                                      </div>
                                                 </div>
                                             )})}
                                         </div>
                                     </AccordionContent>
                                </Card>
                             </AccordionItem>
                        ))}
                    </Accordion>
                )}
                 {mainTab === 'accounts' && (
                     <div className="space-y-4 p-2 text-foreground">
                        <Card className="shadow-lg bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                            <CardHeader>
                                <CardTitle>Hesap Özeti</CardTitle>
                            </CardHeader>
                             <CardContent className="grid grid-cols-3 gap-4 text-left text-xs">
                                <div><p className="text-white/80">Varlıklar</p><p className="font-semibold text-sm">{accountStats.totalAssets.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY', minimumFractionDigits: 0, maximumFractionDigits: 0 })}</p></div>
                                <div><p className="text-white/80">Borçlar</p><p className="font-semibold text-sm text-red-300">{accountStats.totalDebts.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY', minimumFractionDigits: 0, maximumFractionDigits: 0 })}</p></div>
                                <div><p className="text-white/80">Net Değer</p><p className={cn("font-semibold text-sm", accountStats.netWorth < 0 && 'text-red-300')}>{accountStats.netWorth.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY', minimumFractionDigits: 0, maximumFractionDigits: 0 })}</p></div>
                            </CardContent>
                        </Card>
                        
                         <Card className="shadow-md bg-gradient-to-br from-green-500 to-teal-500 text-white">
                            <CardHeader className="flex flex-row items-center justify-between pb-2">
                                <CardTitle className="text-base">Varlık Hesapları ({accountStats.assets.length})</CardTitle>
                            </CardHeader>
                            <CardContent className="divide-y divide-white/20">
                                {accountStats.assets.map((account) => (
                                    <AccountRow key={account.id} account={account} onEdit={() => openAccountForm(account)} onDelete={() => handleDeleteAccount(account.id)} />
                                ))}
                            </CardContent>
                        </Card>
                        
                        <Card className="shadow-md bg-gradient-to-br from-red-500 to-rose-500 text-white">
                            <CardHeader className="flex flex-row items-center justify-between pb-2">
                                <CardTitle className="text-base">Borç Hesapları ({accountStats.debts.length})</CardTitle>
                            </CardHeader>
                            <CardContent className="divide-y divide-white/20">
                                {accountStats.debts.map((account) => (
                                    <AccountRow key={account.id} account={account} onEdit={() => openAccountForm(account)} onDelete={() => handleDeleteAccount(account.id)} />
                                ))}
                            </CardContent>
                        </Card>

                         <Button variant="outline" className="w-full text-sm" onClick={() => openAccountForm(null)}>
                            <Plus className="h-4 w-4 mr-2" /> Yeni Hesap Ekle
                         </Button>
                         <Link href="/budget/stats">
                            <Button variant="outline" className="w-full text-sm">
                                <BarChart2 className="h-4 w-4 mr-2" /> Detaylı Analiz
                            </Button>
                         </Link>
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
        <div className="flex justify-between items-center py-3 px-2">
            <div className="flex items-center gap-2">
                <Icon className="h-5 w-5 text-white/80" />
                <p className="text-sm font-medium">{account.name}</p>
            </div>
            <div className="flex items-center gap-1">
                <p className={cn("font-semibold text-sm", (account.type === 'credit-card' || account.type === 'other') && 'text-red-200')}>{account.balance.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY', minimumFractionDigits: 0, maximumFractionDigits: 0 })}</p>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-white hover:bg-white/20 hover:text-white"><MoreHorizontal className="h-4 w-4"/></Button>
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
