import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert, TextInput, Modal, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useEffect, useState, useMemo } from 'react';
import { 
  onSubjectsUpdate, onTopicsUpdate, updateSubjects, updateTopics, 
  onCurriculumMapUpdate, updateCurriculumMap, onTestsUpdate, 
  onBankQuestionsUpdate, onTrackedBooksUpdate 
} from '../lib/dataService';
import { BookMarked, ChevronLeft, Plus, Trash2, Edit2, FolderOpen, Search, Target, ListPlus, ChevronDown, ChevronRight, Hash } from 'lucide-react-native';
import { useRouter, Stack } from 'expo-router';
import { useAuth } from '../context/auth-context';

const getCategoryName = (test: any): string => {
  if (test.sourceType === 'exam') return 'Genel Deneme Sınavları';
  if (test.sourceType === 'mistake') return 'Yanlışlarım';
  return test.subject || 'Diğer';
};

const normalizeText = (text: string) => {
  if (!text) return "";
  return text.trim().replace(/\s+/g, ' ').split(' ').map(word => 
      word.charAt(0).toLocaleUpperCase('tr-TR') + word.slice(1).toLocaleLowerCase('tr-TR')
  ).join(' ');
};

export default function CurriculumScreen() {
  const { familyId } = useAuth();
  const router = useRouter();

  const [allSubjects, setAllSubjects] = useState<string[]>([]);
  const [allTopics, setAllTopics] = useState<string[]>([]);
  const [curriculumMap, setCurriculumMap] = useState<Record<string, string[]>>({});
  
  const [tests, setTests] = useState<any[]>([]);
  const [bankQuestions, setBankQuestions] = useState<any[]>([]);
  const [trackedBooks, setTrackedBooks] = useState<any[]>([]);
  
  const [localLinks, setLocalLinks] = useState<{subject: string, topic: string}[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  const [expandedSubjects, setExpandedSubjects] = useState<Record<string, boolean>>({});

  const [editingItem, setEditingItem] = useState<{ type: 'subject' | 'topic', original: string, current: string } | null>(null);
  const [addModal, setAddModal] = useState<{ isOpen: boolean, type: 'subject' | 'topic' | 'bulk-topic' }>({ isOpen: false, type: 'subject' });
  const [newItemName, setNewItemName] = useState("");
  const [selectedSubject, setSelectedSubject] = useState<string>("");

  useEffect(() => {
    if (!familyId) return;
    const unsubS = onSubjectsUpdate(setAllSubjects);
    const unsubT = onTopicsUpdate(setAllTopics);
    const unsubC = onCurriculumMapUpdate(setCurriculumMap);
    const unsubTests = onTestsUpdate(setTests);
    const unsubBank = onBankQuestionsUpdate(setBankQuestions);
    const unsubBooks = onTrackedBooksUpdate((books) => {
      setTrackedBooks(books);
      setLoading(false);
    });
    
    return () => { unsubS(); unsubT(); unsubTests(); unsubBank(); unsubBooks(); unsubC(); };
  }, [familyId]);

  const hierarchyMap = useMemo(() => {
    const map = new Map<string, Set<string>>();
    allSubjects.forEach(s => map.set(s, new Set()));

    Object.entries(curriculumMap).forEach(([subj, topics]) => {
      if (!map.has(subj)) map.set(subj, new Set());
      topics.forEach(t => map.get(subj)!.add(t));
    });

    localLinks.forEach(link => {
      if (!map.has(link.subject)) map.set(link.subject, new Set());
      map.get(link.subject)!.add(link.topic);
    });

    return map;
  }, [allSubjects, localLinks, curriculumMap]);

  useEffect(() => {
    if (loading || allSubjects.length === 0) return;

    let hasMapChanges = false;
    const updatedMap = { ...curriculumMap };
    const isTopicPermanentlyMapped = (topic: string) => Object.values(curriculumMap).some(topics => topics.includes(topic));

    const oldMap = new Map<string, Set<string>>();
    tests.forEach(t => {
      const subj = getCategoryName(t);
      const topicNameStr = t.topic || t._topicName || t.topicId;
      if (subj && typeof topicNameStr === 'string' && topicNameStr !== 'Genel' && subj !== 'Diğer' && isNaN(Number(topicNameStr))) {
        if (!oldMap.has(subj)) oldMap.set(subj, new Set());
        oldMap.get(subj)!.add(topicNameStr);
      }
    });

    bankQuestions.forEach(q => {
      if (q.subject && q.topic && q.topic !== 'Genel' && isNaN(Number(q.topic))) {
        if (!oldMap.has(q.subject)) oldMap.set(q.subject, new Set());
        oldMap.get(q.subject)!.add(q.topic);
      }
    });

    trackedBooks.forEach(b => {
      (b.subjects || []).forEach((s: any) => {
        if (!oldMap.has(s.name)) oldMap.set(s.name, new Set());
        (s.topics || []).forEach((t: any) => {
           if (typeof t.name === 'string' && isNaN(Number(t.name))) {
             oldMap.get(s.name)!.add(t.name);
           }
        });
      });
    });

    oldMap.forEach((topics, subj) => {
      topics.forEach(t => {
        if (!isTopicPermanentlyMapped(t) && allSubjects.includes(subj)) {
          if (!updatedMap[subj]) updatedMap[subj] = [];
          if (!updatedMap[subj].includes(t)) {
            updatedMap[subj].push(t);
            hasMapChanges = true;
          }
        }
      });
    });

    // Cleanup: Remove numeric topics that accidentally got saved
    Object.keys(updatedMap).forEach(subj => {
      const filteredTopics = updatedMap[subj].filter(t => isNaN(Number(t)));
      if (filteredTopics.length !== updatedMap[subj].length) {
        updatedMap[subj] = filteredTopics;
        hasMapChanges = true;
      }
    });

    if (hasMapChanges) {
      updateCurriculumMap(updatedMap).catch(console.error);
    }

    const syncCurriculum = async () => {
      const usedSubjects = new Set<string>();
      const usedTopics = new Set<string>();

      tests.forEach(t => { usedSubjects.add(getCategoryName(t)); if (t._topicName && t._topicName !== 'Genel') usedTopics.add(t._topicName); });
      bankQuestions.forEach(q => { usedSubjects.add(q.subject); usedTopics.add(q.topic); });
      trackedBooks.forEach(b => {
        (b.subjects || []).forEach((s: any) => {
          usedSubjects.add(s.name);
          (s.topics || []).forEach((t: any) => usedTopics.add(t.name));
        });
      });

      const currentSubjLower = allSubjects.map(s => s.toLocaleLowerCase('tr-TR'));
      const missingSubjects = Array.from(usedSubjects)
        .filter(s => s && s !== 'Diğer' && s !== 'Yanlışlarım' && s !== 'Genel Deneme Sınavları')
        .map(normalizeText)
        .filter(s => !currentSubjLower.includes(s.toLocaleLowerCase('tr-TR')));

      const currentTopLower = allTopics.map(t => t.toLocaleLowerCase('tr-TR'));
      const missingTopics = Array.from(usedTopics)
        .filter(t => t && t !== 'Genel')
        .map(normalizeText)
        .filter(t => !currentTopLower.includes(t.toLocaleLowerCase('tr-TR')));

      if (missingSubjects.length > 0) {
        await updateSubjects([...new Set([...allSubjects, ...missingSubjects])]);
      }

      if (missingTopics.length > 0) {
        await updateTopics([...new Set([...allTopics, ...missingTopics])]);
      }

      // Cleanup allTopics
      const cleanedTopics = allTopics.filter(t => isNaN(Number(t)));
      if (cleanedTopics.length !== allTopics.length) {
        await updateTopics(cleanedTopics);
      }
    };

    syncCurriculum();
  }, [tests, bankQuestions, trackedBooks, loading, allSubjects, allTopics, curriculumMap]);

  const filteredGroupedTopics = useMemo(() => {
    const result: { subject: string, topics: string[], isOrphan?: boolean }[] = [];
    const usedTopicsGlobal = new Set<string>();

    allSubjects.sort((a,b) => a.localeCompare(b, 'tr')).forEach(subj => {
      let topicsForSubj = Array.from(hierarchyMap.get(subj) || new Set<string>())
        .filter(t => allTopics.includes(t))
        .sort((a, b) => a.localeCompare(b, 'tr'));

      topicsForSubj.forEach(t => usedTopicsGlobal.add(t));

      const matchSubj = subj.toLowerCase().includes(searchTerm.toLowerCase());
      if (!matchSubj && searchTerm) {
        topicsForSubj = topicsForSubj.filter(t => t.toLowerCase().includes(searchTerm.toLowerCase()));
      }

      if (matchSubj || topicsForSubj.length > 0) {
        result.push({ subject: subj, topics: topicsForSubj });
      }
    });

    let orphanTopics = allTopics
      .filter(t => !usedTopicsGlobal.has(t))
      .sort((a, b) => a.localeCompare(b, 'tr'));

    if (searchTerm) {
      orphanTopics = orphanTopics.filter(t => t.toLowerCase().includes(searchTerm.toLowerCase()));
    }

    if (orphanTopics.length > 0 || "kategorisiz serbest konular".includes(searchTerm.toLowerCase())) {
      result.push({ subject: "Kategorisiz / Serbest Konular", topics: orphanTopics, isOrphan: true });
    }

    return result;
  }, [allSubjects, allTopics, hierarchyMap, searchTerm]);

  const handleSaveNew = async () => {
    if (!newItemName.trim()) return;
    
    try {
      if (addModal.type === "bulk-topic") {
        const rawTopics = newItemName.split(/[\n,]+/).map(t => t.trim()).filter(Boolean);
        const normalizedTopics = rawTopics.map(normalizeText);
        
        const newTopicsToAdd = normalizedTopics.filter(
          nt => !allTopics.some(t => t.toLocaleLowerCase('tr-TR') === nt.toLocaleLowerCase('tr-TR'))
        );
        
        const uniqueNewTopics = [...new Set(newTopicsToAdd)];
        
        if (uniqueNewTopics.length === 0) {
          throw new Error("Girdiğiniz konular zaten mevcut veya geçersiz.");
        }
        
        await updateTopics([...allTopics, ...uniqueNewTopics]);
        
        if (selectedSubject) {
          const newLinks = uniqueNewTopics.map(t => ({ subject: selectedSubject, topic: t }));
          setLocalLinks(prev => [...prev, ...newLinks]);
          
          const currentMapped = curriculumMap[selectedSubject] || [];
          const updatedMap = {
            ...curriculumMap,
            [selectedSubject]: [...new Set([...currentMapped, ...uniqueNewTopics])]
          };
          await updateCurriculumMap(updatedMap);
        }

        Alert.alert("Konular Eklendi", `${uniqueNewTopics.length} adet yeni konu eklendi.`);
      } 
      else if (addModal.type === "subject") {
        const normalizedName = normalizeText(newItemName);
        if (allSubjects.some(s => s.toLocaleLowerCase('tr-TR') === normalizedName.toLocaleLowerCase('tr-TR'))) {
          throw new Error("Bu ders zaten mevcut.");
        }
        await updateSubjects([...allSubjects, normalizedName]);
        Alert.alert("Ders Eklendi", `'${normalizedName}' başarıyla kaydedildi.`);
      } 
      else {
        const normalizedName = normalizeText(newItemName);
        if (allTopics.some(t => t.toLocaleLowerCase('tr-TR') === normalizedName.toLocaleLowerCase('tr-TR'))) {
          throw new Error("Bu konu zaten mevcut.");
        }
        await updateTopics([...allTopics, normalizedName]);

        if (selectedSubject) {
          setLocalLinks(prev => [...prev, { subject: selectedSubject, topic: normalizedName }]);
          const currentMapped = curriculumMap[selectedSubject] || [];
          const updatedMap = {
            ...curriculumMap,
            [selectedSubject]: [...new Set([...currentMapped, normalizedName])]
          };
          await updateCurriculumMap(updatedMap);
        }

        Alert.alert("Konu Eklendi", `'${normalizedName}' eklendi.`);
      }

      setAddModal({ ...addModal, isOpen: false });
      setNewItemName("");
      setSelectedSubject("");
    } catch (e: any) {
      Alert.alert("Hata", e.message);
    }
  };

  const handleUpdateItem = async () => {
    if (!editingItem || !editingItem.current.trim()) return;
    const normalizedCurrent = normalizeText(editingItem.current);
    const { original, type } = editingItem;
    
    if (original.toLocaleLowerCase('tr-TR') === normalizedCurrent.toLocaleLowerCase('tr-TR') && original === normalizedCurrent) { 
      setEditingItem(null); 
      return; 
    }

    try {
      if (type === "subject") {
        if (allSubjects.some(s => s !== original && s.toLocaleLowerCase('tr-TR') === normalizedCurrent.toLocaleLowerCase('tr-TR'))) {
          throw new Error("Bu isimde bir ders zaten var.");
        }
        const newList = allSubjects.map(s => s === original ? normalizedCurrent : s);
        await updateSubjects(newList);
        
        const updatedMap = { ...curriculumMap };
        if (updatedMap[original]) {
          updatedMap[normalizedCurrent] = updatedMap[original];
          delete updatedMap[original];
          await updateCurriculumMap(updatedMap);
        }

        setLocalLinks(prev => prev.map(l => l.subject === original ? { ...l, subject: normalizedCurrent } : l));
        
      } else {
        if (allTopics.some(t => t !== original && t.toLocaleLowerCase('tr-TR') === normalizedCurrent.toLocaleLowerCase('tr-TR'))) {
          throw new Error("Bu isimde bir konu zaten var.");
        }
        const newList = allTopics.map(t => t === original ? normalizedCurrent : t);
        await updateTopics(newList);
        
        const updatedMap = { ...curriculumMap };
        Object.keys(updatedMap).forEach(subj => {
          updatedMap[subj] = updatedMap[subj].map(topic => topic === original ? normalizedCurrent : topic);
        });
        await updateCurriculumMap(updatedMap);

        setLocalLinks(prev => prev.map(l => l.topic === original ? { ...l, topic: normalizedCurrent } : l));
      }
      setEditingItem(null);
    } catch (e: any) {
      Alert.alert("Düzenleme Hatası", e.message);
    }
  };

  const handleDeleteItem = async (name: string, type: 'subject' | 'topic') => {
    Alert.alert("Emin Misiniz?", `Bu ${type === 'subject' ? 'dersi' : 'konuyu'} silmek istediğinize emin misiniz?`, [
      { text: "İptal", style: "cancel" },
      { text: "Sil", style: "destructive", onPress: async () => {
          try {
            if (type === 'subject') {
              const newList = allSubjects.filter(s => s !== name);
              await updateSubjects(newList);
              setLocalLinks(prev => prev.filter(l => l.subject !== name));
              
              const updatedMap = { ...curriculumMap };
              delete updatedMap[name];
              await updateCurriculumMap(updatedMap);
            } else {
              const newList = allTopics.filter(t => t !== name);
              await updateTopics(newList);
              setLocalLinks(prev => prev.filter(l => l.topic !== name));
              
              const updatedMap = { ...curriculumMap };
              Object.keys(updatedMap).forEach(subj => {
                updatedMap[subj] = updatedMap[subj].filter(topic => topic !== name);
              });
              await updateCurriculumMap(updatedMap);
            }
          } catch (e) {
            Alert.alert("Hata", "Silme işlemi sırasında bir hata oluştu.");
          }
      }}
    ]);
  };

  const openModal = (type: 'subject' | 'topic' | 'bulk-topic', prefillSubject: string = "") => {
    setAddModal({ isOpen: true, type });
    setNewItemName("");
    setSelectedSubject(prefillSubject);
  };

  const toggleSubject = (subj: string) => {
    setExpandedSubjects(prev => ({ ...prev, [subj]: prev[subj] === undefined ? false : !prev[subj] })); // Default logic is true if undefined, wait
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 justify-center items-center bg-slate-50 dark:bg-slate-950">
        <ActivityIndicator size="large" color="#4f46e5" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-slate-50 dark:bg-slate-950">
      <Stack.Screen options={{ headerShown: false }} />
      
      {/* HEADER */}
      <View className="p-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex-row justify-between items-center z-10 shadow-sm">
        <TouchableOpacity onPress={() => router.back()} className="w-10 h-10 items-center justify-center bg-slate-100 dark:bg-slate-800 rounded-full">
          <ChevronLeft size={24} color="#64748b" />
        </TouchableOpacity>
        <View className="flex-1 ml-4">
          <Text className="text-xl font-extrabold text-slate-900 dark:text-white leading-none">Müfredat Yönetimi</Text>
          <Text className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest mt-1">Ders ve Konu Hiyerarşisi</Text>
        </View>
        <TouchableOpacity onPress={() => openModal('subject')} className="w-10 h-10 items-center justify-center bg-indigo-600 rounded-full shadow-lg shadow-indigo-500/30">
          <Plus size={20} color="white" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
        
        {/* Search & Stats */}
        <View className="bg-white dark:bg-slate-900 rounded-3xl p-5 mb-6 shadow-sm border border-slate-200 dark:border-slate-800">
          <View className="flex-row items-center mb-4">
            <View className="w-10 h-10 bg-indigo-50 dark:bg-indigo-900/30 rounded-full items-center justify-center mr-3">
              <FolderOpen size={20} color="#4f46e5" />
            </View>
            <View>
              <Text className="text-lg font-bold text-slate-800 dark:text-slate-100">Kayıtlı İçerikler</Text>
              <Text className="text-xs font-semibold text-slate-500">{allSubjects.length} Ders, {allTopics.length} Konu</Text>
            </View>
          </View>
          <View className="relative">
            <View className="absolute left-4 top-0 bottom-0 justify-center z-10">
              <Search size={18} color="#94a3b8" />
            </View>
            <TextInput
              placeholder="Ders veya konu ara..."
              placeholderTextColor="#94a3b8"
              value={searchTerm}
              onChangeText={setSearchTerm}
              className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl pl-12 pr-4 py-3 text-slate-800 dark:text-white font-semibold text-sm"
            />
          </View>
        </View>

        {/* Subjects & Topics */}
        {filteredGroupedTopics.map((group, index) => {
          const isExpanded = expandedSubjects[group.subject] !== false; // Default expanded

          return (
            <View key={group.subject || index} className="mb-4 bg-white dark:bg-slate-900 rounded-3xl overflow-hidden shadow-sm border border-slate-200 dark:border-slate-800">
              
              {/* Subject Header */}
              <TouchableOpacity 
                onPress={() => toggleSubject(group.subject)}
                className="flex-row items-center justify-between p-4 bg-slate-50 dark:bg-slate-900"
              >
                <View className="flex-row items-center flex-1 pr-4">
                  <View className={`w-10 h-10 rounded-full items-center justify-center mr-3 ${group.isOrphan ? 'bg-orange-50 dark:bg-orange-900/30' : 'bg-indigo-50 dark:bg-indigo-900/30'}`}>
                    {group.isOrphan ? <Hash size={20} color="#f97316" /> : <BookMarked size={20} color="#4f46e5" />}
                  </View>
                  <View className="flex-1">
                    <Text className="font-bold text-slate-800 dark:text-white text-base" numberOfLines={1}>{group.subject}</Text>
                    <Text className="text-xs font-semibold text-slate-500">{group.topics.length} Konu</Text>
                  </View>
                </View>
                
                <View className="flex-row items-center">
                  {!group.isOrphan && (
                    <>
                      <TouchableOpacity onPress={() => { setEditingItem({ type: 'subject', original: group.subject, current: group.subject }); }} className="w-8 h-8 items-center justify-center bg-slate-100 dark:bg-slate-800 rounded-full mr-2">
                        <Edit2 size={14} color="#64748b" />
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => handleDeleteItem(group.subject, 'subject')} className="w-8 h-8 items-center justify-center bg-rose-50 dark:bg-rose-900/30 rounded-full mr-3">
                        <Trash2 size={14} color="#ef4444" />
                      </TouchableOpacity>
                    </>
                  )}
                  {isExpanded ? <ChevronDown size={20} color="#94a3b8" /> : <ChevronRight size={20} color="#94a3b8" />}
                </View>
              </TouchableOpacity>

              {/* Topics List */}
              {isExpanded && (
                <View className="p-4 pt-2 border-t border-slate-100 dark:border-slate-800">
                  {group.topics.length === 0 ? (
                    <Text className="text-slate-400 text-xs text-center py-4 italic">Bu derse ait konu bulunmuyor.</Text>
                  ) : (
                    group.topics.map((topic, tIndex) => (
                      <View key={tIndex} className="flex-row items-center justify-between py-3 border-b border-slate-100 dark:border-slate-800/50 last:border-0">
                        <View className="flex-row items-center flex-1 pr-4">
                          <View className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700 mr-3" />
                          <Text className="text-slate-700 dark:text-slate-300 text-sm font-medium flex-1">{topic}</Text>
                        </View>
                        <View className="flex-row items-center">
                          <TouchableOpacity onPress={() => { setEditingItem({ type: 'topic', original: topic, current: topic }); }} className="w-8 h-8 items-center justify-center rounded-full">
                            <Edit2 size={14} color="#94a3b8" />
                          </TouchableOpacity>
                          <TouchableOpacity onPress={() => handleDeleteItem(topic, 'topic')} className="w-8 h-8 items-center justify-center rounded-full ml-1">
                            <Trash2 size={14} color="#f87171" />
                          </TouchableOpacity>
                        </View>
                      </View>
                    ))
                  )}

                  {!group.isOrphan && (
                    <View className="flex-row gap-2 mt-4">
                      <TouchableOpacity onPress={() => openModal('topic', group.subject)} className="flex-1 flex-row items-center justify-center py-2.5 bg-slate-100 dark:bg-slate-800 rounded-xl">
                        <Plus size={16} color="#4f46e5" className="mr-2" />
                        <Text className="text-xs font-bold text-indigo-600 dark:text-indigo-400">Yeni Konu</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => openModal('bulk-topic', group.subject)} className="flex-1 flex-row items-center justify-center py-2.5 bg-slate-100 dark:bg-slate-800 rounded-xl">
                        <ListPlus size={16} color="#4f46e5" className="mr-2" />
                        <Text className="text-xs font-bold text-indigo-600 dark:text-indigo-400">Toplu Ekle</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>

      {/* Add Modal */}
      <Modal visible={addModal.isOpen} transparent animationType="fade" onRequestClose={() => setAddModal({ ...addModal, isOpen: false })}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1">
          <View className="flex-1 bg-black/60 justify-center items-center p-4">
            <View className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800">
              <Text className="text-lg font-bold text-slate-900 dark:text-white mb-2">
                {addModal.type === 'subject' ? 'Yeni Ders Ekle' : addModal.type === 'bulk-topic' ? 'Toplu Konu Ekle' : 'Yeni Konu Ekle'}
              </Text>
              <Text className="text-xs text-slate-500 mb-6">
                {addModal.type === 'subject' ? 'Müfredata yeni bir ders adı ekleyin.' : 
                 addModal.type === 'bulk-topic' ? (selectedSubject ? `'${selectedSubject}' dersine virgül veya satır atlayarak birden fazla konu ekleyin.` : 'Virgül veya satır atlayarak birden fazla konu ekleyin.') : 
                 (selectedSubject ? `'${selectedSubject}' dersine yeni bir konu ekleyin.` : 'Müfredata yeni bir konu ekleyin.')}
              </Text>
              
              <TextInput
                placeholder={addModal.type === 'subject' ? "Örn: Matematik" : addModal.type === 'bulk-topic' ? "Konu 1, Konu 2\nKonu 3" : "Örn: Üslü Sayılar"}
                placeholderTextColor="#94a3b8"
                value={newItemName}
                onChangeText={setNewItemName}
                multiline={addModal.type === 'bulk-topic'}
                numberOfLines={addModal.type === 'bulk-topic' ? 4 : 1}
                className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3 text-slate-800 dark:text-white font-semibold text-sm"
                style={addModal.type === 'bulk-topic' ? { minHeight: 100, textAlignVertical: 'top' } : {}}
              />

              <View className="flex-row gap-3 mt-8">
                <TouchableOpacity onPress={() => setAddModal({ ...addModal, isOpen: false })} className="flex-1 py-3 rounded-xl items-center bg-slate-100 dark:bg-slate-800">
                  <Text className="font-bold text-slate-600 dark:text-slate-300">İptal</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleSaveNew} className="flex-1 py-3 rounded-xl items-center bg-indigo-600">
                  <Text className="font-bold text-white">Ekle</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Edit Modal */}
      <Modal visible={!!editingItem} transparent animationType="fade" onRequestClose={() => setEditingItem(null)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1">
          <View className="flex-1 bg-black/60 justify-center items-center p-4">
            <View className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800">
              <Text className="text-lg font-bold text-slate-900 dark:text-white mb-2">
                {editingItem?.type === 'subject' ? 'Dersi Düzenle' : 'Konuyu Düzenle'}
              </Text>
              
              <TextInput
                value={editingItem?.current}
                onChangeText={(text) => setEditingItem(prev => prev ? { ...prev, current: text } : null)}
                className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3 text-slate-800 dark:text-white font-semibold text-sm mt-4"
              />

              <View className="flex-row gap-3 mt-8">
                <TouchableOpacity onPress={() => setEditingItem(null)} className="flex-1 py-3 rounded-xl items-center bg-slate-100 dark:bg-slate-800">
                  <Text className="font-bold text-slate-600 dark:text-slate-300">İptal</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleUpdateItem} className="flex-1 py-3 rounded-xl items-center bg-indigo-600">
                  <Text className="font-bold text-white">Kaydet</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}
