"use client";

import React, { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/auth-provider';
import { Notebook as NotebookType, Note } from '@/lib/data';
import { onNotebooksUpdate, addNotebook, deleteNotebook, updateNotebook, onNotesUpdate } from '@/lib/dataService';
import { Button } from '@/components/ui/button';
import { Plus, Trash2, Edit, ChevronRight, Notebook as NotebookIcon, Search, StickyNote, LayoutGrid, FileText } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle as AlertDialogTitleComponent, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { NewNotebookForm } from '@/components/new-notebook-form';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';

// --- DESIGN SYSTEM: Glassmorphism ---
const glassColors = {
    HEADER_BG: "bg-slate-950/70 backdrop-blur-lg border-b border-white/5",
    CARD_BG: "bg-white/5 border border-white/10 shadow-lg backdrop-blur-md",
    CARD_HOVER: "hover:bg-white/10 hover:border-white/20 hover:shadow-xl hover:-translate-y-1 transition-all duration-300",
    INPUT_BG: "bg-slate-900/50 border-white/10 text-slate-100 focus:border-indigo-500/50 focus:ring-indigo-500/20 placeholder:text-slate-500",
    BUTTON_GLASS: "bg-white/10 hover:bg-white/20 text-white border border-white/10 shadow-lg",
};

const notebookGradients = [
    "from-pink-500 to-rose-500",
    "from-indigo-500 to-blue-500",
    "from-emerald-500 to-teal-500",
    "from-amber-500 to-orange-500",
    "from-violet-500 to-purple-500",
    "from-cyan-500 to-sky-500",
];

export function NotesClient() {
    const { user } = useAuth();
    const [notebooks, setNotebooks] = useState<NotebookType[]>([]);
    const [allNotes, setAllNotes] = useState<Note[]>([]);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingNotebook, setEditingNotebook] = useState<NotebookType | null>(null);
    const [searchTerm, setSearchTerm] = useState("");
    const { toast } = useToast();

    useEffect(() => {
        if (!user) return;
        const unsubscribeNotebooks = onNotebooksUpdate(setNotebooks);
        const unsubscribeNotes = onNotesUpdate(setAllNotes);
        return () => {
            unsubscribeNotebooks();
            unsubscribeNotes();
        };
    }, [user]);
    
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
        } catch (error) {
            toast({ title: 'Hata', variant: 'destructive' });
        }
    };
    
    const filteredNotes = useMemo(() => {
        if (!searchTerm) {
            return [];
        }
        const lowercasedTerm = searchTerm.toLowerCase();
        return allNotes.filter(note => {
             // Safe check for content array
             const contentText = Array.isArray(note.content) 
                ? note.content.find(b => b.type === 'text')?.data || '' 
                : '';
             return note.title.toLowerCase().includes(lowercasedTerm) ||
                    (typeof contentText === 'string' && contentText.toLowerCase().includes(lowercasedTerm));
        });
    }, [searchTerm, allNotes]);


    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 font-sans relative overflow-hidden flex flex-col">
            
            {/* FIXED BACKGROUND */}
            <div className="fixed inset-0 bg-slate-950 -z-50" />
            
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
                            <div className="bg-gradient-to-br from-violet-500 to-fuchsia-600 p-2.5 rounded-xl shadow-lg shadow-violet-500/20">
                                <NotebookIcon className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <h1 className="text-xl font-black tracking-tight text-slate-100 leading-none">
                                    Notlar
                                </h1>
                                <p className="text-xs font-medium text-slate-400 mt-0.5">Fikirler ve belgeler</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3 w-full md:w-auto">
                            <div className="relative flex-1 md:w-64">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                <Input
                                    placeholder="Notlarda ara..."
                                    className={cn("pl-9 h-10 rounded-xl", glassColors.INPUT_BG)}
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                            
                            <Dialog open={isFormOpen} onOpenChange={(open) => { if (!open) setEditingNotebook(null); setIsFormOpen(open); }}>
                                <DialogTrigger asChild>
                                    <Button onClick={() => handleOpenDialog(null)} className="rounded-xl px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold shadow-lg shadow-indigo-500/20 border border-indigo-400/20">
                                        <Plus className="mr-2 h-4 w-4" /> <span className="hidden sm:inline">Yeni Defter</span>
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="bg-slate-900 border-white/10 text-slate-100 sm:max-w-md rounded-2xl">
                                    <NewNotebookForm onSubmit={handleFormSubmit} initialData={editingNotebook} />
                                </DialogContent>
                            </Dialog>
                        </div>
                    </div>
                </div>
            </div>
            
            <div className="flex-1 max-w-7xl mx-auto w-full p-4 md:p-6 relative z-10">
                {searchTerm ? (
                    <SearchResults notes={filteredNotes} notebooks={notebooks} />
                ) : (
                    <NotebookGrid notebooks={notebooks} onEdit={handleOpenDialog} onDelete={handleDeleteNotebook} />
                )}
            </div>
        </div>
    );
}

function NotebookGrid({ notebooks, onEdit, onDelete }: { notebooks: NotebookType[], onEdit: (nb: NotebookType) => void, onDelete: (id: string) => void }) {
    if (notebooks.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-center space-y-4 bg-white/5 rounded-[2.5rem] border border-dashed border-white/10">
                <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center">
                    <NotebookIcon className="h-10 w-10 text-slate-500" />
                </div>
                <div>
                    <h3 className="text-xl font-bold text-slate-200">Defter Yok</h3>
                    <p className="text-slate-400 mt-2">Henüz hiç not defteri oluşturulmadı.</p>
                </div>
            </div>
        )
    }

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {notebooks.map((notebook, index) => {
                // Select a gradient based on index or existing color prop logic
                const gradient = notebookGradients[index % notebookGradients.length];
                
                return (
                 <div 
                    key={notebook.id} 
                    className={cn(
                        "group relative flex flex-col h-64 rounded-[2rem] overflow-hidden border-0 transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl",
                        `bg-gradient-to-br ${gradient}`
                    )}
                 >
                    {/* Background Pattern/Overlay */}
                    <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-colors duration-300" />
                    <div className="absolute -right-8 -top-8 w-32 h-32 bg-white/20 rounded-full blur-2xl group-hover:bg-white/30 transition-all" />
                    
                    {/* Content */}
                    <Link href={`/notes/${notebook.id}`} className="flex flex-col h-full p-6 relative z-10">
                        <div className="flex items-start justify-between">
                            <div className="p-3 bg-white/20 backdrop-blur-md rounded-2xl shadow-inner text-2xl">
                                {notebook.icon || '📝'}
                            </div>
                            
                            {/* Actions Overlay (Visible on Hover/Focus) */}
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-black/20 backdrop-blur-md p-1 rounded-full">
                                <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-8 w-8 rounded-full hover:bg-white/20 text-white" 
                                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); onEdit(notebook); }}
                                >
                                    <Edit className="h-4 w-4" />
                                </Button>
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button 
                                            variant="ghost" 
                                            size="icon" 
                                            className="h-8 w-8 rounded-full hover:bg-white/20 text-white/80 hover:text-white" 
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent className="bg-slate-900 border-white/10 text-slate-100" onClick={(e) => e.stopPropagation()}>
                                        <AlertDialogHeader>
                                            <AlertDialogTitleComponent>Emin misiniz?</AlertDialogTitleComponent>
                                            <AlertDialogDescription className="text-slate-400">"{notebook.title}" defterini ve içindeki tüm notları kalıcı olarak silmek istediğinizden emin misiniz?</AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel className="bg-white/5 border-white/10 hover:bg-white/10 text-slate-200">İptal</AlertDialogCancel>
                                            <AlertDialogAction onClick={() => onDelete(notebook.id)} className="bg-rose-600 hover:bg-rose-700 text-white">Evet, Sil</AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            </div>
                        </div>

                        <div className="mt-auto space-y-1">
                            <h3 className="text-2xl font-bold text-white leading-tight line-clamp-1">{notebook.title}</h3>
                            <p className="text-white/70 text-sm line-clamp-2 font-medium">{notebook.description || "Açıklama yok"}</p>
                        </div>
                        
                        <div className="mt-4 pt-4 border-t border-white/20 flex items-center justify-between text-white/90 text-sm font-semibold group-hover:translate-x-1 transition-transform">
                            <span>Defteri Aç</span>
                            <ChevronRight className="h-4 w-4" />
                        </div>
                    </Link>
                </div>
            )})}
        </div>
    );
}


function SearchResults({ notes, notebooks }: { notes: Note[], notebooks: NotebookType[] }) {
    if (notes.length === 0) {
        return (
             <div className="flex flex-col items-center justify-center py-20 text-center space-y-4 bg-white/5 rounded-[2.5rem] border border-dashed border-white/10">
                <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center">
                    <Search className="h-8 w-8 text-slate-500" />
                </div>
                <div>
                    <h3 className="text-lg font-bold text-slate-200">Sonuç Yok</h3>
                    <p className="text-slate-400 mt-1">Aradığınız terime uygun not bulunamadı.</p>
                </div>
            </div>
        );
    }
    
    const getNotebookTitle = (notebookId: string) => {
        return notebooks.find(n => n.id === notebookId)?.title || "Bilinmeyen Defter";
    };

    return (
        <div className="space-y-4">
            <h2 className="text-lg font-bold text-slate-200 flex items-center gap-2">
                <Search className="w-5 h-5 text-indigo-400" />
                Arama Sonuçları ({notes.length})
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {notes.map(note => {
                     // Safe extraction of text content
                     const contentText = Array.isArray(note.content) 
                        ? note.content.find(b => b.type === 'text')?.data || '' 
                        : '';
                        
                     return (
                        <Link href={`/notes/${note.notebookId}`} key={note.id} className="group">
                            <div className={cn("h-full p-5 rounded-2xl transition-all", glassColors.CARD_BG, glassColors.CARD_HOVER)}>
                                <div className="flex items-start gap-3 mb-3">
                                    <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-400 shrink-0">
                                        <FileText className="h-5 w-5" />
                                    </div>
                                    <div className="min-w-0">
                                        <h3 className="font-bold text-slate-200 truncate group-hover:text-indigo-400 transition-colors">
                                            {note.title}
                                        </h3>
                                        <p className="text-xs text-slate-500 font-medium flex items-center gap-1 mt-0.5">
                                            <NotebookIcon className="w-3 h-3" />
                                            {getNotebookTitle(note.notebookId)}
                                        </p>
                                    </div>
                                </div>
                                <p className="text-sm text-slate-400 line-clamp-3 leading-relaxed">
                                    {typeof contentText === 'string' ? contentText : "İçerik önizlemesi yok"}
                                </p>
                            </div>
                        </Link>
                    )
                })}
            </div>
        </div>
    )
}