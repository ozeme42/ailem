
"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, X, ArrowLeft, ListChecks, Notebook, Edit, Home, Cake, ShoppingCart, Trash2, PlusCircle } from "lucide-react";
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle as AlertDialogTitleComponent, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { onShoppingListsUpdate, addShoppingList, deleteShoppingList, addShoppingListItemToList, toggleShoppingListItemStatusInList, deleteShoppingListItemFromList, clearBoughtItemsFromList } from '@/lib/dataService';
import { type ShoppingList, type ShoppingItem as ShoppingListItemType } from '@/lib/data';
import { defaultShoppingItems } from "@/lib/shopping-suggestions";
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { generateShoppingListItems, GenerateShoppingListOutput } from '@/ai/flows/generate-shopping-list-flow';
import { Loader2 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';


const brightColors = [
    { id: 'blue-indigo', name: 'Mavi', gradient: 'from-blue-500 to-indigo-600' },
    { id: 'teal-green', name: 'Açık Yeşil', gradient: 'from-teal-400 to-green-500' },
    { id: 'amber-orange', name: 'Turuncu', gradient: 'from-amber-400 to-orange-500' },
    { id: 'rose-red', name: 'Gül Kurusu', gradient: 'from-rose-400 to-red-500' },
    { id: 'cyan-sky', name: 'Camgöbeği', gradient: 'from-cyan-400 to-sky-500' },
    { id: 'violet-purple', name: 'Menekşe', gradient: 'from-violet-500 to-purple-600' },
    { id: 'pink-fuchsia', name: 'Pembe', gradient: 'from-pink-500 to-fuchsia-500' },
    { id: 'lime-emerald', name: 'Fıstık Yeşili', gradient: 'from-lime-400 to-emerald-500'},
    { id: 'slate-gray', name: 'Füme', gradient: 'from-slate-700 to-gray-800' },
    { id: 'dark-green', name: 'Koyu Yeşil', gradient: 'from-green-700 to-emerald-900' },
    { id: 'dark-blue', name: 'Koyu Mavi', gradient: 'from-blue-800 to-indigo-900' },
    { id: 'dark-purple', name: 'Koyu Mor', gradient: 'from-purple-800 to-violet-900' },
];

const listIcons = {
  ListChecks: ListChecks,
  Home: Home,
  Cake: Cake,
  ShoppingCart: ShoppingCart,
  Notebook: Notebook,
};

const createListSchema = z.object({
  name: z.string().min(2, "Liste adı en az 2 karakter olmalıdır."),
  icon: z.string().min(1, "Bir ikon seçmelisiniz."),
});

type CreateListFormData = z.infer<typeof createListSchema>;

const CreateListDialog = ({ isOpen, onOpenChange, onCreate }: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (data: CreateListFormData) => void;
}) => {
    const form = useForm<CreateListFormData>({
        resolver: zodResolver(createListSchema),
        defaultValues: { name: '', icon: 'ShoppingCart' },
    });
    
    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Yeni Alışveriş Listesi Oluştur</DialogTitle>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onCreate)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Liste Adı</FormLabel>
                                    <FormControl>
                                        <Input placeholder={"Haftalık Market Alışverişi"} {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="icon"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>İkon Seç</FormLabel>
                                    <div className="flex flex-wrap gap-2">
                                        {Object.keys(listIcons).map(iconName => {
                                            const Icon = listIcons[iconName as keyof typeof listIcons];
                                            return (
                                                <Button
                                                    key={iconName}
                                                    type="button"
                                                    variant={field.value === iconName ? 'default' : 'outline'}
                                                    size="icon"
                                                    onClick={() => field.onChange(iconName)}
                                                >
                                                    <Icon className="h-5 w-5" />
                                                </Button>
                                            )
                                        })}
                                    </div>
                                     <FormMessage />
                                </FormItem>
                            )}
                        />
                        <DialogFooter>
                            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>İptal</Button>
                            <Button type="submit">Oluştur</Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
};

const ListCard = ({ list, colorClass, onClick, onDelete }: { 
    list: ShoppingList; 
    colorClass: string; 
    onClick: () => void;
    onDelete: (id: string) => void;
}) => {
    const Icon = listIcons[list.icon as keyof typeof listIcons] || ShoppingCart;
    const items = list.items || [];
    const pendingItems = items.filter(item => !item.isBought).length;
    const description = pendingItems > 0 ? `${pendingItems} öğe kaldı` : (items.length > 0 ? 'Tüm öğeler alındı' : 'Liste boş');

    return (
        <div className="relative group">
            <div onClick={onClick} className={cn("flex items-center gap-4 text-white px-4 py-3 cursor-pointer rounded-xl shadow-lg border-0", colorClass)}>
                <div className="bg-white/20 text-white flex items-center justify-center rounded-lg shrink-0 size-12">
                    <Icon className="h-6 w-6" />
                </div>
                <div className="flex flex-col justify-center min-w-0">
                    <p className="text-lg font-bold leading-tight truncate">{list.name}</p>
                    <p className="text-white/80 text-sm font-normal truncate">
                        {description}
                    </p>
                </div>
            </div>
             <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <AlertDialog>
                    <AlertDialogTrigger asChild>
                         <Button variant="destructive" size="icon" className="h-7 w-7 bg-black/30 hover:bg-black/50 border-0" onClick={(e) => e.stopPropagation()}>
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                        <AlertDialogHeader>
                            <AlertDialogTitleComponent>"{list.name}" listesini sil?</AlertDialogTitleComponent>
                            <AlertDialogDescription>Bu işlem geri alınamaz. Liste ve içindeki tüm öğeler kalıcı olarak silinecektir.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>İptal</AlertDialogCancel>
                            <AlertDialogAction onClick={() => onDelete(list.id)}>Sil</AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>
        </div>
    );
};


export default function ShoppingPage() {
  const [shoppingLists, setShoppingLists] = useState<ShoppingList[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const { toast } = useToast();
  
  const [isCreateListOpen, setCreateListOpen] = useState(false);
  const [selectedList, setSelectedList] = useState<ShoppingList | null>(null);
  const [selectedListColor, setSelectedListColor] = useState<string>('bg-gray-500');
  const [newItemName, setNewItemName] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isAiProcessing, setIsAiProcessing] = useState(false);
  
  useEffect(() => {
    const unsubShopping = onShoppingListsUpdate((lists) => {
        setShoppingLists(lists);
        setIsLoaded(true);
    });
    return () => {
        unsubShopping();
    }
  }, []);

  useEffect(() => {
    if (selectedList && shoppingLists) {
      const updatedList = shoppingLists.find(l => l.id === selectedList.id);
      if (updatedList) {
        setSelectedList(updatedList);
      } else {
        setSelectedList(null);
      }
    }
  }, [shoppingLists, selectedList]);
  
  const historicalItems = useMemo(() => {
    const items = new Set<string>();
    shoppingLists.forEach(list => {
      (list.items || []).forEach(item => {
        items.add(item.name);
      });
    });
    return Array.from(items);
  }, [shoppingLists]);

  useEffect(() => {
    if (newItemName.trim() === '') {
      setSuggestions([]);
      return;
    }

    const lowercasedQuery = newItemName.toLowerCase();
    const filteredHistory = historicalItems
      .filter(item => item.toLowerCase().includes(lowercasedQuery))
      .slice(0, 5); // Limit history suggestions

    const filteredDefaults = defaultShoppingItems
      .filter(item => item.toLowerCase().includes(lowercasedQuery) && !filteredHistory.includes(item))
      .slice(0, 5); // Limit default suggestions

    setSuggestions([...filteredHistory, ...filteredDefaults]);
  }, [newItemName, historicalItems]);


  const handleCreateList = async (data: CreateListFormData) => {
    await addShoppingList(data.name, data.icon);
    toast({ title: "Alışveriş Listesi Oluşturuldu!" });
    setCreateListOpen(false);
  };
  
  const handleAddItem = async (e?: React.FormEvent, itemName?: string) => {
    e?.preventDefault();
    const itemToAdd = itemName || newItemName;
    if (itemToAdd.trim() && selectedList) {
        setIsAiProcessing(true);
        try {
            const aiResult = await generateShoppingListItems(itemToAdd.trim());
            const batchId = Date.now().toString();
            for (const item of aiResult.items) {
                await addShoppingListItemToList(selectedList.id, item);
            }
        } catch (error) {
            console.error("AI processing error:", error);
            await addShoppingListItemToList(selectedList.id, { name: itemToAdd.trim() });
        } finally {
            setNewItemName('');
            setIsAiProcessing(false);
        }
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    handleAddItem(undefined, suggestion);
    setNewItemName('');
    setSuggestions([]);
  };

  const { pendingItemsByCategory, boughtItemsByCategory } = useMemo(() => {
    if (!selectedList) return { pendingItemsByCategory: {}, boughtItemsByCategory: {} };

    const pendingGrouped: { [key: string]: ShoppingListItemType[] } = {};
    const boughtGrouped: { [key: string]: ShoppingListItemType[] } = {};
    
    const allItems = [...(selectedList.items || [])];

    allItems.forEach(item => {
        const category = item.category || 'Diğer';
        if (item.isBought) {
            if (!boughtGrouped[category]) boughtGrouped[category] = [];
            boughtGrouped[category].push(item);
        } else {
            if (!pendingGrouped[category]) pendingGrouped[category] = [];
            pendingGrouped[category].push(item);
        }
    });

    Object.values(pendingGrouped).forEach(arr => arr.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || '')));
    Object.values(boughtGrouped).forEach(arr => arr.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || '')));


    return { pendingItemsByCategory: pendingGrouped, boughtItemsByCategory: boughtGrouped };
  }, [selectedList]);

  
  const handleSelectList = (list: ShoppingList, color: string) => {
      setSelectedList(list);
      setSelectedListColor(color);
  };
  
  const handleDeleteList = async (id: string) => {
      try {
          await deleteShoppingList(id);
          toast({ title: "Liste Silindi", variant: "destructive" });
      } catch (error) {
          toast({ title: "Hata", description: "Liste silinirken bir sorun oluştu.", variant: "destructive" });
      }
  };

  if (!isLoaded) {
    return (
      <div className="space-y-6">
        <PageHeader title="Alışveriş Listeleri" />
        <Skeleton className="h-12 w-full" />
        <div className="space-y-4 mt-4">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      </div>
    );
  }

  if (selectedList) {
     return (
        <div className="relative h-full flex flex-col -mx-4 sm:mx-0">
            <header className={cn("p-4 sm:rounded-t-xl flex-shrink-0", selectedListColor)}>
              <div className="flex items-center justify-between">
                  <h1 className="text-2xl font-bold text-white">{selectedList.name}</h1>
                  <div className='flex items-center gap-2'>
                    <Button variant="ghost" className="text-white hover:text-white hover:bg-white/20" onClick={() => setSelectedList(null)}>
                      <ArrowLeft className="h-5 w-5 mr-2" /> Geri
                    </Button>
                  </div>
                </div>
                <div className="mt-4 relative">
                  <form onSubmit={handleAddItem} className="flex gap-2">
                      <Input value={newItemName} onChange={(e) => setNewItemName(e.target.value)} placeholder="Birden fazla öğe ekleyebilirsiniz..." className="peer bg-white/90 text-gray-800 placeholder:text-gray-500" disabled={isAiProcessing}/>
                      <Button type="submit" variant="secondary" disabled={isAiProcessing}>
                        {isAiProcessing ? <Loader2 className="h-5 w-5 animate-spin" /> : <Plus className="h-5 w-5" />}
                      </Button>
                  </form>
                  {suggestions.length > 0 && (
                      <div className="absolute top-full left-0 right-0 mt-2 p-2 bg-background border rounded-lg shadow-lg z-10">
                        <div className="flex flex-wrap gap-2">
                          {suggestions.map((s, i) => (
                            <Button
                                key={i}
                                type="button"
                                variant="secondary"
                                size="sm"
                                onMouseDown={(e) => { e.preventDefault(); handleSuggestionClick(s); }}
                            >
                                {s}
                            </Button>
                        ))}
                        </div>
                      </div>
                  )}
              </div>
            </header>
            
            <Tabs defaultValue="list" className="flex-grow flex flex-col min-h-0 bg-background sm:rounded-b-xl sm:border-x sm:border-b">
                <TabsList className="grid w-full grid-cols-2 flex-shrink-0">
                    <TabsTrigger value="list">Liste</TabsTrigger>
                    <TabsTrigger value="bought">Alınanlar ({Object.values(boughtItemsByCategory).flat().length})</TabsTrigger>
                </TabsList>
                <TabsContent value="list" className="flex-grow overflow-y-auto p-4 mt-0">
                    <div className="space-y-6">
                        {Object.keys(pendingItemsByCategory).length > 0 ? Object.entries(pendingItemsByCategory).map(([category, items]) => (
                            <Card key={category}>
                                <CardHeader className="py-3 px-4"><CardTitle className="text-base">{category}</CardTitle></CardHeader>
                                <CardContent className="p-0">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 border-t">
                                        {items.map((item, index) => (
                                            <div 
                                                key={item.id} 
                                                className={cn("flex items-center p-3 group cursor-pointer gap-3", index % 2 === 0 && 'sm:border-r')}
                                                onClick={() => toggleShoppingListItemStatusInList(selectedList.id, item.id, true)}
                                            >
                                                <Checkbox id={item.id} checked={false} className="size-5 pointer-events-none" />
                                                <label htmlFor={item.id} className="font-medium cursor-pointer">{item.name}</label>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        )) : (
                            <div className="text-center py-16 text-muted-foreground">
                                <ShoppingCart className="mx-auto h-12 w-12" />
                                <p className="mt-4">Listeniz boş.</p>
                                <p className="text-sm">Yukarıdaki alandan yeni ürünler ekleyin.</p>
                            </div>
                        )}
                    </div>
                </TabsContent>
                <TabsContent value="bought" className="flex-grow overflow-y-auto p-4 mt-0">
                    {Object.keys(boughtItemsByCategory).length > 0 && (
                        <div className="flex justify-end mb-4">
                            <AlertDialog>
                                <AlertDialogTrigger asChild><Button variant="destructive" size="sm"><Trash2 className="h-4 w-4 mr-2"/>Alınanları Temizle</Button></AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader><AlertDialogTitleComponent>Emin misiniz?</AlertDialogTitleComponent><AlertDialogDescription>Tüm alınan öğeler kalıcı olarak silinecektir.</AlertDialogDescription></AlertDialogHeader>
                                    <AlertDialogFooter><AlertDialogCancel>İptal</AlertDialogCancel><AlertDialogAction onClick={() => clearBoughtItemsFromList(selectedList.id)}>Evet, Sil</AlertDialogAction></AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </div>
                    )}
                    <div className="space-y-6">
                        {Object.keys(boughtItemsByCategory).length > 0 ? Object.entries(boughtItemsByCategory).map(([category, items]) => (
                            <Card key={category}>
                                <CardHeader className="py-3 px-4"><CardTitle className="text-base">{category}</CardTitle></CardHeader>
                                <CardContent className="p-0">
                                     <div className="grid grid-cols-1 sm:grid-cols-2 border-t">
                                        {items.map((item, index) => (
                                            <div key={item.id} className={cn("flex items-center p-3 group cursor-pointer gap-3", index % 2 === 0 && 'sm:border-r')}>
                                                <Checkbox
                                                    id={item.id}
                                                    checked={true}
                                                    className="size-5"
                                                    onClick={() => toggleShoppingListItemStatusInList(selectedList.id, item.id, false)}
                                                />
                                                <label htmlFor={item.id} className="font-medium cursor-pointer line-through text-muted-foreground">{item.name}</label>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        )) : (
                            <div className="text-center py-16 text-muted-foreground">
                                <p>Henüz alınmış ürün yok.</p>
                            </div>
                        )}
                    </div>
                </TabsContent>
            </Tabs>
        </div>
     );
  }

  return (
    <div className="space-y-6">
        <PageHeader title="Alışveriş Listeleri">
            <Button variant="outline" className="bg-white/20 text-white hover:bg-white/30 border-none" onClick={() => setCreateListOpen(true)}>
                <PlusCircle className="size-4 mr-2" /> Yeni Liste Oluştur
            </Button>
        </PageHeader>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 -mx-4 sm:mx-0">
            {shoppingLists.length > 0 ? (
                shoppingLists.map((list, index) => {
                    const color = brightColors[index % brightColors.length];
                    return (
                        <ListCard 
                            key={list.id} 
                            list={list} 
                            colorClass={cn("bg-gradient-to-br", color.gradient)} 
                            onClick={() => handleSelectList(list, cn("bg-gradient-to-br", color.gradient))}
                            onDelete={handleDeleteList}
                        />
                    )
                })
            ) : (
                <div className="md:col-span-2 text-center text-muted-foreground py-16 flex flex-col items-center justify-center border-2 border-dashed rounded-lg bg-background">
                    <ShoppingCart className="mx-auto h-12 w-12 text-muted-foreground/50" />
                    <p className="mt-4 text-md">Henüz alışveriş listeniz yok.</p>
                    <p className="text-sm text-muted-foreground">Başlamak için "Yeni Liste Oluştur"a tıklayın.</p>
                </div>
            )}
        </div>
      <CreateListDialog isOpen={isCreateListOpen} onOpenChange={setCreateListOpen} onCreate={handleCreateList} />
    </div>
  );
}
