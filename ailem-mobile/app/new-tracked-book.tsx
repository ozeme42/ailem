import { 
  View, 
  Text, 
  ScrollView, 
  TouchableOpacity, 
  ActivityIndicator, 
  TextInput, 
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useEffect, useState } from 'react';
import { useRouter, Stack, useLocalSearchParams } from 'expo-router';
import { 
  ArrowLeft, 
  Send,
  BookOpen,
  ListPlus,
  CopyPlus,
  Info
} from 'lucide-react-native';
import { useAuth } from '../context/auth-context';
import { addTrackedBook, updateTrackedBook, onTrackedBooksUpdate, onCurriculumMapUpdate } from '../lib/dataService';

export default function NewTrackedBookScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { familyId } = useAuth();

  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [initialLoad, setInitialLoad] = useState(!!id);
  const [mode, setMode] = useState<'single' | 'bulk'>('single');

  // Single form states
  const [title, setTitle] = useState("");
  const [publisher, setPublisher] = useState("");
  const [subject, setSubject] = useState("");
  const [topic, setTopic] = useState("");
  const [testCount, setTestCount] = useState("");
  const [questionCount, setQuestionCount] = useState("");
  const [bookType, setBookType] = useState<'standard' | 'open_ended'>('standard');

  // Bulk form state
  const [bulkText, setBulkText] = useState("");
  const [curriculumMap, setCurriculumMap] = useState<Record<string, string[]>>({});

  const sampleBulkText = `TYT Türkçe Soru Bankası, Bilgi Sarmal, Türkçe, Sözcükte Anlam, 10, 200, Standart
AYT Edebiyat Klasik Sorular, Limit Yayınları, Edebiyat, Divan Edebiyatı, 5, 50, Açık Uçlu`;

  useEffect(() => {
    if (!id || !familyId) {
      setInitialLoad(false);
      return;
    }
    
    const unsubBooks = onTrackedBooksUpdate((data) => {
      const book = data?.find(b => b.id === id);
      if (book) {
        if (!title) setTitle(book.title || "");
        if (!publisher) setPublisher(book.publisher || "");
        if (!subject) setSubject(book.subjects && book.subjects.length > 0 ? book.subjects[0].name : "");
        if (!topic) setTopic(book.subjects && book.subjects.length > 0 && book.subjects[0].topics && book.subjects[0].topics.length > 0 ? book.subjects[0].topics[0].name : "");
        if (!testCount) setTestCount((book.testCount || 0).toString());
        if (!questionCount) setQuestionCount((book.questionCount || 0).toString());
        if (book.bookType) setBookType(book.bookType);
      }
      setInitialLoad(false);
    });

    return () => {
      unsubBooks();
    };
  }, [id, familyId]);

  useEffect(() => {
    const unsubCurriculum = onCurriculumMapUpdate((data) => {
      setCurriculumMap(data || {});
    });
    return () => unsubCurriculum();
  }, []);

  const handleSubmitSingle = async () => {
    if (!title || !subject) {
      Alert.alert("Hata", "Lütfen Kitap Adı ve Ders alanlarını doldurun.");
      return;
    }

    setIsSubmitting(true);
    try {
      const initialSubjects = subject ? [{
        id: Date.now().toString(),
        name: subject,
        topics: topic ? [{ id: Date.now().toString() + '1', name: topic }] : []
      }] : [];

      const bookData = {
        title,
        publisher,
        bookType,
        subjects: initialSubjects,
        testCount: parseInt(testCount) || 0,
        questionCount: parseInt(questionCount) || 0,
        solvedTestCount: 0 // Sadece başlangıçta 0'a çekilir.
      };

      if (id) {
        // Güncellemede solvedTestCount'u ve subjects'i sıfırlamamak için omit ediyoruz
        const updateData = {
          title,
          publisher,
          bookType,
          testCount: parseInt(testCount) || 0,
          questionCount: parseInt(questionCount) || 0,
        };
        await updateTrackedBook(id as string, updateData);
        Alert.alert("Başarılı", "Kitap başarıyla güncellendi.", [
          { text: "Tamam", onPress: () => router.back() }
        ]);
      } else {
        await addTrackedBook(bookData);
        Alert.alert("Başarılı", "Kitap başarıyla eklendi.", [
          { text: "Tamam", onPress: () => router.back() }
        ]);
      }
    } catch (e) {
      Alert.alert("Hata", "İşlem sırasında bir hata oluştu.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitBulk = async () => {
    if (!bulkText.trim()) {
      Alert.alert("Hata", "Lütfen eklenecek kitapların listesini girin.");
      return;
    }

    setIsSubmitting(true);
    try {
      const lines = bulkText.split('\n').filter(l => l.trim() !== '');
      let addedCount = 0;

      for (const line of lines) {
        // Beklenen format: Kitap Adı, Yayınevi, Ders, Konu, Test Sayısı, Soru Sayısı
        const parts = line.split(',').map(p => p.trim());
        if (parts.length >= 1) {
          const bTitle = parts[0];
          if (!bTitle) continue;
          
          const bPublisher = parts[1] || "";
          const bSubject = parts[2] || "Diğer";
          const bTopic = parts[3] || "";
          const bTestCount = parseInt(parts[4]) || 0;
          const bQuestionCount = parseInt(parts[5]) || 0;

          const bulkSubjects = [{
            id: Date.now().toString() + Math.random().toString().substring(2, 6),
            name: bSubject,
            topics: bTopic ? [{ id: Date.now().toString() + Math.random().toString().substring(2, 6), name: bTopic }] : []
          }];

          const bType = parts[6] && parts[6].trim().toLowerCase() === 'açık uçlu' ? 'open_ended' : 'standard';

          const bookData = {
            title: bTitle,
            publisher: bPublisher,
            bookType: bType as 'standard' | 'open_ended',
            subjects: bulkSubjects,
            testCount: bTestCount,
            questionCount: bQuestionCount,
            solvedTestCount: 0
          };

          await addTrackedBook(bookData);
          addedCount++;
        }
      }

      if (addedCount > 0) {
        Alert.alert("Başarılı", `${addedCount} adet kitap toplu olarak eklendi.`, [
          { text: "Tamam", onPress: () => router.back() }
        ]);
      } else {
        Alert.alert("Hata", "Geçerli formatta kitap bulunamadı.");
      }
    } catch (e) {
      Alert.alert("Hata", "Toplu ekleme sırasında bir hata oluştu.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = () => {
    if (mode === 'single') {
      handleSubmitSingle();
    } else {
      handleSubmitBulk();
    }
  };

  if (initialLoad) {
    return (
      <SafeAreaView className="flex-1 bg-slate-50 dark:bg-slate-950 justify-center items-center">
        <ActivityIndicator size="large" color="#8b5cf6" />
      </SafeAreaView>
    );
  }

  const isEditing = !!id;

  return (
    <SafeAreaView className="flex-1 bg-slate-50 dark:bg-slate-950">
      <Stack.Screen options={{ headerShown: false }} />

      {/* HEADER */}
      <View className="p-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex-row items-center z-10 shadow-sm">
        <TouchableOpacity onPress={() => router.back()} className="w-10 h-10 items-center justify-center bg-slate-100 dark:bg-slate-800 rounded-full mr-3">
          <ArrowLeft size={20} color="#64748b" />
        </TouchableOpacity>
        <View>
          <Text className="text-lg font-extrabold text-slate-900 dark:text-white leading-none">
            {isEditing ? 'Kitabı Düzenle' : 'Yeni Kitap Ekle'}
          </Text>
          <Text className="text-[9px] font-black text-violet-500 uppercase tracking-widest mt-1">Kitap Takibi</Text>
        </View>
      </View>

      {!isEditing && (
        <View className="flex-row p-4 gap-2 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
          <TouchableOpacity
            onPress={() => setMode('single')}
            className={`flex-1 flex-row items-center justify-center p-3 rounded-xl border ${mode === 'single' ? 'bg-violet-600 border-violet-600' : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-850'}`}
          >
            <BookOpen size={16} color={mode === 'single' ? 'white' : '#64748b'} className="mr-2" />
            <Text className={`text-xs font-bold ${mode === 'single' ? 'text-white' : 'text-slate-600 dark:text-slate-400'}`}>Tekli Ekle</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setMode('bulk')}
            className={`flex-1 flex-row items-center justify-center p-3 rounded-xl border ${mode === 'bulk' ? 'bg-violet-600 border-violet-600' : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-850'}`}
          >
            <CopyPlus size={16} color={mode === 'bulk' ? 'white' : '#64748b'} className="mr-2" />
            <Text className={`text-xs font-bold ${mode === 'bulk' ? 'text-white' : 'text-slate-600 dark:text-slate-400'}`}>Toplu Ekle</Text>
          </TouchableOpacity>
        </View>
      )}

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
        {mode === 'single' ? (
          <View className="space-y-5">
            {/* Kitap Türü Seçimi (Web ile uyumlu) */}
            <View>
              <Text className="text-[10px] font-bold text-slate-450 dark:text-slate-400 uppercase tracking-wider mb-2">Kitap Türü</Text>
              <View className="flex-row gap-3">
                <TouchableOpacity
                  onPress={() => setBookType('standard')}
                  activeOpacity={0.7}
                  className={`flex-1 p-3 rounded-xl border flex-row items-center gap-2 ${
                    bookType === 'standard' 
                      ? 'bg-violet-50 border-violet-200 dark:bg-violet-900/20 dark:border-violet-800' 
                      : 'bg-white border-slate-200 dark:bg-slate-950 dark:border-slate-850'
                  }`}
                >
                  <View className={`w-4 h-4 rounded-full border items-center justify-center ${bookType === 'standard' ? 'border-violet-500' : 'border-slate-300'}`}>
                    {bookType === 'standard' && <View className="w-2 h-2 rounded-full bg-violet-500" />}
                  </View>
                  <Text className={`text-xs font-bold flex-1 ${bookType === 'standard' ? 'text-violet-700 dark:text-violet-300' : 'text-slate-600 dark:text-slate-400'}`}>
                    Standart Soru Bankası
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setBookType('open_ended')}
                  activeOpacity={0.7}
                  className={`flex-1 p-3 rounded-xl border flex-row items-center gap-2 ${
                    bookType === 'open_ended' 
                      ? 'bg-violet-50 border-violet-200 dark:bg-violet-900/20 dark:border-violet-800' 
                      : 'bg-white border-slate-200 dark:bg-slate-950 dark:border-slate-850'
                  }`}
                >
                  <View className={`w-4 h-4 rounded-full border items-center justify-center ${bookType === 'open_ended' ? 'border-violet-500' : 'border-slate-300'}`}>
                    {bookType === 'open_ended' && <View className="w-2 h-2 rounded-full bg-violet-500" />}
                  </View>
                  <Text className={`text-xs font-bold flex-1 ${bookType === 'open_ended' ? 'text-violet-700 dark:text-violet-300' : 'text-slate-600 dark:text-slate-400'}`}>
                    Açık Uçlu Kitap
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <View>
              <Text className="text-[10px] font-bold text-slate-450 dark:text-slate-400 uppercase tracking-wider mb-2">Kitap Adı</Text>
              <TextInput
                placeholder="Örn: TYT Matematik..."
                placeholderTextColor="#94a3b8"
                value={title}
                onChangeText={setTitle}
                className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-2xl px-4 py-3 text-slate-800 dark:text-white font-semibold text-sm"
                style={{ borderRadius: 16 }}
              />
            </View>

            <View>
              <Text className="text-[10px] font-bold text-slate-450 dark:text-slate-400 uppercase tracking-wider mb-2">Yayınevi</Text>
              <TextInput
                placeholder="Örn: Bilgi Sarmal..."
                placeholderTextColor="#94a3b8"
                value={publisher}
                onChangeText={setPublisher}
                className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-2xl px-4 py-3 text-slate-800 dark:text-white font-semibold text-sm"
                style={{ borderRadius: 16 }}
              />
            </View>

            <View>
              <Text className="text-[10px] font-bold text-slate-450 dark:text-slate-400 uppercase tracking-wider mb-2">Ders Seçimi</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                {Object.keys(curriculumMap).length > 0 ? Object.keys(curriculumMap).map((subj) => {
                  const active = subject === subj;
                  return (
                    <TouchableOpacity
                      key={subj}
                      onPress={() => {
                        setSubject(subj);
                        setTopic(""); // Reset topic when subject changes
                      }}
                      className={`px-4 py-2.5 rounded-xl border ${active ? 'bg-violet-600 border-violet-600' : 'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-850'}`}
                      style={{ borderRadius: 14 }}
                    >
                      <Text className={`text-xs font-bold ${active ? 'text-white' : 'text-slate-600 dark:text-slate-400'}`}>{subj}</Text>
                    </TouchableOpacity>
                  );
                }) : (
                  <Text className="text-slate-500 text-xs italic">Müfredat yükleniyor...</Text>
                )}
              </ScrollView>
            </View>
            
            {/* Topic Selection */}
            {Boolean(subject) && curriculumMap[subject] && curriculumMap[subject].length > 0 && (
              <View>
                <Text className="text-[10px] font-bold text-slate-450 dark:text-slate-400 uppercase tracking-wider mb-2">Konu Seçimi</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                  {curriculumMap[subject].map((t) => {
                    const active = topic === t;
                    return (
                      <TouchableOpacity
                        key={t}
                        onPress={() => setTopic(t)}
                        className={`px-4 py-2.5 rounded-xl border ${
                          active 
                            ? 'bg-violet-600 border-violet-600' 
                            : 'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-850'
                        }`}
                        style={{ borderRadius: 14 }}
                      >
                        <Text className={`text-xs font-bold ${active ? 'text-white' : 'text-slate-600 dark:text-slate-400'}`}>{t}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            )}

            <View className="flex-row gap-4">
              <View className="flex-1">
                <Text className="text-[10px] font-bold text-slate-450 dark:text-slate-400 uppercase tracking-wider mb-2">Toplam Test</Text>
                <TextInput
                  placeholder="Örn: 50"
                  keyboardType="numeric"
                  placeholderTextColor="#94a3b8"
                  value={testCount}
                  onChangeText={setTestCount}
                  className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-2xl px-4 py-3 text-slate-800 dark:text-white font-semibold text-sm"
                  style={{ borderRadius: 16 }}
                />
              </View>
              <View className="flex-1">
                <Text className="text-[10px] font-bold text-slate-450 dark:text-slate-400 uppercase tracking-wider mb-2">Toplam Soru</Text>
                <TextInput
                  placeholder="Örn: 1000"
                  keyboardType="numeric"
                  placeholderTextColor="#94a3b8"
                  value={questionCount}
                  onChangeText={setQuestionCount}
                  className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-2xl px-4 py-3 text-slate-800 dark:text-white font-semibold text-sm"
                  style={{ borderRadius: 16 }}
                />
              </View>
            </View>
          </View>
        ) : (
          <View className="space-y-4">
            <View className="bg-violet-50 dark:bg-violet-900/20 p-4 rounded-2xl border border-violet-100 dark:border-violet-900/30 flex-row gap-3">
              <Info size={20} color="#8b5cf6" className="mt-0.5" />
              <View className="flex-1">
                <Text className="text-violet-800 dark:text-violet-300 font-bold text-sm mb-1">Nasıl Kullanılır?</Text>
                <Text className="text-violet-600 dark:text-violet-400 text-xs">
                  Aşağıdaki formata uyarak her satıra bir kitap gelecek şekilde listenizi yapıştırın. Format sırası önemlidir:
                </Text>
                <Text className="text-violet-700 dark:text-violet-300 font-mono text-[10px] mt-2 bg-white/50 dark:bg-black/20 p-2 rounded-lg">
                  Kitap Adı, Yayınevi, Ders, Konu, Toplam Test, Toplam Soru, Kitap Türü (Standart veya Açık Uçlu)
                </Text>
              </View>
            </View>

            <View className="flex-row items-center justify-between mt-2">
              <Text className="text-[10px] font-bold text-slate-450 dark:text-slate-400 uppercase tracking-wider">Toplu Kitap Listesi</Text>
              <TouchableOpacity onPress={() => setBulkText(sampleBulkText)} className="flex-row items-center bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-md">
                <ListPlus size={12} color="#8b5cf6" className="mr-1" />
                <Text className="text-[9px] font-bold text-violet-600 dark:text-violet-400 uppercase">Örnek Ekle</Text>
              </TouchableOpacity>
            </View>

            <TextInput
              value={bulkText}
              onChangeText={setBulkText}
              placeholder="Her satıra bir kitap yazın..."
              placeholderTextColor="#94a3b8"
              multiline
              textAlignVertical="top"
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 min-h-[300px] p-4 text-xs font-mono text-slate-800 dark:text-slate-200 rounded-2xl"
              style={{ borderRadius: 16 }}
            />
          </View>
        )}

        <TouchableOpacity
          onPress={handleSubmit}
          disabled={isSubmitting}
          className="bg-violet-600 py-4 rounded-2xl flex-row items-center justify-center shadow-md active:scale-[0.98] mt-6"
          style={{ borderRadius: 16 }}
        >
          {isSubmitting ? (
            <ActivityIndicator color="white" size="small" />
          ) : (
            <>
              <Send size={18} color="white" className="mr-2" />
              <Text className="text-white font-black text-sm uppercase tracking-wider">
                {isEditing ? 'Değişiklikleri Kaydet' : (mode === 'bulk' ? 'Kitapları Toplu Ekle' : 'Yeni Kitap Ekle')}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>

    </SafeAreaView>
  );
}
