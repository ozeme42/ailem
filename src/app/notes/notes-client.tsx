
"use client";

import React, { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/auth-provider';
import { Notebook as NotebookType, Note } from '@/lib/data';
import { onNotebooksUpdate, addNotebook, deleteNotebook, updateNotebook, onNotesUpdate } from '@/lib/dataService';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { PlusCircle, Trash2, Edit, ChevronRight, Notebook as NotebookIcon, Search, StickyNote } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle as AlertDialogTitleComponent, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Card, CardHeader, CardTitle, CardDescription, CardFooter, CardContent } from '@/components/ui/card';
import { NewNotebookForm } from '@/components/new-notebook-form';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';

export function NotesClient() {
    const { user } = useAuth();
    const [notebooks, setNotebooks] = useState<NotebookType[]>([]);
    const [allNotes, setAllNotes] = useState<Note[]>([]);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingNotebook, setEditingNotebook] = useState<NotebookType | null>(null);
    const [searchTerm, setSearchTerm] = useState("");
    const { toast } = useToast();

    useEffect(() => {
        if (!user) return;
        const unsubscribeNotebooks = onNotebooksUpdate(setNotebooks);
        const unsubscribeNotes = onNotesUpdate(setAllNotes);
        return () => {
            unsubscribeNotebooks();
            unsubscribeNotes();
        };
    }, [user]);
    
    const handleOpenDialog = (notebook: NotebookType | null) => {
        setEditingNotebook(notebook);
        setIsFormOpen(true);
    };

    const handleFormSubmit = async (data: Omit<Notebook, 'id' | 'familyId' | 'createdAt' | 'ownerId'>) => {
        if (!user) return;
        try {
            if (editingNotebook) {
                await updateNotebook(editingNotebook.id, data);
                toast({ title: 'Not Defteri Güncellendi!' });
            } else {
                await addNotebook(data);
                toast({ title: 'Yeni Not Defteri Oluşturuldu!' });
            }
            setIsFormOpen(false);
            setEditingNotebook(null);
        } catch (error) {
            toast({ title: 'Hata', variant: 'destructive' });
        }
    };

    const handleDeleteNotebook = async (notebookId: string) => {
        try {
            await deleteNotebook(notebookId);
            toast({ title: 'Not Defteri Silindi', variant: 'destructive' });
        } catch (error) {
            toast({ title: 'Hata', variant: 'destructive' });
        }
    };
    
    const filteredNotes = useMemo(() => {
        if (!searchTerm) {
            return [];
        }
        const lowercasedTerm = searchTerm.toLowerCase();
        return allNotes.filter(note => {
             const contentText = Array.isArray(note.content) ? note.content.find(b => b.type === 'text')?.data || '' : '';
             return note.title.toLowerCase().includes(lowercasedTerm) ||
                    contentText.toLowerCase().includes(lowercasedTerm)
        });
    }, [searchTerm, allNotes]);


    return (
        <div className="space-y-6">
            <PageHeader title="Not Defterleri" className="rounded-b-none -mb-8">
                <Dialog open={isFormOpen} onOpenChange={(open) => { if (!open) setEditingNotebook(null); setIsFormOpen(open); }}>
                    <DialogTrigger asChild>
                        <Button variant="secondary">
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Yeni Defter Oluştur
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <NewNotebookForm onSubmit={handleFormSubmit} initialData={editingNotebook} />
                    </DialogContent>
                </Dialog>
            </PageHeader>
            
            <div className="p-4 sm:p-6 lg:p-8 space-y-6">
                <div className="relative w-full sm:max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder="Tüm notlarda ara..."
                    className="pl-10"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
                </div>
                
                {searchTerm ? (
                    <SearchResults notes={filteredNotes} notebooks={notebooks} />
                ) : (
                    <NotebookGrid notebooks={notebooks} onEdit={handleOpenDialog} onDelete={handleDeleteNotebook} />
                )}
            </div>
        </div>
    );
}

function NotebookGrid({ notebooks, onEdit, onDelete }: { notebooks: NotebookType[], onEdit: (nb: NotebookType) => void, onDelete: (id: string) => void }) {
    if (notebooks.length === 0) {
        return (
            <Card className="text-center p-12">
                <NotebookIcon className="mx-auto h-12 w-12 text-muted-foreground" />
                <h3 className="mt-4 text-lg font-semibold">Boşluk...</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                    Henüz hiç not defteri oluşturulmadı.
                </p>
            </Card>
        )
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {notebooks.map(notebook => (
                 <Card key={notebook.id} className={cn("group relative flex flex-col h-full hover:shadow-lg hover:-translate-y-1 transition-transform border-0 text-white", `bg-gradient-to-br ${notebook.color}`)}>
                    <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-white hover:text-white hover:bg-white/20" onClick={(e) => { e.stopPropagation(); onEdit(notebook); }}>
                            <Edit className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-7 w-7 text-white/80 hover:text-white hover:bg-white/20" onClick={(e) => e.stopPropagation()}>
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                                <AlertDialogHeader>
                                    <AlertDialogTitleComponent>Emin misiniz?</AlertDialogTitleComponent>
                                    <AlertDialogDescription>"{notebook.title}" defterini kalıcı olarak silmek istediğinizden emin misiniz?</AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>İptal</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => onDelete(notebook.id)}>Evet, Sil</AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    </div>
                    <Link href={`/notes/${notebook.id}`} className="block flex flex-col h-full">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-3 text-xl">
                                <span className="p-2 rounded-md bg-white/20">{notebook.icon || '🗒️'}</span>
                                {notebook.title}
                            </CardTitle>
                            <CardDescription className="text-white/80">{notebook.description}</CardDescription>
                        </CardHeader>
                         <CardFooter className="mt-auto">
                            <div className="w-full text-sm font-semibold flex items-center justify-between text-white/80 group-hover:text-white transition-colors">
                                <span>Defteri Aç</span>
                                <ChevronRight className="h-4 w-4"/> 
                            </div>
                        </CardFooter>
                    </Link>
                </Card>
            ))}
        </div>
    );
}


function SearchResults({ notes, notebooks }: { notes: Note[], notebooks: NotebookType[] }) {
    if (notes.length === 0) {
        return (
             <Card className="text-center p-12">
                <Search className="mx-auto h-12 w-12 text-muted-foreground" />
                <h3 className="mt-4 text-lg font-semibold">Sonuç Yok</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                    Aradığınız terime uygun not bulunamadı.
                </p>
            </Card>
        );
    }
    
    const getNotebookTitle = (notebookId: string) => {
        return notebooks.find(n => n.id === notebookId)?.title || "Bilinmeyen Defter";
    };

    return (
        <div className="space-y-4">
            <h2 className="text-xl font-semibold">Arama Sonuçları ({notes.length})</h2>
            {notes.map(note => {
                 const contentText = Array.isArray(note.content) ? note.content.find(b => b.type === 'text')?.data || '' : '';
                 return (
                    <Link href={`/notes/${note.notebookId}`} key={note.id}>
                        <Card className="hover:bg-muted/50 cursor-pointer">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-lg">
                                    <StickyNote className="h-5 w-5 text-primary" />
                                    {note.title}
                                </CardTitle>
                                <CardDescription>
                                    <span className="font-semibold">{getNotebookTitle(note.notebookId)}</span> defterinde
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground line-clamp-2">{contentText}</p>
                            </CardContent>
                        </Card>
                    </Link>
                )
            })}
        </div>
    )
}
