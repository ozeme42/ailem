import { LinearGradient } from 'expo-linear-gradient';
import { Stack, useRouter } from 'expo-router';
import {
    Apple,
    ArrowLeft,
    Baby,
    Beef,
    Cake,
    Check,
    CheckCircle2,
    ChevronDown,
    ChevronRight,
    ChevronUp,
    Coffee,
    Droplets,
    Edit2,
    Home, ListChecks,
    Mic,
    Milk,
    MoreVertical,
    Notebook,
    Package,
    Plus,
    Search,
    ShoppingBag,
    ShoppingCart,
    Star,
    Trash2,
    Wheat,
    X
} from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Modal, NativeModules, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ShoppingItem, ShoppingList } from '../../lib/data';
import {
    addShoppingList,
    addShoppingListItemToList,
    deleteShoppingList,
    deleteShoppingListItemFromList,
    moveItemToBought, moveItemToPending,
    onShoppingListsUpdate,
    updateShoppingList
} from '../../lib/dataService';

// ─── CATEGORY CONFIG ──────────────────────────────────────────────────────────
const CATEGORY_CONFIG: Record<string, {
  icon: any;
  color: string;
  bgColor: string;
  lightBg: string;
  cardBg: string;
  cardText: string;
  solidBg: string;
  solidText: string;
  lightBorder: string;
}> = {
  'Meyve ve Sebze':       { icon: Apple,      color: '#16a34a', bgColor: '#dcfce7', lightBg: '#dcfce7', cardBg: '#f0fdf4', cardText: '#14532d', solidBg: '#22c55e', solidText: '#16a34a', lightBorder: '#86efac' },
  'Et ve Tavuk Ürünleri': { icon: Beef,       color: '#dc2626', bgColor: '#fee2e2', lightBg: '#fee2e2', cardBg: '#fff1f2', cardText: '#7f1d1d', solidBg: '#ef4444', solidText: '#dc2626', lightBorder: '#fca5a5' },
  'Süt Ürünleri':         { icon: Milk,       color: '#2563eb', bgColor: '#dbeafe', lightBg: '#dbeafe', cardBg: '#eff6ff', cardText: '#1e3a8a', solidBg: '#3b82f6', solidText: '#2563eb', lightBorder: '#93c5fd' },
  'Unlu Mamüller':        { icon: Wheat,      color: '#d97706', bgColor: '#fef3c7', lightBg: '#fef3c7', cardBg: '#fffbeb', cardText: '#78350f', solidBg: '#f59e0b', solidText: '#d97706', lightBorder: '#fcd34d' },
  'Temel Gıda':           { icon: Package,    color: '#ea580c', bgColor: '#ffedd5', lightBg: '#ffedd5', cardBg: '#fff7ed', cardText: '#7c2d12', solidBg: '#f97316', solidText: '#ea580c', lightBorder: '#fdba74' },
  'Atıştırmalık':         { icon: Coffee,     color: '#9333ea', bgColor: '#f3e8ff', lightBg: '#f3e8ff', cardBg: '#faf5ff', cardText: '#581c87', solidBg: '#a855f7', solidText: '#9333ea', lightBorder: '#d8b4fe' },
  'İçecekler':            { icon: Droplets,   color: '#0891b2', bgColor: '#cffafe', lightBg: '#cffafe', cardBg: '#ecfeff', cardText: '#164e63', solidBg: '#06b6d4', solidText: '#0891b2', lightBorder: '#67e8f9' },
  'Dondurulmuş Gıdalar':  { icon: Package,    color: '#0284c7', bgColor: '#e0f2fe', lightBg: '#e0f2fe', cardBg: '#f0f9ff', cardText: '#0c4a6e', solidBg: '#0ea5e9', solidText: '#0284c7', lightBorder: '#7dd3fc' },
  'Temizlik Ürünleri':    { icon: Droplets,   color: '#0d9488', bgColor: '#ccfbf1', lightBg: '#ccfbf1', cardBg: '#f0fdfa', cardText: '#134e4a', solidBg: '#14b8a6', solidText: '#0d9488', lightBorder: '#5eead4' },
  'Kişisel Bakım':        { icon: Star,       color: '#db2777', bgColor: '#fce7f3', lightBg: '#fce7f3', cardBg: '#fdf2f8', cardText: '#831843', solidBg: '#ec4899', solidText: '#db2777', lightBorder: '#f9a8d4' },
  'Bebek Ürünleri':       { icon: Baby,       color: '#7c3aed', bgColor: '#ede9fe', lightBg: '#ede9fe', cardBg: '#f5f3ff', cardText: '#4c1d95', solidBg: '#8b5cf6', solidText: '#7c3aed', lightBorder: '#c4b5fd' },
  'Diğer':                { icon: ShoppingBag, color: '#64748b', bgColor: '#f1f5f9', lightBg: '#f1f5f9', cardBg: '#f8fafc', cardText: '#334155', solidBg: '#94a3b8', solidText: '#64748b', lightBorder: '#cbd5e1' },
};

const CATEGORY_ORDER = [
  'Meyve ve Sebze', 'Et ve Tavuk Ürünleri', 'Süt Ürünleri', 'Unlu Mamüller',
  'Temel Gıda', 'Atıştırmalık', 'İçecekler', 'Dondurulmuş Gıdalar',
  'Temizlik Ürünleri', 'Kişisel Bakım', 'Bebek Ürünleri', 'Diğer'
];
const CATEGORIES = Object.keys(CATEGORY_CONFIG);

// ─── THEME CONFIG ─────────────────────────────────────────────────────────────
const LIST_THEMES: Record<string, {
  id: string;
  label: string;
  gradient: string[];
  solidBg: string;
  pageBg: string;
}> = {
  indigo:  { id: 'indigo',  label: 'Mor',   gradient: ['#6366f1', '#7c3aed'], solidBg: '#6366f1', pageBg: '#f5f3ff' },
  emerald: { id: 'emerald', label: 'Yeşil', gradient: ['#10b981', '#059669'], solidBg: '#10b981', pageBg: '#ecfdf5' },
  rose:    { id: 'rose',    label: 'Pembe', gradient: ['#f43f5e', '#e11d48'], solidBg: '#f43f5e', pageBg: '#fff1f2' },
  amber:   { id: 'amber',   label: 'Sarı',  gradient: ['#f59e0b', '#d97706'], solidBg: '#f59e0b', pageBg: '#fffbeb' },
  cyan:    { id: 'cyan',    label: 'Mavi',  gradient: ['#06b6d4', '#0891b2'], solidBg: '#06b6d4', pageBg: '#ecfeff' },
  fuchsia: { id: 'fuchsia', label: 'Fuşya', gradient: ['#d946ef', '#c026d3'], solidBg: '#d946ef', pageBg: '#fdf4ff' },
};

const LIST_ICONS: Record<string, any> = {
  ShoppingCart, Home, ListChecks, Cake, Notebook, ShoppingBag
};

// ─── SUGGESTIONS ──────────────────────────────────────────────────────────────
const defaultShoppingItems = [
  "Süt", "Ekmek", "Yumurta", "Peynir", "Zeytin", "Domates", "Salatalık",
  "Biber", "Soğan", "Sarımsak", "Patates", "Elma", "Muz", "Portakal",
  "Limon", "Tavuk", "Kıyma", "Balık", "Pirinç", "Bulgur", "Makarna",
  "Salça", "Sıvı Yağ", "Tereyağı", "Un", "Şeker", "Tuz", "Çay",
  "Kahve", "Yoğurt", "Su", "Meyve Suyu", "Deterjan", "Çamaşır Suyu",
  "Bulaşık Deterjanı", "Şampuan", "Sabun", "Diş Macunu", "Tuvalet Kağıdı", "Kağıt Havlu"
];

// ─── PARSER ───────────────────────────────────────────────────────────────────
function parseShoppingItem(rawText: string): { name: string; quantity?: string; category: string }[] {
  const parts = rawText.split(',').map(p => p.trim()).filter(Boolean);
  return parts.map(part => {
    const qtyRegex = /^(\d+(?:\.\d+)?\s*(?:kg|g|kilo|gram|adet|paket|lt|litre|şişe|bardak|koli|l|ml)?)\s+(.+)$/i;
    const qtyRegexEnd = /^(.+?)\s+(\d+(?:\.\d+)?\s*(?:kg|g|kilo|gram|adet|paket|lt|litre|şişe|bardak|koli|l|ml)?)$/i;
    let name = part, quantity = '';
    let match = part.match(qtyRegex);
    if (match) { quantity = match[1].trim(); name = match[2].trim(); }
    else { match = part.match(qtyRegexEnd); if (match) { name = match[1].trim(); quantity = match[2].trim(); } }
    const lowerName = name.toLowerCase();
    let category = 'Diğer';

    // Her kategori için [kelime, tamKelimeEşleşmesiGerekli] çiftleri
    // tamKelime=true olanlar sadece başlı başına bir kelime olarak eşleşir (örn. "et" → "et" ✓, "tuvalet" ✗)
    const keywords: Record<string, Array<[string, boolean]>> = {
      'Meyve ve Sebze':       [['elma',false],['armut',false],['muz',false],['çilek',false],['karpuz',false],['kavun',false],['portakal',false],['mandalina',false],['limon',false],['domates',false],['salatalık',false],['biber',false],['patates',false],['soğan',false],['sarımsak',false],['havuç',false],['ıspanak',false],['marul',false],['lahana',false],['pırasa',false],['kabak',false],['patlıcan',false],['brokoli',false],['mantar',false],['yeşillik',false],['sebze',false],['meyve',false],['turp',false],['kereviz',false],['enginar',false],['maydanoz',false],['dereotu',false],['roka',false]],
      'Süt Ürünleri':         [['süt',false],['peynir',false],['yoğurt',false],['tereyağı',false],['kaymak',false],['krema',false],['kefir',false],['ayran',false],['kaşar',false],['lor',false],['süzme',false],['labne',false],['margarin',false]],
      'Et ve Tavuk Ürünleri': [['et',true],['kıyma',false],['tavuk',false],['pirzola',false],['bonfile',false],['köfte',false],['sosis',false],['salam',false],['sucuk',false],['pastırma',false],['hindi',false],['balık',false],['somon',false],['levrek',false],['karides',false],['dana',false],['kuzu',false],['biftek',false]],
      'Unlu Mamüller':        [['ekmek',false],['pide',false],['simit',false],['poğaça',false],['açma',false],['börek',false],['çörek',false],['kurabiye',false],['kek',false],['yufka',false],['milföy',false],['tost',false],['galeta',false],['gevrek',false]],
      'Temel Gıda':           [['pirinç',false],['bulgur',false],['makarna',false],['salça',false],['zeytinyağı',false],['sıvı yağ',false],['zeytин',false],['zeytin',false],['un',true],['şeker',false],['tuz',true],['mercimek',false],['nohut',false],['fasulye',false],['baharat',false],['ketçap',false],['mayonez',false],['sirke',false],['sos',false],['konserve',false],['yağ',true]],
      'Atıştırmalık':         [['çikolata',false],['gofret',false],['bisküvi',false],['kraker',false],['cips',false],['kuruyemiş',false],['fındık',false],['fıstık',false],['ceviz',false],['badem',false],['leblebi',false],['çekirdek',false],['gummy',false],['şeker',false]],
      'İçecekler':            [['meyve suyu',false],['soda',false],['gazoz',false],['kola',false],['kahve',false],['çay',false],['limonata',false],['enerji içeceği',false],['ayran',false],['su',true]],
      'Dondurulmuş Gıdalar':  [['dondurma',false],['dondurulmuş',false],['frozen',false],['pizza',false],['mantı',false],['kroket',false]],
      'Temizlik Ürünleri':    [['deterjan',false],['çamaşır suyu',false],['yumuşatıcı',false],['sıvı sabun',false],['tuvalet kağıdı',false],['kağıt havlu',false],['çöp torbası',false],['çöp poşeti',false],['bulaşık',false],['temizlik',false],['yer bezi',false],['sünger',false],['klozet',false],['tuvalet',false],['çamaşır',false],['ütü suyu',false]],
      'Kişisel Bakım':        [['şampuan',false],['duş jeli',false],['saç kremi',false],['deodorant',false],['krem',false],['losyon',false],['diş fırçası',false],['diş macunu',false],['sabun',false],['parfüm',false],['makyaj',false],['ruj',false],['fondöten',false],['maskara',false],['tıraş',false],['after shave',false]],
      'Bebek Ürünleri':       [['bebek',false],['bez',false],['pişik',false],['mama',false],['biberon',false],['emzik',false]],
    };

    // Tam kelime eşleşmesi: başında/sonunda harf olmayan karakter (boşluk, nokta, başlangıç/bitiş)
    const isWordMatch = (text: string, word: string) => {
      const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      return new RegExp(`(^|[^a-zA-ZğüşıöçĞÜŞİÖÇ])${escaped}([^a-zA-ZğüşıöçĞÜŞİÖÇ]|$)`, 'i').test(text);
    };

    for (const [catName, pairs] of Object.entries(keywords)) {
      if (pairs.some(([word, exact]) => exact ? isWordMatch(lowerName, word) : lowerName.includes(word))) {
        category = catName;
        break;
      }
    }
    return { name, ...(quantity ? { quantity } : {}), category };
  });
}

export default function ShoppingScreen() {
  const [lists, setLists] = useState<ShoppingList[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedListId, setSelectedListId] = useState<string | null>(null);
  const router = useRouter();

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [newListIcon, setNewListIcon] = useState('ShoppingCart');
  const [newListColor, setNewListColor] = useState('indigo');
  const [editingList, setEditingList] = useState<ShoppingList | null>(null);

  const [detailTab, setDetailTab] = useState<'pending' | 'bought'>('pending');
  const [newItemName, setNewItemName] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Diğer');
  const [isCategorySelectorOpen, setIsCategorySelectorOpen] = useState(false);
  const [isAddItemOpen, setIsAddItemOpen] = useState(false);
  const [isAiProcessing, setIsAiProcessing] = useState(false);
  const [isListening, setIsListening] = useState(false);

  const [isOptionsModalOpen, setIsOptionsModalOpen] = useState(false);
  const [selectedMenuList, setSelectedMenuList] = useState<ShoppingList | null>(null);
  const [strikedItemIds, setStrikedItemIds] = useState<Set<string>>(new Set());

  const { width: winWidth, height: winHeight } = useWindowDimensions();
  const isLandscape = winWidth > winHeight;
  const isTablet = Math.min(winWidth, winHeight) >= 600;
  const isTabletLandscape = isTablet && isLandscape;
  // Always use light theme (matching web project)
  const isDark = false;

  const bg         = '#f8fafc';
  const cardBg     = '#ffffff';
  const cardBorder = 'rgba(226,232,240,0.8)';
  const textPrimary   = '#0f172a';
  const textSecondary = '#64748b';
  const textMuted     = '#94a3b8';

  useEffect(() => {
    let unsubscribe: any;
    try {
      unsubscribe = onShoppingListsUpdate((data: ShoppingList[]) => {
        setLists(data);
        setLoading(false);
        try {
          if (Platform.OS === 'android' && NativeModules.WidgetModule) {
            NativeModules.WidgetModule.setShoppingData(JSON.stringify(
              data.map(list => ({
                id: list.id,
                name: list.name,
                items: (list.items || []).map(item => ({
                  id: item.id,
                  name: item.name,
                  isBought: item.isBought || false,
                  quantity: item.quantity || ''
                }))
              }))
            ));
          }
        } catch(err) { console.log('Widget sync error', err); }
      });
    } catch (e) {
      console.log('Error fetching shopping lists:', e);
      setLoading(false);
    }

    if (Platform.OS === 'android' && NativeModules.WidgetHelper) {
      NativeModules.WidgetHelper.getPendingBoughtItems()
        .then((jsonStr: string) => {
          if (jsonStr && jsonStr !== '[]') {
            try {
              const pendingItems = JSON.parse(jsonStr);
              if (pendingItems?.length > 0) {
                pendingItems.forEach((pi: any) => { if (pi.listId && pi.id) moveItemToBought(pi.listId, pi.id); });
                NativeModules.WidgetHelper.clearPendingBoughtItems();
              }
            } catch(e) {}
          }
        }).catch(console.error);
    }

    return () => { if (typeof unsubscribe === 'function') unsubscribe(); };
  }, []);

  const sortedLists = useMemo(() => {
    return [...lists].sort((a, b) => {
      const oA = a.order ?? 0, oB = b.order ?? 0;
      if (oA !== oB) return oA - oB;
      return (b.createdAt ? new Date(b.createdAt).getTime() : 0) - (a.createdAt ? new Date(a.createdAt).getTime() : 0);
    });
  }, [lists]);

  const selectedList = useMemo(() => lists.find(l => l.id === selectedListId) || null, [lists, selectedListId]);

  const historicalItems = useMemo(() => {
    const items = new Set<string>();
    lists.forEach(l => { (l.items || []).forEach(i => items.add(i.name)); (l.boughtItems || []).forEach(i => items.add(i.name)); });
    return Array.from(items);
  }, [lists]);

  const suggestions = useMemo(() => {
    if (!newItemName.trim()) return [];
    const q = newItemName.toLowerCase();
    const hist = historicalItems.filter(i => i.toLowerCase().startsWith(q)).slice(0, 3);
    const def = defaultShoppingItems.filter(i => i.toLowerCase().startsWith(q) && !hist.includes(i)).slice(0, 3);
    return [...hist, ...def];
  }, [newItemName, historicalItems]);

  const handleSaveList = async () => {
    if (!newListName.trim()) return;
    try {
      if (editingList) {
        await updateShoppingList(editingList.id, { name: newListName.trim(), icon: newListIcon, colorId: newListColor });
        setEditingList(null);
      } else {
        await addShoppingList(newListName.trim(), newListIcon, newListColor);
      }
      setNewListName(''); setIsCreateModalOpen(false);
    } catch (e) { console.error(e); }
  };

  const handleDeleteList = async (id: string) => {
    Alert.alert("Listeyi Sil", "Bu liste ve tüm ürünleri kalıcı olarak silinecek.", [
      { text: "İptal", style: "cancel" },
      { text: "Sil", style: "destructive", onPress: async () => {
        try { await deleteShoppingList(id); if (selectedListId === id) setSelectedListId(null); setIsOptionsModalOpen(false); }
        catch (e) { console.error(e); }
      }}
    ]);
  };

  const handleMoveList = async (list: ShoppingList, dir: 'up' | 'down') => {
    const idx = sortedLists.findIndex(l => l.id === list.id);
    const targetIdx = dir === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= sortedLists.length) return;
    const targetList = sortedLists[targetIdx];
    try {
      await updateShoppingList(list.id, { order: targetList.order ?? targetIdx });
      await updateShoppingList(targetList.id, { order: list.order ?? idx });
      setIsOptionsModalOpen(false);
    } catch (e) { console.error(e); }
  };

  const handleAddItem = async (customName?: string) => {
    const inputName = customName || newItemName;
    if (!inputName.trim() || !selectedListId) return;
    setIsAiProcessing(true);
    try {
      if (inputName.includes(',')) {
        const items = parseShoppingItem(inputName);
        for (const item of items) await addShoppingListItemToList(selectedListId, { name: item.name, category: item.category, quantity: item.quantity || '', isBought: false });
      } else {
        let category = selectedCategory, quantity = '', name = inputName.trim();
        if (category === 'Diğer') { const parsed = parseShoppingItem(inputName)[0]; category = parsed.category; quantity = parsed.quantity || ''; name = parsed.name; }
        await addShoppingListItemToList(selectedListId, { name, category, quantity, isBought: false });
      }
      setNewItemName(''); setSelectedCategory('Diğer'); setIsAddItemOpen(false);
    } catch (e) { console.error(e); }
    finally { setIsAiProcessing(false); }
  };

  const toggleVoice = () => {
    if (isListening) { setIsListening(false); return; }
    setIsListening(true);
    setTimeout(() => { setNewItemName("2 kg elma, 1 lt süt, ekmek"); setIsListening(false); Alert.alert("Ses Tanımlandı", "\"2 kg elma, 1 lt süt, ekmek\" algılandı."); }, 1500);
  };

  const handleToggleItem = async (item: ShoppingItem) => {
    if (!selectedListId) return;
    try { item.isBought ? await moveItemToPending(selectedListId, item.id) : await moveItemToBought(selectedListId, item.id); }
    catch (e) { console.error(e); }
  };

  const handleStrikeItem = (itemId: string) => {
    setStrikedItemIds(prev => {
      const next = new Set(prev);
      next.has(itemId) ? next.delete(itemId) : next.add(itemId);
      return next;
    });
  };

  const handleDeleteItem = async (item: ShoppingItem) => {
    if (!selectedListId) return;
    try { await deleteShoppingListItemFromList(selectedListId, item.id, item.isBought); }
    catch (e) { console.error(e); }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: isDark ? '#070b14' : '#f5f3ff' }}>
        <LinearGradient colors={['#6366f1', '#7c3aed']} style={{ width: 64, height: 64, borderRadius: 20, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color="white" size="small" />
        </LinearGradient>
        <Text style={{ color: textMuted, fontWeight: '600', fontSize: 13, marginTop: 16 }}>Yükleniyor...</Text>
      </View>
    );
  }

  // ─── DETAIL VIEW ──────────────────────────────────────────────────────────────
  const renderDetailView = () => {
    if (!selectedList) return null;
    const theme = LIST_THEMES[selectedList.colorId || 'indigo'] || LIST_THEMES.indigo;
    const pendingItems = (selectedList.items || []).sort((a, b) => (b.createdAt ? new Date(b.createdAt).getTime() : 0) - (a.createdAt ? new Date(a.createdAt).getTime() : 0));
    const boughtItems  = (selectedList.boughtItems || []).sort((a, b) => (b.createdAt ? new Date(b.createdAt).getTime() : 0) - (a.createdAt ? new Date(a.createdAt).getTime() : 0));
    const total = pendingItems.length + boughtItems.length;
    const progress = total === 0 ? 0 : Math.round((boughtItems.length / total) * 100);
    const ListIcon = LIST_ICONS[selectedList.icon || 'ShoppingCart'] || ShoppingCart;



    return (
      <View style={{ flex: 1, backgroundColor: isDark ? '#070b14' : theme.pageBg }}>
        {/* ── Gradient Header (web-style sticky colored header) ── */}
        <LinearGradient
          colors={theme.gradient as [string, string]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.headerGradient}
        >
          <SafeAreaView edges={['top']} />
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingBottom: 12 }}>
            {!isTabletLandscape && (
              <TouchableOpacity
                onPress={() => setSelectedListId(null)}
                style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' }}
              >
                <ArrowLeft size={18} color="white" />
              </TouchableOpacity>
            )}
            <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' }}>
              <ListIcon size={18} color="white" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: 'white', fontWeight: '800', fontSize: 17, letterSpacing: -0.3 }} numberOfLines={1}>{selectedList.name}</Text>
              <Text style={{ color: 'rgba(255,255,255,0.7)', fontWeight: '600', fontSize: 11 }}>
                {pendingItems.length} bekliyor · {boughtItems.length} alındı
              </Text>
            </View>
            {total > 0 && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12 }}>
                <View style={{ width: 52, height: 6, backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: 3, overflow: 'hidden' }}>
                  <View style={{ height: '100%', width: `${progress}%`, backgroundColor: 'white', borderRadius: 3 }} />
                </View>
                <Text style={{ color: 'white', fontWeight: '800', fontSize: 12 }}>{progress}%</Text>
              </View>
            )}
            <TouchableOpacity
              onPress={() => { setSelectedMenuList(selectedList); setIsOptionsModalOpen(true); }}
              style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' }}
            >
              <MoreVertical size={16} color="white" />
            </TouchableOpacity>
          </View>

          {/* Tabs inside header (web-style) */}
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {(['pending', 'bought'] as const).map(tab => (
              <TouchableOpacity
                key={tab}
                onPress={() => setDetailTab(tab)}
                style={{
                  flex: 1, paddingVertical: 10, borderRadius: 12, alignItems: 'center',
                  backgroundColor: detailTab === tab ? 'white' : 'rgba(255,255,255,0.2)'
                }}
              >
                <Text style={{ fontWeight: '700', fontSize: 12, color: detailTab === tab ? '#1e293b' : 'white' }}>
                  {tab === 'pending' ? `🛒 Alınacaklar (${pendingItems.length})` : `✅ Alınanlar (${boughtItems.length})`}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </LinearGradient>

        {/* ── Content ── */}
        <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 20, paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
          {detailTab === 'pending' ? (
            pendingItems.length === 0 ? (
              <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 80 }}>
                <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.8)', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                  <ListChecks size={36} color={textMuted} />
                </View>
                <Text style={{ color: textPrimary, fontWeight: '700', fontSize: 16 }}>Liste boş!</Text>
                <Text style={{ color: textMuted, fontSize: 13, marginTop: 6 }}>+ butonuna basarak ürün ekle.</Text>
              </View>
            ) : (
              <View style={{ gap: 6 }}>
                {pendingItems.map((item, idx) => {
                  const cat = CATEGORY_CONFIG[item.category || 'Diğer'] || CATEGORY_CONFIG['Diğer'];
                  const CatIcon = cat.icon;
                  const isStriked = strikedItemIds.has(item.id);
                  return (
                    <TouchableOpacity
                      key={`${item.id}-${idx}`}
                      onPress={() => handleStrikeItem(item.id)}
                      activeOpacity={0.75}
                      style={{
                        flexDirection: 'row', alignItems: 'center', gap: 12,
                        paddingHorizontal: 16, paddingVertical: 14,
                        backgroundColor: isStriked ? 'rgba(255,255,255,0.6)' : (isDark ? `${cat.bgColor}15` : cat.cardBg),
                        borderWidth: 2,
                        borderColor: isStriked ? 'rgba(226,232,240,0.8)' : (isDark ? `${cat.lightBorder}30` : cat.lightBorder),
                        borderRadius: 20,
                        opacity: isStriked ? 0.7 : 1,
                      }}
                    >
                      {/* Circle */}
                      <View style={{
                        width: 24, height: 24, borderRadius: 12,
                        borderWidth: 2,
                        borderColor: isStriked ? '#10b981' : (isDark ? cat.lightBorder + '60' : cat.lightBorder),
                        backgroundColor: isStriked ? '#10b981' : (isDark ? 'rgba(255,255,255,0.06)' : 'white'),
                        flexShrink: 0,
                        alignItems: 'center', justifyContent: 'center',
                      }}>
                        {isStriked && <Check size={13} color="white" strokeWidth={3} />}
                      </View>
                      {/* Category icon */}
                      <View style={{
                        padding: 8, borderRadius: 12,
                        backgroundColor: isDark ? `${cat.bgColor}30` : cat.lightBg,
                        borderWidth: 1, borderColor: isDark ? `${cat.lightBorder}30` : cat.lightBorder,
                        flexShrink: 0,
                        opacity: isStriked ? 0.5 : 1,
                      }}>
                        <CatIcon size={16} color={isDark ? cat.lightBorder : cat.solidText} />
                      </View>
                      {/* Name */}
                      <View style={{ flex: 1 }}>
                        <Text style={{
                          fontSize: 14, fontWeight: '700',
                          color: isStriked ? textMuted : (isDark ? cat.lightBorder : cat.cardText),
                          textDecorationLine: isStriked ? 'line-through' : 'none',
                        }}>
                          {item.name}
                        </Text>
                        {item.quantity ? (
                          <Text style={{
                            fontSize: 11, color: textMuted, marginTop: 2,
                            textDecorationLine: isStriked ? 'line-through' : 'none',
                          }}>{item.quantity}</Text>
                        ) : null}
                      </View>
                      {/* Silme butonu — sadece çiziliyken */}
                      {isStriked && (
                        <TouchableOpacity
                          onPress={() => handleDeleteItem(item)}
                          style={{
                            width: 32, height: 32, borderRadius: 16,
                            alignItems: 'center', justifyContent: 'center',
                            flexShrink: 0,
                            backgroundColor: 'rgba(239,68,68,0.1)',
                          }}
                        >
                          <Trash2 size={15} color="#ef4444" />
                        </TouchableOpacity>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            )
          ) : (
            boughtItems.length === 0 ? (
              <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 60 }}>
                <CheckCircle2 size={48} color={textMuted} style={{ opacity: 0.5 }} />
                <Text style={{ color: textMuted, fontWeight: '700', fontSize: 14, marginTop: 12 }}>Henüz alınan ürün yok.</Text>
              </View>
            ) : (
              <View style={{ gap: 6 }}>
                {boughtItems.map((item, idx) => {
                  const cat = CATEGORY_CONFIG[item.category || 'Diğer'] || CATEGORY_CONFIG['Diğer'];
                  const CatIcon = cat.icon;
                  return (
                    <View key={`${item.id}-${idx}`} style={{
                      flexDirection: 'row', alignItems: 'center', gap: 12,
                      paddingHorizontal: 14, paddingVertical: 12,
                      backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.6)',
                      borderWidth: 1, borderColor: cardBorder, borderRadius: 16, opacity: 0.7
                    }}>
                      <TouchableOpacity
                        onPress={() => handleToggleItem(item)}
                        style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: '#10b981', alignItems: 'center', justifyContent: 'center' }}
                      >
                        <Check size={13} color="white" strokeWidth={3} />
                      </TouchableOpacity>
                      <View style={{ padding: 7, borderRadius: 10, backgroundColor: isDark ? `${cat.bgColor}20` : cat.lightBg, opacity: 0.6 }}>
                        <CatIcon size={14} color={isDark ? cat.lightBorder : cat.solidText} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 14, fontWeight: '600', textDecorationLine: 'line-through', color: textMuted }}>
                          {item.name}
                        </Text>
                        {item.quantity ? <Text style={{ fontSize: 11, color: textMuted, textDecorationLine: 'line-through' }}>{item.quantity}</Text> : null}
                      </View>
                      <TouchableOpacity onPress={() => handleDeleteItem(item)} style={{ width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' }}>
                        <X size={16} color={textMuted} />
                      </TouchableOpacity>
                    </View>
                  );
                })}
              </View>
            )
          )}
        </ScrollView>

        {/* FAB */}
        <TouchableOpacity
          onPress={() => { setNewItemName(''); setIsAddItemOpen(true); }}
          style={{ position: 'absolute', bottom: 96, right: 20 }}
          activeOpacity={0.85}
        >
          <LinearGradient
            colors={theme.gradient as [string, string]}
            style={styles.fabGradient}
          >
            <Plus size={26} color="white" />
          </LinearGradient>
        </TouchableOpacity>

        {/* ── Add Item Modal ── */}
        <Modal visible={isAddItemOpen} onRequestClose={() => setIsAddItemOpen(false)} transparent animationType="slide">
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)' }}>
            <View style={{ backgroundColor: isDark ? '#0f1523' : '#ffffff', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, maxHeight: '90%' }}>
              {/* Handle */}
              <View style={{ width: 40, height: 4, backgroundColor: isDark ? '#334155' : '#e2e8f0', borderRadius: 2, alignSelf: 'center', marginBottom: 20 }} />

              {/* Header */}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <View>
                  <Text style={{ fontSize: 18, fontWeight: '800', color: textPrimary }}>🛒 Ürün Ekle</Text>
                  <Text style={{ fontSize: 12, color: textSecondary, marginTop: 2 }}>Hızlı ekle veya virgülle birden fazla ürün yaz.</Text>
                </View>
                <TouchableOpacity onPress={() => setIsAddItemOpen(false)} style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: isDark ? '#1e293b' : '#f1f5f9', alignItems: 'center', justifyContent: 'center' }}>
                  <X size={16} color={textSecondary} />
                </TouchableOpacity>
              </View>

              {/* Input row */}
              <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: isDark ? '#1e293b' : '#f8fafc', borderRadius: 20, borderWidth: 1.5, borderColor: isDark ? '#334155' : '#e2e8f0', paddingLeft: 16, paddingRight: 6, marginBottom: 12, gap: 8 }}>
                <TextInput
                  style={{ flex: 1, height: 52, fontSize: 15, fontWeight: '600', color: textPrimary }}
                  placeholder="2kg domates, süt, ekmek..."
                  placeholderTextColor={textMuted}
                  value={newItemName}
                  onChangeText={setNewItemName}
                  autoFocus
                  onSubmitEditing={() => handleAddItem()}
                />
                <TouchableOpacity
                  onPress={toggleVoice}
                  style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: isDark ? '#0f1523' : 'white', alignItems: 'center', justifyContent: 'center' }}
                >
                  <Mic size={18} color={isListening ? '#ef4444' : textSecondary} />
                </TouchableOpacity>
                {isAiProcessing ? (
                  <View style={{ width: 48, height: 48, alignItems: 'center', justifyContent: 'center' }}>
                    <ActivityIndicator size="small" color={theme.solidBg} />
                  </View>
                ) : (
                  <TouchableOpacity
                    onPress={() => handleAddItem()}
                    disabled={!newItemName.trim()}
                    style={{ width: 48, height: 48, borderRadius: 14, backgroundColor: theme.solidBg, alignItems: 'center', justifyContent: 'center', opacity: newItemName.trim() ? 1 : 0.5 }}
                  >
                    <Plus size={22} color="white" />
                  </TouchableOpacity>
                )}
              </View>

              {/* Suggestions */}
              {suggestions.length > 0 && (
                <View style={{ borderWidth: 1, borderColor: isDark ? '#1e293b' : '#e2e8f0', borderRadius: 16, backgroundColor: isDark ? '#0f1523' : 'white', overflow: 'hidden', marginBottom: 12 }}>
                  {suggestions.map((s, i) => (
                    <TouchableOpacity
                      key={i}
                      onPress={() => handleAddItem(s)}
                      style={{
                        flexDirection: 'row', alignItems: 'center', gap: 10,
                        paddingHorizontal: 16, paddingVertical: 12,
                        borderBottomWidth: i < suggestions.length - 1 ? 1 : 0,
                        borderBottomColor: isDark ? '#1e293b' : '#f1f5f9'
                      }}
                    >
                      <Search size={14} color={textMuted} />
                      <Text style={{ flex: 1, fontSize: 14, fontWeight: '600', color: textPrimary }}>{s}</Text>
                      <ChevronRight size={14} color={textMuted} />
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {/* Category selector */}
              {!newItemName.includes(',') && (
                <View>
                  <TouchableOpacity
                    onPress={() => setIsCategorySelectorOpen(!isCategorySelectorOpen)}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: isDark ? '#1e293b' : '#f8fafc', padding: 12, borderRadius: 14, borderWidth: 1, borderColor: isDark ? '#334155' : '#e2e8f0' }}
                  >
                    <View style={{ width: 28, height: 28, borderRadius: 8, backgroundColor: CATEGORY_CONFIG[selectedCategory].lightBg, alignItems: 'center', justifyContent: 'center' }}>
                      {(() => { const CatIcon = CATEGORY_CONFIG[selectedCategory].icon; return <CatIcon size={14} color={CATEGORY_CONFIG[selectedCategory].solidText} />; })()}
                    </View>
                    <Text style={{ flex: 1, fontWeight: '700', fontSize: 13, color: textPrimary }}>{selectedCategory}</Text>
                    <Text style={{ color: textMuted, fontSize: 11, fontWeight: '600' }}>{isCategorySelectorOpen ? '▲' : '▼'}</Text>
                  </TouchableOpacity>

                  {isCategorySelectorOpen && (
                    <ScrollView style={{ maxHeight: 150, marginTop: 8, backgroundColor: isDark ? '#1e293b' : '#f8fafc', borderRadius: 14, borderWidth: 1, borderColor: isDark ? '#334155' : '#e2e8f0', padding: 8 }}>
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                        {CATEGORIES.map(cat => {
                          const config = CATEGORY_CONFIG[cat];
                          const CatIcon = config.icon;
                          const isSelected = selectedCategory === cat;
                          return (
                            <TouchableOpacity
                              key={cat}
                              onPress={() => { setSelectedCategory(cat); setIsCategorySelectorOpen(false); }}
                              style={{ alignItems: 'center', paddingVertical: 6, paddingHorizontal: 8, borderRadius: 10, backgroundColor: isSelected ? config.lightBg : 'transparent', width: '30%' }}
                            >
                              <View style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: isSelected ? config.solidBg : config.lightBg, alignItems: 'center', justifyContent: 'center', marginBottom: 4 }}>
                                <CatIcon size={15} color={isSelected ? 'white' : config.solidText} />
                              </View>
                              <Text style={{ fontSize: 9, fontWeight: '700', textAlign: 'center', color: isSelected ? config.solidText : textMuted }} numberOfLines={2}>{cat}</Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    </ScrollView>
                  )}
                </View>
              )}
            </View>
          </KeyboardAvoidingView>
        </Modal>
      </View>
    );
  };

  // ─── HOME VIEW ───────────────────────────────────────────────────────────────
  const renderListsView = (isSplit: boolean = false) => {
    const totalPending = lists.reduce((s, l) => s + (l.items || []).length, 0);
    const totalBought  = lists.reduce((s, l) => s + (l.boughtItems || []).length, 0);

    return (
      <View style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
          {/* Header */}
          <SafeAreaView edges={['top']} />
          <View style={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 20 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
              <LinearGradient
                colors={['#6366f1', '#7c3aed']}
                style={{ width: 52, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center', shadowColor: '#6366f1', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 10, elevation: 6 }}
              >
                <ShoppingCart size={24} color="white" />
              </LinearGradient>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 24, fontWeight: '800', letterSpacing: -0.5, color: textPrimary }}>
                  Alışveriş{' '}
                  <Text style={{ color: '#6366f1' }}>Listeleri</Text>
                </Text>
                <Text style={{ fontSize: 12, color: textSecondary, marginTop: 2 }}>İhtiyaçlarını organize et.</Text>
              </View>
            </View>
          </View>

          {/* Stats */}
          {lists.length > 0 && (
            <View style={{ paddingHorizontal: 20, marginBottom: 24 }}>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                {[
                  { label: 'Liste', val: lists.length, gradient: ['#6366f1', '#7c3aed'] as [string,string], emoji: '📋' },
                  { label: 'Alınacak', val: totalPending, gradient: ['#f59e0b', '#d97706'] as [string,string], emoji: '🛒' },
                  { label: 'Alındı', val: totalBought, gradient: ['#10b981', '#059669'] as [string,string], emoji: '✅' },
                ].map(s => (
                  <LinearGradient
                    key={s.label}
                    colors={s.gradient}
                    style={{ flex: 1, borderRadius: 20, padding: 14, alignItems: 'center', gap: 2, shadowColor: s.gradient[0], shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 }}
                  >
                    <Text style={{ fontSize: 22 }}>{s.emoji}</Text>
                    <Text style={{ fontSize: 22, fontWeight: '800', color: 'white' }}>{s.val}</Text>
                    <Text style={{ fontSize: 10, fontWeight: '700', color: 'rgba(255,255,255,0.8)', textTransform: 'uppercase', letterSpacing: 1 }}>{s.label}</Text>
                  </LinearGradient>
                ))}
              </View>
            </View>
          )}

          {lists.length === 0 ? (
            /* Empty State */
            <View style={{ alignItems: 'center', justifyContent: 'center', paddingTop: 60, paddingHorizontal: 40 }}>
              <View style={{ position: 'relative', marginBottom: 24 }}>
                <View style={{ position: 'absolute', width: 100, height: 100, borderRadius: 50, backgroundColor: '#6366f1', opacity: 0.15, alignSelf: 'center', top: -4 }} />
                <LinearGradient
                  colors={['#6366f1', '#7c3aed']}
                  style={{ width: 96, height: 96, borderRadius: 28, alignItems: 'center', justifyContent: 'center', shadowColor: '#6366f1', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.4, shadowRadius: 16, elevation: 8 }}
                >
                  <ShoppingCart size={44} color="white" />
                </LinearGradient>
              </View>
              <Text style={{ fontSize: 22, fontWeight: '800', color: textPrimary, textAlign: 'center', marginBottom: 8 }}>Alışverişe Başla</Text>
              <Text style={{ fontSize: 14, color: textSecondary, textAlign: 'center', lineHeight: 22, marginBottom: 28 }}>
                Haftalık market, pazar veya özel günler için renkli listeler oluşturun.
              </Text>
              <TouchableOpacity
                onPress={() => setIsCreateModalOpen(true)}
                activeOpacity={0.85}
              >
                <LinearGradient
                  colors={['#6366f1', '#7c3aed']}
                  style={{ borderRadius: 20, paddingHorizontal: 28, paddingVertical: 16, flexDirection: 'row', alignItems: 'center', gap: 8, shadowColor: '#6366f1', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 12, elevation: 6 }}
                >
                  <Plus size={20} color="white" />
                  <Text style={{ color: 'white', fontWeight: '800', fontSize: 16 }}>İlk Listeyi Oluştur</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={{ paddingHorizontal: 20 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <Text style={{ fontSize: 12, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1.5, color: textMuted }}>Listelerim</Text>
                <TouchableOpacity
                  onPress={() => { setEditingList(null); setNewListName(''); setNewListIcon('ShoppingCart'); setNewListColor('indigo'); setIsCreateModalOpen(true); }}
                  activeOpacity={0.85}
                >
                  <LinearGradient
                    colors={['#6366f1', '#7c3aed']}
                    style={{ borderRadius: 12, paddingHorizontal: 14, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', gap: 4 }}
                  >
                    <Plus size={14} color="white" />
                    <Text style={{ color: 'white', fontWeight: '700', fontSize: 12 }}>Yeni Liste</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>

              {/* List grid (2-col like web) */}
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 12 }}>
                {sortedLists.map((list, index) => {
                  const items = list.items || [];
                  const boughtItems = list.boughtItems || [];
                  const totalCount = items.length + boughtItems.length;
                  const progress = totalCount === 0 ? 0 : Math.round((boughtItems.length / totalCount) * 100);
                  const done = progress === 100 && totalCount > 0;
                  const theme = LIST_THEMES[list.colorId || 'indigo'] || LIST_THEMES.indigo;
                  const ListIcon = LIST_ICONS[list.icon || 'ShoppingCart'] || ShoppingCart;

                  return (
                    <TouchableOpacity
                      key={list.id}
                      onPress={() => { setSelectedListId(list.id); setDetailTab('pending'); }}
                      activeOpacity={0.85}
                      style={{ width: (winWidth - 52) / 2, borderRadius: 24, overflow: 'hidden', shadowColor: theme.gradient[0], shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8, elevation: 5 }}
                    >
                      <LinearGradient
                        colors={theme.gradient as [string, string]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={{ minHeight: 170, padding: 16, justifyContent: 'space-between' }}
                      >
                        {/* Decorative pattern */}
                        <View style={{ position: 'absolute', top: -20, right: -20, width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(255,255,255,0.1)' }} />
                        <View style={{ position: 'absolute', bottom: -15, left: -15, width: 60, height: 60, borderRadius: 30, backgroundColor: 'rgba(255,255,255,0.07)' }} />

                        {/* Top row */}
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                          <View style={{ width: 40, height: 40, borderRadius: 13, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' }}>
                            <ListIcon size={20} color="white" />
                          </View>
                          <TouchableOpacity
                            onPress={() => { setSelectedMenuList(list); setIsOptionsModalOpen(true); }}
                            style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' }}
                          >
                            <MoreVertical size={14} color="white" />
                          </TouchableOpacity>
                        </View>

                        {/* Bottom info */}
                        <View>
                          <Text style={{ fontSize: 18, fontWeight: '800', color: 'white', marginBottom: 4 }} numberOfLines={1}>{list.name}</Text>
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 }}>
                            <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.8)', fontWeight: '600' }}>
                              {items.length} ürün bekliyor
                            </Text>
                            {done
                              ? <Text style={{ fontSize: 11, color: 'white', fontWeight: '700' }}>✅ Tamamlandı!</Text>
                              : <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.8)', fontWeight: '600' }}>{boughtItems.length}/{totalCount} alındı</Text>
                            }
                          </View>
                          {/* Progress bar */}
                          <View style={{ height: 6, backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: 3, overflow: 'hidden' }}>
                            <View style={{ height: '100%', borderRadius: 3, backgroundColor: 'white', width: `${progress}%` }} />
                          </View>
                        </View>
                      </LinearGradient>
                    </TouchableOpacity>
                  );
                })}

                {/* Add new card (dashed, web-style) */}
                <TouchableOpacity
                  onPress={() => { setEditingList(null); setNewListName(''); setNewListIcon('ShoppingCart'); setNewListColor('indigo'); setIsCreateModalOpen(true); }}
                  activeOpacity={0.75}
                  style={{
                    width: (winWidth - 52) / 2, minHeight: 170, borderRadius: 24,
                    borderWidth: 2, borderColor: isDark ? 'rgba(99,102,241,0.4)' : '#c7d2fe',
                    borderStyle: 'dashed',
                    backgroundColor: isDark ? 'rgba(99,102,241,0.05)' : 'rgba(238,242,255,0.6)',
                    alignItems: 'center', justifyContent: 'center', gap: 10
                  }}
                >
                  <View style={{ width: 48, height: 48, borderRadius: 24, borderWidth: 2, borderStyle: 'dashed', borderColor: isDark ? 'rgba(99,102,241,0.5)' : '#a5b4fc', alignItems: 'center', justifyContent: 'center' }}>
                    <Plus size={20} color={isDark ? '#818cf8' : '#6366f1'} />
                  </View>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: isDark ? '#818cf8' : '#6366f1' }}>Yeni Liste</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Mobile FAB */}
          {lists.length > 0 && (
            <View style={{ paddingHorizontal: 20, marginTop: 8 }}>
              <TouchableOpacity
                onPress={() => { setEditingList(null); setNewListName(''); setNewListIcon('ShoppingCart'); setNewListColor('indigo'); setIsCreateModalOpen(true); }}
                style={{ position: 'absolute', bottom: -40, right: 20 }}
              >
                {/* Handled by the dashed add card above */}
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </View>
    );
  };

  // ─── MAIN RENDER ─────────────────────────────────────────────────────────────
  if (selectedList && !isTabletLandscape) {
    return renderDetailView();
  }

  return (
    <View style={{ flex: 1, backgroundColor: isDark ? '#070b14' : '#eef2ff' }}>
      {/* Background blobs (web-style) */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <View style={{ position: 'absolute', top: -40, left: -20, width: 200, height: 200, borderRadius: 100, backgroundColor: isDark ? 'rgba(99,102,241,0.1)' : 'rgba(99,102,241,0.15)', transform: [{ scale: 2 }] }} />
        <View style={{ position: 'absolute', top: '20%', right: -40, width: 180, height: 180, borderRadius: 90, backgroundColor: isDark ? 'rgba(217,70,239,0.06)' : 'rgba(217,70,239,0.1)', transform: [{ scale: 2 }] }} />
        <View style={{ position: 'absolute', bottom: '10%', left: '20%', width: 160, height: 160, borderRadius: 80, backgroundColor: isDark ? 'rgba(124,58,237,0.06)' : 'rgba(124,58,237,0.1)', transform: [{ scale: 2 }] }} />
      </View>

      <Stack.Screen options={{ headerShown: false }} />

      {isTabletLandscape ? (
        <View style={{ flex: 1, flexDirection: 'row' }}>
          <View style={{ width: 320, borderRightWidth: 1, borderRightColor: cardBorder }}>
            {renderListsView(true)}
          </View>
          <View style={{ flex: 1 }}>
            {selectedList ? renderDetailView() : (
              <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                <ShoppingCart size={48} color={textMuted} style={{ opacity: 0.4 }} />
                <Text style={{ color: textMuted, fontWeight: '700', fontSize: 14, marginTop: 12 }}>Liste Seçilmedi</Text>
              </View>
            )}
          </View>
        </View>
      ) : (
        renderListsView(false)
      )}

      {/* ── Create / Edit List Modal ── */}
      <Modal visible={isCreateModalOpen} onRequestClose={() => setIsCreateModalOpen(false)} transparent animationType="slide">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)' }}>
          <View style={{ backgroundColor: isDark ? '#0f1523' : 'white', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24 }}>
            <View style={{ width: 40, height: 4, backgroundColor: isDark ? '#334155' : '#e2e8f0', borderRadius: 2, alignSelf: 'center', marginBottom: 20 }} />

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <Text style={{ fontSize: 18, fontWeight: '800', color: textPrimary }}>
                {editingList ? '✏️ Listeyi Düzenle' : '🛒 Yeni Liste Oluştur'}
              </Text>
              <TouchableOpacity onPress={() => setIsCreateModalOpen(false)} style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: isDark ? '#1e293b' : '#f1f5f9', alignItems: 'center', justifyContent: 'center' }}>
                <X size={16} color={textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Name input */}
            <Text style={{ fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, color: textMuted, marginBottom: 8 }}>Liste Adı</Text>
            <TextInput
              style={{ backgroundColor: isDark ? '#1e293b' : '#f8fafc', borderWidth: 1.5, borderColor: isDark ? '#334155' : '#e2e8f0', borderRadius: 14, paddingHorizontal: 16, height: 52, fontSize: 15, fontWeight: '600', color: textPrimary, marginBottom: 20 }}
              placeholder="Örn: Haftalık Market..."
              placeholderTextColor={textMuted}
              value={newListName}
              onChangeText={setNewListName}
            />

            {/* Icon picker */}
            <Text style={{ fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, color: textMuted, marginBottom: 10 }}>İkon</Text>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 }}>
              {Object.keys(LIST_ICONS).map(iconName => {
                const IconComp = LIST_ICONS[iconName];
                const isSelected = newListIcon === iconName;
                return (
                  <TouchableOpacity
                    key={iconName}
                    onPress={() => setNewListIcon(iconName)}
                    style={{ padding: 12, borderRadius: 14, borderWidth: 2, backgroundColor: isSelected ? (isDark ? 'rgba(99,102,241,0.2)' : '#eef2ff') : (isDark ? '#1e293b' : '#f8fafc'), borderColor: isSelected ? '#6366f1' : (isDark ? '#334155' : '#e2e8f0') }}
                  >
                    <IconComp size={18} color={isSelected ? '#6366f1' : textSecondary} />
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Color picker */}
            <Text style={{ fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, color: textMuted, marginBottom: 10 }}>Tema Rengi</Text>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24 }}>
              {Object.entries(LIST_THEMES).map(([colorKey, theme]) => {
                const isSelected = newListColor === colorKey;
                return (
                  <TouchableOpacity
                    key={colorKey}
                    onPress={() => setNewListColor(colorKey)}
                    style={{ alignItems: 'center', gap: 4 }}
                  >
                    <View style={{
                      width: 40, height: 40, borderRadius: 20,
                      backgroundColor: theme.solidBg,
                      borderWidth: isSelected ? 3 : 0,
                      borderColor: isDark ? 'white' : '#0f172a',
                      transform: [{ scale: isSelected ? 1.15 : 1 }]
                    }} />
                    <Text style={{ fontSize: 9, fontWeight: '700', color: textMuted }}>{theme.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Save button */}
            <TouchableOpacity onPress={handleSaveList} activeOpacity={0.85}>
              <LinearGradient
                colors={['#6366f1', '#7c3aed']}
                style={{ borderRadius: 16, paddingVertical: 16, alignItems: 'center', shadowColor: '#6366f1', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 10, elevation: 5 }}
              >
                <Text style={{ color: 'white', fontWeight: '800', fontSize: 16 }}>
                  {editingList ? 'Kaydet' : 'Oluştur'}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── List Options Bottom Sheet ── */}
      <Modal animationType="slide" transparent visible={isOptionsModalOpen} onRequestClose={() => setIsOptionsModalOpen(false)}>
        <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <View style={{ backgroundColor: isDark ? '#0f1523' : 'white', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20 }}>
            <View style={{ width: 40, height: 4, backgroundColor: isDark ? '#334155' : '#e2e8f0', borderRadius: 2, alignSelf: 'center', marginBottom: 16 }} />
            <Text style={{ fontSize: 15, fontWeight: '800', color: textPrimary, textAlign: 'center', marginBottom: 16 }}>
              {selectedMenuList?.name || 'Liste Seçenekleri'}
            </Text>

            {selectedMenuList && (
              <View style={{ gap: 4 }}>
                {sortedLists.findIndex(l => l.id === selectedMenuList.id) > 0 && (
                  <TouchableOpacity onPress={() => handleMoveList(selectedMenuList, 'up')} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 16, borderRadius: 12 }}>
                    <ChevronUp size={18} color="#6366f1" />
                    <Text style={{ color: textPrimary, fontWeight: '700', fontSize: 14 }}>Yukarı Taşı</Text>
                  </TouchableOpacity>
                )}
                {sortedLists.findIndex(l => l.id === selectedMenuList.id) < sortedLists.length - 1 && (
                  <TouchableOpacity onPress={() => handleMoveList(selectedMenuList, 'down')} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 16, borderRadius: 12 }}>
                    <ChevronDown size={18} color="#6366f1" />
                    <Text style={{ color: textPrimary, fontWeight: '700', fontSize: 14 }}>Aşağı Taşı</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  onPress={() => { setNewListName(selectedMenuList.name); setNewListIcon(selectedMenuList.icon); setNewListColor(selectedMenuList.colorId || 'indigo'); setEditingList(selectedMenuList); setIsOptionsModalOpen(false); setIsCreateModalOpen(true); }}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 16, borderRadius: 12 }}
                >
                  <Edit2 size={18} color={textSecondary} />
                  <Text style={{ color: textPrimary, fontWeight: '700', fontSize: 14 }}>Düzenle</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => handleDeleteList(selectedMenuList.id)}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 16, borderRadius: 12, backgroundColor: isDark ? 'rgba(239,68,68,0.1)' : '#fff1f2' }}
                >
                  <Trash2 size={18} color="#ef4444" />
                  <Text style={{ color: '#ef4444', fontWeight: '700', fontSize: 14 }}>Sil</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setIsOptionsModalOpen(false)} style={{ paddingVertical: 12, marginTop: 4, backgroundColor: isDark ? '#1e293b' : '#f1f5f9', borderRadius: 12, alignItems: 'center' }}>
                  <Text style={{ color: textSecondary, fontWeight: '700', fontSize: 14 }}>İptal</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  headerGradient: {
    paddingTop: 12,
    paddingBottom: 16,
    paddingHorizontal: 16,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    gap: 12,
  },
  fabGradient: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
});
