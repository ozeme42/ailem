import { View, Text, TextInput, TouchableOpacity, ScrollView, Platform, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ChevronDown, Save, PlusCircle, AlignLeft, Hash, Calendar as CalendarIcon, DollarSign } from 'lucide-react-native';
import { useState } from 'react';
import { 
  addGoal, addBill, addBook, addRecipe, addNotebook, 
  addAccount, addBudgetCategory, addCalendarEvent, addTask, addTransaction, addMistake
} from '../lib/dataService';

export default function ModalScreen() {
  const router = useRouter();
  const { type, title, notebookId } = useLocalSearchParams();
  
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    amount: '',
    date: '',
    author: '',
    category: 'Genel'
  });

  // Default titles based on type
  const formTitle = title || (type === 'goal' ? 'Yeni Hedef' 
    : type === 'habit' ? 'Yeni Alışkanlık' 
    : type === 'book' ? 'Yeni Kitap'
    : type === 'bill' ? 'Yeni Fatura'
    : type === 'task' ? 'Yeni Görev'
    : type === 'recipe' ? 'Yeni Tarif'
    : type === 'account' ? 'Yeni Hesap'
    : type === 'transaction' ? 'Yeni İşlem'
    : 'Yeni Ekle');

  const handleSave = async () => {
    if (!formData.title.trim()) {
      Alert.alert('Hata', 'Lütfen en azından başlık/isim alanını doldurun.');
      return;
    }
    
    setLoading(true);
    try {
      switch (type) {
        case 'goal':
          await addGoal({ title: formData.title, description: formData.description, targetDate: formData.date || new Date().toISOString() } as any);
          break;
        case 'bill':
          await addBill({ title: formData.title, amount: Number(formData.amount) || 0, dueDate: formData.date || new Date().toISOString(), isPaid: false } as any);
          break;
        case 'book':
          await addBook({ title: formData.title, author: formData.author, type: 'book', status: 'unread' } as any);
          break;
        case 'recipe':
          await addRecipe({ title: formData.title, instructions: formData.description, ingredients: [] } as any);
          break;
        case 'notebook':
          await addNotebook({ title: formData.title, description: formData.description, icon: 'book' });
          break;
        case 'account':
          await addAccount({ name: formData.title, balance: Number(formData.amount) || 0, currency: 'TRY' });
          break;
        case 'category':
          await addBudgetCategory({ name: formData.title, type: 'expense', icon: 'tag', color: '#64748b' });
          break;
        case 'task':
          await addTask({ title: formData.title, description: formData.description, dueDate: formData.date || null, isCompleted: false } as any);
          break;
        case 'transaction':
          await addTransaction({ title: formData.title, amount: Number(formData.amount) || 0, type: 'expense', date: new Date().toISOString(), categoryId: 'genel' });
          break;
        case 'mistake':
          await addMistake({ title: formData.title, notes: formData.description, subject: formData.category });
          break;
        case 'event':
          await addCalendarEvent({ title: formData.title, description: formData.description, date: formData.date || new Date().toISOString() } as any);
          break;
        default:
          // For types without a specific add function implemented here, just log or add generic generic handler if needed
          console.log(`No specific save handler for type: ${type}`);
          // Mock success for unhandled types
          break;
      }
      
      setLoading(false);
      router.back();
    } catch (error: any) {
      console.log('Error saving data:', error);
      Alert.alert('Hata', 'Kayıt sırasında bir hata oluştu: ' + error.message);
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-50 dark:bg-slate-950" edges={['top']}>
      {/* Header */}
      <View className="px-4 py-3 flex-row justify-between items-center border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <TouchableOpacity onPress={() => router.back()} className="p-2" disabled={loading}>
           <Text className="text-blue-500 text-lg font-medium">İptal</Text>
        </TouchableOpacity>
        <Text className="text-xl font-bold text-slate-900 dark:text-white">{formTitle}</Text>
        <TouchableOpacity className="p-2" onPress={handleSave} disabled={loading}>
           {loading ? <ActivityIndicator size="small" color="#3b82f6" /> : <Text className="text-blue-500 text-lg font-bold">Kaydet</Text>}
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerClassName="p-4" keyboardShouldPersistTaps="handled">
         
         <View className="items-center mb-8 mt-4">
            <View className="w-20 h-20 bg-blue-50 dark:bg-blue-900/30 rounded-full items-center justify-center mb-3">
               <PlusCircle size={40} color="#3b82f6" />
            </View>
            <Text className="text-slate-500 text-center px-4">
               {formTitle} formunu doldurarak sisteme veri kaydedebilirsiniz. Veriler Firebase'e yazılacaktır.
            </Text>
         </View>

         {/* Generic Form Inputs */}
         <View className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden mb-6">
            
            <View className="flex-row items-center border-b border-slate-100 dark:border-slate-800 p-4">
               <Hash size={20} color="#94a3b8" className="mr-3" />
               <TextInput 
                 placeholder="Başlık veya İsim"
                 placeholderTextColor="#94a3b8"
                 className="flex-1 text-slate-900 dark:text-white text-lg font-medium"
                 value={formData.title}
                 onChangeText={(t) => setFormData({...formData, title: t})}
                 autoFocus
               />
            </View>

            {(type === 'book') && (
              <View className="flex-row items-center border-b border-slate-100 dark:border-slate-800 p-4">
                 <Hash size={20} color="#94a3b8" className="mr-3" />
                 <TextInput 
                   placeholder="Yazar"
                   placeholderTextColor="#94a3b8"
                   className="flex-1 text-slate-900 dark:text-white text-base"
                   value={formData.author}
                   onChangeText={(t) => setFormData({...formData, author: t})}
                 />
              </View>
            )}

            {(type === 'bill' || type === 'account' || type === 'transaction') && (
              <View className="flex-row items-center border-b border-slate-100 dark:border-slate-800 p-4">
                 <DollarSign size={20} color="#94a3b8" className="mr-3" />
                 <TextInput 
                   placeholder="Tutar (örn. 500)"
                   placeholderTextColor="#94a3b8"
                   keyboardType="numeric"
                   className="flex-1 text-slate-900 dark:text-white text-base"
                   value={formData.amount}
                   onChangeText={(t) => setFormData({...formData, amount: t})}
                 />
              </View>
            )}

            {(type === 'goal' || type === 'bill' || type === 'task' || type === 'event') && (
              <View className="flex-row items-center border-b border-slate-100 dark:border-slate-800 p-4">
                 <CalendarIcon size={20} color="#94a3b8" className="mr-3" />
                 <TextInput 
                   placeholder="Tarih (YYYY-MM-DD) veya boş bırakın"
                   placeholderTextColor="#94a3b8"
                   className="flex-1 text-slate-900 dark:text-white text-base"
                   value={formData.date}
                   onChangeText={(t) => setFormData({...formData, date: t})}
                 />
              </View>
            )}

            {type !== 'account' && type !== 'category' && (
               <View className="flex-row border-b border-slate-100 dark:border-slate-800 p-4">
                  <AlignLeft size={20} color="#94a3b8" className="mr-3 mt-1" />
                  <TextInput 
                    placeholder="Açıklama veya detaylı notlar ekleyin..."
                    placeholderTextColor="#94a3b8"
                    className="flex-1 text-slate-900 dark:text-white text-base min-h-[80px]"
                    multiline
                    textAlignVertical="top"
                    value={formData.description}
                    onChangeText={(t) => setFormData({...formData, description: t})}
                  />
               </View>
            )}

            <TouchableOpacity className="flex-row items-center justify-between p-4">
               <Text className="text-slate-700 dark:text-slate-200 text-base">Kategori Seçin</Text>
               <View className="flex-row items-center">
                  <Text className="text-slate-400 mr-2">{formData.category}</Text>
                  <ChevronDown size={20} color="#94a3b8" />
               </View>
            </TouchableOpacity>

         </View>

         <TouchableOpacity 
            onPress={handleSave}
            disabled={loading}
            className={`flex-row items-center justify-center p-4 rounded-2xl shadow-sm mb-10 ${loading ? 'bg-blue-400' : 'bg-blue-500'}`}
         >
            {loading ? <ActivityIndicator color="white" className="mr-2" /> : <Save size={20} color="white" className="mr-2" />}
            <Text className="text-white font-bold text-lg">{loading ? 'Kaydediliyor...' : 'Sisteme Kaydet'}</Text>
         </TouchableOpacity>

      </ScrollView>

      {/* Use a light status bar on iOS to account for the black space above the modal */}
      <StatusBar style={Platform.OS === 'ios' ? 'light' : 'auto'} />
    </SafeAreaView>
  );
}
