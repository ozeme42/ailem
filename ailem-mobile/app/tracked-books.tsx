import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Platform, useWindowDimensions, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useEffect, useState, useMemo } from 'react';
import { onTrackedBooksUpdate, deleteTrackedBook, onAllTrackedBookTestsUpdate, onTestsUpdate } from '../lib/dataService';
import { TrackedBook, TrackedBookTest, Test } from '../lib/data';
import { BookMarked, Library, FileText, CheckCircle, ChevronLeft, Plus, Trash2, PenTool } from 'lucide-react-native';
import { useRouter, Stack } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';

const cardGradients = [
  ['#2563EB', '#4338CA'],
  ['#059669', '#0F766E'],
  ['#E11D48', '#BE185D'],
  ['#F97316', '#DC2626'],
  ['#F59E0B', '#EA580C'],
  ['#7C3AED', '#6D28D9'],
];

export default function TrackedBooksScreen() {
  const [books, setBooks] = useState<TrackedBook[]>([]);
  const [allBookTests, setAllBookTests] = useState<TrackedBookTest[]>([]);
  const [allTests, setAllTests] = useState<Test[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const { width } = useWindowDimensions();

  const isDesktop = width >= 1024;
  const isTablet = width >= 768 && width < 1024;
  const colCount = isDesktop ? 3 : isTablet ? 2 : 1;
  const cardWidth = `${100 / colCount}%`;

  useEffect(() => {
    let unsubBooks: any;
    let unsubTests: any;
    let unsubAssignments: any;

    try {
      unsubBooks = onTrackedBooksUpdate((data: TrackedBook[]) => {
        setBooks(data);
        setLoading(false);
      });
      unsubTests = onAllTrackedBookTestsUpdate(setAllBookTests);
      unsubAssignments = onTestsUpdate((tests) => {
          setAllTests(tests.filter(t => t.sourceType === 'trackedBook'));
      });
    } catch (e) {
      setLoading(false);
    }

    return () => {
      if (typeof unsubBooks === 'function') unsubBooks();
      if (typeof unsubTests === 'function') unsubTests();
      if (typeof unsubAssignments === 'function') unsubAssignments();
    };
  }, []);

  const enrichedBooks = useMemo(() => {
    return books.map(book => {
        const bookTests = allBookTests.filter(bt => bt.bookId === book.id);
        const testIds = bookTests.map(bt => bt.id);
        const associatedTests = allTests.filter(t => testIds.includes(t.sourceId || ''));
        const solvedTests = associatedTests.filter(t => t.status === 'Sonuçlandı');
        const testCount = bookTests.length;
        return { ...book, testCount, solvedTestCount: solvedTests.length };
    });
  }, [books, allBookTests, allTests]);

  const handleDelete = async (id: string) => {
    if (Platform.OS === 'web') {
      const confirm = window.confirm("Bu kitabı ve içindeki tüm verileri silmek istediğinize emin misiniz?");
      if (confirm) {
        try { await deleteTrackedBook(id); } catch (error) { window.alert("Kitap silinemedi."); }
      }
      return;
    }
    Alert.alert("Kitabı Sil", "Bu kitabı ve içindeki tüm verileri silmek istediğinize emin misiniz?", [
        { text: "İptal", style: "cancel" },
        { text: "Sil", style: "destructive", onPress: async () => {
            try { await deleteTrackedBook(id); } catch (error) { Alert.alert("Hata", "Kitap silinemedi."); }
        }}
    ]);
  };

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#020617', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#6366f1" />
      </SafeAreaView>
    );
  }

  const activeBooks = enrichedBooks.filter(b => b.solvedTestCount > 0 && b.solvedTestCount < b.testCount);
  const completedBooksCount = enrichedBooks.filter(b => b.testCount > 0 && b.solvedTestCount === b.testCount).length;
  const totalTests = enrichedBooks.reduce((sum, b) => sum + b.testCount, 0);
  const solvedTests = enrichedBooks.reduce((sum, b) => sum + b.solvedTestCount, 0);

  return (
    <View style={{ flex: 1, backgroundColor: '#020617' }}>
      <Stack.Screen options={{ headerShown: false }} />
      
      {/* Ambient Backgrounds */}
      <View style={[StyleSheet.absoluteFill, { overflow: 'hidden', zIndex: 0 }]} pointerEvents="none">
         <View style={{ position: 'absolute', top: -50, left: -50, width: 400, height: 400, backgroundColor: 'rgba(30, 58, 138, 0.2)', borderRadius: 200, filter: 'blur(80px)' as any }} />
         <View style={{ position: 'absolute', bottom: 100, right: -50, width: 300, height: 300, backgroundColor: 'rgba(22, 78, 99, 0.2)', borderRadius: 150, filter: 'blur(80px)' as any }} />
      </View>

      <SafeAreaView style={{ flex: 1, zIndex: 1 }}>
        <View style={{ 
            paddingHorizontal: isDesktop ? 32 : 16, 
            paddingVertical: 16, 
            flexDirection: 'row', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            backgroundColor: 'rgba(2, 6, 23, 0.7)',
            borderBottomWidth: 1,
            borderBottomColor: 'rgba(255,255,255,0.05)',
            backdropFilter: 'blur(16px)' as any
        }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <TouchableOpacity onPress={() => router.back()} style={{ padding: 8, marginLeft: -8 }}>
                    <ChevronLeft size={24} color="#cbd5e1" />
                </TouchableOpacity>
                <LinearGradient
                    colors={['#3b82f6', '#0891b2']}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                    style={{ width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' }}
                >
                    <BookMarked size={20} color="#ffffff" />
                </LinearGradient>
                <View>
                    <Text style={{ fontSize: 20, fontWeight: '900', color: '#f1f5f9', letterSpacing: -0.5 }}>Kitap Takibi</Text>
                    <Text style={{ fontSize: 12, fontWeight: '600', color: '#94a3b8', marginTop: 2 }}>Kütüphane Yönetimi</Text>
                </View>
            </View>

            <TouchableOpacity 
                onPress={() => router.push('/new-tracked-book')}
                style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#4f46e5', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12 }}
            >
                <Plus size={16} color="white" style={{ marginRight: 6 }} />
                <Text style={{ color: 'white', fontWeight: '700', fontSize: 13 }}>Yeni Kitap</Text>
            </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={{ padding: isDesktop ? 32 : 16 }} showsVerticalScrollIndicator={false}>
            {enrichedBooks.length > 0 && (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 16, marginBottom: 24 }}>
                    {[
                        { title: 'Toplam Kitap', value: enrichedBooks.length, icon: Library, iconBg: 'rgba(59, 130, 246, 0.2)', iconColor: '#60a5fa' },
                        { title: 'Aktif Okunan', value: activeBooks.length, icon: BookMarked, iconBg: 'rgba(139, 92, 246, 0.2)', iconColor: '#a78bfa' },
                        { title: 'Tamamlanan', value: completedBooksCount, icon: CheckCircle, iconBg: 'rgba(16, 185, 129, 0.2)', iconColor: '#34d399' },
                        { title: 'Çözülen Test', value: solvedTests, extra: ` / ${totalTests}`, icon: FileText, iconBg: 'rgba(245, 158, 11, 0.2)', iconColor: '#fbbf24' },
                    ].map((stat, idx) => {
                        const Icon = stat.icon;
                        const w = isDesktop ? 'calc(25% - 12px)' : 'calc(50% - 8px)';
                        return (
                            <View key={idx} style={{ 
                                width: Platform.OS === 'web' ? w as any : (isDesktop ? '23%' : '47%'),
                                backgroundColor: 'rgba(255,255,255,0.03)',
                                borderRadius: 16, padding: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)',
                                ...Platform.select({ web: { backdropFilter: 'blur(12px)' } as any, default: {} })
                            }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                                    <View style={{ backgroundColor: stat.iconBg, padding: 8, borderRadius: 10 }}>
                                        <Icon size={18} color={stat.iconColor} />
                                    </View>
                                    <Text style={{ fontSize: 12, fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase' }}>{stat.title}</Text>
                                </View>
                                <Text style={{ fontSize: 28, fontWeight: '900', color: '#ffffff' }}>
                                    {stat.value}
                                    {stat.extra && <Text style={{ fontSize: 16, color: '#64748b' }}>{stat.extra}</Text>}
                                </Text>
                            </View>
                        );
                    })}
                </View>
            )}

            {enrichedBooks.length === 0 ? (
                <View style={{ alignItems: 'center', paddingVertical: 80, backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 40, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', borderStyle: 'dashed' }}>
                    <View style={{ width: 64, height: 64, backgroundColor: '#1e293b', borderRadius: 32, alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                        <BookMarked size={32} color="#64748b" />
                    </View>
                    <Text style={{ fontSize: 18, fontWeight: '700', color: '#e2e8f0', marginBottom: 4 }}>Kitap Yok</Text>
                    <Text style={{ fontSize: 14, color: '#94a3b8', marginBottom: 12 }}>Takip edilecek henüz bir kitap eklenmemiş.</Text>
                    <TouchableOpacity onPress={() => router.push('/new-tracked-book')}><Text style={{ color: '#818cf8', fontWeight: '600' }}>İlk kitabı ekle</Text></TouchableOpacity>
                </View>
            ) : (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -8 }}>
                    {enrichedBooks.map((book, index) => {
                        const isCompleted = book.testCount > 0 && book.solvedTestCount === book.testCount;
                        const isReading = book.solvedTestCount > 0 && book.solvedTestCount < book.testCount;
                        const colors = cardGradients[index % cardGradients.length];

                        return (
                            <View key={book.id} style={{ width: Platform.OS === 'web' ? cardWidth as any : (isDesktop ? '33.33%' : isTablet ? '50%' : '100%'), padding: 8 }}>
                                <TouchableOpacity 
                                    onPress={() => router.push({ pathname: '/book-detail', params: { id: book.id } })}
                                    activeOpacity={0.9}
                                    style={{ borderRadius: 20, overflow: 'hidden', height: 180 }}
                                >
                                    <LinearGradient colors={colors as any} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ flex: 1, padding: 20 }}>
                                        <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.1)' }]} />
                                        
                                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', flex: 1, zIndex: 1 }}>
                                            <View style={{ flex: 1, paddingRight: 16 }}>
                                                <Text style={{ fontSize: 18, fontWeight: '800', color: '#ffffff', marginBottom: 4 }} numberOfLines={2}>{book.title || 'İsimsiz Kitap'}</Text>
                                                <Text style={{ fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.7)' }}>{book.publisher}</Text>
                                            </View>
                                            <View style={{ flexDirection: 'row', gap: 6 }}>
                                                <TouchableOpacity onPress={() => router.push({ pathname: '/new-tracked-book', params: { id: book.id } })} style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' }}>
                                                    <PenTool size={14} color="white" />
                                                </TouchableOpacity>
                                                <TouchableOpacity onPress={() => handleDelete(book.id)} style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(225, 29, 72, 0.8)', alignItems: 'center', justifyContent: 'center' }}>
                                                    <Trash2 size={14} color="white" />
                                                </TouchableOpacity>
                                            </View>
                                        </View>

                                        <View style={{ zIndex: 1 }}>
                                            <View style={{ alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, backgroundColor: 'rgba(0,0,0,0.2)', marginBottom: 12 }}>
                                                <Text style={{ fontSize: 10, fontWeight: '800', color: '#ffffff' }}>
                                                    {book.bookType === 'open_ended' ? 'AÇIK UÇLU' : 'STANDART SORU BANKASI'}
                                                </Text>
                                            </View>
                                            
                                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.15)', padding: 12, borderRadius: 14 }}>
                                                <Text style={{ fontSize: 12, fontWeight: '600', color: 'rgba(255,255,255,0.9)' }}>
                                                    Çözülen: <Text style={{ fontWeight: '800', color: 'white' }}>{book.solvedTestCount}</Text> / {book.testCount}
                                                </Text>
                                                {isCompleted && (
                                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                                        <CheckCircle size={14} color="#34d399" />
                                                        <Text style={{ fontSize: 11, fontWeight: '800', color: '#6ee7b7' }}>TAMAMLANDI</Text>
                                                    </View>
                                                )}
                                            </View>
                                        </View>
                                    </LinearGradient>
                                </TouchableOpacity>
                            </View>
                        );
                    })}
                </View>
            )}
            <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
