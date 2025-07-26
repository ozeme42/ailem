
"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { format } from "date-fns";
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
import type { StudyAssignment, FamilyMember } from "@/lib/data";
import { Textarea } from "./ui/textarea";

const formSchema = z.object({
  studentId: z.string({ required_error: "Lütfen bir öğrenci seçin." }),
  subject: z.string().min(2, "Ders adı en az 2 karakter olmalıdır."),
  topic: z.string().min(2, "Konu adı en az 2 karakter olmalıdır."),
  sources: z.string().optional(),
  dateRange: z.object({
    from: z.date({ required_error: "Bir başlangıç tarihi seçmelisiniz." }),
    to: z.date({ required_error: "Bir bitiş tarihi seçmelisiniz." }),
  }),
});

type NewStudyAssignmentFormProps = {
  students: FamilyMember[];
  availableSubjects: string[];
  onAssign: (data: Omit<StudyAssignment, 'id' | 'familyId' | 'studyPlanId' | 'status'>) => void;
};

export function NewStudyAssignmentForm({ students, availableSubjects, onAssign }: NewStudyAssignmentFormProps) {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      studentId: undefined,
      subject: "",
      topic: "",
      sources: "",
      dateRange: {
        from: new Date(),
        to: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    const assignmentData = {
      studentId: values.studentId,
      subject: values.subject,
      topic: values.topic,
      sources: values.sources ? values.sources.split('\n').filter(s => s.trim() !== '') : [],
      startDate: values.dateRange.from.toISOString(),
      dueDate: values.dateRange.to.toISOString(),
    };
    onAssign(assignmentData);
    form.reset();
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
        <FormField
          control={form.control}
          name="studentId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Öğrenci</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Bir öğrenci seçin" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {students.map((student) => (
                    <SelectItem key={student.id} value={student.id}>
                      {student.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="subject"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Ders</FormLabel>
                <FormControl><Input placeholder="Matematik" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="topic"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Konu</FormLabel>
                <FormControl><Input placeholder="Üslü Sayılar" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        
        <FormField
          control={form.control}
          name="dateRange"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Çalışma Tarihleri</FormLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
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
                          {format(field.value.from, "LLL dd, y", { locale: tr })} -{" "}
                          {format(field.value.to, "LLL dd, y", { locale: tr })}
                        </>
                      ) : (
                        format(field.value.from, "LLL dd, y", { locale: tr })
                      )
                    ) : (
                      <span>Tarih aralığı seçin</span>
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
               <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="sources"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Kaynaklar</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Her satıra bir kaynak linki gelecek şekilde ekleyin..."
                  className="resize-y"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" className="w-full">Atama Yap</Button>
      </form>
    </Form>
  );
}
