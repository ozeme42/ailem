

"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, X, ArrowLeft, ListChecks, Notebook, Edit, Home, Cake, ShoppingCart, Trash2, PlusCircle, Repeat, Loader2 } from "lucide-react";
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
import { onShoppingNotesUpdate, addShoppingNoteList, deleteShoppingNoteList, addShoppingNoteItemToList, deleteShoppingNoteItemFromList, toggleShoppingNoteItemStatusInList } from '@/lib/dataService';
import { type ShoppingNoteList, type ShoppingNoteItem } from '@/lib/data';
import { PageHeader } from '@/components/page-header';

const brightColors = [
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
        defaultValues: { name: '', icon: 'Notebook' },
    });
    
    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Yeni İhtiyaç Listesi Oluştur</DialogTitle>
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
                                        <Input placeholder={"Genel İhtiyaçlar"} {...field} />
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
    list: ShoppingNoteList; 
    colorClass: string; 
    onClick: () => void;
    onDelete: (id: string) => void;
}) => {
    const Icon = listIcons[list.icon as keyof typeof listIcons] || Notebook;
    const items = list.items || [];
    const pendingItems = items.filter(item => !item.completed).length;
    const description = pendingItems > 0 ? `${pendingItems} ihtiyaç kaldı` : (items.length > 0 ? 'Tüm ihtiyaçlar tamam' : 'Liste boş');

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
                            <AlertDialogDescription>Bu işlem geri alınamaz. Liste ve içindeki tüm ihtiyaçlar kalıcı olarak silinecektir.</AlertDialogDescription>
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


export default function NeedsPage() {
  const [lists, setLists] = useState<ShoppingNoteList[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const { toast } = useToast();
  
  const [isCreateListOpen, setCreateListOpen] = useState(false);
  const [selectedList, setSelectedList] = useState<ShoppingNoteList | null>(null);
  const [newItemName, setNewItemName] = useState('');
  
  useEffect(() => {
    const unsubShopping = onShoppingNotesUpdate((lists) => {
        setLists(lists.sort((a,b) => a.name.localeCompare(b.name, 'tr')));
        setIsLoaded(true);
    });
    return () => {
        unsubShopping();
    }
  }, []);

  useEffect(() => {
    if (selectedList && lists) {
      const updatedList = lists.find(l => l.id === selectedList.id);
      if (updatedList) {
        setSelectedList(updatedList);
      } else {
        setSelectedList(null);
      }
    }
  }, [lists, selectedList]);
  
  const handleCreateList = async (data: CreateListFormData) => {
    await addShoppingNoteList(data.name, data.icon);
    toast({ title: "İhtiyaç Listesi Oluşturuldu!" });
    setCreateListOpen(false);
  };
  
 const handleAddItem = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!newItemName.trim() || !selectedList) return;
    await addShoppingNoteItemToList(selectedList.id, newItemName.trim());
    setNewItemName('');
};

  const handleSelectList = (list: ShoppingNoteList) => {
      setSelectedList(list);
  };
  
  const handleDeleteList = async (id: string) => {
      try {
          await deleteShoppingNoteList(id);
          toast({ title: "Liste Silindi", variant: "destructive" });
      } catch (error) {
          toast({ title: "Hata", description: "Liste silinirken bir sorun oluştu.", variant: "destructive" });
      }
  };

  if (!isLoaded) {
    return (
      <div className="space-y-6">
        <PageHeader title="İhtiyaç Listeleri" />
        <Skeleton className="h-12 w-full" />
        <div className="space-y-4 mt-4">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      </div>
    );
  }

  if (selectedList) {
    const pendingItems = (selectedList.items || []).filter(item => !item.completed);
    const completedItems = (selectedList.items || []).filter(item => item.completed);

     return (
        <div className="flex flex-col h-full">
            <PageHeader title={selectedList.name}>
                <div className="w-full flex items-center justify-between">
                     <Button variant="ghost" className="text-white hover:text-white hover:bg-white/20" onClick={() => setSelectedList(null)}>
                        <ArrowLeft className="h-5 w-5 mr-2" /> Geri
                     </Button>
                </div>
                 <form onSubmit={handleAddItem} className="relative w-full">
                    <Input 
                        value={newItemName} 
                        onChange={(e) => setNewItemName(e.target.value)} 
                        placeholder="Yeni ihtiyaç ekle..."
                        className="bg-white/20 border-white/30 text-white placeholder:text-white/70 focus-visible:ring-offset-0 focus-visible:ring-white"
                    />
                    <Button type="submit" variant="secondary" className="absolute right-1 top-1/2 -translate-y-1/2 h-8 px-3">
                        Ekle
                    </Button>
                </form>
            </PageHeader>
            
            <div className="flex-grow min-h-0 bg-background pt-4">
                <div className="space-y-2">
                    {pendingItems.length > 0 && pendingItems.map(item => (
                        <div key={item.id} className="flex items-center gap-4 py-3 px-4 group">
                            <Checkbox id={item.id} checked={item.completed} onCheckedChange={() => toggleShoppingNoteItemStatusInList(selectedList!.id, item.id)} className="size-6 rounded-md" />
                            <label htmlFor={item.id} className="font-medium flex-grow cursor-pointer">{item.name}</label>
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive/70 hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 className="h-4 w-4" /></Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader><AlertDialogTitleComponent>İhtiyacı Sil</AlertDialogTitleComponent><AlertDialogDescription>Bu ihtiyacı kalıcı olarak silmek istediğinizden emin misiniz?</AlertDialogDescription></AlertDialogHeader>
                                    <AlertDialogFooter><AlertDialogCancel>İptal</AlertDialogCancel><AlertDialogAction onClick={() => deleteShoppingNoteItemFromList(selectedList!.id, item.id)}>Sil</AlertDialogAction></AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </div>
                    ))}
                </div>
                 {completedItems.length > 0 && (
                    <div className="mt-6">
                        <h3 className="text-sm font-semibold text-muted-foreground px-4 mb-2">Tamamlananlar</h3>
                        <div className="space-y-2">
                            {completedItems.map(item => (
                                <div key={item.id} className="flex items-center gap-4 py-3 px-4 group bg-muted/50">
                                    <Checkbox id={item.id} checked={item.completed} onCheckedChange={() => toggleShoppingNoteItemStatusInList(selectedList!.id, item.id)} className="size-6 rounded-md" />
                                    <label htmlFor={item.id} className="font-medium flex-grow cursor-pointer line-through text-muted-foreground">{item.name}</label>
                                </div>
                            ))}
                        </div>
                    </div>
                 )}
            </div>
        </div>
     );
  }

  return (
    <div className="space-y-6">
        <PageHeader title="İhtiyaç Listeleri">
            <Button variant="secondary" onClick={() => setCreateListOpen(true)}>
                <PlusCircle className="size-4 mr-2" /> Yeni Liste Oluştur
            </Button>
        </PageHeader>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {lists.length > 0 ? (
                lists.map((list, index) => {
                    const color = brightColors[index % brightColors.length];
                    return (
                        <ListCard 
                            key={list.id} 
                            list={list} 
                            colorClass={cn("bg-gradient-to-br", color.gradient)} 
                            onClick={() => handleSelectList(list)}
                            onDelete={handleDeleteList}
                        />
                    )
                })
            ) : (
                <div className="md:col-span-2 text-center text-muted-foreground py-16 flex flex-col items-center justify-center border-2 border-dashed rounded-lg bg-background">
                    <Notebook className="mx-auto h-12 w-12 text-muted-foreground/50" />
                    <p className="mt-4 text-md">Henüz ihtiyaç listeniz yok.</p>
                    <p className="text-sm">Başlamak için "Yeni Liste Oluştur"a tıklayın.</p>
                </div>
            )}
        </div>
      <CreateListDialog isOpen={isCreateListOpen} onOpenChange={setCreateListOpen} onCreate={handleCreateList} />
    </div>
  );
}
