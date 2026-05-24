"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { 
  addDays, format, startOfWeek, isSameMonth, isToday, isWithinInterval, 
  isAfter, isPast, parseISO, compareAsc, isFuture, 
  startOfMonth, addMonths, differenceInDays, isSameDay, 
  getDate, getMonth, startOfDay, isBefore, addYears, setDate 
} from 'date-fns';
import { tr } from 'date-fns/locale';
import { 
  ChevronLeft, ChevronRight, Plus, Calendar as CalendarIcon, 
  Trash2, Edit, Clock, MoreHorizontal, MapPin, Search,
  TrendingUp, Zap, ArrowLeft
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { CalendarEvent } from "@/lib/data";
import { onCalendarEventsUpdate, deleteCalendarEvent } from "@/lib/dataService";
import { NewEventForm } from "@/components/new-event-form";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";

// --- DESIGN SYSTEM: Modern Light Theme ---
const appTheme = {
    CARD_BG: "bg-white border border-slate-200/60 shadow-sm rounded-[1.5rem]",
    CARD_HOVER: "hover:border-indigo-200 hover:shadow-md transition-all duration-200 active:scale-[0.98]",
    TEXT_MAIN: "text-slate-900",
    TEXT_MUTED: "text-slate-500",
    HEADER_BG: "bg-white/90 backdrop-blur-xl border-b border-slate-200/60 supports-[backdrop-filter]:bg-white/60",
    ICON_BOX: "bg-gradient-to-br from-indigo-500 to-purple-600 p-2.5 rounded-xl shadow-sm",
};

const eventStyles = [
    { indicator: "bg-blue-500", bg: "bg-blue-50", text: "text-blue-700", textMuted: "text-blue-600", border: "border-blue-200" },
    { indicator: "bg-emerald-500", bg: "bg-emerald-50", text: "text-emerald-700", textMuted: "text-emerald-600", border: "border-emerald-200" },
    { indicator: "bg-violet-500", bg: "bg-violet-50", text: "text-violet-700", textMuted: "text-violet-600", border: "border-violet-200" },
    { indicator: "bg-amber-500", bg: "bg-amber-50", text: "text-amber-700", textMuted: "text-amber-600", border: "border-amber-200" },
    { indicator: "bg-rose-500", bg: "bg-rose-50", text: "text-rose-700", textMuted: "text-rose-600", border: "border-rose-200" },
];

// --- HELPER COMPONENTS ---
const StatCard = ({ icon: Icon, label, value, colorClass }: any) => (
    <div className={cn("p-4 rounded-[1.25rem] flex items-center gap-3 flex-1 bg-white border border-slate-200/60 shadow-sm shrink-0 min-w-[140px]")}>
        <div className={cn("w-10 h-10 rounded-full flex items-center justify-center", colorClass)}>
            <Icon className="w-5 h-5" />
        </div>
        <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{label}</p>
            <p className="text-xl font-black leading-none text-slate-900 mt-1">{value}</p>
        </div>
    </div>
);

const DaysLeftBadge = ({ days }: { days: number }) => {
    if (days < 0) return <Badge variant="secondary" className="px-2 bg-rose-50 text-rose-600 border-rose-200 shadow-sm text-[10px] uppercase font-bold">Süresi Geçti</Badge>;
    if (days === 0) return <Badge className="bg-emerald-500 text-white px-2 animate-pulse shadow-sm text-[10px] uppercase font-bold">Bugün!</Badge>;
    if (days === 1) return <Badge className="bg-amber-500 text-white px-2 shadow-sm text-[10px] uppercase font-bold">Yarın</Badge>;
    if (days <= 3) return <Badge variant="secondary" className="px-2 bg-amber-50 text-amber-700 border-amber-200 shadow-sm text-[10px] uppercase font-bold">{days} gün kaldı</Badge>;
    return <Badge variant="outline" className="border-slate-200 text-slate-500 font-bold text-[10px] uppercase bg-slate-50">{days} gün var</Badge>;
};

export default function CalendarPage() {
  const router = useRouter(); 
  const [currentDate, setCurrentDate] = React.useState(new Date());
  const [selectedDate, setSelectedDate] = React.useState(new Date());
  const [calendarEvents, setCalendarEvents] = React.useState<CalendarEvent[]>([]);
  const [isFormDialogOpen, setIsFormDialogOpen] = React.useState(false);
  const [editingEvent, setEditingEvent] = React.useState<CalendarEvent | null>(null);
  
  const [searchQuery, setSearchQuery] = React.useState("");
  const [filterType, setFilterType] = React.useState<'all' | 'recurring' | 'one-time'>('all');

  const { toast } = useToast();

  React.useEffect(() => {
    const unsubscribeEvents = onCalendarEventsUpdate(setCalendarEvents);
    return () => unsubscribeEvents();
  }, []);
  
  const { upcomingEvents, monthlyStats } = React.useMemo(() => {
    const today = startOfDay(new Date());
    
    const processedEvents = calendarEvents.map(e => {
      const originalDate = parseISO(e.startDate);
      let nextOccurrence = originalDate;

      if (isBefore(originalDate, today)) {
        if (e.recurrence === 'monthly') {
          const currentMonthDate = setDate(new Date(today.getFullYear(), today.getMonth(), 1), getDate(originalDate));
          nextOccurrence = isBefore(currentMonthDate, today) ? addMonths(currentMonthDate, 1) : currentMonthDate;
        } else if (e.recurrence === 'yearly') {
          const currentYearDate = new Date(today.getFullYear(), getMonth(originalDate), getDate(originalDate));
          nextOccurrence = isBefore(currentYearDate, today) ? addYears(currentYearDate, 1) : currentYearDate;
        }
      }

      return {
        ...e,
        displayDate: nextOccurrence,
        daysLeft: differenceInDays(nextOccurrence, today),
      };
    });

    const filtered = processedEvents
      .filter(e => {
          const matchesSearch = e.title.toLowerCase().includes(searchQuery.toLowerCase());
          const matchesType = filterType === 'all' 
              ? true 
              : filterType === 'recurring' 
                  ? (e.recurrence === 'monthly' || e.recurrence === 'yearly')
                  : e.recurrence === 'one-time';
          const isNotPast = e.recurrence === 'one-time' ? (isAfter(e.displayDate, today) || isSameDay(e.displayDate, today)) : true;

          return matchesSearch && matchesType && isNotPast;
      })
      .sort((a, b) => compareAsc(a.displayDate, b.displayDate));

    const stats = {
        total: filtered.length,
        thisMonth: filtered.filter(e => isSameMonth(e.displayDate, new Date())).length
    };
      
    return { upcomingEvents: filtered, monthlyStats: stats };
  }, [calendarEvents, searchQuery, filterType]);

  const displayedDays = React.useMemo(() => {
      const monthStart = startOfMonth(currentDate);
      const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
      const days = [];
      let day = startDate;
      while (days.length < 42) {
          days.push(day);
          day = addDays(day, 1);
      }
      return days;
  }, [currentDate]);

  const getEventsForDay = (day: Date) => {
    return calendarEvents.filter(event => {
      const eventStartDate = parseISO(event.startDate);
      if (isBefore(day, startOfDay(eventStartDate))) return false;
      switch (event.recurrence) {
        case 'one-time':
            if (event.endDate) {
                const eventEndDate = parseISO(event.endDate);
                return isWithinInterval(day, { start: startOfDay(eventStartDate), end: startOfDay(eventEndDate) });
            }
            return isSameDay(eventStartDate, day);
        case 'monthly': return getDate(eventStartDate) === getDate(day);
        case 'yearly': return getDate(eventStartDate) === getDate(day) && getMonth(eventStartDate) === getMonth(day);
        default: return false;
      }
    });
  };

  const eventsToDisplay = upcomingEvents;

  const handlePrevMonth = () => setCurrentDate(d => addMonths(d, -1));
  const handleNextMonth = () => setCurrentDate(d => addMonths(d, 1));
  const handleToday = () => { const t = new Date(); setCurrentDate(t); setSelectedDate(t); };
  
  const handleDeleteEvent = async (eventId: string) => {
      try { await deleteCalendarEvent(eventId); toast({ title: "🗑️ Silindi", description: "Etkinlik başarıyla silindi.", className: "bg-slate-900 text-white border-none rounded-2xl" }); } 
      catch { toast({ title: "Hata", description: "Bir sorun oluştu.", variant: "destructive" }); }
  };

  const weekHeaderDays = Array.from({ length: 7 }).map((_, i) => addDays(startOfWeek(new Date(), {weekStartsOn: 1}), i));

  const handleOpenNewTask = () => {
    setEditingEvent(null);
    setIsFormDialogOpen(true);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans pb-28 md:pb-10 relative overflow-hidden transition-colors duration-300">
      
      {/* AMBIENT BACKGROUND */}
      <div className="fixed top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0 opacity-40">
          <div className="absolute top-[-5%] left-[-10%] w-[300px] h-[300px] md:w-[500px] md:h-[500px] bg-indigo-200/60 rounded-full blur-[100px]" />
          <div className="absolute bottom-[10%] right-[-10%] w-[250px] h-[250px] md:w-[400px] md:h-[400px] bg-fuchsia-200/60 rounded-full blur-[100px]" />
      </div>

      {/* HEADER (App Bar) */}
      <div className={cn("sticky top-0 z-40 py-3 md:py-4 transition-all duration-300", appTheme.HEADER_BG)}>
          <div className="max-w-7xl mx-auto px-4 md:px-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div className="flex items-center justify-between md:justify-start gap-3 w-full md:w-auto">
                      <div className="flex items-center gap-2">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => router.back()} 
                            className="rounded-full -ml-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900 active:scale-95 transition-all"
                          >
                              <ArrowLeft className="w-6 h-6" />
                          </Button>
                          <div className={appTheme.ICON_BOX}>
                              <CalendarIcon className="w-5 h-5 text-white" />
                          </div>
                          <div className="ml-1">
                              <h1 className="text-xl md:text-2xl font-black leading-none tracking-tight text-slate-900">
                                  {format(new Date(), 'd MMMM, EEEE', {locale: tr})}
                              </h1>
                              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mt-1">Ajanda</p>
                          </div>
                      </div>

                      {/* Desktop Add Button */}
                      <Button onClick={handleOpenNewTask} className="hidden md:flex rounded-2xl px-6 h-12 bg-indigo-600 hover:bg-indigo-700 text-white shadow-md active:scale-95 transition-transform">
                           <Plus className="w-5 h-5 mr-2" /> Yeni Ekle
                      </Button>
                  </div>

                  <div className="flex items-center gap-3 w-full md:w-auto">
                      <div className="relative flex-1 md:w-72 group">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                          <Input 
                            placeholder="Etkinlik ara..." 
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10 h-11 md:h-12 rounded-xl bg-slate-100/50 border-slate-200 text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-indigo-500 shadow-inner transition-all" 
                          />
                      </div>
                  </div>
              </div>

              {/* MOBILE STATS SCROLL */}
              <div className="flex gap-3 mt-3 overflow-x-auto pb-2 scrollbar-hide [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden md:hidden">
                  <StatCard icon={TrendingUp} label="Bu Ay" value={monthlyStats.thisMonth} colorClass="bg-blue-100 text-blue-600" />
                  <StatCard icon={CalendarIcon} label="Toplam" value={monthlyStats.total} colorClass="bg-emerald-100 text-emerald-600" />
              </div>
          </div>
      </div>

      <div className="max-w-7xl mx-auto p-3 md:p-6 grid grid-cols-1 lg:grid-cols-12 gap-5 md:gap-6 relative z-10">
        
        {/* SOL KOLON: TAKVİM */}
        <div className="lg:col-span-7 space-y-4">
            <div className={cn("p-2 md:p-4", appTheme.CARD_BG)}>
                {/* Calendar Navigation */}
                <div className="flex items-center justify-between px-2 md:px-4 py-3 md:py-4 border-b border-slate-100 mb-2">
                    <h2 className="text-lg md:text-xl font-black capitalize text-slate-900">
                        {format(currentDate, 'MMMM yyyy', { locale: tr })}
                    </h2>
                    <div className="flex gap-1 bg-slate-100 rounded-full p-1 border border-slate-200 shadow-sm">
                        <Button variant="ghost" size="icon" onClick={handlePrevMonth} className="rounded-full w-8 h-8 text-slate-600 hover:text-slate-900 hover:bg-white active:scale-95 transition-all"><ChevronLeft className="w-5 h-5" /></Button>
                        <Button variant="ghost" size="sm" onClick={handleToday} className="rounded-full px-3 text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-white active:scale-95 transition-all">Bugün</Button>
                        <Button variant="ghost" size="icon" onClick={handleNextMonth} className="rounded-full w-8 h-8 text-slate-600 hover:text-slate-900 hover:bg-white active:scale-95 transition-all"><ChevronRight className="w-5 h-5" /></Button>
                    </div>
                </div>

                {/* Calendar Grid */}
                <div className="px-1 md:px-2">
                    <div className="grid grid-cols-7 mb-2">
                         {weekHeaderDays.map(day => (
                            <div key={day.toISOString()} className="text-center text-[10px] md:text-xs font-bold uppercase tracking-widest py-2 text-slate-400">
                                {format(day, 'EEE', { locale: tr })}
                            </div>
                        ))}
                    </div>
                    
                    <div className="grid grid-cols-7 gap-1 sm:gap-2">
                        {displayedDays.map((day) => {
                            const dayEvents = getEventsForDay(day);
                            const isSelected = isSameDay(day, selectedDate);
                            const isCurrentMonth = isSameMonth(day, currentDate);
                            const isDayToday = isToday(day);
                            const hasEvents = dayEvents.length > 0;

                            return (
                                <div 
                                    key={day.toString()} 
                                    onClick={() => setSelectedDate(day)}
                                    className={cn(
                                        "aspect-[1/1.1] sm:aspect-square rounded-[14px] md:rounded-2xl flex flex-col items-center justify-center cursor-pointer transition-all duration-200 relative border active:scale-95",
                                        !isCurrentMonth ? "opacity-30 border-transparent" : "border-transparent",
                                        hasEvents && !isSelected && "bg-slate-50 border-slate-200 hover:bg-slate-100",
                                        isDayToday && !isSelected && "ring-2 ring-indigo-500 bg-indigo-50 text-indigo-700",
                                        isSelected 
                                            ? "bg-gradient-to-br from-indigo-500 to-blue-600 text-white shadow-md shadow-indigo-500/30 scale-[1.05] z-10 border-transparent" 
                                            : "hover:bg-slate-100 text-slate-600"
                                    )}
                                >
                                    <span className={cn("text-sm md:text-base font-bold", isSelected && "text-white", isDayToday && !isSelected && "font-black")}>
                                        {format(day, 'd')}
                                    </span>
                                    
                                    {/* Event Dots */}
                                    <div className="flex gap-0.5 md:gap-1 mt-1.5 h-1.5 justify-center">
                                        {dayEvents.slice(0, 3).map((_, i) => (
                                            <div key={i} className={cn("w-1.5 h-1.5 rounded-full", isSelected ? "bg-white" : eventStyles[i % eventStyles.length].indicator)} />
                                        ))}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>
            </div>
        </div>

        {/* SAĞ KOLON: LİSTE VE DETAYLAR */}
        <div className="lg:col-span-5 flex flex-col h-full space-y-4">
            
            {/* Filter Tabs (Segmented Control Style) */}
            <div className="flex p-1 rounded-xl bg-slate-100 border border-slate-200">
                <button onClick={() => setFilterType('all')} className={cn("flex-1 py-2 text-xs font-bold rounded-lg transition-all", filterType === 'all' ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700")}>Tümü</button>
                <button onClick={() => setFilterType('recurring')} className={cn("flex-1 py-2 text-xs font-bold rounded-lg transition-all", filterType === 'recurring' ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700")}>Düzenli</button>
                <button onClick={() => setFilterType('one-time')} className={cn("flex-1 py-2 text-xs font-bold rounded-lg transition-all", filterType === 'one-time' ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700")}>Tek Sefer</button>
            </div>

            {/* Event List Container */}
            <div className={cn("flex flex-col flex-1 min-h-[500px] lg:h-[700px] overflow-hidden", appTheme.CARD_BG)}>
                <div className="p-4 md:p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                      <div>
                        <h3 className="font-black text-slate-900 text-lg">
                             {searchQuery ? "Arama Sonuçları" : "Yaklaşan Etkinlikler"}
                        </h3>
                        <p className="text-xs font-medium text-slate-500 mt-0.5">
                             {searchQuery ? "Bulunan kayıtlar listeleniyor." : "Tüm aktif planlarınız ve önemli günler."}
                        </p>
                      </div>
                      {!searchQuery && (
                          <Badge className="bg-slate-200 text-slate-700 hover:bg-slate-300 shadow-none border-none">
                              {eventsToDisplay.length} Plan
                          </Badge>
                      )}
                </div>

                <ScrollArea className="flex-1 bg-slate-50/30">
                    <div className="p-3 md:p-4 space-y-3">
                        {eventsToDisplay.length > 0 ? (
                            eventsToDisplay.map((event, index) => {
                                const style = eventStyles[index % eventStyles.length];
                                return (
                                    <div 
                                        key={event.id} 
                                        className="group relative rounded-2xl p-3 border border-slate-200 bg-white transition-all duration-200 hover:border-slate-300 hover:shadow-md active:scale-[0.98] cursor-pointer"
                                    >
                                        <div className="flex gap-3 md:gap-4">
                                            {/* Date Box */}
                                            <div className={cn(
                                                "flex flex-col items-center justify-center w-12 h-14 md:w-14 md:h-16 rounded-[14px] flex-shrink-0 border",
                                                style.bg, style.border
                                            )}>
                                                <span className={cn("text-lg md:text-xl font-black leading-none", style.text)}>{format(event.displayDate, 'd')}</span>
                                                <span className={cn("text-[9px] md:text-[10px] uppercase font-bold mt-0.5", style.textMuted)}>{format(event.displayDate, 'MMM', {locale: tr})}</span>
                                            </div>

                                            <div className="flex-1 min-w-0 py-0.5 flex flex-col justify-center">
                                                <div className="flex justify-between items-start gap-2">
                                                    <h4 className="font-bold truncate text-sm md:text-base text-slate-900 pr-6">{event.title}</h4>
                                                    <div className="shrink-0 hidden xs:block">
                                                        {event.recurrence === 'one-time' && (
                                                            <DaysLeftBadge days={event.daysLeft} />
                                                        )}
                                                    </div>
                                                </div>
                                                
                                                <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 mt-1.5">
                                                    <div className="flex items-center gap-1 text-[11px] font-semibold text-slate-500">
                                                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                                                        <span>
                                                            {event.recurrence === 'one-time' ? 'Tek Sefer' : 
                                                             event.recurrence === 'monthly' ? 'Her Ay' : 'Her Yıl'}
                                                        </span>
                                                    </div>
                                                    {event.location && (
                                                        <div className="flex items-center gap-1 text-[11px] font-semibold text-slate-500">
                                                            <MapPin className="w-3.5 h-3.5 text-slate-400" />
                                                            <span className="truncate max-w-[100px]">{event.location}</span>
                                                        </div>
                                                    )}
                                                </div>
                                                {/* Mobile specific badge placement */}
                                                <div className="mt-2 xs:hidden">
                                                    {event.recurrence === 'one-time' && <DaysLeftBadge days={event.daysLeft} />}
                                                </div>
                                            </div>

                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" className="h-8 w-8 p-0 rounded-full absolute top-2 right-2 text-slate-400 hover:text-slate-900 hover:bg-slate-100 active:scale-90 transition-all md:opacity-0 md:group-hover:opacity-100">
                                                        <MoreHorizontal className="h-5 w-5" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end" className="w-40 bg-white border-slate-200 rounded-2xl shadow-xl p-1.5">
                                                    <DropdownMenuItem onClick={() => { setEditingEvent(event); setIsFormDialogOpen(true); }} className="hover:bg-slate-50 cursor-pointer font-bold text-slate-700 py-2.5 rounded-xl">
                                                        <Edit className="mr-2 h-4 w-4" /> Düzenle
                                                    </DropdownMenuItem>
                                                    <DropdownMenuSeparator className="bg-slate-100 my-1" />
                                                    <AlertDialog>
                                                        <AlertDialogTrigger asChild>
                                                            <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-rose-600 focus:text-rose-700 focus:bg-rose-50 cursor-pointer font-bold py-2.5 rounded-xl">
                                                                <Trash2 className="mr-2 h-4 w-4" /> Sil
                                                            </DropdownMenuItem>
                                                        </AlertDialogTrigger>
                                                        <AlertDialogContent className="w-[90%] max-w-sm bg-white border-slate-200 rounded-[2rem] p-6 shadow-2xl">
                                                            <AlertDialogHeader>
                                                                <AlertDialogTitle className="text-xl font-black text-slate-900">Emin misin?</AlertDialogTitle>
                                                                <AlertDialogDescription className="text-slate-500 font-medium">Bu işlem geri alınamaz ve etkinlik takvimden kalıcı olarak silinir.</AlertDialogDescription>
                                                            </AlertDialogHeader>
                                                            <AlertDialogFooter className="mt-4 gap-2 flex-row">
                                                                <AlertDialogCancel className="flex-1 border-none bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold h-12 rounded-xl m-0">İptal</AlertDialogCancel>
                                                                <AlertDialogAction className="flex-1 bg-rose-500 hover:bg-rose-600 active:bg-rose-700 text-white font-bold h-12 rounded-xl m-0" onClick={() => handleDeleteEvent(event.id)}>Sil</AlertDialogAction>
                                                            </AlertDialogFooter>
                                                        </AlertDialogContent>
                                                    </AlertDialog>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </div>
                                    </div>
                                )
                            })
                        ) : (
                            <div className="flex flex-col items-center justify-center py-20 text-center space-y-3">
                                <div className="w-20 h-20 bg-slate-100 border border-slate-200 rounded-full flex items-center justify-center shadow-inner">
                                    <CalendarIcon className="w-8 h-8 text-slate-400" />
                                </div>
                                <div>
                                    <p className="font-bold text-lg text-slate-900">Liste Boş</p>
                                    <p className="text-sm font-medium text-slate-500 px-6 mt-1">Görüntülenecek etkinlik bulunamadı.</p>
                                </div>
                            </div>
                        )}
                    </div>
                </ScrollArea>
            </div>
        </div>
      </div>

      {/* FAB: MOBİL BUTON */}
      <button 
        onClick={handleOpenNewTask}
        className="fixed bottom-6 right-5 md:hidden z-50 w-16 h-16 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white rounded-[1.5rem] shadow-xl shadow-indigo-500/30 flex items-center justify-center active:scale-90 transition-transform border border-white/20"
      >
        <Plus className="w-8 h-8" strokeWidth={2.5} />
      </button>

      {/* FORM DIALOG (Bottom Sheet on Mobile) */}
      <Dialog open={isFormDialogOpen} onOpenChange={setIsFormDialogOpen}>
          <DialogContent className="w-[95%] sm:max-w-md bg-white border-slate-200 shadow-2xl rounded-[2rem] p-6 top-[40%]">
              <DialogHeader className="text-left">
                <DialogTitle className="text-xl font-black flex items-center gap-2 text-slate-900">
                    {editingEvent ? <Edit className="w-6 h-6 text-indigo-500" /> : <Zap className="w-6 h-6 text-amber-500" />}
                    {editingEvent ? 'Etkinliği Düzenle' : 'Yeni Etkinlik'}
                </DialogTitle>
                <DialogDescription className="text-sm font-medium text-slate-500">
                    Gerekli bilgileri girerek takvimine işle.
                </DialogDescription>
              </DialogHeader>
              
              <div className="
                mt-2
                [&_label]:text-slate-500 [&_label]:font-bold [&_label]:text-[10px] [&_label]:uppercase [&_label]:tracking-wider
                [&_input]:bg-slate-50 [&_input]:border-slate-200 [&_input]:text-slate-900 [&_input]:placeholder:text-slate-400 [&_input]:h-12 [&_input]:rounded-xl [&_input]:focus:border-indigo-500 [&_input]:focus:bg-white
                [&_select]:bg-slate-50 [&_select]:border-slate-200 [&_select]:text-slate-900 [&_select]:h-12 [&_select]:rounded-xl [&_select]:focus:border-indigo-500 [&_select]:focus:bg-white
              ">
                  <NewEventForm
                      onSave={() => {
                          setIsFormDialogOpen(false);
                          setEditingEvent(null);
                          toast({ 
                              title: "Başarılı ✨", 
                              description: editingEvent ? "Değişiklikler kaydedildi." : "Etkinlik oluşturuldu.",
                              className: "bg-slate-900 text-white border-none rounded-2xl"
                          });
                      }}
                      initialData={editingEvent}
                  />
              </div>
          </DialogContent>
      </Dialog>
    </div>
  );
}