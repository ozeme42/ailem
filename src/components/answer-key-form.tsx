"use client";

import * as React from "react";
import { z } from "zod";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "./ui/button";
import { Form, FormControl, FormField, FormItem } from "./ui/form";
import { RadioGroup, RadioGroupItem } from "./ui/radio-group";
import { ScrollArea } from "./ui/scroll-area";
import { DialogFooter } from "./ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Check, Save } from "lucide-react";
import { Label } from "@/components/ui/label";

// --- DESIGN SYSTEM: Modern & Light Glassmorphism ---
const glassColors = {
    // Liste elemanları için daha ferah, satır çizgili görünüm
    ITEM_BG: "flex items-center justify-between p-3 border-b border-white/[0.06] hover:bg-white/[0.04] transition-colors last:border-0",
    
    // Seçenek butonları: Daha büyük, okunabilir ve modern etkileşimli
    OPTION_BUTTON: `
        flex items-center justify-center w-10 h-10 rounded-xl border text-sm font-bold transition-all cursor-pointer
        bg-white/[0.03] border-white/10 text-slate-400 
        hover:bg-indigo-500/10 hover:text-indigo-300 hover:border-indigo-500/30 hover:scale-105
        peer-data-[state=checked]:bg-indigo-600 
        peer-data-[state=checked]:text-white 
        peer-data-[state=checked]:border-indigo-500 
        peer-data-[state=checked]:shadow-[0_0_20px_rgba(79,70,229,0.3)] 
        peer-data-[state=checked]:scale-105
    `,
    
    // Kaydet butonu
    BUTTON_PRIMARY: "bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/25 transition-all hover:scale-[1.02]",
    
    // Soru numarası etiketi
    NUMBER_BADGE: "flex items-center justify-center w-8 h-8 rounded-lg bg-white/5 text-slate-300 font-mono text-sm border border-white/5",
};

type AnswerKey = { [key: number | string]: string };

const formSchema = z.object({
  answers: z.array(
    z.object({
      questionNumber: z.number(),
      value: z.string().nullable(),
    })
  ),
});

type AnswerKeyFormProps = {
  totalQuestions: number;
  answerKey: AnswerKey;
  onSave: (newKey: AnswerKey) => void;
};

export function AnswerKeyForm({ totalQuestions, answerKey, onSave }: AnswerKeyFormProps) {
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      answers: Array.from({ length: totalQuestions }, (_, i) => ({
        questionNumber: i + 1,
        value: answerKey[i + 1] || null,
      })),
    },
  });

  React.useEffect(() => {
    form.reset({
      answers: Array.from({ length: totalQuestions }, (_, i) => ({
        questionNumber: i + 1,
        value: answerKey[i + 1] || null,
      })),
    });
  }, [totalQuestions, answerKey, form]);

  const { fields } = useFieldArray({
    control: form.control,
    name: "answers",
  });

  const onSubmit = (data: z.infer<typeof formSchema>) => {
    const newKey: AnswerKey = {};
    data.answers.forEach((ans) => {
      if (ans.value) {
        newKey[ans.questionNumber] = ans.value;
      }
    });
    onSave(newKey);
    toast({ 
        title: "Başarılı", 
        description: "Cevap anahtarı güncellendi.", 
        className: "bg-emerald-900/20 border-emerald-500/30 text-emerald-200" 
    });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col h-full">
        {/* Başlık Satırı */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-white/10 text-xs font-semibold text-slate-500 uppercase tracking-wider bg-white/[0.02]">
            <span>Soru No</span>
            <span className="mr-12">Seçenekler</span>
        </div>

        <ScrollArea className="flex-1 -mr-4 pr-4">
          <div className="flex flex-col">
            {fields.map((field, index) => (
              <FormField
                key={field.id}
                control={form.control}
                name={`answers.${index}.value`}
                render={({ field }) => (
                  <FormItem className={cn("space-y-0", glassColors.ITEM_BG)}>
                    <div className="flex items-center gap-3">
                        <div className={glassColors.NUMBER_BADGE}>
                            {index + 1}
                        </div>
                    </div>
                    
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        value={field.value || ""}
                        className="flex items-center gap-2"
                      >
                        {["A", "B", "C", "D", "E"].map((option) => (
                          <FormItem
                            key={option}
                            className="flex items-center space-x-0 space-y-0"
                          >
                            <FormControl>
                              <div className="relative">
                                  {/* Gizli Radio Input */}
                                  <RadioGroupItem 
                                    value={option} 
                                    id={`q${index}-${option}`} 
                                    className="peer sr-only" 
                                  />
                                  
                                  {/* Görsel Buton (Label) */}
                                  <Label 
                                    htmlFor={`q${index}-${option}`}
                                    className={glassColors.OPTION_BUTTON}
                                  >
                                    {option}
                                  </Label>
                              </div>
                            </FormControl>
                          </FormItem>
                        ))}
                      </RadioGroup>
                    </FormControl>
                  </FormItem>
                )}
              />
            ))}
          </div>
        </ScrollArea>
        
        <DialogFooter className="pt-4 mt-auto border-t border-white/10">
          <Button type="submit" size="lg" className={cn("w-full sm:w-auto font-semibold rounded-xl", glassColors.BUTTON_PRIMARY)}>
            <Save className="w-4 h-4 mr-2" />
            Anahtarı Kaydet
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
}