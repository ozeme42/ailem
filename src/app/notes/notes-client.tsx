
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
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

// --- TASARIM SABİTLERİ ---
const notebookColors = [
    { bg: "bg-rose-100", hover: "hover:bg-rose-200", text: "text-rose-700", border: "border-rose-200", icon: "text-rose-500", ring: "ring-rose-200" },
    { bg: "bg-blue-100", hover: "hover:bg-blue-200", text: "text-blue-700", border: "border-blue-200", icon: "text-blue-500", ring: "ring-blue-200" },
    { bg: "bg-emerald-100", hover: "hover:bg-emerald-200", text: "text-emerald-700", border: "border-emerald-200", icon: "text-emerald-500", ring: "ring-emerald-200" },
    { bg: "bg-amber-100", hover: "hover:bg-amber-200", text: "text-amber-700", border: "border-amber-200", icon: "text-amber-500", ring: "ring-amber-200" },
    { bg: "bg-violet-100", hover: "hover:bg-violet-200", text: "text-violet-700", border: "border-violet-200", icon: "text-violet-500", ring: "ring-violet-200" },
    { bg: "bg-slate-100", hover: "hover:bg-slate-200", text: "text-slate-700", border: "border-slate-200", icon: "text-slate-500", ring: "ring-slate-200" },
];

const darkNotebookColors = [
    { bg: "bg-rose-900/40", hover: "hover:bg-rose-900/60", text: "text-rose-200", border: "border-rose-800/50", icon: "text-rose-400", ring: "ring-rose-700" },
    { bg: "bg-blue-900/40", hover: "hover:bg-blue-900/60", text: "text-blue-200", border: "border-blue-800/50", icon: "text-blue-400", ring: "ring-blue-700" },
    { bg: "bg-emerald-900/40", hover: "hover:bg-emerald-900/60", text: "text-emerald-200", border: "border-emerald-800/50", icon: "text-emerald-400", ring: "ring-emerald-700" },
    { bg: "bg-amber-900/40", hover: "hover:bg-amber-900/60", text: "text-amber-200", border: "border-amber-800/50", icon: "text-amber-400", ring: "ring-amber-700" },
    { bg: "bg-violet-900/40", hover: "hover:bg-violet-900/60", text: "text-violet-200", border: "border-violet-800/50", icon: "text-violet-400", ring: "ring-violet-700" },
    { bg: "bg-slate-800/70", hover: "hover:bg-slate-800/90", text: "text-slate-200", border: "border-slate-700", icon: "text-slate-400", ring: "ring-slate-600" },
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
                toast({ title: 'Not Defteri Güncellendi!' });
            } else {
                await addNotebook(data);
                toast({ title: 'Yeni Not Defteri Oluşturuldu!' });
            }
            setIsFormOpen(false);
            setEditingNotebook(null);
        } catch (error) { toast({ title: 'Hata', variant: 'destructive' }); }
    };

    const handleDeleteNotebook = async (notebookId: string) => {
        try { await deleteNotebook(notebookId); toast({ title: 'Not Defteri Silindi', variant: 'destructive' }); } 
        catch (error) { toast({ title: 'Hata', variant: 'destructive' }); }
    };

    const getNotebookStyle = (index: number) => {
        // Simple way to alternate, you can use a more sophisticated check for dark mode if needed
        // For now, let's assume we can use dark: prefixes in the color definitions.
        return { light: notebookColors[index % notebookColors.length], dark: darkNotebookColors[index % darkNotebookColors.length] }
    };
    
    const getNoteCount = (notebookId: string) => allNotes.filter(n => n.notebookId === notebookId).length;

    const displayedNotebooks = useMemo(() => {
        const sorted = [...notebooks].sort((a,b) => (b.createdAt ? new Date(b.createdAt).getTime() : 0) - (a.createdAt ? new Date(a.createdAt).getTime() : 0));
        if (!searchTerm) return sorted;
        return sorted.filter(n => n.title.toLowerCase().includes(searchTerm.toLowerCase()));
    }, [notebooks, searchTerm]);

    return (
        <div className="flex h-full min-h-screen flex-col bg-slate-50 dark:bg-slate-950 font-sans text-slate-900 dark:text-slate-50 overflow-hidden">
            {/* Header */}
            <div className="p-4 md:px-8 md:py-6 border-b border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-950/50 backdrop-blur-xl sticky top-0 z-20 shadow-sm flex-shrink-0">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <div className="bg-indigo-600 p-2 rounded-xl text-white shadow-md">
                            <Book className="w-6 h-6" />
                        </div>
                        <h1 className="text-xl md:text-2xl font-bold tracking-tight text-slate-800 dark:text-slate-100">Dosyalarım</h1>
                    </div>
                </div>

                <div className="flex flex-col md:flex-row gap-3">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-slate-500" />
                        <Input
                            placeholder="Defter ara..."
                            className="pl-9 h-11 bg-slate-100 dark:bg-slate-800/50 border-transparent focus:bg-white dark:focus:bg-slate-800 focus:border-indigo-500 transition-all rounded-xl text-slate-900 dark:text-slate-50"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <Button onClick={() => handleOpenDialog(null)} className="h-11 bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm rounded-xl px-6">
                        <Plus className="w-5 h-5 mr-2" /> Yeni Defter
                    </Button>
                </div>
            </div>

            {/* Content - Grid View */}
            <div className="flex-1 px-4 md:px-8 py-6 overflow-y-auto">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6 pb-20">
                    {displayedNotebooks.map((notebook, index) => {
                        const style = getNotebookStyle(index);
                        const count = getNoteCount(notebook.id);
                        
                        return (
                            <Link 
                                key={notebook.id}
                                href={`/notes/${notebook.id}`}
                                className={cn(
                                    "group relative flex flex-col justify-between h-40 md:h-48 rounded-2xl border p-5 cursor-pointer transition-all shadow-sm hover:shadow-md hover:-translate-y-1 active:scale-95",
                                    style.light.bg, style.light.border, style.light.hover,
                                    `dark:${style.dark.bg}`, `dark:${style.dark.border}`, `dark:${style.dark.hover}`
                                )}
                            >
                                <div className="flex justify-between items-start">
                                    <Folder className={cn("w-10 h-10 md:w-12 md:h-12", style.light.icon, `dark:${style.dark.icon}`)} strokeWidth={1.5} />
                                    
                                    <div onClick={(e) => e.preventDefault()}>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon" className={cn("h-8 w-8 -mr-2 -mt-2 opacity-0 group-hover:opacity-100 transition-opacity", style.light.text, `dark:${style.dark.text}`, "hover:bg-black/5 dark:hover:bg-white/5")}>
                                                    <MoreVertical className="w-5 h-5" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end" className="w-48 rounded-xl bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800">
                                                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleOpenDialog(notebook); }} className="py-2.5 cursor-pointer focus:bg-slate-50 dark:focus:bg-slate-800">
                                                    <Edit className="w-4 h-4 mr-2" /> Düzenle
                                                </DropdownMenuItem>
                                                <AlertDialog>
                                                    <AlertDialogTrigger asChild>
                                                        <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-red-600 py-2.5 cursor-pointer focus:bg-red-50 focus:text-red-700 dark:text-red-500 dark:focus:bg-red-900/50 dark:focus:text-red-400">
                                                            <Trash2 className="w-4 h-4 mr-2" /> Sil
                                                        </DropdownMenuItem>
                                                    </AlertDialogTrigger>
                                                    <AlertDialogContent>
                                                        <AlertDialogHeader>
                                                            <AlertDialogTitle>Defteri Sil?</AlertDialogTitle>
                                                            <AlertDialogDescription>
                                                                "{notebook.title}" defterini ve içindeki tüm notları silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.
                                                            </AlertDialogDescription>
                                                        </AlertDialogHeader>
                                                        <AlertDialogFooter>
                                                            <AlertDialogCancel>Vazgeç</AlertDialogCancel>
                                                            <AlertDialogAction onClick={() => handleDeleteNotebook(notebook.id)}>Evet, Sil</AlertDialogAction>
                                                        </AlertDialogFooter>
                                                    </AlertDialogContent>
                                                </AlertDialog>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>
                                </div>
                                <div>
                                    <h3 className={cn("font-bold text-lg leading-tight mb-1", style.light.text, `dark:${style.dark.text}`)}>
                                        {notebook.title}
                                    </h3>
                                    <p className={cn("text-sm font-medium", style.light.text, `dark:${style.dark.text}`, "opacity-60 dark:opacity-50")}>
                                        {count} Not
                                    </p>
                                </div>
                            </Link>
                        )
                    })}
                    {displayedNotebooks.length === 0 && (
                        <div className="col-span-full flex flex-col items-center justify-center py-20 text-slate-400 dark:text-slate-500">
                            <p className="text-lg font-medium">Defter bulunamadı.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Dialogs */}
            <Dialog open={isFormOpen} onOpenChange={(open) => { if (!open) setEditingNotebook(null); setIsFormOpen(open); }}>
                <DialogContent className="sm:max-w-md bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-2xl">
                    <NewNotebookForm onSubmit={handleFormSubmit} initialData={editingNotebook} />
                </DialogContent>
            </Dialog>
        </div>
    );
}
