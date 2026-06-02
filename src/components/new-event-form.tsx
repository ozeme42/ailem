
"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { format, parseISO } from "date-fns";
import { tr } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";
import { DateRange } from "react-day-picker";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { CalendarEvent } from "@/lib/data";
import { addCalendarEvent, updateCalendarEvent } from "@/lib/dataService";

const formSchema = z.object({
  title: z.string().min(2, "Başlık en az 2 karakter olmalıdır."),
  recurrence: z.enum(['one-time', 'monthly', 'yearly']),
  dateRange: z.object({
      from: z.date({ required_error: "Bir başlangıç tarihi seçmelisiniz." }),
      to: z.date().optional(),
  }),
  category: z.string().optional(),
  color: z.string().optional(),
  reminderMinutes: z.coerce.number().optional(),
});

type NewEventFormProps = {
  onSave: () => void;
  initialData?: CalendarEvent | null;
};

export function NewEventForm({ onSave, initialData }: NewEventFormProps) {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      recurrence: "one-time",
      dateRange: {
        from: new Date(),
        to: undefined,
      },
      category: "Genel",
      color: "bg-slate-500",
      reminderMinutes: 0,
    },
  });

  React.useEffect(() => {
    if (initialData) {
      form.reset({
        title: initialData.title,
        recurrence: initialData.recurrence,
        dateRange: {
          from: parseISO(initialData.startDate),
          to: initialData.endDate ? parseISO(initialData.endDate) : undefined
        },
        category: initialData.category || "Genel",
        color: initialData.color || "bg-slate-500",
        reminderMinutes: initialData.reminderMinutes || 0,
      });
    } else {
      form.reset({
        title: "",
        recurrence: "one-time",
        dateRange: { from: new Date(), to: undefined },
        category: "Genel",
        color: "bg-slate-500",
        reminderMinutes: 0,
      });
    }
  }, [initialData, form]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    const eventData: Partial<Omit<CalendarEvent, 'id' | 'familyId'>> = {
        title: values.title,
        recurrence: values.recurrence,
        startDate: format(values.dateRange.from, "yyyy-MM-dd"),
        endDate: values.dateRange.to ? format(values.dateRange.to, "yyyy-MM-dd") : undefined,
        category: values.category,
        color: values.color,
        reminderMinutes: values.reminderMinutes,
    };
    
    if (!eventData.endDate) {
      delete eventData.endDate;
    }

    try {
        if (initialData?.id) {
            await updateCalendarEvent(initialData.id, eventData);
        } else {
            await addCalendarEvent(eventData as Omit<CalendarEvent, 'id' | 'familyId'>);
        }
        form.reset();
        onSave();
    } catch(e) {
        console.error("Failed to save event: ", e);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Başlık</FormLabel>
              <FormControl><Input placeholder="Örn: Elif'in Doğum Günü" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField control={form.control} name="recurrence" render={({ field }) => (
            <FormItem>
            <FormLabel>Tekrarlanma</FormLabel>
            <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                <SelectContent>
                <SelectItem value="one-time">Tek Seferlik</SelectItem>
                <SelectItem value="monthly">Aylık</SelectItem>
                <SelectItem value="yearly">Yıllık</SelectItem>
                </SelectContent>
            </Select>
            </FormItem>
        )} />
        
        <FormField
          control={form.control}
          name="dateRange"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Tarih</FormLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    id="date"
                    variant={"outline"}
                    className={cn(
                      "justify-start text-left font-normal",
                      !field.value.from && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {field.value?.from ? (
                      field.value.to ? (
                        <>
                          {format(field.value.from, "LLL dd, y", {locale: tr})} -{" "}
                          {format(field.value.to, "LLL dd, y", {locale: tr})}
                        </>
                      ) : (
                        format(field.value.from, "LLL dd, y", {locale: tr})
                      )
                    ) : (
                      <span>Tarih seçin</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    initialFocus
                    mode="range"
                    defaultMonth={field.value?.from}
                    selected={field.value as DateRange}
                    onSelect={field.onChange}
                    numberOfMonths={1}
                  />
                </PopoverContent>
              </Popover>
            </FormItem>
          )}
        />
        
        <div className="grid grid-cols-2 gap-4">
            <FormField control={form.control} name="category" render={({ field }) => (
                <FormItem>
                <FormLabel>Kategori</FormLabel>
                <Select onValueChange={(val) => {
                    field.onChange(val);
                    // auto color select based on category
                    const colorMap: any = { 
                        'İş/Okul': 'bg-blue-500 text-white', 
                        'Doğum Günü': 'bg-rose-500 text-white', 
                        'Tatil': 'bg-emerald-500 text-white', 
                        'Sağlık': 'bg-amber-500 text-white', 
                        'Genel': 'bg-slate-500 text-white' 
                    };
                    if (colorMap[val]) form.setValue('color', colorMap[val]);
                }} defaultValue={field.value}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                    <SelectItem value="Genel">Genel</SelectItem>
                    <SelectItem value="İş/Okul">İş / Okul</SelectItem>
                    <SelectItem value="Doğum Günü">Doğum Günü</SelectItem>
                    <SelectItem value="Tatil">Tatil</SelectItem>
                    <SelectItem value="Sağlık">Sağlık</SelectItem>
                    </SelectContent>
                </Select>
                </FormItem>
            )} />

            <FormField control={form.control} name="reminderMinutes" render={({ field }) => (
                <FormItem>
                <FormLabel>Hatırlatıcı</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={String(field.value)}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                    <SelectItem value="0">Yok</SelectItem>
                    <SelectItem value="15">15 Dk Önce</SelectItem>
                    <SelectItem value="60">1 Saat Önce</SelectItem>
                    <SelectItem value="1440">1 Gün Önce</SelectItem>
                    </SelectContent>
                </Select>
                </FormItem>
            )} />
        </div>
        
        <Button type="submit" className="w-full">{initialData ? 'Değişiklikleri Kaydet' : 'Hatırlatıcıyı Oluştur'}</Button>
      </form>
    </Form>
  );
}
