
"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth-provider';
import { Notebook as NotebookType, Note } from '@/lib/data';
import { onNotebookDetailsUpdate, updateNotebook, addNoteToSection, updateNoteInSection, deleteNoteFromSection } from '@/lib/dataService';
import { Button } from '@/components/ui/button';
import { Plus, ArrowLeft, MoreHorizontal, Trash2, Edit } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Textarea } from '@/components/ui/textarea';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';

// --- SABİTLER ---
const noteColors = [
    { name: 'Saman', class: 'bg-[#fffbeb] border-amber-200 text-amber-900/90 dark:bg-amber-900/20 dark:border-amber-800/50 dark:text-amber-100' },
    { name: 'Gökyüzü', class: 'bg-sky-50 border-sky-200 text-sky-900/90 dark:bg-sky-900/20 dark:border-sky-800/50 dark:text-sky-100' },
    { name: 'Nane', class: 'bg-emerald-50 border-emerald-200 text-emerald-900/90 dark:bg-emerald-900/20 dark:border-emerald-800/50 dark:text-emerald-100' },
    { name: 'Gül', class: 'bg-rose-50 border-rose-200 text-rose-900/90 dark:bg-rose-900/20 dark:border-rose-800/50 dark:text-rose-100' },
    { name: 'Lavanta', class: 'bg-violet-50 border-violet-200 text-violet-900/90 dark:bg-violet-900/20 dark:border-violet-800/50 dark:text-violet-100' },
    { name: 'Gri', class: 'bg-slate-100 border-slate-200 text-slate-800 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200' },
];

interface NotebookDetails {
    notebook: NotebookType;
    notes: Note[];
}

const noteFormSchema = z.object({
    title: z.string().default(""),
    content: z.string().optional().default(""),
    color: z.string().optional(),
});
type NoteFormData = z.infer<typeof noteFormSchema>;

export default function NotebookClient() {
    const params = useParams();
    const router = useRouter();
    const notebookId = params.notebookId as string;
    const { user } = useAuth();
    const { toast } = useToast();

    const [details, setDetails] = useState<NotebookDetails | null>(null);
    const [editingNote, setEditingNote] = useState<Note | null>(null);
    const [isFormOpen, setIsFormOpen] = useState(false);

    const form = useForm<NoteFormData>();

    useEffect(() => {
        if (!notebookId || !user) return;
        const unsubscribe = onNotebookDetailsUpdate(notebookId, setDetails);
        return () => unsubscribe();
    }, [notebookId, user]);
    
    useEffect(() => {
        if (editingNote) {
            form.reset({
                title: editingNote.title,
                content: (editingNote.content?.[0]?.data || ''),
                color: editingNote.color || noteColors[0].class,
            });
            setIsFormOpen(true);
        }
    }, [editingNote, form]);

    const handleSaveNote = async (data: NoteFormData) => {
        try {
            const notePayload = {
                title: data.title || 'İsimsiz Not',
                content: [{ id: '1', type: 'text' as const, data: data.content || '' }],
                color: data.color || noteColors[0].class,
            };

            if (editingNote && editingNote.id) {
                await updateNoteInSection(notebookId, editingNote.id, notePayload);
                toast({ title: "Not Güncellendi" });
            } else {
                await addNoteToSection(notebookId, details!.notebook.sections[0].id, notePayload);
                toast({ title: "Not Eklendi" });
            }
            setIsFormOpen(false);
            setEditingNote(null);
        } catch (error) { toast({ title: 'Hata', variant: 'destructive' }); }
    };

    const handleDeleteNote = async (noteId: string) => {
        try {
            await deleteNoteFromSection(noteId);
            toast({ title: 'Not Silindi', variant: 'destructive' });
        } catch (error) { toast({ title: 'Hata', variant: 'destructive' }); }
    };

    if (!details) return <div className="flex h-full items-center justify-center text-slate-500 dark:text-slate-400">Yükleniyor...</div>;

    return (
        <div className="flex h-full flex-col bg-slate-50 dark:bg-slate-950">
             {/* Header */}
             <div className="p-4 md:px-8 md:py-6 border-b border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-950/50 backdrop-blur-xl sticky top-0 z-20 flex-shrink-0">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Button variant="ghost" size="icon" className="-ml-2 text-slate-500 dark:text-slate-400" onClick={() => router.push('/notes')}>
                             <ArrowLeft className="w-5 h-5" />
                        </Button>
                        <h1 className="text-xl md:text-2xl font-bold tracking-tight text-slate-800 dark:text-slate-100 truncate">{details.notebook.title}</h1>
                    </div>
                    <Button onClick={() => { setEditingNote({} as Note); setIsFormOpen(true); }} className="h-10 bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm rounded-xl px-5">
                        <Plus className="w-5 h-5 mr-2" /> Not Ekle
                    </Button>
                </div>
            </div>

            {/* Notes Grid */}
            <div className="flex-1 px-4 md:px-8 py-6 overflow-y-auto">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
                    {details.notes.map(note => (
                         <StickyNoteCard 
                            key={note.id} 
                            note={note} 
                            onEdit={() => setEditingNote(note)}
                            onDelete={() => handleDeleteNote(note.id)}
                         />
                    ))}
                    {details.notes.length === 0 && (
                         <div className="col-span-full flex flex-col items-center justify-center py-20 text-slate-400 dark:text-slate-500">
                             <p className="text-lg font-medium">Bu defter boş.</p>
                         </div>
                    )}
                </div>
            </div>
            
            <Dialog open={isFormOpen} onOpenChange={(open) => {if (!open) setEditingNote(null); setIsFormOpen(open);}}>
                <DialogContent className={cn("w-[100vw] h-[100dvh] md:w-full md:max-w-2xl md:h-auto md:max-h-[90vh] p-0 border-none shadow-2xl flex flex-col md:rounded-3xl overflow-hidden transition-colors duration-500", form.watch('color'))}>
                    <DialogTitle className="sr-only">Not</DialogTitle>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(handleSaveNote)} className="flex flex-col h-full">
                           <div className="flex-1 overflow-y-auto">
                                <div className="max-w-3xl mx-auto p-6 md:p-12 space-y-6">
                                     <FormField name="title" control={form.control} render={({ field }) => (
                                        <FormItem><FormControl><Input {...field} placeholder="Başlık" className="text-3xl md:text-4xl font-bold bg-transparent border-none p-0 focus-visible:ring-0 placeholder:opacity-40 tracking-tight" /></FormControl></FormItem>)}/>
                                    <FormField name="content" control={form.control} render={({ field }) => (
                                        <FormItem><FormControl><Textarea {...field} placeholder="Notunu buraya yaz..." className="bg-transparent border-none resize-none p-0 text-base md:text-lg leading-relaxed focus-visible:ring-0 placeholder:opacity-50 min-h-[300px]" /></FormControl></FormItem>)}/>
                                </div>
                            </div>
                            <div className="p-4 md:p-5 border-t border-black/5 dark:border-white/10 bg-white/40 dark:bg-black/20 backdrop-blur-xl flex items-center justify-between gap-4 z-20">
                                <FormField name="color" control={form.control} render={({field}) => (
                                    <FormItem><FormControl>
                                        <div className="flex items-center gap-2">
                                        {noteColors.map(color => (
                                            <button key={color.name} type="button" onClick={() => form.setValue('color', color.class)} className={cn("w-7 h-7 rounded-full border border-black/10 dark:border-white/20 transition-all", color.class, form.watch('color') === color.class && "ring-2 ring-offset-2 ring-slate-900 dark:ring-white ring-offset-slate-800")}/>
                                        ))}
                                        </div>
                                    </FormControl></FormItem>
                                )}/>
                                <div className="flex gap-2">
                                    <DialogClose asChild><Button variant="ghost">Kapat</Button></DialogClose>
                                    <Button type="submit">Kaydet</Button>
                                </div>
                            </div>
                        </form>
                    </Form>
                </DialogContent>
            </Dialog>
        </div>
    );
}

function StickyNoteCard({ note, onEdit, onDelete }: { note: Note, onEdit: () => void, onDelete: () => void }) {
    const colorClass = note.color || noteColors[5].class;
    const contentText = Array.isArray(note.content) ? (note.content.find(b => b.type === 'text')?.data || '') : '';
    const plainText = typeof contentText === 'string' ? contentText.replace(/<[^>]+>/g, '') : '';
    
    return (
        <div 
            onClick={onEdit}
            className={cn(
                "group relative flex flex-col h-60 rounded-2xl border-2 transition-all duration-300 hover:-translate-y-2 hover:shadow-xl cursor-pointer overflow-hidden p-5",
                colorClass,
            )}
        >
             <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                 <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full hover:bg-black/5 dark:hover:bg-white/10" onClick={(e) => e.stopPropagation()}>
                            <MoreHorizontal className="w-5 h-5 opacity-60" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-40 rounded-xl bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800">
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onDelete(); }} className="text-red-500 cursor-pointer focus:bg-red-50 dark:focus:bg-red-900/50">
                            <Trash2 className="w-4 h-4 mr-2" /> Notu Sil
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
             </div>
            
            <h3 className="font-bold text-lg leading-tight line-clamp-2 pr-8">{note.title || "İsimsiz Not"}</h3>
            <div className="flex-1 mt-2 overflow-hidden relative">
                <p className="text-sm leading-relaxed font-medium line-clamp-5 whitespace-pre-wrap opacity-70">{plainText || "İçerik yok..."}</p>
                <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-current to-transparent pointer-events-none" />
            </div>
            <div className="mt-auto text-xs font-medium opacity-50 pt-2">
                {note.updatedAt ? new Date(note.updatedAt).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' }) : ''}
            </div>
        </div>
    )
}
