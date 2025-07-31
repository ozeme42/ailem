
"use client";

import * as React from "react";
import { useAuth } from "@/components/auth-provider";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { onPrayerProgressUpdate, updatePrayerProgress } from "@/lib/dataService";
import type { PrayerProgress, FamilyMember } from "@/lib/data";
import { cn } from "@/lib/utils";
import { startOfWeek, addDays, format, subWeeks, addWeeks, isSameDay, parseISO } from 'date-fns';
import { tr } from 'date-fns/locale';
import { useToast } from "@/hooks/use-toast";
import { Heart, ChevronLeft, ChevronRight } from "lucide-react";

const prayerTimes = ["Sabah", "Öğle", "İkindi", "Akşam", "Yatsı"];

const dayLabels = [
    { full: "Pazartesi", short: "Pzt" },
    { full: "Salı", short: "Sal" },
    { full: "Çarşamba", short: "Çar" },
    { full: "Perşembe", short: "Per" },
    { full: "Cuma", short: "Cum" },
    { full: "Cumartesi", short: "Cmt" },
    { full: "Pazar", short: "Paz" }
];

export default function PrayerTrackerPage() {
    const { familyMembers } = useAuth();
    const [selectedMember, setSelectedMember] = React.useState<FamilyMember | null>(null);
    const [prayerProgress, setPrayerProgress] = React.useState<PrayerProgress | null>(null);
    const [currentDate, setCurrentDate] = React.useState(new Date());
    const { toast } = useToast();
    
    const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
    const weekEnd = addDays(weekStart, 6);
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

    const handlePrayerToggle = async (dayKey: string, prayerName: string) => {
        if (!selectedMember) return;

        // 1. Get a deep copy of all current completions, or an empty object.
        const allCompletions = JSON.parse(JSON.stringify(prayerProgress?.completions || {}));

        // 2. Get the specific completions for the day being modified.
        const dayCompletions = allCompletions[dayKey] || [];
        
        // 3. Determine the new completion status for the specific prayer.
        const isCompleted = dayCompletions.includes(prayerName);
        const newDayCompletions = isCompleted
            ? dayCompletions.filter((p: string) => p !== prayerName)
            : [...dayCompletions, prayerName];
            
        // 4. Update the copy of all completions with the new list for the modified day.
        allCompletions[dayKey] = newDayCompletions;

        // 5. Create the new state for optimistic update.
        const newProgressState: PrayerProgress = {
            id: prayerProgress?.id || `${selectedMember.id}`,
            memberId: prayerProgress?.memberId || selectedMember.id,
            familyId: prayerProgress?.familyId || '', 
            completions: allCompletions,
        };

        // 6. Optimistic UI update
        setPrayerProgress(newProgressState);
    
        try {
            // 7. Update the database with the new, complete completions object.
            await updatePrayerProgress(selectedMember.id, allCompletions);
        } catch (error) {
            toast({
                title: "Hata",
                description: "Bir sorun oluştu, lütfen tekrar deneyin.",
                variant: "destructive"
            });
            // Revert UI on error by re-fetching or using original state.
            // For now, we rely on the onSnapshot listener to correct it.
            console.error("Failed to update prayer progress:", error);
        }
    };
    
    return (
         <div className="h-full flex flex-col bg-gradient-to-b from-lime-300 via-yellow-200 to-yellow-300 dark:from-lime-900 dark:to-yellow-800 p-4">
            <header className="text-center my-4">
                <h1 className="text-5xl font-extrabold text-white" style={{
                    textShadow: '3px 3px 0px #c026d3, 6px 6px 0px #a21caf',
                    fontFamily: "'Arial Black', sans-serif",
                }}>
                    Haftalık Namaz Tablom
                </h1>
            </header>
            
             <div className="flex flex-col items-center justify-center gap-4 mb-4 text-purple-800 dark:text-purple-200 font-semibold">
                <div className="flex gap-1">
                    <Heart className="size-6 text-red-500 fill-current"/>
                </div>
                <p>Kıldığın namazların kalbini kırmızıya boya.</p>
            </div>

            <div className="flex-grow flex items-center justify-center">
                 <div className="w-full max-w-4xl p-4 bg-yellow-400 dark:bg-yellow-600 rounded-xl shadow-2xl border-4 border-yellow-500 dark:border-yellow-700">
                     <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-4">
                        <div className="flex items-center gap-2">
                           <Button variant="outline" size="icon" onClick={() => setCurrentDate(d => subWeeks(d, 1))}>
                               <ChevronLeft className="h-4 w-4" />
                           </Button>
                           <Button variant="outline" onClick={() => setCurrentDate(new Date())}>Bu Hafta</Button>
                           <Button variant="outline" size="icon" onClick={() => setCurrentDate(d => addWeeks(d, 1))}>
                               <ChevronRight className="h-4 w-4" />
                           </Button>
                        </div>
                        <p className="font-semibold text-center text-lg text-purple-900 dark:text-purple-100">
                           {format(weekStart, 'd MMMM', { locale: tr })} - {format(weekEnd, 'd MMMM yyyy', { locale: tr })}
                        </p>
                    </div>

                    <div className="grid grid-cols-6 gap-2 text-center text-white font-bold mb-2">
                        <div></div> {/* Empty corner */}
                        {prayerTimes.map(time => (
                            <div key={time} className="p-1">{time}</div>
                        ))}
                    </div>
                    <div className="space-y-2">
                    {weekDays.map((day, dayIndex) => {
                        const dayKey = format(day, 'yyyy-MM-dd');
                        const completions = prayerProgress?.completions?.[dayKey] || [];
                        return(
                            <div key={dayKey} className="grid grid-cols-6 gap-2 items-center bg-white/80 dark:bg-gray-800/80 p-1.5 rounded-lg shadow-inner">
                                <div className="bg-gradient-to-r from-red-500 to-orange-500 text-white font-bold rounded-full py-2 px-3 flex items-center justify-center shadow-md">
                                    <div className="size-4 rounded-full bg-white/50 mr-2 border-2 border-white/80"></div>
                                    <span>
                                        <span className="hidden md:inline">{dayLabels[dayIndex].full}</span>
                                        <span className="md:hidden">{dayLabels[dayIndex].short}</span>
                                    </span>
                                </div>
                                {prayerTimes.map(prayer => {
                                    const isCompleted = completions.includes(prayer);
                                    return (
                                        <div 
                                            key={prayer} 
                                            className="flex justify-center items-center cursor-pointer"
                                            onClick={() => handlePrayerToggle(dayKey, prayer)}
                                        >
                                            <Heart 
                                                className={cn("size-10 transition-all hover:scale-110", isCompleted ? "text-red-500" : "text-gray-400/50")} 
                                                style={{ fill: isCompleted ? 'currentColor' : 'none' }}
                                            />
                                        </div>
                                    )
                                })}
                            </div>
                        )
                    })}
                    </div>
                 </div>
            </div>

            <div className="flex items-center justify-center gap-4 mt-8 pb-4 overflow-x-auto">
                {familyMembers.filter(m => m.role.includes("Çocuk")).map((member) => (
                    <Button
                        key={member.id}
                        variant={selectedMember?.id === member.id ? "default" : "secondary"}
                        className={cn(
                            "h-auto p-2 flex items-center gap-2 rounded-full transition-all duration-200 shrink-0 shadow-lg border-2",
                             selectedMember?.id === member.id && "scale-110 border-primary"
                        )}
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
         </div>
    );
}
