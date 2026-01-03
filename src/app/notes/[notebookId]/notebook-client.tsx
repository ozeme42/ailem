
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth-provider';
import { Notebook as NotebookType, NotebookSection, Note, NoteContentBlock } from '@/lib/data';
import { onNotebookDetailsUpdate, updateNotebook, addNoteToSection, updateNoteInSection, deleteNoteFromSection, updateNotebookFolder } from '@/lib/dataService';
import { Button } from '@/components/ui/button';
import { Plus, ArrowLeft, Edit, Trash2, StickyNote, FolderPlus, Folder, MoreVertical, LayoutGrid, FileText, Sparkles, Palette, X, PenLine, ChevronRight, Book, FolderOpen, Check, MoreHorizontal } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle, AlertDialogFooter as AlertDialogFooterComponent } from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Textarea } from '@/components/ui/textarea';
import { Combobox } from '@/components/ui/combobox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useForm } from 'react-hook-form';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { z } from 'zod';
import Image from 'next/image';

const sectionGradients = [
    { name: 'Gül', class: 'from-rose-500 to-pink-500' },
    { name: 'Okyanus', class: 'from-blue-500 to-indigo-500' },
    { name: 'Zümrüt', class: 'from-emerald-500 to-teal-500' },
    { name: 'Kehribar', class: 'from-amber-500 to-orange-500' },
    { name: 'Menekşe', class: 'from-violet-500 to-purple-500' },
];

const noteParchmentColors = [
    { name: 'Saman', class: 'bg-amber-50 border-amber-200 text-amber-900 dark:bg-[#2e240b] dark:border-amber-900/80 dark:text-amber-200', accent: 'border-amber-300 dark:border-amber-800' },
    { name: 'Gökyüzü', class: 'bg-sky-50 border-sky-200 text-sky-900 dark:bg-[#092538] dark:border-sky-900/80 dark:text-sky-200', accent: 'border-sky-300 dark:border-sky-800' },
    { name: 'Nane', class: 'bg-emerald-50 border-emerald-200 text-emerald-900 dark:bg-[#082a19] dark:border-emerald-900/80 dark:text-emerald-200', accent: 'border-emerald-300 dark:border-emerald-800' },
    { name: 'Gül', class: 'bg-rose-50 border-rose-200 text-rose-900 dark:bg-[#300d14] dark:border-rose-900/80 dark:text-rose-200', accent: 'border-rose-300 dark:border-rose-800' },
    { name: 'Lavanta', class: 'bg-violet-50 border-violet-200 text-violet-900 dark:bg-[#1f1738] dark:border-violet-900/80 dark:text-violet-200', accent: 'border-violet-300 dark:border-violet-800' },
    { name: 'Taş', class: 'bg-slate-100 border-slate-200 text-slate-800 dark:bg-[#1a202c] dark:border-slate-700/80 dark:text-slate-200', accent: 'border-slate-300 dark:border-slate-700' },
];

interface NotebookDetails {
    notebook: NotebookType;
    notes: Note[];
}

const noteFormSchema = z.object({
    title: z.string().min(1, "Başlık gereklidir.").default(""),
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

    const [details, setDetails] = useState<NotebookDetails | null>(null);
    const [activeSectionId, setActiveSectionId] = useState<string | null>(null);
    const [activeFolderFilter, setActiveFolderFilter] = useState<string>('Tümü');
    const [isMobile, setIsMobile] = useState(false);

    const [isSectionDialogOpen, setIsSectionDialogOpen] = useState(false);
    const [editingSection, setEditingSection] = useState<NotebookSection | null>(null);
    const [sectionTitle, setSectionTitle] = useState("");
    const [sectionColor, setSectionColor] = useState(sectionGradients[0].class);

    const [isFolderDialogOpen, setIsFolderDialogOpen] = useState(false);
    const [editingFolder, setEditingFolder] = useState<{ oldName: string; sectionId: string } | null>(null);
    const [newFolderName, setNewFolderName] = useState('');

    const [editingNote, setEditingNote] = useState<Note | null>(null);

    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 768);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    useEffect(() => {
        if (!notebookId || !user) return;
        const unsubscribe = onNotebookDetailsUpdate(notebookId, (data) => {
            if (data) {
                const sortedSections = (data.notebook.sections || []).sort((a, b) => a.order - b.order);
                setDetails({ ...data, notebook: { ...data.notebook, sections: sortedSections } });
                
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

    useEffect(() => {
        setActiveFolderFilter('Tümü');
    }, [activeSectionId]);

    const activeSection = useMemo(() => details?.notebook.sections.find(s => s.id === activeSectionId), [details, activeSectionId]);

    const { allNotesInSection, displayedNotes, folderStats } = React.useMemo(() => {
        if (!details || !activeSectionId) {
            return { allNotesInSection: [], displayedNotes: [], folderStats: {} };
        }

        const notesInSection = details.notes.filter(n => n.sectionId === activeSectionId).sort((a, b) => (b.updatedAt ? new Date(b.updatedAt).getTime() : 0) - (a.updatedAt ? new Date(a.updatedAt).getTime() : 0));
        
        const stats = notesInSection.reduce((acc, note) => {
            const folderName = note.folder || 'Genel';
            acc[folderName] = (acc[folderName] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        const notesToDisplay = activeFolderFilter === 'Tümü'
            ? notesInSection
            : activeFolderFilter === 'Genel'
                ? notesInSection.filter(n => !n.folder || n.folder === '')
                : notesInSection.filter(n => n.folder === activeFolderFilter);

        return { allNotesInSection: notesInSection, displayedNotes: notesToDisplay, folderStats: stats };
    }, [details, activeSectionId, activeFolderFilter]);
    
    const generalCount = folderStats['Genel'] || 0;
    const allNotesInSectionCount = allNotesInSection.length;
    const folderOrder = ['Tümü', 'Genel', ...(activeSection?.folders || []).sort((a, b) => a.localeCompare(b, 'tr'))];

    const handleSaveSection = async () => {
        if (!sectionTitle.trim() || !details) return;
        const currentSections = details.notebook.sections || [];
        let newSections: NotebookSection[];
        if (editingSection) {
            newSections = currentSections.map(s => s.id === editingSection.id ? { ...s, title: sectionTitle.trim(), color: sectionColor } : s);
        } else {
            const newSection: NotebookSection = {
                id: Date.now().toString(),
                title: sectionTitle.trim(),
                order: currentSections.length,
                color: sectionColor,
                folders: [],
            }
            newSections = [...currentSections, newSection];
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
            if (activeSectionId === sectionId) setActiveSectionId(details.notebook.sections[0]?.id || null);
        } catch (e) { toast({ title: 'Hata', variant: 'destructive' }); }
    };

    const handleSaveNote = async (noteData: Partial<Note>) => {
        try {
            if (editingNote?.id && editingNote.notebookId) {
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

    if (!details) return <div className="flex h-screen items-center justify-center text-slate-500 dark:text-slate-400">Yükleniyor...</div>;
    
    return (
        <div className={cn("flex h-[100dvh] overflow-hidden font-sans")}>
            
            <div className={cn(
                "flex-col border-r w-full md:w-72 flex-shrink-0 transition-all duration-300 z-20",
                "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800",
                activeSectionId && isMobile ? "hidden" : "flex"
            )}>
                 <div className="p-4 border-b dark:border-slate-800 bg-white dark:bg-slate-900 sticky top-0">
                     <div className="flex items-center gap-3 mb-4">
                        <Button variant="ghost" size="icon" className="-ml-2 text-slate-500 dark:text-slate-400" onClick={() => router.push('/notes')}>
                            <ArrowLeft className="w-5 h-5" />
                        </Button>
                        <h1 className="text-lg font-bold text-slate-800 dark:text-slate-100 truncate">{details.notebook.title}</h1>
                    </div>
                    <Button onClick={() => { setEditingSection(null); setSectionTitle(""); setIsSectionDialogOpen(true); }} className="w-full justify-start bg-white dark:bg-slate-800 border dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-indigo-600 dark:hover:text-indigo-400 hover:border-indigo-200 dark:hover:border-indigo-500/50 shadow-sm h-10">
                        <Plus className="w-4 h-4 mr-2" /> Yeni Bölüm
                    </Button>
                </div>

                <ScrollArea className="flex-1 p-3">
                    <div className="flex flex-col gap-2">
                        {details.notebook.sections.map((section, index) => (
                            <SectionCard
                                key={section.id}
                                section={section}
                                noteCount={details.notes.filter(n => n.sectionId === section.id).length}
                                isSelected={activeSectionId === section.id}
                                onClick={() => setActiveSectionId(section.id)}
                                onEdit={(e) => { e.stopPropagation(); setEditingSection(section); setSectionTitle(section.title); setSectionColor(section.color); setIsSectionDialogOpen(true); }}
                                onDelete={(e) => { e.stopPropagation(); handleDeleteSection(section.id); }}
                            />
                        ))}
                        {details.notebook.sections.length === 0 && (
                            <div className="text-center py-10 text-slate-400 text-sm px-4 col-span-1">
                                <p>Bu defter boş.</p>
                                <p className="text-xs mt-1">Bölüm ekleyerek düzenlemeye başla.</p>
                            </div>
                        )}
                    </div>
                </ScrollArea>
            </div>

            <div className={cn(
                "flex-col overflow-hidden relative w-full h-full",
                !activeSectionId && isMobile ? "hidden" : "flex"
            )}>
                 <div className="h-16 px-4 md:px-6 border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-950/70 backdrop-blur-md flex items-center justify-between sticky top-0 z-10 shrink-0">
                    <div className="flex items-center gap-2 overflow-hidden">
                        <Button variant="ghost" size="icon" className="md:hidden mr-1 text-slate-500 dark:text-slate-400" onClick={() => setActiveSectionId(null)}>
                            <ArrowLeft className="w-5 h-5" />
                        </Button>
                        <h2 className="text-lg md:text-xl font-bold text-slate-800 dark:text-slate-100 truncate">
                            {activeSection?.title || "Bölüm Seçin"}
                        </h2>
                    </div>
                    {activeSectionId && (
                         <div className="flex gap-2">
                             <Button variant="outline" size="sm" className="hidden sm:flex bg-background border-slate-200 dark:border-slate-700" onClick={() => { setNewFolderName(""); setEditingFolder(null); setIsFolderDialogOpen(true); }}>
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
                 
                 <ScrollArea className="flex-1 w-full">
                    {activeSectionId ? (
                        <div className="p-4 md:p-6 space-y-8 pb-20">
                            <div className="relative -mx-4 md:-mx-6 px-4 md:px-6 py-4 overflow-x-auto scrollbar-hide border-b border-slate-200 dark:border-slate-800">
                                 <div className="flex gap-3 items-stretch min-w-max">
                                     {folderOrder.map((folderName, index) => {
                                        if (folderName === 'Genel' && generalCount === 0 && folderOrder.length > 2) return null;
                                        if (folderName !== 'Tümü' && folderName !== 'Genel' && !folderStats[folderName]) return null;
                                        
                                        const count = folderName === 'Tümü' ? allNotesInSectionCount : folderStats[folderName] || 0;
                                        
                                        return (
                                            <FolderCard 
                                                key={folderName}
                                                name={folderName}
                                                count={count}
                                                isActive={activeFolderFilter === folderName}
                                                colorClass={activeSection?.color || sectionGradients[0].class}
                                                onClick={() => setActiveFolderFilter(folderName)}
                                                onEdit={folderName !== 'Tümü' && folderName !== 'Genel' ? () => { setNewFolderName(folderName); setEditingFolder({oldName: folderName, sectionId: activeSectionId}); setIsFolderDialogOpen(true); } : undefined}
                                                onDelete={folderName !== 'Tümü' && folderName !== 'Genel' ? () => handleDeleteFolder(folderName, activeSectionId) : undefined}
                                                icon={folderName === 'Tümü' ? LayoutGrid : folderName === 'Genel' ? Sparkles : Folder}
                                            />
                                        )
                                     })}
                                 </div>
                            </div>
                            
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
                                 <div className="col-span-full flex flex-col items-center justify-center h-[30vh] text-slate-400 dark:text-slate-500">
                                     <FileText className="w-12 h-12 text-slate-300 dark:text-slate-600 mb-4" />
                                    <p className="text-lg font-medium text-slate-500 dark:text-slate-400">Not bulunamadı</p>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-[50vh] text-center opacity-60 px-4">
                            <Book className="w-16 h-16 text-slate-300 dark:text-slate-600 mb-4" />
                            <p className="text-lg font-medium text-slate-500 dark:text-slate-400">Bir bölüm seçin.</p>
                        </div>
                    )}
                 </ScrollArea>
            </div>

            <Dialog open={isSectionDialogOpen} onOpenChange={setIsSectionDialogOpen}>
                <DialogContent className="sm:max-w-md rounded-3xl bg-white dark:bg-slate-900">
                    <DialogHeader>
                        <DialogTitle className="text-slate-800 dark:text-slate-100">{editingSection ? 'Bölümü Düzenle' : 'Yeni Bölüm'}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 pt-4">
                        <Input value={sectionTitle} onChange={(e) => setSectionTitle(e.target.value)} placeholder="Bölüm adı..." className="bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700" />
                        <div className="flex flex-wrap gap-3 justify-center">
                            {sectionGradients.map(color => (
                                <button
                                    key={color.class}
                                    onClick={() => setSectionColor(color.class)}
                                    className={cn("w-10 h-10 rounded-full bg-gradient-to-br transition-all hover:scale-110", color.class, sectionColor === color.class && "ring-2 ring-offset-2 ring-offset-background ring-slate-800 dark:ring-white")}
                                />
                            ))}
                        </div>
                    </div>
                    <DialogFooter><Button onClick={handleSaveSection}>Kaydet</Button></DialogFooter>
                </DialogContent>
            </Dialog>
            <Dialog open={isFolderDialogOpen} onOpenChange={setIsFolderDialogOpen}>
                <DialogContent className="sm:max-w-md rounded-3xl bg-white dark:bg-slate-900"><DialogHeader><DialogTitle className="text-slate-800 dark:text-slate-100">Klasör</DialogTitle></DialogHeader><Input value={newFolderName} onChange={(e) => setNewFolderName(e.target.value)} /><DialogFooter><Button onClick={editingFolder ? handleUpdateFolder : handleAddNewFolder}>Kaydet</Button></DialogFooter></DialogContent>
            </Dialog>
            <NoteEditDialog note={editingNote} sectionFolders={activeSection?.folders || []} onOpenChange={(open) => { if(!open) setEditingNote(null) }} onSave={handleSaveNote} />
        </div>
    );
}

function SectionCard({ section, noteCount, isSelected, onClick, onEdit, onDelete }: { section: NotebookSection; noteCount: number; isSelected: boolean; onClick: () => void; onEdit: (e: React.MouseEvent) => void; onDelete: (e: React.MouseEvent) => void; }) {
    return (
        <div 
            onClick={onClick}
            className={cn(
                "group relative w-full rounded-2xl cursor-pointer transition-all duration-200 p-4 flex flex-col justify-between border-2 min-h-[100px]",
                isSelected 
                    ? `border-indigo-500 dark:border-indigo-600 bg-indigo-50 dark:bg-indigo-900/40 shadow-lg scale-[1.02]` 
                    : "bg-slate-50 dark:bg-slate-800/60 border-transparent hover:border-slate-300 dark:hover:border-slate-700"
            )}
        >
             <div className={cn("absolute h-full w-2 left-0 top-0 rounded-l-xl bg-gradient-to-b", section.color)}></div>
             
            <div onClick={(e) => e.stopPropagation()} className={cn("transition-opacity absolute top-2 right-2", isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100")}>
                <DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7 rounded-full text-slate-500 dark:text-slate-400 hover:bg-black/5 dark:hover:bg-white/5" ><MoreHorizontal className="w-4 h-4" /></Button></DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-40 rounded-xl bg-white dark:bg-slate-900">
                    <DropdownMenuItem onClick={onEdit} className="cursor-pointer focus:bg-slate-100 dark:focus:bg-slate-800"><Edit className="w-3 h-3 mr-2" /> Düzenle</DropdownMenuItem>
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-red-600 focus:text-red-700 dark:text-red-500 dark:focus:text-red-400 cursor-pointer focus:bg-red-50 dark:focus:bg-red-500/10"><Trash2 className="w-3 h-3 mr-2" /> Sil</DropdownMenuItem>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Bölümü Sil?</AlertDialogTitle>
                                <AlertDialogDescription>Bu bölüm ve içindeki tüm notlar silinecek.</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooterComponent>
                                <AlertDialogCancel>Vazgeç</AlertDialogCancel>
                                <AlertDialogAction onClick={onDelete}>Evet, Sil</AlertDialogAction>
                            </AlertDialogFooterComponent>
                        </AlertDialogContent>
                    </AlertDialog>
                </DropdownMenuContent>
                </DropdownMenu>
            </div>
            <div className="flex-grow pl-3">
                <p className={cn("font-bold text-base truncate pr-8", isSelected ? "text-indigo-800 dark:text-indigo-200" : "text-slate-700 dark:text-slate-200")}>{section.title}</p>
            </div>
            <div className="mt-auto pt-2 pl-3">
                <p className="text-xs font-medium text-slate-400 dark:text-slate-500">{noteCount} not</p>
            </div>
        </div>
    );
}

function FolderCard({ name, count, isActive, colorClass, onClick, onEdit, onDelete, icon: Icon }: any) {
    const activeClass = `bg-gradient-to-br ${colorClass} text-white shadow-lg border-transparent`;
    const inactiveClass = "bg-white/50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-600";

    return (
        <div onClick={onClick} className={cn("group relative h-28 w-44 shrink-0 cursor-pointer rounded-2xl border p-4 transition-all duration-300 flex flex-col justify-between hover:shadow-lg hover:-translate-y-1", isActive ? activeClass : inactiveClass)}>
             <div className="flex w-full justify-between items-start">
                 <div className={cn("p-2 rounded-lg transition-colors", isActive ? "bg-white/10" : "bg-slate-100 dark:bg-slate-800 group-hover:bg-white dark:group-hover:bg-slate-700")}>
                    <Icon className={cn("w-5 h-5", isActive ? "text-white" : "text-slate-500 dark:text-slate-400")} />
                 </div>
                 {(onEdit || onDelete) && (
                     <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className={cn("h-7 w-7 -mr-2 -mt-1 transition-opacity", isActive ? "text-white/60 hover:text-white hover:bg-white/20" : "text-slate-400 hover:text-slate-600 opacity-0 group-hover:opacity-100")} onClick={(e) => e.stopPropagation()}><MoreHorizontal className="w-4 h-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent onClick={(e) => e.stopPropagation()} className="bg-white dark:bg-slate-900 rounded-xl">
                            <DropdownMenuItem onClick={onEdit} className="cursor-pointer focus:bg-slate-100 dark:focus:bg-slate-800">Düzenle</DropdownMenuItem>
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-red-600 focus:text-red-700 cursor-pointer focus:bg-red-50 dark:focus:bg-red-500/10">Sil</DropdownMenuItem>
                                </AlertDialogTrigger>
                                <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Klasörü Sil</AlertDialogTitle><AlertDialogDescription>İçindeki notlar 'Genel' klasörüne taşınır.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooterComponent><AlertDialogCancel>Vazgeç</AlertDialogCancel><AlertDialogAction onClick={onDelete}>Evet, Sil</AlertDialogAction></AlertDialogFooterComponent></AlertDialogContent>
                            </AlertDialog>
                        </DropdownMenuContent>
                     </DropdownMenu>
                 )}
            </div>
            <div>
                <p className={cn("font-bold text-base truncate transition-colors", isActive && "text-white")}>{name}</p>
                <p className={cn("text-xs font-medium", isActive ? "text-white/70" : "text-slate-500 dark:text-slate-400")}>{count} not</p>
            </div>
        </div>
    )
}

function StickyNoteCard({ note, onEdit, onDelete }: { note: Note, onEdit: () => void, onDelete: () => void }) {
    const colorObj = noteParchmentColors.find(c => c.class === note.color) || noteParchmentColors[5];
    const contentText = Array.isArray(note.content) ? (note.content.find(b => b.type === 'text')?.data || '') : '';
    const plainText = typeof contentText === 'string' ? contentText.replace(/<[^>]+>/g, '') : '';
    
    return (
        <div onClick={onEdit} className={cn("group relative flex flex-col h-52 p-5 rounded-2xl border shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md cursor-pointer overflow-hidden", colorObj.class)}>
            <div className={cn("absolute inset-0 pointer-events-none opacity-[0.03] bg-[linear-gradient(transparent_19px,#000_20px)] bg-[length:100%_20px]", colorObj.text, "dark:opacity-[0.02]")} />
            <div className={cn("absolute top-0 left-1/2 -translate-x-1/2 w-16 h-3 rotate-1", colorObj.class, "bg-opacity-40 shadow-sm dark:bg-opacity-10")} />
            <div className="relative z-10 flex flex-col h-full">
                <h3 className={cn("font-bold text-lg leading-tight mb-2 line-clamp-2", colorObj.text, "dark:opacity-90 opacity-80")}>{note.title || "İsimsiz Not"}</h3>
                <div className="flex-1 overflow-hidden"><p className={cn("text-sm leading-relaxed font-normal whitespace-pre-wrap line-clamp-6 font-serif", colorObj.text, "dark:opacity-70 opacity-70")}>{plainText || "İçerik yok..."}</p></div>
                <div className={cn("mt-auto pt-3 border-t flex items-center justify-between text-xs font-semibold", colorObj.accent)}>
                     <span className={cn(colorObj.text, "dark:opacity-60 opacity-60")}>{note.updatedAt ? new Date(note.updatedAt).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' }) : ''}</span>
                     <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity"><Button variant="ghost" size="icon" className="h-6 w-6 hover:bg-black/10 dark:hover:bg-white/10 rounded-full" onClick={(e) => {e.stopPropagation(); onDelete();}}><Trash2 className="w-3.5 h-3.5 text-red-500/70" /></Button></div>
                </div>
            </div>
        </div>
    )
}

function NoteEditDialog({ note, onOpenChange, onSave, sectionFolders }: { note: Note | null, onOpenChange: (o: boolean) => void, onSave: (d: any) => void, sectionFolders: string[] }) {
    const form = useForm<NoteFormData>();
    const textareaRef = React.useRef<HTMLTextAreaElement>(null);
    
    React.useLayoutEffect(() => {
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
    const activeColorObj = noteParchmentColors.find(c => c.class === watchedColor) || noteParchmentColors[5];

    const handleFormSubmit = (data: NoteFormData) => {
        const updatedContent: NoteContentBlock[] = [{ id: note.content?.[0]?.id || Date.now().toString(), type: 'text', data: data.content || '' }];
        onSave({ ...data, content: updatedContent });
    }

    return (
        <Dialog open={!!note} onOpenChange={onOpenChange}>
            <DialogContent className={cn("w-[100vw] h-[100dvh] md:w-full md:max-w-2xl md:h-auto md:max-h-[85vh] p-0 border-none shadow-2xl flex flex-col md:rounded-xl overflow-hidden transition-colors duration-500", activeColorObj.class)}>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleFormSubmit)} className="flex flex-col h-full relative">
                        <div className="absolute top-0 left-0 w-full z-20 p-4 md:p-6 flex justify-end"><DialogClose asChild><Button variant="ghost" size="icon" className={cn("h-8 w-8 hover:bg-black/10 rounded-full", activeColorObj.text, "opacity-40 hover:opacity-70")}><X className="h-5 h-5" /></Button></DialogClose></div>
                        <ScrollArea className="flex-1"><div className="max-w-2xl mx-auto p-6 md:p-12 min-h-[60vh] space-y-6 pt-20">
                             <div className={cn("absolute inset-0 pointer-events-none opacity-[0.03] bg-[linear-gradient(transparent_23px,#000_24px)] bg-[length:100%_24px]", activeColorObj.text, "dark:opacity-[0.02]")} />
                             <FormField name="title" control={form.control} render={({ field }) => (<FormItem><FormControl><Input {...field} placeholder="Başlık" className={cn("text-3xl md:text-4xl font-black bg-transparent border-none p-0 focus-visible:ring-0 tracking-tight", activeColorObj.text, "placeholder:opacity-20 opacity-80")} /></FormControl></FormItem>)}/>
                             <FormField name="content" control={form.control} render={({ field }) => (<FormItem><FormControl><Textarea {...field} ref={textareaRef} placeholder="Buraya yazmaya başla..." className={cn("bg-transparent border-none resize-none p-0 text-base md:text-lg leading-relaxed focus-visible:ring-0 font-serif", activeColorObj.text, "placeholder:opacity-30 opacity-70 min-h-[300px]")} /></FormControl></FormItem>)}/>
                        </div></ScrollArea>
                        <div className={cn("p-4 border-t bg-white/60 dark:bg-slate-800/20 backdrop-blur-md flex flex-col gap-4", activeColorObj.accent)}>
                            <div className="flex items-center gap-4">
                                 <div className="flex items-center gap-2"><Palette className={cn("w-4 h-4", activeColorObj.text, "opacity-40")} /><div className="flex gap-1.5">{noteParchmentColors.map(color => (<button key={color.name} type="button" onClick={() => form.setValue('color', color.class)} className={cn("w-6 h-6 rounded-full border shadow-sm transition-transform hover:scale-110", color.class, watchedColor === color.class && "ring-2 ring-slate-800 dark:ring-white ring-offset-1 scale-110")} title={color.name} />))}</div></div>
                                 <div className={cn("h-6 w-px mx-2", activeColorObj.accent, "bg-opacity-50")} />
                                 <FormField name="folder" control={form.control} render={({ field }) => (<FormItem className="flex-1 mb-0 space-y-0"><FormControl><Combobox options={[{label: 'Genel', value: ''}, ...sectionFolders.map(f => ({ label: f, value: f }))]} value={field.value || ''} onChange={field.onChange} placeholder="Klasör seç..." className={cn("h-9 bg-white/50 dark:bg-black/20 border-black/10 dark:border-white/10 text-sm", activeColorObj.text)}/></FormControl></FormItem>)}/>
                            </div>
                            <Button type="submit" className="w-full bg-slate-900 text-white hover:bg-slate-800 dark:bg-slate-50 dark:text-slate-900 dark:hover:bg-slate-200 rounded-xl h-11 font-bold shadow-lg">Kaydet</Button>
                        </div>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}
