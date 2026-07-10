import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Modal,
  Alert,
  Platform,
  Linking,
  Image,
  RefreshControl
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useEffect, useState, useMemo } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { useRouter, Stack } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { format, addDays, startOfWeek, addWeeks, subWeeks, isSameDay } from 'date-fns';
import { tr } from 'date-fns/locale';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  X,
  ChefHat,
  Search,
  Star,
  Trash2,
  Edit3,
  BookOpen,
  BarChart3,
  CalendarDays,
  Soup,
  Flame,
  Check,
  UtensilsCrossed,
  Link as LinkIcon,
  ExternalLink,
  Maximize2,
  ImagePlus,
} from 'lucide-react-native';
import {
  onMealPlanUpdate,
  onRecipesUpdate,
  onCalorieLogsUpdate,
  addRecipe,
  updateRecipe,
  deleteRecipe,
  updateMealPlan,
} from '../lib/dataService';
import { MealPlan, Recipe, CalorieLog } from '../lib/data';
import { useColorScheme } from 'nativewind';

const MEAL_TYPES = ['Kahvaltı', 'Akşam Yemeği'];

const mealAccent = (meal: string) => {
  if (meal === 'Kahvaltı') return { color: '#f97316', light: '#fff7ed', border: '#fed7aa' };
  return { color: '#6366f1', light: '#eef2ff', border: '#c7d2fe' };
};

export default function MealPlanScreen() {
  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = () => { setRefreshing(true); setTimeout(() => setRefreshing(false), 1200); };
  const router = useRouter();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [mealPlan, setMealPlan] = useState<MealPlan>({});
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [calorieLogs, setCalorieLogs] = useState<CalorieLog[]>([]);
  const [loading, setLoading] = useState(true);

  const [activeTab, setActiveTab] = useState<'plan' | 'recipes' | 'stats'>('plan');
  const [currentWeekBase, setCurrentWeekBase] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState(new Date());

  // Recipe Selector Modal
  const [selectorOpen, setSelectorOpen] = useState(false);
  const [selectorMealType, setSelectorMealType] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Recipe Form Modal
  const [formOpen, setFormOpen] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState<Recipe | null>(null);
  const [recipeTitle, setRecipeTitle] = useState('');
  const [recipeCategory, setRecipeCategory] = useState('Akşam Yemeği');
  const [recipeRating, setRecipeRating] = useState(4);
  const [recipeInstructions, setRecipeInstructions] = useState('');
  const [recipeSourceUrl, setRecipeSourceUrl] = useState('');
  const [recipeImageUrls, setRecipeImageUrls] = useState<string[]>([]);
  const [instructionsModalOpen, setInstructionsModalOpen] = useState(false);
  const [instructionsTab, setInstructionsTab] = useState<'notes' | 'images'>('notes');

  useEffect(() => {
    const unsub1 = onMealPlanUpdate((data) => { setMealPlan(data); setLoading(false); });
    const unsub2 = onRecipesUpdate(setRecipes);
    const unsub3 = onCalorieLogsUpdate(setCalorieLogs);
    return () => { unsub1(); unsub2(); unsub3(); };
  }, []);

  const weekStart = startOfWeek(currentWeekBase, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }).map((_, i) => addDays(weekStart, i));
  const dayKey = format(selectedDay, 'yyyy-MM-dd');
  const todaysMeals = mealPlan[dayKey] || {};

  const filteredRecipes = useMemo(() =>
    recipes.filter(r => r.title.toLowerCase().includes(searchQuery.toLowerCase())),
    [recipes, searchQuery]
  );

  const handleAssignRecipe = (recipe: Recipe) => {
    if (!selectorMealType) return;
    updateMealPlan(dayKey, { ...todaysMeals, [selectorMealType]: recipe });
    setSelectorOpen(false);
    setSelectorMealType(null);
    setSearchQuery('');
  };

  const handleRemoveMeal = (mealType: string) => {
    updateMealPlan(dayKey, { ...todaysMeals, [mealType]: null });
  };

  const openAddRecipe = () => {
    setEditingRecipe(null);
    setRecipeTitle('');
    setRecipeCategory('Akşam Yemeği');
    setRecipeRating(4);
    setRecipeInstructions('');
    setRecipeSourceUrl('');
    setRecipeImageUrls([]);
    setFormOpen(true);
  };

  const openEditRecipe = (recipe: Recipe) => {
    setEditingRecipe(recipe);
    setRecipeTitle(recipe.title);
    setRecipeCategory(recipe.category);
    setRecipeRating(recipe.rating || 4);
    setRecipeInstructions(recipe.instructions || '');
    setRecipeSourceUrl(recipe.sourceUrl || '');
    setRecipeImageUrls(recipe.imageUrls || []);
    setFormOpen(true);
  };

  const pickRecipeImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.5,
        base64: true,
      });
      if (!result.canceled && result.assets && result.assets[0].base64) {
        const base64Url = `data:image/jpeg;base64,${result.assets[0].base64}`;
        setRecipeImageUrls(prev => [...prev, base64Url]);
      }
    } catch (e) {
      console.log('Image picker error:', e);
    }
  };

  const handleSaveRecipe = async () => {
    if (!recipeTitle.trim()) return Alert.alert('Hata', 'Tarif adı gerekli');
    try {
      const data = { title: recipeTitle.trim(), category: recipeCategory, rating: recipeRating, instructions: recipeInstructions, sourceUrl: recipeSourceUrl.trim(), imageUrls: recipeImageUrls };
      if (editingRecipe) await updateRecipe(editingRecipe.id, data);
      else await addRecipe(data);
      setFormOpen(false);
    } catch (e) { Alert.alert('Hata', 'Kaydedilemedi'); }
  };

  const handleDeleteRecipe = (id: string) => {
    if (Platform.OS === 'web') {
      if (window.confirm('Bu tarifi silmek istiyor musunuz?')) deleteRecipe(id);
    } else {
      Alert.alert('Tarifi Sil', 'Emin misiniz?', [
        { text: 'İptal', style: 'cancel' },
        { text: 'Sil', style: 'destructive', onPress: () => deleteRecipe(id) },
      ]);
    }
  };

  const topRecipes = useMemo(() => {
    const counts: Record<string, number> = {};
    Object.values(mealPlan).forEach(meals => {
      if (!meals) return;
      MEAL_TYPES.forEach(mt => {
        const r = meals[mt];
        if (r?.id) counts[r.id] = (counts[r.id] || 0) + 1;
      });
    });
    return recipes
      .filter(r => counts[r.id])
      .sort((a, b) => (counts[b.id] || 0) - (counts[a.id] || 0))
      .slice(0, 10)
      .map(r => ({ recipe: r, count: counts[r.id] }));
  }, [mealPlan, recipes]);

  if (loading) {
    return (
      <SafeAreaView className="flex-1 justify-center items-center bg-orange-50 dark:bg-slate-950">
        <ActivityIndicator size="large" color="#f97316" />
        <Text className="text-slate-500 font-semibold mt-3">Yükleniyor...</Text>
      </SafeAreaView>
    );
  }

  // ── PLAN TAB ──────────────────────────────────────────────────────
  const renderPlan = () => (
    <ScrollView className="flex-1" contentContainerStyle={{ padding: 16, paddingBottom: 40 }} showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={isDark ? '#fff' : '#000'} />}>
      {/* Week Navigator */}
      <View className="bg-white dark:bg-slate-900 rounded-3xl p-4 mb-6 shadow-sm border border-slate-100 dark:border-slate-800 flex-row items-center justify-between">
        <View className="flex-row items-center gap-3">
          <Text className="text-lg font-black text-slate-800 dark:text-slate-100">
            {format(weekStart, 'MMMM yyyy', { locale: tr })}
          </Text>
          {!isSameDay(weekStart, startOfWeek(new Date(), { weekStartsOn: 1 })) && (
            <TouchableOpacity 
              onPress={() => setCurrentWeekBase(new Date())} 
              className="bg-orange-100 dark:bg-orange-900/40 px-3 py-1.5 rounded-full border border-orange-200 dark:border-orange-900/50"
            >
              <Text className="text-[11px] font-bold text-orange-600 dark:text-orange-400">Bugüne Dön</Text>
            </TouchableOpacity>
          )}
        </View>
        <View className="flex-row gap-2">
          <TouchableOpacity
            onPress={() => setCurrentWeekBase(subWeeks(currentWeekBase, 1))}
            className="w-10 h-10 bg-slate-100 dark:bg-slate-800 rounded-full items-center justify-center"
          >
            <ChevronLeft size={20} color="#64748b" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setCurrentWeekBase(addWeeks(currentWeekBase, 1))}
            className="w-10 h-10 bg-slate-100 dark:bg-slate-800 rounded-full items-center justify-center"
          >
            <ChevronRight size={20} color="#64748b" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Vertical Days List */}
      <View className="gap-6">
        {weekDays.map(day => {
          const dKey = format(day, 'yyyy-MM-dd');
          const dayMeals = mealPlan[dKey] || {};
          const isToday = isSameDay(day, new Date());

          return (
            <View key={dKey} className={isToday ? "bg-orange-50/60 dark:bg-orange-950/20 -mx-3 px-3 py-5 rounded-3xl border-2 border-orange-200 dark:border-orange-900/50 shadow-sm" : ""}>
              {/* Day Label */}
              <View className="flex-row items-center gap-2 mb-3 px-2">
                <Text className={`text-sm font-black uppercase tracking-widest ${isToday ? 'text-orange-600 dark:text-orange-400' : 'text-slate-400 dark:text-slate-500'}`}>
                  {format(day, 'd MMMM, EEEE', { locale: tr })}
                </Text>
                {isToday && (
                  <View className="bg-orange-500 px-2 py-0.5 rounded-md">
                    <Text className="text-[10px] font-bold text-white uppercase tracking-wider">Bugün</Text>
                  </View>
                )}
              </View>

              {/* Meal Cards */}
              <View className="gap-3">
                {MEAL_TYPES.map(mealType => {
                  const mealData = dayMeals[mealType] as Recipe | null;
                  const accent = mealAccent(mealType);

                  if (mealData) {
                    return (
                      <View
                        key={mealType}
                        className="bg-white dark:bg-slate-900 rounded-3xl overflow-hidden shadow-sm border border-slate-100 dark:border-slate-800"
                      >
                        {/* color strip */}
                        <View style={{ height: 4, backgroundColor: accent.color }} />
                        <View className="p-5">
                          <View className="flex-row items-start justify-between">
                            <View className="flex-1">
                              <Text className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: accent.color }}>
                                {mealType}
                              </Text>
                              <Text className="text-lg font-black text-slate-900 dark:text-white">{mealData.title}</Text>
                              <View className="flex-row items-center gap-1.5 mt-2">
                                <View className="px-2 py-0.5 rounded-full" style={{ backgroundColor: accent.light }}>
                                  <Text className="text-[10px] font-bold" style={{ color: accent.color }}>{mealData.category}</Text>
                                </View>
                                {(mealData.rating || 0) > 0 && (
                                  <View className="flex-row items-center gap-0.5 bg-amber-50 px-2 py-0.5 rounded-full">
                                    <Star size={10} color="#f59e0b" fill="#f59e0b" />
                                    <Text className="text-[10px] font-bold text-amber-600">{mealData.rating}</Text>
                                  </View>
                                )}
                              </View>
                            </View>
                            <TouchableOpacity
                              onPress={() => {
                                setSelectedDay(day);
                                Alert.alert('Sil', `${mealType} öğününü kaldırmak istediğinize emin misiniz?`, [
                                  { text: 'Vazgeç', style: 'cancel' },
                                  { text: 'Kaldır', style: 'destructive', onPress: () => updateMealPlan(dKey, { ...dayMeals, [mealType]: null }) }
                                ]);
                              }}
                              className="w-8 h-8 bg-slate-100 dark:bg-slate-800 rounded-full items-center justify-center ml-3"
                            >
                              <X size={14} color="#94a3b8" />
                            </TouchableOpacity>
                          </View>
                        </View>
                      </View>
                    );
                  }

                  return (
                    <TouchableOpacity
                      key={mealType}
                      onPress={() => { setSelectedDay(day); setSelectorMealType(mealType); setSelectorOpen(true); }}
                      className="rounded-3xl p-5 border-2 border-dashed border-slate-200 dark:border-slate-700 flex-row items-center justify-between"
                      style={{ borderColor: accent.border }}
                    >
                      <View>
                        <Text className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: accent.color }}>
                          {mealType}
                        </Text>
                        <Text className="text-slate-400 dark:text-slate-500 font-medium text-sm">Menü seçilmedi</Text>
                      </View>
                      <View className="w-10 h-10 rounded-full items-center justify-center" style={{ backgroundColor: accent.light }}>
                        <Plus size={18} color={accent.color} />
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          );
        })}
      </View>
    </ScrollView>
  );

  // ── RECIPES TAB ────────────────────────────────────────────────────
  const renderRecipes = () => (
    <View className="flex-1">
      <View className="px-4 pt-4 pb-3 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800">
        <View className="flex-row items-center gap-3 bg-slate-100 dark:bg-slate-800 rounded-2xl px-4 py-3">
          <Search size={15} color="#94a3b8" />
          <TextInput
            placeholder="Tariflerde ara..."
            placeholderTextColor="#94a3b8"
            value={searchQuery}
            onChangeText={setSearchQuery}
            className="flex-1 text-sm font-medium text-slate-800 dark:text-white p-0"
          />
          {searchQuery !== '' && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <X size={14} color="#94a3b8" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        {filteredRecipes.length === 0 ? (
          <View className="items-center py-16">
            <View className="w-20 h-20 bg-orange-50 dark:bg-orange-950/30 rounded-full items-center justify-center mb-4">
              <Soup size={36} color="#f97316" />
            </View>
            <Text className="text-slate-700 dark:text-slate-300 font-bold text-base">Tarif bulunamadı</Text>
            <Text className="text-slate-400 text-xs mt-1">Yeni bir tarif ekleyin</Text>
          </View>
        ) : (
          <View className="gap-2">
            {filteredRecipes.map(recipe => (
              <View
                key={recipe.id}
                className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-100 dark:border-slate-800 flex-row items-center gap-3 shadow-sm"
              >
                <View className="w-10 h-10 bg-orange-50 dark:bg-orange-950/30 rounded-xl items-center justify-center flex-shrink-0">
                  <ChefHat size={18} color="#f97316" />
                </View>
                <View className="flex-1 min-w-0">
                  <Text className="font-bold text-slate-900 dark:text-white text-sm" numberOfLines={1}>{recipe.title}</Text>
                  <View className="flex-row items-center gap-2 mt-0.5">
                    <Text className="text-slate-400 text-[11px]">{recipe.category}</Text>
                    {(recipe.rating || 0) > 0 && (
                      <View className="flex-row items-center gap-0.5">
                        <Star size={9} color="#f59e0b" fill="#f59e0b" />
                        <Text className="text-amber-500 text-[10px] font-bold">{recipe.rating}</Text>
                      </View>
                    )}
                  </View>
                </View>
                <View className="flex-row gap-1">
                  <TouchableOpacity
                    onPress={() => openEditRecipe(recipe)}
                    className="w-8 h-8 bg-slate-100 dark:bg-slate-800 rounded-xl items-center justify-center"
                  >
                    <Edit3 size={13} color="#64748b" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handleDeleteRecipe(recipe.id)}
                    className="w-8 h-8 bg-rose-50 dark:bg-rose-950/30 rounded-xl items-center justify-center"
                  >
                    <Trash2 size={13} color="#f43f5e" />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );

  // ── STATS TAB ─────────────────────────────────────────────────────
  const renderStats = () => {
    const totalPlanned = Object.values(mealPlan).reduce((acc, meals) => {
      if (!meals) return acc;
      return acc + MEAL_TYPES.filter(mt => meals[mt]).length;
    }, 0);

    const todayLog = calorieLogs.find(log => log.id === dayKey);
    const netCalories = todayLog ? ((todayLog.caloriesTaken || 0) - (todayLog.caloriesBurned || 0)) : 0;
    const protein = todayLog?.protein || 0;
    const carbs = todayLog?.carbs || 0;
    const fat = todayLog?.fat || 0;

    return (
      <ScrollView className="flex-1" contentContainerStyle={{ padding: 16, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        {/* Summary Cards */}
        <View className="flex-row gap-3 mb-4">
          <View className="flex-1 bg-orange-50 dark:bg-orange-950/30 rounded-2xl p-4 border border-orange-100 dark:border-orange-900/30">
            <CalendarDays size={20} color="#f97316" />
            <Text className="text-2xl font-black text-orange-600 dark:text-orange-400 mt-2">{totalPlanned}</Text>
            <Text className="text-[10px] font-bold text-orange-500 uppercase tracking-wide mt-0.5">Planlanan Öğün</Text>
          </View>
          <View className="flex-1 bg-indigo-50 dark:bg-indigo-950/30 rounded-2xl p-4 border border-indigo-100 dark:border-indigo-900/30">
            <BookOpen size={20} color="#6366f1" />
            <Text className="text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-2">{recipes.length}</Text>
            <Text className="text-[10px] font-bold text-indigo-500 uppercase tracking-wide mt-0.5">Kayıtlı Tarif</Text>
          </View>
        </View>

        {/* Top Recipes */}
        <View className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-100 dark:border-slate-800 shadow-sm">
          <Text className="text-base font-black text-slate-900 dark:text-white mb-1">En Çok Tercih Edilenler</Text>
          <Text className="text-xs text-slate-400 mb-4">Plana en sık eklenen yemekler</Text>

          {topRecipes.length === 0 ? (
            <View className="items-center py-8">
              <UtensilsCrossed size={32} color="#cbd5e1" />
              <Text className="text-slate-400 text-sm font-medium mt-2">Henüz yeterli veri yok</Text>
            </View>
          ) : (
            <View className="gap-3">
              {topRecipes.map(({ recipe, count }, i) => (
                <View key={recipe.id} className="flex-row items-center gap-3">
                  <View className={`w-8 h-8 rounded-full items-center justify-center ${
                    i === 0 ? 'bg-amber-100 dark:bg-amber-950/50' :
                    i === 1 ? 'bg-slate-100 dark:bg-slate-800' :
                    i === 2 ? 'bg-orange-50 dark:bg-orange-950/30' : 'bg-slate-50 dark:bg-slate-800'
                  }`}>
                    <Text className={`text-xs font-black ${
                      i === 0 ? 'text-amber-600' : i === 1 ? 'text-slate-500' : i === 2 ? 'text-orange-500' : 'text-slate-400'
                    }`}>{i + 1}</Text>
                  </View>
                  <View className="flex-1">
                    <Text className="font-bold text-sm text-slate-900 dark:text-white">{recipe.title}</Text>
                    <Text className="text-xs text-slate-400">{recipe.category}</Text>
                  </View>
                  <View className="bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full">
                    <Text className="text-xs font-bold text-slate-600 dark:text-slate-300">{count}×</Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    );
  };

  const tabs: { key: 'plan' | 'recipes' | 'stats'; label: string; icon: any }[] = [
    { key: 'plan', label: 'Plan', icon: CalendarDays },
    { key: 'recipes', label: 'Tarifler', icon: ChefHat },
    { key: 'stats', label: 'İstatistik', icon: BarChart3 },
  ];

  return (
    <View className="flex-1 bg-slate-50 dark:bg-slate-950">
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <LinearGradient
        colors={['#ea580c', '#f97316'] as [string, string]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ paddingBottom: 16, paddingTop: 12, paddingHorizontal: 16, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 }}
      >
        <SafeAreaView edges={['top']} className="m-0 p-0" />
        <View className="flex-row items-center justify-between">
          <TouchableOpacity
            onPress={() => router.back()}
            className="w-8 h-8 bg-white/20 rounded-full items-center justify-center"
          >
            <Text className="text-white font-extrabold text-lg">←</Text>
          </TouchableOpacity>

          <View className="items-center">
            <Text className="text-white font-extrabold text-lg">Yemek Planı</Text>
            <Text className="text-white/80 text-[10px] font-medium mt-0.5">
              {format(new Date(), 'd MMMM yyyy', { locale: tr })}
            </Text>
          </View>

          <View className="flex-row items-center gap-2">
            <TouchableOpacity
              onPress={() => router.push('/calories')}
              className="w-8 h-8 bg-[#c2410c]/40 rounded-lg items-center justify-center"
            >
              <Flame size={16} color="white" />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={openAddRecipe}
              className="w-8 h-8 bg-[#c2410c]/40 rounded-lg items-center justify-center"
            >
              <Plus size={18} color="white" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Tab Bar inside header */}
        <View className="flex-row mt-4 bg-white/20 rounded-2xl p-1 gap-1">
          {tabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                onPress={() => setActiveTab(tab.key)}
                className={`flex-1 flex-row items-center justify-center gap-1.5 py-2 rounded-xl ${
                  isActive ? 'bg-white' : ''
                }`}
              >
                <Icon size={13} color={isActive ? '#ea580c' : 'rgba(255,255,255,0.8)'} />
                <Text className={`text-xs font-bold ${isActive ? 'text-orange-600' : 'text-white/80'}`}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </LinearGradient>

      {/* Tab Content */}
      <View className="flex-1">
        {activeTab === 'plan' && renderPlan()}
        {activeTab === 'recipes' && renderRecipes()}
        {activeTab === 'stats' && renderStats()}
      </View>

      {/* ── Recipe Selector Modal ── */}
      <Modal visible={selectorOpen} animationType="slide" transparent>
        <View className="flex-1 justify-end" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <View className="bg-white dark:bg-slate-900 rounded-t-3xl overflow-hidden" style={{ maxHeight: '70%' }}>
            <View className="px-5 pt-5 pb-3 border-b border-slate-100 dark:border-slate-800">
              <View className="flex-row items-center justify-between mb-4">
                <Text className="text-lg font-black text-slate-900 dark:text-white">
                  {selectorMealType} Seç
                </Text>
                <TouchableOpacity
                  onPress={() => { setSelectorOpen(false); setSearchQuery(''); }}
                  className="w-8 h-8 bg-slate-100 dark:bg-slate-800 rounded-full items-center justify-center"
                >
                  <X size={16} color="#64748b" />
                </TouchableOpacity>
              </View>
              <View className="flex-row items-center gap-3 bg-slate-100 dark:bg-slate-800 rounded-2xl px-4 py-2.5">
                <Search size={14} color="#94a3b8" />
                <TextInput
                  placeholder="Tarif ara..."
                  placeholderTextColor="#94a3b8"
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  className="flex-1 text-sm font-medium text-slate-800 dark:text-white p-0"
                  autoFocus
                />
              </View>
            </View>
            <ScrollView contentContainerStyle={{ padding: 12 }}>
              {recipes.length === 0 && searchQuery === '' && (
                <View className="items-center py-10 px-5">
                  <ChefHat size={48} color="#e2e8f0" />
                  <Text className="text-slate-500 dark:text-slate-400 font-medium text-center mt-4">
                    Henüz hiç tarifiniz yok.
                  </Text>
                </View>
              )}

              {filteredRecipes.length === 0 && searchQuery !== '' && (
                <TouchableOpacity
                  onPress={() => {
                    addRecipe({ title: searchQuery, category: selectorMealType || 'Akşam Yemeği', rating: 4, instructions: '', sourceUrl: '' })
                      .then((newId) => {
                        handleAssignRecipe({ id: newId, familyId: '', title: searchQuery, category: selectorMealType || 'Akşam Yemeği', rating: 4, instructions: '', sourceUrl: '' });
                      });
                  }}
                  className="bg-indigo-600 rounded-2xl p-4 items-center flex-row justify-center gap-2 m-2 shadow-sm"
                >
                  <Plus size={16} color="white" />
                  <Text className="text-white font-bold">"{searchQuery}" ekle ve plana koy</Text>
                </TouchableOpacity>
              )}

              {(filteredRecipes.length > 0 || searchQuery === '') && (
                <View className="gap-2">
                  {/* Yeni Tarif Ekle Butonu Her Zaman En Üstte Veya Altta Olsun */}
                  <TouchableOpacity
                    onPress={() => {
                      setSelectorOpen(false);
                      setEditingRecipe(null);
                      setFormOpen(true);
                    }}
                    className="flex-row items-center gap-3 p-3 mb-2 rounded-2xl border-2 border-dashed border-[#f97316]/30 bg-orange-50/50 dark:bg-orange-950/20 active:opacity-70"
                  >
                    <View className="w-9 h-9 bg-[#f97316] rounded-xl items-center justify-center shadow-sm">
                      <Plus size={18} color="white" />
                    </View>
                    <View className="flex-1">
                      <Text className="font-bold text-sm text-[#f97316]">Yeni Tarif Oluştur</Text>
                      <Text className="text-orange-600/70 dark:text-orange-400/70 text-[11px]">Sıfırdan kendi tarifini yaz</Text>
                    </View>
                  </TouchableOpacity>

                  {filteredRecipes.map(recipe => (
                    <TouchableOpacity
                      key={recipe.id}
                      onPress={() => handleAssignRecipe(recipe)}
                      className="flex-row items-center gap-3 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700"
                    >
                      <View className="w-9 h-9 bg-orange-50 dark:bg-orange-950/30 rounded-xl items-center justify-center">
                        <ChefHat size={16} color="#f97316" />
                      </View>
                      <View className="flex-1">
                        <Text className="font-bold text-sm text-slate-900 dark:text-white">{recipe.title}</Text>
                        <Text className="text-slate-400 text-[11px]">{recipe.category}</Text>
                      </View>
                      {(recipe.rating || 0) > 0 && (
                        <View className="flex-row items-center gap-0.5">
                          <Star size={11} color="#f59e0b" fill="#f59e0b" />
                          <Text className="text-amber-500 text-xs font-bold">{recipe.rating}</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ── Recipe Form Modal ── */}
      <Modal visible={formOpen} animationType="slide" transparent>
        <View className="flex-1 justify-end" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <View className="bg-white dark:bg-slate-900 rounded-t-3xl p-5">
            <View className="flex-row items-center justify-between mb-5">
              <Text className="text-xl font-black text-slate-900 dark:text-white">
                {editingRecipe ? 'Tarifi Düzenle' : 'Yeni Tarif'}
              </Text>
              <TouchableOpacity
                onPress={() => setFormOpen(false)}
                className="w-8 h-8 bg-slate-100 dark:bg-slate-800 rounded-full items-center justify-center"
              >
                <X size={16} color="#64748b" />
              </TouchableOpacity>
            </View>

            <View className="gap-3">
              {/* Title */}
              <View>
                <Text className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Tarif Adı</Text>
                <TextInput
                  value={recipeTitle}
                  onChangeText={setRecipeTitle}
                  placeholder="örn. Menemen"
                  placeholderTextColor="#94a3b8"
                  className="bg-slate-100 dark:bg-slate-800 rounded-2xl px-4 py-3 text-base font-medium text-slate-900 dark:text-white"
                />
              </View>

              {/* Category */}
              <View>
                <Text className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Kategori</Text>
                <View className="flex-row gap-2">
                  {['Kahvaltı', 'Akşam Yemeği', 'Atıştırmalık', 'Tatlı', 'Diğer'].map(cat => (
                    <TouchableOpacity
                      key={cat}
                      onPress={() => setRecipeCategory(cat)}
                      className={`px-3 py-2 rounded-xl border ${
                        recipeCategory === cat
                          ? 'bg-orange-500 border-orange-500'
                          : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      <Text className={`text-xs font-bold ${recipeCategory === cat ? 'text-white' : 'text-slate-600 dark:text-slate-400'}`}>
                        {cat}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Rating */}
              <View>
                <Text className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Puan</Text>
                <View className="flex-row gap-2">
                  {[1, 2, 3, 4, 5].map(n => (
                    <TouchableOpacity key={n} onPress={() => setRecipeRating(n)}>
                      <Star size={28} color="#f59e0b" fill={n <= recipeRating ? '#f59e0b' : 'transparent'} />
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Instructions */}
              <View>
                <View className="flex-row items-center justify-between mb-1.5">
                  <Text className="text-xs font-bold text-slate-500 uppercase tracking-wide">Tarif Notları (opsiyonel)</Text>
                  <TouchableOpacity onPress={() => setInstructionsModalOpen(true)} className="flex-row items-center gap-1 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-md">
                    <Maximize2 size={12} color="#64748b" />
                    <Text className="text-[10px] font-bold text-slate-500">Tam Ekran</Text>
                  </TouchableOpacity>
                </View>
                <TextInput
                  value={recipeInstructions}
                  onChangeText={setRecipeInstructions}
                  placeholder="Malzemeler, yapılış..."
                  placeholderTextColor="#94a3b8"
                  multiline
                  numberOfLines={3}
                  className="bg-slate-100 dark:bg-slate-800 rounded-2xl px-4 py-3 text-sm text-slate-900 dark:text-white"
                  style={{ textAlignVertical: 'top', minHeight: 80 }}
                />
              </View>

              {/* Link */}
              <View>
                <View className="flex-row items-center justify-between mb-1.5">
                  <Text className="text-xs font-bold text-slate-500 uppercase tracking-wide">Tarif Linki (opsiyonel)</Text>
                  {recipeSourceUrl.trim().length > 0 && (
                    <TouchableOpacity onPress={() => Linking.openURL(recipeSourceUrl)} className="flex-row items-center gap-1 bg-indigo-50 dark:bg-indigo-900/30 px-2 py-1 rounded-md">
                      <ExternalLink size={12} color="#6366f1" />
                      <Text className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400">Linki Aç</Text>
                    </TouchableOpacity>
                  )}
                </View>
                <View className="flex-row items-center bg-slate-100 dark:bg-slate-800 rounded-2xl px-4 h-12">
                  <LinkIcon size={16} color="#94a3b8" />
                  <TextInput
                    value={recipeSourceUrl}
                    onChangeText={setRecipeSourceUrl}
                    placeholder="https://..."
                    placeholderTextColor="#94a3b8"
                    keyboardType="url"
                    autoCapitalize="none"
                    className="flex-1 ml-2 text-sm font-medium text-slate-900 dark:text-white p-0"
                  />
                </View>
              </View>

              {/* Save Button */}
              <TouchableOpacity
                onPress={handleSaveRecipe}
                className="bg-orange-500 rounded-2xl py-4 flex-row items-center justify-center gap-2 mt-2"
              >
                <Check size={18} color="white" />
                <Text className="text-white font-black text-base">
                  {editingRecipe ? 'Güncelle' : 'Kaydet'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Full Screen Instructions & Images Modal */}
      <Modal visible={instructionsModalOpen} animationType="slide" transparent={false}>
        <SafeAreaView className="flex-1 bg-white dark:bg-slate-950">
          <View className="p-4 border-b border-slate-100 dark:border-slate-800 flex-row items-center justify-between">
            <Text className="text-lg font-black text-slate-900 dark:text-white">Tarif Notları & Görseller</Text>
            <TouchableOpacity onPress={() => setInstructionsModalOpen(false)} className="w-8 h-8 bg-orange-100 dark:bg-orange-900/30 rounded-full items-center justify-center">
              <Check size={16} color="#ea580c" />
            </TouchableOpacity>
          </View>

          {/* Tabs */}
          <View className="flex-row p-4 gap-3">
            <TouchableOpacity 
              onPress={() => setInstructionsTab('notes')}
              className={`flex-1 py-3 rounded-xl items-center border ${instructionsTab === 'notes' ? 'bg-orange-50 border-orange-200 dark:bg-orange-900/20 dark:border-orange-800' : 'bg-slate-50 border-slate-200 dark:bg-slate-900 dark:border-slate-800'}`}
            >
              <Text className={`font-bold ${instructionsTab === 'notes' ? 'text-orange-600 dark:text-orange-400' : 'text-slate-500'}`}>Notlar</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              onPress={() => setInstructionsTab('images')}
              className={`flex-1 py-3 rounded-xl items-center border ${instructionsTab === 'images' ? 'bg-orange-50 border-orange-200 dark:bg-orange-900/20 dark:border-orange-800' : 'bg-slate-50 border-slate-200 dark:bg-slate-900 dark:border-slate-800'}`}
            >
              <Text className={`font-bold ${instructionsTab === 'images' ? 'text-orange-600 dark:text-orange-400' : 'text-slate-500'}`}>Görseller ({recipeImageUrls.length})</Text>
            </TouchableOpacity>
          </View>

          {instructionsTab === 'notes' ? (
            <TextInput
              value={recipeInstructions}
              onChangeText={setRecipeInstructions}
              placeholder="Malzemeler, yapılış, ipuçları..."
              placeholderTextColor="#94a3b8"
              multiline
              className="flex-1 px-4 text-base font-medium text-slate-800 dark:text-slate-200"
              style={{ textAlignVertical: 'top', paddingTop: 10, paddingBottom: 20 }}
            />
          ) : (
            <ScrollView className="flex-1 px-4" showsVerticalScrollIndicator={false}>
              <View className="pb-8">
                <TouchableOpacity onPress={pickRecipeImage} className="flex-row items-center justify-center gap-2 bg-indigo-50 dark:bg-indigo-900/30 p-4 rounded-2xl mb-6 border border-indigo-100 dark:border-indigo-800/50">
                  <ImagePlus size={20} color="#6366f1" />
                  <Text className="font-bold text-indigo-600 dark:text-indigo-400">Yeni Görsel Ekle</Text>
                </TouchableOpacity>
                
                {recipeImageUrls.length === 0 ? (
                  <View className="items-center py-10">
                    <Text className="text-slate-400 font-medium">Henüz görsel eklenmemiş.</Text>
                  </View>
                ) : (
                  <View className="flex-row flex-wrap justify-between gap-y-4">
                    {recipeImageUrls.map((url, index) => (
                      <View key={index} className="relative w-[48%] aspect-square">
                        <Image source={{ uri: url }} className="w-full h-full rounded-2xl bg-slate-100 dark:bg-slate-800" />
                        <TouchableOpacity 
                          onPress={() => setRecipeImageUrls(prev => prev.filter((_, i) => i !== index))}
                          className="absolute -top-2 -right-2 w-8 h-8 bg-rose-500 rounded-full items-center justify-center border-2 border-white dark:border-slate-950 shadow-sm"
                        >
                          <X size={16} color="white" />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            </ScrollView>
          )}
        </SafeAreaView>
      </Modal>

    </View>
  );
}
