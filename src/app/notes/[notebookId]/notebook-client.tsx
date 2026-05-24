"use client";

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth-provider';
import { Notebook as NotebookType, Note } from '@/lib/data';
import { onNotebookDetailsUpdate, updateNotebook, addNoteToSection, updateNoteInSection, deleteNoteFromSection } from '@/lib/dataService';
import { Button } from '@/components/ui/button';
import { Plus, ChevronLeft, MoreHorizontal, Trash2, CalendarClock, Check, PenLine } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle, DialogClose } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Form, FormControl, FormField, FormItem } from '@/components/ui/form';

// --- TASARIM SABİTLERİ (Gerçekçi Kağıt / Pastel Renkler) ---
// Bu renkler karanlık modda bile notun kağıt rengini korumasını sağlayacak şekilde ayarlandı.
const noteColors = [
    { id: 'yellow', class: 'bg-[#FFF9C4] text-[#78600C]', preview: 'bg-[#FFF9C4]', ring: 'ring-[#FDE047]' },
    { id: 'blue',   class: 'bg-[#E0F2FE] text-[#0C4A6E]', preview: 'bg-[#E0F2FE]', ring: 'ring-[#7DD3FC]' },
    { id: 'green',  class: 'bg-[#DCFCE7] text-[#064E3B]', preview: 'bg-[#DCFCE7]', ring: 'ring-[#6EE7B7]' },
    { id: 'pink',   class: 'bg-[#FCE7F3] text-[#831843]', preview: 'bg-[#FCE7F3]', ring: 'ring-[#F472B6]' },
    { id: 'purple', class: 'bg-[#F3E8FF] text-[#4C1D95]', preview: 'bg-[#F3E8FF]', ring: 'ring-[#D8B4FE]' },
    { id: 'gray',   class: 'bg-[#F1F5F9] text-[#0F172A]', preview: 'bg-[#F1F5F9]', ring: 'ring-[#CBD5E1]' },
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
                title: editingNote.title || '',
                content: (editingNote.content?.[0]?.data || ''),
                color: editingNote.color || noteColors[0].class,
            });
            setIsFormOpen(true);
        }
    }, [editingNote, form]);

    const handleSaveNote = async (data: NoteFormData) => {
        try {
            const notePayload = {
                title: data.title.trim() || 'İsimsiz Not',
                content: [{ id: '1', type: 'text' as const, data: data.content || '' }],
                color: data.color || noteColors[0].class,
            };

            if (editingNote && editingNote.id) {
                await updateNoteInSection(notebookId, editingNote.id, notePayload);
                toast({ title: "Not kaydedildi", className: "bg-slate-900 text-white border-none rounded-2xl" });
            } else {
                // Ensure we have a section to add the note to
                const sectionId = details?.notebook?.sections?.[0]?.id || 'default';
                await addNoteToSection(notebookId, sectionId, notePayload);
                toast({ title: "Not oluşturuldu", className: "bg-slate-900 text-white border-none rounded-2xl" });
            }
            setIsFormOpen(false);
            setEditingNote(null);
        } catch (error) { toast({ title: 'Kayıt başarısız oldu', variant: 'destructive' }); }
    };

    const handleDeleteNote = async (noteId: string) => {
        try {
            await deleteNoteFromSection(noteId);
            toast({ title: 'Not silindi', className: "bg-rose-500 text-white border-none rounded-2xl" });
        } catch (error) { toast({ title: 'Silme başarısız', variant: 'destructive' }); }
    };

    if (!details) return (
        <div className="flex h-[100dvh] items-center justify-center bg-[#F8FAFC]">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
        </div>
    );

    return (
        <div className="flex h-full min-h-[100dvh] flex-col bg-[#F8FAFC] font-sans selection:bg-indigo-200 relative overflow-x-hidden pb-24">
             
             {/* --- NATIVE APP BAR --- */}
             <div className="px-3 py-2 md:px-6 md:py-4 border-b border-black/5 bg-white/80 backdrop-blur-xl supports-[backdrop-filter]:bg-white/60 sticky top-0 z-20 flex-shrink-0 flex items-center justify-between">
                <Button variant="ghost" size="icon" className="text-indigo-600 hover:bg-indigo-50 active:bg-indigo-100 rounded-full active:scale-90 transition-all w-10 h-10" onClick={() => router.push('/notes')}>
                    <ChevronLeft className="w-8 h-8" />
                </Button>
                
                <div className="absolute left-1/2 -translate-x-1/2 text-center flex flex-col items-center">
                    <h1 className="text-[17px] font-bold tracking-tight text-slate-900 truncate max-w-[150px] md:max-w-xs">{details.notebook.title}</h1>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{details.notes.length} Not</span>
                </div>

                <div className="w-10 h-10 flex items-center justify-center">
                    {/* Placeholder for symmetry */}
                </div>
            </div>

            {/* --- NOTES GRID --- */}
            <div className="flex-1 p-3 md:p-6 overflow-y-auto max-w-7xl mx-auto w-full relative z-10">
                <div className="columns-2 md:columns-3 lg:columns-4 gap-3 space-y-3">
                    {details.notes.map(note => (
                         <div key={note.id} className="break-inside-avoid">
                             <StickyNoteCard 
                                note={note} 
                                onEdit={() => setEditingNote(note)}
                                onDelete={() => handleDeleteNote(note.id)}
                             />
                         </div>
                    ))}
                </div>

                {details.notes.length === 0 && (
                     <div className="flex flex-col items-center justify-center h-[50vh] text-center px-4">
                         <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center mb-4 border border-indigo-100/50 shadow-inner">
                             <PenLine className="w-8 h-8 text-indigo-400" />
                         </div>
                         <p className="text-xl font-bold text-slate-800 mb-2">Henüz not yok</p>
                         <p className="text-sm font-medium text-slate-500 max-w-[250px]">Aklına gelenleri hemen not almaya başla.</p>
                     </div>
                )}
            </div>

            {/* --- FLOATING ACTION BUTTON (FAB) --- */}
            {/* FIXED: Z-index ve mobil alt menü çakışması için bottom değeri güncellendi */}
            <div className="fixed bottom-[calc(5rem+env(safe-area-inset-bottom))] right-5 md:bottom-8 md:right-8 z-30">
                <Button 
                    className="rounded-full w-14 h-14 md:w-16 md:h-16 shadow-[0_8px_30px_rgb(0,0,0,0.12)] bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white active:scale-90 transition-transform flex items-center justify-center border border-white/20" 
                    size="icon" 
                    onClick={() => { setEditingNote({} as Note); setIsFormOpen(true); }}
                >
                    <Plus className="h-7 w-7 md:h-8 md:w-8" strokeWidth={2.5}/>
                </Button>
            </div>
            
            {/* --- FULL SCREEN NATIVE EDITOR MODAL --- */}
            <Dialog open={isFormOpen} onOpenChange={(open) => {if (!open) setEditingNote(null); setIsFormOpen(open);}}>
                <DialogContent className="w-full h-[100dvh] max-w-none m-0 p-0 border-none flex flex-col z-50 animate-in slide-in-from-bottom-full duration-300 md:rounded-none bg-transparent">
                    <DialogTitle className="sr-only">Not Düzenleyici</DialogTitle>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(handleSaveNote)} className={cn("flex flex-col h-full w-full transition-colors duration-500 shadow-2xl", form.watch('color') || noteColors[0].class)}>
                            
                            {/* Toolbar (App Bar) */}
                            <div className="h-14 px-3 flex items-center justify-between border-b border-black/5 bg-white/20 backdrop-blur-md shrink-0">
                                <DialogClose asChild>
                                    <Button variant="ghost" className="text-black/60 hover:bg-black/5 font-bold text-[15px] rounded-full px-4 active:scale-95 transition-all">İptal</Button>
                                </DialogClose>
                                <span className="font-bold text-black/30 text-[11px] uppercase tracking-[0.2em]">
                                    {editingNote?.id ? "Düzenleniyor" : "Yeni Not"}
                                </span>
                                <Button type="submit" variant="ghost" className="text-indigo-600 hover:bg-black/5 font-black text-[15px] rounded-full px-4 active:scale-95 transition-all">Bitti</Button>
                            </div>

                            {/* Editor Area */}
                           <div className="flex-1 overflow-y-auto w-full [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                                <div className="max-w-3xl mx-auto p-5 md:p-8 flex flex-col min-h-full">
                                     <FormField name="title" control={form.control} render={({ field }) => (
                                        <FormItem className="mb-4">
                                            <FormControl>
                                                <input 
                                                    {...field} 
                                                    autoFocus={!editingNote?.id}
                                                    placeholder="Başlık" 
                                                    className="w-full text-2xl md:text-3xl font-black bg-transparent outline-none border-none p-0 placeholder:text-black/30 text-black/90 tracking-tight" 
                                                />
                                            </FormControl>
                                        </FormItem>
                                    )}/>
                                    <FormField name="content" control={form.control} render={({ field }) => (
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

                            {/* Color Picker (Sticky Bottom) */}
                            <div className="h-16 px-4 border-t border-black/5 bg-white/20 backdrop-blur-xl flex items-center justify-center shrink-0 overflow-x-auto pb-safe shadow-[0_-4px_10px_rgba(0,0,0,0.02)]">
                                <FormField name="color" control={form.control} render={({field}) => (
                                    <FormItem>
                                        <FormControl>
                                            <div className="flex items-center gap-4">
                                                {noteColors.map(color => (
                                                    <button 
                                                        key={color.id} 
                                                        type="button" 
                                                        onClick={() => form.setValue('color', color.class)} 
                                                        className={cn(
                                                            "w-8 h-8 rounded-full border-2 transition-all flex items-center justify-center active:scale-90", 
                                                            color.preview,
                                                            form.watch('color') === color.class ? cn(color.ring, "border-white ring-2 ring-offset-2 ring-offset-black/5 scale-110") : "border-black/5 hover:scale-105 shadow-sm"
                                                        )}
                                                    >
                                                        {form.watch('color') === color.class && <Check className="w-4 h-4 text-black/50" strokeWidth={3} />}
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

// --- STICKY NOTE CARD ---
function StickyNoteCard({ note, onEdit, onDelete }: { note: Note, onEdit: () => void, onDelete: () => void }) {
    const colorClass = note.color || noteColors[0].class;
    const contentText = Array.isArray(note.content) ? (note.content.find(b => b.type === 'text')?.data || '') : '';
    const plainText = typeof contentText === 'string' ? contentText.replace(/<[^>]+>/g, '') : '';
    
    return (
        <div 
            onClick={onEdit}
            className={cn(
                "group relative flex flex-col rounded-[1.25rem] transition-all duration-200 active:scale-95 cursor-pointer overflow-hidden p-4 shadow-sm hover:shadow-md border border-black/5",
                colorClass,
            )}
        >
             <div className="absolute top-2 right-2">
                 <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-black/5 active:scale-90 transition-transform" onClick={(e) => e.stopPropagation()}>
                            <MoreHorizontal className="w-5 h-5 opacity-40" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-40 rounded-2xl bg-white border-slate-100 p-1.5 shadow-xl">
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(); }} className="cursor-pointer font-bold text-slate-700 py-2.5 px-3 rounded-xl hover:bg-slate-50">
                            Düzenle
                        </DropdownMenuItem>
                        <DropdownMenuSeparator className="bg-slate-100 my-1" />
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-rose-600 font-bold cursor-pointer focus:bg-rose-50 rounded-xl py-2.5 px-3">
                                    <Trash2 className="w-4 h-4 mr-2" /> Sil
                                </DropdownMenuItem>
                            </AlertDialogTrigger>
                            <AlertDialogContent className="w-[85%] max-w-sm rounded-[2rem] bg-white border-none shadow-2xl p-6">
                                <AlertDialogHeader>
                                    <AlertDialogTitle className="text-xl font-black text-slate-900">Notu Sil?</AlertDialogTitle>
                                    <AlertDialogDescription className="text-slate-500 font-medium text-sm">
                                        Bu not kalıcı olarak silinecektir. Emin misiniz?
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter className="mt-6 flex-row gap-2">
                                    <AlertDialogCancel className="flex-1 rounded-xl h-12 bg-slate-100 border-none hover:bg-slate-200 text-slate-700 font-bold m-0 active:scale-95 transition-transform">Vazgeç</AlertDialogCancel>
                                    <AlertDialogAction onClick={(e) => { e.stopPropagation(); onDelete(); }} className="flex-1 rounded-xl h-12 bg-rose-500 hover:bg-rose-600 active:bg-rose-700 text-white font-bold m-0 active:scale-95 transition-transform">Sil</AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    </DropdownMenuContent>
                </DropdownMenu>
             </div>
            
            {note.title && (
                <h3 className="font-black text-[15px] leading-tight mb-2 pr-6 tracking-tight opacity-90">{note.title}</h3>
            )}
            
            <div className="flex-1 overflow-hidden relative">
                <p className={cn(
                    "text-[13px] leading-relaxed font-medium whitespace-pre-wrap opacity-75",
                    note.title ? "line-clamp-4" : "line-clamp-6"
                )}>
                    {plainText || "Boş not..."}
                </p>
                {/* Fade out bottom text effect to mimic paper cutoff */}
                <div className="absolute bottom-0 left-0 right-0 h-6 bg-gradient-to-t from-[var(--tw-gradient-from)] to-transparent pointer-events-none" />
            </div>
            
            <div className="mt-3 pt-3 border-t border-black/5 flex items-center gap-1.5 opacity-50">
                <CalendarClock className="w-3 h-3" />
                <span className="text-[9px] font-black tracking-widest uppercase">
                    {note.updatedAt ? new Date(note.updatedAt).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' }) : ''}
                </span>
            </div>
        </div>
    )
}
