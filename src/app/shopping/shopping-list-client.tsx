
"use client";
import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PlusCircle, ShoppingCart, ChevronDown, Trash2 } from "lucide-react";
import type { ShoppingList, ShoppingItem } from "@/lib/data";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { onShoppingListsUpdate, addShoppingList, updateShoppingList, deleteShoppingList } from "@/lib/dataService";
import { useToast } from "@/hooks/use-toast";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";


const newListSchema = z.object({
    title: z.string().min(3, "Liste adı en az 3 karakter olmalıdır."),
});

type NewListFormData = z.infer<typeof newListSchema>;

const newItemSchema = z.object({
    name: z.string().min(1, "Ürün adı boş olamaz."),
});
type NewItemFormData = z.infer<typeof newItemSchema>;


export default function ShoppingListClient() {
  const { toast } = useToast();
  const [shoppingLists, setShoppingLists] = React.useState<ShoppingList[]>([]);
  const [openLists, setOpenLists] = React.useState<string[]>([]);
  const [isNewListDialogOpen, setIsNewListDialogOpen] = React.useState(false);

  const newListForm = useForm<NewListFormData>({
    resolver: zodResolver(newListSchema),
    defaultValues: { title: "" }
  });

  const newItemForm = useForm<NewItemFormData>({
    resolver: zodResolver(newItemSchema),
    defaultValues: { name: "" }
  });

  React.useEffect(() => {
    const unsubscribe = onShoppingListsUpdate((lists) => {
        setShoppingLists(lists);
        // Automatically open all lists by default when they load
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
  
  const calculateListProgress = (list: ShoppingList) => {
    if (!list.items || list.items.length === 0) return 0;
    const completedCount = list.items.filter(i => i.completed).length;
    return (completedCount / list.items.length) * 100;
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
          category: "Market", // Default category
          items: []
      }
      try {
          const newListId = await addShoppingList(newList);
          setOpenLists(prev => [...prev, newListId]); // Automatically open the new list
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
        quantity: "1 adet", // Default quantity
    };

    const newItems = [...(list.items || []), newItem];
    try {
        await updateShoppingList(list.id, { items: newItems });
        newItemForm.reset();
    } catch (e) {
        toast({ title: "Hata", description: "Ürün eklenemedi.", variant: 'destructive'});
    }
  }

  const handleDeleteItem = async (listId: string, itemId: string) => {
      const list = shoppingLists.find(l => l.id === listId);
      if (!list) return;
      
      const newItems = list.items.filter(item => item.id !== itemId);
       try {
        await updateShoppingList(list.id, { items: newItems });
        toast({ title: "Ürün Silindi", variant: 'destructive'});
    } catch (e) {
        toast({ title: "Hata", description: "Ürün silinemedi.", variant: 'destructive'});
    }
  }

  const handleDeleteList = async (listId: string) => {
      try {
          await deleteShoppingList(listId);
          toast({ title: "Liste Silindi", variant: 'destructive' });
      } catch (e) {
          toast({ title: "Hata", description: "Liste silinirken bir sorun oluştu.", variant: 'destructive'});
      }
  }


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
      </div>

      <div className="space-y-4">
        {shoppingLists.length > 0 ? (
            shoppingLists.map(list => {
            const completionProgress = calculateListProgress(list);
            const isOpen = openLists.includes(list.id);

            return (
                <Collapsible
                    key={list.id}
                    open={isOpen}
                    onOpenChange={() => toggleList(list.id)}
                    className="w-full"
                >
                <Card>
                    <CardHeader className="p-4 cursor-pointer">
                    <CollapsibleTrigger asChild>
                        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                            <div className="flex-grow">
                                <CardTitle>{list.title}</CardTitle>
                                 <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                                    <span>{list.items?.filter(i => i.completed).length || 0} / {list.items?.length || 0} Tamamlandı</span>
                                </div>
                            </div>
                            <div className="flex items-center gap-4 w-full sm:w-auto mt-2 sm:mt-0">
                                <Progress value={completionProgress} className="h-2 w-full sm:w-32" indicatorClassName="bg-green-500" />
                                <div className="flex items-center">
                                    <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                             <Button variant="ghost" size="icon" className="shrink-0 h-8 w-8 text-destructive hover:text-destructive">
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader>
                                                <AlertDialogTitle>"{list.title}" listesini silmek istediğinize emin misiniz?</AlertDialogTitle>
                                                <AlertDialogDescription>
                                                    Bu işlem geri alınamaz. Liste kalıcı olarak silinecektir.
                                                </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel>İptal</AlertDialogCancel>
                                                <AlertDialogAction onClick={() => handleDeleteList(list.id)}>Sil</AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                    <Button variant="ghost" size="icon" className="shrink-0 h-8 w-8">
                                        <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </CollapsibleTrigger>
                    </CardHeader>
                    <CollapsibleContent>
                        <CardContent className="p-4 pt-0">
                            <div className="space-y-2 border-t pt-4">
                            {list.items?.length > 0 ? list.items.map((item) => (
                                <div key={item.id} className={`flex items-center justify-between p-2 rounded-md transition-colors ${item.completed ? 'bg-muted/50' : 'hover:bg-muted/30'}`}>
                                <div className="flex items-center gap-3 flex-grow">
                                    <Checkbox 
                                        id={`item-${list.id}-${item.id}`}
                                        checked={item.completed} 
                                        onCheckedChange={() => handleItemToggle(list.id, item.id)}
                                        className="h-5 w-5"
                                    />
                                    <div>
                                    <label htmlFor={`item-${list.id}-${item.id}`} className={`font-medium ${item.completed ? 'line-through text-muted-foreground' : ''}`}>{item.name}</label>
                                    <p className="text-xs text-muted-foreground">{item.quantity}</p>
                                    </div>
                                </div>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive/70 hover:text-destructive" onClick={() => handleDeleteItem(list.id, item.id)}>
                                    <Trash2 className="h-4 w-4"/>
                                </Button>
                                </div>
                            )) : (
                                <p className="text-center text-muted-foreground py-4">Bu listede henüz ürün yok.</p>
                            )}
                            </div>
                            <div className="mt-4 pt-4 border-t">
                                <Form {...newItemForm}>
                                    <form onSubmit={newItemForm.handleSubmit(data => handleAddItemToList(list.id, data))} className="flex items-start gap-2">
                                        <FormField
                                            control={newItemForm.control}
                                            name="name"
                                            render={({ field }) => (
                                                <FormItem className="flex-grow">
                                                    <FormControl>
                                                        <Input placeholder="Yeni ürün ekle..." {...field} />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <Button type="submit" variant="secondary">Ekle</Button>
                                    </form>
                                </Form>
                            </div>
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
