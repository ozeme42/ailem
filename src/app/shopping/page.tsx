

"use client";

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Button, buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, ArrowLeft, ListChecks, Notebook, Edit, Home, Cake, ShoppingCart, Trash2, MoreVertical, CheckCircle2, Circle, Search, Sparkles, Zap, Archive } from "lucide-react";
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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
import { ScrollArea } from '@/components/ui/scroll-area';

// --- Modern & Vibrant Color Palette (Gradients) ---
const themeColors = [
    { id: 'ocean', name: 'Okyanus', gradient: 'bg-gradient-to-br from-cyan-500 to-blue-600', shadow: 'shadow-cyan-500/25', icon: 'text-cyan-600', progress: 'bg-white' },
    { id: 'sunset', name: 'Gün Batımı', gradient: 'bg-gradient-to-br from-orange-400 to-rose-600', shadow: 'shadow-orange-500/25', icon: 'text-orange-600', progress: 'bg-white' },
    { id: 'forest', name: 'Orman', gradient: 'bg-gradient-to-br from-emerald-400 to-teal-600', shadow: 'shadow-emerald-500/25', icon: 'text-emerald-600', progress: 'bg-white' },
    { id: 'berry', name: 'Böğürtlen', gradient: 'bg-gradient-to-br from-fuchsia-500 to-purple-600', shadow: 'shadow-fuchsia-500/25', icon: 'text-fuchsia-600', progress: 'bg-white' },
    { id: 'royal', name: 'Asil', gradient: 'bg-gradient-to-br from-indigo-500 to-violet-700', shadow: 'shadow-indigo-500/25', icon: 'text-indigo-600', progress: 'bg-white' },
    { id: 'cherry', name: 'Kiraz', gradient: 'bg-gradient-to-br from-red-500 to-pink-600', shadow: 'shadow-red-500/25', icon: 'text-red-600', progress: 'bg-white' },
];

const listIcons = {
  ShoppingCart: ShoppingCart,
  Home: Home,
  ListChecks: ListChecks,
  Cake: Cake,
  Notebook: Notebook,
};

// Frequently used quick add suggestions
const quickSuggestions = ["Ekmek", "Süt", "Yumurta", "Peynir", "Domates", "Salatalık", "Su", "Yoğurt", "Makarna", "Pirinç"];

// --- Form Schemas ---
const createListSchema = z.object({
  name: z.string().min(2, "Liste adı en az 2 karakter olmalıdır."),
  icon: z.string().min(1, "Bir ikon seçmelisiniz."),
  colorId: z.string().optional(),
});

type CreateListFormData = z.infer<typeof createListSchema>;

// --- Sub Components ---

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
            const randomColor = themeColors[Math.floor(Math.random() * themeColors.length)].id;
            form.reset({ name: initialData.name, icon: initialData.icon, colorId: randomColor });
        } else {
            form.reset({ name: '', icon: 'ShoppingCart', colorId: 'ocean' });
        }
    }, [initialData, form, isOpen]);

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md rounded-3xl border-0 shadow-2xl">
                <DialogHeader>
                    <DialogTitle className="text-xl font-bold">{initialData ? 'Listeyi Düzenle' : 'Yeni Liste Oluştur'}</DialogTitle>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onCreate)} className="space-y-6 pt-4">
                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-muted-foreground font-semibold">Liste Adı</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Örn: Haftalık Pazar..." className="h-12 rounded-2xl bg-muted/30 border-transparent focus:border-primary/50 focus:bg-white text-lg shadow-inner transition-all" {...field} />
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
                                        <FormLabel className="text-muted-foreground font-semibold">İkon</FormLabel>
                                        <div className="flex gap-3 justify-start overflow-x-auto pb-2 scrollbar-hide">
                                            {Object.keys(listIcons).map(iconName => {
                                                const Icon = listIcons[iconName as keyof typeof listIcons];
                                                return (
                                                    <div 
                                                        key={iconName}
                                                        onClick={() => field.onChange(iconName)}
                                                        className={cn(
                                                            "p-3 rounded-2xl cursor-pointer transition-all duration-200 border-2 shadow-sm",
                                                            field.value === iconName ? "border-primary bg-primary text-primary-foreground scale-110 shadow-md" : "border-transparent bg-muted/50 hover:bg-muted text-muted-foreground"
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
                                        <FormLabel className="text-muted-foreground font-semibold">Renk Teması</FormLabel>
                                        <div className="flex gap-3 justify-start overflow-x-auto pb-2 scrollbar-hide">
                                            {themeColors.map(color => (
                                                <div
                                                    key={color.id}
                                                    onClick={() => field.onChange(color.id)}
                                                    className={cn(
                                                        "w-10 h-10 rounded-full cursor-pointer transition-all duration-300 ring-offset-2",
                                                        color.gradient,
                                                        field.value === color.id ? `ring-2 ring-foreground scale-110 shadow-lg` : "opacity-70 hover:opacity-100 hover:scale-105"
                                                    )}
                                                />
                                            ))}
                                        </div>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <DialogFooter className="sm:justify-between gap-2">
                            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} className="rounded-xl h-12">İptal</Button>
                            <Button type="submit" className="rounded-xl h-12 px-8 bg-black hover:bg-black/80 text-white font-bold shadow-lg">Kaydet</Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
};

const ListCard = ({ list, index, onClick, onEdit, onDelete }: { 
    list: ShoppingList; 
    index: number;
    onClick: () => void;
    onEdit: () => void;
    onDelete: (id: string) => void;
}) => {
    const Icon = listIcons[list.icon as keyof typeof listIcons] || ShoppingCart;
    const items = list.items || [];
    const boughtItems = list.boughtItems || [];
    const totalItems = items.length + boughtItems.length;
    const progress = totalItems === 0 ? 0 : Math.round((boughtItems.length / totalItems) * 100);
    
    // Select color based on index
    const theme = themeColors[index % themeColors.length];

    return (
        <div 
            className={cn(
                "group relative border-0 rounded-3xl p-5 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 cursor-pointer overflow-hidden text-white flex flex-col justify-between h-[180px]",
                theme.gradient,
                theme.shadow
            )}
            onClick={onClick}
        >
            {/* Background Decoration */}
            <div className="absolute top-0 right-0 -mt-8 -mr-8 w-32 h-32 bg-white/20 rounded-full blur-2xl pointer-events-none"></div>
            <div className="absolute bottom-0 left-0 -mb-8 -ml-8 w-24 h-24 bg-black/10 rounded-full blur-2xl pointer-events-none"></div>

            <div className="flex justify-between items-start relative z-10">
                <div className="p-2.5 rounded-xl bg-white/20 backdrop-blur-md shadow-inner text-white">
                    <Icon className="h-6 w-6" />
                </div>
                
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-white/20 text-white/80 hover:text-white transition-colors" onClick={(e) => e.stopPropagation()}>
                            <MoreVertical className="h-5 w-5" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="rounded-xl shadow-xl">
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(); }} className="gap-2">
                            <Edit className="h-4 w-4"/> Düzenle
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <DropdownMenuItem onSelect={e => e.preventDefault()} className="text-destructive focus:text-destructive gap-2">
                                    <Trash2 className="h-4 w-4"/> Sil
                                </DropdownMenuItem>
                            </AlertDialogTrigger>
                            <AlertDialogContent className="rounded-2xl">
                                <AlertDialogHeader>
                                    <AlertDialogTitleComponent>Silmek istediğinize emin misiniz?</AlertDialogTitleComponent>
                                    <AlertDialogDescription>Bu liste ve içindeki tüm ürünler kalıcı olarak silinecektir.</AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel className="rounded-xl">İptal</AlertDialogCancel>
                                    <AlertDialogAction onClick={(e) => { e.stopPropagation(); onDelete(list.id); }} className={cn(buttonVariants({variant: 'destructive'}), "rounded-xl")}>Sil</AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>

            <div className="relative z-10 mt-auto">
                <h3 className="font-bold text-xl mb-1 tracking-tight">{list.name}</h3>
                <div className="flex items-center justify-between text-xs font-medium text-white/80 mb-2">
                    <span>{items.length} alınacak</span>
                    <span>%{progress}</span>
                </div>
                <Progress value={progress} className="h-1.5 rounded-full bg-black/20" indicatorClassName="bg-white/90" />
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
  
  // Suggestion engine
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
            await updateShoppingList(editingList.id, { name: data.name, icon: data.icon }); 
            toast({ title: "Liste Güncellendi" });
        } else {
            await addShoppingList(data.name, data.icon);
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

  if (!isLoaded) {
    return (
      <div className="p-6 space-y-6 max-w-5xl mx-auto">
        <div className="flex items-center justify-between">
            <Skeleton className="h-10 w-40 rounded-xl" />
            <Skeleton className="h-10 w-10 rounded-full" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Skeleton className="h-48 w-full rounded-2xl" />
          <Skeleton className="h-48 w-full rounded-2xl" />
        </div>
      </div>
    );
  }

  // --- DETAIL VIEW ---
  if (selectedList) {
    const pendingItems = (selectedList.items || []).sort((a,b) => (new Date(b.createdAt||0).getTime()) - (new Date(a.createdAt||0).getTime()));
    const boughtItems = (selectedList.boughtItems || []).sort((a,b) => (new Date(b.createdAt||0).getTime()) - (new Date(a.createdAt||0).getTime()));
    
    const listIndex = shoppingLists.findIndex(l => l.id === selectedList.id);
    const theme = themeColors[listIndex >= 0 ? listIndex % themeColors.length : 0];

    return (
        <div className="bg-background text-foreground animate-in fade-in zoom-in-95 duration-300">
            {/* Header */}
            <div className={cn("flex-shrink-0 px-6 pt-12 pb-6 flex items-center justify-between shadow-lg z-20 transition-all rounded-b-[2rem]", theme.gradient)}>
                <div className="flex items-center gap-4 text-white">
                    <Button variant="ghost" size="icon" className="hover:bg-white/20 rounded-full text-white" onClick={() => setSelectedList(null)}>
                        <ArrowLeft className="h-6 w-6" />
                    </Button>
                    <div className="flex flex-col">
                        <h1 className="text-2xl font-bold leading-tight flex items-center gap-2">
                            {selectedList.name}
                        </h1>
                        <span className="text-xs font-medium text-white/80">
                            {pendingItems.length} alınacak • {boughtItems.length} sepette
                        </span>
                    </div>
                </div>
                <div className="p-3 rounded-2xl bg-white/20 backdrop-blur-md shadow-inner text-white">
                    {React.createElement(listIcons[selectedList.icon as keyof typeof listIcons] || ShoppingCart, { className: "h-6 w-6" })}
                </div>
            </div>

            {/* Content with Tabs */}
            <div className="flex-grow flex flex-col min-h-0 relative">
                <Tabs defaultValue="pending" className="flex flex-col h-full">
                    {/* Segmented Control */}
                    <div className="px-6 py-4 flex-shrink-0">
                        <TabsList className="w-full h-12 bg-muted/50 p-1 rounded-2xl shadow-inner">
                            <TabsTrigger value="pending" className="flex-1 h-full rounded-xl data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm transition-all font-semibold">
                                Alınacaklar
                                {pendingItems.length > 0 && <Badge variant="secondary" className="ml-2 h-5 px-1.5 text-[10px] bg-primary/10 text-primary">{pendingItems.length}</Badge>}
                            </TabsTrigger>
                            <TabsTrigger value="bought" className="flex-1 h-full rounded-xl data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm transition-all font-semibold">
                                Sepetim
                                {boughtItems.length > 0 && <Badge variant="secondary" className="ml-2 h-5 px-1.5 text-[10px] bg-green-100 text-green-700">{boughtItems.length}</Badge>}
                            </TabsTrigger>
                        </TabsList>
                    </div>

                    {/* List Area */}
                    <TabsContent value="pending" className="flex-grow overflow-y-auto px-6 pb-52 space-y-3 pt-0">
                        {pendingItems.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-64 text-center space-y-6 opacity-60">
                                <div className={cn("p-8 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 shadow-inner")}>
                                    <ListChecks className="h-16 w-16 text-gray-400" />
                                </div>
                                <div>
                                    <p className="text-xl font-bold text-gray-700">Listeniz boş</p>
                                    <p className="text-sm text-gray-500 mt-2 max-w-xs mx-auto">Aşağıdaki hızlı ekleme panelini kullanarak ihtiyaçlarınızı yazın.</p>
                                </div>
                            </div>
                        ) : (
                            pendingItems.map((item) => (
                                <div key={item.id} className="group flex items-center gap-4 p-4 bg-white border border-gray-100 rounded-2xl shadow-sm hover:shadow-md transition-all animate-in slide-in-from-bottom-4 duration-300">
                                    <div 
                                        className={cn("h-7 w-7 rounded-full border-2 flex items-center justify-center cursor-pointer transition-all active:scale-90 flex-shrink-0", theme.icon.replace('text-', 'border-'))}
                                        onClick={() => moveItemToBought(selectedList.id, item.id)}
                                    >
                                        <div className={cn("h-4 w-4 rounded-full opacity-0 transition-opacity bg-current group-hover:opacity-20")} />
                                    </div>
                                    <span className="flex-grow font-semibold text-gray-800 text-base leading-snug">{item.name}</span>
                                    
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-gray-600">
                                                <MoreVertical className="h-4 w-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end" className="rounded-xl">
                                            <DropdownMenuItem onClick={() => moveItemToBought(selectedList.id, item.id)}>
                                                <CheckCircle2 className="mr-2 h-4 w-4"/> Alındı İşaretle
                                            </DropdownMenuItem>
                                            <DropdownMenuSeparator />
                                            <DropdownMenuItem onClick={() => deleteShoppingListItemFromList(selectedList.id, item.id, false)} className="text-destructive focus:text-destructive">
                                                <Trash2 className="mr-2 h-4 w-4"/> Sil
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                            ))
                        )}
                    </TabsContent>

                    <TabsContent value="bought" className="flex-grow overflow-y-auto px-6 pb-52 space-y-3 pt-0">
                        {boughtItems.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-64 text-center opacity-50">
                                <p>Henüz satın alınan ürün yok.</p>
                            </div>
                        ) : (
                            boughtItems.map((item) => (
                                <div key={item.id} className="flex items-center gap-4 p-4 bg-gray-50 border border-transparent rounded-2xl opacity-60 hover:opacity-100 transition-opacity">
                                    <div 
                                        className="h-7 w-7 rounded-full flex items-center justify-center cursor-pointer bg-green-500 text-white shadow-sm flex-shrink-0"
                                        onClick={() => moveItemToPending(selectedList.id, item.id)}
                                    >
                                        <CheckCircle2 className="h-5 w-5" />
                                    </div>
                                    <span className="flex-grow font-medium text-base line-through text-gray-500">{item.name}</span>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-destructive" onClick={() => deleteShoppingListItemFromList(selectedList.id, item.id, true)}>
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            ))
                        )}
                    </TabsContent>
                </Tabs>
            </div>

            <div className="fixed bottom-24 md:bottom-6 right-6 z-10">
                <Button className={cn("rounded-full w-16 h-16 shadow-xl transition-transform hover:scale-105 active:scale-95", theme.gradient)} size="icon" onClick={() => setIsAddItemDialogOpen(true)}>
                    <Plus className="h-8 w-8 text-white"/>
                </Button>
            </div>
             <Dialog open={isAddItemDialogOpen} onOpenChange={setIsAddItemDialogOpen}>
                <DialogContent>
                     <DialogHeader>
                        <DialogTitle>Yeni Ürün Ekle</DialogTitle>
                        <DialogDescription>
                          Hızlıca bir ürün ekleyin veya yapay zeka ile birden fazla ürünü listeye dağıtın.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="pt-4 space-y-4">
                        <form 
                            onSubmit={(e) => handleAddItem(e)} 
                            className="relative flex items-center gap-3"
                        >
                            <div className="relative flex-grow group">
                                <Input 
                                    ref={inputRef}
                                    value={newItemName}
                                    onChange={(e) => setNewItemName(e.target.value)}
                                    placeholder="2kg domates, 1 paket süt..."
                                    className="pl-5 pr-12 h-12 rounded-xl text-base"
                                    autoComplete="off"
                                />
                                {isAiProcessing && (
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2">
                                        <Sparkles className="h-5 w-5 text-purple-600 animate-pulse" />
                                    </div>
                                )}
                            </div>
                            <Button 
                                type="submit" 
                                size="sm" 
                                className="h-10"
                                disabled={!newItemName.trim() || isAiProcessing}
                            >
                                Ekle
                            </Button>
                        </form>
                        {suggestions.length > 0 && newItemName.length > 0 && (
                            <div className="p-2 border rounded-lg max-h-32 overflow-y-auto">
                                <div className="flex flex-col gap-1">
                                    {suggestions.map((s, i) => (
                                        <button
                                            key={i}
                                            type="button"
                                            onClick={() => handleSuggestionClick(s)}
                                            className="px-3 py-2 hover:bg-muted rounded-lg text-sm font-medium transition-colors text-left flex items-center gap-3 group"
                                        >
                                            <Search className="h-4 w-4 text-muted-foreground group-hover:text-primary" />
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
    <div className="p-6 max-w-5xl mx-auto space-y-6">
        <header>
            <h1 className="text-4xl font-black tracking-tight mb-2 bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">Alışveriş</h1>
            <p className="text-muted-foreground text-lg font-medium">İhtiyaçlarınızı organize edin.</p>
        </header>

        {shoppingLists.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {shoppingLists.map((list, index) => (
                    <ListCard 
                        key={list.id} 
                        index={index}
                        list={list} 
                        onClick={() => setSelectedList(list)}
                        onEdit={() => { setEditingList(list); setListDialogOpen(true); }}
                        onDelete={handleDeleteList}
                    />
                ))}
                
                {/* Add New List Card (Dashed) */}
                <button 
                    onClick={() => { setEditingList(null); setListDialogOpen(true); }}
                    className="group flex flex-col items-center justify-center border-3 border-dashed border-gray-200 rounded-3xl p-6 h-[180px] hover:border-gray-400 hover:bg-gray-100/50 transition-all duration-300"
                >
                    <div className="h-12 w-12 rounded-full bg-gray-100 group-hover:bg-white flex items-center justify-center mb-3 shadow-sm transition-all group-hover:scale-110">
                        <Plus className="h-6 w-6 text-gray-500 group-hover:text-black" />
                    </div>
                    <span className="font-bold text-gray-500 group-hover:text-gray-900">Yeni Liste Oluştur</span>
                </button>
            </div>
        ) : (
            <div className="flex flex-col items-center justify-center min-h-[50vh] text-center max-w-md mx-auto">
                <div className="relative mb-8">
                    <div className="absolute inset-0 bg-blue-500 blur-3xl opacity-20 rounded-full animate-pulse"></div>
                    <div className="h-24 w-24 rounded-3xl bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center shadow-2xl relative z-10 rotate-3 transition-transform hover:rotate-0">
                        <ShoppingCart className="h-12 w-12 text-white" />
                    </div>
                </div>
                <h3 className="text-2xl font-bold mb-3 text-gray-900">Alışverişe Başla</h3>
                <p className="text-gray-500 mb-8 leading-relaxed">Hiç listeniz yok. Haftalık market, pazar veya özel günler için şık listeler oluşturun.</p>
                <Button onClick={() => { setEditingList(null); setListDialogOpen(true); }} size="lg" className="rounded-2xl px-10 h-14 text-lg font-bold bg-black text-white hover:bg-gray-800 shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all">
                    <Plus className="mr-2 h-5 w-5" /> Liste Oluştur
                </Button>
            </div>
        )}

      <CreateListDialog isOpen={isListDialogOpen} onOpenChange={setListDialogOpen} onCreate={handleCreateOrUpdateList} initialData={editingList} />
    </div>
  );
}
