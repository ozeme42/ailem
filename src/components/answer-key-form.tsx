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

// --- DESIGN SYSTEM: Glassmorphism Colors ---
const glassColors = {
    ITEM_BG: "bg-white/5 border border-white/10 hover:bg-white/10 transition-colors",
    RADIO_ITEM: "border-white/20 text-white data-[state=checked]:border-indigo-500 data-[state=checked]:text-indigo-400",
    BUTTON_PRIMARY: "bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/20",
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
    toast({ title: "Cevap Anahtarı Geçici Olarak Kaydedildi", description: "Değişiklikleri kalıcı hale getirmek için ana formu kaydedin.", className: "bg-slate-900 border-white/10 text-white" });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col h-full">
        <ScrollArea className="flex-1 pr-4 -mr-4">
          <div className="space-y-3 pb-4">
            {fields.map((field, index) => (
              <FormField
                key={field.id}
                control={form.control}
                name={`answers.${index}.value`}
                render={({ field }) => (
                  <FormItem className={cn("flex items-center gap-4 sm:gap-6 p-3 rounded-xl", glassColors.ITEM_BG)}>
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-indigo-500/20 text-indigo-300 font-bold text-sm shrink-0 shadow-inner border border-indigo-500/20">
                      {index + 1}
                    </div>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        value={field.value || ""}
                        className="flex flex-wrap gap-x-4 gap-y-2 sm:gap-x-8"
                      >
                        {["A", "B", "C", "D"].map((option) => (
                          <FormItem
                            key={option}
                            className="flex items-center space-x-2 space-y-0"
                          >
                            <FormControl>
                              <RadioGroupItem value={option} className={glassColors.RADIO_ITEM} />
                            </FormControl>
                            <FormLabel className="font-semibold text-slate-300 cursor-pointer hover:text-white transition-colors">{option}</FormLabel>
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
          <Button type="submit" className={cn("w-full sm:w-auto", glassColors.BUTTON_PRIMARY)}>Cevap Anahtarını Kaydet</Button>
        </DialogFooter>
      </form>
    </Form>
  );
}