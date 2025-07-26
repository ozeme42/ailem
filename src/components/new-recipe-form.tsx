
"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useFieldArray } from "react-hook-form";
import { z } from "zod";
import { PlusCircle, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Recipe } from "@/lib/data";
import { Textarea } from "./ui/textarea";

const ingredientSchema = z.object({
  value: z.string().min(2, "Malzeme en az 2 karakter olmalıdır."),
});

const instructionSchema = z.object({
  value: z.string().min(5, "Talimat en az 5 karakter olmalıdır."),
});

const formSchema = z.object({
  title: z.string().min(3, "Başlık en az 3 karakter olmalıdır."),
  category: z.enum(['Kahvaltı', 'Akşam Yemeği', 'Atıştırmalık'], { required_error: "Kategori seçmelisiniz." }),
  prepTime: z.string().min(2, "Hazırlık süresi belirtmelisiniz."),
  rating: z.coerce.number().min(1).max(5).default(4),
  ingredients: z.array(ingredientSchema).min(1, "En az bir malzeme eklemelisiniz."),
  instructions: z.array(instructionSchema).min(1, "En az bir talimat eklemelisiniz."),
});

type NewRecipeFormProps = {
  onSubmit: (data: Omit<Recipe, 'id' | 'familyId'>) => void;
  initialData?: Recipe | null;
};

export function NewRecipeForm({ onSubmit, initialData }: NewRecipeFormProps) {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: initialData 
        ? { 
            ...initialData,
            ingredients: initialData.ingredients.map(i => ({ value: i })),
            instructions: initialData.instructions.map(i => ({ value: i })),
          }
        : {
            title: "",
            category: "Akşam Yemeği",
            prepTime: "",
            rating: 4,
            ingredients: [{ value: "" }],
            instructions: [{ value: "" }],
          },
  });

  const { fields: ingredientFields, append: appendIngredient, remove: removeIngredient } = useFieldArray({
    control: form.control,
    name: "ingredients",
  });

  const { fields: instructionFields, append: appendInstruction, remove: removeInstruction } = useFieldArray({
    control: form.control,
    name: "instructions",
  });

  function handleFormSubmit(values: z.infer<typeof formSchema>) {
    const finalData = {
        ...values,
        ingredients: values.ingredients.map(i => i.value),
        instructions: values.instructions.map(i => i.value),
    };
    onSubmit(finalData);
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
        <div className="grid grid-cols-2 gap-4">
            <FormField control={form.control} name="category" render={({ field }) => (
                <FormItem>
                    <FormLabel>Kategori</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Kategori seçin" /></SelectTrigger></FormControl>
                    <SelectContent>
                        <SelectItem value="Kahvaltı">Kahvaltı</SelectItem>
                        <SelectItem value="Akşam Yemeği">Akşam Yemeği</SelectItem>
                        <SelectItem value="Atıştırmalık">Atıştırmalık</SelectItem>
                    </SelectContent>
                    </Select>
                    <FormMessage />
                </FormItem>
            )} />
             <FormField control={form.control} name="prepTime" render={({ field }) => (
                <FormItem>
                    <FormLabel>Hazırlık Süresi</FormLabel>
                    <FormControl><Input placeholder="Örn: 45 dk" {...field} /></FormControl>
                    <FormMessage />
                </FormItem>
            )} />
        </div>
        
        <div>
            <FormLabel>Malzemeler</FormLabel>
            <div className="space-y-2 mt-2">
                {ingredientFields.map((field, index) => (
                    <div key={field.id} className="flex items-center gap-2">
                        <FormField control={form.control} name={`ingredients.${index}.value`} render={({ field }) => (
                            <FormItem className="flex-grow"><FormControl><Input {...field} placeholder={`Malzeme ${index + 1}`} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <Button type="button" variant="ghost" size="icon" onClick={() => removeIngredient(index)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </div>
                ))}
            </div>
            <Button type="button" variant="outline" size="sm" className="mt-2" onClick={() => appendIngredient({ value: "" })}>
                <PlusCircle className="mr-2 h-4 w-4"/> Malzeme Ekle
            </Button>
        </div>
        
         <div>
            <FormLabel>Hazırlanışı</FormLabel>
            <div className="space-y-2 mt-2">
                {instructionFields.map((field, index) => (
                    <div key={field.id} className="flex items-start gap-2">
                         <span className="font-semibold pt-2">{index + 1}.</span>
                        <FormField control={form.control} name={`instructions.${index}.value`} render={({ field }) => (
                            <FormItem className="flex-grow"><FormControl><Textarea {...field} placeholder={`Adım ${index + 1}`} rows={2} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <Button type="button" variant="ghost" size="icon" onClick={() => removeInstruction(index)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </div>
                ))}
            </div>
            <Button type="button" variant="outline" size="sm" className="mt-2" onClick={() => appendInstruction({ value: "" })}>
                <PlusCircle className="mr-2 h-4 w-4"/> Adım Ekle
            </Button>
        </div>

        <Button type="submit">{initialData ? 'Tarifi Güncelle' : 'Tarifi Kaydet'}</Button>
      </form>
    </Form>
  );
}
