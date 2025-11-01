
"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { z } from 'zod';
import { useAuth } from '@/components/auth-provider';
import { Notebook as NotebookType, NotebookSection, Note, NoteContentBlock } from '@/lib/data';
import { onNotebookDetailsUpdate, deleteNoteFromSection, updateNotebook, addNoteToSection, updateNoteInSection, updateNotebookFolder } from '@/lib/dataService';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, ArrowLeft, Edit, Trash2, Image as ImageIcon, Loader2, StickyNote, FileImage, Palette, MoreVertical, FolderPlus, Folder, ChevronDown } from 'lucide-react';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogTrigger, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle as AlertDialogTitleComponent, AlertDialogFooter as AlertDialogFooterComponent } from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { Textarea } from '@/components/ui/textarea';
import { migrateImage } from '@/ai/flows/migrate-image-flow';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Reorder } from "framer-motion";
import { TabsContent } from '@radix-ui/react-tabs';
import { Combobox } from '@/components/ui/combobox';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useForm } from 'react-hook-form';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { zodResolver } from "@hookform/resolvers/zod";


interface NotebookDetails {
  notebook: NotebookType;
  notes: Note[];
}
const noteColors = [
    { name: 'Sarı', class: 'bg-yellow-100 border-yellow-200 text-yellow-900', color: 'hsl(48, 96%, 58%)' },
    { name: 'Mavi', class: 'bg-blue-100 border-blue-200 text-blue-900', color: 'hsl(217, 91%, 60%)' },
    { name: 'Yeşil', class: 'bg-green-100 border-green-200 text-green-900', color: 'hsl(142, 71%, 45%)' },
    { name: 'Pembe', class: 'bg-pink-100 border-pink-200 text-pink-900', color: 'hsl(330, 84%, 60%)' },
    { name: 'Mor', class: 'bg-purple-100 border-purple-200 text-purple-900', color: 'hsl(262, 83%, 58%)' },
];

const folderColors = [
    'from-yellow-500 to-amber-500',
    'from-blue-500 to-indigo-500',
    'from-green-500 to-emerald-500',
    'from-pink-500 to-rose-500',
    'from-purple-500 to-violet-500',
    'from-orange-500 to-red-500',
    'from-teal-500 to-cyan-500',
];

const notebookColors = [
    { id: 'red', class: 'from-red-500 to-rose-500', name: 'Gül' },
    { id: 'orange', class: 'from-orange-500 to-amber-500', name: 'Kehribar' },
    { id: 'green', class: 'from-green-500 to-emerald-500', name: 'Zümrüt' },
    { id: 'teal', class: 'from-teal-500 to-cyan-500', name: 'Turkuaz' },
    { id: 'blue', class: 'from-blue-500 to-indigo-600', name: 'Çivit' },
    { id: 'purple', class: 'from-purple-600 to-fuchsia-700', name: 'Menekşe' },
    { id: 'pink', class: 'from-pink-500 to-fuchsia-500', name: 'Fuşya' },
    { id: 'gray', class: 'from-gray-600 to-gray-800', name: 'Füme' },
];


export default function NotebookClient() {
  const params = useParams();
  const router = useRouter();
  const notebookId = params.notebookId as string;
  const { user } = useAuth();
  const { toast } = useToast();

  const [details, setDetails] = useState<NotebookDetails | null>(null);
  const [activeTab, setActiveTab] = useState<string>('');
  
  const [isSectionDialogOpen, setIsSectionDialogOpen] = useState(false);
  const [editingSection, setEditingSection] = useState<NotebookSection | null>(null);
  const [sectionFormData, setSectionFormData] = useState({ title: '', color: notebookColors[0].class });
  
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  
  const [sections, setSections] = React.useState<NotebookSection[]>([]);
  const [isFolderDialogOpen, setIsFolderDialogOpen] = useState(false);
  const [editingFolder, setEditingFolder] = useState<{ oldName: string; sectionId: string } | null>(null);
  const [newFolderName, setNewFolderName] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const imageInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!notebookId || !user) return;
    const unsubscribe = onNotebookDetailsUpdate(notebookId, (data) => {
      if (data) {
        const sortedSections = (data.notebook.sections || []).sort((a, b) => a.order - b.order);
        setDetails({ ...data, notebook: { ...data.notebook, sections: sortedSections } });
        setSections(sortedSections);

        if (sortedSections.length > 0 && (!activeTab || !sortedSections.some(s => s.id === activeTab))) {
            setActiveTab(sortedSections[0].id);
        } else if (sortedSections.length === 0) {
            setActiveTab('');
        }
      } else {
        setDetails(null);
        setSections([]);
      }
    });
    return () => unsubscribe();
  }, [notebookId, user, activeTab]);

  const handleReorderSections = async (newOrder: NotebookSection[]) => {
    setSections(newOrder);
    const sectionsToUpdate = newOrder.map((section, index) => ({
      ...section,
      order: index,
    }));
    try {
      await updateNotebook(notebookId, { sections: sectionsToUpdate });
      toast({ title: 'Bölüm sırası güncellendi' });
    } catch (e) {
      toast({ title: 'Hata', description: 'Bölüm sırası güncellenirken bir hata oluştu.', variant: 'destructive' });
      if (details) {
        setSections(details.notebook.sections);
      }
    }
  };
  
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
        setActiveTab(newSection.id);
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
        if (activeTab === sectionId) {
            setActiveTab(newSections.length > 0 ? newSections[0].id : '');
        }

    } catch (e) {
        toast({ title: 'Hata', description: 'Bölüm silinirken bir sorun oluştu.', variant: 'destructive' });
    }
  };


  const handleOpenNoteDialog = (note: Note | null) => {
    setEditingNote(note);
  };

  const handleAddNewNote = async (folder?: string, imageUrl?: string | null) => {
    handleOpenNoteDialog({ 
        id: '', // Temporary ID
        notebookId,
        sectionId: activeTab,
        familyId: details?.notebook.familyId || '',
        title: "Yeni Not", 
        content: imageUrl ? [] : [{ id: Date.now().toString(), type: 'text', data: '' }],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        imageUrl: imageUrl || null, 
        folder: folder 
    });
  };
  
  const handleImageNoteAdd = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

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
    if (!newFolderName.trim() || !details || !activeTab) return;
    
    const currentSection = details.notebook.sections.find(s => s.id === activeTab);
    if (!currentSection) return;
    if((currentSection.folders || []).includes(newFolderName.trim())) {
      toast({ title: 'Bu klasör zaten mevcut', variant: 'destructive'});
      return;
    }

    const updatedFolders = [...(currentSection.folders || []), newFolderName.trim()];
    const updatedSections = details.notebook.sections.map(s => 
        s.id === activeTab ? { ...s, folders: updatedFolders } : s
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
      if (!details || !activeTab) return;
      const currentSection = details.notebook.sections.find(s => s.id === activeTab);
      if (!currentSection) return;

      const updatedFolders = (currentSection.folders || []).filter(f => f !== folderToDelete);
       const updatedSections = details.notebook.sections.map(s => 
          s.id === activeTab ? { ...s, folders: updatedFolders } : s
      );

      try {
          await updateNotebook(notebookId, { sections: updatedSections });
          // Note: Notes within the folder are not deleted, they become 'un-foldered'.
          // A more complex migration could be implemented if needed.
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
        await addNoteToSection(notebookId, activeTab, noteData);
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
    return <div>Yükleniyor...</div>;
  }

  const { notebook, notes } = details;
  const currentSection = sections.find(s => s.id === activeTab);

  return (
    <div className="h-full flex flex-col sm:px-4">
      <PageHeader title={notebook.title}>
        <Button onClick={() => router.push('/notes')} className="bg-white/20 text-white hover:bg-white/30 border-none">
          <ArrowLeft className="mr-2 h-4 w-4" /> Defterler
        </Button>
      </PageHeader>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-grow flex flex-col min-h-0">
        <div className="flex-shrink-0 border-b">
           <ScrollArea className="w-full">
            <div className="flex items-center p-2">
                <Reorder.Group axis="x" values={sections} onReorder={handleReorderSections} className="flex items-center">
                    <TabsList className="h-auto bg-transparent p-0 border-none">
                        {sections.map(section => {
                            const isActive = activeTab === section.id;
                            return (
                                <Reorder.Item key={section.id} value={section} as="div" className="group relative" style={{cursor: 'grab'}}>
                                    <TabsTrigger
                                        value={section.id}
                                        className={cn(
                                            "pr-8 text-white bg-gradient-to-br transition-all text-sm px-4 py-2 sm:text-base sm:px-6 sm:py-2.5",
                                            section.color,
                                            isActive 
                                                ? "ring-2 ring-offset-2 ring-ring opacity-100" 
                                                : "opacity-80 hover:opacity-100"
                                        )}
                                    >
                                        {section.title}
                                    </TabsTrigger>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon" className="absolute top-1/2 right-0 -translate-y-1/2 h-6 w-6 opacity-0 group-hover:opacity-100 text-white hover:text-white hover:bg-white/20">
                                            <MoreVertical className="h-4 w-4"/>
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent>
                                            <DropdownMenuItem onClick={() => handleOpenSectionDialog(section)}><Edit className="mr-2 h-4 w-4"/> Düzenle</DropdownMenuItem>
                                            <AlertDialog>
                                                <AlertDialogTrigger asChild><DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive focus:text-destructive"><Trash2 className="mr-2 h-4 w-4"/>Sil</DropdownMenuItem></AlertDialogTrigger>
                                                <AlertDialogContent><AlertDialogHeader><AlertDialogTitleComponent>Bölümü Sil</AlertDialogTitleComponent><AlertDialogDescription>"{section.title}" bölümünü silmek istediğinizden emin misiniz?</AlertDialogDescription></AlertDialogHeader><AlertDialogFooterComponent><AlertDialogCancel>İptal</AlertDialogCancel><AlertDialogAction onClick={() => handleDeleteSection(section.id)}>Evet, Sil</AlertDialogAction></AlertDialogFooterComponent></AlertDialogContent>
                                            </AlertDialog>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </Reorder.Item>
                            )
                        })}
                    </TabsList>
                </Reorder.Group>
            </div>
           </ScrollArea>
        </div>
        
        {sections.map(section => {
            const sectionNotes = notes.filter(note => note.sectionId === section.id);
            const notesByFolder = sectionNotes.reduce((acc, note) => {
                const folderKey = note.folder || "Genel Notlar";
                if (!acc[folderKey]) acc[folderKey] = [];
                acc[folderKey].push(note);
                return acc;
            }, {} as Record<string, Note[]>);
            const folderOrder = ['Genel Notlar', ...(section.folders || [])];

            return (
              <TabsContent key={section.id} value={section.id} className="flex-grow overflow-y-auto pt-4 relative sm:px-4">
                    <div className="space-y-4 -mx-4 sm:mx-0" key={activeTab}>
                        <Accordion type="multiple" className="w-full space-y-4" defaultValue={folderOrder}>
                            {folderOrder.map((folderName, folderIndex) => {
                                const folderNotes = notesByFolder[folderName];
                                if (!folderNotes || folderNotes.length === 0) {
                                    if (folderName === 'Genel Notlar' && Object.keys(notesByFolder).length > 1) return null;
                                }
                                const colorClass = folderColors[folderIndex % folderColors.length];
                                return (
                                    <AccordionItem key={folderName} value={folderName} className="border-b-0 overflow-hidden sm:rounded-xl">
                                         <div className={cn("flex items-center text-white w-full", `bg-gradient-to-br ${colorClass}`)}>
                                            <AccordionTrigger className="flex-1 p-4 flex items-center gap-4 text-left hover:no-underline group">
                                                <div className="bg-white/20 text-white flex items-center justify-center rounded-lg shrink-0 size-12">
                                                    <Folder className="h-6 w-6"/>
                                                </div>
                                                <div className="flex flex-col justify-center min-w-0">
                                                    <p className="text-lg font-bold leading-tight truncate">{folderName}</p>
                                                    <p className="text-white/80 text-sm font-normal truncate">
                                                        {folderNotes?.length || 0} not
                                                    </p>
                                                </div>
                                            </AccordionTrigger>
                                             <div className="flex items-center pr-2">
                                                <Button variant="ghost" size="icon" className="shrink-0 text-white/70 hover:text-white hover:bg-white/20" onClick={(e) => {e.stopPropagation(); handleAddNewNote(folderName === 'Genel Notlar' ? '' : folderName)}}>
                                                    <Plus className="h-5 w-5"/>
                                                </Button>
                                                {folderName !== 'Genel Notlar' && (
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button variant="ghost" size="icon" className="shrink-0 text-white/70 hover:text-white hover:bg-white/20" onClick={(e) => e.stopPropagation()}>
                                                                <MoreVertical className="h-4 w-4"/>
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent>
                                                            <DropdownMenuItem onClick={() => handleOpenFolderDialog({oldName: folderName, sectionId: section.id})}><Edit className="mr-2 h-4 w-4"/>Düzenle</DropdownMenuItem>
                                                            <AlertDialog>
                                                                <AlertDialogTrigger asChild><DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive focus:text-destructive"><Trash2 className="mr-2 h-4 w-4"/>Sil</DropdownMenuItem></AlertDialogTrigger>
                                                                <AlertDialogContent>
                                                                    <AlertDialogHeader><AlertDialogTitleComponent>Klasörü Sil</AlertDialogTitleComponent><AlertDialogDescription>"{folderName}" klasörünü silmek istediğinizden emin misiniz? İçindeki notlar "Genel Notlar" klasörüne taşınacaktır.</AlertDialogDescription></AlertDialogHeader>
                                                                    <AlertDialogFooterComponent><AlertDialogCancel>İptal</AlertDialogCancel><AlertDialogAction onClick={() => handleDeleteFolder(folderName)}>Evet, Sil</AlertDialogAction></AlertDialogFooterComponent>
                                                                </AlertDialogContent>
                                                            </AlertDialog>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                )}
                                             </div>
                                        </div>
                                        <AccordionContent className="p-4 bg-background rounded-b-xl border-x border-b">
                                            {(!folderNotes || folderNotes.length === 0) && <p className='text-sm text-muted-foreground text-center py-4'>Bu klasör boş.</p>}
                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                            {folderNotes?.map(note => (
                                                <StickyNoteCard 
                                                    key={note.id} note={note}
                                                    onOpenDialog={() => handleOpenNoteDialog(note)}
                                                    onDelete={() => handleDeleteNote(note.id)}
                                                />
                                            ))}
                                            </div>
                                        </AccordionContent>
                                    </AccordionItem>
                                )
                            })}
                        </Accordion>
                    </div>
                    <div className="fixed bottom-24 right-8 z-10 md:bottom-8">
                       <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button className="rounded-full w-16 h-16 shadow-lg" size="icon">
                                    <Plus className="h-8 w-8" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" sideOffset={12}>
                                <DropdownMenuItem onClick={() => handleAddNewNote(currentSection?.folders?.[0] || '')}>
                                    <StickyNote className="mr-2 h-4 w-4"/> Metin Notu Ekle
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => imageInputRef.current?.click()}>
                                    <FileImage className="mr-2 h-4 w-4"/> Görsel Notu Ekle
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleOpenFolderDialog(null)}>
                                    <FolderPlus className="mr-2 h-4 w-4"/> Yeni Klasör
                                </DropdownMenuItem>
                                 <DropdownMenuItem onClick={() => handleOpenSectionDialog(null)}>
                                    <Plus className="mr-2 h-4 w-4" /> Yeni Bölüm Ekle
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                       </DropdownMenu>
                       <input type="file" accept="image/*" className="hidden" ref={imageInputRef} onChange={handleImageNoteAdd} />
                       <Dialog open={isFolderDialogOpen} onOpenChange={setIsFolderDialogOpen}>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>{editingFolder ? "Klasörü Düzenle" : "Yeni Klasör Oluştur"}</DialogTitle>
                            </DialogHeader>
                            <Input 
                                placeholder="Klasör adı" 
                                value={newFolderName} 
                                onChange={e => setNewFolderName(e.target.value)} 
                                onKeyDown={e => e.key === 'Enter' && (editingFolder ? handleUpdateFolder() : handleAddNewFolder())}
                            />
                            <DialogFooter>
                                <Button type="button" variant="ghost" onClick={() => setIsFolderDialogOpen(false)}>İptal</Button>
                                <Button onClick={editingFolder ? handleUpdateFolder : handleAddNewFolder}>
                                    {editingFolder ? 'Güncelle' : 'Oluştur'}
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                       </Dialog>
                   </div>
              </TabsContent>
        )})}
      </Tabs>
      
      <Dialog open={isSectionDialogOpen} onOpenChange={setIsSectionDialogOpen}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>{editingSection ? "Bölümü Düzenle" : "Yeni Bölüm Ekle"}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
                <Input placeholder="Bölüm adı" value={sectionFormData.title} onChange={(e) => setSectionFormData(prev => ({ ...prev, title: e.target.value }))} onKeyDown={(e) => { if(e.key === 'Enter') handleSaveSection()}} />
                <div className="flex flex-wrap gap-2">
                    {notebookColors.map(color => (
                        <button key={color.name} aria-label={color.name} className={cn("h-8 w-8 rounded-full bg-gradient-to-br", color.class, sectionFormData.color === color.class && "ring-2 ring-ring ring-offset-2 ring-offset-background")} onClick={() => setSectionFormData(prev => ({...prev, color: color.class}))}/>
                    ))}
                </div>
            </div>
            <DialogFooter>
                <Button variant="ghost" onClick={() => setIsSectionDialogOpen(false)}>İptal</Button>
                <Button onClick={handleSaveSection}>Kaydet</Button>
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
    const noteColor = note.color || 'bg-yellow-100 border-yellow-200 text-yellow-900';
    const textContent = Array.isArray(note.content) ? (note.content.find(b => b.type === 'text')?.data || '') : '';

    return (
        <Card className={cn("group relative rounded-lg shadow-sm hover:shadow-md transition-shadow border flex flex-col h-fit", noteColor)}>
            <div className="p-3 sm:p-4 flex-grow flex flex-col min-h-[6rem] sm:min-h-[8rem] cursor-pointer" onClick={onOpenDialog}>
                <h3 className="font-semibold text-sm sm:text-lg">{note.title}</h3>
                {textContent && (<p className="text-xs sm:text-sm text-black/70 mt-2 flex-grow whitespace-pre-wrap line-clamp-3 sm:line-clamp-4">{textContent}</p>)}
            </div>
            {note.imageUrl && (
                <div className="mt-auto aspect-video w-full relative cursor-pointer" onClick={onOpenDialog}>
                    <Image src={note.imageUrl} alt={note.title} layout="fill" objectFit="cover" className="rounded-b-lg" data-ai-hint="note image"/>
                </div>
            )}
            <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button variant="secondary" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); onOpenDialog(); }}><Edit className="h-4 w-4"/></Button>
                 <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="icon" className="h-7 w-7" onClick={(e) => e.stopPropagation()}><Trash2 className="h-4 w-4"/></Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                        <AlertDialogHeader>
                            <AlertDialogTitleComponent>Notu Sil</AlertDialogTitleComponent>
                            <AlertDialogDescription>"{note.title}" notunu kalıcı olarak silmek istediğinizden emin misiniz?</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooterComponent>
                            <AlertDialogCancel>İptal</AlertDialogCancel>
                            <AlertDialogAction onClick={onDelete}>Evet, Sil</AlertDialogAction>
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
  const [isLoading, setIsLoading] = useState(false);

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

  if (!note) return null;

  return (
    <Dialog open={!!note} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleFormSubmit)}>
            <DialogHeader>
              <DialogTitle>{note.id ? "Notu Düzenle" : "Yeni Not Oluştur"}</DialogTitle>
            </DialogHeader>
            <div className="py-4 space-y-4">
              <FormField name="title" control={form.control} render={({ field }) => (
                <FormItem><FormLabel>Başlık</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )}/>
              <FormField name="content" control={form.control} render={({ field }) => (
                <FormItem><FormLabel>İçerik</FormLabel><FormControl><Textarea {...field} rows={8} /></FormControl><FormMessage /></FormItem>
              )}/>
              <FormField name="folder" control={form.control} render={({ field }) => (
                <FormItem><FormLabel>Klasör</FormLabel><FormControl><Combobox options={folderOptions} value={field.value || ''} onChange={field.onChange} placeholder='Klasör seç...' notfoundText='Klasör bulunamadı.'/></FormControl><FormMessage /></FormItem>
              )}/>
              <FormField name="color" control={form.control} render={({ field }) => (
                <FormItem><FormLabel>Renk</FormLabel><FormControl>
                    <div className="flex gap-2">
                        {noteColors.map(color => (<button type="button" key={color.name} aria-label={color.name} className={cn("h-7 w-7 rounded-full", color.class, field.value === color.class && "ring-2 ring-ring ring-offset-2 ring-offset-background")} onClick={() => field.onChange(color.class)} />))}
                    </div>
                </FormControl><FormMessage /></FormItem>
              )}/>
            </div>
            <DialogFooter>
              <DialogClose asChild><Button type="button" variant="ghost">İptal</Button></DialogClose>
              <Button type="submit" disabled={isLoading}>{isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Kaydet</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}


    