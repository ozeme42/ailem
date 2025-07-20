
"use client";
import * as React from "react";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PlusCircle, ShoppingCart, TrendingUp, DollarSign, ChevronDown, Trash2 } from "lucide-react";
import type { ShoppingList, ShoppingItem } from "@/lib/data";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { onShoppingListsUpdate, addShoppingList, updateShoppingList } from "@/lib/dataService";
import { useToast } from "@/hooks/use-toast";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";


const newListSchema = z.object({
    title: z.string().min(3, "Liste adı en az 3 karakter olmalıdır."),
});

type NewListFormData = z.infer<typeof newListSchema>;

const newItemSchema = z.object({
    name: z.string().min(1, "Ürün adı boş olamaz."),
    quantity: z.string().optional(),
    price: z.coerce.number().min(0).optional(),
});
type NewItemFormData = z.infer<typeof newItemSchema>;


export default function ShoppingPage() {
  const { toast } = useToast();
  const [shoppingLists, setShoppingLists] = React.useState<ShoppingList[]>([]);
  const [openLists, setOpenLists] = React.useState<string[]>([]);
  const [isNewListDialogOpen, setIsNewListDialogOpen] = React.useState(false);
  const [openNewItemForms, setOpenNewItemForms] = React.useState<string[]>([]);

  const newListForm = useForm<NewListFormData>({
    resolver: zodResolver(newListSchema),
    defaultValues: { title: "" }
  });

  const newItemForm = useForm<NewItemFormData>({
    resolver: zodResolver(newItemSchema),
    defaultValues: { name: "", quantity: "", price: 0 }
  });

  React.useEffect(() => {
    const unsubscribe = onShoppingListsUpdate((lists) => {
        setShoppingLists(lists);
        if (openLists.length === 0 && lists.length > 0) {
            const listIds = lists.map(l => l.id);
            setOpenLists(listIds);
        }
    });
    return () => unsubscribe();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleList = (id: string) => {
    setOpenLists(prev => prev.includes(id) ? prev.filter(listId => listId !== id) : [...prev, id]);
  };
  
  const calculateListTotals = (list: ShoppingList) => {
    const completedCount = list.items.filter(i => i.completed).length;
    const totalCost = list.items.reduce((sum, item) => sum + (item.price || 0), 0);
    const completedCost = list.items.filter(i => i.completed).reduce((sum, item) => sum + (item.price || 0), 0);
    return { completedCount, totalCost, completedCost };
  }

  const handleItemToggle = async (listId: string, itemId: string) => {
    const list = shoppingLists.find(l => l.id === listId);
    if (!list) return;

    const newItems = list.items.map(item => 
      item.id === itemId ? { ...item, completed: !item.completed } : item
    );
    try {
        await updateShoppingList(list.id, { items: newItems });
    } catch (e) {
        toast({ title: "Hata", description: "Ürün güncellenemedi.", variant: 'destructive'});
    }
  }

  const handleCreateList = async (data: NewListFormData) => {
      const newList: Omit<ShoppingList, 'id'> = {
          title: data.title,
          category: "Market",
          items: []
      }
      try {
          const newListId = await addShoppingList(newList);
          setOpenLists(prev => [...prev, newListId]);
          toast({ title: "Liste Oluşturuldu", description: `${data.title} başarıyla eklendi.`});
          setIsNewListDialogOpen(false);
          newListForm.reset();
      } catch (e) {
          toast({ title: "Hata", description: "Liste oluşturulamadı.", variant: 'destructive'});
      }
  }

  const handleAddItemToList = async (listId: string, data: NewItemFormData) => {
    const list = shoppingLists.find(l => l.id === listId);
    if (!list) return;

    const newItem: ShoppingItem = {
        id: Date.now().toString(),
        name: data.name,
        quantity: data.quantity || "1 adet",
        price: data.price || 0,
        completed: false,
    };

    const newItems = [...list.items, newItem];
    try {
        await updateShoppingList(list.id, { items: newItems });
        toast({ title: "Ürün Eklendi", description: `${data.name} listeye eklendi.`});
        newItemForm.reset();
        setOpenNewItemForms(prev => prev.filter(id => id !== listId));
    } catch (e) {
        toast({ title: "Hata", description: "Ürün eklenemedi.", variant: 'destructive'});
    }
  }
  
  const totalSpendThisMonth = shoppingLists.reduce((total, list) => {
      return total + list.items.filter(i => i.completed).reduce((sum, i) => sum + (i.price || 0), 0);
  }, 0);


  return (
    <>
      <PageHeader title="Alışveriş Yönetimi 🛒">
        <Dialog open={isNewListDialogOpen} onOpenChange={setIsNewListDialogOpen}>
            <DialogTrigger asChild>
                <Button className="bg-gradient-to-r from-green-500 to-cyan-500 text-white shadow-lg hover:shadow-xl transition-shadow">
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Yeni Liste Oluştur
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Yeni Alışveriş Listesi</DialogTitle>
                    <DialogDescription>
                        Yeni bir alışveriş listesi oluşturarak ihtiyaçlarınızı takip edin.
                    </DialogDescription>
                </DialogHeader>
                 <Form {...newListForm}>
                    <form onSubmit={newListForm.handleSubmit(handleCreateList)} className="grid gap-4 py-4">
                        <FormField
                            control={newListForm.control}
                            name="title"
                            render={({ field }) => (
                                <FormItem>
                                    <Label htmlFor="name">Liste Adı</Label>
                                    <Input id="name" placeholder="Haftalık Market" {...field} />
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <Button type="submit">Listeyi Oluştur</Button>
                    </form>
                 </Form>
            </DialogContent>
        </Dialog>
      </PageHeader>
      
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Aktif Liste Sayısı</CardTitle>
            <ShoppingCart className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{shoppingLists.length}</div>
            <p className="text-xs text-muted-foreground">Tüm alışveriş listeleri</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Bu Ay Harcanan</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₺{totalSpendThisMonth.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">Tamamlanan ürünlerin toplamı</p>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        {shoppingLists.length > 0 ? (
            shoppingLists.map(list => {
            const { completedCount, totalCost, completedCost } = calculateListTotals(list);
            const completionProgress = list.items.length > 0 ? (completedCount / list.items.length) * 100 : 0;
            const isOpen = openLists.includes(list.id);
            const isNewItemFormOpen = openNewItemForms.includes(list.id);

            return (
                <Collapsible
                    key={list.id}
                    open={isOpen}
                    onOpenChange={() => toggleList(list.id)}
                    className="w-full"
                >
                <Card>
                    <CardHeader className="p-4">
                    <CollapsibleTrigger asChild>
                        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 cursor-pointer">
                            <div className="flex-grow">
                                <CardTitle>{list.title}</CardTitle>
                            </div>
                            <div className="flex items-center gap-4 w-full sm:w-auto mt-2 sm:mt-0">
                                <div className="flex items-center text-green-600 font-semibold">
                                    <DollarSign size={16} />
                                    <span>{completedCost.toFixed(2)} / {totalCost.toFixed(2)}</span>
                                </div>
                                <Button variant="ghost" size="icon" className="shrink-0">
                                <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                                </Button>
                            </div>
                        </div>
                    </CollapsibleTrigger>
                    </CardHeader>
                    <CollapsibleContent>
                        <CardContent className="p-4 pt-0">
                            <div className="mb-4">
                            <div className="flex justify-between text-xs text-muted-foreground mb-1">
                                <span>Tamamlanma: {completedCount}/{list.items.length}</span>
                            </div>
                            <Progress value={completionProgress} indicatorClassName="bg-green-500" />
                            </div>
                            <div className="space-y-2 border-t pt-4">
                            {list.items.length > 0 ? list.items.map((item) => (
                                <div key={item.id} className={`flex items-center justify-between p-2 rounded-md ${item.completed ? 'bg-muted/50' : ''}`}>
                                <div className="flex items-center gap-3">
                                    <Checkbox 
                                        id={`item-${list.id}-${item.id}`}
                                        checked={item.completed} 
                                        onCheckedChange={() => handleItemToggle(list.id, item.id)}
                                    />
                                    <div>
                                    <label htmlFor={`item-${list.id}-${item.id}`} className={`font-medium ${item.completed ? 'line-through text-muted-foreground' : ''}`}>{item.name}</label>
                                    <p className="text-xs text-muted-foreground">{item.quantity}</p>
                                    </div>
                                </div>
                                <p className={`font-semibold ${item.completed ? 'line-through text-muted-foreground' : ''}`}>
                                    ₺{(item.price || 0).toFixed(2)}
                                </p>
                                </div>
                            )) : (
                                <p className="text-center text-muted-foreground py-4">Bu listede henüz ürün yok.</p>
                            )}
                            </div>
                             <Collapsible
                                open={isNewItemFormOpen}
                                onOpenChange={() => setOpenNewItemForms(prev => prev.includes(list.id) ? prev.filter(id => id !== list.id) : [...prev, list.id])}
                                className="mt-4"
                            >
                                <CollapsibleTrigger asChild>
                                    <Button variant="ghost" className="w-full">
                                        <PlusCircle className="mr-2 h-4 w-4" />
                                        Yeni Ürün Ekle
                                    </Button>
                                </CollapsibleTrigger>
                                <CollapsibleContent>
                                    <Form {...newItemForm}>
                                        <form onSubmit={newItemForm.handleSubmit(data => handleAddItemToList(list.id, data))} className="grid grid-cols-1 sm:grid-cols-6 gap-2 pt-4">
                                            <FormField control={newItemForm.control} name="name" render={({ field }) => (<FormItem className="sm:col-span-3"><FormControl><Input placeholder="Ürün Adı" {...field} /></FormControl><FormMessage /></FormItem>)}/>
                                            <FormField control={newItemForm.control} name="quantity" render={({ field }) => (<FormItem className="sm:col-span-1"><FormControl><Input placeholder="Miktar" {...field} /></FormControl><FormMessage /></FormItem>)}/>
                                            <FormField control={newItemForm.control} name="price" render={({ field }) => (<FormItem className="sm:col-span-1"><FormControl><Input type="number" step="0.01" placeholder="Fiyat" {...field} /></FormControl><FormMessage /></FormItem>)}/>
                                            <Button type="submit" className="sm:col-span-1">Ekle</Button>
                                        </form>
                                    </Form>
                                </CollapsibleContent>
                             </Collapsible>
                        </CardContent>
                    </CollapsibleContent>
                </Card>
                </Collapsible>
            )
            })
        ) : (
            <Card>
                <CardContent className="p-8 text-center text-muted-foreground">
                    Henüz alışveriş listesi yok. Yeni bir tane oluşturun!
                </CardContent>
            </Card>
        )}
      </div>
    </>
  );
}
