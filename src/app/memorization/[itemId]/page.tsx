

"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import { MemorizationItem, Verse } from "@/lib/data";
import { onSnapshot, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { updateMemorizationItem } from "@/lib/dataService";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Save, Trash2, PlusCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import Image from "next/image";

export default function MemorizationItemDetailPage() {
    const params = useParams();
    const router = useRouter();
    const { toast } = useToast();
    const itemId = params.itemId as string;

    const [item, setItem] = React.useState<MemorizationItem | null>(null);
    const [verses, setVerses] = React.useState<Verse[]>([]);
    const [isLoading, setIsLoading] = React.useState(true);
    const [isSaving, setIsSaving] = React.useState(false);

    const [newVerseText, setNewVerseText] = React.useState("");
    const [bulkText, setBulkText] = React.useState("");
    const [isBulkDialogOpen, setIsBulkDialogOpen] = React.useState(false);


    React.useEffect(() => {
        if (!itemId) return;

        const docRef = doc(db, "memorizationItems", itemId);
        const unsubscribe = onSnapshot(docRef, (doc) => {
            if (doc.exists()) {
                const data = { id: doc.id, ...doc.data() } as MemorizationItem;
                setItem(data);
                setVerses(data.verses || []);
            } else {
                setItem(null);
            }
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, [itemId]);

    const handleSave = async (newVerses: Verse[]) => {
        if (!item) return;
        setIsSaving(true);
        try {
            await updateMemorizationItem(item.id, { verses: newVerses });
            setVerses(newVerses); // Update local state immediately
            toast({
                title: "✅ Kaydedildi!",
                description: `"${item.title}" içeriği başarıyla güncellendi.`,
            });
        } catch (error) {
            toast({
                title: "❌ Hata",
                description: "İçerik kaydedilirken bir sorun oluştu.",
                variant: "destructive",
            });
        } finally {
            setIsSaving(false);
        }
    };
    
    const addVerse = () => {
        if (newVerseText.trim()) {
            const newVerse: Verse = {
                id: Date.now().toString(),
                text: newVerseText.trim(),
            };
            const updatedVerses = [...verses, newVerse];
            handleSave(updatedVerses);
            setNewVerseText("");
        }
    };

    const deleteVerse = (verseId: string) => {
        const updatedVerses = verses.filter(v => v.id !== verseId);
        handleSave(updatedVerses);
    };

    const handleBulkSave = () => {
        const newVerses = bulkText
            .split('\n')
            .map(line => line.trim())
            .filter(line => line.length > 0)
            .map(line => ({
                id: Date.now().toString() + Math.random(),
                text: line,
            }));
        handleSave(newVerses);
        setIsBulkDialogOpen(false);
        setBulkText("");
    };

    if (isLoading) {
        return <DetailPageSkeleton />;
    }

    if (!item) {
        return (
            <div className="text-center p-8">
                <p>Ezberlenecek öğe bulunamadı.</p>
                <Button onClick={() => router.back()} className="mt-4">
                    <ArrowLeft className="mr-2 h-4 w-4" /> Geri
                </Button>
            </div>
        );
    }
    
    return (
        <div className="h-full flex flex-col">
            <PageHeader title={item.title}>
                 <Button onClick={() => router.back()} variant="outline" className="bg-white/20 text-white hover:bg-white/30 border-none">
                    <ArrowLeft className="mr-2 h-4 w-4" /> Geri
                </Button>
            </PageHeader>
            
            {item.imageUrl && (
                <div className="relative w-full h-48 my-4 rounded-lg overflow-hidden">
                    <Image
                        src={item.imageUrl}
                        alt={item.title}
                        layout="fill"
                        objectFit="cover"
                        className="bg-muted"
                        data-ai-hint="religious illustration"
                    />
                </div>
            )}

             <div className="flex flex-wrap gap-2 px-4 md:px-0 mb-4">
                {item.tags?.map(tag => <Badge key={tag} variant="secondary">{tag}</Badge>)}
             </div>

             <div className="flex-grow min-h-0 p-4 md:p-6 bg-background/50 rounded-lg border">
                <div className="flex justify-end mb-4">
                    <Dialog open={isBulkDialogOpen} onOpenChange={setIsBulkDialogOpen}>
                        <DialogTrigger asChild>
                            <Button variant="outline">Toplu Ekle/Değiştir</Button>
                        </DialogTrigger>
                        <DialogContent>
                             <DialogHeader>
                                <DialogTitle>Toplu Ayet Ekle</DialogTitle>
                                <DialogDescription>
                                    Tüm metni buraya yapıştırın. Her satır yeni bir ayet olarak eklenecektir. Bu işlem mevcut ayet listesinin üzerine yazacaktır.
                                </DialogDescription>
                            </DialogHeader>
                            <Textarea
                                value={bulkText}
                                onChange={(e) => setBulkText(e.target.value)}
                                rows={10}
                                placeholder="Bismillahirrahmanirrahim..."
                            />
                            <DialogFooter>
                                <Button variant="ghost" onClick={() => setIsBulkDialogOpen(false)}>İptal</Button>
                                <Button onClick={handleBulkSave}>Kaydet</Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>
                 <div className="space-y-3">
                    {verses.map((verse, index) => (
                        <div key={verse.id} className="flex items-start gap-3 p-3 rounded-md border bg-card group">
                            <span className="font-mono text-sm text-primary font-semibold pt-0.5">{index + 1}.</span>
                            <p className="flex-grow text-base">{verse.text}</p>
                            <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-7 w-7 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={() => deleteVerse(verse.id)}
                            >
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </div>
                    ))}
                    {verses.length === 0 && (
                        <p className="text-center text-muted-foreground py-8">Henüz ayet eklenmemiş.</p>
                    )}
                 </div>
             </div>

             <div className="p-4 md:p-6 mt-4 bg-background/50 rounded-lg border">
                <h3 className="font-semibold mb-2">Yeni Ayet Ekle</h3>
                 <div className="flex items-center gap-2">
                     <Input 
                        placeholder="Yeni ayet metni..."
                        value={newVerseText}
                        onChange={(e) => setNewVerseText(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addVerse(); }}}
                     />
                     <Button onClick={addVerse} disabled={isSaving}>
                        <PlusCircle className="h-4 w-4 mr-2" />
                        Ekle
                     </Button>
                 </div>
             </div>
        </div>
    );
}

function DetailPageSkeleton() {
    return (
        <div className="space-y-6">
            <PageHeader title="...">
                <Skeleton className="h-10 w-24" />
            </PageHeader>
            <div className="px-4 md:px-0">
                <Skeleton className="h-80 w-full" />
            </div>
        </div>
    )
}
