"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { useAuth } from '@/components/auth-provider';
import { Notebook as NotebookType, Note } from '@/lib/data';
import { onNotebooksUpdate, addNotebook, deleteNotebook, updateNotebook, onNotesUpdate, updateNoteInSection, addNoteToSection, deleteNoteFromSection } from '@/lib/dataService';
import { Button } from '@/components/ui/button';
import { Plus, Trash2, Edit, Search, MoreVertical, Folder, ChevronLeft, PenLine, Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from '@/components/ui/dialog';
import { NewNotebookForm } from '@/components/new-notebook-form';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Form, FormControl, FormField, FormItem } from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragOverlay,
  defaultDropAnimationSideEffects,
} from '@dnd-kit/core';
import { SortableContext, rectSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// --- EASY NOTES PREMIUM COLORS ---
const easyColors = [
    { id: 'yellow', class: 'bg-[#FFEB3B] text-[#5C5300] dark:bg-[#F9A825] dark:text-[#FFFDE7]', editor: 'bg-[#FFF9C4] dark:bg-[#F57F17]', preview: 'bg-[#FFEB3B]', border: 'border-[#FBC02D] dark:border-[#F57F17]' },
    { id: 'orange', class: 'bg-[#FFB74D] text-[#5E3500] dark:bg-[#EF6C00] dark:text-[#FFF3E0]', editor: 'bg-[#FFE0B2] dark:bg-[#E65100]', preview: 'bg-[#FFB74D]', border: 'border-[#FFA726] dark:border-[#E65100]' },
    { id: 'red',    class: 'bg-[#FF8A80] text-[#610000] dark:bg-[#D50000] dark:text-[#FFEBEE]', editor: 'bg-[#FFCDD2] dark:bg-[#B71C1C]', preview: 'bg-[#FF8A80]', border: 'border-[#FF5252] dark:border-[#B71C1C]' },
    { id: 'pink',   class: 'bg-[#F48FB1] text-[#63002B] dark:bg-[#C2185B] dark:text-[#FCE4EC]', editor: 'bg-[#F8BBD0] dark:bg-[#880E4F]', preview: 'bg-[#F48FB1]', border: 'border-[#F06292] dark:border-[#880E4F]' },
    { id: 'purple', class: 'bg-[#CE93D8] text-[#3B004A] dark:bg-[#7B1FA2] dark:text-[#F3E5F5]', editor: 'bg-[#E1BEE7] dark:bg-[#4A148C]', preview: 'bg-[#CE93D8]', border: 'border-[#BA68C8] dark:border-[#4A148C]' },
    { id: 'blue',   class: 'bg-[#90CAF9] text-[#003461] dark:bg-[#1976D2] dark:text-[#E3F2FD]', editor: 'bg-[#BBDEFB] dark:bg-[#0D47A1]', preview: 'bg-[#90CAF9]', border: 'border-[#64B5F6] dark:border-[#0D47A1]' },
    { id: 'cyan',   class: 'bg-[#80DEEA] text-[#004D57] dark:bg-[#0097A7] dark:text-[#E0F7FA]', editor: 'bg-[#B2EBF2] dark:bg-[#006064]', preview: 'bg-[#80DEEA]', border: 'border-[#4DD0E1] dark:border-[#006064]' },
    { id: 'green',  class: 'bg-[#A5D6A7] text-[#0F4712] dark:bg-[#388E3C] dark:text-[#E8F5E9]', editor: 'bg-[#C8E6C9] dark:bg-[#1B5E20]', preview: 'bg-[#A5D6A7]', border: 'border-[#81C784] dark:border-[#1B5E20]' },
    { id: 'white',  class: 'bg-white text-slate-800 dark:bg-slate-800 dark:text-slate-100', editor: 'bg-[#F8FAFC] dark:bg-slate-900', preview: 'bg-slate-200 dark:bg-slate-700', border: 'border-slate-200 dark:border-slate-700' },
];

const FOLDER_GRADIENTS = [
    'from-indigo-500 to-purple-600',
    'from-emerald-400 to-teal-500',
    'from-amber-400 to-orange-500',
    'from-rose-400 to-pink-500',
    'from-blue-400 to-cyan-500',
    'from-violet-500 to-fuchsia-600',
];

const noteFormSchema = z.object({
    title: z.string().default(""),
    content: z.string().optional().default(""),
    colorId: z.string().optional(),
    notebookId: z.string().optional(),
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
    const [passwordPrompt, setPasswordPrompt] = useState<{ folderId: string, expected: string } | null>(null);
    const [passwordInput, setPasswordInput] = useState("");
    
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
            let foundColorId = 'white';
            if (editingNote.color) {
                const match = easyColors.find(c => c.id === editingNote.color || editingNote.color?.includes(c.id));
                if (match) foundColorId = match.id;
            }

            noteForm.reset({
                title: editingNote.title,
                content: editingNote.content[0]?.data || '',
                colorId: foundColorId,
                notebookId: editingNote.notebookId || currentFolderId || 'root'
            });
        }
    }, [editingNote, noteForm, currentFolderId]);

    // Data Helpers
    const currentFolder = useMemo(() => notebooks.find(n => n.id === currentFolderId) || null, [notebooks, currentFolderId]);
    
    const displayedFolders = useMemo(() => {
        const targetParentId = currentFolderId || 'root';
        let filtered = notebooks.filter(n => (n.parentId || 'root') === targetParentId);
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

    // Actions
    const handleFolderSubmit = async (data: Omit<NotebookType, 'id' | 'familyId' | 'createdAt' | 'ownerId'>) => {
        if (!user) return;
        try {
            const finalParentId = data.parentId === 'root' ? null : data.parentId;
            const payload = { ...data, parentId: finalParentId };
            
            if (editingNotebook) {
                await updateNotebook(editingNotebook.id, payload);
            } else {
                await addNotebook(payload);
            }
            setIsFolderFormOpen(false);
            setEditingNotebook(null);
        } catch (error) { toast({ title: 'Hata', variant: 'destructive' }); }
    };

    const handleDeleteFolder = async (notebookId: string) => {
        try { 
            await deleteNotebook(notebookId); 
            if(currentFolderId === notebookId) setCurrentFolderId(null);
        } catch (error) {}
    };

    const handleSaveNote = async (data: NoteFormData) => {
        if (!familyId) return;
        try {
            const notePayload = {
                title: data.title.trim() || 'İsimsiz Not',
                content: [{ id: '1', type: 'text' as const, data: data.content || '' }],
                color: data.colorId || 'white',
                notebookId: data.notebookId || currentFolderId || 'root',
            };

            if (editingNote && editingNote.id) {
                await updateNoteInSection(editingNote.notebookId, editingNote.id, notePayload);
            } else {
                await addNoteToSection(familyId, notePayload.notebookId, 'default', notePayload);
            }
            setIsNoteFormOpen(false);
            setEditingNote(null);
        } catch (error) { toast({ title: 'Hata', variant: 'destructive' }); }
    };

    const handleDeleteNote = async (noteId: string) => {
        try { await deleteNoteFromSection(noteId); } catch (error) {}
    };

    // Drag and Drop (Reordering visually)
    const sensors = useSensors(
        useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
        useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } }),
        useSensor(KeyboardSensor)
    );
    const [activeId, setActiveId] = useState<string | null>(null);
    const handleDragStart = (event: any) => setActiveId(event.active.id);
    const handleDragEnd = async (event: any) => { setActiveId(null); };

    const dndItems = displayedNotes.map(n => `note-${n.id}`);

    const formatDate = (dateString?: string) => {
        if (!dateString) return '';
        const d = new Date(dateString);
        return d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
    };

    const selectedEditorColorObj = easyColors.find(c => c.id === noteForm.watch('colorId')) || easyColors.find(c => c.id === 'white');

    return (
        <div className="flex h-[100dvh] flex-col bg-gradient-to-br from-indigo-50 via-violet-50 to-purple-50 dark:from-indigo-950/50 dark:via-violet-950/30 dark:to-slate-950 font-sans text-slate-900 dark:text-slate-50 relative">
            
            {/* Header with Navigation */}
            <div className="px-4 md:px-8 pt-8 pb-4 shrink-0 z-20">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        {currentFolderId !== null && (
                            <Button variant="ghost" size="icon" onClick={() => setCurrentFolderId(currentFolder?.parentId && currentFolder.parentId !== 'root' ? currentFolder.parentId : null)}
                                className="h-10 w-10 rounded-full bg-white dark:bg-slate-800 shadow-sm text-slate-600 dark:text-slate-300">
                                <ChevronLeft className="w-6 h-6" />
                            </Button>
                        )}
                        <h1 className="text-3xl md:text-4xl font-[900] tracking-tight bg-gradient-to-r from-slate-900 to-slate-600 dark:from-white dark:to-slate-400 bg-clip-text text-transparent truncate max-w-[200px] sm:max-w-none">
                            {currentFolderId === null ? "Notlar" : currentFolder?.title}
                        </h1>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="relative group hidden sm:block w-48 lg:w-64">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <Input placeholder="Notlarda ara..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-9 h-10 bg-white dark:bg-slate-800 border-none rounded-2xl shadow-sm focus:ring-2 focus:ring-pink-500 transition-all font-medium"
                            />
                        </div>
                        <Button variant="ghost" size="icon" className="sm:hidden rounded-full w-10 h-10 bg-white dark:bg-slate-800 shadow-sm text-slate-600 dark:text-slate-300">
                            <Search className="w-5 h-5" />
                        </Button>
                    </div>
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto px-4 md:px-8 w-full relative z-10 pb-32 [scrollbar-width:none]">
                <div className="max-w-7xl mx-auto pt-2">
                    
                    {/* Folders */}
                    {displayedFolders.length > 0 || currentFolderId === null ? (
                        currentFolderId === null ? (
                            /* Root Folders as Large Shopping-Style Cards */
                            <>
                                <h2 className="text-[11px] font-black tracking-widest text-slate-400 dark:text-slate-500 mb-3 ml-1 uppercase">Klasörlerım</h2>
                                <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
                                    {displayedFolders.map((folder, idx) => (
                                        <NotebookCard 
                                            key={folder.id} 
                                            notebook={folder} 
                                            index={idx}
                                            onClick={() => {
                                                if (folder.password) { setPasswordPrompt({ folderId: folder.id, expected: folder.password }); }
                                                else { setCurrentFolderId(folder.id); }
                                            }}
                                            onEdit={() => { setEditingNotebook(folder); setIsFolderFormOpen(true); }}
                                            onDelete={() => handleDeleteFolder(folder.id)}
                                        />
                                    ))}
                                    {/* Add Folder Card */}
                                    <div onClick={() => { setEditingNotebook(null); setIsFolderFormOpen(true); }}
                                        className="group rounded-[1.5rem] cursor-pointer transition-all duration-300 hover:scale-[1.02] active:scale-[0.97] min-h-[180px] flex flex-col justify-center items-center border-2 border-dashed border-indigo-200 dark:border-indigo-800 hover:border-indigo-400 hover:bg-indigo-50/50 dark:hover:bg-indigo-900/30 p-5">
                                        <div className="p-3 bg-indigo-100 dark:bg-indigo-900/50 rounded-full group-hover:bg-indigo-200 transition-colors mb-3">
                                            <Plus className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
                                        </div>
                                        <span className="font-bold text-indigo-600 dark:text-indigo-400">Yeni Klasör</span>
                                    </div>
                                </div>
                            </>
                        ) : (
                            /* Subfolders as Small Pills */
                            <div className="overflow-x-auto [scrollbar-width:none] -mx-4 px-4 md:mx-0 md:px-0 mb-6">
                                <div className="flex gap-2">
                                    {displayedFolders.map(folder => (
                                        <DropdownMenu key={folder.id}>
                                            <DropdownMenuTrigger asChild>
                                                <button onClick={() => {
                                                        if (folder.password) { setPasswordPrompt({ folderId: folder.id, expected: folder.password }); }
                                                        else { setCurrentFolderId(folder.id); }
                                                    }}
                                                    className="px-5 py-2 rounded-full font-bold text-sm whitespace-nowrap transition-all shadow-sm active:scale-95 flex items-center gap-2 bg-white text-indigo-600 dark:bg-slate-800 dark:text-indigo-300 border border-indigo-100 dark:border-slate-700/50 hover:bg-indigo-50"
                                                >
                                                    <Folder className="w-4 h-4" /> {folder.title}
                                                </button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="center" className="rounded-2xl border-0 shadow-xl min-w-[140px] p-2">
                                                <DropdownMenuItem onClick={() => { setEditingNotebook(folder); setIsFolderFormOpen(true); }} className="rounded-xl font-bold py-2.5">Düzenle</DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => handleDeleteFolder(folder.id)} className="rounded-xl font-bold py-2.5 text-rose-500">Sil</DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    ))}
                                    <button onClick={() => { setEditingNotebook(null); setIsFolderFormOpen(true); }}
                                        className="px-4 py-2 rounded-full font-bold text-sm whitespace-nowrap transition-all border border-dashed border-indigo-300 text-indigo-500 hover:bg-indigo-50 active:scale-95 flex items-center"
                                    >
                                        <Plus className="w-4 h-4 mr-1" /> Klasör
                                    </button>
                                </div>
                            </div>
                        )
                    ) : null}

                    {/* Notes Grid */}
                    {displayedNotes.length > 0 ? (
                        <>
                            {displayedFolders.length > 0 && <h2 className="text-lg font-black text-slate-400 dark:text-slate-500 mb-4 ml-1">Notlar</h2>}
                            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
                                <SortableContext items={dndItems} strategy={rectSortingStrategy}>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4 md:gap-5">
                                        {displayedNotes.map((note) => (
                                            <SortableNoteCard 
                                                key={note.id} 
                                                note={note}
                                                dateStr={formatDate(note.updatedAt)}
                                                onEdit={() => { setEditingNote(note); setIsNoteFormOpen(true); }}
                                                onDelete={() => handleDeleteNote(note.id)}
                                            />
                                        ))}
                                    </div>
                                </SortableContext>
                                <DragOverlay dropAnimation={defaultDropAnimationSideEffects({ duration: 250 })}>
                                    {activeId ? (
                                        <div className="w-32 h-32 bg-white rounded-[24px] shadow-2xl opacity-90 scale-105"></div>
                                    ) : null}
                                </DragOverlay>
                            </DndContext>
                        </>
                    ) : (
                        currentFolderId !== null && (
                            <div className="flex flex-col items-center justify-center mt-12 text-center opacity-50">
                                <PenLine className="w-12 h-12 text-slate-400 mb-4" strokeWidth={1} />
                                <h3 className="text-lg font-bold text-slate-700 dark:text-slate-200">Bu klasörde not yok</h3>
                            </div>
                        )
                    )}
                </div>
            </div>

            {/* Premium FAB (Floating Action Button) */}
            <div className="fixed bottom-6 md:bottom-8 left-1/2 -translate-x-1/2 md:left-auto md:translate-x-0 md:right-8 z-50">
                <Button onClick={() => { setEditingNote(null); noteForm.reset({ title: "", content: "", colorId: 'yellow', notebookId: currentFolderId || 'root' }); setIsNoteFormOpen(true); }} 
                    className="rounded-full h-16 px-8 shadow-2xl shadow-pink-500/30 bg-gradient-to-r from-pink-500 via-rose-500 to-orange-400 hover:from-pink-600 hover:to-orange-500 text-white flex items-center justify-center active:scale-90 transition-all font-black text-lg gap-2 border-none">
                    <Plus className="h-6 w-6" strokeWidth={3}/> Yeni Not
                </Button>
            </div>

            {/* Editor Dialog (Premium Colors) */}
            <Dialog open={isNoteFormOpen} onOpenChange={(open) => { if (!open) setEditingNote(null); setIsNoteFormOpen(open); }}>
                <DialogContent className={cn("w-full h-[100dvh] max-w-none m-0 p-0 border-0 flex flex-col z-[70] animate-in slide-in-from-bottom-full duration-500 md:rounded-none [&>button]:hidden transition-colors", selectedEditorColorObj?.editor)}>
                    <DialogTitle className="sr-only">Not Düzenleyici</DialogTitle>
                    <Form {...noteForm}>
                        <form onSubmit={noteForm.handleSubmit(handleSaveNote)} className="flex flex-col h-full w-full">
                            
                            {/* Editor Toolbar */}
                            <div className="h-16 px-4 flex items-center justify-between shrink-0 bg-transparent">
                                <DialogClose asChild>
                                    <Button variant="ghost" size="icon" className="text-current rounded-full active:scale-95 bg-black/5 hover:bg-black/10 dark:bg-white/5 dark:hover:bg-white/10">
                                        <ChevronLeft className="w-6 h-6" strokeWidth={2} />
                                    </Button>
                                </DialogClose>
                                
                                <div className="flex items-center gap-2">
                                    <Button type="submit" variant="ghost" className="font-black text-sm rounded-full text-current active:scale-95 px-6 bg-black/5 hover:bg-black/10 dark:bg-white/5 dark:hover:bg-white/10 h-10">Bitti</Button>
                                </div>
                            </div>

                            {/* Editor Body */}
                            <div className="flex-1 overflow-y-auto w-full [scrollbar-width:none]">
                                <div className="max-w-3xl mx-auto px-6 md:px-12 py-4 flex flex-col min-h-full">
                                    
                                    {/* Color & Folder Selector */}
                                    <div className="flex items-center gap-4 mb-6 pb-6 border-b border-black/5 dark:border-white/5 overflow-x-auto [scrollbar-width:none]">
                                        <div className="flex gap-2">
                                            {easyColors.map(color => (
                                                <button key={color.id} type="button" onClick={() => noteForm.setValue('colorId', color.id)} 
                                                    className={cn("w-10 h-10 rounded-full border border-black/10 flex items-center justify-center transition-all shrink-0", color.preview, noteForm.watch('colorId') === color.id ? "scale-110 shadow-md ring-2 ring-offset-2 ring-black/20" : "")}
                                                >
                                                    {noteForm.watch('colorId') === color.id && <Check className="w-5 h-5 text-black/40" strokeWidth={3} />}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <FormField name="title" control={noteForm.control} render={({ field }) => (
                                        <FormItem className="mb-2">
                                            <FormControl>
                                                <input {...field} autoFocus={!editingNote?.id} placeholder="Başlık" className="w-full text-3xl font-[900] bg-transparent outline-none border-none p-0 placeholder:text-current/30 text-current" />
                                            </FormControl>
                                        </FormItem>
                                    )}/>
                                    <p className="text-xs font-bold text-current/40 mb-6">
                                        {new Date(editingNote?.updatedAt || new Date()).toLocaleString('tr-TR', { day: 'numeric', month: 'long', hour: '2-digit', minute:'2-digit' })}
                                        {currentFolder && <span className="ml-2 px-2 py-0.5 bg-black/5 rounded-full">{currentFolder.title}</span>}
                                    </p>

                                    <FormField name="content" control={noteForm.control} render={({ field }) => (
                                        <FormItem className="flex-1">
                                            <FormControl>
                                                <textarea {...field} placeholder="Not yazmaya başla..." className="w-full h-full min-h-[60vh] bg-transparent outline-none border-none resize-none p-0 text-lg font-medium leading-relaxed placeholder:text-current/30 text-current" />
                                            </FormControl>
                                        </FormItem>
                                    )}/>
                                </div>
                            </div>
                        </form>
                    </Form>
                </DialogContent>
            </Dialog>

            {/* Folder Dialog */}
            <Dialog open={isFolderFormOpen} onOpenChange={(open) => { if (!open) setEditingNotebook(null); setIsFolderFormOpen(open); }}>
                <DialogContent className="w-[95%] sm:max-w-md bg-white dark:bg-slate-900 rounded-[2rem] p-6 shadow-2xl border-0">
                    <DialogHeader className="mb-4 text-left">
                        <DialogTitle className="text-2xl font-black">{editingNotebook ? "Klasörü Düzenle" : "Yeni Kategori"}</DialogTitle>
                    </DialogHeader>
                    <NewNotebookForm onSubmit={handleFolderSubmit} initialData={editingNotebook} availableFolders={notebooks} currentFolderId={currentFolderId} />
                </DialogContent>
            </Dialog>

        </div>
    );
}

// --- SHOPPING STYLE FOLDER CARD ---
function NotebookCard({ notebook, index, onClick, onEdit, onDelete }: any) {
    const gradient = FOLDER_GRADIENTS[index % FOLDER_GRADIENTS.length];
    return (
        <div onClick={onClick}
            className={cn(
                "group relative rounded-[1.5rem] overflow-hidden cursor-pointer transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl active:scale-[0.97] min-h-[180px] flex flex-col justify-between p-5",
                `bg-gradient-to-br ${gradient}`
            )}>
            {/* Subtle pattern overlay */}
            <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 20% 80%, white 1px, transparent 1px), radial-gradient(circle at 80% 20%, white 1px, transparent 1px)', backgroundSize: '30px 30px' }} />

            {/* Top row */}
            <div className="flex items-start justify-between relative z-10">
                <div className="p-2.5 bg-white/20 backdrop-blur-sm rounded-2xl">
                    <Folder className="h-6 w-6 text-white" />
                </div>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon"
                            className="h-8 w-8 rounded-full bg-white/20 hover:bg-white/30 text-white active:scale-95"
                            onClick={e => e.stopPropagation()}>
                            <MoreVertical className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-xl shadow-xl w-44 p-1">
                        <DropdownMenuItem onClick={e => { e.stopPropagation(); onEdit(); }} className="cursor-pointer rounded-lg gap-2"><Edit className="h-4 w-4 text-slate-500" />Düzenle</DropdownMenuItem>
                        <DropdownMenuSeparator className="bg-slate-100 dark:bg-slate-800" />
                        <DropdownMenuItem onClick={e => { e.stopPropagation(); onDelete(); }} className="text-rose-600 hover:bg-rose-50 cursor-pointer rounded-lg gap-2"><Trash2 className="h-4 w-4" />Sil</DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>

            {/* Bottom info */}
            <div className="relative z-10 mt-6">
                <h3 className="font-black text-xl text-white leading-snug drop-shadow-sm">{notebook.title}</h3>
            </div>
        </div>
    );
}


// --- DND SORTABLE COMPONENTS ---
function SortableNoteCard({ note, dateStr, onEdit, onDelete }: any) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
        id: `note-${note.id}`,
        data: { type: 'note', note }
    });
    const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1, zIndex: isDragging ? 50 : 1 };
    
    let colorObj = easyColors.find(c => c.id === note.color) || easyColors.find(c => note.color?.includes(c.id));
    if (!colorObj) colorObj = easyColors.find(c => c.id === 'white');

    const contentText = Array.isArray(note.content) ? (note.content.find((b: any) => b.type === 'text')?.data || '') : '';
    const plainText = typeof contentText === 'string' ? contentText.replace(/<[^>]+>/g, '') : '';

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <div ref={setNodeRef} style={style} {...attributes} {...listeners} onClick={onEdit} 
                    className={cn(
                        "flex flex-col h-44 sm:h-52 p-4 md:p-5 rounded-[24px] cursor-pointer shadow-sm hover:shadow-lg active:scale-[0.97] transition-all overflow-hidden border",
                        colorObj?.class, colorObj?.border
                    )}
                >
                    <h3 className="font-black text-base sm:text-lg leading-tight mb-2 truncate pr-4">{note.title || "İsimsiz Not"}</h3>
                    <p className="text-xs sm:text-sm opacity-70 flex-1 overflow-hidden font-medium" style={{ display: '-webkit-box', WebkitLineClamp: 4, WebkitBoxOrient: 'vertical', lineHeight: '1.5' }}>
                        {plainText || "İçerik yok..."}
                    </p>
                    <div className="mt-3 text-[10px] sm:text-xs font-bold opacity-50 shrink-0 flex items-center gap-1.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-current opacity-50"></div>
                        {dateStr}
                    </div>
                </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="rounded-2xl w-40 p-2 shadow-xl border-0 font-bold">
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(); }} className="rounded-xl py-2.5 cursor-pointer"><Edit className="w-4 h-4 mr-2" /> Düzenle</DropdownMenuItem>
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onDelete(); }} className="rounded-xl py-2.5 cursor-pointer text-rose-500 focus:bg-rose-50"><Trash2 className="w-4 h-4 mr-2" /> Sil</DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
