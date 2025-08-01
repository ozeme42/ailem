
"use client";

import * as React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth-provider';
import { getGoal, updateGoal } from '@/lib/dataService';
import type { Goal, GoalSection } from '@/lib/data';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { ArrowLeft, Check, PlusCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const progressFormSchema = z.object({
  progress: z.coerce.number().min(1, "En az 1 birim ilerleme girilmelidir."),
});

const CircularProgress = ({ progress }: { progress: number }) => {
    const radius = 16;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (progress / 100) * circumference;

    return (
        <div className="relative size-10">
            <svg className="size-full" width="36" height="36" viewBox="0 0 36 36" xmlns="http://www.w3.org/2000/svg">
                <circle cx="18" cy="18" r={radius} fill="transparent" stroke="hsl(var(--muted))" strokeWidth="3"></circle>
                <circle
                    cx="18"
                    cy="18"
                    r={radius}
                    fill="transparent"
                    stroke="hsl(var(--primary))"
                    strokeWidth="3"
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    strokeLinecap="round"
                    transform="rotate(-90 18 18)"
                    className="transition-all duration-300"
                ></circle>
            </svg>
            {progress < 100 ? (
                 <span className="absolute inset-0 flex items-center justify-center text-xs font-semibold text-primary">
                    {Math.round(progress)}%
                </span>
            ) : (
                 <Check className="h-5 w-5 absolute inset-0 m-auto text-primary"/>
            )}
        </div>
    );
};

export default function GoalDetailClient() {
    const params = useParams();
    const router = useRouter();
    const goalId = params.goalId as string;
    const { user } = useAuth();
    const { toast } = useToast();

    const [goal, setGoal] = React.useState<Goal | null>(null);
    const [editingSection, setEditingSection] = React.useState<GoalSection | null>(null);

    const progressForm = useForm<z.infer<typeof progressFormSchema>>({
        resolver: zodResolver(progressFormSchema),
        defaultValues: { progress: '' as any },
    });

    React.useEffect(() => {
        if (!goalId || !user) return;
        
        const fetchAndSetGoal = async () => {
            const fetchedGoal = await getGoal(goalId);
            setGoal(fetchedGoal);
        };
        fetchAndSetGoal();

    }, [goalId, user]);
    
    const handleProgressSubmit = async (values: z.infer<typeof progressFormSchema>) => {
        if (!goal || !editingSection) return;

        const newCompletedUnits = (editingSection.completedUnits || 0) + values.progress;
        const sectionProgress = Math.min(newCompletedUnits, editingSection.sectionTotalUnits);

        const newSections = goal.sections.map(s => 
            s.id === editingSection.id 
                ? { ...s, completedUnits: sectionProgress } 
                : s
        );
        
        // Recalculate section statuses
        newSections.forEach(section => {
            if ((section.completedUnits || 0) >= section.sectionTotalUnits) {
                section.status = 'completed';
            }
        });

        const isGoalComplete = newSections.every(s => s.status === 'completed');
        const newGoalStatus = isGoalComplete ? 'completed' : 'in-progress';
        
        try {
            await updateGoal(goalId, { sections: newSections, status: newGoalStatus });
            setGoal(prev => prev ? {...prev, sections: newSections, status: newGoalStatus} : null);
            toast({ title: "İlerleme Kaydedildi!", description: `${values.progress} ${goal.unitName} eklendi.` });
            setEditingSection(null);
            progressForm.reset({ progress: '' as any });
        } catch(e) {
            toast({ title: "Hata", variant: 'destructive' });
        }
    };

    if (!goal) {
        return <div>Yükleniyor...</div>;
    }
    
    const sortedSections = [...goal.sections].sort((a,b) => a.order - b.order);

    const isVideoGoal = goal.platform === 'YouTube';
    const totalCompletedUnits = (goal.sections || []).reduce((sum, section) => sum + (section.completedUnits || 0), 0);
    const overallProgress = (goal.totalUnits || 0) > 0 ? (totalCompletedUnits / goal.totalUnits!) * 100 : 0;


    return (
        <div className="space-y-6">
            <PageHeader title={goal.title}>
                <Button variant="outline" onClick={() => router.push('/goals')}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Tüm Hedefler
                </Button>
            </PageHeader>
            
            {isVideoGoal ? (
                 <Card>
                    <CardHeader>
                        <CardTitle>Genel İlerleme</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                         <div>
                            <Progress value={overallProgress} className="h-2" />
                            <p className="text-sm mt-2 text-right font-medium text-primary">
                                {totalCompletedUnits} / {goal.totalUnits} {goal.unitName}
                            </p>
                        </div>
                        {goal.status !== 'completed' && (
                             <Dialog open={!!editingSection} onOpenChange={(open) => {if (!open) { setEditingSection(null); progressForm.reset({ progress: '' as any }); }}}>
                                <DialogTrigger asChild>
                                    <Button variant="outline" className="w-full" onClick={() => setEditingSection(goal.sections[0])}>
                                        <PlusCircle className="mr-2 h-4 w-4" /> İlerleme Ekle
                                    </Button>
                                </DialogTrigger>
                                <DialogContent>
                                    <DialogHeader>
                                        <DialogTitle>İlerleme Ekle: {goal.title}</DialogTitle>
                                        <DialogDescription>
                                            Bu hedef için ne kadar ilerlediğini gir. (Örn: izlenen video sayısı)
                                        </DialogDescription>
                                    </DialogHeader>
                                    <Form {...progressForm}>
                                        <form onSubmit={progressForm.handleSubmit(handleProgressSubmit)} className="space-y-4 pt-4">
                                            <FormField
                                                control={progressForm.control}
                                                name="progress"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Tamamlanan Birim ({goal.unitName})</FormLabel>
                                                        <FormControl><Input type="number" autoFocus {...field} /></FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                            <DialogFooter>
                                                <Button type="button" variant="ghost" onClick={() => setEditingSection(null)}>İptal</Button>
                                                <Button type="submit">Kaydet</Button>
                                            </DialogFooter>
                                        </form>
                                    </Form>
                                </DialogContent>
                            </Dialog>
                        )}
                    </CardContent>
                 </Card>
            ) : (
                <Accordion type="multiple" defaultValue={sortedSections.map(s => s.id)} className="w-full space-y-4">
                    {sortedSections.map((section, index) => {
                        const progress = section.sectionTotalUnits > 0 ? ((section.completedUnits || 0) / section.sectionTotalUnits) * 100 : 0;
                        
                        const isUnlocked = index === 0 || (sortedSections[index - 1] && sortedSections[index - 1].status === 'completed');

                        return (
                            <Card key={section.id} className={cn(!isUnlocked && "opacity-60 bg-muted/50")}>
                                <AccordionItem value={section.id} className="border-b-0">
                                    <AccordionTrigger disabled={!isUnlocked} className="p-4 hover:no-underline">
                                        <div className="flex items-center gap-4 w-full">
                                            <CircularProgress progress={progress} />
                                            <div className="text-left flex-grow">
                                                <h3 className="text-lg font-semibold">{section.title}</h3>
                                                <p className="text-sm text-muted-foreground">
                                                    Hedef: {section.sectionTotalUnits} {goal.unitName}
                                                </p>
                                            </div>
                                        </div>
                                    </AccordionTrigger>
                                    <AccordionContent className="p-4 pt-0">
                                        <div className="pl-14 space-y-4">
                                            <div>
                                                <Progress value={progress} className="h-2" />
                                                <p className="text-sm mt-2 text-right font-medium text-primary">
                                                    {section.completedUnits || 0} / {section.sectionTotalUnits} {goal.unitName}
                                                </p>
                                            </div>
                                            {section.status !== 'completed' && (
                                                <Dialog open={editingSection?.id === section.id} onOpenChange={(open) => {if (!open) { setEditingSection(null); progressForm.reset({ progress: '' as any }); }}}>
                                                    <DialogTrigger asChild>
                                                        <Button variant="outline" className="w-full" onClick={() => setEditingSection(section)}>
                                                            <PlusCircle className="mr-2 h-4 w-4" /> İlerleme Ekle
                                                        </Button>
                                                    </DialogTrigger>
                                                    <DialogContent>
                                                        <DialogHeader>
                                                            <DialogTitle>İlerleme Ekle: {section.title}</DialogTitle>
                                                            <DialogDescription>
                                                                Bu bölüm için ne kadar ilerlediğini gir. (Örn: okunan sayfa sayısı)
                                                            </DialogDescription>
                                                        </DialogHeader>
                                                        <Form {...progressForm}>
                                                            <form onSubmit={progressForm.handleSubmit(handleProgressSubmit)} className="space-y-4 pt-4">
                                                                <FormField
                                                                    control={progressForm.control}
                                                                    name="progress"
                                                                    render={({ field }) => (
                                                                        <FormItem>
                                                                            <FormLabel>Tamamlanan Birim ({goal.unitName})</FormLabel>
                                                                            <FormControl><Input type="number" autoFocus {...field} /></FormControl>
                                                                            <FormMessage />
                                                                        </FormItem>
                                                                    )}
                                                                />
                                                                <DialogFooter>
                                                                    <Button type="button" variant="ghost" onClick={() => setEditingSection(null)}>İptal</Button>
                                                                    <Button type="submit">Kaydet</Button>
                                                                </DialogFooter>
                                                            </form>
                                                        </Form>
                                                    </DialogContent>
                                                </Dialog>
                                            )}
                                        </div>
                                    </AccordionContent>
                                </AccordionItem>
                            </Card>
                        );
                    })}
                </Accordion>
            )}
        </div>
    );
}
