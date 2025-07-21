
"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { format, addDays } from "date-fns";
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
import { addCalendarEvent } from "@/lib/dataService";

const formSchema = z.object({
  title: z.string().min(2, "Başlık en az 2 karakter olmalıdır."),
  recurrence: z.enum(['one-time', 'monthly', 'yearly']),
  dateRange: z.object({
      from: z.date({ required_error: "Bir başlangıç tarihi seçmelisiniz." }),
      to: z.date().optional(),
  }),
});

type NewEventFormProps = {
  onEventCreated: () => void;
};

export function NewEventForm({ onEventCreated }: NewEventFormProps) {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      recurrence: "one-time",
      dateRange: {
        from: new Date(),
        to: undefined,
      }
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    const newEvent: Omit<CalendarEvent, 'id' | 'familyId'> = {
        title: values.title,
        recurrence: values.recurrence,
        startDate: format(values.dateRange.from, "yyyy-MM-dd"),
        endDate: values.dateRange.to ? format(values.dateRange.to, "yyyy-MM-dd") : undefined,
    };
    
    try {
        await addCalendarEvent(newEvent);
        form.reset();
        onEventCreated();
    } catch(e) {
        console.error("Failed to add event: ", e);
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
        
        <Button type="submit" className="w-full">Hatırlatıcıyı Oluştur</Button>
      </form>
    </Form>
  );
}
