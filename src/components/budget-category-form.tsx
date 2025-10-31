
"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "./ui/dialog";
import { onBudgetCategoriesUpdate } from "@/lib/dataService";
import type { BudgetCategory } from "@/lib/data";

export function BudgetCategoryForm() {
    const [categories, setCategories] = React.useState<BudgetCategory[]>([]);
    
     React.useEffect(() => {
        const unsub = onBudgetCategoriesUpdate(setCategories);
        return () => unsub();
     }, []);

    return (
        <div>
            <DialogHeader>
                <DialogTitle>Kategorileri Yönet</DialogTitle>
                <DialogDescription>
                   Harcama kategorilerinizi düzenleyin veya yenilerini ekleyin.
                </DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-2">
                {categories.map(category => (
                    <div key={category.id} className="flex items-center justify-between p-2 border rounded-lg">
                        <div className="flex items-center gap-3">
                            <span className="text-xl">{category.icon}</span>
                            <span>{category.name}</span>
                        </div>
                        {/* Add edit/delete buttons here */}
                    </div>
                ))}
            </div>
             <DialogFooter>
                    <Button type="submit" className="w-full">Yeni Kategori Ekle</Button>
            </DialogFooter>
        </div>
    );
}

    