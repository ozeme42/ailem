
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
import { onShoppingNoteListsUpdate, addShoppingNoteList, deleteShoppingNoteList, addNoteItemToList, deleteNoteItemFromList, updateNoteItemInList } from '@/lib/dataService';
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

const ListCard = ({ list, colorClass, onClick }: { list: ShoppingNoteList; colorClass: string; onClick: () => void }) => {
    const Icon = listIcons[list.icon as keyof typeof listIcons] || Notebook;
    const totalItems = list.items?.length || 0;
    const description = `${totalItems} ihtiyaç`;

    return (
        <div onClick={onClick} className={cn("flex items-center gap-3 text-white px-3 py-2 cursor-pointer rounded-lg shadow-sm border-0", colorClass)}>
            <div className="bg-white/20 text-white flex items-center justify-center rounded-md shrink-0 size-10">
                <Icon className="h-5 w-5" />
            </div>
            <div className="flex flex-col justify-center min-w-0">
                <p className="text-base font-medium leading-tight truncate">{list.name}</p>
                <p className="text-white/80 text-xs font-normal truncate">
                    {description}
                </p>
            </div>
        </div>
    );
};


const EditNoteDialog = ({ note, listName, onSave }: {
  note: ShoppingNoteItem;
  listName: string;
  onSave: (newText: string) => void;
}) => {
  const [text, setText] = useState(note.text);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (text.trim()) {
        onSave(text);
    }
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>İhtiyacı Düzenle</DialogTitle>
        <DialogDescription>"{listName}" listesindeki ihtiyacı güncelleyin.</DialogDescription>
      </DialogHeader>
      <form onSubmit={handleSave} className="space-y-4 py-4">
        <Textarea 
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={4} 
          autoFocus
        />
        <DialogFooter>
            <DialogTrigger asChild><Button type="button" variant="ghost">İptal</Button></DialogTrigger>
            <Button type="submit">Kaydet</Button>
        </DialogFooter>
      </form>
    </>
  );
};


export default function NeedsPage() {
  const [noteLists, setNoteLists] = useState<ShoppingNoteList[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const { toast } = useToast();
  
  const [isCreateListOpen, setCreateListOpen] = useState(false);
  const [selectedNoteList, setSelectedNoteList] = useState<ShoppingNoteList | null>(null);
  const [selectedListColor, setSelectedListColor] = useState<string>('bg-gray-500');
  const [newNoteText, setNewNoteText] = useState('');
  const [editingNote, setEditingNote] = useState<ShoppingNoteItem | null>(null);
  
  useEffect(() => {
    const unsubNotes = onShoppingNoteListsUpdate((notes) => {
        setNoteLists(notes);
        setIsLoaded(true);
    });
    return () => {
        unsubNotes();
    }
  }, []);

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
  
  const handleCreateList = async (data: CreateListFormData) => {
    await addShoppingNoteList(data.name, data.icon);
    toast({ title: "İhtiyaç Listesi Oluşturuldu!" });
    setCreateListOpen(false);
  };
  
  const handleAddNote = async (e: React.FormEvent) => {
      e.preventDefault();
      if (newNoteText.trim() && selectedNoteList) {
          await addNoteItemToList(selectedNoteList.id, newNoteText.trim());
          setNewNoteText('');
      }
  };

  const handleUpdateNoteSubmit = async (newText: string) => {
    if (editingNote && selectedNoteList) {
      await updateNoteItemInList(selectedNoteList.id, editingNote.id, newText);
      toast({ title: "İhtiyaç Güncellendi" });
      setEditingNote(null);
    }
  };
  
  const handleSelectNoteList = (list: ShoppingNoteList, color: string) => {
      setSelectedNoteList(list);
      setSelectedListColor(color);
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

  if (selectedNoteList) {
     return (
        <div className="relative h-full flex flex-col">
            <header className={cn("p-4 rounded-t-xl", selectedListColor)}>
              <div className="flex items-center justify-between">
                  <h1 className="text-2xl font-bold text-white">{selectedNoteList.name}</h1>
                  <div className='flex items-center gap-2'>
                    <Button variant="ghost" className="text-white hover:text-white hover:bg-white/20" onClick={() => setSelectedNoteList(null)}>
                      <ArrowLeft className="h-5 w-5 mr-2" /> Geri
                    </Button>
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button variant="destructive" size="icon" className="bg-white/20 hover:bg-white/30 border-0"><Trash2 className="h-4 w-4" /></Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitleComponent>"{selectedNoteList.name}" listesini sil?</AlertDialogTitleComponent>
                                <AlertDialogDescription>Bu işlem geri alınamaz. Liste ve içindeki tüm ihtiyaçlar kalıcı olarak silinecektir.</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>İptal</AlertDialogCancel>
                                <AlertDialogAction onClick={() => { deleteShoppingNoteList(selectedNoteList.id); setSelectedNoteList(null); }}>Sil</AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
            </header>

            <main className="flex-grow p-4 bg-background rounded-b-xl border-x border-b overflow-y-auto pb-24">
                <div className="space-y-2">
                    {(selectedNoteList.items || []).map(note => (
                        <div key={note.id} className="p-3 bg-card border rounded-lg flex justify-between items-start gap-2 group">
                            <p className="text-sm flex-grow whitespace-pre-wrap">{note.text}</p>
                            <div className="flex-shrink-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Dialog onOpenChange={(open) => !open && setEditingNote(null)}>
                                    <DialogTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditingNote(note)}>
                                        <Edit className="h-4 w-4" />
                                    </Button>
                                    </DialogTrigger>
                                    {editingNote?.id === note.id && (
                                    <DialogContent>
                                        <EditNoteDialog 
                                            note={editingNote} 
                                            listName={selectedNoteList.name}
                                            onSave={handleUpdateNoteSubmit}
                                        />
                                    </DialogContent>
                                    )}
                                </Dialog>
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive/70 hover:text-destructive"><Trash2 className="h-4 w-4" /></Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader><AlertDialogTitleComponent>İhtiyacı Sil</AlertDialogTitleComponent><AlertDialogDescription>Bu ihtiyacı kalıcı olarak silmek istediğinizden emin misiniz?</AlertDialogDescription></AlertDialogHeader>
                                        <AlertDialogFooter><AlertDialogCancel>İptal</AlertDialogCancel><AlertDialogAction onClick={() => deleteNoteItemFromList(selectedNoteList.id, note.id)}>Sil</AlertDialogAction></AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            </div>
                        </div>
                    ))}
                    {(selectedNoteList.items || []).length === 0 && (
                        <p className="text-sm text-center text-muted-foreground pt-8">Bu listede henüz ihtiyaç yok.</p>
                    )}
                </div>
            </main>

            <footer className="absolute bottom-0 left-0 right-0 p-4 bg-background/80 backdrop-blur-sm border-t">
              <form onSubmit={handleAddNote} className="flex items-start gap-2">
                  <Input placeholder="Yeni ihtiyaç..." value={newNoteText} onChange={(e) => setNewNoteText(e.target.value)} className="flex-grow" />
                  <Button type="submit">Ekle</Button>
              </form>
            </footer>
        </div>
     );
  }

  return (
    <div className="space-y-6">
        <PageHeader title="İhtiyaç Listeleri">
            <Button variant="outline" className="bg-white/20 text-white hover:bg-white/30 border-none" onClick={() => setCreateListOpen(true)}>
                <PlusCircle className="size-4 mr-2" /> Yeni Liste Oluştur
            </Button>
        </PageHeader>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(noteLists || []).length > 0 ? (
                (noteLists || []).map((list, index) => {
                    const color = brightColors[(index) % brightColors.length];
                    return (
                        <ListCard key={list.id} list={list} colorClass={cn("bg-gradient-to-br", color.gradient)} onClick={() => handleSelectNoteList(list, cn("bg-gradient-to-br", color.gradient))} />
                    )
                })
            ) : (
                <div className="md:col-span-2 text-center text-muted-foreground py-16 flex flex-col items-center justify-center border-2 border-dashed rounded-lg bg-background">
                    <Notebook className="mx-auto h-12 w-12 text-muted-foreground/50" />
                    <p className="mt-4 text-md">Henüz ihtiyaç listeniz yok.</p>
                    <p className="text-sm text-muted-foreground">Başlamak için "Yeni Liste Oluştur"a tıklayın.</p>
                </div>
            )}
        </div>
      <CreateListDialog isOpen={isCreateListOpen} onOpenChange={setCreateListOpen} onCreate={handleCreateList} />
    </div>
  );
}
