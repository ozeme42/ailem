Created At: 2026-06-29T12:47:59Z
Completed At: 2026-06-29T12:47:59Z
File Path: `file:///E:/ailem/ailem-mobile/app/shopping.tsx`
Total Lines: 1045
Total Bytes: 50694
Showing lines 1 to 800
The following code has been modified to include a line number before every line, in the format: <line_number>: <original_line>. Please note that any changes targeting the original code should remove the line number, colon, and leading space.
1: import { View, Text, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Modal, Alert, StyleSheet } from 'react-native';
2: import { SafeAreaView } from 'react-native-safe-area-context';
3: import { useEffect, useState, useMemo } from 'react';
4: import { 
5:   onShoppingListsUpdate, addShoppingList, updateShoppingList, deleteShoppingList, 
6:   addShoppingListItemToList, moveItemToBought, moveItemToPending, 
7:   deleteShoppingListItemFromList, toggleShoppingListItemStatusInList
8: } from '../lib/dataService';
9: import { ShoppingList, ShoppingItem } from '../lib/data';
10: import { 
11:   ShoppingCart, Home, ListChecks, Cake, Notebook, ShoppingBag, 
12:   Plus, ChevronLeft, Trash2, CheckCircle2, Circle, MoreVertical, 
13:   Apple, Beef, Milk, Wheat, Coffee, Package, Droplets, Baby, Star, X,
14:   Edit2, Search, ChevronRight, Mic, Sparkles, ChevronUp, ChevronDown, Check
15: } from 'lucide-react-native';
16: import { useRouter, Stack } from 'expo-router';
17: import { LinearGradient } from 'expo-linear-gradient';
18: 
19: // ─── CATEGORY CONFIG ──────────────────────────────────────────────────────────
20: const CATEGORY_CONFIG: Record<string, {
21:   icon: any;
22:   color: string;
23:   bgColor: string;
24:   borderColor: string;
25:   lightBg: string;
26:   lightBorder: string;
27:   cardBg: string;
28:   cardText: string;
29:   checkBg: string;
30: }> = {
31:   'Meyve ve Sebze':       { icon: Apple,       color: '#27ae60', bgColor: '#e8f8f5', borderColor: '#d1f2eb', lightBg: '#e8f8f5', lightBorder: '#d1f2eb', cardBg: '#f4fbf7', cardText: '#1b663e', checkBg: '#27ae60' },
32:   'Et ve Tavuk Ürünleri': { icon: Beef,        color: '#c0392b', bgColor: '#fadbd8', borderColor: '#f5b7b1', lightBg: '#fadbd8', lightBorder: '#f5b7b1', cardBg: '#fdf3f2', cardText: '#87281e', checkBg: '#c0392b' },
33:   'Süt Ürünleri':         { icon: Milk,        color: '#2980b9', bgColor: '#ebf5fb', borderColor: '#d4e6f1', lightBg: '#ebf5fb', lightBorder: '#d4e6f1', cardBg: '#f2f8fc', cardText: '#1a5276', checkBg: '#2980b9' },
34:   'Unlu Mamüller':        { icon: Wheat,       color: '#d35400', bgColor: '#fdebd0', borderColor: '#f9e79f', lightBg: '#fdebd0', lightBorder: '#f9e79f', cardBg: '#fdf9f2', cardText: '#873600', checkBg: '#d35400' },
35:   'Temel Gıda':           { icon: Package,     color: '#e67e22', bgColor: '#fdf2e9', borderColor: '#fadbd8', lightBg: '#fdf2e9', lightBorder: '#fadbd8', cardBg: '#fdf8f4', cardText: '#935116', checkBg: '#e67e22' },
36:   'Atıştırmalık':         { icon: Coffee,      color: '#8e44ad', bgColor: '#f5eeeb', borderColor: '#ebdef0', lightBg: '#f5eeeb', lightBorder: '#ebdef0', cardBg: '#faf5fb', cardText: '#5b2c6f', checkBg: '#8e44ad' },
37:   'İçecekler':            { icon: Droplets,    color: '#16a085', bgColor: '#e8f8f5', borderColor: '#a3e4d7', lightBg: '#e8f8f5', lightBorder: '#a3e4d7', cardBg: '#f2faf8', cardText: '#0e6251', checkBg: '#16a085' },
38:   'Dondurulmuş Gıdalar':  { icon: Package,     color: '#3498db', bgColor: '#ebf5fb', borderColor: '#a9cce3', lightBg: '#ebf5fb', lightBorder: '#a9cce3', cardBg: '#f3f9fd', cardText: '#1f618d', checkBg: '#3498db' },
39:   'Temizlik Ürünleri':    { icon: Droplets,    color: '#0e6251', bgColor: '#e8f8f5', borderColor: '#a2d9ce', lightBg: '#e8f8f5', lightBorder: '#a2d9ce', cardBg: '#f2faf8', cardText: '#0b4d3f', checkBg: '#0e6251' },
40:   'Kişisel Bakım':        { icon: Star,        color: '#db3e79', bgColor: '#fce4ec', borderColor: '#f8bbd0', lightBg: '#fce4ec', lightBorder: '#f8bbd0', cardBg: '#fdf2f6', cardText: '#881b47', checkBg: '#db3e79' },
41:   'Bebek Ürünleri':       { icon: Baby,        color: '#7d3c98', bgColor: '#f4ecf7', borderColor: '#d7bde2', lightBg: '#f4ecf7', lightBorder: '#d7bde2', cardBg: '#f9f5fb', cardText: '#4a235a', checkBg: '#7d3c98' },
42:   'Diğer':                { icon: ShoppingBag,  color: '#7f8c8d', bgColor: '#f2f4f4', borderColor: '#e5e7e9', lightBg: '#f2f4f4', lightBorder: '#e5e7e9', cardBg: '#fbfcfc', cardText: '#566573', checkBg: '#7f8c8d' },
43: };
44: 
45: const CATEGORY_ORDER = [
46:   'Meyve ve Sebze',
47:   'Et ve Tavuk Ürünleri',
48:   'Süt Ürünleri',
49:   'Unlu Mamüller',
50:   'Temel Gıda',
51:   'Atıştırmalık',
52:   'İçecekler',
53:   'Dondurulmuş Gıdalar',
54:   'Temizlik Ürünleri',
55:   'Kişisel Bakım',
56:   'Bebek Ürünleri',
57:   'Diğer'
58: ];
59: 
60: const CATEGORIES = Object.keys(CATEGORY_CONFIG);
61: 
62: // ─── THEME CONFIG ─────────────────────────────────────────────────────────────
63: const LIST_THEMES: Record<string, {
64:   id: string;
65:   label: string;
66:   gradient: string[];
67:   solidBg: string;
68:   pageBg: string;
69: }> = {
70:   indigo:  { id: 'indigo',  label: 'Mor',   gradient: ['#6366f1', '#4f46e5'], solidBg: '#6366f1', pageBg: '#f5f3ff' },
71:   emerald: { id: 'emerald', label: 'Yeşil', gradient: ['#10b981', '#059669'], solidBg: '#10b981', pageBg: '#ecfdf5' },
72:   rose:    { id: 'rose',    label: 'Pembe', gradient: ['#f43f5e', '#e11d48'], solidBg: '#f43f5e', pageBg: '#fff1f2' },
73:   amber:   { id: 'amber',   label: 'Sarı',  gradient: ['#f59e0b', '#d97706'], solidBg: '#f59e0b', pageBg: '#fffbeb' },
74:   cyan:    { id: 'cyan',    label: 'Mavi',  gradient: ['#06b6d4', '#0891b2'], solidBg: '#06b6d4', pageBg: '#ecfeff' },
75:   fuchsia: { id: 'fuchsia', label: 'Fuşya', gradient: ['#d946ef', '#c084fc'], solidBg: '#d946ef', pageBg: '#fdf4ff' },
76: };
77: 
78: const LIST_ICONS: Record<string, any> = {
79:   ShoppingCart, Home, ListChecks, Cake, Notebook, ShoppingBag
80: };
81: 
82: // ─── SUGGESTIONS CONFIG ────────────────────────────────────────────────────────
83: const defaultShoppingItems = [
84:   "Süt", "Ekmek", "Yumurta", "Peynir", "Zeytin", "Domates", "Salatalık",
85:   "Biber", "Soğan", "Sarımsak", "Patates", "Elma", "Muz", "Portakal",
86:   "Limon", "Tavuk", "Kıyma", "Balık", "Pirinç", "Bulgur", "Makarna",
87:   "Salça", "Sıvı Yağ", "Tereyağı", "Un", "Şeker", "Tuz", "Çay",
88:   "Kahve", "Yoğurt", "Su", "Meyve Suyu", "Deterjan", "Çamaşır Suyu",
89:   "Bulaşık Deterjanı", "Şampuan", "Sabun", "Diş Macunu", "Tuvalet Kağıdı",
90:   "Kağıt Havlu"
91: ];
92: 
93: // ─── OFFLINE COMPOUND PARSER & CATEGORIZER ─────────────────────────────────────
94: function parseShoppingItem(rawText: string): { name: string; quantity?: string; category: string }[] {
95:   const parts = rawText.split(',').map(p => p.trim()).filter(Boolean);
96:   
97:   return parts.map(part => {
98:     // Try to match a quantity (e.g. "2 kg elma", "1 adet ekmek", "500g kıyma", "2lt süt")
99:     const qtyRegex = /^(\d+(?:\.\d+)?\s*(?:kg|g|kilo|gram|adet|paket|lt|litre|şişe|bardak|koli|l|ml)?)\s+(.+)$/i;
100:     const qtyRegexEnd = /^(.+?)\s+(\d+(?:\.\d+)?\s*(?:kg|g|kilo|gram|adet|paket|lt|litre|şişe|bardak|koli|l|ml)?)$/i;
101:     
102:     let name = part;
103:     let quantity = '';
104:     
105:     let match = part.match(qtyRegex);
106:     if (match) {
107:       quantity = match[1].trim();
108:       name = match[2].trim();
109:     } else {
110:       match = part.match(qtyRegexEnd);
111:       if (match) {
112:         name = match[1].trim();
113:         quantity = match[2].trim();
114:       }
115:     }
116:     
117:     const lowerName = name.toLowerCase();
118:     let category = 'Diğer';
119:     
120:     const keywords: Record<string, string[]> = {
121:       'Meyve ve Sebze': ['elma', 'armut', 'muz', 'çilek', 'karpuz', 'kavun', 'portakal', 'mandalina', 'limon', 'şeftali', 'erik', 'kiraz', 'vişne', 'nar', 'incir', 'üzüm', 'domates', 'salatalık', 'biber', 'patates', 'soğan', 'sarımsak', 'havuç', 'ıspanak', 'marul', 'maydanoz', 'lahana', 'pırasa', 'kabak', 'patlıcan', 'brokoli', 'karnabahar', 'bezelye', 'bamya', 'fasulye', 'kereviz', 'enginar', 'mantar', 'roka', 'nane', 'dereotu', 'kivi', 'avokado', 'şeftali', 'kayısı', 'turp', 'yeşillik', 'sebze', 'meyve'],
122:       'Süt Ürünleri': ['süt', 'peynir', 'yoğurt', 'tereyağı', 'kaymak', 'krema', 'kefir', 'ayran', 'kaşar', 'lor', 'süzme', 'labne', 'margarin', 'çökelek'],
123:       'Et ve Tavuk Ürünleri': ['et', 'kıyma', 'tavuk', 'pirzola', 'bonfile', 'antrikot', 'biftek', 'köfte', 'sosis', 'salam', 'sucuk', 'pastırma', 'jambon', 'hindi', 'balık', 'somon', 'levrek', 'çipura', 'hamsi', 'istavrit', 'karides', 'kalamar', 'kuzu', 'dana'],
124:       'Unlu Mamüller': ['ekmek', 'pide', 'simit', 'poğaça', 'açma', 'börek', 'çörek', 'kurabiye', 'kek', 'pasta', 'yufka', 'milföy', 'kruvasan', 'lavaş', 'bazlama', 'tost ekmeği', 'galeta'],
125:       'Temel Gıda': ['pirinç', 'bulgur', 'makarna', 'salça', 'yağ', 'zeytinyağı', 'sıvı yağ', 'un', 'şeker', 'tuz', 'mercimek', 'nohut', 'fasulye', 'bakliyat', 'irmik', 'nişasta', 'sirke', 'baharat', 'karabiber', 'pul biber', 'kekik', 'kimyon', 'nane', 'ketçap', 'mayonez', 'hardal', 'sos'],
126:       'Atıştırmalık': ['çikolata', 'gofret', 'bisküvi', 'kraker', 'cips', 'kuruyemiş', 'fındık', 'fıstık', 'ceviz', 'badem', 'leblebi', 'çekirdek', 'lokum', 'jelibon', 'şekerleme', 'bar', 'granola', 'cips'],
127:       'İçecekler': ['su', 'meyve suyu', 'soda', 'gazoz', 'kola', 'fanta', 'sprite', 'ice tea', 'soğuk çay', 'limonata', 'şalgam', 'kahve', 'çay', 'bitki çayı', 'yeşil çay', 'ıhlamur', 'adaçayı', 'kakao'],
128:       'Dondurulmuş Gıdalar': ['dondurma', 'dondurulmuş', 'frozen', 'pizza', 'milföy', 'mantı', 'kroket'],
129:       'Temizlik Ürünleri': ['deterjan', 'çamaşır suyu', 'yumuşatıcı', 'sıvı sabun', 'sabun', 'şampuan', 'duş jeli', 'diş macunu', 'tuvalet kağıdı', 'kağıt havlu', 'peçete', 'ıslak mendil', 'çöp torbası', 'sünger', 'bez', 'vileda', 'paspas', 'kireç'],
130:       'Kişisel Bakım': ['şampuan', 'sabun', 'duş jeli', 'saç kremi', 'deodorant', 'parfüm', 'kolonya', 'tıraş', 'krem', 'losyon', 'makyaj', 'ped', 'diş fırçası'],
131:       'Bebek Ürünleri': ['bebek', 'bezi', 'pişik', 'mama', 'biberon', 'emzik', 'ıslak mendil']
132:     };
133:     
134:     for (const [catName, words] of Object.entries(keywords)) {
135:       if (words.some(word => lowerName.includes(word))) {
136:         category = catName;
137:         break;
138:       }
139:     }
140:     
141:     return {
142:       name,
143:       ...(quantity ? { quantity } : {}),
144:       category
145:     };
146:   });
147: }
148: 
149: export default function ShoppingScreen() {
150:   const [lists, setLists] = useState<ShoppingList[]>([]);
151:   const [loading, setLoading] = useState(true);
152:   const [selectedListId, setSelectedListId] = useState<string | null>(null);
153:   const router = useRouter();
154: 
155:   // Create & Edit List Modal States
156:   const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
157:   const [newListName, setNewListName] = useState('');
158:   const [newListIcon, setNewListIcon] = useState('ShoppingCart');
159:   const [newListColor, setNewListColor] = useState('indigo');
160:   const [editingList, setEditingList] = useState<ShoppingList | null>(null);
161: 
162:   // Detail View States
163:   const [detailTab, setDetailTab] = useState<'pending' | 'bought'>('pending');
164:   const [newItemName, setNewItemName] = useState('');
165:   const [selectedCategory, setSelectedCategory] = useState('Diğer');
166:   const [isCategorySelectorOpen, setIsCategorySelectorOpen] = useState(false);
167:   const [isAddItemOpen, setIsAddItemOpen] = useState(false);
168:   const [isAiProcessing, setIsAiProcessing] = useState(false);
169:   const [isListening, setIsListening] = useState(false);
170: 
171:   // List Options Bottom Sheet Modal
172:   const [isOptionsModalOpen, setIsOptionsModalOpen] = useState(false);
173:   const [selectedMenuList, setSelectedMenuList] = useState<ShoppingList | null>(null);
174: 
175:   useEffect(() => {
176:     let unsubscribe: any;
177:     try {
178:       unsubscribe = onShoppingListsUpdate((data: ShoppingList[]) => {
179:         setLists(data);
180:         setLoading(false);
181:       });
182:     } catch (e) {
183:       console.log('Error fetching shopping lists:', e);
184:       setLoading(false);
185:     }
186: 
187:     return () => {
188:       if (typeof unsubscribe === 'function') unsubscribe();
189:     };
190:   }, []);
191: 
192:   // Sorted Lists (order asc, then createdAt desc)
193:   const sortedLists = useMemo(() => {
194:     return [...lists].sort((a, b) => {
195:       const oA = a.order ?? 0, oB = b.order ?? 0;
196:       if (oA !== oB) return oA - oB;
197:       const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
198:       const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
199:       return timeB - timeA;
200:     });
201:   }, [lists]);
202: 
203:   const selectedList = useMemo(() => {
204:     return lists.find(l => l.id === selectedListId) || null;
205:   }, [lists, selectedListId]);
206: 
207:   // Autocomplete Suggestions
208:   const historicalItems = useMemo(() => {
209:     const items = new Set<string>();
210:     lists.forEach(l => {
211:       (l.items || []).forEach(i => items.add(i.name));
212:       (l.boughtItems || []).forEach(i => items.add(i.name));
213:     });
214:     return Array.from(items);
215:   }, [lists]);
216: 
217:   const suggestions = useMemo(() => {
218:     if (!newItemName.trim()) return [];
219:     const q = newItemName.toLowerCase();
220:     const hist = historicalItems.filter(i => i.toLowerCase().startsWith(q)).slice(0, 3);
221:     const def = defaultShoppingItems.filter(i => i.toLowerCase().startsWith(q) && !hist.includes(i)).slice(0, 3);
222:     return [...hist, ...def];
223:   }, [newItemName, historicalItems]);
224: 
225:   const handleSaveList = async () => {
226:     if (!newListName.trim()) return;
227:     try {
228:       if (editingList) {
229:         await updateShoppingList(editingList.id, {
230:           name: newListName.trim(),
231:           icon: newListIcon,
232:           colorId: newListColor
233:         });
234:         setEditingList(null);
235:       } else {
236:         await addShoppingList(newListName.trim(), newListIcon, newListColor);
237:       }
238:       setNewListName('');
239:       setIsCreateModalOpen(false);
240:     } catch (e) {
241:       console.error(e);
242:     }
243:   };
244: 
245:   const handleDeleteList = async (id: string) => {
246:     Alert.alert(
247:       "Listeyi Sil",
248:       "Bu liste ve içindeki tüm ürünler kalıcı olarak silinecek. Emin misiniz?",
249:       [
250:         { text: "İptal", style: "cancel" },
251:         { 
252:           text: "Sil", 
253:           style: "destructive", 
254:           onPress: async () => {
255:             try {
256:               await deleteShoppingList(id);
257:               if (selectedListId === id) setSelectedListId(null);
258:               setIsOptionsModalOpen(false);
259:             } catch (e) {
260:               console.error(e);
261:             }
262:           }
263:         }
264:       ]
265:     );
266:   };
267: 
268:   const handleMoveList = async (list: ShoppingList, dir: 'up' | 'down') => {
269:     const idx = sortedLists.findIndex(l => l.id === list.id);
270:     const targetIdx = dir === 'up' ? idx - 1 : idx + 1;
271:     if (targetIdx < 0 || targetIdx >= sortedLists.length) return;
272:     const targetList = sortedLists[targetIdx];
273:     
274:     const currentOrder = list.order ?? idx;
275:     const targetOrder = targetList.order ?? targetIdx;
276:     
277:     try {
278:       await updateShoppingList(list.id, { order: targetOrder });
279:       await updateShoppingList(targetList.id, { order: currentOrder });
280:       setIsOptionsModalOpen(false);
281:     } catch (e) {
282:       console.error('Error reordering lists:', e);
283:     }
284:   };
285: 
286:   const handleAddItem = async (customName?: string) => {
287:     const inputName = customName || newItemName;
288:     if (!inputName.trim() || !selectedListId) return;
289: 
290:     setIsAiProcessing(true);
291:     try {
292:       // If compound addition (contains comma)
293:       if (inputName.includes(',')) {
294:         const items = parseShoppingItem(inputName);
295:         for (const item of items) {
296:           await addShoppingListItemToList(selectedListId, {
297:             name: item.name,
298:             category: item.category,
299:             quantity: item.quantity || '',
300:             isBought: false
301:           });
302:         }
303:       } else {
304:         // Single item
305:         let category = selectedCategory;
306:         let quantity = '';
307:         let name = inputName.trim();
308: 
309:         // Predict category if left as "Diğer"
310:         if (category === 'Diğer') {
311:           const parsed = parseShoppingItem(inputName)[0];
312:           category = parsed.category;
313:           quantity = parsed.quantity || '';
314:           name = parsed.name;
315:         }
316: 
317:         await addShoppingListItemToList(selectedListId, {
318:           name,
319:           category,
320:           quantity,
321:           isBought: false
322:         });
323:       }
324: 
325:       setNewItemName('');
326:       setSelectedCategory('Diğer');
327:       setIsAddItemOpen(false);
328:     } catch (e) {
329:       console.error(e);
330:     } finally {
331:       setIsAiProcessing(false);
332:     }
333:   };
334: 
335:   const handleToggleItem = async (item: ShoppingItem) => {
336:     if (!selectedListId) return;
337:     try {
338:       if (item.isBought) {
339:         await moveItemToPending(selectedListId, item.id);
340:       } else {
341:         await moveItemToBought(selectedListId, item.id);
342:       }
343:     } catch (e) {
344:       console.error(e);
345:     }
346:   };
347: 
348:   const handleDeleteItem = async (item: ShoppingItem) => {
349:     if (!selectedListId) return;
350:     try {
351:       await deleteShoppingListItemFromList(selectedListId, item.id, item.isBought);
352:     } catch (e) {
353:       console.error(e);
354:     }
355:   };
356: 
357:   const toggleVoice = () => {
358:     if (isListening) {
359:       setIsListening(false);
360:       return;
361:     }
362:     setIsListening(true);
363:     // Simulate speech to text
364:     setTimeout(() => {
365:       setNewItemName("2 kg elma, 1 lt süt, ekmek");
366:       setIsListening(false);
367:       Alert.alert("Ses Tanımlandı", "\"2 kg elma, 1 lt süt, ekmek\" algılandı.");
368:     }, 1500);
369:   };
370: 
371:   if (loading) {
372:     return (
373:       <SafeAreaView className="flex-1 justify-center items-center bg-slate-50 dark:bg-slate-950">
374:         <ActivityIndicator size="large" color="#6366f1" />
375:       </SafeAreaView>
376:     );
377:   }
378: 
379:   // ─── DETAIL VIEW ───
380:   if (selectedList) {
381:     const theme = LIST_THEMES[selectedList.colorId || 'indigo'] || LIST_THEMES.indigo;
382:     const pendingItems = (selectedList.items || []).sort((a, b) => {
383:       const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
384:       const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
385:       return timeB - timeA;
386:     });
387:     const boughtItems = (selectedList.boughtItems || []).sort((a, b) => {
388:       const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
389:       const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
390:       return timeB - timeA;
391:     });
392: 
393:     const totalCount = pendingItems.length + boughtItems.length;
394:     const progress = totalCount === 0 ? 0 : Math.round((boughtItems.length / totalCount) * 100);
395: 
396:     // Group pending items by category
397:     const groupedPending = pendingItems.reduce((acc, item) => {
398:       const cat = item.category || 'Diğer';
399:       if (!acc[cat]) acc[cat] = [];
400:       acc[cat].push(item);
401:       return acc;
402:     }, {} as Record<string, ShoppingItem[]>);
403: 
404:     // Sort categories based on web order
405:     const sortedCategories = Object.entries(groupedPending).sort(([a], [b]) => 
406:       CATEGORY_ORDER.indexOf(a) - CATEGORY_ORDER.indexOf(b)
407:     );
408: 
409:     const ListIcon = LIST_ICONS[selectedList.icon || 'ShoppingCart'] || ShoppingCart;
410: 
411:     return (
412:       <View className="flex-1" style={{ backgroundColor: theme.pageBg }}>
413:         <Stack.Screen options={{ headerShown: false }} />
414:         
415:         {/* Colorful Gradient Header */}
416:         <LinearGradient
417:           colors={theme.gradient as [string, string, ...string[]]}
418:           start={{ x: 0, y: 0 }}
419:           end={{ x: 1, y: 0 }}
420:           style={styles.headerGradient}
421:         >
422:           <SafeAreaView edges={['top']} className="m-0 p-0" />
423:           <View className="flex-row justify-between items-center mb-3">
424:             <TouchableOpacity onPress={() => setSelectedListId(null)} className="w-9 h-9 rounded-full bg-white/20 items-center justify-center">
425:               <ChevronLeft size={20} color="white" />
426:             </TouchableOpacity>
427:             
428:             <View className="items-center flex-1 mx-3">
429:               <Text className="text-white font-bold text-lg text-center" numberOfLines={1}>{selectedList.name}</Text>
430:               <Text className="text-white/80 text-[10px] font-bold uppercase tracking-wider">
431:                 {boughtItems.length} / {totalCount} Alındı
432:               </Text>
433:             </View>
434: 
435:             <TouchableOpacity 
436:               onPress={() => {
437:                 setSelectedMenuList(selectedList);
438:                 setIsOptionsModalOpen(true);
439:               }}
440:               className="w-9 h-9 rounded-full bg-white/20 items-center justify-center"
441:             >
442:               <MoreVertical size={16} color="white" />
443:             </TouchableOpacity>
444:           </View>
445: 
446:           {/* Header Progress Bar */}
447:           {totalCount > 0 && (
448:             <View className="flex-row items-center gap-2 px-1">
449:               <View className="flex-1 h-1.5 bg-white/30 rounded-full overflow-hidden">
450:                 <View className="h-full bg-white rounded-full" style={{ width: `${progress}%` }} />
451:               </View>
452:               <Text className="text-white font-bold text-[10px]">{progress}%</Text>
453:             </View>
454:           )}
455:         </LinearGradient>
456: 
457:         {/* Tab Segment Switcher */}
458:         <View className="flex-row mx-4 mt-4 bg-white/70 dark:bg-slate-900/70 p-1 rounded-2xl border border-slate-200/50 dark:border-slate-800">
459:           <TouchableOpacity 
460:             onPress={() => setDetailTab('pending')}
461:             className={`flex-1 py-2.5 rounded-xl items-center ${detailTab === 'pending' ? 'bg-white dark:bg-slate-800 shadow-sm' : ''}`}
462:           >
463:             <Text className={`font-bold text-xs ${detailTab === 'pending' ? 'text-slate-800 dark:text-white' : 'text-slate-500'}`}>
464:               Alınacaklar ({pendingItems.length})
465:             </Text>
466:           </TouchableOpacity>
467:           <TouchableOpacity 
468:             onPress={() => setDetailTab('bought')}
469:             className={`flex-1 py-2.5 rounded-xl items-center ${detailTab === 'bought' ? 'bg-white dark:bg-slate-800 shadow-sm' : ''}`}
470:           >
471:             <Text className={`font-bold text-xs ${detailTab === 'bought' ? 'text-slate-800 dark:text-white' : 'text-slate-500'}`}>
472:               Alınanlar ({boughtItems.length})
473:             </Text>
474:           </TouchableOpacity>
475:         </View>
476: 
477:         {/* Scroll Content */}
478:         <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
479:           
480:           {detailTab === 'pending' ? (
481:             pendingItems.length === 0 ? (
482:               <View className="items-center justify-center mt-20 bg-white/80 dark:bg-slate-900/80 p-8 rounded-[2rem] border border-dashed border-slate-200 dark:border-slate-800">
483:                 <ListChecks size={40} color={theme.solidBg} className="mb-2 opacity-50" />
484:                 <Text className="text-slate-650 dark:text-slate-350 font-bold text-center text-sm">Liste Boş!</Text>
485:                 <Text className="text-slate-400 text-center text-xs mt-1">Aşağıdaki + butonunu kullanarak hızlıca ürün ekleyin.</Text>
486:               </View>
487:             ) : (
488:               sortedCategories.map(([category, items]) => {
489:                 const cat = CATEGORY_CONFIG[category] || CATEGORY_CONFIG.Diğer;
490:                 const CatIcon = cat.icon;
491:                 return (
492:                   <View key={category} className="mb-4">
493:                     {/* Category Title Pill */}
494:                     <View 
495:                       style={{ backgroundColor: cat.lightBg, borderColor: cat.lightBorder }}
496:                       className="flex-row items-center px-4 py-2.5 rounded-2xl mb-2 border shadow-sm"
497:                     >
498:                       <View className="p-1.5 rounded-lg mr-2" style={{ backgroundColor: cat.color }}>
499:                         <CatIcon size={12} color="white" />
500:                       </View>
501:                       <Text className="text-[10px] font-black uppercase tracking-wider" style={{ color: cat.color }}>
502:                         {category}
503:                       </Text>
504:                       <View className="ml-auto rounded-full px-2 py-0.5" style={{ backgroundColor: cat.color }}>
505:                         <Text className="text-[10px] font-bold text-white">{items.length}</Text>
506:                       </View>
507:                     </View>
508: 
509:                     {/* Items inside category */}
510:                     {items.map(item => (
511:                       <View 
512:                         key={item.id} 
513:                         style={{ backgroundColor: cat.cardBg, borderColor: cat.lightBorder }}
514:                         className="flex-row items-center p-3.5 rounded-2xl mb-2 border shadow-sm"
515:                       >
516:                         <TouchableOpacity onPress={() => handleToggleItem(item)} className="mr-3">
517:                           <View 
518:                             style={{ borderColor: cat.lightBorder }} 
519:                             className="w-6 h-6 rounded-full border-2 bg-white items-center justify-center" 
520:                           />
521:                         </TouchableOpacity>
522: 
523:                         <View className="p-1.5 rounded-xl mr-3" style={{ backgroundColor: cat.lightBg }}>
524:                           <CatIcon size={15} color={cat.color} />
525:                         </View>
526: 
527:                         <View className="flex-1">
528:                           <Text className="font-bold text-[14px]" style={{ color: cat.cardText }}>
529:                             {item.name}
530:                           </Text>
531:                           {item.quantity ? (
532:                             <Text className="text-[10px] font-bold text-slate-400 mt-0.5">Miktar: {item.quantity}</Text>
533:                           ) : null}
534:                         </View>
535: 
536:                         <TouchableOpacity onPress={() => handleDeleteItem(item)} className="p-2 bg-white/50 rounded-full">
537:                           <X size={14} color="#ef4444" />
538:                         </TouchableOpacity>
539:                       </View>
540:                     ))}
541:                   </View>
542:                 );
543:               })
544:             )
545:           ) : (
546:             boughtItems.length === 0 ? (
547:               <View className="items-center justify-center mt-20 bg-white/40 dark:bg-slate-900/30 p-8 rounded-[2rem] border border-dashed border-slate-200/50">
548:                 <CheckCircle2 size={40} color="#94a3b8" className="mb-2 opacity-50" />
549:                 <Text className="text-slate-500 font-bold text-center text-sm">Alınan Ürün Yok.</Text>
550:               </View>
551:             ) : (
552:               boughtItems.map(item => {
553:                 const cat = CATEGORY_CONFIG[item.category || 'Diğer'] || CATEGORY_CONFIG.Diğer;
554:                 const CatIcon = cat.icon;
555:                 return (
556:                   <View 
557:                     key={item.id} 
558:                     className="flex-row items-center p-3.5 bg-white/60 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 rounded-2xl mb-2 shadow-sm opacity-80"
559:                   >
560:                     <TouchableOpacity onPress={() => handleToggleItem(item)} className="mr-3">
561:                       <View className="w-6 h-6 rounded-full bg-emerald-500 items-center justify-center shadow-sm">
562:                         <Check size={12} color="white" strokeWidth={3} />
563:                       </View>
564:                     </TouchableOpacity>
565: 
566:                     <View className="p-1.5 rounded-xl mr-3 opacity-50" style={{ backgroundColor: cat.lightBg }}>
567:                       <CatIcon size={15} color={cat.color} />
568:                     </View>
569: 
570:                     <View className="flex-1">
571:                       <Text className="font-bold text-[14px] line-through text-slate-400 dark:text-slate-500">
572:                         {item.name}
573:                       </Text>
574:                       {item.quantity ? (
575:                         <Text className="text-[10px] font-medium text-slate-400 line-through">Miktar: {item.quantity}</Text>
576:                       ) : null}
577:                     </View>
578: 
579:                     <TouchableOpacity onPress={() => handleDeleteItem(item)} className="p-2">
580:                       <X size={14} color="#94a3b8" />
581:                     </TouchableOpacity>
582:                   </View>
583:                 );
584:               })
585:             )
586:           )}
587:         </ScrollView>
588: 
589:         {/* Floating Action Button */}
590:         <TouchableOpacity 
591:           onPress={() => {
592:             setNewItemName('');
593:             setIsAddItemOpen(true);
594:           }}
595:           className="absolute bottom-24 right-5 w-14 h-14 rounded-full shadow-lg justify-center items-center z-30"
596:         >
597:           <LinearGradient
598:             colors={theme.gradient as [string, string, ...string[]]}
599:             style={styles.fabGradient}
600:           >
601:             <Plus size={24} color="white" />
602:           </LinearGradient>
603:         </TouchableOpacity>
604: 
605:         {/* Add Item Dialog Modal */}
606:         <Modal
607:           animationType="slide"
608:           transparent={true}
609:           visible={isAddItemOpen}
610:           onRequestClose={() => setIsAddItemOpen(false)}
611:         >
612:           <View className="flex-1 justify-end bg-black/55">
613:             <View className="bg-white dark:bg-slate-900 rounded-t-[2.5rem] p-6 shadow-2xl border-t border-slate-200 dark:border-slate-850 max-h-[90%]">
614:               
615:               {/* Header */}
616:               <View className="flex-row justify-between items-center mb-4 pb-2 border-b border-slate-100 dark:border-slate-800">
617:                 <View>
618:                   <Text className="text-lg font-black text-slate-800 dark:text-white">🛒 Ürün Ekle</Text>
619:                   <Text className="text-[10px] text-slate-500 font-bold">Virgül (,) ile çoklu ekleyebilir, miktar belirtebilirsiniz.</Text>
620:                 </View>
621:                 <TouchableOpacity onPress={() => setIsAddItemOpen(false)} className="p-1">
622:                   <X size={20} color="#64748b" />
623:                 </TouchableOpacity>
624:               </View>
625: 
626:               {/* Input Area */}
627:               <View className="flex-row items-center bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-2 rounded-2xl mb-3">
628:                 <TextInput 
629:                   className="flex-1 text-slate-900 dark:text-white text-sm font-semibold h-11 px-2"
630:                   placeholder="Örn: 2 kg domates, 1 lt süt, ekmek"
631:                   placeholderTextColor="#94a3b8"
632:                   value={newItemName}
633:                   onChangeText={setNewItemName}
634:                   autoFocus={true}
635:                 />
636:                 
637:                 {isAiProcessing ? (
638:                   <ActivityIndicator size="small" color={theme.solidBg} className="mx-2" />
639:                 ) : (
640:                   <TouchableOpacity onPress={toggleVoice} className="p-2">
641:                     <Mic size={18} color={isListening ? "#ef4444" : "#64748b"} />
642:                   </TouchableOpacity>
643:                 )}
644: 
645:                 <TouchableOpacity 
646:                   onPress={() => handleAddItem()} 
647:                   className="w-10 h-10 rounded-xl items-center justify-center shadow-sm"
648:                   style={{ backgroundColor: theme.solidBg }}
649:                   disabled={!newItemName.trim() || isAiProcessing}
650:                 >
651:                   <Plus size={20} color="white" />
652:                 </TouchableOpacity>
653:               </View>
654: 
655:               {/* Autocomplete Suggestions */}
656:               {suggestions.length > 0 && (
657:                 <View className="border border-slate-100 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-900 shadow-lg mb-4 overflow-hidden">
658:                   {suggestions.map((s, i) => (
659:                     <TouchableOpacity 
660:                       key={i} 
661:                       onPress={() => {
662:                         handleAddItem(s);
663:                       }}
664:                       className="w-full px-4 py-3 flex-row items-center border-b border-slate-55 dark:border-slate-800 last:border-0"
665:                     >
666:                       <Search size={14} color="#94a3b8" className="mr-2" />
667:                       <Text className="text-sm font-semibold text-slate-700 dark:text-slate-350">{s}</Text>
668:                       <ChevronRight size={14} color="#cbd5e1" className="ml-auto" />
669:                     </TouchableOpacity>
670:                   ))}
671:                 </View>
672:               )}
673: 
674:               {/* Category Selector (For single items manual selection) */}
675:               {!newItemName.includes(',') && (
676:                 <View className="mb-4">
677:                   <TouchableOpacity 
678:                     onPress={() => setIsCategorySelectorOpen(!isCategorySelectorOpen)}
679:                     className="flex-row items-center bg-slate-50 dark:bg-slate-800 p-3 rounded-2xl border border-slate-100 dark:border-slate-700"
680:                   >
681:                     <View 
682:                       className="w-6 h-6 rounded-lg items-center justify-center mr-2" 
683:                       style={{ backgroundColor: CATEGORY_CONFIG[selectedCategory].bgColor }}
684:                     >
685:                       {(() => {
686:                         const CatIcon = CATEGORY_CONFIG[selectedCategory].icon;
687:                         return <CatIcon size={14} color={CATEGORY_CONFIG[selectedCategory].color} />;
688:                       })()}
689:                     </View>
690:                     <Text className="text-slate-700 dark:text-slate-200 font-bold text-xs flex-1">{selectedCategory}</Text>
691:                     <Text className="text-slate-400 font-bold text-xs">{isCategorySelectorOpen ? 'Kapat ▲' : 'Değiştir ▼'}</Text>
692:                   </TouchableOpacity>
693: 
694:                   {isCategorySelectorOpen && (
695:                     <ScrollView style={{ maxHeight: 150 }} className="mt-2 bg-slate-50 dark:bg-slate-850 p-2 rounded-2xl">
696:                       <View className="flex-row flex-wrap justify-between">
697:                         {CATEGORIES.map(cat => {
698:                           const config = CATEGORY_CONFIG[cat];
699:                           const CatIcon = config.icon;
700:                           const isSelected = selectedCategory === cat;
701:                           return (
702:                             <TouchableOpacity 
703:                               key={cat} 
704:                               onPress={() => { setSelectedCategory(cat); setIsCategorySelectorOpen(false); }}
705:                               className="items-center p-2 rounded-xl mb-1"
706:                               style={{ width: '31%', backgroundColor: isSelected ? '#3498db20' : 'transparent' }}
707:                             >
708:                               <View className="w-7 h-7 rounded-full items-center justify-center mb-0.5" style={{ backgroundColor: config.bgColor }}>
709:                                 <CatIcon size={14} color={config.color} />
710:                               </View>
711:                               <Text className="text-[7.5px] font-bold text-slate-600 dark:text-slate-350 text-center" numberOfLines={1}>{cat}</Text>
712:                             </TouchableOpacity>
713:                           );
714:                         })}
715:                       </View>
716:                     </ScrollView>
717:                   )}
718:                 </View>
719:               )}
720: 
721:             </View>
722:           </View>
723:         </Modal>
724: 
725:       </View>
726:     );
727:   }
728: 
729:   // ─── LISTS MAIN VIEW ───
730:   const totalPending = lists.reduce((s, l) => s + (l.items || []).length, 0);
731:   const totalBought  = lists.reduce((s, l) => s + (l.boughtItems || []).length, 0);
732: 
733:   return (
734:     <LinearGradient
735:       colors={['#e0e7ff', '#f5f3ff', '#fae8ff']}
736:       style={{ flex: 1 }}
737:     >
738:       <SafeAreaView className="flex-1">
739:         <Stack.Screen options={{ headerShown: false }} />
740:         
741:         {/* Header */}
742:         <View className="px-5 pt-3 pb-3 flex-row justify-between items-center bg-white/70 dark:bg-slate-900/60 border-b border-slate-200/40 dark:border-slate-800/40">
743:           <TouchableOpacity onPress={() => router.back()} className="w-10 h-10 items-center justify-center bg-white dark:bg-slate-800 rounded-full shadow-sm">
744:              <ChevronLeft size={22} color="#4f46e5" />
745:           </TouchableOpacity>
746:           <View className="items-center">
747:              <Text className="text-lg font-black text-slate-800 dark:text-white">Alışveriş Listeleri</Text>
748:              <Text className="text-[9px] text-slate-450 font-bold uppercase tracking-widest">İhtiyaçlarını Organize Et</Text>
749:           </View>
750:           <TouchableOpacity 
751:             onPress={() => {
752:               setEditingList(null);
753:               setNewListName('');
754:               setNewListIcon('ShoppingCart');
755:               setNewListColor('indigo');
756:               setIsCreateModalOpen(true);
757:             }}
758:             className="w-10 h-10 rounded-full items-center justify-center shadow-md bg-indigo-600"
759:           >
760:             <Plus size={22} color="white" />
761:           </TouchableOpacity>
762:         </View>
763: 
764:         <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
765:            
766:            {/* Stats Panel */}
767:            {lists.length > 0 && (
768:              <View className="flex-row justify-between mb-6 gap-3">
769:                {[
770:                  { label: 'Liste', val: lists.length, gradient: ['#6366f1', '#4f46e5'], emoji: '📋' },
771:                  { label: 'Alınacak', val: totalPending, gradient: ['#f59e0b', '#d97706'], emoji: '🛒' },
772:                  { label: 'Alındı', val: totalBought, gradient: ['#10b981', '#059669'], emoji: '✅' },
773:                ].map(s => (
774:                  <View key={s.label} className="flex-1 rounded-[1.2rem] shadow-md overflow-hidden">
775:                    <LinearGradient
776:                      colors={s.gradient as [string, string, ...string[]]}
777:                      style={{ padding: 12, alignItems: 'center' }}
778:                    >
779:                      <Text className="text-xl mb-0.5">{s.emoji}</Text>
780:                      <Text className="text-lg font-black text-white">{s.val}</Text>
781:                      <Text className="text-[8px] font-bold text-white/90 uppercase tracking-widest">{s.label}</Text>
782:                    </LinearGradient>
783:                  </View>
784:                ))}
785:              </View>
786:            )}
787: 
788:            {lists.length === 0 ? (
789:              <View className="items-center justify-center mt-20 bg-white/70 dark:bg-slate-900/60 p-8 rounded-[2.5rem] shadow-sm border border-slate-200/50">
790:                <View className="w-16 h-16 bg-emerald-50 dark:bg-emerald-950/40 rounded-full items-center justify-center mb-4 border border-emerald-100 dark:border-emerald-900">
791:                   <ShoppingCart size={32} color="#10b981" />
792:                </View>
793:                <Text className="text-slate-700 dark:text-slate-200 text-base font-black">Henüz bir alışveriş listeniz yok.</Text>
794:                <Text className="text-slate-400 text-center text-xs mt-1 mb-5">Hemen ilk alışveriş listenizi oluşturun ve ihtiyaçlarınızı planlayın.</Text>
795:                <TouchableOpacity 
796:                  onPress={() => setIsCreateModalOpen(true)}
797:                  className="bg-indigo-600 px-6 py-3 rounded-full shadow-md"
798:                >
799:                   <Text className="text-white font-bold text-sm">Liste Oluştur</Text>
800:                </TouchableOpacity>
The above content does NOT show the entire file contents. If you need to view any lines of the file which were not shown to complete your task, call this tool again to view those lines.
