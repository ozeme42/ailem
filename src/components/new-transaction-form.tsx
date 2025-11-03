
"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { CalendarIcon, Edit, Repeat, Trash2, AlertTriangle, Banknote, Landmark, CreditCard, Archive } from "lucide-react";
import { format, parseISO } from "date-fns";
import { tr } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { Account, FamilyMember, Transaction, BudgetCategory } from "@/lib/data";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { ScrollArea } from "./ui/scroll-area";
import { Tabs, TabsList, TabsTrigger } from "./ui/tabs";
import { onBudgetCategoriesUpdate } from "@/lib/dataService";
import { Separator } from "./ui/separator";
import { BudgetCategoryForm } from "./budget-category-form";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";
import { Switch } from "./ui/switch";

const formSchema = z.object({
  amount: z.coerce.number().positive("Tutar pozitif bir sayı olmalıdır."),
  type: z.enum(['income', 'expense']).default('expense'),
  accountId: z.string({ required_error: "Bir hesap seçmelisiniz." }),
  category: z.string().min(1, "Kategori seçimi zorunludur."),
  date: z.date({ required_error: "Tarih seçmelisiniz." }),
  isInstallment: z.boolean().default(false),
  installmentCount: z.coerce.number().optional(),
});

type NewTransactionFormProps = {
  accounts: Account[];
  familyMembers: FamilyMember[];
  onSubmit: (data: any) => void; 
  initialData?: Transaction | null;
};

const accountIcons: { [key: string]: React.ElementType } = {
    'cash': Banknote,
    'bank': Landmark,
    'credit-card': CreditCard,
};

export function NewTransactionForm({ accounts, familyMembers, onSubmit, initialData }: NewTransactionFormProps) {
  const [categories, setCategories] = React.useState<BudgetCategory[]>([]);
  const [showCategorySelector, setShowCategorySelector] = React.useState(false);
  const [showCategoryManager, setShowCategoryManager] = React.useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      amount: undefined,
      type: 'expense',
      accountId: undefined,
      category: "",
      date: new Date(),
      isInstallment: false,
      installmentCount: 2,
    },
  });
  
  React.useEffect(() => {
    if (initialData) {
      form.reset({
        amount: initialData.amount || undefined,
        type: initialData.type || 'expense',
        accountId: initialData.accountId || undefined,
        category: initialData.category || "",
        date: initialData.date ? parseISO(initialData.date) : new Date(),
        isInstallment: initialData.isInstallment || false,
        installmentCount: initialData.installmentDetails?.total || 2,
      });
    } else {
        form.reset({
            amount: undefined,
            type: 'expense',
            accountId: undefined,
            category: "",
            date: new Date(),
            isInstallment: false,
            installmentCount: 2,
        });
    }
  }, [initialData, form]);

  React.useEffect(() => {
      const unsub = onBudgetCategoriesUpdate(setCategories);
      return () => unsub();
  }, []);

  const handleCategorySelect = (categoryName: string) => {
      form.setValue('category', categoryName, { shouldValidate: true });
      setShowCategorySelector(false);
  }

  function handleFormSubmit(values: z.infer<typeof formSchema>) {
    onSubmit({
      ...values,
      date: format(values.date, 'yyyy-MM-dd')
    });
    form.reset();
  }
  
  const selectedCategory = categories.find(c => c.name === form.watch('category'));
  const transactionType = form.watch('type');
  const selectedAccountId = form.watch('accountId');
  const isInstallment = form.watch('isInstallment');
  const { errors } = form.formState;

  const filteredAccounts = React.useMemo(() => {
    if (transactionType === 'income') {
        return accounts.filter(acc => acc.type === 'bank' || acc.type === 'cash');
    }
    return accounts;
  }, [accounts, transactionType]);
  
  React.useEffect(() => {
      if (filteredAccounts.length === 1) {
          form.setValue('accountId', filteredAccounts[0].id);
      }
  }, [filteredAccounts, form]);


  return (
    <div className="flex flex-col h-full bg-background text-foreground">
        <Form {...form}>
        <form onSubmit={form.handleSubmit(handleFormSubmit)} className="flex flex-col flex-grow min-h-0">
           <div className="p-4 bg-muted/50 flex-shrink-0">
                <DialogHeader className="p-0">
                    <DialogTitle className="text-center text-xl">{initialData ? "İşlemi Düzenle" : "Yeni İşlem"}</DialogTitle>
                    <Tabs 
                        value={transactionType}
                        onValueChange={(value) => {
                            form.setValue('type', value as 'income' | 'expense');
                            form.setValue('category', ''); 
                            if (filteredAccounts.length === 1 && value === form.getValues('type')) {
                              // Do nothing if type hasn't changed and only one account
                            } else {
                                form.setValue('accountId', undefined);
                            }
                        }}
                        className="w-full pt-4"
                    >
                        <TabsList className="grid w-full grid-cols-2 bg-background">
                            <TabsTrigger value="income" className={cn(transactionType === 'income' && "data-[state=active]:bg-primary data-[state=active]:text-primary-foreground")}>Gelir</TabsTrigger>
                            <TabsTrigger value="expense" className={cn(transactionType === 'expense' && "data-[state=active]:bg-destructive data-[state=active]:text-destructive-foreground")}>Gider</TabsTrigger>
                        </TabsList>
                    </Tabs>
                </DialogHeader>
           </div>
           
           <ScrollArea className="flex-grow">
             <div className="p-4 space-y-4">
                 {Object.keys(errors).length > 0 && (
                     <Alert variant="destructive">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertTitle>Eksik Bilgi</AlertTitle>
                        <AlertDescription>Lütfen tüm zorunlu alanları doldurun.</AlertDescription>
                    </Alert>
                 )}
                  <FormField control={form.control} name="date" render={({ field }) => (
                      <FormItem className="flex items-center">
                          <FormLabel className="w-20 text-xs text-muted-foreground">Tarih</FormLabel>
                          <Popover>
                              <PopoverTrigger asChild>
                                  <Button variant={"ghost"} className="flex-grow justify-start font-normal text-sm">
                                      {field.value ? format(field.value, "dd.MM.yyyy (EEE)", { locale: tr }) : <span>Tarih seçin</span>}
                                  </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus/></PopoverContent>
                          </Popover>
                      </FormItem>
                  )}/>
                  <Separator/>
                  <FormField control={form.control} name="amount" render={({ field }) => (
                      <FormItem className="flex items-center"><FormLabel className="w-20 text-xs text-muted-foreground">Tutar</FormLabel>
                          <FormControl><Input type="number" step="any" placeholder="0,00" {...field} className={cn("bg-transparent border-0 text-2xl font-bold h-auto", transactionType === 'income' ? 'text-primary placeholder:text-primary/50' : 'text-destructive placeholder:text-destructive/50')} /></FormControl>
                      </FormItem>
                  )}/>
                  <Separator/>
                  <FormItem className="flex items-center">
                      <FormLabel className="w-20 text-xs text-muted-foreground">Kategori</FormLabel>
                      <div className="flex-grow">
                        <Button type="button" variant="ghost" className="w-full justify-start text-left text-sm" onClick={() => setShowCategorySelector(true)}>
                            {selectedCategory ? (
                                <div className="flex items-center gap-2">
                                    <span className="text-base">{selectedCategory.icon}</span>
                                    <span>{selectedCategory.name}</span>
                                </div>
                            ) : (
                                <span className="text-muted-foreground">Kategori seçin</span>
                            )}
                        </Button>
                        {errors.category && <p className="pl-4 text-xs font-medium text-destructive">{errors.category.message}</p>}
                       </div>
                  </FormItem>
                   <Separator/>
                   <FormItem>
                       <FormLabel className="w-20 text-xs text-muted-foreground">Hesap</FormLabel>
                       <div className="grid grid-cols-3 gap-2 pt-2">
                           {filteredAccounts.map(acc => {
                               const Icon = accountIcons[acc.type] || Banknote;
                               const isSelected = selectedAccountId === acc.id;
                               return (
                                 <Button 
                                   type="button"
                                   key={acc.id} 
                                   variant={isSelected ? "default" : "outline"}
                                   className="h-auto flex flex-col items-center justify-center p-2 gap-1"
                                   onClick={() => form.setValue('accountId', acc.id)}
                                 >
                                    <Icon className="h-4 w-4"/>
                                    <span className="text-xs font-semibold truncate">{acc.name}</span>
                                 </Button>
                               )
                           })}
                       </div>
                       {errors.accountId && <p className="pt-2 text-xs font-medium text-destructive">{errors.accountId.message}</p>}
                   </FormItem>
                   <Separator/>
                    {transactionType === 'expense' && (
                       <div className="space-y-4">
                           <FormField control={form.control} name="isInstallment" render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                                <FormLabel>Taksitli İşlem</FormLabel>
                                <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                            </FormItem>
                        )}/>
                        {isInstallment && (
                             <FormField control={form.control} name="installmentCount" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Taksit Sayısı</FormLabel>
                                    <FormControl><Input type="number" placeholder="2" {...field} /></FormControl>
                                    <FormMessage/>
                                </FormItem>
                            )}/>
                        )}
                       </div>
                    )}
             </div>
          </ScrollArea>
           
            <div className="p-4 bg-muted/50 border-t flex-shrink-0">
                <Button type="submit" className={cn("w-full", transactionType === 'income' ? 'bg-primary hover:bg-primary/90' : 'bg-destructive hover:bg-destructive/90')}>
                    {initialData ? "İşlemi Güncelle" : "İşlemi Kaydet"}
                </Button>
            </div>
        </form>
        </Form>
        
        <Dialog open={showCategorySelector} onOpenChange={setShowCategorySelector}>
            <DialogContent className="sm:max-w-md flex flex-col bg-background text-foreground border-0 max-h-[90vh]">
                <DialogHeader>
                    <div className="flex justify-between items-center">
                        <DialogTitle>Kategori</DialogTitle>
                        <Button variant="outline" size="sm" onClick={() => {setShowCategorySelector(false); setShowCategoryManager(true);}}>
                            <Edit className="h-4 w-4 mr-2" /> Kategorileri Yönet
                        </Button>
                    </div>
                </DialogHeader>
                <ScrollArea>
                    <div className="grid grid-cols-4 gap-2 py-4">
                      {categories.filter(c => c.type === form.watch('type')).map(cat => (
                          <Button key={cat.id} variant="secondary" className="flex-col h-20 bg-muted hover:bg-muted/80" onClick={() => handleCategorySelect(cat.name)}>
                              <span className="text-2xl">{cat.icon}</span>
                              <span className="text-xs text-center">{cat.name}</span>
                          </Button>
                      ))}
                    </div>
                </ScrollArea>
            </DialogContent>
        </Dialog>

        <Dialog open={showCategoryManager} onOpenChange={(open) => {
            setShowCategoryManager(open);
            if (!open) {
                setShowCategorySelector(true);
            }
        }}>
             <DialogContent className="sm:max-w-md h-full flex flex-col bg-background text-foreground border-0">
                 <BudgetCategoryForm onBack={() => { setShowCategoryManager(false); setShowCategorySelector(true); }}/>
             </DialogContent>
        </Dialog>
    </div>
  );
}
