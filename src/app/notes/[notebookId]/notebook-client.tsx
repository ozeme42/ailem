
"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth-provider';
import { Notebook as NotebookType, NotebookSection, Note, NoteContentBlock } from '@/lib/data';
import { onNotebookDetailsUpdate, addSectionToNotebook, addNoteToSection, deleteNoteFromSection, updateNoteInSection, updateNotebook } from '@/lib/dataService';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PlusCircle, ArrowLeft, Edit, Trash2, Image as ImageIcon, Loader2, StickyNote, FileImage } from 'lucide-react';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogTrigger, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle, AlertDialogFooter } from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { Textarea } from '@/components/ui/textarea';
import { migrateImage } from '@/ai/flows/migrate-image-flow';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';


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
  const [activeTab, setActiveTab] = useState<string>('');
  const [isSectionDialogOpen, setIsSectionDialogOpen] = useState(false);
  const [newSectionName, setNewSectionName] = useState('');
  
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [noteChanges, setNoteChanges] = useState<Partial<Note>>({});
  const [isLoading, setIsLoading] = useState(false);

  const imageInputRef = useRef<HTMLInputElement>(null);


  useEffect(() => {
    if (!notebookId || !user) return;
    const unsubscribe = onNotebookDetailsUpdate(notebookId, (data) => {
      if (data) {
        setDetails(data);
        if (data.notebook.sections.length > 0 && (!activeTab || !data.notebook.sections.some(s => s.id === activeTab))) {
            setActiveTab(data.notebook.sections[0].id);
        } else if (data.notebook.sections.length === 0) {
            setActiveTab('');
        }
      } else {
        setDetails(null);
      }
    });
    return () => unsubscribe();
  }, [notebookId, user, activeTab]);

  const handleAddSection = async () => {
    if (newSectionName.trim() && details) {
      try {
        const newSection: NotebookSection = {
            id: Date.now().toString(),
            title: newSectionName.trim(),
            order: details.notebook.sections.length
        }
        await updateNotebook(notebookId, { sections: arrayUnion(newSection) });

        toast({ title: 'Bölüm Eklendi' });
        setActiveTab(newSection.id);
        setNewSectionName('');
        setIsSectionDialogOpen(false);
      } catch (e) {
        toast({ title: 'Hata', variant: 'destructive' });
      }
    }
  };

  const handleAddNewTextNote = async () => {
    if (!details || !activeTab) return;
    try {
        const newNoteContent: NoteContentBlock[] = [{ id: Date.now().toString(), type: 'text', data: '' }];
        await addNoteToSection(notebookId, activeTab, { title: "Yeni Not", content: newNoteContent, imageUrl: null });
    } catch (error) {
        toast({ title: 'Hata', variant: 'destructive' });
    }
  };
  
  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !user || !details || !activeTab) return;

        setIsLoading(true);
        toast({ title: 'Görsel yükleniyor...' });
        try {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = async () => {
                const dataUri = reader.result as string;
                const destinationPath = `note-images/${user.uid}-${Date.now()}.jpg`;
                const result = await migrateImage({ imageDataUri: dataUri, destinationPath });
                if (result.success && result.newUrl) {
                    await addNoteToSection(notebookId, activeTab, { title: "Yeni Görsel Not", imageUrl: result.newUrl, content: [] });
                    toast({ title: 'Görsel Not Eklendi' });
                } else {
                     throw new Error(result.error || 'Görsel yüklenemedi.');
                }
                setIsLoading(false);
            };
        } catch (error: any) {
            toast({ title: 'Hata', description: error.message, variant: 'destructive' });
            setIsLoading(false);
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
  const sections = notebook.sections.sort((a, b) => a.order - b.order);

  return (
    <div className="h-full flex flex-col">
      <PageHeader title={notebook.title}>
        <Button onClick={() => router.push('/notes')} variant="outline">
          <ArrowLeft className="mr-2 h-4 w-4" /> Defterler
        </Button>
      </PageHeader>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-grow flex flex-col min-h-0">
        <div className="flex-shrink-0">
          <TabsList className="h-auto">
            {sections.map(section => (
              <TabsTrigger key={section.id} value={section.id}>
                {section.title}
              </TabsTrigger>
            ))}
            <Dialog open={isSectionDialogOpen} onOpenChange={setIsSectionDialogOpen}>
                <DialogTrigger asChild>
                    <Button variant="ghost" size="sm" className="ml-2">
                        <PlusCircle className="h-4 w-4"/>
                    </Button>
                </DialogTrigger>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Yeni Bölüm Ekle</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <Input placeholder="Bölüm adı" value={newSectionName} onChange={(e) => setNewSectionName(e.target.value)} />
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setIsSectionDialogOpen(false)}>İptal</Button>
                        <Button onClick={handleAddSection}>Ekle</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
          </TabsList>
        </div>
        
        {sections.map(section => (
          <TabsContent key={section.id} value={section.id} className="mt-4 flex-grow">
            <div className="flex gap-2 mb-4">
                <Button className="flex-1" onClick={handleAddNewTextNote}>
                    <StickyNote className="mr-2 h-4 w-4" /> Metin Notu Ekle
                </Button>
                <Button variant="secondary" className="flex-1" onClick={() => imageInputRef.current?.click()} disabled={isLoading}>
                    {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <FileImage className="mr-2 h-4 w-4" />}
                     Görsel Not Ekle
                </Button>
                <input type="file" ref={imageInputRef} onChange={handleImageFileChange} accept="image/*" className="hidden" />
            </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {notes.filter(note => note.sectionId === section.id).map(note => (
                    <StickyNoteCard 
                        key={note.id}
                        note={note}
                        isEditing={editingNoteId === note.id}
                        onStartEdit={() => {
                            if (editingNoteId && editingNoteId !== note.id) {
                                handleSaveNote(editingNoteId);
                            }
                            setEditingNoteId(note.id);
                            setNoteChanges({});
                        }}
                        onSave={() => handleSaveNote(note.id)}
                        onUpdate={handleNoteUpdate}
                        onDelete={() => handleDeleteNote(note.id)}
                    />
                ))}
              </div>
          </TabsContent>
        ))}
      </Tabs>
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
}

function StickyNoteCard({ note, isEditing, onStartEdit, onSave, onUpdate, onDelete }: StickyNoteCardProps) {
    const cardRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    
    const noteColor = note.color || 'bg-yellow-100 border-yellow-200';
    
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (isEditing && cardRef.current && !cardRef.current.contains(event.target as Node)) {
                onSave();
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isEditing, onSave]);

    useEffect(() => {
        if (isEditing && textareaRef.current) {
            textareaRef.current.style.height = 'inherit';
            textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
        }
    }, [isEditing]);
    
    const handleTextUpdate = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        e.target.style.height = 'inherit';
        e.target.style.height = `${e.target.scrollHeight}px`;
        
        const newContent: NoteContentBlock[] = [{
            id: note.content?.[0]?.id || Date.now().toString(),
            type: 'text',
            data: e.target.value
        }];
        onUpdate('content', newContent);
    };

    const textContent = Array.isArray(note.content) ? (note.content.find(b => b.type === 'text')?.data || '') : '';
    
    if (isEditing) {
        return (
            <div ref={cardRef} className={cn("rounded-lg shadow-lg border p-3 flex flex-col gap-2 h-fit", noteColor)}>
                <Input
                    placeholder="Not Başlığı"
                    defaultValue={note.title}
                    onBlur={(e) => onUpdate('title', e.target.value)}
                    className="text-base font-bold border-0 shadow-none focus-visible:ring-0 px-2 bg-transparent placeholder:text-muted-foreground/80 text-black"
                    autoFocus
                />
                {note.imageUrl && (
                     <div className="relative aspect-video">
                        <Image src={note.imageUrl} alt={note.title} layout="fill" objectFit="cover" className="rounded-md" data-ai-hint="note image" />
                     </div>
                )}
                <Textarea
                    ref={textareaRef}
                    placeholder="Yazmaya başla..."
                    defaultValue={textContent}
                    onInput={handleTextUpdate}
                    className="text-sm bg-transparent border-0 focus-visible:ring-0 p-2 resize-none overflow-hidden text-black/80"
                    rows={1}
                />
                <div className="flex justify-end items-center mt-2">
                     <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive/70 hover:text-destructive"><Trash2 className="h-4 w-4" /></Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader><AlertDialogTitle>Notu Sil?</AlertDialogTitle><AlertDialogDescription>"{note.title}" notunu kalıcı olarak silmek istediğinizden emin misiniz?</AlertDialogDescription></AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>İptal</AlertDialogCancel>
                                <AlertDialogAction onClick={onDelete}>Sil</AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </div>
            </div>
        )
    }

    return (
        <div className={cn("group relative rounded-lg shadow-sm hover:shadow-md transition-shadow border cursor-pointer flex flex-col h-fit", noteColor)} onClick={onStartEdit}>
            {note.imageUrl && (
                <div className="relative w-full aspect-video">
                    <Image src={note.imageUrl} alt={note.title} layout="fill" objectFit="cover" className="rounded-t-lg" data-ai-hint="note image"/>
                </div>
            )}
            <div className="p-4 flex-grow flex flex-col min-h-[8rem]">
                <h3 className="font-semibold text-lg text-black">{note.title}</h3>
                {textContent && (
                    <p className="text-sm text-black/70 mt-2 flex-grow whitespace-pre-wrap">
                        {textContent}
                    </p>
                )}
            </div>
             <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button variant="secondary" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); onStartEdit(); }}>
                    <Edit className="h-4 w-4"/>
                </Button>
             </div>
        </div>
    );
}
