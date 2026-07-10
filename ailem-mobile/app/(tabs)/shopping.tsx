import { View, Text, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Modal, Alert, StyleSheet, KeyboardAvoidingView, Platform, NativeModules, useWindowDimensions, useColorScheme } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useEffect, useState, useMemo } from 'react';
import { 
  onShoppingListsUpdate, addShoppingList, updateShoppingList, deleteShoppingList, 
  addShoppingListItemToList, moveItemToBought, moveItemToPending, 
  deleteShoppingListItemFromList, toggleShoppingListItemStatusInList
} from '../../lib/dataService';
import { ShoppingList, ShoppingItem } from '../../lib/data';
import { 
  ShoppingCart, Home, ListChecks, Cake, Notebook, ShoppingBag, 
  Plus, ChevronLeft, Trash2, CheckCircle2, Circle, MoreVertical, 
  Apple, Beef, Milk, Wheat, Coffee, Package, Droplets, Baby, Star, X,
  Edit2, Search, ChevronRight, Mic, Sparkles, ChevronUp, ChevronDown, Check
} from 'lucide-react-native';
import { useRouter, Stack } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';

// ─── CATEGORY CONFIG ──────────────────────────────────────────────────────────
const CATEGORY_CONFIG: Record<string, {
  icon: any;
  color: string;
  bgColor: string;
  borderColor: string;
  lightBg: string;
  lightBorder: string;
  cardBg: string;
  cardText: string;
  checkBg: string;
}> = {
  'Meyve ve Sebze':       { icon: Apple,       color: '#27ae60', bgColor: '#e8f8f5', borderColor: '#d1f2eb', lightBg: '#e8f8f5', lightBorder: '#d1f2eb', cardBg: '#f4fbf7', cardText: '#1b663e', checkBg: '#27ae60' },
  'Et ve Tavuk Ürünleri': { icon: Beef,        color: '#c0392b', bgColor: '#fadbd8', borderColor: '#f5b7b1', lightBg: '#fadbd8', lightBorder: '#f5b7b1', cardBg: '#fdf3f2', cardText: '#87281e', checkBg: '#c0392b' },
  'Süt Ürünleri':         { icon: Milk,        color: '#2980b9', bgColor: '#ebf5fb', borderColor: '#d4e6f1', lightBg: '#ebf5fb', lightBorder: '#d4e6f1', cardBg: '#f2f8fc', cardText: '#1a5276', checkBg: '#2980b9' },
  'Unlu Mamüller':        { icon: Wheat,       color: '#d35400', bgColor: '#fdebd0', borderColor: '#f9e79f', lightBg: '#fdebd0', lightBorder: '#f9e79f', cardBg: '#fdf9f2', cardText: '#873600', checkBg: '#d35400' },
  'Temel Gıda':           { icon: Package,     color: '#e67e22', bgColor: '#fdf2e9', borderColor: '#fadbd8', lightBg: '#fdf2e9', lightBorder: '#fadbd8', cardBg: '#fdf8f4', cardText: '#935116', checkBg: '#e67e22' },
  'Atıştırmalık':         { icon: Coffee,      color: '#8e44ad', bgColor: '#f5eeeb', borderColor: '#ebdef0', lightBg: '#f5eeeb', lightBorder: '#ebdef0', cardBg: '#faf5fb', cardText: '#5b2c6f', checkBg: '#8e44ad' },
  'İçecekler':            { icon: Droplets,    color: '#16a085', bgColor: '#e8f8f5', borderColor: '#a3e4d7', lightBg: '#e8f8f5', lightBorder: '#a3e4d7', cardBg: '#f2faf8', cardText: '#0e6251', checkBg: '#16a085' },
  'Dondurulmuş Gıdalar':  { icon: Package,     color: '#3498db', bgColor: '#ebf5fb', borderColor: '#a9cce3', lightBg: '#ebf5fb', lightBorder: '#a9cce3', cardBg: '#f3f9fd', cardText: '#1f618d', checkBg: '#3498db' },
  'Temizlik Ürünleri':    { icon: Droplets,    color: '#0e6251', bgColor: '#e8f8f5', borderColor: '#a2d9ce', lightBg: '#e8f8f5', lightBorder: '#a2d9ce', cardBg: '#f2faf8', cardText: '#0b4d3f', checkBg: '#0e6251' },
  'Kişisel Bakım':        { icon: Star,        color: '#db3e79', bgColor: '#fce4ec', borderColor: '#f8bbd0', lightBg: '#fce4ec', lightBorder: '#f8bbd0', cardBg: '#fdf2f6', cardText: '#881b47', checkBg: '#db3e79' },
  'Bebek Ürünleri':       { icon: Baby,        color: '#7d3c98', bgColor: '#f4ecf7', borderColor: '#d7bde2', lightBg: '#f4ecf7', lightBorder: '#d7bde2', cardBg: '#f9f5fb', cardText: '#4a235a', checkBg: '#7d3c98' },
  'Diğer':                { icon: ShoppingBag,  color: '#7f8c8d', bgColor: '#f2f4f4', borderColor: '#e5e7e9', lightBg: '#f2f4f4', lightBorder: '#e5e7e9', cardBg: '#fbfcfc', cardText: '#566573', checkBg: '#7f8c8d' },
};

const CATEGORY_ORDER = [
  'Meyve ve Sebze',
  'Et ve Tavuk Ürünleri',
  'Süt Ürünleri',
  'Unlu Mamüller',
  'Temel Gıda',
  'Atıştırmalık',
  'İçecekler',
  'Dondurulmuş Gıdalar',
  'Temizlik Ürünleri',
  'Kişisel Bakım',
  'Bebek Ürünleri',
  'Diğer'
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
  indigo:  { id: 'indigo',  label: 'Mor',   gradient: ['#6366f1', '#4f46e5'], solidBg: '#6366f1', pageBg: '#f5f3ff' },
  emerald: { id: 'emerald', label: 'Yeşil', gradient: ['#10b981', '#059669'], solidBg: '#10b981', pageBg: '#ecfdf5' },
  rose:    { id: 'rose',    label: 'Pembe', gradient: ['#f43f5e', '#e11d48'], solidBg: '#f43f5e', pageBg: '#fff1f2' },
  amber:   { id: 'amber',   label: 'Sarı',  gradient: ['#f59e0b', '#d97706'], solidBg: '#f59e0b', pageBg: '#fffbeb' },
  cyan:    { id: 'cyan',    label: 'Mavi',  gradient: ['#06b6d4', '#0891b2'], solidBg: '#06b6d4', pageBg: '#ecfeff' },
  fuchsia: { id: 'fuchsia', label: 'Fuşya', gradient: ['#d946ef', '#c084fc'], solidBg: '#d946ef', pageBg: '#fdf4ff' },
};

const LIST_ICONS: Record<string, any> = {
  ShoppingCart, Home, ListChecks, Cake, Notebook, ShoppingBag
};

// ─── SUGGESTIONS CONFIG ────────────────────────────────────────────────────────
const defaultShoppingItems = [
  "Süt", "Ekmek", "Yumurta", "Peynir", "Zeytin", "Domates", "Salatalık",
  "Biber", "Soğan", "Sarımsak", "Patates", "Elma", "Muz", "Portakal",
  "Limon", "Tavuk", "Kıyma", "Balık", "Pirinç", "Bulgur", "Makarna",
  "Salça", "Sıvı Yağ", "Tereyağı", "Un", "Şeker", "Tuz", "Çay",
  "Kahve", "Yoğurt", "Su", "Meyve Suyu", "Deterjan", "Çamaşır Suyu",
  "Bulaşık Deterjanı", "Şampuan", "Sabun", "Diş Macunu", "Tuvalet Kağıdı",
  "Kağıt Havlu"
];

// ─── OFFLINE COMPOUND PARSER & CATEGORIZER ─────────────────────────────────────
function parseShoppingItem(rawText: string): { name: string; quantity?: string; category: string }[] {
  const parts = rawText.split(',').map(p => p.trim()).filter(Boolean);
  
  return parts.map(part => {
    // Try to match a quantity (e.g. "2 kg elma", "1 adet ekmek", "500g kıyma", "2lt süt")
    const qtyRegex = /^(\d+(?:\.\d+)?\s*(?:kg|g|kilo|gram|adet|paket|lt|litre|şişe|bardak|koli|l|ml)?)\s+(.+)$/i;
    const qtyRegexEnd = /^(.+?)\s+(\d+(?:\.\d+)?\s*(?:kg|g|kilo|gram|adet|paket|lt|litre|şişe|bardak|koli|l|ml)?)$/i;
    
    let name = part;
    let quantity = '';
    
    let match = part.match(qtyRegex);
    if (match) {
      quantity = match[1].trim();
      name = match[2].trim();
    } else {
      match = part.match(qtyRegexEnd);
      if (match) {
        name = match[1].trim();
        quantity = match[2].trim();
      }
    }
    
    const lowerName = name.toLowerCase();
    let category = 'Diğer';
    
    const keywords: Record<string, string[]> = {
      'Meyve ve Sebze': ['elma', 'armut', 'muz', 'çilek', 'karpuz', 'kavun', 'portakal', 'mandalina', 'limon', 'şeftali', 'erik', 'kiraz', 'vişne', 'nar', 'incir', 'üzüm', 'domates', 'salatalık', 'biber', 'patates', 'soğan', 'sarımsak', 'havuç', 'ıspanak', 'marul', 'maydanoz', 'lahana', 'pırasa', 'kabak', 'patlıcan', 'brokoli', 'karnabahar', 'bezelye', 'bamya', 'fasulye', 'kereviz', 'enginar', 'mantar', 'roka', 'nane', 'dereotu', 'kivi', 'avokado', 'şeftali', 'kayısı', 'turp', 'yeşillik', 'sebze', 'meyve'],
      'Süt Ürünleri': ['süt', 'peynir', 'yoğurt', 'tereyağı', 'kaymak', 'krema', 'kefir', 'ayran', 'kaşar', 'lor', 'süzme', 'labne', 'margarin', 'çökelek'],
      'Et ve Tavuk Ürünleri': ['et', 'kıyma', 'tavuk', 'pirzola', 'bonfile', 'antrikot', 'biftek', 'köfte', 'sosis', 'salam', 'sucuk', 'pastırma', 'jambon', 'hindi', 'balık', 'somon', 'levrek', 'çipura', 'hamsi', 'istavrit', 'karides', 'kalamar', 'kuzu', 'dana'],
      'Unlu Mamüller': ['ekmek', 'pide', 'simit', 'poğaça', 'açma', 'börek', 'çörek', 'kurabiye', 'kek', 'pasta', 'yufka', 'milföy', 'kruvasan', 'lavaş', 'bazlama', 'tost ekmeği', 'galeta'],
      'Temel Gıda': ['pirinç', 'bulgur', 'makarna', 'salça', 'yağ', 'zeytinyağı', 'sıvı yağ', 'un', 'şeker', 'tuz', 'mercimek', 'nohut', 'fasulye', 'bakliyat', 'irmik', 'nişasta', 'sirke', 'baharat', 'karabiber', 'pul biber', 'kekik', 'kimyon', 'nane', 'ketçap', 'mayonez', 'hardal', 'sos'],
      'Atıştırmalık': ['çikolata', 'gofret', 'bisküvi', 'kraker', 'cips', 'kuruyemiş', 'fındık', 'fıstık', 'ceviz', 'badem', 'leblebi', 'çekirdek', 'lokum', 'jelibon', 'şekerleme', 'bar', 'granola', 'cips'],
      'İçecekler': ['su', 'meyve suyu', 'soda', 'gazoz', 'kola', 'fanta', 'sprite', 'ice tea', 'soğuk çay', 'limonata', 'şalgam', 'kahve', 'çay', 'bitki çayı', 'yeşil çay', 'ıhlamur', 'adaçayı', 'kakao'],
      'Dondurulmuş Gıdalar': ['dondurma', 'dondurulmuş', 'frozen', 'pizza', 'milföy', 'mantı', 'kroket'],
      'Temizlik Ürünleri': ['deterjan', 'çamaşır suyu', 'yumuşatıcı', 'sıvı sabun', 'sabun', 'şampuan', 'duş jeli', 'diş macunu', 'tuvalet kağıdı', 'kağıt havlu', 'peçete', 'ıslak mendil', 'çöp torbası', 'sünger', 'bez', 'vileda', 'paspas', 'kireç'],
      'Kişisel Bakım': ['şampuan', 'sabun', 'duş jeli', 'saç kremi', 'deodorant', 'parfüm', 'kolonya', 'tıraş', 'krem', 'losyon', 'makyaj', 'ped', 'diş fırçası'],
      'Bebek Ürünleri': ['bebek', 'bezi', 'pişik', 'mama', 'biberon', 'emzik', 'ıslak mendil']
    };
    
    for (const [catName, words] of Object.entries(keywords)) {
      if (words.some(word => lowerName.includes(word))) {
        category = catName;
        break;
      }
    }
    
    return {
      name,
      ...(quantity ? { quantity } : {}),
      category
    };
  });
}

export default function ShoppingScreen() {
  const [lists, setLists] = useState<ShoppingList[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedListId, setSelectedListId] = useState<string | null>(null);
  const router = useRouter();

  // Create & Edit List Modal States
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [newListIcon, setNewListIcon] = useState('ShoppingCart');
  const [newListColor, setNewListColor] = useState('indigo');
  const [editingList, setEditingList] = useState<ShoppingList | null>(null);

  // Detail View States
  const [detailTab, setDetailTab] = useState<'pending' | 'bought'>('pending');
  const [newItemName, setNewItemName] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Diğer');
  const [isCategorySelectorOpen, setIsCategorySelectorOpen] = useState(false);
  const [isAddItemOpen, setIsAddItemOpen] = useState(false);
  const [isAddSuccess, setIsAddSuccess] = useState(false);
  const [isAiProcessing, setIsAiProcessing] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [crossedOutItems, setCrossedOutItems] = useState<Set<string>>(new Set());

  // List Options Bottom Sheet Modal
  const [isOptionsModalOpen, setIsOptionsModalOpen] = useState(false);
  const [selectedMenuList, setSelectedMenuList] = useState<ShoppingList | null>(null);

  const { width: winWidth, height: winHeight } = useWindowDimensions();
  const isLandscape = winWidth > winHeight;
  const isTablet = Math.min(winWidth, winHeight) >= 600;
  const isTabletLandscape = isTablet && isLandscape;
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  useEffect(() => {
    let unsubscribe: any;
    try {
      unsubscribe = onShoppingListsUpdate((data: ShoppingList[]) => {
        setLists(data);
        setLoading(false);
        try {
          if (Platform.OS === 'android' && NativeModules.WidgetHelper) {
            const activeItems = [];
            data.forEach(list => {
                if (list.items) {
                    list.items.forEach(item => {
                        activeItems.push({
                            id: item.id,
                            listId: list.id,
                            name: item.name,
                            quantity: item.quantity || '',
                            isBought: false
                        });
                    });
                }
            });
            NativeModules.WidgetHelper.updateWidgetData(JSON.stringify(activeItems.slice(0, 10)));
          }
        } catch(err) {
          console.log('Widget sync error', err);
        }
      });
    } catch (e) {
      console.log('Error fetching shopping lists:', e);
      setLoading(false);
    }

    // Check for pending bought items from widget
    if (Platform.OS === 'android' && NativeModules.WidgetHelper) {
      NativeModules.WidgetHelper.getPendingBoughtItems()
        .then((jsonStr: string) => {
          if (jsonStr && jsonStr !== '[]') {
            try {
              const pendingItems = JSON.parse(jsonStr);
              if (pendingItems && pendingItems.length > 0) {
                pendingItems.forEach((pi: any) => {
                  if (pi.listId && pi.id) {
                    moveItemToBought(pi.listId, pi.id);
                  }
                });
                NativeModules.WidgetHelper.clearPendingBoughtItems();
              }
            } catch(e) {}
          }
        })
        .catch(console.error);
    }

    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, []);

  // Sorted Lists (order asc, then createdAt desc)
  const sortedLists = useMemo(() => {
    return [...lists].sort((a, b) => {
      const oA = a.order ?? 0, oB = b.order ?? 0;
      if (oA !== oB) return oA - oB;
      const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return timeB - timeA;
    });
  }, [lists]);

  const selectedList = useMemo(() => {
    return lists.find(l => l.id === selectedListId) || null;
  }, [lists, selectedListId]);

  // Autocomplete Suggestions
  const historicalItems = useMemo(() => {
    const items = new Set<string>();
    lists.forEach(l => {
      (l.items || []).forEach(i => items.add(i.name));
      (l.boughtItems || []).forEach(i => items.add(i.name));
    });
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
        await updateShoppingList(editingList.id, {
          name: newListName.trim(),
          icon: newListIcon,
          colorId: newListColor
        });
        setEditingList(null);
      } else {
        await addShoppingList(newListName.trim(), newListIcon, newListColor);
      }
      setNewListName('');
      setIsCreateModalOpen(false);
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteList = async (id: string) => {
    Alert.alert(
      "Listeyi Sil",
      "Bu liste ve içindeki tüm ürünler kalıcı olarak silinecek. Emin misiniz?",
      [
        { text: "İptal", style: "cancel" },
        { 
          text: "Sil", 
          style: "destructive", 
          onPress: async () => {
            try {
              await deleteShoppingList(id);
              if (selectedListId === id) setSelectedListId(null);
              setIsOptionsModalOpen(false);
            } catch (e) {
              console.error(e);
            }
          }
        }
      ]
    );
  };

  const handleMoveList = async (list: ShoppingList, dir: 'up' | 'down') => {
    const idx = sortedLists.findIndex(l => l.id === list.id);
    const targetIdx = dir === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= sortedLists.length) return;
    const targetList = sortedLists[targetIdx];
    
    const currentOrder = list.order ?? idx;
    const targetOrder = targetList.order ?? targetIdx;
    
    try {
      await updateShoppingList(list.id, { order: targetOrder });
      await updateShoppingList(targetList.id, { order: currentOrder });
      setIsOptionsModalOpen(false);
    } catch (e) {
      console.error('Error reordering lists:', e);
    }
  };

  const handleAddItem = async (customName?: string) => {
    const inputName = customName || newItemName;
    if (!inputName.trim() || !selectedListId) return;

    setIsAiProcessing(true);
    try {
      // If compound addition (contains comma)
      if (inputName.includes(',')) {
        const items = parseShoppingItem(inputName);
        for (const item of items) {
          await addShoppingListItemToList(selectedListId, {
            name: item.name,
            category: item.category,
            quantity: item.quantity || '',
            isBought: false
          });
        }
      } else {
        // Single item
        let category = selectedCategory;
        let quantity = '';
        let name = inputName.trim();

        // Predict category if left as "Diğer"
        if (category === 'Diğer') {
          const parsed = parseShoppingItem(inputName)[0];
          category = parsed.category;
          quantity = parsed.quantity || '';
          name = parsed.name;
        }

        await addShoppingListItemToList(selectedListId, {
          name,
          category,
          quantity,
          isBought: false
        });
      }

      setNewItemName('');
      setSelectedCategory('Diğer');
      setIsAddItemOpen(false);
    } catch (e) {
      console.error(e);
    } finally {
      setIsAiProcessing(false);
    }
  };

  const toggleVoice = () => {
    if (isListening) {
      setIsListening(false);
      return;
    }
    setIsListening(true);
    // Simulate speech to text
    setTimeout(() => {
      setNewItemName("2 kg elma, 1 lt süt, ekmek");
      setIsListening(false);
      Alert.alert("Ses Tanımlandı", "\"2 kg elma, 1 lt süt, ekmek\" algılandı.");
    }, 1500);
  };

  const handleToggleItem = async (item: ShoppingItem) => {
    if (!selectedListId) return;
    try {
      if (item.isBought) {
        await moveItemToPending(selectedListId, item.id);
      } else {
        await moveItemToBought(selectedListId, item.id);
      }
    } catch (e) {
      console.error(e);
      console.error(e);
    }
  };
  const handleDeleteItem = async (item: ShoppingItem) => {
    if (!selectedListId) return;
    try {
      await deleteShoppingListItemFromList(selectedListId, item.id, item.isBought);
    } catch (e) {
      console.error(e);
    }
  };

  // ─── RENDERING HELPERS ───
  const renderDetailView = () => {
    if (!selectedList) return null;
    const theme = LIST_THEMES[selectedList.colorId || 'indigo'] || LIST_THEMES.indigo;
    const pendingItems = (selectedList.items || []).sort((a, b) => {
      const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return timeB - timeA;
    });
    const boughtItems = (selectedList.boughtItems || []).sort((a, b) => {
      const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return timeB - timeA;
    });

    const totalCount = pendingItems.length + boughtItems.length;
    const progress = totalCount === 0 ? 0 : Math.round((boughtItems.length / totalCount) * 100);

    return (
      <View className="flex-1" style={{ backgroundColor: theme.pageBg }}>
        {/* Colorful Gradient Header */}
        <LinearGradient
          colors={theme.gradient as [string, string, ...string[]]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.headerGradient}
        >
          <SafeAreaView edges={['top']} className="m-0 p-0" />
          <View className="flex-row justify-between items-center mb-3">
            {!isTabletLandscape && (
              <TouchableOpacity onPress={() => setSelectedListId(null)} className="w-9 h-9 rounded-full bg-white/20 items-center justify-center">
                <ChevronLeft size={20} color="white" />
              </TouchableOpacity>
            )}
            
            <View className="items-center flex-1 mx-3">
              <Text className="text-white font-bold text-lg text-center" numberOfLines={1}>{selectedList.name}</Text>
              <Text className="text-white/80 text-[10px] font-bold uppercase tracking-wider">
                {boughtItems.length} / {totalCount} Alındı
              </Text>
            </View>

            <TouchableOpacity 
              onPress={() => {
                setSelectedMenuList(selectedList);
                setIsOptionsModalOpen(true);
              }}
              className="w-9 h-9 rounded-full bg-white/20 items-center justify-center"
            >
              <MoreVertical size={16} color="white" />
            </TouchableOpacity>
          </View>

          {totalCount > 0 && (
            <View className="flex-row items-center gap-2 px-1">
              <View className="flex-1 h-1.5 bg-white/30 rounded-full overflow-hidden">
                <View className="h-full bg-white rounded-full" style={{ width: `${progress}%` }} />
              </View>
              <Text className="text-white font-bold text-[10px]">{progress}%</Text>
            </View>
          )}
        </LinearGradient>

        <View className="flex-row mx-4 mt-4 bg-white/70 dark:bg-slate-900/70 p-1 rounded-2xl border border-slate-200/50 dark:border-slate-800">
          <TouchableOpacity 
            onPress={() => setDetailTab('pending')}
            className={`flex-1 py-2.5 rounded-xl items-center ${detailTab === 'pending' ? 'bg-white dark:bg-slate-800 shadow-sm' : ''}`}
          >
            <Text className={`font-bold text-xs ${detailTab === 'pending' ? 'text-slate-800 dark:text-white' : 'text-slate-500'}`}>
              Alınacaklar ({pendingItems.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            onPress={() => setDetailTab('bought')}
            className={`flex-1 py-2.5 rounded-xl items-center ${detailTab === 'bought' ? 'bg-white dark:bg-slate-800 shadow-sm' : ''}`}
          >
            <Text className={`font-bold text-xs ${detailTab === 'bought' ? 'text-slate-800 dark:text-white' : 'text-slate-500'}`}>
              Alınanlar ({boughtItems.length})
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
          {detailTab === 'pending' ? (
            pendingItems.length === 0 ? (
              <View className="items-center justify-center mt-20 bg-white/80 dark:bg-slate-900/80 p-8 rounded-[2rem] border border-dashed border-slate-200 dark:border-slate-800">
                <ListChecks size={40} color={theme.solidBg} className="mb-2 opacity-50" />
                <Text className="text-slate-650 dark:text-slate-350 font-bold text-center text-sm">Liste Boş!</Text>
                <Text className="text-slate-400 text-center text-xs mt-1">Aşağıdaki + butonunu kullanarak hızlıca ürün ekleyin.</Text>
              </View>
            ) : (
              <View className="mb-4">
                {pendingItems.map(item => {
                  const cat = CATEGORY_CONFIG[item.category || 'Diğer'] || CATEGORY_CONFIG.Diğer;
                  const CatIcon = cat.icon;
                  return (
                    <View 
                      key={item.id} 
                      style={{ backgroundColor: cat.cardBg, borderColor: cat.lightBorder }}
                      className="flex-row items-center p-3.5 rounded-2xl mb-2 border shadow-sm"
                    >
                      <TouchableOpacity 
                        className="mr-3 p-1"
                        onPress={() => {
                          const newSet = new Set(crossedOutItems);
                          if (newSet.has(item.id)) newSet.delete(item.id);
                          else newSet.add(item.id);
                          setCrossedOutItems(newSet);
                        }}
                      >
                        <View 
                          style={{ borderColor: cat.lightBorder }} 
                          className={`w-6 h-6 rounded-full border-2 items-center justify-center ${crossedOutItems.has(item.id) ? 'bg-emerald-500 border-emerald-500' : 'bg-white'}`}
                        >
                          {crossedOutItems.has(item.id) && <Check size={12} color="white" strokeWidth={3} />}
                        </View>
                      </TouchableOpacity>

                      <View className="p-1.5 rounded-xl mr-3" style={{ backgroundColor: cat.lightBg }}>
                        <CatIcon size={15} color={cat.color} />
                      </View>

                      <TouchableOpacity 
                        className="flex-1" 
                        activeOpacity={0.6}
                        onPress={() => {
                          const newSet = new Set(crossedOutItems);
                          if (newSet.has(item.id)) newSet.delete(item.id);
                          else newSet.add(item.id);
                          setCrossedOutItems(newSet);
                        }}
                      >
                        <Text className={`font-bold text-[14px] ${crossedOutItems.has(item.id) ? 'line-through text-slate-400' : ''}`} style={!crossedOutItems.has(item.id) ? { color: cat.cardText } : {}}>
                          {item.name}
                        </Text>
                        {item.quantity ? (
                          <Text className={`text-[10px] font-bold mt-0.5 ${crossedOutItems.has(item.id) ? 'line-through text-slate-400' : 'text-slate-400'}`}>Miktar: {item.quantity}</Text>
                        ) : null}
                      </TouchableOpacity>

                      <TouchableOpacity onPress={() => handleToggleItem(item)} className="p-2 bg-white/50 rounded-full">
                        <X size={14} color="#ef4444" />
                      </TouchableOpacity>
                    </View>
                  );
                })}
              </View>
            )
          ) : (
            boughtItems.length === 0 ? (
              <View className="items-center justify-center mt-20 bg-white/40 dark:bg-slate-900/30 p-8 rounded-[2rem] border border-dashed border-slate-200/50">
                <CheckCircle2 size={40} color="#94a3b8" className="mb-2 opacity-50" />
                <Text className="text-slate-500 font-bold text-center text-sm">Alınan Ürün Yok.</Text>
              </View>
            ) : (
              boughtItems.map(item => {
                const cat = CATEGORY_CONFIG[item.category || 'Diğer'] || CATEGORY_CONFIG.Diğer;
                const CatIcon = cat.icon;
                return (
                  <View 
                    key={item.id} 
                    className="flex-row items-center p-3.5 bg-white/60 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 rounded-2xl mb-2 shadow-sm opacity-80"
                  >
                    <TouchableOpacity onPress={() => handleToggleItem(item)} className="mr-3">
                      <View className="w-6 h-6 rounded-full bg-emerald-500 items-center justify-center shadow-sm">
                        <Check size={12} color="white" strokeWidth={3} />
                      </View>
                    </TouchableOpacity>

                    <View className="p-1.5 rounded-xl mr-3 opacity-50" style={{ backgroundColor: cat.lightBg }}>
                      <CatIcon size={15} color={cat.color} />
                    </View>

                    <View className="flex-1">
                      <Text className="font-bold text-[14px] line-through text-slate-400 dark:text-slate-500">
                        {item.name}
                      </Text>
                      {item.quantity ? (
                        <Text className="text-[10px] font-medium text-slate-400 line-through">Miktar: {item.quantity}</Text>
                      ) : null}
                    </View>

                    <TouchableOpacity onPress={() => handleDeleteItem(item)} className="p-2">
                      <X size={14} color="#94a3b8" />
                    </TouchableOpacity>
                  </View>
                );
              })
            )
          )}
        </ScrollView>

        <TouchableOpacity 
          onPress={() => {
            setNewItemName('');
            setIsAddItemOpen(true);
          }}
          className="absolute bottom-24 right-5 w-14 h-14 rounded-full shadow-lg justify-center items-center z-30"
        >
          <LinearGradient
            colors={theme.gradient as [string, string, ...string[]]}
            style={styles.fabGradient}
          >
            <Plus size={24} color="white" />
          </LinearGradient>
        </TouchableOpacity>

        {/* Add Item Dialog Modal */}
        <Modal
          visible={isAddItemOpen}
          onRequestClose={() => setIsAddItemOpen(false)}
          transparent
          animationType="fade"
        >
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'padding'} className="flex-1 justify-end bg-black/60">
            <View className="bg-white dark:bg-slate-900 rounded-t-[2.5rem] p-6 pt-3 shadow-2xl border-t border-slate-200 dark:border-slate-800 max-h-[90%]">
              
              {/* Drag Handle */}
              <View className="w-12 h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full mx-auto mb-6" />

              {/* Header */}
              <View className="flex-row justify-between items-center mb-6">
                <View className="flex-row items-center gap-3">
                  <View className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-900/30 items-center justify-center">
                    <ShoppingBag size={24} color="#4f46e5" />
                  </View>
                  <View>
                    <Text className="text-xl font-black text-slate-900 dark:text-white">Hızlı Ürün Ekle</Text>
                    <Text className="text-xs text-slate-500 font-medium mt-0.5">Arka arkaya seri ekleyebilirsiniz</Text>
                  </View>
                </View>
                <TouchableOpacity onPress={() => setIsAddItemOpen(false)} className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 items-center justify-center">
                  <X size={18} color="#64748b" />
                </TouchableOpacity>
              </View>

              {/* Input Area */}
              <View className="flex-row items-center bg-slate-50 dark:bg-slate-950/50 border-2 border-slate-100 dark:border-slate-800 rounded-[2rem] p-1.5 mb-4 shadow-sm">
                <TextInput 
                  className="flex-1 text-slate-900 dark:text-white text-base font-semibold h-14 px-4"
                  placeholder="Örn: 2 kg domates, 1 lt süt..."
                  placeholderTextColor="#94a3b8"
                  value={newItemName}
                  onChangeText={setNewItemName}
                  autoFocus={true}
                  onSubmitEditing={() => handleAddItem()}
                />
                
                {isAiProcessing ? (
                  <View className="px-4">
                    <ActivityIndicator size="small" color={theme.solidBg} />
                  </View>
                ) : (
                  <TouchableOpacity onPress={toggleVoice} className="w-12 h-12 rounded-full items-center justify-center bg-white dark:bg-slate-800 mr-2 shadow-sm">
                    <Mic size={20} color={isListening ? "#ef4444" : "#64748b"} />
                  </TouchableOpacity>
                )}

                <TouchableOpacity 
                  onPress={() => handleAddItem()} 
                  className="w-14 h-14 rounded-full items-center justify-center shadow-md transition-all"
                  style={{ backgroundColor: isAddSuccess ? '#10b981' : theme.solidBg }}
                  disabled={(!newItemName.trim() && !isAddSuccess) || isAiProcessing}
                >
                  {isAddSuccess ? (
                    <Check size={28} color="white" />
                  ) : (
                    <Plus size={28} color="white" />
                  )}
                </TouchableOpacity>
              </View>

              {/* Autocomplete Suggestions */}
              {suggestions.length > 0 && (
                <View className="border border-slate-100 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-900 shadow-lg mb-4 overflow-hidden">
                  {suggestions.map((s, i) => (
                    <TouchableOpacity 
                      key={i} 
                      onPress={() => {
                        handleAddItem(s);
                      }}
                      className="w-full px-4 py-3 flex-row items-center border-b border-slate-50 dark:border-slate-800 last:border-0"
                    >
                      <Search size={14} color="#94a3b8" className="mr-2" />
                      <Text className="text-sm font-semibold text-slate-700 dark:text-slate-300">{s}</Text>
                      <ChevronRight size={14} color="#cbd5e1" className="ml-auto" />
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {/* Category Selector (For single items manual selection) */}
              {!newItemName.includes(',') && (
                <View className="mb-4">
                  <TouchableOpacity 
                    onPress={() => setIsCategorySelectorOpen(!isCategorySelectorOpen)}
                    className="flex-row items-center bg-slate-50 dark:bg-slate-800 p-3 rounded-2xl border border-slate-100 dark:border-slate-700"
                  >
                    <View 
                      className="w-7 h-7 rounded-lg items-center justify-center mr-2.5" 
                      style={{ backgroundColor: CATEGORY_CONFIG[selectedCategory].bgColor }}
                    >
                      {(() => {
                        const CatIcon = CATEGORY_CONFIG[selectedCategory].icon;
                        return <CatIcon size={14} color={CATEGORY_CONFIG[selectedCategory].color} />;
                      })()}
                    </View>
                    <Text className="text-slate-700 dark:text-slate-200 font-bold text-sm flex-1">{selectedCategory}</Text>
                    <Text className="text-slate-400 font-bold text-xs">{isCategorySelectorOpen ? 'Kapat ▲' : 'Değiştir ▼'}</Text>
                  </TouchableOpacity>

                  {isCategorySelectorOpen && (
                    <ScrollView style={{ maxHeight: 160 }} className="mt-2 bg-slate-50 dark:bg-slate-800/80 p-2 rounded-2xl border border-slate-100 dark:border-slate-700/50">
                      <View className="flex-row flex-wrap justify-between">
                        {CATEGORIES.map(cat => {
                          const config = CATEGORY_CONFIG[cat];
                          const CatIcon = config.icon;
                          const isSelected = selectedCategory === cat;
                          return (
                            <TouchableOpacity 
                              key={cat} 
                              onPress={() => { setSelectedCategory(cat); setIsCategorySelectorOpen(false); }}
                              className="items-center p-2 rounded-xl mb-1.5"
                              style={{ width: '31%', backgroundColor: isSelected ? config.bgColor : 'transparent' }}
                            >
                              <View className="w-9 h-9 rounded-full items-center justify-center mb-1" style={{ backgroundColor: isSelected ? 'rgba(255,255,255,0.4)' : config.bgColor }}>
                                <CatIcon size={16} color={isSelected ? config.color : config.color} />
                              </View>
                              <Text className={`text-[10px] font-bold text-center ${isSelected ? 'text-slate-800 dark:text-white' : 'text-slate-500 dark:text-slate-400'}`} numberOfLines={1}>{cat}</Text>
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
  }

  // ─── LISTS RENDERING HELPER ───
  const renderListsView = (isSplit: boolean = false) => {
    const totalPending = lists.reduce((s, l) => s + (l.items || []).length, 0);
    const totalBought  = lists.reduce((s, l) => s + (l.boughtItems || []).length, 0);

    return (
      <View style={{ flex: 1 }}>
        {/* Header */}
        <View className="px-5 pt-3 pb-3 flex-row justify-between items-center bg-white/70 dark:bg-slate-900/60 border-b border-slate-200/40 dark:border-slate-800/40">
          {!isSplit && (
            <TouchableOpacity onPress={() => router.back()} className="w-10 h-10 items-center justify-center bg-white dark:bg-slate-800 rounded-full shadow-sm">
               <ChevronLeft size={22} color="#4f46e5" />
            </TouchableOpacity>
          )}
          <View className="items-center flex-1">
             <Text className="text-lg font-black text-slate-800 dark:text-white">Alışveriş Listeleri</Text>
             <Text className="text-[9px] text-slate-450 font-bold uppercase tracking-widest">İhtiyaçlarını Organize Et</Text>
          </View>
          <TouchableOpacity 
            onPress={() => {
              setEditingList(null);
              setNewListName('');
              setNewListIcon('ShoppingCart');
              setNewListColor('indigo');
              setIsCreateModalOpen(true);
            }}
            className="w-10 h-10 rounded-full items-center justify-center shadow-md bg-indigo-600"
          >
            <Plus size={22} color="white" />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
           
           {/* Stats Panel */}
           {lists.length > 0 && !isSplit && (
             <View className="flex-row justify-between mb-6 gap-3">
               {[
                 { label: 'Liste', val: lists.length, gradient: ['#6366f1', '#4f46e5'], emoji: '📋' },
                 { label: 'Alınacak', val: totalPending, gradient: ['#f59e0b', '#d97706'], emoji: '🛒' },
                 { label: 'Alındı', val: totalBought, gradient: ['#10b981', '#059669'], emoji: '✅' },
               ].map(s => (
                 <View key={s.label} className="flex-1 rounded-[1.2rem] shadow-md overflow-hidden">
                   <LinearGradient
                     colors={s.gradient as [string, string, ...string[]]}
                     style={{ padding: 12, alignItems: 'center' }}
                   >
                     <Text className="text-xl mb-0.5">{s.emoji}</Text>
                     <Text className="text-lg font-black text-white">{s.val}</Text>
                     <Text className="text-[8px] font-bold text-white/90 uppercase tracking-widest">{s.label}</Text>
                   </LinearGradient>
                 </View>
               ))}
             </View>
           )}

           {lists.length === 0 ? (
             <View className="items-center justify-center mt-20 bg-white/70 dark:bg-slate-900/60 p-8 rounded-[2.5rem] shadow-sm border border-slate-200/50">
               <View className="w-16 h-16 bg-emerald-50 dark:bg-emerald-950/40 rounded-full items-center justify-center mb-4 border border-emerald-100 dark:border-emerald-900">
                  <ShoppingCart size={32} color="#10b981" />
               </View>
               <Text className="text-slate-700 dark:text-slate-200 text-base font-black">Henüz bir alışveriş listeniz yok.</Text>
               <Text className="text-slate-400 text-center text-xs mt-1 mb-5">Hemen ilk alışveriş listenizi oluşturun ve ihtiyaçlarınızı planlayın.</Text>
               <TouchableOpacity 
                 onPress={() => setIsCreateModalOpen(true)}
                 className="bg-indigo-600 px-6 py-3 rounded-full shadow-md"
               >
                  <Text className="text-white font-bold text-sm">Liste Oluştur</Text>
               </TouchableOpacity>
             </View>
           ) : (
             <View style={isSplit ? { gap: 10 } : { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }}>
               {sortedLists.map((list, index) => {
                 const items = list.items || [];
                 const boughtItems = list.boughtItems || [];
                 const totalCount = items.length + boughtItems.length;
                 const progress = totalCount === 0 ? 0 : (boughtItems.length / totalCount) * 100;
                 const theme = LIST_THEMES[list.colorId || 'indigo'] || LIST_THEMES.indigo;
                 const ListIcon = LIST_ICONS[list.icon || 'ShoppingCart'] || ShoppingCart;
                 const isCurrentlySelected = selectedListId === list.id;

                 return (
                   <TouchableOpacity 
                     key={list.id} 
                     onPress={() => setSelectedListId(list.id)}
                     className="rounded-[1.5rem] shadow-md overflow-hidden"
                     style={isSplit ? { width: '100%', borderWidth: isCurrentlySelected ? 2 : 0, borderColor: isCurrentlySelected ? '#4f46e5' : 'transparent', marginBottom: 10 } : { width: '48%', marginBottom: 16 }}
                   >
                     <LinearGradient
                       colors={theme.gradient as [string, string, ...string[]]}
                       style={{ padding: 14, minHeight: isSplit ? 90 : 145, justifyContent: 'space-between' }}
                     >
                       {/* Card Top Row */}
                       <View className="flex-row justify-between items-center">
                          <View className="w-8 h-8 bg-white/20 rounded-xl items-center justify-center">
                             <ListIcon size={16} color="white" />
                          </View>
                          <TouchableOpacity 
                            onPress={() => {
                              setSelectedMenuList(list);
                              setIsOptionsModalOpen(true);
                            }}
                            className="w-7 h-7 rounded-full bg-white/10 items-center justify-center"
                          >
                             <MoreVertical size={13} color="white" />
                          </TouchableOpacity>
                       </View>
                       
                       {/* Card Info */}
                       <View className="mt-3">
                          <Text className="text-white font-extrabold text-[14px] leading-tight mb-0.5" numberOfLines={1}>
                            {list.name}
                          </Text>
                          <Text className="text-white/80 text-[9px] font-bold">
                            {items.length} Bekleyen • {boughtItems.length} Alınan
                          </Text>
                       </View>
                     </LinearGradient>
                   </TouchableOpacity>
                 );
               })}
             </View>
           )}
        </ScrollView>
      </View>
    );
  };

  // ─── DETAIL VIEW (SINGLE COLUMN MODE) ───
  if (selectedList && !isTabletLandscape) {
    return renderDetailView();
  }

  // ─── MAIN LAYOUT RENDER ───
  return (
    <LinearGradient
      colors={['#e0e7ff', '#f5f3ff', '#fae8ff']}
      style={{ flex: 1 }}
    >
      <SafeAreaView className="flex-1">
        <Stack.Screen options={{ headerShown: false }} />
        
        {isTabletLandscape ? (
          <View style={{ flex: 1, flexDirection: 'row' }}>
            {/* Left Column: List of Lists */}
            <View style={{ width: 300, borderRightWidth: 1, borderRightColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)', backgroundColor: 'rgba(255,255,255,0.1)' }}>
              {renderListsView(true)}
            </View>

            {/* Right Column: Selected List Detail */}
            <View style={{ flex: 1 }}>
              {selectedList ? (
                renderDetailView()
              ) : (
                <View className="flex-1 items-center justify-center">
                  <ShoppingCart size={48} color="#6366f1" style={{ opacity: 0.4 }} />
                  <Text className="font-bold text-slate-700 dark:text-slate-350 text-sm mt-3">Liste Seçilmedi</Text>
                </View>
              )}
            </View>
          </View>
        ) : (
          renderListsView(false)
        )}

        {/* Create / Edit List Dialog Modal */}
        <Modal
          visible={isCreateModalOpen}
          onRequestClose={() => setIsCreateModalOpen(false)}
          transparent
          animationType="fade"
        >
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'padding'} className="flex-1 justify-end bg-black/50">
            <View className="bg-white dark:bg-slate-900 rounded-t-[2.5rem] p-6 shadow-2xl border-t border-slate-200 dark:border-slate-850">
               
               {/* Modal Header */}
               <View className="flex-row justify-between items-center mb-5 pb-3 border-b border-slate-100 dark:border-slate-800">
                  <Text className="text-lg font-black text-slate-800 dark:text-white">
                    {editingList ? '✏️ Listeyi Düzenle' : '🛒 Yeni Liste Oluştur'}
                  </Text>
                  <TouchableOpacity onPress={() => setIsCreateModalOpen(false)} className="p-1">
                     <X size={20} color="#64748b" />
                  </TouchableOpacity>
               </View>

               {/* Name Input */}
               <Text className="text-slate-500 font-bold text-[9px] uppercase tracking-wider mb-2 ml-1">Liste Adı</Text>
               <TextInput 
                 className="bg-slate-50 dark:bg-slate-855 border border-slate-200 dark:border-slate-700 px-4 py-3 rounded-2xl text-slate-900 dark:text-white text-sm font-semibold mb-4 h-12"
                 placeholder="Örn: Haftalık Market..."
                 placeholderTextColor="#94a3b8"
                 value={newListName}
                 onChangeText={setNewListName}
               />

               {/* Icon Choice */}
               <Text className="text-slate-500 font-bold text-[9px] uppercase tracking-wider mb-2 ml-1">İkon Seç</Text>
               <View className="flex-row justify-between mb-4">
                  {Object.keys(LIST_ICONS).map(iconName => {
                    const IconComp = LIST_ICONS[iconName];
                    const isSelected = newListIcon === iconName;
                    return (
                      <TouchableOpacity 
                        key={iconName}
                        onPress={() => setNewListIcon(iconName)}
                        className={`p-2.5 rounded-xl border border-2 active:scale-95 ${isSelected ? 'bg-indigo-50 dark:bg-indigo-900 border-indigo-500 scale-105 shadow-md' : 'bg-slate-50 dark:bg-slate-800 border-slate-100 dark:border-slate-700'}`}
                      >
                         <IconComp size={18} color={isSelected ? '#6366f1' : '#64748b'} />
                      </TouchableOpacity>
                    );
                  })}
               </View>

               {/* Color Choice */}
               <Text className="text-slate-500 font-bold text-[9px] uppercase tracking-wider mb-2 ml-1">Tema Rengi Seç</Text>
               <View className="flex-row justify-between mb-6">
                  {Object.keys(LIST_THEMES).map(colorKey => {
                    const theme = LIST_THEMES[colorKey];
                    const isSelected = newListColor === colorKey;
                    return (
                      <TouchableOpacity 
                        key={colorKey}
                        onPress={() => setNewListColor(colorKey)}
                        className={`w-9 h-9 rounded-full border-2 items-center justify-center ${isSelected ? 'border-slate-800 dark:border-white scale-110' : 'border-transparent'}`}
                      >
                         <View className="w-7 h-7 rounded-full" style={{ backgroundColor: theme.solidBg }} />
                      </TouchableOpacity>
                    );
                  })}
               </View>

               {/* Save Button */}
               <TouchableOpacity 
                 onPress={handleSaveList}
                 className="bg-indigo-600 rounded-2xl py-3.5 items-center shadow-md mb-4"
               >
                  <Text className="text-white font-bold text-sm">
                    {editingList ? 'Kaydet' : 'Oluştur'}
                  </Text>
               </TouchableOpacity>

            </View>
          </KeyboardAvoidingView>
        </Modal>

        {/* List Options Bottom Sheet Modal */}
        <Modal
          animationType="fade"
          transparent={true}
          visible={isOptionsModalOpen}
          onRequestClose={() => setIsOptionsModalOpen(false)}
        >
          <View className="flex-1 justify-end bg-black/40">
            <View className="bg-white dark:bg-slate-900 rounded-t-[2rem] p-5 shadow-2xl">
              <Text className="text-slate-800 dark:text-white font-black text-center text-sm mb-4">
                {selectedMenuList?.name || 'Liste Seçenekleri'}
              </Text>
              
              {selectedMenuList && (
                <View className="space-y-1">
                  
                  {/* Move Up */}
                  {sortedLists.findIndex(l => l.id === selectedMenuList.id) > 0 && (
                    <TouchableOpacity 
                      onPress={() => handleMoveList(selectedMenuList, 'up')}
                      className="flex-row items-center py-3 px-4 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800"
                    >
                      <ChevronUp size={18} color="#6366f1" className="mr-3" />
                      <Text className="text-slate-700 dark:text-slate-350 font-bold text-xs">Yukarı Taşı</Text>
                    </TouchableOpacity>
                  )}

                  {/* Move Down */}
                  {sortedLists.findIndex(l => l.id === selectedMenuList.id) < sortedLists.length - 1 && (
                    <TouchableOpacity 
                      onPress={() => handleMoveList(selectedMenuList, 'down')}
                      className="flex-row items-center py-3 px-4 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800"
                    >
                      <ChevronDown size={18} color="#6366f1" className="mr-3" />
                      <Text className="text-slate-700 dark:text-slate-350 font-bold text-xs">Aşağı Taşı</Text>
                    </TouchableOpacity>
                  )}

                  {/* Edit */}
                  <TouchableOpacity 
                    onPress={() => {
                      setNewListName(selectedMenuList.name);
                      setNewListIcon(selectedMenuList.icon);
                      setNewListColor(selectedMenuList.colorId || 'indigo');
                      setEditingList(selectedMenuList);
                      setIsOptionsModalOpen(false);
                      setIsCreateModalOpen(true);
                    }}
                    className="flex-row items-center py-3 px-4 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800"
                  >
                    <Edit2 size={18} color="#64748b" className="mr-3" />
                    <Text className="text-slate-700 dark:text-slate-300 font-bold text-xs">Düzenle</Text>
                  </TouchableOpacity>

                  {/* Delete */}
                  <TouchableOpacity 
                    onPress={() => handleDeleteList(selectedMenuList.id)}
                    className="flex-row items-center py-3 px-4 rounded-xl bg-red-50 dark:bg-red-950/20"
                  >
                    <Trash2 size={18} color="#ef4444" className="mr-3" />
                    <Text className="text-red-500 font-bold text-xs">Sil</Text>
                  </TouchableOpacity>
                  
                  {/* Cancel */}
                  <TouchableOpacity 
                    onPress={() => setIsOptionsModalOpen(false)}
                    className="mt-2 py-3 bg-slate-100 dark:bg-slate-800 rounded-xl items-center"
                  >
                    <Text className="text-slate-650 dark:text-slate-400 font-bold text-xs">İptal</Text>
                  </TouchableOpacity>

                </View>
              )}
            </View>
          </View>
        </Modal>

      </SafeAreaView>
    </LinearGradient>
  );
}

// ─── STYLES ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  headerGradient: {
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    paddingBottom: 20,
    paddingTop: 12,
    paddingHorizontal: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  fabGradient: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  }
});
