
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

type AnswerKey = { [key: number]: string };

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
    })
  }, [totalQuestions, answerKey, form])


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
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <ScrollArea className="h-96 pr-6">
          <div className="space-y-4">
            {fields.map((field, index) => (
              <FormField
                key={field.id}
                control={form.control}
                name={`answers.${index}.value`}
                render={({ field }) => (
                  <FormItem className="flex items-center gap-4 sm:gap-8 p-3 rounded-lg border">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold">
                      {index + 1}
                    </div>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        defaultValue={field.value || ""}
                        className="flex flex-wrap gap-x-4 gap-y-2 sm:gap-x-6"
                      >
                        {["A", "B", "C", "D", "E"].map((option) => (
                          <FormItem
                            key={option}
                            className="flex items-center space-x-2"
                          >
                            <FormControl>
                              <RadioGroupItem value={option} />
                            </FormControl>
                            <FormLabel>{option}</FormLabel>
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
        <DialogFooter className="pt-6">
          <Button type="submit">Cevap Anahtarını Kaydet</Button>
        </DialogFooter>
      </form>
    </Form>
  );
}
