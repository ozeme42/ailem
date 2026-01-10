"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { CalendarIcon, Edit, Banknote, Landmark, CreditCard, Wallet, ChevronRight, ChevronLeft } from "lucide-react";
import { format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, addMonths, subMonths, getDay, isSameDay, isToday } from "date-fns";
import { tr } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Account, FamilyMember, Transaction, BudgetCategory } from "@/lib/data";
import { DialogHeader, DialogTitle } from "@/components/ui/dialog"; // Import düzeltildi
import { ScrollArea } from "@/components/ui/scroll-area"; // <--- EKSİK OLAN BU SATIR EKLENDİ
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { onBudgetCategoriesUpdate } from "@/lib/dataService";
import { BudgetCategoryForm } from "@/components/budget-category-form";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent } from "@/components/ui/dialog";

// --- GÖMÜLÜ TAKVİM (Mobil Dostu) ---
function CustomEmbeddedCalendar({ selected, onSelect }: { selected: Date, onSelect: (date: Date) => void }) {
    const [viewDate, setViewDate] = React.useState(selected || new Date());
    const firstDayOfMonth = startOfMonth(viewDate);
    const lastDayOfMonth = endOfMonth(viewDate);
    const daysInMonth = eachDayOfInterval({ start: firstDayOfMonth, end: lastDayOfMonth });
    const startDayIndex = (getDay(firstDayOfMonth) + 6) % 7; 
    const weekDays = ["Pt", "Sa", "Ça", "Pe", "Cu", "Ct", "Pa"];

    return (
        <div className="p-3 w-full bg-white dark:bg-slate-900">
            <div className="flex items-center justify-between mb-2">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.preventDefault(); setViewDate(subMonths(viewDate, 1)); }}>
                    <ChevronLeft className="h-4 w-4" />
                </Button>
                <div className="font-bold text-sm">
                    {format(viewDate, "MMMM yyyy", { locale: tr })}
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.preventDefault(); setViewDate(addMonths(viewDate, 1)); }}>
                    <ChevronRight className="h-4 w-4" />
                </Button>
            </div>
            <div className="grid grid-cols-7 mb-1">
                {weekDays.map((day) => (
                    <div key={day} className="text-center text-[10px] text-muted-foreground font-medium h-6 flex items-center justify-center">
                        {day}
                    </div>
                ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
                {Array.from({ length: startDayIndex }).map((_, i) => <div key={`empty-${i}`} />)}
                {daysInMonth.map((day) => {
                    const isSelected = isSameDay(day, selected);
                    const isCurrentDay = isToday(day);
                    return (
                        <button
                            key={day.toString()}
                            type="button"
                            onClick={() => onSelect(day)}
                            className={cn(
                                "w-full aspect-square rounded-full flex items-center justify-center text-sm transition-all",
                                isSelected ? "bg-indigo-600 text-white font-bold" : "hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300",
                                isCurrentDay && !isSelected && "border border-indigo-600 text-indigo-600 font-bold"
                            )}
                        >
                            {format(day, "d")}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

const formSchema = z.object({
  amount: z.coerce.number().positive("Tutar giriniz"),
  type: z.enum(['income', 'expense']).default('expense'),
  accountId: z.string({ required_error: "Hesap seçiniz" }),
  category: z.string().min(1, "Kategori seçiniz"),
  date: z.date({ required_error: "Tarih seçiniz" }),
  isInstallment: z.boolean().default(false),
  installmentCount: z.coerce.number().optional(),
});

type NewTransactionFormProps = {
  accounts: Account[];
  familyMembers: FamilyMember[];
  onSubmit: (data: any) => void; 
  initialData?: Transaction | null;
};

const accountIcons: { [key: string]: React.ElementType } = { 'cash': Banknote, 'bank': Landmark, 'credit-card': CreditCard, 'other': Wallet };

export function NewTransactionForm({ accounts, familyMembers, onSubmit, initialData }: NewTransactionFormProps) {
  const [categories, setCategories] = React.useState<BudgetCategory[]>([]);
  const [showCategorySelector, setShowCategorySelector] = React.useState(false);
  const [showCategoryManager, setShowCategoryManager] = React.useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = React.useState(false);

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
    const dataToSend = {
      ...values,
      date: format(values.date, 'yyyy-MM-dd'),
      ...(values.isInstallment && { installmentDetails: { total: values.installmentCount || 1, current: 1 } })
    };
    onSubmit(dataToSend);
    form.reset();
  }
  
  const selectedCategory = categories.find(c => c.name === form.watch('category'));
  const transactionType = form.watch('type');
  const selectedAccountId = form.watch('accountId');
  const isInstallment = form.watch('isInstallment');
  const { errors } = form.formState;

  const filteredAccounts = React.useMemo(() => {
    if (transactionType === 'income') return accounts.filter(acc => acc.type === 'bank' || acc.type === 'cash');
    return accounts;
  }, [accounts, transactionType]);
  
  React.useEffect(() => {
      if (filteredAccounts.length === 1 && !form.getValues('accountId')) form.setValue('accountId', filteredAccounts[0].id);
      if (transactionType === 'income' && form.watch('isInstallment')) form.setValue('isInstallment', false);
  }, [filteredAccounts, form, transactionType]);

  return (
    <div className="flex flex-col w-full h-full max-h-[85dvh] bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 rounded-[2rem] overflow-hidden">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleFormSubmit)} className="flex flex-col h-full overflow-hidden">
            
            {/* Header: Sabit */}
            <div className="p-4 pt-5 flex-shrink-0 bg-slate-50 dark:bg-white/5 border-b border-slate-100 dark:border-white/5">
                <DialogTitle className="text-center text-lg font-bold mb-4">{initialData ? "İşlemi Düzenle" : "Yeni İşlem"}</DialogTitle>
                <Tabs value={transactionType} onValueChange={(v) => { form.setValue('type', v as any); form.setValue('category', ''); form.setValue('accountId', undefined); }} className="w-full">
                    <TabsList className="grid w-full grid-cols-2 h-11 rounded-xl bg-slate-200 dark:bg-black/40 p-1">
                        <TabsTrigger value="income" className="rounded-lg data-[state=active]:bg-emerald-600 data-[state=active]:text-white font-bold transition-all">Gelir</TabsTrigger>
                        <TabsTrigger value="expense" className="rounded-lg data-[state=active]:bg-rose-600 data-[state=active]:text-white font-bold transition-all">Gider</TabsTrigger>
                    </TabsList>
                </Tabs>
            </div>
            
            {/* Body: Kaydırılabilir (Scrollable) */}
            <div className="flex-grow overflow-y-auto p-4 space-y-5">
                
                {/* Tutar */}
                <div className="flex flex-col items-center py-2">
                    <FormField control={form.control} name="amount" render={({ field }) => (
                        <FormItem className="w-full text-center space-y-0 relative">
                            <div className="flex items-center justify-center relative">
                                <span className={cn("text-3xl font-bold mr-1 absolute left-4 sm:left-12", transactionType === 'income' ? "text-emerald-600" : "text-rose-600")}>₺</span>
                                <FormControl>
                                    <Input 
                                        type="number" step="any" placeholder="0" {...field} value={field.value ?? ''} 
                                        className={cn("bg-transparent border-none text-5xl font-black h-16 text-center w-full focus-visible:ring-0 placeholder:text-slate-300 dark:placeholder:text-slate-700", transactionType === 'income' ? "text-emerald-600" : "text-rose-600")} 
                                    />
                                </FormControl>
                            </div>
                            <FormMessage className="text-center text-xs mt-1" />
                        </FormItem>
                    )}/>
                </div>

                {/* Tarih */}
                <div className="space-y-1.5">
                    <FormLabel className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Tarih</FormLabel>
                    <FormField control={form.control} name="date" render={({ field }) => (
                        <FormItem className="flex flex-col">
                            <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                                <PopoverTrigger asChild>
                                    <FormControl>
                                        <Button variant={"outline"} className={cn("h-12 w-full pl-3 text-left font-medium rounded-xl border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 transition-all", !field.value && "text-muted-foreground")}>
                                            <CalendarIcon className="mr-3 h-5 w-5 text-indigo-500" />
                                            <span className="text-base">{field.value ? format(field.value, "d MMMM yyyy, EEEE", { locale: tr }) : <span>Tarih seçin</span>}</span>
                                        </Button>
                                    </FormControl>
                                </PopoverTrigger>
                                <PopoverContent className="w-[300px] p-0 rounded-2xl overflow-hidden border-none shadow-2xl z-50" align="center" sideOffset={10}>
                                    <CustomEmbeddedCalendar selected={field.value} onSelect={(date) => { field.onChange(date); setIsCalendarOpen(false); }} />
                                </PopoverContent>
                            </Popover>
                            <FormMessage />
                        </FormItem>
                    )}/>
                </div>

                {/* Kategori */}
                <div className="space-y-1.5">
                    <FormLabel className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Kategori</FormLabel>
                    <Button type="button" variant="outline" className="w-full h-12 justify-between px-4 rounded-xl border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 transition-all" onClick={() => setShowCategorySelector(true)}>
                        {selectedCategory ? (
                            <div className="flex items-center gap-3">
                                <span className="text-xl">{selectedCategory.icon}</span>
                                <span className="text-base font-medium">{selectedCategory.name}</span>
                            </div>
                        ) : (
                            <span className="text-slate-400 text-base">Kategori seçin</span>
                        )}
                        <ChevronRight className="h-5 w-5 text-slate-400" />
                    </Button>
                    {errors.category && <p className="text-xs font-medium text-rose-500 ml-1">{errors.category.message}</p>}
                </div>

                {/* Hesap */}
                <div className="space-y-1.5">
                    <FormLabel className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Hesap</FormLabel>
                    <div className="grid grid-cols-2 gap-3">
                        {filteredAccounts.map(acc => {
                            const Icon = accountIcons[acc.type] || Banknote;
                            const isSelected = selectedAccountId === acc.id;
                            return (
                            <div key={acc.id} onClick={() => form.setValue('accountId', acc.id)} className={cn("relative cursor-pointer flex items-center gap-3 p-3 rounded-xl border transition-all h-12", isSelected ? "bg-indigo-50 border-indigo-500 dark:bg-indigo-900/20" : "bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 hover:border-indigo-400")}>
                                <div className={cn("p-1.5 rounded-full", isSelected ? "bg-indigo-600 text-white" : "bg-slate-200 dark:bg-slate-800 text-slate-500")}>
                                    <Icon className="h-4 w-4"/>
                                </div>
                                <span className={cn("text-sm font-semibold truncate", isSelected ? "text-indigo-600 dark:text-indigo-400" : "text-slate-700 dark:text-slate-300")}>{acc.name}</span>
                            </div>
                            )
                        })}
                    </div>
                    {errors.accountId && <p className="text-xs font-medium text-rose-500 ml-1">{errors.accountId.message}</p>}
                </div>

                {/* Taksit (Sadece Gider) */}
                {transactionType === 'expense' && (
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 space-y-3">
                        <FormField control={form.control} name="isInstallment" render={({ field }) => (
                            <FormItem className="flex items-center justify-between space-y-0">
                                <FormLabel className="text-sm font-medium">Taksitli İşlem</FormLabel>
                                <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                            </FormItem>
                        )}/>
                        
                        {isInstallment && (
                            <FormField control={form.control} name="installmentCount" render={({ field }) => (
                                <FormItem className="flex items-center gap-3 space-y-0 pt-2 border-t border-dashed border-slate-200 dark:border-white/10">
                                    <FormLabel className="text-sm text-slate-500">Taksit Sayısı:</FormLabel>
                                    <FormControl>
                                        <div className="flex items-center gap-2">
                                            <Input type="number" {...field} value={field.value ?? ''} className="w-16 h-8 text-center bg-white dark:bg-black/20 rounded-lg" />
                                            <span className="text-sm font-medium">Ay</span>
                                        </div>
                                    </FormControl>
                                </FormItem>
                            )}/>
                        )}
                    </div>
                )}
            </div>
            
            {/* Footer: Sabit */}
            <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-white/5 flex-shrink-0">
                <Button type="submit" className={cn("w-full h-12 text-lg font-bold rounded-xl shadow-lg transition-transform active:scale-95", transactionType === 'income' ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-500/20' : 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-500/20')}>
                    {initialData ? "Güncelle" : "Kaydet"}
                </Button>
            </div>
        </form>
      </Form>
        
      {/* Category Dialog */}
      <Dialog open={showCategorySelector} onOpenChange={setShowCategorySelector}>
          <DialogContent className="sm:max-w-md w-full h-[70vh] sm:h-[600px] p-0 flex flex-col bg-white dark:bg-slate-900 border-none rounded-t-[2rem] sm:rounded-[2rem] fixed bottom-0 sm:bottom-auto sm:top-1/2 sm:-translate-y-1/2">
              <div className="p-4 flex-shrink-0 border-b border-slate-100 dark:border-white/5 flex justify-between items-center bg-white dark:bg-slate-900 rounded-t-[2rem]">
                  <DialogTitle>Kategori Seç</DialogTitle>
                  <Button variant="ghost" size="sm" onClick={() => {setShowCategorySelector(false); setShowCategoryManager(true);}} className="text-indigo-500"><Edit className="h-4 w-4 mr-2" /> Düzenle</Button>
              </div>
              <ScrollArea className="flex-grow p-4 bg-slate-50 dark:bg-black/20">
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                    {categories.filter(c => c.type === form.watch('type')).map(cat => (
                        <div key={cat.id} className="flex flex-col items-center gap-1">
                            <Button variant="outline" className="w-full aspect-square rounded-2xl flex flex-col items-center justify-center h-auto hover:border-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800 shadow-sm" onClick={() => handleCategorySelect(cat.name)}>
                                <span className="text-3xl">{cat.icon}</span>
                            </Button>
                            <span className="text-[10px] font-medium text-center truncate w-full">{cat.name}</span>
                        </div>
                    ))}
                  </div>
              </ScrollArea>
          </DialogContent>
      </Dialog>

      {/* Category Manager */}
      <Dialog open={showCategoryManager} onOpenChange={(open) => { setShowCategoryManager(open); if (!open) setShowCategorySelector(true); }}>
           <DialogContent className="sm:max-w-md h-[80vh] flex flex-col bg-white dark:bg-slate-900 border-none rounded-t-[2rem] sm:rounded-[2rem] p-0 fixed bottom-0 sm:bottom-auto sm:top-1/2 sm:-translate-y-1/2">
               <div className="p-4 h-full"><BudgetCategoryForm onBack={() => { setShowCategoryManager(false); setShowCategorySelector(true); }}/></div>
           </DialogContent>
      </Dialog>
    </div>
  );
}