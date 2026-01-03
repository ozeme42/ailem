"use client";

import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth-provider';
import { Notebook as NotebookType, NotebookSection, Note, NoteContentBlock } from '@/lib/data';
import { onNotebookDetailsUpdate, deleteNoteFromSection, updateNotebook, addNoteToSection, updateNoteInSection, updateNotebookFolder } from '@/lib/dataService';
import { Button } from '@/components/ui/button';
import { Plus, ArrowLeft, Edit, Trash2, StickyNote, FolderPlus, Folder, MoreVertical, PenLine, ChevronRight, Book, X, Clock, LayoutGrid, Check, FolderOpen } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Textarea } from '@/components/ui/textarea';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Combobox } from '@/components/ui/combobox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useForm } from 'react-hook-form';
import { Form, FormField, FormItem, FormControl } from '@/components/ui/form';
import { z } from 'zod';

// --- TASARIM SABİTLERİ ---
const themeColors = {
    BG: "bg-stone-50/50", 
    SIDEBAR: "bg-white border-r border-stone-100",
};

const noteColors = [
    { name: 'Beyaz', class: 'bg-white border-stone-200 text-stone-700', ring: 'ring-stone-200' },
    { name: 'Sarı', class: 'bg-[#fff8c4] border-[#fceebb] text-yellow-900', ring: 'ring-yellow-300' },
    { name: 'Mavi', class: 'bg-[#e3f2fd] border-[#bbdefb] text-blue-900', ring: 'ring-blue-300' },
    { name: 'Yeşil', class: 'bg-[#e8f5e9] border-[#c8e6c9] text-green-900', ring: 'ring-green-300' },
    { name: 'Pembe', class: 'bg-[#fce4ec] border-[#f8bbd0] text-pink-900', ring: 'ring-pink-300' },
    { name: 'Mor', class: 'bg-[#f3e5f5] border-[#e1bee7] text-purple-900', ring: 'ring-purple-300' },
];

const sectionGradients = [
    'from-orange-100 to-amber-50 border-orange-200 text-orange-900',
    'from-blue-100 to-cyan-50 border-blue-200 text-blue-900',
    'from-emerald-100 to-lime-50 border-emerald-200 text-emerald-900',
    'from-rose-100 to-pink-50 border-rose-200 text-rose-900',
    'from-violet-100 to-purple-50 border-violet-200 text-violet-900',
];

interface NotebookDetails {
    notebook: NotebookType;
    notes: Note[];
}

const noteFormSchema = z.object({
    title: z.string().default(""),
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
    }, [notebookId, user, router]);

    // Bölüm değişince klasör filtresini sıfırla
    useEffect(() => {
        setActiveFolderFilter('Tümü');
    }, [activeSectionId]);

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
                color: sectionGradients[Math.floor(Math.random() * sectionGradients.length)],
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
        const newSections = (details.notebook.sections || []).filter(s => s.id !== sectionId);
        const notesToDelete = details.notes.filter(n => n.sectionId === sectionId);
        try {
            await updateNotebook(notebookId, { sections: newSections });
            for (const note of notesToDelete) await deleteNoteFromSection(note.id);
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
            setNewFolderName(''); setIsFolderDialogOpen(false);
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

    if (!details) return <div className="flex h-screen items-center justify-center text-stone-400">Yükleniyor...</div>;

    const activeSection = sections.find(s => s.id === activeSectionId);
    
    // Aktif Bölüm Rengini Bul (Klasör Rafı İçin)
    const activeSectionIndex = sections.findIndex(s => s.id === activeSectionId);
    const activeSectionGradient = activeSection?.color || sectionGradients[activeSectionIndex >= 0 ? activeSectionIndex % sectionGradients.length : 0];

    // Filtreleme Mantığı
    const allNotesInSection = details.notes.filter(n => n.sectionId === activeSectionId).sort((a,b) => (b.updatedAt ? new Date(b.updatedAt).getTime() : 0) - (a.updatedAt ? new Date(a.updatedAt).getTime() : 0));
    
    const displayedNotes = activeFolderFilter === 'Tümü' 
        ? allNotesInSection 
        : activeFolderFilter === 'Genel'
            ? allNotesInSection.filter(n => !n.folder || n.folder === '')
            : allNotesInSection.filter(n => n.folder === activeFolderFilter);

    const folderStats = (activeSection?.folders || []).reduce((acc, folder) => {
        acc[folder] = allNotesInSection.filter(n => n.folder === folder).length;
        return acc;
    }, {} as Record<string, number>);
    const generalCount = allNotesInSection.filter(n => !n.folder || n.folder === '').length;

    return (
        <div className={cn("flex h-[100dvh] overflow-hidden font-sans text-stone-900", themeColors.BG)}>
            
            {/* --- SIDEBAR (SECTIONS) --- */}
            <div className={cn(
                "flex-col w-full md:w-72 flex-shrink-0 transition-all duration-300 z-20",
                themeColors.SIDEBAR,
                activeSectionId && isMobile ? "hidden" : "flex"
            )}>
                 <div className="p-5 border-b border-stone-100 bg-white sticky top-0">
                      <div className="flex items-center gap-3 mb-6">
                         <Button variant="ghost" size="icon" className="-ml-2 text-stone-400 hover:text-stone-800" onClick={() => router.push('/notes')}>
                             <ArrowLeft className="w-5 h-5" />
                         </Button>
                         <h1 className="text-lg font-bold text-stone-800 truncate">{details.notebook.title}</h1>
                     </div>
                     <Button onClick={() => { setEditingSection(null); setSectionTitle(""); setIsSectionDialogOpen(true); }} className="w-full justify-start bg-stone-900 text-stone-50 hover:bg-stone-800 shadow-sm h-11 rounded-xl">
                         <Plus className="w-5 h-5 mr-2" /> Yeni Bölüm
                     </Button>
                 </div>

                 <ScrollArea className="flex-1 p-3">
                     <div className="space-y-1.5">
                         {sections.map((section, index) => {
                             const isSelected = activeSectionId === section.id;
                             const gradientClass = section.color || sectionGradients[index % sectionGradients.length];

                             return (
                                 <div key={section.id} 
                                     onClick={() => setActiveSectionId(section.id)}
                                     className={cn(
                                         "group flex items-center justify-between px-4 py-3.5 rounded-xl cursor-pointer transition-all border relative overflow-hidden",
                                         isSelected 
                                             ? `bg-gradient-to-r ${gradientClass} shadow-md border-transparent text-white` 
                                             : "bg-white border-transparent hover:bg-stone-100 text-stone-600"
                                     )}
                                 >
                                     <div className="flex items-center gap-3 font-medium truncate relative z-10">
                                         <span className={cn("text-xs font-bold w-5 h-5 flex items-center justify-center rounded-full", isSelected ? "bg-white/20 text-white" : "bg-stone-200 text-stone-500")}>
                                             {index + 1}
                                         </span>
                                         <span className="truncate">{section.title}</span>
                                     </div>

                                     <div className={cn("flex items-center relative z-10", isSelected ? "text-white" : "opacity-0 group-hover:opacity-100")}>
                                         <DropdownMenu>
                                             <DropdownMenuTrigger asChild>
                                                  <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full hover:bg-black/10">
                                                     <MoreVertical className="w-4 h-4" />
                                                 </Button>
                                             </DropdownMenuTrigger>
                                             <DropdownMenuContent align="end" className="w-40">
                                                 <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setEditingSection(section); setSectionTitle(section.title); setIsSectionDialogOpen(true); }}>
                                                     <Edit className="w-3 h-3 mr-2" /> Düzenle
                                                 </DropdownMenuItem>
                                                 <DropdownMenuItem className="text-red-600" onClick={(e) => { e.stopPropagation(); handleDeleteSection(section.id); }}>
                                                     <Trash2 className="w-3 h-3 mr-2" /> Sil
                                                 </DropdownMenuItem>
                                             </DropdownMenuContent>
                                         </DropdownMenu>
                                         <ChevronRight className={cn("w-4 h-4 ml-1 sm:hidden", isSelected ? "text-white" : "text-stone-300")} />
                                     </div>
                                 </div>
                             )
                         })}
                         {sections.length === 0 && (
                            <div className="flex flex-col items-center justify-center py-10 text-stone-400">
                                <Book className="w-10 h-10 mb-2 opacity-20" />
                                <span className="text-sm">Henüz bölüm yok</span>
                            </div>
                         )}
                     </div>
                 </ScrollArea>
            </div>

            {/* --- MAIN PANEL (NOTES) --- */}
            <div className={cn(
                "flex-col flex-1 overflow-hidden relative h-full transition-all duration-500",
                !activeSectionId && isMobile ? "hidden" : "flex"
            )}>
                 {/* Header */}
                 <div className="h-16 px-4 md:px-8 border-b border-stone-200 bg-white/80 backdrop-blur-xl flex items-center justify-between sticky top-0 z-10 shrink-0">
                    <div className="flex items-center gap-2 overflow-hidden">
                        <Button variant="ghost" size="icon" className="md:hidden mr-1 text-stone-500" onClick={() => setActiveSectionId(null)}>
                            <ArrowLeft className="w-5 h-5" />
                        </Button>
                        <h2 className="text-xl font-bold text-stone-800 truncate tracking-tight">
                            {activeSection?.title || "Bölüm Seçin"}
                        </h2>
                    </div>
                    {activeSectionId && (
                         <Button className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-200 rounded-full h-10 px-6 font-medium transition-transform hover:scale-105 active:scale-95" onClick={() => {
                             setEditingNote({ id: '', notebookId, sectionId: activeSectionId, familyId: details.notebook.familyId, title: "", content: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), folder: activeFolderFilter !== 'Tümü' && activeFolderFilter !== 'Genel' ? activeFolderFilter : '' });
                         }}>
                            <PenLine className="w-4 h-4 mr-2" /> Not Yaz
                        </Button>
                    )}
                 </div>
                 
                 {activeSectionId ? (
                     <div className="flex-1 overflow-y-auto bg-stone-50/50">
                        <div className="max-w-6xl mx-auto p-4 md:p-8 space-y-8">
                            
                            {/* --- FOLDER FILES ROW (RENKLİ ALAN) --- */}
                            <div className={cn(
                                "rounded-3xl p-5 md:p-6 shadow-sm border border-white/40 transition-all duration-500",
                                `bg-gradient-to-br ${activeSectionGradient.replace('text-', 'text-opacity-0 text-')} bg-opacity-10`
                            )}>
                                <div className="flex items-center justify-between mb-4 px-1">
                                    <h3 className={cn("text-xs font-bold uppercase tracking-wider flex items-center gap-2 opacity-60")}>
                                        <FolderOpen className="w-4 h-4" />
                                        Dosyalar
                                    </h3>
                                    <Button variant="ghost" size="sm" className="h-7 text-xs bg-white/50 hover:bg-white text-stone-700 shadow-sm border border-transparent hover:border-stone-200" onClick={() => { setNewFolderName(""); setEditingFolder(null); setIsFolderDialogOpen(true); }}>
                                        <FolderPlus className="w-3.5 h-3.5 mr-1.5" /> Klasör Ekle
                                    </Button>
                                </div>
                                
                                <div className="w-full overflow-x-auto pb-2 -mx-5 px-5 md:mx-0 md:px-0 no-scrollbar">
                                    <div className="flex gap-3 min-w-max">
                                        {/* "Tümü" Klasörü */}
                                        <FolderCard 
                                            name="Tümü" 
                                            count={allNotesInSection.length} 
                                            isActive={activeFolderFilter === 'Tümü'} 
                                            onClick={() => setActiveFolderFilter('Tümü')}
                                            icon={<LayoutGrid className="w-4 h-4" />}
                                        />
                                        
                                        {/* "Genel" Klasörü */}
                                        <FolderCard 
                                            name="Genel" 
                                            count={generalCount} 
                                            isActive={activeFolderFilter === 'Genel'} 
                                            onClick={() => setActiveFolderFilter('Genel')}
                                        />

                                        {/* Kullanıcı Klasörleri */}
                                        {activeSection.folders?.map(folderName => (
                                            <FolderCard 
                                                key={folderName}
                                                name={folderName}
                                                count={folderStats[folderName] || 0}
                                                isActive={activeFolderFilter === folderName}
                                                onClick={() => setActiveFolderFilter(folderName)}
                                                onEdit={() => { setNewFolderName(folderName); setEditingFolder({oldName: folderName, sectionId: activeSectionId}); setIsFolderDialogOpen(true); }}
                                                onDelete={() => handleDeleteFolder(folderName, activeSectionId)}
                                                color="yellow"
                                            />
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* --- NOTES GRID --- */}
                            <div>
                                <div className="flex items-center gap-2 mb-4 px-1 text-stone-500">
                                    <span className="text-sm font-medium">
                                        {activeFolderFilter === 'Tümü' ? 'Tüm Notlar' : activeFolderFilter}
                                    </span>
                                    <span className="text-xs bg-stone-200 px-2 py-0.5 rounded-full text-stone-600">{displayedNotes.length}</span>
                                </div>

                                {displayedNotes.length === 0 ? (
                                    <div className="border-2 border-dashed border-stone-200 rounded-2xl p-12 flex flex-col items-center justify-center text-stone-400">
                                        <StickyNote className="w-12 h-12 mb-3 opacity-20" />
                                        <p>Bu klasörde not bulunmuyor.</p>
                                        <Button variant="link" className="text-indigo-600 mt-2" onClick={() => setEditingNote({ id: '', notebookId, sectionId: activeSectionId, familyId: details.notebook.familyId, title: "", content: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), folder: activeFolderFilter !== 'Tümü' && activeFolderFilter !== 'Genel' ? activeFolderFilter : '' })}>
                                            İlk notu oluştur
                                        </Button>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                                        {displayedNotes.map(note => (
                                            <ModernNoteCard 
                                                key={note.id} 
                                                note={note} 
                                                onEdit={() => setEditingNote(note)} 
                                                onDelete={() => handleDeleteNote(note.id)} 
                                            />
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                     </div>
                 ) : (
                     <div className="flex flex-col items-center justify-center h-full text-stone-400 bg-stone-50/50">
                        <Book className="w-20 h-20 text-stone-200 mb-4" />
                        <p className="text-lg font-medium">Başlamak için bir bölüm seçin.</p>
                     </div>
                 )}
            </div>

            {/* --- DIALOGS --- */}
            {/* Section Edit Dialog */}
            <Dialog open={isSectionDialogOpen} onOpenChange={setIsSectionDialogOpen}>
                <DialogContent className="sm:max-w-md bg-white border-stone-200 text-stone-900 rounded-2xl shadow-xl">
                    <DialogHeader>
                        <DialogTitle>{editingSection ? "Bölümü Düzenle" : "Yeni Bölüm"}</DialogTitle>
                    </DialogHeader>
                    <div className="py-4">
                        <Input placeholder="Bölüm Adı" value={sectionTitle} onChange={(e) => setSectionTitle(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSaveSection()} className="bg-stone-50 border-stone-200 focus-visible:ring-indigo-500" />
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setIsSectionDialogOpen(false)}>İptal</Button>
                        <Button onClick={handleSaveSection} className="bg-indigo-600 hover:bg-indigo-700 text-white">Kaydet</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            
            {/* Folder Dialog */}
             <Dialog open={isFolderDialogOpen} onOpenChange={setIsFolderDialogOpen}>
                <DialogContent className="sm:max-w-md bg-white border-stone-200 text-stone-900 rounded-2xl shadow-xl">
                    <DialogHeader>
                        <DialogTitle>{editingFolder ? "Klasörü Düzenle" : "Yeni Klasör"}</DialogTitle>
                    </DialogHeader>
                    <div className="py-4">
                        <Input placeholder="Klasör Adı" value={newFolderName} onChange={(e) => setNewFolderName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && (editingFolder ? handleUpdateFolder() : handleAddNewFolder())} className="bg-stone-50 border-stone-200 focus-visible:ring-indigo-500" />
                    </div>
                    <DialogFooter>
                         <Button variant="ghost" onClick={() => setIsFolderDialogOpen(false)}>İptal</Button>
                        <Button onClick={editingFolder ? handleUpdateFolder : handleAddNewFolder} className="bg-indigo-600 hover:bg-indigo-700 text-white">{editingFolder ? "Güncelle" : "Oluştur"}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* MODERN NOTE EDITOR */}
            <ModernNoteEditor 
                note={editingNote} 
                sectionFolders={activeSection?.folders || []} 
                onOpenChange={(open) => { if(!open) setEditingNote(null) }} 
                onSave={handleSaveNote}
            />

        </div>
    );
}

// --- SUB-COMPONENTS ---

function FolderCard({ name, count, isActive, onClick, onEdit, onDelete, color = "blue", icon }: any) {
    return (
        <div 
            onClick={onClick}
            className={cn(
                "relative flex flex-col items-start justify-between w-32 h-24 p-3 rounded-xl border cursor-pointer transition-all duration-200 select-none group backdrop-blur-sm",
                isActive 
                    ? "bg-white border-white/50 shadow-md ring-2 ring-white/50 transform -translate-y-1" 
                    : "bg-white/60 border-white/20 hover:bg-white/80 hover:shadow-sm"
            )}
        >
            {/* Top Tab Visual */}
            <div className={cn("absolute top-0 left-0 w-12 h-1 rounded-b-md transition-colors", isActive ? "bg-stone-800" : "bg-stone-300 group-hover:bg-stone-400")} />

            <div className="flex w-full justify-between items-start mt-2">
                 <div className={cn("p-2 rounded-lg transition-colors", isActive ? "bg-stone-100 text-stone-800" : "bg-stone-100/50 text-stone-400 group-hover:text-stone-600")}>
                    {icon || <Folder className="w-5 h-5 fill-current" />}
                 </div>
                 {(onEdit || onDelete) && (
                     <DropdownMenu>
                         <DropdownMenuTrigger asChild>
                             <Button variant="ghost" size="icon" className="h-6 w-6 -mr-1 -mt-1 text-stone-400 hover:text-stone-600 opacity-0 group-hover:opacity-100 transition-opacity">
                                 <MoreVertical className="w-3 h-3" />
                             </Button>
                         </DropdownMenuTrigger>
                         <DropdownMenuContent>
                             <DropdownMenuItem onClick={(e) => {e.stopPropagation(); onEdit()}}>Düzenle</DropdownMenuItem>
                             <DropdownMenuItem className="text-red-600" onClick={(e) => {e.stopPropagation(); onDelete()}}>Sil</DropdownMenuItem>
                         </DropdownMenuContent>
                     </DropdownMenu>
                 )}
            </div>

            <div className="w-full">
                <div className={cn("font-bold text-sm truncate", isActive ? "text-stone-900" : "text-stone-700")}>{name}</div>
                <div className="text-xs text-stone-500 font-medium">{count} not</div>
            </div>
        </div>
    )
}

function ModernNoteCard({ note, onEdit, onDelete }: { note: Note, onEdit: () => void, onDelete: () => void }) {
    const colorObj = noteColors.find(c => c.class === note.color) || noteColors[0];
    const contentText = Array.isArray(note.content) ? (note.content.find(b => b.type === 'text')?.data || '') : '';
    const plainText = typeof contentText === 'string' ? contentText.replace(/<[^>]+>/g, '') : '';
    
    return (
        <div 
            onClick={onEdit}
            className={cn(
                "group relative flex flex-col h-52 p-6 rounded-2xl border shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg cursor-pointer overflow-hidden",
                colorObj.class
            )}
        >
            <div className="flex-1">
                <h3 className="font-bold text-lg leading-tight mb-2 line-clamp-2 text-stone-900">
                    {note.title || "İsimsiz Not"}
                </h3>
                <p className="text-sm opacity-70 leading-relaxed line-clamp-4 font-normal">
                     {plainText || "İçerik yok..."}
                </p>
            </div>

            <div className="mt-4 pt-3 border-t border-black/5 flex items-center justify-between">
                <span className="text-xs font-medium opacity-50 flex items-center gap-1">
                   {note.updatedAt ? new Date(note.updatedAt).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' }) : ''}
                </span>
                <Button variant="ghost" size="icon" className="h-7 w-7 -mr-2 text-red-400 opacity-0 group-hover:opacity-100 hover:bg-red-50 hover:text-red-600 transition-all rounded-full" onClick={(e) => {e.stopPropagation(); onDelete();}}>
                     <Trash2 className="w-3.5 h-3.5" />
                </Button>
            </div>
        </div>
    )
}

function ModernNoteEditor({ note, onOpenChange, onSave, sectionFolders }: { note: Note | null, onOpenChange: (o: boolean) => void, onSave: (d: any) => void, sectionFolders: string[] }) {
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
                color: note.color || noteColors[0].class,
                folder: note.folder || ''
            });
        }
    }, [note, form]);

    if (!note) return null;

    const watchedColor = form.watch('color');
    const activeColorObj = noteColors.find(c => c.class === watchedColor) || noteColors[0];

    const handleFormSubmit = (data: NoteFormData) => {
        const updatedContent: NoteContentBlock[] = [{ id: note.content?.[0]?.id || Date.now().toString(), type: 'text', data: data.content || '' }];
        onSave({ ...data, content: updatedContent });
    }

    return (
        <Dialog open={!!note} onOpenChange={onOpenChange}>
            <DialogContent className={cn(
                "w-full h-full md:w-[90vw] md:max-w-3xl md:h-[90vh] md:max-h-[800px] p-0 border-none shadow-2xl flex flex-col md:rounded-3xl overflow-hidden transition-colors duration-500",
                activeColorObj.class
            )}>
                <DialogTitle className="sr-only">Not Düzenle</DialogTitle>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleFormSubmit)} className="flex flex-col h-full relative">
                        
                        {/* Toolbar Header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-black/5 bg-white/40 backdrop-blur-md sticky top-0 z-20">
                            <div className="flex items-center gap-2 text-sm text-stone-500 font-medium">
                                <Clock className="w-3.5 h-3.5" />
                                <span>{new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', hour: '2-digit', minute:'2-digit' })}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <DialogClose asChild>
                                    <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full hover:bg-black/5">
                                        <X className="w-5 h-5 opacity-60" />
                                    </Button>
                                </DialogClose>
                            </div>
                        </div>

                        {/* Editor Content */}
                        <ScrollArea className="flex-1">
                            <div className="max-w-2xl mx-auto p-6 md:p-12 min-h-[60vh] space-y-6">
                                <FormField name="title" control={form.control} render={({ field }) => (
                                    <FormItem>
                                        <FormControl>
                                            <Input 
                                                {...field} 
                                                placeholder="Başlık" 
                                                className="text-4xl md:text-5xl font-bold bg-transparent border-none p-0 focus-visible:ring-0 placeholder:text-black/20 text-stone-900 tracking-tight h-auto py-2" 
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
                                                placeholder="Hikayeni yaz..." 
                                                className="bg-transparent border-none resize-none p-0 text-lg md:text-xl leading-relaxed focus-visible:ring-0 placeholder:text-black/20 text-stone-800 font-normal min-h-[300px]" 
                                            />
                                        </FormControl>
                                    </FormItem>
                                )}/>
                            </div>
                        </ScrollArea>

                        {/* Bottom Action Bar */}
                        <div className="p-4 md:p-6 bg-white/60 backdrop-blur-xl border-t border-black/5 flex flex-col sm:flex-row items-center justify-between gap-4 sticky bottom-0 z-20">
                            <div className="flex items-center gap-4 w-full sm:w-auto overflow-x-auto pb-2 sm:pb-0 no-scrollbar">
                                <div className="flex items-center gap-1.5 p-1.5 bg-black/5 rounded-full">
                                    {noteColors.map(color => (
                                        <button
                                            key={color.name}
                                            type="button"
                                            onClick={() => form.setValue('color', color.class)}
                                            className={cn(
                                                "w-6 h-6 rounded-full border border-black/5 transition-all",
                                                color.class,
                                                watchedColor === color.class ? "scale-110 shadow-sm ring-2 ring-offset-1 ring-stone-400" : "hover:scale-110"
                                            )}
                                            title={color.name}
                                        />
                                    ))}
                                </div>
                                <FormField name="folder" control={form.control} render={({ field }) => (
                                    <FormItem className="mb-0 space-y-0 min-w-[140px]">
                                        <FormControl>
                                            <Combobox 
                                                options={[{label: 'Genel (Klasörsüz)', value: ''}, ...sectionFolders.map(f => ({ label: f, value: f }))]}
                                                value={field.value || ''}
                                                onChange={field.onChange}
                                                placeholder="Klasör Seç"
                                                className="h-10 bg-white/50 border-transparent hover:bg-white shadow-sm rounded-full px-4 text-sm font-medium transition-colors"
                                            />
                                        </FormControl>
                                    </FormItem>
                                )} />
                            </div>
                            <Button type="submit" className="w-full sm:w-auto bg-stone-900 text-white hover:bg-stone-800 rounded-full h-11 px-8 font-bold shadow-lg transition-transform active:scale-95">
                                <Check className="w-4 h-4 mr-2" /> Kaydet
                            </Button>
                        </div>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}