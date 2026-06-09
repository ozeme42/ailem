"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { CalendarIcon, FileText, ChevronLeft, ChevronRight } from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, addMonths, subMonths, getDay, isSameDay, isToday } from "date-fns";
import { tr } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { DialogTitle } from "@/components/ui/dialog";
import { Bill } from "@/lib/data";

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
  title: z.string().min(1, "Fatura adı giriniz"),
  amount: z.coerce.number().positive("Tutar giriniz"),
  dueDate: z.date({ required_error: "Son ödeme tarihi seçiniz" }),
});

type NewBillFormProps = {
  onSubmit: (data: Omit<Bill, 'id' | 'familyId'>) => void; 
  initialData?: Bill | null;
};

export function NewBillForm({ onSubmit, initialData }: NewBillFormProps) {
  const [isCalendarOpen, setIsCalendarOpen] = React.useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      amount: undefined,
      dueDate: new Date(),
    },
  });
  
  React.useEffect(() => {
    if (initialData) {
      form.reset({
        title: initialData.title || "",
        amount: initialData.amount || undefined,
        dueDate: initialData.dueDate ? new Date(initialData.dueDate) : new Date(),
      });
    }
  }, [initialData, form]);

  function handleFormSubmit(values: z.infer<typeof formSchema>) {
    const dataToSend: Omit<Bill, 'id' | 'familyId'> = {
      title: values.title,
      amount: values.amount,
      dueDate: format(values.dueDate, 'yyyy-MM-dd'),
      isPaid: initialData ? initialData.isPaid : false,
      category: 'Fatura'
    };
    onSubmit(dataToSend);
    form.reset();
  }
  
  return (
    <div className="flex flex-col w-full h-full bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 rounded-[2rem] overflow-hidden">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleFormSubmit)} className="flex flex-col h-full overflow-hidden">
            
            {/* Header */}
            <div className="p-4 pt-5 flex-shrink-0 bg-slate-50 dark:bg-white/5 border-b border-slate-100 dark:border-white/5">
                <DialogTitle className="text-center text-lg font-bold mb-2 flex items-center justify-center gap-2">
                    <FileText className="w-5 h-5 text-indigo-500" />
                    {initialData ? "Faturayı Düzenle" : "Yeni Fatura Ekle"}
                </DialogTitle>
            </div>
            
            {/* Body */}
            <div className="flex-grow overflow-y-auto p-4 space-y-5">
                
                {/* Tutar */}
                <div className="flex flex-col items-center py-2">
                    <FormField control={form.control} name="amount" render={({ field }) => (
                        <FormItem className="w-full text-center space-y-0 relative">
                            <div className="flex items-center justify-center relative">
                                <span className="text-3xl font-bold mr-1 absolute left-4 sm:left-12 text-rose-600">₺</span>
                                <FormControl>
                                    <Input 
                                        type="number" step="any" placeholder="0" {...field} value={field.value ?? ''} 
                                        className="bg-transparent border-none text-5xl font-black h-16 text-center w-full focus-visible:ring-0 placeholder:text-slate-300 dark:placeholder:text-slate-700 text-rose-600" 
                                    />
                                </FormControl>
                            </div>
                            <FormMessage className="text-center text-xs mt-1" />
                        </FormItem>
                    )}/>
                </div>

                {/* Başlık */}
                <div className="space-y-2">
                    <FormLabel className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Fatura Adı / Kurum</FormLabel>
                    <div className="flex flex-wrap gap-2">
                        {['Elektrik', 'Doğalgaz', 'İnternet', 'Su'].map((preset) => (
                            <Button 
                                key={preset} 
                                type="button" 
                                variant={form.watch('title') === preset ? 'default' : 'outline'}
                                size="sm"
                                className={cn("rounded-xl h-8 text-xs font-bold transition-all", form.watch('title') === preset ? "bg-indigo-600 text-white shadow-md hover:bg-indigo-700" : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100")}
                                onClick={() => form.setValue('title', preset, { shouldValidate: true })}
                            >
                                {preset}
                            </Button>
                        ))}
                    </div>
                    <FormField control={form.control} name="title" render={({ field }) => (
                        <FormItem>
                            <FormControl>
                                <Input placeholder="Farklı bir fatura adı girin..." {...field} className="h-12 rounded-xl bg-slate-50 border-slate-200 mt-1" />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}/>
                </div>

                {/* Son Ödeme Tarihi */}
                <div className="space-y-1.5">
                    <FormLabel className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Son Ödeme Tarihi</FormLabel>
                    <FormField control={form.control} name="dueDate" render={({ field }) => (
                        <FormItem className="flex flex-col">
                            <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                                <PopoverTrigger asChild>
                                    <FormControl>
                                        <Button variant={"outline"} className={cn("h-12 w-full pl-3 text-left font-medium rounded-xl border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 transition-all", !field.value && "text-muted-foreground")}>
                                            <CalendarIcon className="mr-3 h-5 w-5 text-indigo-500" />
                                            <span className="text-base">{field.value ? format(field.value, "d MMMM yyyy", { locale: tr }) : <span>Tarih seçin</span>}</span>
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
            </div>
            
            {/* Footer */}
            <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-white/5 flex-shrink-0">
                <Button type="submit" className="w-full h-12 text-lg font-bold rounded-xl shadow-lg transition-transform active:scale-95 bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-500/20">
                    {initialData ? "Güncelle" : "Kaydet"}
                </Button>
            </div>
        </form>
      </Form>
    </div>
  );
}
