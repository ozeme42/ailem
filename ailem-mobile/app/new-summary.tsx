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
import { useEffect, useState, useMemo } from 'react';
import { useRouter, Stack, useLocalSearchParams } from 'expo-router';
import { 
  ArrowLeft, 
  Send,
  Code
} from 'lucide-react-native';
import { useAuth } from '../context/auth-context';
import { addSummary, updateSummary, onSummariesUpdate, onCurriculumMapUpdate } from '../lib/dataService';

const sampleHtmlPlaceholder = `<div>
  <h3>Özet Başlığı</h3>
  <p>HTML formatında ders özeti içeriği buraya yazılır...</p>
</div>`;

export default function NewSummaryScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { familyId } = useAuth();

  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [initialLoad, setInitialLoad] = useState(!!id);

  // Form states
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [topic, setTopic] = useState("");
  const [htmlContent, setHtmlContent] = useState("");
  const [curriculumMap, setCurriculumMap] = useState<Record<string, string[]>>({});

  useEffect(() => {
    if (!id || !familyId) {
      setInitialLoad(false);
      return;
    }
    
    const unsubSummaries = onSummariesUpdate((data) => {
      const summary = data?.find(s => s.id === id);
      if (summary) {
        if (!title) setTitle(summary.title || "");
        if (!subject) setSubject(summary.subject || "");
        if (!topic) setTopic(summary.topic || "");
        if (!htmlContent) setHtmlContent(summary.htmlContent || "");
      }
      setInitialLoad(false);
    });

    return () => {
      unsubSummaries();
    };
  }, [id, familyId]);

  useEffect(() => {
    const unsubCurriculum = onCurriculumMapUpdate((data) => {
      setCurriculumMap(data || {});
    });
    return () => unsubCurriculum();
  }, []);

  const handleSubmit = async () => {
    if (!title || !subject || !htmlContent) {
      Alert.alert("Hata", "Lütfen Başlık, Ders ve İçerik alanlarını doldurun.");
      return;
    }

    setIsSubmitting(true);
    try {
      const summaryData = {
        title: title,
        subject: subject,
        topic: topic || "Genel Konu",
        htmlContent: htmlContent,
      };

      if (id) {
        await updateSummary(id as string, summaryData);
        Alert.alert("Başarılı", "Özet başarıyla güncellendi.", [
          { text: "Tamam", onPress: () => router.back() }
        ]);
      } else {
        await addSummary(summaryData);
        Alert.alert("Başarılı", "Yeni özet başarıyla oluşturuldu.", [
          { text: "Tamam", onPress: () => router.back() }
        ]);
      }
    } catch (e) {
      Alert.alert("Hata", "İşlem sırasında bir hata oluştu.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (initialLoad) {
    return (
      <SafeAreaView className="flex-1 bg-slate-50 dark:bg-slate-950 justify-center items-center">
        <ActivityIndicator size="large" color="#4f46e5" />
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
            {isEditing ? 'Özeti Düzenle' : 'Yeni Ders Özeti'}
          </Text>
          <Text className="text-[9px] font-black text-indigo-500 uppercase tracking-widest mt-1">HTML Formatında İçerik</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
        <View className="space-y-6">
          
          <View>
            <Text className="text-[10px] font-bold text-slate-450 dark:text-slate-400 uppercase tracking-wider mb-2">Özet Başlığı</Text>
            <TextInput
              placeholder="Özet Adı..."
              placeholderTextColor="#94a3b8"
              value={title}
              onChangeText={setTitle}
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
                    className={`px-4 py-2.5 rounded-xl border ${active ? 'bg-indigo-600 border-indigo-600' : 'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-850'}`}
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

          <View className="flex-1">
            <View className="flex-row items-center justify-between mb-2">
              <Text className="text-[10px] font-bold text-slate-450 dark:text-slate-400 uppercase tracking-wider">İçerik (HTML)</Text>
              <TouchableOpacity onPress={() => setHtmlContent(sampleHtmlPlaceholder)} className="flex-row items-center bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-md">
                <Code size={12} color="#4f46e5" className="mr-1" />
                <Text className="text-[9px] font-bold text-indigo-600 dark:text-indigo-400 uppercase">Örnek Ekle</Text>
              </TouchableOpacity>
            </View>
            
            <View className="relative bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden" style={{ borderRadius: 16 }}>
              <TextInput
                value={htmlContent}
                onChangeText={setHtmlContent}
                placeholder={sampleHtmlPlaceholder}
                placeholderTextColor="#475569"
                multiline
                textAlignVertical="top"
                className="min-h-[250px] p-4 font-mono text-xs text-indigo-400 leading-relaxed"
              />
            </View>
          </View>

          <TouchableOpacity
            onPress={handleSubmit}
            disabled={isSubmitting}
            className="bg-indigo-600 py-4 rounded-2xl flex-row items-center justify-center shadow-md active:scale-[0.98] mt-4"
            style={{ borderRadius: 16 }}
          >
            {isSubmitting ? (
              <ActivityIndicator color="white" size="small" />
            ) : (
              <>
                <Send size={18} color="white" className="mr-2" />
                <Text className="text-white font-black text-sm uppercase tracking-wider">
                  {isEditing ? 'Değişiklikleri Kaydet' : 'Yeni Özet Ekle'}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>

    </SafeAreaView>
  );
}
