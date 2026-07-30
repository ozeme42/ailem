import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Modal, TextInput, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useEffect, useState } from 'react';
import { onTransactionTemplatesUpdate, addTransactionTemplate, updateTransactionTemplate, deleteTransactionTemplate, onBudgetCategoriesUpdate, onAccountsUpdate } from '../lib/dataService';
import { TransactionTemplate, BudgetCategory, Account } from '../lib/data';
import { Wallet, ChevronLeft, Plus, Zap, ArrowDownCircle, ArrowUpCircle, X, Trash2 } from 'lucide-react-native';
import { useRouter, Stack } from 'expo-router';

export default function TransactionTemplatesScreen() {
  const [templates, setTemplates] = useState<TransactionTemplate[]>([]);
  const [categories, setCategories] = useState<BudgetCategory[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    let unsubscribe: any;
    let catUnsub: any;
    let accUnsub: any;
    try {
      unsubscribe = onTransactionTemplatesUpdate((data: TransactionTemplate[]) => {
        setTemplates(data);
        setLoading(false);
      });
      catUnsub = onBudgetCategoriesUpdate((data) => setCategories(data));
      accUnsub = onAccountsUpdate((data) => setAccounts(data));
    } catch (e) {
      console.log('Error fetching templates:', e);
      setLoading(false);
    }

    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
      if (typeof catUnsub === 'function') catUnsub();
      if (typeof accUnsub === 'function') accUnsub();
    };
  }, []);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [tempName, setTempName] = useState('');
  const [tempType, setTempType] = useState<'income' | 'expense'>('expense');
  const [tempAmount, setTempAmount] = useState('');
  const [tempCategory, setTempCategory] = useState('');
  const [tempAccountId, setTempAccountId] = useState('');

  const openAddModal = () => {
    setEditingId(null);
    setTempName('');
    setTempType('expense');
    setTempAmount('');
    setTempCategory('');
    setTempAccountId(accounts[0]?.id || '');
    setIsModalOpen(true);
  };

  const openEditModal = (t: TransactionTemplate) => {
    setEditingId(t.id);
    setTempName(t.name);
    setTempType(t.type);
    setTempAmount(t.amount ? t.amount.toString() : '');
    setTempCategory(t.category || '');
    setTempAccountId(t.accountId || accounts[0]?.id || '');
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!tempName.trim()) {
      Alert.alert('Hata', 'Şablon adı boş olamaz.');
      return;
    }
    const amt = parseFloat(tempAmount) || 0;
    
    try {
      const dataToSave = { name: tempName.trim(), type: tempType, amount: amt, category: tempCategory, accountId: tempAccountId };
      if (editingId) {
        await updateTransactionTemplate(editingId, dataToSave);
      } else {
        await addTransactionTemplate(dataToSave as any);
      }
      setIsModalOpen(false);
    } catch (e) {
      console.log('Error saving template:', e);
      Alert.alert('Hata', 'Şablon kaydedilirken bir sorun oluştu.');
    }
  };

  const handleDelete = () => {
    if (!editingId) return;
    Alert.alert(
      'Şablonu Sil',
      'Bu şablonu silmek istediğinize emin misiniz?',
      [
        { text: 'Vazgeç', style: 'cancel' },
        { 
          text: 'Sil', 
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteTransactionTemplate(editingId);
              setIsModalOpen(false);
            } catch (e) {
              console.log('Error deleting template:', e);
              Alert.alert('Hata', 'Şablon silinirken bir sorun oluştu.');
            }
          }
        }
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 justify-center items-center bg-slate-50 dark:bg-slate-950">
        <ActivityIndicator size="large" color="#10b981" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-slate-50 dark:bg-slate-950">
      <Stack.Screen options={{ headerShown: false }} />
      <View className="p-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex-row justify-between items-center">
        <TouchableOpacity onPress={() => router.back()} className="w-10 h-10 items-center justify-center bg-slate-100 dark:bg-slate-800 rounded-full">
           <ChevronLeft size={24} color="#64748b" />
        </TouchableOpacity>
        <Text className="text-2xl font-bold text-slate-900 dark:text-white">Hızlı İşlemler</Text>
        <TouchableOpacity onPress={openAddModal} className="bg-emerald-500 w-10 h-10 rounded-full items-center justify-center shadow-sm">
          <Plus size={24} color="white" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerClassName="p-4" showsVerticalScrollIndicator={false}>
         
         <View className="bg-emerald-500 rounded-3xl p-6 mb-6 shadow-sm flex-row items-center justify-between">
            <View>
              <Text className="text-emerald-100 font-medium mb-1">Şablonlar</Text>
              <Text className="text-white text-3xl font-bold">{templates.length} Adet</Text>
            </View>
            <View className="w-16 h-16 bg-white/20 rounded-full items-center justify-center border-4 border-white/30">
               <Zap size={28} color="white" />
            </View>
         </View>

         {templates.length === 0 ? (
           <View className="items-center justify-center mt-10">
             <View className="w-20 h-20 bg-emerald-50 dark:bg-emerald-900/30 rounded-full items-center justify-center mb-4">
                <Wallet size={40} color="#10b981" />
             </View>
             <Text className="text-slate-500 text-lg font-medium text-center">Hızlı bütçe işlemi bulunmuyor.</Text>
           </View>
         ) : (
           templates.map(t => (
             <TouchableOpacity 
                key={t.id} 
                onPress={() => openEditModal(t)}
                className="bg-white dark:bg-slate-900 rounded-3xl p-5 mb-4 shadow-sm border border-slate-100 dark:border-slate-800 flex-row justify-between items-center"
             >
                <View className="flex-row items-center">
                   <View className={`w-12 h-12 rounded-xl items-center justify-center mr-4 ${t.type === 'income' ? 'bg-emerald-50 dark:bg-emerald-900/30' : 'bg-rose-50 dark:bg-rose-900/30'}`}>
                      {t.type === 'income' ? <ArrowUpCircle size={24} color="#10b981" /> : <ArrowDownCircle size={24} color="#f43f5e" />}
                   </View>
                   <View>
                      <Text className="font-bold text-slate-800 dark:text-slate-100 text-lg">{t.name}</Text>
                      <Text className="text-slate-500 text-sm">
                        {t.category || 'Kategorisiz'} • {accounts.find(a => a.id === t.accountId)?.name || 'Hesap Seçilmemiş'}
                      </Text>
                   </View>
                </View>
                <Text className={`font-bold text-lg ${t.type === 'income' ? 'text-emerald-500' : 'text-rose-500'}`}>
                  {t.type === 'income' ? '+' : '-'}₺{t.amount || 0}
                </Text>
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
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          className="flex-1 justify-end bg-black/50"
        >
          <View className="bg-white dark:bg-slate-900 rounded-t-[2.5rem] p-6 shadow-2xl max-h-[90%]">
            <ScrollView showsVerticalScrollIndicator={false}>
              <View className="flex-row justify-between items-center mb-6 border-b border-slate-100 dark:border-slate-800 pb-4">
                <Text className="text-xl font-black text-slate-800 dark:text-white">
                  {editingId ? 'Şablonu Düzenle' : 'Yeni Şablon'}
                </Text>
                <TouchableOpacity onPress={() => setIsModalOpen(false)} className="p-2 bg-slate-100 dark:bg-slate-800 rounded-full">
                  <X size={20} color="#64748b" />
                </TouchableOpacity>
              </View>

              <View className="mb-4">
                <Text className="text-slate-500 font-bold text-xs uppercase tracking-wider mb-2 ml-1">İşlem Tipi</Text>
                <View className="flex-row gap-3">
                  <TouchableOpacity 
                    onPress={() => setTempType('expense')}
                    className={`flex-1 py-3.5 rounded-2xl border-2 items-center ${tempType === 'expense' ? 'border-rose-500 bg-rose-50' : 'border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-850'}`}
                  >
                    <Text className={`font-bold text-sm ${tempType === 'expense' ? 'text-rose-600' : 'text-slate-500'}`}>Gider (-)</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    onPress={() => {
                      setTempType('income');
                      const validAccounts = accounts.filter(a => a.type !== 'credit-card' && a.type !== 'debt');
                      if (validAccounts.length > 0 && !validAccounts.find(a => a.id === tempAccountId)) {
                        setTempAccountId(validAccounts[0].id);
                      }
                    }}
                    className={`flex-1 py-3.5 rounded-2xl border-2 items-center ${tempType === 'income' ? 'border-emerald-500 bg-emerald-50' : 'border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-850'}`}
                  >
                    <Text className={`font-bold text-sm ${tempType === 'income' ? 'text-emerald-600' : 'text-slate-500'}`}>Gelir (+)</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View className="mb-4">
                <Text className="text-slate-500 font-bold text-xs uppercase tracking-wider mb-2 ml-1">Şablon Adı</Text>
                <TextInput
                  value={tempName}
                  onChangeText={setTempName}
                  placeholder="Örn: Market Alışverişi..."
                  placeholderTextColor="#94a3b8"
                  className="bg-slate-50 dark:bg-slate-800 px-5 py-4 rounded-2xl text-slate-800 dark:text-white font-bold text-base border border-slate-200 dark:border-slate-700"
                />
              </View>

              <View className="mb-4">
                <Text className="text-slate-500 font-bold text-xs uppercase tracking-wider mb-2 ml-1">Hesap</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row gap-2">
                  {accounts.filter(acc => tempType === 'income' ? (acc.type !== 'credit-card' && acc.type !== 'debt') : true).map(acc => {
                    const isSelected = tempAccountId === acc.id;
                    return (
                      <TouchableOpacity
                        key={acc.id}
                        onPress={() => setTempAccountId(acc.id)}
                        className="px-4 py-3 rounded-xl border-2 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                        style={isSelected ? { backgroundColor: '#10b981', borderColor: '#10b981' } : undefined}
                      >
                        <Text 
                          className="font-bold text-xs text-slate-600 dark:text-slate-400"
                          style={isSelected ? { color: '#ffffff' } : undefined}
                        >
                          {acc.name}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>

              <View className="mb-4">
                <Text className="text-slate-500 font-bold text-xs uppercase tracking-wider mb-2 ml-1">Varsayılan Tutar (₺)</Text>
                <TextInput
                  value={tempAmount}
                  onChangeText={setTempAmount}
                  placeholder="0.00 (Opsiyonel)"
                  placeholderTextColor="#94a3b8"
                  keyboardType="numeric"
                  className="bg-slate-50 dark:bg-slate-800 px-5 py-4 rounded-2xl text-slate-800 dark:text-white font-bold text-base border border-slate-200 dark:border-slate-700"
                />
              </View>

              <View className="mb-6">
                <Text className="text-slate-500 font-bold text-xs uppercase tracking-wider mb-2 ml-1">Kategori</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row">
                  {categories.filter(c => c.type === tempType).map(cat => (
                    <TouchableOpacity
                      key={cat.id}
                      onPress={() => setTempCategory(cat.name)}
                      className={`px-4 py-3 rounded-xl mr-2 border-2 ${tempCategory === cat.name ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30' : 'border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-850'}`}
                    >
                      <Text className={`font-bold text-sm ${tempCategory === cat.name ? 'text-indigo-600 dark:text-indigo-300' : 'text-slate-500 dark:text-slate-400'}`}>
                        {cat.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                  {categories.filter(c => c.type === tempType).length === 0 && (
                    <Text className="text-slate-400 italic text-xs py-3">Bu tipte kategori bulunmuyor.</Text>
                  )}
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
                  className="flex-1 bg-emerald-500 py-4 rounded-2xl items-center shadow-sm"
                >
                  <Text className="text-white font-bold text-base">Kaydet</Text>
                </TouchableOpacity>
              </View>
              <View className="h-10"></View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

    </SafeAreaView>
  );
}
