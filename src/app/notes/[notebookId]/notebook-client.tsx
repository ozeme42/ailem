

"use client";

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth-provider';
import { Notebook as NotebookType, NotebookSection, Note } from '@/lib/data';
import { onNotebookDetailsUpdate, addSectionToNotebook, addNoteToSection, deleteNoteFromSection, updateNoteInSection } from '@/lib/dataService';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PlusCircle, ArrowLeft, Edit, Trash2 } from 'lucide-react';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogTrigger, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle, AlertDialogFooter } from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { NoteEditor } from './note-editor';
import Image from 'next/image';

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
  const [isNoteEditorOpen, setIsNoteEditorOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);

  useEffect(() => {
    if (!notebookId || !user) return;
    const unsubscribe = onNotebookDetailsUpdate(notebookId, (data) => {
      setDetails(data);
      if (data && data.notebook.sections.length > 0 && !activeTab) {
        setActiveTab(data.notebook.sections[0].id);
      } else if (data && data.notebook.sections.length > 0 && !data.notebook.sections.some(s => s.id === activeTab)) {
        // If the active tab was deleted, reset to the first one
        setActiveTab(data.notebook.sections[0].id);
      } else if (data && data.notebook.sections.length === 0) {
        setActiveTab('');
      }
    });
    return () => unsubscribe();
  }, [notebookId, user]);

  const handleAddSection = async () => {
    if (newSectionName.trim() && details) {
      try {
        const newSectionId = await addSectionToNotebook(details.notebook.id, newSectionName.trim());
        toast({ title: 'Bölüm Eklendi' });
        setActiveTab(newSectionId);
        setNewSectionName('');
        setIsSectionDialogOpen(false);
      } catch (e) {
        toast({ title: 'Hata', variant: 'destructive' });
      }
    }
  };

  const handleSaveNote = async (noteData: Partial<Note>) => {
    if (!details || !activeTab) return;
    try {
      if (editingNote) {
        await updateNoteInSection(details.notebook.id, editingNote.id, noteData);
        toast({ title: 'Not Güncellendi' });
      } else {
        await addNoteToSection(details.notebook.id, activeTab, noteData);
        toast({ title: 'Not Eklendi' });
      }
      setIsNoteEditorOpen(false);
      setEditingNote(null);
    } catch (error) {
      toast({ title: 'Hata', variant: 'destructive' });
    }
  };
  
  const handleDeleteNote = async (noteId: string) => {
    if(!details) return;
    try {
      await deleteNoteFromSection(details.notebook.id, noteId);
      toast({ title: 'Not Silindi', variant: 'destructive' });
    } catch (error) {
      toast({ title: 'Hata', description: "Not silinirken bir sorun oluştu.", variant: 'destructive' });
    }
  };

  const handleEditNote = (note: Note) => {
    setEditingNote(note);
    setIsNoteEditorOpen(true);
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
          <TabsContent key={section.id} value={section.id} className="flex-grow min-h-0 mt-4">
            <div className="h-full flex flex-col">
                <Button className="w-full mb-4" onClick={() => { setEditingNote(null); setIsNoteEditorOpen(true); }}>
                    <PlusCircle className="mr-2 h-4 w-4" /> Yeni Not Ekle
                </Button>
                <div className="flex-grow overflow-y-auto pr-2 -mr-2">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {notes.filter(note => note.sectionId === section.id).map(note => {
                            const firstImage = note.content.find(block => block.type === 'image')?.data;
                            const firstText = note.content.find(block => block.type === 'text')?.data;

                            return (
                                <div key={note.id} className="group relative border rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                                    <div className="relative aspect-video bg-muted cursor-pointer" onClick={() => handleEditNote(note)}>
                                        {firstImage ? (
                                            <Image src={firstImage} alt={note.title} layout="fill" objectFit="cover" data-ai-hint="note image" />
                                        ) : (
                                            <div className="p-4">
                                                <h3 className="font-semibold text-lg">{note.title}</h3>
                                                <p className="text-sm text-muted-foreground mt-2 line-clamp-3">{firstText}</p>
                                            </div>
                                        )}
                                        {firstImage && (
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent p-4 flex flex-col justify-end">
                                                <h3 className="font-bold text-white text-lg">{note.title}</h3>
                                                <p className="text-xs text-white/80 line-clamp-2">{firstText}</p>
                                            </div>
                                        )}
                                    </div>
                                    <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Button variant="secondary" size="icon" className="h-7 w-7" onClick={(e) => {e.stopPropagation(); handleEditNote(note);}}><Edit className="h-4 w-4"/></Button>
                                        <AlertDialog onOpenChange={(e) => e.stopPropagation()}>
                                        <AlertDialogTrigger asChild>
                                            <Button variant="destructive" size="icon" className="h-7 w-7" onClick={(e) => e.stopPropagation()}><Trash2 className="h-4 w-4"/></Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader><AlertDialogTitle>Notu Sil?</AlertDialogTitle><AlertDialogDescription>"{note.title}" notunu kalıcı olarak silmek istediğinizden emin misiniz?</AlertDialogDescription></AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel>İptal</AlertDialogCancel>
                                                <AlertDialogAction onClick={() => handleDeleteNote(note.id)}>Sil</AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                        </AlertDialog>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
          </TabsContent>
        ))}
      </Tabs>
      
      <Dialog open={isNoteEditorOpen} onOpenChange={setIsNoteEditorOpen}>
          <DialogContent className="max-w-2xl h-[80vh] flex flex-col">
              <DialogHeader>
                  <DialogTitle>{editingNote ? 'Notu Düzenle' : 'Yeni Not Oluştur'}</DialogTitle>
              </DialogHeader>
              <NoteEditor
                  initialNote={editingNote}
                  onSave={handleSaveNote}
                  onCancel={() => setIsNoteEditorOpen(false)}
              />
          </DialogContent>
      </Dialog>
    </div>
  );
}

