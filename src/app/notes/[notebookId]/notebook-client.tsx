

"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth-provider';
import { Notebook as NotebookType, NotebookSection, Note, NoteContentBlock } from '@/lib/data';
import { onNotebookDetailsUpdate, deleteNoteFromSection, updateNotebook, addNoteToSection, updateNoteInSection } from '@/lib/dataService';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PlusCircle, ArrowLeft, Edit, Trash2, Image as ImageIcon, Loader2, StickyNote, FileImage, Palette, MoreVertical, GripVertical, FolderPlus, Folder } from 'lucide-react';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
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
import { Card, CardHeader } from '@/components/ui/card';


interface NotebookDetails {
  notebook: NotebookType;
  notes: Note[];
}
const noteColors = [
    { name: 'Sarı', class: 'bg-yellow-100 border-yellow-200 text-yellow-900', color: '#78350f' },
    { name: 'Mavi', class: 'bg-blue-100 border-blue-200 text-blue-900', color: '#1e40af' },
    { name: 'Yeşil', class: 'bg-green-100 border-green-200 text-green-900', color: '#15803d'},
    { name: 'Pembe', class: 'bg-pink-100 border-pink-200 text-pink-900', color: '#9d174d' },
    { name: 'Mor', class: 'bg-purple-100 border-purple-200 text-purple-900', color: '#6b21a8' },
];

const folderColors = [
    'bg-yellow-100 border-yellow-200 text-yellow-900',
    'bg-blue-100 border-blue-200 text-blue-900',
    'bg-green-100 border-green-200 text-green-900',
    'bg-pink-100 border-pink-200 text-pink-900',
    'bg-purple-100 border-purple-200 text-purple-900',
    'bg-orange-100 border-orange-200 text-orange-900',
    'bg-teal-100 border-teal-200 text-teal-900',
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
  const [sectionFormData, setSectionFormData] = useState({ title: '', color: noteColors[0].class });
  
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [noteChanges, setNoteChanges] = useState<Partial<Note>>({});
  const [isLoading, setIsLoading] = useState(false);
  
  const [sections, setSections] = React.useState<NotebookSection[]>([]);
  const [isFolderDialogOpen, setIsFolderDialogOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');


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
      color: section ? section.color : noteColors[Math.floor(Math.random() * noteColors.length)].class
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
            await deleteNoteFromSection(notebookId, note.id);
        }
        toast({ title: 'Bölüm Silindi', variant: 'destructive' });
        if (activeTab === sectionId) {
            setActiveTab(newSections.length > 0 ? newSections[0].id : '');
        }

    } catch (e) {
        toast({ title: 'Hata', description: 'Bölüm silinirken bir sorun oluştu.', variant: 'destructive' });
    }
  };


  const handleAddNewNote = async (folder?: string) => {
    if (!details || !activeTab) return;
    try {
        await addNoteToSection(notebookId, activeTab, { 
          title: "Yeni Not", 
          content: [{ id: Date.now().toString(), type: 'text', data: '' }], 
          imageUrl: null, 
          folder: folder 
        });
    } catch (error) {
        toast({ title: 'Hata', variant: 'destructive' });
    }
  };
  
   const handleAddNewFolder = async () => {
    if (!newFolderName.trim() || !details || !activeTab) return;
    
    const currentSection = details.notebook.sections.find(s => s.id === activeTab);
    if (!currentSection) return;

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
          toast({ title: "Klasör Silindi", variant: 'destructive' });
      } catch (e) {
          toast({ title: 'Hata', variant: 'destructive' });
      }
  }


  const handleSaveNote = async (noteId: string) => {
    if (!details || Object.keys(noteChanges).length === 0) {
        setEditingNoteId(null);
        setNoteChanges({});
        return;
    };
    try {
        await updateNoteInSection(notebookId, noteId, noteChanges);
    } catch (error) {
        toast({ title: 'Hata', variant: 'destructive' });
    } finally {
        setEditingNoteId(null);
        setNoteChanges({});
    }
  };
  
  const handleDeleteNote = async (noteId: string) => {
    if(!details) return;
    try {
      await deleteNoteFromSection(notebookId, noteId);
      toast({ title: 'Not Silindi', variant: 'destructive' });
    } catch (error) {
      toast({ title: 'Hata', description: "Not silinirken bir sorun oluştu.", variant: 'destructive' });
    }
  };
  
  const handleNoteUpdate = (key: keyof Note, value: any) => {
    setNoteChanges(prev => ({...prev, [key]: value}));
  };

  if (!details) {
    return <div>Yükleniyor...</div>;
  }

  const { notebook, notes } = details;

  return (
    <div className="h-full flex flex-col">
      <PageHeader title={notebook.title}>
        <Button onClick={() => router.push('/notes')} variant="outline">
          <ArrowLeft className="mr-2 h-4 w-4" /> Defterler
        </Button>
      </PageHeader>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-grow flex flex-col min-h-0">
        <div className="flex-shrink-0">
           <Reorder.Group axis="x" values={sections} onReorder={handleReorderSections} className="flex items-center border-b">
             <TabsList className="h-auto bg-transparent p-0 border-none">
                {sections.map(section => {
                    const isActive = activeTab === section.id;
                    const sectionColorClass = section.color || 'bg-gray-200';
                    
                    return (
                        <Reorder.Item key={section.id} value={section} as="div" className="group relative pr-2 flex items-center">
                            <GripVertical className="h-5 w-5 text-muted-foreground cursor-grab shrink-0" />
                            <TabsTrigger 
                                value={section.id} 
                                className={cn("pr-8", isActive && `bg-gradient-to-br text-white ${sectionColorClass}`)}
                            >
                                {section.title}
                            </TabsTrigger>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="absolute top-1/2 right-1 -translate-y-1/2 h-6 w-6 opacity-0 group-hover:opacity-100">
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
             <Button variant="ghost" size="sm" className="ml-2" onClick={() => handleOpenSectionDialog(null)}>
                <PlusCircle className="h-4 w-4"/>
            </Button>
           </Reorder.Group>
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
              <TabsContent key={section.id} value={section.id} className="flex-grow overflow-y-auto pt-4">
                  <div className="flex gap-2 mb-4">
                      <Button className="flex-1" onClick={() => handleAddNewNote()}><StickyNote className="mr-2 h-4 w-4" /> Metin Notu Ekle</Button>
                      <Dialog open={isFolderDialogOpen} onOpenChange={setIsFolderDialogOpen}><DialogTrigger asChild><Button variant="secondary" className="flex-1"><FolderPlus className="mr-2 h-4 w-4" /> Yeni Klasör</Button></DialogTrigger>
                        <DialogContent><DialogHeader><DialogTitle>Yeni Klasör Oluştur</DialogTitle></DialogHeader><Input placeholder="Klasör adı" value={newFolderName} onChange={e => setNewFolderName(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAddNewFolder()}/><DialogFooter><Button onClick={handleAddNewFolder}>Oluştur</Button></DialogFooter></DialogContent>
                      </Dialog>
                  </div>
                   <Accordion type="multiple" className="w-full space-y-4">
                    {folderOrder.map((folderName, folderIndex) => {
                        const folderNotes = notesByFolder[folderName];
                        if (!folderNotes || folderNotes.length === 0) {
                            if (folderName === 'Genel Notlar' && Object.keys(notesByFolder).length > 1) return null;
                        }
                        return (
                            <AccordionItem key={folderName} value={folderName} className="border-b-0">
                                <Card>
                                     <AccordionTrigger className={cn("p-4 hover:no-underline rounded-t-lg", folderColors[folderIndex % folderColors.length])}>
                                         <div className="flex items-center gap-2">
                                             <Folder className="h-5 w-5"/>
                                             <h3 className="text-lg font-semibold">{folderName}</h3>
                                         </div>
                                     </AccordionTrigger>
                                     <AccordionContent className="px-4 pb-4">
                                        {(!folderNotes || folderNotes.length === 0) && <p className='text-sm text-muted-foreground pl-8'>Bu klasör boş.</p>}
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pt-4">
                                        {folderNotes?.map(note => (
                                            <StickyNoteCard 
                                                key={note.id} note={note} isEditing={editingNoteId === note.id}
                                                onStartEdit={() => { if (editingNoteId && editingNoteId !== note.id) handleSaveNote(editingNoteId); setEditingNoteId(note.id); setNoteChanges({});}}
                                                onSave={() => handleSaveNote(note.id)} onUpdate={handleNoteUpdate} onDelete={() => handleDeleteNote(note.id)} sectionFolders={section.folders || []}
                                            />
                                        ))}
                                        </div>
                                     </AccordionContent>
                                </Card>
                            </AccordionItem>
                        )
                    })}
                   </Accordion>
              </TabsContent>
        )})}
      </Tabs>
      
      <Dialog open={isSectionDialogOpen} onOpenChange={setIsSectionDialogOpen}>
        <DialogContent><DialogHeader><DialogTitle>{editingSection ? "Bölümü Düzenle" : "Yeni Bölüm Ekle"}</DialogTitle></DialogHeader>
            <div className="grid gap-4 py-4">
                <Input placeholder="Bölüm adı" value={sectionFormData.title} onChange={(e) => setSectionFormData(prev => ({ ...prev, title: e.target.value }))} onKeyDown={(e) => { if(e.key === 'Enter') handleSaveSection()}} />
                <div className="flex flex-wrap gap-2">
                    {noteColors.map(color => (
                        <button key={color.name} aria-label={color.name} className={cn("h-8 w-8 rounded-full", color.class, sectionFormData.color === color.class && "ring-2 ring-ring ring-offset-2 ring-offset-background")} onClick={() => setSectionFormData(prev => ({...prev, color: color.class}))}/>
                    ))}
                </div>
            </div>
            <DialogFooter><Button variant="ghost" onClick={() => setIsSectionDialogOpen(false)}>İptal</Button><Button onClick={handleSaveSection}>Kaydet</Button></DialogFooter>
        </DialogContent>
     </Dialog>
    </div>
  );
}


// STICKY NOTE CARD COMPONENT
interface StickyNoteCardProps {
    note: Note;
    isEditing: boolean;
    onStartEdit: () => void;
    onSave: () => void;
    onUpdate: (key: keyof Note, value: any) => void;
    onDelete: () => void;
    sectionFolders: string[];
}

function StickyNoteCard({ note, isEditing, onStartEdit, onSave, onUpdate, onDelete, sectionFolders }: StickyNoteCardProps) {
    const cardRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    
    const noteColor = note.color || 'bg-yellow-100 border-yellow-200 text-yellow-900';
    
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (isEditing && cardRef.current && !cardRef.current.contains(event.target as Node)) {
                onSave();
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isEditing, onSave]);

    useEffect(() => {
        const textarea = textareaRef.current;
        if (isEditing && textarea) {
            textarea.style.height = 'inherit';
            textarea.style.height = `${textarea.scrollHeight}px`;
        }
    }, [isEditing, note.content]);
    
    const handleTextUpdate = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const textarea = e.target;
        textarea.style.height = 'inherit';
        textarea.style.height = `${textarea.scrollHeight}px`;
        const newContent: NoteContentBlock[] = [{ id: note.content?.[0]?.id || Date.now().toString(), type: 'text', data: textarea.value }];
        onUpdate('content', newContent);
    };

    const textContent = Array.isArray(note.content) ? (note.content.find(b => b.type === 'text')?.data || '') : '';
    const folderOptions = [{label: 'Genel Notlar', value: ''}, ...sectionFolders.map(f => ({ label: f, value: f }))];
    
    if (isEditing) {
        return (
            <div ref={cardRef} className={cn("rounded-lg shadow-lg border p-3 flex flex-col gap-2 h-fit", noteColor)}>
                <Input placeholder="Not Başlığı" defaultValue={note.title} onBlur={(e) => onUpdate('title', e.target.value)} className="text-base font-bold border-0 shadow-none focus-visible:ring-0 px-2 bg-transparent placeholder:text-muted-foreground/80" autoFocus />
                {note.imageUrl && ( <div className="relative aspect-video"><Image src={note.imageUrl} alt={note.title} layout="fill" objectFit="cover" className="rounded-md" data-ai-hint="note image" /></div> )}
                {Array.isArray(note.content) && ( <Textarea ref={textareaRef} placeholder="Yazmaya başla..." defaultValue={textContent} onInput={handleTextUpdate} className="text-sm bg-transparent border-0 focus-visible:ring-0 p-2 resize-none overflow-hidden" rows={1} />)}
                <div className='pt-2 mt-2 border-t'>
                    <Combobox options={folderOptions} value={note.folder || ''} onChange={(val) => onUpdate('folder', val)} placeholder='Klasör seç...' notfoundText='Klasör bulunamadı.'/>
                </div>
                <div className="flex justify-end items-center mt-2">
                     <Popover><PopoverTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7"><Palette className="h-4 w-4"/></Button></PopoverTrigger><PopoverContent className="w-auto p-2"><div className="flex gap-1">{noteColors.map(color => (<button key={color.name} aria-label={color.name} className={cn("h-6 w-6 rounded-full", color.class)} onClick={() => onUpdate('color', color.class)} />))}</div></PopoverContent></Popover>
                     <AlertDialog><AlertDialogTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7 text-destructive/70 hover:text-destructive"><Trash2 className="h-4 w-4" /></Button></AlertDialogTrigger><AlertDialogContent><AlertDialogHeader><AlertDialogTitleComponent>Notu Sil?</AlertDialogTitleComponent><AlertDialogDescription>"{note.title}" notunu kalıcı olarak silmek istediğinizden emin misiniz?</AlertDialogDescription></AlertDialogHeader><AlertDialogFooterComponent><AlertDialogCancel>İptal</AlertDialogCancel><AlertDialogAction onClick={onDelete}>Sil</AlertDialogAction></AlertDialogFooterComponent></AlertDialogContent></AlertDialog>
                </div>
            </div>
        )
    }

    return (
        <Dialog>
             <div className={cn("group relative rounded-lg shadow-sm hover:shadow-md transition-shadow border flex flex-col h-fit", noteColor)}>
                 <div className="p-4 flex-grow flex flex-col min-h-[8rem] cursor-pointer" onClick={onStartEdit}>
                    <h3 className="font-semibold text-lg">{note.title}</h3>
                    {textContent && ( <p className="text-sm text-black/70 mt-2 flex-grow whitespace-pre-wrap">{textContent}</p> )}
                </div>
                {note.imageUrl && ( <DialogTrigger asChild><div className="relative w-full aspect-video cursor-pointer mt-auto"><Image src={note.imageUrl} alt={note.title} layout="fill" objectFit="cover" className="rounded-b-lg" data-ai-hint="note image"/></div></DialogTrigger> )}
                 <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"><Button variant="secondary" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); onStartEdit(); }}><Edit className="h-4 w-4"/></Button></div>
            </div>
            <DialogContent className="max-w-4xl"><DialogHeader><DialogTitle>{note.title}</DialogTitle></DialogHeader>{note.imageUrl ? ( <div className="relative w-full h-[80vh] my-4 rounded-lg overflow-hidden"><Image src={note.imageUrl} alt={note.title} layout="fill" objectFit="contain" className="bg-muted" data-ai-hint="religious illustration"/></div> ): ( <div className="my-4 p-8 text-center bg-muted rounded-lg"><p className="text-muted-foreground">Bu öğe için bir görsel bulunmuyor.</p></div> )}</DialogContent>
        </Dialog>
    );
}

