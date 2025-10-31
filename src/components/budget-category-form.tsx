
"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "./ui/dialog";
import { onBudgetCategoriesUpdate, addBudgetCategory, deleteBudgetCategory, updateBudgetCategory } from "@/lib/dataService";
import type { BudgetCategory } from "@/lib/data";
import { ArrowLeft, Edit, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "./ui/alert-dialog";
import { ScrollArea } from "./ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";


const categorySchema = z.object({
    name: z.string().min(2, "Kategori adı en az 2 karakter olmalıdır."),
    icon: z.string().min(1, "İkon için bir emoji ekleyin."),
    type: z.enum(['income', 'expense']).default('expense'),
});
type CategoryFormData = z.infer<typeof categorySchema>;

export function BudgetCategoryForm({ onBack }: { onBack: () => void }) {
    const [categories, setCategories] = React.useState<BudgetCategory[]>([]);
    const [editingCategory, setEditingCategory] = React.useState<BudgetCategory | null>(null);
    const [isFormVisible, setIsFormVisible] = React.useState(false);
    const { toast } = useToast();

    const form = useForm<CategoryFormData>({
        resolver: zodResolver(categorySchema),
        defaultValues: { name: "", icon: "", type: "expense" }
    });

     React.useEffect(() => {
        const unsub = onBudgetCategoriesUpdate(setCategories);
        return () => unsub();
     }, []);
     
     React.useEffect(() => {
        if(editingCategory) {
            form.reset({ name: editingCategory.name, icon: editingCategory.icon, type: editingCategory.type });
            setIsFormVisible(true);
        } else {
            form.reset({ name: "", icon: "", type: "expense" });
        }
     }, [editingCategory, form]);

     const handleSaveCategory = async (data: CategoryFormData) => {
        try {
            if (editingCategory) {
                await updateBudgetCategory(editingCategory.id, data);
                toast({ title: 'Kategori Güncellendi' });
            } else {
                await addBudgetCategory(data);
                toast({ title: 'Kategori Eklendi' });
            }
            setIsFormVisible(false);
            setEditingCategory(null);
        } catch (e) {
            toast({ title: 'Hata', variant: 'destructive' });
        }
     };

     const handleDeleteCategory = async (id: string) => {
         try {
             await deleteBudgetCategory(id);
             toast({ title: 'Kategori Silindi', variant: 'destructive' });
         } catch (e) {
            toast({ title: 'Hata', variant: 'destructive' });
         }
     }

    if (isFormVisible) {
        return (
            <div className="flex flex-col h-full">
                 <DialogHeader>
                    <div className="flex items-center gap-2">
                        <Button variant="ghost" size="icon" onClick={() => { setIsFormVisible(false); setEditingCategory(null); }}><ArrowLeft/></Button>
                        <DialogTitle>{editingCategory ? 'Kategoriyi Düzenle' : 'Yeni Kategori Ekle'}</DialogTitle>
                    </div>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleSaveCategory)} className="py-4 space-y-4">
                        <FormField name="icon" control={form.control} render={({ field }) => (
                            <FormItem><FormLabel>İkon</FormLabel><FormControl><Input placeholder="örn: 🍔" {...field} /></FormControl><FormMessage /></FormItem>
                        )}/>
                        <FormField name="name" control={form.control} render={({ field }) => (
                            <FormItem><FormLabel>Kategori Adı</FormLabel><FormControl><Input placeholder="örn: Yiyecek" {...field} /></FormControl><FormMessage /></FormItem>
                        )}/>
                        <FormField name="type" control={form.control} render={({ field }) => (
                             <Tabs value={field.value} onValueChange={(value) => field.onChange(value as any)} className="w-full pt-4">
                                <TabsList className="grid w-full grid-cols-2">
                                    <TabsTrigger value="expense">Gider</TabsTrigger>
                                    <TabsTrigger value="income">Gelir</TabsTrigger>
                                </TabsList>
                            </Tabs>
                        )}/>
                        <DialogFooter className="pt-4">
                             <Button type="submit" className="w-full">{editingCategory ? 'Kaydet' : 'Ekle'}</Button>
                        </DialogFooter>
                    </form>
                </Form>
            </div>
        )
    }

    return (
        <div className="flex flex-col h-full">
            <DialogHeader>
                 <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" onClick={onBack}><ArrowLeft/></Button>
                    <DialogTitle>Kategorileri Yönet</DialogTitle>
                </div>
                <DialogDescription>
                   Harcama ve gelir kategorilerinizi düzenleyin veya yenilerini ekleyin.
                </DialogDescription>
            </DialogHeader>
            <ScrollArea className="flex-grow min-h-0 my-4">
                <div className="py-4 space-y-2 pr-4">
                    {categories.map(category => (
                        <div key={category.id} className="flex items-center justify-between p-2 border rounded-lg">
                            <div className="flex items-center gap-3">
                                <span className="text-xl">{category.icon}</span>
                                <span>{category.name}</span>
                            </div>
                             <div className="flex items-center gap-1">
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditingCategory(category)}><Edit className="h-4 w-4" /></Button>
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive"><Trash2 className="h-4 w-4" /></Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>Emin misiniz?</AlertDialogTitle>
                                            <AlertDialogDescription>"{category.name}" kategorisini kalıcı olarak silmek istiyor musunuz?</AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>İptal</AlertDialogCancel>
                                            <AlertDialogAction onClick={() => handleDeleteCategory(category.id)}>Evet, Sil</AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                             </div>
                        </div>
                    ))}
                </div>
            </ScrollArea>
             <DialogFooter>
                    <Button type="button" className="w-full" onClick={() => { setEditingCategory(null); setIsFormVisible(true); }}>Yeni Kategori Ekle</Button>
            </DialogFooter>
        </div>
    );
}
