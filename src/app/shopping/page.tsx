
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
import { onShoppingListsUpdate, addShoppingList, deleteShoppingList, addShoppingListItemToList, toggleShoppingListItemStatusInList, deleteShoppingListItemFromList, clearBoughtItemsFromList, onShoppingNoteListsUpdate, addShoppingNoteList, deleteShoppingNoteList, addNoteItemToList, deleteNoteItemFromList, updateNoteItemInList } from '@/lib/dataService';
import { type ShoppingList, type ShoppingItem as ShoppingListItemType, type ShoppingNoteList, type ShoppingNoteItem } from '@/lib/data';
import { defaultShoppingItems } from "@/lib/shopping-suggestions";
import { PageHeader } from '@/components/page-header';


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

const CreateListDialog = ({ isOpen, onOpenChange, onCreate, listType }: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (data: CreateListFormData) => void;
  listType: 'shopping' | 'note';
}) => {
    const form = useForm<CreateListFormData>({
        resolver: zodResolver(createListSchema),
        defaultValues: { name: '', icon: listType === 'shopping' ? 'ListChecks' : 'Notebook' },
    });
    
    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Yeni {listType === 'shopping' ? 'Alışveriş Listesi' : 'Not Defteri'} Oluştur</DialogTitle>
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
                                        <Input placeholder={listType === 'shopping' ? "Haftalık Alışveriş" : "Genel Notlar"} {...field} />
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

const ListCard = ({ list, colorClass, onClick }: { list: ShoppingList | ShoppingNoteList; colorClass: string; onClick: () => void }) => {
    const Icon = listIcons[list.icon as keyof typeof listIcons] || ShoppingCart;
    const items = 'items' in list ? list.items : [];
    const pendingItems = items.filter((item: any) => !(item.isBought || item.completed)).length;
    const totalItems = items.length;

    const description = 'items' in list 
        ? (pendingItems > 0 ? `${pendingItems} öğe kaldı` : (totalItems > 0 ? 'Tüm öğeler alındı' : 'Liste boş'))
        : `${totalItems} not`;

    return (
        <div onClick={onClick} className={cn("flex items-center gap-4 text-white px-4 min-h-[72px] py-2 cursor-pointer rounded-lg shadow-sm border-0", colorClass)}>
            <div className="bg-white/20 text-white flex items-center justify-center rounded-lg shrink-0 size-12">
                <Icon className="h-6 w-6" />
            </div>
            <div className="flex flex-col justify-center">
                <p className="text-base font-medium leading-normal line-clamp-1">{list.name}</p>
                <p className="text-white/80 text-sm font-normal leading-normal line-clamp-2">
                    {description}
                </p>
            </div>
        </div>
    );
};


const EditNoteDialog = ({ note, listName, isOpen, onOpenChange, onSubmit }: {
  note: ShoppingNoteItem | null;
  listName: string;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (newText: string) => void;
}) => {
  const [text, setText] = useState('');

  useEffect(() => {
    if (note) {
      setText(note.text);
    } else {
      setText('');
    }
  }, [note]);
  
  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (text.trim()) {
        onSubmit(text);
    }
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Notu Düzenle</DialogTitle>
          <DialogDescription>"{listName}" defterindeki notu güncelleyin.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSave} className="space-y-4 py-4">
          <Textarea 
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={4} 
            autoFocus
          />
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>İptal</Button>
            <Button type="submit">Kaydet</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};


export default function ShoppingPage() {
  const [shoppingLists, setShoppingLists] = useState<ShoppingList[]>([]);
  const [noteLists, setNoteLists] = useState<ShoppingNoteList[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const { toast } = useToast();
  
  const [createListType, setCreateListType] = useState<'shopping' | 'note' | null>(null);
  const [selectedList, setSelectedList] = useState<ShoppingList | null>(null);
  const [selectedNoteList, setSelectedNoteList] = useState<ShoppingNoteList | null>(null);
  const [selectedListColor, setSelectedListColor] = useState<string>('bg-gray-500');
  const [newItemName, setNewItemName] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [newNoteText, setNewNoteText] = useState('');
  const [editingNote, setEditingNote] = useState<ShoppingNoteItem | null>(null);
  
  useEffect(() => {
    const unsubShopping = onShoppingListsUpdate(setShoppingLists);
    const unsubNotes = onShoppingNoteListsUpdate((notes) => {
        setNoteLists(notes);
        setIsLoaded(true);
    });
    return () => {
        unsubShopping();
        unsubNotes();
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

  useEffect(() => {
    if (selectedNoteList && noteLists) {
      const updatedList = noteLists.find(l => l.id === selectedNoteList.id);
      if (updatedList) {
        setSelectedNoteList(updatedList);
      } else {
        setSelectedNoteList(null);
      }
    }
  }, [noteLists, selectedNoteList]);
  
  const historicalItems = useMemo(() => {
    const items = new Set<string>();
    (shoppingLists || []).forEach(list => {
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
    if (createListType === 'shopping') {
        await addShoppingList(data.name, data.icon);
        toast({ title: "Alışveriş Listesi Oluşturuldu!" });
    } else if (createListType === 'note') {
        await addShoppingNoteList(data.name, data.icon);
        toast({ title: "Not Defteri Oluşturuldu!" });
    }
    setCreateListType(null);
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
  
  const handleAddNote = async (e: React.FormEvent) => {
      e.preventDefault();
      if (newNoteText.trim() && selectedNoteList) {
          await addNoteItemToList(selectedNoteList.id, newNoteText.trim());
          setNewNoteText('');
          toast({ title: 'Not Eklendi' });
      }
  };
  
  const handleUpdateNoteSubmit = async (newText: string) => {
    if (editingNote && selectedNoteList) {
      await updateNoteItemInList(selectedNoteList.id, editingNote.id, newText);
      setEditingNote(null);
      toast({ title: "Not Güncellendi" });
    }
  };

  const pendingItems = useMemo(() => selectedList?.items.filter(item => !item.isBought) || [], [selectedList]);
  const boughtItems = useMemo(() => selectedList?.items.filter(item => item.isBought) || [], [selectedList]);
  
  const handleSelectList = (list: ShoppingList, color: string) => {
      setSelectedList(list);
      setSelectedListColor(color);
  };

  const handleSelectNoteList = (list: ShoppingNoteList, color: string) => {
      setSelectedNoteList(list);
      setSelectedListColor(color);
  };
  
  if (!isLoaded) {
    return (
      <div className="space-y-6">
        <PageHeader title="Alışveriş & Notlar" />
        <Skeleton className="h-12 w-full" />
        <div className="space-y-4 mt-4">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      </div>
    );
  }

  if (selectedList) {
     const Icon = listIcons[selectedList.icon as keyof typeof listIcons] || ShoppingCart;
     return (
        <div>
          <PageHeader title={selectedList.name}>
            <div className='flex items-center gap-2'>
              <Button variant="ghost" onClick={() => setSelectedList(null)}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Geri
              </Button>
              <AlertDialog>
                  <AlertDialogTrigger asChild>
                      <Button variant="destructive" size="icon"><Trash2 className="h-4 w-4" /></Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                      <AlertDialogHeader>
                          <AlertDialogTitleComponent>"{selectedList.name}" listesini sil?</AlertDialogTitleComponent>
                          <AlertDialogDescription>Bu işlem geri alınamaz. Liste ve içindeki tüm öğeler kalıcı olarak silinecektir.</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                          <AlertDialogCancel>İptal</AlertDialogCancel>
                          <AlertDialogAction onClick={() => { deleteShoppingList(selectedList.id); setSelectedList(null); }}>Sil</AlertDialogAction>
                      </AlertDialogFooter>
                  </AlertDialogContent>
              </AlertDialog>
            </div>
          </PageHeader>
            <div className="flex-grow p-4 space-y-4 bg-background rounded-lg border">
                <form onSubmit={handleAddItem} className="flex gap-2 relative">
                    <Input value={newItemName} onChange={(e) => setNewItemName(e.target.value)} placeholder="Yeni öğe ekle..." className="peer"/>
                    <Button type="submit"><Plus className="h-5 w-5" /></Button>

                     {suggestions.length > 0 && (
                        <div className="absolute top-full left-0 right-0 z-10 mt-1 bg-background border rounded-md shadow-lg">
                           {suggestions.map((s, i) => (
                               <button
                                   key={i}
                                   type="button"
                                   onMouseDown={(e) => { e.preventDefault(); handleSuggestionClick(s); }}
                                   className="w-full text-left px-3 py-2 text-sm hover:bg-accent"
                               >
                                   {s}
                               </button>
                           ))}
                        </div>
                    )}
                </form>
                <Tabs defaultValue="pending">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="pending">Alınacaklar ({pendingItems.length})</TabsTrigger>
                        <TabsTrigger value="bought">Alınanlar ({boughtItems.length})</TabsTrigger>
                    </TabsList>
                    <TabsContent value="pending" className="mt-4">
                         <div className="border rounded-lg bg-card">
                         {pendingItems.map((item, index) => (
                            <div 
                                key={item.id} 
                                className={cn(
                                    "flex items-center p-3 group cursor-pointer",
                                    index < pendingItems.length - 1 && "border-b"
                                )}
                                onClick={() => toggleShoppingListItemStatusInList(selectedList.id, item.id)}
                            >
                                <Checkbox id={item.id} checked={item.isBought} className="size-5 pointer-events-none" />
                                <Label htmlFor={item.id} className="ml-3 font-medium cursor-pointer">{item.name}</Label>
                                <Button variant="ghost" size="icon" className="ml-auto h-8 w-8 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100" onClick={(e) => {e.stopPropagation(); deleteShoppingListItemFromList(selectedList.id, item.id)}}><X className="h-4 w-4" /></Button>
                            </div>
                         ))}
                         </div>
                    </TabsContent>
                    <TabsContent value="bought" className="mt-4">
                        <div className="border rounded-lg bg-card">
                         {boughtItems.map((item, index) => (
                           <div 
                                key={item.id} 
                                className={cn(
                                    "flex items-center p-3 group cursor-pointer bg-muted/50",
                                     index < boughtItems.length - 1 && "border-b"
                                )}
                                onClick={() => toggleShoppingListItemStatusInList(selectedList.id, item.id)}
                            >
                                <Checkbox id={item.id} checked={item.isBought} className="size-5 pointer-events-none" />
                                <Label htmlFor={item.id} className="ml-3 font-medium cursor-pointer line-through text-muted-foreground">{item.name}</Label>
                                <Button variant="ghost" size="icon" className="ml-auto h-8 w-8 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100" onClick={(e) => {e.stopPropagation(); deleteShoppingListItemFromList(selectedList.id, item.id)}}><X className="h-4 w-4" /></Button>
                            </div>
                         ))}
                         </div>
                         {boughtItems.length > 0 && (
                            <Button variant="outline" className="w-full mt-4" onClick={() => clearBoughtItemsFromList(selectedList.id)}>
                                Alınanları Temizle
                            </Button>
                         )}
                    </TabsContent>
                </Tabs>
            </div>
        </div>
     );
  }

  if (selectedNoteList) {
     const Icon = listIcons[selectedNoteList.icon as keyof typeof listIcons] || Notebook;
     return (
        <div>
          <PageHeader title={selectedNoteList.name}>
            <div className='flex items-center gap-2'>
              <Button variant="ghost" onClick={() => setSelectedNoteList(null)}><ArrowLeft className="h-5 w-5 mr-2" /> Geri</Button>
              <AlertDialog>
                  <AlertDialogTrigger asChild>
                      <Button variant="destructive" size="icon"><Trash2 className="h-4 w-4" /></Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                      <AlertDialogHeader>
                          <AlertDialogTitleComponent>"{selectedNoteList.name}" defterini sil?</AlertDialogTitleComponent>
                          <AlertDialogDescription>Bu işlem geri alınamaz. Defter ve içindeki tüm notlar kalıcı olarak silinecektir.</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                          <AlertDialogCancel>İptal</AlertDialogCancel>
                          <AlertDialogAction onClick={() => { deleteShoppingNoteList(selectedNoteList.id); setSelectedNoteList(null); }}>Sil</AlertDialogAction>
                      </AlertDialogFooter>
                  </AlertDialogContent>
              </AlertDialog>
            </div>
          </PageHeader>
          <div className="flex-grow p-4 space-y-4 bg-background rounded-lg border">
              <form onSubmit={handleAddNote} className="flex items-start gap-2">
                  <Textarea placeholder="Yeni not..." value={newNoteText} onChange={(e) => setNewNoteText(e.target.value)} rows={1} className="flex-grow" />
                  <Button type="submit">Ekle</Button>
              </form>
              <div className="space-y-2">
                  {(selectedNoteList.items || []).map(note => (
                      <div key={note.id} className="p-3 bg-card border rounded-lg flex justify-between items-start gap-2 group">
                          <p className="text-sm flex-grow whitespace-pre-wrap">{note.text}</p>
                          <div className="flex-shrink-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditingNote(note)}><Edit className="h-4 w-4" /></Button>
                              <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive/70 hover:text-destructive"><Trash2 className="h-4 w-4" /></Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                      <AlertDialogHeader><AlertDialogTitleComponent>Notu Sil</AlertDialogTitleComponent><AlertDialogDescription>Bu notu kalıcı olarak silmek istediğinizden emin misiniz?</AlertDialogDescription></AlertDialogHeader>
                                      <AlertDialogFooter><AlertDialogCancel>İptal</AlertDialogCancel><AlertDialogAction onClick={() => deleteNoteItemFromList(selectedNoteList.id, note.id)}>Sil</AlertDialogAction></AlertDialogFooter>
                                  </AlertDialogContent>
                              </AlertDialog>
                          </div>
                      </div>
                  ))}
                  {(selectedNoteList.items || []).length === 0 && (
                      <p className="text-sm text-center text-muted-foreground pt-8">Bu defterde henüz not yok.</p>
                  )}
              </div>
          </div>
        </div>
     );
  }

  return (
    <div className="space-y-6">
        <div className="flex items-center justify-between p-4 bg-gradient-to-r from-purple-500 to-indigo-600 text-white rounded-xl shadow-lg mb-6">
            <h1 className="text-2xl font-bold">Alışveriş & Notlar</h1>
            <Dialog>
                <DialogTrigger asChild>
                    <Button variant="outline" className="bg-white/20 text-white hover:bg-white/30 border-none">
                        <PlusCircle className="size-4 mr-2" /> Yeni Oluştur
                    </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>Yeni Oluştur</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <Button variant="outline" onClick={() => setCreateListType('shopping')}>Yeni Alışveriş Listesi</Button>
                        <Button variant="outline" onClick={() => setCreateListType('note')}>Yeni Not Defteri</Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
      <Tabs defaultValue="lists" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="lists">Alışveriş Listeleri</TabsTrigger>
              <TabsTrigger value="notes">Not Defterleri</TabsTrigger>
          </TabsList>
          <TabsContent value="lists" className="p-4 space-y-2 bg-muted/40 rounded-b-lg">
                {(shoppingLists || []).length > 0 ? (
                  (shoppingLists || []).map((list, index) => {
                  const color = brightColors[index % brightColors.length];
                  return (
                      <ListCard key={list.id} list={list} colorClass={cn("bg-gradient-to-br", color.gradient)} onClick={() => handleSelectList(list as ShoppingList, cn("bg-gradient-to-br", color.gradient))} />
                  )
                  })
              ) : (
                  <div className="text-center text-muted-foreground py-16 flex flex-col items-center justify-center border-2 border-dashed rounded-lg bg-background">
                      <ShoppingCart className="mx-auto h-12 w-12 text-muted-foreground/50" />
                      <p className="mt-4 text-md">Henüz alışveriş listeniz yok.</p>
                      <p className="text-sm text-muted-foreground">Başlamak için "Yeni Oluştur"a tıklayın.</p>
                  </div>
              )}
          </TabsContent>
            <TabsContent value="notes" className="p-4 space-y-2 bg-muted/40 rounded-b-lg">
              {(noteLists || []).length > 0 ? (
                  (noteLists || []).map((list, index) => {
                      const color = brightColors[(index + 3) % brightColors.length]; // Use different colors
                      return (
                          <ListCard key={list.id} list={list} colorClass={cn("bg-gradient-to-br", color.gradient)} onClick={() => handleSelectNoteList(list as ShoppingNoteList, cn("bg-gradient-to-br", color.gradient))} />
                      )
                  })
              ) : (
                  <div className="text-center text-muted-foreground py-16 flex flex-col items-center justify-center border-2 border-dashed rounded-lg bg-background">
                      <Notebook className="mx-auto h-12 w-12 text-muted-foreground/50" />
                      <p className="mt-4 text-md">Henüz not defteriniz yok.</p>
                      <p className="text-sm text-muted-foreground">Başlamak için "Yeni Oluştur"a tıklayın.</p>
                  </div>
              )}
          </TabsContent>
      </Tabs>
      <CreateListDialog isOpen={!!createListType} onOpenChange={() => setCreateListType(null)} onCreate={handleCreateList} listType={createListType || 'shopping'}/>
      <EditNoteDialog
        note={editingNote}
        listName={selectedNoteList?.name || ''}
        isOpen={!!editingNote}
        onOpenChange={(open) => { if (!open) setEditingNote(null); }}
        onSubmit={handleUpdateNoteSubmit}
      />
    </div>
  );
}
