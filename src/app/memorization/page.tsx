"use client";

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import Image from 'next/image';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { MemorizationItem, FamilyMember, MemorizationProgress } from '@/lib/data';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter as AlertDialogFooterComponent, AlertDialogHeader, AlertDialogTitle as AlertDialogTitleComponent, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Plus, Search, Trash2, Library, FilePlus, Edit, Settings, UserPlus, RotateCcw, Check, Sparkles, BookOpen, ChevronRight, X, Heart } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { onMemorizationItemsUpdate, onTagsUpdate, addMemorizationItem, deleteMemorizationItem, updateTags, onMemorizationProgressUpdate, updateMemorizationProgress, deleteTag, removeMemorizationProgress, resetAllMemorizationProgress, deleteAllMemorizationItems } from '@/lib/dataService';
import { useAuth } from '@/components/auth-provider';
import { Combobox } from "@/components/ui/combobox";
import { Form, FormControl, FormField, FormItem, FormMessage, FormLabel } from '@/components/ui/form';
import { NewMemorizationItemForm } from '@/components/new-memorization-item-form';

// --- APP COLORS ---
const appColors = {
    bg: "bg-slate-50 dark:bg-slate-950",
    headerBg: "bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl border-b border-slate-200 dark:border-white/5",
    cardBg: "bg-white dark:bg-slate-900 border border-slate-100 dark:border-white/5 shadow-sm active:scale-[0.98] transition-transform",
    textMain: "text-slate-900 dark:text-slate-100",
    textMuted: "text-slate-500 dark:text-slate-400",
    primary: "bg-indigo-600 text-white shadow-indigo-500/20",
    success: "bg-emerald-500 text-white shadow-emerald-500/20",
};

// SCHEMAS & TYPES
const shelfFormSchema = z.object({ name: z.string().min(1, "Kategori adı boş olamaz.") });
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
    const [activeTab, setActiveTab] = useState<'personal' | 'library'>('personal');
    const [searchQuery, setSearchQuery] = useState("");

    const { toast } = useToast();
    const shelfFormMethods = useForm<ShelfFormData>({ resolver: zodResolver(shelfFormSchema) });
  
    useEffect(() => {
        if (familyMembers.length > 0 && !selectedMember) setSelectedMember(familyMembers[0]);
    }, [familyMembers, selectedMember]);
  
    useEffect(() => {
        const unsubItems = onMemorizationItemsUpdate(setItems);
        const unsubTags = onTagsUpdate("memorizationTags", setAllTags);
        const unsubProgress = onMemorizationProgressUpdate(setProgress);
        return () => { unsubItems(); unsubTags(); unsubProgress(); };
    }, [user]);

    const handleOpenForm = useCallback((initialData: MemorizationItem | null = null) => {
        setEditingItem(initialData);
        setIsFormOpen(true);
    }, []);

    const handleDeleteItem = async (itemId: string) => {
        try {
            await deleteMemorizationItem(itemId);
            toast({ title: "Öğe Silindi", variant: 'destructive' });
        } catch(e) { toast({ title: "Hata", variant: 'destructive'}); }
    };
  
    const handleBulkImport = async (titles: string[], category: string) => {
        toast({ title: "İçe Aktarma Başlatıldı" });
        setIsBulkDialogOpen(false);
        try {
            if (category && !allTags.includes(category)) await updateTags("memorizationTags", [...allTags, category]);
            for (const title of titles) {
                await addMemorizationItem({ title, tags: category ? [category] : [], imageUrl: '' });
            }
            toast({ title: "Tamamlandı", description: `${titles.length} öğe eklendi.` });
        } catch (e) { toast({ title: "Hata", variant: 'destructive' }); }
    };
  
    const handleShelfFormSubmit = async (data: ShelfFormData) => {
        if (!editingShelf) return;
        const newShelfName = data.name.trim();
        if (allTags.includes(newShelfName) && newShelfName !== editingShelf.originalName) {
            toast({ title: "Bu kategori zaten var", variant: "destructive" });
            return;
        }
        try {
            if (editingShelf.isNew) {
                await updateTags("memorizationTags", [...allTags, newShelfName]);
                toast({ title: "Kategori Eklendi"});
            }
        } catch (e) { toast({ title: "Hata", variant: 'destructive'}); }
        setEditingShelf(null);
    };

    const handleResetProgress = async () => {
        try { await resetAllMemorizationProgress(); toast({ title: "Sıfırlandı" }); } catch (e) { toast({ title: "Hata", variant: 'destructive' }); }
    }

    const handleDeleteAllItems = async () => {
        try { await deleteAllMemorizationItems(); toast({ title: "Temizlendi" }); } catch (e) { toast({ title: "Hata", variant: 'destructive' }); }
    }

    const { personalItems, libraryShelves } = useMemo(() => {
        const memberProgressMap = new Map<string, MemorizationProgress>();
        progress.filter(p => p.memberId === selectedMember?.id).forEach(p => memberProgressMap.set(p.itemId, p));
        const memberItemIds = new Set(memberProgressMap.keys());
        
        const q = searchQuery.toLowerCase();
        const filterItem = (item: MemorizationItem) => {
            if (!q) return true;
            return item.title.toLowerCase().includes(q) || (item.tags && item.tags.some(t => t.toLowerCase().includes(q)));
        };

        const personal = items.filter(item => memberItemIds.has(item.id) && filterItem(item));
        
        const libItems = items.filter(filterItem);
        const grouped: Record<string, MemorizationItem[]> = {};
        libItems.forEach(item => {
            const tags = item.tags?.length ? item.tags : ["Diğer"];
            tags.forEach(t => {
                if (!grouped[t]) grouped[t] = [];
                if(!grouped[t].some(b => b.id === item.id)) grouped[t].push(item);
            });
        });

        // Sort items numerically if they start with numbers, else alphabetically
        const extractNumber = (title: string): [number | null, string] => {
            const match = title.match(/^(\d+)\s*[\.-]?\s*(.*)/);
            return match ? [parseInt(match[1], 10), match[2]] : [null, title];
        };
        for (const key in grouped) {
            grouped[key].sort((a,b) => {
                const [numA, titleA] = extractNumber(a.title);
                const [numB, titleB] = extractNumber(b.title);
                if (numA !== null && numB !== null && numA !== numB) return numA - numB;
                if (numA !== null) return -1;
                if (numB !== null) return 1;
                return titleA.localeCompare(titleB, 'tr');
            });
        }
        
        const sortedShelves = Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b, 'tr'));

        return { personalItems: personal, libraryShelves: sortedShelves };
    }, [items, searchQuery, progress, selectedMember]);

    const memberProgressMap = useMemo(() => {
        const map = new Map<string, boolean>();
        progress.forEach(p => map.set(`${p.itemId}_${p.memberId}`, p.completed));
        return map;
    }, [progress]);

    const handleToggleCompletion = async (itemId: string, isCompleted: boolean) => {
        if (!selectedMember) return;
        try {
            await updateMemorizationProgress(itemId, selectedMember.id, isCompleted);
            if (isCompleted) toast({ title: "🎉 Tebrikler!" });
        } catch (error) { toast({ title: "Hata", variant: "destructive" }); }
    };

    const handleAssignToMember = async (itemId: string, memberId: string) => {
        try {
            await updateMemorizationProgress(itemId, memberId, false);
            toast({ title: "Listeye Eklendi" });
        } catch (error) { toast({ title: "Hata", variant: "destructive" }); }
    };

    const handleRemoveFromMember = async (itemId: string, memberId: string) => {
        try {
            await removeMemorizationProgress(itemId, memberId);
            toast({ title: "Listeden Çıkarıldı" });
        } catch (error) { toast({ title: "Hata", variant: "destructive" }); }
    };

    return (
        <div className={cn("min-h-screen pb-24 md:pb-10 font-sans flex flex-col", appColors.bg)}>
            
            {/* HEADER */}
            <div className={cn("sticky top-0 z-40 w-full", appColors.headerBg)}>
                <div className="max-w-3xl mx-auto px-4 py-3 md:py-4">
                    <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-2.5 rounded-2xl shadow-sm text-white">
                                <Sparkles className="w-5 h-5 md:w-6 md:h-6" />
                            </div>
                            <div>
                                <h1 className={cn("text-lg md:text-xl font-black tracking-tight leading-none", appColors.textMain)}>Ezber Takibi</h1>
                                <p className={cn("text-[10px] md:text-xs font-bold uppercase tracking-wider mt-1", appColors.textMuted)}>Sure ve Dualar</p>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2">
                             <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                                        <Plus className="h-5 w-5" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-56 rounded-2xl p-2 bg-white dark:bg-slate-900 shadow-xl border border-slate-100 dark:border-slate-800">
                                    <DropdownMenuItem onClick={() => handleOpenForm(null)} className="rounded-xl py-3 cursor-pointer">
                                        <BookOpen className="mr-3 h-4 w-4 text-indigo-500" /> Yeni Ezber Ekle
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => setIsBulkDialogOpen(true)} className="rounded-xl py-3 cursor-pointer">
                                        <FilePlus className="mr-3 h-4 w-4 text-blue-500" /> Toplu Ekle
                                    </DropdownMenuItem>
                                    <div className="h-px bg-slate-100 dark:bg-slate-800 my-1"></div>
                                    <AlertDialog>
                                      <AlertDialogTrigger asChild>
                                           <div className="flex items-center px-2 py-3 text-sm rounded-xl cursor-pointer text-amber-600 dark:text-amber-500 hover:bg-slate-100 dark:hover:bg-slate-800">
                                              <RotateCcw className="mr-3 h-4 w-4"/> İlerlemeyi Sıfırla
                                          </div>
                                      </AlertDialogTrigger>
                                      <AlertDialogContent className="rounded-3xl">
                                          <AlertDialogHeader>
                                              <AlertDialogTitleComponent>Emin misiniz?</AlertDialogTitleComponent>
                                              <AlertDialogDescription>Tüm ezber ilerlemesi sıfırlanacak.</AlertDialogDescription>
                                          </AlertDialogHeader>
                                          <AlertDialogFooterComponent>
                                              <AlertDialogCancel className="rounded-xl">İptal</AlertDialogCancel>
                                              <AlertDialogAction onClick={handleResetProgress} className="rounded-xl bg-amber-600 hover:bg-amber-700">Sıfırla</AlertDialogAction>
                                          </AlertDialogFooterComponent>
                                      </AlertDialogContent>
                                    </AlertDialog>
                                    <AlertDialog>
                                      <AlertDialogTrigger asChild>
                                          <div className="flex items-center px-2 py-3 text-sm rounded-xl cursor-pointer text-rose-600 dark:text-rose-500 hover:bg-slate-100 dark:hover:bg-slate-800">
                                              <Trash2 className="mr-3 h-4 w-4"/> Kütüphaneyi Temizle
                                          </div>
                                      </AlertDialogTrigger>
                                      <AlertDialogContent className="rounded-3xl">
                                          <AlertDialogHeader>
                                              <AlertDialogTitleComponent>Dikkat!</AlertDialogTitleComponent>
                                              <AlertDialogDescription>Tüm ezber öğeleri silinecek. Geri alınamaz.</AlertDialogDescription>
                                          </AlertDialogHeader>
                                          <AlertDialogFooterComponent>
                                              <AlertDialogCancel className="rounded-xl">İptal</AlertDialogCancel>
                                              <AlertDialogAction onClick={handleDeleteAllItems} className="rounded-xl bg-rose-600 hover:bg-rose-700">Hepsini Sil</AlertDialogAction>
                                          </AlertDialogFooterComponent>
                                      </AlertDialogContent>
                                    </AlertDialog>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    </div>

                    {/* STORY-LIKE AVATARS */}
                    <div className="flex items-center gap-4 mt-5 overflow-x-auto scrollbar-hide pb-2">
                        {familyMembers.map((member) => {
                            const isSelected = selectedMember?.id === member.id;
                            return (
                                <div key={member.id} className="flex flex-col items-center gap-1.5 cursor-pointer" onClick={() => setSelectedMember(member)}>
                                    <div className={cn(
                                        "w-14 h-14 md:w-16 md:h-16 rounded-full flex items-center justify-center text-xl font-black text-white shadow-sm transition-all duration-300",
                                        isSelected ? "ring-[3px] ring-offset-[3px] ring-indigo-500 dark:ring-offset-slate-950 scale-105" : "opacity-80 scale-95 hover:scale-100"
                                    )} style={{ backgroundColor: member.color }}>
                                        {member.name.charAt(0)}
                                    </div>
                                    <span className={cn("text-[11px] font-bold truncate w-16 text-center", isSelected ? appColors.textMain : appColors.textMuted)}>
                                        {member.name.split(' ')[0]}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* CONTENT AREA */}
            <div className="flex-1 max-w-3xl mx-auto w-full px-4 mt-6">
                
                {/* SEGMENTED CONTROL / TABS */}
                <div className="flex bg-slate-200/50 dark:bg-slate-800/50 p-1 rounded-2xl mb-6 shadow-inner">
                    <button 
                        onClick={() => setActiveTab('personal')}
                        className={cn(
                            "flex-1 py-2.5 text-sm font-bold rounded-[14px] transition-all",
                            activeTab === 'personal' ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm" : "text-slate-500 dark:text-slate-400"
                        )}
                    >
                        Benim Listem
                    </button>
                    <button 
                        onClick={() => setActiveTab('library')}
                        className={cn(
                            "flex-1 py-2.5 text-sm font-bold rounded-[14px] transition-all",
                            activeTab === 'library' ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm" : "text-slate-500 dark:text-slate-400"
                        )}
                    >
                        Tüm Kütüphane
                    </button>
                </div>

                {/* SEARCH */}
                <div className="relative mb-6">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                    <Input
                        placeholder="Sure veya dua ara..."
                        className="pl-11 h-12 rounded-2xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm text-base"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>

                {/* TAB CONTENT */}
                {activeTab === 'personal' && (
                    <div className="space-y-3 pb-8">
                        {personalItems.length === 0 ? (
                            <EmptyState message="Listeniz şu an boş. Kütüphane sekmesinden ezberlemek istediğiniz duaları ekleyebilirsiniz." />
                        ) : (
                            personalItems.map(item => {
                                const isCompleted = memberProgressMap.get(`${item.id}_${selectedMember?.id}`) || false;
                                return (
                                    <ListItemCard 
                                        key={item.id} 
                                        item={item} 
                                        isCompleted={isCompleted} 
                                        onToggle={() => handleToggleCompletion(item.id, !isCompleted)}
                                        onRemove={() => handleRemoveFromMember(item.id, selectedMember!.id)}
                                        mode="personal"
                                    />
                                );
                            })
                        )}
                    </div>
                )}

                {activeTab === 'library' && (
                    <div className="space-y-8 pb-8">
                        {libraryShelves.length === 0 ? (
                            <EmptyState message="Kütüphanede hiç kayıt yok. Sağ üstteki artı (+) menüsünden yeni kayıt ekleyebilirsiniz." />
                        ) : (
                            libraryShelves.map(([shelfName, shelfItems]) => (
                                <div key={shelfName} className="space-y-3">
                                    <h2 className={cn("text-xs font-black uppercase tracking-widest px-2 mb-1", appColors.textMuted)}>
                                        {shelfName} <span className="opacity-50 ml-1">({shelfItems.length})</span>
                                    </h2>
                                    <div className="space-y-3">
                                        {shelfItems.map(item => {
                                            const isAdded = memberProgressMap.has(`${item.id}_${selectedMember?.id}`);
                                            return (
                                                <ListItemCard 
                                                    key={item.id} 
                                                    item={item} 
                                                    isCompleted={isAdded} // in library mode, this is just to show if it's in their list
                                                    onAssign={() => handleAssignToMember(item.id, selectedMember!.id)}
                                                    onEdit={() => handleOpenForm(item)}
                                                    onDelete={() => handleDeleteItem(item.id)}
                                                    mode="library"
                                                />
                                            );
                                        })}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}
            </div>

            {/* DIALOGS */}
            <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                <DialogContent className="sm:max-w-lg bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 p-0 rounded-[2rem] overflow-hidden">
                    <NewMemorizationItemForm onFormSubmit={() => { setIsFormOpen(false); setEditingItem(null); }} initialData={editingItem} />
                </DialogContent>
            </Dialog>
            
            <BulkAddTextDialog open={isBulkDialogOpen} onOpenChange={setIsBulkDialogOpen} onImport={handleBulkImport} existingTags={allTags} />
        </div>
    );
}

// --- COMPONENTS ---

function EmptyState({ message }: { message: string }) {
    return (
        <div className="flex flex-col items-center justify-center py-16 px-6 text-center bg-slate-100/50 dark:bg-slate-900/50 rounded-[2rem] border border-dashed border-slate-300 dark:border-slate-700">
            <div className="w-16 h-16 rounded-full bg-white dark:bg-slate-800 flex items-center justify-center shadow-sm mb-4">
                <BookOpen className="h-8 w-8 text-slate-400" />
            </div>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400 max-w-[250px]">{message}</p>
        </div>
    );
}

// MODERN VERTICAL CARD
function ListItemCard({ item, isCompleted, onToggle, onRemove, onAssign, onEdit, onDelete, mode }: any) {
    const [isViewerOpen, setIsViewerOpen] = useState(false);

    return (
        <>
            <div className={cn("flex items-center gap-3 md:gap-4 p-3 md:p-4 rounded-[1.5rem] md:rounded-[2rem] transition-all", appColors.cardBg, mode==='personal' && isCompleted ? "bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-100 dark:border-emerald-900/30" : "")}>
                
                {/* ICON / THUMBNAIL (Clickable to open viewer) */}
                <div onClick={() => setIsViewerOpen(true)} className="relative w-14 h-14 md:w-16 md:h-16 shrink-0 rounded-[1rem] overflow-hidden shadow-sm bg-slate-100 dark:bg-slate-800 flex items-center justify-center cursor-pointer border border-slate-200 dark:border-slate-700">
                    {item.imageUrl ? (
                        <Image src={item.imageUrl} alt={item.title} layout="fill" objectFit="cover" className="hover:scale-110 transition-transform duration-500" />
                    ) : (
                        <BookOpen className="w-6 h-6 text-slate-400" />
                    )}
                    <div className="absolute inset-0 bg-black/5 hover:bg-transparent transition-colors"></div>
                </div>

                {/* INFO */}
                <div className="flex-1 min-w-0" onClick={() => setIsViewerOpen(true)}>
                    <h3 className={cn("font-bold text-sm md:text-base truncate", mode==='personal' && isCompleted ? "text-emerald-700 dark:text-emerald-400" : appColors.textMain)}>{item.title}</h3>
                    <div className="flex items-center gap-2 mt-1">
                        <Badge variant="secondary" className="text-[9px] md:text-[10px] uppercase font-bold tracking-wider px-1.5 py-0 bg-slate-100 dark:bg-slate-800 text-slate-500">
                            {item.tags?.[0] || 'Diğer'}
                        </Badge>
                    </div>
                </div>

                {/* ACTIONS */}
                <div className="shrink-0 flex items-center gap-2 pl-2 border-l border-slate-100 dark:border-slate-800">
                    {mode === 'personal' ? (
                        <>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-slate-600 rounded-full">
                                        <Settings className="w-4 h-4"/>
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="rounded-xl">
                                    <DropdownMenuItem onClick={onRemove} className="text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 cursor-pointer">
                                        <Trash2 className="w-4 h-4 mr-2"/> Listemden Çıkar
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>

                            <button onClick={onToggle} className={cn(
                                "w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center transition-all shadow-sm active:scale-90",
                                isCompleted ? "bg-emerald-500 text-white ring-4 ring-emerald-100 dark:ring-emerald-900/30" : "bg-slate-100 dark:bg-slate-800 text-slate-400 hover:bg-indigo-50 dark:hover:bg-slate-700 hover:text-indigo-500"
                            )}>
                                {isCompleted ? <Check className="w-5 h-5 md:w-6 md:h-6" strokeWidth={3} /> : <div className="w-4 h-4 md:w-5 md:h-5 rounded-full border-2 border-current"></div>}
                            </button>
                        </>
                    ) : (
                        <>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-slate-600 rounded-full">
                                        <Settings className="w-4 h-4"/>
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="rounded-xl">
                                    <DropdownMenuItem onClick={onEdit} className="cursor-pointer">
                                        <Edit className="w-4 h-4 mr-2"/> Düzenle
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={onDelete} className="text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 cursor-pointer">
                                        <Trash2 className="w-4 h-4 mr-2"/> Sil
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                            <Button 
                                onClick={onAssign} 
                                disabled={isCompleted}
                                className={cn("rounded-xl text-xs font-bold px-3 h-9", isCompleted ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400" : "bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm")}
                            >
                                {isCompleted ? "Eklendi" : "Listeye Ekle"}
                            </Button>
                        </>
                    )}
                </div>
            </div>

            {/* FULLSCREEN / BOTTOM SHEET VIEWER */}
            <Dialog open={isViewerOpen} onOpenChange={setIsViewerOpen}>
                <DialogContent className="max-w-md w-full h-[85vh] sm:h-[90vh] bg-slate-50 dark:bg-slate-950 border-0 p-0 rounded-t-[2rem] sm:rounded-[2rem] overflow-hidden flex flex-col mt-auto sm:mt-0">
                    <div className="absolute top-4 right-4 z-50 bg-black/20 backdrop-blur-md rounded-full p-1 cursor-pointer hover:bg-black/30" onClick={() => setIsViewerOpen(false)}>
                        <X className="w-6 h-6 text-white" />
                    </div>
                    
                    <div className="bg-white dark:bg-slate-900 p-5 border-b border-slate-100 dark:border-slate-800 shrink-0">
                        <DialogTitle className="text-2xl font-black text-slate-900 dark:text-white pr-8 leading-tight">{item.title}</DialogTitle>
                        <div className="mt-2 flex gap-2">
                            <Badge variant="secondary" className="bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400">{item.tags?.[0]}</Badge>
                        </div>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto bg-slate-100 dark:bg-slate-950 p-4">
                        {item.imageUrl ? (
                            <div className="w-full h-full relative min-h-[400px] rounded-2xl overflow-hidden shadow-sm bg-white dark:bg-slate-900">
                                <Image src={item.imageUrl} alt={item.title} layout="fill" objectFit="contain" />
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full text-slate-400 p-8 text-center space-y-4">
                                <BookOpen className="w-16 h-16 opacity-20" />
                                <p className="text-lg font-medium opacity-50">Metin veya görsel bulunmuyor.</p>
                            </div>
                        )}
                    </div>
                    
                    {/* Floating Action Button for completion */}
                    {mode === 'personal' && !isCompleted && (
                        <div className="absolute bottom-6 left-1/2 -translate-x-1/2">
                            <Button onClick={() => { onToggle(); setIsViewerOpen(false); }} className="h-14 rounded-full px-8 bg-emerald-500 hover:bg-emerald-600 text-white shadow-xl shadow-emerald-500/30 text-base font-bold">
                                <Check className="w-5 h-5 mr-2" strokeWidth={3} /> Ezberledim!
                            </Button>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </>
    );
}

// BULK ADD TEXT DIALOG
function BulkAddTextDialog({ open, onOpenChange, onImport, existingTags }: { open: boolean, onOpenChange: (open: boolean) => void, onImport: (titles: string[], category: string) => void, existingTags: string[] }) {
    const [textInput, setTextInput] = useState('');
    const [category, setCategory] = useState('');
    const [isImporting, setIsImporting] = useState(false);
    const { toast } = useToast();

    const handleImportClick = () => {
        if (!category) { toast({ title: "Kategori seçin", variant: "destructive" }); return; }
        const titles = textInput.split('\n').map(t => t.trim()).filter(Boolean);
        if (titles.length === 0) { toast({ title: "Metin girin", variant: "destructive" }); return; }
        setIsImporting(true);
        onImport(titles, category);
        setIsImporting(false);
        setTextInput('');
        setCategory('');
    };
    
    const tagOptions = useMemo(() => existingTags.filter(tag => !tag.includes('/')).map(tag => ({ label: tag, value: tag })), [existingTags]);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-xl bg-white dark:bg-slate-900 rounded-[2rem] border-slate-200 dark:border-slate-800 p-6">
                <DialogHeader>
                    <DialogTitle className="text-xl font-black">Toplu Ekle</DialogTitle>
                    <DialogDescription>Her satıra bir başlık gelecek şekilde listeyi yapıştırın.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 mt-4">
                     <Combobox options={tagOptions} value={category} onChange={setCategory} onCreate={setCategory} placeholder="Kategori seç veya oluştur..." notfoundText="Kategori bulunamadı." createText="Yeni kategori oluştur:" className="h-12 rounded-xl" />
                    <Textarea value={textInput} onChange={(e) => setTextInput(e.target.value)} className="h-48 font-mono text-sm rounded-xl p-4 bg-slate-50 dark:bg-slate-950" placeholder="Fatiha Suresi&#10;Sübhaneke Duası" disabled={isImporting} />
                </div>
                <DialogFooter className="mt-6">
                    <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={isImporting} className="rounded-xl">İptal</Button>
                    <Button onClick={handleImportClick} disabled={isImporting} className="rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white">
                        {isImporting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} İçeri Aktar
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}