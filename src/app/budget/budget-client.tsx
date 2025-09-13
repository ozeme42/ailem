
"use client";

import * as React from "react";
import { PlusCircle, MoreHorizontal, TrendingUp, TrendingDown, Wallet, CreditCard, Landmark, Banknote, PiggyBank, Edit, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { NewAccountForm } from "@/components/new-account-form";
import { NewTransactionForm } from "@/components/new-transaction-form";
import { BudgetCategoryForm } from "@/components/budget-category-form";
import { useAuth } from "@/components/auth-provider";
import { onAccountsUpdate, deleteAccount, onTransactionsUpdate, onBudgetsUpdate, addAccount, updateAccount, addTransaction, updateTransaction, deleteTransaction, updateBudget } from "@/lib/dataService";
import type { Account, Transaction, Budget, FamilyMember } from "@/lib/data";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { tr } from "date-fns/locale";

const accountIcons: { [key: string]: React.ElementType } = {
    'cash': Banknote,
    'bank': Landmark,
    'credit-card': CreditCard,
};

export function BudgetClient() {
    const { familyId, familyMembers } = useAuth();
    const { toast } = useToast();

    const [accounts, setAccounts] = React.useState<Account[]>([]);
    const [transactions, setTransactions] = React.useState<Transaction[]>([]);
    const [budgets, setBudgets] = React.useState<Budget[]>([]);
    
    const [isAccountFormOpen, setIsAccountFormOpen] = React.useState(false);
    const [isTransactionFormOpen, setIsTransactionFormOpen] = React.useState(false);
    const [isBudgetFormOpen, setIsBudgetFormOpen] = React.useState(false);

    const [editingAccount, setEditingAccount] = React.useState<Account | null>(null);
    const [editingTransaction, setEditingTransaction] = React.useState<Transaction | null>(null);

    React.useEffect(() => {
        if (!familyId) return;
        const unsubAccounts = onAccountsUpdate(setAccounts);
        const unsubTransactions = onTransactionsUpdate(setTransactions, new Date()); // Initially fetch for current month
        const unsubBudgets = onBudgetsUpdate(setBudgets);
        
        return () => {
            unsubAccounts();
            unsubTransactions();
            unsubBudgets();
        };
    }, [familyId]);

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
        <div className="space-y-6">
            <PageHeader title="Bütçe Yönetimi">
                 <div className="flex flex-col sm:flex-row gap-2">
                    <Button onClick={() => { setEditingTransaction(null); setIsTransactionFormOpen(true); }} className="w-full sm:w-auto">
                        <PlusCircle className="mr-2 h-4 w-4"/> Gelir/Gider Ekle
                    </Button>
                     <Button variant="outline" className="w-full sm:w-auto bg-white/20 text-white hover:bg-white/30 border-none" onClick={() => { setEditingAccount(null); setIsAccountFormOpen(true); }}>
                        Yeni Hesap Ekle
                    </Button>
                    <Button variant="outline" className="w-full sm:w-auto bg-white/20 text-white hover:bg-white/30 border-none" onClick={() => setIsBudgetFormOpen(true)}>
                        Aylık Bütçe Belirle
                    </Button>
                </div>
            </PageHeader>
            
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

             <Dialog open={isAccountFormOpen} onOpenChange={setIsAccountFormOpen}>
                <DialogContent>
                    <NewAccountForm
                        familyMembers={familyMembers}
                        onSubmit={handleAccountSubmit}
                        initialData={editingAccount}
                    />
                </DialogContent>
            </Dialog>
            
            <Dialog open={isTransactionFormOpen} onOpenChange={setIsTransactionFormOpen}>
                <DialogContent>
                    <NewTransactionForm
                        accounts={accounts}
                        familyMembers={familyMembers}
                        onSubmit={handleTransactionSubmit}
                        initialData={editingTransaction}
                    />
                </DialogContent>
            </Dialog>
            
             <Dialog open={isBudgetFormOpen} onOpenChange={setIsBudgetFormOpen}>
                <DialogContent>
                    <BudgetCategoryForm 
                       
                    />
                </DialogContent>
            </Dialog>

        </div>
    );
}
