
"use client";

import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth-provider';
import { Notebook as NotebookType, NotebookSection, Note, NoteContentBlock } from '@/lib/data';
import { onNotebookDetailsUpdate, deleteNoteFromSection, updateNotebook, addNoteToSection, updateNoteInSection, updateNotebookFolder } from '@/lib/dataService';
import { Button } from '@/components/ui/button';
import { Plus, ArrowLeft, Edit, Trash2, StickyNote, FolderPlus, Folder, MoreVertical, PenLine, Book, FolderOpen, Sparkles, X, Palette, ChevronRight } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle as AlertDialogTitleComponent, AlertDialogFooter as AlertDialogFooterComponent, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Textarea } from '@/components/ui/textarea';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Combobox } from '@/components/ui/combobox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useForm } from 'react-hook-form';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import Image from 'next/image';

// --- TASARIM: AÇIK TEMA (LIGHT NOTEBOOK) ---
const themeColors = {
    PAGE_BG: "bg-slate-50",
    SIDEBAR_BG: "bg-white border-r border-slate-200",
    NOTE_BG: "bg-white border-slate-200", // Default note color
    HEADER_BG: "bg-white/80 backdrop-blur-md border-b border-slate-200",
};

const noteColors = [
    { name: 'Sarı', class: 'bg-amber-50 border-amber-200 text-amber-900 hover:bg-amber-100', accent: 'border-amber-400' },
    { name: 'Mavi', class: 'bg-blue-50 border-blue-200 text-blue-900 hover:bg-blue-100', accent: 'border-blue-400' },
    { name: 'Yeşil', class: 'bg-emerald-50 border-emerald-200 text-emerald-900 hover:bg-emerald-100', accent: 'border-emerald-400' },
    { name: 'Pembe', class: 'bg-pink-50 border-pink-200 text-pink-900 hover:bg-pink-100', accent: 'border-pink-400' },
    { name: 'Mor', class: 'bg-violet-50 border-violet-200 text-violet-900 hover:bg-violet-100', accent: 'border-violet-400' },
    { name: 'Gri', class: 'bg-white border-slate-200 text-slate-900 hover:bg-slate-50', accent: 'border-slate-300' },
];

const sectionGradients = [
    'from-rose-100 to-pink-50 border-rose-200 text-rose-700',
    'from-blue-100 to-indigo-50 border-blue-200 text-blue-700',
    'from-emerald-100 to-teal-50 border-emerald-200 text-emerald-700',
    'from-amber-100 to-orange-50 border-amber-200 text-amber-700',
    'from-violet-100 to-purple-50 border-violet-200 text-violet-700',
];

interface NotebookDetails {
    notebook: NotebookType;
    notes: Note[];
}

// NOTE FORM SCHEMA
const noteFormSchema = z.object({
    title: z.string().min(1, "Başlık gereklidir").default(""),
    content: z.string().optional().default(""),
    color: z.string().optional(),
    folder: z.string().optional(),
});
type NoteFormData = z.infer<typeof noteFormSchema>;

export default function NotebookClient() {
    const params = useParams();
    const router = useRouter();
    const notebookId = params.notebookId as string;
    const { user } = useAuth();
    const { toast } = useToast();

    // Data State
    const [details, setDetails] = useState<NotebookDetails | null>(null);
    const [sections, setSections] = useState<NotebookSection[]>([]);
    
    // UI State
    const [activeSectionId, setActiveSectionId] = useState<string | null>(null);
    const [isMobile, setIsMobile] = useState(false);
    const [isSectionDialogOpen, setIsSectionDialogOpen] = useState(false);
    const [editingSection, setEditingSection] = useState<NotebookSection | null>(null);
    const [sectionTitle, setSectionTitle] = useState("");
    const [isFolderDialogOpen, setIsFolderDialogOpen] = useState(false);
    const [editingFolder, setEditingFolder] = useState<{ oldName: string; sectionId: string } | null>(null);
    const [newFolderName, setNewFolderName] = useState('');
    const [editingNote, setEditingNote] = useState<Note | null>(null);

    // Responsive Check
    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 768);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    // Data Fetching
    useEffect(() => {
        if (!notebookId || !user) return;
        const unsubscribe = onNotebookDetailsUpdate(notebookId, (data) => {
            if (data) {
                const sortedSections = (data.notebook.sections || []).sort((a, b) => a.order - b.order);
                setDetails({ ...data, notebook: { ...data.notebook, sections: sortedSections } });
                setSections(sortedSections);
                
                // Masaüstünde otomatik ilk bölümü seç
                if (!activeSectionId && sortedSections.length > 0 && window.innerWidth >= 768) {
                    setActiveSectionId(sortedSections[0].id);
                }
            } else {
                setDetails(null);
                router.push('/notes'); // Defter silindiyse geri dön
            }
        });
        return () => unsubscribe();
    }, [notebookId, user, router, activeSectionId]);

    // --- ACTIONS ---

    const handleSaveSection = async () => {
        if (!sectionTitle.trim() || !details) return;
        let newSections: NotebookSection[];

        if (editingSection) {
            newSections = details.notebook.sections.map(s => s.id === editingSection.id ? { ...s, title: sectionTitle.trim() } : s);
        } else {
            const newSection: NotebookSection = {
                id: Date.now().toString(),
                title: sectionTitle.trim(),
                color: sectionGradients[Math.floor(Math.random() * sectionGradients.length)], // Random color for now
                order: details.notebook.sections.length,
                folders: [],
            }
            newSections = [...(details.notebook.sections || []), newSection];
            if(!activeSectionId) setActiveSectionId(newSection.id);
        }

        try {
            await updateNotebook(notebookId, { sections: newSections });
            toast({ title: editingSection ? 'Bölüm Güncellendi' : 'Bölüm Eklendi' });
            setIsSectionDialogOpen(false);
            setSectionTitle("");
            setEditingSection(null);
        } catch (e) {
            toast({ title: 'Hata', variant: 'destructive' });
        }
    };

    const handleDeleteSection = async (sectionId: string) => {
        if (!details) return;
        const newSections = (details.notebook.sections || []).filter(s => s.id !== sectionId);
        const notesToDelete = details.notes.filter(n => n.sectionId === sectionId);

        try {
            await updateNotebook(notebookId, { sections: newSections });
            for (const note of notesToDelete) {
                await deleteNoteFromSection(note.id);
            }
            toast({ title: 'Bölüm Silindi', variant: 'destructive' });
            if (activeSectionId === sectionId) setActiveSectionId(null);
        } catch (e) {
            toast({ title: 'Hata', variant: 'destructive' });
        }
    };

    const handleSaveNote = async (noteData: Partial<Note>) => {
        try {
            if (editingNote?.id) {
                await updateNoteInSection(notebookId, editingNote.id, noteData);
                toast({ title: "Not Güncellendi" });
            } else {
                if (!activeSectionId) throw new Error("Bölüm seçilmedi");
                await addNoteToSection(notebookId, activeSectionId, noteData);
                toast({ title: "Not Eklendi" });
            }
        } catch (error) {
            toast({ title: 'Hata', variant: 'destructive' });
        } finally {
            setEditingNote(null);
        }
    };

    const handleDeleteNote = async (noteId: string) => {
        try {
            await deleteNoteFromSection(noteId);
            toast({ title: 'Not Silindi', variant: 'destructive' });
        } catch (error) {
            toast({ title: 'Hata', variant: 'destructive' });
        }
    };

     const handleAddNewFolder = async () => {
        if (!newFolderName.trim() || !details || !activeSectionId) return;
        const currentSection = details.notebook.sections.find(s => s.id === activeSectionId);
        if (!currentSection) return;
        
        const updatedFolders = [...(currentSection.folders || []), newFolderName.trim()];
        const updatedSections = details.notebook.sections.map(s => s.id === activeSectionId ? { ...s, folders: updatedFolders } : s);

        try {
            await updateNotebook(notebookId, { sections: updatedSections });
            toast({ title: "Klasör Eklendi" });
            setNewFolderName('');
            setIsFolderDialogOpen(false);
        } catch (e) { toast({ title: 'Hata', variant: 'destructive' }); }
    };

    const handleUpdateFolder = async () => {
        if (!editingFolder || !newFolderName.trim()) return;
        try {
            await updateNotebookFolder(notebookId, editingFolder.sectionId, editingFolder.oldName, newFolderName);
            toast({ title: 'Klasör Güncellendi'});
            setIsFolderDialogOpen(false);
            setEditingFolder(null);
            setNewFolderName('');
        } catch (e) { toast({ title: 'Hata', variant: 'destructive' }); }
    }
    
    const handleDeleteFolder = async (folder: string, sectionId: string) => {
        if (!details) return;
        const currentSection = details.notebook.sections.find(s => s.id === sectionId);
        if(!currentSection) return;
        const updatedFolders = (currentSection.folders || []).filter(f => f !== folder);
        const updatedSections = details.notebook.sections.map(s => s.id === sectionId ? { ...s, folders: updatedFolders } : s);
        
        try {
             await updateNotebook(notebookId, { sections: updatedSections });
             toast({ title: "Klasör Silindi", variant: 'destructive' });
        } catch(e) { toast({ title: 'Hata', variant: 'destructive' }); }
    }

    if (!details) return <div className="flex h-screen items-center justify-center text-slate-500">Yükleniyor...</div>;

    const activeSection = sections.find(s => s.id === activeSectionId);
    const activeNotes = details.notes.filter(n => n.sectionId === activeSectionId).sort((a,b) => (b.updatedAt ? new Date(b.updatedAt).getTime() : 0) - (a.updatedAt ? new Date(a.updatedAt).getTime() : 0));
    
    // Group notes by folder
    const notesByFolder = activeNotes.reduce((acc, note) => {
        const folder = note.folder || "Genel";
        if (!acc[folder]) acc[folder] = [];
        acc[folder].push(note);
        return acc;
    }, {} as Record<string, Note[]>);

    const folderOrder = ["Genel", ...(activeSection?.folders || [])];

    return (
        <div className={cn("flex h-[100dvh] overflow-hidden font-sans text-slate-900 bg-slate-50")}>
            
            {/* --- SOL PANEL: BÖLÜM LİSTESİ (SEKMELER) --- */}
            <div className={cn(
                "flex-col border-r border-slate-200 bg-white w-full md:w-72 flex-shrink-0 transition-all duration-300 z-20",
                activeSectionId && isMobile ? "hidden" : "flex"
            )}>
                <div className="p-4 border-b border-slate-200 bg-white sticky top-0">
                     <div className="flex items-center gap-3 mb-4">
                        <Button variant="ghost" size="icon" className="-ml-2 text-slate-500" onClick={() => router.push('/notes')}>
                            <ArrowLeft className="w-5 h-5" />
                        </Button>
                        <h1 className="text-lg font-bold text-slate-800 truncate">{details.notebook.title}</h1>
                    </div>
                    <Button onClick={() => { setEditingSection(null); setSectionTitle(""); setIsSectionDialogOpen(true); }} className="w-full justify-start bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-indigo-600 hover:border-indigo-200 shadow-sm h-10">
                        <Plus className="w-4 h-4 mr-2" /> Yeni Bölüm
                    </Button>
                </div>

                <ScrollArea className="flex-1 p-3">
                    <div className="space-y-2">
                        {sections.map((section, index) => {
                             const isSelected = activeSectionId === section.id;
                             // Assign colors cyclically if not stored
                             const gradientClass = section.color || sectionGradients[index % sectionGradients.length];

                             return (
                                <div key={section.id} 
                                    onClick={() => setActiveSectionId(section.id)}
                                    className={cn(
                                        "group flex items-center justify-between px-4 py-3 rounded-xl cursor-pointer transition-all border",
                                        isSelected 
                                            ? `bg-gradient-to-r ${gradientClass} shadow-sm border-transparent` 
                                            : "bg-white border-transparent hover:bg-slate-50 hover:border-slate-200 text-slate-600"
                                    )}
                                >
                                    <div className="flex items-center gap-3 font-medium truncate">
                                        <span className={cn("text-lg", isSelected ? "text-white/80" : "text-slate-400")}>
                                            {/* Folder icon or custom icon */}
                                            {index + 1}.
                                        </span>
                                        <span className={cn("truncate", isSelected ? "text-white font-bold" : "")}>{section.title}</span>
                                    </div>

                                    <div className={cn("flex items-center", isSelected ? "text-white" : "opacity-0 group-hover:opacity-100")}>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                 <Button variant="ghost" size="icon" className={cn("h-7 w-7 rounded-full", isSelected ? "hover:bg-white/20 text-white" : "hover:bg-slate-200 text-slate-400")}>
                                                    <MoreVertical className="w-4 h-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end" className="w-40">
                                                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setEditingSection(section); setSectionTitle(section.title); setIsSectionDialogOpen(true); }}>
                                                    <Edit className="w-3 h-3 mr-2" /> Düzenle
                                                </DropdownMenuItem>
                                                <DropdownMenuItem className="text-red-600 focus:text-red-700" onClick={(e) => { e.stopPropagation(); handleDeleteSection(section.id); }}>
                                                    <Trash2 className="w-3 h-3 mr-2" /> Sil
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                        <ChevronRight className={cn("w-4 h-4 ml-1 sm:hidden", isSelected ? "text-white" : "text-slate-300")} />
                                    </div>
                                </div>
                             )
                        })}
                        {sections.length === 0 && (
                            <div className="text-center py-10 text-slate-400 text-sm px-4">
                                <p>Bu defter boş.</p>
                                <p className="text-xs mt-1">Bölüm ekleyerek düzenlemeye başla.</p>
                            </div>
                        )}
                    </div>
                </ScrollArea>
            </div>

            {/* --- SAĞ PANEL: NOTLAR --- */}
            <div className={cn(
                "flex-col bg-slate-50 overflow-hidden relative w-full h-full",
                !activeSectionId && isMobile ? "hidden" : "flex"
            )}>
                 {/* Header */}
                 <div className="h-16 px-4 md:px-6 border-b border-slate-200 bg-white/80 backdrop-blur-md flex items-center justify-between sticky top-0 z-10 shrink-0">
                    <div className="flex items-center gap-2 overflow-hidden">
                        <Button variant="ghost" size="icon" className="md:hidden mr-1 text-slate-500" onClick={()={() => setActiveSectionId(null)}>
                            <ArrowLeft className="w-5 h-5" />
                        </Button>
                        <h2 className="text-lg md:text-xl font-bold text-slate-800 truncate">
                            {activeSection?.title || "Bölüm Seçin"}
                        </h2>
                    </div>
                    {activeSectionId && (
                         <div className="flex gap-2">
                             <Button variant="outline" size="sm" className="hidden sm:flex" onClick={() => { setNewFolderName(""); setEditingFolder(null); setIsFolderDialogOpen(true); }}>
                                 <FolderPlus className="w-4 h-4 mr-2" /> Klasör
                             </Button>
                             <Button className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm rounded-lg h-9 text-sm font-medium px-3 md:px-4" onClick={() => {
                                 setEditingNote({ id: '', notebookId, sectionId: activeSectionId, familyId: details.notebook.familyId, title: "", content: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
                             }}>
                                <PenLine className="w-4 h-4 md:mr-2" /> <span className="hidden md:inline">Not Yaz</span>
                            </Button>
                         </div>
                    )}
                 </div>
                 
                 {/* Content */}
                 <ScrollArea className="flex-1 p-4 md:p-6 w-full">
                    {!activeSectionId ? (
                        <div className="flex flex-col items-center justify-center h-[50vh] text-center opacity-60 px-4">
                            <Book className="w-16 h-16 text-slate-300 mb-4" />
                            <p className="text-lg font-medium text-slate-500">Bir bölüm seçin.</p>
                        </div>
                    ) : (
                         <div className="space-y-8 pb-20">
                             {folderOrder.map((folderName) => {
                                 const folderNotes = notesByFolder[folderName];
                                 if ((!folderNotes || folderNotes.length === 0) && folderName === 'Genel' && folderOrder.length > 1) return null; // Don't show empty General if others exist
                                 
                                 return (
                                     <div key={folderName} className="space-y-3">
                                         {/* Folder Header */}
                                         <div className="flex items-center justify-between group">
                                             <div className="flex items-center gap-2 text-slate-500">
                                                 {folderName === 'Genel' ? <Sparkles className="w-4 h-4" /> : <Folder className="w-4 h-4 text-amber-500" />}
                                                 <span className="text-sm font-bold uppercase tracking-wider">{folderName}</span>
                                                 <span className="text-xs bg-slate-200 px-1.5 py-0.5 rounded-full text-slate-600 font-mono">{folderNotes?.length || 0}</span>
                                             </div>
                                             {folderName !== 'Genel' && (
                                                 <DropdownMenu>
                                                     <DropdownMenuTrigger asChild>
                                                         <Button variant="ghost" size="icon" className="h-6 w-6 text-slate-300 hover:text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity">
                                                             <MoreVertical className="w-3 h-3" />
                                                         </Button>
                                                     </DropdownMenuTrigger>
                                                     <DropdownMenuContent align="end">
                                                         <DropdownMenuItem onClick={() => { setNewFolderName(folderName); setEditingFolder({oldName: folderName, sectionId: activeSectionId}); setIsFolderDialogOpen(true); }}>
                                                             <Edit className="w-3 h-3 mr-2" /> Adlandır
                                                         </DropdownMenuItem>
                                                         <DropdownMenuItem className="text-red-600" onClick={() => handleDeleteFolder(folderName, activeSectionId)}>
                                                             <Trash2 className="w-3 h-3 mr-2" /> Sil
                                                         </DropdownMenuItem>
                                                     </DropdownMenuContent>
                                                 </DropdownMenu>
                                             )}
                                         </div>
                                         
                                         {/* Notes Grid */}
                                         <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                             {folderNotes?.map(note => (
                                                 <StickyNoteCard 
                                                     key={note.id} 
                                                     note={note} 
                                                     onEdit={() => setEditingNote(note)} 
                                                     onDelete={() => handleDeleteNote(note.id)} 
                                                 />
                                             ))}
                                             {/* Empty State for Folder */}
                                             {(!folderNotes || folderNotes.length === 0) && (
                                                 <div className="col-span-full border-2 border-dashed border-slate-200 rounded-xl p-6 text-center text-slate-400 text-sm">
                                                     Bu klasör boş.
                                                 </div>
                                             )}
                                         </div>
                                     </div>
                                 )
                             })}
                         </div>
                    )}
                 </ScrollArea>
            </div>

            {/* --- DIALOGS --- */}
            {/* Section Edit Dialog */}
            <Dialog open={isSectionDialogOpen} onOpenChange={setIsSectionDialogOpen}>
                <DialogContent className="sm:max-w-md bg-slate-900 border-slate-800 text-slate-100 rounded-2xl">
                    <DialogHeader>
                        <DialogTitle>{editingSection ? "Bölümü Düzenle" : "Yeni Bölüm"}</DialogTitle>
                    </DialogHeader>
                    <div className="py-4">
                        <Input 
                            placeholder="Bölüm Adı" 
                            value={sectionTitle} 
                            onChange={(e) => setSectionTitle(e.target.value)} 
                            onKeyDown={(e) => e.key === 'Enter' && handleSaveSection()}
                            className="bg-slate-950 border-slate-700 text-slate-200"
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" className="hover:bg-slate-800" onClick={() => setIsSectionDialogOpen(false)}>İptal</Button>
                        <Button onClick={handleSaveSection} className="bg-indigo-600 text-white hover:bg-indigo-700">Kaydet</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            
            {/* Folder Dialog */}
             <Dialog open={isFolderDialogOpen} onOpenChange={setIsFolderDialogOpen}>
                <DialogContent className="sm:max-w-md bg-slate-900 border-slate-800 text-slate-100 rounded-2xl">
                    <DialogHeader>
                        <DialogTitle>{editingFolder ? "Klasörü Düzenle" : "Yeni Klasör"}</DialogTitle>
                    </DialogHeader>
                    <div className="py-4">
                        <Input 
                            placeholder="Klasör Adı" 
                            value={newFolderName} 
                            onChange={(e) => setNewFolderName(e.target.value)} 
                            onKeyDown={(e) => e.key === 'Enter' && (editingFolder ? handleUpdateFolder() : handleAddNewFolder())}
                            className="bg-slate-950 border-slate-700 text-slate-200"
                        />
                    </div>
                    <DialogFooter>
                         <Button variant="ghost" className="hover:bg-slate-800" onClick={() => setIsFolderDialogOpen(false)}>İptal</Button>
                        <Button onClick={editingFolder ? handleUpdateFolder : handleAddNewFolder} className="bg-indigo-600 text-white hover:bg-indigo-700">{editingFolder ? "Güncelle" : "Oluştur"}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* NOTE EDIT FORM (Integrated Dialog) */}
            <NoteEditDialog 
                note={editingNote} 
                sectionFolders={activeSection?.folders || []} 
                onOpenChange={(open) => { if(!open) setEditingNote(null) }} 
                onSave={handleSaveNote}
            />

        </div>
    );
}

// --- SUB-COMPONENTS ---

function StickyNoteCard({ note, onEdit, onDelete }: { note: Note, onEdit: () => void, onDelete: () => void }) {
     const getNoteColors = (colorClass: string | undefined) => {
        if (!colorClass) return "bg-white border-slate-200 text-slate-600 hover:border-indigo-300";
        return colorClass; // Uses the full class string stored in DB
    };
    
    // Fallback if old data only has color name
    const resolvedColor = noteColors.find(c => note.color?.includes(c.name.toLowerCase()))?.class || note.color || "bg-white border-slate-200 text-slate-600 hover:border-indigo-300";
    const accentColor = noteColors.find(c => note.color?.includes(c.name.toLowerCase()))?.accent || "border-slate-200";

    const contentText = Array.isArray(note.content) ? (note.content.find(b => b.type === 'text')?.data || '') : '';
    const plainText = typeof contentText === 'string' ? contentText.replace(/<[^>]+>/g, '') : '';

    return (
        <div 
            onClick={onEdit}
            className={cn(
                "group relative flex flex-col h-60 p-5 rounded-sm border shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md cursor-pointer overflow-hidden",
                resolvedColor
            )}
        >
            {/* Kağıt Dokusu */}
            <div className="absolute inset-0 pointer-events-none opacity-[0.03] bg-[linear-gradient(transparent_19px,#000_20px)] bg-[length:100%_20px]" />
            {/* Top Tape Effect (Visual) */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-16 h-3 bg-white/40 backdrop-blur-sm shadow-sm rotate-1" />

            <div className="relative z-10 flex flex-col h-full">
                <h3 className={cn("font-bold text-lg leading-tight mb-2 line-clamp-2", `text-${resolvedColor.split(' ')[2].split('-')[1]}-900`)}>
                    {note.title || "İsimsiz Not"}
                </h3>
                
                <div className="flex-1 overflow-hidden">
                     <p className="text-sm opacity-80 leading-relaxed font-medium whitespace-pre-wrap line-clamp-6 font-serif">
                        {plainText || "İçerik yok..."}
                    </p>
                </div>

                <div className={cn("mt-auto pt-3 border-t flex items-center justify-between text-xs opacity-60 font-semibold", accentColor)}>
                     <span>{note.updatedAt ? new Date(note.updatedAt).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' }) : 'Tarih yok'}</span>
                     <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                         <Button variant="ghost" size="icon" className="h-6 w-6 hover:bg-black/10 rounded-full" onClick={(e) => {e.stopPropagation(); onDelete();}}>
                             <Trash2 className="w-3.5 h-3.5 text-red-500" />
                         </Button>
                     </div>
                </div>
            </div>
        </div>
    )
}

function NoteEditDialog({ note, onOpenChange, onSave, sectionFolders }: { note: Note | null, onOpenChange: (o: boolean) => void, onSave: (d: any) => void, sectionFolders: string[] }) {
    const form = useForm<NoteFormData>();
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    
    // Auto-resize textarea
    useLayoutEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
        }
    }, [form.watch('content'), note]);

    useEffect(() => {
        if (note) {
            form.reset({
                title: note.title,
                content: Array.isArray(note.content) ? (note.content.find(b => b.type === 'text')?.data || '') : '',
                color: note.color,
                folder: note.folder || ''
            });
        }
    }, [note, form]);

    if (!note) return null;

    const watchedColor = form.watch('color');
    // Renk sınıfını bulmak için helper
    const activeColorObj = noteColors.find(c => c.class === watchedColor) || noteColors[5]; // Default Gray

    const handleFormSubmit = (data: NoteFormData) => {
        const updatedContent: NoteContentBlock[] = [{ id: note.content?.[0]?.id || Date.now().toString(), type: 'text', data: data.content || '' }];
        onSave({ ...data, content: updatedContent });
    }

    return (
        <Dialog open={!!note} onOpenChange={onOpenChange}>
            <DialogContent className={cn("w-[100vw] h-[100dvh] md:w-full md:max-w-2xl md:h-auto md:max-h-[85vh] p-0 border-none shadow-2xl flex flex-col md:rounded-xl overflow-hidden", activeColorObj.class)}>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleFormSubmit)} className="flex flex-col h-full relative">
                        {/* Header */}
                        <div className={cn("flex-row items-center justify-between px-6 py-4 border-b shrink-0 bg-white/40 backdrop-blur-md flex", activeColorObj.accent)}>
                             <div className="flex items-center gap-2 opacity-70">
                                 <StickyNote className="w-5 h-5" />
                                 <span className="text-sm font-bold uppercase tracking-wider">{note.id ? 'Notu Düzenle' : 'Yeni Not'}</span>
                             </div>
                             <div className="flex items-center gap-2">
                                <DialogClose asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-black/10 rounded-full">
                                        <X className="h-5 w-5" />
                                    </Button>
                                </DialogClose>
                             </div>
                        </div>

                        {/* Content Area */}
                        <ScrollArea className="flex-1">
                            <div className="p-8 space-y-6 min-h-[50vh]">
                                 {/* Kağıt Çizgileri */}
                                 <div className="absolute inset-0 pointer-events-none opacity-[0.03] bg-[linear-gradient(transparent_23px,#000_24px)] bg-[length:100%_24px]" />

                                 {/* Title */}
                                 <FormField name="title" control={form.control} render={({ field }) => (
                                    <FormItem>
                                        <FormControl>
                                            <Input 
                                                {...field} 
                                                placeholder="Başlık" 
                                                className="text-3xl font-black bg-transparent border-none p-0 focus-visible:ring-0 placeholder:text-black/20 text-black/80" 
                                            />
                                        </FormControl>
                                    </FormItem>
                                 )}/>

                                 {/* Body */}
                                 <FormField name="content" control={form.control} render={({ field }) => (
                                    <FormItem>
                                        <FormControl>
                                            <Textarea 
                                                {...field} 
                                                ref={textareaRef}
                                                placeholder="Buraya yazmaya başla..." 
                                                className="bg-transparent border-none resize-none p-0 text-lg leading-relaxed focus-visible:ring-0 placeholder:text-black/30 text-black/70 font-serif min-h-[300px]" 
                                            />
                                        </FormControl>
                                    </FormItem>
                                 )}/>
                            </div>
                        </ScrollArea>

                        {/* Footer / Tools */}
                        <div className={cn("p-4 border-t bg-white/60 backdrop-blur-md flex flex-col gap-4", activeColorObj.accent)}>
                            <div className="flex items-center gap-4">
                                 {/* Color Picker */}
                                 <div className="flex items-center gap-2">
                                     <Palette className="w-4 h-4 text-black/40" />
                                     <div className="flex gap-1.5">
                                         {noteColors.map(color => (
                                             <button
                                                key={color.name}
                                                type="button"
                                                onClick={() => form.setValue('color', color.class)}
                                                className={cn(
                                                    "w-6 h-6 rounded-full border shadow-sm transition-transform hover:scale-110",
                                                    color.class,
                                                    watchedColor === color.class && "ring-2 ring-slate-800 ring-offset-1 scale-110"
                                                )}
                                                title={color.name}
                                             />
                                         ))}
                                     </div>
                                 </div>
                                 
                                 <div className="h-6 w-px bg-black/10 mx-2" />

                                 {/* Folder Picker */}
                                 <FormField name="folder" control={form.control} render={({ field }) => (
                                     <FormItem className="flex-1 mb-0 space-y-0">
                                         <FormControl>
                                             <Combobox 
                                                options={[{label: 'Genel', value: ''}, ...sectionFolders.map(f => ({ label: f, value: f }))]}
                                                value={field.value || ''}
                                                onChange={field.onChange}
                                                placeholder="Klasör seç..."
                                                className="h-9 bg-white/50 border-black/10 text-sm"
                                             />
                                         </FormControl>
                                     </FormItem>
                                 )} />
                            </div>
                            <Button type="submit" className="w-full bg-slate-900 text-white hover:bg-slate-800 rounded-xl h-11 font-bold shadow-lg">
                                Kaydet
                            </Button>
                        </div>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}

