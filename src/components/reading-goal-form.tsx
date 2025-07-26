
"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import type { ReadingGoals } from "@/lib/data";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { DialogFooter } from "./ui/dialog";

const goalSchema = z.object({
  pages: z.coerce.number().min(0).optional(),
  books: z.coerce.number().min(0).optional(),
});

const formSchema = z.object({
  daily: goalSchema.optional(),
  weekly: goalSchema.optional(),
  monthly: goalSchema.optional(),
});

type ReadingGoalFormProps = {
  initialGoals?: ReadingGoals | null;
  onSave: (goals: ReadingGoals) => void;
};

export function SetReadingGoalForm({ initialGoals, onSave }: ReadingGoalFormProps) {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      daily: initialGoals?.daily || { pages: 0, books: 0 },
      weekly: initialGoals?.weekly || { pages: 0, books: 0 },
      monthly: initialGoals?.monthly || { pages: 0, books: 0 },
    },
  });

  function handleFormSubmit(values: z.infer<typeof formSchema>) {
    onSave(values);
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6 pt-4">
        <Card>
            <CardHeader><CardTitle className="text-lg">Günlük Hedefler</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
                 <FormField
                    control={form.control}
                    name="daily.pages"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Sayfa</FormLabel>
                        <FormControl><Input type="number" {...field} /></FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                 />
                 <FormField
                    control={form.control}
                    name="daily.books"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Kitap</FormLabel>
                        <FormControl><Input type="number" {...field} /></FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                 />
            </CardContent>
        </Card>

        <Card>
            <CardHeader><CardTitle className="text-lg">Haftalık Hedefler</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
                 <FormField
                    control={form.control}
                    name="weekly.pages"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Sayfa</FormLabel>
                        <FormControl><Input type="number" {...field} /></FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                 />
                 <FormField
                    control={form.control}
                    name="weekly.books"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Kitap</FormLabel>
                        <FormControl><Input type="number" {...field} /></FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                 />
            </CardContent>
        </Card>

        <Card>
            <CardHeader><CardTitle className="text-lg">Aylık Hedefler</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
                 <FormField
                    control={form.control}
                    name="monthly.pages"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Sayfa</FormLabel>
                        <FormControl><Input type="number" {...field} /></FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                 />
                 <FormField
                    control={form.control}
                    name="monthly.books"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Kitap</FormLabel>
                        <FormControl><Input type="number" {...field} /></FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                 />
            </CardContent>
        </Card>
        
        <DialogFooter>
             <Button type="submit" className="w-full">Hedefleri Kaydet</Button>
        </DialogFooter>
      </form>
    </Form>
  );
}

