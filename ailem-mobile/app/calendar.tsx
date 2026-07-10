import { 
  View, 
  Text, 
  ScrollView, 
  TouchableOpacity, 
  ActivityIndicator, 
  TextInput, 
  Modal, 
  Alert,
  StyleSheet,
  Dimensions,
  Platform
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import DateTimePicker from '@react-native-community/datetimepicker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useEffect, useState, useMemo } from 'react';
import { 
  onCalendarEventsUpdate, 
  addCalendarEvent, 
  updateCalendarEvent, 
  deleteCalendarEvent,
  onBillsUpdate,
  payBill
} from '../lib/dataService';
import { CalendarEvent, Bill } from '../lib/data';
import { 
  Calendar as CalendarIcon, 
  Clock, 
  MapPin, 
  Plus, 
  MoreHorizontal, 
  Search, 
  ChevronLeft, 
  ChevronRight, 
  Trash2, 
  Edit, 
  X, 
  Check, 
  AlertCircle,
  Bell
} from 'lucide-react-native';
import { 
  format, 
  parseISO, 
  startOfDay, 
  isBefore, 
  setDate, 
  getDate, 
  addMonths, 
  getMonth, 
  addYears, 
  differenceInDays, 
  isSameMonth, 
  isToday, 
  isSameDay, 
  startOfMonth, 
  startOfWeek, 
  addDays, 
  addWeeks, 
  isWithinInterval, 
  compareAsc, 
  subMonths,
  isAfter
} from 'date-fns';
import { tr } from 'date-fns/locale';
import { useRouter, Stack } from 'expo-router';

// Theme Configuration
const THEME = {
  bg: '#fef9e7', // soft yellow/cream
  primary: '#e29b12', // gold/amber
  primaryDark: '#c2840c',
  secondary: '#16a085', // emerald accent
  textMain: '#1e293b',
  textMuted: '#64748b',
  border: '#f1f5f9',
  cardBg: '#ffffff',
  rose: '#f43f5e',
  blue: '#3b82f6',
  emerald: '#10b981',
  amber: '#f59e0b',
  slate: '#64748b'
};

const CATEGORIES = [
  { name: 'Genel', colorClass: 'bg-slate-500', hex: THEME.slate },
  { name: 'İş/Okul', colorClass: 'bg-blue-500', hex: THEME.blue },
  { name: 'Doğum Günü', colorClass: 'bg-rose-500', hex: THEME.rose },
  { name: 'Tatil', colorClass: 'bg-emerald-500', hex: THEME.emerald },
  { name: 'Sağlık', colorClass: 'bg-amber-500', hex: THEME.amber }
];

export default function CalendarScreen() {
  const router = useRouter();

  // Calendar data
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [bills, setBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter and view states
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'recurring' | 'one-time'>('all');
  const [viewMode, setViewMode] = useState<'month' | 'week' | 'day'>('month');

  // Form Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);

  // Form input states
  const [formTitle, setFormTitle] = useState('');
  const [formRecurrence, setFormRecurrence] = useState<'one-time' | 'monthly' | 'yearly'>('one-time');
  const [formStartDate, setFormStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [formStartTime, setFormStartTime] = useState('');
  const [formEndDate, setFormEndDate] = useState('');
  const [formEndTime, setFormEndTime] = useState('');
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);
  const [formCategory, setFormCategory] = useState('Genel');
  const [formColor, setFormColor] = useState('bg-slate-500 text-white');
  const [formReminder, setFormReminder] = useState(0);
  const [formLocation, setFormLocation] = useState('');

  // Dual Data Subscription
  useEffect(() => {
    let unsubscribeEvents: any;
    let unsubscribeBills: any;

    try {
      unsubscribeEvents = onCalendarEventsUpdate((data: CalendarEvent[]) => {
        setCalendarEvents(data);
        setLoading(false);
      });
      unsubscribeBills = onBillsUpdate((data: Bill[]) => {
        setBills(data);
      });
    } catch (e) {
      console.log('Error fetching data:', e);
      setLoading(false);
    }

    return () => {
      if (typeof unsubscribeEvents === 'function') unsubscribeEvents();
      if (typeof unsubscribeBills === 'function') unsubscribeBills();
    };
  }, []);

  // Process and sort all calendar + virtual bill events
  const { processedEvents, upcomingEvents, monthlyStats } = useMemo(() => {
    const today = startOfDay(new Date());

    // 1. Process standard events and calculate recurrence dates & days left
    const normEvents = calendarEvents.map(e => {
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
        isVirtual: false
      };
    });

    // 2. Process unpaid bills as virtual events
    const virtualBillEvents = bills.filter(b => !b.isPaid).map(b => {
      const originalDate = parseISO(b.dueDate);
      return {
        id: `bill-${b.id}`,
        familyId: b.familyId,
        title: `${b.title} (Fatura)`,
        startDate: b.dueDate,
        endDate: undefined as string | undefined,
        category: 'Fatura',
        recurrence: 'one-time' as const,
        color: 'bg-rose-50 text-rose-600 border-rose-200',
        displayDate: originalDate,
        daysLeft: differenceInDays(originalDate, today),
        isVirtual: true,
        originalBill: b
      };
    });

    const allEvents = [...normEvents, ...virtualBillEvents];

    // Filter and Sort for list views
    const filtered = allEvents
      .filter(e => {
        const matchesSearch = e.title.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesType = filterType === 'all' 
          ? true 
          : filterType === 'recurring' 
            ? (e.recurrence === 'monthly' || e.recurrence === 'yearly')
            : e.recurrence === 'one-time';
        // Hide past one-time events
        const isNotPast = e.recurrence === 'one-time' ? (isAfter(e.displayDate, today) || isSameDay(e.displayDate, today)) : true;

        return matchesSearch && matchesType && isNotPast;
      })
      .sort((a, b) => compareAsc(a.displayDate, b.displayDate));

    const stats = {
      total: filtered.length,
      thisMonth: filtered.filter(e => isSameMonth(e.displayDate, new Date())).length
    };

    return { 
      processedEvents: allEvents, 
      upcomingEvents: filtered, 
      monthlyStats: stats 
    };
  }, [calendarEvents, bills, searchQuery, filterType]);

  // Generate calendar grid dates
  const displayedDaysMonth = useMemo(() => {
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

  const displayedDaysWeek = useMemo(() => {
    const startDate = startOfWeek(currentDate, { weekStartsOn: 1 });
    const days = [];
    let day = startDate;
    for (let i = 0; i < 7; i++) {
      days.push(day);
      day = addDays(day, 1);
    }
    return days;
  }, [currentDate]);

  // Fetch events for a specific day
  const getEventsForDay = (day: Date) => {
    return processedEvents.filter(event => {
      const eventStartDate = parseISO(event.startDate);
      if (isBefore(day, startOfDay(eventStartDate))) return false;

      switch (event.recurrence) {
        case 'one-time':
          if (event.endDate) {
            const eventEndDate = parseISO(event.endDate);
            return isWithinInterval(day, { start: startOfDay(eventStartDate), end: startOfDay(eventEndDate) });
          }
          return isSameDay(eventStartDate, day);
        case 'monthly':
          return getDate(eventStartDate) === getDate(day);
        case 'yearly':
          return getDate(eventStartDate) === getDate(day) && getMonth(eventStartDate) === getMonth(day);
        default:
          return false;
      }
    });
  };

  // Date Navigation handlers
  const handlePrev = () => {
    if (viewMode === 'month') setCurrentDate(d => addMonths(d, -1));
    else if (viewMode === 'week') setCurrentDate(d => addWeeks(d, -1));
    else setCurrentDate(d => addDays(d, -1));
  };

  const handleNext = () => {
    if (viewMode === 'month') setCurrentDate(d => addMonths(d, 1));
    else if (viewMode === 'week') setCurrentDate(d => addWeeks(d, 1));
    else setCurrentDate(d => addDays(d, 1));
  };

  const handleToday = () => {
    const t = new Date();
    setCurrentDate(t);
    setSelectedDate(t);
  };

  // Color Mapping Helper
  const getEventColors = (colorString?: string, category?: string, isVirtual?: boolean) => {
    if (isVirtual) {
      return { 
        bg: '#ffe4e6', 
        text: '#e11d48', 
        border: '#fecdd3' 
      };
    }
    const color = colorString || '';
    if (color.includes('blue-500')) return { bg: '#eff6ff', text: '#3b82f6', border: '#bfdbfe' };
    if (color.includes('rose-500')) return { bg: '#fff1f2', text: '#f43f5e', border: '#fecdd3' };
    if (color.includes('emerald-500')) return { bg: '#ecfdf5', text: '#10b981', border: '#a7f3d0' };
    if (color.includes('amber-500')) return { bg: '#fffbeb', text: '#f59e0b', border: '#fde68a' };
    if (color.includes('slate-500')) return { bg: '#f8fafc', text: '#64748b', border: '#e2e8f0' };

    // Fallback category detection
    const cat = (category || 'Genel').toLowerCase();
    if (cat.includes('iş') || cat.includes('okul')) return { bg: '#eff6ff', text: '#3b82f6', border: '#bfdbfe' };
    if (cat.includes('doğum')) return { bg: '#fff1f2', text: '#f43f5e', border: '#fecdd3' };
    if (cat.includes('tatil')) return { bg: '#ecfdf5', text: '#10b981', border: '#a7f3d0' };
    if (cat.includes('sağlık')) return { bg: '#fffbeb', text: '#f59e0b', border: '#fde68a' };

    return { bg: '#f8fafc', text: '#64748b', border: '#e2e8f0' };
  };

  // Modal Open Handlers
  const handleOpenAddModal = () => {
    setEditingEvent(null);
    setFormTitle('');
    setFormRecurrence('one-time');
    setFormStartDate(format(selectedDate, 'yyyy-MM-dd'));
    setFormStartTime('');
    setFormEndDate('');
    setFormEndTime('');
    setFormCategory('Genel');
    setFormColor('bg-slate-500 text-white');
    setFormReminder(0);
    setFormLocation('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (event: CalendarEvent) => {
    setEditingEvent(event);
    setFormTitle(event.title);
    setFormRecurrence(event.recurrence);
    setFormStartDate(event.startDate);
    setFormStartTime(event.startTime || '');
    setFormEndDate(event.endDate || '');
    setFormEndTime(event.endTime || '');
    setFormCategory(event.category || 'Genel');
    setFormColor(event.color || 'bg-slate-500 text-white');
    setFormReminder(event.reminderMinutes || 0);
    setFormLocation(event.location || '');
    setIsModalOpen(true);
  };

  // Firebase Submit handlers
  const handleSaveEvent = async () => {
    if (!formTitle.trim()) {
      Alert.alert('Hata', 'Lütfen etkinlik başlığı girin.');
      return;
    }

    // YYYY-MM-DD Date string validation
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(formStartDate)) {
      Alert.alert('Hata', 'Lütfen geçerli bir başlangıç tarihi girin (YYYY-AA-GG).');
      return;
    }

    if (formEndDate && !dateRegex.test(formEndDate)) {
      Alert.alert('Hata', 'Lütfen geçerli bir bitiş tarihi girin (YYYY-AA-GG).');
      return;
    }

    const eventData: Omit<CalendarEvent, 'id' | 'familyId'> = {
      title: formTitle,
      recurrence: formRecurrence,
      startDate: formStartDate,
      startTime: formStartTime ? formStartTime : undefined,
      endDate: formEndDate ? formEndDate : undefined,
      endTime: formEndTime ? formEndTime : undefined,
      category: formCategory,
      color: formColor,
      reminderMinutes: formReminder,
      location: formLocation || undefined
    };

    try {
      if (editingEvent) {
        await updateCalendarEvent(editingEvent.id, eventData);
        Alert.alert('Başarılı ✨', 'Etkinlik başarıyla güncellendi.');
      } else {
        await addCalendarEvent(eventData);
        Alert.alert('Başarılı ✨', 'Etkinlik başarıyla oluşturuldu.');
      }
      setIsModalOpen(false);
    } catch (e) {
      console.log('Error saving event:', e);
      Alert.alert('Hata', 'İşlem tamamlanırken bir hata oluştu.');
    }
  };

  const handleDeleteEvent = (eventId: string) => {
    Alert.alert(
      'Etkinliği Sil',
      'Bu etkinliği takvimden silmek istediğinize emin misiniz?',
      [
        { text: 'İptal', style: 'cancel' },
        { 
          text: 'Sil', 
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteCalendarEvent(eventId);
              Alert.alert('Silindi', 'Etkinlik silindi.');
            } catch (e) {
              console.log('Error deleting event:', e);
              Alert.alert('Hata', 'Etkinlik silinirken bir hata oluştu.');
            }
          }
        }
      ]
    );
  };

  // Helper: Days Left badge styles
  const renderDaysLeftText = (days: number) => {
    if (days < 0) return 'Süresi Geçti';
    if (days === 0) return 'Bugün!';
    if (days === 1) return 'Yarın';
    return `${days} gün kaldı`;
  };

  const getDaysLeftColor = (days: number) => {
    if (days < 0) return { bg: '#ffe4e6', text: '#e11d48' }; // Rose
    if (days === 0) return { bg: '#10b981', text: '#ffffff' }; // Emerald green (pulse equivalent)
    if (days === 1) return { bg: '#f59e0b', text: '#ffffff' }; // Amber yellow
    return { bg: '#f1f5f9', text: '#64748b' }; // Muted Slate
  };

  // Render Views
  const renderMonthView = () => {
    const weekHeaderDays = Array.from({ length: 7 }).map((_, i) => addDays(startOfWeek(new Date(), { weekStartsOn: 1 }), i));

    return (
      <View className="px-2">
        {/* Month grid headers */}
        <View className="flex-row mb-2">
          {weekHeaderDays.map((day, idx) => (
            <View key={idx} className="flex-1 items-center py-2">
              <Text className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                {format(day, 'EEE', { locale: tr })}
              </Text>
            </View>
          ))}
        </View>

        {/* Days cells */}
        <View className="flex-row flex-wrap">
          {displayedDaysMonth.map((day, idx) => {
            const dayEvents = getEventsForDay(day);
            const isSelected = isSameDay(day, selectedDate);
            const isCurrentMonth = isSameMonth(day, currentDate);
            const isDayToday = isToday(day);
            const hasEvents = dayEvents.length > 0;

            return (
              <TouchableOpacity
                key={idx}
                onPress={() => {
                  setSelectedDate(day);
                  setCurrentDate(day);
                }}
                style={[
                  styles.dayCell,
                  !isCurrentMonth && { opacity: 0.25 },
                  isDayToday && !isSelected && { borderColor: THEME.primary, borderWidth: 2, backgroundColor: '#fef3c7' },
                  isSelected && { backgroundColor: '#fef3c7', borderColor: THEME.primary, borderWidth: 1 }
                ]}
              >
                <Text 
                  style={[
                    styles.dayText,
                    isDayToday && { color: THEME.primary, fontWeight: 'bold' },
                    isSelected && { color: THEME.primaryDark, fontWeight: 'bold' }
                  ]}
                >
                  {format(day, 'd')}
                </Text>

                {/* Event indicators (dots) */}
                <View className="flex-row flex-wrap justify-center mt-1 w-full gap-0.5 px-0.5">
                  {dayEvents.slice(0, 4).map((ev, eIdx) => {
                    const colors = getEventColors(ev.color, ev.category, ev.isVirtual);
                    return (
                      <View 
                        key={eIdx} 
                        style={{ 
                          width: 5, 
                          height: 5, 
                          borderRadius: 2.5, 
                          backgroundColor: colors.text 
                        }} 
                      />
                    );
                  })}
                  {dayEvents.length > 4 && (
                    <Text className="text-[7px] text-slate-400 font-extrabold leading-none">+</Text>
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    );
  };

  const renderWeekView = () => {
    return (
      <View className="px-2">
        {/* Horizontal Week strip */}
        <View className="flex-row justify-between mb-4">
          {displayedDaysWeek.map((day, idx) => {
            const isSelected = isSameDay(day, selectedDate);
            const isDayToday = isToday(day);
            const dayEvents = getEventsForDay(day);

            return (
              <TouchableOpacity
                key={idx}
                onPress={() => setSelectedDate(day)}
                style={[
                  styles.weekDayButton,
                  isSelected && { backgroundColor: THEME.primary, borderColor: THEME.primary },
                  isDayToday && !isSelected && { borderColor: THEME.primary, borderWidth: 1 }
                ]}
              >
                <Text 
                  className="text-[9px] uppercase font-bold text-center"
                  style={{ color: isSelected ? 'white' : THEME.textMuted }}
                >
                  {format(day, 'EEE', { locale: tr })}
                </Text>
                <Text 
                  className="text-sm font-black text-center mt-1"
                  style={{ color: isSelected ? 'white' : (isDayToday ? THEME.primary : THEME.textMain) }}
                >
                  {format(day, 'd')}
                </Text>

                {/* Small indicator bar */}
                {dayEvents.length > 0 && (
                  <View 
                    style={[
                      styles.weekIndicatorBar, 
                      { backgroundColor: isSelected ? 'white' : THEME.secondary }
                    ]} 
                  />
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Short info */}
        <Text className="text-slate-500 font-bold text-xxs mb-2 uppercase px-1">
          {format(selectedDate, 'd MMMM yyyy, EEEE', { locale: tr })} Planları
        </Text>
        
        {/* Event details list for focused day in week view */}
        <View className="mt-1">
          {getEventsForDay(selectedDate).length === 0 ? (
            <View className="bg-white rounded-3xl p-5 items-center justify-center border border-slate-100">
              <Text className="text-slate-400 text-xs font-bold">Bu gün için bir etkinlik bulunmuyor.</Text>
            </View>
          ) : (
            getEventsForDay(selectedDate).map(ev => renderEventCard(ev))
          )}
        </View>
      </View>
    );
  };

  const renderDayView = () => {
    const dayEvents = getEventsForDay(selectedDate);
    
    // Virtual calendar timeline 08:00 - 20:00
    const hours = Array.from({ length: 13 }).map((_, i) => i + 8);

    return (
      <View className="px-2">
        <Text className="text-slate-500 font-bold text-xxs mb-4 uppercase px-1">
          Zaman Çizelgesi ({format(selectedDate, 'd MMMM, EEEE', { locale: tr })})
        </Text>

        {hours.map((hour, idx) => {
          return (
            <View key={idx} className="flex-row border-b border-slate-100 min-h-[60px] py-1">
              <View className="w-12 items-center justify-start pt-1 border-r border-slate-100/50 pr-2">
                <Text className="text-[10px] font-black text-slate-400">{hour}:00</Text>
              </View>
              <View className="flex-1 pl-3 justify-center">
                {hour === 8 && dayEvents.map(ev => renderEventCard(ev))}
                {hour !== 8 && (
                  <Text className="text-slate-300 text-[10px] italic">Boş Zaman Dilimi</Text>
                )}
              </View>
            </View>
          );
        })}
      </View>
    );
  };

  // Event Card Component
  const renderEventCard = (event: any) => {
    const colors = getEventColors(event.color, event.category, event.isVirtual);
    const date = parseISO(event.startDate);

    return (
      <View 
        key={event.id}
        style={[
          styles.eventCard, 
          { borderColor: colors.border }
        ]}
      >
        {/* Left colored anchor box */}
        <View 
          style={[
            styles.eventCardAnchor, 
            { backgroundColor: colors.text }
          ]}
        >
          <Text className="text-white font-extrabold text-[9px] uppercase">
            {format(event.displayDate || date, 'EEE', { locale: tr })}
          </Text>
          <Text className="text-white font-black text-md leading-none mt-0.5">
            {format(event.displayDate || date, 'd')}
          </Text>
          <Text className="text-white/80 text-[8px] uppercase font-bold mt-0.5">
            {format(event.displayDate || date, 'MMM', { locale: tr })}
          </Text>
        </View>

        {/* Card info */}
        <View className="flex-1 p-3 justify-between">
          <View>
            <View className="flex-row justify-between items-start">
              <Text className="text-slate-800 font-extrabold text-sm flex-1 mr-1" numberOfLines={2}>
                {event.title}
              </Text>
              
              {/* Days left indicator */}
              <View 
                style={[
                  styles.daysLeftBadge, 
                  { backgroundColor: getDaysLeftColor(event.daysLeft).bg }
                ]}
              >
                <Text 
                  style={[
                    styles.daysLeftBadgeText, 
                    { color: getDaysLeftColor(event.daysLeft).text }
                  ]}
                >
                  {renderDaysLeftText(event.daysLeft)}
                </Text>
              </View>
            </View>

            {/* Badges row */}
            <View className="flex-row flex-wrap items-center mt-1 gap-1">
              {event.category && (
                <View className="bg-slate-100 px-1.5 py-0.5 rounded-md">
                  <Text className="text-slate-500 text-[8px] font-extrabold uppercase">{event.category}</Text>
                </View>
              )}
              {event.recurrence !== 'one-time' && (
                <View className="bg-fuchsia-100 px-1.5 py-0.5 rounded-md flex-row items-center">
                  <Clock size={8} color="#d946ef" className="mr-0.5" />
                  <Text className="text-fuchsia-600 text-[8px] font-extrabold uppercase">
                    {event.recurrence === 'monthly' ? 'Her Ay' : 'Her Yıl'}
                  </Text>
                </View>
              )}
              {(event.reminderMinutes || 0) > 0 && (
                <View className="bg-amber-100 px-1.5 py-0.5 rounded-md flex-row items-center">
                  <Bell size={8} color="#d97706" className="mr-0.5" />
                  <Text className="text-amber-700 text-[8px] font-extrabold uppercase">Hatırlatıcı</Text>
                </View>
              )}
            </View>
          </View>

          {/* Details & Actions Footer */}
          <View className="mt-2 flex-row items-center justify-between">
            <View className="flex-row items-center flex-1 mr-2">
              <Clock size={10} color="#94a3b8" />
              <Text className="text-slate-400 text-[9px] font-semibold ml-1">
                {event.recurrence === 'one-time' ? 'Tek Sefer' : 'Tekrarlanan'}
              </Text>
              {event.location && (
                <View className="flex-row items-center ml-3 flex-1">
                  <MapPin size={10} color="#94a3b8" />
                  <Text className="text-slate-400 text-[9px] font-semibold ml-0.5 truncate" numberOfLines={1}>
                    {event.location}
                  </Text>
                </View>
              )}
            </View>

            {/* Edit / Delete Buttons (only for actual events) */}
            {!event.isVirtual && (
              <View className="flex-row gap-1">
                <TouchableOpacity 
                  onPress={() => handleOpenEditModal(event)}
                  className="p-1.5 rounded-full bg-slate-100 hover:bg-slate-200 active:scale-90"
                >
                  <Edit size={12} color={THEME.textMuted} />
                </TouchableOpacity>
                <TouchableOpacity 
                  onPress={() => handleDeleteEvent(event.id)}
                  className="p-1.5 rounded-full bg-rose-50 hover:bg-rose-100 active:scale-90"
                >
                  <Trash2 size={12} color={THEME.rose} />
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center" style={{ backgroundColor: THEME.bg }}>
        <ActivityIndicator size="large" color={THEME.primary} />
      </View>
    );
  }

  return (
    <LinearGradient
      colors={['#e0e7ff', '#f5f3ff', '#fae8ff']}
      style={{ flex: 1 }}
    >
      <SafeAreaView className="flex-1">
        <Stack.Screen options={{ headerShown: false }} />
        
        {/* HEADER SECTION */}
        <View className="px-5 pt-3 pb-3 flex-row justify-between items-center bg-white/70 border-b border-slate-200/40">
          <TouchableOpacity 
            onPress={() => router.push('/')} 
            className="w-10 h-10 items-center justify-center bg-white rounded-full shadow-sm"
          >
            <ChevronLeft size={22} color={THEME.primary} />
          </TouchableOpacity>
          <View className="items-center">
            <Text className="text-lg font-black text-slate-800">Takvim</Text>
            <Text className="text-[9px] text-slate-450 font-bold uppercase tracking-widest">
              {format(new Date(), 'dd MMMM yyyy, EEEE', { locale: tr })}
            </Text>
          </View>
          <View className="w-10 h-10" />
        </View>

      <ScrollView 
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 100 }} 
        showsVerticalScrollIndicator={false}
      >
        
        {/* STATS PANEL */}
        <View className="bg-white rounded-[24px] p-4 mb-4 shadow-sm border border-amber-100/50">
          <Text className="text-slate-800 font-extrabold text-xs mb-3">Genel Durum (Gelecek Planları)</Text>
          <View className="flex-row justify-between">
            <View className="flex-1 bg-amber-50 p-3 rounded-2xl mr-2 items-center">
              <Text className="text-slate-400 text-[9px] font-extrabold uppercase">Bu Ay Planları</Text>
              <Text className="text-slate-800 font-black text-xl mt-1">{monthlyStats.thisMonth}</Text>
            </View>
            <View className="flex-1 bg-teal-50 p-3 rounded-2xl ml-2 items-center">
              <Text className="text-slate-400 text-[9px] font-extrabold uppercase">Toplam Etkinlik</Text>
              <Text className="text-slate-800 font-black text-xl mt-1">{monthlyStats.total}</Text>
            </View>
          </View>
        </View>

        {/* SEARCH & FILTERS BAR */}
        <View className="bg-white rounded-3xl p-3 mb-4 shadow-sm border border-slate-100 flex-row items-center">
          <Search size={16} color={THEME.textMuted} className="ml-1" />
          <TextInput
            placeholder="Etkinlik veya fatura ara..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            className="flex-1 ml-2 text-xs font-semibold text-slate-700 py-1"
            placeholderTextColor="#94a3b8"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} className="p-1">
              <X size={14} color={THEME.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        {/* RECURRENCE FILTER TABS */}
        <View className="flex-row mb-4 bg-white/70 p-1 rounded-full border border-slate-200/50">
          <TouchableOpacity 
            onPress={() => setFilterType('all')}
            style={[styles.filterTabButton, filterType === 'all' && styles.filterTabButtonActive]}
          >
            <Text style={[styles.filterTabText, filterType === 'all' && styles.filterTabTextActive]}>Tümü</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            onPress={() => setFilterType('recurring')}
            style={[styles.filterTabButton, filterType === 'recurring' && styles.filterTabButtonActive]}
          >
            <Text style={[styles.filterTabText, filterType === 'recurring' && styles.filterTabTextActive]}>Düzenli</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            onPress={() => setFilterType('one-time')}
            style={[styles.filterTabButton, filterType === 'one-time' && styles.filterTabButtonActive]}
          >
            <Text style={[styles.filterTabText, filterType === 'one-time' && styles.filterTabTextActive]}>Tek Sefer</Text>
          </TouchableOpacity>
        </View>

        {/* VIEW SELECTOR SWITCH */}
        <View className="flex-row justify-between items-center mb-4 bg-slate-100 p-1 rounded-full border border-slate-200/40">
          <TouchableOpacity 
            onPress={() => setViewMode('month')}
            style={[styles.viewTabButton, viewMode === 'month' && { backgroundColor: THEME.secondary }]}
          >
            <Text style={{ color: viewMode === 'month' ? 'white' : '#64748b', fontWeight: 'bold', fontSize: 11 }}>Ay</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            onPress={() => setViewMode('week')}
            style={[styles.viewTabButton, viewMode === 'week' && { backgroundColor: THEME.secondary }]}
          >
            <Text style={{ color: viewMode === 'week' ? 'white' : '#64748b', fontWeight: 'bold', fontSize: 11 }}>Hafta</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            onPress={() => setViewMode('day')}
            style={[styles.viewTabButton, viewMode === 'day' && { backgroundColor: THEME.secondary }]}
          >
            <Text style={{ color: viewMode === 'day' ? 'white' : '#64748b', fontWeight: 'bold', fontSize: 11 }}>Gün</Text>
          </TouchableOpacity>
        </View>

        {/* DATE GRID AND CARD CONTAINER */}
        <View className="bg-white rounded-[28px] p-4 shadow-sm border border-slate-100 mb-4">
          
          {/* Grid Navigation Header */}
          <View className="flex-row justify-between items-center px-1 mb-4 pb-3 border-b border-slate-100">
            <Text className="text-sm font-black capitalize text-slate-800">
              {viewMode === 'month' && format(currentDate, 'MMMM yyyy', { locale: tr })}
              {viewMode === 'week' && `Hafta: ${format(startOfWeek(currentDate, { weekStartsOn: 1 }), 'd MMM', { locale: tr })} - ${format(addDays(startOfWeek(currentDate, { weekStartsOn: 1 }), 6), 'd MMM', { locale: tr })}`}
              {viewMode === 'day' && format(currentDate, 'd MMMM yyyy, EEEE', { locale: tr })}
            </Text>
            
            <View className="flex-row items-center bg-slate-100 rounded-full p-0.5">
              <TouchableOpacity onPress={handlePrev} className="p-1 rounded-full active:bg-white">
                <ChevronLeft size={16} color={THEME.textMain} />
              </TouchableOpacity>
              <TouchableOpacity onPress={handleToday} className="px-2 py-0.5 rounded-full active:bg-white">
                <Text className="text-[10px] font-bold text-slate-600">Bugün</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleNext} className="p-1 rounded-full active:bg-white">
                <ChevronRight size={16} color={THEME.textMain} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Render Calendar grid depending on View Mode */}
          {viewMode === 'month' && renderMonthView()}
          {viewMode === 'week' && renderWeekView()}
          {viewMode === 'day' && renderDayView()}

        </View>

        {/* SELECTED DAY EVENTS DETAILS LIST (ONLY IN MONTH VIEW) */}
        {viewMode === 'month' && (
          <View>
            <View className="flex-row justify-between items-center mb-3 px-1">
              <Text className="text-slate-800 font-extrabold text-sm">
                {format(selectedDate, 'd MMMM', { locale: tr })} Planları
              </Text>
              <Text className="text-slate-400 text-xxs font-bold">
                {getEventsForDay(selectedDate).length} Plan
              </Text>
            </View>

            {getEventsForDay(selectedDate).length === 0 ? (
              <View className="bg-white rounded-[24px] p-8 items-center justify-center border border-slate-100/50 shadow-sm">
                <CalendarIcon size={32} color="#cbd5e1" className="mb-2" />
                <Text className="text-slate-400 text-xs font-bold text-center">
                  Bu güne ait planlanmış etkinlik veya ödenmemiş fatura bulunmuyor.
                </Text>
              </View>
            ) : (
              getEventsForDay(selectedDate).map(ev => renderEventCard(ev))
            )}
          </View>
        )}

        {/* ALL UPCOMING LIST (BOTTOM VIEW) */}
        <View className="mt-6">
          <Text className="text-slate-800 font-extrabold text-sm mb-3 px-1">Tüm Yaklaşan Etkinlikler</Text>
          {upcomingEvents.length === 0 ? (
            <View className="bg-white rounded-[24px] p-6 items-center justify-center border border-slate-100">
              <Text className="text-slate-400 text-xs font-bold">Görüntülenecek etkinlik bulunamadı.</Text>
            </View>
          ) : (
            upcomingEvents.slice(0, 10).map(ev => renderEventCard(ev))
          )}
        </View>

      </ScrollView>

      {/* FLOAT ADD BUTTON FOR MOBILE */}
      <TouchableOpacity 
        onPress={handleOpenAddModal}
        style={styles.fab}
      >
        <Plus size={28} color="white" />
      </TouchableOpacity>

      {/* CUSTOM ADD/EDIT EVENT MODAL (OVERLAY SHEET) */}
      <Modal
        visible={isModalOpen}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <SafeAreaView style={styles.modalContainer}>
            {/* Modal Header */}
            <View className="flex-row justify-between items-center pb-4 mb-4 border-b border-slate-100 px-4">
              <View className="flex-row items-center">
                <Text className="text-lg font-black text-slate-800">
                  {editingEvent ? 'Etkinliği Düzenle' : 'Yeni Etkinlik'}
                </Text>
              </View>
              <TouchableOpacity 
                onPress={() => setIsModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 items-center justify-center"
              >
                <X size={18} color={THEME.textMuted} />
              </TouchableOpacity>
            </View>

            {/* Modal Form Content */}
            <ScrollView className="px-4" showsVerticalScrollIndicator={false}>
              
              {/* Event Title */}
              <View className="mb-4">
                <Text style={styles.formLabel}>Etkinlik Başlığı</Text>
                <TextInput
                  placeholder="Örn: Diş Hekimi Randevusu"
                  value={formTitle}
                  onChangeText={setFormTitle}
                  style={styles.formInput}
                  placeholderTextColor="#94a3b8"
                />
              </View>

              {/* Recurrence Types */}
              <View className="mb-4">
                <Text style={styles.formLabel}>Tekrarlanma</Text>
                <View className="flex-row bg-slate-100 p-1 rounded-xl">
                  {(['one-time', 'monthly', 'yearly'] as const).map((rec) => (
                    <TouchableOpacity
                      key={rec}
                      onPress={() => setFormRecurrence(rec)}
                      style={[
                        styles.recurrenceBtn,
                        formRecurrence === rec && { backgroundColor: 'white' }
                      ]}
                    >
                      <Text 
                        className="text-xxs font-extrabold"
                        style={{ color: formRecurrence === rec ? THEME.textMain : THEME.textMuted }}
                      >
                        {rec === 'one-time' ? 'Tek Seferlik' : rec === 'monthly' ? 'Her Ay' : 'Her Yıl'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Date & Time Ranges */}
              <View className="mb-4">
                <Text style={styles.formLabel}>Başlangıç</Text>
                <View className="flex-row items-center gap-2">
                  <TouchableOpacity 
                    onPress={() => setShowStartDatePicker(true)}
                    style={[styles.formInput, { flex: 2, justifyContent: 'center' }]}
                  >
                    <Text className="text-slate-700 font-semibold">{formStartDate}</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    onPress={() => setShowStartTimePicker(true)}
                    style={[styles.formInput, { flex: 1, justifyContent: 'center', alignItems: 'center' }]}
                  >
                    <Text className={formStartTime ? "text-slate-700 font-semibold" : "text-slate-400 font-semibold"}>
                      {formStartTime || 'Saat'}
                    </Text>
                  </TouchableOpacity>
                  
                  {formStartTime ? (
                    <TouchableOpacity 
                      onPress={() => setFormStartTime('')}
                      className="bg-rose-100 px-3 py-3.5 rounded-xl active:bg-rose-200 justify-center"
                    >
                      <Text className="text-xxs font-extrabold text-rose-700">Sil</Text>
                    </TouchableOpacity>
                  ) : null}

                  {showStartDatePicker && (
                    <DateTimePicker
                      value={formStartDate ? new Date(formStartDate) : new Date()}
                      mode="date"
                      display="default"
                      onChange={(event, selectedDate) => {
                        setShowStartDatePicker(false);
                        if (selectedDate) {
                          setFormStartDate(format(selectedDate, 'yyyy-MM-dd'));
                        }
                      }}
                    />
                  )}

                  {showStartTimePicker && (
                    <DateTimePicker
                      value={formStartTime ? (
                        (() => { const d = new Date(); const [h,m] = formStartTime.split(':'); d.setHours(Number(h), Number(m)); return d; })()
                      ) : new Date()}
                      mode="time"
                      display="default"
                      onChange={(event, selectedDate) => {
                        setShowStartTimePicker(false);
                        if (selectedDate) {
                          setFormStartTime(format(selectedDate, 'HH:mm'));
                        }
                      }}
                    />
                  )}
                </View>
              </View>

              {formRecurrence === 'one-time' && (
                <View className="mb-4">
                  <Text style={styles.formLabel}>Bitiş (Opsiyonel)</Text>
                  <View className="flex-row items-center gap-2">
                    <TouchableOpacity 
                      onPress={() => setShowEndDatePicker(true)}
                      style={[styles.formInput, { flex: 2, justifyContent: 'center' }]}
                    >
                      <Text className={formEndDate ? "text-slate-700 font-semibold" : "text-slate-400 font-semibold"}>
                        {formEndDate ? formEndDate : 'Tarih seçin...'}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity 
                      onPress={() => setShowEndTimePicker(true)}
                      style={[styles.formInput, { flex: 1, justifyContent: 'center', alignItems: 'center' }]}
                    >
                      <Text className={formEndTime ? "text-slate-700 font-semibold" : "text-slate-400 font-semibold"}>
                        {formEndTime || 'Saat'}
                      </Text>
                    </TouchableOpacity>

                    {(formEndDate || formEndTime) ? (
                      <TouchableOpacity 
                        onPress={() => { setFormEndDate(''); setFormEndTime(''); }}
                        className="bg-rose-100 px-3 py-3.5 rounded-xl active:bg-rose-200 justify-center"
                      >
                        <Text className="text-xxs font-extrabold text-rose-700">Sil</Text>
                      </TouchableOpacity>
                    ) : null}
                  </View>

                  {showEndDatePicker && (
                    <DateTimePicker
                      value={formEndDate ? new Date(formEndDate) : (formStartDate ? new Date(formStartDate) : new Date())}
                      mode="date"
                      display="default"
                      onChange={(event, selectedDate) => {
                        setShowEndDatePicker(false);
                        if (selectedDate) {
                          setFormEndDate(format(selectedDate, 'yyyy-MM-dd'));
                        }
                      }}
                    />
                  )}

                  {showEndTimePicker && (
                    <DateTimePicker
                      value={formEndTime ? (
                        (() => { const d = new Date(); const [h,m] = formEndTime.split(':'); d.setHours(Number(h), Number(m)); return d; })()
                      ) : new Date()}
                      mode="time"
                      display="default"
                      onChange={(event, selectedDate) => {
                        setShowEndTimePicker(false);
                        if (selectedDate) {
                          setFormEndTime(format(selectedDate, 'HH:mm'));
                        }
                      }}
                    />
                  )}
                </View>
              )}

              {/* Categories */}
              <View className="mb-4">
                <Text style={styles.formLabel}>Kategori</Text>
                <View className="flex-row flex-wrap gap-2">
                  {CATEGORIES.map((cat) => {
                    const isSelected = formCategory === cat.name;
                    return (
                      <TouchableOpacity
                        key={cat.name}
                        onPress={() => {
                          setFormCategory(cat.name);
                          setFormColor(`${cat.colorClass} text-white`);
                        }}
                        style={[
                          styles.categorySelectorBtn,
                          { borderColor: cat.hex },
                          isSelected && { backgroundColor: cat.hex }
                        ]}
                      >
                        <Text 
                          className="text-xxs font-extrabold"
                          style={{ color: isSelected ? 'white' : cat.hex }}
                        >
                          {cat.name}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Reminders */}
              <View className="mb-4">
                <Text style={styles.formLabel}>Hatırlatıcı Bildirim</Text>
                <View className="flex-row flex-wrap gap-2">
                  {([
                    { label: 'Yok', value: 0 },
                    { label: '15 Dk Önce', value: 15 },
                    { label: '1 Saat Önce', value: 60 },
                    { label: '1 Gün Önce', value: 1440 }
                  ]).map((rem) => {
                    const isSelected = formReminder === rem.value;
                    return (
                      <TouchableOpacity
                        key={rem.value}
                        onPress={() => setFormReminder(rem.value)}
                        style={[
                          styles.categorySelectorBtn,
                          { borderColor: THEME.primary },
                          isSelected && { backgroundColor: THEME.primary }
                        ]}
                      >
                        <Text 
                          className="text-xxs font-extrabold"
                          style={{ color: isSelected ? 'white' : THEME.primary }}
                        >
                          {rem.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Location */}
              <View className="mb-6">
                <Text style={styles.formLabel}>Konum / Yer (Opsiyonel)</Text>
                <TextInput
                  placeholder="Örn: Merkez Kütüphane veya Zoom"
                  value={formLocation}
                  onChangeText={setFormLocation}
                  style={styles.formInput}
                  placeholderTextColor="#94a3b8"
                />
              </View>

            </ScrollView>

            {/* Modal Form Footer */}
            <View className="flex-row border-t border-slate-100 p-4 gap-3 bg-white">
              <TouchableOpacity 
                onPress={() => setIsModalOpen(false)}
                className="flex-1 bg-slate-100 py-3.5 rounded-2xl items-center justify-center active:scale-95"
              >
                <Text className="text-xs font-extrabold text-slate-700">İptal</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                onPress={handleSaveEvent}
                style={{ backgroundColor: THEME.secondary }}
                className="flex-1 py-3.5 rounded-2xl items-center justify-center active:scale-95"
              >
                <Text className="text-xs font-extrabold text-white">Kaydet</Text>
              </TouchableOpacity>
            </View>

          </SafeAreaView>
        </View>
      </Modal>
  
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  // Month view Grid cell
  dayCell: {
    width: (Dimensions.get('window').width - 48) / 7,
    aspectRatio: 1,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 2,
    borderWidth: 1,
    borderColor: 'transparent'
  },
  dayText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#334155'
  },
  // Week view Horizontal buttons
  weekDayButton: {
    flex: 1,
    aspectRatio: 0.8,
    borderRadius: 14,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 2,
    paddingVertical: 4
  },
  weekIndicatorBar: {
    width: 12,
    height: 3,
    borderRadius: 1.5,
    marginTop: 4
  },
  // Card
  eventCard: {
    backgroundColor: THEME.cardBg,
    borderRadius: 20,
    marginBottom: 12,
    flexDirection: 'row',
    overflow: 'hidden',
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.02,
    shadowRadius: 2,
    elevation: 1
  },
  eventCardAnchor: {
    width: 52,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12
  },
  daysLeftBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6
  },
  daysLeftBadgeText: {
    fontSize: 9,
    fontWeight: 'bold',
    textTransform: 'uppercase'
  },
  // Filters tab
  filterTabButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center'
  },
  filterTabButtonActive: {
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1
  },
  filterTabText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#64748b'
  },
  filterTabTextActive: {
    color: '#0f172a'
  },
  // View selector tab
  viewTabButton: {
    flex: 1,
    paddingVertical: 6,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center'
  },
  // FAB
  fab: {
    position: 'absolute',
    bottom: 30,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 20,
    backgroundColor: THEME.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 5,
    zIndex: 99
  },
  // Custom Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end'
  },
  modalContainer: {
    backgroundColor: 'white',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    maxHeight: '90%',
    paddingTop: 10
  },
  formLabel: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
    paddingLeft: 2
  },
  formInput: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 14,
    height: 48,
    paddingHorizontal: 14,
    fontSize: 12,
    color: '#0f172a',
    fontWeight: 'bold'
  },
  recurrenceBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center'
  },
  categorySelectorBtn: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center'
  }
});
