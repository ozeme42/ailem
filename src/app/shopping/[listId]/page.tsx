
"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import { onSnapshot, doc } from "firebase/firestore";
import { ArrowLeft, Check, Loader2, Sparkles, Trash2, X } from "lucide-react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { db } from "@/lib/firebase";
import type { ShoppingList, ShoppingItem } from "@/lib/data";
import { generateShoppingListItems } from "@/ai/flows/generate-shopping-list-flow";
import { updateShoppingList } from "@/lib/dataService";
import { useToast } from "@/hooks/use-toast";

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";


const newItemSchema = z.object({
    prompt: z.string().min(3, "En az 3 karakter girmelisiniz."),
});
type NewItemFormData = z.infer<typeof newItemSchema>;


export default function ShoppingListDetailPage() {
    const params = useParams();
    const router = useRouter();
    const listId = params.listId as string;
    const { toast } = useToast();

    const [list, setList] = React.useState<ShoppingList | null>(null);
    const [loading, setLoading] = React.useState(true);
    const [isAiLoading, setIsAiLoading] = React.useState(false);

    const newItemForm = useForm<NewItemFormData>({
        resolver: zodResolver(newItemSchema),
        defaultValues: { prompt: "" },
    });

    React.useEffect(() => {
        if (!listId) return;

        const docRef = doc(db, "shoppingLists", listId);
        const unsubscribe = onSnapshot(docRef, (docSnap) => {
            if (docSnap.exists()) {
                setList({ id: docSnap.id, ...docSnap.data() } as ShoppingList);
            } else {
                // TODO: Handle not found case
                console.log("No such document!");
                setList(null);
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, [listId]);

    const handleItemToggle = async (itemId: string) => {
        if (!list) return;

        const newItems = list.items.map(item =>
            item.id === itemId ? { ...item, completed: !item.completed } : item
        );
        try {
            await updateShoppingList(list.id, { items: newItems });
        } catch (e) {
            toast({ title: "Hata", description: "Ürün güncellenemedi.", variant: 'destructive' });
        }
    };

    const handleDeleteItem = async (itemId: string) => {
        if (!list) return;

        const newItems = list.items.filter(item => item.id !== itemId);
        try {
            await updateShoppingList(list.id, { items: newItems });
            toast({ title: "Ürün Silindi", variant: 'destructive' });
        } catch (e) {
            toast({ title: "Hata", description: "Ürün silinemedi.", variant: 'destructive' });
        }
    };
    
    const handleSmartAdd = async ({ prompt }: NewItemFormData) => {
        if (!list) return;
        setIsAiLoading(true);
        try {
            const result = await generateShoppingListItems(prompt);
            if (result && result.items) {
                const newItems: ShoppingItem[] = result.items.map(item => ({
                    id: Date.now().toString() + Math.random().toString(36).substring(2, 9),
                    name: item.name,
                    quantity: item.quantity || "1 adet",
                    completed: false,
                }));

                const updatedItems = [...list.items, ...newItems];
                await updateShoppingList(list.id, { items: updatedItems });
                
                toast({
                    title: `✅ ${newItems.length} ürün eklendi`,
                    description: `"${prompt}" listeye başarıyla eklendi.`,
                });
                newItemForm.reset();
            }
        } catch(e) {
            console.error(e);
            toast({ title: "Yapay Zeka Hatası", description: "Ürünler ayrıştırılamadı. Lütfen tekrar deneyin.", variant: 'destructive' });
        } finally {
            setIsAiLoading(false);
        }
    }


    if (loading) {
        return <ShoppingListDetailSkeleton />;
    }

    if (!list) {
        return <div>Liste bulunamadı.</div>;
    }

    return (
        <div>
            <PageHeader title={list.title}>
                 <Button variant="ghost" onClick={() => router.push('/shopping')}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Tüm Listeler
                </Button>
            </PageHeader>
            
            <Card className="mb-6">
                <CardContent className="p-4">
                     <Form {...newItemForm}>
                        <form onSubmit={newItemForm.handleSubmit(handleSmartAdd)} className="flex items-start gap-2">
                             <Sparkles className="h-10 w-10 text-purple-500 shrink-0" />
                            <div className="flex-grow">
                                 <FormField
                                    control={newItemForm.control}
                                    name="prompt"
                                    render={({ field }) => (
                                        <FormItem className="flex-grow">
                                            <FormControl>
                                                <Input placeholder="Akıllı ekleme: '2 kilo domates, 1 paket süt ve ekmek' yazmayı deneyin..." {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <p className="text-xs text-muted-foreground mt-1">Yapay zeka ile listeye hızlıca birden fazla ürün ekleyin.</p>
                            </div>
                            <Button type="submit" disabled={isAiLoading}>
                                {isAiLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Ekle
                            </Button>
                        </form>
                    </Form>
                </CardContent>
            </Card>

            <Card>
                <CardContent className="p-4 pt-4">
                     <div className="space-y-2">
                        {list.items?.length > 0 ? list.items.map((item) => (
                            <div key={item.id} className={`group flex items-center justify-between p-3 rounded-md transition-colors ${item.completed ? 'bg-muted/50' : 'hover:bg-muted/30'}`}>
                                <div className="flex items-center gap-3 flex-grow">
                                    <Checkbox
                                        id={`item-${list.id}-${item.id}`}
                                        checked={item.completed}
                                        onCheckedChange={() => handleItemToggle(item.id)}
                                        className="h-5 w-5"
                                    />
                                    <div>
                                        <label htmlFor={`item-${list.id}-${item.id}`} className={`font-medium cursor-pointer ${item.completed ? 'line-through text-muted-foreground' : ''}`}>{item.name}</label>
                                        <p className="text-xs text-muted-foreground">{item.quantity}</p>
                                    </div>
                                </div>
                                 <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive/70 hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => handleDeleteItem(item.id)}>
                                    <Trash2 className="h-4 w-4"/>
                                </Button>
                            </div>
                        )) : (
                            <p className="text-center text-muted-foreground py-8">Bu listede henüz ürün yok.</p>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

function ShoppingListDetailSkeleton() {
    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <Skeleton className="h-10 w-48" />
                <Skeleton className="h-10 w-32" />
            </div>
             <Skeleton className="h-28 w-full" />
             <div className="space-y-3">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
             </div>
        </div>
    )
}
