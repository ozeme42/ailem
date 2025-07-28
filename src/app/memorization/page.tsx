
"use client";

import * as React from "react";
import { PlusCircle, Trash2, Edit } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { NewMemorizationItemForm } from "@/components/new-memorization-item-form";
import { MemorizationItemCard } from "@/components/memorization-item-card";
import { onEzberItemsUpdate, onEzberProgressUpdate, updateEzberProgress, deleteEzberItem } from "@/lib/dataService";
import type { EzberItem, EzberProgress, FamilyMember } from "@/lib/data";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";

export default function MemorizationPage() {
    const { familyMembers } = useAuth();
    const [isFormOpen, setIsFormOpen] = React.useState(false);
    const [editingItem, setEditingItem] = React.useState<EzberItem | null>(null);
    const [selectedMember, setSelectedMember] = React.useState<FamilyMember | null>(null);
    const [items, setItems] = React.useState<EzberItem[]>([]);
    const [progress, setProgress] = React.useState<EzberProgress[]>([]);
    const [loading, setLoading] = React.useState(true);
    const { toast } = useToast();

    React.useEffect(() => {
        if (familyMembers.length > 0 && !selectedMember) {
            setSelectedMember(familyMembers[0]);
        }
    }, [familyMembers, selectedMember]);

    React.useEffect(() => {
        const unsubItems = onEzberItemsUpdate(setItems);
        const unsubProgress = onEzberProgressUpdate(setProgress);
        Promise.all([
            new Promise(resolve => onEzberItemsUpdate(i => resolve(i), true)),
            new Promise(resolve => onEzberProgressUpdate(p => resolve(p), true))
        ]).then(() => setLoading(false));

        return () => {
            unsubItems();
            unsubProgress();
        };
    }, []);
    
    const handleOpenForm = (item: EzberItem | null) => {
        setEditingItem(item);
        setIsFormOpen(true);
    };

    const handleProgressChange = async (itemId: string, memberId: string, isCompleted: boolean) => {
        try {
            await updateEzberProgress(itemId, memberId, isCompleted);
            const item = items.find(i => i.id === itemId);
            const member = familyMembers.find(m => m.id === memberId);
            if (isCompleted) {
                toast({ title: "🎉 Tebrikler!", description: `${member?.name}, "${item?.title}" ezberini tamamladı.` });
            }
        } catch (error) {
            toast({ title: "Hata", description: "İlerleme güncellenirken bir sorun oluştu.", variant: "destructive" });
        }
    };
    
    const handleDeleteItem = async (itemId: string) => {
        try {
            await deleteEzberItem(itemId);
            toast({ title: "Öğe Silindi", description: "Ezber öğesi kalıcı olarak silindi.", variant: "destructive" });
        } catch (error) {
             toast({ title: "Hata", description: "Öğe silinirken bir sorun oluştu.", variant: "destructive" });
        }
    }

    const { surahs, duas } = React.useMemo(() => {
        return {
            surahs: items.filter(item => item.category === 'Sure'),
            duas: items.filter(item => item.category === 'Dua'),
        };
    }, [items]);
    
    const memberProgress = React.useMemo(() => {
        const progressMap = new Map<string, EzberProgress>();
        if (selectedMember) {
            progress.filter(p => p.memberId === selectedMember.id).forEach(p => {
                progressMap.set(p.itemId, p);
            });
        }
        return progressMap;
    }, [progress, selectedMember]);

    if (loading) {
        return <MemorizationSkeleton />
    }

    return (
        <div className="space-y-6">
            <PageHeader title="Ezber Takibi">
                <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                    <DialogTrigger asChild>
                        <Button variant="outline" className="bg-white/20 text-white hover:bg-white/30 border-none" onClick={() => handleOpenForm(null)}>
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Yeni Ekle
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>{editingItem ? 'Ezberi Düzenle' : 'Yeni Ezber Ekle'}</DialogTitle>
                            <DialogDescription>
                                Yeni bir sure veya dua ekleyerek ezberlenecekler listesini genişletin.
                            </DialogDescription>
                        </DialogHeader>
                        <NewMemorizationItemForm onFormSubmit={() => setIsFormOpen(false)} initialData={editingItem} />
                    </DialogContent>
                </Dialog>
            </PageHeader>
            
             <div className="flex gap-4 overflow-x-auto pb-4">
                {familyMembers.map((member) => (
                <Button
                    key={member.id}
                    variant={selectedMember?.id === member.id ? "default" : "outline"}
                    className={`flex-shrink-0 h-auto p-2 flex items-center gap-2 rounded-full transition-all duration-200 ${selectedMember?.id === member.id ? 'scale-105 shadow-lg' : 'hover:bg-accent'}`}
                    onClick={() => setSelectedMember(member)}
                >
                    <div 
                        className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold" 
                        style={{ backgroundColor: member.color, color: '#fff' }}
                    >
                        {member.name.charAt(0).toUpperCase()}
                    </div>
                    <p className="font-bold text-sm">{member.name}</p>
                </Button>
                ))}
            </div>

            <Tabs defaultValue="surahs" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="surahs">Sureler ({surahs.length})</TabsTrigger>
                    <TabsTrigger value="duas">Dualar ({duas.length})</TabsTrigger>
                </TabsList>
                <TabsContent value="surahs" className="mt-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                        {surahs.map(item => (
                            <MemorizationItemCard 
                                key={item.id} 
                                item={item}
                                progress={memberProgress.get(item.id)}
                                onProgressChange={(completed) => selectedMember && handleProgressChange(item.id, selectedMember.id, completed)}
                                onEdit={() => handleOpenForm(item)}
                                onDelete={() => handleDeleteItem(item.id)}
                            />
                        ))}
                    </div>
                </TabsContent>
                <TabsContent value="duas" className="mt-4">
                     <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                        {duas.map(item => (
                             <MemorizationItemCard 
                                key={item.id} 
                                item={item}
                                progress={memberProgress.get(item.id)}
                                onProgressChange={(completed) => selectedMember && handleProgressChange(item.id, selectedMember.id, completed)}
                                onEdit={() => handleOpenForm(item)}
                                onDelete={() => handleDeleteItem(item.id)}
                            />
                        ))}
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}

function MemorizationSkeleton() {
    return (
        <div className="space-y-6">
            <PageHeader title="Ezber Takibi">
                <Skeleton className="h-10 w-32" />
            </PageHeader>
            <div className="flex gap-4">
                <Skeleton className="h-12 w-24 rounded-full" />
                <Skeleton className="h-12 w-24 rounded-full" />
            </div>
            <Skeleton className="h-10 w-full" />
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 mt-4">
                {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-64 w-full" />)}
            </div>
        </div>
    )
}
