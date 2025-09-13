
"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "./ui/dialog";

const formSchema = z.object({
    // This will be dynamic, but for schema validation we can define a few common ones
    "Gıda": z.coerce.number().min(0).optional(),
    "Fatura": z.coerce.number().min(0).optional(),
    "Kira": z.coerce.number().min(0).optional(),
    "Ulaşım": z.coerce.number().min(0).optional(),
    "Eğlence": z.coerce.number().min(0).optional(),
});

export function BudgetCategoryForm() {
    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
    });

    function onSubmit(values: z.infer<typeof formSchema>) {
        // Implement save logic
        console.log(values);
    }
    
    const categories = ["Gıda", "Fatura", "Kira", "Ulaşım", "Eğlence"];

    return (
        <Form {...form}>
            <DialogHeader>
                <DialogTitle>Aylık Bütçeyi Ayarla</DialogTitle>
                <DialogDescription>
                    Bu ay için her kategoriye harcama limiti belirleyin.
                </DialogDescription>
            </DialogHeader>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
                 {categories.map(category => (
                    <FormField
                        key={category}
                        control={form.control}
                        name={category as any}
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>{category}</FormLabel>
                                <FormControl>
                                    <Input type="number" placeholder="0.00" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                ))}
                <DialogFooter>
                    <Button type="submit" className="w-full">Bütçeyi Kaydet</Button>
                </DialogFooter>
            </form>
        </Form>
    );
}
