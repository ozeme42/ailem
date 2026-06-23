"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { useAuth } from '@/components/auth-provider';
import { Notebook as NotebookType, Note } from '@/lib/data';
import { onNotebooksUpdate, addNotebook, deleteNotebook, updateNotebook, onNotesUpdate, updateNoteInSection, addNoteToSection, deleteNoteFromSection } from '@/lib/dataService';
import { Button } from '@/components/ui/button';
import { Plus, Trash2, Edit, Search, MoreVertical, Folder, ChevronLeft, PenLine, Menu, FileText, Settings, BookOpen } from 'lucide-react';
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
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";

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

// --- SAMSUNG NOTES EXACT COLORS ---
const noteColors = [
    { id: 'white',  class: 'bg-white dark:bg-[#252525]', text: 'text-[#000000] dark:text-[#FFFFFF]' },
    { id: 'yellow', class: 'bg-[#fff59d] dark:bg-[#5a4b10]', text: 'text-[#000000] dark:text-[#FFFFFF]' },
    { id: 'peach',  class: 'bg-[#ffe0b2] dark:bg-[#6b3f11]', text: 'text-[#000000] dark:text-[#FFFFFF]' },
    { id: 'pink',   class: 'bg-[#f8bbd0] dark:bg-[#631d38]', text: 'text-[#000000] dark:text-[#FFFFFF]' },
    { id: 'blue',   class: 'bg-[#bbdefb] dark:bg-[#183f66]', text: 'text-[#000000] dark:text-[#FFFFFF]' },
    { id: 'green',  class: 'bg-[#c8e6c9] dark:bg-[#1b4f26]', text: 'text-[#000000] dark:text-[#FFFFFF]' },
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

    // Data State
    const [notebooks, setNotebooks] = useState<NotebookType[]>([]);
    const [allNotes, setAllNotes] = useState<Note[]>([]);
    
    // UI State
    const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [passwordPrompt, setPasswordPrompt] = useState<{ folderId: string, expected: string } | null>(null);
    const [passwordInput, setPasswordInput] = useState("");
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    
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
    
    const displayedNotes = useMemo(() => {
        let filtered = allNotes.filter(n => n.notebookId === (currentFolderId || 'root'));
        if (searchTerm) {
            filtered = allNotes.filter(n => n.title.toLowerCase().includes(searchTerm.toLowerCase()) || (n.content[0]?.data.toLowerCase().includes(searchTerm.toLowerCase())));
        }
        return filtered.sort((a,b) => (b.createdAt ? new Date(b.createdAt).getTime() : 0) - (a.createdAt ? new Date(a.createdAt).getTime() : 0));
    }, [allNotes, currentFolderId, searchTerm]);

    const displayedFolders = notebooks.filter(n => n.parentId !== 'root'); // Flatten for simplicity

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
            setIsSidebarOpen(true);
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
                title: data.title.trim() || 'İsimsiz not',
                content: [{ id: '1', type: 'text' as const, data: data.content || '' }],
                color: data.color || noteColors[0].class,
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

    // Drag and Drop (Only for notes in the grid to reorder, visually pleasing)
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
        return d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' });
    };

    const formatEditorDate = (dateString?: string) => {
        if (!dateString) return new Date().toLocaleString('tr-TR', { day: 'numeric', month: 'long', hour: '2-digit', minute:'2-digit' });
        const d = new Date(dateString);
        return d.toLocaleString('tr-TR', { day: 'numeric', month: 'long', hour: '2-digit', minute:'2-digit' });
    };

    return (
        <div className="flex h-[100dvh] flex-col bg-[#F2F2F2] dark:bg-[#000000] font-sans text-[#000000] dark:text-[#FFFFFF] relative">
            
            {/* Header - EXACT Samsung Notes Style */}
            <div className="flex items-center justify-between px-2 pt-2 h-14 shrink-0 bg-[#F2F2F2] dark:bg-[#000000]">
                <div className="flex items-center">
                    <Sheet open={isSidebarOpen} onOpenChange={setIsSidebarOpen}>
                        <SheetTrigger asChild>
                            <Button variant="ghost" size="icon" className="rounded-full w-12 h-12 text-[#000000] dark:text-[#FFFFFF] hover:bg-black/5 dark:hover:bg-white/5 active:scale-95">
                                <Menu className="w-6 h-6" strokeWidth={1.5} />
                            </Button>
                        </SheetTrigger>
                        <SheetContent side="left" className="w-[300px] p-0 bg-[#F2F2F2] dark:bg-[#000000] border-r-0">
                            <div className="p-6">
                                <h2 className="text-xl font-bold mb-6">Samsung Notes</h2>
                                <ScrollArea className="h-[calc(100vh-120px)]">
                                    <div className="space-y-1">
                                        <button 
                                            onClick={() => { setCurrentFolderId(null); setIsSidebarOpen(false); }}
                                            className={cn("w-full flex items-center gap-4 px-4 py-3 rounded-2xl transition-colors", currentFolderId === null ? "bg-black/10 dark:bg-white/10 font-bold" : "hover:bg-black/5 dark:hover:bg-white/5 font-medium")}
                                        >
                                            <FileText className="w-5 h-5" strokeWidth={1.5} /> Tüm notlar
                                        </button>
                                        
                                        <div className="pt-4 pb-2 px-4 text-xs font-bold text-gray-500 uppercase tracking-widest flex items-center justify-between">
                                            Klasörler
                                            <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full" onClick={(e) => { e.stopPropagation(); setEditingNotebook(null); setIsFolderFormOpen(true); setIsSidebarOpen(false); }}>
                                                <Plus className="w-4 h-4" />
                                            </Button>
                                        </div>
                                        
                                        {displayedFolders.map(f => (
                                            <div key={f.id} className="group relative">
                                                <button 
                                                    onClick={() => {
                                                        if (f.password) { setPasswordPrompt({ folderId: f.id, expected: f.password }); } 
                                                        else { setCurrentFolderId(f.id); setIsSidebarOpen(false); }
                                                    }}
                                                    className={cn("w-full flex items-center gap-4 px-4 py-3 rounded-2xl transition-colors", currentFolderId === f.id ? "bg-black/10 dark:bg-white/10 font-bold" : "hover:bg-black/5 dark:hover:bg-white/5 font-medium")}
                                                >
                                                    <Folder className="w-5 h-5" strokeWidth={1.5} /> 
                                                    <span className="flex-1 text-left truncate">{f.title}</span>
                                                </button>
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full opacity-0 group-hover:opacity-100">
                                                            <MoreVertical className="w-4 h-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end" className="rounded-2xl border-0 shadow-lg">
                                                        <DropdownMenuItem onClick={() => { setEditingNotebook(f); setIsFolderFormOpen(true); setIsSidebarOpen(false); }} className="rounded-xl cursor-pointer">Düzenle</DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => handleDeleteFolder(f.id)} className="rounded-xl cursor-pointer text-red-500">Sil</DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </div>
                                        ))}
                                    </div>
                                </ScrollArea>
                            </div>
                        </SheetContent>
                    </Sheet>

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="text-xl md:text-2xl font-bold px-2 hover:bg-transparent active:bg-transparent gap-1">
                                {currentFolder ? currentFolder.title : "Tüm notlar"} <ChevronLeft className="w-5 h-5 -rotate-90 opacity-50" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="w-56 rounded-2xl border-0 shadow-xl bg-white dark:bg-[#252525]">
                            <DropdownMenuItem onClick={() => setCurrentFolderId(null)} className="rounded-xl py-3 font-medium cursor-pointer">Tüm notlar</DropdownMenuItem>
                            <DropdownMenuSeparator className="bg-black/5 dark:bg-white/5" />
                            {displayedFolders.map(f => (
                                <DropdownMenuItem key={f.id} onClick={() => {
                                    if (f.password) { setPasswordPrompt({ folderId: f.id, expected: f.password }); } 
                                    else { setCurrentFolderId(f.id); }
                                }} className="rounded-xl py-3 font-medium cursor-pointer">{f.title}</DropdownMenuItem>
                            ))}
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>

                <div className="flex items-center pr-2">
                    <Button variant="ghost" size="icon" className="rounded-full w-10 h-10 hover:bg-black/5 dark:hover:bg-white/5 active:scale-95">
                        <Search className="w-5 h-5" strokeWidth={1.5} />
                    </Button>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="rounded-full w-10 h-10 hover:bg-black/5 dark:hover:bg-white/5 active:scale-95">
                                <MoreVertical className="w-5 h-5" strokeWidth={1.5} />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48 rounded-2xl border-0 shadow-xl bg-white dark:bg-[#252525] p-2">
                            <DropdownMenuItem className="rounded-xl py-3 px-4 font-medium cursor-pointer text-base text-gray-500" disabled>Düzenle</DropdownMenuItem>
                            <DropdownMenuItem className="rounded-xl py-3 px-4 font-medium cursor-pointer text-base text-gray-500" disabled>Sırala</DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto px-4 md:px-6 w-full relative z-10 [scrollbar-width:none]">
                <div className="max-w-7xl mx-auto pt-2 pb-24">
                    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
                        <SortableContext items={dndItems} strategy={rectSortingStrategy}>
                            
                            {displayedNotes.length > 0 ? (
                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-4">
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
                            ) : (
                                <div className="flex flex-col items-center justify-center h-[60vh] text-center opacity-40">
                                    <BookOpen className="w-24 h-24 mb-4 opacity-20" strokeWidth={1} />
                                    <p className="text-lg font-medium">Hiç not yok</p>
                                </div>
                            )}
                            
                        </SortableContext>
                        <DragOverlay dropAnimation={defaultDropAnimationSideEffects({ duration: 250 })}>
                            {activeId ? (
                                <div className="w-32 h-32 bg-white dark:bg-[#252525] rounded-2xl shadow-2xl opacity-90 scale-105 border border-black/5"></div>
                            ) : null}
                        </DragOverlay>
                    </DndContext>
                </div>
            </div>

            {/* FAB - Samsung Notes Style (Orange) */}
            <div className="fixed bottom-6 right-6 md:bottom-8 md:right-8 z-50">
                <Button onClick={() => { setEditingNote(null); noteForm.reset({ title: "", content: "", color: noteColors[0].class, notebookId: currentFolderId || 'root' }); setIsNoteFormOpen(true); }} 
                    className="rounded-full w-14 h-14 md:w-16 md:h-16 shadow-xl bg-[#ff6b00] hover:bg-[#e66000] text-white flex items-center justify-center active:scale-90 transition-transform shadow-[#ff6b00]/30">
                    <PenLine className="h-6 w-6 md:h-7 md:w-7" strokeWidth={2}/>
                </Button>
            </div>

            {/* Editor Dialog (Full Screen White) */}
            <Dialog open={isNoteFormOpen} onOpenChange={(open) => { if (!open) setEditingNote(null); setIsNoteFormOpen(open); }}>
                <DialogContent className="w-full h-[100dvh] max-w-none m-0 p-0 border-0 flex flex-col z-[70] animate-in slide-in-from-bottom-full duration-300 md:rounded-none bg-[#FFFFFF] dark:bg-[#121212] [&>button]:hidden">
                    <DialogTitle className="sr-only">Not Düzenleyici</DialogTitle>
                    <Form {...noteForm}>
                        <form onSubmit={noteForm.handleSubmit(handleSaveNote)} className={cn("flex flex-col h-full w-full transition-colors duration-500", noteForm.watch('color') || noteColors[0].class)}>
                            
                            {/* Editor Toolbar */}
                            <div className="h-14 px-2 flex items-center justify-between shrink-0 bg-transparent">
                                <DialogClose asChild>
                                    <Button variant="ghost" size="icon" className="text-current rounded-full active:scale-95"><ChevronLeft className="w-7 h-7" strokeWidth={1.5} /></Button>
                                </DialogClose>
                                
                                <div className="flex items-center gap-1">
                                    {/* Color Picker inside Editor */}
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon" className="text-current rounded-full active:scale-95">
                                                <div className="w-5 h-5 rounded-full border border-black/20 dark:border-white/20" style={{ backgroundColor: 'currentColor' }} />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end" className="w-64 rounded-3xl p-3 border-0 shadow-2xl bg-white dark:bg-[#252525]">
                                            <div className="grid grid-cols-3 gap-3">
                                                {noteColors.map(color => (
                                                    <div key={color.id} onClick={() => noteForm.setValue('color', color.class)} 
                                                        className={cn("h-12 rounded-full cursor-pointer border border-black/10 flex items-center justify-center transition-all", color.preview, noteForm.watch('color') === color.class ? "ring-2 ring-black/30 dark:ring-white/30 scale-105" : "")}
                                                    >
                                                        {noteForm.watch('color') === color.class && <Check className="w-5 h-5 text-black/50" strokeWidth={3} />}
                                                    </div>
                                                ))}
                                            </div>
                                        </DropdownMenuContent>
                                    </DropdownMenu>

                                    <Button type="submit" variant="ghost" className="font-bold text-base rounded-full text-current active:scale-95 px-4">Kaydet</Button>
                                </div>
                            </div>

                            {/* Editor Body */}
                            <div className="flex-1 overflow-y-auto w-full [scrollbar-width:none]">
                                <div className="max-w-3xl mx-auto px-6 md:px-12 py-4 flex flex-col min-h-full">
                                    <FormField name="title" control={noteForm.control} render={({ field }) => (
                                        <FormItem className="mb-0">
                                            <FormControl>
                                                <input {...field} autoFocus={!editingNote?.id} placeholder="Başlık" className="w-full text-2xl font-bold bg-transparent outline-none border-none p-0 placeholder:text-current/40 text-current" />
                                            </FormControl>
                                        </FormItem>
                                    )}/>
                                    <p className="text-xs font-medium text-current/50 mb-6">
                                        {formatEditorDate(editingNote?.updatedAt)}
                                    </p>

                                    <FormField name="content" control={noteForm.control} render={({ field }) => (
                                        <FormItem className="flex-1">
                                            <FormControl>
                                                <textarea {...field} placeholder="Metin girin" className="w-full h-full min-h-[70vh] bg-transparent outline-none border-none resize-none p-0 text-base md:text-lg leading-relaxed placeholder:text-current/40 text-current" />
                                            </FormControl>
                                        </FormItem>
                                    )}/>
                                </div>
                            </div>
                        </form>
                    </Form>
                </DialogContent>
            </Dialog>

            <Dialog open={isFolderFormOpen} onOpenChange={(open) => { if (!open) setEditingNotebook(null); setIsFolderFormOpen(open); }}>
                <DialogContent className="w-[95%] sm:max-w-md bg-[#F2F2F2] dark:bg-[#252525] rounded-[2rem] p-6 shadow-2xl border-0">
                    <DialogHeader className="mb-4 text-left">
                        <DialogTitle className="text-xl font-bold">{editingNotebook ? "Klasörü düzenle" : "Klasör oluştur"}</DialogTitle>
                    </DialogHeader>
                    <NewNotebookForm onSubmit={handleFolderSubmit} initialData={editingNotebook} availableFolders={notebooks} currentFolderId={currentFolderId} />
                </DialogContent>
            </Dialog>

            <Dialog open={!!passwordPrompt} onOpenChange={(open) => { if (!open) { setPasswordPrompt(null); setPasswordInput(""); } }}>
                <DialogContent className="sm:max-w-md border-0 rounded-[2rem] bg-[#F2F2F2] dark:bg-[#252525]">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-bold">Klasör kilitli</DialogTitle>
                        <DialogDescription>Görüntülemek için şifre girin.</DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        <Input type="password" placeholder="Şifre" autoComplete="new-password" value={passwordInput} onChange={(e) => setPasswordInput(e.target.value)} 
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    if (passwordInput === passwordPrompt?.expected) { setCurrentFolderId(passwordPrompt.folderId); setPasswordPrompt(null); setPasswordInput(""); } 
                                    else { toast({ title: 'Yanlış şifre', variant: 'destructive' }); }
                                }
                            }}
                            className="h-12 rounded-xl bg-white dark:bg-[#121212] border-0 shadow-sm"
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" className="rounded-full font-bold" onClick={() => { setPasswordPrompt(null); setPasswordInput(""); }}>İptal</Button>
                        <Button onClick={() => {
                            if (passwordInput === passwordPrompt?.expected) { setCurrentFolderId(passwordPrompt.folderId); setPasswordPrompt(null); setPasswordInput(""); } 
                            else { toast({ title: 'Yanlış şifre', variant: 'destructive' }); }
                        }} className="rounded-full font-bold text-[#ff6b00] hover:bg-[#ff6b00]/10">Tamam</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

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
    
    // Fallback logic for old colors vs new samsung colors
    let rawColor = note.color || noteColors[0].class;
    if (rawColor.includes('text-')) {
        // old style, map to one of the new classes safely
        rawColor = noteColors[0].class;
    }

    const contentText = Array.isArray(note.content) ? (note.content.find((b: any) => b.type === 'text')?.data || '') : '';
    const plainText = typeof contentText === 'string' ? contentText.replace(/<[^>]+>/g, '') : '';

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <div ref={setNodeRef} style={style} {...attributes} {...listeners} onClick={onEdit} 
                    className={cn(
                        "flex flex-col h-40 md:h-48 p-4 rounded-2xl cursor-pointer shadow-sm active:scale-[0.98] transition-transform overflow-hidden",
                        rawColor
                    )}
                >
                    <h3 className="font-bold text-sm leading-tight mb-1 truncate">{note.title || "İsimsiz"}</h3>
                    <p className="text-xs opacity-60 flex-1 overflow-hidden font-medium" style={{ display: '-webkit-box', WebkitLineClamp: 5, WebkitBoxOrient: 'vertical', lineHeight: '1.4' }}>
                        {plainText || "İçerik yok"}
                    </p>
                    <div className="mt-2 text-[10px] font-bold opacity-40 shrink-0">
                        {dateStr}
                    </div>
                </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="rounded-2xl w-40 p-2 shadow-xl border-0">
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onDelete(); }} className="rounded-xl font-bold cursor-pointer text-red-500">Sil</DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
