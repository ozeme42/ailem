
"use client";

import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useForm, FormProvider, useFormContext } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { MemorizationItem, FamilyMember, MemorizationProgress } from '@/lib/data';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter as AlertDialogFooterComponent, AlertDialogHeader, AlertDialogTitle as AlertDialogTitleComponent, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from '@/hooks/use-toast';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { migrateImage } from '@/ai/flows/migrate-image-flow';
import { Loader2, PlusCircle, Search, Trash2, Library, FilePlus, AlertTriangle, Edit, X, UploadCloud, ChevronRight, BookPlus, ChevronDown, Settings, UserPlus, CheckCircle, RotateCcw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { onMemorizationItemsUpdate, onTagsUpdate, addMemorizationItem, updateMemorizationItem, deleteMemorizationItem, updateTags, onMemorizationProgressUpdate, updateMemorizationProgress, deleteTag, removeMemorizationProgress, resetAllMemorizationProgress, deleteAllMemorizationItems } from '@/lib/dataService';
import { useAuth } from '@/components/auth-provider';
import { Combobox } from "@/components/ui/combobox";
import { Checkbox } from "@/components/ui/checkbox";
import { Form, FormControl, FormField, FormItem, FormMessage, FormLabel } from '@/components/ui/form';
import { NewMemorizationItemForm } from '@/components/new-memorization-item-form';


// SCHEMAS & TYPES
const itemFormSchema = z.object({
  title: z.string().min(2, "Başlık en az 2 karakter olmalıdır."),
  tags: z.array(z.string()).optional(),
  imageUrl: z.string().optional(),
});
type ItemFormData = z.infer<typeof itemFormSchema>;


const shelfFormSchema = z.object({
    name: z.string().min(1, "Kategori adı boş olamaz."),
});
type ShelfFormData = z.infer<typeof shelfFormSchema>;


export default function MemorizationPage() {
    const { user, familyId, familyMembers } = useAuth();
    const [items, setItems] = useState<MemorizationItem[]>([]);
    const [allTags, setAllTags] = useState<string[]>([]);
    const [progress, setProgress] = React.useState<MemorizationProgress[]>([]);
    
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [isBulkDialogOpen, setIsBulkDialogOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<MemorizationItem | null>(null);
    const [editingShelf, setEditingShelf] = useState<{ originalName: string; isNew: boolean } | null>(null);
    
    const [selectedMember, setSelectedMember] = React.useState<FamilyMember | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    const [view, setView] = useState<'items' | 'management'>('items');
    const [localSearchQuery, setLocalSearchQuery] = useState("");

    const { toast } = useToast();
    const formMethods = useForm<ItemFormData>({ resolver: zodResolver(itemFormSchema) });
    const shelfFormMethods = useForm<ShelfFormData>({ resolver: zodResolver(shelfFormSchema) });
  
    React.useEffect(() => {
        if (familyMembers.length > 0 && !selectedMember) {
            setSelectedMember(familyMembers[0]);
        }
    }, [familyMembers, selectedMember]);
  
  useEffect(() => {
    const unsubItems = onMemorizationItemsUpdate(setItems);
    const unsubTags = onTagsUpdate("memorizationTags", setAllTags);
    const unsubProgress = onMemorizationProgressUpdate(setProgress);

    return () => {
        unsubItems();
        unsubTags();
        unsubProgress();
    };
  }, [user]);

  const handleOpenForm = useCallback((initialData: MemorizationItem | null = null) => {
    setEditingItem(initialData);
    setIsFormOpen(true);
  }, []);

  const handleDeleteItem = async (itemId: string) => {
    try {
        await deleteMemorizationItem(itemId);
        toast({ title: "Öğe Silindi", variant: 'destructive' });
    } catch(e) {
        toast({ title: "❌ Hata", description: "Öğe silinirken bir hata oluştu.", variant: 'destructive'});
    }
  };
  
  const handleBulkImport = async (titles: string[], category: string) => {
    toast({ title: "İçe Aktarma Başlatıldı" });
    setIsBulkDialogOpen(false);

    try {
      if (category && !allTags.includes(category)) {
          await updateTags("memorizationTags", [...allTags, category]);
      }
      
      for (const title of titles) {
        const newItemData: Omit<MemorizationItem, 'id' | 'familyId' | 'verses' > = {
            title: title,
            tags: category ? [category] : [],
            imageUrl: '',
        };
        await addMemorizationItem(newItemData);
      }

      toast({ title: "✅ İçe Aktarma Tamamlandı", description: `${titles.length} öğe başarıyla eklendi.` });

    } catch (e) {
      toast({ title: "❌ Toplu Ekleme Hatası", description: "Toplu ekleme sırasında bir hata oluştu.", variant: 'destructive' });
    }
  };
  
  const handleOpenShelfDialog = (shelfName: string | null) => {
      const isNew = shelfName === null;
      shelfFormMethods.reset({ name: isNew ? '' : shelfName });
      setEditingShelf({ originalName: shelfName || '', isNew });
  }

  const handleShelfFormSubmit = async (data: ShelfFormData) => {
      if (!editingShelf) return;
      const newShelfName = data.name.trim();

      if (allTags.includes(newShelfName) && newShelfName !== editingShelf.originalName) {
          toast({ title: "Hata", description: "Bu kategori adı zaten mevcut.", variant: "destructive" });
          return;
      }
      
      try {
        if (editingShelf.isNew) {
            await updateTags("memorizationTags", [...allTags, newShelfName]);
            toast({ title: "Kategori Eklendi"});
        } else {
            // This needs a specific implementation if we want to update tags in all items
            toast({ title: "Not implemented yet"});
        }
      } catch (e) {
          toast({ title: "❌ Hata", description: "Kategori güncellenirken bir hata oluştu.", variant: 'destructive'});
      }
      setEditingShelf(null);
  };

  const handleDeleteShelf = async (shelfName: string) => {
    try {
        await deleteTag("memorizationTags", shelfName, "memorization");
        toast({ title: "Kategori Silindi", variant: 'destructive'});
    } catch(e) {
        toast({ title: "❌ Hata", description: "Kategori silinirken bir hata oluştu.", variant: 'destructive'});
    }
  };
  
  const handleResetProgress = async () => {
    try {
        await resetAllMemorizationProgress();
        toast({ title: "İlerleme Sıfırlandı", description: "Tüm ezber ilerlemeleri başarıyla silindi.", variant: "destructive" });
    } catch (e) {
        toast({ title: "❌ Hata", description: "İlerleme sıfırlanırken bir hata oluştu.", variant: 'destructive' });
    }
  }

  const handleDeleteAllItems = async () => {
    try {
        await deleteAllMemorizationItems();
        toast({ title: "Kütüphane Temizlendi", description: "Tüm sureler, dualar ve ilerleme kayıtları silindi.", variant: "destructive" });
    } catch (e) {
        toast({ title: "❌ Hata", description: "Kütüphane temizlenirken bir hata oluştu.", variant: 'destructive' });
    }
  }

  const { itemsToShow, allFilteredItems } = useMemo(() => {
    const memberProgressMap = new Map<string, MemorizationProgress>();
    progress.filter(p => p.memberId === selectedMember?.id).forEach(p => memberProgressMap.set(p.itemId, p));
    
    const memberItemIds = new Set(memberProgressMap.keys());
    
    // For the main view, show only items in the member's list.
    const memberItems = items.filter(item => memberItemIds.has(item.id));
    
    const filtered = (view === 'items' ? memberItems : items).filter(item => {
        if (!localSearchQuery) return true;
        const q = localSearchQuery.toLowerCase();
        return (
          item.title.toLowerCase().includes(q) ||
          (item.tags && item.tags.some(tag => tag.toLowerCase().includes(q)))
        );
      });
      
    return { itemsToShow: filtered, allFilteredItems: items.filter(item => {
        if (!localSearchQuery) return true;
        const q = localSearchQuery.toLowerCase();
        return (
          item.title.toLowerCase().includes(q) ||
          (item.tags && item.tags.some(tag => tag.toLowerCase().includes(q)))
        );
    }) };
  }, [items, localSearchQuery, progress, selectedMember, view]);

  return (
    <div className="flex flex-col h-full gap-6">
      <PageHeader title="Ezber Takibi">
          <Button variant="outline" className="bg-white/20 text-white hover:bg-white/30 border-none" onClick={() => setView(view === 'items' ? 'management' : 'items')}>
              <Settings className="mr-2 h-4 w-4"/>
              {view === 'items' ? 'Sureler ve Dualar' : 'Ezberleri Gör'}
          </Button>
          <Button variant="outline" className="bg-white/20 text-white hover:bg-white/30 border-none" onClick={() => handleOpenForm(null)}>
            <PlusCircle className="mr-2 h-4 w-4"/> Yeni Öğe Ekle
          </Button>
           <Button variant="outline" className="bg-white/20 text-white hover:bg-white/30 border-none" onClick={() => setIsBulkDialogOpen(true)}>
            <FilePlus className="mr-2 h-4 w-4"/> Toplu Ekle
          </Button>
      </PageHeader>
      
      <div className="flex flex-col flex-grow min-h-0">
          {view === 'items' ? (
              <div className="flex items-center gap-4 border-b pb-4 mb-4 overflow-x-auto">
                {familyMembers.map((member) => (
                <Button
                    key={member.id}
                    variant={selectedMember?.id === member.id ? "default" : "outline"}
                    className={`flex-shrink-0 h-auto p-2 flex items-center gap-2 rounded-full transition-all duration-200 ${selectedMember?.id === member.id ? 'scale-105 shadow-lg' : 'hover:bg-accent'}`}
                    onClick={() => setSelectedMember(member)}
                >
                    <div 
                        className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold" 
                        style={{ backgroundColor: member.color, color: '#fff' }}
                    >
                        {member.name.charAt(0).toUpperCase()}
                    </div>
                    <p className="font-bold text-sm">{member.name}</p>
                </Button>
                ))}
            </div>
          ) : (
             <Card className="mb-4">
                <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                     <div>
                        <CardTitle>Sure ve Dua Kütüphanesi</CardTitle>
                        <CardDescription>Burada tüm ezber öğelerini görebilir ve aile üyelerinin listelerine ekleyebilirsiniz.</CardDescription>
                     </div>
                      <div className="flex flex-col sm:flex-row gap-2 self-start sm:self-center">
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                              <Button variant="outline" size="sm">
                                  <RotateCcw className="mr-2 h-4 w-4"/>
                                  Tüm İlerlemeyi Sıfırla
                              </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                              <AlertDialogHeader>
                                  <AlertDialogTitleComponent>Emin misiniz?</AlertDialogTitleComponent>
                                  <AlertDialogDescription>
                                      Bu işlem, tüm aile üyelerinin ezber ilerlemesini kalıcı olarak silecektir. Bu işlem geri alınamaz.
                                  </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooterComponent>
                                  <AlertDialogCancel>İptal</AlertDialogCancel>
                                  <AlertDialogAction onClick={handleResetProgress}>Evet, Sıfırla</AlertDialogAction>
                              </AlertDialogFooterComponent>
                          </AlertDialogContent>
                        </AlertDialog>
                         <AlertDialog>
                          <AlertDialogTrigger asChild>
                              <Button variant="destructive" size="sm">
                                  <Trash2 className="mr-2 h-4 w-4"/>
                                  Tüm Sureleri ve Duaları Sil
                              </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                              <AlertDialogHeader>
                                  <AlertDialogTitleComponent>Emin misiniz?</AlertDialogTitleComponent>
                                  <AlertDialogDescription>
                                      Bu işlem, tüm sure ve dua listesini kalıcı olarak silecektir. Bu işlem geri alınamaz.
                                  </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooterComponent>
                                  <AlertDialogCancel>İptal</AlertDialogCancel>
                                  <AlertDialogAction onClick={handleDeleteAllItems}>Evet, Hepsini Sil</AlertDialogAction>
                              </AlertDialogFooterComponent>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                </CardHeader>
             </Card>
          )}

          <div className="relative w-full sm:flex-1 my-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Ezber ara (başlık, kategori...)"
              className="pl-10"
              value={localSearchQuery}
              onChange={(e) => setLocalSearchQuery(e.target.value)}
            />
          </div>

          <div className="flex-grow overflow-y-auto">
             <ItemShelf 
                items={view === 'items' ? itemsToShow : allFilteredItems}
                viewMode={view}
                onEdit={handleOpenForm} 
                onDelete={handleDeleteItem} 
                selectedMemberId={selectedMember?.id || ''}
                familyMembers={familyMembers}
                progress={progress}
              />
          </div>
      </div>

      {/* Add/Edit Item Dialog */}
       <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogContent className="sm:max-w-lg flex flex-col h-full max-h-[90vh]">
             <NewMemorizationItemForm 
                onFormSubmit={() => {
                    setIsFormOpen(false);
                    setEditingItem(null);
                }}
                initialData={editingItem}
             />
          </DialogContent>
      </Dialog>
      
      {/* Bulk Add Text Dialog */}
      <BulkAddTextDialog 
        open={isBulkDialogOpen} 
        onOpenChange={setIsBulkDialogOpen} 
        onImport={handleBulkImport}
        existingTags={allTags}
      />

      {/* Edit Shelf Dialog */}
        <Dialog open={!!editingShelf} onOpenChange={(open) => !open && setEditingShelf(null)}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{editingShelf?.isNew ? "Yeni Kategori Ekle" : "Kategoriyi Düzenle"}</DialogTitle>
                </DialogHeader>
                <FormProvider {...shelfFormMethods}>
                    <form onSubmit={shelfFormMethods.handleSubmit(handleShelfFormSubmit)} id="shelf-form" className="space-y-4">
                        <FormField
                            control={shelfFormMethods.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Kategori Adı</FormLabel>
                                    <FormControl>
                                        <Input {...field} placeholder="örn: Namaz Duaları"/>
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </form>
                </FormProvider>
                 <DialogFooter>
                    <Button variant="ghost" onClick={() => setEditingShelf(null)}>İptal</Button>
                    <Button type="submit" form="shelf-form">Kaydet</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    </div>
  );
}



// ItemShelf COMPONENT
function ItemShelf({ items, viewMode, onEdit, onDelete, familyMembers, progress, selectedMemberId }: { 
    items: MemorizationItem[], 
    viewMode: 'items' | 'management',
    onEdit: (item: MemorizationItem) => void, 
    onDelete: (id: string) => void, 
    selectedMemberId: string,
    familyMembers: FamilyMember[],
    progress: MemorizationProgress[] 
}) {
  const {toast} = useToast();
  const shelves = useMemo(() => {
    const grouped: Record<string, MemorizationItem[]> = {};
    items.forEach(item => {
      const itemTags = item.tags && item.tags.length > 0 ? item.tags : ["Diğer"];
      itemTags.forEach(tag => {
        if (!grouped[tag]) grouped[tag] = [];
        if(!grouped[tag].some(b => b.id === item.id)) {
            grouped[tag].push(item);
        }
      });
    });
    return Object.entries(grouped).sort(([a, b]) => a.localeCompare(b, 'tr'));
  }, [items]);
  
    const memberProgressMap = useMemo(() => {
        const map = new Map<string, boolean>();
        progress.forEach(p => map.set(`${p.itemId}_${p.memberId}`, p.completed));
        return map;
    }, [progress]);
    
    const handleProgressChange = async (itemId: string, isCompleted: boolean) => {
        try {
            await updateMemorizationProgress(itemId, selectedMemberId, isCompleted);
            const item = items.find(i => i.id === itemId);
            if(isCompleted) {
            toast({ title: "🎉 Tebrikler!", description: `"${item?.title}" ezberini tamamladın.` });
            }
        } catch (error) {
            toast({ title: "Hata", description: "İlerleme güncellenirken bir sorun oluştu.", variant: "destructive" });
        }
    };
  
    const handleAddToMember = async (itemId: string, memberId: string) => {
        try {
            const isAlreadyAdded = memberProgressMap.has(`${itemId}_${memberId}`);
            if (isAlreadyAdded) {
                toast({ title: 'Zaten Listede', description: 'Bu öğe zaten seçilen üyenin listesinde.', variant: 'default' });
                return;
            }
            await updateMemorizationProgress(itemId, memberId, false);
            const item = items.find(i => i.id === itemId);
            const member = familyMembers.find(m => m.id === memberId);
            toast({ title: "Listeye Eklendi", description: `"${item?.title}" öğesi ${member?.name} adlı üyenin listesine eklendi.` });
        } catch (error) {
            toast({ title: "Hata", description: "Listeye eklenirken bir sorun oluştu.", variant: "destructive" });
        }
    };
    
    const handleRemoveFromMember = async (itemId: string, memberId: string) => {
       try {
          await removeMemorizationProgress(itemId, memberId);
          toast({ title: "Öğe Kaldırıldı", variant: 'destructive' });
      } catch (error) {
           toast({ title: "Hata", description: "Öğe kaldırılırken bir sorun oluştu.", variant: "destructive" });
      }
    }


  if (items.length === 0) {
     return (
      <div className="flex h-full items-center justify-center rounded-lg border-2 border-dashed bg-muted/20 p-8 text-center text-muted-foreground">
        <div>
          <Library className="mx-auto h-12 w-12 text-muted-foreground/50" />
          <p className="mt-4 text-md font-medium">Gösterilecek öğe yok.</p>
        </div>
      </div>
     );
  }

  return (
    <div className="space-y-8">
      {shelves.map(([shelfName, shelfItems]) => (
        <div key={shelfName}>
          <h2 className="text-xl font-bold mb-4">{shelfName}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {shelfItems.map(item => (
                    <MemorizationItemCard
                        key={item.id}
                        item={item}
                        viewMode={viewMode}
                        isCompleted={memberProgressMap.get(`${item.id}_${selectedMemberId}`) || false}
                        onProgressChange={(completed) => handleProgressChange(item.id, completed)}
                        onEdit={() => onEdit(item)}
                        onDelete={() => onDelete(item.id)}
                        onAddToMember={handleAddToMember}
                        onRemoveFromMember={handleRemoveFromMember}
                        familyMembers={familyMembers}
                        progressMap={memberProgressMap}
                        selectedMemberId={selectedMemberId}
                    />
                ))}
          </div>
        </div>
      ))}
    </div>
  );
}


// BULK ADD TEXT DIALOG
function BulkAddTextDialog({ open, onOpenChange, onImport, existingTags }: { open: boolean, onOpenChange: (open: boolean) => void, onImport: (titles: string[], category: string) => void, existingTags: string[] }) {
    const [textInput, setTextInput] = useState('');
    const [category, setCategory] = useState('');
    const [isImporting, setIsImporting] = useState(false);
    const { toast } = useToast();

    const handleImportClick = () => {
        if (!category) {
            toast({ title: "Hata", description: "Lütfen bir kategori seçin veya oluşturun.", variant: "destructive" });
            return;
        }
        const titles = textInput.split('\n').map(t => t.trim()).filter(Boolean);
        if (titles.length === 0) {
            toast({ title: "Hata", description: "Lütfen en az bir öğe başlığı girin.", variant: "destructive" });
            return;
        }
        
        setIsImporting(true);
        onImport(titles, category).finally(() => setIsImporting(false));
        setTextInput('');
        setCategory('');
    };
    
    const tagOptions = useMemo(() => {
        return existingTags
            .filter(tag => !tag.includes('/'))
            .map(tag => ({ label: tag, value: tag }));
    }, [existingTags]);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-xl">
                <DialogHeader>
                    <DialogTitle>Toplu Öğe Ekle (Metin)</DialogTitle>
                    <DialogDescription>
                       Her satıra bir öğe başlığı gelecek şekilde yapıştırın. Tüm öğeler aşağıdaki seçili kategoriye eklenecektir.
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 mt-4">
                     <Combobox
                        options={tagOptions}
                        value={category}
                        onChange={setCategory}
                        onCreate={setCategory}
                        placeholder="Kategori seç veya oluştur..."
                        notfoundText="Kategori bulunamadı."
                        createText="Yeni kategori oluştur:"
                    />
                    <Textarea 
                      id="text-input" 
                      value={textInput} 
                      onChange={(e) => setTextInput(e.target.value)} 
                      className="h-48 font-mono text-sm" 
                      placeholder="Fatiha Suresi&#10;Sübhaneke Duası&#10;..."
                      disabled={isImporting} 
                    />
                </div>
                <DialogFooter>
                    <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={isImporting}>İptal</Button>
                    <Button onClick={handleImportClick} disabled={isImporting}>
                        {isImporting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        İçeri Aktar
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}


// MemorizationItemCard
interface MemorizationItemCardProps {
    item: MemorizationItem;
    viewMode: 'items' | 'management';
    isCompleted: boolean;
    familyMembers: FamilyMember[];
    progressMap: Map<string, boolean>;
    selectedMemberId: string;
    onProgressChange: (isCompleted: boolean) => void;
    onEdit: () => void;
    onDelete: () => void;
    onAddToMember: (itemId: string, memberId: string) => void;
    onRemoveFromMember: (itemId: string, memberId: string) => void;
}
function MemorizationItemCard({ item, viewMode, isCompleted, onProgressChange, onEdit, onDelete, onAddToMember, onRemoveFromMember, familyMembers, progressMap, selectedMemberId }: MemorizationItemCardProps) {
    const isAddedToCurrentMember = progressMap.has(`${item.id}_${selectedMemberId}`);
    
    return (
        <Dialog>
             <Card className="flex flex-col group transition-all hover:shadow-md hover:-translate-y-0.5">
                <DialogTrigger asChild>
                    <CardContent className="p-4 flex-grow cursor-pointer">
                        <CardTitle className="text-lg group-hover:text-primary transition-colors">{item.title}</CardTitle>
                    </CardContent>
                </DialogTrigger>
                <CardFooter className="p-2 border-t flex items-center justify-between gap-1">
                    { viewMode === 'items' ? (
                         <div className="flex items-center justify-between w-full">
                            <div className="flex items-center space-x-2 cursor-pointer py-1 px-2" onClick={() => onProgressChange(!isCompleted)}>
                                <Checkbox id={`check-${item.id}`} checked={isCompleted} className="size-5" />
                                <label
                                    htmlFor={`check-${item.id}`}
                                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                                >
                                    Ezberlendi
                                </label>
                            </div>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => onRemoveFromMember(item.id, selectedMemberId)}>
                                <Trash2 className="h-4 w-4"/>
                            </Button>
                        </div>
                    ) : (
                        <div className="flex items-center gap-1 w-full">
                            <Button 
                                variant="outline" 
                                size="sm" 
                                className="w-full text-xs" 
                                onClick={() => onAddToMember(item.id, selectedMemberId)}
                                disabled={isAddedToCurrentMember}
                            >
                                <UserPlus className="mr-1.5 h-3 w-3"/> 
                                {isAddedToCurrentMember ? 'Listemde' : 'Listeme Ekle'}
                            </Button>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                                        <UserPlus className="h-4 w-4"/>
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent>
                                    <DropdownMenuLabel>Başkasının Listesine Ekle</DropdownMenuLabel>
                                    {familyMembers.filter(m => m.id !== selectedMemberId).map(member => (
                                        <DropdownMenuItem 
                                            key={member.id} 
                                            onClick={() => onAddToMember(item.id, member.id)}
                                            disabled={progressMap.has(`${item.id}_${member.id}`)}
                                        >
                                            {member.name}
                                            {progressMap.has(`${item.id}_${member.id}`) && <span className="text-xs text-muted-foreground ml-auto">Ekli</span>}
                                        </DropdownMenuItem>
                                    ))}
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    )}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                                <Edit className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={onEdit}><Edit className="mr-2 h-4 w-4"/>Düzenle</DropdownMenuItem>
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                        <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive focus:text-destructive">
                                        <Trash2 className="mr-2 h-4 w-4"/>Sil
                                    </DropdownMenuItem>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitleComponent>Emin misiniz?</AlertDialogTitleComponent>
                                        <AlertDialogDescription>"{item.title}" öğesi kalıcı olarak silinecektir.</AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooterComponent>
                                        <AlertDialogCancel>İptal</AlertDialogCancel>
                                        <AlertDialogAction onClick={onDelete}>Evet, Sil</AlertDialogAction>
                                    </AlertDialogFooterComponent>
                                </AlertDialogContent>
                            </AlertDialog>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </CardFooter>
            </Card>
             <DialogContent className="max-w-4xl">
                <DialogHeader>
                    <DialogTitle>{item.title}</DialogTitle>
                </DialogHeader>
                {item.imageUrl ? (
                     <div className="relative w-full h-[80vh] my-4 rounded-lg overflow-hidden">
                        <Image
                            src={item.imageUrl}
                            alt={item.title}
                            layout="fill"
                            objectFit="contain"
                            className="bg-muted"
                            data-ai-hint="religious illustration"
                        />
                    </div>
                ): (
                    <div className="my-4 p-8 text-center bg-muted rounded-lg">
                        <p className="text-muted-foreground">Bu öğe için bir görsel bulunmuyor.</p>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}

