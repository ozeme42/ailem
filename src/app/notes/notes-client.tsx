"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { useAuth } from '@/components/auth-provider';
import { Notebook as NotebookType, Note } from '@/lib/data';
import { onNotebooksUpdate, addNotebook, deleteNotebook, updateNotebook, onNotesUpdate, updateNoteInSection, addNoteToSection, deleteNoteFromSection } from '@/lib/dataService';
import { Button } from '@/components/ui/button';
import { Plus, Trash2, Edit, Search, MoreVertical, Folder, ChevronLeft, CalendarClock, PenLine, GripVertical, Check, FolderOpen } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose, DialogFooter } from '@/components/ui/dialog';
import { NewNotebookForm } from '@/components/new-notebook-form';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Form, FormControl, FormField, FormItem } from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useRouter } from 'next/navigation';

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

// --- TASARIM SABİTLERİ (SAMSUNG NOTES STİLİ) ---
const notebookThemes = [
    { bg: "bg-slate-100 dark:bg-slate-800", text: "text-slate-800 dark:text-slate-200" },
    { bg: "bg-indigo-100 dark:bg-indigo-900/40", text: "text-indigo-800 dark:text-indigo-300" },
    { bg: "bg-emerald-100 dark:bg-emerald-900/40", text: "text-emerald-800 dark:text-emerald-300" },
    { bg: "bg-amber-100 dark:bg-amber-900/40", text: "text-amber-800 dark:text-amber-300" },
    { bg: "bg-rose-100 dark:bg-rose-900/40", text: "text-rose-800 dark:text-rose-300" },
];

const noteColors = [
    { id: 'white',   class: 'bg-white text-slate-800 dark:bg-slate-900 dark:text-slate-200 border-slate-200 dark:border-slate-800', preview: 'bg-white border-slate-200', ring: 'ring-slate-300' },
    { id: 'yellow',  class: 'bg-[#fff5d1] text-[#78600C] dark:bg-yellow-900/30 dark:text-yellow-200 border-[#ffe082] dark:border-yellow-800/50', preview: 'bg-[#ffe082]', ring: 'ring-yellow-400' },
    { id: 'blue',    class: 'bg-[#e3f2fd] text-[#0C4A6E] dark:bg-sky-900/30 dark:text-sky-200 border-[#bbdefb] dark:border-sky-800/50', preview: 'bg-[#bbdefb]', ring: 'ring-sky-400' },
    { id: 'green',   class: 'bg-[#e8f5e9] text-[#064E3B] dark:bg-emerald-900/30 dark:text-emerald-200 border-[#c8e6c9] dark:border-emerald-800/50', preview: 'bg-[#c8e6c9]', ring: 'ring-emerald-400' },
    { id: 'pink',    class: 'bg-[#fce4ec] text-[#831843] dark:bg-pink-900/30 dark:text-pink-200 border-[#f8bbd0] dark:border-pink-800/50', preview: 'bg-[#f8bbd0]', ring: 'ring-pink-400' },
    { id: 'purple',  class: 'bg-[#f3e5f5] text-[#4C1D95] dark:bg-purple-900/30 dark:text-purple-200 border-[#e1bee7] dark:border-purple-800/50', preview: 'bg-[#e1bee7]', ring: 'ring-purple-400' },
];

const noteFormSchema = z.object({
    title: z.string().default(""),
    content: z.string().optional().default(""),
    color: z.string().optional(),
    notebookId: z.string().optional(),
});
type NoteFormData = z.infer<typeof noteFormSchema>;

export function NotesClient() {
    const { user, familyId } = useAuth();
    const { toast } = useToast();
    const router = useRouter();

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
            noteForm.reset({
                title: editingNote.title,
                content: editingNote.content[0]?.data || '',
                color: editingNote.color || noteColors[0].class,
                notebookId: editingNote.notebookId || currentFolderId || 'root'
            });
        }
    }, [editingNote, noteForm, currentFolderId]);

    // Data Helpers
    const currentFolder = useMemo(() => notebooks.find(n => n.id === currentFolderId) || null, [notebooks, currentFolderId]);
    
    const displayedFolders = useMemo(() => {
        let filtered = notebooks.filter(n => (n.parentId === 'root' ? null : (n.parentId || null)) === currentFolderId);
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
                toast({ title: 'Klasör Güncellendi!' });
            } else {
                await addNotebook(payload);
                toast({ title: 'Yeni Klasör Oluşturuldu!' });
            }
            setIsFolderFormOpen(false);
            setEditingNotebook(null);
        } catch (error) { toast({ title: 'Hata', variant: 'destructive' }); }
    };

    const handleDeleteFolder = async (notebookId: string) => {
        try { 
            await deleteNotebook(notebookId); 
            toast({ title: 'Klasör Silindi' }); 
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
                notebookId: data.notebookId || currentFolderId || 'root',
            };

            const targetNotebookId = notePayload.notebookId;

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
        if (currentFolder && currentFolder.parentId && currentFolder.parentId !== 'root') {
            setCurrentFolderId(currentFolder.parentId);
        } else if (currentFolderId) {
            setCurrentFolderId(null);
        } else {
            router.push('/');
        }
    };

    // Drag and Drop
    const sensors = useSensors(
        useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
        useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } }),
        useSensor(KeyboardSensor)
    );

    const [activeId, setActiveId] = useState<string | null>(null);
    const handleDragStart = (event: any) => setActiveId(event.active.id);
    const handleDragEnd = async (event: any) => {
        const { active, over } = event;
        setActiveId(null);

        if (!over) return;
        if (active.id === over.id) return;

        const activeIdStr = String(active.id);
        const overIdStr = String(over.id);

        const isMovingNote = activeIdStr.startsWith('note-');
        const isTargetFolder = overIdStr.startsWith('folder-');

        if (isTargetFolder && isMovingNote) {
            const targetFolderId = overIdStr.replace('folder-', '');
            const noteId = activeIdStr.replace('note-', '');
            const note = allNotes.find(n => n.id === noteId);
            if (note && note.notebookId !== targetFolderId) {
                try {
                    await deleteNoteFromSection(noteId);
                    await addNoteToSection(familyId!, targetFolderId, 'default', {
                        title: note.title,
                        content: note.content,
                        color: note.color,
                    });
                    toast({ title: "Not klasöre taşındı" });
                } catch (e) {
                    toast({ title: 'Taşıma başarısız', variant: 'destructive' });
                }
            }
        }
    };

    const dndItems = [
        ...displayedFolders.map(f => `folder-${f.id}`),
        ...displayedNotes.map(n => `note-${n.id}`)
    ];

    return (
        <div className="flex h-[100dvh] flex-col bg-[#F5F5F5] dark:bg-[#000000] font-sans text-[#212121] dark:text-[#FAFAFA] relative overflow-hidden">
            
            {/* Header - Samsung Notes Style (Big, Clean) */}
            <div className="pt-12 md:pt-16 px-6 pb-2 shrink-0 bg-[#F5F5F5] dark:bg-[#000000] z-20">
                <div className="max-w-7xl mx-auto flex flex-col gap-4">
                    <div className="flex items-center gap-1">
                        {currentFolderId && (
                            <Button variant="ghost" size="icon" onClick={goBack} className="rounded-full -ml-3 mr-2 active:scale-95 text-[#212121] dark:text-[#FAFAFA]">
                                <ChevronLeft className="w-8 h-8" />
                            </Button>
                        )}
                        <h1 className="text-3xl md:text-4xl font-[800] tracking-tight truncate flex-1">
                            {currentFolder ? currentFolder.title : "Tüm notlar"}
                        </h1>
                        <Button variant="ghost" size="icon" className="rounded-full active:scale-95 text-[#212121] dark:text-[#FAFAFA]">
                            <Search className="w-6 h-6" />
                        </Button>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="rounded-full active:scale-95 text-[#212121] dark:text-[#FAFAFA]">
                                    <MoreVertical className="w-6 h-6" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48 rounded-2xl p-2 shadow-xl border-0 bg-white dark:bg-[#252525]">
                                <DropdownMenuItem onClick={() => { setEditingNotebook(null); setIsFolderFormOpen(true); }} className="rounded-xl py-3 px-4 font-bold text-base cursor-pointer">
                                    <Folder className="w-5 h-5 mr-3" /> Klasör oluştur
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto px-4 md:px-6 pb-24 w-full relative z-10 [scrollbar-width:none]">
                <div className="max-w-7xl mx-auto space-y-6 pt-2">
                    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
                        <SortableContext items={dndItems} strategy={rectSortingStrategy}>
                            
                            {/* Folders (Chips) */}
                            {displayedFolders.length > 0 && (
                                <div className="flex gap-2 overflow-x-auto pb-2 [scrollbar-width:none]">
                                    {currentFolderId === null && displayedFolders.map((folder, i) => (
                                        <SortableFolderChip 
                                            key={folder.id} 
                                            folder={folder} 
                                            index={i}
                                            onClick={() => {
                                                if (folder.password) {
                                                    setPasswordPrompt({ folderId: folder.id, expected: folder.password });
                                                } else {
                                                    setCurrentFolderId(folder.id);
                                                }
                                            }}
                                            onEdit={() => { setEditingNotebook(folder); setIsFolderFormOpen(true); }}
                                            onDelete={() => handleDeleteFolder(folder.id)}
                                        />
                                    ))}
                                </div>
                            )}

                            {/* Notes (Grid) */}
                            {displayedNotes.length > 0 && (
                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-4 mt-4">
                                    {displayedNotes.map((note) => (
                                        <SortableNoteCard 
                                            key={note.id} 
                                            note={note}
                                            onEdit={() => { setEditingNote(note); setIsNoteFormOpen(true); }}
                                            onDelete={() => handleDeleteNote(note.id)}
                                        />
                                    ))}
                                </div>
                            )}

                            {displayedFolders.length === 0 && displayedNotes.length === 0 && (
                                <div className="flex flex-col items-center justify-center h-[50vh] text-center px-4 opacity-50">
                                    <PenLine className="w-20 h-20 text-[#212121] dark:text-[#FAFAFA] mb-6 opacity-20" strokeWidth={1} />
                                    <p className="text-xl font-bold text-[#212121] dark:text-[#FAFAFA] mb-2">Not yok</p>
                                    <p className="text-sm font-medium">Sağ alt köşedeki butona dokunarak ilk notunuzu oluşturun.</p>
                                </div>
                            )}
                            
                        </SortableContext>
                        
                        <DragOverlay dropAnimation={defaultDropAnimationSideEffects({ duration: 250 })}>
                            {activeId ? (
                                activeId.startsWith('folder-') ? (
                                    <div className="px-4 py-2 bg-indigo-500 rounded-full shadow-2xl opacity-90 scale-105 flex items-center gap-2 text-white">
                                        <Folder className="w-4 h-4" /> Klasör...
                                    </div>
                                ) : (
                                    <div className="w-40 h-40 bg-white rounded-3xl shadow-2xl border border-slate-200 opacity-90 scale-105">
                                    </div>
                                )
                            ) : null}
                        </DragOverlay>

                    </DndContext>
                </div>
            </div>

            {/* FAB */}
            <div className="fixed bottom-6 right-6 md:bottom-8 md:right-8 z-50">
                <Button onClick={() => { setEditingNote(null); noteForm.reset({ title: "", content: "", color: noteColors[0].class, notebookId: currentFolderId || 'root' }); setIsNoteFormOpen(true); }} 
                    className="rounded-[1.5rem] w-16 h-16 shadow-lg bg-[#E0E0E0] hover:bg-[#D6D6D6] dark:bg-[#323232] dark:hover:bg-[#404040] text-[#212121] dark:text-[#FAFAFA] flex items-center justify-center active:scale-90 transition-transform">
                    <PenLine className="h-6 w-6" strokeWidth={2}/>
                </Button>
            </div>

            {/* Editor Dialog */}
            <Dialog open={isNoteFormOpen} onOpenChange={(open) => { if (!open) setEditingNote(null); setIsNoteFormOpen(open); }}>
                <DialogContent className="w-full h-[100dvh] max-w-none m-0 p-0 border-0 flex flex-col z-[70] animate-in slide-in-from-bottom-full duration-300 md:rounded-none bg-[#F5F5F5] dark:bg-[#000000] [&>button]:hidden">
                    <DialogTitle className="sr-only">Not Düzenleyici</DialogTitle>
                    <Form {...noteForm}>
                        <form onSubmit={noteForm.handleSubmit(handleSaveNote)} className={cn("flex flex-col h-full w-full transition-colors duration-500", noteForm.watch('color') || noteColors[0].class)}>
                            
                            {/* Editor Toolbar */}
                            <div className="h-16 px-2 flex items-center justify-between shrink-0">
                                <DialogClose asChild>
                                    <Button variant="ghost" size="icon" className="text-current rounded-full active:scale-95"><ChevronLeft className="w-8 h-8" /></Button>
                                </DialogClose>
                                
                                <div className="flex items-center gap-1">
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon" className="text-current rounded-full active:scale-95"><FolderOpen className="w-5 h-5" /></Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end" className="w-48 rounded-2xl">
                                            <FormField name="notebookId" control={noteForm.control} render={({ field }) => (
                                                <FormItem>
                                                    <Select onValueChange={field.onChange} defaultValue={field.value || currentFolderId || 'root'}>
                                                        <FormControl>
                                                            <SelectTrigger className="border-0 shadow-none focus:ring-0">
                                                                <SelectValue placeholder="Klasör seç" />
                                                            </SelectTrigger>
                                                        </FormControl>
                                                        <SelectContent>
                                                            <SelectItem value="root">Ana Dizin</SelectItem>
                                                            {notebooks.filter(nb => nb.parentId !== 'root').map(nb => (
                                                                <SelectItem key={nb.id} value={nb.id}>{nb.title}</SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </FormItem>
                                            )} />
                                        </DropdownMenuContent>
                                    </DropdownMenu>

                                    <Button type="submit" variant="ghost" className="font-bold rounded-full text-current active:scale-95">Kaydet</Button>
                                </div>
                            </div>

                            {/* Editor Body */}
                            <div className="flex-1 overflow-y-auto w-full [scrollbar-width:none]">
                                <div className="max-w-3xl mx-auto px-6 md:px-12 pb-12 flex flex-col min-h-full">
                                    <FormField name="title" control={noteForm.control} render={({ field }) => (
                                        <FormItem className="mb-2">
                                            <FormControl>
                                                <input {...field} autoFocus={!editingNote?.id} placeholder="Başlık" className="w-full text-3xl md:text-4xl font-bold bg-transparent outline-none border-none p-0 placeholder:text-current/40 text-current" />
                                            </FormControl>
                                        </FormItem>
                                    )}/>
                                    <p className="text-xs font-medium text-current/50 mb-6 px-0.5">
                                        {editingNote?.updatedAt ? new Date(editingNote.updatedAt).toLocaleString('tr-TR', { day: 'numeric', month: 'long', hour: '2-digit', minute:'2-digit' }) : new Date().toLocaleString('tr-TR', { day: 'numeric', month: 'long', hour: '2-digit', minute:'2-digit' })}
                                    </p>

                                    <FormField name="content" control={noteForm.control} render={({ field }) => (
                                        <FormItem className="flex-1">
                                            <FormControl>
                                                <textarea {...field} placeholder="Not yazın..." className="w-full h-full min-h-[60vh] bg-transparent outline-none border-none resize-none p-0 text-lg md:text-xl font-medium leading-relaxed placeholder:text-current/30 text-current" />
                                            </FormControl>
                                        </FormItem>
                                    )}/>
                                </div>
                            </div>

                            {/* Color Bar */}
                            <div className="h-16 px-4 border-t border-black/5 dark:border-white/5 flex items-center justify-center shrink-0 overflow-x-auto pb-safe">
                                <FormField name="color" control={noteForm.control} render={({field}) => (
                                    <FormItem>
                                        <FormControl>
                                            <div className="flex items-center gap-4">
                                                {noteColors.map(color => (
                                                    <button key={color.id} type="button" onClick={() => noteForm.setValue('color', color.class)} 
                                                        className={cn("w-8 h-8 rounded-full border border-black/10 transition-all flex items-center justify-center active:scale-90", color.preview, noteForm.watch('color') === color.class ? cn(color.ring, "ring-2 ring-offset-2 scale-110") : "")}
                                                    >
                                                        {noteForm.watch('color') === color.class && <Check className="w-4 h-4 text-black/40" strokeWidth={3} />}
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

            <Dialog open={isFolderFormOpen} onOpenChange={(open) => { if (!open) setEditingNotebook(null); setIsFolderFormOpen(open); }}>
                <DialogContent className="w-[95%] sm:max-w-md bg-white dark:bg-[#252525] rounded-[2rem] p-6 shadow-2xl border-0">
                    <DialogHeader className="mb-4 text-left">
                        <DialogTitle className="text-xl font-bold">{editingNotebook ? "Klasörü Düzenle" : "Klasör Oluştur"}</DialogTitle>
                    </DialogHeader>
                    <NewNotebookForm onSubmit={handleFolderSubmit} initialData={editingNotebook} availableFolders={notebooks} currentFolderId={currentFolderId} />
                </DialogContent>
            </Dialog>

            <Dialog open={!!passwordPrompt} onOpenChange={(open) => { if (!open) { setPasswordPrompt(null); setPasswordInput(""); } }}>
                <DialogContent className="sm:max-w-md border-0 rounded-[2rem] bg-white dark:bg-[#252525]">
                    <DialogHeader>
                        <DialogTitle>Kilitli Klasör</DialogTitle>
                        <DialogDescription>Görüntülemek için şifre girin.</DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        <Input type="password" placeholder="Şifre" autoComplete="new-password" value={passwordInput} onChange={(e) => setPasswordInput(e.target.value)} 
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    if (passwordInput === passwordPrompt?.expected) { setCurrentFolderId(passwordPrompt.folderId); setPasswordPrompt(null); setPasswordInput(""); } 
                                    else { toast({ title: 'Hatalı Şifre', variant: 'destructive' }); }
                                }
                            }}
                            className="h-12 rounded-xl"
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" className="rounded-full font-bold" onClick={() => { setPasswordPrompt(null); setPasswordInput(""); }}>İptal</Button>
                        <Button onClick={() => {
                            if (passwordInput === passwordPrompt?.expected) { setCurrentFolderId(passwordPrompt.folderId); setPasswordPrompt(null); setPasswordInput(""); } 
                            else { toast({ title: 'Hatalı Şifre', variant: 'destructive' }); }
                        }} className="rounded-full font-bold">Aç</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

        </div>
    );
}

// --- DND SORTABLE COMPONENTS (SAMSUNG STYLE) ---
function SortableFolderChip({ folder, index, onClick, onEdit, onDelete }: any) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
        id: `folder-${folder.id}`,
        data: { type: 'folder', folder }
    });
    const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1, zIndex: isDragging ? 50 : 1 };
    
    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <div ref={setNodeRef} style={style} {...attributes} onClick={onClick}
                    className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-[#252525] rounded-full shrink-0 cursor-pointer shadow-sm border border-slate-100 dark:border-white/5 active:scale-95 transition-transform"
                >
                    <div {...listeners} className="cursor-grab opacity-50 hover:opacity-100 p-1 -ml-2" onClick={e=>e.stopPropagation()}>
                        <GripVertical className="w-3 h-3" />
                    </div>
                    <Folder className="w-4 h-4 text-indigo-500" />
                    <span className="text-sm font-bold truncate max-w-[120px]">{folder.title}</span>
                </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="rounded-2xl w-40 p-2 shadow-xl border-0">
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(); }} className="rounded-xl font-bold cursor-pointer"><Edit className="w-4 h-4 mr-2 text-slate-500" /> Düzenle</DropdownMenuItem>
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onDelete(); }} className="rounded-xl font-bold cursor-pointer text-rose-500"><Trash2 className="w-4 h-4 mr-2" /> Sil</DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

function SortableNoteCard({ note, onEdit, onDelete }: any) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
        id: `note-${note.id}`,
        data: { type: 'note', note }
    });
    const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1, zIndex: isDragging ? 50 : 1 };
    
    const rawColor = note.color || noteColors[0].class;
    
    // Map old format to new format if necessary
    const isOldFormat = rawColor.includes('text-');
    const displayClass = isOldFormat ? noteColors[0].class : rawColor; // Fallback to white if old complex class

    const contentText = Array.isArray(note.content) ? (note.content.find((b: any) => b.type === 'text')?.data || '') : '';
    const plainText = typeof contentText === 'string' ? contentText.replace(/<[^>]+>/g, '') : '';

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <div ref={setNodeRef} style={style} {...attributes} onClick={onEdit} 
                    className={cn(
                        "flex flex-col h-48 md:h-56 p-4 rounded-3xl cursor-pointer shadow-sm border border-black/5 dark:border-white/5 active:scale-95 transition-transform overflow-hidden relative group",
                        displayClass
                    )}
                >
                    <div {...listeners} className="absolute top-2 right-2 p-1.5 cursor-grab opacity-0 group-hover:opacity-40 hover:!opacity-100 transition-opacity bg-black/5 rounded-full" onClick={e=>e.stopPropagation()}>
                        <GripVertical className="w-4 h-4" />
                    </div>

                    <h3 className="font-bold text-lg leading-tight mb-2 truncate pr-6">{note.title || "İsimsiz"}</h3>
                    <p className="text-sm font-medium opacity-70 flex-1 overflow-hidden" style={{ display: '-webkit-box', WebkitLineClamp: 5, WebkitBoxOrient: 'vertical' }}>
                        {plainText || "İçerik yok"}
                    </p>
                    <div className="mt-3 text-[11px] font-bold opacity-50 uppercase tracking-widest shrink-0">
                        {note.updatedAt ? new Date(note.updatedAt).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' }) : 'YENİ'}
                    </div>
                </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="rounded-2xl w-40 p-2 shadow-xl border-0">
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onDelete(); }} className="rounded-xl font-bold cursor-pointer text-rose-500"><Trash2 className="w-4 h-4 mr-2" /> Sil</DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
