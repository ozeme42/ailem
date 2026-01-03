
"use client";

import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth-provider';
import { Notebook as NotebookType, NotebookSection, Note, NoteContentBlock } from '@/lib/data';
import { onNotebookDetailsUpdate, deleteNoteFromSection, updateNotebook, addNoteToSection, updateNoteInSection, updateNotebookFolder, deleteTag } from '@/lib/dataService';
import { Button } from '@/components/ui/button';
import { Plus, ArrowLeft, Edit, Trash2, StickyNote, FolderPlus, Folder, ChevronDown, MoreVertical, LayoutGrid, FileText, Sparkles, Palette, X, PenLine, ChevronRight, Book, FolderOpen } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle as AlertDialogTitleComponent, AlertDialogFooter as AlertDialogFooterComponent, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Textarea } from '@/components/ui/textarea';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Combobox } from '@/components/ui/combobox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useForm } from 'react-hook-form';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { z } from 'zod';
import { zodResolver } from "@hookform/resolvers/zod";
import Image from 'next/image';

const sectionGradients = [
    'from-rose-500 to-pink-500',
    'from-blue-500 to-indigo-500',
    'from-emerald-500 to-teal-500',
    'from-amber-500 to-orange-500',
    'from-violet-500 to-purple-500',
];

const noteParchmentColors = [
    { name: 'Saman', class: 'bg-[#fffbeb] border-[#fde68a] text-amber-900', accent: 'border-amber-300' },
    { name: 'Gökyüzü', class: 'bg-[#f0f9ff] border-[#bae6fd] text-sky-900', accent: 'border-sky-300' },
    { name: 'Nane', class: 'bg-[#f0fdf4] border-[#bbf7d0] text-green-900', accent: 'border-emerald-300' },
    { name: 'Gül', class: 'bg-[#fff1f2] border-[#fecdd3] text-rose-900', accent: 'border-rose-300' },
    { name: 'Lavanta', class: 'bg-[#f5f3ff] border-[#ddd6fe] text-violet-900', accent: 'border-violet-300' },
    { name: 'Taş', class: 'bg-slate-100 border-slate-200 text-slate-800', accent: 'border-slate-300' },
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
    const [activeFolderFilter, setActiveFolderFilter] = useState<string>('Tümü'); 
    const [isMobile, setIsMobile] = useState(false);
    
    // Dialog States
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
                
                if (!activeSectionId && sortedSections.length > 0 && window.innerWidth >= 768) {
                    setActiveSectionId(sortedSections[0].id);
                }
            } else {
                setDetails(null);
                router.push('/notes');
            }
        });
        return () => unsubscribe();
    }, [notebookId, user, router, activeSectionId]);

    // Bölüm değişince klasör filtresini sıfırla
    useEffect(() => {
        setActiveFolderFilter('Tümü');
    }, [activeSectionId]);
    
    const activeSection = sections.find(s => s.id === activeSectionId);
    
    const { allNotesInSection, notesByFolder, folderStats, displayedNotes } = React.useMemo(() => {
        if (!details || !activeSectionId) {
            return { allNotesInSection: [], notesByFolder: {}, folderStats: {}, displayedNotes: [] };
        }

        const notesInSection = details.notes.filter(n => n.sectionId === activeSectionId).sort((a, b) => (b.updatedAt ? new Date(b.updatedAt).getTime() : 0) - (a.updatedAt ? new Date(a.updatedAt).getTime() : 0));
        
        const byFolder = notesInSection.reduce((acc, note) => {
            const folderName = note.folder || 'Genel';
            if (!acc[folderName]) acc[folderName] = [];
            acc[folderName].push(note);
            return acc;
        }, {} as Record<string, Note[]>);

        const stats = Object.keys(byFolder).reduce((acc, folder) => {
            acc[folder] = byFolder[folder].length;
            return acc;
        }, {} as Record<string, number>);

        const notesToDisplay = activeFolderFilter === 'Tümü'
            ? notesInSection
            : activeFolderFilter === 'Genel'
                ? notesInSection.filter(n => !n.folder || n.folder === '')
                : notesInSection.filter(n => n.folder === activeFolderFilter);

        return { allNotesInSection: notesInSection, notesByFolder: byFolder, folderStats: stats, displayedNotes: notesToDisplay };
    }, [details, activeSectionId, activeFolderFilter]);


    const generalCount = folderStats['Genel'] || 0;
    const folderOrder = ['Tümü', 'Genel', ...(activeSection?.folders || []).sort((a, b) => a.localeCompare(b, 'tr'))];

    // --- ACTION HANDLERS ---
    const handleSaveSection = async () => {
        if (!sectionTitle.trim() || !details) return;
        let newSections: NotebookSection[];
        if (editingSection) {
            newSections = details.notebook.sections.map(s => s.id === editingSection.id ? { ...s, title: sectionTitle.trim() } : s);
        } else {
            const newSection: NotebookSection = {
                id: Date.now().toString(),
                title: sectionTitle.trim(),
                color: sectionGradients[details.notebook.sections.length % sectionGradients.length],
                order: details.notebook.sections.length,
                folders: [],
            }
            newSections = [...(details.notebook.sections || []), newSection];
            if(!activeSectionId) setActiveSectionId(newSection.id);
        }
        try {
            await updateNotebook(notebookId, { sections: newSections });
            toast({ title: editingSection ? 'Bölüm Güncellendi' : 'Bölüm Eklendi' });
            setIsSectionDialogOpen(false); setSectionTitle(""); setEditingSection(null);
        } catch (e) { toast({ title: 'Hata', variant: 'destructive' }); }
    };
    
    const handleDeleteSection = async (sectionId: string) => {
        if (!details) return;
        const updatedSections = details.notebook.sections.filter(s => s.id !== sectionId);
        try {
            await updateNotebook(notebookId, { sections: updatedSections });
            toast({ title: 'Bölüm Silindi', variant: 'destructive' });
            if (activeSectionId === sectionId) setActiveSectionId(null);
        } catch (e) { toast({ title: 'Hata', variant: 'destructive' }); }
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
        } catch (error) { toast({ title: 'Hata', variant: 'destructive' }); } 
        finally { setEditingNote(null); }
    };

    const handleDeleteNote = async (noteId: string) => {
        try {
            await deleteNoteFromSection(noteId);
            toast({ title: 'Not Silindi', variant: 'destructive' });
        } catch (error) { toast({ title: 'Hata', variant: 'destructive' }); }
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
            setIsFolderDialogOpen(false); setEditingFolder(null); setNewFolderName('');
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
             if (activeFolderFilter === folder) setActiveFolderFilter('Tümü');
             toast({ title: "Klasör Silindi", variant: 'destructive' });
        } catch(e) { toast({ title: 'Hata', variant: 'destructive' }); }
    }

    if (!details) return <div className="flex h-screen items-center justify-center text-slate-500">Yükleniyor...</div>;

    return (
        <div className={cn("flex h-[100dvh] overflow-hidden font-sans text-slate-900 bg-slate-50")}>
            
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
                    <div className="flex flex-col gap-2">
                        {sections.map((section, index) => {
                             const isSelected = activeSectionId === section.id;
                             const gradientClass = section.color || sectionGradients[index % sectionGradients.length];
                             const noteCount = details.notes.filter(n => n.sectionId === section.id).length;

                             return (
                                <div 
                                    key={section.id} 
                                    onClick={() => setActiveSectionId(section.id)}
                                    className={cn(
                                        "group relative w-full rounded-2xl cursor-pointer transition-all duration-200 p-4 flex flex-col justify-between border-2",
                                        isSelected 
                                            ? `border-indigo-500 bg-indigo-50 shadow-md` 
                                            : "border-transparent bg-slate-100 hover:border-slate-200"
                                    )}
                                >
                                    <div className="flex w-full justify-between items-start">
                                        <p className={cn("font-bold text-base truncate pr-8", isSelected ? "text-indigo-800" : "text-slate-700")}>{section.title}</p>
                                        <div onClick={(e) => e.stopPropagation()} className={cn("transition-opacity absolute top-3 right-3", isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100")}>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon" className={cn("h-7 w-7 rounded-full hover:bg-black/5", isSelected ? "text-slate-500" : "text-slate-400")}>
                                                        <MoreVertical className="w-4 h-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end" className="w-40 rounded-xl">
                                                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setEditingSection(section); setSectionTitle(section.title); setIsSectionDialogOpen(true); }}>
                                                        <Edit className="w-3 h-3 mr-2" /> Düzenle
                                                    </DropdownMenuItem>
                                                    <AlertDialog>
                                                        <AlertDialogTrigger asChild>
                                                            <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-red-600 focus:text-red-700">
                                                                <Trash2 className="w-3 h-3 mr-2" /> Sil
                                                            </DropdownMenuItem>
                                                        </AlertDialogTrigger>
                                                        <AlertDialogContent>
                                                            <AlertDialogHeader>
                                                                <AlertDialogTitleComponent>Bölümü Sil</AlertDialogTitleComponent>
                                                                <AlertDialogDescription>Bu bölüm ve içindeki tüm notlar silinecek. Emin misiniz?</AlertDialogDescription>
                                                            </AlertDialogHeader>
                                                            <AlertDialogFooterComponent>
                                                                <AlertDialogCancel>Vazgeç</AlertDialogCancel>
                                                                <AlertDialogAction onClick={(e) => { e.stopPropagation(); handleDeleteSection(section.id); }}>Evet, Sil</AlertDialogAction>
                                                            </AlertDialogFooterComponent>
                                                        </AlertDialogContent>
                                                    </AlertDialog>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </div>
                                    </div>
                                    <div className="mt-auto pt-2">
                                        <p className="text-xs font-medium text-slate-400">{noteCount} not</p>
                                    </div>
                                    <div className={cn("absolute bottom-0 left-0 right-0 h-1.5 bg-gradient-to-r rounded-b-xl", gradientClass)}></div>
                                </div>
                             )
                        })}
                        {sections.length === 0 && (
                            <div className="text-center py-10 text-slate-400 text-sm px-4 col-span-1">
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
                        <Button variant="ghost" size="icon" className="md:hidden mr-1 text-slate-500" onClick={() => setActiveSectionId(null)}>
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
                                 setEditingNote({ id: '', notebookId, sectionId: activeSectionId, familyId: details.notebook.familyId, title: "", content: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), folder: activeFolderFilter !== 'Tümü' && activeFolderFilter !== 'Genel' ? activeFolderFilter : '' });
                             }}>
                                <PenLine className="w-4 h-4 md:mr-2" /> <span className="hidden md:inline">Not Yaz</span>
                            </Button>
                         </div>
                    )}
                 </div>
                 
                 {/* Content */}
                 <ScrollArea className="flex-1 w-full">
                    {activeSectionId ? (
                        <div className="p-4 md:p-6 space-y-8 pb-20">
                            {/* Folder Shelf */}
                            <div className="relative -mx-4 md:-mx-6 px-4 md:px-6 py-4 overflow-x-auto scrollbar-hide border-b border-slate-200" style={{background: 'linear-gradient(to bottom, white, #f8fafc)'}}>
                                 <div className="flex gap-3 items-stretch min-w-max">
                                     {folderOrder.map((folderName, index) => {
                                        if (folderName === 'Genel' && generalCount === 0) return null;
                                        if (folderName !== 'Tümü' && folderName !== 'Genel' && !folderStats[folderName]) return null;
                                        
                                        const count = folderName === 'Tümü' ? allNotesInSection.length : folderStats[folderName] || 0;
                                        const activeSectionIndex = sections.findIndex(s => s.id === activeSectionId);
                                        const sectionGradient = activeSection?.color || sectionGradients[activeSectionIndex >= 0 ? activeSectionIndex % sectionGradients.length : 0];

                                        return (
                                            <FolderCard 
                                                key={folderName}
                                                name={folderName}
                                                count={count}
                                                isActive={activeFolderFilter === folderName}
                                                onClick={() => setActiveFolderFilter(folderName)}
                                                onEdit={folderName !== 'Tümü' && folderName !== 'Genel' ? () => { setNewFolderName(folderName); setEditingFolder({oldName: folderName, sectionId: activeSectionId}); setIsFolderDialogOpen(true); } : undefined}
                                                onDelete={folderName !== 'Tümü' && folderName !== 'Genel' ? () => handleDeleteFolder(folderName, activeSectionId) : undefined}
                                                icon={folderName === 'Tümü' ? LayoutGrid : folderName === 'Genel' ? Sparkles : Folder}
                                                gradient={sectionGradient}
                                            />
                                        )
                                     })}
                                 </div>
                            </div>
                            
                            {/* Notes Grid */}
                            {displayedNotes.length > 0 ? (
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                {displayedNotes.map(note => (
                                    <StickyNoteCard 
                                        key={note.id} 
                                        note={note} 
                                        onEdit={() => setEditingNote(note)} 
                                        onDelete={() => handleDeleteNote(note.id)} 
                                    />
                                ))}
                                </div>
                            ) : (
                                 <div className="col-span-full flex flex-col items-center justify-center h-[30vh] text-slate-400">
                                     <FileText className="w-12 h-12 text-slate-300 mb-4" />
                                    <p className="text-lg font-medium text-slate-500">Not bulunamadı</p>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-[50vh] text-center opacity-60 px-4">
                            <Book className="w-16 h-16 text-slate-300 mb-4" />
                            <p className="text-lg font-medium text-slate-500">Bir bölüm seçin.</p>
                        </div>
                    )}
                 </ScrollArea>
            </div>

            {/* --- DIALOGS --- */}
            {/* Section Edit Dialog */}
            <Dialog open={isSectionDialogOpen} onOpenChange={setIsSectionDialogOpen}>
                <DialogContent className="sm:max-w-md bg-white border-slate-200 text-slate-900 rounded-2xl">
                    <DialogHeader>
                        <DialogTitle>{editingSection ? "Bölümü Düzenle" : "Yeni Bölüm"}</DialogTitle>
                    </DialogHeader>
                    <div className="py-4">
                        <Input 
                            placeholder="Bölüm Adı" 
                            value={sectionTitle} 
                            onChange={(e) => setSectionTitle(e.target.value)} 
                            onKeyDown={(e) => e.key === 'Enter' && handleSaveSection()}
                            className="bg-slate-50 border-slate-200 text-slate-900"
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setIsSectionDialogOpen(false)} className="text-slate-500">İptal</Button>
                        <Button onClick={handleSaveSection} className="bg-indigo-600 text-white hover:bg-indigo-700">Kaydet</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            
            {/* Folder Dialog */}
             <Dialog open={isFolderDialogOpen} onOpenChange={setIsFolderDialogOpen}>
                <DialogContent className="sm:max-w-md bg-white border-slate-200 text-slate-900 rounded-2xl">
                    <DialogHeader>
                        <DialogTitle>{editingFolder ? "Klasörü Düzenle" : "Yeni Klasör"}</DialogTitle>
                    </DialogHeader>
                    <div className="py-4">
                        <Input 
                            placeholder="Klasör Adı" 
                            value={newFolderName} 
                            onChange={(e) => setNewFolderName(e.target.value)} 
                            onKeyDown={(e) => e.key === 'Enter' && (editingFolder ? handleUpdateFolder() : handleAddNewFolder())}
                            className="bg-slate-50 border-slate-200 text-slate-900"
                        />
                    </div>
                    <DialogFooter>
                         <Button variant="ghost" onClick={() => setIsFolderDialogOpen(false)}>İptal</Button>
                        <Button onClick={editingFolder ? handleUpdateFolder : handleAddNewFolder} className="bg-indigo-600 text-white hover:bg-indigo-700">{editingFolder ? "Güncelle" : "Oluştur"}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* MODERN NOTE EDITOR */}
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

function FolderCard({ name, count, isActive, onClick, onEdit, onDelete, icon: Icon, gradient }: any) {
    return (
        <div 
            onClick={onClick}
            className={cn(
                "group relative h-28 w-44 shrink-0 cursor-pointer rounded-2xl border p-4 transition-all duration-300 flex flex-col justify-between hover:shadow-lg hover:-translate-y-1",
                isActive 
                    ? `bg-gradient-to-br ${gradient} shadow-md border-transparent text-white` 
                    : "bg-white/50 border-slate-200 hover:bg-white hover:border-slate-300 text-slate-700"
            )}
        >
             <div className="flex w-full justify-between items-start">
                 <div className={cn("p-2 rounded-lg transition-colors", isActive ? "bg-white/10" : "bg-slate-100 group-hover:bg-white")}>
                    <Icon className={cn("w-5 h-5", isActive ? "text-white" : "")} />
                 </div>
                 {(onEdit || onDelete) && (
                     <DropdownMenu>
                         <DropdownMenuTrigger asChild>
                             <Button variant="ghost" size="icon" className={cn("h-7 w-7 -mr-2 -mt-1 hover:bg-black/5 transition-opacity", isActive ? "text-white/60 hover:text-white" : "text-slate-400 hover:text-slate-600 opacity-0 group-hover:opacity-100")}>
                                 <MoreVertical className="w-4 h-4" />
                             </Button>
                         </DropdownMenuTrigger>
                         <DropdownMenuContent onClick={(e) => e.stopPropagation()}>
                             <DropdownMenuItem onClick={(e) => {e.stopPropagation(); onEdit()}}>Düzenle</DropdownMenuItem>
                             <AlertDialog>
                                <AlertDialogTrigger asChild>
                                     <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-red-600 focus:text-red-700">Sil</DropdownMenuItem>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitleComponent>Klasörü Sil</AlertDialogTitleComponent>
                                        <AlertDialogDescription>Klasörü silmek içindeki notları silmez, notlar "Genel" klasörüne taşınır.</AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooterComponent>
                                        <AlertDialogCancel>Vazgeç</AlertDialogCancel>
                                        <AlertDialogAction onClick={(e) => { e.stopPropagation(); onDelete(); }}>Evet, Sil</AlertDialogAction>
                                    </AlertDialogFooterComponent>
                                </AlertDialogContent>
                            </AlertDialog>
                         </DropdownMenuContent>
                     </DropdownMenu>
                 )}
            </div>
            
            <div>
                <p className={cn("font-bold text-base truncate transition-colors", isActive && "text-white")}>{name}</p>
                <p className={cn("text-xs font-medium", isActive ? "text-white/70" : "text-slate-500")}>{count} not</p>
            </div>
        </div>
    )
}

function StickyNoteCard({ note, onEdit, onDelete }: { note: Note, onEdit: () => void, onDelete: () => void }) {
    const colorObj = noteParchmentColors.find(c => c.class === note.color) || noteParchmentColors[5]; // Default Stone
    
    const contentText = Array.isArray(note.content) ? (note.content.find(b => b.type === 'text')?.data || '') : '';
    const plainText = typeof contentText === 'string' ? contentText.replace(/<[^>]+>/g, '') : '';
    
    return (
        <div 
            onClick={onEdit}
            className={cn(
                "group relative flex flex-col h-52 p-5 rounded-2xl border shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md cursor-pointer overflow-hidden",
                colorObj.class, colorObj.text
            )}
        >
            <div className="absolute inset-0 pointer-events-none opacity-[0.03] bg-[linear-gradient(transparent_19px,#000_20px)] bg-[length:100%_20px]" />
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-16 h-3 bg-white/40 backdrop-blur-sm shadow-sm rotate-1" />

            <div className="relative z-10 flex flex-col h-full">
                <h3 className={cn("font-bold text-lg leading-tight mb-2 line-clamp-2 text-current opacity-80")}>
                    {note.title || "İsimsiz Not"}
                </h3>
                
                <div className="flex-1 overflow-hidden">
                     <p className="text-sm opacity-70 leading-relaxed font-normal whitespace-pre-wrap line-clamp-6 font-serif">
                        {plainText || "İçerik yok..."}
                    </p>
                </div>

                <div className={cn("mt-auto pt-3 border-t flex items-center justify-between text-xs opacity-60 font-semibold", colorObj.accent)}>
                     <span>{note.updatedAt ? new Date(note.updatedAt).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' }) : ''}</span>
                     <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                         <Button variant="ghost" size="icon" className="h-6 w-6 hover:bg-black/10 rounded-full" onClick={(e) => {e.stopPropagation(); onDelete();}}>
                             <Trash2 className="w-3.5 h-3.5 text-red-500/70" />
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
                color: note.color || noteParchmentColors[5].class,
                folder: note.folder || ''
            });
        }
    }, [note, form]);

    if (!note) return null;

    const watchedColor = form.watch('color');
    const activeColorObj = noteParchmentColors.find(c => c.class === watchedColor) || noteParchmentColors[5]; // Default Stone

    const handleFormSubmit = (data: NoteFormData) => {
        const updatedContent: NoteContentBlock[] = [{ id: note.content?.[0]?.id || Date.now().toString(), type: 'text', data: data.content || '' }];
        onSave({ ...data, content: updatedContent });
    }

    return (
        <Dialog open={!!note} onOpenChange={onOpenChange}>
            <DialogContent className={cn(
                "w-[100vw] h-[100dvh] md:w-full md:max-w-2xl md:h-auto md:max-h-[85vh] p-0 border-none shadow-2xl flex flex-col md:rounded-xl overflow-hidden transition-colors duration-500",
                activeColorObj.class, activeColorObj.text
            )}>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleFormSubmit)} className="flex flex-col h-full relative">
                        
                        <div className="absolute top-0 left-0 w-full z-20 p-4 md:p-6 flex justify-end">
                            <DialogClose asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-black/10 text-black/40 hover:text-black/70 rounded-full">
                                    <X className="h-5 h-5" />
                                </Button>
                            </DialogClose>
                        </div>
                        <ScrollArea className="flex-1">
                            <div className="max-w-2xl mx-auto p-6 md:p-12 min-h-[60vh] space-y-6 pt-20">
                                 <div className="absolute inset-0 pointer-events-none opacity-[0.03] bg-[linear-gradient(transparent_23px,#000_24px)] bg-[length:100%_24px]" />
                                 <FormField name="title" control={form.control} render={({ field }) => (
                                    <FormItem>
                                        <FormControl>
                                            <Input 
                                                {...field} 
                                                placeholder="Başlık" 
                                                className="text-3xl md:text-4xl font-black bg-transparent border-none p-0 focus-visible:ring-0 placeholder:text-black/20 text-black/80 tracking-tight" 
                                            />
                                        </FormControl>
                                    </FormItem>
                                 )}/>
                                 <FormField name="content" control={form.control} render={({ field }) => (
                                    <FormItem>
                                        <FormControl>
                                            <Textarea 
                                                {...field} 
                                                ref={textareaRef}
                                                placeholder="Buraya yazmaya başla..." 
                                                className="bg-transparent border-none resize-none p-0 text-base md:text-lg leading-relaxed focus-visible:ring-0 placeholder:text-black/30 text-black/70 font-serif min-h-[300px]" 
                                            />
                                        </FormControl>
                                    </FormItem>
                                 )}/>
                            </div>
                        </ScrollArea>
                        <div className={cn("p-4 border-t bg-white/60 backdrop-blur-md flex flex-col gap-4", activeColorObj.accent)}>
                            <div className="flex items-center gap-4">
                                 <div className="flex items-center gap-2">
                                     <Palette className="w-4 h-4 text-black/40" />
                                     <div className="flex gap-1.5">
                                         {noteParchmentColors.map(color => (
                                             <button
                                                key={color.name}
                                                type="button"
                                                onClick={() => form.setValue('color', color.class)}
                                                className={cn(
                                                    "w-6 h-6 rounded-full border shadow-sm transition-transform hover:scale-110",
                                                    color.class.replace('bg-', 'bg-').replace('-100/50', '-200'),
                                                    watchedColor === color.class && "ring-2 ring-slate-800 ring-offset-1 scale-110"
                                                )}
                                                title={color.name}
                                             />
                                         ))}
                                     </div>
                                 </div>
                                 <div className="h-6 w-px bg-black/10 mx-2" />
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
