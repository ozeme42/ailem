
"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { CalendarIcon, Edit, Banknote, Landmark, CreditCard, Wallet, ChevronRight, ChevronLeft } from "lucide-react";
import { format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, addMonths, subMonths, getDay, isSameDay, isToday, subDays } from "date-fns";
import { tr } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useAuth } from "@/components/auth-provider";
import { Account, FamilyMember, Transaction, BudgetCategory, TransactionTemplate } from "@/lib/data";
import { DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  accountId: z.string({ required_error: "Hesap seçimi zorunludur." }).min(1, "Hesap seçimi zorunludur."),
  category: z.string().optional(),
  date: z.date({ required_error: "Tarih seçiniz" }),
  isInstallment: z.boolean().default(false),
  isRecurring: z.boolean().default(false),
  installmentCount: z.coerce.number().optional(),
  description: z.string().optional(),
  saveAsTemplate: z.boolean().default(false).optional(),
  templateName: z.string().optional(),
});

type NewTransactionFormProps = {
  accounts: Account[];
  familyMembers: FamilyMember[];
  onSubmit: (data: any) => void; 
  initialData?: Transaction | null;
  onAddNewAccount?: () => void;
  transactionTemplates?: TransactionTemplate[];
  onSaveTemplate?: (templateData: Omit<TransactionTemplate, 'id' | 'familyId'>) => void;
};

const accountIcons: { [key: string]: React.ElementType } = { 'cash': Banknote, 'bank': Landmark, 'credit-card': CreditCard, 'other': Wallet, 'debt': Wallet };

export function NewTransactionForm({ accounts, familyMembers, onSubmit, initialData, transactionTemplates, onSaveTemplate }: NewTransactionFormProps) {
  const [categories, setCategories] = React.useState<BudgetCategory[]>([]);
  const [showCategorySelector, setShowCategorySelector] = React.useState(false);
  const [showAccountSelector, setShowAccountSelector] = React.useState(false);
  const [showCategoryManager, setShowCategoryManager] = React.useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = React.useState(false);

  const { user } = useAuth();
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      amount: undefined,
      type: 'expense',
      accountId: undefined,
      category: "",
      date: new Date(),
      isInstallment: false,
      isRecurring: false,
      installmentCount: 2,
      description: "",
      saveAsTemplate: false,
      templateName: "",
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
        isRecurring: initialData.isRecurring || false,
        installmentCount: initialData.installmentDetails?.total || 2,
        description: initialData.description || "",
      });
    }
  }, [initialData, form, user]);

  React.useEffect(() => {
      const unsub = onBudgetCategoriesUpdate(setCategories);
      return () => unsub();
  }, []);

  const handleCategorySelect = (categoryName: string) => {
      form.setValue('category', categoryName, { shouldValidate: true });
      setShowCategorySelector(false);
  }

  const handleAccountSelect = (accountId: string) => {
      form.setValue('accountId', accountId, { shouldValidate: true });
      setShowAccountSelector(false);
  }

  function handleFormSubmit(values: z.infer<typeof formSchema>) {
    const dataToSend = {
      ...values,
      category: values.category || 'Diğer',
      date: format(values.date, 'yyyy-MM-dd'),
      ...(values.isInstallment && { installmentDetails: { total: values.installmentCount || 1, current: 1 } })
    };
    
    if (values.saveAsTemplate && onSaveTemplate) {
        onSaveTemplate({
            name: values.templateName || values.description || values.category || 'Yeni Şablon',
            amount: values.amount,
            type: values.type,
            accountId: values.accountId,
            category: values.category || 'Diğer',
            description: values.description,
        });
    }

    const { saveAsTemplate, templateName, ...finalDataToSend } = dataToSend;
    onSubmit(finalDataToSend);
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
                
                {/* Hızlı İşlemler (Şablonlar) */}
                {transactionTemplates && transactionTemplates.length > 0 && !initialData && (
                    <div className="mt-3 flex gap-2 overflow-x-auto pb-1 scrollbar-hide px-1">
                        {transactionTemplates.map(template => (
                            <Button 
                                key={template.id} 
                                type="button" 
                                variant="outline" 
                                size="sm" 
                                className="h-8 rounded-full text-[11px] font-semibold shrink-0 bg-white dark:bg-slate-800"
                                onClick={() => {
                                    form.setValue('type', template.type);
                                    form.setValue('category', template.category);
                                    if (template.accountId && accounts.some(a => a.id === template.accountId)) {
                                        form.setValue('accountId', template.accountId);
                                    }
                                    if (template.description) form.setValue('description', template.description);
                                    if (template.amount) form.setValue('amount', template.amount);
                                }}
                            >
                                {template.name}
                            </Button>
                        ))}
                    </div>
                )}
            </div>
            
            {/* Body: Kaydırılabilir (Scrollable) */}
            <div className="flex-grow overflow-y-auto p-4 space-y-4">
                
                {/* Tutar */}
                <div className="flex flex-col items-center py-4 bg-slate-50/50 dark:bg-white/[0.02] rounded-[24px] mb-2 border border-slate-100 dark:border-white/5">
                    <FormField control={form.control} name="amount" render={({ field }) => (
                        <FormItem className="w-full text-center space-y-0 relative">
                            <div className="flex items-center justify-center relative">
                                <span className={cn("text-4xl font-bold mr-1 absolute left-6 sm:left-12", transactionType === 'income' ? "text-emerald-500" : "text-rose-500")}>₺</span>
                                <FormControl>
                                    <Input 
                                        type="number" step="any" placeholder="0" {...field} value={field.value ?? ''} 
                                        className={cn("bg-transparent border-none text-6xl font-black h-20 text-center w-full focus-visible:ring-0 placeholder:text-slate-300 dark:placeholder:text-slate-800 tracking-tight", transactionType === 'income' ? "text-emerald-500" : "text-rose-500")} 
                                    />
                                </FormControl>
                            </div>
                            <FormMessage className="text-center text-xs mt-1" />
                        </FormItem>
                    )}/>
                </div>

                {/* Hızlı Tarih Seçimi */}
                <div className="flex items-center gap-2">
                    <Button type="button" variant={isToday(form.watch('date')) ? "default" : "outline"} className={cn("flex-1 h-11 rounded-xl font-bold text-sm transition-all", isToday(form.watch('date')) ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/20" : "bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300")} onClick={() => form.setValue('date', new Date())}>Bugün</Button>
                    <Button type="button" variant={isSameDay(form.watch('date'), subDays(new Date(), 1)) ? "default" : "outline"} className={cn("flex-1 h-11 rounded-xl font-bold text-sm transition-all", isSameDay(form.watch('date'), subDays(new Date(), 1)) ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/20" : "bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300")} onClick={() => form.setValue('date', subDays(new Date(), 1))}>Dün</Button>
                    <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                        <PopoverTrigger asChild>
                            <Button type="button" variant="outline" className={cn("w-14 h-11 rounded-xl p-0 shrink-0 transition-all", (!isToday(form.watch('date')) && !isSameDay(form.watch('date'), subDays(new Date(), 1))) ? "bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-500/20" : "bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300")}>
                                <CalendarIcon className="h-5 w-5" />
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[300px] p-0 rounded-3xl overflow-hidden border-none shadow-2xl z-50" align="end" sideOffset={10}>
                            <CustomEmbeddedCalendar selected={form.watch('date')} onSelect={(date) => { form.setValue('date', date); setIsCalendarOpen(false); }} />
                        </PopoverContent>
                    </Popover>
                </div>

                {/* Hesap (Hızlı Seçim) */}
                <div className="space-y-2">
                    <div className="flex justify-between items-center ml-1">
                        <FormLabel className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Hesap</FormLabel>
                    </div>
                    <div className="flex gap-2.5 overflow-x-auto pb-2 scrollbar-hide px-1">
                        {filteredAccounts.map(acc => {
                            const Icon = accountIcons[acc.type] || Banknote;
                            const isSelected = selectedAccountId === acc.id;
                            return (
                                <div key={acc.id} onClick={() => handleAccountSelect(acc.id)} className={cn("flex items-center gap-2 px-4 py-3 rounded-[16px] cursor-pointer shrink-0 transition-all border", isSelected ? 'bg-indigo-50 border-indigo-500 dark:bg-indigo-500/20 dark:border-indigo-500/50 shadow-sm' : 'bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 hover:border-indigo-300 dark:hover:border-indigo-700/50')}>
                                    <Icon className={cn("h-5 w-5", isSelected ? "text-indigo-600 dark:text-indigo-400" : "text-slate-500")} /> 
                                    <span className={cn("text-[14px] font-bold", isSelected ? "text-indigo-700 dark:text-indigo-300" : "text-slate-700 dark:text-slate-300")}>{acc.name}</span>
                                </div>
                            )
                        })}
                    </div>
                    {errors.accountId && <p className="text-xs font-medium text-rose-500 ml-1">{errors.accountId.message}</p>}
                </div>

                {/* Kategori (Hızlı Seçim) */}
                <div className="space-y-2">
                    <div className="flex justify-between items-center ml-1">
                        <FormLabel className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Kategori</FormLabel>
                        <button type="button" className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider bg-indigo-50 dark:bg-indigo-500/10 px-2 py-1 rounded-md" onClick={() => setShowCategorySelector(true)}>TÜMÜ</button>
                    </div>
                    <div className="flex gap-2.5 overflow-x-auto pb-2 scrollbar-hide px-1">
                        {categories.filter(c => c.type === transactionType).slice(0, 10).map(cat => (
                            <div key={cat.id} onClick={() => handleCategorySelect(cat.name)} className={cn("flex flex-col items-center justify-center gap-1.5 p-2 rounded-[18px] cursor-pointer shrink-0 w-[76px] h-[76px] transition-all border", selectedCategory?.name === cat.name ? 'bg-indigo-50 border-indigo-500 dark:bg-indigo-500/20 dark:border-indigo-500/50 shadow-sm scale-105' : 'bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 hover:border-indigo-300 dark:hover:border-indigo-700/50')}>
                                <span className="text-[28px] drop-shadow-sm leading-none">{cat.icon}</span>
                                <span className={cn("text-[10px] font-bold truncate w-full text-center", selectedCategory?.name === cat.name ? "text-indigo-700 dark:text-indigo-300" : "text-slate-600 dark:text-slate-400")}>{cat.name}</span>
                            </div>
                        ))}
                    </div>
                    {!selectedCategory && <p className="text-xs font-medium text-rose-500 ml-1">Kategori seçimi zorunludur</p>}
                </div>

                {/* Açıklama */}
                <div className="space-y-1.5">
                    <FormLabel className="text-[11px] font-bold text-slate-500 uppercase tracking-wider ml-1">Açıklama (Opsiyonel)</FormLabel>
                    <FormField control={form.control} name="description" render={({ field }) => (
                        <FormItem>
                            <FormControl>
                                <Input placeholder="Örn: Pazar alışverişi" className="h-12 rounded-[16px] bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 font-medium px-4 focus-visible:ring-indigo-500/30 text-[15px]" {...field} value={field.value ?? ''} />
                            </FormControl>
                        </FormItem>
                    )}/>
                </div>

                {/* Gelişmiş Seçenekler (Accordion) */}
                <Accordion type="single" collapsible className="w-full">
                    <AccordionItem value="advanced" className="border-none bg-slate-50/50 dark:bg-white/[0.02] rounded-2xl px-3 mt-2">
                        <AccordionTrigger className="text-xs font-bold text-slate-500 uppercase tracking-wider py-3 hover:no-underline">
                            Gelişmiş Seçenekler (Taksit, Şablon)
                        </AccordionTrigger>
                        <AccordionContent className="space-y-5 pt-2 pb-4">
                            {/* Taksit ve Abonelik (Sadece Gider) */}
                            {transactionType === 'expense' && (
                                <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 shadow-sm space-y-3">
                                    <FormField control={form.control} name="isRecurring" render={({ field }) => (
                                        <FormItem className="flex items-center justify-between space-y-0">
                                            <FormLabel className="text-sm font-medium">Sabit Gider (Abonelik vb.)</FormLabel>
                                            <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                                        </FormItem>
                                    )}/>
                                    
                                    {!form.watch('isRecurring') && (
                                        <FormField control={form.control} name="isInstallment" render={({ field }) => (
                                            <FormItem className="flex items-center justify-between space-y-0 pt-2 border-t border-dashed border-slate-200 dark:border-white/10">
                                                <FormLabel className="text-sm font-medium">Taksitli İşlem</FormLabel>
                                                <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                                            </FormItem>
                                        )}/>
                                    )}
                                    
                                    {isInstallment && !form.watch('isRecurring') && (
                                        <FormField control={form.control} name="installmentCount" render={({ field }) => (
                                            <FormItem className="flex items-center gap-3 space-y-0 pt-2 border-t border-dashed border-slate-200 dark:border-white/10">
                                                <FormLabel className="text-sm text-slate-500">Taksit Sayısı:</FormLabel>
                                                <FormControl>
                                                    <div className="flex items-center gap-2">
                                                        <Input type="number" {...field} value={field.value ?? ''} className="w-16 h-8 text-center bg-slate-50 dark:bg-black/20 rounded-lg" />
                                                        <span className="text-sm font-medium">Ay</span>
                                                    </div>
                                                </FormControl>
                                            </FormItem>
                                        )}/>
                                    )}
                                </div>
                            )}

                            {/* Şablon Olarak Kaydet */}
                            {!initialData && (
                                <div className="p-3 rounded-xl bg-indigo-50/50 dark:bg-indigo-900/10 border border-indigo-100 dark:border-indigo-900/30 space-y-3">
                                    <FormField control={form.control} name="saveAsTemplate" render={({ field }) => (
                                        <FormItem className="flex items-center justify-between space-y-0">
                                            <FormLabel className="text-sm font-medium text-indigo-700 dark:text-indigo-300">Hızlı İşlem Şablonu Olarak Kaydet</FormLabel>
                                            <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                                        </FormItem>
                                    )}/>
                                    {form.watch('saveAsTemplate') && (
                                        <FormField control={form.control} name="templateName" render={({ field }) => (
                                            <FormItem>
                                                <FormControl>
                                                    <Input placeholder="Şablon Adı (Örn: Haftalık Pazar)" className="h-10 rounded-lg bg-white dark:bg-slate-900 border-indigo-200 dark:border-indigo-900/50" {...field} value={field.value ?? ''} />
                                                </FormControl>
                                            </FormItem>
                                        )}/>
                                    )}
                                </div>
                            )}
                        </AccordionContent>
                    </AccordionItem>
                </Accordion>
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
          <DialogContent className="sm:max-w-md w-full h-auto max-h-[80vh] p-0 flex flex-col bg-white dark:bg-slate-900 border-none rounded-t-[2rem] sm:rounded-[2rem] fixed bottom-0 sm:bottom-auto sm:top-1/2 sm:-translate-y-1/2">
              <div className="p-4 flex-shrink-0 border-b border-slate-100 dark:border-white/5 flex justify-between items-center bg-white dark:bg-slate-900 rounded-t-[2rem]">
                  <DialogTitle>Kategori Seç</DialogTitle>
                  <Button variant="ghost" size="sm" onClick={() => {setShowCategorySelector(false); setShowCategoryManager(true);}} className="text-indigo-500"><Edit className="h-4 w-4 mr-2" /> Düzenle</Button>
              </div>
              <ScrollArea className="flex-grow p-4 bg-slate-50 dark:bg-black/20 max-h-[60vh]">
                  <div className="grid grid-cols-4 sm:grid-cols-5 gap-3">
                    {categories.filter(c => c.type === form.watch('type')).map(cat => (
                        <div key={cat.id} className="flex flex-col items-center gap-1">
                            <Button variant="outline" className="w-full aspect-square rounded-2xl flex flex-col items-center justify-center h-auto hover:border-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800 shadow-sm" onClick={() => handleCategorySelect(cat.name)}>
                                <span className="text-3xl">{cat.icon}</span>
                            </Button>
                            <span className="text-[10px] font-medium text-center truncate w-full">{cat.name}</span>
                        </div>
                    ))}
                    <div className="flex flex-col items-center gap-1">
                        <Button type="button" variant="outline" className="w-full aspect-square rounded-2xl flex flex-col items-center justify-center h-auto hover:border-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 border-dashed border-2 border-slate-300 dark:border-white/20 bg-transparent shadow-sm" onClick={() => {setShowCategorySelector(false); setShowCategoryManager(true);}}>
                            <span className="text-3xl text-slate-400 font-light">+</span>
                        </Button>
                        <span className="text-[10px] font-medium text-center truncate w-full text-slate-500">Yeni Ekle</span>
                    </div>
                  </div>
              </ScrollArea>
          </DialogContent>
      </Dialog>

      {/* Account Dialog */}
      <Dialog open={showAccountSelector} onOpenChange={setShowAccountSelector}>
          <DialogContent className="sm:max-w-md w-full h-auto max-h-[80vh] p-0 flex flex-col bg-white dark:bg-slate-900 border-none rounded-t-[2rem] sm:rounded-[2rem] fixed bottom-0 sm:bottom-auto sm:top-1/2 sm:-translate-y-1/2">
              <div className="p-4 flex-shrink-0 border-b border-slate-100 dark:border-white/5 flex justify-between items-center bg-white dark:bg-slate-900 rounded-t-[2rem]">
                  <DialogTitle>Hesap Seç</DialogTitle>
              </div>
              <ScrollArea className="flex-grow p-4 bg-slate-50 dark:bg-black/20 max-h-[60vh]">
                  <div className="grid grid-cols-4 sm:grid-cols-5 gap-3">
                    {filteredAccounts.map(acc => {
                        const Icon = accountIcons[acc.type] || Banknote;
                        return (
                            <div key={acc.id} className="flex flex-col items-center gap-1">
                                <Button type="button" variant="outline" className="w-full aspect-square rounded-2xl flex flex-col items-center justify-center h-auto hover:border-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800 shadow-sm" onClick={() => handleAccountSelect(acc.id)}>
                                    <Icon className="h-6 w-6 text-slate-600 dark:text-slate-400 mb-1" />
                                    <span className="text-[10px] font-medium text-center truncate w-full px-1">{acc.name}</span>
                                </Button>
                            </div>
                        )
                    })}
                    <div className="flex flex-col items-center gap-1">
                        <Button type="button" variant="outline" className="w-full aspect-square rounded-2xl flex flex-col items-center justify-center h-auto hover:border-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 border-dashed border-2 border-slate-300 dark:border-white/20 bg-transparent shadow-sm" onClick={() => {setShowAccountSelector(false); if(onAddNewAccount) onAddNewAccount();}}>
                            <span className="text-3xl text-slate-400 font-light">+</span>
                        </Button>
                        <span className="text-[10px] font-medium text-center truncate w-full text-slate-500">Yeni Ekle</span>
                    </div>
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

