
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
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
import { Loader2, PlusCircle, Search, Trash2, Library, FilePlus, AlertTriangle, Edit, X, UploadCloud, ChevronRight, BookPlus, ChevronDown, Settings, UserPlus, CheckCircle, Checkbox } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { onMemorizationItemsUpdate, onTagsUpdate, addMemorizationItem, updateMemorizationItem, deleteMemorizationItem, updateTags, onMemorizationProgressUpdate, updateMemorizationProgress, deleteTag } from '@/lib/dataService';
import { useAuth } from '@/components/auth-provider';
import { Combobox } from "@/components/ui/combobox";


// SCHEMAS & TYPES
const itemFormSchema = z.object({
  title: z.string().min(2, "Başlık en az 2 karakter olmalıdır."),
  tags: z.array(z.string()).optional(),
  content: z.string().optional(),
  imageUrl: z.string().optional(),
});
type ItemFormData = z.infer<typeof itemFormSchema>;


const bulkAddJsonSchema = z.array(z.object({
  title: z.string().min(2, "Başlık en az 2 karakter olmalıdır."),
  tags: z.array(z.string()).optional(),
  content: z.string().optional(),
  imageUrl: z.string().url("Geçerli bir URL olmalı").optional().or(z.literal('')),
})).min(1, "En az bir öğe eklemelisiniz.");

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
    const [isBulkJsonDialogOpen, setIsBulkJsonDialogOpen] = useState(false);
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
    formMethods.reset({
        title: initialData?.title || '',
        tags: initialData?.tags || [],
        content: initialData?.content || '',
        imageUrl: initialData?.imageUrl || '',
    });
    setIsFormOpen(true);
  }, [formMethods]);

  const handleAddOrUpdateItem = async (formData: ItemFormData) => {
    setIsSubmitting(true);
    try {
        let finalImageUrl = formData.imageUrl;

        if (formData.imageUrl && formData.imageUrl.startsWith('data:image')) {
             toast({ title: "Görsel Yükleniyor..."});
             const destinationPath = `memorization-images/${(formData.title || 'untitled').replace(/[^a-zA-Z0-9]/g, '-')}-${Date.now()}.jpg`;
             const migrationResult = await migrateImage({ imageDataUri: formData.imageUrl, destinationPath });

             if (migrationResult.success && migrationResult.newUrl) {
                finalImageUrl = migrationResult.newUrl;
             } else {
                 throw new Error(migrationResult.error || 'Bilinmeyen bir görsel yükleme hatası.');
             }
        }
        
        const itemData = { ...formData, imageUrl: finalImageUrl };

        const newTags = new Set([...allTags, ...(itemData.tags || [])]);
        await updateTags("memorizationTags", Array.from(newTags));
        
        if (editingItem) {
            await updateMemorizationItem(editingItem.id, itemData);
            toast({ title: "Öğe Güncellendi" });
        } else {
            await addMemorizationItem(itemData);
            toast({ title: "Öğe Eklendi" });
        }
        setIsFormOpen(false);
    } catch(e: any) {
        toast({ title: "❌ Hata", description: e.message || "İşlem sırasında bir hata oluştu.", variant: 'destructive'});
    } finally {
        setIsSubmitting(false);
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    try {
        await deleteMemorizationItem(itemId);
        toast({ title: "Öğe Silindi", variant: 'destructive' });
    } catch(e) {
        toast({ title: "❌ Hata", description: "Öğe silinirken bir hata oluştu.", variant: 'destructive'});
    }
  };
  
  const handleBulkImport = async (importedItems: Partial<MemorizationItem>[]) => {
    toast({ title: "İçe Aktarma Başlatıldı" });
    setIsBulkJsonDialogOpen(false);

    try {
      const allCurrentTags = new Set(allTags);
      
      for (const item of importedItems) {
        let finalImageUrl = item.imageUrl;

        if (item.imageUrl) {
          const destinationPath = `memorization-images/${(item.title || "untitled").replace(/[^a-zA-Z0-9]/g, '-')}-${Date.now()}.jpg`;
          const migrationResult = await migrateImage({ sourceUrl: item.imageUrl, destinationPath });

          if (migrationResult.success && migrationResult.newUrl) {
            finalImageUrl = migrationResult.newUrl;
          } else {
            toast({ title: "⚠️ Görsel Aktarılamadı", description: `"${item.title}" öğesinin görseli aktarılamadı. Hata: ${migrationResult.error}`, variant: 'destructive' });
          }
        }

        (item.tags || []).forEach(tag => allCurrentTags.add(tag));
        
        const newItemData: Omit<MemorizationItem, 'id' | 'familyId'> = {
            title: item.title || 'İsimsiz',
            tags: item.tags || [],
            content: item.content || '',
            imageUrl: finalImageUrl || 'https://placehold.co/400x300.png',
        };
        await addMemorizationItem(newItemData);
      }

      await updateTags("memorizationTags", Array.from(allCurrentTags));
      toast({ title: "✅ İçe Aktarma Tamamlandı", description: `${importedItems.length} öğe başarıyla eklendi.` });

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
  
  const filteredItems = useMemo(() => {
    return items.filter(item => {
        if (!localSearchQuery) return true;
        const q = localSearchQuery.toLowerCase();
        return (
          item.title.toLowerCase().includes(q) ||
          (item.tags && item.tags.some(tag => tag.toLowerCase().includes(q)))
        );
      });
  }, [items, localSearchQuery]);

  return (
    <div className="flex flex-col h-full gap-6">
      <PageHeader title="Ezber Takibi">
          <Button variant="outline" className="bg-white/20 text-white hover:bg-white/30 border-none" onClick={() => setView(view === 'items' ? 'management' : 'items')}>
              <Settings className="mr-2 h-4 w-4"/>
              {view === 'items' ? 'Yönetim' : 'Ezberleri Gör'}
          </Button>
          <Button variant="outline" className="bg-white/20 text-white hover:bg-white/30 border-none" onClick={() => handleOpenForm(null)}>
            <PlusCircle className="mr-2 h-4 w-4"/> Yeni Öğe Ekle
          </Button>
           <Button variant="outline" className="bg-white/20 text-white hover:bg-white/30 border-none" onClick={() => setIsBulkJsonDialogOpen(true)}>
            <FilePlus className="mr-2 h-4 w-4"/> Toplu Ekle
          </Button>
      </PageHeader>
      
      {view === 'items' ? (
        <div className="flex flex-col flex-grow min-h-0">
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
          <div className="relative w-full sm:flex-1 mb-4">
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
                items={filteredItems} 
                onEdit={handleOpenForm} 
                onDelete={handleDeleteItem} 
                memberId={selectedMember?.id || ''}
                progress={progress}
              />
          </div>
        </div>
      ) : (
        <ManagementDashboard 
            allTags={allTags}
            onOpenShelfDialog={handleOpenShelfDialog}
            onDeleteShelf={handleDeleteShelf}
        />
      )}

      {/* Add/Edit Item Dialog */}
       <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogContent className="sm:max-w-lg flex flex-col h-full max-h-[90vh]">
            <FormProvider {...formMethods}>
              <form
                id="item-form"
                onSubmit={formMethods.handleSubmit(handleAddOrUpdateItem)}
                className="flex-1 flex flex-col min-h-0 h-full"
              >
                <DialogHeader>
                    <DialogTitle>{editingItem ? 'Öğeyi Düzenle' : 'Yeni Öğe Ekle'}</DialogTitle>
                </DialogHeader>
                 <ScrollArea className="flex-1 min-h-0">
                   <div className="pr-6 py-4">
                     <ItemForm existingTags={allTags} />
                   </div>
                </ScrollArea>
                <DialogFooter className="pt-4 border-t flex-shrink-0">
                    <Button variant="ghost" type="button" onClick={() => setIsFormOpen(false)} disabled={isSubmitting}>İptal</Button>
                    <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {editingItem ? 'Kaydet' : 'Ekle'}
                    </Button>
                </DialogFooter>
              </form>
            </FormProvider>
          </DialogContent>
      </Dialog>
      
      {/* Bulk Add JSON Dialog */}
      <BulkAddJsonDialog open={isBulkJsonDialogOpen} onOpenChange={setIsBulkJsonDialogOpen} onImport={handleBulkImport} />

      {/* Edit Shelf Dialog */}
        <Dialog open={!!editingShelf} onOpenChange={(open) => !open && setEditingShelf(null)}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{editingShelf?.isNew ? "Yeni Kategori Ekle" : "Kategoriyi Düzenle"}</DialogTitle>
                </DialogHeader>
                <Form {...shelfFormMethods}>
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
                </Form>
                 <DialogFooter>
                    <Button variant="ghost" onClick={() => setEditingShelf(null)}>İptal</Button>
                    <Button type="submit" form="shelf-form">Kaydet</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    </div>
  );
}

// ITEM FORM COMPONENT
const ItemForm = ({ existingTags }: { existingTags: string[] }) => {
  const { control, getValues, setValue, watch } = useFormContext<ItemFormData>();
  const [newShelfMain, setNewShelfMain] = useState('');
  const [newShelfSub, setNewShelfSub] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const imageValue = watch('imageUrl');

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setValue('imageUrl', reader.result as string, { shouldValidate: true });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddShelf = () => {
    const main = newShelfMain.trim();
    const sub = newShelfSub.trim();
    if (!main) return;

    const newTag = sub ? `${main}/${sub}` : main;
    
    const currentTagsValue = getValues('tags') || [];
    if (!currentTagsValue.includes(newTag)) {
        setValue('tags', [...currentTagsValue, newTag], { shouldValidate: true });
    }
    setNewShelfMain('');
    setNewShelfSub('');
  };

  const removeTag = (tagToRemove: string) => {
    const currentTagsValue = getValues('tags') || [];
    setValue('tags', currentTagsValue.filter(tag => tag !== tagToRemove), { shouldValidate: true });
  };
  
  const handleToggleTag = (tag: string) => {
    const currentTagsValue = getValues('tags') || [];
    const newTags = currentTagsValue.includes(tag)
        ? currentTagsValue.filter((t) => t !== tag)
        : [...currentTagsValue, tag];
    setValue('tags', newTags, { shouldValidate: true });
  };
  
  const handleUseShelfAsTemplate = (shelfName: string) => {
    setNewShelfMain(shelfName);
    setNewShelfSub('');
  };

  const hierarchicalShelves = useMemo(() => {
    const shelves: Record<string, string[]> = {};
    const mainShelves: string[] = [];

    existingTags.forEach(tag => {
      const parts = tag.split('/');
      const main = parts[0];
      if (!shelves[main]) {
        shelves[main] = [];
        mainShelves.push(main);
      }
      if (parts.length > 1) {
        const sub = parts.slice(1).join('/');
        if (!shelves[main].includes(sub)) {
          shelves[main].push(sub);
        }
      }
    });

    mainShelves.sort((a,b) => a.localeCompare(b, 'tr'));
    Object.values(shelves).forEach(subs => subs.sort((a,b) => a.localeCompare(b, 'tr')));
    
    const sortedShelves: Record<string, string[]> = {};
    mainShelves.forEach(main => {
        sortedShelves[main] = shelves[main];
    });

    return sortedShelves;
  }, [existingTags]);

  const mainShelfOptions = useMemo(() => {
    return Object.keys(hierarchicalShelves).map(shelf => ({ label: shelf, value: shelf }));
  }, [hierarchicalShelves]);

  return (
    <div className="space-y-4">
        <FormField control={control} name="title" render={({ field }) => (
            <FormItem><FormLabel>Başlık</FormLabel><FormControl><Input placeholder="Örn: Fatiha Suresi" {...field} /></FormControl><FormMessage /></FormItem>
        )} />
         <FormField control={control} name="content" render={({ field }) => (
            <FormItem><FormLabel>İçerik (Opsiyonel)</FormLabel><FormControl><Textarea placeholder="Sure veya duanın metnini buraya yazabilirsiniz..." {...field} rows={6} /></FormControl><FormMessage /></FormItem>
        )} />
        
        <FormItem>
            <FormLabel>Görsel</FormLabel>
            <FormControl>
                <Input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleFileChange} />
            </FormControl>
            <Card 
                className="aspect-video w-full border-2 border-dashed flex flex-col items-center justify-center text-muted-foreground hover:border-primary hover:text-primary transition-colors cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
            >
                {imageValue ? (
                    <Image src={imageValue} alt="Önizleme" width={200} height={150} className="max-h-full w-auto object-contain rounded-md" data-ai-hint="religious illustration"/>
                ) : (
                    <>
                        <UploadCloud className="h-10 w-10"/>
                        <p className="mt-2 text-sm">Resim Yükle</p>
                    </>
                )}
            </Card>
            <FormMessage />
        </FormItem>


        <FormField
            control={control}
            name="tags"
            render={({ field }) => (
                <FormItem>
                    <FormLabel>Kategoriler</FormLabel>
                    <Card className="p-4 bg-muted/50">
                        <CardTitle className="text-base mb-2">Yeni Kategori Ekle</CardTitle>
                        <div className="space-y-2">
                             <Combobox
                                options={mainShelfOptions}
                                value={newShelfMain}
                                onChange={setNewShelfMain}
                                onCreate={(newValue) => { setNewShelfMain(newValue); }}
                                placeholder="Ana Kategori (örn: Namaz Duaları)"
                                notfoundText="Kategori bulunamadı."
                                createText="Yeni kategori oluştur:"
                            />
                            <Input
                                placeholder="Alt Kategori (opsiyonel, örn: Otururken)"
                                value={newShelfSub}
                                onChange={(e) => setNewShelfSub(e.target.value)}
                            />
                            <Button type="button" size="sm" onClick={handleAddShelf}>
                                <PlusCircle className="mr-2 h-4 w-4" />
                                Kategori Ekle
                            </Button>
                        </div>
                    </Card>

                    <div className="pt-2">
                        <FormLabel className="text-xs text-muted-foreground">Seçili Kategoriler</FormLabel>
                        <div className="flex flex-wrap gap-1.5 mt-1.5 min-h-[26px]">
                            {(field.value || []).map((tag) => (
                            <Badge key={tag} variant="secondary" className="gap-1.5 py-1 px-2.5">
                                {tag}
                                <button type="button" aria-label={`${tag} kategorisini kaldır`} onClick={() => removeTag(tag)}>
                                    <X className="h-3.5 w-3.5" />
                                </button>
                            </Badge>
                            ))}
                        </div>
                    </div>

                    {Object.keys(hierarchicalShelves).length > 0 && (
                        <div className="pt-4 space-y-2">
                            <FormLabel className="text-xs text-muted-foreground">Mevcut Kategoriler</FormLabel>
                            <ScrollArea className="h-48 rounded-md border p-2">
                                <div className="space-y-2">
                                    {Object.entries(hierarchicalShelves).map(([main, subs]) => (
                                        <div key={main}>
                                            <div className="flex items-center gap-1">
                                                <Badge
                                                    variant={(field.value || []).includes(main) ? 'default' : 'outline'}
                                                    onClick={() => handleToggleTag(main)}
                                                    className="cursor-pointer text-sm flex-grow justify-start text-left"
                                                >
                                                    {main}
                                                </Badge>
                                                <TooltipProvider>
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <Button
                                                                type="button"
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-6 w-6 shrink-0"
                                                                onClick={() => handleUseShelfAsTemplate(main)}
                                                            >
                                                                <PlusCircle className="mr-2 h-4 w-4" />
                                                            </Button>
                                                        </TooltipTrigger>
                                                        <TooltipContent>
                                                            <p>Bu kategoriye alt kategori ekle</p>
                                                        </TooltipContent>
                                                    </Tooltip>
                                                </TooltipProvider>
                                            </div>
                                            {(subs as string[]).length > 0 && (
                                                <div className="flex flex-wrap gap-1.5 mt-2 ml-4 pl-2 border-l">
                                                    {(subs as string[]).map(sub => (
                                                        <Badge
                                                            key={sub}
                                                            variant={(field.value || []).includes(`${main}/${sub}`) ? 'default' : 'outline'}
                                                            onClick={() => handleToggleTag(`${main}/${sub}`)}
                                                            className="cursor-pointer text-xs"
                                                        >
                                                            {sub}
                                                        </Badge>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </ScrollArea>
                        </div>
                    )}
                    <FormMessage />
                </FormItem>
            )}
        />
    </div>
  );
};


// ItemShelf COMPONENT
function ItemShelf({ items, onEdit, onDelete, memberId, progress }: { items: MemorizationItem[], onEdit: (item: MemorizationItem) => void, onDelete: (id: string) => void, memberId: string, progress: MemorizationProgress[] }) {
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
    return Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b, 'tr'));
  }, [items]);
  
  const handleProgressChange = async (itemId: string, isCompleted: boolean) => {
    try {
        await updateMemorizationProgress(itemId, memberId, isCompleted);
        const item = items.find(i => i.id === itemId);
        if(isCompleted) {
          toast({ title: "🎉 Tebrikler!", description: `"${item?.title}" ezberini tamamladın.` });
        }
    } catch (error) {
        toast({ title: "Hata", description: "İlerleme güncellenirken bir sorun oluştu.", variant: "destructive" });
    }
  };

  const memberProgressMap = useMemo(() => {
    const map = new Map<string, boolean>();
    progress.filter(p => p.memberId === memberId).forEach(p => map.set(p.itemId, p.completed));
    return map;
  }, [progress, memberId]);


  if (items.length === 0) {
     return (
      <div className="flex h-full items-center justify-center rounded-lg border-2 border-dashed bg-muted/20 p-8 text-center text-muted-foreground">
        <div>
          <Library className="mx-auto h-12 w-12 text-muted-foreground/50" />
          <p className="mt-4 text-md font-medium">Bu kategoride gösterilecek öğe yok.</p>
        </div>
      </div>
     );
  }

  return (
    <div className="space-y-8">
      {shelves.map(([shelfName, shelfItems]) => (
        <div key={shelfName}>
          <h2 className="text-xl font-bold mb-4">{shelfName}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {shelfItems.map(item => (
                    <MemorizationItemCard
                        key={item.id}
                        item={item}
                        isCompleted={memberProgressMap.get(item.id) || false}
                        onProgressChange={(completed) => handleProgressChange(item.id, completed)}
                        onEdit={() => onEdit(item)}
                        onDelete={() => onDelete(item.id)}
                    />
                ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// BULK ADD JSON DIALOG
function BulkAddJsonDialog({ open, onOpenChange, onImport }: { open: boolean, onOpenChange: (open: boolean) => void, onImport: (items: Partial<MemorizationItem>[]) => void }) {
    const [jsonInput, setJsonInput] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isImporting, setIsImporting] = useState(false);

    const handleImportClick = () => {
        setError(null);
        if (!jsonInput.trim()) return setError("Lütfen geçerli bir JSON verisi girin.");

        try {
            const parsed = JSON.parse(jsonInput);
            const result = bulkAddJsonSchema.safeParse(parsed);
            if (!result.success) {
                 const formattedErrors = result.error.errors.map(err => `[${err.path.join('.')}] ${err.message}`).join('\n');
                 setError(`JSON verisi doğrulanamadı:\n${formattedErrors}`);
                 return;
            }
            setIsImporting(true);
            onImport(result.data).finally(() => setIsImporting(false));
            setJsonInput('');
        } catch (e) {
            setError("Geçersiz JSON formatı. Lütfen veriyi kontrol edin.");
        }
    };
    
    const exampleJson = `[
  {
    "title": "Fatiha Suresi",
    "tags": ["Namaz Sureleri"],
    "content": "Elhamdulillâhi rabbil'alemin..."
  },
  {
    "title": "Sübhaneke Duası",
    "tags": ["Namaz Duaları", "Otururken Okunanlar"],
    "imageUrl": "https://example.com/image.jpg"
  }
]`;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Toplu Öğe Ekle (JSON)</DialogTitle>
                </DialogHeader>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                    <div>
                         <Label htmlFor="json-input" className="mb-2 block">JSON Verisi</Label>
                         <Textarea id="json-input" value={jsonInput} onChange={(e) => setJsonInput(e.target.value)} className="h-64 font-mono text-xs" disabled={isImporting} />
                         {error && <p className="text-sm font-medium text-destructive mt-2 whitespace-pre-wrap">{error}</p>}
                    </div>
                    <div>
                         <Label className="mb-2 block">Örnek Format</Label>
                         <Card className="bg-muted/50 p-4 h-64 overflow-auto">
                            <pre className="text-xs font-mono"><code>{exampleJson}</code></pre>
                         </Card>
                    </div>
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

// ManagementDashboard COMPONENT
function ManagementDashboard({ allTags, onOpenShelfDialog, onDeleteShelf }: { allTags: string[], onOpenShelfDialog: (name: string | null) => void, onDeleteShelf: (name: string) => void }) {
    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle>Kategorileri Yönet</CardTitle>
                    <CardDescription>Mevcut tüm ana kategorileri buradan düzenleyebilir veya silebilirsiniz.</CardDescription>
                </div>
                <Button onClick={() => onOpenShelfDialog(null)}>
                    <PlusCircle className="mr-2 h-4 w-4"/> Yeni Kategori Ekle
                </Button>
            </CardHeader>
            <CardContent>
                <div className="space-y-2 pr-4">
                    {allTags.filter(t => !t.includes('/')).map(tag => (
                        <div key={tag} className="flex items-center justify-between p-3 border rounded-lg">
                            <p className="font-medium">{tag}</p>
                            <div className="flex items-center gap-2">
                                <Button variant="ghost" size="icon" onClick={() => onOpenShelfDialog(tag)}>
                                    <Edit className="w-4 h-4"/>
                                </Button>
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                                            <Trash2 className="w-4 h-4"/>
                                        </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>Kategoriyi Sil</AlertDialogTitle>
                                            <AlertDialogDescription>
                                                "{tag}" kategorisini ve tüm alt kategorilerini silmek istediğinizden emin misiniz? Bu işlem, bu etiketleri tüm öğelerden kaldıracak ve kalıcı olarak silinecektir.
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>İptal</AlertDialogCancel>
                                            <AlertDialogAction onClick={() => onDeleteShelf(tag)}>Sil</AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            </div>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    )
}

// MemorizationItemCard
interface MemorizationItemCardProps {
    item: MemorizationItem;
    isCompleted: boolean;
    onProgressChange: (isCompleted: boolean) => void;
    onEdit: () => void;
    onDelete: () => void;
}
function MemorizationItemCard({ item, isCompleted, onProgressChange, onEdit, onDelete }: MemorizationItemCardProps) {
    return (
        <Card className="flex flex-col group transition-all hover:shadow-lg hover:-translate-y-1">
            <CardHeader className="p-0 relative">
                <Image 
                    src={item.imageUrl || 'https://placehold.co/400x300.png'} 
                    alt={item.title} 
                    width={400} 
                    height={300} 
                    className="aspect-video object-cover rounded-t-lg"
                    data-ai-hint="religious illustration"
                />
                 <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="secondary" size="icon" className="h-8 w-8">
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
                                        <AlertDialogTitle>Emin misiniz?</AlertDialogTitle>
                                        <AlertDialogDescription>"{item.title}" öğesi kalıcı olarak silinecektir.</AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>İptal</AlertDialogCancel>
                                        <AlertDialogAction onClick={onDelete}>Evet, Sil</AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </CardHeader>
            <CardContent className="p-4 flex-grow">
                <CardTitle className="text-lg">{item.title}</CardTitle>
            </CardContent>
            <CardFooter className="p-4 border-t">
                 <div className="flex items-center space-x-2 w-full cursor-pointer" onClick={() => onProgressChange(!isCompleted)}>
                    <Checkbox id={`check-${item.id}`} checked={isCompleted} className="size-5" />
                    <label
                        htmlFor={`check-${item.id}`}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                    >
                        Ezberlendi olarak işaretle
                    </label>
                </div>
            </CardFooter>
        </Card>
    );
}

