"use client";

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, ArrowLeft, ListChecks, Notebook, Edit, Home, Cake, ShoppingCart, Trash2, MoreVertical, CheckCircle2, Search, Sparkles, X, ChevronRight } from "lucide-react";
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

// --- DESIGN SYSTEM: Light Glassmorphism Themes ---
const themeColors = [
    { 
        id: 'ocean', 
        name: 'Okyanus', 
        bg: 'bg-gradient-to-br from-cyan-50 to-blue-100/80 backdrop-blur-xl border-cyan-200/60 shadow-lg shadow-cyan-100/50', 
        border: 'border-cyan-200', 
        text: 'text-cyan-950', 
        subText: 'text-cyan-700',
        icon: 'text-cyan-600',
        accent: 'bg-cyan-500',
        headerBg: 'bg-cyan-50/90 border-cyan-100',
        itemBg: 'bg-white/60 border-cyan-100 hover:bg-white hover:shadow-md hover:border-cyan-200',
        itemText: 'text-slate-700',
        checkbox: 'border-cyan-400 data-[state=checked]:bg-cyan-500 data-[state=checked]:border-cyan-500 text-white'
    },
    { 
        id: 'sunset', 
        name: 'Gün Batımı', 
        bg: 'bg-gradient-to-br from-orange-50 to-rose-100/80 backdrop-blur-xl border-orange-200/60 shadow-lg shadow-orange-100/50', 
        border: 'border-orange-200', 
        text: 'text-orange-950', 
        subText: 'text-orange-700',
        icon: 'text-orange-600',
        accent: 'bg-orange-500',
        headerBg: 'bg-orange-50/90 border-orange-100',
        itemBg: 'bg-white/60 border-orange-100 hover:bg-white hover:shadow-md hover:border-orange-200',
        itemText: 'text-slate-700',
        checkbox: 'border-orange-400 data-[state=checked]:bg-orange-500 data-[state=checked]:border-orange-500 text-white'
    },
    { 
        id: 'forest', 
        name: 'Orman', 
        bg: 'bg-gradient-to-br from-emerald-50 to-teal-100/80 backdrop-blur-xl border-emerald-200/60 shadow-lg shadow-emerald-100/50', 
        border: 'border-emerald-200', 
        text: 'text-emerald-950', 
        subText: 'text-emerald-700',
        icon: 'text-emerald-600',
        accent: 'bg-emerald-500',
        headerBg: 'bg-emerald-50/90 border-emerald-100',
        itemBg: 'bg-white/60 border-emerald-100 hover:bg-white hover:shadow-md hover:border-emerald-200',
        itemText: 'text-slate-700',
        checkbox: 'border-emerald-400 data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500 text-white'
    },
    { 
        id: 'berry', 
        name: 'Böğürtlen', 
        bg: 'bg-gradient-to-br from-fuchsia-50 to-purple-100/80 backdrop-blur-xl border-fuchsia-200/60 shadow-lg shadow-fuchsia-100/50', 
        border: 'border-fuchsia-200', 
        text: 'text-fuchsia-950', 
        subText: 'text-fuchsia-700',
        icon: 'text-fuchsia-600',
        accent: 'bg-fuchsia-500',
        headerBg: 'bg-fuchsia-50/90 border-fuchsia-100',
        itemBg: 'bg-white/60 border-fuchsia-100 hover:bg-white hover:shadow-md hover:border-fuchsia-200',
        itemText: 'text-slate-700',
        checkbox: 'border-fuchsia-400 data-[state=checked]:bg-fuchsia-500 data-[state=checked]:border-fuchsia-500 text-white'
    },
    { 
        id: 'royal', 
        name: 'Asil', 
        bg: 'bg-gradient-to-br from-indigo-50 to-violet-100/80 backdrop-blur-xl border-indigo-200/60 shadow-lg shadow-indigo-100/50', 
        border: 'border-indigo-200', 
        text: 'text-indigo-950', 
        subText: 'text-indigo-700',
        icon: 'text-indigo-600',
        accent: 'bg-indigo-500',
        headerBg: 'bg-indigo-50/90 border-indigo-100',
        itemBg: 'bg-white/60 border-indigo-100 hover:bg-white hover:shadow-md hover:border-indigo-200',
        itemText: 'text-slate-700',
        checkbox: 'border-indigo-400 data-[state=checked]:bg-indigo-500 data-[state=checked]:border-indigo-500 text-white'
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
            <DialogContent className="sm:max-w-md bg-white border-slate-200 text-slate-900 rounded-[2rem] shadow-2xl">
                <DialogHeader>
                    <DialogTitle className="text-xl font-bold text-slate-900">{initialData ? 'Listeyi Düzenle' : 'Yeni Liste Oluştur'}</DialogTitle>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onCreate)} className="space-y-6 pt-2">
                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-slate-500 text-xs font-bold uppercase tracking-wider">Liste Adı</FormLabel>
                                    <FormControl>
                                        <Input 
                                            placeholder="Örn: Haftalık Pazar..." 
                                            className="bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 rounded-xl h-12 focus:border-indigo-500 focus:bg-white transition-all" 
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
                                        <FormLabel className="text-slate-500 text-xs font-bold uppercase tracking-wider">İkon</FormLabel>
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
                                                            isSelected ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/30 scale-105 border-indigo-600" : "bg-slate-50 border-slate-200 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
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
                                        <FormLabel className="text-slate-500 text-xs font-bold uppercase tracking-wider">Tema</FormLabel>
                                        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                                            {themeColors.map(color => (
                                                <div
                                                    key={color.id}
                                                    onClick={() => field.onChange(color.id)}
                                                    className={cn(
                                                        "w-10 h-10 rounded-full cursor-pointer transition-all flex items-center justify-center border-2",
                                                        color.bg.split(' ')[0], // Base gradient class
                                                        field.value === color.id ? "border-slate-800 scale-110 shadow-lg" : "border-transparent opacity-60 hover:opacity-100"
                                                    )}
                                                >
                                                    {field.value === color.id && <div className="w-3 h-3 bg-slate-800 rounded-full" />}
                                                </div>
                                            ))}
                                        </div>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <DialogFooter className="gap-2">
                            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} className="text-slate-500 hover:text-slate-900 hover:bg-slate-100">İptal</Button>
                            <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl px-6">Kaydet</Button>
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
                "group relative rounded-[2rem] p-6 transition-all duration-300 cursor-pointer overflow-hidden flex flex-col justify-between h-[220px] hover:-translate-y-1 hover:shadow-xl",
                theme.bg, theme.border
            )}
            onClick={onClick}
        >
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/40 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none mix-blend-overlay"></div>
            
            <div className="flex justify-between items-start relative z-10">
                <div className={cn("p-3 rounded-2xl shadow-sm backdrop-blur-md bg-white/60 text-slate-700")}>
                    <Icon className="h-6 w-6" />
                </div>
                
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className={cn("h-8 w-8 rounded-full hover:bg-white/30", theme.subText)} onClick={(e) => e.stopPropagation()}>
                            <MoreVertical className="h-5 w-5" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-white border-slate-100 text-slate-700 shadow-xl rounded-xl">
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(); }} className="hover:bg-slate-50 cursor-pointer">
                            <Edit className="mr-2 h-4 w-4"/> Düzenle
                        </DropdownMenuItem>
                        <DropdownMenuSeparator className="bg-slate-100" />
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <DropdownMenuItem onSelect={e => e.preventDefault()} className="text-rose-500 hover:bg-rose-50 cursor-pointer">
                                    <Trash2 className="mr-2 h-4 w-4"/> Sil
                                </DropdownMenuItem>
                            </AlertDialogTrigger>
                            <AlertDialogContent className="bg-white border-slate-100 text-slate-900 rounded-2xl">
                                <AlertDialogHeader>
                                    <AlertDialogTitleComponent>Emin misiniz?</AlertDialogTitleComponent>
                                    <AlertDialogDescription className="text-slate-500">Bu liste kalıcı olarak silinecektir.</AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel className="bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-700">İptal</AlertDialogCancel>
                                    <AlertDialogAction onClick={(e) => { e.stopPropagation(); onDelete(list.id); }} className="bg-rose-600 hover:bg-rose-700 text-white">Sil</AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>

            <div className="relative z-10 mt-auto">
                <h3 className={cn("font-bold text-2xl mb-1 truncate", theme.text)}>{list.name}</h3>
                <div className={cn("flex items-center justify-between text-xs font-bold uppercase tracking-wider mb-3 opacity-80", theme.subText)}>
                    <span>{items.length} alınacak</span>
                    <span className="px-2 py-0.5 rounded-full bg-white/40 backdrop-blur-md border border-white/20">{progress}%</span>
                </div>
                <Progress value={progress} className="h-2 rounded-full bg-white/50" indicatorClassName={cn(theme.accent)} />
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
    return <div className="min-h-screen bg-slate-50 flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div></div>;
  }

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
        <div className="h-full flex flex-col bg-slate-50 text-slate-900 min-h-screen">
            {/* Header */}
            <div className={cn("flex-shrink-0 px-6 pt-8 pb-8 flex flex-col gap-6 shadow-xl z-20 transition-all rounded-b-[2.5rem] border-b relative backdrop-blur-xl", theme.headerBg)}>
                <div className="flex items-center justify-between">
                    <Button variant="ghost" size="icon" className="hover:bg-white/40 rounded-full text-slate-700 hover:text-slate-900" onClick={() => setSelectedList(null)}>
                        <ArrowLeft className="h-6 w-6" />
                    </Button>
                    <div className="p-3 rounded-2xl bg-white/50 backdrop-blur-md shadow-sm text-slate-800 border border-white/40">
                        {React.createElement(listIcons[selectedList.icon as keyof typeof listIcons] || ShoppingCart, { className: "h-6 w-6" })}
                    </div>
                </div>
                
                <div className="px-2">
                    <h1 className={cn("text-3xl font-black leading-tight tracking-tight mb-2 text-slate-900")}>
                        {selectedList.name}
                    </h1>
                    <div className="flex items-center gap-3">
                        <Badge variant="outline" className="bg-white/40 border-slate-900/10 text-slate-700 px-3 py-1 rounded-full font-bold shadow-sm">
                            {pendingItems.length} alınacak
                        </Badge>
                        <Badge variant="outline" className="bg-white/40 border-slate-900/10 text-slate-700 px-3 py-1 rounded-full font-bold shadow-sm">
                            {boughtItems.length} sepette
                        </Badge>
                    </div>
                </div>
            </div>

            {/* Content with Tabs */}
            <div className="flex-grow flex flex-col min-h-0 relative z-10 mt-6">
                <Tabs defaultValue="pending" className="flex flex-col h-full">
                    <div className="px-6 flex-shrink-0 mb-4">
                        <TabsList className="w-full h-14 bg-slate-200/50 p-1.5 rounded-full border border-slate-200">
                            <TabsTrigger value="pending" className="flex-1 h-full rounded-full data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm font-bold text-slate-500">
                                Alınacaklar
                            </TabsTrigger>
                            <TabsTrigger value="bought" className="flex-1 h-full rounded-full data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm font-bold text-slate-500">
                                Sepetim ({boughtItems.length})
                            </TabsTrigger>
                        </TabsList>
                    </div>

                    <TabsContent value="pending" className="flex-grow overflow-y-auto px-6 pb-28 space-y-2 pt-0 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                        {pendingItems.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-[40vh] text-center space-y-4 opacity-40">
                                <div className={cn("p-6 rounded-full bg-slate-200 border border-slate-300")}>
                                    <ListChecks className="h-12 w-12 text-slate-400" />
                                </div>
                                <div>
                                    <p className="text-lg font-bold text-slate-800">Listeniz boş</p>
                                    <p className="text-sm text-slate-500 mt-1 max-w-xs mx-auto">Aşağıdaki + butonuna basarak ürün ekleyebilirsin.</p>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                {sortedPendingCategories.map(([category, items]) => (
                                    <div key={category}>
                                        {category !== 'Diğer' && (
                                            <h3 className="font-bold text-xs uppercase tracking-widest py-3 text-slate-500 pl-2 flex items-center gap-2">
                                                <div className={cn("w-2 h-2 rounded-full", theme.accent)}></div>
                                                {category}
                                            </h3>
                                        )}
                                        <div className="grid gap-3">
                                        {items.map((item) => (
                                            <div 
                                                key={item.id} 
                                                onClick={() => toggleItemCheck(selectedList.id, item)} 
                                                className={cn(
                                                    "group flex items-center gap-4 py-3.5 px-5 backdrop-blur-md border rounded-[1.25rem] transition-all hover:scale-[1.01] cursor-pointer shadow-sm",
                                                    item.isBought 
                                                        ? "bg-slate-100/50 border-slate-200 opacity-50" 
                                                        : cn(theme.itemBg)
                                                )}
                                            >
                                                <Checkbox 
                                                    id={item.id} 
                                                    checked={item.isBought} 
                                                    className={cn(
                                                        "size-6 rounded-full border-2 transition-all pointer-events-none",
                                                        item.isBought 
                                                            ? `bg-slate-300 border-slate-300 text-white` 
                                                            : theme.checkbox
                                                    )}
                                                />
                                                
                                                <label 
                                                    htmlFor={item.id} 
                                                    className={cn(
                                                        "font-bold flex-grow cursor-pointer text-base transition-all",
                                                        item.isBought ? "line-through text-slate-400" : theme.itemText
                                                    )}
                                                >
                                                    {item.name}
                                                </label>

                                                {item.isBought && (
                                                    <Button 
                                                        variant="ghost" 
                                                        size="icon" 
                                                        className="h-10 w-10 rounded-full text-rose-500 bg-rose-50 hover:bg-rose-100 hover:text-rose-600 border border-rose-200 transition-all animate-in fade-in zoom-in duration-200" 
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

                    <TabsContent value="bought" className="flex-grow overflow-y-auto px-6 pb-28 pt-2 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                        {boughtItems.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-[30vh] text-center opacity-40">
                                <p className="font-medium text-slate-500">Henüz satın alınan ürün yok.</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {boughtItems.map((item) => (
                                    <div key={item.id} className="flex items-center gap-4 py-3 px-5 group bg-white border border-slate-200 rounded-[1.25rem] opacity-60 hover:opacity-100 transition-all shadow-sm">
                                        <div 
                                            className="h-6 w-6 rounded-full flex items-center justify-center cursor-pointer bg-emerald-100 text-emerald-600 border border-emerald-200 flex-shrink-0 hover:bg-emerald-500 hover:text-white transition-colors"
                                            onClick={() => moveItemToPendingList(selectedList.id, item)}
                                        >
                                            <CheckCircle2 className="h-4 w-4" />
                                        </div>
                                        <span className="flex-grow font-medium text-base line-through text-slate-400">{item.name}</span>
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-full" onClick={() => deleteShoppingListItemFromList(selectedList.id, item.id, true)}>
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </TabsContent>
                </Tabs>
            </div>
            
             <div className="fixed bottom-24 md:bottom-8 right-6 z-50">
                <Button className={cn("rounded-full w-16 h-16 shadow-2xl transition-transform hover:scale-105 active:scale-95 border-4 border-white", theme.accent)} size="icon" onClick={() => setIsAddItemDialogOpen(true)}>
                    <Plus className="h-8 w-8 text-white"/>
                </Button>
            </div>

            <Dialog open={isAddItemDialogOpen} onOpenChange={setIsAddItemDialogOpen}>
                <DialogContent className="sm:max-w-md rounded-[2rem] border-white/50 shadow-2xl bg-white/90 backdrop-blur-xl text-slate-900 top-[30%]">
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-black text-slate-900">Yeni Ürün Ekle</DialogTitle>
                        <DialogDescription className="text-slate-500 font-medium">Hızlıca ekle veya yapay zeka ile listeni oluştur.</DialogDescription>
                    </DialogHeader>
                    <div className="pt-4 space-y-4">
                        <form onSubmit={handleAddItem} className="relative flex items-center gap-3">
                            <div className="relative flex-grow group">
                                <Input 
                                    ref={inputRef}
                                    value={newItemName}
                                    onChange={(e) => setNewItemName(e.target.value)}
                                    placeholder="2kg domates, süt, ekmek..."
                                    className="pl-5 pr-12 h-14 rounded-2xl text-lg bg-slate-100 border-slate-200 text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-indigo-500 transition-all shadow-inner"
                                    autoComplete="off"
                                />
                                {isAiProcessing && (
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2">
                                        <Sparkles className="h-6 w-6 text-indigo-500 animate-pulse" />
                                    </div>
                                )}
                            </div>
                            <Button type="submit" size="icon" className="h-14 w-14 rounded-2xl bg-indigo-600 hover:bg-indigo-700 shadow-xl shadow-indigo-200" disabled={!newItemName.trim() || isAiProcessing}>
                                <Plus className="h-6 w-6 text-white" />
                            </Button>
                        </form>
                        {suggestions.length > 0 && newItemName.length > 0 && (
                            <div className="p-2 border border-slate-200 rounded-2xl bg-white/80 backdrop-blur-md shadow-lg max-h-40 overflow-y-auto [scrollbar-width:none]">
                                <div className="flex flex-col gap-1">
                                    {suggestions.map((s, i) => (
                                        <button
                                            key={i}
                                            type="button"
                                            onClick={() => handleSuggestionClick(s)}
                                            className="px-4 py-3 hover:bg-indigo-50 rounded-xl text-sm font-semibold text-slate-600 transition-colors text-left flex items-center gap-3 group"
                                        >
                                            <Search className="h-4 w-4 text-slate-400 group-hover:text-indigo-500" />
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

  // --- HOME VIEW (LIGHT GLASS) ---
  return (
    <div className="min-h-[100dvh] bg-slate-50 font-sans text-slate-900 relative overflow-hidden">
        {/* Ambient Background */}
        <div className="fixed inset-0 z-0 pointer-events-none opacity-60">
            <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-blue-200/40 rounded-full blur-[120px]" />
            <div className="absolute top-[20%] right-[-5%] w-[400px] h-[400px] bg-fuchsia-200/40 rounded-full blur-[100px]" />
            <div className="absolute bottom-[-10%] left-[20%] w-[300px] h-[300px] bg-indigo-200/40 rounded-full blur-[100px]" />
        </div>

        <div className="space-y-8 max-w-5xl mx-auto p-6 relative z-10">
            {/* Header */}
            <div className="pt-8 flex-shrink-0 relative">
                <div className="flex items-center gap-3 mb-2">
                    <div className="p-3 bg-white rounded-2xl border border-slate-200 shadow-sm backdrop-blur-sm">
                        <ShoppingCart className="w-8 h-8 text-indigo-600" />
                    </div>
                    <h1 className="text-4xl font-black tracking-tight text-slate-900">
                        Alışveriş <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-fuchsia-600">Listelerim</span>
                    </h1>
                </div>
                <p className="text-slate-500 text-lg font-medium ml-1">İhtiyaçlarını organize et, eksikleri tamamla.</p>
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
                        className="group flex flex-col items-center justify-center border border-dashed border-slate-300 rounded-[2rem] p-6 h-[220px] hover:border-indigo-500 hover:bg-indigo-50/50 transition-all duration-300 backdrop-blur-sm bg-white/40"
                    >
                        <div className="h-16 w-16 rounded-full bg-white shadow-sm group-hover:shadow-lg group-hover:scale-110 flex items-center justify-center mb-4 transition-all group-hover:bg-indigo-600 group-hover:text-white border border-slate-100">
                            <Plus className="h-8 w-8 text-slate-400 group-hover:text-white" />
                        </div>
                        <span className="font-bold text-slate-500 group-hover:text-indigo-600 text-lg">Yeni Liste Oluştur</span>
                    </button>
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center min-h-[50vh] text-center max-w-md mx-auto px-6">
                    <div className="relative mb-8">
                        <div className="absolute inset-0 bg-indigo-300 blur-3xl opacity-30 rounded-full animate-pulse"></div>
                        <div className="h-28 w-28 rounded-[2rem] bg-white border border-slate-200 flex items-center justify-center shadow-xl relative z-10 rotate-6 transition-transform hover:rotate-0 backdrop-blur-md">
                            <ShoppingCart className="h-12 w-12 text-indigo-500" />
                        </div>
                    </div>
                    <h3 className="text-2xl font-black mb-3 text-slate-900">Alışverişe Başla</h3>
                    <p className="text-slate-500 mb-10 leading-relaxed font-medium">Hiç listeniz yok. Haftalık market, pazar veya özel günler için şık listeler oluşturun.</p>
                    <Button onClick={() => { setEditingList(null); setListDialogOpen(true); }} size="lg" className="rounded-2xl px-10 h-14 text-lg font-bold bg-indigo-600 text-white hover:bg-indigo-700 shadow-xl shadow-indigo-200 hover:-translate-y-1 transition-all">
                        <Plus className="mr-2 h-5 w-5" /> Liste Oluştur
                    </Button>
                </div>
            )}
        </div>
      <CreateListDialog isOpen={isListDialogOpen} onOpenChange={setListDialogOpen} onCreate={handleCreateOrUpdateList} initialData={editingList} />
    </div>
  );
}