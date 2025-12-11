"use client";

import * as React from 'react';
import { useAuth } from '@/components/auth-provider';
import { onBooksUpdate, onUserLibrariesUpdate, onTasksUpdate, onVideosUpdate, onMemorizationItemsUpdate, onMemorizationProgressUpdate, onDailyTrackingsUpdate, setDailyTrackingStatus } from '@/lib/dataService';
import { Book as BookType, UserLibrary, FamilyMember, Task, Video, MemorizationItem, MemorizationProgress, DailyTracking, TrackableItemType } from '@/lib/data';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format, startOfWeek, addDays, subDays, isSameDay, isFuture } from 'date-fns';
import { tr } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, BookOpen, Youtube, BrainCircuit, Flame, LayoutDashboard, Calendar, CalendarCheck } from 'lucide-react';

type TrackableItem = {
    id: string;
    type: TrackableItemType;
    title: string;
    icon: React.ElementType;
};

// --- DESIGN SYSTEM: Glassmorphism Colors ---
const glassColors = {
    HEADER_BG: "bg-slate-950/70 backdrop-blur-lg border-b border-white/5",
    CARD_BG: "bg-white/5 border border-white/10 shadow-lg backdrop-blur-md",
    TEXT_MAIN: "text-slate-100",
    TEXT_MUTED: "text-slate-400",
    ICON_BOX: "bg-gradient-to-br from-indigo-500 to-fuchsia-500 p-2.5 rounded-xl shadow-lg",
    ACTIVE_MEMBER_RING: "ring-2 ring-indigo-500/50 bg-indigo-500/10",
};

// Tablo satır renkleri kaldırıldı/basitleştirildi
const rowColors = [
    "dark:bg-white/0", // Transparent dark
    "dark:bg-white/0",
    "dark:bg-white/0",
    "dark:bg-white/0",
    "dark:bg-white/0",
];

export function TrackingClient() {
    const { familyId, familyMembers } = useAuth();
    const [selectedMember, setSelectedMember] = React.useState<FamilyMember | null>(null);
    const [currentDate, setCurrentDate] = React.useState(new Date());

    // Data states
    const [books, setBooks] = React.useState<BookType[]>([]);
    const [userLibraries, setUserLibraries] = React.useState<UserLibrary[]>([]);
    const [tasks, setTasks] = React.useState<Task[]>([]);
    const [videos, setVideos] = React.useState<Video[]>([]);
    const [memorizationItems, setMemorizationItems] = React.useState<MemorizationItem[]>([]);
    const [memorizationProgress, setMemorizationProgress] = React.useState<MemorizationProgress[]>([]);
    const [dailyTrackings, setDailyTrackings] = React.useState<DailyTracking[]>([]);


    React.useEffect(() => {
        if (familyMembers.length > 0 && !selectedMember) {
            setSelectedMember(familyMembers[0]);
        }
    }, [familyMembers, selectedMember]);

    React.useEffect(() => {
        if (!selectedMember || !familyId) return;

        const unsubBooks = onBooksUpdate(setBooks);
        const unsubLibraries = onUserLibrariesUpdate(familyId, setUserLibraries);
        const unsubTasks = onTasksUpdate(setTasks);
        const unsubVideos = onVideosUpdate(setVideos);
        const unsubMemorizationItems = onMemorizationItemsUpdate(setMemorizationItems);
        const unsubMemorizationProgress = onMemorizationProgressUpdate(setMemorizationProgress);
        const unsubDailyTrackings = onDailyTrackingsUpdate(familyId, selectedMember.id, setDailyTrackings);

        return () => {
            unsubBooks();
            unsubLibraries();
            unsubTasks();
            unsubVideos();
            unsubMemorizationItems();
            unsubMemorizationProgress();
            unsubDailyTrackings();
        };
    }, [selectedMember, familyId]);

    const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
    const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

    const trackableItems: TrackableItem[] = React.useMemo(() => {
        if (!selectedMember) return [];

        const memberLib = userLibraries.find(lib => lib.memberId === selectedMember.id);
        const readingBooks: TrackableItem[] = (memberLib?.books || [])
            .filter(b => b.status === 'reading')
            .map(b => {
                const bookDetail = books.find(bd => bd.id === b.bookId);
                return bookDetail ? { id: bookDetail.id, type: 'book' as const, title: bookDetail.title, icon: BookOpen } : null;
            })
            .filter((b): b is TrackableItem => b !== null);

        const assignedVideos: TrackableItem[] = videos
            .filter(v => v.assigneeId === selectedMember.id && (v.completedVideos || 0) < v.totalVideos)
            .map(v => ({ id: v.id, type: 'video' as const, title: v.title, icon: Youtube }));
            
        const memberHabits: TrackableItem[] = tasks
            .filter(t => t.isRecurring && t.assigneeId === selectedMember.id)
            .map(t => ({ id: t.id, type: 'habit' as const, title: t.title, icon: Flame }));
            
        const memberMemorization = memorizationProgress
            .filter(p => p.memberId === selectedMember.id && !p.completed)
            .map(p => {
                const itemDetail = memorizationItems.find(mi => mi.id === p.itemId);
                return itemDetail ? { id: itemDetail.id, type: 'memorization' as const, title: itemDetail.title, icon: BrainCircuit } : null;
            })
            .filter((i): i is TrackableItem => i !== null);


        return [...readingBooks, ...assignedVideos, ...memberHabits, ...memberMemorization];
    }, [selectedMember, userLibraries, books, videos, tasks, memorizationItems, memorizationProgress]);

    const handleCheck = async (item: TrackableItem, day: Date, isChecked: boolean) => {
        if (!selectedMember) return;
        try {
            await setDailyTrackingStatus(selectedMember.id, { id: item.id, type: item.type }, day, isChecked);
        } catch (error) {
            console.error("Error updating tracking item:", error);
        }
    };

    const isChecked = (item: TrackableItem, day: Date): boolean => {
             const dateKey = format(day, 'yyyy-MM-dd');
             return dailyTrackings.some(
                 (tracking) =>
                     tracking.date === dateKey &&
                     tracking.itemId === item.id &&
                     tracking.memberId === selectedMember?.id
             );
    }
    
    // Geri ve İleri butonları için disabled kontrolü
    const isNextWeekDisabled = isFuture(weekDays[6]) && !isSameDay(weekDays[6], new Date());


    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 font-sans relative overflow-hidden flex flex-col">
            
            {/* FIXED BACKGROUND */}
            <div className="fixed inset-0 bg-slate-950 -z-50" />
            
            {/* AMBIENT BACKGROUND */}
            <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
                <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-sky-900/20 rounded-full blur-[120px]" />
                <div className="absolute bottom-[20%] left-[-5%] w-[400px] h-[400px] bg-indigo-900/20 rounded-full blur-[120px]" />
            </div>

            {/* HEADER (Glass, Sticky) */}
            <div className={cn("sticky top-0 z-40 w-full transition-all duration-300", glassColors.HEADER_BG)}>
                <div className="max-w-7xl mx-auto px-4 md:px-6 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className={cn(glassColors.ICON_BOX, "bg-gradient-to-br from-indigo-500 to-sky-600")}>
                            <CalendarCheck className="w-5 h-5 text-white" />
                        </div>
                        <h1 className="text-xl font-black tracking-tight text-slate-100 leading-none">
                            Takip Tablosu
                        </h1>
                    </div>
                </div>
            </div>

            <div className="flex-1 max-w-7xl mx-auto w-full p-4 md:p-6 relative z-10 space-y-6">
                
                {/* MEMBER SELECTOR */}
                <div className="flex items-center gap-3 overflow-x-auto pb-4 scrollbar-hide">
                    {familyMembers.map((member) => (
                        <Button
                            key={member.id}
                            variant="outline"
                            className={cn(
                                "flex-shrink-0 h-auto p-2 px-4 flex items-center gap-2 rounded-full transition-all duration-200 border-white/10 text-slate-300 hover:bg-white/10 hover:text-white",
                                selectedMember?.id === member.id && glassColors.ACTIVE_MEMBER_RING
                            )}
                            onClick={() => setSelectedMember(member)}
                        >
                             <div 
                                className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-sm" 
                                style={{ backgroundColor: member.color }}
                            >
                                {member.name.charAt(0).toUpperCase()}
                            </div>
                            <span className="font-bold text-sm">{member.name}</span>
                        </Button>
                    ))}
                </div>

                {/* WEEK NAVIGATION */}
                <div className="flex items-center justify-between gap-4 p-3 rounded-xl bg-white/5 border border-white/10">
                    <Button variant="ghost" size="icon" className="rounded-full text-slate-400 hover:bg-white/10 hover:text-white" onClick={() => setCurrentDate(d => subDays(d, 7))}>
                        <ChevronLeft className="h-5 w-5" />
                    </Button>
                    
                    <div className="text-center font-semibold text-sm">
                        <p className="text-slate-300">{format(weekStart, 'd MMMM', { locale: tr })} - {format(addDays(weekStart, 6), 'd MMMM yyyy', { locale: tr })}</p>
                    </div>
                    
                    <Button 
                        variant="ghost" 
                        size="icon" 
                        className={cn("rounded-full", isNextWeekDisabled ? "text-slate-600" : "text-slate-400 hover:bg-white/10 hover:text-white")} 
                        onClick={() => setCurrentDate(d => addDays(d, 7))}
                        disabled={isNextWeekDisabled}
                    >
                        <ChevronRight className="h-5 w-5" />
                    </Button>
                </div>

                {/* TRACKING TABLE */}
                <div className={cn("overflow-x-auto rounded-xl", glassColors.CARD_BG)}>
                    <Table className="min-w-full divide-y divide-white/10">
                        <TableHeader>
                            <TableRow className="bg-white/5 hover:bg-white/5 border-b border-white/10">
                                <TableHead className="w-1/4 min-w-[200px] border-r border-white/10 text-slate-400">Aktivite</TableHead>
                                {weekDays.map(day => (
                                    <TableHead 
                                        key={day.toISOString()} 
                                        className={cn(
                                            "text-center border-r last:border-r-0 border-white/10 text-slate-300", 
                                            isSameDay(day, new Date()) && "bg-indigo-500/10 text-indigo-300"
                                        )}
                                    >
                                        <p className="font-bold">{format(day, 'EEE', { locale: tr })}</p>
                                        <p className="text-xs font-medium text-slate-500">{format(day, 'd')}</p>
                                    </TableHead>
                                ))}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {trackableItems.map((item, index) => {
                                const rowClass = rowColors[index % rowColors.length];
                                return (
                                <TableRow key={item.id} className={cn("border-white/10 hover:bg-white/5", rowClass)}>
                                    <TableCell className="font-medium border-r border-white/10 text-slate-200">
                                        <div className="flex items-center gap-3">
                                            <div className="p-1 rounded-full bg-white/5">
                                                <item.icon className="h-5 w-5 text-indigo-400/80"/>
                                            </div>
                                            <span className="text-sm">{item.title}</span>
                                        </div>
                                    </TableCell>
                                    {weekDays.map(day => {
                                        const isTodayOrPast = !isFuture(day) || isSameDay(day, new Date());
                                        const isCurrentDay = isSameDay(day, new Date());
                                        const isCheckedToday = isChecked(item, day);
                                        
                                        return (
                                        <TableCell key={day.toISOString()} className={cn("text-center border-r last:border-r-0 border-white/10", isCurrentDay && "bg-indigo-500/10")}>
                                            <Checkbox
                                                checked={isCheckedToday}
                                                onCheckedChange={(checked) => handleCheck(item, day, !!checked)}
                                                disabled={!isTodayOrPast}
                                                className={cn(
                                                    "size-5 rounded-md border-white/20 transition-all duration-200",
                                                    (isCheckedToday && !isCurrentDay) && "data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600",
                                                    (isCheckedToday && isCurrentDay) && "data-[state=checked]:bg-indigo-500 data-[state=checked]:border-indigo-500 ring-2 ring-indigo-500/50",
                                                    !isTodayOrPast && "opacity-30 cursor-not-allowed"
                                                )}
                                            />
                                        </TableCell>
                                    )})}
                                </TableRow>
                            )})}
                        </TableBody>
                    </Table>
                </div>
                 {trackableItems.length === 0 && (
                     <div className="text-center text-slate-500 py-16 bg-white/5 rounded-xl border border-dashed border-white/10">
                         <p>Bu üye için takip edilecek aktif bir öğe bulunmuyor.</p>
                     </div>
                 )}
            </div>
        </div>
    );
}