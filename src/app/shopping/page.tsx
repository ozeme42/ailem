

"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, X, ArrowLeft, ListChecks, Notebook, Edit, Home, Cake, ShoppingCart, Trash2, PlusCircle, Repeat, Loader2, MoreVertical, Archive, ChevronRight } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle as AlertDialogTitleComponent, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { onShoppingListsUpdate, addShoppingList, updateShoppingList, deleteShoppingList, addShoppingListItemToList, clearBoughtItemsFromList, deleteShoppingListItemFromList, toggleShoppingListItemStatusInList, moveItemToBought, moveItemToPending } from '@/lib/dataService';
import { type ShoppingList, type ShoppingItem as ShoppingListItemType } from '@/lib/data';
import { defaultShoppingItems } from "@/lib/shopping-suggestions";
import { PageHeader } from '@/components/page-header';
import { generateShoppingListItems } from '@/ai/flows/generate-shopping-list-flow';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu';


const solidColors = [
    { id: 'yellow', name: 'Sarı', class: 'bg-yellow-300' },
    { id: 'rose', name: 'Somon', class: 'bg-rose-400' },
    { id: 'emerald', name: 'Yeşil', class: 'bg-emerald-400' },
    { id: 'sky', name: 'Mavi', class: 'bg-sky-400' },
    { id: 'violet', name: 'Menekşe', class: 'bg-violet-400' },
    { id: 'orange', name: 'Turuncu', class: 'bg-orange-400' },
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

const CreateListDialog = ({ isOpen, onOpenChange, onCreate, initialData }: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (data: CreateListFormData) => void;
  initialData?: ShoppingList | null;
}) => {
    const form = useForm<CreateListFormData>({
        resolver: zodResolver(createListSchema),
        defaultValues: { name: '', icon: 'ShoppingCart' },
    });
    
    React.useEffect(() => {
        if(initialData) {
            form.reset({ name: initialData.name, icon: initialData.icon });
        } else {
            form.reset({ name: '', icon: 'ShoppingCart' });
        }
    }, [initialData, form]);
    
    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{initialData ? 'Listeyi Düzenle' : 'Yeni Alışveriş Listesi Oluştur'}</DialogTitle>
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
                            <Button type="submit">{initialData ? 'Kaydet' : 'Oluştur'}</Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
};

const ListCard = ({ list, colorClass, onClick }: { 
    list: ShoppingList; 
    colorClass: string; 
    onClick: () => void;
}) => {
    const pendingItemsCount = (list.items || []).filter(item => !item.isBought).length;
    const description = pendingItemsCount > 0 ? `${pendingItemsCount} alınacak` : 'Liste tamamlandı';

    return (
        <div onClick={onClick} className={cn("flex items-center text-black p-4 cursor-pointer min-h-[80px]", colorClass)}>
             <div className="flex-grow">
                <p className="text-base font-semibold leading-tight truncate">{list.name}</p>
                <p className="text-black/70 text-sm font-normal truncate">
                    {description}
                </p>
            </div>
            <ChevronRight className="h-6 w-6 text-black/50 ml-auto shrink-0"/>
        </div>
    );
};


export default function ShoppingPage() {
  const [shoppingLists, setShoppingLists] = useState<ShoppingList[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const { toast } = useToast();
  
  const [isListDialogOpen, setListDialogOpen] = useState(false);
  const [editingList, setEditingList] = useState<ShoppingList | null>(null);
  const [selectedList, setSelectedList] = useState<ShoppingList | null>(null);
  const [newItemName, setNewItemName] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isAiProcessing, setIsAiProcessing] = useState(false);
  
  useEffect(() => {
    const unsubShopping = onShoppingListsUpdate((lists) => {
        const sortedLists = lists.sort((a, b) => {
            const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
            const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
            if (!dateA) return 1;
            if (!dateB) return -1;
            return dateB - dateA; // Sort descending, newest first
        });
        setShoppingLists(sortedLists);
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
       (list.boughtItems || []).forEach(item => {
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


  const handleCreateOrUpdateList = async (data: CreateListFormData) => {
    try {
        if (editingList) {
            await updateShoppingList(editingList.id, data);
            toast({ title: "Liste Güncellendi!" });
        } else {
            await addShoppingList(data.name, data.icon);
            toast({ title: "Alışveriş Listesi Oluşturuldu!" });
        }
        setListDialogOpen(false);
        setEditingList(null);
    } catch(e) {
        toast({ title: "Hata", description: "İşlem sırasında bir hata oluştu.", variant: 'destructive'});
    }
  };
  
 const handleAddItem = async (e?: React.FormEvent, itemName?: string) => {
    e?.preventDefault();
    const itemToAdd = itemName || newItemName;
    if (!itemToAdd.trim() || !selectedList) return;

    setIsAiProcessing(true);
    try {
        const aiResult = await generateShoppingListItems(itemToAdd.trim());
        if (aiResult?.items?.length > 0) {
            for (const item of aiResult.items) {
                await addShoppingListItemToList(selectedList.id, item);
            }
        } else {
            await addShoppingListItemToList(selectedList.id, { name: itemToAdd.trim(), category: 'Diğer' });
        }
    } catch (error) {
        console.error("AI processing error, adding item directly:", error);
        await addShoppingListItemToList(selectedList.id, { name: itemToAdd.trim(), category: 'Diğer' });
    } finally {
        setNewItemName('');
        setIsAiProcessing(false);
    }
};

  const handleSuggestionClick = (suggestion: string) => {
    handleAddItem(undefined, suggestion);
    setNewItemName('');
    setSuggestions([]);
  };

  const handleSelectList = (list: ShoppingList) => {
      setSelectedList(list);
  };
  
  const handleEditList = (list: ShoppingList) => {
      setEditingList(list);
      setListDialogOpen(true);
  }
  
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
        <PageHeader title="Listelerim" />
        <div className="space-y-2">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      </div>
    );
  }

  if (selectedList) {
    const pendingItems = (selectedList.items || []).sort((a,b) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        if (!dateA) return 1;
        if (!dateB) return -1;
        return dateA - dateB;
    });
    
    const boughtItems = (selectedList.boughtItems || []).sort((a,b) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        if (!dateA) return 1;
        if (!dateB) return -1;
        return dateA - dateB;
    });

    const groupedPendingItems = pendingItems.reduce((acc, item) => {
            const category = item.category || 'Diğer';
            if (!acc[category]) acc[category] = [];
            acc[category].push(item);
            return acc;
        }, {} as Record<string, ShoppingListItemType[]>);
        
    const groupedBoughtItems = boughtItems.reduce((acc, item) => {
            const category = item.category || 'Diğer';
            if (!acc[category]) acc[category] = [];
            acc[category].push(item);
            return acc;
        }, {} as Record<string, ShoppingListItemType[]>);
        
    const categoryOrder: { [key: string]: number } = {
        'Meyve ve Sebze': 1, 'Et ve Tavuk Ürünleri': 2, 'Süt Ürünleri': 3, 'Unlu Mamüller': 4,
        'Temel Gıda': 5, 'Atıştırmalık': 6, 'İçecekler': 7, 'Dondurulmuş Gıdalar': 8,
        'Temizlik Ürünleri': 9, 'Kişisel Bakım': 10, 'Bebek Ürünleri': 11, 'Diğer': 99
    };
    
    const sortedPendingCategories = Object.entries(groupedPendingItems).sort(([catA], [catB]) => {
        return (categoryOrder[catA] || 99) - (categoryOrder[catB] || 99);
    });
    
    const sortedBoughtCategories = Object.entries(groupedBoughtItems).sort(([catA], [catB]) => {
        return (categoryOrder[catB] || 99) - (categoryOrder[catA] || 99);
    });

     return (
        <div className="relative h-full flex flex-col">
            <PageHeader title={selectedList.name}>
                <div className="w-full flex items-center justify-between gap-4">
                     <Button variant="ghost" className="text-white hover:text-white hover:bg-white/20" onClick={() => setSelectedList(null)}>
                        <ArrowLeft className="h-5 w-5 mr-2" /> Geri
                     </Button>
                </div>
                 <form onSubmit={handleAddItem} className="relative w-full">
                    <Input 
                        value={newItemName} 
                        onChange={(e) => setNewItemName(e.target.value)} 
                        placeholder="Yeni öğe ekle (örn: 2 kilo domates, 1 paket süt)"
                        className="bg-white/20 border-white/30 text-white placeholder:text-white/70 focus-visible:ring-offset-0 focus-visible:ring-white"
                        disabled={isAiProcessing}
                    />
                    <Button type="submit" variant="secondary" disabled={isAiProcessing} className="absolute right-1 top-1/2 -translate-y-1/2 h-8 px-3">
                        {isAiProcessing ? <Loader2 className="h-5 w-5 animate-spin" /> : "Ekle"}
                    </Button>
                    {suggestions.length > 0 && (
                    <div className="relative w-full">
                        <div className="absolute top-full left-0 right-0 mt-1 p-2 bg-background border rounded-lg shadow-lg z-10">
                            <div className="flex flex-wrap gap-2">
                            {suggestions.map((s, i) => (
                                <Button key={i} type="button" variant="secondary" size="sm" onMouseDown={(e) => { e.preventDefault(); handleSuggestionClick(s); }}>{s}</Button>
                            ))}
                            </div>
                        </div>
                    </div>
                )}
                </form>
            </PageHeader>
            
             <div className={cn("flex-grow flex flex-col min-h-0", "")}>
                <Tabs defaultValue="pending" className="flex-grow flex flex-col min-h-0">
                    <TabsList className="flex w-full h-auto flex-shrink-0 bg-background p-0 rounded-none">
                        <TabsTrigger value="pending" className="flex-1 text-base rounded-none data-[state=active]:border-b-primary data-[state=active]:shadow-none border-b-2 border-b-transparent">Alınacaklar ({(pendingItems || []).filter(i => !i.isBought).length})</TabsTrigger>
                        <Separator orientation="vertical" className="h-6 self-center" />
                        <TabsTrigger value="bought" className="flex-1 text-base rounded-none data-[state=active]:border-b-primary data-[state=active]:shadow-none border-b-2 border-b-transparent">Alınanlar ({boughtItems.length})</TabsTrigger>
                    </TabsList>
                    <TabsContent value="pending" className="flex-grow bg-sky-50 dark:bg-sky-900/20">
                        <div className="divide-y divide-sky-200 dark:divide-sky-800">
                            {sortedPendingCategories.map(([category, items]) => (
                                <div key={category} className="px-4">
                                    {category !== 'Diğer' && <h3 className="font-semibold text-base py-3">{category}</h3>}
                                    <div className="divide-y divide-sky-200 dark:divide-sky-800">
                                      {items.map((item, index) => (
                                          <div key={item.id} className="flex items-center gap-4 py-3 group">
                                              <Checkbox id={item.id} checked={item.isBought} onCheckedChange={() => toggleShoppingListItemStatusInList(selectedList!.id, item.id)} className="size-6 rounded-md" />
                                              <label htmlFor={item.id} className={cn("font-semibold flex-grow cursor-pointer", item.isBought && "line-through text-muted-foreground")}>{item.name}</label>
                                              <div className={cn("flex-shrink-0 flex items-center gap-1 transition-opacity", (item.isBought || 'group-hover:opacity-100') ? 'opacity-100' : 'opacity-0')}>
                                                  {item.isBought && (
                                                      <>
                                                      <Separator orientation="vertical" className="h-6 mx-1" />
                                                      <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => moveItemToBought(selectedList!.id, item.id)}>
                                                        <Archive className="h-4 w-4" />
                                                      </Button>
                                                      <Separator orientation="vertical" className="h-6 mx-1" />
                                                      </>
                                                  )}
                                                  <AlertDialog>
                                                      <AlertDialogTrigger asChild>
                                                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive/70 hover:text-destructive"><Trash2 className="h-4 w-4" /></Button>
                                                      </AlertDialogTrigger>
                                                      <AlertDialogContent>
                                                          <AlertDialogHeader><AlertDialogTitleComponent>Alınacaklardan Sil</AlertDialogTitleComponent><AlertDialogDescription>Bu ürünü kalıcı olarak silmek istediğinizden emin misiniz?</AlertDialogDescription></AlertDialogHeader>
                                                          <AlertDialogFooter><AlertDialogCancel>İptal</AlertDialogCancel><AlertDialogAction onClick={() => deleteShoppingListItemFromList(selectedList!.id, item.id, false)}>Sil</AlertDialogAction></AlertDialogFooter>
                                                      </AlertDialogContent>
                                                  </AlertDialog>
                                              </div>
                                          </div>
                                      ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </TabsContent>
                    <TabsContent value="bought" className="flex-grow bg-sky-50 dark:bg-sky-900/20">
                        {boughtItems.length === 0 ? (
                        <div className="text-center py-16 text-muted-foreground">
                                <p>Henüz alınan bir ürün yok.</p>
                            </div>
                        ) : (
                        <div>
                             <div className="divide-y divide-sky-200 dark:divide-sky-800">
                                {sortedBoughtCategories.map(([category, items]) => (
                                    <div key={category} className="px-4">
                                        {category !== 'Diğer' && <h3 className="font-semibold text-base py-3">{category}</h3>}
                                        <div className="divide-y divide-sky-200 dark:divide-sky-800">
                                            {items.map((item) => (
                                                <div key={item.id} className="flex items-center gap-4 py-3 group">
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" onClick={() => moveItemToPending(selectedList!.id, item.id)} title="Tekrar ekle">
                                                        <Repeat className="h-4 w-4"/>
                                                    </Button>
                                                    <p className="font-semibold flex-grow line-through text-muted-foreground">{item.name}</p>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive/70 hover:text-destructive opacity-0 group-hover:opacity-100" onClick={() => deleteShoppingListItemFromList(selectedList!.id, item.id, true)} title="Kalıcı olarak sil">
                                                        <Trash2 className="h-4 w-4"/>
                                                    </Button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                        )}
                    </TabsContent>
                </Tabs>
            </div>
        </div>
     );
  }

  return (
    <div className="space-y-0">
        <PageHeader title="Listelerim" />
        <div className="space-y-0">
            {shoppingLists.length > 0 ? (
                shoppingLists.map((list, index) => {
                    const color = solidColors[index % solidColors.length];
                    return (
                        <ListCard 
                            key={list.id} 
                            list={list} 
                            colorClass={color.class} 
                            onClick={() => handleSelectList(list)}
                        />
                    )
                })
            ) : (
                <div className="md:col-span-3 text-center text-muted-foreground py-16 flex flex-col items-center justify-center border-2 border-dashed rounded-lg bg-background">
                    <ShoppingCart className="mx-auto h-12 w-12 text-muted-foreground/50" />
                    <p className="mt-4 text-md">Henüz alışveriş listeniz yok.</p>
                    <p className="text-sm">Başlamak için aşağıdaki butona tıklayarak yeni bir liste oluşturun.</p>
                </div>
            )}
        </div>
        <div className="fixed bottom-6 right-6 z-10">
            <Button className="rounded-full w-16 h-16 shadow-lg bg-orange-500 hover:bg-orange-600" size="icon" onClick={() => { setEditingList(null); setListDialogOpen(true); }}>
                <Plus className="h-8 w-8"/>
            </Button>
        </div>
      <CreateListDialog isOpen={isListDialogOpen} onOpenChange={setListDialogOpen} onCreate={handleCreateOrUpdateList} initialData={editingList} />
    </div>
  );
}
