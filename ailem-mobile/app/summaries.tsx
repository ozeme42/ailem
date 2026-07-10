import { 
  View, 
  Text, 
  ScrollView, 
  TouchableOpacity, 
  ActivityIndicator, 
  TextInput,
  Modal,
  Platform,
  useWindowDimensions,
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useEffect, useState, useMemo } from 'react';
import { onSummariesUpdate, deleteSummary } from '../lib/dataService';
import { Summary } from '../lib/data';
import { 
  FileText, 
  ChevronLeft, 
  Search, 
  Ruler, 
  FlaskConical, 
  BookOpen, 
  Globe, 
  MessageSquare, 
  Maximize2, 
  Minimize2, 
  X,
  Plus,
  PenTool,
  Trash2
} from 'lucide-react-native';
import { useRouter, Stack } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { WebView } from 'react-native-webview';
import { useColorScheme } from 'nativewind';

const getCategoryTheme = (subject: string) => {
  const themes: Record<string, { bg: string, text: string, icon: any, gradient: [string, string] }> = {
    'Matematik': { 
        bg: 'bg-blue-50 dark:bg-blue-950/40', 
        text: 'text-blue-700 dark:text-blue-400', 
        icon: Ruler, 
        gradient: ['#3B82F6', '#06B6D4']
    },
    'Fen Bilimleri': { 
        bg: 'bg-teal-50 dark:bg-teal-950/40', 
        text: 'text-teal-700 dark:text-teal-400', 
        icon: FlaskConical, 
        gradient: ['#14B8A6', '#10B981']
    },
    'Türkçe': { 
        bg: 'bg-orange-50 dark:bg-orange-950/40', 
        text: 'text-orange-700 dark:text-orange-400', 
        icon: BookOpen, 
        gradient: ['#F97316', '#F59E0B']
    },
    'Sosyal Bilgiler': { 
        bg: 'bg-purple-50 dark:bg-purple-950/40', 
        text: 'text-purple-700 dark:text-purple-400', 
        icon: Globe, 
        gradient: ['#8B5CF6', '#6366F1']
    },
    'İngilizce': { 
        bg: 'bg-rose-50 dark:bg-rose-950/40', 
        text: 'text-rose-700 dark:text-rose-400', 
        icon: MessageSquare, 
        gradient: ['#F43F5E', '#EC4899']
    },
    'Diğer': { 
        bg: 'bg-slate-50 dark:bg-slate-900/40', 
        text: 'text-slate-700 dark:text-slate-400', 
        icon: FileText, 
        gradient: ['#64748B', '#475569']
    },
  };
  return themes[subject] || themes['Diğer'];
};

function getSummaryHtmlDocument(htmlContent: string, isDark: boolean) {
  const bodyBgColor = isDark ? '#0f172a' : '#ffffff';
  const textColor = isDark ? '#cbd5e1' : '#334155';
  const headingColor = isDark ? '#f8fafc' : '#0f172a';

  return `
    <!DOCTYPE html>
    <html lang="tr" class="${isDark ? 'dark' : ''}">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
        <script src="https://cdn.tailwindcss.com"></script>
        <script>
          tailwind.config = {
            darkMode: 'class'
          }
        </script>
        <style>
            body { 
              font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; 
              padding: 1.5rem; 
              color: ${textColor}; 
              background-color: ${bodyBgColor};
              line-height: 1.75; 
              overflow-x: hidden;
            }
            h1, h2, h3, h4, h5, h6 { color: ${headingColor}; font-weight: 800; margin-top: 1.5em; margin-bottom: 0.5em; }
            p { margin-bottom: 1.25em; }
            img { border-radius: 1rem; max-width: 100%; height: auto; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1); margin: 1.5rem 0; }
        </style>
    </head>
    <body>
        ${htmlContent}
    </body>
    </html>
  `;
}

export default function SummariesScreen() {
  const router = useRouter();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [summaries, setSummaries] = useState<Summary[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("Tümü");
  const [viewingSummary, setViewingSummary] = useState<Summary | null>(null);
  const [isFullScreen, setIsFullScreen] = useState(false);

  useEffect(() => {
    const unsubscribe = onSummariesUpdate((data: Summary[]) => {
      setSummaries(data || []);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const subjects = useMemo(() => {
    const unique = new Set(summaries.map(s => s.subject));
    return ["Tümü", ...Array.from(unique).sort()];
  }, [summaries]);

  const filteredSummaries = useMemo(() => {
    return summaries.filter(s => {
      const matchesSearch = s.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          s.topic.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesSubject = selectedSubject === "Tümü" || s.subject === selectedSubject;
      return matchesSearch && matchesSubject;
    });
  }, [summaries, searchTerm, selectedSubject]);

  const handleDelete = (id: string) => {
    Alert.alert(
      "Özeti Sil",
      "Bu ders özetini silmek istediğinize emin misiniz? Bu işlem geri alınamaz.",
      [
        { text: "İptal", style: "cancel" },
        { 
          text: "Sil", 
          style: "destructive", 
          onPress: async () => {
            try {
              await deleteSummary(id);
            } catch (error) {
              Alert.alert("Hata", "Özet silinemedi.");
            }
          }
        }
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 justify-center items-center bg-slate-50 dark:bg-slate-950">
        <ActivityIndicator size="large" color="#4f46e5" />
        <Text className="text-slate-500 dark:text-slate-400 font-semibold mt-4">Ders özetleri yükleniyor...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-slate-50 dark:bg-slate-950">
      <Stack.Screen options={{ headerShown: false }} />

      {/* NAVBAR */}
      <View className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex-row justify-between items-center shadow-sm z-10">
        <TouchableOpacity onPress={() => router.back()} className="w-10 h-10 items-center justify-center bg-slate-100 dark:bg-slate-800 rounded-full">
           <ChevronLeft size={24} color="#64748b" />
        </TouchableOpacity>
        <Text className="text-xl font-bold text-slate-900 dark:text-white">Ders Özetleri</Text>
        <TouchableOpacity 
           onPress={() => router.push('/new-summary')} 
           className="w-10 h-10 items-center justify-center bg-indigo-600 dark:bg-indigo-500 rounded-full shadow-md active:scale-95"
        >
           <Plus size={20} color="#ffffff" />
        </TouchableOpacity>
      </View>

      {/* SEARCH AND CATEGORY BAR */}
      <View className="bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-850 p-4 space-y-4">
        {/* Search Input */}
        <View className="relative bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3 flex-row items-center gap-3">
          <Search size={18} color="#94a3b8" />
          <TextInput
            placeholder="Konu veya başlık ara..."
            placeholderTextColor="#94a3b8"
            className="flex-1 text-sm font-semibold text-slate-800 dark:text-white p-0"
            value={searchTerm}
            onChangeText={setSearchTerm}
          />
          {searchTerm !== "" && (
            <TouchableOpacity onPress={() => setSearchTerm("")}>
              <X size={16} color="#94a3b8" />
            </TouchableOpacity>
          )}
        </View>

        {/* Subject Filter Pills */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row">
          {subjects.map(subject => {
            const isActive = selectedSubject === subject;
            return (
              <TouchableOpacity
                key={subject}
                onPress={() => setSelectedSubject(subject)}
                className={`px-4 py-2 rounded-full mr-2 border ${
                  isActive 
                    ? 'bg-indigo-600 border-indigo-600' 
                    : 'bg-white border-slate-200 dark:bg-slate-800 dark:border-slate-700'
                }`}
              >
                <Text className={`text-xs font-bold ${
                  isActive ? 'text-white' : 'text-slate-600 dark:text-slate-350'
                }`}>
                  {subject}
                </Text>
              </TouchableOpacity>
            )
          })}
        </ScrollView>
      </View>

      {/* SUMMARIES GRID */}
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        {filteredSummaries.length === 0 ? (
          <View className="items-center justify-center py-16">
            <View className="w-20 h-20 bg-slate-100 dark:bg-slate-900 rounded-full items-center justify-center mb-4">
               <FileText size={40} color="#94a3b8" />
            </View>
            <Text className="text-slate-800 dark:text-slate-200 text-lg font-bold">Özet Bulunamadı</Text>
            <Text className="text-slate-400 text-xs text-center mt-1">Aradığınız kriterlere uygun ders özeti bulunmuyor.</Text>
          </View>
        ) : (
          <View className="flex-row flex-wrap justify-between">
            {filteredSummaries.map((summary) => {
              const theme = getCategoryTheme(summary.subject);
              const Icon = theme.icon;

              return (
                <TouchableOpacity
                  key={summary.id}
                  onPress={() => setViewingSummary(summary)}
                  activeOpacity={0.9}
                  className="w-[48%] bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 overflow-hidden mb-4 shadow-sm"
                >
                  <LinearGradient
                    colors={theme.gradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    className="h-24 w-full justify-center items-center relative overflow-hidden"
                  >
                    <View className="absolute inset-0 bg-black/5" />
                    <Icon size={36} color="rgba(255,255,255,0.9)" />
                  </LinearGradient>
                  
                  <View className="p-3 relative">
                    <View className="flex-row items-center justify-between mb-1.5">
                      <View className={`px-1.5 py-0.5 rounded ${theme.bg}`}>
                        <Text className={`text-[8px] font-black uppercase tracking-wider ${theme.text}`}>
                          {summary.subject}
                        </Text>
                      </View>
                      
                      <View className="flex-row gap-2">
                        <TouchableOpacity 
                          onPress={(e) => {
                            e.stopPropagation();
                            router.push({ pathname: '/new-summary', params: { id: summary.id } });
                          }}
                        >
                          <PenTool size={14} color="#64748b" />
                        </TouchableOpacity>
                        <TouchableOpacity 
                          onPress={(e) => {
                            e.stopPropagation();
                            handleDelete(summary.id);
                          }}
                        >
                          <Trash2 size={14} color="#ef4444" />
                        </TouchableOpacity>
                      </View>
                    </View>
                    <Text className="text-xs font-black text-slate-850 dark:text-slate-100 leading-tight mb-1 mt-1" numberOfLines={2}>
                      {summary.title}
                    </Text>
                    <Text className="text-[10px] text-slate-400 dark:text-slate-500 font-bold" numberOfLines={1}>
                      {summary.topic}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* READING MODAL */}
      <Modal
        visible={!!viewingSummary}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setViewingSummary(null)}
      >
        <View className="flex-1 bg-black/60 justify-end">
          <TouchableOpacity 
            className="flex-1" 
            activeOpacity={1} 
            onPress={() => setViewingSummary(null)} 
          />
          
          <View className={`bg-white dark:bg-slate-900 shadow-2xl overflow-hidden ${
            isFullScreen 
              ? 'w-full h-full rounded-none' 
              : 'w-full h-[85%] rounded-t-[32px] border-t border-slate-200 dark:border-slate-800'
          }`}>
            {/* Modal Header */}
            <View className="p-4 border-b border-slate-100 dark:border-slate-800 flex-row justify-between items-center bg-slate-50 dark:bg-slate-950 shrink-0">
              <View className="flex-1 mr-4">
                <View className="flex-row items-center gap-2 mb-1">
                  <View className="bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded">
                    <Text className="text-indigo-650 dark:text-indigo-400 text-[9px] font-black uppercase tracking-wider">
                      {viewingSummary?.subject}
                    </Text>
                  </View>
                  <Text className="text-slate-400 dark:text-slate-500 text-[10px] font-bold uppercase truncate max-w-[150px]">
                    {viewingSummary?.topic}
                  </Text>
                </View>
                <Text className="text-slate-850 dark:text-white font-black text-sm truncate" numberOfLines={1}>
                  {viewingSummary?.title}
                </Text>
              </View>
              
              <View className="flex-row items-center gap-1.5 shrink-0">
                <TouchableOpacity 
                  onPress={() => setIsFullScreen(!isFullScreen)}
                  className="w-8 h-8 rounded-full bg-slate-250/80 dark:bg-slate-800 items-center justify-center"
                >
                  {isFullScreen ? (
                    <Minimize2 size={14} color="#64748b" />
                  ) : (
                    <Maximize2 size={14} color="#64748b" />
                  )}
                </TouchableOpacity>
                <TouchableOpacity 
                  onPress={() => setViewingSummary(null)}
                  className="w-8 h-8 rounded-full bg-slate-250/80 dark:bg-slate-800 items-center justify-center"
                >
                  <X size={14} color="#64748b" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Content (iframe/WebView) */}
            <View className="flex-1 bg-white dark:bg-slate-950">
              {viewingSummary && (
                Platform.OS === 'web' ? (
                  // @ts-ignore
                  <iframe 
                    srcDoc={getSummaryHtmlDocument(viewingSummary.content, isDark)}
                    style={{ width: '100%', height: '100%', border: 'none', backgroundColor: 'transparent' }}
                    title={viewingSummary.title}
                  />
                ) : (
                  <WebView
                    originWhitelist={['*']}
                    source={{ html: getSummaryHtmlDocument(viewingSummary.content, isDark) }}
                    style={{ flex: 1, backgroundColor: 'transparent' }}
                    javaScriptEnabled={true}
                    domStorageEnabled={true}
                  />
                )
              )}
            </View>

            {/* Modal Footer */}
            <View className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 pb-8 shrink-0">
              <TouchableOpacity 
                onPress={() => setViewingSummary(null)}
                className="w-full bg-indigo-600 py-3.5 rounded-2xl items-center justify-center shadow-lg shadow-indigo-600/10 active:scale-95"
              >
                <Text className="text-white font-bold text-base">Okumayı Bitir</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
