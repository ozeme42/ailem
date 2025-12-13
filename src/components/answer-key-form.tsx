"use client";

import * as React from "react";
import { z } from "zod";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "./ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel } from "./ui/form";
import { RadioGroup, RadioGroupItem } from "./ui/radio-group";
import { ScrollArea } from "./ui/scroll-area";
import { DialogFooter } from "./ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";
import { Label } from "@/components/ui/label"; // Label bileşenini import ediyoruz

// --- DESIGN SYSTEM: Glassmorphism Colors ---
const glassColors = {
    ITEM_BG: "bg-white/5 border border-white/10 hover:bg-white/10 transition-all duration-200",
    // Yeni buton stili: Normalde şeffaf, seçilince İndigo ve Parlak
    OPTION_BUTTON: "flex items-center justify-center w-10 h-10 rounded-lg border border-white/10 bg-white/5 text-slate-400 cursor-pointer transition-all hover:bg-white/10 hover:text-white font-bold text-sm peer-data-[state=checked]:bg-indigo-600 peer-data-[state=checked]:text-white peer-data-[state=checked]:border-indigo-500 peer-data-[state=checked]:shadow-[0_0_15px_rgba(79,70,229,0.4)] peer-data-[state=checked]:scale-110",
    BUTTON_PRIMARY: "bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/20 transition-all hover:scale-[1.02]",
    NUMBER_BADGE: "bg-slate-900 text-slate-400 border border-white/10 shadow-inner",
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
        title: "Cevap Anahtarı Kaydedildi", 
        description: "Girdiğiniz cevaplar başarıyla kaydedildi.", 
        className: "bg-slate-900 border-white/10 text-slate-100" 
    });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col h-full">
        <ScrollArea className="flex-1 pr-4 -mr-4">
          <div className="space-y-2 pb-4 pt-1">
            {fields.map((field, index) => (
              <FormField
                key={field.id}
                control={form.control}
                name={`answers.${index}.value`}
                render={({ field }) => (
                  <FormItem className={cn("flex items-center justify-between p-2 px-4 rounded-xl group", glassColors.ITEM_BG)}>
                    <div className="flex items-center gap-3">
                        <div className={cn("flex items-center justify-center w-7 h-7 rounded-md font-mono text-xs shrink-0", glassColors.NUMBER_BADGE)}>
                            {index + 1}
                        </div>
                        {/* Mobilde yer kaplamaması için 'Soru' yazısını gizleyebiliriz veya küçük tutabiliriz */}
                        <span className="text-xs font-medium text-slate-500 hidden sm:inline-block">Soru</span>
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
                                  {/* Asıl Radio input'u gizliyoruz (sr-only) ama 'peer' class'ı veriyoruz */}
                                  <RadioGroupItem 
                                    value={option} 
                                    id={`q${index}-${option}`} 
                                    className="peer sr-only" 
                                  />
                                  
                                  {/* Görsel butonumuz bu Label olacak. Peer checked olduğunda stili değişecek */}
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
        <DialogFooter className="pt-6 mt-auto border-t border-white/5">
          <Button type="submit" className={cn("w-full sm:w-auto font-semibold", glassColors.BUTTON_PRIMARY)}>
            <Check className="w-4 h-4 mr-2" />
            Cevap Anahtarını Kaydet
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
}