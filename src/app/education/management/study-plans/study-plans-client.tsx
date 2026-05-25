"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Edit, Trash2, ArrowLeft, BookHeart, FileText, ChevronRight, Layers, Target, BookOpen } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { onStudyPlansUpdate, addStudyPlan, updateStudyPlan, deleteStudyPlan } from "@/lib/dataService";
import { StudyPlan } from "@/lib/data";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { NewStudyPlanForm } from "@/components/new-study-plan-form";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

// --- DESIGN SYSTEM ---
const themeColors = {
    HEADER_BG: "bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800/50 sticky top-0 z-40",
    CARD_BG: "bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 shadow-sm backdrop-blur-md hover:bg-slate-50 dark:hover:bg-slate-900/60 transition-all duration-300",
    ICON_BOX: "bg-gradient-to-br from-pink-500 to-rose-600 p-2.5 rounded-xl shadow-lg shadow-pink-500/20 text-white",
};

export function StudyPlansClient() {
    const { familyId } = useAuth();
    const { toast } = useToast();
    const router = useRouter();
    const [plans, setPlans] = React.useState<StudyPlan[]>([]);
    const [isFormOpen, setIsFormOpen] = React.useState(false);
    const [editingPlan, setEditingPlan] = React.useState<StudyPlan | null>(null);

    React.useEffect(() => {
        if (!familyId) return;
        const unsub = onStudyPlansUpdate(setPlans);
        return () => unsub();
    }, [familyId]);

    const handleFormSubmit = async (data: Omit<StudyPlan, 'id' | 'familyId'>) => {
        try {
            if (editingPlan) {
                await updateStudyPlan(editingPlan.id, data);
                toast({ title: "Plan Güncellendi ✨" });
            } else {
                await addStudyPlan(data);
                toast({ title: "Yeni Plan Oluşturuldu ✅" });
            }
            setIsFormOpen(false);
            setEditingPlan(null);
        } catch (error) {
            toast({ title: "Hata", variant: "destructive" });
        }
    };

    const handleDelete = async (id: string) => {
        try {
            await deleteStudyPlan(id);
            toast({ title: "Plan Silindi 🗑️" });
        } catch (error) {
            toast({ title: "Hata", variant: "destructive" });
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans flex flex-col">
            <header className={themeColors.HEADER_BG}>
                <div className="max-w-6xl mx-auto px-4 md:px-6 h-16 sm:h-20 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 sm:gap-4">
                        <Button onClick={() => router.push('/education/management')} variant="ghost" size="icon" className="rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400">
                            <ArrowLeft className="h-5 w-5 sm:h-6 sm:w-6" />
                        </Button>
                        <div className={cn(themeColors.ICON_BOX)}>
                            <Target className="w-5 h-5 sm:w-6 sm:h-6" />
                        </div>
                        <div className="flex flex-col justify-center">
                            <h1 className="text-lg sm:text-2xl font-black tracking-tight text-slate-900 dark:text-slate-100 leading-none">Yol Haritaları</h1>
                            <p className="text-[10px] sm:text-xs font-medium text-slate-500 dark:text-slate-400 mt-1">Konu Anlatım Planları</p>
                        </div>
                    </div>
                    <Button onClick={() => { setEditingPlan(null); setIsFormOpen(true); }} className="rounded-xl h-9 sm:h-11 px-4 sm:px-5 bg-pink-600 hover:bg-pink-700 text-white font-bold shadow-lg shadow-pink-500/20 text-xs sm:text-sm">
                        <Plus className="mr-1.5 sm:mr-2 h-4 w-4 sm:h-5 sm:w-5" /> <span className="hidden sm:inline">Yeni Plan</span>
                    </Button>
                </div>
            </header>

            <main className="flex-1 max-w-6xl mx-auto w-full p-4 md:p-6 space-y-6">
                {plans.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
                        {plans.map(plan => {
                            const totalTopics = plan.subjects?.reduce((sum, s) => sum + (s.topics?.length || 0), 0) || 0;
                            return (
                                <Card key={plan.id} className={cn("flex flex-col h-full group overflow-hidden", themeColors.CARD_BG)}>
                                    <CardHeader className="pb-4">
                                        <div className="flex justify-between items-start mb-2">
                                            <Badge variant="outline" className="bg-pink-500/10 text-pink-400 border-pink-500/20 text-[10px] font-bold uppercase tracking-widest px-2 py-0.5">
                                                PLAN
                                            </Badge>
                                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-indigo-400" onClick={() => { setEditingPlan(plan); setIsFormOpen(true); }}>
                                                    <Edit className="h-4 w-4" />
                                                </Button>
                                                <AlertDialog>
                                                    <AlertDialogTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-rose-400">
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </AlertDialogTrigger>
                                                    <AlertDialogContent className="bg-slate-900 border-slate-800 text-slate-100 rounded-3xl">
                                                        <AlertDialogHeader>
                                                            <AlertDialogTitle>Planı Sil?</AlertDialogTitle>
                                                            <AlertDialogDescription className="text-slate-400">
                                                                "{plan.title}" planı ve bu plana bağlı tüm öğrenci atamaları silinecektir.
                                                            </AlertDialogDescription>
                                                        </AlertDialogHeader>
                                                        <AlertDialogFooter>
                                                            <AlertDialogCancel className="bg-white/5 border-white/10 text-slate-200">İptal</AlertDialogCancel>
                                                            <AlertDialogAction onClick={() => handleDelete(plan.id)} className="bg-rose-600 hover:bg-rose-700">Evet, Sil</AlertDialogAction>
                                                        </AlertDialogFooter>
                                                    </AlertDialogContent>
                                                </AlertDialog>
                                            </div>
                                        </div>
                                        <CardTitle className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 group-hover:text-pink-600 dark:group-hover:text-pink-400 transition-colors line-clamp-2">{plan.title}</CardTitle>
                                    </CardHeader>
                                    <CardContent className="flex-grow space-y-4">
                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="bg-slate-50 dark:bg-black/20 p-3 rounded-xl border border-slate-200 dark:border-white/5 flex flex-col items-center justify-center">
                                                <span className="text-xl font-black text-slate-900 dark:text-white">{plan.subjects?.length || 0}</span>
                                                <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Ders</span>
                                            </div>
                                            <div className="bg-slate-50 dark:bg-black/20 p-3 rounded-xl border border-slate-200 dark:border-white/5 flex flex-col items-center justify-center">
                                                <span className="text-xl font-black text-slate-900 dark:text-white">{totalTopics}</span>
                                                <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Konu</span>
                                            </div>
                                        </div>
                                    </CardContent>
                                    <CardFooter className="p-4 pt-0">
                                        <Link href={`/education/management/study-plans/${plan.id}`} className="w-full">
                                            <Button variant="secondary" className="w-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold h-10 rounded-xl">
                                                Detayları Yönet <ChevronRight className="ml-2 h-4 w-4" />
                                            </Button>
                                        </Link>
                                    </CardFooter>
                                </Card>
                            );
                        })}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-20 sm:py-24 text-center bg-white dark:bg-slate-900/30 rounded-[2.5rem] sm:rounded-[3rem] border-2 border-dashed border-slate-200 dark:border-slate-800 m-auto max-w-2xl w-full shadow-inner">
                        <div className="w-16 h-16 sm:w-20 sm:h-20 bg-pink-50 dark:bg-pink-900/20 rounded-2xl sm:rounded-[2rem] flex items-center justify-center mb-6">
                            <BookHeart className="h-8 w-8 sm:h-10 sm:w-10 text-pink-500" />
                        </div>
                        <h3 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">Yol Haritası Yok</h3>
                        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-2 max-w-xs mx-auto leading-relaxed">
                            Ders veya ünite bazlı konu anlatım planları oluşturarak öğrencilere hedefler atayabilirsiniz.
                        </p>
                        <Button onClick={() => setIsFormOpen(true)} className="mt-8 rounded-xl bg-pink-600 hover:bg-pink-700 font-bold px-8 shadow-lg shadow-pink-500/20 h-11 sm:h-12">
                            <Plus className="mr-2 h-5 w-5" /> İlk Planı Oluştur
                        </Button>
                    </div>
                )}
            </main>

            <Dialog open={isFormOpen} onOpenChange={(open) => { if(!open) setEditingPlan(null); setIsFormOpen(open); }}>
                <DialogContent className="max-w-3xl h-[95vh] md:h-auto md:max-h-[85vh] bg-white dark:bg-slate-900 border-none rounded-t-[2rem] md:rounded-[2rem] p-0 overflow-hidden shadow-2xl flex flex-col mt-auto md:mt-0">
                    <div className="flex-1 overflow-hidden p-0">
                        <NewStudyPlanForm
                            onSubmit={handleFormSubmit}
                            initialData={editingPlan}
                        />
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
