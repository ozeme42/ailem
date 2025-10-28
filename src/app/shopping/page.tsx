
"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, X, ArrowLeft, ListChecks, Notebook, Edit, Home, Cake, ShoppingCart, Trash2, PlusCircle, Repeat, Loader2, Archive } from "lucide-react";
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
import { Separator } from '@/components/ui/separator';


const brightColors = [
    { id: 'blue-indigo', name: 'Mavi', gradient: 'from-blue-500 to-indigo-600' },
    { id: 'teal-green', name: 'Açık Yeşil', gradient: 'from-teal-400 to-green-500' },
    { id: 'amber-orange', name: 'Turuncu', gradient: 'from-amber-400 to-orange-500' },
    { id: 'rose-red', name: 'Gül Kurusu', gradient: 'from-rose-400 to-red-500' },
    { id: 'cyan-sky', name: 'Camgöbeği', gradient: 'from-cyan-400 to-sky-500' },
    { id: 'violet-purple', name: 'Menekşe', gradient: 'from-violet-500 to-purple-600' },
    { id: 'pink-fuchsia', name: 'Pembe', gradient: 'from-pink-500 to-fuchsia-500' },
    { id: 'lime-emerald', name: 'Fıstık Yeşili', gradient: 'from-lime-400 to-emerald-500'},
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

const ListCard = ({ list, colorClass, onClick, onEdit, onDelete }: { 
    list: ShoppingList; 
    colorClass: string; 
    onClick: () => void;
    onEdit: () => void;
    onDelete: (id: string) => void;
}) => {
    const Icon = listIcons[list.icon as keyof typeof listIcons] || ShoppingCart;
    const pendingItems = (list.items || []).filter(item => !item.isBought);
    const hasBoughtItems = (list.boughtItems || []).length > 0;

    const description = pendingItems.length > 0 ? `${pendingItems.length} ihtiyaç kaldı` : (list.items.length > 0 || hasBoughtItems) ? 'Tüm ihtiyaçlar tamam' : 'Liste boş';

    return (
        <div className="relative group">
            <div onClick={onClick} className={cn("flex flex-col text-white p-4 cursor-pointer rounded-xl shadow-lg border-0 h-full min-h-[160px]", colorClass)}>
                <div className="flex items-start gap-4">
                    <div className="bg-white/20 text-white flex items-center justify-center rounded-lg shrink-0 size-12">
                        <Icon className="h-6 w-6" />
                    </div>
                    <div className="flex flex-col justify-center min-w-0">
                        <p className="text-lg font-bold leading-tight truncate">{list.name}</p>
                    </div>
                </div>
                <div className="flex-grow mt-3 space-y-1">
                    {pendingItems.length > 0 ? (
                        <>
                            {pendingItems.slice(0, 3).map(item => (
                                <div key={item.id} className="flex items-center gap-2 text-sm">
                                    <div className="w-4 h-4 rounded-sm border-2 border-white/50 bg-white/20 shrink-0"/>
                                    <span className="truncate">{item.name}</span>
                                </div>
                            ))}
                            {pendingItems.length > 3 && (
                                <p className="text-xs text-white/80 pt-1">+ {pendingItems.length - 3} ürün daha...</p>
                            )}
                        </>
                    ) : (list.items.length > 0 || hasBoughtItems) ? (
                        <div className="flex items-center gap-2 text-sm p-2 rounded-md bg-white/20">
                            <ListChecks className="h-4 w-4"/>
                            <span>Tüm ihtiyaçlar tamam!</span>
                        </div>
                    ) : (
                        <p className="text-sm text-white/80">Liste boş</p>
                    )}
                </div>
            </div>
             <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button variant="secondary" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); onEdit(); }}><Edit className="h-4 w-4" /></Button>
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
            return dateA - dateB;
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
    // Directly filter and sort items for rendering
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
        return (categoryOrder[catA] || 99) - (categoryOrder[catB] || 99);
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
            
             <div className={cn("flex-grow flex flex-col min-h-0 -mx-4 sm:mx-0")}>
                <Tabs defaultValue="pending" className="flex-grow flex flex-col min-h-0">
                    <TabsList className="grid w-full grid-cols-2 flex-shrink-0">
                        <TabsTrigger value="pending">Alınacaklar ({(pendingItems || []).filter(i => !i.isBought).length})</TabsTrigger>
                        <TabsTrigger value="bought">Alınanlar ({boughtItems.length})</TabsTrigger>
                    </TabsList>
                    <TabsContent value="pending" className="flex-grow bg-yellow-100 dark:bg-yellow-900/40">
                        <div className="divide-y divide-yellow-300 dark:divide-yellow-700/50">
                            {sortedPendingCategories.map(([category, items]) => (
                                <div key={category} className="px-4">
                                    {category !== 'Diğer' && <h3 className="font-semibold text-base py-3">{category}</h3>}
                                    <div className="divide-y divide-yellow-300 dark:divide-yellow-700/50">
                                      {items.map((item, index) => (
                                          <div key={item.id} className="flex items-center gap-4 py-3 group">
                                              <Checkbox id={item.id} checked={item.isBought} onCheckedChange={() => toggleShoppingListItemStatusInList(selectedList!.id, item.id)} className="size-6 rounded-md" />
                                              <label htmlFor={item.id} className={cn("font-semibold flex-grow cursor-pointer", item.isBought && "line-through text-muted-foreground")}>{item.name}</label>
                                              <div className={cn("flex-shrink-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity", item.isBought && "opacity-100")}>
                                                  {item.isBought && (
                                                      <>
                                                      <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => moveItemToBought(selectedList!.id, item.id)}>
                                                        <Archive className="h-4 w-4" />
                                                      </Button>
                                                      <Separator orientation="vertical" className="h-6" />
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
                    <TabsContent value="bought" className="flex-grow bg-yellow-100 dark:bg-yellow-900/40">
                        {boughtItems.length === 0 ? (
                        <div className="text-center py-16 text-muted-foreground">
                                <p>Henüz alınan bir ürün yok.</p>
                            </div>
                        ) : (
                        <div>
                            <div className="flex justify-end p-2 border-b border-yellow-300 dark:divide-yellow-700/50">
                                <AlertDialog>
                                    <AlertDialogTrigger asChild><Button variant="outline" size="sm"><Trash2 className="h-4 w-4 mr-2"/>Alınanları Temizle</Button></AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader><AlertDialogTitleComponent>Emin misiniz?</AlertDialogTitleComponent><AlertDialogDescription>Tüm alınan öğeler kalıcı olarak silinecektir.</AlertDialogDescription></AlertDialogHeader>
                                        <AlertDialogFooter><AlertDialogCancel>İptal</AlertDialogCancel><AlertDialogAction onClick={() => clearBoughtItemsFromList(selectedList.id)}>Evet, Temizle</AlertDialogAction></AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            </div>
                             <div className="divide-y divide-yellow-300 dark:divide-yellow-700/50">
                                {sortedBoughtCategories.map(([category, items]) => (
                                    <div key={category} className="px-4">
                                        {category !== 'Diğer' && <h3 className="font-semibold text-base py-3">{category}</h3>}
                                        <div className="divide-y divide-yellow-300 dark:divide-yellow-700/50">
                                            {items.map((item) => (
                                                <div key={item.id} className="flex items-center gap-4 py-3 group">
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground opacity-0 group-hover:opacity-100" onClick={() => moveItemToPending(selectedList!.id, item.id)} title="Tekrar ekle">
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
    <div className="space-y-6">
        <PageHeader title="Alışveriş Listeleri">
            <Button variant="secondary" onClick={() => { setEditingList(null); setListDialogOpen(true); }}>
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
                            onClick={() => handleSelectList(list)}
                            onEdit={() => handleEditList(list)}
                            onDelete={handleDeleteList}
                        />
                    )
                })
            ) : (
                <div className="md:col-span-2 text-center text-muted-foreground py-16 flex flex-col items-center justify-center border-2 border-dashed rounded-lg bg-background">
                    <ShoppingCart className="mx-auto h-12 w-12 text-muted-foreground/50" />
                    <p className="mt-4 text-md">Henüz alışveriş listeniz yok.</p>
                    <p className="text-sm">Başlamak için "Yeni Liste Oluştur"a tıklayın.</p>
                </div>
            )}
        </div>
      <CreateListDialog isOpen={isListDialogOpen} onOpenChange={setListDialogOpen} onCreate={handleCreateOrUpdateList} initialData={editingList} />
    </div>
  );
}
