"use client";

import React, { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/auth-provider';
import { Notebook as NotebookType, Note } from '@/lib/data';
import { onNotebooksUpdate, addNotebook, deleteNotebook, updateNotebook, onNotesUpdate } from '@/lib/dataService';
import { Button } from '@/components/ui/button';
import { Plus, Trash2, Edit, ChevronRight, Notebook as NotebookIcon, Search, StickyNote, MoreVertical, PenLine, Book, ArrowLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogTrigger, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { NewNotebookForm } from '@/components/new-notebook-form';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";

// --- TASARIM: AÇIK TEMA & KOMPAKT YAPI ---
const notebookColors = [
    { bg: "bg-rose-100", text: "text-rose-700", border: "border-rose-200", icon: "text-rose-500" },
    { bg: "bg-blue-100", text: "text-blue-700", border: "border-blue-200", icon: "text-blue-500" },
    { bg: "bg-emerald-100", text: "text-emerald-700", border: "border-emerald-200", icon: "text-emerald-500" },
    { bg: "bg-amber-100", text: "text-amber-700", border: "border-amber-200", icon: "text-amber-500" },
    { bg: "bg-violet-100", text: "text-violet-700", border: "border-violet-200", icon: "text-violet-500" },
    { bg: "bg-slate-100", text: "text-slate-700", border: "border-slate-200", icon: "text-slate-500" },
];

export function NotesClient() {
    const { user } = useAuth();
    const [notebooks, setNotebooks] = useState<NotebookType[]>([]);
    const [allNotes, setAllNotes] = useState<Note[]>([]);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingNotebook, setEditingNotebook] = useState<NotebookType | null>(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedNotebookId, setSelectedNotebookId] = useState<string | null>(null);
    const [isMobile, setIsMobile] = useState(false); // Mobil kontrolü için state
    const { toast } = useToast();

    // Ekran boyutunu kontrol et
    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 768);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    useEffect(() => {
        if (!user) return;
        const unsubscribeNotebooks = onNotebooksUpdate((data) => {
            setNotebooks(data);
        });
        const unsubscribeNotes = onNotesUpdate(setAllNotes);
        return () => {
            unsubscribeNotebooks();
            unsubscribeNotes();
        };
    }, [user]);
    
    // Eğer seçili defter silindiyse seçimi temizle
    useEffect(() => {
        if (selectedNotebookId && notebooks.length > 0 && !notebooks.find(n => n.id === selectedNotebookId)) {
            setSelectedNotebookId(null);
        } else if (selectedNotebookId && notebooks.length === 0) {
            setSelectedNotebookId(null);
        }
    }, [notebooks, selectedNotebookId]);

    const handleOpenDialog = (notebook: NotebookType | null) => {
        setEditingNotebook(notebook);
        setIsFormOpen(true);
    };

    const handleFormSubmit = async (data: Omit<NotebookType, 'id' | 'familyId' | 'createdAt' | 'ownerId'>) => {
        if (!user) return;
        try {
            if (editingNotebook) {
                await updateNotebook(editingNotebook.id, data);
                toast({ title: 'Not Defteri Güncellendi!' });
            } else {
                await addNotebook(data);
                toast({ title: 'Yeni Not Defteri Oluşturuldu!' });
            }
            setIsFormOpen(false);
            setEditingNotebook(null);
        } catch (error) {
            toast({ title: 'Hata', variant: 'destructive' });
        }
    };

    const handleDeleteNotebook = async (notebookId: string) => {
        try {
            await deleteNotebook(notebookId);
            toast({ title: 'Not Defteri Silindi', variant: 'destructive' });
            if (selectedNotebookId === notebookId) setSelectedNotebookId(null);
        } catch (error) {
            toast({ title: 'Hata', variant: 'destructive' });
        }
    };
    
    const displayedNotes = useMemo(() => {
        let filtered = allNotes;

        if (selectedNotebookId && !searchTerm) {
            filtered = allNotes.filter(n => n.notebookId === selectedNotebookId);
        }

        if (searchTerm) {
            const lowercasedTerm = searchTerm.toLowerCase();
            filtered = allNotes.filter(note => {
                 const contentText = Array.isArray(note.content) 
                    ? note.content.find(b => b.type === 'text')?.data || '' 
                    : '';
                 return note.title.toLowerCase().includes(lowercasedTerm) ||
                        (typeof contentText === 'string' && contentText.toLowerCase().includes(lowercasedTerm));
            });
        }
        
        return filtered.sort((a,b) => (b.updatedAt ? new Date(b.updatedAt).getTime() : 0) - (a.updatedAt ? new Date(a.updatedAt).getTime() : 0));
    }, [searchTerm, allNotes, selectedNotebookId]);

    const selectedNotebook = notebooks.find(n => n.id === selectedNotebookId);

    return (
        <div className="flex h-[100dvh] overflow-hidden font-sans text-slate-900 bg-white">
            
            {/* --- SOL PANEL: DEFTER LİSTESİ --- */}
            {/* Mobilde: Defter seçili DEĞİLSE görünür. Masaüstünde: Her zaman görünür (w-80). */}
            <div className={cn(
                "flex-col border-r border-slate-200 bg-slate-50 transition-all duration-300",
                selectedNotebookId && isMobile ? "hidden" : "flex w-full md:w-80 flex-shrink-0"
            )}>
                <div className="p-4 border-b border-slate-200 bg-white sticky top-0 z-20">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <div className="bg-indigo-600 p-1.5 rounded-lg text-white shadow-sm">
                                <Book className="w-5 h-5" />
                            </div>
                            <h1 className="text-lg font-bold tracking-tight text-slate-800">Not Defterleri</h1>
                        </div>
                    </div>
                    <Button onClick={() => handleOpenDialog(null)} className="w-full justify-start bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-indigo-600 hover:border-indigo-200 shadow-sm h-10">
                        <Plus className="w-4 h-4 mr-2" /> Yeni Defter
                    </Button>
                </div>
                
                {/* Search Bar (Defter Listesinde) */}
                <div className="px-4 py-2 bg-slate-50 border-b border-slate-200">
                     <div className="relative">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input
                            placeholder="Tüm notlarda ara..."
                            className="pl-9 h-9 bg-white border-slate-200 focus:border-indigo-500 transition-all text-sm rounded-lg"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>
                
                <ScrollArea className="flex-1">
                    <div className="p-3 space-y-1">
                        {notebooks.map((notebook, index) => {
                            const isSelected = selectedNotebookId === notebook.id;
                            
                            return (
                                <div 
                                    key={notebook.id}
                                    onClick={() => { setSelectedNotebookId(notebook.id); setSearchTerm(""); }}
                                    className={cn(
                                        "group flex items-center justify-between px-3 py-3 rounded-lg cursor-pointer transition-all text-sm font-medium",
                                        isSelected 
                                            ? "bg-white shadow-sm ring-1 ring-slate-200 border-l-4 border-l-indigo-500" 
                                            : "hover:bg-white hover:shadow-sm text-slate-600 border-l-4 border-l-transparent"
                                    )}
                                >
                                    <div className="flex items-center gap-3 truncate">
                                        <span className="text-lg">{notebook.icon || '📘'}</span>
                                        <span className={cn("truncate font-semibold", isSelected ? "text-slate-900" : "")}>{notebook.title}</span>
                                        <span className="text-xs text-slate-400 font-normal">
                                            {/* (Opsiyonel: not sayısı eklenebilir) */}
                                        </span>
                                    </div>
                                    
                                    <div className="flex items-center opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-slate-700 -mr-2">
                                                    <MoreVertical className="w-4 h-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end" className="w-40 bg-white border-slate-200">
                                                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleOpenDialog(notebook); }}>
                                                    <Edit className="w-3 h-3 mr-2" /> Düzenle
                                                </DropdownMenuItem>
                                                <DropdownMenuItem className="text-red-600 focus:text-red-700" onClick={(e) => { e.stopPropagation(); handleDeleteNotebook(notebook.id); }}>
                                                    <Trash2 className="w-3 h-3 mr-2" /> Sil
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                        
                                        {/* Mobil için ok işareti */}
                                        <ChevronRight className="w-4 h-4 text-slate-300 sm:hidden ml-1" />
                                    </div>
                                </div>
                            )
                        })}
                        {notebooks.length === 0 && (
                            <div className="text-center py-10 text-slate-400 text-sm px-4">
                                <p>Henüz hiç defter yok.</p>
                                <p className="text-xs mt-1">Yukarıdan yeni bir tane ekle.</p>
                            </div>
                        )}
                    </div>
                </ScrollArea>
            </div>

            {/* --- SAĞ PANEL: NOT İÇERİĞİ (GRID) --- */}
            {/* Mobilde: Defter seçiliyse görünür. Masaüstünde: Her zaman görünür. */}
            <div className={cn(
                "flex-col bg-slate-50/50 overflow-hidden relative w-full h-full",
                !selectedNotebookId && isMobile ? "hidden" : "flex"
            )}>
                {/* Header Area */}
                <div className="h-16 px-4 md:px-6 border-b border-slate-200 bg-white/80 backdrop-blur-md flex items-center justify-between sticky top-0 z-10 shrink-0">
                    <div className="flex items-center gap-2 overflow-hidden">
                        {/* MOBİL GERİ BUTONU */}
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            className="md:hidden mr-1 text-slate-500" 
                            onClick={() => setSelectedNotebookId(null)}
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </Button>

                        <div className="flex flex-col min-w-0">
                            <h2 className="text-lg md:text-xl font-bold text-slate-800 truncate">
                                {searchTerm ? `Arama: "${searchTerm}"` : (selectedNotebook?.title || "Seçili Defter Yok")}
                            </h2>
                            {selectedNotebook && !searchTerm && (
                                <span className="text-xs text-slate-500 font-medium truncate">
                                    {displayedNotes.length} not bulundu
                                </span>
                            )}
                        </div>
                    </div>
                    
                    {selectedNotebookId && !searchTerm && (
                        <Link href={`/notes/${selectedNotebookId}`}>
                            <Button className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm rounded-lg h-9 text-sm font-medium px-3 md:px-4">
                                <PenLine className="w-4 h-4 md:mr-2" /> <span className="hidden md:inline">Yeni Not Yaz</span>
                            </Button>
                        </Link>
                    )}
                </div>

                {/* Notes Grid */}
                <ScrollArea className="flex-1 p-4 md:p-6 w-full">
                    {(!selectedNotebookId && !searchTerm) ? (
                        <div className="flex flex-col items-center justify-center h-[50vh] text-center opacity-60 px-4">
                            <Book className="w-16 h-16 text-slate-300 mb-4" />
                            <p className="text-lg font-medium text-slate-500">Bir defter seçin.</p>
                            <p className="text-sm text-slate-400">Soldaki listeden (veya mobilde geri giderek) bir defter seçin.</p>
                        </div>
                    ) : displayedNotes.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-[50vh] text-center opacity-60 px-4">
                            <StickyNote className="w-16 h-16 text-slate-300 mb-4" />
                            <p className="text-lg font-medium text-slate-500">Burada hiç not yok.</p>
                            <p className="text-sm text-slate-400">Yeni bir not oluşturarak başla.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pb-20">
                            {displayedNotes.map((note) => {
                                const contentText = Array.isArray(note.content) 
                                    ? note.content.find(b => b.type === 'text')?.data || '' 
                                    : '';
                                const plainText = typeof contentText === 'string' ? contentText.replace(/<[^>]+>/g, '') : '';

                                return (
                                    <Link key={note.id} href={`/notes/${note.notebookId}?note=${note.id}`} className="block group h-full">
                                        <div className={cn(
                                            "flex flex-col h-56 md:h-64 p-5 rounded-xl border transition-all duration-200 relative bg-white shadow-sm hover:shadow-md hover:-translate-y-1 hover:border-indigo-300 group-hover:ring-1 ring-indigo-100"
                                        )}>
                                            {/* Kağıt Çizgisi Efekti */}
                                            <div className="absolute inset-0 pointer-events-none opacity-[0.03] bg-[linear-gradient(transparent_19px,#000_20px)] bg-[length:100%_20px]" />
                                            
                                            <div className="flex items-start justify-between gap-2 mb-3 relative z-10">
                                                <h3 className="font-bold text-slate-800 line-clamp-2 leading-tight text-base md:text-lg group-hover:text-indigo-600 transition-colors">
                                                    {note.title || "Başlıksız Not"}
                                                </h3>
                                            </div>
                                            
                                            <div className="flex-1 overflow-hidden relative z-10">
                                                <p className="text-sm text-slate-500 leading-relaxed font-serif whitespace-pre-wrap line-clamp-6">
                                                    {plainText || "İçerik yok..."}
                                                </p>
                                            </div>

                                            <div className="mt-auto pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400 font-medium relative z-10">
                                                <span>
                                                    {note.updatedAt 
                                                        ? new Date(note.updatedAt).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' }) 
                                                        : 'Tarih yok'}
                                                </span>
                                                <span className="md:opacity-0 md:group-hover:opacity-100 transition-opacity text-indigo-500 font-bold flex items-center">
                                                    Aç <ChevronRight className="w-3 h-3 ml-0.5" />
                                                </span>
                                            </div>
                                        </div>
                                    </Link>
                                );
                            })}
                        </div>
                    )}
                </ScrollArea>
            </div>

            {/* --- DIALOGS --- */}
            <Dialog open={isFormOpen} onOpenChange={(open) => { if (!open) setEditingNotebook(null); setIsFormOpen(open); }}>
                <DialogContent className="sm:max-w-md bg-white text-slate-900 border-slate-200 rounded-2xl w-[90%] mx-auto">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-bold">{editingNotebook ? 'Defteri Düzenle' : 'Yeni Not Defteri'}</DialogTitle>
                        <DialogDescription className="text-slate-500">
                            {editingNotebook ? 'Defterin adını veya simgesini değiştir.' : 'Notlarını düzenlemek için yeni bir defter oluştur.'}
                        </DialogDescription>
                    </DialogHeader>
                    <NewNotebookForm onSubmit={handleFormSubmit} initialData={editingNotebook} />
                </DialogContent>
            </Dialog>
        </div>
    );
}
