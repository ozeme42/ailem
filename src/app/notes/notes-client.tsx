"use client";

import React, { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/auth-provider';
import { Notebook as NotebookType, Note } from '@/lib/data';
import { onNotebooksUpdate, addNotebook, deleteNotebook, updateNotebook, onNotesUpdate } from '@/lib/dataService';
import { Button } from '@/components/ui/button';
import { Plus, Trash2, Edit, Search, MoreVertical, Book, Folder } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { NewNotebookForm } from '@/components/new-notebook-form';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

// --- TASARIM SABİTLERİ (Tailwind'in statik analizine uygun olarak açıkça yazılmış renkler) ---
const notebookThemes = [
    { bg: "bg-rose-50 dark:bg-rose-950/30", hover: "hover:bg-rose-100 dark:hover:bg-rose-900/40", text: "text-rose-700 dark:text-rose-300", border: "border-rose-200/60 dark:border-rose-800/50", icon: "text-rose-500 dark:text-rose-400", meta: "text-rose-600/60 dark:text-rose-400/60" },
    { bg: "bg-blue-50 dark:bg-blue-950/30", hover: "hover:bg-blue-100 dark:hover:bg-blue-900/40", text: "text-blue-700 dark:text-blue-300", border: "border-blue-200/60 dark:border-blue-800/50", icon: "text-blue-500 dark:text-blue-400", meta: "text-blue-600/60 dark:text-blue-400/60" },
    { bg: "bg-emerald-50 dark:bg-emerald-950/30", hover: "hover:bg-emerald-100 dark:hover:bg-emerald-900/40", text: "text-emerald-700 dark:text-emerald-300", border: "border-emerald-200/60 dark:border-emerald-800/50", icon: "text-emerald-500 dark:text-emerald-400", meta: "text-emerald-600/60 dark:text-emerald-400/60" },
    { bg: "bg-amber-50 dark:bg-amber-950/30", hover: "hover:bg-amber-100 dark:hover:bg-amber-900/40", text: "text-amber-700 dark:text-amber-300", border: "border-amber-200/60 dark:border-amber-800/50", icon: "text-amber-500 dark:text-amber-400", meta: "text-amber-600/60 dark:text-amber-400/60" },
    { bg: "bg-violet-50 dark:bg-violet-950/30", hover: "hover:bg-violet-100 dark:hover:bg-violet-900/40", text: "text-violet-700 dark:text-violet-300", border: "border-violet-200/60 dark:border-violet-800/50", icon: "text-violet-500 dark:text-violet-400", meta: "text-violet-600/60 dark:text-violet-400/60" },
    { bg: "bg-slate-50 dark:bg-slate-900/50", hover: "hover:bg-slate-100 dark:hover:bg-slate-800/60", text: "text-slate-700 dark:text-slate-300", border: "border-slate-200/60 dark:border-slate-700/50", icon: "text-slate-500 dark:text-slate-400", meta: "text-slate-500/70 dark:text-slate-400/60" },
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
        return () => { unsubscribeNotebooks(); unsubscribeNotes(); };
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
                toast({ title: 'Not Defteri Güncellendi!', className: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/50 dark:text-indigo-200 border-none" });
            } else {
                await addNotebook(data);
                toast({ title: 'Yeni Not Defteri Oluşturuldu!', className: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200 border-none" });
            }
            setIsFormOpen(false);
            setEditingNotebook(null);
        } catch (error) { toast({ title: 'Hata', variant: 'destructive' }); }
    };

    const handleDeleteNotebook = async (notebookId: string) => {
        try { 
            await deleteNotebook(notebookId); 
            toast({ title: 'Not Defteri Silindi', className: "bg-rose-100 text-rose-800 dark:bg-rose-900/50 dark:text-rose-200 border-none" }); 
        } 
        catch (error) { toast({ title: 'Hata', variant: 'destructive' }); }
    };

    const getNoteCount = (notebookId: string) => allNotes.filter(n => n.notebookId === notebookId).length;

    const displayedNotebooks = useMemo(() => {
        const sorted = [...notebooks].sort((a,b) => (b.createdAt ? new Date(b.createdAt).getTime() : 0) - (a.createdAt ? new Date(a.createdAt).getTime() : 0));
        if (!searchTerm) return sorted;
        return sorted.filter(n => n.title.toLowerCase().includes(searchTerm.toLowerCase()));
    }, [notebooks, searchTerm]);

    return (
        <div className="flex h-full min-h-screen flex-col bg-slate-50 dark:bg-slate-950 font-sans text-slate-900 dark:text-slate-50 relative overflow-hidden transition-colors duration-300 pb-20">
            
            {/* Ambient Background */}
            <div className="fixed inset-0 z-0 pointer-events-none opacity-30 dark:opacity-10">
                <div className="absolute top-[-10%] left-[-10%] w-[400px] h-[400px] bg-indigo-300 dark:bg-indigo-800 rounded-full blur-[100px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[300px] h-[300px] bg-fuchsia-300 dark:bg-fuchsia-800 rounded-full blur-[100px]" />
            </div>

            {/* Header (App Bar) */}
            <div className="px-4 py-4 md:px-8 md:py-6 border-b border-slate-200/50 dark:border-slate-800/50 bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl supports-[backdrop-filter]:bg-white/60 sticky top-0 z-20 shadow-sm flex-shrink-0">
                <div className="max-w-7xl mx-auto">
                    <div className="flex items-center justify-between mb-4 md:mb-5">
                        <div className="flex items-center gap-3">
                            <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-2.5 rounded-[14px] text-white shadow-sm">
                                <Book className="w-5 h-5 md:w-6 md:h-6" />
                            </div>
                            <h1 className="text-2xl md:text-3xl font-black tracking-tight text-slate-900 dark:text-white">Dosyalarım</h1>
                        </div>
                    </div>

                    <div className="flex flex-col md:flex-row gap-3">
                        <div className="relative flex-1 group">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-slate-500 transition-colors group-focus-within:text-indigo-500" />
                            <Input
                                placeholder="Defter ara..."
                                className="pl-11 h-12 md:h-14 bg-slate-100/50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 focus:bg-white dark:focus:bg-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all rounded-[1rem] md:rounded-[1.25rem] text-sm md:text-base text-slate-900 dark:text-slate-50 shadow-inner"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <Button 
                            onClick={() => handleOpenDialog(null)} 
                            className="hidden md:flex h-14 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white shadow-md hover:shadow-lg rounded-[1.25rem] px-8 font-bold text-base active:scale-95 transition-transform"
                        >
                            <Plus className="w-5 h-5 mr-2" /> Yeni Defter
                        </Button>
                    </div>
                </div>
            </div>

            {/* Content - Grid View */}
            <div className="flex-1 px-4 md:px-8 py-6 max-w-7xl mx-auto w-full relative z-10">
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-5">
                    {/* Add New Notebook Card (Mobile) */}
                    <button 
                        onClick={() => handleOpenDialog(null)}
                        className="md:hidden group relative flex flex-col justify-center items-center h-[160px] rounded-[1.5rem] border-2 border-dashed border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/30 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 hover:border-indigo-300 dark:hover:border-indigo-700 transition-all active:scale-[0.98]"
                    >
                        <div className="w-12 h-12 rounded-full bg-white dark:bg-slate-800 flex items-center justify-center shadow-sm mb-3 group-hover:scale-110 transition-transform">
                            <Plus className="w-6 h-6 text-slate-400 group-hover:text-indigo-500" />
                        </div>
                        <span className="text-sm font-bold text-slate-500 dark:text-slate-400 group-hover:text-indigo-600">Yeni Defter</span>
                    </button>

                    {displayedNotebooks.map((notebook, index) => {
                        const style = notebookThemes[index % notebookThemes.length];
                        const count = getNoteCount(notebook.id);
                        
                        return (
                            <Link 
                                key={notebook.id}
                                href={`/notes/${notebook.id}`}
                                className={cn(
                                    "group relative flex flex-col justify-between h-[160px] md:h-[180px] rounded-[1.5rem] border p-4 md:p-5 cursor-pointer transition-all active:scale-[0.97]",
                                    style.bg, style.border, style.hover
                                )}
                            >
                                <div className="flex justify-between items-start">
                                    <div className={cn("p-2.5 rounded-[12px] bg-white dark:bg-slate-900/50 shadow-sm border border-black/5 dark:border-white/5", style.icon)}>
                                        <Folder className="w-6 h-6 md:w-8 md:h-8" strokeWidth={2} />
                                    </div>
                                    
                                    <div onClick={(e) => e.preventDefault()}>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon" className={cn("h-8 w-8 -mr-2 -mt-2 opacity-50 md:opacity-0 group-hover:opacity-100 transition-all hover:bg-white/50 dark:hover:bg-slate-900/50 rounded-full", style.text)}>
                                                    <MoreVertical className="w-5 h-5" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end" className="w-48 rounded-[1.25rem] bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 p-1.5 shadow-xl">
                                                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleOpenDialog(notebook); }} className="py-2.5 px-3 rounded-xl cursor-pointer focus:bg-slate-100 dark:focus:bg-slate-800 font-medium">
                                                    <Edit className="w-4 h-4 mr-2.5 text-slate-500" /> Düzenle
                                                </DropdownMenuItem>
                                                <DropdownMenuSeparator className="bg-slate-100 dark:bg-slate-800 my-1" />
                                                <AlertDialog>
                                                    <AlertDialogTrigger asChild>
                                                        <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-rose-600 dark:text-rose-400 py-2.5 px-3 rounded-xl cursor-pointer focus:bg-rose-50 dark:focus:bg-rose-950/50 focus:text-rose-700 dark:focus:text-rose-300 font-medium">
                                                            <Trash2 className="w-4 h-4 mr-2.5" /> Sil
                                                        </DropdownMenuItem>
                                                    </AlertDialogTrigger>
                                                    <AlertDialogContent className="w-[90%] max-w-sm rounded-[2rem] bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 p-6">
                                                        <AlertDialogHeader>
                                                            <AlertDialogTitle className="text-xl font-bold">Defteri Sil?</AlertDialogTitle>
                                                            <AlertDialogDescription className="text-slate-500 dark:text-slate-400">
                                                                <span className="font-semibold text-slate-700 dark:text-slate-300">"{notebook.title}"</span> defterini ve içindeki tüm notları silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.
                                                            </AlertDialogDescription>
                                                        </AlertDialogHeader>
                                                        <AlertDialogFooter className="gap-2 sm:gap-0 mt-4">
                                                            <AlertDialogCancel className="rounded-xl h-12 bg-slate-100 dark:bg-slate-800 border-none hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold w-full sm:w-auto mt-0">Vazgeç</AlertDialogCancel>
                                                            <AlertDialogAction onClick={() => handleDeleteNotebook(notebook.id)} className="rounded-xl h-12 bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white font-semibold w-full sm:w-auto">Evet, Sil</AlertDialogAction>
                                                        </AlertDialogFooter>
                                                    </AlertDialogContent>
                                                </AlertDialog>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>
                                </div>
                                <div>
                                    <h3 className={cn("font-bold text-base md:text-lg leading-tight mb-1 truncate", style.text)}>
                                        {notebook.title}
                                    </h3>
                                    <p className={cn("text-xs font-bold uppercase tracking-wider", style.meta)}>
                                        {count} Not
                                    </p>
                                </div>
                            </Link>
                        )
                    })}
                    
                    {displayedNotebooks.length === 0 && searchTerm && (
                        <div className="col-span-full flex flex-col items-center justify-center py-20 text-slate-400 dark:text-slate-500">
                            <Search className="w-12 h-12 mb-4 opacity-20" />
                            <p className="text-base font-medium">"{searchTerm}" ile eşleşen defter bulunamadı.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Form Dialog (Bottom Sheet Style on Mobile) */}
            <Dialog open={isFormOpen} onOpenChange={(open) => { if (!open) setEditingNotebook(null); setIsFormOpen(open); }}>
                <DialogContent className="w-[95%] sm:max-w-md bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-[2rem] p-6 shadow-2xl">
                    <DialogHeader className="mb-4 text-left">
                        <DialogTitle className="text-xl font-black text-slate-900 dark:text-white">
                            {editingNotebook ? "Defteri Düzenle" : "Yeni Defter Oluştur"}
                        </DialogTitle>
                        <DialogDescription className="text-sm font-medium text-slate-500">
                            {editingNotebook ? "Klasör ismini güncelleyebilirsiniz." : "Notlarınızı kategorize etmek için bir klasör oluşturun."}
                        </DialogDescription>
                    </DialogHeader>
                    {/* NewNotebookForm component'inin de dark mode ve app-like butonlara uyumlu olduğunu varsayıyoruz. 
                        Eğer değilse, kendi projenizde o formun UI'ını da güncelleyebilirsiniz. */}
                    <NewNotebookForm onSubmit={handleFormSubmit} initialData={editingNotebook} />
                </DialogContent>
            </Dialog>
        </div>
    );
}