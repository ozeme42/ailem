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
  Users, 
  Calendar,
  FileJson,
  CheckCircle,
  Code
} from 'lucide-react-native';
import { useAuth } from '../context/auth-context';
import { useColorScheme } from 'nativewind';
import { addTest, updateTest, onTestsUpdate, onCurriculumMapUpdate } from '../lib/dataService';
import { Test } from '../lib/data';

const sampleJsonPlaceholder = `[
  {
    "id": "q1",
    "text": "Soru metni buraya...",
    "options": ["A Seçeneği", "B Seçeneği", "C Seçeneği", "D Seçeneği"],
    "answer": "A Seçeneği"
  }
]`;

export default function NewJsonTestScreen() {
  const router = useRouter();
  const { id, reassign } = useLocalSearchParams();
  const { familyMembers, familyId } = useAuth();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [initialLoad, setInitialLoad] = useState(!!id);

  // Form states
  const [testTitle, setTestTitle] = useState("");
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [testSubject, setTestSubject] = useState("");
  const [topicId, setTopicId] = useState("");
  const [dueDate, setDueDate] = useState(new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
  const [jsonContent, setJsonContent] = useState("");
  const [curriculumMap, setCurriculumMap] = useState<Record<string, string[]>>({});

  const studentMembers = useMemo(() => 
    familyMembers.filter(m => m.role && m.role.includes('Çocuk')), 
  [familyMembers]);

  useEffect(() => {
    if (studentMembers.length > 0 && !selectedStudentId && !id) {
      setSelectedStudentId(studentMembers[0].id);
    }
  }, [studentMembers, selectedStudentId, id]);

  useEffect(() => {
    if (!id || !familyId) {
      setInitialLoad(false);
      return;
    }
    
    // Fetch initial test data if id is provided
    const unsubTests = onTestsUpdate((data) => {
      const test = data?.find(t => t.id === id);
      if (test) {
        if (!testTitle) setTestTitle(reassign === 'true' ? `${test.title} (Tekrar)` : test.title);
        if (!selectedStudentId) setSelectedStudentId(test.studentId || "");
        if (!testSubject) setTestSubject(test.subject || "");
        if (!topicId) setTopicId(test.topicId || test.topic || "");
        if (!jsonContent && test.jsonQuestions) setJsonContent(JSON.stringify(test.jsonQuestions, null, 2));
      }
      setInitialLoad(false);
    });

    return () => {
      unsubTests();
    };
  }, [id, familyId]);

  useEffect(() => {
    const unsubCurriculum = onCurriculumMapUpdate((data) => {
      setCurriculumMap(data || {});
    });
    return () => {
      unsubCurriculum();
    };
  }, []);

  const handleSubmit = async () => {
    if (!selectedStudentId || !testSubject || !testTitle || !jsonContent) {
      Alert.alert("Hata", "Lütfen tüm alanları doldurun.");
      return;
    }

    let parsedQuestions = [];
    try {
      parsedQuestions = JSON.parse(jsonContent);
      if (!Array.isArray(parsedQuestions)) {
        throw new Error("JSON dizisi bekliyor.");
      }
    } catch (e) {
      Alert.alert("JSON Hatası", "Girdiğiniz JSON verisi geçersiz. Lütfen formatı kontrol edin.");
      return;
    }

    setIsSubmitting(true);
    try {
      const testData = {
        title: testTitle,
        subject: testSubject,
        topicId: topicId || "Genel",
        studentId: selectedStudentId,
        questionCount: parsedQuestions.length,
        dueDate: new Date(dueDate).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' }),
        sourceType: 'json' as const,
        jsonQuestions: parsedQuestions,
      };

      if (id && reassign !== 'true') {
        // Edit existing test
        await updateTest(id as string, testData);
        Alert.alert("Başarılı", "Test başarıyla güncellendi.", [
          { text: "Tamam", onPress: () => router.back() }
        ]);
      } else {
        // Create new or reassign
        await addTest({
          ...testData,
          assignedDate: new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' }),
          status: 'Atandı',
          isArchived: false,
          correctAnswers: 0,
          incorrectAnswers: 0,
          emptyAnswers: 0,
          score: 0
        });
        Alert.alert("Başarılı", "Yeni test başarıyla oluşturuldu.", [
          { text: "Tamam", onPress: () => router.back() }
        ]);
      }
    } catch (e) {
      Alert.alert("Hata", "İşlem sırasında bir hata oluştu.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopySample = () => {
    setJsonContent(sampleJsonPlaceholder);
  };

  if (initialLoad) {
    return (
      <SafeAreaView className="flex-1 bg-slate-50 dark:bg-slate-950 justify-center items-center">
        <ActivityIndicator size="large" color="#6366f1" />
      </SafeAreaView>
    );
  }

  const isEditing = !!id && reassign !== 'true';

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
            {isEditing ? 'Testi Düzenle' : (reassign === 'true' ? 'Testi Tekrar Ata' : 'Yeni Yazılı')}
          </Text>
          <Text className="text-[9px] font-black text-slate-450 dark:text-slate-400 uppercase tracking-widest mt-1">JSON Formatında Sınav</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
        <View className="space-y-6">
          
          {/* Test Title */}
          <View>
            <Text className="text-[10px] font-bold text-slate-450 dark:text-slate-400 uppercase tracking-wider mb-2">Sınav Başlığı</Text>
            <TextInput
              placeholder="1. Dönem 2. Yazılı vb."
              placeholderTextColor="#94a3b8"
              value={testTitle}
              onChangeText={setTestTitle}
              className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-2xl px-4 py-3 text-slate-800 dark:text-white font-semibold text-sm"
              style={{ borderRadius: 16 }}
            />
          </View>

          {/* Student Target selection */}
          <View>
            <Text className="text-[10px] font-bold text-slate-450 dark:text-slate-400 uppercase tracking-wider mb-2">Atanacak Öğrenci</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              {studentMembers.map(student => {
                const active = selectedStudentId === student.id;
                return (
                  <TouchableOpacity
                    key={student.id}
                    onPress={() => setSelectedStudentId(student.id)}
                    className={`flex-row items-center gap-2 px-4 py-2.5 rounded-xl border ${
                      active 
                        ? 'bg-indigo-650 border-indigo-650' 
                        : 'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-850'
                    }`}
                    style={{ borderRadius: 14 }}
                  >
                    <View className={`w-5 h-5 rounded-full flex items-center justify-center ${
                      active ? 'bg-white/20 border-white/30' : 'bg-slate-250 dark:bg-slate-800'
                    }`}>
                      <Users size={12} color={active ? 'white' : '#64748b'} />
                    </View>
                    <Text className={`text-xs font-bold ${active ? 'text-white' : 'text-slate-600 dark:text-slate-400'}`}>
                      {student.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {/* Subject Category Selection */}
          <View>
            <Text className="text-[10px] font-bold text-slate-450 dark:text-slate-400 uppercase tracking-wider mb-2">Ders Seçimi</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              {Object.keys(curriculumMap).length > 0 ? Object.keys(curriculumMap).map((subj) => {
                const active = testSubject === subj;
                return (
                  <TouchableOpacity
                    key={subj}
                    onPress={() => {
                      setTestSubject(subj);
                      setTopicId(""); // Reset topic when subject changes
                    }}
                    className={`px-4 py-2.5 rounded-xl border ${
                      active 
                        ? 'bg-indigo-650 border-indigo-650' 
                        : 'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-850'
                    }`}
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
          {Boolean(testSubject) && curriculumMap[testSubject] && curriculumMap[testSubject].length > 0 && (
            <View>
              <Text className="text-[10px] font-bold text-slate-450 dark:text-slate-400 uppercase tracking-wider mb-2">Konu Seçimi</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                {curriculumMap[testSubject].map((topic) => {
                  const active = topicId === topic;
                  return (
                    <TouchableOpacity
                      key={topic}
                      onPress={() => setTopicId(topic)}
                      className={`px-4 py-2.5 rounded-xl border ${
                        active 
                          ? 'bg-violet-600 border-violet-600' 
                          : 'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-850'
                      }`}
                      style={{ borderRadius: 14 }}
                    >
                      <Text className={`text-xs font-bold ${active ? 'text-white' : 'text-slate-600 dark:text-slate-400'}`}>{topic}</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          )}

          {/* Due Date Input */}
          <View>
            <Text className="text-[10px] font-bold text-slate-450 dark:text-slate-400 uppercase tracking-wider mb-2">Son Teslim Tarihi</Text>
            <View className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-2xl px-4 py-3 flex-row items-center gap-2" style={{ borderRadius: 16 }}>
              <Calendar size={18} color="#94a3b8" />
              <TextInput
                value={dueDate}
                onChangeText={setDueDate}
                placeholder="YYYY-MM-DD"
                placeholderTextColor="#94a3b8"
                className="flex-1 p-0 text-slate-800 dark:text-white font-semibold text-sm"
              />
            </View>
          </View>

          {/* JSON Content */}
          <View className="flex-1">
            <View className="flex-row items-center justify-between mb-2">
              <Text className="text-[10px] font-bold text-slate-450 dark:text-slate-400 uppercase tracking-wider">Sorular (JSON Formatı)</Text>
              <TouchableOpacity onPress={handleCopySample} className="flex-row items-center bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-md">
                <Code size={12} color="#6366f1" className="mr-1" />
                <Text className="text-[9px] font-bold text-indigo-600 dark:text-indigo-400 uppercase">Örnek Ekle</Text>
              </TouchableOpacity>
            </View>
            
            <View className="relative bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden" style={{ borderRadius: 16 }}>
              <TextInput
                value={jsonContent}
                onChangeText={setJsonContent}
                placeholder={sampleJsonPlaceholder}
                placeholderTextColor="#475569"
                multiline
                textAlignVertical="top"
                className="min-h-[250px] p-4 font-mono text-xs text-emerald-400 leading-relaxed"
              />
            </View>
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            onPress={handleSubmit}
            disabled={isSubmitting}
            className="bg-indigo-650 py-4 rounded-2xl flex-row items-center justify-center shadow-md active:scale-[0.98] mt-4"
            style={{ borderRadius: 16 }}
          >
            {isSubmitting ? (
              <ActivityIndicator color="white" size="small" />
            ) : (
              <>
                <Send size={18} color="white" className="mr-2" />
                <Text className="text-white font-black text-sm uppercase tracking-wider">
                  {isEditing ? 'Değişiklikleri Kaydet' : (reassign === 'true' ? 'Tekrar Ata' : 'Ödevi Gönder')}
                </Text>
              </>
            )}
          </TouchableOpacity>

        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
