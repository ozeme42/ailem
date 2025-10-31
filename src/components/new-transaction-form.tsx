
"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { CalendarIcon, Repeat } from "lucide-react";
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
import { DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "./ui/dialog";
import { Switch } from "./ui/switch";
import { ScrollArea } from "./ui/scroll-area";
import { Tabs, TabsList, TabsTrigger } from "./ui/tabs";
import { onBudgetCategoriesUpdate } from "@/lib/dataService";
import { Separator } from "./ui/separator";

const formSchema = z.object({
  description: z.string().optional(),
  amount: z.coerce.number().positive("Tutar pozitif bir sayı olmalıdır."),
  type: z.enum(['income', 'expense']).default('expense'),
  accountId: z.string({ required_error: "Bir hesap seçmelisiniz." }),
  ownerId: z.string({ required_error: "Bir kişi seçmelisiniz." }),
  category: z.string().min(1, "Kategori zorunludur."),
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

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      description: initialData?.description || "",
      amount: initialData?.amount || undefined,
      type: initialData?.type || 'expense',
      accountId: initialData?.accountId || undefined,
      ownerId: initialData?.ownerId || undefined,
      category: initialData?.category || "",
      date: initialData?.date ? new Date(initialData.date) : new Date(),
      isInstallment: initialData?.isInstallment || false,
      installmentTotal: initialData?.installmentDetails?.total || undefined,
    },
  });
  
  React.useEffect(() => {
      const unsub = onBudgetCategoriesUpdate(setCategories);
      return () => unsub();
  }, []);

  const handleCategorySelect = (categoryName: string) => {
      form.setValue('category', categoryName);
      setShowCategorySelector(false);
  }

  function handleFormSubmit(values: z.infer<typeof formSchema>) {
    onSubmit({
      ...values,
      date: format(values.date, 'yyyy-MM-dd')
    });
    form.reset();
  }

  return (
    <div className="flex flex-col h-full bg-gray-900 text-white">
        <Form {...form}>
        <form onSubmit={form.handleSubmit(handleFormSubmit)} className="flex-grow flex flex-col">
           <DialogHeader className="p-4 bg-gray-800">
                <DialogTitle className="text-center text-xl">{initialData ? "İşlemi Düzenle" : "Gider"}</DialogTitle>
                <Tabs 
                    value={form.watch('type')} 
                    onValueChange={(value) => form.setValue('type', value as 'income' | 'expense')} 
                    className="w-full pt-4"
                >
                    <TabsList className="grid w-full grid-cols-3 bg-gray-700/50">
                        <TabsTrigger value="income">Gelir</TabsTrigger>
                        <TabsTrigger value="expense" className="data-[state=active]:bg-red-600">Gider</TabsTrigger>
                        <TabsTrigger value="transfer" disabled>Havale</TabsTrigger>
                    </TabsList>
                </Tabs>
           </DialogHeader>
           
           <div className="flex-grow p-4 space-y-4">
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
                <Separator className="bg-gray-700"/>
                <FormField control={form.control} name="amount" render={({ field }) => (
                    <FormItem className="flex items-center"><FormLabel className="w-20 text-muted-foreground">Tutar</FormLabel>
                        <FormControl><Input type="number" placeholder="0,00" {...field} className="bg-transparent border-0 text-red-400 text-lg font-bold placeholder:text-red-400/50" /></FormControl>
                    </FormItem>
                )}/>
                <Separator className="bg-gray-700"/>
                <FormField control={form.control} name="category" render={({ field }) => (
                    <FormItem className="flex items-center"><FormLabel className="w-20 text-muted-foreground">Kategori</FormLabel>
                        <FormControl>
                            <Input 
                                placeholder="Kategori seçin" 
                                {...field} 
                                onFocus={() => setShowCategorySelector(true)}
                                className="bg-transparent border-0"
                            />
                        </FormControl>
                    </FormItem>
                )}/>
                 <Separator className="bg-gray-700"/>
                 <FormField control={form.control} name="accountId" render={({ field }) => (
                    <FormItem className="flex items-center"><FormLabel className="w-20 text-muted-foreground">Hesap</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl><SelectTrigger className="bg-transparent border-0"><SelectValue placeholder="Hesap seçin"/></SelectTrigger></FormControl>
                            <SelectContent>{accounts.map(acc => <SelectItem key={acc.id} value={acc.id}>{acc.name}</SelectItem>)}</SelectContent>
                        </Select>
                    </FormItem>
                )}/>
                 <Separator className="bg-gray-700"/>
                 <FormField control={form.control} name="description" render={({ field }) => (
                    <FormItem className="flex items-center"><FormLabel className="w-20 text-muted-foreground">Not</FormLabel>
                        <FormControl><Input placeholder="Not ekle..." {...field} className="bg-transparent border-0" /></FormControl>
                    </FormItem>
                )}/>
           </div>
           
            {showCategorySelector && (
              <div className="absolute inset-x-0 bottom-0 bg-gray-800 border-t border-gray-700 p-4 rounded-t-lg">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="font-semibold">Kategori</h3>
                     <Button variant="ghost" size="icon" onClick={() => setShowCategorySelector(false)}><X className="h-4 w-4"/></Button>
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                      {categories.map(cat => (
                          <Button key={cat.id} variant="secondary" className="flex-col h-16 bg-gray-700 hover:bg-gray-600" onClick={() => handleCategorySelect(cat.name)}>
                              <span>{cat.icon}</span>
                              <span className="text-xs">{cat.name}</span>
                          </Button>
                      ))}
                  </div>
              </div>
            )}
           
            <DialogFooter className="p-4 bg-gray-800 border-t border-gray-700">
                <Button type="submit" className="w-full bg-red-600 hover:bg-red-700">
                    {initialData ? "İşlemi Güncelle" : "İşlemi Kaydet"}
                </Button>
            </DialogFooter>
        </form>
        </Form>
    </div>
  );
}

    