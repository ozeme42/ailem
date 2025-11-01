
"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { CalendarIcon, Edit, Repeat, Trash2, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { Account, FamilyMember, Transaction, BudgetCategory } from "@/lib/data";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "./ui/dialog";
import { Switch } from "./ui/switch";
import { ScrollArea } from "./ui/scroll-area";
import { Tabs, TabsList, TabsTrigger } from "./ui/tabs";
import { onBudgetCategoriesUpdate } from "@/lib/dataService";
import { Separator } from "./ui/separator";
import { BudgetCategoryForm } from "./budget-category-form";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";

const formSchema = z.object({
  amount: z.coerce.number().positive("Tutar pozitif bir sayı olmalıdır."),
  type: z.enum(['income', 'expense']).default('expense'),
  accountId: z.string({ required_error: "Bir hesap seçmelisiniz." }),
  category: z.string().min(1, "Kategori seçimi zorunludur."),
  date: z.date({ required_error: "Tarih seçmelisiniz." }),
  isInstallment: z.boolean().default(false),
  installmentTotal: z.coerce.number().optional(),
});

type NewTransactionFormProps = {
  accounts: Account[];
  familyMembers: FamilyMember[];
  onSubmit: (data: any) => void; 
  initialData?: Transaction | null;
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
      installmentTotal: undefined,
    },
  });
  
  React.useEffect(() => {
    if (initialData) {
      form.reset({
        amount: initialData.amount || undefined,
        type: initialData.type || 'expense',
        accountId: initialData.accountId || undefined,
        category: initialData.category || "",
        date: initialData.date ? new Date(initialData.date) : new Date(),
        isInstallment: initialData.isInstallment || false,
        installmentTotal: initialData.installmentDetails?.total || undefined,
      });
    } else {
        form.reset({
            amount: undefined,
            type: 'expense',
            accountId: undefined,
            category: "",
            date: new Date(),
            isInstallment: false,
            installmentTotal: undefined,
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
  const { errors } = form.formState;

  return (
    <div className="flex flex-col h-full bg-background text-foreground">
        <Form {...form}>
        <form onSubmit={form.handleSubmit(handleFormSubmit)} className="flex-grow flex flex-col min-h-0">
           <DialogHeader className="p-4 bg-muted/50 flex-shrink-0">
                <DialogTitle className="text-center text-xl">{initialData ? "İşlemi Düzenle" : "Yeni İşlem"}</DialogTitle>
                <Tabs 
                    value={transactionType}
                    onValueChange={(value) => {
                        form.setValue('type', value as 'income' | 'expense');
                        form.setValue('category', ''); // Reset category on type change
                    }}
                    className="w-full pt-4"
                >
                    <TabsList className="grid w-full grid-cols-2 bg-background">
                        <TabsTrigger value="income" className={cn(transactionType === 'income' && "data-[state=active]:bg-primary data-[state=active]:text-primary-foreground")}>Gelir</TabsTrigger>
                        <TabsTrigger value="expense" className={cn(transactionType === 'expense' && "data-[state=active]:bg-destructive data-[state=active]:text-destructive-foreground")}>Gider</TabsTrigger>
                    </TabsList>
                </Tabs>
           </DialogHeader>
           
           <div className="flex-grow min-h-0">
               <ScrollArea className="h-full">
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
                              <FormLabel className="w-20 text-muted-foreground">Tarih</FormLabel>
                              <Popover>
                                  <PopoverTrigger asChild>
                                      <Button variant={"ghost"} className="flex-grow justify-start font-normal">
                                          {field.value ? format(field.value, "dd.MM.yyyy (EEE) HH:mm", { locale: tr }) : <span>Tarih seçin</span>}
                                      </Button>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus/></PopoverContent>
                              </Popover>
                          </FormItem>
                      )}/>
                      <Separator/>
                      <FormField control={form.control} name="amount" render={({ field }) => (
                          <FormItem className="flex items-center"><FormLabel className="w-20 text-muted-foreground">Tutar</FormLabel>
                              <FormControl><Input type="number" step="any" placeholder="0,00" {...field} className={cn("bg-transparent border-0 text-lg font-bold placeholder:text-red-400/50", transactionType === 'income' ? 'text-primary placeholder:text-primary/50' : 'text-destructive placeholder:text-destructive/50')} /></FormControl>
                          </FormItem>
                      )}/>
                      <Separator/>
                      <FormItem className="flex items-center">
                          <FormLabel className="w-20 text-muted-foreground">Kategori</FormLabel>
                          <div className="flex-grow">
                            <Button type="button" variant="ghost" className="w-full justify-start text-left" onClick={() => setShowCategorySelector(true)}>
                                {selectedCategory ? (
                                    <div className="flex items-center gap-2">
                                        <span className="text-xl">{selectedCategory.icon}</span>
                                        <span>{selectedCategory.name}</span>
                                    </div>
                                ) : (
                                    <span className="text-muted-foreground">Kategori seçin</span>
                                )}
                            </Button>
                            {errors.category && <p className="pl-4 text-sm font-medium text-destructive">{errors.category.message}</p>}
                           </div>
                      </FormItem>
                       <Separator/>
                       <FormField control={form.control} name="accountId" render={({ field }) => (
                          <FormItem className="flex items-center"><FormLabel className="w-20 text-muted-foreground">Hesap</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value}>
                                  <FormControl><SelectTrigger className="bg-transparent border-0"><SelectValue placeholder="Hesap seçin"/></SelectTrigger></FormControl>
                                  <SelectContent>{accounts.map(acc => <SelectItem key={acc.id} value={acc.id}>{acc.name}</SelectItem>)}</SelectContent>
                              </Select>
                          </FormItem>
                      )}/>
                 </div>
              </ScrollArea>
           </div>
           
            <DialogFooter className="p-4 bg-muted/50 border-t flex-shrink-0">
                <Button type="submit" className={cn("w-full", transactionType === 'income' ? 'bg-primary hover:bg-primary/90' : 'bg-destructive hover:bg-destructive/90')}>
                    {initialData ? "İşlemi Güncelle" : "İşlemi Kaydet"}
                </Button>
            </DialogFooter>
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
    
