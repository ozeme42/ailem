
"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import type { FamilyMember, CalendarEvent } from "@/lib/data";
import { addCalendarEvent } from "@/lib/dataService";

const formSchema = z.object({
  title: z.string().min(3, "Başlık en az 3 karakter olmalıdır."),
  category: z.enum(['Okul', 'Spor', 'Aile', 'Doğum Günü', 'Diğer']),
  priority: z.enum(['Yüksek', 'Orta', 'Düşük']),
  date: z.date({ required_error: "Bir tarih seçmelisiniz." }),
  startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Geçerli bir saat girin (HH:mm)."),
  endTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Geçerli bir saat girin (HH:mm).").optional().or(z.literal('')),
  location: z.string().min(2, "Konum en az 2 karakter olmalıdır."),
  description: z.string().optional(),
  attendees: z.array(z.number()).optional(),
});

type NewEventFormProps = {
  familyMembers: FamilyMember[];
  onEventCreated: () => void;
};

export function NewEventForm({ familyMembers, onEventCreated }: NewEventFormProps) {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      category: "Aile",
      priority: "Orta",
      date: new Date(),
      startTime: "10:00",
      attendees: [],
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    const newEvent: Omit<CalendarEvent, 'id'> = {
        ...values,
        date: format(values.date, "yyyy-MM-dd"),
        attendees: values.attendees || [],
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
              <FormLabel>Etkinlik Başlığı</FormLabel>
              <FormControl><Input placeholder="Örn: Veli Toplantısı" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
            <FormField control={form.control} name="category" render={({ field }) => (
                <FormItem>
                <FormLabel>Kategori</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                    {['Okul', 'Spor', 'Aile', 'Doğum Günü', 'Diğer'].map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
                    </SelectContent>
                </Select>
                </FormItem>
            )} />
             <FormField control={form.control} name="priority" render={({ field }) => (
                <FormItem>
                <FormLabel>Öncelik</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                    {['Yüksek', 'Orta', 'Düşük'].map(prio => <SelectItem key={prio} value={prio}>{prio}</SelectItem>)}
                    </SelectContent>
                </Select>
                </FormItem>
            )} />
        </div>
        
        <FormField control={form.control} name="date" render={({ field }) => (
            <FormItem className="flex flex-col"><FormLabel>Tarih</FormLabel>
                <Popover>
                    <PopoverTrigger asChild>
                    <FormControl>
                        <Button variant={"outline"} className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                        {field.value ? format(field.value, "PPP", { locale: tr }) : <span>Tarih seçin</span>}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                    </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={field.value} onSelect={field.onChange} disabled={(date) => date < new Date("1900-01-01")} initialFocus />
                    </PopoverContent>
                </Popover>
                <FormMessage />
            </FormItem>
        )} />

        <div className="grid grid-cols-2 gap-4">
            <FormField control={form.control} name="startTime" render={({ field }) => (
                <FormItem><FormLabel>Başlangıç</FormLabel><FormControl><Input type="time" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="endTime" render={({ field }) => (
                <FormItem><FormLabel>Bitiş (Ops.)</FormLabel><FormControl><Input type="time" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
        </div>
        
        <FormField control={form.control} name="location" render={({ field }) => (
            <FormItem><FormLabel>Konum</FormLabel><FormControl><Input placeholder="Örn: Okul Konferans Salonu" {...field} /></FormControl><FormMessage /></FormItem>
        )} />

        <FormField control={form.control} name="description" render={({ field }) => (
            <FormItem><FormLabel>Açıklama</FormLabel><FormControl><Textarea placeholder="Etkinlik hakkında detaylar..." {...field} /></FormControl></FormItem>
        )} />
        
        <FormField
            control={form.control}
            name="attendees"
            render={() => (
                <FormItem>
                    <div className="mb-4"><FormLabel>Katılımcılar</FormLabel></div>
                    <div className="flex flex-col gap-2">
                        {familyMembers.map((member) => (
                            <FormField
                                key={member.id}
                                control={form.control}
                                name="attendees"
                                render={({ field }) => (
                                    <FormItem key={member.id} className="flex flex-row items-start space-x-3 space-y-0">
                                        <FormControl>
                                            <Checkbox
                                                checked={field.value?.includes(member.id)}
                                                onCheckedChange={(checked) => {
                                                    return checked
                                                    ? field.onChange([...(field.value || []), member.id])
                                                    : field.onChange(field.value?.filter((value) => value !== member.id))
                                                }}
                                            />
                                        </FormControl>
                                        <FormLabel className="font-normal">{member.name}</FormLabel>
                                    </FormItem>
                                )}
                            />
                        ))}
                    </div>
                     <FormMessage />
                </FormItem>
            )}
        />
        
        <Button type="submit" className="w-full">Etkinliği Oluştur</Button>
      </form>
    </Form>
  );
}
