
"use client";

import * as React from 'react';
import { useAuth } from '@/components/auth-provider';
import { onBooksUpdate, onUserLibrariesUpdate, updateTask, onTasksUpdate, onVideosUpdate, onMemorizationItemsUpdate, onMemorizationProgressUpdate, updateHabitCompletion, updateVideo, updateUserBookStatus, updateMemorizationProgress } from '@/lib/dataService';
import { Book as BookType, UserLibrary, FamilyMember, Task, Video, MemorizationItem, MemorizationProgress } from '@/lib/data';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format, startOfWeek, addDays, subDays, isSameDay, isFuture, parseISO } from 'date-fns';
import { tr } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, BookOpen, Youtube, BrainCircuit, Flame } from 'lucide-react';

type TrackableItem = {
    id: string;
    type: 'book' | 'video' | 'habit' | 'memorization';
    title: string;
    icon: React.ElementType;
    total?: number; // total videos or pages
    completed?: number; // completed videos or pages
};

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

        return () => {
            unsubBooks();
            unsubLibraries();
            unsubTasks();
            unsubVideos();
            unsubMemorizationItems();
            unsubMemorizationProgress();
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
            .map(v => ({ id: v.id, type: 'video' as const, title: v.title, icon: Youtube, total: v.totalVideos, completed: v.completedVideos }));
            
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
        if (!selectedMember || !familyId) return;
        
        // This function should be simple and just call the service.
        // The real-time listener will update the state.
        try {
            switch (item.type) {
                case 'habit':
                    await updateHabitCompletion(item.id, day, isChecked);
                    break;
                case 'memorization':
                     // A user can only mark memorization as done for a day.
                    if (isChecked) {
                        await updateMemorizationProgress(item.id, selectedMember.id, true);
                    }
                    break;
                case 'book':
                     const book = books.find(b => b.id === item.id);
                    const libBook = userLibraries.find(l => l.memberId === selectedMember.id)?.books.find(b => b.bookId === item.id);
                    if(book && libBook && book.pageCount) {
                        const currentProgress = libBook.progress || 0;
                        const newProgress = Math.min(100, currentProgress + 5); 
                        await updateUserBookStatus(familyId, selectedMember.id, item.id, newProgress >= 100 ? 'finished' : 'reading', newProgress);
                    }
                    break;
                case 'video':
                     const video = videos.find(v => v.id === item.id);
                     if (video) {
                         const currentCompleted = video.completedVideos || 0;
                         const newCompleted = isChecked ? currentCompleted + 1 : Math.max(0, currentCompleted - 1);
                         await updateVideo(item.id, { completedVideos: newCompleted });
                     }
                    break;
                default:
                    break;
            }
        } catch (error) {
            console.error("Error updating tracking item:", error);
        }
    };

    const isChecked = (item: TrackableItem, day: Date): boolean => {
         switch (item.type) {
             case 'habit':
                const task = tasks.find(t => t.id === item.id);
                return task?.completedDates?.includes(format(day, 'yyyy-MM-dd')) || false;
             case 'memorization':
                 const progress = memorizationProgress.find(p => p.itemId === item.id && p.memberId === selectedMember?.id);
                 return !!progress?.completed;
             default:
                // For book/video, we don't have daily tracking data yet, so we'll leave it unchecked.
                return false;
         }
    }

    return (
        <div className="space-y-6">
            <PageHeader title="Takip Tablosu">
                <div className="flex items-center gap-4 overflow-x-auto pb-2">
                    {familyMembers.map((member) => (
                        <Button
                            key={member.id}
                            variant={selectedMember?.id === member.id ? "default" : "outline"}
                            className="bg-white/20 text-white hover:bg-white/30 border-none shrink-0"
                            onClick={() => setSelectedMember(member)}
                        >
                            {member.name}
                        </Button>
                    ))}
                </div>
            </PageHeader>
            <div className="flex items-center justify-center gap-4">
                <Button variant="outline" size="icon" onClick={() => setCurrentDate(d => subDays(d, 7))}>
                    <ChevronLeft className="h-4 w-4" />
                </Button>
                <div className="text-center font-semibold text-lg">
                    {format(weekStart, 'd MMMM', { locale: tr })} - {format(addDays(weekStart, 6), 'd MMMM yyyy', { locale: tr })}
                </div>
                <Button variant="outline" size="icon" onClick={() => setCurrentDate(d => addDays(d, 7))}>
                    <ChevronRight className="h-4 w-4" />
                </Button>
            </div>
            <div className="overflow-x-auto border rounded-lg">
                <Table className="w-full">
                    <TableHeader>
                        <TableRow className="bg-muted/50">
                            <TableHead className="w-1/4 min-w-[200px] border-r">Aktivite</TableHead>
                            {weekDays.map(day => (
                                <TableHead key={day.toISOString()} className={cn("text-center border-r last:border-r-0", isSameDay(day, new Date()) && "bg-primary/10")}>
                                    <p>{format(day, 'EEE', { locale: tr })}</p>
                                    <p className="text-xs text-muted-foreground">{format(day, 'd')}</p>
                                </TableHead>
                            ))}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {trackableItems.map(item => (
                            <TableRow key={item.id}>
                                <TableCell className="font-medium border-r">
                                    <div className="flex items-center gap-2">
                                        <item.icon className="h-5 w-5 text-muted-foreground"/>
                                        <span>{item.title}</span>
                                    </div>
                                </TableCell>
                                {weekDays.map(day => (
                                    <TableCell key={day.toISOString()} className={cn("text-center border-r last:border-r-0", isSameDay(day, new Date()) && "bg-primary/5")}>
                                        <Checkbox
                                            checked={isChecked(item, day)}
                                            onCheckedChange={(checked) => handleCheck(item, day, !!checked)}
                                            disabled={isFuture(day) && !isSameDay(day, new Date())}
                                        />
                                    </TableCell>
                                ))}
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
             {trackableItems.length === 0 && (
                <div className="text-center text-muted-foreground py-16">
                    Bu üye için takip edilecek aktif bir öğe bulunmuyor.
                </div>
            )}
        </div>
    );
}

