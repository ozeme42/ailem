import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Modal, TextInput, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useEffect, useState } from 'react';
import { onBudgetCategoriesUpdate, addBudgetCategory, updateBudgetCategory, deleteBudgetCategory } from '../lib/dataService';
import { BudgetCategory } from '../lib/data';
import { Tags, ChevronLeft, Plus, X, Trash2, ShoppingCart, Utensils, Bus, FileText, Gamepad2, HeartPulse, Shirt, GraduationCap, DollarSign, PlusCircle, CircleEllipsis, Wallet, Banknote, Landmark, CreditCard, Briefcase, List, Settings, Printer, Check, Pencil, ListTree } from 'lucide-react-native';

const AVAILABLE_ICONS = [
  { name: 'ShoppingCart', icon: ShoppingCart },
  { name: 'Utensils', icon: Utensils },
  { name: 'Bus', icon: Bus },
  { name: 'FileText', icon: FileText },
  { name: 'Gamepad2', icon: Gamepad2 },
  { name: 'HeartPulse', icon: HeartPulse },
  { name: 'Shirt', icon: Shirt },
  { name: 'GraduationCap', icon: GraduationCap },
  { name: 'DollarSign', icon: DollarSign },
  { name: 'PlusCircle', icon: PlusCircle },
  { name: 'CircleEllipsis', icon: CircleEllipsis },
  { name: 'Wallet', icon: Wallet },
  { name: 'Banknote', icon: Banknote },
  { name: 'Landmark', icon: Landmark },
  { name: 'CreditCard', icon: CreditCard },
  { name: 'Briefcase', icon: Briefcase },
  { name: 'List', icon: List },
  { name: 'Settings', icon: Settings },
  { name: 'Printer', icon: Printer },
  { name: 'Pencil', icon: Pencil },
  { name: 'ListTree', icon: ListTree }
];

const AVAILABLE_COLORS = [
  '#f97316', '#3b82f6', '#a855f7', '#ec4899', '#14b8a6', '#eab308', '#84cc16', '#06b6d4', '#6366f1', '#f43f5e', '#8b5cf6'
];
import { useRouter, Stack } from 'expo-router';

export default function BudgetCategoriesScreen() {
  const [categories, setCategories] = useState<BudgetCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    let unsubscribe: any;
    try {
      unsubscribe = onBudgetCategoriesUpdate((data: BudgetCategory[]) => {
        setCategories(data);
        setLoading(false);
      });
    } catch (e) {
      console.log('Error fetching budget categories:', e);
      setLoading(false);
    }

    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, []);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [catName, setCatName] = useState('');
  const [catType, setCatType] = useState<'income' | 'expense'>('expense');
  const [catIcon, setCatIcon] = useState('CircleEllipsis');
  const [catColor, setCatColor] = useState('#8b5cf6');

  const openAddModal = () => {
    setEditingId(null);
    setCatName('');
    setCatType('expense');
    setCatIcon('CircleEllipsis');
    setCatColor('#8b5cf6');
    setIsModalOpen(true);
  };

  const openEditModal = (cat: BudgetCategory) => {
    setEditingId(cat.id);
    setCatName(cat.name);
    setCatType(cat.type);
    setCatIcon(cat.icon || 'CircleEllipsis');
    setCatColor(cat.color || '#8b5cf6');
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!catName.trim()) {
      Alert.alert('Hata', 'Kategori adı boş olamaz.');
      return;
    }

    try {
      if (editingId) {
        await updateBudgetCategory(editingId, { name: catName.trim(), type: catType, icon: catIcon, color: catColor });
      } else {
        await addBudgetCategory({ name: catName.trim(), type: catType, icon: catIcon, color: catColor });
      }
      setIsModalOpen(false);
    } catch (e) {
      console.log('Error saving category:', e);
      Alert.alert('Hata', 'Kategori kaydedilirken bir sorun oluştu.');
    }
  };

  const handleDelete = () => {
    if (!editingId) return;
    Alert.alert(
      'Kategoriyi Sil',
      'Bu kategoriyi silmek istediğinize emin misiniz? (Geçmiş işlemlerinizde bu kategori adı görünmeye devam edebilir)',
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Sil',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteBudgetCategory(editingId);
              setIsModalOpen(false);
            } catch (e) {
              console.log('Error deleting category:', e);
              Alert.alert('Hata', 'Kategori silinirken bir sorun oluştu.');
            }
          }
        }
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 justify-center items-center bg-slate-50 dark:bg-slate-950">
        <ActivityIndicator size="large" color="#ec4899" />
      </SafeAreaView>
    );
  }

  const incomeCount = categories.filter(c => c.type === 'income').length;
  const expenseCount = categories.filter(c => c.type === 'expense').length;

  return (
    <SafeAreaView className="flex-1 bg-slate-50 dark:bg-slate-950">
      <Stack.Screen options={{ headerShown: false }} />
      <View className="p-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex-row justify-between items-center">
        <TouchableOpacity onPress={() => router.back()} className="w-10 h-10 items-center justify-center bg-slate-100 dark:bg-slate-800 rounded-full">
           <ChevronLeft size={24} color="#64748b" />
        </TouchableOpacity>
        <Text className="text-2xl font-bold text-slate-900 dark:text-white">Kategoriler</Text>
        <TouchableOpacity onPress={openAddModal} className="bg-pink-500 w-10 h-10 rounded-full items-center justify-center shadow-sm">
          <Plus size={24} color="white" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerClassName="p-4" showsVerticalScrollIndicator={false}>

         <View className="flex-row justify-between mb-6">
            <View className="w-[48%] bg-emerald-50 dark:bg-emerald-900/30 p-5 rounded-3xl border border-emerald-100 dark:border-emerald-800/50 items-center">
              <Text className="text-emerald-600 dark:text-emerald-400 font-medium mb-1">Gelir Tipi</Text>
              <Text className="text-3xl font-bold text-emerald-700 dark:text-emerald-300">{incomeCount}</Text>
            </View>
            <View className="w-[48%] bg-rose-50 dark:bg-rose-900/30 p-5 rounded-3xl border border-rose-100 dark:border-rose-800/50 items-center">
              <Text className="text-rose-600 dark:text-rose-400 font-medium mb-1">Gider Tipi</Text>
              <Text className="text-3xl font-bold text-rose-700 dark:text-rose-300">{expenseCount}</Text>
            </View>
         </View>

         {categories.length === 0 ? (
           <View className="items-center justify-center mt-10">
             <View className="w-20 h-20 bg-pink-50 dark:bg-pink-900/30 rounded-full items-center justify-center mb-4">
                <Tags size={40} color="#ec4899" />
             </View>
             <Text className="text-slate-500 text-lg font-medium text-center">Bütçe kategorisi bulunamadı.</Text>
           </View>
         ) : (
           categories.map(cat => (
             <TouchableOpacity
                key={cat.id}
                onPress={() => openEditModal(cat)}
                className="bg-white dark:bg-slate-900 rounded-3xl p-5 mb-4 shadow-sm border border-slate-100 dark:border-slate-800 flex-row items-center"
             >
                {(() => {
                  const isEmoji = cat.icon && !AVAILABLE_ICONS.find(i => i.name === cat.icon);
                  const IconComponent = AVAILABLE_ICONS.find(i => i.name === cat.icon)?.icon || Tags;
                  const bgColor = (cat.color || (cat.type === 'income' ? '#10b981' : '#ef4444')) + '20';
                  const color = cat.color || (cat.type === 'income' ? '#10b981' : '#ef4444');
                  return (
                    <View className="w-12 h-12 rounded-xl items-center justify-center mr-4" style={{ backgroundColor: bgColor }}>
                      {isEmoji ? (
                        <Text style={{ fontSize: 22 }}>{cat.icon}</Text>
                      ) : (
                        <IconComponent size={24} color={color} />
                      )}
                    </View>
                  );
                })()}
                <View className="flex-1">
                   <Text className="font-bold text-slate-800 dark:text-slate-100 text-lg">{cat.name}</Text>
                   <Text className={`text-sm font-medium ${cat.type === 'income' ? 'text-emerald-500' : 'text-rose-500'}`}>
                     {cat.type === 'income' ? 'Gelir' : 'Gider'} Kategorisi
                   </Text>
                </View>
             </TouchableOpacity>
           ))
         )}
         <View className="h-10"></View>
      </ScrollView>

      {/* Modal for Add / Edit */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={isModalOpen}
        onRequestClose={() => setIsModalOpen(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          className="flex-1 bg-black/50"
        >
          <ScrollView
            contentContainerStyle={{ flexGrow: 1, justifyContent: 'flex-end' }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <TouchableOpacity
              activeOpacity={1}
              onPress={() => setIsModalOpen(false)}
              style={{ flex: 1 }}
            />
            <View className="bg-white dark:bg-slate-900 rounded-t-[2.5rem] p-6 shadow-2xl">
            <View className="flex-row justify-between items-center mb-6 border-b border-slate-100 dark:border-slate-800 pb-4">
              <Text className="text-xl font-black text-slate-800 dark:text-white">
                {editingId ? 'Kategoriyi Düzenle' : 'Yeni Kategori'}
              </Text>
              <TouchableOpacity onPress={() => setIsModalOpen(false)} className="p-2 bg-slate-100 dark:bg-slate-800 rounded-full">
                <X size={20} color="#64748b" />
              </TouchableOpacity>
            </View>

            <View className="mb-4">
              <Text className="text-slate-500 font-bold text-xs uppercase tracking-wider mb-2 ml-1">Kategori Tipi</Text>
              <View className="flex-row gap-3">
                <TouchableOpacity
                  onPress={() => setCatType('expense')}
                  className={`flex-1 py-3.5 rounded-2xl border-2 items-center ${catType === 'expense' ? 'border-rose-500 bg-rose-50' : 'border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-850'}`}
                >
                  <Text className={`font-bold text-sm ${catType === 'expense' ? 'text-rose-600' : 'text-slate-500'}`}>Gider (-)</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setCatType('income')}
                  className={`flex-1 py-3.5 rounded-2xl border-2 items-center ${catType === 'income' ? 'border-emerald-500 bg-emerald-50' : 'border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-850'}`}
                >
                  <Text className={`font-bold text-sm ${catType === 'income' ? 'text-emerald-600' : 'text-slate-500'}`}>Gelir (+)</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View className="mb-8">
              <Text className="text-slate-500 font-bold text-xs uppercase tracking-wider mb-2 ml-1">Kategori Adı</Text>
              <TextInput
                value={catName}
                onChangeText={setCatName}
                placeholder="Örn: Market, Kira, Eğlence..."
                placeholderTextColor="#94a3b8"
                className="bg-slate-50 dark:bg-slate-800 px-5 py-4 rounded-2xl text-slate-800 dark:text-white font-bold text-base border border-slate-200 dark:border-slate-700"
              />
            </View>
            <View className="mb-6">
              <Text className="text-slate-500 font-bold text-xs uppercase tracking-wider mb-2 ml-1">Simge & Emoji Seçimi (Kendi Simgem)</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row gap-2 pb-2" keyboardShouldPersistTaps="handled">

                {/* Emoji Input */}
                <View className={`w-12 h-12 rounded-2xl items-center justify-center border-2 ${catIcon && !AVAILABLE_ICONS.find(i=>i.name===catIcon) ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30' : 'border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800'}`}>
                  <TextInput
                    maxLength={3}
                    placeholder="😊"
                    placeholderTextColor="#94a3b8"
                    className="text-xl text-center w-full h-full"
                    value={!AVAILABLE_ICONS.find(i=>i.name===catIcon) ? catIcon : ''}
                    onChangeText={setCatIcon}
                  />
                </View>

                {/* Standard Icons - Colored with Selected Color */}
                {AVAILABLE_ICONS.map(item => {
                  const IconComp = item.icon;
                  const isSelected = catIcon === item.name;
                  return (
                    <TouchableOpacity
                      key={item.name}
                      onPress={() => setCatIcon(item.name)}
                      style={isSelected ? { borderColor: catColor, backgroundColor: catColor + '20' } : {}}
                      className={`w-12 h-12 rounded-2xl items-center justify-center border-2 ${!isSelected ? 'border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800' : ''}`}
                    >
                      <IconComp size={20} color={isSelected ? catColor : '#94a3b8'} />
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            <View className="mb-8">
              <Text className="text-slate-500 font-bold text-xs uppercase tracking-wider mb-2 ml-1">Renk Seçimi</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row gap-2 pb-2">
                {AVAILABLE_COLORS.map(color => (
                  <TouchableOpacity
                    key={color}
                    onPress={() => setCatColor(color)}
                    style={{ backgroundColor: color }}
                    className={`w-10 h-10 rounded-full items-center justify-center border-2 ${catColor === color ? 'border-slate-900 dark:border-white' : 'border-transparent'}`}
                  >
                    {catColor === color && <Check size={16} color="white" />}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <View className="flex-row gap-3">
              {editingId && (
                <TouchableOpacity
                  onPress={handleDelete}
                  className="bg-rose-100 dark:bg-rose-900/30 p-4 rounded-2xl items-center justify-center flex-row"
                >
                  <Trash2 size={24} color="#f43f5e" />
                </TouchableOpacity>
              )}
              <TouchableOpacity
                onPress={handleSave}
                className="flex-1 bg-pink-500 py-4 rounded-2xl items-center shadow-sm"
              >
                <Text className="text-white font-bold text-base">Kaydet</Text>
              </TouchableOpacity>
            </View>
          </View></ScrollView></KeyboardAvoidingView>
      </Modal>

    </SafeAreaView>
  );
}