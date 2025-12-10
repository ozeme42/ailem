"use client";

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import Image from 'next/image';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { MemorizationItem, FamilyMember, MemorizationProgress } from '@/lib/data';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter as AlertDialogFooterComponent, AlertDialogHeader, AlertDialogTitle as AlertDialogTitleComponent, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Plus, Search, Trash2, Library, FilePlus, Edit, Settings, UserPlus, RotateCcw, Check, Sparkles, BookOpen } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { onMemorizationItemsUpdate, onTagsUpdate, addMemorizationItem, deleteMemorizationItem, updateTags, onMemorizationProgressUpdate, updateMemorizationProgress, deleteTag, removeMemorizationProgress, resetAllMemorizationProgress, deleteAllMemorizationItems } from '@/lib/dataService';
import { useAuth } from '@/components/auth-provider';
import { Combobox } from "@/components/ui/combobox";
import { Checkbox } from "@/components/ui/checkbox";
import { Form, FormControl, FormField, FormItem, FormMessage, FormLabel } from '@/components/ui/form';
import { NewMemorizationItemForm } from '@/components/new-memorization-item-form';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

// --- DESIGN SYSTEM: Glassmorphism Colors ---
const glassColors = {
    CARD_BG: "bg-white/5 backdrop-blur-md border border-white/10 shadow-lg",
    CARD_HOVER: "hover:bg-white/10 hover:border-white/20 hover:shadow-xl hover:-translate-y-1 transition-all duration-300",
    TEXT_MAIN: "text-slate-100",
    TEXT_MUTED: "text-slate-400",
    HEADER_BG: "bg-slate-950/70 backdrop-blur-lg border-b border-white/5",
    ICON_BOX: "bg-gradient-to-br p-2.5 rounded-xl shadow-lg",
    INPUT_BG: "bg-slate-900/50 border-white/10 text-slate-100 focus:border-indigo-500/50 focus:ring-indigo-500/20",
    BUTTON_GLASS: "bg-white/10 hover:bg-white/20 text-white border border-white/10",
};

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
    
    const [view, setView] = useState<'items' | 'management'>('items');
    const [localSearchQuery, setLocalSearchQuery] = useState("");

    const { toast } = useToast();
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
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans pb-32 md:pb-10 selection:bg-indigo-500/30 relative overflow-hidden flex flex-col">
        
        {/* AMBIENT BACKGROUND */}
        <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
            <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-emerald-900/20 rounded-full blur-[120px]" />
            <div className="absolute bottom-[10%] left-[-5%] w-[400px] h-[400px] bg-indigo-900/20 rounded-full blur-[120px]" />
        </div>

        {/* HEADER */}
        <div className={cn("sticky top-0 z-40 w-full transition-all duration-300", glassColors.HEADER_BG)}>
            <div className="max-w-7xl mx-auto px-4 md:px-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between py-4 gap-4">
                    <div className="flex items-center gap-3">
                        <div className={cn(glassColors.ICON_BOX, "from-emerald-500 to-teal-500")}>
                            <Sparkles className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h1 className={cn("text-xl font-black tracking-tight leading-none", glassColors.TEXT_MAIN)}>
                                Ezber Takibi
                            </h1>
                            <p className={cn("text-xs font-medium mt-0.5", glassColors.TEXT_MUTED)}>Sureler, dualar ve ilerleme durumu</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 w-full md:w-auto">
                        <div className="relative flex-1 md:w-64">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <Input
                                placeholder="Ara..."
                                className={cn("pl-9 h-10 rounded-xl", glassColors.INPUT_BG)}
                                value={localSearchQuery}
                                onChange={(e) => setLocalSearchQuery(e.target.value)}
                            />
                        </div>
                        
                        <div className="flex items-center gap-2">
                            <Button 
                                size="icon"
                                className={cn("rounded-xl h-10 w-10 shrink-0", glassColors.BUTTON_GLASS, view === 'management' && "bg-indigo-500/20 border-indigo-500/50 text-indigo-300")}
                                onClick={() => setView(view === 'items' ? 'management' : 'items')}
                            >
                                <Settings className="h-5 w-5" />
                            </Button>
                            
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button className="rounded-xl px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold shadow-lg shadow-indigo-500/20 border border-indigo-400/20">
                                        <Plus className="mr-2 h-4 w-4" /> Ekle
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="bg-slate-900 border-white/10 text-slate-100 min-w-[200px]">
                                    <DropdownMenuItem onClick={() => handleOpenForm(null)} className="cursor-pointer hover:bg-white/10">
                                        <BookOpen className="mr-2 h-4 w-4 text-emerald-400" /> Yeni Ezber Ekle
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => setIsBulkDialogOpen(true)} className="cursor-pointer hover:bg-white/10">
                                        <FilePlus className="mr-2 h-4 w-4 text-blue-400" /> Toplu Ekle (Metin)
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    </div>
                </div>
            </div>
        </div>
      
      <div className="flex-1 max-w-7xl mx-auto w-full p-4 md:p-6 relative z-10 overflow-y-auto">
          {view === 'items' ? (
              <>
                {/* Family Member Selector */}
                <div className="flex items-center gap-3 overflow-x-auto pb-4 scrollbar-hide mb-2">
                    {familyMembers.map((member) => {
                        const isSelected = selectedMember?.id === member.id;
                        return (
                            <button
                                key={member.id}
                                onClick={() => setSelectedMember(member)}
                                className={cn(
                                    "relative flex items-center gap-2 px-1 pr-4 py-1 rounded-full transition-all duration-300 border select-none",
                                    isSelected 
                                        ? "bg-white/10 border-white/20 shadow-lg shadow-indigo-500/10" 
                                        : "bg-transparent border-transparent hover:bg-white/5 hover:border-white/5 opacity-60 hover:opacity-100"
                                )}
                            >
                                <div 
                                    className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-md ring-2 ring-white/10" 
                                    style={{ backgroundColor: member.color }}
                                >
                                    {member.name.charAt(0).toUpperCase()}
                                </div>
                                <span className={cn("text-sm font-bold", isSelected ? "text-white" : "text-slate-400")}>
                                    {member.name}
                                </span>
                                {isSelected && (
                                    <div className="absolute inset-x-0 -bottom-2 mx-auto w-1 h-1 rounded-full bg-indigo-400 shadow-[0_0_10px_currentColor]" />
                                )}
                            </button>
                        );
                    })}
                </div>
              </>
          ) : (
             <div className={cn("rounded-2xl p-6 mb-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border border-dashed border-indigo-500/30 bg-indigo-500/5")}>
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-indigo-500/10 rounded-xl text-indigo-400">
                        <Library className="h-6 w-6" />
                    </div>
                    <div>
                        <h3 className="font-bold text-lg text-indigo-100">Kütüphane Yönetimi</h3>
                        <p className="text-sm text-indigo-200/60">Tüm sure ve duaları buradan yönetebilir, sıfırlayabilir veya silebilirsin.</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="sm" className="text-amber-400 hover:text-amber-300 hover:bg-amber-400/10">
                              <RotateCcw className="mr-2 h-4 w-4"/> İlerlemeyi Sıfırla
                          </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="bg-slate-900 border-white/10 text-slate-100">
                          <AlertDialogHeader>
                              <AlertDialogTitleComponent>Emin misiniz?</AlertDialogTitleComponent>
                              <AlertDialogDescription className="text-slate-400">
                                  Bu işlem, tüm aile üyelerinin ezber ilerlemesini kalıcı olarak silecektir.
                              </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooterComponent>
                              <AlertDialogCancel className="bg-white/5 hover:bg-white/10 border-white/10 text-slate-200">İptal</AlertDialogCancel>
                              <AlertDialogAction onClick={handleResetProgress} className="bg-amber-600 hover:bg-amber-700 text-white">Sıfırla</AlertDialogAction>
                          </AlertDialogFooterComponent>
                      </AlertDialogContent>
                    </AlertDialog>

                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="sm" className="text-rose-400 hover:text-rose-300 hover:bg-rose-400/10">
                              <Trash2 className="mr-2 h-4 w-4"/> Tümünü Sil
                          </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="bg-slate-900 border-white/10 text-slate-100">
                          <AlertDialogHeader>
                              <AlertDialogTitleComponent>Dikkat!</AlertDialogTitleComponent>
                              <AlertDialogDescription className="text-slate-400">
                                  Tüm sure ve dua listesi kalıcı olarak silinecektir. Bu işlem geri alınamaz.
                              </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooterComponent>
                              <AlertDialogCancel className="bg-white/5 hover:bg-white/10 border-white/10 text-slate-200">İptal</AlertDialogCancel>
                              <AlertDialogAction onClick={handleDeleteAllItems} className="bg-rose-600 hover:bg-rose-700 text-white">Hepsini Sil</AlertDialogAction>
                          </AlertDialogFooterComponent>
                      </AlertDialogContent>
                    </AlertDialog>
                </div>
             </div>
          )}

          <div className="mt-2">
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
          <DialogContent className="sm:max-w-lg bg-slate-900 border-white/10 text-slate-100 rounded-3xl">
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
            <DialogContent className="bg-slate-900 border-white/10 text-slate-100">
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
                                        <Input {...field} placeholder="örn: Namaz Duaları" className={glassColors.INPUT_BG}/>
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </form>
                </FormProvider>
                 <DialogFooter>
                    <Button variant="ghost" onClick={() => setEditingShelf(null)} className="text-slate-400 hover:text-white hover:bg-white/10">İptal</Button>
                    <Button type="submit" form="shelf-form" className="bg-indigo-600 hover:bg-indigo-500">Kaydet</Button>
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

    const extractNumber = (title: string): [number | null, string] => {
        const match = title.match(/^(\d+)\s*[\.-]?\s*(.*)/);
        if (match) {
            return [parseInt(match[1], 10), match[2]];
        }
        return [null, title];
    };
    
    for (const key in grouped) {
        grouped[key].sort((a,b) => {
            const [numA, titleA] = extractNumber(a.title);
            const [numB, titleB] = extractNumber(b.title);

            if (numA !== null && numB !== null) {
                if (numA !== numB) return numA - numB;
            }
            if (numA !== null) return -1;
            if (numB !== null) return 1;

            return titleA.localeCompare(titleB, 'tr');
        });
    }

    return Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b, 'tr'));
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
      <div className="flex flex-col items-center justify-center py-20 text-center space-y-4 bg-white/5 rounded-3xl border border-dashed border-white/10">
        <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center">
            <Library className="h-8 w-8 text-slate-500" />
        </div>
        <div>
          <p className="text-lg font-bold text-slate-300">Liste Boş</p>
          <p className="text-sm text-slate-500">Görüntülenecek ezber öğesi bulunamadı.</p>
        </div>
      </div>
     );
  }

  // Management Mode (Accordions)
  if (viewMode === 'management') {
    return (
        <Accordion type="multiple" className="w-full space-y-4" defaultValue={shelves.map(s => s[0])}>
            {shelves.map(([shelfName, shelfItems]) => (
                <AccordionItem key={shelfName} value={shelfName} className="border-none">
                    <div className={cn("rounded-2xl overflow-hidden", glassColors.CARD_BG)}>
                        <AccordionTrigger className="px-6 py-4 hover:no-underline hover:bg-white/5 transition-colors">
                            <div className="flex items-center gap-3">
                                <Badge variant="outline" className="bg-indigo-500/10 text-indigo-300 border-indigo-500/30 px-2 py-0.5">{shelfItems.length}</Badge>
                                <span className="text-lg font-bold text-slate-200">{shelfName}</span>
                            </div>
                        </AccordionTrigger>
                        <AccordionContent className="px-6 pb-6 pt-2">
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
                        </AccordionContent>
                    </div>
                </AccordionItem>
            ))}
        </Accordion>
    );
  }

  // Items Mode (Direct Grid)
  return (
    <div className="space-y-8">
      {shelves.map(([shelfName, shelfItems]) => (
        <div key={shelfName} className="space-y-3">
          <div className="flex items-center gap-3 px-1">
             <div className="h-4 w-1 bg-gradient-to-b from-indigo-500 to-emerald-500 rounded-full"></div>
             <h2 className="text-lg font-bold text-slate-200">{shelfName}</h2>
             <div className="h-px flex-1 bg-white/5"></div>
          </div>
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
        onImport(titles, category);
        setIsImporting(false);
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
            <DialogContent className="sm:max-w-xl bg-slate-900 border-white/10 text-slate-100 rounded-3xl">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-xl font-bold">
                        <FilePlus className="w-5 h-5 text-blue-400" />
                        Toplu Öğe Ekle
                    </DialogTitle>
                    <DialogDescription className="text-slate-400">
                       Her satıra bir başlık gelecek şekilde yapıştırın.
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 mt-2">
                     <Combobox
                        options={tagOptions}
                        value={category}
                        onChange={setCategory}
                        onCreate={setCategory}
                        placeholder="Kategori seç veya oluştur..."
                        notfoundText="Kategori bulunamadı."
                        createText="Yeni kategori oluştur:"
                        className={glassColors.INPUT_BG}
                    />
                    <Textarea 
                      id="text-input" 
                      value={textInput} 
                      onChange={(e) => setTextInput(e.target.value)} 
                      className={cn("h-48 font-mono text-sm", glassColors.INPUT_BG)} 
                      placeholder="Fatiha Suresi&#10;Sübhaneke Duası&#10;..."
                      disabled={isImporting} 
                    />
                </div>
                <DialogFooter>
                    <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={isImporting} className="text-slate-400 hover:text-white hover:bg-white/10">İptal</Button>
                    <Button onClick={handleImportClick} disabled={isImporting} className="bg-blue-600 hover:bg-blue-500 text-white rounded-xl">
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
             <Card className={cn(
                 "flex flex-col group relative overflow-hidden border-0 rounded-2xl", 
                 glassColors.CARD_BG,
                 glassColors.CARD_HOVER,
                 isCompleted && "border-emerald-500/30 shadow-emerald-900/10"
             )}>
                 {item.imageUrl && (
                    <CardHeader className="p-0 relative h-32 overflow-hidden">
                        <DialogTrigger asChild>
                            <div className="cursor-pointer w-full h-full relative">
                                <Image
                                    src={item.imageUrl}
                                    alt={item.title}
                                    layout="fill"
                                    objectFit="cover"
                                    className="transition-transform duration-500 group-hover:scale-110"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-slate-900 to-transparent opacity-80" />
                            </div>
                        </DialogTrigger>
                        {isCompleted && (
                            <div className="absolute top-2 right-2 bg-emerald-500 text-white p-1 rounded-full shadow-lg shadow-emerald-500/40">
                                <Check className="w-4 h-4" />
                            </div>
                        )}
                    </CardHeader>
                 )}
                
                <DialogTrigger asChild>
                    <CardContent className={cn("p-4 flex-grow cursor-pointer relative", !item.imageUrl && "pt-6")}>
                        {!item.imageUrl && isCompleted && (
                             <div className="absolute top-4 right-4 bg-emerald-500/10 text-emerald-400 p-1 rounded-full">
                                <Check className="w-4 h-4" />
                            </div>
                        )}
                        <CardTitle className={cn(
                            "text-lg font-bold transition-colors leading-tight",
                            isCompleted ? "text-emerald-400" : "text-slate-200 group-hover:text-indigo-400"
                        )}>
                            {item.title}
                        </CardTitle>
                        <p className="text-xs text-slate-500 mt-1 line-clamp-1">{item.tags?.join(", ")}</p>
                    </CardContent>
                </DialogTrigger>

                <CardFooter className="p-3 pt-0 mt-auto flex items-center justify-between gap-2">
                    { viewMode === 'items' ? (
                         <div className="flex items-center justify-between w-full bg-white/5 rounded-xl p-1 pr-2">
                            <div 
                                className="flex items-center space-x-3 cursor-pointer py-1.5 px-3 rounded-lg hover:bg-white/5 transition-colors flex-1" 
                                onClick={() => onProgressChange(!isCompleted)}
                            >
                                <Checkbox 
                                    id={`check-${item.id}`} 
                                    checked={isCompleted} 
                                    className="data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500 border-white/20 w-5 h-5" 
                                />
                                <label
                                    htmlFor={`check-${item.id}`}
                                    className={cn("text-sm font-medium leading-none cursor-pointer", isCompleted ? "text-emerald-300" : "text-slate-300")}
                                >
                                    {isCompleted ? "Tamamlandı" : "Ezberle"}
                                </label>
                            </div>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors" onClick={() => onRemoveFromMember(item.id, selectedMemberId)}>
                                <Trash2 className="h-4 w-4"/>
                            </Button>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2 w-full">
                            <Button 
                                variant="outline" 
                                size="sm" 
                                className={cn(
                                    "w-full text-xs h-9 rounded-xl border-white/10 hover:bg-white/10",
                                    isAddedToCurrentMember ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20" : "bg-transparent text-slate-300"
                                )}
                                onClick={() => onAddToMember(item.id, selectedMemberId)}
                                disabled={isAddedToCurrentMember}
                            >
                                {isAddedToCurrentMember ? <Check className="mr-1.5 h-3.5 w-3.5"/> : <UserPlus className="mr-1.5 h-3.5 w-3.5"/>}
                                {isAddedToCurrentMember ? 'Listede' : 'Ekle'}
                            </Button>
                            
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white">
                                        <Edit className="h-4 w-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="bg-slate-900 border-white/10 text-slate-100">
                                    <DropdownMenuItem onClick={onEdit} className="cursor-pointer hover:bg-white/10">
                                        <Edit className="mr-2 h-4 w-4"/> Düzenle
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={onDelete} className="cursor-pointer text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 focus:text-rose-300 focus:bg-rose-500/10">
                                        <Trash2 className="mr-2 h-4 w-4"/> Sil
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    )}
                </CardFooter>
            </Card>

             <DialogContent className="max-w-4xl bg-slate-950/95 border-white/10 text-slate-100 p-0 overflow-hidden rounded-3xl">
                <DialogHeader className="p-6 bg-white/5 backdrop-blur-xl border-b border-white/5 absolute top-0 w-full z-10">
                    <DialogTitle className="text-2xl">{item.title}</DialogTitle>
                </DialogHeader>
                <div className="pt-20 pb-6 px-6 h-[80vh] overflow-y-auto">
                    {item.imageUrl ? (
                         <div className="relative w-full rounded-2xl overflow-hidden shadow-2xl">
                            <Image
                                src={item.imageUrl}
                                alt={item.title}
                                width={800}
                                height={1200}
                                objectFit="contain"
                                className="w-full h-auto"
                            />
                        </div>
                    ): (
                        <div className="flex flex-col items-center justify-center h-full text-center space-y-4 opacity-50">
                            <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center">
                                <BookOpen className="h-10 w-10 text-slate-400" />
                            </div>
                            <p className="text-lg font-medium text-slate-400">Bu öğe için henüz bir görsel eklenmemiş.</p>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}