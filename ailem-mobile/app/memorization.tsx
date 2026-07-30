import {
  View, Text, ScrollView, TouchableOpacity, ActivityIndicator,
  TextInput, Modal, KeyboardAvoidingView, Platform, Image, Alert,
  StyleSheet, Dimensions,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useEffect, useState, useMemo } from 'react';
import {
  onMemorizationItemsUpdate, onMemorizationProgressUpdate,
  updateMemorizationProgress, addMemorizationItem, deleteMemorizationItem,
  removeMemorizationProgress, resetAllMemorizationProgress, deleteAllMemorizationItems,
} from '../lib/dataService';
import { MemorizationItem, MemorizationProgress, FamilyMember } from '../lib/data';
import {
  Brain, ChevronLeft, Plus, CheckCircle2, BookOpen, Trash2, X,
  Sparkles, FilePlus, RefreshCcw, Search, Check, ChevronDown, ChevronUp,
} from 'lucide-react-native';
import { useRouter, Stack } from 'expo-router';
import { useAuth } from '../context/auth-context';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown, FadeInUp, useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';
import { useColorScheme } from 'nativewind';

const { width: SW } = Dimensions.get('window');

/* ─── tiny ring ─── */
function ProgressRing({ pct, size = 56, stroke = 5, color = '#6366f1' }: { pct: number; size?: number; stroke?: number; color?: string }) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;
  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: [{ rotate: '-90deg' }] }}>
      <Circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth={stroke} />
      <Circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke}
        strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round" />
    </Svg>
  );
}

export default function MemorizationScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { familyMembers } = useAuth();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [items, setItems] = useState<MemorizationItem[]>([]);
  const [progress, setProgress] = useState<MemorizationProgress[]>([]);
  const [selectedMember, setSelectedMember] = useState<FamilyMember | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'mylist' | 'library'>('mylist');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedShelves, setExpandedShelves] = useState<Record<string, boolean>>({});

  // Modals
  const [viewingItem, setViewingItem] = useState<MemorizationItem | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [newItemTitle, setNewItemTitle] = useState('');
  const [newItemTag, setNewItemTag] = useState('');
  const [bulkText, setBulkText] = useState('');
  const [bulkCategory, setBulkCategory] = useState('');
  const [isImporting, setIsImporting] = useState(false);

  // Theme
  const bg = isDark ? '#0a0a14' : '#f8faff';
  const cardBg = isDark ? 'rgba(255,255,255,0.05)' : '#ffffff';
  const cardBorder = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';
  const textMain = isDark ? '#f1f5f9' : '#0f172a';
  const textSub = isDark ? '#94a3b8' : '#64748b';

  useEffect(() => {
    if (familyMembers.length > 0 && !selectedMember) setSelectedMember(familyMembers[0]);
  }, [familyMembers]);

  useEffect(() => {
    const u1 = onMemorizationItemsUpdate(d => setItems(d));
    const u2 = onMemorizationProgressUpdate(d => { setProgress(d); setLoading(false); });
    return () => { u1(); u2(); };
  }, []);

  /* ─── memoized data ─── */
  const progressMap = useMemo(() => {
    const m = new Map<string, boolean>();
    progress.forEach(p => m.set(`${p.itemId}_${p.memberId}`, p.completed));
    return m;
  }, [progress]);

  const { myItems, completedItems, libraryShelves, totalAssigned, totalDone } = useMemo(() => {
    const mId = selectedMember?.id;
    const q = searchQuery.toLowerCase();
    const filter = (i: MemorizationItem) => !q || i.title.toLowerCase().includes(q) || i.tags?.some(t => t.toLowerCase().includes(q));

    const assigned = items.filter(i => progressMap.has(`${i.id}_${mId}`) && filter(i));
    const mine = assigned.filter(i => !progressMap.get(`${i.id}_${mId}`));
    const done = assigned.filter(i => progressMap.get(`${i.id}_${mId}`));

    const lib = items.filter(filter);
    const grouped: Record<string, MemorizationItem[]> = {};
    lib.forEach(i => {
      const tags = i.tags?.length ? i.tags : ['Diğer'];
      tags.forEach(t => { if (!grouped[t]) grouped[t] = []; if (!grouped[t].some(x => x.id === i.id)) grouped[t].push(i); });
    });
    const sortNum = (title: string): [number | null, string] => {
      const m = title.match(/^(\d+)\s*[\.-]?\s*(.*)/);
      return m ? [parseInt(m[1], 10), m[2]] : [null, title];
    };
    for (const k in grouped) {
      grouped[k].sort((a, b) => {
        const [na, ta] = sortNum(a.title); const [nb, tb] = sortNum(b.title);
        if (na !== null && nb !== null && na !== nb) return na - nb;
        if (na !== null) return -1; if (nb !== null) return 1;
        return ta.localeCompare(tb);
      });
    }

    return {
      myItems: mine,
      completedItems: done,
      libraryShelves: Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b)),
      totalAssigned: assigned.length,
      totalDone: done.length,
    };
  }, [items, progress, selectedMember, searchQuery, progressMap]);

  const pct = totalAssigned > 0 ? Math.round((totalDone / totalAssigned) * 100) : 0;

  /* ─── actions ─── */
  const toggleCompletion = async (itemId: string, done: boolean) => {
    if (!selectedMember) return;
    await updateMemorizationProgress(itemId, selectedMember.id, done);
  };
  const removeFromList = async (itemId: string) => {
    if (!selectedMember) return;
    await removeMemorizationProgress(itemId, selectedMember.id);
  };
  const addToList = async (itemId: string) => {
    if (!selectedMember) return;
    await updateMemorizationProgress(itemId, selectedMember.id, false);
  };
  const handleSave = async () => {
    if (!newItemTitle.trim()) return;
    await addMemorizationItem({ title: newItemTitle.trim(), tags: newItemTag.trim() ? [newItemTag.trim()] : ['Diğer'], imageUrl: '' });
    setNewItemTitle(''); setNewItemTag(''); setIsAddModalOpen(false);
  };
  const handleBulk = async () => {
    const titles = bulkText.split('\n').map(t => t.trim()).filter(Boolean);
    if (!titles.length || !bulkCategory.trim()) { Alert.alert('Eksik', 'Kategori ve içerik girin.'); return; }
    setIsImporting(true);
    for (const t of titles) await addMemorizationItem({ title: t, tags: [bulkCategory.trim()], imageUrl: '' });
    Alert.alert('Tamam', `${titles.length} öğe eklendi.`);
    setBulkText(''); setBulkCategory(''); setIsBulkModalOpen(false); setIsImporting(false);
  };
  const toggleShelf = (name: string) => setExpandedShelves(p => ({ ...p, [name]: !p[name] }));

  if (loading) return (
    <View style={{ flex: 1, backgroundColor: bg, justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator size="large" color="#6366f1" />
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: bg }}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* ── HERO HEADER ── */}
      <LinearGradient
        colors={isDark ? ['#1a0533', '#2d1b69', '#1e1b4b'] : ['#4f46e5', '#7c3aed']}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={{ paddingTop: insets.top + 12, paddingBottom: 24, paddingHorizontal: 20, borderBottomLeftRadius: 32, borderBottomRightRadius: 32 }}
      >
        {/* Top row */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <TouchableOpacity onPress={() => router.back()}
            style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' }}>
            <ChevronLeft size={22} color="white" />
          </TouchableOpacity>

          <View style={{ alignItems: 'center', flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              <Sparkles size={18} color="#fcd34d" />
              <Text style={{ color: 'white', fontSize: 20, fontWeight: '900', letterSpacing: -0.4 }}>Ezber Takibi</Text>
            </View>
            <Text style={{ color: 'rgba(255,255,255,0.65)', fontSize: 11, fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase' }}>Sure · Dua · Konu</Text>
          </View>

          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity onPress={() => setIsBulkModalOpen(true)}
              style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' }}>
              <FilePlus size={20} color="white" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Member selector */}
        {familyMembers.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingBottom: 4 }}>
            {familyMembers.map(m => {
              const sel = selectedMember?.id === m.id;
              return (
                <TouchableOpacity key={m.id} onPress={() => setSelectedMember(m)} activeOpacity={0.8}>
                  <View style={{
                    flexDirection: 'row', alignItems: 'center', gap: 8,
                    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 18,
                    backgroundColor: sel ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.12)',
                    borderWidth: 1, borderColor: sel ? 'transparent' : 'rgba(255,255,255,0.2)',
                  }}>
                    <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: sel ? '#6366f1' : 'rgba(255,255,255,0.25)', alignItems: 'center', justifyContent: 'center' }}>
                      <Text style={{ fontSize: 13, fontWeight: '900', color: 'white' }}>{m.name.charAt(0)}</Text>
                    </View>
                    <Text style={{ fontSize: 13, fontWeight: '900', color: sel ? '#4f46e5' : 'white' }}>{m.name.split(' ')[0]}</Text>
                    {sel && <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#34d399' }} />}
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}
      </LinearGradient>

      {/* ── PROGRESS SUMMARY CARD ── */}
      {selectedMember && (
        <Animated.View entering={FadeInDown.delay(80).springify()} style={{ marginHorizontal: 20, marginTop: -20, marginBottom: 16 }}>
          <View style={{
            backgroundColor: cardBg, borderRadius: 24, borderWidth: 1, borderColor: cardBorder,
            padding: 20, flexDirection: 'row', alignItems: 'center', gap: 20,
            shadowColor: '#6366f1', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.12, shadowRadius: 20, elevation: 6,
          }}>
            {/* Ring */}
            <View style={{ position: 'relative', width: 64, height: 64, alignItems: 'center', justifyContent: 'center' }}>
              <ProgressRing pct={pct} size={64} stroke={6} color={pct === 100 ? '#10b981' : '#6366f1'} />
              <View style={{ position: 'absolute' }}>
                <Text style={{ fontSize: 14, fontWeight: '900', color: pct === 100 ? '#10b981' : '#6366f1', textAlign: 'center' }}>%{pct}</Text>
              </View>
            </View>

            {/* Stats */}
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 16, fontWeight: '900', color: textMain, marginBottom: 4 }}>
                {selectedMember.name.split(' ')[0]}'in İlerlemesi
              </Text>
              <Text style={{ fontSize: 12, fontWeight: '700', color: textSub }}>
                {totalDone} / {totalAssigned} tamamlandı
              </Text>
            </View>

            {/* Mini stats */}
            <View style={{ gap: 8 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#6366f1' }} />
                <Text style={{ fontSize: 11, fontWeight: '800', color: textSub }}>{myItems.length} bekliyor</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#10b981' }} />
                <Text style={{ fontSize: 11, fontWeight: '800', color: textSub }}>{totalDone} bitti</Text>
              </View>
            </View>
          </View>
        </Animated.View>
      )}

      {/* ── SEARCH ── */}
      <Animated.View entering={FadeInDown.delay(120).springify()} style={{ paddingHorizontal: 20, marginBottom: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: cardBg, borderRadius: 18, borderWidth: 1, borderColor: cardBorder, paddingHorizontal: 14, gap: 10 }}>
          <Search size={18} color={textSub} />
          <TextInput
            placeholder="Sure veya dua ara..."
            placeholderTextColor={textSub}
            style={{ flex: 1, height: 46, fontSize: 14, fontWeight: '600', color: textMain }}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <X size={16} color={textSub} />
            </TouchableOpacity>
          )}
        </View>
      </Animated.View>

      {/* ── TABS ── */}
      <Animated.View entering={FadeInDown.delay(150).springify()} style={{ flexDirection: 'row', marginHorizontal: 20, marginBottom: 16, backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#f1f5f9', borderRadius: 18, padding: 4, borderWidth: 1, borderColor: cardBorder }}>
        {([['mylist', '📋 Listem'], ['library', '📚 Kütüphane']] as const).map(([tab, label]) => (
          <TouchableOpacity key={tab} onPress={() => setActiveTab(tab)} style={{ flex: 1, paddingVertical: 10, borderRadius: 14, alignItems: 'center', backgroundColor: activeTab === tab ? (isDark ? '#4f46e5' : 'white') : 'transparent', shadowColor: activeTab === tab ? '#6366f1' : 'transparent', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 8 }}>
            <Text style={{ fontSize: 13, fontWeight: '900', color: activeTab === tab ? (isDark ? 'white' : '#4f46e5') : textSub }}>{label}</Text>
          </TouchableOpacity>
        ))}
      </Animated.View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 120 }}>

        {/* ══════════ MY LIST TAB ══════════ */}
        {activeTab === 'mylist' && (
          <View>
            {totalAssigned === 0 ? (
              <Animated.View entering={FadeInDown.springify()} style={{ alignItems: 'center', paddingVertical: 48, gap: 12 }}>
                <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: isDark ? 'rgba(99,102,241,0.15)' : 'rgba(99,102,241,0.1)', alignItems: 'center', justifyContent: 'center' }}>
                  <BookOpen size={36} color="#6366f1" />
                </View>
                <Text style={{ fontSize: 18, fontWeight: '900', color: textMain }}>Liste boş</Text>
                <Text style={{ fontSize: 13, fontWeight: '600', color: textSub, textAlign: 'center' }}>
                  Kütüphaneden öğe ekleyerek{'\n'}ezber listenizi oluşturun
                </Text>
                <TouchableOpacity onPress={() => setActiveTab('library')} style={{ backgroundColor: '#6366f1', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 16 }}>
                  <Text style={{ color: 'white', fontWeight: '900', fontSize: 14 }}>Kütüphaneye Git →</Text>
                </TouchableOpacity>
              </Animated.View>
            ) : (
              <View>
                {/* BEKLEYENLER */}
                {myItems.length > 0 && (
                  <View style={{ marginBottom: 24 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#f59e0b' }} />
                      <Text style={{ fontSize: 12, fontWeight: '900', color: textSub, textTransform: 'uppercase', letterSpacing: 1 }}>Bekleyenler · {myItems.length}</Text>
                    </View>
                    <View style={{ gap: 10 }}>
                      {myItems.map((item, idx) => (
                        <Animated.View key={item.id} entering={FadeInDown.delay(idx * 50).springify()}>
                          <MemoCard
                            item={item} done={false}
                            onCheck={() => toggleCompletion(item.id, true)}
                            onRemove={() => removeFromList(item.id)}
                            onView={() => setViewingItem(item)}
                            isDark={isDark} textMain={textMain} textSub={textSub} cardBg={cardBg} cardBorder={cardBorder}
                          />
                        </Animated.View>
                      ))}
                    </View>
                  </View>
                )}

                {/* TAMAMLANANLAR */}
                {completedItems.length > 0 && (
                  <View style={{ marginBottom: 24 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#10b981' }} />
                      <Text style={{ fontSize: 12, fontWeight: '900', color: textSub, textTransform: 'uppercase', letterSpacing: 1 }}>Ezberlenenler · {completedItems.length}</Text>
                    </View>
                    <View style={{ gap: 10 }}>
                      {completedItems.map((item, idx) => (
                        <Animated.View key={item.id} entering={FadeInDown.delay(idx * 40).springify()}>
                          <MemoCard
                            item={item} done={true}
                            onCheck={() => toggleCompletion(item.id, false)}
                            onRemove={() => removeFromList(item.id)}
                            onView={() => setViewingItem(item)}
                            isDark={isDark} textMain={textMain} textSub={textSub} cardBg={cardBg} cardBorder={cardBorder}
                          />
                        </Animated.View>
                      ))}
                    </View>
                  </View>
                )}
              </View>
            )}
          </View>
        )}

        {/* ══════════ LIBRARY TAB ══════════ */}
        {activeTab === 'library' && (
          <View>
            {libraryShelves.length === 0 ? (
              <Animated.View entering={FadeInDown.springify()} style={{ alignItems: 'center', paddingVertical: 48, gap: 12 }}>
                <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: isDark ? 'rgba(99,102,241,0.15)' : 'rgba(99,102,241,0.1)', alignItems: 'center', justifyContent: 'center' }}>
                  <BookOpen size={36} color="#6366f1" />
                </View>
                <Text style={{ fontSize: 18, fontWeight: '900', color: textMain }}>Kütüphane boş</Text>
                <Text style={{ fontSize: 13, fontWeight: '600', color: textSub, textAlign: 'center' }}>İlk ezberi ekleyin</Text>
                <TouchableOpacity onPress={() => setIsAddModalOpen(true)} style={{ backgroundColor: '#6366f1', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 16 }}>
                  <Text style={{ color: 'white', fontWeight: '900', fontSize: 14 }}>+ Ezber Ekle</Text>
                </TouchableOpacity>
              </Animated.View>
            ) : (
              <View style={{ gap: 12 }}>
                {libraryShelves.map(([shelf, shelfItems], si) => {
                  const isOpen = expandedShelves[shelf] !== false; // default open
                  const addedCount = shelfItems.filter(i => progressMap.has(`${i.id}_${selectedMember?.id}`)).length;
                  return (
                    <Animated.View key={shelf} entering={FadeInDown.delay(si * 60).springify()}>
                      {/* Shelf header */}
                      <TouchableOpacity onPress={() => toggleShelf(shelf)} activeOpacity={0.8}
                        style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, paddingHorizontal: 16, backgroundColor: cardBg, borderRadius: 18, borderWidth: 1, borderColor: cardBorder, marginBottom: isOpen ? 8 : 0 }}>
                        <LinearGradient
                          colors={shelfGradient(si)} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                          style={{ width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' }}>
                          <Text style={{ fontSize: 16 }}>{shelfEmoji(shelf)}</Text>
                        </LinearGradient>
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 14, fontWeight: '900', color: textMain }}>{shelf}</Text>
                          <Text style={{ fontSize: 11, fontWeight: '700', color: textSub }}>{addedCount}/{shelfItems.length} listede</Text>
                        </View>
                        {/* Mini progress */}
                        <View style={{ width: 48, height: 6, borderRadius: 3, backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : '#e2e8f0', overflow: 'hidden', marginRight: 8 }}>
                          <View style={{ height: '100%', width: `${shelfItems.length > 0 ? (addedCount / shelfItems.length) * 100 : 0}%`, backgroundColor: '#6366f1', borderRadius: 3 }} />
                        </View>
                        {isOpen ? <ChevronUp size={16} color={textSub} /> : <ChevronDown size={16} color={textSub} />}
                      </TouchableOpacity>

                      {isOpen && (
                        <View style={{ gap: 8 }}>
                          {shelfItems.map((item, idx) => {
                            const isAdded = progressMap.has(`${item.id}_${selectedMember?.id}`);
                            return (
                              <Animated.View key={item.id} entering={FadeInDown.delay(idx * 30).springify()}>
                                <LibraryCard
                                  item={item} isAdded={isAdded}
                                  onAdd={() => addToList(item.id)}
                                  onView={() => setViewingItem(item)}
                                  onDelete={() => {
                                    if (Platform.OS === 'web') {
                                      if (window.confirm('Bu öğeyi kütüphaneden kaldırmak istediğinize emin misiniz?')) {
                                        deleteMemorizationItem(item.id);
                                      }
                                    } else {
                                      Alert.alert('Sil', 'Bu öğeyi kütüphaneden kaldır?', [{ text: 'İptal', style: 'cancel' }, { text: 'Sil', style: 'destructive', onPress: () => deleteMemorizationItem(item.id) }]);
                                    }
                                  }}
                                  isDark={isDark} textMain={textMain} textSub={textSub} cardBg={cardBg} cardBorder={cardBorder}
                                />
                              </Animated.View>
                            );
                          })}
                        </View>
                      )}
                    </Animated.View>
                  );
                })}
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* ── FAB ── */}
      <View style={{ position: 'absolute', bottom: insets.bottom + 24, right: 20, gap: 12 }}>
        <TouchableOpacity onPress={() => setIsBulkModalOpen(true)} activeOpacity={0.85}
          style={{ width: 50, height: 50, borderRadius: 25, backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(99,102,241,0.1)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(99,102,241,0.2)', shadowColor: '#6366f1', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 10 }}>
          <FilePlus size={22} color="#6366f1" />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setIsAddModalOpen(true)} activeOpacity={0.85}
          style={{ width: 60, height: 60, borderRadius: 30, backgroundColor: '#4f46e5', alignItems: 'center', justifyContent: 'center', shadowColor: '#4f46e5', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.5, shadowRadius: 20, elevation: 12 }}>
          <Plus size={28} color="white" />
        </TouchableOpacity>
      </View>

      {/* ─── ADD SINGLE MODAL ─── */}
      <Modal visible={isAddModalOpen} transparent animationType="slide" onRequestClose={() => setIsAddModalOpen(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)' }}>
          <View style={{ backgroundColor: isDark ? '#1e1e30' : 'white', borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 24, paddingBottom: insets.bottom + 24 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <Text style={{ fontSize: 20, fontWeight: '900', color: textMain }}>Yeni Ezber Ekle</Text>
              <TouchableOpacity onPress={() => setIsAddModalOpen(false)} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#f1f5f9', alignItems: 'center', justifyContent: 'center' }}>
                <X size={18} color={textSub} />
              </TouchableOpacity>
            </View>

            <Text style={{ fontSize: 11, fontWeight: '900', color: textSub, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Başlık</Text>
            <TextInput
              style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#f8faff', borderWidth: 1, borderColor: cardBorder, borderRadius: 16, padding: 14, fontSize: 15, fontWeight: '700', color: textMain, marginBottom: 16 }}
              placeholder="Örn: Yasin Suresi" placeholderTextColor={textSub}
              value={newItemTitle} onChangeText={setNewItemTitle}
            />

            <Text style={{ fontSize: 11, fontWeight: '900', color: textSub, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Kategori</Text>
            <TextInput
              style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#f8faff', borderWidth: 1, borderColor: cardBorder, borderRadius: 16, padding: 14, fontSize: 15, fontWeight: '700', color: textMain, marginBottom: 24 }}
              placeholder="Örn: Sure, Dua, Hadis" placeholderTextColor={textSub}
              value={newItemTag} onChangeText={setNewItemTag}
            />

            <TouchableOpacity onPress={handleSave} style={{ borderRadius: 18, overflow: 'hidden' }}>
              <LinearGradient colors={['#4f46e5', '#7c3aed']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={{ padding: 16, alignItems: 'center' }}>
                <Text style={{ color: 'white', fontSize: 16, fontWeight: '900' }}>Kaydet</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ─── BULK ADD MODAL ─── */}
      <Modal visible={isBulkModalOpen} transparent animationType="slide" onRequestClose={() => setIsBulkModalOpen(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)' }}>
          <View style={{ backgroundColor: isDark ? '#1e1e30' : 'white', borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 24, paddingBottom: insets.bottom + 24 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <Text style={{ fontSize: 20, fontWeight: '900', color: textMain }}>Toplu Ekle</Text>
              <TouchableOpacity onPress={() => setIsBulkModalOpen(false)} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#f1f5f9', alignItems: 'center', justifyContent: 'center' }}>
                <X size={18} color={textSub} />
              </TouchableOpacity>
            </View>
            <Text style={{ fontSize: 12, fontWeight: '700', color: textSub, marginBottom: 20 }}>Her satıra bir başlık yazın — hepsine aynı kategori uygulanır</Text>

            <Text style={{ fontSize: 11, fontWeight: '900', color: textSub, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Kategori</Text>
            <TextInput
              style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#f8faff', borderWidth: 1, borderColor: cardBorder, borderRadius: 16, padding: 14, fontSize: 15, fontWeight: '700', color: textMain, marginBottom: 16 }}
              placeholder="Örn: Sure" placeholderTextColor={textSub}
              value={bulkCategory} onChangeText={setBulkCategory}
            />

            <Text style={{ fontSize: 11, fontWeight: '900', color: textSub, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Liste (alt alta)</Text>
            <TextInput
              style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#f8faff', borderWidth: 1, borderColor: cardBorder, borderRadius: 16, padding: 14, fontSize: 14, fontWeight: '600', color: textMain, marginBottom: 24, height: 140, textAlignVertical: 'top' }}
              placeholder={'Fatiha Suresi\nİhlas Suresi\nAyetel Kürsi'}
              placeholderTextColor={textSub}
              multiline value={bulkText} onChangeText={setBulkText}
            />

            <TouchableOpacity onPress={handleBulk} disabled={isImporting} style={{ borderRadius: 18, overflow: 'hidden', opacity: isImporting ? 0.7 : 1 }}>
              <LinearGradient colors={['#4f46e5', '#7c3aed']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={{ padding: 16, alignItems: 'center' }}>
                {isImporting ? <ActivityIndicator color="white" /> : <Text style={{ color: 'white', fontSize: 16, fontWeight: '900' }}>İçeri Aktar</Text>}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ─── VIEWER MODAL ─── */}
      <Modal transparent visible={viewingItem !== null} animationType="slide" onRequestClose={() => setViewingItem(null)}>
        <View style={{ flex: 1, backgroundColor: isDark ? '#020617' : '#f8faff', marginTop: 40, borderTopLeftRadius: 32, borderTopRightRadius: 32, overflow: 'hidden' }}>
          <View style={{ position: 'absolute', top: 16, right: 16, zIndex: 50, backgroundColor: 'rgba(0,0,0,0.3)', padding: 8, borderRadius: 20 }}>
             <TouchableOpacity onPress={() => setViewingItem(null)}>
                <X size={24} color="white" />
             </TouchableOpacity>
          </View>
          <View style={{ backgroundColor: isDark ? '#0f172a' : 'white', padding: 24, paddingRight: 48, borderBottomWidth: 1, borderBottomColor: cardBorder }}>
             <Text style={{ fontSize: 24, fontWeight: '900', color: textMain }}>{viewingItem?.title}</Text>
             <View style={{ backgroundColor: isDark ? 'rgba(99,102,241,0.2)' : '#e0e7ff', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12, alignSelf: 'flex-start', marginTop: 8 }}>
               <Text style={{ color: '#4f46e5', fontWeight: '800', fontSize: 12 }}>{viewingItem?.tags?.[0] || 'Diğer'}</Text>
             </View>
          </View>
          <ScrollView style={{ flex: 1, backgroundColor: isDark ? '#020617' : '#f1f5f9' }} contentContainerStyle={{ padding: 16 }}>
             {viewingItem?.imageUrl ? (
               <View style={{ width: '100%', height: 500, backgroundColor: isDark ? '#0f172a' : 'white', borderRadius: 24, overflow: 'hidden', borderWidth: 1, borderColor: cardBorder }}>
                  <Image source={{ uri: viewingItem.imageUrl }} style={{ width: '100%', height: '100%' }} resizeMode="contain" />
               </View>
             ) : (
               <View style={{ alignItems: 'center', justifyContent: 'center', height: 250, opacity: 0.3, marginTop: 80 }}>
                  <BookOpen size={64} color="#94a3b8" />
                  <Text style={{ color: '#94a3b8', fontWeight: '800', marginTop: 16, fontSize: 18 }}>Görsel bulunmuyor.</Text>
               </View>
             )}
             <View style={{ height: 100 }} />
          </ScrollView>
        </View>
      </Modal>

    </View>
  );
}

/* ─── MEMO CARD (My List) ─── */
function MemoCard({ item, done, onCheck, onRemove, onView, isDark, textMain, textSub, cardBg, cardBorder }: any) {
  return (
    <View style={{
      flexDirection: 'row', alignItems: 'center', gap: 12,
      backgroundColor: done ? (isDark ? 'rgba(16,185,129,0.08)' : 'rgba(16,185,129,0.06)') : cardBg,
      borderRadius: 20, padding: 14,
      borderWidth: 1, borderColor: done ? 'rgba(16,185,129,0.2)' : cardBorder,
      shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8,
    }}>
      {/* Check button */}
      <TouchableOpacity onPress={onCheck} activeOpacity={0.7}
        style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: done ? '#10b981' : (isDark ? 'rgba(255,255,255,0.08)' : '#f1f5f9'), alignItems: 'center', justifyContent: 'center', borderWidth: done ? 0 : 2, borderColor: isDark ? 'rgba(255,255,255,0.15)' : '#e2e8f0' }}>
        {done ? <Check size={22} color="white" strokeWidth={3} /> : <View style={{ width: 12, height: 12, borderRadius: 6, borderWidth: 2, borderColor: '#94a3b8' }} />}
      </TouchableOpacity>

      {/* Thumbnail */}
      <TouchableOpacity onPress={onView} activeOpacity={0.8} style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#f1f5f9', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderWidth: 1, borderColor: cardBorder }}>
         {item.imageUrl ? (
           <Image source={{ uri: item.imageUrl }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
         ) : (
           <BookOpen size={20} color="#94a3b8" />
         )}
      </TouchableOpacity>

      {/* Info */}
      <TouchableOpacity style={{ flex: 1 }} onPress={onView} activeOpacity={0.8}>
        <Text style={{ fontSize: 14, fontWeight: '800', color: done ? '#10b981' : textMain, textDecorationLine: done ? 'line-through' : 'none', marginBottom: 4 }} numberOfLines={1}>
          {item.title}
        </Text>
        <View style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(99,102,241,0.1)', alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 }}>
          <Text style={{ fontSize: 10, fontWeight: '900', color: done ? '#10b981' : '#6366f1', textTransform: 'uppercase', letterSpacing: 0.5 }}>{item.tags?.[0] || 'Diğer'}</Text>
        </View>
      </TouchableOpacity>

      {/* Remove */}
      <TouchableOpacity onPress={onRemove} style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: isDark ? 'rgba(239,68,68,0.12)' : 'rgba(239,68,68,0.08)', alignItems: 'center', justifyContent: 'center' }}>
        <Trash2 size={14} color="#ef4444" />
      </TouchableOpacity>
    </View>
  );
}

/* ─── LIBRARY CARD ─── */
function LibraryCard({ item, isAdded, onAdd, onDelete, onView, isDark, textMain, textSub, cardBg, cardBorder }: any) {
  return (
    <View style={{
      flexDirection: 'row', alignItems: 'center', gap: 12,
      backgroundColor: cardBg, borderRadius: 18, padding: 12,
      borderWidth: 1, borderColor: cardBorder,
    }}>
      <TouchableOpacity onPress={onView} activeOpacity={0.8} style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#f1f5f9', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderWidth: 1, borderColor: cardBorder }}>
         {item.imageUrl ? (
           <Image source={{ uri: item.imageUrl }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
         ) : (
           <BookOpen size={20} color="#94a3b8" />
         )}
      </TouchableOpacity>

      <TouchableOpacity style={{ flex: 1 }} onPress={onView} activeOpacity={0.8}>
        <Text style={{ fontSize: 13, fontWeight: '800', color: textMain }} numberOfLines={1}>{item.title}</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={onDelete} style={{ width: 30, height: 30, borderRadius: 9, backgroundColor: isDark ? 'rgba(239,68,68,0.1)' : 'rgba(239,68,68,0.07)', alignItems: 'center', justifyContent: 'center', marginRight: 4 }}>
        <Trash2 size={13} color="#ef4444" />
      </TouchableOpacity>

      <TouchableOpacity onPress={isAdded ? undefined : onAdd} disabled={isAdded} activeOpacity={0.8}
        style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12, backgroundColor: isAdded ? (isDark ? 'rgba(16,185,129,0.15)' : 'rgba(16,185,129,0.1)') : '#4f46e5', minWidth: 80, alignItems: 'center' }}>
        <Text style={{ fontSize: 12, fontWeight: '900', color: isAdded ? '#10b981' : 'white' }}>
          {isAdded ? '✓ Listede' : '+ Ekle'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

/* ─── helpers ─── */
const SHELF_GRADIENTS = [
  ['#4f46e5', '#7c3aed'],
  ['#0891b2', '#0e7490'],
  ['#059669', '#047857'],
  ['#d97706', '#b45309'],
  ['#dc2626', '#b91c1c'],
  ['#7c3aed', '#6d28d9'],
] as const;

function shelfGradient(idx: number): readonly [string, string] {
  return SHELF_GRADIENTS[idx % SHELF_GRADIENTS.length];
}

function shelfEmoji(name: string): string {
  const n = name.toLowerCase();
  if (n.includes('sure') || n.includes('sûre')) return '📖';
  if (n.includes('dua')) return '🤲';
  if (n.includes('hadis')) return '📜';
  if (n.includes('namaz')) return '🕌';
  if (n.includes('matematik') || n.includes('math')) return '📐';
  if (n.includes('fen')) return '🧬';
  if (n.includes('tarih')) return '🏛️';
  if (n.includes('coğrafya')) return '🌍';
  if (n.includes('ingilizce') || n.includes('english')) return '🇬🇧';
  return '📚';
}
