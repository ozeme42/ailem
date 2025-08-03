
"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, X, ArrowLeft, ListChecks, Notebook, Edit, Home, Cake, ShoppingCart, Trash2, PlusCircle } from "lucide-react";
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle as AlertDialogTitleComponent, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Textarea } from '@/components/ui/textarea';
import { onShoppingListsUpdate, addShoppingList, deleteShoppingList, addShoppingListItemToList, toggleShoppingListItemStatusInList, deleteShoppingListItemFromList, clearBoughtItemsFromList } from '@/lib/dataService';
import { type ShoppingList, type ShoppingItem as ShoppingListItemType } from '@/lib/data';
import { defaultShoppingItems } from "@/lib/shopping-suggestions";
import { PageHeader } from '@/components/page-header';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';


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
  
  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (newItemName.trim() && selectedList) {
      addShoppingListItemToList(selectedList.id, newItemName.trim());
      setNewItemName('');
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    if (selectedList) {
      addShoppingListItemToList(selectedList.id, suggestion);
      setNewItemName('');
      setSuggestions([]);
    }
  };

  const pendingItems = useMemo(() => selectedList?.items.filter(item => !item.isBought) || [], [selectedList]);
  const boughtItems = useMemo(() => selectedList?.items.filter(item => item.isBought) || [], [selectedList]);
  
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
            </header>

            <main className="flex-grow p-4 bg-background sm:rounded-b-xl sm:border-x sm:border-b overflow-y-auto pb-40">
                <div className="space-y-2">
                     <h3 className="font-semibold text-lg">Alınacaklar ({pendingItems.length})</h3>
                     {pendingItems.map((item) => (
                        <div 
                            key={item.id} 
                            className="flex items-center p-3 group cursor-pointer bg-card border rounded-lg"
                            onClick={() => toggleShoppingListItemStatusInList(selectedList.id, item.id)}
                        >
                            <Checkbox id={item.id} checked={item.isBought} className="size-5 pointer-events-none" />
                            <Label htmlFor={item.id} className="ml-3 font-medium cursor-pointer">{item.name}</Label>
                            <Button variant="ghost" size="icon" className="ml-auto h-8 w-8 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100" onClick={(e) => {e.stopPropagation(); deleteShoppingListItemFromList(selectedList.id, item.id)}}><X className="h-4 w-4" /></Button>
                        </div>
                     ))}
                     {pendingItems.length === 0 && (
                        <p className="text-sm text-center text-muted-foreground py-4">Tüm ihtiyaçlar alınmış! 🎉</p>
                     )}
                </div>

                {boughtItems.length > 0 && (
                    <Accordion type="single" collapsible className="w-full mt-6">
                        <AccordionItem value="item-1">
                            <AccordionTrigger>Alınanlar ({boughtItems.length})</AccordionTrigger>
                            <AccordionContent className="space-y-2">
                                <Button variant="outline" size="sm" onClick={() => clearBoughtItemsFromList(selectedList.id)} className="w-full">
                                    Alınanları Temizle
                                </Button>
                                {boughtItems.map((item) => (
                                    <div 
                                        key={item.id} 
                                        className="flex items-center p-3 group cursor-pointer bg-card border rounded-lg bg-muted/50"
                                        onClick={() => toggleShoppingListItemStatusInList(selectedList.id, item.id)}
                                    >
                                        <Checkbox id={item.id} checked={item.isBought} className="size-5 pointer-events-none" />
                                        <Label htmlFor={item.id} className="ml-3 font-medium cursor-pointer line-through text-muted-foreground">{item.name}</Label>
                                    </div>
                                ))}
                            </AccordionContent>
                        </AccordionItem>
                    </Accordion>
                )}
            </main>

            <footer className="absolute bottom-0 left-0 right-0 p-4 bg-background/80 backdrop-blur-sm border-t">
                <form onSubmit={handleAddItem} className="flex gap-2 relative">
                    {suggestions.length > 0 && (
                        <div className="absolute bottom-full left-0 right-0 mb-2 p-2 bg-background border rounded-lg shadow-lg">
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
                    <Input value={newItemName} onChange={(e) => setNewItemName(e.target.value)} placeholder="Yeni öğe ekle..." className="peer"/>
                    <Button type="submit"><Plus className="h-5 w-5" /></Button>
                </form>
            </footer>
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
