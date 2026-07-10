import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Image, TextInput, Modal, StyleSheet, Dimensions, Animated, KeyboardAvoidingView, Platform, Alert, RefreshControl, useWindowDimensions } from 'react-native';
import { useColorScheme } from 'nativewind';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useEffect, useState, useMemo, useRef } from 'react';
import { useRouter } from 'expo-router';
import { 
  BookOpen, Star, Plus, Search, ChevronLeft, ChevronRight, BarChart2, Heart, X, 
  Target, Clock, History, Calendar, Trash2, Edit, Play, CheckCircle, RotateCcw, Camera, Sparkles, BookOpenCheck, BookUp, Library, MoreVertical, Settings
} from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';

import { useAuth } from '../../context/auth-context';
import { 
  onBooksUpdate, 
  onUserLibrariesUpdate, 
  updateUserBookStatus, 
  removeBookFromMemberLibrary, 
  addReadingSession, 
  deleteReadingSession, 
  onReadingSessionsUpdate,
  getReadingSessions, 
  updateFamilyMemberInFamily,
  uploadImageToStorage
} from '../../lib/dataService';
import { Book, UserLibrary, FamilyMember, ReadingGoals, ReadingSession } from '../../lib/data';
import { format, parseISO, subDays, addDays, isSameDay, startOfWeek, endOfWeek, isWithinInterval, startOfMonth, endOfMonth, eachMonthOfInterval, getYear } from 'date-fns';
import { tr } from 'date-fns/locale';

const { width } = Dimensions.get('window');

// CSS variables / Constants equivalent in React Native (Vibrant Glassmorphic Colors)
const themeColors = {
  PAGE_BG: 'bg-[#e8f8f5] dark:bg-[#0b1b18]',
  CARD_BG: 'bg-white/60 dark:bg-white/5',
  BORDER: 'border-white/80 dark:border-white/10',
  TEXT_MAIN: 'text-slate-800 dark:text-slate-100',
  TEXT_MUTED: 'text-slate-500 dark:text-slate-400',
};

export default function LibraryScreen() {
  const { width: winWidth, height: winHeight } = useWindowDimensions();
  const isTablet = Math.min(winWidth, winHeight) >= 600;
  const isLandscape = winWidth > winHeight;
  const isTabletLandscape = isTablet && isLandscape;

  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = () => { setRefreshing(true); setTimeout(() => setRefreshing(false), 1200); };
  const router = useRouter();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const { familyId, familyMembers } = useAuth();
  
  // State
  const [allBooks, setAllBooks] = useState<Book[]>([]);
  const [userLibraries, setUserLibraries] = useState<UserLibrary[]>([]);
  const [readingSessions, setReadingSessions] = useState<ReadingSession[]>([]);
  const [selectedMember, setSelectedMember] = useState<FamilyMember | null>(null);
  const [loading, setLoading] = useState(true);

  // Modal Visibility
  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [isProgressModalOpen, setIsProgressModalOpen] = useState(false);
  const [isFinishChildModalOpen, setIsFinishChildModalOpen] = useState(false);
  const [isBookDetailModalOpen, setIsBookDetailModalOpen] = useState(false);
  const [isOptionsSheetOpen, setIsOptionsSheetOpen] = useState(false);

  // Selected Items for Actions
  const [viewingBook, setViewingBook] = useState<any | null>(null);
  const [actionBook, setActionBook] = useState<any | null>(null);
  const [editingProgressForBook, setEditingProgressForBook] = useState<any | null>(null);
  const [childBookToFinish, setChildBookToFinish] = useState<any | null>(null);
  
  // Charts & Goals Period
  const [readingStatsPeriod, setReadingStatsPeriod] = useState<'weekly' | 'monthly'>('weekly');
  const [chartReferenceDate, setChartReferenceDate] = useState(new Date());
  
  // Progress Input
  const [progressInput, setProgressInput] = useState('');
  const [isUploadingSummary, setIsUploadingSummary] = useState(false);
  const [pendingSummaryImages, setPendingSummaryImages] = useState<string[]>([]);
  const [fullScreenImage, setFullScreenImage] = useState<string | null>(null);

  // Goal Inputs
  const [dailyGoalPage, setDailyGoalPage] = useState('');
  const [weeklyGoalPage, setWeeklyGoalPage] = useState('');
  const [weeklyGoalBook, setWeeklyGoalBook] = useState('');
  const [monthlyGoalPage, setMonthlyGoalPage] = useState('');
  const [monthlyGoalBook, setMonthlyGoalBook] = useState('');

  // 1. Initial Data Fetching
  useEffect(() => {
    if (familyMembers.length > 0 && !selectedMember) {
      // Default to first member
      setSelectedMember(familyMembers[0]);
    }
  }, [familyMembers, selectedMember]);

  useEffect(() => {
    let unsubscribeBooks = () => {};
    let unsubscribeSessions = () => {};
    let unsubscribeLibraries = () => {};

    try {
      unsubscribeBooks = onBooksUpdate(setAllBooks);
      if (familyId) {
        getReadingSessions(familyId).then(setReadingSessions).catch(console.error);
        unsubscribeSessions = onReadingSessionsUpdate(familyId, setReadingSessions);
        unsubscribeLibraries = onUserLibrariesUpdate(familyId, setUserLibraries);
      }
      setLoading(false);
    } catch (e) {
      console.log('Error loading library data:', e);
      setLoading(false);
    }

    return () => {
      unsubscribeBooks();
      unsubscribeSessions();
      unsubscribeLibraries();
    };
  }, [familyId]);

  // 2. Calculations (Exactly matching the web logic)
  const { readingBooks, toReadBooks, finishedBooks, stats } = useMemo(() => {
    if (!selectedMember) {
      return { readingBooks: [], toReadBooks: [], finishedBooks: [], stats: { finished: 0, total: 0, reading: 0, toRead: 0 }};
    }

    let allMemberBooks: any[] = [];
    userLibraries.forEach(lib => {
      if (lib.memberId === selectedMember.id && lib.books) {
        allMemberBooks = allMemberBooks.concat(lib.books);
      }
    });

    if (allMemberBooks.length === 0) {
      return { readingBooks: [], toReadBooks: [], finishedBooks: [], stats: { finished: 0, total: 0, reading: 0, toRead: 0 }};
    }

    const uniqueBooks = new Map();
    allMemberBooks.forEach(libBook => {
      const bookDetail = allBooks.find(b => b.id === libBook.bookId);
      if (bookDetail && !uniqueBooks.has(libBook.bookId)) {
        uniqueBooks.set(libBook.bookId, { ...bookDetail, ...libBook });
      }
    });

    const myBookDetails = Array.from(uniqueBooks.values());

    const reading = myBookDetails.filter((b: any) => b.status === 'reading')
      .sort((a: any, b: any) => new Date(b.addedAt || 0).getTime() - new Date(a.addedAt || 0).getTime());
    const toRead = myBookDetails.filter((b: any) => b.status === 'to-read')
      .sort((a: any, b: any) => new Date(b.addedAt || 0).getTime() - new Date(a.addedAt || 0).getTime());
    const finished = myBookDetails.filter((b: any) => b.status === 'finished')
      .sort((a: any, b: any) => new Date(b.finishedAt || b.addedAt || 0).getTime() - new Date(a.finishedAt || a.addedAt || 0).getTime());

    const statistics = {
      finished: finished.length,
      reading: reading.length,
      toRead: toRead.length,
      total: myBookDetails.length,
    };

    return { readingBooks: reading, toReadBooks: toRead, finishedBooks: finished, stats: statistics };
  }, [selectedMember, userLibraries, allBooks]);

  const readingGoals = selectedMember?.readingGoals;

  const readingStatsByPeriod = useMemo(() => {
    if (!selectedMember) return { weeklyChartData: [], monthlyPageData: [], weekLabel: "" };

    const memberSessions = readingSessions.filter(s => s.memberId === selectedMember.id);
    const today = chartReferenceDate; 

    // Weekly calculation
    const weekStart = startOfWeek(today, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(today, { weekStartsOn: 1 });
    const dailyPages = new Map<string, number>();
    const weekDaysKeys = Array.from({ length: 7 }).map((_, i) => {
      const day = addDays(weekStart, i);
      const dayKey = format(day, 'yyyy-MM-dd');
      dailyPages.set(dayKey, 0);
      return dayKey;
    });

    memberSessions.forEach(session => {
      const sessionDate = parseISO(session.startTime);
      if (isWithinInterval(sessionDate, { start: weekStart, end: weekEnd })) {
        const dayKey = format(sessionDate, 'yyyy-MM-dd');
        dailyPages.set(dayKey, (dailyPages.get(dayKey) || 0) + session.pagesRead);
      }
    });

    const weeklyChartData = weekDaysKeys.map(dayKey => ({
      day: format(parseISO(dayKey), 'EEE', { locale: tr }),
      fullDate: format(parseISO(dayKey), 'd MMM', { locale: tr }),
      pagesRead: dailyPages.get(dayKey) || 0,
      dailyGoal: readingGoals?.daily?.pages || 0,
    }));

    // Monthly calculation
    const currentYear = getYear(today);
    const monthsOfYear = eachMonthOfInterval({
      start: new Date(currentYear, 0, 1),
      end: new Date(currentYear, 11, 31),
    });

    const monthlyPageData = monthsOfYear.map(month => {
      const monthKey = format(month, 'MMM', { locale: tr });
      const monthStart = startOfMonth(month);
      const monthEnd = endOfMonth(month);

      const pagesRead = memberSessions
        .filter(s => {
          const sessionDate = parseISO(s.startTime);
          return isWithinInterval(sessionDate, { start: monthStart, end: monthEnd });
        })
        .reduce((sum, s) => sum + s.pagesRead, 0);
      
      return {
        month: monthKey,
        pagesRead,
      };
    });

    const weekLabel = `${format(weekStart, 'd MMM', { locale: tr })} - ${format(weekEnd, 'd MMM', { locale: tr })}`;

    return { weeklyChartData, monthlyPageData, weekLabel };
  }, [readingSessions, selectedMember, chartReferenceDate, readingGoals]);

  const monthlyGoalProgress = useMemo(() => {
    if (!readingGoals?.monthly || !selectedMember) return { pages: 0, books: 0, pagesRead: 0, booksRead: 0 };
    
    const startOfMonthDate = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const memberSessions = readingSessions.filter(s => s.memberId === selectedMember.id);
    const monthlySessions = memberSessions.filter(s => parseISO(s.startTime) >= startOfMonthDate);
    const pagesRead = monthlySessions.reduce((sum, s) => sum + s.pagesRead, 0);
    
    const finishedBookIds = new Set(
      userLibraries.find(lib => lib.memberId === selectedMember.id)?.books
        ?.filter(b => {
          if (b.status !== 'finished' || !b.finishedAt) return false;
          const finishedDate = parseISO(b.finishedAt);
          return finishedDate >= startOfMonthDate;
        })
        .map(b => b.bookId) || []
    );
    const booksRead = finishedBookIds.size;

    return {
      pages: Math.min(100, (pagesRead / (readingGoals.monthly?.pages || 1)) * 100),
      books: Math.min(100, (booksRead / (readingGoals.monthly?.books || 1)) * 100),
      pagesRead,
      booksRead
    };
  }, [readingGoals, readingSessions, userLibraries, selectedMember]);

  const weeklyGoalProgress = useMemo(() => {
    if (!readingGoals?.weekly || !selectedMember) return { pages: 0, books: 0, pagesRead: 0, booksRead: 0 };
    
    const startOfWeekDate = startOfWeek(new Date(), { weekStartsOn: 1 });
    const memberSessions = readingSessions.filter(s => s.memberId === selectedMember.id);
    const weeklySessions = memberSessions.filter(s => parseISO(s.startTime) >= startOfWeekDate);
    const pagesRead = weeklySessions.reduce((sum, s) => sum + s.pagesRead, 0);
    
    const finishedBookIds = new Set(
      userLibraries.find(lib => lib.memberId === selectedMember.id)?.books
        ?.filter(b => {
          if (b.status !== 'finished' || !b.finishedAt) return false;
          const finishedDate = parseISO(b.finishedAt);
          return finishedDate >= startOfWeekDate;
        })
        .map(b => b.bookId) || []
    );
    const booksRead = finishedBookIds.size;

    return {
      pages: Math.min(100, (pagesRead / (readingGoals.weekly?.pages || 1)) * 100),
      books: Math.min(100, (booksRead / (readingGoals.weekly?.books || 1)) * 100),
      pagesRead,
      booksRead
    };
  }, [readingGoals, readingSessions, userLibraries, selectedMember]);

  // 3. Handlers
  const handleUpdateStatus = async (bookId: string, newStatus: 'reading' | 'finished', progress?: number) => {
    if (!familyId || !selectedMember) return;

    if (newStatus === 'finished') {
      const bookDetail = allBooks.find(b => b.id === bookId);
      if (bookDetail && bookDetail.isForChildren) {
        setChildBookToFinish({ ...bookDetail, pendingProgress: progress });
        setIsFinishChildModalOpen(true);
        return;
      }
    }

    try {
      await updateUserBookStatus(familyId, selectedMember.id, bookId, newStatus, progress);
      Alert.alert("Başarılı", "Durum başarıyla güncellendi.");
    } catch (e) {
      console.log('Error updating status:', e);
      Alert.alert("Hata", "Durum güncellenirken bir sorun oluştu.");
    }
  };

  const handleRemoveFromLibrary = async (bookId: string) => {
    if (!familyId || !selectedMember) return;
    Alert.alert(
      "Kitabı Kaldır",
      "Bu kitabı kütüphanenizden kaldırmak istediğinize emin misiniz?",
      [
        { text: "İptal", style: "cancel" },
        { 
          text: "Kaldır", 
          style: "destructive",
          onPress: async () => {
            try {
              await removeBookFromMemberLibrary(familyId, selectedMember.id, bookId);
            } catch(e) {
              Alert.alert("Hata", "Kitap kaldırılırken sorun oluştu.");
            }
          }
        }
      ]
    );
  };

  const handleSaveGoals = async () => {
    if (!familyId || !selectedMember) return;
    try {
      const newGoals: ReadingGoals = {
        daily: { pages: Number(dailyGoalPage) || 0 },
        weekly: { pages: Number(weeklyGoalPage) || 0, books: Number(weeklyGoalBook) || 0 },
        monthly: { pages: Number(monthlyGoalPage) || 0, books: Number(monthlyGoalBook) || 0 }
      };
      await updateFamilyMemberInFamily(familyId, selectedMember.id, { readingGoals: newGoals });
      setIsGoalModalOpen(false);
      Alert.alert("Başarılı", "Okuma hedefleri başarıyla güncellendi.");
    } catch (e) {
      Alert.alert("Hata", "Hedefler güncellenirken hata oluştu.");
    }
  };

  const handleSaveProgressSession = async () => {
    if (!familyId || !selectedMember || !editingProgressForBook) return;
    const targetPage = Number(progressInput);
    
    if (isNaN(targetPage) || targetPage < 0 || !editingProgressForBook.pageCount) {
      Alert.alert("Hata", "Lütfen geçerli bir sayfa sayısı girin.");
      return;
    }

    const pagesReadCurrently = editingProgressForBook.pageCount && editingProgressForBook.progress 
      ? Math.round((editingProgressForBook.progress / 100) * editingProgressForBook.pageCount) : 0;
      
    let newPagesRead = 0;
    if (targetPage > pagesReadCurrently) {
      newPagesRead = targetPage - pagesReadCurrently;
    }

    const newProgressPercentage = Math.round((targetPage / editingProgressForBook.pageCount) * 100);

    try {
      await addReadingSession({
        memberId: selectedMember.id,
        bookId: editingProgressForBook.id,
        startTime: new Date().toISOString(),
        endTime: new Date().toISOString(),
        durationSeconds: 0,
        pagesRead: newPagesRead,
      });

      const status = (newProgressPercentage >= 100 && !editingProgressForBook.isForChildren) ? 'finished' : 'reading';
      await handleUpdateStatus(editingProgressForBook.id, status, newProgressPercentage);

      setIsProgressModalOpen(false);
      setProgressInput('');
      setEditingProgressForBook(null);
      Alert.alert("Başarılı", `${newPagesRead} sayfa okuma oturumu kaydedildi!`);
    } catch(e) {
      Alert.alert("Hata", "İlerleme kaydedilirken hata oluştu.");
    }
  };

  const handleDeleteSession = async (session: any) => {
    Alert.alert(
      "Kayıt Silinsin mi?",
      "Bu okuma kaydını silmek istediğinize emin misiniz?",
      [
        { text: "İptal", style: "cancel" },
        { 
          text: "Sil", 
          style: "destructive",
          onPress: async () => {
            try {
              await deleteReadingSession(session.id);
              
              if (familyId && selectedMember && session.bookId && session.pagesRead) {
                  const bookDetail = allBooks.find(b => b.id === session.bookId);
                  const libBooks = userLibraries.find(l => l.memberId === selectedMember.id)?.books || [];
                  const libBook = libBooks.find(b => b.bookId === session.bookId);
                  
                  if (bookDetail && libBook) {
                      const currentProgress = libBook.progress || 0;
                      const currentPages = Math.round((currentProgress / 100) * bookDetail.pageCount);
                      const newPages = Math.max(0, currentPages - session.pagesRead);
                      const newProgress = Math.round((newPages / bookDetail.pageCount) * 100);
                      
                      const newStatus = (newProgress >= 100 && !bookDetail.isForChildren) ? 'finished' : 'reading';
                      await updateUserBookStatus(familyId, selectedMember.id, session.bookId, newStatus, newProgress);
                  }
              }
            } catch(e) {
              Alert.alert("Hata", "Kayıt silinirken sorun oluştu.");
            }
          }
        }
      ]
    );
  };

  const handleAddPhoto = async (fromCamera: boolean) => {
    try {
      if (fromCamera) {
        const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
        if (!permissionResult.granted) {
          Alert.alert("Kamera İzni Gerekli", "Kitap özeti fotoğrafı çekebilmek için kameraya erişim izni vermelisiniz.");
          return;
        }
        const result = await ImagePicker.launchCameraAsync({ quality: 0.8 });
        if (!result.canceled && result.assets && result.assets.length > 0) {
          setPendingSummaryImages(prev => [...prev, result.assets[0].uri]);
        }
      } else {
        const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permissionResult.granted) {
          Alert.alert("Galeri İzni Gerekli", "Fotoğraf seçebilmek için galeriye erişim izni vermelisiniz.");
          return;
        }
        const result = await ImagePicker.launchImageLibraryAsync({ quality: 0.8, allowsMultipleSelection: true });
        if (!result.canceled && result.assets && result.assets.length > 0) {
          const uris = result.assets.map(a => a.uri);
          setPendingSummaryImages(prev => [...prev, ...uris]);
        }
      }
    } catch (e) {
      console.log('Error picking image:', e);
    }
  };

  const handleRemovePendingPhoto = (indexToRemove: number) => {
    setPendingSummaryImages(prev => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleUploadAndFinish = async () => {
    if (!familyId || !selectedMember || !childBookToFinish) return;
    
    // Check if it's currently finished and already has images, if they just add more, we need to preserve existing?
    // Wait, let's keep it simple: We upload the new ones and append to existing in updateUserBookStatus!
    // Actually, childBookToFinish has summaryImageUrls if it already exists.
    // If pendingSummaryImages is empty, we just mark as finished (or return if they were supposed to upload).

    try {
      setIsUploadingSummary(true);
      const newUrls: string[] = [];

      for (const uri of pendingSummaryImages) {
        const response = await fetch(uri);
        const blob = await response.blob();
        const storagePath = `summaries/${familyId}/${selectedMember.id}/${childBookToFinish.id}_${Date.now()}_${Math.random().toString(36).substring(7)}`;
        const url = await uploadImageToStorage(blob as any, storagePath);
        newUrls.push(url);
      }

      // Combine with existing images if any
      const existingUrls = childBookToFinish.summaryImageUrls || (childBookToFinish.summaryImageUrl ? [childBookToFinish.summaryImageUrl] : []);
      const finalUrls = [...existingUrls, ...newUrls];

      await updateUserBookStatus(familyId, selectedMember.id, childBookToFinish.id, 'finished', childBookToFinish.pendingProgress || 100, finalUrls.length > 0 ? finalUrls : undefined);
      
      setIsFinishChildModalOpen(false);
      setChildBookToFinish(null);
      setPendingSummaryImages([]);
      Alert.alert("Tebrikler! 🎉", "Kitap durumu ve özet fotoğrafları başarıyla güncellendi.");
    } catch (e) {
      console.log('Error finishing book with photo summary:', e);
      Alert.alert("Hata", "Özet yüklenirken bir hata oluştu.");
    } finally {
      setIsUploadingSummary(false);
    }
  };

  const handleDeleteSummaryImage = async (urlToDelete: string) => {
    if (!familyId || !selectedMember || !viewingBook) {
      console.log('Missing data for deletion');
      return;
    }

    try {
      const existingUrls = viewingBook.summaryImageUrls || (viewingBook.summaryImageUrl ? [viewingBook.summaryImageUrl] : []);
      const newUrls = existingUrls.filter((u: string) => u !== urlToDelete);
      
      await updateUserBookStatus(familyId, selectedMember.id, viewingBook.id, viewingBook.status, viewingBook.progress, newUrls.length > 0 ? newUrls : []);
      
      // Update local viewing state
      setViewingBook((prev: any) => ({
        ...prev,
        summaryImageUrls: newUrls,
        summaryImageUrl: newUrls.length > 0 ? newUrls[0] : null
      }));
      
      setFullScreenImage(null);
    } catch (e) {
      console.log('Error deleting summary:', e);
      Alert.alert("Hata", "Özet silinirken hata oluştu.");
    }
  };

  // Navigations
  const handlePrevWeek = () => setChartReferenceDate(prev => subDays(prev, 7));
  const handleNextWeek = () => setChartReferenceDate(prev => addDays(prev, 7));
  const handleResetDate = () => setChartReferenceDate(new Date());

  const openGoalModal = () => {
    setDailyGoalPage(String(readingGoals?.daily?.pages || ''));
    setWeeklyGoalPage(String(readingGoals?.weekly?.pages || ''));
    setWeeklyGoalBook(String(readingGoals?.weekly?.books || ''));
    setMonthlyGoalPage(String(readingGoals?.monthly?.pages || ''));
    setMonthlyGoalBook(String(readingGoals?.monthly?.books || ''));
    setIsGoalModalOpen(true);
  };

  const openProgressModal = (book: any) => {
    setEditingProgressForBook(book);
    const currentPage = book.pageCount && book.progress ? Math.round((book.progress / 100) * book.pageCount) : 0;
    setProgressInput(String(currentPage));
    setIsProgressModalOpen(true);
  };

  const openOptionsSheet = (book: any) => {
    setActionBook(book);
    setIsOptionsSheetOpen(true);
  };

  const openBookDetail = (book: any) => {
    setViewingBook(book);
    setIsBookDetailModalOpen(true);
  };

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-[#F2F2F7] dark:bg-black">
        <ActivityIndicator size="large" color="#16a085" />
      </View>
    );
  }

  // --- RENDER HELPERS ---
  const cardStyle = {
    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(255, 255, 255, 0.65)',
    borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.8)',
    borderWidth: 1,
  };

  const orb1Style = {
    position: 'absolute' as 'absolute',
    top: -160,
    right: -160,
    width: 384,
    height: 384,
    borderRadius: 192,
    backgroundColor: isDark ? 'rgba(22, 160, 133, 0.06)' : 'rgba(22, 160, 133, 0.15)',
    transform: [{ scale: 2.0 }],
    opacity: 0.8,
  };

  const orb2Style = {
    position: 'absolute' as 'absolute',
    bottom: -160,
    left: -160,
    width: 384,
    height: 384,
    borderRadius: 192,
    backgroundColor: isDark ? 'rgba(46, 204, 113, 0.06)' : 'rgba(46, 204, 113, 0.15)',
    transform: [{ scale: 2.0 }],
    opacity: 0.8,
  };

  const orb3Style = {
    position: 'absolute' as 'absolute',
    top: '33%' as any,
    left: '25%' as any,
    width: 192,
    height: 192,
    borderRadius: 96,
    backgroundColor: isDark ? 'rgba(52, 152, 219, 0.04)' : 'rgba(52, 152, 219, 0.12)',
    transform: [{ scale: 2.5 }],
    opacity: 0.6,
  };

  const summaryCardsStyle = {
    reading: {
      backgroundColor: isDark ? 'rgba(245, 158, 11, 0.08)' : 'rgba(245, 158, 11, 0.12)',
      borderColor: isDark ? 'rgba(245, 158, 11, 0.2)' : 'rgba(245, 158, 11, 0.35)',
      borderWidth: 1,
    },
    finished: {
      backgroundColor: isDark ? 'rgba(16, 185, 129, 0.08)' : 'rgba(16, 185, 129, 0.12)',
      borderColor: isDark ? 'rgba(16, 185, 129, 0.2)' : 'rgba(16, 185, 129, 0.35)',
      borderWidth: 1,
    },
    toRead: {
      backgroundColor: isDark ? 'rgba(59, 130, 246, 0.08)' : 'rgba(59, 130, 246, 0.12)',
      borderColor: isDark ? 'rgba(59, 130, 246, 0.2)' : 'rgba(59, 130, 246, 0.35)',
      borderWidth: 1,
    },
    total: {
      backgroundColor: isDark ? 'rgba(99, 102, 241, 0.08)' : 'rgba(99, 102, 241, 0.12)',
      borderColor: isDark ? 'rgba(99, 102, 241, 0.2)' : 'rgba(99, 102, 241, 0.35)',
      borderWidth: 1,
    }
  };

  const maxVal = Math.max(
    ...readingStatsByPeriod.weeklyChartData.map(d => d.pagesRead),
    readingGoals?.daily?.pages || 0,
    1
  );



  const renderMemberSelector = () => {
    return (
      <View className="mt-4 px-4">
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row overflow-visible">
          {familyMembers.map((member) => {
              const isActive = selectedMember?.id === member.id;
              return (
                <TouchableOpacity
                    key={member.id}
                    className="flex-row items-center p-2 px-4 rounded-full mr-3 border"
                    style={isActive 
                      ? { backgroundColor: '#16a085', borderColor: '#16a085' }
                      : { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(255, 255, 255, 0.65)', borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.8)' }
                    }
                    onPress={() => {
                      setSelectedMember(member);
                      setChartReferenceDate(new Date());
                    }}
                >
                     <View 
                        className="w-6 h-6 rounded-full flex items-center justify-center mr-2 shadow-sm" 
                        style={{ backgroundColor: isActive ? 'white' : member.color }}
                     >
                        <Text className="font-bold text-[11px]" style={{ color: isActive ? '#16a085' : 'white' }}>
                           {member.name.charAt(0).toUpperCase()}
                        </Text>
                     </View>
                    <Text className="font-bold text-[13px]" style={{ color: isActive ? 'white' : (isDark ? '#E2E8F0' : '#334155') }}>
                       {member.name}
                    </Text>
                </TouchableOpacity>
              );
          })}
        </ScrollView>
      </View>
    );
  };

  const renderSummaryGrid = () => {
    return (
      <View className="grid grid-cols-4 gap-2 px-4 mt-6 flex-row">
          <View className="flex-1 p-3 rounded-2xl items-center" style={summaryCardsStyle.reading}>
              <BookOpen size={20} color="#16a085" />
              <Text className="text-xl font-extrabold mt-1 text-slate-800 dark:text-slate-100">{stats.reading}</Text>
              <Text className="text-[9px] text-slate-500 dark:text-slate-400 font-bold uppercase mt-1">Okunuyor</Text>
          </View>
          <View className="flex-1 p-3 rounded-2xl items-center" style={summaryCardsStyle.finished}>
              <CheckCircle size={20} color="#34C759" />
              <Text className="text-xl font-extrabold mt-1 text-slate-800 dark:text-slate-100">{stats.finished}</Text>
              <Text className="text-[9px] text-slate-500 dark:text-slate-400 font-bold uppercase mt-1">Bitti</Text>
          </View>
          <View className="flex-1 p-3 rounded-2xl items-center" style={summaryCardsStyle.toRead}>
              <BookUp size={20} color="#007AFF" />
              <Text className="text-xl font-extrabold mt-1 text-slate-800 dark:text-slate-100">{stats.toRead}</Text>
              <Text className="text-[9px] text-slate-500 dark:text-slate-400 font-bold uppercase mt-1">Sırada</Text>
          </View>
          <View className="flex-1 p-3 rounded-2xl items-center" style={summaryCardsStyle.total}>
              <Library size={20} color="#5856D6" />
              <Text className="text-xl font-extrabold mt-1 text-slate-800 dark:text-slate-100">{stats.total}</Text>
              <Text className="text-[9px] text-slate-500 dark:text-slate-400 font-bold uppercase mt-1">Toplam</Text>
          </View>
      </View>
    );
  };

  const renderPerformanceCard = () => {
    return (
      <View className="mx-4 mt-6 p-4 rounded-3xl shadow-sm" style={cardStyle}>
          <View className="flex-row justify-between items-center mb-4">
              <Text className="text-[13px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Performans Özeti</Text>
              
              {/* Weekly/Monthly Select buttons */}
              <View className="flex-row bg-slate-200/50 dark:bg-black/40 p-1 rounded-xl border border-slate-300/30 dark:border-white/5">
                <TouchableOpacity 
                  onPress={() => setReadingStatsPeriod('weekly')}
                  className={readingStatsPeriod === 'weekly' ? "px-3 py-1.5 rounded-lg bg-white dark:bg-white/10 shadow-sm" : "px-3 py-1.5 rounded-lg"}
                >
                  <Text className={readingStatsPeriod === 'weekly' ? "text-xs font-bold text-slate-900 dark:text-white" : "text-xs font-bold text-slate-500 dark:text-slate-400"}>Haftalık</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  onPress={() => setReadingStatsPeriod('monthly')}
                  className={readingStatsPeriod === 'monthly' ? "px-3 py-1.5 rounded-lg bg-white dark:bg-white/10 shadow-sm" : "px-3 py-1.5 rounded-lg"}
                >
                  <Text className={readingStatsPeriod === 'monthly' ? "text-xs font-bold text-slate-900 dark:text-white" : "text-xs font-bold text-slate-500 dark:text-slate-400"}>Aylık</Text>
                </TouchableOpacity>
              </View>
          </View>

          {/* Reading Goal Progress Bars */}
          <View className="mb-4">
              {readingStatsPeriod === 'weekly' && (readingGoals?.weekly?.pages || readingGoals?.weekly?.books) ? (
                  <View className="gap-3">
                      {readingGoals?.weekly?.pages ? (
                          <View>
                              <View className="flex-row justify-between text-[11px] font-bold mb-1">
                                  <Text className="text-slate-500 dark:text-slate-400">Haftalık Sayfa Hedefi</Text>
                                  <Text className="text-amber-600">{weeklyGoalProgress.pagesRead} / {readingGoals.weekly.pages}</Text>
                              </View>
                              <View className="h-2 bg-slate-200/60 dark:bg-black/50 rounded-full overflow-hidden">
                                  <View className="h-full bg-amber-500 rounded-full" style={{ width: `${weeklyGoalProgress.pages}%` }} />
                              </View>
                          </View>
                      ) : null}
                      {readingGoals?.weekly?.books ? (
                          <View>
                              <View className="flex-row justify-between text-[11px] font-bold mb-1">
                                  <Text className="text-slate-500 dark:text-slate-400">Haftalık Kitap Hedefi</Text>
                                  <Text className="text-orange-600">{weeklyGoalProgress.booksRead} / {readingGoals.weekly.books}</Text>
                              </View>
                              <View className="h-2 bg-slate-200/60 dark:bg-black/50 rounded-full overflow-hidden">
                                  <View className="h-full bg-orange-500 rounded-full" style={{ width: `${weeklyGoalProgress.books}%` }} />
                              </View>
                          </View>
                      ) : null}
                  </View>
              ) : null}

              {readingStatsPeriod === 'monthly' && (readingGoals?.monthly?.pages || readingGoals?.monthly?.books) ? (
                  <View className="gap-3">
                      {readingGoals?.monthly?.pages ? (
                          <View>
                              <View className="flex-row justify-between text-[11px] font-bold mb-1">
                                  <Text className="text-slate-500 dark:text-slate-400">Aylık Sayfa Hedefi</Text>
                                  <Text className="text-amber-600">{monthlyGoalProgress.pagesRead} / {readingGoals.monthly.pages}</Text>
                              </View>
                              <View className="h-2 bg-slate-200/60 dark:bg-black/50 rounded-full overflow-hidden">
                                  <View className="h-full bg-amber-500 rounded-full" style={{ width: `${monthlyGoalProgress.pages}%` }} />
                              </View>
                          </View>
                      ) : null}
                      {readingGoals?.monthly?.books ? (
                          <View>
                              <View className="flex-row justify-between text-[11px] font-bold mb-1">
                                  <Text className="text-slate-500 dark:text-slate-400">Aylık Kitap Hedefi</Text>
                                  <Text className="text-orange-600">{monthlyGoalProgress.booksRead} / {readingGoals.monthly.books}</Text>
                              </View>
                              <View className="h-2 bg-slate-200/60 dark:bg-black/50 rounded-full overflow-hidden">
                                  <View className="h-full bg-orange-500 rounded-full" style={{ width: `${monthlyGoalProgress.books}%` }} />
                              </View>
                          </View>
                      ) : null}
                  </View>
              ) : null}
          </View>

          {/* Separator */}
          <View className="h-[1px] bg-black/5 dark:bg-white/5 my-2" />

          {/* Weekly Navigation Controls */}
          {readingStatsPeriod === 'weekly' && (
              <View className="flex-row items-center justify-between bg-white/40 dark:bg-black/20 rounded-xl p-1 px-2 border border-white/80 dark:border-white/10 mb-3 shadow-sm">
                  <TouchableOpacity onPress={handlePrevWeek} className="p-1.5 rounded-full bg-white/80 dark:bg-white/10 active:opacity-50 border border-white dark:border-white/5">
                      <ChevronLeft size={14} color={isDark ? '#94a3b8' : '#64748b'} />
                  </TouchableOpacity>
                  
                  <TouchableOpacity onPress={handleResetDate} className="flex-row items-center gap-1">
                      <Text className="text-xs font-bold text-slate-800 dark:text-slate-100">{readingStatsByPeriod.weekLabel}</Text>
                      {!isSameDay(new Date(), chartReferenceDate) && (
                          <View className="bg-amber-100 dark:bg-amber-950 px-2 py-0.5 rounded-full">
                              <Text className="text-[8px] font-bold text-amber-700 dark:text-amber-400">Geri</Text>
                          </View>
                      )}
                  </TouchableOpacity>

                  <TouchableOpacity onPress={handleNextWeek} className="p-1.5 rounded-full bg-white/80 dark:bg-white/10 active:opacity-50 border border-white dark:border-white/5">
                      <ChevronRight size={14} color={isDark ? '#94a3b8' : '#64748b'} />
                  </TouchableOpacity>
              </View>
          )}

          {/* Custom Bar Chart */}
          <View className="h-36 flex-row items-end justify-between px-1 mt-4 relative">
              
              {/* Dotted Target Line */}
              {readingStatsPeriod === 'weekly' && readingGoals?.daily?.pages && readingGoals.daily.pages > 0 ? (
                (() => {
                  const targetPercent = (readingGoals.daily.pages / maxVal) * 100;
                  return (
                    <View className="absolute left-0 right-0 z-10 border-t border-dashed border-emerald-500/80" style={{ bottom: `${targetPercent}%` }}>
                      <Text className="absolute right-0 text-[8px] font-bold text-emerald-600 bg-white/80 dark:bg-black/80 px-1 rounded -top-3">
                        Hedef: {readingGoals.daily.pages}
                      </Text>
                    </View>
                  );
                })()
              ) : null}

              {/* Bars Rendering */}
              {readingStatsPeriod === 'weekly' ? (
                readingStatsByPeriod.weeklyChartData.map((d, index) => {
                  const heightPercent = (d.pagesRead / maxVal) * 100;
                  const isGoalMet = d.dailyGoal > 0 && d.pagesRead >= d.dailyGoal;
                  return (
                    <View key={index} className="items-center flex-1">
                      {d.pagesRead > 0 && (
                        <Text className="text-[9px] font-semibold text-slate-500 dark:text-slate-400 mb-1">{d.pagesRead}</Text>
                      )}
                      <View 
                        style={{ height: `${Math.max(4, heightPercent)}%` }} 
                        className={isGoalMet ? "w-6 rounded-t-lg bg-emerald-500" : d.pagesRead > 0 ? "w-6 rounded-t-lg bg-[#16a085]" : "w-6 rounded-t-lg bg-[#E5E5EA] dark:bg-[#2C2C2E]"} 
                      />
                      <Text className="text-slate-500 dark:text-slate-400 text-[9px] font-bold mt-2">{d.day}</Text>
                    </View>
                  );
                })
              ) : (
                readingStatsByPeriod.monthlyPageData.map((d, index) => {
                  const maxMonthlyVal = Math.max(...readingStatsByPeriod.monthlyPageData.map(m => m.pagesRead), 1);
                  const heightPercent = (d.pagesRead / maxMonthlyVal) * 100;
                  return (
                    <View key={index} className="items-center flex-1">
                      {d.pagesRead > 0 && (
                        <Text className="text-[8px] font-semibold text-slate-500 dark:text-slate-400 mb-1">{d.pagesRead}</Text>
                      )}
                      <View 
                        style={{ height: `${Math.max(4, heightPercent)}%` }} 
                        className={d.pagesRead > 0 ? "w-4 rounded-t-sm bg-[#16a085]" : "w-4 rounded-t-sm bg-[#E5E5EA] dark:bg-[#2C2C2E]"} 
                      />
                      <Text className="text-slate-500 dark:text-slate-400 text-[8px] font-bold mt-2" numberOfLines={1}>{d.month}</Text>
                    </View>
                  );
                })
              )}
          </View>
      </View>
    );
  };

  const renderCurrentlyReading = () => {
    if (readingBooks.length === 0) return null;
    return (
      <View className="px-4 gap-4">
          <Text className="text-[17px] font-bold flex-row items-center gap-2 text-slate-800 dark:text-slate-100">
              📖 Şu An Okudukların
          </Text>
          
          {readingBooks.map((book: any) => {
            const pagesRead = book.pageCount ? Math.round((book.progress || 0) / 100 * book.pageCount) : 0;
            return (
              <View key={book.id} className="p-4 rounded-2xl relative overflow-hidden shadow-sm flex-row gap-4" style={cardStyle}>
                  
                  {/* Progress bottom-line indicator */}
                  <View className="absolute bottom-0 left-0 right-0 h-1 bg-amber-100 dark:bg-amber-950">
                      <View className="h-full bg-[#16a085]" style={{ width: `${book.progress || 0}%` }} />
                  </View>

                  {/* Cover image */}
                  <TouchableOpacity onPress={() => openBookDetail(book)}>
                      <Image 
                          source={{ uri: book.image }} 
                          className="w-20 h-28 rounded-lg object-cover shadow-sm bg-slate-200" 
                      />
                  </TouchableOpacity>

                  {/* Book Content */}
                  <View className="flex-1 justify-between py-1">
                      <View>
                          <TouchableOpacity onPress={() => openBookDetail(book)}>
                              <Text className="font-bold text-sm leading-tight text-slate-800 dark:text-slate-100" numberOfLines={2}>{book.title}</Text>
                              <Text className="text-xs text-slate-500 dark:text-slate-400 mt-1">{book.author}</Text>
                          </TouchableOpacity>
                          
                          <View className="flex-row items-baseline gap-1 mt-2">
                              <Text className="text-lg font-black text-[#16a085]">{book.progress || 0}%</Text>
                              <Text className="text-[10px] text-slate-500 dark:text-slate-400 font-bold">({pagesRead}/{book.pageCount || '?'} sf)</Text>
                          </View>
                      </View>

                      {/* Actions Group */}
                      <View className="flex-row gap-2 items-center mt-3 mb-1">
                          <TouchableOpacity 
                            onPress={() => router.push({ pathname: '/reading-session-play', params: { bookId: book.id, memberId: selectedMember?.id } })}
                            className="flex-1 bg-[#16a085] h-9 rounded-xl flex-row items-center justify-center gap-1.5 shadow-sm shadow-[#16a085]/25 active:opacity-85"
                          >
                              <Play size={12} color="white" fill="white" />
                              <Text className="text-white font-bold text-xs">Oku</Text>
                          </TouchableOpacity>

                          <TouchableOpacity 
                            onPress={() => openProgressModal(book)}
                            className="w-9 h-9 rounded-xl items-center justify-center shadow-sm border"
                            style={{ backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(255, 255, 255, 0.65)', borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.8)' }}
                          >
                              <Edit size={14} color="#16a085" />
                          </TouchableOpacity>

                          <TouchableOpacity 
                            onPress={() => openOptionsSheet(book)}
                            className="w-9 h-9 rounded-xl items-center justify-center shadow-sm border"
                            style={{ backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(255, 255, 255, 0.65)', borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.8)' }}
                          >
                              <MoreVertical size={14} color={isDark ? '#94a3b8' : '#64748b'} />
                          </TouchableOpacity>
                      </View>
                  </View>
              </View>
            );
          })}
      </View>
    );
  };

  const renderToRead = () => {
    return (
      <View className="px-4 mt-4">
          <Text className="text-[17px] font-bold mb-4 text-slate-800 dark:text-slate-100">
              📥 Sıradakiler
          </Text>
          {toReadBooks.length > 0 ? (
              <View className="flex-row flex-wrap justify-between">
                  {toReadBooks.map((book: any) => (
                    <View key={book.id} className="w-[31%] mb-4 items-center">
                        <TouchableOpacity 
                          onPress={() => openBookDetail(book)}
                          className="w-full aspect-[2/3] rounded-xl overflow-hidden shadow-sm bg-slate-200 border relative"
                          style={{ borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.8)', borderWidth: 1 }}
                        >
                            <Image 
                                source={{ uri: book.image }} 
                                className="w-full h-full object-cover"
                            />
                            <TouchableOpacity 
                              onPress={() => handleUpdateStatus(book.id, 'reading', 0)}
                              className="absolute bottom-2 left-2 right-2 bg-[#16a085] py-1.5 rounded-lg items-center justify-center flex-row gap-1 shadow"
                            >
                                <BookOpen size={10} color="white" />
                                <Text className="text-white text-[10px] font-bold">Başla</Text>
                            </TouchableOpacity>
                        </TouchableOpacity>
                        
                        <Text className="text-[12px] font-bold text-center mt-2 leading-tight text-slate-800 dark:text-slate-100" numberOfLines={1}>{book.title}</Text>
                        <Text className="text-[10px] text-slate-500 dark:text-slate-400 text-center" numberOfLines={1}>{book.author}</Text>
                    </View>
                  ))}
              </View>
          ) : (
              <View className="p-8 border-2 border-dashed rounded-2xl flex-col items-center justify-center text-center shadow-inner"
                    style={{ 
                        backgroundColor: isDark ? 'rgba(255, 255, 255, 0.03)' : 'rgba(255, 255, 255, 0.45)',
                        borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.8)'
                    }}
              >
                  <BookUp size={24} color={isDark ? '#94a3b8' : '#64748b'} style={{ opacity: 0.5 }} />
                  <Text className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-2">Sırada okunacak kitap bulunmuyor.</Text>
                  <TouchableOpacity 
                    onPress={() => router.push({ pathname: '/library-all', params: { memberId: selectedMember?.id } })}
                    className="mt-3 bg-amber-500/10 dark:bg-amber-500/20 border border-amber-500/20 px-4 py-2 rounded-full active:opacity-75"
                  >
                      <Text className="text-xs font-bold text-amber-700 dark:text-amber-400">Katalogdan kitap ekle</Text>
                  </TouchableOpacity>
              </View>
          )}
      </View>
    );
  };

  const renderFinished = () => {
    if (finishedBooks.length === 0) return null;
    return (
      <View className="px-4 mt-4">
          <Text className="text-[17px] font-bold mb-4 text-slate-800 dark:text-slate-100">
              🏆 Bitirdiklerim
          </Text>
          
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row -mx-4 px-4 overflow-visible">
              {finishedBooks.map((book: any) => {
                const finishedDate = book.finishedAt ? format(parseISO(book.finishedAt), 'd MMM yyyy', { locale: tr }) : '';
                return (
                  <TouchableOpacity 
                    key={book.id} 
                    onPress={() => openBookDetail(book)}
                    className="w-24 mr-4 items-center"
                  >
                      <View className="relative w-full aspect-[2/3] rounded-xl overflow-hidden shadow-sm border bg-slate-200"
                            style={{ borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.8)', borderWidth: 1 }}
                      >
                          <Image source={{ uri: book.image }} className="w-full h-full object-cover" />
                          <View className="absolute top-1 right-1 bg-emerald-500 rounded-full p-0.5 shadow-sm">
                              <CheckCircle size={12} color="white" />
                          </View>
                      </View>
                      <Text className="font-bold text-[11px] text-center mt-2 leading-tight text-slate-800 dark:text-slate-100" numberOfLines={1}>{book.title}</Text>
                      {!!finishedDate && (
                          <Text className="text-[9px] text-slate-500 dark:text-slate-400 text-center mt-0.5" numberOfLines={1}>{finishedDate}</Text>
                      )}
                  </TouchableOpacity>
                );
              })}
          </ScrollView>
      </View>
    );
  };

  return (
    <View className="flex-1 bg-[#e8f8f5] dark:bg-[#0b1b18]">
      
      {/* Background Glowing Orbs (Premium Colorful Theme) */}
      <View className="absolute inset-0 pointer-events-none overflow-hidden" style={StyleSheet.absoluteFill}>
        <View style={orb1Style} />
        <View style={orb2Style} />
        <View style={orb3Style} />
      </View>

      {/* HEADER */}
      <View className="bg-white/40 dark:bg-[#1C1C1E]/40 border-b border-white/60 dark:border-white/10 z-40 pb-2">
        <SafeAreaView edges={['top']} className="m-0 p-0" />
        <View className="flex-row items-center justify-between px-4 h-14">
            <View className="flex-row items-center gap-3">
                <TouchableOpacity onPress={() => router.push('/')} className="w-8 h-8 items-center justify-center active:opacity-50">
                    <ChevronLeft size={24} color="#64748B" />
                </TouchableOpacity>
                
                {/* Web-style LinearGradient Icon Box */}
                <LinearGradient
                  colors={['#16a085', '#2ecc71']}
                  start={{x: 0, y: 0}}
                  end={{x: 1, y: 1}}
                  className="p-2 rounded-xl shadow-sm"
                >
                  <Library size={16} color="white" />
                </LinearGradient>

                <View>
                    <Text className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest leading-none">EĞİTİM</Text>
                    <Text className="text-sm font-extrabold tracking-tight text-slate-800 dark:text-slate-100 mt-0.5">Kişisel Kütüphane</Text>
                </View>
            </View>

            <View className="flex-row gap-2">
                <TouchableOpacity onPress={() => setIsHistoryModalOpen(true)} className="flex-row items-center px-4 py-2 bg-white/60 dark:bg-white/5 border border-white/80 dark:border-white/10 rounded-full shadow-sm">
                    <History size={16} color="#64748B" />
                    <Text className="ml-2 font-bold text-slate-600 dark:text-slate-300 text-xs md:text-sm">Geçmiş</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => router.push('/library-archive')} className="flex-row items-center px-4 py-2 bg-white/60 dark:bg-white/5 border border-white/80 dark:border-white/10 rounded-full shadow-sm">
                    <Library size={16} color="#64748B" />
                    <Text className="ml-2 font-bold text-slate-600 dark:text-slate-300 text-xs md:text-sm">Arşiv</Text>
                </TouchableOpacity>
            </View>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 100 }} showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={isDark ? '#fff' : '#000'} />}>
        {isTabletLandscape ? (
          <View style={{ flexDirection: 'row', gap: 16, paddingHorizontal: 14 }}>
            {/* Left Column */}
            <View style={{ width: '40%', gap: 14 }}>
              {renderMemberSelector()}
              {renderSummaryGrid()}
              {renderPerformanceCard()}
            </View>

            {/* Right Column */}
            <View style={{ flex: 1, gap: 14 }}>
              {renderCurrentlyReading()}
              {renderToRead()}
              {renderFinished()}
            </View>
          </View>
        ) : (
          <>
            {renderMemberSelector()}
            {renderSummaryGrid()}
            {renderPerformanceCard()}
            {renderCurrentlyReading()}
            {renderToRead()}
            {renderFinished()}
          </>
        )}
      </ScrollView>

      {/* FLOAT BUTTON: GOALS EDIT & NEW BOOK ADD */}
      {selectedMember && (
          <TouchableOpacity 
              onPress={openGoalModal}
              className="absolute bottom-[100px] right-6 w-14 h-14 rounded-full bg-[#16a085] items-center justify-center shadow-lg shadow-[#16a085]/40 z-50 active:scale-95"
          >
              <Target size={26} color="white" />
          </TouchableOpacity>
      )}

      {/* MODAL: OKUMA İLERLEME GİRİŞİ */}
      <Modal visible={isProgressModalOpen} transparent={true} animationType="slide">
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1">
              <View className="flex-1 justify-start pt-20 px-4 bg-black/50">
                  <TouchableOpacity className="absolute inset-0" activeOpacity={1} onPress={() => setIsProgressModalOpen(false)} />
                  <View className="bg-white dark:bg-[#1C1C1E] p-6 rounded-[28px] border border-black/5 dark:border-white/5 shadow-2xl">
                      <View className="flex-row justify-between items-center mb-4">
                          <Text className="text-lg font-bold text-slate-800 dark:text-slate-100">İlerleme Kaydet</Text>
                          <TouchableOpacity onPress={() => setIsProgressModalOpen(false)}>
                              <X size={20} color={isDark ? '#94a3b8' : '#64748b'} />
                          </TouchableOpacity>
                      </View>
                      
                      {editingProgressForBook && (
                          <View className="items-center mb-4">
                              <Text className="text-sm text-center text-slate-500 dark:text-slate-400" numberOfLines={1}>
                                  {editingProgressForBook.title}
                              </Text>
                              <Text className="text-xs text-slate-500 dark:text-slate-400 text-center mt-1">
                                  Toplam: {editingProgressForBook.pageCount || '?'} sayfa • Kayıtlı: {editingProgressForBook.pageCount && editingProgressForBook.progress ? Math.round((editingProgressForBook.progress / 100) * editingProgressForBook.pageCount) : 0}. Sayfa
                              </Text>
                          </View>
                      )}

                    <Text className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-wider">Şu an kaçıncı sayfadasınız?</Text>
                    <TextInput 
                        keyboardType="number-pad"
                        placeholder="Sayfa numarası..."
                        placeholderTextColor={isDark ? '#475569' : '#94a3b8'}
                        value={progressInput}
                        onChangeText={setProgressInput}
                        className="h-12 bg-[#F2F2F7] dark:bg-black rounded-xl px-4 text-[#1C1C1E] dark:text-white font-bold text-lg mb-6 border border-black/5 dark:border-white/5"
                        autoFocus
                    />

                    <TouchableOpacity 
                        onPress={handleSaveProgressSession}
                        className="h-12 bg-amber-600 rounded-xl items-center justify-center shadow-sm"
                    >
                        <Text className="text-white font-bold text-[15px]">Kaydet</Text>
                    </TouchableOpacity>
                </View>
              </View>
          </KeyboardAvoidingView>
      </Modal>

      {/* MODAL: HEDEF BELİRLEME */}
      <Modal visible={isGoalModalOpen} transparent={true} animationType="slide">
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1">
              <View className="flex-1 justify-start pt-20 px-4 bg-black/50">
                  <TouchableOpacity className="absolute inset-0" activeOpacity={1} onPress={() => setIsGoalModalOpen(false)} />
                  <View className="bg-white dark:bg-[#1C1C1E] p-6 rounded-[28px] border border-black/5 dark:border-white/5 shadow-2xl max-h-[85vh]">
                    <View className="flex-row justify-between items-center mb-6">
                        <View>
                            <Text className="text-lg font-bold text-slate-800 dark:text-slate-100">Hedef Belirle</Text>
                            <Text className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{selectedMember?.name} için okuma hedefleri.</Text>
                        </View>
                        <TouchableOpacity onPress={() => setIsGoalModalOpen(false)}>
                            <X size={20} color={isDark ? '#94a3b8' : '#64748b'} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView showsVerticalScrollIndicator={false} className="mb-6">
                        <Text className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-wider">Günlük Sayfa Hedefi</Text>
                        <TextInput 
                            keyboardType="number-pad"
                            placeholder="Örn: 20"
                            placeholderTextColor={isDark ? '#475569' : '#94a3b8'}
                            value={dailyGoalPage}
                            onChangeText={setDailyGoalPage}
                            className="h-12 bg-[#F2F2F7] dark:bg-black rounded-xl px-4 text-[#1C1C1E] dark:text-white font-bold mb-4 border border-black/5 dark:border-white/5"
                        />

                        <Text className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-wider">Haftalık Sayfa Hedefi</Text>
                        <TextInput 
                            keyboardType="number-pad"
                            placeholder="Örn: 150"
                            placeholderTextColor={isDark ? '#475569' : '#94a3b8'}
                            value={weeklyGoalPage}
                            onChangeText={setWeeklyGoalPage}
                            className="h-12 bg-[#F2F2F7] dark:bg-black rounded-xl px-4 text-[#1C1C1E] dark:text-white font-bold mb-4 border border-black/5 dark:border-white/5"
                        />

                        <Text className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-wider">Haftalık Kitap Hedefi</Text>
                        <TextInput 
                            keyboardType="number-pad"
                            placeholder="Örn: 1"
                            placeholderTextColor={isDark ? '#475569' : '#94a3b8'}
                            value={weeklyGoalBook}
                            onChangeText={setWeeklyGoalBook}
                            className="h-12 bg-[#F2F2F7] dark:bg-black rounded-xl px-4 text-[#1C1C1E] dark:text-white font-bold mb-4 border border-black/5 dark:border-white/5"
                        />

                        <Text className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-wider">Aylık Sayfa Hedefi</Text>
                        <TextInput 
                            keyboardType="number-pad"
                            placeholder="Örn: 500"
                            placeholderTextColor={isDark ? '#475569' : '#94a3b8'}
                            value={monthlyGoalPage}
                            onChangeText={setMonthlyGoalPage}
                            className="h-12 bg-[#F2F2F7] dark:bg-black rounded-xl px-4 text-[#1C1C1E] dark:text-white font-bold mb-4 border border-black/5 dark:border-white/5"
                        />

                        <Text className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-wider">Aylık Kitap Hedefi</Text>
                        <TextInput 
                            keyboardType="number-pad"
                            placeholder="Örn: 3"
                            placeholderTextColor={isDark ? '#475569' : '#94a3b8'}
                            value={monthlyGoalBook}
                            onChangeText={setMonthlyGoalBook}
                            className="h-12 bg-[#F2F2F7] dark:bg-black rounded-xl px-4 text-[#1C1C1E] dark:text-white font-bold mb-4 border border-black/5 dark:border-white/5"
                        />
                    </ScrollView>

                    <TouchableOpacity 
                        onPress={handleSaveGoals}
                        className="h-12 bg-amber-600 rounded-xl items-center justify-center shadow-sm"
                    >
                        <Text className="text-white font-bold text-[15px]">Kaydet</Text>
                    </TouchableOpacity>
                </View>
              </View>
          </KeyboardAvoidingView>
      </Modal>

      {/* MODAL: OKUMA GEÇMİŞİ */}
      <Modal visible={isHistoryModalOpen} transparent={true} animationType="slide">
          <View className="flex-1 justify-end bg-black/50">
              <TouchableOpacity className="absolute inset-0" activeOpacity={1} onPress={() => setIsHistoryModalOpen(false)} />
              <View className="bg-white dark:bg-[#1C1C1E] p-6 rounded-t-[28px] border-t border-black/5 dark:border-white/5 h-[80%]">
                  <View className="flex-row justify-between items-center mb-6">
                      <View>
                          <Text className="text-lg font-bold text-slate-800 dark:text-slate-100">Okuma Geçmişi</Text>
                          <Text className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{selectedMember?.name} son okuma kayıtları.</Text>
                      </View>
                      <TouchableOpacity onPress={() => setIsHistoryModalOpen(false)}>
                          <X size={20} color={isDark ? '#94a3b8' : '#64748b'} />
                      </TouchableOpacity>
                  </View>

                  <ScrollView showsVerticalScrollIndicator={false} className="flex-1 mb-4">
                      {readingSessions.filter(s => s.memberId === selectedMember?.id).length === 0 ? (
                          <View className="items-center justify-center py-20">
                              <Clock size={40} color={isDark ? '#94a3b8' : '#64748b'} style={{ opacity: 0.5 }} />
                              <Text className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-2">Henüz okuma geçmişi bulunmuyor.</Text>
                              <Text className="text-[10px] text-slate-400 mt-2">Debug: Toplam Session: {readingSessions.length}, Üye: {selectedMember?.name} ({selectedMember?.id})</Text>
                          </View>
                      ) : (
                          readingSessions
                              .filter(s => s.memberId === selectedMember?.id)
                              .sort((a,b) => {
                                  const getT = (st: any) => {
                                      if (!st) return 0;
                                      if (typeof st === 'string') return new Date(st).getTime();
                                      if (st.seconds !== undefined) return st.seconds * 1000;
                                      if (st instanceof Date) return st.getTime();
                                      return 0;
                                  };
                                  return getT(b.startTime) - getT(a.startTime);
                              })
                              .map(session => {
                                  const book = allBooks.find(b => b.id === session.bookId);
                                  
                                  let dateObj: Date | null = null;
                                  try {
                                      if (session.startTime) {
                                          if (typeof session.startTime === 'string') {
                                              dateObj = parseISO(session.startTime);
                                          } else if ((session.startTime as any).seconds !== undefined) {
                                              dateObj = new Date((session.startTime as any).seconds * 1000);
                                          } else if (session.startTime instanceof Date) {
                                              dateObj = session.startTime;
                                          }
                                      }
                                  } catch (e) {
                                      console.log('Date parse error', e);
                                  }

                                  return (
                                      <View key={session.id} className="flex-row justify-between items-center p-3 rounded-xl border border-black/5 dark:border-white/5 bg-slate-50 dark:bg-black/50 mb-3">
                                          <View className="flex-1 pr-4">
                                              <Text className="text-sm font-bold text-slate-800 dark:text-slate-100" numberOfLines={1}>{book?.title || 'Bilinmeyen Kitap'}</Text>
                                              <View className="flex-row items-center gap-2 mt-1">
                                                  <Text className="text-xs text-slate-500 dark:text-slate-400">
                                                      {(() => {
                                                          try {
                                                              return (dateObj && !isNaN(dateObj.getTime())) ? format(dateObj, 'd MMM HH:mm') : '-';
                                                          } catch(e) {
                                                              return '-';
                                                          }
                                                      })()}
                                                  </Text>
                                                  <View className="bg-amber-100 dark:bg-amber-950 px-2 py-0.5 rounded-full">
                                                      <Text className="text-[10px] font-bold text-amber-700 dark:text-amber-400">+{session.pagesRead || 0} Sayfa</Text>
                                                  </View>
                                              </View>
                                          </View>
                                          <TouchableOpacity onPress={() => handleDeleteSession(session)} className="w-8 h-8 rounded-full bg-rose-50 dark:bg-rose-950/50 items-center justify-center shrink-0">
                                              <Trash2 size={14} color="#f43f5e" />
                                          </TouchableOpacity>
                                      </View>
                                  );
                              })
                      )}
                  </ScrollView>
                  <Text className="text-[10px] text-slate-500 dark:text-slate-400 text-center mb-2">Not: Kayıt silindiğinde grafikler güncellenir ancak kitap okuma yüzdesini manuel düzenlemeniz gerekebilir.</Text>
              </View>
          </View>
      </Modal>

      {/* MODAL: ÇOCUK KİTABI ÖZET FOTOĞRAFI YÜKLEME VE BİTİRME */}
      <Modal visible={isFinishChildModalOpen} transparent={true} animationType="slide">
          <View className="flex-1 justify-end bg-black/50">
              <TouchableOpacity className="absolute inset-0" activeOpacity={1} onPress={() => setIsFinishChildModalOpen(false)} />
              <View className="bg-white dark:bg-[#1C1C1E] p-6 rounded-t-[28px] border-t border-black/5 dark:border-white/5">
                  <View className="flex-row justify-between items-center mb-4">
                      <Text className="text-lg font-bold text-[#5856D6] flex-row items-center gap-1">
                          <Sparkles size={18} color="#5856D6" /> Tebrikler!
                      </Text>
                      <TouchableOpacity onPress={() => setIsFinishChildModalOpen(false)}>
                          <X size={20} color={isDark ? '#94a3b8' : '#64748b'} />
                      </TouchableOpacity>
                  </View>

                  <Text className="text-sm text-slate-800 dark:text-slate-100 leading-relaxed mb-6">
                      Bu kitabı bitirdiğiniz için tebrik ederiz! Bitmiş olarak işaretlemek için kendi el yazınızla yazdığınız kitap özetinin bir fotoğrafını çekip yüklemelisiniz.
                  </Text>

                  {isUploadingSummary ? (
                      <View className="py-8 items-center justify-center">
                          <ActivityIndicator size="large" color="#5856D6" />
                          <Text className="text-xs text-slate-500 dark:text-slate-400 mt-2">Özet fotoğrafları yükleniyor...</Text>
                      </View>
                  ) : (
                      <View>
                        {pendingSummaryImages.length > 0 && (
                          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, marginBottom: 16 }}>
                            {pendingSummaryImages.map((uri, idx) => (
                              <View key={idx} className="relative w-24 h-32 rounded-xl overflow-hidden border border-black/10">
                                <Image source={{ uri }} className="w-full h-full object-cover" />
                                <TouchableOpacity 
                                  onPress={() => handleRemovePendingPhoto(idx)}
                                  className="absolute top-1 right-1 w-6 h-6 bg-red-500/80 rounded-full items-center justify-center"
                                >
                                  <X size={14} color="white" />
                                </TouchableOpacity>
                              </View>
                            ))}
                          </ScrollView>
                        )}
                        
                        <View className="flex-row gap-3 mb-6">
                            <TouchableOpacity 
                                onPress={() => handleAddPhoto(true)}
                                className="flex-1 h-14 border border-dashed border-[#5856D6]/40 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/20 items-center justify-center flex-row gap-2 active:opacity-75"
                            >
                                <Camera size={20} color="#5856D6" />
                                <Text className="text-sm font-bold text-[#5856D6]">Kamera</Text>
                            </TouchableOpacity>
                            <TouchableOpacity 
                                onPress={() => handleAddPhoto(false)}
                                className="flex-1 h-14 border border-dashed border-[#5856D6]/40 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/20 items-center justify-center flex-row gap-2 active:opacity-75"
                            >
                                <Plus size={20} color="#5856D6" />
                                <Text className="text-sm font-bold text-[#5856D6]">Galeri</Text>
                            </TouchableOpacity>
                        </View>
                        
                        <TouchableOpacity 
                            onPress={handleUploadAndFinish}
                            className="h-14 rounded-2xl bg-[#5856D6] items-center justify-center mb-3 active:opacity-75"
                        >
                            <Text className="text-white font-bold text-[16px]">Kaydet ve Bitir</Text>
                        </TouchableOpacity>

                        <TouchableOpacity 
                            onPress={() => {
                                setIsFinishChildModalOpen(false);
                                setPendingSummaryImages([]);
                            }}
                            className="h-12 bg-slate-100 dark:bg-slate-800 rounded-xl items-center justify-center active:opacity-75"
                        >
                            <Text className="text-slate-500 dark:text-slate-400 font-bold text-[15px]">İptal</Text>
                        </TouchableOpacity>
                      </View>
                  )}
              </View>
          </View>
      </Modal>

      {/* MODAL / BOTTOM SHEET: BOOK OPTIONS MENU */}
      <Modal visible={isOptionsSheetOpen} transparent={true} animationType="fade">
          <View className="flex-1 justify-end bg-black/50">
              <TouchableOpacity className="absolute inset-0" activeOpacity={1} onPress={() => setIsOptionsSheetOpen(false)} />
              <View className="bg-white dark:bg-[#1C1C1E] p-6 rounded-t-[28px] border-t border-black/5 dark:border-white/5 pb-8">
                  <View className="flex-row justify-between items-center mb-4">
                      <Text className="text-md font-bold text-slate-800 dark:text-slate-100" numberOfLines={1}>{actionBook?.title}</Text>
                      <TouchableOpacity onPress={() => setIsOptionsSheetOpen(false)}>
                          <X size={20} color={isDark ? '#94a3b8' : '#64748b'} />
                      </TouchableOpacity>
                  </View>
                  
                  <TouchableOpacity 
                      onPress={() => {
                        setIsOptionsSheetOpen(false);
                        if (actionBook) handleUpdateStatus(actionBook.id, 'finished', 100);
                      }}
                      className="h-12 border-b border-black/5 dark:border-white/5 flex-row items-center gap-3 active:bg-slate-50 dark:active:bg-slate-900"
                  >
                      <CheckCircle size={18} color="#34C759" />
                      <Text className="font-semibold text-slate-800 dark:text-slate-100">Kitabı Bitir</Text>
                  </TouchableOpacity>

                  <TouchableOpacity 
                      onPress={() => {
                        setIsOptionsSheetOpen(false);
                        if (actionBook) handleRemoveFromLibrary(actionBook.id);
                      }}
                      className="h-12 flex-row items-center gap-3 active:bg-slate-50 dark:active:bg-slate-900 mt-2"
                  >
                      <Trash2 size={18} color="#f43f5e" />
                      <Text className="font-semibold text-rose-500">Kütüphaneden Kaldır</Text>
                  </TouchableOpacity>
              </View>
          </View>
      </Modal>

      {/* BOOK DETAIL MODAL (App Store Style) */}
      <Modal visible={isBookDetailModalOpen} transparent={true} animationType="slide">
          <View className="flex-1 bg-black/50 justify-end">
              <TouchableOpacity className="absolute inset-0" activeOpacity={1} onPress={() => setIsBookDetailModalOpen(false)} />
              <View className="bg-white dark:bg-[#1C1C1E] w-full h-[85%] rounded-t-[32px] overflow-hidden">
                  {viewingBook && (
                      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
                          {/* Blurred Cover Header */}
                          <View className="w-full h-[260px] relative items-center justify-end pb-6 bg-slate-100 dark:bg-slate-800">
                              <Image 
                                  source={{ uri: viewingBook.image }} 
                                  className="absolute inset-0 w-full h-full opacity-50"
                                  blurRadius={20}
                              />
                              <View className="absolute inset-0 bg-black/20" />
                              
                              <View className="relative z-10 w-32 h-48 rounded-md shadow-2xl overflow-hidden border border-white/20">
                                  <Image source={{ uri: viewingBook.image }} className="w-full h-full object-cover" />
                              </View>

                              {/* Close Button */}
                              <TouchableOpacity 
                                  onPress={() => setIsBookDetailModalOpen(false)}
                                  className="absolute top-6 right-6 w-8 h-8 rounded-full bg-black/40 items-center justify-center z-20"
                              >
                                  <X size={18} color="white" />
                              </TouchableOpacity>
                          </View>

                          <View className="p-6 pt-5 flex-col gap-4">
                              <View className="items-center">
                                  <Text className="text-2xl font-bold tracking-tight mb-1 text-center text-slate-800 dark:text-slate-100">
                                      {viewingBook.title}
                                  </Text>
                                  <Text className="text-lg font-medium text-[#16a085] text-center">
                                      {viewingBook.author}
                                  </Text>
                              </View>

                              {/* Info Badges */}
                              <View className="flex-row justify-center items-center py-4 border-y border-black/5 dark:border-white/5 my-2">
                                  <View className="items-center px-4 border-r border-black/5 dark:border-white/5">
                                      <Text className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-bold tracking-wider mb-1">Puan</Text>
                                      <View className="flex-row items-center gap-1">
                                          <Text className="font-bold text-[15px] text-slate-800 dark:text-slate-100">
                                              {viewingBook.rating?.toFixed(1) || '0.0'}
                                          </Text>
                                          <Star size={14} color="#FF9500" fill="#FF9500" />
                                      </View>
                                  </View>
                                  
                                  <View className="items-center px-4 border-r border-black/5 dark:border-white/5">
                                      <Text className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-bold tracking-wider mb-1">Sayfa</Text>
                                      <Text className="font-bold text-[15px] text-slate-800 dark:text-slate-100">
                                          {viewingBook.pageCount || '-'}
                                      </Text>
                                  </View>

                                  <View className="items-center px-4">
                                      <Text className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-bold tracking-wider mb-1">Tür</Text>
                                      <Text className="font-bold text-[15px] text-slate-800 dark:text-slate-100" numberOfLines={1}>
                                          {viewingBook.tags?.[0] || '-'}
                                      </Text>
                                  </View>
                              </View>

                              {/* Summary Images (if exists) */}
                              {(viewingBook.summaryImageUrls?.length > 0 || viewingBook.summaryImageUrl) && (
                                  <View className="w-full my-2">
                                      <Text className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 flex-row items-center gap-1">
                                          <Sparkles size={16} color="#5856D6" /> Kitap Özeti
                                      </Text>
                                      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
                                          {(viewingBook.summaryImageUrls || [viewingBook.summaryImageUrl]).map((uri: string, idx: number) => (
                                              uri ? (
                                                  <TouchableOpacity 
                                                      key={idx} 
                                                      onPress={() => setFullScreenImage(uri)}
                                                      className="w-[80vw] h-64 rounded-xl overflow-hidden border border-black/10 shadow-inner active:opacity-80"
                                                  >
                                                      <Image source={{ uri }} className="w-full h-full object-cover" />
                                                  </TouchableOpacity>
                                              ) : null
                                          ))}
                                      </ScrollView>
                                  </View>
                              )}

                              {/* Description */}
                              <Text className="text-[14px] leading-relaxed text-slate-800 dark:text-slate-100">
                                  {viewingBook.description || 'Bu kitap için bir açıklama bulunmuyor.'}
                              </Text>

                              {/* Action Buttons */}
                              <View className="flex-row gap-3 mt-6">
                                  {viewingBook.status === 'finished' ? (
                                      <>
                                          <TouchableOpacity 
                                            onPress={() => {
                                              setIsBookDetailModalOpen(false);
                                              handleUpdateStatus(viewingBook.id, 'reading', 0);
                                            }}
                                            className="flex-1 h-14 rounded-2xl bg-[#16a085] items-center justify-center flex-row gap-2"
                                          >
                                              <RotateCcw size={16} color="white" />
                                              <Text className="text-white font-semibold text-[16px]">Tekrar Oku</Text>
                                          </TouchableOpacity>
                                              <TouchableOpacity 
                                                onPress={() => {
                                                  setIsBookDetailModalOpen(false);
                                                  setChildBookToFinish(viewingBook);
                                                  setIsFinishChildModalOpen(true);
                                                }}
                                                className="flex-1 h-14 rounded-2xl bg-indigo-600 items-center justify-center flex-row gap-2"
                                              >
                                                  <Camera size={16} color="white" />
                                                  <Text className="text-white font-semibold text-[16px]">{(viewingBook.summaryImageUrls?.length > 0 || viewingBook.summaryImageUrl) ? 'Özet Güncelle' : 'Özet Ekle'}</Text>
                                              </TouchableOpacity>
                                      </>
                                  ) : (
                                      <>
                                          <TouchableOpacity 
                                            onPress={() => handleRemoveFromLibrary(viewingBook.id)}
                                            className="w-14 h-14 rounded-2xl border border-slate-200 dark:border-white/10 items-center justify-center bg-white dark:bg-[#1C1C1E]"
                                          >
                                              <Trash2 size={24} color="#f43f5e" />
                                          </TouchableOpacity>

                                          <TouchableOpacity 
                                            onPress={() => {
                                                setIsBookDetailModalOpen(false);
                                                router.push({ pathname: '/reading-session-play', params: { bookId: viewingBook.id, memberId: selectedMember?.id as string } });
                                            }}
                                            className="flex-1 h-14 rounded-2xl bg-indigo-600 items-center justify-center flex-row gap-2 active:opacity-85"
                                          >
                                              <Play size={18} color="white" />
                                              <Text className="text-white font-semibold text-[14px] md:text-[16px]">Okumaya Başla</Text>
                                          </TouchableOpacity>

                                          <TouchableOpacity 
                                            onPress={() => {
                                              setIsBookDetailModalOpen(false);
                                              handleUpdateStatus(viewingBook.id, 'finished', 100);
                                            }}
                                            className="flex-1 h-14 rounded-2xl bg-[#16a085] items-center justify-center"
                                          >
                                              <Text className="text-white font-semibold text-[14px] md:text-[16px]">Okundu</Text>
                                          </TouchableOpacity>
                                      </>
                                  )}
                              </View>
                          </View>
                      </ScrollView>
                  )}
              </View>
          </View>
      </Modal>

      {/* FULL SCREEN IMAGE MODAL */}
      <Modal visible={!!fullScreenImage} transparent={true} animationType="fade">
          <View className="flex-1 bg-black justify-center items-center">
              <View className="absolute top-12 right-6 flex-row gap-4 z-50">
                  <TouchableOpacity 
                      onPress={() => {
                        if (fullScreenImage) {
                          handleDeleteSummaryImage(fullScreenImage);
                        }
                      }}
                      className="w-10 h-10 rounded-full bg-rose-500/80 items-center justify-center active:bg-rose-600"
                  >
                      <Trash2 size={20} color="white" />
                  </TouchableOpacity>
                  <TouchableOpacity 
                      onPress={() => setFullScreenImage(null)}
                      className="w-10 h-10 rounded-full bg-white/20 items-center justify-center active:bg-white/30"
                  >
                      <X size={24} color="white" />
                  </TouchableOpacity>
              </View>
              
              {fullScreenImage && (
                  <ScrollView maximumZoomScale={3} minimumZoomScale={1} contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', alignItems: 'center' }}>
                      <Image 
                          source={{ uri: fullScreenImage }} 
                          style={{ width, height: '100%' }} 
                          resizeMode="contain" 
                      />
                  </ScrollView>
              )}
          </View>
      </Modal>

    </View>
  );
}
