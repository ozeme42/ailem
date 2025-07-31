
"use client";

import * as React from "react";
import Image from "next/image";
import { useAuth } from "@/components/auth-provider";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { onPrayerProgressUpdate, updatePrayerProgress } from "@/lib/dataService";
import type { PrayerProgress, FamilyMember } from "@/lib/data";
import { cn } from "@/lib/utils";
import { startOfWeek, addDays, format, isSameDay } from 'date-fns';
import { tr } from 'date-fns/locale';
import { useToast } from "@/hooks/use-toast";
import { Check, Sun, Moon, CloudSun, Sunset, Sparkles } from "lucide-react";

const prayerTimes = [
    { name: "Sabah", icon: <Sun className="size-4" /> },
    { name: "Öğle", icon: <CloudSun className="size-4" /> },
    { name: "İkindi", icon: <CloudSun className="size-4 opacity-80" /> },
    { name: "Akşam", icon: <Sunset className="size-4" /> },
    { name: "Yatsı", icon: <Moon className="size-4" /> }
];

const dayColors = [
    'bg-green-200/50',   // Pazartesi
    'bg-purple-200/50',  // Salı
    'bg-red-200/50',     // Çarşamba
    'bg-blue-200/50',    // Perşembe
    'bg-orange-200/50',  // Cuma
    'bg-yellow-200/50',  // Cumartesi
    'bg-pink-200/50'     // Pazar
];

const dayPathClasses = [
    { container: 'flex-row', item: '' }, // Pazartesi
    { container: 'flex-row-reverse', item: 'ml-auto' }, // Salı
    { container: 'flex-row', item: '' }, // Çarşamba
    { container: 'flex-row-reverse', item: 'ml-auto' }, // Perşembe
    { container: 'flex-row', item: '' }, // Cuma
    { container: 'flex-row-reverse', item: 'ml-auto' }, // Cumartesi
    { container: 'flex-row', item: '' }  // Pazar
];

export default function PrayerTrackerPage() {
    const { familyMembers } = useAuth();
    const [selectedMember, setSelectedMember] = React.useState<FamilyMember | null>(null);
    const [prayerProgress, setPrayerProgress] = React.useState<PrayerProgress | null>(null);
    const { toast } = useToast();

    const today = new Date();
    const weekStart = startOfWeek(today, { weekStartsOn: 1 });
    const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

    React.useEffect(() => {
        if (familyMembers.length > 0 && !selectedMember) {
            const child = familyMembers.find(m => m.role.includes('Çocuk'));
            setSelectedMember(child || familyMembers[0]);
        }
    }, [familyMembers, selectedMember]);

    React.useEffect(() => {
        if (!selectedMember) return;
        const unsub = onPrayerProgressUpdate(selectedMember.id, (progress) => {
            setPrayerProgress(progress);
        });
        return () => unsub();
    }, [selectedMember]);

    const handlePrayerToggle = (dayKey: string, prayerName: string) => {
        if (!selectedMember) return;
        
        const currentCompletions = prayerProgress?.completions?.[dayKey] || [];
        const isCompleted = currentCompletions.includes(prayerName);
        const newCompletions = isCompleted 
            ? currentCompletions.filter(p => p !== prayerName)
            : [...currentCompletions, prayerName];
            
        updatePrayerProgress(selectedMember.id, dayKey, newCompletions)
            .then(() => {
                if (!isCompleted) {
                    toast({
                        title: "✨ Tebrikler!",
                        description: `${selectedMember.name}, ${prayerName} namazını kıldı.`,
                    });
                }
            })
            .catch(() => {
                toast({
                    title: "Hata",
                    description: "Bir sorun oluştu.",
                    variant: "destructive"
                });
            });
    };

    return (
        <div className="h-full flex flex-col">
            <PageHeader title="Namaz Çizelgem" />
            
            <div className="flex items-center justify-center gap-4 border-b pb-4 mb-4 overflow-x-auto">
                {familyMembers.filter(m => m.role.includes("Çocuk")).map((member) => (
                    <Button
                        key={member.id}
                        variant={selectedMember?.id === member.id ? "default" : "outline"}
                        className={`h-auto p-2 flex items-center gap-2 rounded-full transition-all duration-200 shrink-0 ${selectedMember?.id === member.id ? 'scale-105 shadow-lg' : 'hover:bg-accent'}`}
                        onClick={() => setSelectedMember(member)}
                    >
                        <div 
                            className="w-8 h-8 rounded-full flex items-center justify-center text-lg font-bold" 
                            style={{ backgroundColor: member.color, color: '#fff' }}
                        >
                            {member.name.charAt(0).toUpperCase()}
                        </div>
                        <p className="font-bold text-base">{member.name}</p>
                    </Button>
                ))}
            </div>

            <div className="flex-grow w-full max-w-4xl mx-auto p-4 rounded-lg bg-sky-100 dark:bg-sky-900/50 relative overflow-hidden">
                <Image src="https://placehold.co/800x600.png" data-ai-hint="mosque sky" alt="background" layout="fill" objectFit="cover" className="opacity-20 z-0"/>
                <div className="relative z-10 space-y-2">
                    <div className="flex justify-between items-center mb-4">
                        <Image src="https://placehold.co/100x100.png" data-ai-hint="girl praying" alt="Girl praying" width={80} height={80} className="w-20 h-auto"/>
                         <div className="text-center">
                            <Image src="https://placehold.co/150x100.png" data-ai-hint="kaaba illustration" alt="Kaaba" width={120} height={80} className="mx-auto"/>
                         </div>
                        <Image src="https://placehold.co/100x100.png" data-ai-hint="boy praying" alt="Boy praying" width={80} height={80} className="w-20 h-auto"/>
                    </div>

                    {weekDays.map((day, dayIndex) => {
                        const dayKey = format(day, 'yyyy-MM-dd');
                        const completions = prayerProgress?.completions?.[dayKey] || [];
                        const pathConfig = dayPathClasses[dayIndex % dayPathClasses.length];
                        const isLeftAligned = pathConfig.container === 'flex-row';
                        
                        return (
                            <div key={dayKey} className={cn("flex items-center gap-4", isLeftAligned ? 'flex-row' : 'flex-row-reverse')}>
                                <div className="px-2 py-1 bg-slate-700 text-white text-sm font-bold rounded-full z-20 w-28 text-center">
                                    {format(day, 'EEEE', { locale: tr })}
                                </div>
                                <div className={cn("flex-1 flex items-center gap-1 p-2 rounded-lg", dayColors[dayIndex], pathConfig.container)}>
                                    {prayerTimes.map((prayer, prayerIndex) => {
                                        const isCompleted = completions.includes(prayer.name);
                                        return (
                                            <div key={prayer.name} className={cn("flex-1 min-w-0", pathConfig.item)}>
                                                <div 
                                                    className={cn(
                                                        "flex flex-col items-center justify-center gap-1 w-16 h-16 rounded-full cursor-pointer transition-all duration-300",
                                                        isCompleted ? "bg-white scale-110 shadow-lg" : "bg-white/50 hover:bg-white/80",
                                                        isSameDay(day, today) && !isCompleted && "animate-pulse border-2 border-primary"
                                                    )}
                                                    onClick={() => handlePrayerToggle(dayKey, prayer.name)}
                                                >
                                                    {isCompleted ? (
                                                        <Check className="size-8 text-green-500"/>
                                                    ) : (
                                                        <>
                                                            {prayer.icon}
                                                            <span className="text-xs font-semibold text-slate-700">{prayer.name}</span>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>
        </div>
    );
}
