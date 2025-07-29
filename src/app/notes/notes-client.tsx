
"use client";

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/auth-provider';
import { Notebook as NotebookType } from '@/lib/data';
import { onNotebooksUpdate, addNotebook, deleteNotebook, updateNotebook } from '@/lib/dataService';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { PlusCircle, Trash2, Edit, User, Users, ChevronRight, Notebook as NotebookIcon, StickyNote } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle as AlertDialogTitleComponent, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Card, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { NewNotebookForm } from '@/components/new-notebook-form';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export function NotesClient() {
    const { user } = useAuth();
    const [notebooks, setNotebooks] = useState<NotebookType[]>([]);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingNotebook, setEditingNotebook] = useState<NotebookType | null>(null);
    const { toast } = useToast();

    React.useEffect(() => {
        if (!user) return;
        const unsubscribe = onNotebooksUpdate(setNotebooks);
        return () => unsubscribe();
    }, [user]);
    
    const handleOpenDialog = (notebook: NotebookType | null) => {
        setEditingNotebook(notebook);
        setIsFormOpen(true);
    };

    const handleFormSubmit = async (data: Omit<NotebookType, 'id' | 'familyId' | 'createdAt' | 'ownerId'>) => {
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
    
    const { familyNotebooks, personalNotebooks } = useMemo(() => {
        const family: NotebookType[] = [];
        const personal: NotebookType[] = [];
        notebooks.forEach(nb => {
            if (nb.isShared) {
                family.push(nb);
            } else {
                personal.push(nb);
            }
        });
        return { familyNotebooks: family, personalNotebooks: personal };
    }, [notebooks]);

    return (
        <div className="space-y-6">
            <PageHeader title="Not Defterleri">
                <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                    <DialogTrigger asChild>
                        <Button onClick={() => handleOpenDialog(null)}>
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Yeni Defter Oluştur
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <NewNotebookForm onSubmit={handleFormSubmit} initialData={editingNotebook} />
                    </DialogContent>
                </Dialog>
            </PageHeader>
            
            <Tabs defaultValue="family" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="family"><Users className="mr-2 h-4 w-4"/> Aile Defterleri</TabsTrigger>
                    <TabsTrigger value="personal"><User className="mr-2 h-4 w-4"/> Kişisel Defterlerim</TabsTrigger>
                </TabsList>
                <TabsContent value="family" className="mt-4">
                    <NotebookGrid notebooks={familyNotebooks} onEdit={handleOpenDialog} onDelete={handleDeleteNotebook} />
                </TabsContent>
                <TabsContent value="personal" className="mt-4">
                    <NotebookGrid notebooks={personalNotebooks} onEdit={handleOpenDialog} onDelete={handleDeleteNotebook} />
                </TabsContent>
            </Tabs>
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
                    Bu alanda hiç not defteri yok.
                </p>
            </Card>
        )
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {notebooks.map(notebook => (
                <Card key={notebook.id} className="group relative flex flex-col h-full hover:shadow-lg hover:-translate-y-1 transition-transform">
                     <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                        <Button variant="secondary" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); onEdit(notebook); }}>
                            <Edit className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button variant="destructive" size="icon" className="h-7 w-7" onClick={(e) => e.stopPropagation()}>
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
                            <CardTitle className="flex items-center gap-2">
                                <span className="text-2xl">{notebook.icon || '🗒️'}</span>
                                {notebook.title}
                            </CardTitle>
                            <CardDescription>{notebook.description}</CardDescription>
                        </CardHeader>
                        <CardFooter className="mt-auto">
                            <Button variant="ghost" className="w-full justify-start text-muted-foreground">
                                <ChevronRight className="mr-2 h-4 w-4"/> Defteri Aç
                            </Button>
                        </CardFooter>
                    </Link>
                </Card>
            ))}
        </div>
    );
}
