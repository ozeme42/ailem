
"use client";

import * as React from "react";
import Image from 'next/image';
import { useAuth } from "@/components/auth-provider";
import { Mistake } from "@/lib/data";
import { onMistakesUpdate, deleteMistake } from "@/lib/dataService";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { PlusCircle, Trash2, BookCopy, Ruler, TestTube2, Globe, MessageSquare, Gamepad2 } from "lucide-react";
import { NewMistakeForm } from "@/components/new-mistake-form";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";

const categoryIcons: { [key: string]: React.ElementType } = {
    'Matematik': Ruler,
    'Fen Bilimleri': TestTube2,
    'Türkçe': BookCopy,
    'Sosyal Bilgiler': Globe,
    'İngilizce': MessageSquare,
    'Diğer': Gamepad2
};

export default function MistakePoolPage() {
    const { user } = useAuth();
    const [mistakes, setMistakes] = React.useState<Mistake[]>([]);
    const [isFormOpen, setIsFormOpen] = React.useState(false);
    const { toast } = useToast();

    React.useEffect(() => {
        if (!user) return;
        const unsubscribe = onMistakesUpdate(setMistakes);
        return () => unsubscribe();
    }, [user]);

    const groupedMistakes = React.useMemo(() => {
        const groups: { [subject: string]: { [topic: string]: Mistake[] } } = {};
        mistakes.forEach(mistake => {
            if (!groups[mistake.subject]) {
                groups[mistake.subject] = {};
            }
            if (!groups[mistake.subject][mistake.topic]) {
                groups[mistake.subject][mistake.topic] = [];
            }
            groups[mistake.subject][mistake.topic].push(mistake);
        });
        return groups;
    }, [mistakes]);
    
    const handleDeleteMistake = async (id: string) => {
        try {
            await deleteMistake(id);
            toast({ title: "Soru Silindi", description: "Soru yanlış havuzundan kaldırıldı.", variant: "destructive" });
        } catch (error) {
            toast({ title: "Hata", description: "Soru silinirken bir hata oluştu.", variant: "destructive" });
        }
    };

    return (
        <div className="space-y-6">
            <PageHeader title="Yanlış Havuzu">
                <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                    <DialogTrigger asChild>
                        <Button>
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Yeni Soru Ekle
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Yeni Yanlış Soru Ekle</DialogTitle>
                            <DialogDescription>
                                Fotoğrafını çekerek yanlış yapılan bir soruyu havuza ekleyin.
                            </DialogDescription>
                        </DialogHeader>
                        <NewMistakeForm onFormSubmit={() => setIsFormOpen(false)} />
                    </DialogContent>
                </Dialog>
            </PageHeader>
            
            {Object.keys(groupedMistakes).length > 0 ? (
                 <Accordion type="multiple" defaultValue={Object.keys(groupedMistakes)} className="w-full space-y-4">
                    {Object.entries(groupedMistakes).map(([subject, topics]) => {
                        const Icon = categoryIcons[subject] || BookCopy;
                        return (
                        <Card key={subject}>
                             <AccordionItem value={subject} className="border-b-0">
                                <AccordionTrigger className="p-4 hover:no-underline">
                                    <div className="flex items-center gap-3">
                                        <Icon className="w-8 h-8" />
                                        <div className="text-left">
                                            <h3 className="text-lg font-semibold">{subject}</h3>
                                        </div>
                                    </div>
                                </AccordionTrigger>
                                <AccordionContent className="p-4 pt-0">
                                    <div className="space-y-3">
                                        {Object.entries(topics).map(([topic, topicMistakes]) => (
                                            <div key={topic}>
                                                <h4 className="font-semibold text-muted-foreground mb-2">{topic}</h4>
                                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                                    {topicMistakes.map(mistake => (
                                                        <Card key={mistake.id} className="relative group overflow-hidden">
                                                            <Image src={mistake.imageUrl} alt="Yanlış Soru" width={300} height={400} className="object-cover w-full h-auto aspect-[3/4]" data-ai-hint="question paper"/>
                                                            <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                 <AlertDialog>
                                                                    <AlertDialogTrigger asChild>
                                                                         <Button variant="destructive" size="icon" className="h-8 w-8">
                                                                            <Trash2 className="h-4 w-4"/>
                                                                        </Button>
                                                                    </AlertDialogTrigger>
                                                                    <AlertDialogContent>
                                                                        <AlertDialogHeader>
                                                                            <AlertDialogTitle>Emin misiniz?</AlertDialogTitle>
                                                                            <AlertDialogDescription>Bu soru kalıcı olarak silinecektir.</AlertDialogDescription>
                                                                        </AlertDialogHeader>
                                                                        <AlertDialogFooter>
                                                                            <AlertDialogCancel>İptal</AlertDialogCancel>
                                                                            <AlertDialogAction onClick={() => handleDeleteMistake(mistake.id)}>Evet, Sil</AlertDialogAction>
                                                                        </AlertDialogFooter>
                                                                    </AlertDialogContent>
                                                                </AlertDialog>
                                                            </div>
                                                        </Card>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </AccordionContent>
                             </AccordionItem>
                        </Card>
                        )
                    })}
                </Accordion>
            ) : (
                 <Card>
                    <CardContent className="p-8 text-center text-muted-foreground">
                        Yanlış havuzunda henüz soru bulunmuyor.
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
