"use client";

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Button, buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, ArrowLeft, ListChecks, Notebook, Edit, Home, Cake, ShoppingCart, Trash2, MoreVertical, CheckCircle2, Circle, Search, Sparkles, Zap, Archive, ChevronRight, X } from "lucide-react";
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
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

// --- Modern Soft Pastel Themes (Enhanced for Item Styling) ---
const themeColors = [
    { 
        id: 'ocean', 
        name: 'Okyanus', 
        bg: 'bg-gradient-to-br from-cyan-50/90 to-blue-50/90', 
        border: 'border-cyan-100', 
        text: 'text-cyan-900', 
        icon: 'text-cyan-600',
        accent: 'bg-cyan-500',
        ring: 'ring-cyan-400',
        // Item Styling
        itemBg: 'bg-gradient-to-r from-cyan-50/80 to-blue-50/40 hover:from-cyan-100/80 hover:to-blue-100/60',
        itemBorder: 'border-cyan-200/60',
        itemText: 'text-cyan-900',
        checkbox: 'data-[state=checked]:bg-cyan-500 data-[state=checked]:border-cyan-500 border-cyan-300 text-white'
    },
    { 
        id: 'sunset', 
        name: 'Gün Batımı', 
        bg: 'bg-gradient-to-br from-orange-50/90 to-rose-50/90', 
        border: 'border-orange-100', 
        text: 'text-orange-900', 
        icon: 'text-orange-600',
        accent: 'bg-orange-500',
        ring: 'ring-orange-400',
        // Item Styling
        itemBg: 'bg-gradient-to-r from-orange-50/80 to-rose-50/40 hover:from-orange-100/80 hover:to-rose-100/60',
        itemBorder: 'border-orange-200/60',
        itemText: 'text-orange-900',
        checkbox: 'data-[state=checked]:bg-orange-500 data-[state=checked]:border-orange-500 border-orange-300 text-white'
    },
    { 
        id: 'forest', 
        name: 'Orman', 
        bg: 'bg-gradient-to-br from-emerald-50/90 to-teal-50/90', 
        border: 'border-emerald-100', 
        text: 'text-emerald-900', 
        icon: 'text-emerald-600',
        accent: 'bg-emerald-500',
        ring: 'ring-emerald-400',
        // Item Styling
        itemBg: 'bg-gradient-to-r from-emerald-50/80 to-teal-50/40 hover:from-emerald-100/80 hover:to-teal-100/60',
        itemBorder: 'border-emerald-200/60',
        itemText: 'text-emerald-900',
        checkbox: 'data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500 border-emerald-300 text-white'
    },
    { 
        id: 'berry', 
        name: 'Böğürtlen', 
        bg: 'bg-gradient-to-br from-fuchsia-50/90 to-purple-50/90', 
        border: 'border-fuchsia-100', 
        text: 'text-fuchsia-900', 
        icon: 'text-fuchsia-600',
        accent: 'bg-fuchsia-500',
        ring: 'ring-fuchsia-400',
        // Item Styling
        itemBg: 'bg-gradient-to-r from-fuchsia-50/80 to-purple-50/40 hover:from-fuchsia-100/80 hover:to-purple-100/60',
        itemBorder: 'border-fuchsia-200/60',
        itemText: 'text-fuchsia-900',
        checkbox: 'data-[state=checked]:bg-fuchsia-500 data-[state=checked]:border-fuchsia-500 border-fuchsia-300 text-white'
    },
    { 
        id: 'royal', 
        name: 'Asil', 
        bg: 'bg-gradient-to-br from-indigo-50/90 to-violet-50/90', 
        border: 'border-indigo-100', 
        text: 'text-indigo-900', 
        icon: 'text-indigo-600',
        accent: 'bg-indigo-500',
        ring: 'ring-indigo-400',
        // Item Styling
        itemBg: 'bg-gradient-to-r from-indigo-50/80 to-violet-50/40 hover:from-indigo-100/80 hover:to-violet-100/60',
        itemBorder: 'border-indigo-200/60',
        itemText: 'text-indigo-900',
        checkbox: 'data-[state=checked]:bg-indigo-500 data-[state=checked]:border-indigo-500 border-indigo-300 text-white'
    },
    { 
        id: 'cherry', 
        name: 'Kiraz', 
        bg: 'bg-gradient-to-br from-red-50/90 to-pink-50/90', 
        border: 'border-red-100', 
        text: 'text-red-900', 
        icon: 'text-red-600',
        accent: 'bg-red-500',
        ring: 'ring-red-400',
        // Item Styling
        itemBg: 'bg-gradient-to-r from-red-50/80 to-pink-50/40 hover:from-red-100/80 hover:to-pink-100/60',
        itemBorder: 'border-red-200/60',
        itemText: 'text-red-900',
        checkbox: 'data-[state=checked]:bg-red-500 data-[state=checked]:border-red-500 border-red-300 text-white'
    },
];

const listIcons = {
  ShoppingCart: ShoppingCart,
  Home: Home,
  ListChecks: ListChecks,
  Cake: Cake,
  Notebook: Notebook,
};

// --- Form Schemas ---
const createListSchema = z.object({
  name: z.string().min(2, "Liste adı en az 2 karakter olmalıdır."),
  icon: z.string().min(1, "Bir ikon seçmelisiniz."),
  colorId: z.string().optional(),
});

type CreateListFormData = z.infer<typeof createListSchema>;

// --- Components ---

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
            <DialogContent className="sm:max-w-md rounded-[2rem] border-0 shadow-[0_20px_50px_rgba(0,0,0,0.1)] bg-white/90 backdrop-blur-xl">
                <DialogHeader>
                    <DialogTitle className="text-2xl font-black text-slate-800">{initialData ? 'Listeyi Düzenle' : 'Yeni Liste Oluştur'}</DialogTitle>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onCreate)} className="space-y-6 pt-4">
                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-slate-500 font-bold uppercase text-xs tracking-wider">Liste Adı</FormLabel>
                                    <FormControl>
                                        <Input 
                                            placeholder="Örn: Haftalık Pazar..." 
                                            className="h-14 rounded-2xl bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white text-lg transition-all" 
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
                                        <FormLabel className="text-slate-500 font-bold uppercase text-xs tracking-wider">İkon Seç</FormLabel>
                                        <div className="flex gap-3 justify-start overflow-x-auto pb-2 scrollbar-hide">
                                            {Object.keys(listIcons).map(iconName => {
                                                const Icon = listIcons[iconName as keyof typeof listIcons];
                                                return (
                                                    <div 
                                                        key={iconName}
                                                        onClick={() => field.onChange(iconName)}
                                                        className={cn(
                                                            "p-4 rounded-2xl cursor-pointer transition-all duration-300 border-2",
                                                            field.value === iconName 
                                                                ? "border-indigo-500 bg-indigo-50 text-indigo-600 scale-110 shadow-md" 
                                                                : "border-transparent bg-slate-50 text-slate-400 hover:bg-slate-100"
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
                                        <FormLabel className="text-slate-500 font-bold uppercase text-xs tracking-wider">Renk Teması</FormLabel>
                                        <div className="flex gap-3 justify-start overflow-x-auto pb-2 scrollbar-hide">
                                            {themeColors.map(color => (
                                                <div
                                                    key={color.id}
                                                    onClick={() => field.onChange(color.id)}
                                                    className={cn(
                                                        "w-12 h-12 rounded-full cursor-pointer transition-all duration-300 ring-offset-2 flex items-center justify-center border-2 border-white shadow-sm",
                                                        color.bg,
                                                        field.value === color.id ? `ring-2 ${color.ring} scale-110 shadow-md` : "opacity-60 hover:opacity-100 hover:scale-105"
                                                    )}
                                                >
                                                    {field.value === color.id && <div className="w-4 h-4 bg-white rounded-full" />}
                                                </div>
                                            ))}
                                        </div>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <DialogFooter className="sm:justify-between gap-2">
                            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} className="rounded-xl h-12 text-slate-500 hover:bg-slate-100">İptal</Button>
                            <Button type="submit" className="rounded-xl h-12 px-8 bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-lg shadow-indigo-200">Kaydet</Button>
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
    
    // Find theme or fallback to ocean
    const theme = themeColors.find(c => c.id === (list.colorId || 'ocean')) || themeColors[0];

    return (
        <div 
            className={cn(
                "group relative border rounded-[2rem] p-6 transition-all duration-300 hover:shadow-[0_20px_40px_rgba(0,0,0,0.05)] hover:-translate-y-1 cursor-pointer overflow-hidden flex flex-col justify-between h-[200px] backdrop-blur-md",
                theme.bg,
                theme.border
            )}
            onClick={onClick}
        >
            {/* Background Decoration */}
            <div className="absolute top-0 right-0 -mt-10 -mr-10 w-40 h-40 bg-white/40 rounded-full blur-3xl pointer-events-none"></div>
            
            <div className="flex justify-between items-start relative z-10">
                <div className="p-3.5 rounded-2xl bg-white shadow-sm text-slate-700">
                    <Icon className={cn("h-7 w-7", theme.icon)} />
                </div>
                
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-white/40 text-slate-500 hover:text-slate-800 transition-colors" onClick={(e) => e.stopPropagation()}>
                            <MoreVertical className="h-5 w-5" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="rounded-2xl shadow-xl border-slate-100 p-2">
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(); }} className="gap-2 rounded-xl p-2 cursor-pointer font-medium text-slate-600 focus:bg-slate-50">
                            <Edit className="h-4 w-4"/> Düzenle
                        </DropdownMenuItem>
                        <DropdownMenuSeparator className="bg-slate-100" />
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <DropdownMenuItem onSelect={e => e.preventDefault()} className="text-rose-500 focus:text-rose-600 focus:bg-rose-50 gap-2 rounded-xl p-2 cursor-pointer font-medium">
                                    <Trash2 className="h-4 w-4"/> Sil
                                </DropdownMenuItem>
                            </AlertDialogTrigger>
                            <AlertDialogContent className="rounded-3xl border-0 shadow-2xl">
                                <AlertDialogHeader>
                                    <AlertDialogTitleComponent className="text-xl font-bold text-slate-800">Silmek istediğinize emin misiniz?</AlertDialogTitleComponent>
                                    <AlertDialogDescription className="text-slate-500">Bu liste ve içindeki tüm ürünler kalıcı olarak silinecektir.</AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel className="rounded-xl border-slate-200">İptal</AlertDialogCancel>
                                    <AlertDialogAction onClick={(e) => { e.stopPropagation(); onDelete(list.id); }} className="bg-rose-600 hover:bg-rose-700 text-white rounded-xl">Sil</AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>

            <div className="relative z-10 mt-auto">
                <h3 className={cn("font-black text-2xl mb-1 tracking-tight truncate", theme.text)}>{list.name}</h3>
                <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-500/80 mb-3">
                    <span>{items.length} alınacak</span>
                    <span className={cn("px-2 py-0.5 rounded-full bg-white/50", theme.text)}>{progress}%</span>
                </div>
                <Progress value={progress} className="h-2 rounded-full bg-white/50" indicatorClassName={theme.accent} />
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
  
  // Detail page states
  const [isAddItemDialogOpen, setIsAddItemDialogOpen] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isAiProcessing, setIsAiProcessing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const unsubShopping = onShoppingListsUpdate((lists) => {
        const sortedLists = lists.sort((a, b) => {
            const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
            const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
            return (dateB || 0) - (dateA || 0);
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
      <div className="space-y-6 max-w-5xl mx-auto p-6">
        <div className="pt-12 pb-8">
            <Skeleton className="h-10 w-40 rounded-xl" />
            <Skeleton className="h-6 w-64 rounded-xl mt-3" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Skeleton className="h-48 w-full rounded-[2rem]" />
          <Skeleton className="h-48 w-full rounded-[2rem]" />
        </div>
      </div>
    );
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
        <div className="h-full flex flex-col bg-[#F3F6F8]">
            {/* Dekoratif Arka Plan (Inner) */}
            <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
                <div className="absolute top-0 right-0 w-[50%] h-[50%] bg-blue-100/50 rounded-full blur-[120px]" />
                <div className="absolute bottom-0 left-0 w-[40%] h-[40%] bg-indigo-100/50 rounded-full blur-[120px]" />
            </div>

            {/* Header (Relative & Theme Colored) */}
            <div className={cn("flex-shrink-0 px-6 pt-8 pb-8 flex flex-col gap-6 shadow-sm z-20 transition-all rounded-b-[2.5rem] border-b relative", theme.bg, theme.border)}>
                <div className="flex items-center justify-between">
                    <Button variant="ghost" size="icon" className="hover:bg-white/20 rounded-full text-slate-800" onClick={() => setSelectedList(null)}>
                        <ArrowLeft className="h-6 w-6" />
                    </Button>
                    <div className="p-3 rounded-2xl bg-white/40 backdrop-blur-md shadow-sm text-slate-800 border border-white/50">
                        {React.createElement(listIcons[selectedList.icon as keyof typeof listIcons] || ShoppingCart, { className: "h-6 w-6" })}
                    </div>
                </div>
                
                <div className="px-2">
                    <h1 className={cn("text-3xl font-black leading-tight tracking-tight mb-2", theme.text)}>
                        {selectedList.name}
                    </h1>
                    <div className="flex items-center gap-3">
                        <Badge variant="outline" className="bg-white/40 border-white/50 text-slate-700 px-3 py-1 rounded-full font-bold">
                            {pendingItems.length} alınacak
                        </Badge>
                        <Badge variant="outline" className="bg-white/40 border-white/50 text-slate-700 px-3 py-1 rounded-full font-bold">
                            {boughtItems.length} sepette
                        </Badge>
                    </div>
                </div>
            </div>

            {/* Content with Tabs */}
            <div className="flex-grow flex flex-col min-h-0 relative z-10 mt-4">
                <Tabs defaultValue="pending" className="flex flex-col h-full">
                    <div className="px-6 flex-shrink-0 mb-4">
                        <TabsList className="w-full h-14 bg-white/60 p-1.5 rounded-full shadow-[0_4px_20px_rgba(0,0,0,0.02)] backdrop-blur-md">
                            <TabsTrigger value="pending" className="flex-1 h-full rounded-full data-[state=active]:bg-slate-800 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all font-bold text-slate-500">
                                Alınacaklar
                            </TabsTrigger>
                            <TabsTrigger value="bought" className="flex-1 h-full rounded-full data-[state=active]:bg-slate-800 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all font-bold text-slate-500">
                                Sepetim ({boughtItems.length})
                            </TabsTrigger>
                        </TabsList>
                    </div>

                    <TabsContent value="pending" className="flex-grow overflow-y-auto px-6 pb-28 space-y-2 pt-0 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                        {pendingItems.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-[40vh] text-center space-y-4 opacity-60">
                                <div className={cn("p-6 rounded-full bg-white shadow-sm border border-slate-100")}>
                                    <ListChecks className="h-12 w-12 text-slate-300" />
                                </div>
                                <div>
                                    <p className="text-lg font-bold text-slate-600">Listeniz boş</p>
                                    <p className="text-sm text-slate-400 mt-1 max-w-xs mx-auto">Aşağıdaki + butonuna basarak ürün ekleyebilirsin.</p>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                {sortedPendingCategories.map(([category, items]) => (
                                    <div key={category}>
                                        {category !== 'Diğer' && (
                                            <h3 className="font-bold text-xs uppercase tracking-widest py-3 text-slate-400 pl-2 flex items-center gap-2">
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
                                                    "group flex items-center gap-4 py-3.5 px-5 backdrop-blur-sm border shadow-[0_2px_10px_rgba(0,0,0,0.02)] rounded-[1.25rem] transition-all hover:scale-[1.01] hover:shadow-md cursor-pointer",
                                                    item.isBought 
                                                        ? "bg-gray-50/50 border-gray-200" 
                                                        : cn(theme.itemBg, theme.itemBorder)
                                                )}
                                            >
                                                <Checkbox 
                                                    id={item.id} 
                                                    checked={item.isBought} 
                                                    className={cn(
                                                        "size-6 rounded-full border-2 transition-all pointer-events-none",
                                                        item.isBought 
                                                            ? `bg-slate-400 border-slate-400 text-white` 
                                                            : theme.checkbox
                                                    )}
                                                />
                                                
                                                <label 
                                                    htmlFor={item.id} 
                                                    className={cn(
                                                        "font-bold flex-grow cursor-pointer text-base transition-all",
                                                        item.isBought ? "line-through text-slate-400 decoration-slate-400" : theme.itemText
                                                    )}
                                                >
                                                    {item.name}
                                                </label>

                                                {item.isBought && (
                                                    <Button 
                                                        variant="ghost" 
                                                        size="icon" 
                                                        className="h-10 w-10 rounded-full text-white bg-rose-500 hover:bg-rose-600 shadow-md hover:shadow-lg transition-all animate-in fade-in zoom-in duration-200" 
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
                                    <div key={item.id} className="flex items-center gap-4 py-3 px-5 group bg-slate-100/50 border border-transparent rounded-[1.25rem] opacity-70 hover:opacity-100 transition-all">
                                        <div 
                                            className="h-6 w-6 rounded-full flex items-center justify-center cursor-pointer bg-emerald-500 text-white shadow-sm flex-shrink-0"
                                            onClick={() => moveItemToPendingList(selectedList.id, item)}
                                        >
                                            <CheckCircle2 className="h-4 w-4" />
                                        </div>
                                        <span className="flex-grow font-medium text-base line-through text-slate-500">{item.name}</span>
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-full" onClick={() => deleteShoppingListItemFromList(selectedList.id, item.id, true)}>
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
                <Button className={cn("rounded-full w-16 h-16 shadow-[0_10px_40px_rgba(0,0,0,0.2)] transition-transform hover:scale-105 active:scale-95 border-4 border-white", theme.accent)} size="icon" onClick={() => setIsAddItemDialogOpen(true)}>
                    <Plus className="h-8 w-8 text-white"/>
                </Button>
            </div>

            <Dialog open={isAddItemDialogOpen} onOpenChange={setIsAddItemDialogOpen}>
                <DialogContent className="sm:max-w-md rounded-[2rem] border-0 shadow-2xl bg-white/95 backdrop-blur-xl top-[30%]">
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-black text-slate-800">Yeni Ürün Ekle</DialogTitle>
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
                                    className="pl-5 pr-12 h-14 rounded-2xl text-lg bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-indigo-500 transition-all shadow-inner"
                                    autoComplete="off"
                                />
                                {isAiProcessing && (
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2">
                                        <Sparkles className="h-6 w-6 text-indigo-500 animate-pulse" />
                                    </div>
                                )}
                            </div>
                            <Button type="submit" size="icon" className="h-14 w-14 rounded-2xl bg-slate-800 hover:bg-slate-700 shadow-lg" disabled={!newItemName.trim() || isAiProcessing}>
                                <Plus className="h-6 w-6" />
                            </Button>
                        </form>
                        {suggestions.length > 0 && newItemName.length > 0 && (
                            <div className="p-2 border border-slate-100 rounded-2xl bg-white shadow-sm max-h-40 overflow-y-auto [scrollbar-width:none]">
                                <div className="flex flex-col gap-1">
                                    {suggestions.map((s, i) => (
                                        <button
                                            key={i}
                                            type="button"
                                            onClick={() => handleSuggestionClick(s)}
                                            className="px-4 py-3 hover:bg-slate-50 rounded-xl text-sm font-semibold text-slate-600 transition-colors text-left flex items-center gap-3 group"
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

  // --- HOME VIEW ---
  return (
    <div className="min-h-[100dvh] bg-[#F3F6F8] font-sans">
        {/* Dekoratif Arka Plan */}
        <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-100/60 rounded-full blur-[120px]" />
            <div className="absolute top-[20%] right-[-5%] w-[30%] h-[30%] bg-purple-100/60 rounded-full blur-[120px]" />
            <div className="absolute bottom-[-10%] left-[20%] w-[35%] h-[35%] bg-emerald-100/50 rounded-full blur-[120px]" />
        </div>

        <div className="space-y-8 max-w-5xl mx-auto p-6 relative z-10">
            {/* Header */}
            <div className="pt-8 flex-shrink-0 relative">
                <h1 className="text-4xl font-black tracking-tight mb-2 text-slate-800 flex items-center gap-3">
                    Alışveriş <span className="text-indigo-500 text-lg font-bold bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100">Listelerim</span>
                </h1>
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
                        className="group flex flex-col items-center justify-center border-3 border-dashed border-slate-200 rounded-[2rem] p-6 h-[200px] hover:border-indigo-300 hover:bg-white/50 transition-all duration-300"
                    >
                        <div className="h-16 w-16 rounded-full bg-white shadow-sm group-hover:shadow-md group-hover:scale-110 flex items-center justify-center mb-4 transition-all">
                            <Plus className="h-8 w-8 text-slate-400 group-hover:text-indigo-500" />
                        </div>
                        <span className="font-bold text-slate-400 group-hover:text-indigo-600 text-lg">Yeni Liste Oluştur</span>
                    </button>
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center min-h-[50vh] text-center max-w-md mx-auto px-6">
                    <div className="relative mb-8">
                        <div className="absolute inset-0 bg-indigo-200 blur-3xl opacity-30 rounded-full animate-pulse"></div>
                        <div className="h-28 w-28 rounded-[2rem] bg-white flex items-center justify-center shadow-[0_20px_50px_rgba(0,0,0,0.1)] relative z-10 rotate-6 transition-transform hover:rotate-0">
                            <ShoppingCart className="h-12 w-12 text-indigo-500" />
                        </div>
                    </div>
                    <h3 className="text-2xl font-black mb-3 text-slate-800">Alışverişe Başla</h3>
                    <p className="text-slate-500 mb-10 leading-relaxed font-medium">Hiç listeniz yok. Haftalık market, pazar veya özel günler için şık listeler oluşturun.</p>
                    <Button onClick={() => { setEditingList(null); setListDialogOpen(true); }} size="lg" className="rounded-2xl px-10 h-14 text-lg font-bold bg-slate-900 text-white hover:bg-slate-800 shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all">
                        <Plus className="mr-2 h-5 w-5" /> Liste Oluştur
                    </Button>
                </div>
            )}
        </div>
      <CreateListDialog isOpen={isListDialogOpen} onOpenChange={setListDialogOpen} onCreate={handleCreateOrUpdateList} initialData={editingList} />
    </div>
  );
}