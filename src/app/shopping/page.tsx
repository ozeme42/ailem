"use client";

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Plus, ArrowLeft, ListChecks, ShoppingCart, Trash2, MoreVertical, CheckCircle2, Search, Sparkles, Home, Cake, Notebook, Edit, Check } from "lucide-react";
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

// --- DESIGN SYSTEM: Soft/Matte Dark Theme (The Middle Ground) ---
const glassColors = {
    // Detay Sayfası (Yumuşak/Orta Ton - Mat Slate)
    PAGE_BG_SOFT: "bg-slate-900", // Zifiri siyah değil, koyu gri/lacivert
    HEADER_BG_SOFT: "bg-slate-900/90 backdrop-blur-md border-b border-slate-800",
    
    // Kartlar (Daha açık gri, okunabilir)
    CARD_BG_MATTE: "bg-slate-800 border border-slate-700 shadow-sm", 
    CARD_HOVER_MATTE: "hover:bg-slate-750 hover:border-slate-600 transition-all duration-200",
    
    TEXT_MAIN: "text-slate-200",
    TEXT_MUTED: "text-slate-400",
    
    ICON_BOX: "bg-gradient-to-br p-3 rounded-2xl shadow-lg",
};

// Tema Renkleri (Mat Slate üzerine uyumlu pastel tonlar)
const themeColors = [
    { 
        id: 'ocean', 
        name: 'Okyanus', 
        bg: 'bg-slate-800', 
        border: 'border-slate-700', 
        text: 'text-slate-200', 
        icon: 'from-cyan-600 to-blue-600',
        accent: 'bg-cyan-500',
        checkbox: 'border-cyan-500/50 data-[state=checked]:bg-cyan-500 data-[state=checked]:border-cyan-500',
        badge: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20'
    },
    { 
        id: 'sunset', 
        name: 'Gün Batımı', 
        bg: 'bg-slate-800', 
        border: 'border-slate-700', 
        text: 'text-slate-200', 
        icon: 'from-orange-600 to-rose-600',
        accent: 'bg-orange-500',
        checkbox: 'border-orange-500/50 data-[state=checked]:bg-orange-500 data-[state=checked]:border-orange-500',
        badge: 'bg-orange-500/10 text-orange-400 border-orange-500/20'
    },
    { 
        id: 'forest', 
        name: 'Orman', 
        bg: 'bg-slate-800', 
        border: 'border-slate-700', 
        text: 'text-slate-200', 
        icon: 'from-emerald-600 to-teal-600',
        accent: 'bg-emerald-500',
        checkbox: 'border-emerald-500/50 data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500',
        badge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
    },
    { 
        id: 'berry', 
        name: 'Böğürtlen', 
        bg: 'bg-slate-800', 
        border: 'border-slate-700', 
        text: 'text-slate-200', 
        icon: 'from-fuchsia-600 to-purple-600',
        accent: 'bg-fuchsia-500',
        checkbox: 'border-fuchsia-500/50 data-[state=checked]:bg-fuchsia-500 data-[state=checked]:border-fuchsia-500',
        badge: 'bg-fuchsia-500/10 text-fuchsia-400 border-fuchsia-500/20'
    },
    { 
        id: 'royal', 
        name: 'Asil', 
        bg: 'bg-slate-800', 
        border: 'border-slate-700', 
        text: 'text-slate-200', 
        icon: 'from-indigo-600 to-violet-600',
        accent: 'bg-indigo-500',
        checkbox: 'border-indigo-500/50 data-[state=checked]:bg-indigo-500 data-[state=checked]:border-indigo-500',
        badge: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
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
            <DialogContent className="sm:max-w-md bg-slate-900 border-slate-800 text-slate-100 rounded-[2rem]">
                <DialogHeader>
                    <DialogTitle className="text-xl font-bold">{initialData ? 'Listeyi Düzenle' : 'Yeni Liste Oluştur'}</DialogTitle>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onCreate)} className="space-y-6 pt-2">
                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-slate-400 text-xs font-bold uppercase tracking-wider">Liste Adı</FormLabel>
                                    <FormControl>
                                        <Input 
                                            placeholder="Örn: Haftalık Pazar..." 
                                            className="bg-slate-950 border-slate-800 text-slate-100 placeholder:text-slate-500 rounded-xl h-12 focus:border-indigo-500" 
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
                                        <FormLabel className="text-slate-400 text-xs font-bold uppercase tracking-wider">İkon</FormLabel>
                                        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                                            {Object.keys(listIcons).map(iconName => {
                                                const Icon = listIcons[iconName as keyof typeof listIcons];
                                                const isSelected = field.value === iconName;
                                                return (
                                                    <div 
                                                        key={iconName}
                                                        onClick={() => field.onChange(iconName)}
                                                        className={cn(
                                                            "p-3 rounded-xl cursor-pointer transition-all border",
                                                            isSelected ? "bg-indigo-600 text-white border-indigo-500 shadow-lg" : "bg-slate-950 text-slate-400 border-slate-800 hover:bg-slate-900 hover:text-slate-200"
                                                        )}
                                                    >
                                                        <Icon className="h-6 w-6" />
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
                                        <FormLabel className="text-slate-400 text-xs font-bold uppercase tracking-wider">Tema</FormLabel>
                                        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                                            {themeColors.map(color => (
                                                <div
                                                    key={color.id}
                                                    onClick={() => field.onChange(color.id)}
                                                    className={cn(
                                                        "w-10 h-10 rounded-full cursor-pointer transition-all flex items-center justify-center border-2",
                                                        color.bg.split(' ')[0], // Base background color
                                                        field.value === color.id ? "border-white scale-110 shadow-lg" : "border-transparent opacity-60 hover:opacity-100 hover:scale-105"
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

                        <DialogFooter className="gap-2">
                            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} className="text-slate-400 hover:text-white hover:bg-slate-800">İptal</Button>
                            <Button type="submit" className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl px-6">Kaydet</Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
};

const ListCard = ({ list, onClick, onEdit, onDelete }: { 
    list: ShoppingList; 
    onClick: () => void;
    onEdit: () => void;
    onDelete: (id: string) => void;
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
                "group relative rounded-[2rem] p-6 transition-all duration-300 cursor-pointer overflow-hidden flex flex-col justify-between h-[220px] shadow-sm hover:shadow-xl hover:-translate-y-1 border",
                "bg-slate-800 border-slate-700 hover:border-slate-600" // Mat, orta ton kartlar
            )}
            onClick={onClick}
        >
            {/* Hafif Gradient Arka Plan */}
            <div className={cn("absolute inset-0 opacity-5 bg-gradient-to-br", theme.icon)}></div>
            
            <div className="flex justify-between items-start relative z-10">
                <div className={cn("rounded-2xl shadow-md", glassColors.ICON_BOX, theme.icon)}>
                    <Icon className="h-6 w-6 text-white" />
                </div>
                
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-slate-700 text-slate-400 hover:text-white" onClick={(e) => e.stopPropagation()}>
                            <MoreVertical className="h-5 w-5" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-slate-900 border-slate-700 text-slate-100 rounded-xl shadow-xl">
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(); }} className="cursor-pointer hover:bg-slate-800">
                            <Edit className="mr-2 h-4 w-4 text-slate-400"/> Düzenle
                        </DropdownMenuItem>
                        <DropdownMenuSeparator className="bg-slate-800" />
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <DropdownMenuItem onSelect={e => e.preventDefault()} className="text-rose-500 hover:bg-rose-500/10 cursor-pointer focus:text-rose-400">
                                    <Trash2 className="mr-2 h-4 w-4"/> Sil
                                </DropdownMenuItem>
                            </AlertDialogTrigger>
                            <AlertDialogContent className="bg-slate-900 border-slate-700 text-slate-100 rounded-2xl">
                                <AlertDialogHeader>
                                    <AlertDialogTitleComponent>Emin misiniz?</AlertDialogTitleComponent>
                                    <AlertDialogDescription className="text-slate-400">Bu liste kalıcı olarak silinecektir.</AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel className="bg-slate-800 border-slate-700 hover:bg-slate-700 text-slate-200">İptal</AlertDialogCancel>
                                    <AlertDialogAction onClick={(e) => { e.stopPropagation(); onDelete(list.id); }} className="bg-rose-600 hover:bg-rose-700 text-white">Sil</AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>

            <div className="relative z-10 mt-auto">
                <h3 className="font-extrabold text-2xl mb-1 truncate tracking-tight text-slate-100">{list.name}</h3>
                <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider mb-3 text-slate-400">
                    <span>{items.length} alınacak</span>
                    <span className="px-2 py-0.5 rounded-full bg-slate-700 border border-slate-600">{progress}%</span>
                </div>
                <Progress value={progress} className="h-2 rounded-full bg-slate-950" indicatorClassName={cn(theme.accent)} />
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
        const sortedLists = lists.sort((a, b) => (new Date(b.createdAt || 0).getTime()) - (new Date(a.createdAt || 0).getTime()));
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
            toast({ title: "Liste Güncellendi" });
        } else {
            await addShoppingList(data.name, data.icon, data.colorId);
            toast({ title: "Harika! Yeni listeniz hazır 🚀" });
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
                toast({ title: "✨ AI Sihri!", description: `${aiResult.items.length} ürün listelendi.` });
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
          toast({ title: "Hata", variant: "destructive" });
      }
  };
  
  const toggleItemCheck = async (listId: string, item: ShoppingListItemType) => {
    await toggleShoppingListItemStatusInList(listId, item.id, !item.isBought);
  }

  const moveItemToHistory = async (listId: string, item: ShoppingListItemType) => {
    await moveItemToBought(listId, item.id);
    toast({ title: "Sepete Eklendi", description: `${item.name} alınanlara taşındı.` });
  }
  
  const moveItemToPendingList = async (listId: string, item: ShoppingListItemType) => {
    await moveItemToPending(listId, item.id);
  }

  if (!isLoaded) {
    return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center">
             <div className="fixed inset-0 bg-slate-950 -z-50" />
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
        </div>
    );
  }

  // --- DETAY GÖRÜNÜMÜ (MATTE SLATE THEME) ---
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
        <div className={cn("min-h-screen font-sans relative flex flex-col transition-colors duration-500", glassColors.PAGE_BG_SOFT)}>
            
            {/* Header - Sticky, Matte Dark */}
            <div className={cn("sticky top-0 z-40 transition-all duration-300", glassColors.HEADER_BG_SOFT)}>
                <div className="px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Button variant="ghost" size="icon" className="hover:bg-slate-800 rounded-full text-slate-400 hover:text-white transition-colors" onClick={() => setSelectedList(null)}>
                            <ArrowLeft className="h-6 w-6" />
                        </Button>
                        <div>
                             <h1 className="text-2xl font-black text-slate-100 leading-none">{selectedList.name}</h1>
                             <div className="flex items-center gap-2 mt-1">
                                <Badge variant="outline" className={cn("px-2 py-0.5 rounded-full font-bold", theme.badge)}>
                                    {pendingItems.length} alınacak
                                </Badge>
                                <Badge variant="outline" className="bg-slate-800 text-slate-500 border-slate-700 px-2 py-0.5 rounded-full font-bold">
                                    {boughtItems.length} sepette
                                </Badge>
                             </div>
                        </div>
                    </div>
                     <div className={cn("p-2 rounded-xl text-white shadow-md bg-gradient-to-br", theme.icon)}>
                        {React.createElement(listIcons[selectedList.icon as keyof typeof listIcons] || ShoppingCart, { className: "h-5 w-5" })}
                    </div>
                </div>
            </div>

            {/* Content with Tabs */}
            <div className="flex-1 flex flex-col relative z-10 mt-6 max-w-3xl mx-auto w-full">
                <Tabs defaultValue="pending" className="flex flex-col flex-1 w-full">
                    <div className="px-6 flex-shrink-0 mb-6">
                        <TabsList className="w-full h-12 bg-slate-950 p-1 rounded-2xl border border-slate-800">
                            <TabsTrigger value="pending" className="flex-1 h-full rounded-xl data-[state=active]:bg-slate-800 data-[state=active]:text-white data-[state=active]:shadow-sm font-bold text-slate-500 transition-all">
                                Alınacaklar
                            </TabsTrigger>
                            <TabsTrigger value="bought" className="flex-1 h-full rounded-xl data-[state=active]:bg-slate-800 data-[state=active]:text-emerald-400 data-[state=active]:shadow-sm font-bold text-slate-500 transition-all">
                                Sepetim ({boughtItems.length})
                            </TabsTrigger>
                        </TabsList>
                    </div>

                    <TabsContent value="pending" className="px-6 pb-32 space-y-2 pt-0 focus-visible:outline-none w-full animate-in fade-in zoom-in-95 duration-300">
                        {pendingItems.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-[40vh] text-center space-y-4 opacity-50">
                                <div className="p-6 rounded-full bg-slate-800/50">
                                    <ListChecks className="h-12 w-12 text-slate-500" />
                                </div>
                                <div>
                                    <p className="text-lg font-bold text-slate-300">Listeniz boş</p>
                                    <p className="text-sm text-slate-500 mt-1">Aşağıdaki + butonuna basarak ürün ekleyebilirsin.</p>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-8 w-full">
                                {sortedPendingCategories.map(([category, items]) => (
                                    <div key={category} className="w-full">
                                        {category !== 'Diğer' && (
                                            <h3 className="font-bold text-xs uppercase tracking-widest py-2 pl-1 flex items-center gap-2 mb-2 text-slate-500">
                                                <div className={cn("w-2 h-2 rounded-full", theme.accent)}></div>
                                                {category}
                                            </h3>
                                        )}
                                        <div className="grid gap-3 w-full">
                                        {items.map((item) => (
                                            <div 
                                                key={item.id} 
                                                onClick={() => toggleItemCheck(selectedList.id, item)} 
                                                className={cn(
                                                    "group flex items-center gap-4 py-4 px-5 rounded-[1.25rem] transition-all cursor-pointer w-full",
                                                    glassColors.CARD_BG_MATTE, // Mat Koyu Gri Kartlar
                                                    glassColors.CARD_HOVER_MATTE,
                                                    item.isBought && "opacity-50"
                                                )}
                                            >
                                                <Checkbox 
                                                    id={item.id} 
                                                    checked={item.isBought} 
                                                    className={cn(
                                                        "size-6 rounded-full border-2 transition-all pointer-events-none bg-slate-900/50",
                                                        item.isBought 
                                                            ? `bg-slate-600 border-slate-600 text-white` 
                                                            : theme.checkbox
                                                    )}
                                                />
                                                
                                                <label 
                                                    htmlFor={item.id} 
                                                    className={cn(
                                                        "font-bold flex-grow cursor-pointer text-base transition-all",
                                                        item.isBought ? "line-through text-slate-500" : "text-slate-200" // Yazı rengi yumuşak beyaz
                                                    )}
                                                >
                                                    {item.name}
                                                </label>

                                                {item.isBought && (
                                                    <Button 
                                                        variant="ghost" 
                                                        size="icon" 
                                                        className="h-10 w-10 rounded-full text-rose-500 hover:bg-rose-500/10 transition-all" 
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            moveItemToHistory(selectedList!.id, item);
                                                        }}
                                                    >
                                                        <Trash2 className="h-5 w-5" />
                                                    </Button>
                                                )}
                                            </div>
                                        ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </TabsContent>

                    <TabsContent value="bought" className="px-6 pb-32 pt-2 focus-visible:outline-none w-full animate-in fade-in zoom-in-95 duration-300">
                        {boughtItems.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-[30vh] text-center opacity-50">
                                <p className="font-medium text-slate-500">Henüz satın alınan ürün yok.</p>
                            </div>
                        ) : (
                            <div className="space-y-3 w-full">
                                {boughtItems.map((item) => (
                                    <div key={item.id} className="flex items-center gap-4 py-3 px-5 group bg-slate-900/50 border border-slate-800 rounded-2xl opacity-70 hover:opacity-100 transition-all">
                                        <div 
                                            className="h-6 w-6 rounded-full flex items-center justify-center cursor-pointer bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 flex-shrink-0 hover:bg-emerald-500 hover:text-white transition-colors"
                                            onClick={() => moveItemToPendingList(selectedList.id, item)}
                                        >
                                            <CheckCircle2 className="h-4 w-4" />
                                        </div>
                                        <span className="flex-grow font-medium text-base line-through text-slate-500">{item.name}</span>
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:text-rose-500 hover:bg-rose-500/10 rounded-full" onClick={() => deleteShoppingListItemFromList(selectedList.id, item.id, true)}>
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </TabsContent>
                </Tabs>
            </div>
            
             <div className="fixed bottom-8 right-6 z-50">
                <Button className={cn("rounded-full w-16 h-16 shadow-2xl transition-transform hover:scale-105 active:scale-95 border-4 border-slate-900 text-white", theme.accent)} size="icon" onClick={() => setIsAddItemDialogOpen(true)}>
                    <Plus className="h-8 w-8"/>
                </Button>
            </div>

            <Dialog open={isAddItemDialogOpen} onOpenChange={setIsAddItemDialogOpen}>
                <DialogContent className="sm:max-w-md rounded-[2rem] border-slate-700 shadow-2xl bg-slate-900 text-slate-100 top-[30%]">
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-black text-slate-100">Yeni Ürün Ekle</DialogTitle>
                        <DialogDescription className="text-slate-400 font-medium">Hızlıca ekle veya yapay zeka ile listeni oluştur.</DialogDescription>
                    </DialogHeader>
                    <div className="pt-4 space-y-4">
                        <form onSubmit={handleAddItem} className="relative flex items-center gap-3">
                            <div className="relative flex-grow group">
                                <Input 
                                    ref={inputRef}
                                    value={newItemName}
                                    onChange={(e) => setNewItemName(e.target.value)}
                                    placeholder="2kg domates, süt, ekmek..."
                                    className="pl-5 pr-12 h-14 rounded-2xl text-lg bg-slate-950 border-slate-800 text-slate-200 placeholder:text-slate-500 focus:bg-slate-950 focus:border-indigo-500 transition-all shadow-inner"
                                    autoComplete="off"
                                />
                                {isAiProcessing && (
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2">
                                        <Sparkles className="h-6 w-6 text-indigo-500 animate-pulse" />
                                    </div>
                                )}
                            </div>
                            <Button type="submit" size="icon" className="h-14 w-14 rounded-2xl bg-indigo-600 hover:bg-indigo-500 shadow-lg text-white" disabled={!newItemName.trim() || isAiProcessing}>
                                <Plus className="h-6 w-6" />
                            </Button>
                        </form>
                        {suggestions.length > 0 && newItemName.length > 0 && (
                            <div className="p-2 border border-slate-800 rounded-2xl bg-slate-950 shadow-lg max-h-40 overflow-y-auto [scrollbar-width:none]">
                                <div className="flex flex-col gap-1">
                                    {suggestions.map((s, i) => (
                                        <button
                                            key={i}
                                            type="button"
                                            onClick={() => handleSuggestionClick(s)}
                                            className="px-4 py-3 hover:bg-slate-800 rounded-xl text-sm font-semibold text-slate-300 transition-colors text-left flex items-center gap-3 group"
                                        >
                                            <Search className="h-4 w-4 text-slate-500 group-hover:text-indigo-400" />
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

  // --- HOME VIEW (DARK GLASS - DEFAULT) ---
  return (
    <div className="min-h-screen bg-slate-950 font-sans text-slate-100 relative overflow-hidden">
        {/* Fixed Background */}
        <div className="fixed inset-0 bg-slate-950 -z-50" />
        
        {/* Ambient Background */}
        <div className="fixed inset-0 z-0 pointer-events-none">
            <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-indigo-900/30 rounded-full blur-[120px]" />
            <div className="absolute top-[20%] right-[-5%] w-[400px] h-[400px] bg-fuchsia-900/20 rounded-full blur-[100px]" />
            <div className="absolute bottom-[-10%] left-[20%] w-[300px] h-[300px] bg-blue-900/20 rounded-full blur-[100px]" />
        </div>

        <div className="space-y-8 max-w-5xl mx-auto p-6 relative z-10">
            {/* Header */}
            <div className="pt-8 flex-shrink-0 relative">
                <div className="flex items-center gap-3 mb-2">
                    <div className="p-3 bg-white/5 rounded-2xl border border-white/10 shadow-lg backdrop-blur-sm">
                        <ShoppingCart className="w-8 h-8 text-indigo-400" />
                    </div>
                    <h1 className="text-4xl font-black tracking-tight text-white">
                        Alışveriş <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-fuchsia-400">Listelerim</span>
                    </h1>
                </div>
                <p className="text-slate-400 text-lg font-medium ml-1">İhtiyaçlarını organize et, eksikleri tamamla.</p>
            </div>

            {shoppingLists.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {shoppingLists.map((list) => (
                        <ListCard 
                            key={list.id} 
                            list={list} 
                            onClick={() => setSelectedList(list)}
                            onEdit={() => { setEditingList(list); setListDialogOpen(true); }}
                            onDelete={handleDeleteList}
                        />
                    ))}
                    
                    <button 
                        onClick={() => { setEditingList(null); setListDialogOpen(true); }}
                        className="group flex flex-col items-center justify-center border-2 border-dashed border-white/20 rounded-[2rem] p-6 h-[220px] hover:border-indigo-500/50 hover:bg-indigo-500/10 transition-all duration-300 backdrop-blur-sm bg-white/5"
                    >
                        <div className="h-16 w-16 rounded-full bg-white/10 shadow-sm group-hover:shadow-lg group-hover:scale-110 flex items-center justify-center mb-4 transition-all group-hover:bg-indigo-500/20">
                            <Plus className="h-8 w-8 text-slate-300 group-hover:text-indigo-400" />
                        </div>
                        <span className="font-bold text-slate-300 group-hover:text-indigo-300 text-lg">Yeni Liste Oluştur</span>
                    </button>
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center min-h-[50vh] text-center max-w-md mx-auto px-6">
                    <div className="relative mb-8">
                        <div className="absolute inset-0 bg-indigo-500 blur-3xl opacity-20 rounded-full animate-pulse"></div>
                        <div className="h-28 w-28 rounded-[2rem] bg-white/5 border border-white/10 flex items-center justify-center shadow-2xl relative z-10 rotate-6 transition-transform hover:rotate-0 backdrop-blur-md">
                            <ShoppingCart className="h-12 w-12 text-indigo-400" />
                        </div>
                    </div>
                    <h3 className="text-2xl font-black mb-3 text-white">Alışverişe Başla</h3>
                    <p className="text-slate-400 mb-10 leading-relaxed font-medium">Hiç listeniz yok. Haftalık market, pazar veya özel günler için şık listeler oluşturun.</p>
                    <Button onClick={() => { setEditingList(null); setListDialogOpen(true); }} size="lg" className="rounded-2xl px-10 h-14 text-lg font-bold bg-indigo-600 text-white hover:bg-indigo-500 shadow-lg shadow-indigo-900/50 hover:-translate-y-1 transition-all">
                        <Plus className="mr-2 h-5 w-5" /> Liste Oluştur
                    </Button>
                </div>
            )}
        </div>
      <CreateListDialog isOpen={isListDialogOpen} onOpenChange={setListDialogOpen} onCreate={handleCreateOrUpdateList} initialData={editingList} />
    </div>
  );
}