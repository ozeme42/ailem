

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
import { buttonVariants } from '@/components/ui/button';


const solidColors = [
    { id: 'light-blue', name: 'Açık Mavi', class: 'bg-[#a3d9e4]' },
    { id: 'light-pink', name: 'Açık Pembe', class: 'bg-[#f4b4c4]' },
    { id: 'emerald-teal', name: 'Yeşil', class: 'bg-[#98b883]' },
    { id: 'rose-pink', name: 'Somon', class: 'bg-[#e5a996]' },
    { id: 'violet-purple', name: 'Menekşe', class: 'from-violet-400 to-purple-500' },
    { id: 'orange-red', name: 'Turuncu', class: 'from-orange-400 to-red-500' },
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

const ListCard = ({ list, colorClass, onClick, onEdit, onDelete }: { 
    list: ShoppingList; 
    colorClass: string; 
    onClick: () => void;
    onEdit: () => void;
    onDelete: (id: string) => void;
}) => {
    const Icon = listIcons[list.icon as keyof typeof listIcons] || ShoppingCart;
    const items = list.items || [];
    const pendingItems = items.filter(item => !item.isBought).length;
    const hasBoughtItems = (list.boughtItems || []).length > 0;
    
    const description = pendingItems > 0 
        ? `${pendingItems} ihtiyaç`
        : (items.length > 0 || hasBoughtItems) 
            ? 'Tüm ihtiyaçlar tamam' 
            : 'Liste boş';

    return (
        <div className="relative group overflow-hidden shadow-sm" onClick={onClick}>
            <div className={cn("flex items-center text-black p-4 cursor-pointer min-h-[112px]", colorClass)}>
                 <div className="flex-grow">
                    <p className="text-base font-semibold leading-tight truncate">{list.name}</p>
                    <p className="text-black/70 text-sm font-normal truncate">
                        {description}
                    </p>
                </div>
                <ChevronRight className="h-6 w-6 text-black/50 ml-auto shrink-0"/>
            </div>
             <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-black hover:text-black hover:bg-black/10" onClick={(e) => e.stopPropagation()}>
                            <MoreVertical className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent onClick={(e) => e.stopPropagation()}>
                         <DropdownMenuItem onClick={onEdit}>
                            <Edit className="mr-2 h-4 w-4"/> Düzenle
                        </DropdownMenuItem>
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <DropdownMenuItem onSelect={e => e.preventDefault()} className="text-destructive focus:text-destructive">
                                    <Trash2 className="mr-2 h-4 w-4"/> Sil
                                </DropdownMenuItem>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
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
                    </DropdownMenuContent>
                </DropdownMenu>
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
  const [isAddItemDialogOpen, setIsAddItemDialogOpen] = useState(false);

  useEffect(() => {
    const unsubShopping = onShoppingListsUpdate((lists) => {
        const sortedLists = lists.sort((a, b) => {
            const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
            const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
            if (!dateA) return 1;
            if (!dateB) return -1;
            return dateB - dateA;
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
      .filter(item => item.toLowerCase().startsWith(lowercasedQuery))
      .slice(0, 5);

    const filteredDefaults = defaultShoppingItems
      .filter(item => item.toLowerCase().startsWith(lowercasedQuery) && !filteredHistory.includes(item))
      .slice(0, 5);

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
        setIsAddItemDialogOpen(false);
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
      <div className="space-y-6 h-full">
        <PageHeader title="Listelerim" className="bg-[#f2994a] rounded-none shadow-none mb-0"/>
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

     return (
        <div className="relative h-full flex flex-col bg-[#f4eeb4]">
            <PageHeader title={selectedList.name} className="bg-[#f2994a] rounded-none shadow-none mb-0">
                <div className="w-full flex items-center justify-between gap-4">
                     <Button variant="ghost" className="text-white hover:text-white hover:bg-black/20" onClick={() => setSelectedList(null)}>
                        <ArrowLeft className="h-5 w-5 mr-2" /> Geri
                     </Button>
                </div>
            </PageHeader>
            
             <div className={cn("flex-grow flex flex-col min-h-0")}>
                <Tabs defaultValue="pending" className="flex-grow flex flex-col min-h-0">
                    <TabsList className="flex w-full h-auto flex-shrink-0 bg-[#f4eeb4] p-0 rounded-none gap-4">
                        <TabsTrigger value="pending" className="flex-1 text-lg font-semibold rounded-none data-[state=active]:border-b-red-500 data-[state=active]:text-red-600 data-[state=active]:shadow-none border-b-2 border-b-transparent py-3">Alınacaklar ({(pendingItems || []).filter(i => !i.isBought).length})</TabsTrigger>
                        <Separator orientation="vertical" className="h-6 self-center bg-black/20" />
                        <TabsTrigger value="bought" className="flex-1 text-lg font-semibold rounded-none data-[state=active]:border-b-red-500 data-[state=active]:text-red-600 data-[state=active]:shadow-none border-b-2 border-b-transparent py-3">Alınanlar ({boughtItems.length})</TabsTrigger>
                    </TabsList>
                    <TabsContent value="pending" className="flex-grow bg-[#f4eeb4] p-4">
                         <div className="space-y-0">
                            {pendingItems.map((item, index) => (
                                <div key={item.id} className="flex items-center gap-4 py-4 border-b border-black/10 group">
                                    <Checkbox id={item.id} checked={item.isBought} onCheckedChange={() => toggleShoppingListItemStatusInList(selectedList!.id, item.id)} className="size-6 rounded-md border-black/30 data-[state=checked]:bg-green-500 data-[state=checked]:text-white" />
                                    <label htmlFor={item.id} className={cn("font-medium flex-grow cursor-pointer", item.isBought && "line-through text-black/40")}>{item.name}</label>
                                    <div className={cn("flex-shrink-0 flex items-center gap-1 transition-opacity", item.isBought ? 'opacity-100' : 'opacity-0 group-hover:opacity-100')}>
                                        {item.isBought ? (
                                            <Button variant="secondary" size="sm" onClick={() => moveItemToBought(selectedList!.id, item.id)}>
                                                Arşivle
                                            </Button>
                                        ) : (
                                            <AlertDialog>
                                                <AlertDialogTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-black/40 hover:text-destructive"><Trash2 className="h-4 w-4" /></Button>
                                                </AlertDialogTrigger>
                                                <AlertDialogContent>
                                                    <AlertDialogHeader>
                                                        <AlertDialogTitleComponent>İşlem Seç</AlertDialogTitleComponent>
                                                        <AlertDialogDescription>Bu ürünü kalıcı olarak silmek mi yoksa alınanlar listesine mi taşımak istiyorsunuz?</AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter>
                                                        <div className="flex gap-2 justify-end w-full">
                                                          <Button variant="secondary" onClick={() => {
                                                              toggleShoppingListItemStatusInList(selectedList!.id, item.id);
                                                              moveItemToBought(selectedList!.id, item.id);
                                                          }}>Arşivle</Button>
                                                          <AlertDialogCancel>İptal</AlertDialogCancel>
                                                          <AlertDialogAction onClick={() => deleteShoppingListItemFromList(selectedList!.id, item.id, false)} className={cn(buttonVariants({variant: 'destructive'}))}>Sil</AlertDialogAction>
                                                        </div>
                                                    </AlertDialogFooter>
                                                </AlertDialogContent>
                                            </AlertDialog>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </TabsContent>
                    <TabsContent value="bought" className="flex-grow bg-[#f4eeb4] p-4">
                        {boughtItems.length === 0 ? (
                        <div className="text-center py-16 text-black/50">
                                <p>Henüz alınan bir ürün yok.</p>
                            </div>
                        ) : (
                        <div>
                           <div className="space-y-0">
                                {boughtItems.map((item) => (
                                    <div key={item.id} className="flex items-center gap-4 py-4 border-b border-black/10 group">
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-black/40" onClick={() => moveItemToPending(selectedList!.id, item.id)} title="Tekrar ekle">
                                            <Repeat className="h-4 w-4"/>
                                        </Button>
                                        <p className="font-medium flex-grow line-through text-black/50">{item.name}</p>
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-black/40 hover:text-destructive opacity-0 group-hover:opacity-100" onClick={() => deleteShoppingListItemFromList(selectedList!.id, item.id, true)} title="Kalıcı olarak sil">
                                            <Trash2 className="h-4 w-4"/>
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        </div>
                        )}
                    </TabsContent>
                </Tabs>
            </div>
             <div className="fixed bottom-24 right-6 z-10 md:bottom-6">
                <Button className="rounded-full w-16 h-16 shadow-lg bg-[#eb5757] hover:bg-[#eb5757]/90" size="icon" onClick={() => setIsAddItemDialogOpen(true)}>
                    <Plus className="h-8 w-8"/>
                </Button>
            </div>
            <Dialog open={isAddItemDialogOpen} onOpenChange={setIsAddItemDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Yeni Öğe Ekle</DialogTitle>
                        <DialogDescription>Listeye eklenecek ürün veya ürünleri yazın.</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleAddItem} className="space-y-4 pt-4">
                        <Input 
                            value={newItemName} 
                            onChange={(e) => setNewItemName(e.target.value)} 
                            placeholder="örn: 2 kilo domates, 1 paket süt"
                            disabled={isAiProcessing}
                            autoFocus
                        />
                         <div className="pt-2">
                             <div className="flex flex-wrap gap-2">
                                {suggestions.map((s, i) => (
                                    <Button key={i} type="button" variant="secondary" size="sm" onMouseDown={(e) => { e.preventDefault(); handleSuggestionClick(s); }}>{s}</Button>
                                ))}
                            </div>
                        </div>
                         <DialogFooter>
                            <Button type="button" variant="ghost" onClick={() => setIsAddItemDialogOpen(false)}>İptal</Button>
                            <Button type="submit" variant="default" disabled={isAiProcessing}>
                                {isAiProcessing ? <Loader2 className="h-5 w-5 animate-spin" /> : "Ekle"}
                            </Button>
                         </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
     );
  }

  return (
    <div className="h-full flex flex-col">
        <PageHeader title="Listelerim" className="bg-[#f2994a] rounded-none shadow-none mb-0 flex-shrink-0 py-12" />
        <div className="flex-grow space-y-0 overflow-y-auto">
            {shoppingLists.length > 0 ? (
                shoppingLists.map((list, index) => {
                    const color = solidColors[index % solidColors.length];
                    return (
                        <ListCard 
                            key={list.id} 
                            list={list} 
                            colorClass={color.class} 
                            onClick={() => handleSelectList(list)}
                            onEdit={() => handleEditList(list)}
                            onDelete={handleDeleteList}
                        />
                    )
                })
            ) : (
                <div className="text-center text-muted-foreground py-16 flex flex-col items-center justify-center border-2 border-dashed rounded-lg bg-background h-full">
                    <ShoppingCart className="mx-auto h-12 w-12 text-muted-foreground/50" />
                    <p className="mt-4 text-md">Henüz alışveriş listeniz yok.</p>
                    <p className="text-sm">Başlamak için aşağıdaki butona tıklayarak yeni bir liste oluşturun.</p>
                </div>
            )}
        </div>
        <div className="fixed bottom-24 right-6 z-10 md:bottom-6">
            <Button className="rounded-full w-16 h-16 shadow-lg bg-[#eb5757] hover:bg-[#eb5757]/90" size="icon" onClick={() => { setEditingList(null); setListDialogOpen(true); }}>
                <Plus className="h-8 w-8"/>
            </Button>
        </div>
      <CreateListDialog isOpen={isListDialogOpen} onOpenChange={setListDialogOpen} onCreate={handleCreateOrUpdateList} initialData={editingList} />
    </div>
  );
}
