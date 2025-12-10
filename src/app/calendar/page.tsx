"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { 
  addDays, format, startOfWeek, isSameMonth, isToday, isWithinInterval, 
  isAfter, isPast, parseISO, compareAsc, compareDesc, isFuture, 
  startOfMonth, addMonths, differenceInDays, isSameDay, 
  getDate, getMonth, startOfDay, isBefore, addYears, setDate 
} from 'date-fns';
import { tr } from 'date-fns/locale';
import { 
  ChevronLeft, ChevronRight, Plus, Calendar as CalendarIcon, 
  Trash2, Edit, Clock, MoreHorizontal, MapPin, Search, Filter,
  TrendingUp, Bell, Zap, X, ArrowLeft
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
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

// --- DESIGN SYSTEM: Glassmorphism & Gradients ---
const glassColors = {
    CARD_BG: "bg-white/5 backdrop-blur-md border border-white/10 shadow-lg",
    CARD_HOVER: "hover:bg-white/10",
    TEXT_MAIN: "text-slate-100",
    TEXT_MUTED: "text-slate-400",
    BUTTON_GLASS: "bg-white/10 hover:bg-white/20 text-white border border-white/20",
    ICON_GRADIENT: "bg-gradient-to-tr from-indigo-400 to-fuchsia-400 p-2 rounded-xl shadow-md",
    HEADER_BG: "bg-slate-950/70 backdrop-blur-lg border-b border-white/5"
};

const eventStyles = [
    { indicator: "bg-blue-500", bg: "bg-blue-500/20", text: "text-blue-200", border: "border-blue-500/30" },
    { indicator: "bg-emerald-500", bg: "bg-emerald-500/20", text: "text-emerald-200", border: "border-emerald-500/30" },
    { indicator: "bg-violet-500", bg: "bg-violet-500/20", text: "text-violet-200", border: "border-violet-500/30" },
    { indicator: "bg-amber-500", bg: "bg-amber-500/20", text: "text-amber-200", border: "border-amber-500/30" },
    { indicator: "bg-rose-500", bg: "bg-rose-500/20", text: "text-rose-200", border: "border-rose-500/30" },
];

// --- HELPER COMPONENTS ---
const GlassStatCard = ({ icon: Icon, label, value, color }: any) => (
    <div className={cn("p-3 rounded-2xl flex items-center gap-3 flex-1 border border-white/5", glassColors.CARD_BG)}>
        <div className={cn("w-10 h-10 rounded-full flex items-center justify-center", color)}>
            <Icon className="w-5 h-5 text-white" />
        </div>
        <div>
            <p className={cn("text-xs font-medium uppercase tracking-wider", glassColors.TEXT_MUTED)}>{label}</p>
            <p className={cn("text-lg font-bold leading-none", glassColors.TEXT_MAIN)}>{value}</p>
        </div>
    </div>
);

const DaysLeftBadge = ({ days }: { days: number }) => {
    if (days < 0) return <Badge variant="destructive" className="px-2 bg-red-500/20 text-red-200 border-red-500/30 hover:bg-red-500/30">Süresi Geçti</Badge>;
    if (days === 0) return <Badge className="bg-emerald-500 text-white px-2 animate-pulse hover:bg-emerald-600 border-none">Bugün!</Badge>;
    if (days === 1) return <Badge className="bg-orange-500 text-white px-2 hover:bg-orange-600 border-none">Yarın</Badge>;
    if (days <= 3) return <Badge className="bg-amber-500/20 text-amber-200 px-2 border-amber-500/30 hover:bg-amber-500/30">{days} gün kaldı</Badge>;
    return <Badge variant="outline" className="border-white/20 text-slate-300 font-normal">{days} gün var</Badge>;
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
  
  // Gelecek etkinlikleri hesapla ve sırala
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

  // Takvimdeki noktalar için gerekli (görsel işaretleme)
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

  // Listede GÖSTERİLECEK etkinlikler (Değişiklik burada yapıldı: Her zaman tüm liste)
  const eventsToDisplay = upcomingEvents;

  const handlePrevMonth = () => setCurrentDate(d => addMonths(d, -1));
  const handleNextMonth = () => setCurrentDate(d => addMonths(d, 1));
  const handleToday = () => { const t = new Date(); setCurrentDate(t); setSelectedDate(t); };
  
  const handleDeleteEvent = async (eventId: string) => {
      try { await deleteCalendarEvent(eventId); toast({ title: "🗑️ Silindi", description: "Etkinlik başarıyla silindi.", variant: 'destructive' }); } 
      catch { toast({ title: "Hata", description: "Bir sorun oluştu.", variant: "destructive" }); }
  };

  const weekHeaderDays = Array.from({ length: 7 }).map((_, i) => addDays(startOfWeek(new Date(), {weekStartsOn: 1}), i));

  const handleOpenNewTask = () => {
    setEditingEvent(null);
    setIsFormDialogOpen(true);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans pb-32 md:pb-10 selection:bg-indigo-500/30 relative overflow-hidden">
      
      {/* AMBIENT BACKGROUND BLOBS */}
      <div className="fixed top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
          <div className="absolute top-[-5%] left-[20%] w-[500px] h-[500px] bg-indigo-600/20 rounded-full blur-[120px]" />
          <div className="absolute bottom-[10%] right-[-10%] w-[400px] h-[400px] bg-fuchsia-600/20 rounded-full blur-[100px]" />
      </div>

      {/* HEADER (Sticky & Glass) */}
      <div className={cn("sticky top-0 z-40 py-4 sm:px-6 transition-all duration-300", glassColors.HEADER_BG)}>
          <div className="max-w-7xl mx-auto px-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => router.back()} 
                        className={cn("rounded-full mr-1", glassColors.TEXT_MUTED, "hover:bg-white/10 hover:text-white")}
                      >
                          <ArrowLeft className="w-5 h-5" />
                      </Button>

                      <div className={glassColors.ICON_GRADIENT}>
                          <CalendarIcon className="w-6 h-6 text-white" />
                      </div>
                      <div>
                          <p className={cn("text-xs font-semibold uppercase tracking-wider", glassColors.TEXT_MUTED)}>Ajanda</p>
                          <h1 className={cn("text-lg font-bold leading-none", glassColors.TEXT_MAIN)}>
                              {format(new Date(), 'd MMMM, EEEE', {locale: tr})}
                          </h1>
                      </div>
                  </div>
                  <div className="flex items-center gap-3 w-full md:w-auto">
                      <div className="relative flex-1 md:w-64">
                          <Search className={cn("absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4", glassColors.TEXT_MUTED)} />
                          <Input 
                            placeholder="Etkinlik ara..." 
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className={cn("pl-9 rounded-xl border-white/10", glassColors.CARD_BG, glassColors.TEXT_MAIN, "placeholder:text-slate-500")} 
                          />
                      </div>
                      <Button onClick={handleOpenNewTask} className={cn("hidden md:flex rounded-full px-6", glassColors.BUTTON_GLASS)}>
                           <Plus className="w-4 h-4 mr-2" /> Ekle
                       </Button>
                  </div>
              </div>

              {/* MOBİL İSTATİSTİKLER */}
              <div className="flex gap-3 mt-4 overflow-x-auto pb-2 scrollbar-hide md:hidden">
                  <GlassStatCard icon={TrendingUp} label="Bu Ay" value={monthlyStats.thisMonth} color="bg-blue-600/50" />
                  <GlassStatCard icon={CalendarIcon} label="Toplam" value={monthlyStats.total} color="bg-emerald-600/50" />
              </div>
          </div>
      </div>

      <div className="max-w-7xl mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 relative z-10">
        
        {/* SOL KOLON: TAKVİM */}
        <div className="lg:col-span-8 space-y-4">
            <div className={cn("rounded-3xl p-1", glassColors.CARD_BG)}>
                {/* Calendar Navigation */}
                <div className="flex items-center justify-between px-4 py-4 border-b border-white/5">
                    <h2 className={cn("text-xl font-bold capitalize pl-2", glassColors.TEXT_MAIN)}>
                        {format(currentDate, 'MMMM yyyy', { locale: tr })}
                    </h2>
                    <div className="flex gap-1 bg-black/20 rounded-full p-1 border border-white/5">
                        <Button variant="ghost" size="icon" onClick={handlePrevMonth} className={cn("rounded-full w-8 h-8", glassColors.TEXT_MUTED, "hover:text-white hover:bg-white/10")}><ChevronLeft className="w-5 h-5" /></Button>
                        <Button variant="ghost" size="sm" onClick={handleToday} className={cn("rounded-full px-3 text-xs font-medium", glassColors.TEXT_MUTED, "hover:text-white hover:bg-white/10")}>Bugün</Button>
                        <Button variant="ghost" size="icon" onClick={handleNextMonth} className={cn("rounded-full w-8 h-8", glassColors.TEXT_MUTED, "hover:text-white hover:bg-white/10")}><ChevronRight className="w-5 h-5" /></Button>
                    </div>
                </div>

                {/* Calendar Grid */}
                <div className="p-2 sm:p-4">
                    <div className="grid grid-cols-7 mb-2">
                         {weekHeaderDays.map(day => (
                            <div key={day.toISOString()} className={cn("text-center text-[11px] font-bold uppercase tracking-widest py-2", glassColors.TEXT_MUTED)}>
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
                                        "aspect-[1/1.1] sm:aspect-square rounded-2xl flex flex-col items-center justify-center cursor-pointer transition-all duration-200 relative border",
                                        !isCurrentMonth ? "opacity-30 border-transparent" : "border-transparent",
                                        hasEvents && !isSelected && "bg-white/5 border-white/5 hover:bg-white/10",
                                        isDayToday && !isSelected && "ring-1 ring-indigo-500/50 bg-indigo-500/10 text-indigo-300",
                                        isSelected 
                                            ? "bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-500/40 scale-105 z-10 border-transparent" 
                                            : "hover:bg-white/5 text-slate-400 hover:text-slate-200"
                                    )}
                                >
                                    <span className={cn("text-sm font-semibold", isSelected && "text-white")}>
                                        {format(day, 'd')}
                                    </span>
                                    
                                    {/* Event Dots */}
                                    <div className="flex gap-0.5 mt-1.5 h-1.5 justify-center">
                                        {dayEvents.slice(0, 3).map((_, i) => (
                                            <div key={i} className={cn("w-1 h-1 rounded-full", isSelected ? "bg-white" : eventStyles[i % eventStyles.length].indicator)} />
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
        <div className="lg:col-span-4 space-y-4">
            
            {/* Filter Chips (Glass) */}
            <div className={cn("flex p-1 rounded-xl", glassColors.CARD_BG)}>
                <button onClick={() => setFilterType('all')} className={cn("flex-1 py-1.5 text-xs font-medium rounded-lg transition-all", filterType === 'all' ? "bg-white/10 text-white shadow-sm" : glassColors.TEXT_MUTED + " hover:text-slate-300")}>Tümü</button>
                <button onClick={() => setFilterType('recurring')} className={cn("flex-1 py-1.5 text-xs font-medium rounded-lg transition-all", filterType === 'recurring' ? "bg-white/10 text-white shadow-sm" : glassColors.TEXT_MUTED + " hover:text-slate-300")}>Düzenli</button>
                <button onClick={() => setFilterType('one-time')} className={cn("flex-1 py-1.5 text-xs font-medium rounded-lg transition-all", filterType === 'one-time' ? "bg-white/10 text-white shadow-sm" : glassColors.TEXT_MUTED + " hover:text-slate-300")}>Tek Sefer</button>
            </div>

            {/* Event List Container */}
            <div className={cn("rounded-3xl flex flex-col h-[750px] overflow-hidden", glassColors.CARD_BG)}>
                <div className="p-5 border-b border-white/5 flex justify-between items-center bg-white/5">
                      <div>
                        <h3 className={cn("font-bold", glassColors.TEXT_MAIN)}>
                             {searchQuery ? "Arama Sonuçları" : "Yaklaşan Etkinlikler"}
                        </h3>
                        <p className={cn("text-xs mt-0.5", glassColors.TEXT_MUTED)}>
                             {searchQuery ? "Bulunan kayıtlar listeleniyor." : "Tüm aktif planlarınız ve önemli günler."}
                        </p>
                      </div>
                      {!searchQuery && (
                          <Badge variant="outline" className="border-white/20 text-slate-300">
                              {eventsToDisplay.length} Plan
                          </Badge>
                      )}
                </div>

                <ScrollArea className="flex-1">
                    <div className="p-4 space-y-3">
                        {eventsToDisplay.length > 0 ? (
                            eventsToDisplay.map((event, index) => {
                                const style = eventStyles[index % eventStyles.length];
                                return (
                                    <div 
                                        key={event.id} 
                                        className={cn(
                                            "group relative rounded-2xl p-3 border transition-all duration-200",
                                            "bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/20 hover:shadow-lg"
                                        )}
                                    >
                                        <div className="flex gap-3">
                                            {/* Date Box */}
                                            <div className={cn(
                                                "flex flex-col items-center justify-center w-12 h-14 rounded-xl flex-shrink-0 border",
                                                style.bg, style.border
                                            )}>
                                                <span className={cn("text-sm font-bold", style.text)}>{format(event.displayDate, 'd')}</span>
                                                <span className={cn("text-[10px] uppercase font-semibold opacity-70", style.text)}>{format(event.displayDate, 'MMM', {locale: tr})}</span>
                                            </div>

                                            <div className="flex-1 min-w-0 py-0.5">
                                                <div className="flex justify-between items-start gap-2">
                                                    <h4 className={cn("font-semibold truncate text-sm", glassColors.TEXT_MAIN)}>{event.title}</h4>
                                                    {event.recurrence === 'one-time' && (
                                                        <DaysLeftBadge days={event.daysLeft} />
                                                    )}
                                                </div>
                                                
                                                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5">
                                                    <div className={cn("flex items-center gap-1 text-xs", glassColors.TEXT_MUTED)}>
                                                        <Clock className="w-3 h-3" />
                                                        <span>
                                                            {event.recurrence === 'one-time' ? 'Tek Sefer' : 
                                                             event.recurrence === 'monthly' ? 'Her Ay' : 'Her Yıl'}
                                                        </span>
                                                    </div>
                                                    {event.location && (
                                                        <div className={cn("flex items-center gap-1 text-xs", glassColors.TEXT_MUTED)}>
                                                            <MapPin className="w-3 h-3" />
                                                            <span className="truncate max-w-[80px]">{event.location}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" className={cn("h-7 w-7 p-0 rounded-full absolute top-2 right-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity", glassColors.TEXT_MUTED, "hover:text-white hover:bg-white/10")}>
                                                        <MoreHorizontal className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end" className="w-32 bg-slate-900 border-white/10 text-slate-100">
                                                    <DropdownMenuItem onClick={() => { setEditingEvent(event); setIsFormDialogOpen(true); }} className="hover:bg-white/10 cursor-pointer">
                                                        <Edit className="mr-2 h-4 w-4" /> Düzenle
                                                    </DropdownMenuItem>
                                                    <AlertDialog>
                                                        <AlertDialogTrigger asChild>
                                                            <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-rose-500 focus:text-rose-400 focus:bg-rose-500/10 cursor-pointer">
                                                                <Trash2 className="mr-2 h-4 w-4" /> Sil
                                                            </DropdownMenuItem>
                                                        </AlertDialogTrigger>
                                                        <AlertDialogContent className="bg-slate-900 border-white/10 text-slate-100">
                                                            <AlertDialogHeader>
                                                                <AlertDialogTitle>Emin misin?</AlertDialogTitle>
                                                                <AlertDialogDescription className={glassColors.TEXT_MUTED}>Bu işlem geri alınamaz.</AlertDialogDescription>
                                                            </AlertDialogHeader>
                                                            <AlertDialogFooter>
                                                                <AlertDialogCancel className="border-white/10 bg-white/5 text-slate-100 hover:bg-white/10">İptal</AlertDialogCancel>
                                                                <AlertDialogAction className="bg-rose-600 text-white hover:bg-rose-700" onClick={() => handleDeleteEvent(event.id)}>Sil</AlertDialogAction>
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
                                <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center">
                                    <Zap className="w-8 h-8 text-slate-600" />
                                </div>
                                <div>
                                    <p className={cn("font-medium", glassColors.TEXT_MAIN)}>Liste Boş</p>
                                    <p className={cn("text-xs px-6", glassColors.TEXT_MUTED)}>Görüntülenecek etkinlik bulunamadı.</p>
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
        className="fixed bottom-24 right-6 sm:hidden z-[100] w-14 h-14 bg-white text-slate-900 rounded-full shadow-2xl shadow-white/20 flex items-center justify-center active:scale-95 transition-transform"
      >
        <Plus className="w-7 h-7" />
      </button>

      {/* FORM DIALOG */}
      <Dialog open={isFormDialogOpen} onOpenChange={setIsFormDialogOpen}>
          <DialogContent className="sm:max-w-md bg-slate-900 border-white/10 shadow-2xl rounded-3xl text-slate-100">
              <DialogHeader>
                <DialogTitle className="text-xl font-bold flex items-center gap-2">
                    {editingEvent ? <Edit className="w-5 h-5 text-blue-400" /> : <Zap className="w-5 h-5 text-orange-400" />}
                    {editingEvent ? 'Etkinliği Düzenle' : 'Yeni Etkinlik'}
                </DialogTitle>
                <DialogDescription className={glassColors.TEXT_MUTED}>
                    Gerekli bilgileri girerek takvimine işle.
                </DialogDescription>
              </DialogHeader>
              
              <div className="
                text-slate-100
                [&_label]:text-slate-300 [&_label]:font-medium
                [&_input]:bg-white/5 [&_input]:border-white/10 [&_input]:text-slate-100 [&_input]:placeholder:text-slate-500
                [&_select]:bg-white/5 [&_select]:border-white/10 [&_select]:text-slate-100
                [&_button]:shadow-sm
              ">
                  <NewEventForm
                      onSave={() => {
                          setIsFormDialogOpen(false);
                          setEditingEvent(null);
                          toast({ 
                              title: "Başarılı ✨", 
                              description: editingEvent ? "Değişiklikler kaydedildi." : "Etkinlik oluşturuldu.",
                              className: "bg-slate-900 border-white/10 text-slate-100 shadow-lg"
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