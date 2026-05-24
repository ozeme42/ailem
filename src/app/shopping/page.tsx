"use client";

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Plus, ArrowLeft, ListChecks, ShoppingCart, Trash2, MoreVertical, CheckCircle2, Search, Sparkles, Home, Cake, Notebook, Edit, Check, ChevronUp, ChevronDown } from "lucide-react";
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle as AlertDialogTitleComponent, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { onShoppingListsUpdate, addShoppingList, updateShoppingList, deleteShoppingList, addShoppingListItemToList, deleteShoppingListItemFromList, toggleShoppingListItemStatusInList, moveItemToBought, moveItemToPending } from '@/lib/dataService';
import { type ShoppingList, type ShoppingItem as ShoppingListItemType } from '@/lib/data';
import { defaultShoppingItems } from "@/lib/shopping-suggestions";
import { generateShoppingListItems } from '@/ai/flows/generate-shopping-list-flow';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';

// --- DESIGN SYSTEM: Modern Mobile App Theme ---
const glassColors = {
    PAGE_BG_SOFT: "bg-slate-50 dark:bg-slate-950", 
    HEADER_BG_SOFT: "bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border-b border-slate-200/50 dark:border-slate-800/50 supports-[backdrop-filter]:bg-white/60",
    CARD_BG_MATTE: "bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 shadow-sm", 
    CARD_HOVER_MATTE: "hover:border-indigo-200 dark:hover:border-indigo-800 hover:shadow-md transition-all duration-200 active:scale-[0.98]",
    TEXT_MAIN: "text-slate-900 dark:text-slate-100",
    TEXT_MUTED: "text-slate-500 dark:text-slate-400",
    ICON_BOX: "bg-gradient-to-br p-2.5 rounded-[1rem] shadow-sm text-white shrink-0", 
};

const themeColors = [
    { 
        id: 'ocean', 
        name: 'Okyanus', 
        icon: 'from-cyan-500 to-blue-500',
        accent: 'bg-cyan-500 dark:bg-cyan-600',
        checkbox: 'border-cyan-500 data-[state=checked]:bg-cyan-500 data-[state=checked]:border-cyan-500 data-[state=checked]:text-white',
        badge: 'bg-cyan-50 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-400 border-cyan-200 dark:border-cyan-800'
    },
    { 
        id: 'sunset', 
        name: 'Gün Batımı', 
        icon: 'from-orange-500 to-rose-500',
        accent: 'bg-orange-500 dark:bg-orange-600',
        checkbox: 'border-orange-500 data-[state=checked]:bg-orange-500 data-[state=checked]:border-orange-500 data-[state=checked]:text-white',
        badge: 'bg-orange-50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-800'
    },
    { 
        id: 'forest', 
        name: 'Orman', 
        icon: 'from-emerald-500 to-teal-500',
        accent: 'bg-emerald-500 dark:bg-emerald-600',
        checkbox: 'border-emerald-500 data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500 data-[state=checked]:text-white',
        badge: 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
    },
    { 
        id: 'berry', 
        name: 'Böğürtlen', 
        icon: 'from-fuchsia-500 to-purple-500',
        accent: 'bg-fuchsia-500 dark:bg-fuchsia-600',
        checkbox: 'border-fuchsia-500 data-[state=checked]:bg-fuchsia-500 data-[state=checked]:border-fuchsia-500 data-[state=checked]:text-white',
        badge: 'bg-fuchsia-50 dark:bg-fuchsia-900/30 text-fuchsia-700 dark:text-fuchsia-400 border-fuchsia-200 dark:border-fuchsia-800'
    },
    { 
        id: 'royal', 
        name: 'Asil', 
        icon: 'from-indigo-500 to-violet-500',
        accent: 'bg-indigo-500 dark:bg-indigo-600',
        checkbox: 'border-indigo-500 data-[state=checked]:bg-indigo-500 data-[state=checked]:border-indigo-500 data-[state=checked]:text-white',
        badge: 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800'
    },
];

const listIcons = {
  ShoppingCart: ShoppingCart,
  Home: Home,
  ListChecks: ListChecks,
  Cake: Cake,
  Notebook: Notebook,
};

const createListSchema = z.object({
  name: z.string().min(2, "Liste adı en az 2 karakter olmalıdır."),
  icon: z.string().min(1, "Bir ikon seçmelisiniz."),
  colorId: z.string().optional(),
});

type CreateListFormData = z.infer<typeof createListSchema>;

// --- COMPONENTS ---

const CreateListDialog = ({ isOpen, onOpenChange, onCreate, initialData }: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (data: CreateListFormData) => void;
  initialData?: ShoppingList | null;
}) => {
    const form = useForm<CreateListFormData>({
        resolver: zodResolver(createListSchema),
        defaultValues: { name: '', icon: 'ShoppingCart', colorId: 'ocean' },
    });
    
    useEffect(() => {
        if(initialData) {
            form.reset({ name: initialData.name, icon: initialData.icon, colorId: initialData.colorId || 'ocean' });
        } else {
            form.reset({ name: '', icon: 'ShoppingCart', colorId: 'ocean' });
        }
    }, [initialData, form, isOpen]);

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="w-[95%] max-w-md bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-[2rem] p-5 shadow-2xl">
                <DialogHeader>
                    <DialogTitle className="text-xl font-bold text-slate-900 dark:text-white">
                        {initialData ? 'Listeyi Düzenle' : 'Yeni Liste Oluştur'}
                    </DialogTitle>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onCreate)} className="space-y-5 pt-2">
                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-slate-500 dark:text-slate-400 text-[10px] font-bold uppercase tracking-wider">Liste Adı</FormLabel>
                                    <FormControl>
                                        <Input 
                                            placeholder="Örn: Haftalık Pazar..." 
                                            className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 rounded-xl h-12 focus:border-indigo-500 dark:focus:border-indigo-400 focus:bg-white dark:focus:bg-slate-900 transition-all text-base" 
                                            {...field} 
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        
                        <div className="space-y-4">
                            <FormField
                                control={form.control}
                                name="icon"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-slate-500 dark:text-slate-400 text-[10px] font-bold uppercase tracking-wider">İkon</FormLabel>
                                        <div className="flex gap-2.5 overflow-x-auto pb-2 scrollbar-hide [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                                            {Object.keys(listIcons).map(iconName => {
                                                const Icon = listIcons[iconName as keyof typeof listIcons];
                                                const isSelected = field.value === iconName;
                                                return (
                                                    <div 
                                                        key={iconName}
                                                        onClick={() => field.onChange(iconName)}
                                                        className={cn(
                                                            "p-3 rounded-xl cursor-pointer transition-all border active:scale-95 shrink-0",
                                                            isSelected ? "bg-indigo-600 text-white border-indigo-500 shadow-md" : "bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-700"
                                                        )}
                                                    >
                                                        <Icon className="h-5 w-5 md:h-6 md:w-6" />
                                                    </div>
                                                )
                                            })}
                                        </div>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                             <FormField
                                control={form.control}
                                name="colorId"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-slate-500 dark:text-slate-400 text-[10px] font-bold uppercase tracking-wider">Tema</FormLabel>
                                        <div className="flex gap-2.5 overflow-x-auto pb-2 scrollbar-hide [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                                            {themeColors.map(color => (
                                                <div
                                                    key={color.id}
                                                    onClick={() => field.onChange(color.id)}
                                                    className={cn(
                                                        "w-10 h-10 rounded-full cursor-pointer transition-all flex items-center justify-center border-2 shrink-0 active:scale-90",
                                                        "bg-white dark:bg-slate-800",
                                                        field.value === color.id ? "border-slate-900 dark:border-white scale-110 shadow-md" : "border-transparent hover:scale-105 shadow-sm"
                                                    )}
                                                >
                                                    <div className={cn("w-full h-full rounded-full bg-gradient-to-br", color.icon)}></div>
                                                </div>
                                            ))}
                                        </div>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <DialogFooter className="gap-2 sm:gap-3 flex-row justify-end mt-2">
                            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} className="text-slate-500 hover:text-slate-900 dark:hover:text-white flex-1 sm:flex-none h-12 rounded-xl">İptal</Button>
                            <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white rounded-xl px-6 flex-1 sm:flex-none h-12">Kaydet</Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
};

const ListCard = ({ list, onClick, onEdit, onDelete, onMove, isFirst, isLast }: { 
    list: ShoppingList; 
    onClick: () => void;
    onEdit: () => void;
    onDelete: (id: string) => void;
    onMove: (direction: 'up' | 'down') => void;
    isFirst: boolean;
    isLast: boolean;
}) => {
    const Icon = listIcons[list.icon as keyof typeof listIcons] || ShoppingCart;
    const items = list.items || [];
    const boughtItems = list.boughtItems || [];
    const totalItems = items.length + boughtItems.length;
    const progress = totalItems === 0 ? 0 : Math.round((boughtItems.length / totalItems) * 100);
    const theme = themeColors.find(c => c.id === (list.colorId || 'ocean')) || themeColors[0];

    return (
        <div 
            className={cn(
                "group relative rounded-[1.5rem] p-4 md:p-5 transition-all duration-300 cursor-pointer overflow-hidden flex flex-col justify-between min-h-[160px] md:h-[200px] border active:scale-[0.98]",
                glassColors.CARD_BG_MATTE,
                glassColors.CARD_HOVER_MATTE
            )}
            onClick={onClick}
        >
            <div className={cn("absolute inset-0 opacity-[0.04] dark:opacity-[0.1] bg-gradient-to-br pointer-events-none", theme.icon)}></div>
            
            <div className="flex justify-between items-start relative z-10">
                <div className={cn(glassColors.ICON_BOX, theme.icon)}>
                    <Icon className="h-5 w-5 md:h-6 md:w-6 text-white" />
                </div>
                
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 dark:text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 active:scale-95" onClick={(e) => e.stopPropagation()}>
                            <MoreVertical className="h-5 w-5" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 rounded-xl shadow-xl w-48 p-1">
                        {!isFirst && (
                             <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onMove('up'); }} className="cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg">
                                <ChevronUp className="mr-2 h-4 w-4 text-indigo-500"/> Yukarı Taşı
                            </DropdownMenuItem>
                        )}
                        {!isLast && (
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onMove('down'); }} className="cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg">
                                <ChevronDown className="mr-2 h-4 w-4 text-indigo-500"/> Aşağı Taşı
                            </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator className="bg-slate-100 dark:bg-slate-800" />
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(); }} className="cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg">
                            <Edit className="mr-2 h-4 w-4 text-slate-500"/> Düzenle
                        </DropdownMenuItem>
                        <DropdownMenuSeparator className="bg-slate-100 dark:bg-slate-800" />
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <DropdownMenuItem onSelect={e => e.preventDefault()} onClick={(e) => e.stopPropagation()} className="text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 cursor-pointer focus:text-rose-700 rounded-lg">
                                    <Trash2 className="mr-2 h-4 w-4"/> Sil
                                </DropdownMenuItem>
                            </AlertDialogTrigger>
                            <AlertDialogContent className="w-[90%] max-w-sm bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 rounded-2xl p-5" onClick={(e) => e.stopPropagation()}>
                                <AlertDialogHeader>
                                    <AlertDialogTitleComponent>Emin misiniz?</AlertDialogTitleComponent>
                                    <AlertDialogDescription className="text-slate-500 dark:text-slate-400">Bu liste kalıcı olarak silinecektir.</AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter className="mt-4 gap-2">
                                    <AlertDialogCancel className="bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 w-full sm:w-auto h-11 rounded-xl m-0">İptal</AlertDialogCancel>
                                    <AlertDialogAction onClick={(e) => { e.stopPropagation(); onDelete(list.id); }} className="bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white w-full sm:w-auto h-11 rounded-xl m-0">Sil</AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>

            <div className="relative z-10 mt-4 md:mt-auto">
                <h3 className="font-extrabold text-lg md:text-2xl mb-1.5 truncate tracking-tight text-slate-900 dark:text-white">{list.name}</h3>
                <div className="flex items-center justify-between text-[10px] md:text-xs font-bold uppercase tracking-wider mb-2 text-slate-500 dark:text-slate-400">
                    <span>{items.length} alınacak</span>
                    <span className="px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300">{progress}%</span>
                </div>
                <Progress value={progress} className="h-1.5 md:h-2 rounded-full bg-slate-100 dark:bg-slate-800" indicatorClassName={cn(theme.accent)} />
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
  
  const [isAddItemDialogOpen, setIsAddItemDialogOpen] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isAiProcessing, setIsAiProcessing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const unsubShopping = onShoppingListsUpdate((lists) => {
        const sortedLists = lists.sort((a, b) => {
            const orderA = a.order ?? 0;
            const orderB = b.order ?? 0;
            if (orderA !== orderB) return orderA - orderB;
            return (new Date(b.createdAt || 0).getTime()) - (new Date(a.createdAt || 0).getTime());
        });
        setShoppingLists(sortedLists);
        setIsLoaded(true);
    });
    return () => unsubShopping();
  }, []);

  useEffect(() => {
    if (selectedList && shoppingLists) {
      const updatedList = shoppingLists.find(l => l.id === selectedList.id);
      setSelectedList(updatedList || null);
    }
  }, [shoppingLists, selectedList]);
  
  const historicalItems = useMemo(() => {
    const items = new Set<string>();
    shoppingLists.forEach(list => {
      (list.items || []).forEach(item => items.add(item.name));
      (list.boughtItems || []).forEach(item => items.add(item.name));
    });
    return Array.from(items);
  }, [shoppingLists]);

  useEffect(() => {
    if (newItemName.trim() === '') {
      setSuggestions([]);
      return;
    }
    const lowercasedQuery = newItemName.toLowerCase();
    const filteredHistory = historicalItems.filter(item => item.toLowerCase().startsWith(lowercasedQuery)).slice(0, 3);
    const filteredDefaults = defaultShoppingItems.filter(item => item.toLowerCase().startsWith(lowercasedQuery) && !filteredHistory.includes(item)).slice(0, 3);
    setSuggestions([...filteredHistory, ...filteredDefaults]);
  }, [newItemName, historicalItems]);


  const handleCreateOrUpdateList = async (data: CreateListFormData) => {
    try {
        if (editingList) {
            await updateShoppingList(editingList.id, { name: data.name, icon: data.icon, colorId: data.colorId }); 
            toast({ title: "Liste Güncellendi", className: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/50 dark:text-indigo-200 border-none" });
        } else {
            await addShoppingList(data.name, data.icon, data.colorId);
            toast({ title: "Harika! Yeni listeniz hazır 🚀", className: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200 border-none" });
        }
        setListDialogOpen(false);
        setEditingList(null);
    } catch(e) {
        toast({ title: "Hata", description: "Bir sorun oluştu.", variant: 'destructive'});
    }
  };
  
  const handleAddItem = async (e?: React.FormEvent, itemName?: string) => {
    e?.preventDefault();
    const itemToAdd = itemName || newItemName;
    if (!itemToAdd.trim() || !selectedList) return;

    setIsAiProcessing(true);
    try {
        const isComplex = itemToAdd.includes(',') || itemToAdd.includes('malzemeleri') || itemToAdd.includes('için');

        if(isComplex) {
             const aiResult = await generateShoppingListItems(itemToAdd.trim());
             if (aiResult?.items?.length > 0) {
                for (const item of aiResult.items) {
                    await addShoppingListItemToList(selectedList.id, item);
                }
                toast({ title: "✨ AI Sihri!", description: `${aiResult.items.length} ürün listelendi.`, className: "bg-fuchsia-100 text-fuchsia-800 dark:bg-fuchsia-900/50 dark:text-fuchsia-200 border-none" });
            } else {
                 await addShoppingListItemToList(selectedList.id, { name: itemToAdd.trim(), category: 'Diğer' });
            }
        } else {
             await addShoppingListItemToList(selectedList.id, { name: itemToAdd.trim(), category: 'Diğer' });
        }

    } catch (error) {
        await addShoppingListItemToList(selectedList.id, { name: itemToAdd.trim(), category: 'Diğer' });
    } finally {
        setNewItemName('');
        setIsAiProcessing(false);
        inputRef.current?.focus();
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    handleAddItem(undefined, suggestion);
    setNewItemName('');
    setSuggestions([]);
  };

  const handleDeleteList = async (id: string) => {
      try {
          await deleteShoppingList(id);
          toast({ title: "Liste Silindi" });
      } catch (error) {
          toast({ title: "Hata", description: "Liste silinirken bir sorun oluştu.", variant: "destructive" });
      }
  };
  
  const handleMoveList = async (list: ShoppingList, direction: 'up' | 'down') => {
    const currentIndex = shoppingLists.findIndex(l => l.id === list.id);
    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= shoppingLists.length) return;
    const targetList = shoppingLists[targetIndex];
    const currentOrder = list.order ?? currentIndex;
    const targetOrder = targetList.order ?? targetIndex;

    try {
        await updateShoppingList(list.id, { order: targetOrder });
        await updateShoppingList(targetList.id, { order: currentOrder });
    } catch (error) {
        toast({ title: "Hata", description: "Sıralama güncellenemedi.", variant: "destructive" });
    }
  };

  const toggleItemCheck = async (listId: string, item: ShoppingListItemType) => {
    await toggleShoppingListItemStatusInList(listId, item.id, !item.isBought);
  }

  const moveItemToHistory = async (listId: string, item: ShoppingListItemType) => {
    await moveItemToBought(listId, item.id);
  }
  
  const moveItemToPendingList = async (listId: string, item: ShoppingListItemType) => {
    await moveItemToPending(listId, item.id);
  }

  const handleDeleteItem = async (listId: string, itemId: string, fromBought: boolean) => {
    try {
        await deleteShoppingListItemFromList(listId, itemId, fromBought);
    } catch(e) {
        toast({ title: "Hata", variant: "destructive" });
    }
  }

  if (!isLoaded) {
    return (
        <div className={cn("min-h-screen flex items-center justify-center transition-colors duration-500", glassColors.PAGE_BG_SOFT)}>
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600 dark:border-indigo-400"></div>
        </div>
    );
  }

  // --- INSIDE A LIST VIEW ---
  if (selectedList) {
    const theme = themeColors.find(c => c.id === (selectedList.colorId || 'ocean')) || themeColors[0];
    const pendingItems = (selectedList.items || []).sort((a,b) => (new Date(b.createdAt||0).getTime()) - (new Date(a.createdAt||0).getTime()));
    const boughtItems = (selectedList.boughtItems || []).sort((a,b) => (new Date(b.createdAt||0).getTime()) - (new Date(a.createdAt||0).getTime()));
        
    const groupedPendingItems = pendingItems.reduce((acc, item) => {
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

    return (
        <div className={cn("min-h-screen font-sans relative flex flex-col transition-colors duration-500 pb-20", glassColors.PAGE_BG_SOFT)}>
            
            {/* Header - App Bar Style */}
            <div className={cn("sticky top-0 z-40 transition-all duration-300", glassColors.HEADER_BG_SOFT)}>
                <div className="px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Button variant="ghost" size="icon" className="hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-500 dark:text-slate-400 active:scale-95 transition-all" onClick={() => setSelectedList(null)}>
                            <ArrowLeft className="h-5 w-5 md:h-6 md:w-6" />
                        </Button>
                        <div className="flex flex-col ml-1">
                             <h1 className="text-lg md:text-xl font-black text-slate-900 dark:text-white leading-tight truncate max-w-[200px] sm:max-w-[300px]">{selectedList.name}</h1>
                             <span className="text-[10px] md:text-xs font-bold text-slate-500 dark:text-slate-400">{pendingItems.length} alınacak</span>
                        </div>
                    </div>
                     <div className={cn("p-2 rounded-xl text-white shadow-sm bg-gradient-to-br shrink-0", theme.icon)}>
                        {React.createElement(listIcons[selectedList.icon as keyof typeof listIcons] || ShoppingCart, { className: "h-4 w-4 md:h-5 md:w-5" })}
                    </div>
                </div>
            </div>

            {/* Content with Tabs */}
            <div className="flex-1 flex flex-col relative z-10 mt-4 md:mt-6 max-w-3xl mx-auto w-full px-3 md:px-6">
                <Tabs defaultValue="pending" className="flex flex-col flex-1 w-full">
                    <div className="flex-shrink-0 mb-4 md:mb-6">
                        <TabsList className="w-full h-11 md:h-12 bg-slate-100 dark:bg-slate-800/50 p-1 rounded-xl md:rounded-2xl border border-slate-200 dark:border-slate-800">
                            <TabsTrigger value="pending" className="flex-1 h-full rounded-lg md:rounded-xl data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:text-slate-900 dark:data-[state=active]:text-white data-[state=active]:shadow-sm text-xs md:text-sm font-bold text-slate-500 dark:text-slate-400 transition-all">
                                Alınacaklar
                            </TabsTrigger>
                            <TabsTrigger value="bought" className="flex-1 h-full rounded-lg md:rounded-xl data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:text-emerald-600 dark:data-[state=active]:text-emerald-400 data-[state=active]:shadow-sm text-xs md:text-sm font-bold text-slate-500 dark:text-slate-400 transition-all">
                                Sepetim ({boughtItems.length})
                            </TabsTrigger>
                        </TabsList>
                    </div>

                    <TabsContent value="pending" className="pb-32 space-y-2 focus-visible:outline-none w-full animate-in fade-in zoom-in-95 duration-300">
                        {pendingItems.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-[40vh] text-center space-y-4 opacity-70">
                                <div className="p-5 md:p-6 rounded-full bg-slate-100 dark:bg-slate-800">
                                    <ListChecks className="h-10 w-10 md:h-12 md:w-12 text-slate-400 dark:text-slate-500" />
                                </div>
                                <div>
                                    <p className="text-base md:text-lg font-bold text-slate-900 dark:text-white">Listeniz boş</p>
                                    <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-[200px] mx-auto">Aşağıdaki + butonuna basarak ürün ekleyebilirsin.</p>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-6 md:space-y-8 w-full">
                                {sortedPendingCategories.map(([category, items]) => (
                                    <div key={category} className="w-full">
                                        {category !== 'Diğer' && (
                                            <h3 className="font-bold text-[10px] md:text-xs uppercase tracking-widest py-2 pl-2 flex items-center gap-1.5 mb-1.5 md:mb-2 text-slate-500 dark:text-slate-400">
                                                <div className={cn("w-1.5 h-1.5 rounded-full", theme.accent)}></div>
                                                {category}
                                            </h3>
                                        )}
                                        <div className="grid gap-2 md:gap-3 w-full">
                                        {items.map((item) => (
                                            <div 
                                                key={item.id} 
                                                onClick={() => toggleItemCheck(selectedList.id, item)} 
                                                className={cn(
                                                    "group flex items-center gap-3 py-3 px-4 rounded-[1rem] md:rounded-[1.25rem] transition-all cursor-pointer w-full active:scale-[0.99]",
                                                    glassColors.CARD_BG_MATTE,
                                                    glassColors.CARD_HOVER_MATTE,
                                                    item.isBought && "opacity-60 bg-slate-50 dark:bg-slate-900/50"
                                                )}
                                            >
                                                <Checkbox 
                                                    id={item.id} 
                                                    checked={item.isBought} 
                                                    className={cn(
                                                        "size-5 md:size-6 rounded-full border-2 transition-all pointer-events-none bg-white dark:bg-slate-900",
                                                        item.isBought 
                                                            ? `bg-slate-400 border-slate-400 dark:bg-slate-600 dark:border-slate-600 text-white` 
                                                            : theme.checkbox
                                                    )}
                                                />
                                                
                                                <label 
                                                    htmlFor={item.id} 
                                                    className={cn(
                                                        "font-bold flex-grow cursor-pointer text-sm md:text-base transition-all",
                                                        item.isBought ? "line-through text-slate-400 dark:text-slate-500" : "text-slate-800 dark:text-slate-200"
                                                    )}
                                                >
                                                    {item.name}
                                                </label>

                                                <div className="flex items-center gap-0.5">
                                                    {item.isBought ? (
                                                        <Button 
                                                            variant="ghost" 
                                                            size="icon" 
                                                            className="h-8 w-8 md:h-10 md:w-10 rounded-full text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 transition-all active:scale-95" 
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                moveItemToHistory(selectedList!.id, item);
                                                            }}
                                                        >
                                                            <Check className="h-4 w-4 md:h-5 md:w-5" />
                                                        </Button>
                                                    ) : null}
                                                    
                                                    <Button 
                                                        variant="ghost" 
                                                        size="icon" 
                                                        className="h-8 w-8 md:h-10 md:w-10 rounded-full text-rose-500 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-all md:opacity-0 md:group-hover:opacity-100 active:scale-95" 
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleDeleteItem(selectedList!.id, item.id, false);
                                                        }}
                                                    >
                                                        <Trash2 className="h-4 w-4 md:h-5 md:w-5" />
                                                    </Button>
                                                </div>
                                            </div>
                                        ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </TabsContent>

                    <TabsContent value="bought" className="pb-32 focus-visible:outline-none w-full animate-in fade-in zoom-in-95 duration-300">
                        {boughtItems.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-[30vh] text-center opacity-50">
                                <p className="font-medium text-slate-500 dark:text-slate-400 text-sm">Henüz satın alınan ürün yok.</p>
                            </div>
                        ) : (
                            <div className="space-y-2 md:space-y-3 w-full mt-2">
                                {boughtItems.map((item) => (
                                    <div key={item.id} className="flex items-center gap-3 py-2.5 px-4 group bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl md:rounded-2xl hover:border-slate-300 dark:hover:border-slate-700 transition-all active:scale-[0.99]">
                                        <div 
                                            className="h-6 w-6 rounded-full flex items-center justify-center cursor-pointer bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-800 flex-shrink-0 active:scale-90 transition-transform"
                                            onClick={() => moveItemToPendingList(selectedList.id, item)}
                                        >
                                            <CheckCircle2 className="h-4 w-4" />
                                        </div>
                                        <span className="flex-grow font-medium text-sm md:text-base line-through text-slate-400 dark:text-slate-500 truncate">{item.name}</span>
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-full active:scale-95" onClick={() => handleDeleteItem(selectedList.id, item.id, true)}>
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </TabsContent>
                </Tabs>
            </div>
            
             {/* FAB - FLOATING ACTION BUTTON */}
             <div className="fixed bottom-24 right-4 md:bottom-8 md:right-8 z-50">
                <Button className={cn("rounded-[1.2rem] md:rounded-[1.5rem] w-14 h-14 md:w-16 md:h-16 shadow-lg shadow-indigo-500/20 transition-transform hover:scale-105 active:scale-90 text-white", theme.accent)} size="icon" onClick={() => setIsAddItemDialogOpen(true)}>
                    <Plus className="h-6 w-6 md:h-8 md:w-8"/>
                </Button>
            </div>

            {/* ADD ITEM DIALOG (BOTTOM SHEET STYLE) */}
            <Dialog open={isAddItemDialogOpen} onOpenChange={setIsAddItemDialogOpen}>
                <DialogContent className="w-[95%] sm:max-w-md rounded-[2rem] border-slate-200 dark:border-slate-800 shadow-2xl bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 top-[40%] p-5">
                    <DialogHeader className="text-left">
                        <DialogTitle className="text-lg md:text-xl font-black text-slate-900 dark:text-white">Yeni Ürün Ekle</DialogTitle>
                        <DialogDescription className="text-slate-500 dark:text-slate-400 text-xs md:text-sm font-medium">Hızlıca ekle veya yapay zeka ile listeni oluştur.</DialogDescription>
                    </DialogHeader>
                    <div className="pt-2 space-y-3">
                        <form onSubmit={handleAddItem} className="relative flex items-center gap-2">
                            <div className="relative flex-grow group">
                                <Input 
                                    ref={inputRef}
                                    value={newItemName}
                                    onChange={(e) => setNewItemName(e.target.value)}
                                    placeholder="2kg domates, süt..."
                                    className="pl-4 pr-10 h-12 md:h-14 rounded-2xl text-sm md:text-base bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 focus:bg-white dark:focus:bg-slate-900 focus:border-indigo-500 dark:focus:border-indigo-400 transition-all shadow-inner"
                                    autoComplete="off"
                                />
                                {isAiProcessing && (
                                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                        <Sparkles className="h-5 w-5 text-indigo-500 animate-pulse" />
                                    </div>
                                )}
                            </div>
                            <Button type="submit" size="icon" className="h-12 w-12 md:h-14 md:w-14 shrink-0 rounded-2xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 shadow-md text-white active:scale-95 transition-transform" disabled={!newItemName.trim() || isAiProcessing}>
                                <Plus className="h-5 w-5 md:h-6 md:w-6" />
                            </Button>
                        </form>
                        {suggestions.length > 0 && newItemName.length > 0 && (
                            <div className="p-1.5 border border-slate-200 dark:border-slate-800 rounded-[1.25rem] bg-white dark:bg-slate-900 shadow-xl max-h-40 overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                                <div className="flex flex-col gap-1">
                                    {suggestions.map((s, i) => (
                                        <button
                                            key={i}
                                            type="button"
                                            onClick={() => handleSuggestionClick(s)}
                                            className="px-3 py-2.5 active:bg-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800 dark:active:bg-slate-700 rounded-xl text-xs md:text-sm font-semibold text-slate-700 dark:text-slate-300 transition-colors text-left flex items-center gap-2.5 group"
                                        >
                                            <Search className="h-3.5 w-3.5 md:h-4 md:w-4 text-slate-400 group-hover:text-indigo-500" />
                                            {s}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
  }

  // --- HOME VIEW (APP-LIKE MAIN PAGE) ---
  return (
    <div className={cn("min-h-screen font-sans relative overflow-x-hidden transition-colors duration-500", glassColors.PAGE_BG_SOFT, glassColors.TEXT_MAIN)}>
        
        {/* Ambient Background */}
        <div className="fixed inset-0 z-0 pointer-events-none opacity-40 dark:opacity-20">
            <div className="absolute top-[-10%] left-[-10%] w-[300px] h-[300px] md:w-[500px] md:h-[500px] bg-indigo-200 dark:bg-indigo-900/40 rounded-full blur-[100px]" />
            <div className="absolute top-[30%] right-[-10%] w-[250px] h-[250px] md:w-[400px] md:h-[400px] bg-fuchsia-200 dark:bg-fuchsia-900/40 rounded-full blur-[80px]" />
        </div>

        <div className="space-y-6 md:space-y-8 max-w-5xl mx-auto px-4 py-6 md:p-6 relative z-10 pb-28">
            {/* Header */}
            <div className="pt-2 md:pt-8 flex-shrink-0 relative">
                <div className="flex items-center gap-2.5 mb-1.5 md:mb-2">
                    <div className="p-2 md:p-3 bg-white dark:bg-slate-900 rounded-[14px] md:rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                        <ShoppingCart className="w-6 h-6 md:w-8 md:h-8 text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <h1 className="text-2xl md:text-4xl font-black tracking-tight">
                        Alışveriş <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-fuchsia-600 dark:from-indigo-400 dark:to-fuchsia-400">Listelerim</span>
                    </h1>
                </div>
                <p className="text-slate-500 dark:text-slate-400 text-xs md:text-sm font-medium ml-1">İhtiyaçlarını organize et, eksikleri tamamla.</p>
            </div>

            {shoppingLists.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-6">
                    {shoppingLists.map((list, index) => (
                        <ListCard 
                            key={list.id} 
                            list={list} 
                            onClick={() => setSelectedList(list)}
                            onEdit={() => { setEditingList(list); setListDialogOpen(true); }}
                            onDelete={handleDeleteList}
                            onMove={(dir) => handleMoveList(list, dir)}
                            isFirst={index === 0}
                            isLast={index === shoppingLists.length - 1}
                        />
                    ))}
                    
                    {/* Add New List Card */}
                    <button 
                        onClick={() => { setEditingList(null); setListDialogOpen(true); }}
                        className="group flex flex-col items-center justify-center border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-[1.5rem] p-4 min-h-[160px] hover:border-indigo-400 dark:hover:border-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-all duration-300 bg-white/50 dark:bg-slate-900/50 active:scale-95"
                    >
                        <div className="h-12 w-12 md:h-14 md:w-14 rounded-full bg-white dark:bg-slate-800 shadow-sm group-active:scale-90 flex items-center justify-center mb-3 transition-transform border border-slate-200 dark:border-slate-700 group-hover:bg-indigo-50 dark:group-hover:bg-indigo-900/50">
                            <Plus className="h-6 w-6 text-slate-400 dark:text-slate-500 group-hover:text-indigo-600 dark:group-hover:text-indigo-400" />
                        </div>
                        <span className="font-bold text-slate-500 dark:text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 text-xs md:text-sm text-center px-2">Yeni Liste Oluştur</span>
                    </button>
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center min-h-[50vh] text-center max-w-sm mx-auto px-4">
                    <div className="relative mb-6">
                        <div className="absolute inset-0 bg-indigo-200 dark:bg-indigo-900/50 blur-3xl opacity-50 rounded-full animate-pulse"></div>
                        <div className="h-20 w-20 md:h-24 md:w-24 rounded-[1.5rem] md:rounded-[2rem] bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 flex items-center justify-center shadow-xl relative z-10 rotate-6 transition-transform hover:rotate-0">
                            <ShoppingCart className="h-10 w-10 md:h-12 md:w-12 text-indigo-600 dark:text-indigo-400" />
                        </div>
                    </div>
                    <h3 className="text-xl md:text-2xl font-black mb-2 text-slate-900 dark:text-white">Alışverişe Başla</h3>
                    <p className="text-slate-500 dark:text-slate-400 mb-8 text-xs md:text-sm leading-relaxed font-medium">Hiç listeniz yok. Haftalık market, pazar veya özel günler için şık listeler oluşturun.</p>
                    <Button onClick={() => { setEditingList(null); setListDialogOpen(true); }} className="rounded-xl md:rounded-2xl w-full h-12 md:h-14 text-sm md:text-base font-bold bg-indigo-600 text-white hover:bg-indigo-700 active:bg-indigo-800 shadow-md active:scale-[0.98] transition-transform">
                        <Plus className="mr-2 h-4 w-4 md:h-5 md:w-5" /> Liste Oluştur
                    </Button>
                </div>
            )}
        </div>

        {/* FAB (Floating Action Button for Mobile on Main Screen) */}
        {shoppingLists.length > 0 && (
            <div className="fixed bottom-24 right-4 md:hidden z-40">
                <Button className="rounded-[1.2rem] w-14 h-14 shadow-lg shadow-indigo-500/20 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white active:scale-90 transition-transform" size="icon" onClick={() => { setEditingList(null); setListDialogOpen(true); }}>
                    <Plus className="h-6 w-6"/>
                </Button>
            </div>
        )}

      <CreateListDialog isOpen={isListDialogOpen} onOpenChange={setListDialogOpen} onCreate={handleCreateOrUpdateList} initialData={editingList} />
    </div>
  );
}
