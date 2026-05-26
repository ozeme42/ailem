
"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { format, parse } from "date-fns";
import { tr } from "date-fns/locale";
import { CalendarIcon, Loader2, Code, FileJson, User, BookOpen, Calendar as CalendarLucide, Copy, Check, Info } from "lucide-react";

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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip";

// --- DESIGN SYSTEM: Glassmorphism ---
const glassColors = {
    INPUT_BG: "bg-slate-900/50 border-white/10 text-slate-100 placeholder:text-slate-500 focus:border-indigo-500/50 hover:bg-slate-900/70 transition-colors",
    LABEL: "text-slate-300 font-medium text-xs uppercase tracking-wider mb-1.5 flex items-center gap-2",
    BUTTON_PRIMARY: "bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/20 transition-all hover:scale-[1.02]",
    POPOVER_BG: "bg-slate-950 border-white/10 text-slate-200",
    CODE_AREA: "bg-black/40 font-mono text-sm border-white/10 text-emerald-400 placeholder:text-slate-600 focus:ring-emerald-500/20",
    ICON_BUTTON: "h-6 px-2 text-[10px] bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white border border-white/5 transition-colors rounded-md ml-auto"
};

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
    "id": "q1",
    "text": "Soru metni buraya...",
    "options": ["A Seçeneği", "B Seçeneği", "C Seçeneği", "D Seçeneği"],
    "answer": "A Seçeneği"
  }
]`;

export function NewJsonTestForm({ familyMembers, onFormSubmit, initialData }: NewJsonTestFormProps) {
  const { toast } = useToast();
  const [loading, setLoading] = React.useState(false);
  const [copied, setCopied] = React.useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: initialData?.title || "",
      subject: initialData?.subject || "",
      assigneeId: initialData?.studentId || undefined,
      dueDate: initialData?.dueDate ? parse(initialData.dueDate, 'dd MMMM yyyy', new Date(), { locale: tr }) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      jsonContent: initialData?.jsonQuestions ? JSON.stringify(initialData.jsonQuestions, null, 2) : "",
    },
  });

  React.useEffect(() => {
    if (initialData) {
      form.reset({
        title: initialData.title,
        subject: initialData.subject,
        assigneeId: undefined, // Atama yaparken öğrenciyi her seferinde seçtir
        dueDate: initialData.dueDate ? parse(initialData.dueDate, 'dd MMMM yyyy', new Date(), { locale: tr }) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        jsonContent: initialData.jsonQuestions ? JSON.stringify(initialData.jsonQuestions, null, 2) : "",
      });
    }
  }, [initialData, form]);

  const handleCopySample = () => {
    navigator.clipboard.writeText(sampleJsonPlaceholder);
    setCopied(true);
    toast({
        title: "Kopyalandı",
        description: "Örnek JSON formatı panoya kopyalandı.",
        className: "bg-slate-900 border-white/10 text-white"
    });
    
    if (!form.getValues("jsonContent")) {
        form.setValue("jsonContent", sampleJsonPlaceholder);
    }

    setTimeout(() => setCopied(false), 2000);
  };

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
      toast({ title: 'Hata', description: 'İşlem sırasında bir sorun oluştu.', variant: 'destructive' });
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="flex-1 flex flex-col h-full overflow-hidden">
        <ScrollArea className="flex-1 -mx-6 px-6">
            <div className="space-y-6 py-4 pt-2">
                
                <div className="p-4 rounded-2xl bg-indigo-500/5 border border-indigo-500/20 flex items-start gap-3">
                    <Info className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
                    <p className="text-xs text-slate-400 leading-relaxed">
                        Yazılı testler metin tabanlı sorulardan oluşur. Soru metnini, şıkları ve doğru cevabı JSON formatında girerek atama yapabilirsiniz.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <FormField control={form.control} name="title" render={({ field }) => (
                        <FormItem>
                            <FormLabel className={glassColors.LABEL}><FileJson className="w-3.5 h-3.5 text-indigo-400"/> Test Başlığı</FormLabel>
                            <FormControl><Input placeholder="Örn: 1. Dönem Tekrar Testi" {...field} className={glassColors.INPUT_BG}/></FormControl>
                            <FormMessage />
                        </FormItem>
                    )}/>
                    
                    <FormField control={form.control} name="subject" render={({ field }) => (
                        <FormItem>
                            <FormLabel className={glassColors.LABEL}><BookOpen className="w-3.5 h-3.5 text-pink-400"/> Ders</FormLabel>
                            <FormControl><Input placeholder="Örn: Matematik" {...field} className={glassColors.INPUT_BG}/></FormControl>
                            <FormMessage />
                        </FormItem>
                    )}/>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <FormField control={form.control} name="assigneeId" render={({ field }) => (
                        <FormItem>
                            <FormLabel className={glassColors.LABEL}><User className="w-3.5 h-3.5 text-emerald-400"/> Öğrenci Seçin</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                    <SelectTrigger className={glassColors.INPUT_BG}>
                                        <SelectValue placeholder="Atanacak öğrenci..." />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent className={glassColors.POPOVER_BG}>
                                    {familyMembers.map((member) => (<SelectItem key={member.id} value={member.id} className="text-slate-200 focus:bg-white/10 focus:text-white">{member.name}</SelectItem>))}
                                </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                    )}/>
                    
                    <FormField control={form.control} name="dueDate" render={({ field }) => (
                        <FormItem className="flex flex-col">
                            <FormLabel className={glassColors.LABEL}><CalendarLucide className="w-3.5 h-3.5 text-blue-400"/> Bitiş Tarihi</FormLabel>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <FormControl>
                                        <Button variant={"outline"} className={cn("w-full h-10 pl-3 text-left font-normal", !field.value && "text-muted-foreground", glassColors.INPUT_BG)}>
                                            {field.value ? format(field.value, "d MMMM yyyy", { locale: tr }) : <span>Tarih seçin</span>}
                                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                        </Button>
                                    </FormControl>
                                </PopoverTrigger>
                                <PopoverContent className={cn("w-auto p-0", glassColors.POPOVER_BG)} align="start">
                                    <Calendar 
                                        mode="single" 
                                        selected={field.value} 
                                        onSelect={field.onChange} 
                                        disabled={(date) => date < new Date()} 
                                        initialFocus 
                                        className="bg-slate-950 text-slate-200 rounded-md border border-white/10"
                                    />
                                </PopoverContent>
                            </Popover>
                            <FormMessage />
                        </FormItem>
                    )}/>
                </div>

                <FormField control={form.control} name="jsonContent" render={({ field }) => (
                    <FormItem className="flex-1 flex flex-col min-h-0">
                        <div className="flex items-center justify-between">
                            <FormLabel className={glassColors.LABEL}><Code className="w-3.5 h-3.5 text-yellow-400"/> Soru Verileri (JSON)</FormLabel>
                            <Button 
                                type="button" 
                                variant="ghost" 
                                size="sm" 
                                onClick={handleCopySample} 
                                className={glassColors.ICON_BUTTON}
                            >
                                {copied ? <Check className="w-3 h-3 mr-1.5 text-emerald-400" /> : <Copy className="w-3 h-3 mr-1.5" />}
                                {copied ? "Kopyalandı" : "Örnek Şablon"}
                            </Button>
                        </div>
                        <FormControl>
                            <div className="relative group">
                                <Textarea 
                                    placeholder={sampleJsonPlaceholder} 
                                    className={cn("h-72 font-mono text-xs leading-relaxed resize-none custom-scrollbar", glassColors.CODE_AREA)} 
                                    {...field} 
                                />
                                <div className="absolute bottom-2 right-2 text-[10px] text-slate-500 font-mono bg-black/60 px-2 py-1 rounded border border-white/5 opacity-50 group-hover:opacity-100 transition-opacity">JSON EDITOR</div>
                            </div>
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )}/>
            </div>
        </ScrollArea>
        
        <div className="pt-6 border-t border-white/5 mt-auto">
            <Button type="submit" className={cn("w-full h-12 text-base font-bold", glassColors.BUTTON_PRIMARY)} disabled={loading}>
            {loading ? (
                <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Kaydediliyor...
                </>
            ) : (
                initialData ? 'Ödevi Onayla ve Ata' : 'Yazılı Ödevini Oluştur'
            )}
            </Button>
        </div>
      </form>
    </Form>
  );
}
