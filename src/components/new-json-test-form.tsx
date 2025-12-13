
"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { CalendarIcon, Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { FamilyMember, Test } from "@/lib/data";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "./ui/scroll-area";

const jsonQuestionSchema = z.object({
  id: z.string(),
  text: z.string(),
  options: z.array(z.string()),
  answer: z.string(),
});

const formSchema = z.object({
  title: z.string().min(3, "Başlık en az 3 karakter olmalıdır."),
  subject: z.string().min(2, "Ders adı zorunludur."),
  assigneeId: z.string({ required_error: "Lütfen bir sorumlu seçin." }),
  dueDate: z.date({ required_error: "Lütfen bir bitiş tarihi seçin." }),
  jsonContent: z.string().min(1, "Lütfen JSON verisi girin.").refine((val) => {
    try {
      const parsed = JSON.parse(val);
      return Array.isArray(parsed) && parsed.every(q => jsonQuestionSchema.safeParse(q).success);
    } catch {
      return false;
    }
  }, { message: "Geçersiz JSON formatı veya yapısı." }),
});

type NewJsonTestFormProps = {
  familyMembers: FamilyMember[];
  onFormSubmit: (data: Omit<Test, 'id' | 'familyId'>) => void;
  initialData?: Test | null;
};

const sampleJsonPlaceholder = `[
  {
    "id": "mat001",
    "text": "Bir çiftlikteki tavuk ve koyunların toplam sayısı 50'dir. Bu hayvanların toplam ayak sayısı 140 olduğuna göre, çiftlikte kaç tavuk vardır?",
    "options": ["15", "20", "25", "30"],
    "answer": "30"
  },
  {
    "id": "tr001",
    "text": "Aşağıdaki cümlelerin hangisinde yazım yanlışı yapılmıştır?",
    "options": [
      "Herşey yolunda gibi görünüyordu.",
      "Ankara'ya yarın sabah gideceğim.",
      "Bu konuyu da mı anlamadın?",
      "TBMM'nin açılışı coşkuyla kutlandı."
    ],
    "answer": "Herşey yolunda gibi görünüyordu."
  }
]`;

export function NewJsonTestForm({ familyMembers, onFormSubmit, initialData }: NewJsonTestFormProps) {
  const { toast } = useToast();
  const [loading, setLoading] = React.useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: initialData?.title || "",
      subject: initialData?.subject || "",
      assigneeId: initialData?.studentId || undefined,
      dueDate: initialData?.dueDate ? new Date(initialData.dueDate) : new Date(),
      jsonContent: initialData?.jsonQuestions ? JSON.stringify(initialData.jsonQuestions, null, 2) : "",
    },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setLoading(true);
    try {
      const parsedQuestions = JSON.parse(values.jsonContent);
      const testData = {
        title: values.title,
        subject: values.subject,
        studentId: values.assigneeId,
        questionCount: parsedQuestions.length,
        assignedDate: format(new Date(), 'dd MMMM yyyy', { locale: tr }),
        dueDate: format(values.dueDate, 'dd MMMM yyyy', { locale: tr }),
        sourceType: 'json' as const,
        status: 'Atandı' as const,
        isArchived: false,
        jsonQuestions: parsedQuestions,
      };
      onFormSubmit(testData);
    } catch (err: any) {
      toast({ title: 'Hata', description: 'Test oluşturulurken bir sorun oluştu.', variant: 'destructive' });
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="flex-1 flex flex-col min-h-0">
        <ScrollArea className="flex-1 -mx-6 px-6">
            <div className="space-y-4 py-4">
                <FormField control={form.control} name="title" render={({ field }) => (
                    <FormItem><FormLabel>Test Başlığı</FormLabel><FormControl><Input placeholder="Örn: 1. Dönem Tekrar Testi" {...field} /></FormControl><FormMessage /></FormItem>
                )}/>
                <FormField control={form.control} name="subject" render={({ field }) => (
                    <FormItem><FormLabel>Ders</FormLabel><FormControl><Input placeholder="Matematik" {...field} /></FormControl><FormMessage /></FormItem>
                )}/>
                <FormField control={form.control} name="assigneeId" render={({ field }) => (
                    <FormItem>
                        <FormLabel>Sorumlu Kişi</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl><SelectTrigger><SelectValue placeholder="Birini seçin" /></SelectTrigger></FormControl>
                            <SelectContent>{familyMembers.map((member) => (<SelectItem key={member.id} value={member.id}>{member.name}</SelectItem>))}</SelectContent>
                        </Select>
                        <FormMessage />
                    </FormItem>
                )}/>
                <FormField control={form.control} name="dueDate" render={({ field }) => (
                    <FormItem className="flex flex-col">
                        <FormLabel>Bitiş Tarihi</FormLabel>
                        <Popover>
                            <PopoverTrigger asChild>
                                <FormControl>
                                    <Button variant={"outline"} className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                                        {field.value ? format(field.value, "PPP", { locale: tr }) : <span>Tarih seçin</span>}
                                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                    </Button>
                                </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value} onSelect={field.onChange} disabled={(date) => date < new Date()} initialFocus /></PopoverContent>
                        </Popover>
                        <FormMessage />
                    </FormItem>
                )}/>
                <FormField control={form.control} name="jsonContent" render={({ field }) => (
                    <FormItem>
                        <FormLabel>Sorular (JSON Formatında)</FormLabel>
                        <FormControl><Textarea placeholder={sampleJsonPlaceholder} className="h-48 font-mono text-xs" {...field} /></FormControl>
                        <FormMessage />
                    </FormItem>
                )}/>
            </div>
        </ScrollArea>
        <div className="pt-4 border-t mt-auto">
            <Button type="submit" className="w-full" disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {initialData ? 'Değişiklikleri Kaydet' : 'Testi Oluştur ve Ata'}
            </Button>
        </div>
      </form>
    </Form>
  );
}
