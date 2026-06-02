
"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Recipe } from "@/lib/data";
import { Textarea } from "./ui/textarea";

const formSchema = z.object({
  title: z.string().min(3, "Başlık en az 3 karakter olmalıdır."),
  category: z.string().default('Genel'),
  rating: z.coerce.number().min(1).max(5).default(4),
  instructions: z.string().optional(),
  sourceUrl: z.string().url("Geçerli bir URL giriniz.").optional().or(z.literal('')),
});

type NewRecipeFormProps = {
  onSubmit: (data: Omit<Recipe, 'id' | 'familyId'>) => void;
  initialData?: Recipe | null;
};

export function NewRecipeForm({ onSubmit, initialData }: NewRecipeFormProps) {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: initialData 
        ? { ...initialData, sourceUrl: initialData.sourceUrl || '' }
        : {
            title: "",
            category: "Genel",
            rating: 4,
            instructions: "",
            sourceUrl: "",
          },
  });


  function handleFormSubmit(values: z.infer<typeof formSchema>) {
    onSubmit(values);
    form.reset();
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tarif Adı</FormLabel>
              <FormControl><Input placeholder="Örn: Fırında Tavuk" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        
        <FormField
          control={form.control}
          name="sourceUrl"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tarif Linki (Opsiyonel)</FormLabel>
              <FormControl>
                <Input placeholder="https://..." type="url" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="instructions"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Hazırlanışı (Opsiyonel)</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Tarifin hazırlanışını buraya yazın..."
                  className="resize-y"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit">{initialData ? 'Tarifi Güncelle' : 'Tarifi Kaydet'}</Button>
      </form>
    </Form>
  );
}

    