"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { useAuth } from '@/components/auth-provider';
import { Notebook as NotebookType, Note } from '@/lib/data';
import { onNotebooksUpdate, addNotebook, deleteNotebook, updateNotebook, onNotesUpdate, updateNoteInSection, addNoteToSection, deleteNoteFromSection } from '@/lib/dataService';
import { Button } from '@/components/ui/button';
import { Plus, Trash2, Edit, Search, MoreVertical, Folder, ChevronLeft, CalendarClock, PenLine, GripVertical, Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose } from '@/components/ui/dialog';
import { NewNotebookForm } from '@/components/new-notebook-form';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Form, FormControl, FormField, FormItem } from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  defaultDropAnimationSideEffects,
} from '@dnd-kit/core';
import { SortableContext, rectSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// --- TASARIM SABİTLERİ ---
const notebookThemes = [
    { bg: "bg-rose-50 dark:bg-rose-950/30", hover: "hover:bg-rose-100 dark:hover:bg-rose-900/40", text: "text-rose-700 dark:text-rose-300", border: "border-rose-200/60 dark:border-rose-800/50", icon: "text-rose-500 dark:text-rose-400", meta: "text-rose-600/60 dark:text-rose-400/60" },
    { bg: "bg-blue-50 dark:bg-blue-950/30", hover: "hover:bg-blue-100 dark:hover:bg-blue-900/40", text: "text-blue-700 dark:text-blue-300", border: "border-blue-200/60 dark:border-blue-800/50", icon: "text-blue-500 dark:text-blue-400", meta: "text-blue-600/60 dark:text-blue-400/60" },
    { bg: "bg-emerald-50 dark:bg-emerald-950/30", hover: "hover:bg-emerald-100 dark:hover:bg-emerald-900/40", text: "text-emerald-700 dark:text-emerald-300", border: "border-emerald-200/60 dark:border-emerald-800/50", icon: "text-emerald-500 dark:text-emerald-400", meta: "text-emerald-600/60 dark:text-emerald-400/60" },
    { bg: "bg-amber-50 dark:bg-amber-950/30", hover: "hover:bg-amber-100 dark:hover:bg-amber-900/40", text: "text-amber-700 dark:text-amber-300", border: "border-amber-200/60 dark:border-amber-800/50", icon: "text-amber-500 dark:text-amber-400", meta: "text-amber-600/60 dark:text-amber-400/60" },
    { bg: "bg-violet-50 dark:bg-violet-950/30", hover: "hover:bg-violet-100 dark:hover:bg-violet-900/40", text: "text-violet-700 dark:text-violet-300", border: "border-violet-200/60 dark:border-violet-800/50", icon: "text-violet-500 dark:text-violet-400", meta: "text-violet-600/60 dark:text-violet-400/60" },
    { bg: "bg-slate-50 dark:bg-slate-900/50", hover: "hover:bg-slate-100 dark:hover:bg-slate-800/60", text: "text-slate-700 dark:text-slate-300", border: "border-slate-200/60 dark:border-slate-700/50", icon: "text-slate-500 dark:text-slate-400", meta: "text-slate-500/70 dark:text-slate-400/60" },
];

const noteColors = [
    { id: 'yellow', class: 'bg-[#FFF9C4] text-[#78600C]', preview: 'bg-[#FFF9C4]', ring: 'ring-[#FDE047]' },
    { id: 'blue',   class: 'bg-[#E0F2FE] text-[#0C4A6E]', preview: 'bg-[#E0F2FE]', ring: 'ring-[#7DD3FC]' },
    { id: 'green',  class: 'bg-[#DCFCE7] text-[#064E3B]', preview: 'bg-[#DCFCE7]', ring: 'ring-[#6EE7B7]' },
    { id: 'pink',   class: 'bg-[#FCE7F3] text-[#831843]', preview: 'bg-[#FCE7F3]', ring: 'ring-[#F472B6]' },
    { id: 'purple', class: 'bg-[#F3E8FF] text-[#4C1D95]', preview: 'bg-[#F3E8FF]', ring: 'ring-[#D8B4FE]' },
    { id: 'gray',   class: 'bg-[#F1F5F9] text-[#0F172A]', preview: 'bg-[#F1F5F9]', ring: 'ring-[#CBD5E1]' },
];

const noteFormSchema = z.object({
    title: z.string().default(""),
    content: z.string().optional().default(""),
    color: z.string().optional(),
});
type NoteFormData = z.infer<typeof noteFormSchema>;

export function NotesClient() {
    const { user, familyId } = useAuth();
    const { toast } = useToast();

    // Data State
    const [notebooks, setNotebooks] = useState<NotebookType[]>([]);
    const [allNotes, setAllNotes] = useState<Note[]>([]);
    
    // UI State
    const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState("");
    
    // Dialogs
    const [isFolderFormOpen, setIsFolderFormOpen] = useState(false);
    const [editingNotebook, setEditingNotebook] = useState<NotebookType | null>(null);
    
    const [isNoteFormOpen, setIsNoteFormOpen] = useState(false);
    const [editingNote, setEditingNote] = useState<Note | null>(null);

    const noteForm = useForm<NoteFormData>();

    useEffect(() => {
        if (!user) return;
        const unsubscribeNotebooks = onNotebooksUpdate(setNotebooks);
        const unsubscribeNotes = onNotesUpdate(setAllNotes);
        return () => { unsubscribeNotebooks(); unsubscribeNotes(); };
    }, [user]);

    useEffect(() => {
        if (editingNote) {
            noteForm.reset({
                title: editingNote.title || '',
                content: (editingNote.content?.[0]?.data || ''),
                color: editingNote.color || noteColors[0].class,
            });
        }
    }, [editingNote, noteForm]);

    // Data Helpers
    const currentFolder = useMemo(() => notebooks.find(n => n.id === currentFolderId) || null, [notebooks, currentFolderId]);
    
    const displayedFolders = useMemo(() => {
        let filtered = notebooks.filter(n => (n.parentId || null) === currentFolderId);
        if (searchTerm) {
            filtered = notebooks.filter(n => n.title.toLowerCase().includes(searchTerm.toLowerCase()));
        }
        return filtered.sort((a,b) => (b.createdAt ? new Date(b.createdAt).getTime() : 0) - (a.createdAt ? new Date(a.createdAt).getTime() : 0));
    }, [notebooks, currentFolderId, searchTerm]);

    const displayedNotes = useMemo(() => {
        let filtered = allNotes.filter(n => n.notebookId === (currentFolderId || 'root'));
        if (searchTerm) {
            filtered = allNotes.filter(n => n.title.toLowerCase().includes(searchTerm.toLowerCase()) || (n.content[0]?.data.toLowerCase().includes(searchTerm.toLowerCase())));
        }
        return filtered.sort((a,b) => (b.createdAt ? new Date(b.createdAt).getTime() : 0) - (a.createdAt ? new Date(a.createdAt).getTime() : 0));
    }, [allNotes, currentFolderId, searchTerm]);

    const getNoteCount = (folderId: string) => allNotes.filter(n => n.notebookId === folderId).length;

    // Actions
    const handleFolderSubmit = async (data: Omit<NotebookType, 'id' | 'familyId' | 'createdAt' | 'ownerId'>) => {
        if (!user) return;
        try {
            const payload = { ...data, parentId: currentFolderId || undefined };
            if (editingNotebook) {
                await updateNotebook(editingNotebook.id, data); // updating doesn't change parentId here unless specified
                toast({ title: 'Klasör Güncellendi!', className: "bg-indigo-100 text-indigo-800" });
            } else {
                await addNotebook(payload);
                toast({ title: 'Yeni Klasör Oluşturuldu!', className: "bg-emerald-100 text-emerald-800" });
            }
            setIsFolderFormOpen(false);
            setEditingNotebook(null);
        } catch (error) { toast({ title: 'Hata', variant: 'destructive' }); }
    };

    const handleDeleteFolder = async (notebookId: string) => {
        try { 
            await deleteNotebook(notebookId); 
            // Optional: delete notes inside it, or backend handles it.
            toast({ title: 'Klasör Silindi', className: "bg-rose-100 text-rose-800" }); 
        } 
        catch (error) { toast({ title: 'Hata', variant: 'destructive' }); }
    };

    const handleSaveNote = async (data: NoteFormData) => {
        if (!familyId) return;
        try {
            const notePayload = {
                title: data.title.trim() || 'İsimsiz Not',
                content: [{ id: '1', type: 'text' as const, data: data.content || '' }],
                color: data.color || noteColors[0].class,
            };

            const targetNotebookId = currentFolderId || 'root';

            if (editingNote && editingNote.id) {
                await updateNoteInSection(editingNote.notebookId, editingNote.id, notePayload);
                toast({ title: "Not güncellendi" });
            } else {
                await addNoteToSection(familyId, targetNotebookId, 'default', notePayload);
                toast({ title: "Not oluşturuldu" });
            }
            setIsNoteFormOpen(false);
            setEditingNote(null);
        } catch (error) { toast({ title: 'Kayıt başarısız oldu', variant: 'destructive' }); }
    };

    const handleDeleteNote = async (noteId: string) => {
        try {
            await deleteNoteFromSection(noteId);
            toast({ title: 'Not silindi' });
        } catch (error) { toast({ title: 'Silme başarısız', variant: 'destructive' }); }
    };

    const goBack = () => {
        if (currentFolder && currentFolder.parentId) {
            setCurrentFolderId(currentFolder.parentId);
        } else {
            setCurrentFolderId(null);
        }
    };

    // Drag and Drop implementation
    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(KeyboardSensor)
    );

    const [activeId, setActiveId] = useState<string | null>(null);

    const handleDragStart = (event: any) => {
        setActiveId(event.active.id);
    };

    const handleDragEnd = async (event: any) => {
        const { active, over } = event;
        setActiveId(null);

        if (!over) return;
        if (active.id === over.id) return;

        const activeIdStr = String(active.id);
        const overIdStr = String(over.id);

        const isMovingNote = activeIdStr.startsWith('note-');
        const isMovingFolder = activeIdStr.startsWith('folder-');
        const isTargetFolder = overIdStr.startsWith('folder-');

        if (isTargetFolder) {
            const targetFolderId = overIdStr.replace('folder-', '');
            
            if (isMovingNote) {
                const noteId = activeIdStr.replace('note-', '');
                const note = allNotes.find(n => n.id === noteId);
                if (note && note.notebookId !== targetFolderId) {
                    try {
                        // Move note to new folder
                        await deleteNoteFromSection(noteId); // Delete from old
                        await addNoteToSection(familyId!, targetFolderId, 'default', {
                            title: note.title,
                            content: note.content,
                            color: note.color,
                        });
                        toast({ title: "Not taşındı" });
                    } catch (e) {
                        toast({ title: 'Taşıma başarısız', variant: 'destructive' });
                    }
                }
            } else if (isMovingFolder) {
                const folderId = activeIdStr.replace('folder-', '');
                if (folderId !== targetFolderId) {
                    try {
                        // Move folder into folder
                        await updateNotebook(folderId, { parentId: targetFolderId });
                        toast({ title: "Klasör taşındı" });
                    } catch (e) {
                        toast({ title: 'Taşıma başarısız', variant: 'destructive' });
                    }
                }
            }
        }
    };

    const dndItems = [
        ...displayedFolders.map(f => `folder-${f.id}`),
        ...displayedNotes.map(n => `note-${n.id}`)
    ];

    return (
        <div className="flex h-full min-h-[100dvh] flex-col bg-slate-50 dark:bg-slate-950 font-sans text-slate-900 dark:text-slate-50 relative overflow-hidden pb-20">
            {/* Ambient Background */}
            <div className="fixed inset-0 z-0 pointer-events-none opacity-30 dark:opacity-10">
                <div className="absolute top-[-10%] left-[-10%] w-[400px] h-[400px] bg-indigo-300 dark:bg-indigo-800 rounded-full blur-[100px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[300px] h-[300px] bg-fuchsia-300 dark:bg-fuchsia-800 rounded-full blur-[100px]" />
            </div>

            {/* Header */}
            <div className="px-4 py-4 border-b border-slate-200/50 bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl sticky top-0 z-20 shadow-sm flex-shrink-0">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        {currentFolderId ? (
                            <Button variant="ghost" size="icon" onClick={goBack} className="mr-1 text-indigo-600 hover:bg-indigo-50 rounded-full active:scale-90">
                                <ChevronLeft className="w-7 h-7" />
                            </Button>
                        ) : (
                            <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-2 rounded-xl text-white mr-2">
                                <Folder className="w-5 h-5" />
                            </div>
                        )}
                        <h1 className="text-xl md:text-2xl font-black tracking-tight text-slate-900 dark:text-white truncate max-w-[200px] md:max-w-md">
                            {currentFolder ? currentFolder.title : "Notlarım"}
                        </h1>
                    </div>

                    <div className="flex items-center relative group w-1/3 md:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-indigo-500" />
                        <Input
                            placeholder="Ara..."
                            className="pl-9 h-10 bg-slate-100/50 border-slate-200 focus:bg-white rounded-full text-sm shadow-inner"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            {/* Content Area */}
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
                <div className="flex-1 p-4 md:p-6 overflow-y-auto max-w-7xl mx-auto w-full relative z-10 space-y-6">
                    
                    <SortableContext items={dndItems} strategy={rectSortingStrategy}>
                        
                        {displayedFolders.length > 0 && (
                            <div className="mb-6">
                                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 px-1">Klasörler</h3>
                                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                                    {displayedFolders.map((folder, i) => (
                                        <SortableFolder 
                                            key={folder.id} 
                                            folder={folder} 
                                            index={i}
                                            noteCount={getNoteCount(folder.id)}
                                            onClick={() => setCurrentFolderId(folder.id)}
                                            onEdit={() => { setEditingNotebook(folder); setIsFolderFormOpen(true); }}
                                            onDelete={() => handleDeleteFolder(folder.id)}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}

                        {displayedNotes.length > 0 && (
                            <div>
                                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 px-1">Notlar</h3>
                                <div className="columns-2 md:columns-3 lg:columns-4 gap-3 space-y-3">
                                    {displayedNotes.map((note) => (
                                        <SortableNote 
                                            key={note.id} 
                                            note={note}
                                            onEdit={() => { setEditingNote(note); setIsNoteFormOpen(true); }}
                                            onDelete={() => handleDeleteNote(note.id)}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}

                        {displayedFolders.length === 0 && displayedNotes.length === 0 && (
                            <div className="flex flex-col items-center justify-center h-[40vh] text-center px-4 opacity-70">
                                <Folder className="w-16 h-16 text-slate-300 mb-4" />
                                <p className="text-lg font-bold text-slate-500 mb-2">Burası şimdilik boş</p>
                                <p className="text-sm font-medium text-slate-400">Yeni klasör veya not eklemek için sağ alttaki butonu kullanın.</p>
                            </div>
                        )}
                        
                    </SortableContext>
                </div>

                <DragOverlay dropAnimation={defaultDropAnimationSideEffects({ duration: 250 })}>
                    {activeId ? (
                        activeId.startsWith('folder-') ? (
                            <div className="p-4 bg-white rounded-2xl shadow-2xl border-2 border-indigo-500 opacity-90 scale-105 flex items-center gap-3">
                                <Folder className="w-6 h-6 text-indigo-500" />
                                <span className="font-bold">Taşınıyor...</span>
                            </div>
                        ) : (
                            <div className="p-4 bg-[#FFF9C4] rounded-2xl shadow-2xl border-2 border-amber-500 opacity-90 scale-105">
                                <span className="font-bold text-amber-900">Not taşınıyor...</span>
                            </div>
                        )
                    ) : null}
                </DragOverlay>

            </DndContext>

            {/* Floating Action Button */}
            <div className="fixed bottom-[calc(5rem+env(safe-area-inset-bottom))] right-5 md:bottom-8 md:right-8 z-[60]">
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button className="rounded-full w-14 h-14 md:w-16 md:h-16 shadow-xl bg-indigo-600 hover:bg-indigo-700 text-white flex items-center justify-center border border-white/20 active:scale-95 transition-transform">
                            <Plus className="h-7 w-7 md:h-8 md:w-8" strokeWidth={2.5}/>
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" sideOffset={10} className="w-48 rounded-2xl bg-white p-2 shadow-2xl border border-slate-100">
                        <DropdownMenuItem onClick={() => { setEditingNote(null); setIsNoteFormOpen(true); }} className="rounded-xl py-3 px-4 font-bold text-slate-700 focus:bg-slate-50 focus:text-indigo-600 cursor-pointer text-base">
                            <PenLine className="w-5 h-5 mr-3" /> Yeni Not
                        </DropdownMenuItem>
                        <DropdownMenuSeparator className="my-1 bg-slate-100" />
                        <DropdownMenuItem onClick={() => { setEditingNotebook(null); setIsFolderFormOpen(true); }} className="rounded-xl py-3 px-4 font-bold text-slate-700 focus:bg-slate-50 focus:text-indigo-600 cursor-pointer text-base">
                            <Folder className="w-5 h-5 mr-3" /> Yeni Klasör
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>

            {/* Forms */}
            <Dialog open={isFolderFormOpen} onOpenChange={(open) => { if (!open) setEditingNotebook(null); setIsFolderFormOpen(open); }}>
                <DialogContent className="w-[95%] sm:max-w-md bg-white rounded-[2rem] p-6 shadow-2xl border-none">
                    <DialogHeader className="mb-4">
                        <DialogTitle className="text-xl font-black">
                            {editingNotebook ? "Klasörü Düzenle" : "Yeni Klasör"}
                        </DialogTitle>
                    </DialogHeader>
                    <NewNotebookForm onSubmit={handleFolderSubmit} initialData={editingNotebook} />
                </DialogContent>
            </Dialog>

            <Dialog open={isNoteFormOpen} onOpenChange={(open) => { if (!open) setEditingNote(null); setIsNoteFormOpen(open); }}>
                <DialogContent className="w-full h-[100dvh] max-w-none m-0 p-0 border-none flex flex-col z-[70] animate-in slide-in-from-bottom-full duration-300 md:rounded-none bg-transparent [&>button]:hidden">
                    <DialogTitle className="sr-only">Not Düzenleyici</DialogTitle>
                    <Form {...noteForm}>
                        <form onSubmit={noteForm.handleSubmit(handleSaveNote)} className={cn("flex flex-col h-full w-full transition-colors duration-500 shadow-2xl", noteForm.watch('color') || noteColors[0].class)}>
                            
                            <div className="h-14 px-3 flex items-center justify-between border-b border-black/5 bg-white/20 backdrop-blur-md shrink-0">
                                <DialogClose asChild>
                                    <Button variant="ghost" className="text-black/60 hover:bg-black/5 font-bold rounded-full px-4 active:scale-95">İptal</Button>
                                </DialogClose>
                                <span className="font-bold text-black/30 text-[11px] uppercase tracking-[0.2em]">
                                    {editingNote?.id ? "Düzenle" : "Yeni Not"}
                                </span>
                                <Button type="submit" variant="ghost" className="text-indigo-600 hover:bg-black/5 font-black rounded-full px-4 active:scale-95">Bitti</Button>
                            </div>

                           <div className="flex-1 overflow-y-auto w-full [scrollbar-width:none]">
                                <div className="max-w-3xl mx-auto p-5 md:p-8 flex flex-col min-h-full">
                                     <FormField name="title" control={noteForm.control} render={({ field }) => (
                                        <FormItem className="mb-4">
                                            <FormControl>
                                                <input 
                                                    {...field} 
                                                    autoFocus={!editingNote?.id}
                                                    placeholder="Başlık" 
                                                    className="w-full text-2xl md:text-3xl font-black bg-transparent outline-none border-none p-0 placeholder:text-black/30 text-black/90" 
                                                />
                                            </FormControl>
                                        </FormItem>
                                    )}/>
                                    <FormField name="content" control={noteForm.control} render={({ field }) => (
                                        <FormItem className="flex-1">
                                            <FormControl>
                                                <textarea 
                                                    {...field} 
                                                    placeholder="Not yazmaya başla..." 
                                                    className="w-full h-full min-h-[50vh] bg-transparent outline-none border-none resize-none p-0 text-base md:text-lg font-medium leading-relaxed placeholder:text-black/30 text-black/80" 
                                                />
                                            </FormControl>
                                        </FormItem>
                                    )}/>
                                </div>
                            </div>

                            <div className="h-16 px-4 border-t border-black/5 bg-white/20 backdrop-blur-xl flex items-center justify-center shrink-0 overflow-x-auto pb-safe">
                                <FormField name="color" control={noteForm.control} render={({field}) => (
                                    <FormItem>
                                        <FormControl>
                                            <div className="flex items-center gap-4">
                                                {noteColors.map(color => (
                                                    <button 
                                                        key={color.id} 
                                                        type="button" 
                                                        onClick={() => noteForm.setValue('color', color.class)} 
                                                        className={cn(
                                                            "w-8 h-8 rounded-full border-2 transition-all flex items-center justify-center active:scale-90", 
                                                            color.preview,
                                                            noteForm.watch('color') === color.class ? cn(color.ring, "border-white ring-2 scale-110") : "border-black/5 shadow-sm"
                                                        )}
                                                    >
                                                        {noteForm.watch('color') === color.class && <Check className="w-4 h-4 text-black/50" strokeWidth={3} />}
                                                    </button>
                                                ))}
                                            </div>
                                        </FormControl>
                                    </FormItem>
                                )}/>
                            </div>
                        </form>
                    </Form>
                </DialogContent>
            </Dialog>

        </div>
    );
}


// --- DND SORTABLE COMPONENTS ---
function SortableFolder({ folder, index, noteCount, onClick, onEdit, onDelete }: any) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
        id: `folder-${folder.id}`,
        data: { type: 'folder', folder }
    });
    const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1, zIndex: isDragging ? 50 : 1 };
    const theme = notebookThemes[index % notebookThemes.length];

    return (
        <div ref={setNodeRef} style={style} {...attributes} className={cn("relative group flex flex-col justify-between h-28 rounded-2xl border p-3.5 cursor-pointer transition-all active:scale-95 shadow-sm hover:shadow-md", theme.bg, theme.border)} onClick={onClick}>
            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full bg-white/50" onClick={(e) => { e.stopPropagation(); onEdit(); }}><Edit className="w-3.5 h-3.5 text-slate-600" /></Button>
                <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full bg-white/50" onClick={(e) => { e.stopPropagation(); onDelete(); }}><Trash2 className="w-3.5 h-3.5 text-rose-500" /></Button>
            </div>
            
            <div className="flex items-center justify-between mb-2">
                <div className={cn("p-2 rounded-xl bg-white shadow-sm border border-black/5", theme.icon)}>
                    <Folder className="w-6 h-6" strokeWidth={2.5} />
                </div>
                <div {...listeners} className="p-1 cursor-grab opacity-30 hover:opacity-100">
                    <GripVertical className="w-4 h-4" />
                </div>
            </div>
            <div>
                <h3 className={cn("font-bold text-sm leading-tight truncate", theme.text)}>{folder.title}</h3>
                <p className={cn("text-[10px] font-bold uppercase tracking-wider", theme.meta)}>{noteCount} İçerik</p>
            </div>
        </div>
    );
}

function SortableNote({ note, onEdit, onDelete }: any) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
        id: `note-${note.id}`,
        data: { type: 'note', note }
    });
    const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1, zIndex: isDragging ? 50 : 1 };
    
    const colorClass = note.color || noteColors[0].class;
    const contentText = Array.isArray(note.content) ? (note.content.find((b: any) => b.type === 'text')?.data || '') : '';
    const plainText = typeof contentText === 'string' ? contentText.replace(/<[^>]+>/g, '') : '';

    return (
        <div ref={setNodeRef} style={style} {...attributes} onClick={onEdit} className={cn("break-inside-avoid relative group flex flex-col rounded-[1.25rem] transition-all duration-200 cursor-pointer overflow-hidden p-4 shadow-sm hover:shadow-md border border-black/5 active:scale-95", colorClass)}>
            
            <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <div {...listeners} className="p-1 cursor-grab opacity-50 hover:opacity-100 bg-black/5 rounded-full" onClick={e=>e.stopPropagation()}><GripVertical className="w-4 h-4" /></div>
                <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full hover:bg-rose-100 bg-black/5" onClick={(e) => { e.stopPropagation(); onDelete(); }}><Trash2 className="w-3.5 h-3.5 text-rose-500" /></Button>
            </div>
            
            {note.title && (
                <h3 className="font-black text-[15px] leading-tight mb-2 pr-10 tracking-tight opacity-90">{note.title}</h3>
            )}
            <div className="flex-1 overflow-hidden relative">
                <p className={cn("text-[13px] leading-relaxed font-medium whitespace-pre-wrap opacity-75", note.title ? "line-clamp-4" : "line-clamp-6")}>{plainText || "Boş not..."}</p>
                <div className="absolute bottom-0 left-0 right-0 h-6 bg-gradient-to-t from-[var(--tw-gradient-from)] to-transparent pointer-events-none" />
            </div>
            <div className="mt-3 pt-3 border-t border-black/5 flex items-center gap-1.5 opacity-50">
                <CalendarClock className="w-3 h-3" />
                <span className="text-[9px] font-black tracking-widest uppercase">
                    {note.updatedAt ? new Date(note.updatedAt).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' }) : ''}
                </span>
            </div>
        </div>
    );
}
