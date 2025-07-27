

"use client";

import * as React from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/auth-provider';
import { onGoalsUpdate, addGoal, deleteGoal, updateGoal } from '@/lib/dataService';
import type { Goal } from '@/lib/data';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Progress } from '@/components/ui/progress';
import { PlusCircle, Target, Trash2, Edit } from 'lucide-react';
import { NewGoalForm } from '@/components/new-goal-form';
import { useToast } from '@/hooks/use-toast';

export default function GoalsClient() {
    const { user, familyMembers } = useAuth();
    const [goals, setGoals] = React.useState<Goal[]>([]);
    const [isFormOpen, setIsFormOpen] = React.useState(false);
    const [editingGoal, setEditingGoal] = React.useState<Goal | null>(null);
    const { toast } = useToast();

    React.useEffect(() => {
        if (!user) return;
        const unsubscribe = onGoalsUpdate(setGoals);
        return () => unsubscribe();
    }, [user]);

    const handleOpenDialog = (goal: Goal | null) => {
        setEditingGoal(goal);
        setIsFormOpen(true);
    };

    const handleFormSubmit = async (data: Omit<Goal, 'id' | 'familyId' | 'createdAt' | 'status'>) => {
        try {
            if (editingGoal) {
                await updateGoal(editingGoal.id, data);
                toast({ title: 'Yol Haritası Güncellendi!', description: `"${data.title}" başarıyla güncellendi.` });
            } else {
                await addGoal(data);
                toast({ title: 'Yeni Yol Haritası Oluşturuldu!', description: `"${data.title}" hedefine doğru ilk adımı attın.` });
            }
            setIsFormOpen(false);
            setEditingGoal(null);
        } catch (error) {
            console.error("Goal submission error: ", error)
            toast({ title: 'Hata', description: 'İşlem sırasında bir hata oluştu.', variant: 'destructive' });
        }
    };
    
    const handleDeleteGoal = async (goalId: string) => {
        try {
            await deleteGoal(goalId);
            toast({ title: 'Yol Haritası Silindi', variant: 'destructive' });
        } catch (error) {
            toast({ title: 'Hata', description: 'Hedef silinirken bir sorun oluştu.', variant: 'destructive' });
        }
    };

    const calculateOverallProgress = (goal: Goal) => {
        if (!goal.totalUnits) return 0;
        const totalCompletedUnits = goal.sections.reduce((acc, section) => acc + (section.completedUnits || 0), 0);
        return (totalCompletedUnits / goal.totalUnits) * 100;
    };
    
    const getNextSectionTitle = (goal: Goal) => {
        for (const section of goal.sections.sort((a, b) => a.order - b.order)) {
            if (section.status !== 'completed') {
                return `Sıradaki Bölüm: ${section.title}`;
            }
        }
        return "Tüm hedefler tamamlandı!";
    };

    return (
        <div className="space-y-6">
            <PageHeader title="Yol Haritaları">
                <Dialog open={isFormOpen} onOpenChange={(open) => { if (!open) setEditingGoal(null); setIsFormOpen(open); }}>
                    <DialogTrigger asChild>
                        <Button onClick={() => handleOpenDialog(null)}>
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Yeni Yol Haritası Oluştur
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-xl">
                        <DialogHeader>
                            <DialogTitle>{editingGoal ? 'Yol Haritasını Düzenle' : 'Yeni Yol Haritası'}</DialogTitle>
                            <DialogDescription>
                                {editingGoal ? 'Mevcut hedefin detaylarını değiştir.' : 'Büyük bir hedef belirle ve ona ulaşmak için adımlarını planla.'}
                            </DialogDescription>
                        </DialogHeader>
                        <NewGoalForm
                            familyMembers={familyMembers}
                            onCreate={handleFormSubmit}
                            initialData={editingGoal}
                        />
                    </DialogContent>
                </Dialog>
            </PageHeader>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {goals.map(goal => {
                    const progress = calculateOverallProgress(goal);
                    const assignee = familyMembers.find(m => m.id === goal.assigneeId);
                    const totalSections = goal.sections.length;
                    const completedSections = goal.sections.filter(s => s.status === 'completed').length;

                    return (
                        <Card key={goal.id} className="group relative flex flex-col h-full hover:shadow-lg hover:-translate-y-1 transition-transform">
                             <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                                <Button
                                    variant="secondary"
                                    size="icon"
                                    className="h-7 w-7"
                                    onClick={(e) => { e.stopPropagation(); handleOpenDialog(goal); }}
                                >
                                    <Edit className="h-4 w-4" />
                                </Button>
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button
                                            variant="destructive"
                                            size="icon"
                                            className="h-7 w-7"
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>Emin misiniz?</AlertDialogTitle>
                                            <AlertDialogDescription>
                                                "{goal.title}" yol haritasını kalıcı olarak silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>İptal</AlertDialogCancel>
                                            <AlertDialogAction onClick={() => handleDeleteGoal(goal.id)}>Evet, Sil</AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            </div>
                            <Link href={`/goals/${goal.id}`} className="block flex flex-col h-full">
                                <CardHeader>
                                    <div className="flex justify-between items-start gap-2">
                                        <CardTitle>{goal.title}</CardTitle>
                                        {assignee && (
                                            <div
                                                className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
                                                style={{ backgroundColor: assignee.color, color: '#fff' }}
                                                title={assignee.name}
                                            >
                                                {assignee.name.charAt(0).toUpperCase()}
                                            </div>
                                        )}
                                    </div>
                                    <CardDescription>{goal.description}</CardDescription>
                                </CardHeader>
                                <CardContent className="flex-grow space-y-3">
                                     <div className="space-y-1 text-sm">
                                        <p className="text-muted-foreground">{getNextSectionTitle(goal)}</p>
                                    </div>
                                    <div className="text-sm">
                                        <p className="text-muted-foreground">Bölüm İlerlemesi:</p>
                                        <p className="font-medium">{completedSections} / {totalSections} Bölüm Tamamlandı</p>
                                    </div>
                                </CardContent>
                                <CardFooter className="flex flex-col items-start">
                                    <div className="flex justify-between w-full text-xs text-muted-foreground mb-1">
                                        <span>Genel İlerleme</span>
                                        <span>{Math.round(progress)}%</span>
                                    </div>
                                    <Progress value={progress} className="w-full h-2" />
                                </CardFooter>
                            </Link>
                        </Card>
                    )
                })}
            </div>
             {goals.length === 0 && (
                <Card className="text-center p-12">
                    <Target className="mx-auto h-12 w-12 text-muted-foreground" />
                    <h3 className="mt-4 text-lg font-semibold">Henüz yol haritası yok</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                        Yeni bir hedef oluşturarak başlayın.
                    </p>
                </Card>
            )}
        </div>
    );
}
