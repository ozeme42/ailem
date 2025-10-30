
"use client";

import * as React from "react";
import { PlusCircle, MoreHorizontal, TrendingUp, TrendingDown, Wallet, CreditCard, Landmark, Banknote, PiggyBank, Edit, Trash2, ChevronLeft, ChevronRight } from "lucide-react";
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
import { onAccountsUpdate, deleteAccount, onTransactionsUpdate, addAccount, updateAccount, addTransaction, updateTransaction, deleteTransaction } from "@/lib/dataService";
import type { Account, Transaction, FamilyMember } from "@/lib/data";
import { useToast } from "@/hooks/use-toast";
import { format, startOfMonth, endOfMonth, addMonths, subMonths, isSameDay } from "date-fns";
import { tr } from "date-fns/locale";
import { cn } from "@/lib/utils";

const accountIcons: { [key: string]: React.ElementType } = {
    'cash': Banknote,
    'bank': Landmark,
    'credit-card': CreditCard,
};

// Helper to group transactions by date
const groupTransactionsByDate = (transactions: Transaction[]) => {
  return transactions.reduce((acc, transaction) => {
    const date = format(new Date(transaction.date), 'yyyy-MM-dd');
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(transaction);
    return acc;
  }, {} as { [key: string]: Transaction[] });
};

export function BudgetClient() {
    const { familyId, familyMembers } = useAuth();
    const { toast } = useToast();
    
    const [currentMonth, setCurrentMonth] = React.useState(new Date());
    const [accounts, setAccounts] = React.useState<Account[]>([]);
    const [transactions, setTransactions] = React.useState<Transaction[]>([]);
    
    const [isAccountFormOpen, setIsAccountFormOpen] = React.useState(false);
    const [isTransactionFormOpen, setIsTransactionFormOpen] = React.useState(false);

    const [editingAccount, setEditingAccount] = React.useState<Account | null>(null);
    const [editingTransaction, setEditingTransaction] = React.useState<Transaction | null>(null);

    React.useEffect(() => {
        if (!familyId) return;
        const unsubAccounts = onAccountsUpdate(setAccounts);
        const unsubTransactions = onTransactionsUpdate(setTransactions, currentMonth);
        
        return () => {
            unsubAccounts();
            unsubTransactions();
        };
    }, [familyId, currentMonth]);
    
    const { totalIncome, totalExpense, balance } = React.useMemo(() => {
        let income = 0;
        let expense = 0;
        transactions.forEach(t => {
            if (t.type === 'income') income += t.amount;
            else expense += t.amount;
        });
        return { totalIncome: income, totalExpense: expense, balance: income - expense };
    }, [transactions]);
    
    const groupedTransactions = React.useMemo(() => groupTransactionsByDate(transactions), [transactions]);

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

     const handleDeleteTransaction = async (id: string) => {
        try {
            await deleteTransaction(id);
            toast({ title: "İşlem Silindi", variant: 'destructive'});
        } catch (error) {
            console.error(error);
            toast({ variant: "destructive", title: "İşlem silinirken bir hata oluştu" });
        }
    }

    return (
        <div className="space-y-6">
            <PageHeader title="Bütçe Yönetimi">
                 <div className="flex flex-col sm:flex-row gap-2">
                    <Button onClick={() => { setEditingTransaction(null); setIsTransactionFormOpen(true); }} className="w-full sm:w-auto">
                        <PlusCircle className="mr-2 h-4 w-4"/> Yeni İşlem Ekle
                    </Button>
                     <Button variant="outline" className="w-full sm:w-auto bg-white/20 text-white hover:bg-white/30 border-none" onClick={() => { setEditingAccount(null); setIsAccountFormOpen(true); }}>
                        Yeni Hesap Ekle
                    </Button>
                </div>
            </PageHeader>
            
            <div className="flex items-center justify-center gap-4">
                <Button variant="outline" size="icon" onClick={() => setCurrentMonth(prev => subMonths(prev, 1))}>
                    <ChevronLeft className="h-4 w-4" />
                </Button>
                <h2 className="text-xl font-semibold capitalize text-center w-48">
                    {format(currentMonth, 'MMMM yyyy', { locale: tr })}
                </h2>
                <Button variant="outline" size="icon" onClick={() => setCurrentMonth(prev => addMonths(prev, 1))}>
                    <ChevronRight className="h-4 w-4" />
                </Button>
            </div>
            
             <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="bg-green-500/10 border-green-500/20">
                    <CardHeader>
                        <CardTitle className="text-green-700 dark:text-green-400 flex items-center justify-between">
                            Gelir <TrendingUp />
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-2xl font-bold">{totalIncome.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}</p>
                    </CardContent>
                </Card>
                <Card className="bg-red-500/10 border-red-500/20">
                    <CardHeader>
                        <CardTitle className="text-red-700 dark:text-red-400 flex items-center justify-between">
                            Gider <TrendingDown />
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-2xl font-bold">{totalExpense.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}</p>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader>
                        <CardTitle className="text-primary flex items-center justify-between">
                            Bakiye <Wallet />
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-2xl font-bold">{balance.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}</p>
                    </CardContent>
                </Card>
            </div>

            <Tabs defaultValue="transactions">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="transactions">İşlemler</TabsTrigger>
                    <TabsTrigger value="accounts">Hesaplar</TabsTrigger>
                </TabsList>
                <TabsContent value="transactions" className="mt-4 space-y-4">
                     {Object.keys(groupedTransactions).sort((a,b) => b.localeCompare(a)).map(date => {
                         const dayTransactions = groupedTransactions[date];
                         const dayTotal = dayTransactions.reduce((sum, t) => sum + (t.type === 'income' ? t.amount : -t.amount), 0);
                         return (
                            <div key={date}>
                                <div className="flex justify-between items-center bg-muted/50 p-2 rounded-t-lg">
                                    <h3 className="font-semibold text-lg">{format(new Date(date), 'd MMMM yyyy, EEEE', {locale: tr})}</h3>
                                    <p className={cn("font-semibold", dayTotal > 0 ? "text-green-600" : dayTotal < 0 ? "text-red-600" : "text-foreground")}>
                                        {dayTotal.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
                                    </p>
                                </div>
                                <div className="divide-y border rounded-b-lg">
                                    {dayTransactions.map(t => (
                                        <div key={t.id} className="flex items-center p-3 group">
                                            <div className="flex-grow">
                                                <p className="font-semibold">{t.description}</p>
                                                <p className="text-sm text-muted-foreground">{t.category} &middot; {accounts.find(a => a.id === t.accountId)?.name}</p>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <p className={cn("font-bold text-lg", t.type === 'income' ? 'text-green-600' : 'text-foreground')}>
                                                    {t.type === 'income' ? '+' : '-'}
                                                    {t.amount.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
                                                </p>
                                                 <div className="flex opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditingTransaction(t); setIsTransactionFormOpen(true);}}><Edit className="h-4 w-4"/></Button>
                                                    <AlertDialog>
                                                        <AlertDialogTrigger asChild>
                                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive"><Trash2 className="h-4 w-4"/></Button>
                                                        </AlertDialogTrigger>
                                                        <AlertDialogContent>
                                                             <AlertDialogHeader>
                                                                <AlertDialogTitle>İşlemi Sil</AlertDialogTitle>
                                                                <AlertDialogDescription>"{t.description}" işlemini kalıcı olarak silmek istediğinizden emin misiniz?</AlertDialogDescription>
                                                            </AlertDialogHeader>
                                                            <AlertDialogFooter>
                                                                <AlertDialogCancel>İptal</AlertDialogCancel>
                                                                <AlertDialogAction onClick={() => handleDeleteTransaction(t.id)}>Evet, Sil</AlertDialogAction>
                                                            </AlertDialogFooter>
                                                        </AlertDialogContent>
                                                    </AlertDialog>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                         );
                     })}
                     {Object.keys(groupedTransactions).length === 0 && (
                         <Card className="text-center p-8 text-muted-foreground">
                            Bu ay için işlem bulunmuyor.
                         </Card>
                     )}
                </TabsContent>
                <TabsContent value="accounts" className="mt-4">
                     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {accounts.map(account => {
                            const Icon = accountIcons[account.type] || Wallet;
                            return (
                                <Card key={account.id} className="relative group">
                                    <CardHeader>
                                        <div className="flex justify-between items-start">
                                            <div className="flex items-center gap-3">
                                                <Icon className="h-6 w-6 text-muted-foreground"/>
                                                <CardTitle>{account.name}</CardTitle>
                                            </div>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 opacity-50 group-hover:opacity-100 transition-opacity">
                                                        <MoreHorizontal className="h-4 w-4"/>
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent>
                                                    <DropdownMenuItem onClick={() => {setEditingAccount(account); setIsAccountFormOpen(true);}}>
                                                        <Edit className="mr-2 h-4 w-4"/> Düzenle
                                                    </DropdownMenuItem>
                                                     <AlertDialog>
                                                        <AlertDialogTrigger asChild>
                                                            <DropdownMenuItem onSelect={e => e.preventDefault()} className="text-destructive focus:text-destructive">
                                                                <Trash2 className="mr-2 h-4 w-4"/> Sil
                                                            </DropdownMenuItem>
                                                        </AlertDialogTrigger>
                                                        <AlertDialogContent>
                                                            <AlertDialogHeader>
                                                                <AlertDialogTitle>Hesabı Sil</AlertDialogTitle>
                                                                <AlertDialogDescription>"{account.name}" hesabını kalıcı olarak silmek istediğinizden emin misiniz?</AlertDialogDescription>
                                                            </AlertDialogHeader>
                                                            <AlertDialogFooter>
                                                                <AlertDialogCancel>İptal</AlertDialogCancel>
                                                                <AlertDialogAction onClick={() => handleDeleteAccount(account.id)}>Evet, Sil</AlertDialogAction>
                                                            </AlertDialogFooter>
                                                        </AlertDialogContent>
                                                    </AlertDialog>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </div>
                                        <CardDescription>{familyMembers.find(m => m.id === account.ownerId)?.name || ''}</CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <p className="text-3xl font-bold">{account.balance.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}</p>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>
                </TabsContent>
            </Tabs>

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
