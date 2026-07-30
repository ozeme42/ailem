import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useEffect } from 'react';
import { useRouter, Stack, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Send, ClipboardList } from 'lucide-react-native';
import { addPracticeExam, updatePracticeExam, onSinglePracticeExamUpdate } from '../lib/dataService';

export default function NewPracticeExamScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const isEditing = !!id;

  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [initialLoad, setInitialLoad] = useState(isEditing);

  useEffect(() => {
    if (!isEditing) return;
    const unsub = onSinglePracticeExamUpdate(id as string, (data) => {
      if (data) {
        setName(data.name || '');
      }
      setInitialLoad(false);
    });
    return () => unsub();
  }, [id]);

  const handleSubmit = async () => {
    if (!name.trim() || name.length < 3) {
      Alert.alert('Hata', 'Lütfen en az 3 karakterli bir deneme sınavı adı girin.');
      return;
    }

    setLoading(true);
    try {
      if (isEditing) {
        await updatePracticeExam(id as string, { name: name.trim() });
        Alert.alert('Başarılı', 'Deneme sınavı başarıyla güncellendi.', [
          { text: 'Tamam', onPress: () => router.back() }
        ]);
      } else {
        const docRef = await addPracticeExam({
          name: name.trim(),
          subjects: [],
        });
        Alert.alert('Başarılı', 'Yeni deneme sınavı oluşturuldu.', [
          { text: 'Devam Et', onPress: () => router.replace({ pathname: '/practice-exam-detail', params: { id: docRef.id } }) }
        ]);
      }
    } catch (e) {
      Alert.alert('Hata', 'İşlem sırasında bir sorun oluştu.');
    } finally {
      setLoading(false);
    }
  };

  if (initialLoad) {
    return (
      <SafeAreaView className="flex-1 bg-slate-50 dark:bg-slate-950 justify-center items-center">
        <ActivityIndicator size="large" color="#6366f1" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-slate-50 dark:bg-slate-950">
      <Stack.Screen options={{ headerShown: false }} />

      <View className="p-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex-row items-center z-10 shadow-sm">
        <TouchableOpacity onPress={() => router.back()} className="w-10 h-10 items-center justify-center bg-slate-100 dark:bg-slate-800 rounded-full mr-3">
          <ArrowLeft size={20} color="#64748b" />
        </TouchableOpacity>
        <View className="flex-1">
          <Text className="text-lg font-extrabold text-slate-900 dark:text-white leading-none">
            {isEditing ? 'Deneme Sınavını Düzenle' : 'Yeni Deneme Sınavı'}
          </Text>
          <Text className="text-[9px] font-black text-slate-450 dark:text-slate-400 uppercase tracking-widest mt-1">Yönetim Paneli</Text>
        </View>
      </View>

      <View className="p-5 flex-1">
        <View className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm mb-6">
          <View className="w-12 h-12 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl items-center justify-center mb-4">
             <ClipboardList size={24} color="#6366f1" />
          </View>
          <Text className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">
            {isEditing ? "Deneme sınavının adını güncelleyin." : "Yeni bir deneme sınavı oluşturun. Daha sonra detay sayfasından dersler ve sorular ekleyebilirsiniz."}
          </Text>
          
          <View>
            <Text className="text-[10px] font-bold text-slate-450 dark:text-slate-400 uppercase tracking-wider mb-2">Deneme Sınavı Adı</Text>
            <TextInput
              placeholder="Örn: TYT Genel Deneme - 1"
              placeholderTextColor="#94a3b8"
              value={name}
              onChangeText={setName}
              className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-2xl px-4 py-4 text-slate-800 dark:text-white font-semibold text-sm"
              style={{ borderRadius: 16 }}
            />
          </View>
        </View>

        <TouchableOpacity
          onPress={handleSubmit}
          disabled={loading}
          className="bg-indigo-650 py-4 rounded-2xl flex-row items-center justify-center shadow-md active:scale-[0.98]"
          style={{ borderRadius: 16 }}
        >
          {loading ? (
            <ActivityIndicator color="white" size="small" />
          ) : (
            <>
              <Send size={18} color="white" className="mr-2" />
              <Text className="text-white font-black text-sm uppercase tracking-wider">
                {isEditing ? 'Değişiklikleri Kaydet' : 'Sınavı Oluştur'}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
