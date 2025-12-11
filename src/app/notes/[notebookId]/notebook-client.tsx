
"use client";

import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth-provider';
import { Notebook as NotebookType, NotebookSection, Note, NoteContentBlock } from '@/lib/data';
import { onNotebookDetailsUpdate, deleteNoteFromSection, updateNotebook, addNoteToSection, updateNoteInSection, updateNotebookFolder } from '@/lib/dataService';
import { Button } from '@/components/ui/button';
import { Plus, ArrowLeft, Edit, Trash2, Image as ImageIcon, Loader2, StickyNote, FolderPlus, Folder, ChevronDown, MoreVertical, LayoutGrid, FileText, Settings, Sparkles, Palette, X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle as AlertDialogTitleComponent, AlertDialogFooter as AlertDialogFooterComponent, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { Textarea } from '@/components/ui/textarea';
import { migrateImage } from '@/ai/flows/migrate-image-flow';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Combobox } from '@/components/ui/combobox';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Card } from '@/components/ui/card';
import { useForm } from 'react-hook-form';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

// --- DESIGN SYSTEM: Glassmorphism ---
const glassColors = {
    HEADER_BG: "bg-slate-950/70 backdrop-blur-lg border-b border-white/5",
    CARD_BG: "bg-white/5 border border-white/10 shadow-lg backdrop-blur-md",
    SECTION_HEADER: "bg-white/5 border-b border-white/5 hover:bg-white/10 transition-colors",
    INPUT_BG: "bg-slate-950/50 border-white/10 text-slate-100 placeholder:text-slate-500 focus:border-indigo-500/50 focus:ring-indigo-500/20",
    BUTTON_GLASS: "bg-white/10 hover:bg-white/20 text-white border border-white/10",
};

const noteColors = [
    { name: 'Sarı', class: 'bg-amber-500/40 border-amber-400/30 text-amber-50 hover:bg-amber-500/50' },
    { name: 'Turkuaz', class: 'bg-cyan-500/40 border-cyan-400/30 text-cyan-50 hover:bg-cyan-500/50' },
    { name: 'Fuşya', class: 'bg-fuchsia-600/40 border-fuchsia-400/30 text-fuchsia-50 hover:bg-fuchsia-600/50' },
    { name: 'Nane', class: 'bg-lime-600/40 border-lime-400/30 text-lime-50 hover:bg-lime-600/50' },
    { name: 'Mavi', class: 'bg-blue-600/40 border-blue-400/30 text-blue-50 hover:bg-blue-600/50' },
    { name: 'Yeşil', class: 'bg-emerald-600/40 border-emerald-400/30 text-emerald-50 hover:bg-emerald-600/50' },
    { name: 'Pembe', class: 'bg-pink-600/40 border-pink-400/30 text-pink-50 hover:bg-pink-600/50' },
    { name: 'Mor', class: 'bg-violet-600/40 border-violet-400/30 text-violet-50 hover:bg-violet-600/50' },
];

const folderGradients = [
    'from-amber-500/20 to-orange-500/20 border-orange-500/30 text-orange-200',
    'from-blue-500/20 to-indigo-500/20 border-indigo-500/30 text-indigo-200',
    'from-emerald-500/20 to-teal-500/20 border-teal-500/30 text-teal-200',
    'from-rose-500/20 to-pink-500/20 border-pink-500/30 text-pink-200',
    'from-violet-500/20 to-purple-500/20 border-purple-500/30 text-purple-200',
];

const notebookColors = [
    { id: 'red', class: 'from-red-500 to-rose-600', name: 'Gül' },
    { id: 'orange', class: 'from-orange-500 to-amber-600', name: 'Kehribar' },
    { id: 'green', class: 'from-emerald-500 to-teal-600', name: 'Zümrüt' },
    { id: 'blue', class: 'from-blue-600 to-indigo-600', name: 'Okyanus' },
    { id: 'purple', class: 'from-violet-600 to-purple-600', name: 'Menekşe' },
    { id: 'pink', class: 'from-fuchsia-600 to-pink-600', name: 'Fuşya' },
];

interface NotebookDetails {
  notebook: NotebookType;
  notes: Note[];
}

export default function NotebookClient() {
  const params = useParams();
  const router = useRouter();
  const notebookId = params.notebookId as string;
  const { user } = useAuth();
  const { toast } = useToast();

  const [details, setDetails] = useState<NotebookDetails | null>(null);
  
  const [isSectionDialogOpen, setIsSectionDialogOpen] = useState(false);
  const [editingSection, setEditingSection] = useState<NotebookSection | null>(null);
  const [sectionFormData, setSectionFormData] = useState({ title: '', color: notebookColors[0].class });
  
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  
  const [sections, setSections] = React.useState<NotebookSection[]>([]);
  const [isFolderDialogOpen, setIsFolderDialogOpen] = useState(false);
  const [editingFolder, setEditingFolder] = useState<{ oldName: string; sectionId: string } | null>(null);
  const [newFolderName, setNewFolderName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null);

  const imageInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!notebookId || !user) return;
    const unsubscribe = onNotebookDetailsUpdate(notebookId, (data) => {
      if (data) {
        const sortedSections = (data.notebook.sections || []).sort((a, b) => a.order - b.order);
        if (!activeSectionId && sortedSections.length > 0) {
          setActiveSectionId(sortedSections[0].id);
        }
        setDetails({ ...data, notebook: { ...data.notebook, sections: sortedSections } });
        setSections(sortedSections);
      } else {
        setDetails(null);
        setSections([]);
        setActiveSectionId(null);
      }
    });
    return () => unsubscribe();
  }, [notebookId, user, activeSectionId]);

  const handleOpenSectionDialog = (section: NotebookSection | null) => {
    setEditingSection(section);
    setSectionFormData({
      title: section ? section.title : '',
      color: section ? section.color : notebookColors[Math.floor(Math.random() * notebookColors.length)].class
    });
    setIsSectionDialogOpen(true);
  };

  const handleSaveSection = async () => {
    if (!sectionFormData.title.trim() || !details) return;

    let newSections: NotebookSection[];
    const { title, color } = sectionFormData;

    if (editingSection) {
        newSections = details.notebook.sections.map(s => 
            s.id === editingSection.id ? { ...s, title: title.trim(), color } : s
        );
    } else {
        const newSection: NotebookSection = {
            id: Date.now().toString(),
            title: title.trim(),
            color: color,
            order: details.notebook.sections.length,
            folders: [],
        }
        newSections = [...(details.notebook.sections || []), newSection];
        setActiveSectionId(newSection.id);
    }
    
    try {
        await updateNotebook(notebookId, { sections: newSections });
        toast({ title: editingSection ? 'Bölüm Güncellendi' : 'Bölüm Eklendi' });
        setIsSectionDialogOpen(false);
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
        if (activeSectionId === sectionId) {
            setActiveSectionId(newSections.length > 0 ? newSections[0].id : null);
        }

    } catch (e) {
        toast({ title: 'Hata', description: 'Bölüm silinirken bir sorun oluştu.', variant: 'destructive' });
    }
  };


  const handleOpenNoteDialog = (note: Note | null) => {
    setEditingNote(note);
  };

  const handleAddNewNote = async (folder?: string, imageUrl?: string | null) => {
    if (!activeSectionId) {
        toast({ title: 'Bölüm seçilmedi', description: 'Lütfen önce bir bölüm oluşturun veya seçin.', variant: 'destructive'});
        return;
    }
    handleOpenNoteDialog({ 
        id: '', // Temporary ID
        notebookId,
        sectionId: activeSectionId,
        familyId: details?.notebook.familyId || '',
        title: "", 
        content: imageUrl ? [] : [{ id: Date.now().toString(), type: 'text', data: '' }],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        imageUrl: imageUrl || null, 
        folder: folder 
    });
  };
  
  const handleImageNoteAdd = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !activeSectionId) return;

    toast({ title: 'Görsel yükleniyor...' });
    setIsLoading(true);

    try {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onloadend = async () => {
        const imageDataUri = reader.result as string;
        const destinationPath = `notes-images/${user?.uid}-${Date.now()}.jpg`;
        const migrationResult = await migrateImage({ imageDataUri, destinationPath });

        if (migrationResult.success && migrationResult.newUrl) {
          await handleAddNewNote(undefined, migrationResult.newUrl);
          toast({ title: 'Görsel not eklendi!' });
        } else {
          throw new Error(migrationResult.error || 'Bilinmeyen bir görsel yükleme hatası.');
        }
      };
    } catch(e: any) {
       toast({ title: 'Hata', description: e.message, variant: 'destructive' });
    } finally {
      setIsLoading(false);
      event.target.value = ''; // Reset input
    }
  }
  
   const handleAddNewFolder = async () => {
    if (!newFolderName.trim() || !details || !activeSectionId) return;
    
    const currentSection = details.notebook.sections.find(s => s.id === activeSectionId);
    if (!currentSection) return;
    if((currentSection.folders || []).includes(newFolderName.trim())) {
      toast({ title: 'Bu klasör zaten mevcut', variant: 'destructive'});
      return;
    }

    const updatedFolders = [...(currentSection.folders || []), newFolderName.trim()];
    const updatedSections = details.notebook.sections.map(s => 
        s.id === activeSectionId ? { ...s, folders: updatedFolders } : s
    );

    try {
        await updateNotebook(notebookId, { sections: updatedSections });
        toast({ title: "Klasör Eklendi" });
        setNewFolderName('');
        setIsFolderDialogOpen(false);
    } catch (e) {
        toast({ title: 'Hata', variant: 'destructive' });
    }
  };
  
  const handleOpenFolderDialog = (folder: { oldName: string; sectionId: string } | null) => {
    if (folder) {
        setNewFolderName(folder.oldName);
        setEditingFolder(folder);
    } else {
        setNewFolderName('');
        setEditingFolder(null);
    }
    setIsFolderDialogOpen(true);
  };
  
  const handleUpdateFolder = async () => {
    if (!editingFolder || !newFolderName.trim() || !details) return;

    try {
      await updateNotebookFolder(notebookId, editingFolder.sectionId, editingFolder.oldName, newFolderName);
      toast({ title: 'Klasör Güncellendi'});
      setIsFolderDialogOpen(false);
      setEditingFolder(null);
    } catch (error) {
       toast({ title: 'Hata', description: "Klasör güncellenemedi.", variant: 'destructive' });
    }
  }


  const handleDeleteFolder = async (folderToDelete: string) => {
      if (!details || !activeSectionId) return;
      const currentSection = details.notebook.sections.find(s => s.id === activeSectionId);
      if (!currentSection) return;

      const updatedFolders = (currentSection.folders || []).filter(f => f !== folderToDelete);
       const updatedSections = details.notebook.sections.map(s => 
          s.id === activeSectionId ? { ...s, folders: updatedFolders } : s
      );

      try {
          await updateNotebook(notebookId, { sections: updatedSections });
          // Note: Notes within the folder are not deleted, they become 'un-foldered'.
          toast({ title: "Klasör Silindi", variant: 'destructive' });
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
        if (!activeSectionId) throw new Error("No active section to add note to.");
        await addNoteToSection(notebookId, activeSectionId, noteData);
        toast({ title: "Not Eklendi" });
      }
    } catch (error) {
      toast({ title: 'Hata', variant: 'destructive' });
    } finally {
      handleOpenNoteDialog(null);
    }
  };
  
  const handleDeleteNote = async (noteId: string) => {
    if(!details) return;
    try {
      await deleteNoteFromSection(noteId);
      toast({ title: 'Not Silindi', variant: 'destructive' });
    } catch (error) {
      toast({ title: 'Hata', description: "Not silinirken bir sorun oluştu.", variant: 'destructive' });
    }
  };

  if (!details) {
    return <div className="flex items-center justify-center h-screen bg-slate-950 text-slate-400">Yükleniyor...</div>;
  }

  const { notebook, notes } = details;
  const currentSection = sections.find(s => s.id === activeSectionId);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans relative overflow-hidden flex flex-col">
      
      {/* FIXED BACKGROUND */}
      <div className="fixed inset-0 bg-slate-950 -z-50" />
      
      {/* AMBIENT BACKGROUND */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
          <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-purple-900/20 rounded-full blur-[120px]" />
          <div className="absolute bottom-[20%] left-[-5%] w-[400px] h-[400px] bg-indigo-900/20 rounded-full blur-[120px]" />
      </div>

      {/* HEADER */}
      <div className={cn("sticky top-0 z-40 w-full transition-all duration-300", glassColors.HEADER_BG)}>
        <div className="max-w-7xl mx-auto px-4 md:px-6 h-16 flex items-center justify-between">
            <div className="flex items-center gap-3">
                <Button 
                    onClick={() => router.push('/notes')} 
                    variant="ghost" 
                    size="icon"
                    className="rounded-full hover:bg-white/10 text-slate-300 hover:text-white transition-colors -ml-2"
                >
                    <ArrowLeft className="h-6 w-6" />
                </Button>
                <div>
                    <h1 className="text-lg font-bold tracking-tight text-slate-100 leading-none">
                        {notebook.title}
                    </h1>
                    <p className="text-xs font-medium text-slate-400 mt-0.5 hidden sm:block">Not Defteri İçeriği</p>
                </div>
            </div>
            
            <div className="flex items-center gap-2">
                <Button 
                    onClick={() => handleOpenSectionDialog(null)}
                    className="rounded-xl px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold shadow-lg shadow-indigo-500/20 border border-indigo-400/20 h-9 text-sm"
                >
                    <Plus className="mr-1.5 h-4 w-4" /> Bölüm Ekle
                </Button>
            </div>
        </div>
      </div>
      
      {/* MAIN CONTENT */}
      <div className="flex-1 max-w-7xl mx-auto w-full p-4 md:p-6 relative z-10 flex flex-col min-h-0">
         {sections.length === 0 ? (
             <div className="flex flex-col items-center justify-center py-20 text-center space-y-4 bg-white/5 rounded-[2.5rem] border border-dashed border-white/10 m-auto max-w-lg w-full">
                <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center">
                    <LayoutGrid className="h-8 w-8 text-slate-500" />
                </div>
                <div>
                    <h3 className="text-lg font-bold text-slate-200">Defter Boş</h3>
                    <p className="text-slate-400 mt-1 text-sm">Henüz hiç bölüm oluşturulmadı. Yeni bir bölüm ekleyerek başlayın.</p>
                </div>
            </div>
         ) : (
             <Accordion type="multiple" className="w-full space-y-6" defaultValue={(activeSectionId ? [activeSectionId] : [])}>
                 {sections.map((section, index) => {
                     const sectionNotes = notes.filter(note => note.sectionId === section.id);
                     const notesByFolder = sectionNotes.reduce((acc, note) => {
                        const folderKey = note.folder || "Genel Notlar";
                        if (!acc[folderKey]) acc[folderKey] = [];
                        acc[folderKey].push(note);
                        return acc;
                     }, {} as Record<string, Note[]>);
                     
                     const folderOrder = ['Genel Notlar', ...(section.folders || [])];
                     
                     return (
                        <AccordionItem key={section.id} value={section.id} className="border-none">
                            <div className={cn("rounded-3xl overflow-hidden shadow-xl transition-all", glassColors.CARD_BG)}>
                                {/* Section Header */}
                                <div className={cn("relative overflow-hidden", `bg-gradient-to-r ${section.color}`)}>
                                    <div className="absolute inset-0 bg-black/10" />
                                    <div className="relative flex items-center justify-between p-4 sm:p-5">
                                        <AccordionTrigger className="flex-1 hover:no-underline p-0 text-white group">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 bg-white/20 backdrop-blur-md rounded-2xl shadow-sm">
                                                    {notebook.icon ? <span className="text-lg">{notebook.icon}</span> : <FileText className="w-5 h-5 text-white" />}
                                                </div>
                                                <div className="text-left">
                                                    <h3 className="text-lg font-bold leading-tight">{section.title}</h3>
                                                    <p className="text-white/80 text-xs font-medium mt-0.5">{sectionNotes.length} not</p>
                                                </div>
                                            </div>
                                        </AccordionTrigger>
                                        
                                        <div className="flex items-center gap-1">
                                            <Button 
                                                variant="ghost" 
                                                size="icon" 
                                                className="h-8 w-8 text-white/70 hover:text-white hover:bg-white/20 rounded-full"
                                                onClick={(e) => { e.stopPropagation(); setActiveSectionId(section.id); handleAddNewNote(); }}
                                                title="Hızlı Not Ekle"
                                            >
                                                <StickyNote className="h-5 h-5" />
                                            </Button>
                                            
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-white/70 hover:text-white hover:bg-white/20 rounded-full" onClick={(e) => e.stopPropagation()}>
                                                        <MoreVertical className="h-5 h-5" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end" className="bg-slate-900 border-white/10 text-slate-100">
                                                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setActiveSectionId(section.id); handleOpenFolderDialog(null); }}>
                                                        <FolderPlus className="mr-2 h-4 w-4 text-blue-400"/> Yeni Klasör
                                                    </DropdownMenuItem>
                                                    <DropdownMenuSeparator className="bg-white/10" />
                                                    <DropdownMenuItem onClick={() => handleOpenSectionDialog(section)}>
                                                        <Edit className="mr-2 h-4 w-4"/> Düzenle
                                                    </DropdownMenuItem>
                                                    <AlertDialog>
                                                        <AlertDialogTrigger asChild>
                                                            <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-rose-400 focus:text-rose-300 focus:bg-rose-500/10">
                                                                <Trash2 className="mr-2 h-4 w-4"/> Sil
                                                            </DropdownMenuItem>
                                                        </AlertDialogTrigger>
                                                        <AlertDialogContent className="bg-slate-900 border-white/10 text-slate-100">
                                                            <AlertDialogHeader>
                                                                <AlertDialogTitleComponent>Bölümü Sil?</AlertDialogTitleComponent>
                                                                <AlertDialogDescription className="text-slate-400">"{section.title}" bölümü ve içindeki tüm notlar kalıcı olarak silinecek.</AlertDialogDescription>
                                                            </AlertDialogHeader>
                                                            <AlertDialogFooterComponent>
                                                                <AlertDialogCancel className="bg-white/5 border-white/10 hover:bg-white/10 text-slate-200">İptal</AlertDialogCancel>
                                                                <AlertDialogAction onClick={() => handleDeleteSection(section.id)} className="bg-rose-600 hover:bg-rose-700 text-white">Sil</AlertDialogAction>
                                                            </AlertDialogFooterComponent>
                                                        </AlertDialogContent>
                                                    </AlertDialog>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </div>
                                    </div>
                                </div>

                                {/* Section Content */}
                                <AccordionContent className="p-0 bg-transparent">
                                    <div className="p-4 sm:p-6 space-y-6">
                                        {folderOrder.map((folderName, fIndex) => {
                                            const folderNotes = notesByFolder[folderName];
                                            if (!folderNotes || folderNotes.length === 0) {
                                                if (folderName === 'Genel Notlar' && Object.values(notesByFolder).flat().length > 0) return null;
                                            }
                                            
                                            // Folder Gradient logic
                                            const gradientClass = folderName === 'Genel Notlar' 
                                                ? 'bg-slate-800/30 border-slate-700/30 text-slate-300' 
                                                : `bg-gradient-to-br ${folderGradients[fIndex % folderGradients.length]}`;

                                            return (
                                                <div key={folderName} className="space-y-3">
                                                    {/* Folder Header */}
                                                    <div className={cn("flex items-center justify-between px-4 py-2 rounded-xl border backdrop-blur-sm", gradientClass)}>
                                                        <div className="flex items-center gap-2">
                                                            {folderName === 'Genel Notlar' ? <Sparkles className="w-4 h-4 opacity-70" /> : <Folder className="w-4 h-4 opacity-70" />}
                                                            <span className="text-sm font-bold tracking-wide uppercase">{folderName}</span>
                                                            <span className="bg-black/20 text-[10px] px-1.5 py-0.5 rounded-md ml-1 font-mono opacity-80">
                                                                {(folderNotes || []).length}
                                                            </span>
                                                        </div>
                                                        
                                                        {folderName !== 'Genel Notlar' && (
                                                            <DropdownMenu>
                                                                <DropdownMenuTrigger asChild>
                                                                    <Button variant="ghost" size="icon" className="h-6 w-6 text-white/50 hover:text-white -mr-1">
                                                                        <MoreVertical className="h-3 w-3" />
                                                                    </Button>
                                                                </DropdownMenuTrigger>
                                                                <DropdownMenuContent align="end" className="bg-slate-900 border-white/10 text-slate-100">
                                                                    <DropdownMenuItem onClick={() => { setActiveSectionId(section.id); handleOpenFolderDialog({ oldName: folderName, sectionId: section.id }); }}>
                                                                        <Edit className="mr-2 h-3 w-3"/> Adlandır
                                                                    </DropdownMenuItem>
                                                                    <DropdownMenuItem onClick={() => { setActiveSectionId(section.id); handleDeleteFolder(folderName); }} className="text-rose-400 focus:text-rose-300 focus:bg-rose-500/10">
                                                                        <Trash2 className="mr-2 h-3 w-3"/> Sil
                                                                    </DropdownMenuItem>
                                                                </DropdownMenuContent>
                                                            </DropdownMenu>
                                                        )}
                                                    </div>

                                                    {/* Notes Grid */}
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                                        {(folderNotes || []).map(note => (
                                                            <StickyNoteCard 
                                                                key={note.id} 
                                                                note={note}
                                                                onOpenDialog={() => { setActiveSectionId(section.id); handleOpenNoteDialog(note); }}
                                                                onDelete={() => handleDeleteNote(note.id)}
                                                            />
                                                        ))}
                                                        {/* Empty State for Folder */}
                                                        {(folderNotes || []).length === 0 && (
                                                            <div className="col-span-full py-8 text-center text-slate-500 text-sm italic border border-dashed border-white/5 rounded-xl">
                                                                Bu klasörde not yok.
                                                            </div>
                                                        )}
                                                        {/* Quick Add Card */}
                                                        <div 
                                                            className="flex flex-col items-center justify-center min-h-[140px] rounded-2xl border-2 border-dashed border-white/5 hover:border-white/20 hover:bg-white/5 cursor-pointer transition-all group"
                                                            onClick={() => { setActiveSectionId(section.id); handleAddNewNote(folderName === 'Genel Notlar' ? '' : folderName); }}
                                                        >
                                                            <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-indigo-500 group-hover:text-white transition-colors mb-2">
                                                                <Plus className="w-5 h-5 text-slate-400 group-hover:text-white" />
                                                            </div>
                                                            <span className="text-xs font-semibold text-slate-500 group-hover:text-slate-300">Yeni Not</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    </div>
                                </AccordionContent>
                            </div>
                        </AccordionItem>
                     )
                 })}
             </Accordion>
         )}
      </div>
      
      {/* Floating Action Button (Mobile) */}
      <div className="fixed bottom-6 right-6 z-50 md:hidden">
        <Button className="rounded-full w-14 h-14 shadow-xl bg-indigo-600 hover:bg-indigo-500 text-white" size="icon" onClick={() => handleOpenSectionDialog(null)}>
            <Plus className="h-7 w-7" />
        </Button>
      </div>
      
      {/* Hidden File Input */}
      <input type="file" accept="image/*" className="hidden" ref={imageInputRef} onChange={handleImageNoteAdd} />

      {/* DIALOGS */}
      
      {/* Section Dialog */}
      <Dialog open={isSectionDialogOpen} onOpenChange={setIsSectionDialogOpen}>
        <DialogContent className="bg-slate-900 border-white/10 text-slate-100 sm:max-w-md rounded-2xl">
            <DialogHeader>
                <DialogTitle>{editingSection ? "Bölümü Düzenle" : "Yeni Bölüm Ekle"}</DialogTitle>
                <DialogDescription className="text-slate-400">Notlarınızı kategorize etmek için bir bölüm oluşturun.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-6 py-4">
                <div className="space-y-2">
                    <label className="text-xs font-semibold text-slate-300 uppercase">Bölüm Adı</label>
                    <Input 
                        placeholder="Örn: Ders Notları" 
                        value={sectionFormData.title} 
                        onChange={(e) => setSectionFormData(prev => ({ ...prev, title: e.target.value }))} 
                        onKeyDown={(e) => { if(e.key === 'Enter') handleSaveSection()}} 
                        className={glassColors.INPUT_BG}
                    />
                </div>
                <div className="space-y-2">
                    <label className="text-xs font-semibold text-slate-300 uppercase">Renk Teması</label>
                    <div className="flex flex-wrap gap-3">
                        {notebookColors.map(color => (
                            <button 
                                key={color.name} 
                                aria-label={color.name} 
                                className={cn(
                                    "h-8 w-8 rounded-full bg-gradient-to-br shadow-sm transition-transform hover:scale-110", 
                                    color.class, 
                                    sectionFormData.color === color.class && "ring-2 ring-white ring-offset-2 ring-offset-slate-900 scale-110"
                                )} 
                                onClick={() => setSectionFormData(prev => ({...prev, color: color.class}))}
                            />
                        ))}
                    </div>
                </div>
            </div>
            <DialogFooter>
                <Button variant="ghost" onClick={() => setIsSectionDialogOpen(false)} className="text-slate-400 hover:text-white hover:bg-white/10">İptal</Button>
                <Button onClick={handleSaveSection} className="bg-indigo-600 hover:bg-indigo-500 text-white">Kaydet</Button>
            </DialogFooter>
        </DialogContent>
     </Dialog>
     
     {/* Folder Dialog */}
     <Dialog open={isFolderDialogOpen} onOpenChange={setIsFolderDialogOpen}>
        <DialogContent className="bg-slate-900 border-white/10 text-slate-100 sm:max-w-sm rounded-2xl">
            <DialogHeader>
                <DialogTitle>{editingFolder ? "Klasörü Düzenle" : "Yeni Klasör Oluştur"}</DialogTitle>
                <DialogDescription className="text-slate-400">Notlarınızı gruplamak için bir klasör adı girin.</DialogDescription>
            </DialogHeader>
            <div className="py-2">
                <Input 
                    placeholder="Klasör adı" 
                    value={newFolderName} 
                    onChange={e => setNewFolderName(e.target.value)} 
                    onKeyDown={e => e.key === 'Enter' && (editingFolder ? handleUpdateFolder() : handleAddNewFolder())}
                    className={glassColors.INPUT_BG}
                />
            </div>
            <DialogFooter>
                <Button variant="ghost" onClick={() => setIsFolderDialogOpen(false)} className="text-slate-400 hover:text-white hover:bg-white/10">İptal</Button>
                <Button onClick={editingFolder ? handleUpdateFolder : handleAddNewFolder} className="bg-indigo-600 hover:bg-indigo-500 text-white">
                    {editingFolder ? 'Güncelle' : 'Oluştur'}
                </Button>
            </DialogFooter>
        </DialogContent>
       </Dialog>
     
     <NoteEditForm 
        note={editingNote} 
        sectionFolders={currentSection?.folders || []}
        onOpenChange={(open) => {if (!open) setEditingNote(null)}}
        onSave={handleSaveNote}
     />
    </div>
  );
}


// STICKY NOTE CARD COMPONENT
interface StickyNoteCardProps {
    note: Note;
    onOpenDialog: () => void;
    onDelete: () => void;
}

function StickyNoteCard({ note, onOpenDialog, onDelete }: StickyNoteCardProps) {
    const getNoteStyle = (colorClass: string | undefined) => {
        if (!colorClass) return "bg-slate-800/60 border-white/10 text-slate-200 hover:bg-slate-800/80";

        if (colorClass.includes('yellow') || colorClass.includes('amber')) return "bg-amber-500/40 border-amber-400/30 text-amber-50 hover:bg-amber-500/50";
        if (colorClass.includes('blue')) return "bg-blue-600/40 border-blue-400/30 text-blue-50 hover:bg-blue-600/50";
        if (colorClass.includes('green') || colorClass.includes('emerald')) return "bg-emerald-600/40 border-emerald-400/30 text-emerald-50 hover:bg-emerald-600/50";
        if (colorClass.includes('pink') || colorClass.includes('rose') || colorClass.includes('red')) return "bg-pink-600/40 border-pink-400/30 text-pink-50 hover:bg-pink-600/50";
        if (colorClass.includes('purple') || colorClass.includes('violet')) return "bg-violet-600/40 border-violet-400/30 text-violet-50 hover:bg-violet-600/50";
        if (colorClass.includes('lime')) return 'bg-lime-600/40 border-lime-400/30 text-lime-50 hover:bg-lime-600/50';
        if (colorClass.includes('cyan')) return 'bg-cyan-500/40 border-cyan-400/30 text-cyan-50 hover:bg-cyan-500/50';
        if (colorClass.includes('fuchsia')) return 'bg-fuchsia-600/40 border-fuchsia-400/30 text-fuchsia-50 hover:bg-fuchsia-600/50';
        
        return "bg-slate-800/60 border-white/10 text-slate-200 hover:bg-slate-800/80";
    };

    const noteStyle = getNoteStyle(note.color);
    const textContent = Array.isArray(note.content) ? (note.content.find(b => b.type === 'text')?.data || '') : '';

    return (
        <Card className={cn(
            "group relative rounded-2xl transition-all duration-300 hover:-translate-y-1 hover:shadow-xl cursor-pointer flex flex-col h-full border backdrop-blur-sm overflow-hidden", 
            noteStyle
        )} onClick={onOpenDialog}>
            {note.imageUrl && (
                <div className="aspect-video w-full relative bg-black/20">
                    <Image 
                        src={note.imageUrl} 
                        alt={note.title} 
                        layout="fill" 
                        objectFit="cover" 
                        className="transition-transform duration-500 group-hover:scale-105" 
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent" />
                </div>
            )}
            
            <div className="p-5 flex-grow flex flex-col min-h-[6rem]">
                <h3 className="font-bold text-lg leading-snug mb-2 drop-shadow-md">{note.title || "Başlıksız Not"}</h3>
                {textContent && (
                    <p className="text-sm opacity-90 line-clamp-4 leading-relaxed font-medium drop-shadow-sm">
                        {textContent}
                    </p>
                )}
                {!textContent && !note.imageUrl && (
                    <div className="flex-grow flex items-center justify-center opacity-40">
                        <FileText className="w-10 h-10" />
                    </div>
                )}
            </div>
            
            {/* Quick Actions (Hover) */}
            <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10">
                <Button variant="ghost" size="icon" className="h-8 w-8 bg-black/40 hover:bg-black/60 text-white rounded-full backdrop-blur-md border border-white/10" onClick={(e) => { e.stopPropagation(); onOpenDialog(); }}>
                    <Edit className="h-4 w-4"/>
                </Button>
                 <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 bg-rose-500/80 hover:bg-rose-600 text-white rounded-full backdrop-blur-md border border-white/10" onClick={(e) => e.stopPropagation()}>
                            <Trash2 className="h-4 w-4"/>
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent onClick={(e) => e.stopPropagation()} className="bg-slate-900 border-white/10 text-slate-100">
                        <AlertDialogHeader>
                            <AlertDialogTitleComponent>Notu Sil</AlertDialogTitleComponent>
                            <AlertDialogDescription className="text-slate-400">"{note.title}" notunu kalıcı olarak silmek istediğinizden emin misiniz?</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooterComponent>
                            <AlertDialogCancel className="bg-white/5 border-white/10 hover:bg-white/10 text-slate-200">İptal</AlertDialogCancel>
                            <AlertDialogAction onClick={onDelete} className="bg-rose-600 hover:bg-rose-700 text-white">Evet, Sil</AlertDialogAction>
                        </AlertDialogFooterComponent>
                    </AlertDialogContent>
                </AlertDialog>
            </div>
        </Card>
    );
}

// NOTE EDIT FORM
const noteFormSchema = z.object({
  title: z.string().min(2, "Başlık en az 2 karakter olmalıdır.").default(""),
  content: z.string().optional().default(""),
  color: z.string().optional(),
  folder: z.string().optional(),
});

type NoteFormData = z.infer<typeof noteFormSchema>;

interface NoteEditFormProps {
  note: Note | null;
  onOpenChange: (open: boolean) => void;
  onSave: (data: Partial<Note>) => void;
  sectionFolders: string[];
}

function NoteEditForm({ note, onOpenChange, onSave, sectionFolders }: NoteEditFormProps) {
  const form = useForm<NoteFormData>();
  const [isLoading, setIsLoading] = React.useState(false);
  const [isOptionsOpen, setIsOptionsOpen] = React.useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useLayoutEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      // Added a buffer to prevent scrollbar flicker
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight + 2}px`;
    }
  }, [form.watch('content')]);


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

  const handleFormSubmit = (data: NoteFormData) => {
    if (!note) return;
    setIsLoading(true);
    const updatedContent: NoteContentBlock[] = [{ id: note.content?.[0]?.id || Date.now().toString(), type: 'text', data: data.content || '' }];
    onSave({
        title: data.title,
        content: updatedContent,
        color: data.color,
        folder: data.folder,
    });
    setIsLoading(false);
  };
  
  const folderOptions = [{label: 'Genel Notlar', value: ''}, ...sectionFolders.map(f => ({ label: f, value: f }))];
  const watchedColor = form.watch('color');

  // Dinamik arka plan rengi için (NoteEditForm içinde de doğru rengi göstermek için)
  const getEditorBackgroundClass = (colorClass: string | undefined) => {
        if (!colorClass) return "bg-transparent";
        if (colorClass.includes('yellow') || colorClass.includes('amber')) return "bg-amber-500/20";
        if (colorClass.includes('blue')) return "bg-blue-600/20";
        if (colorClass.includes('green') || colorClass.includes('emerald')) return "bg-emerald-600/20";
        if (colorClass.includes('pink') || colorClass.includes('rose') || colorClass.includes('red')) return "bg-pink-600/20";
        if (colorClass.includes('purple') || colorClass.includes('violet')) return "bg-violet-600/20";
        if (colorClass.includes('lime')) return 'bg-lime-600/20';
        if (colorClass.includes('cyan')) return 'bg-cyan-500/20';
        if (colorClass.includes('fuchsia')) return 'bg-fuchsia-600/20';
        return "bg-slate-800/30";
  }
  
  // Renk etkisini sadece Tool Bar ve Başlık çizgisine yansıtan helper
  const getAccentColor = (colorClass: string | undefined) => {
    if (!colorClass) return "border-white/5";
    if (colorClass.includes('yellow') || colorClass.includes('amber')) return "border-amber-400/50";
    if (colorClass.includes('blue')) return "border-blue-400/50";
    if (colorClass.includes('green') || colorClass.includes('emerald')) return "border-emerald-400/50";
    if (colorClass.includes('pink') || colorClass.includes('rose') || colorClass.includes('red')) return "border-rose-400/50";
    if (colorClass.includes('purple') || colorClass.includes('violet')) return "border-violet-400/50";
    if (colorClass.includes('lime')) return 'border-lime-400/50';
    if (colorClass.includes('cyan')) return 'border-cyan-400/50';
    if (colorClass.includes('fuchsia')) return 'border-fuchsia-400/50';
    return "border-white/20";
  }


  if (!note) return null;

  return (
    <Dialog open={!!note} onOpenChange={onOpenChange}>
      <DialogContent className="w-[100vw] h-[100dvh] md:w-full md:max-w-3xl md:h-[750px] p-0 bg-slate-950 border-none md:border md:border-white/10 text-slate-100 md:rounded-3xl flex flex-col shadow-2xl">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleFormSubmit)} className="flex flex-col h-full relative">
            
            {/* 1. HEADER / TOOLBAR (Fixed Top) */}
            <div className={cn("flex items-center justify-between px-6 py-4 border-b shrink-0", glassColors.HEADER_BG, getAccentColor(watchedColor))}>
               <div className="flex items-center gap-2 text-slate-400">
                  <StickyNote className="w-5 h-5 text-indigo-400" />
                  <span className="text-sm font-medium">{note.id ? "Notu Düzenle" : "Yeni Not"}</span>
               </div>
               <div className="flex items-center gap-2">
                   {watchedColor && (
                       <div className={cn("w-3 h-3 rounded-full shadow-sm ring-1 ring-white/10", getNoteStyle(watchedColor))} />
                   )}
                   <DialogClose asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-white hover:bg-white/5 rounded-full">
                            <X className="h-5 w-5" />
                        </Button>
                    </DialogClose>
               </div>
            </div>
            
            {/* 2. WRITING CANVAS (Scrollable Content Area) */}
            <div className="flex-1 overflow-y-auto custom-scrollbar relative">
                {/* Background Tint - Fixed to match selection */}
                <div className={cn("absolute inset-0 pointer-events-none transition-colors duration-500", getEditorBackgroundClass(watchedColor))} />

                <div className="p-6 md:p-8 space-y-6 relative z-10">
                    
                    {/* Title Input - Ayrı Cam Panelde */}
                    <div className={cn("relative p-4 md:p-6 rounded-2xl", glassColors.CARD_BG)}>
                        <FormField name="title" control={form.control} render={({ field }) => (
                            <FormItem>
                                <FormControl>
                                    <Input 
                                        {...field} 
                                        placeholder="Not Başlığı" 
                                        className="bg-transparent border-none text-3xl md:text-4xl font-black p-0 placeholder:text-slate-600 focus-visible:ring-0 text-white leading-tight focus:bg-transparent" 
                                    />
                                </FormControl>
                                <FormMessage className="text-rose-400" />
                            </FormItem>
                        )}/>
                        {/* Title Altı Çizgisi */}
                        <div className={cn("absolute bottom-0 left-0 w-full h-0.5 opacity-50", getAccentColor(watchedColor).replace('border', 'bg'))} />
                    </div>
                    
                    {/* Content Textarea - Expansive */}
                    <div className={cn("relative p-4 md:p-6 rounded-2xl bg-black/20")}>
                        <FormField name="content" control={form.control} render={({ field }) => (
                            <FormItem>
                                <FormControl>
                                    <Textarea 
                                        ref={textareaRef}
                                        {...field} 
                                        placeholder="Düşüncelerini buraya yaz..." 
                                        className="bg-transparent border-none resize-none p-0 text-base text-slate-300 focus-visible:ring-0 leading-relaxed placeholder:text-slate-500 focus:bg-transparent" 
                                    />
                                </FormControl>
                                <FormMessage className="text-rose-400" />
                            </FormItem>
                        )}/>
                    </div>
                </div>
            </div>

            {/* 3. BOTTOM CONTROLS PANEL (Fixed Bottom) */}
            <div className="border-t border-white/5 bg-slate-900/80 backdrop-blur-xl p-4 shrink-0 transition-all">
                <Collapsible open={isOptionsOpen} onOpenChange={setIsOptionsOpen}>
                    <div className="flex items-center justify-between">
                        <CollapsibleTrigger asChild>
                            <Button type="button" variant="ghost" className="text-xs text-slate-400 hover:text-white h-auto py-2 px-3 rounded-lg hover:bg-white/5 group">
                                <ChevronDown className={cn("h-4 w-4 mr-2 transition-transform duration-300 text-indigo-400", isOptionsOpen && "rotate-180")} />
                                <span className="font-medium">Detaylar & Ayarlar</span>
                            </Button>
                        </CollapsibleTrigger>
                        
                        <div className="flex gap-2">
                            <Button type="submit" disabled={isLoading} className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl px-6 shadow-lg shadow-indigo-500/20">
                                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Kaydet
                            </Button>
                        </div>
                    </div>

                    <CollapsibleContent className="mt-4 space-y-6 animate-accordion-down overflow-hidden">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-white/5 rounded-2xl p-5 border border-white/5">
                            <FormField name="folder" control={form.control} render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-xs text-slate-400 uppercase font-bold tracking-wider flex items-center gap-2 mb-2">
                                        <Folder className="w-3.5 h-3.5" /> Klasör
                                    </FormLabel>
                                    <FormControl>
                                        <Combobox 
                                            options={folderOptions} 
                                            value={field.value || ''} 
                                            onChange={field.onChange} 
                                            placeholder='Klasör seç...' 
                                            notfoundText='Klasör bulunamadı.' 
                                            className="bg-slate-950/50 border-white/10 text-slate-200 h-11 w-full rounded-xl"
                                        />
                                    </FormControl>
                                    <FormMessage className="text-rose-400" />
                                </FormItem>
                            )}/>

                            <FormField name="color" control={form.control} render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-xs text-slate-400 uppercase font-bold tracking-wider flex items-center gap-2 mb-2">
                                        <Palette className="w-3.5 h-3.5" /> Renk Etiketi
                                    </FormLabel>
                                    <FormControl>
                                        <div className="flex gap-2 items-center flex-wrap">
                                            {noteColors.map(color => (
                                                <TooltipProvider key={color.name}>
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <button 
                                                                type="button" 
                                                                aria-label={color.name} 
                                                                className={cn(
                                                                    "h-8 w-8 rounded-full transition-all duration-200 border", 
                                                                    color.class, 
                                                                    field.value === color.class 
                                                                        ? "ring-2 ring-white ring-offset-2 ring-offset-slate-900 scale-110 shadow-lg shadow-white/10" 
                                                                        : "border-transparent hover:scale-110 hover:border-white/20 opacity-70 hover:opacity-100"
                                                                )} 
                                                                onClick={() => field.onChange(color.class)} 
                                                            />
                                                        </TooltipTrigger>
                                                        <TooltipContent className="bg-slate-900 text-white border-white/10 text-xs">
                                                            {color.name}
                                                        </TooltipContent>
                                                    </Tooltip>
                                                </TooltipProvider>
                                            ))}
                                            <button
                                                type="button"
                                                onClick={() => field.onChange("")}
                                                className="h-8 w-8 rounded-full border border-white/10 bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700 transition-all ml-2"
                                                title="Rengi Sıfırla"
                                            >
                                                <X className="w-3 h-3" />
                                            </button>
                                        </div>
                                    </FormControl>
                                    <FormMessage className="text-rose-400" />
                                </FormItem>
                            )}/>
                        </div>
                    </CollapsibleContent>
                </Collapsible>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

const getNoteStyle = (colorClass: string | undefined) => {
    if (!colorClass) return "bg-slate-800/60 border-white/10 text-slate-200 hover:bg-slate-800/80";

    if (colorClass.includes('yellow') || colorClass.includes('amber')) return "bg-amber-500/40 border-amber-400/30 text-amber-50 hover:bg-amber-500/50";
    if (colorClass.includes('blue')) return "bg-blue-600/40 border-blue-400/30 text-blue-50 hover:bg-blue-600/50";
    if (colorClass.includes('green') || colorClass.includes('emerald')) return "bg-emerald-600/40 border-emerald-400/30 text-emerald-50 hover:bg-emerald-600/50";
    if (colorClass.includes('pink') || colorClass.includes('rose') || colorClass.includes('red')) return "bg-pink-600/40 border-pink-400/30 text-pink-50 hover:bg-pink-600/50";
    if (colorClass.includes('purple') || colorClass.includes('violet')) return "bg-violet-600/40 border-violet-400/30 text-violet-50 hover:bg-violet-600/50";
    if (colorClass.includes('lime')) return 'bg-lime-600/40 border-lime-400/30 text-lime-50 hover:bg-lime-600/50';
    if (colorClass.includes('cyan')) return 'bg-cyan-500/40 border-cyan-400/30 text-cyan-50 hover:bg-cyan-500/50';
    if (colorClass.includes('fuchsia')) return 'bg-fuchsia-600/40 border-fuchsia-400/30 text-fuchsia-50 hover:bg-fuchsia-600/50';
    
    return "bg-slate-800/60 border-white/10 text-slate-200 hover:bg-slate-800/80";
};

    