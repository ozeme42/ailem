import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Image, TextInput, Modal, Switch, Alert, KeyboardAvoidingView, Platform, StyleSheet } from 'react-native';
import { useColorScheme } from 'nativewind';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useEffect, useState, useMemo } from 'react';
import { useRouter, Stack } from 'expo-router';
import { ChevronLeft, Search, Plus, X, Trash2, Edit, Check, Settings, BookOpen, Layers, Star, ImagePlus } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';

import { useAuth } from '../context/auth-context';
import { 
  onBooksUpdate, 
  onTagsUpdate, 
  updateBook, 
  deleteBook, 
  updateTags, 
  deleteTag, 
  addBook,
  addBookToMemberLibrary, 
  onUserLibrariesUpdate 
} from '../lib/dataService';
import { Book, UserLibrary } from '../lib/data';
import NewBookForm from '../components/NewBookForm';

const themeColors = {
  PAGE_BG: 'bg-[#e8f8f5] dark:bg-[#0b1b18]',
  CARD_BG: 'bg-white/60 dark:bg-white/5',
  BORDER: 'border-white/80 dark:border-white/10',
  TEXT_MAIN: 'text-slate-800 dark:text-slate-100',
  TEXT_MUTED: 'text-slate-500 dark:text-slate-400',
};

export default function LibraryArchiveScreen() {
  const router = useRouter();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const { familyId, familyMembers } = useAuth();

  // State
  const [books, setBooks] = useState<Book[]>([]);
  const [allTags, setAllTags] = useState<string[]>([]);
  const [userLibraries, setUserLibraries] = useState<UserLibrary[]>([]);
  const [loading, setLoading] = useState(true);

  const [view, setView] = useState<'books' | 'shelves'>('books');
  const [activeTab, setActiveTab] = useState<'adults' | 'children'>('adults');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Tag Creation
  const [newTagName, setNewTagName] = useState("");

  // Modals
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  
  // Selected Book
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);

  // Edit Book Form
  const [editTitle, setEditTitle] = useState("");
  const [editAuthor, setEditAuthor] = useState("");
  const [editPageCount, setEditPageCount] = useState("");
  const [editImage, setEditImage] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editIsForChildren, setEditIsForChildren] = useState(false);
  const [editTags, setEditTags] = useState<string[]>([]);
  const [editTagInput, setEditTagInput] = useState("");

  useEffect(() => {
    let unsubscribeBooks = () => {};
    let unsubscribeTags = () => {};
    let unsubscribeLibraries = () => {};

    try {
      unsubscribeBooks = onBooksUpdate(setBooks);
      unsubscribeTags = onTagsUpdate("libraryTags", setAllTags);
      if (familyId) {
        unsubscribeLibraries = onUserLibrariesUpdate(familyId, setUserLibraries);
      }
      setLoading(false);
    } catch (e) {
      console.log('Error loading archive data:', e);
      setLoading(false);
    }

    return () => {
      unsubscribeBooks();
      unsubscribeTags();
      unsubscribeLibraries();
    };
  }, [familyId]);

  // Calculations
  const filteredBooks = useMemo(() => {
    return books.filter(book => {
      const q = searchQuery.toLowerCase();
      const matchesSearch = q === "" || 
        book.title.toLowerCase().includes(q) || 
        (book.author && book.author.toLowerCase().includes(q));
      
      const matchesTab = activeTab === 'children' ? book.isForChildren : !book.isForChildren;
      
      return matchesSearch && matchesTab;
    });
  }, [books, searchQuery, activeTab]);

  // Group books by shelf
  const booksByShelf = useMemo(() => {
     const grouped = new Map<string, Book[]>();
     
     allTags.forEach(tag => grouped.set(tag, []));
     grouped.set("Rafsız Kitaplar", []);

     filteredBooks.forEach(book => {
         if (!book.tags || book.tags.length === 0) {
             grouped.get("Rafsız Kitaplar")?.push(book);
         } else {
             book.tags.forEach(tag => {
                 if (grouped.has(tag)) {
                     grouped.get(tag)?.push(book);
                 } else {
                     grouped.set(tag, [book]);
                 }
             });
         }
     });

     return grouped;
  }, [filteredBooks, allTags]);

  // Get assignments map for selectedBook: memberId -> boolean (is in library)
  const bookAssignments = useMemo(() => {
    const map = new Map<string, boolean>();
    if (!selectedBook) return map;
    
    familyMembers.forEach(member => {
      const memberLib = userLibraries.find(lib => lib.memberId === member.id);
      const isAssigned = memberLib?.books?.some(b => b.bookId === selectedBook.id) || false;
      map.set(member.id, isAssigned);
    });
    
    return map;
  }, [selectedBook, familyMembers, userLibraries]);

  const handleAssignToMember = async (memberId: string) => {
    if (!familyId || !selectedBook) return;
    try {
      const res = await addBookToMemberLibrary(familyId, memberId, selectedBook.id);
      const member = familyMembers.find(m => m.id === memberId);
      if (res === 'added') {
        Alert.alert("Başarılı", `Kitap ${member?.name} kütüphanesine (Sıradakiler) eklendi.`);
      } else {
        Alert.alert("Bilgi", `Bu kitap zaten ${member?.name} kütüphanesinde bulunuyor.`);
      }
    } catch (e) {
      Alert.alert("Hata", "Kitap atama sırasında hata oluştu.");
    }
  };

  const handleAddNewBook = async (formData: any) => {
    try {
      const newBook = {
        ...formData,
        type: "Kitap",
        rating: 0,
        image: formData.image || 'https://placehold.co/300x450.png',
      };
      await addBook(newBook);

      if (formData.tags && formData.tags.length > 0) {
        const uniqueTags = Array.from(new Set([...allTags, ...formData.tags]));
        await updateTags("libraryTags", uniqueTags);
      }

      setIsAddModalOpen(false);
      Alert.alert("Başarılı", `"${formData.title}" başarıyla veritabanına eklendi.`);
    } catch (e) {
      Alert.alert("Hata", "Yeni kitap eklenirken hata oluştu.");
    }
  };

  const pickEditImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [2, 3],
        quality: 0.5,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        const base64Image = `data:image/jpeg;base64,${asset.base64}`;
        setEditImage(base64Image);
      }
    } catch (error) {
      Alert.alert("Hata", "Resim seçilirken bir hata oluştu.");
    }
  };

  const handleSaveEdit = async () => {
    if (!selectedBook) return;
    if (!editTitle.trim()) {
      Alert.alert("Hata", "Lütfen kitap adını girin.");
      return;
    }

    try {
      const updateData = {
        title: editTitle,
        author: editAuthor,
        pageCount: Number(editPageCount) || 0,
        image: editImage || 'https://placehold.co/300x450.png',
        description: editDescription,
        isForChildren: editIsForChildren,
        tags: editTags
      };

      await updateBook(selectedBook.id, updateData);

      if (editTags.length > 0) {
        const uniqueTags = Array.from(new Set([...allTags, ...editTags]));
        await updateTags("libraryTags", uniqueTags);
      }

      setIsEditModalOpen(false);
      setSelectedBook(null);
      Alert.alert("Başarılı", "Kitap başarıyla güncellendi.");
    } catch (e) {
      Alert.alert("Hata", "Kitap güncellenirken hata oluştu.");
    }
  };

  const handleDeleteBookConfirm = async (bookId: string, title: string) => {
    Alert.alert(
      "Kitabı Sil",
      `"${title}" eserini veritabanından tamamen silmek istediğinize emin misiniz? Bu işlem geri alınamaz!`,
      [
        { text: "Vazgeç", style: "cancel" },
        { 
          text: "Sil", 
          style: "destructive",
          onPress: async () => {
            try {
              await deleteBook(bookId);
              setIsDetailModalOpen(false);
              setSelectedBook(null);
              Alert.alert("Başarılı", "Kitap veritabanından silindi.");
            } catch(e) {
              Alert.alert("Hata", "Kitap silinirken bir sorun oluştu.");
            }
          }
        }
      ]
    );
  };

  const handleCreateTag = async () => {
    if (!newTagName.trim()) {
      Alert.alert("Hata", "Lütfen bir raf adı girin.");
      return;
    }

    if (allTags.includes(newTagName.trim())) {
      Alert.alert("Bilgi", "Bu raf zaten bulunuyor.");
      return;
    }

    try {
      const updated = [...allTags, newTagName.trim()];
      await updateTags("libraryTags", updated);
      setNewTagName("");
      Alert.alert("Başarılı", "Yeni raf başarıyla oluşturuldu.");
    } catch(e) {
      Alert.alert("Hata", "Raf oluşturulurken hata oluştu.");
    }
  };

  const handleDeleteTag = async (tag: string) => {
    Alert.alert(
      "Rafı Sil",
      `"${tag}" rafını silmek istediğinize emin misiniz? Kitaplardaki etiketler silinmez.`,
      [
        { text: "İptal", style: "cancel" },
        { 
          text: "Sil", 
          style: "destructive",
          onPress: async () => {
            try {
              await deleteTag("libraryTags", tag, "");
            } catch (e) {
              Alert.alert("Hata", "Raf silinirken sorun oluştu.");
            }
          }
        }
      ]
    );
  };

  const handleOpenEdit = (book: Book) => {
    setSelectedBook(book);
    setEditTitle(book.title);
    setEditAuthor(book.author || "");
    setEditPageCount(book.pageCount ? String(book.pageCount) : "");
    setEditImage(book.image || "");
    setEditDescription(book.description || "");
    setEditIsForChildren(!!book.isForChildren);
    setEditTags(book.tags || []);
    setEditTagInput("");
    
    setIsDetailModalOpen(false);
    setIsEditModalOpen(true);
  };

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-[#F2F2F7] dark:bg-black">
        <ActivityIndicator size="large" color="#16a085" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-[#e8f8f5] dark:bg-[#0b1b18]">
      <Stack.Screen options={{ headerShown: false }} />
      
      {/* Background Glowing Orbs (Premium Colorful Theme) */}
      <View className="absolute inset-0 pointer-events-none overflow-hidden" style={StyleSheet.absoluteFill}>
        <View style={{
          position: 'absolute',
          top: -160,
          right: -160,
          width: 384,
          height: 384,
          borderRadius: 192,
          backgroundColor: isDark ? 'rgba(22, 160, 133, 0.06)' : 'rgba(22, 160, 133, 0.15)',
          transform: [{ scale: 2.0 }],
          opacity: 0.8,
        }} />
        <View style={{
          position: 'absolute',
          bottom: -160,
          left: -160,
          width: 384,
          height: 384,
          borderRadius: 192,
          backgroundColor: isDark ? 'rgba(46, 204, 113, 0.06)' : 'rgba(46, 204, 113, 0.15)',
          transform: [{ scale: 2.0 }],
          opacity: 0.8,
        }} />
        <View style={{
          position: 'absolute',
          top: '33%',
          left: '25%',
          width: 192,
          height: 192,
          borderRadius: 96,
          backgroundColor: isDark ? 'rgba(52, 152, 219, 0.04)' : 'rgba(52, 152, 219, 0.12)',
          transform: [{ scale: 2.5 }],
          opacity: 0.6,
        }} />
      </View>

      {/* Header */}
      <View className="z-40 pb-2" style={{
        backgroundColor: isDark ? 'rgba(28, 28, 30, 0.4)' : 'rgba(255, 255, 255, 0.4)',
        borderBottomColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.6)',
        borderBottomWidth: 1 
      }}>
        <SafeAreaView edges={['top']} className="m-0 p-0" />
        <View className="flex-row items-center justify-between px-4 h-12">
            <TouchableOpacity onPress={() => router.back()} className="w-10 h-10 items-center justify-center -ml-3 active:opacity-50">
                <ChevronLeft size={28} color="#16a085" />
            </TouchableOpacity>
            
            <View className="absolute left-0 right-0 text-center pointer-events-none">
                <Text className="text-[17px] font-semibold tracking-tight text-slate-800 dark:text-slate-100">Arşiv & Veritabanı</Text>
                <Text className="text-[10px] text-slate-500 dark:text-slate-400 font-bold">Aile Kütüphanesi</Text>
            </View>

            <TouchableOpacity 
              onPress={() => setView(view === 'books' ? 'shelves' : 'books')}
              className="w-9 h-9 items-center justify-center rounded-full shadow-sm border"
              style={{
                backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(255, 255, 255, 0.65)',
                borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.8)',
              }}
            >
                {view === 'books' ? <Settings size={18} color="#16a085" /> : <BookOpen size={18} color="#16a085" />}
            </TouchableOpacity>
        </View>
      </View>

      {/* BOOKS VIEW */}
      {view === 'books' ? (
        <View className="flex-1">
            {/* Search and Tabs */}
            <View className="px-4 py-3 gap-3" style={{
              backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(255, 255, 255, 0.65)',
              borderBottomColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.8)',
              borderBottomWidth: 1
            }}>
                <View className="flex-row items-center rounded-xl px-3 py-1 border" style={{
                  backgroundColor: isDark ? 'rgba(0, 0, 0, 0.4)' : 'rgba(226, 232, 240, 0.5)',
                  borderColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(203, 213, 225, 0.3)',
                }}>
                   <Search size={18} color={isDark ? '#94a3b8' : '#64748b'} />
                   <TextInput 
                     placeholder="Kitap veya yazar ara..."
                     placeholderTextColor={isDark ? '#475569' : '#94a3b8'}
                     value={searchQuery}
                     onChangeText={setSearchQuery}
                     className="flex-1 ml-2 text-[#1C1C1E] dark:text-white h-10 font-medium text-sm"
                   />
                </View>

                {/* Yetişkin / Çocuk Tabs */}
                <View className="flex-row p-1 rounded-xl border" style={{
                  backgroundColor: isDark ? 'rgba(0, 0, 0, 0.4)' : 'rgba(226, 232, 240, 0.5)',
                  borderColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(203, 213, 225, 0.3)',
                }}>
                    <TouchableOpacity 
                      onPress={() => setActiveTab('adults')}
                      className="flex-1 py-2 rounded-lg items-center"
                      style={activeTab === 'adults' ? { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'white' } : {}}
                    >
                      <Text className={activeTab === 'adults' ? "text-xs font-bold text-[#16a085]" : "text-xs font-bold text-slate-500 dark:text-slate-400"}>Yetişkin Kitapları</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      onPress={() => setActiveTab('children')}
                      className="flex-1 py-2 rounded-lg items-center"
                      style={activeTab === 'children' ? { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'white' } : {}}
                    >
                      <Text className={activeTab === 'children' ? "text-xs font-bold text-[#16a085]" : "text-xs font-bold text-slate-500 dark:text-slate-400"}>Çocuk Kitapları</Text>
                    </TouchableOpacity>
                </View>
            </View>

            {/* Books ScrollList */}
            <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
                {filteredBooks.length === 0 ? (
                    <View className="items-center justify-center py-20">
                        <View className="w-20 h-20 rounded-full items-center justify-center mb-4 shadow-sm border"
                              style={{
                                backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(255, 255, 255, 0.65)',
                                borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.8)',
                                borderWidth: 1
                              }}
                        >
                           <BookOpen size={36} color={isDark ? '#94a3b8' : '#64748b'} style={{ opacity: 0.5 }} />
                        </View>
                        <Text className="text-slate-500 dark:text-slate-400 font-bold text-sm">Filtrelere uygun kitap bulunamadı.</Text>
                    </View>
                ) : (searchQuery.length > 0) ? (
                    <View className="flex-row flex-wrap justify-between pt-2">
                        {filteredBooks.map(book => (
                            <TouchableOpacity 
                              key={book.id}
                              activeOpacity={0.7}
                              onPress={() => {
                                setSelectedBook(book);
                                setIsDetailModalOpen(true);
                              }}
                              className="w-[31%] mb-4"
                            >
                                <View className="aspect-[2/3] w-full bg-slate-200 dark:bg-slate-800 rounded-xl overflow-hidden shadow-sm relative">
                                  <Image 
                                    source={{ uri: book.image || 'https://placehold.co/300x450.png' }} 
                                    className="w-full h-full object-cover"
                                  />
                                  <View className="absolute inset-0 rounded-xl pointer-events-none border"
                                        style={{ borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.8)', borderWidth: 1 }}
                                  />
                                </View>
                                <Text className="text-xs font-bold leading-tight mt-2 text-slate-800 dark:text-slate-100" numberOfLines={2}>
                                  {book.title}
                                </Text>
                                <Text className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5" numberOfLines={1}>
                                  {book.author || 'Bilinmeyen Yazar'}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                ) : (
                    <View className="gap-8">
                       {Array.from(booksByShelf.entries()).map(([shelfName, booksInShelf]) => {
                           if (booksInShelf.length === 0) return null;
                           
                           return (
                               <View key={shelfName}>
                                   <View className="flex-row items-center justify-between mb-3 px-1">
                                       <Text className="text-lg font-bold text-slate-800 dark:text-slate-100">{shelfName}</Text>
                                       <View className="bg-slate-200 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                                         <Text className="text-[10px] font-bold text-slate-500 dark:text-slate-400">{booksInShelf.length} Kitap</Text>
                                       </View>
                                   </View>
                                   
                                   <ScrollView horizontal showsHorizontalScrollIndicator={false} className="-mx-4 px-4 pb-2">
                                       {booksInShelf.map((book, index) => (
                                           <TouchableOpacity 
                                             key={`${book.id}-${index}`}
                                             activeOpacity={0.7}
                                             onPress={() => {
                                               setSelectedBook(book);
                                               setIsDetailModalOpen(true);
                                             }}
                                             className="w-[110px] mr-4"
                                           >
                                               <View className="aspect-[2/3] w-full bg-slate-200 dark:bg-slate-800 rounded-xl overflow-hidden shadow-sm relative mb-2">
                                                 <Image 
                                                   source={{ uri: book.image || 'https://placehold.co/300x450.png' }} 
                                                   className="w-full h-full object-cover"
                                                 />
                                                 <View className="absolute inset-0 rounded-xl pointer-events-none border"
                                                       style={{ borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.8)', borderWidth: 1 }}
                                                 />
                                               </View>
                                               <Text className="text-xs font-bold leading-tight text-slate-800 dark:text-slate-100" numberOfLines={2}>
                                                 {book.title}
                                               </Text>
                                               <Text className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5" numberOfLines={1}>
                                                 {book.author || 'Bilinmeyen Yazar'}
                                               </Text>
                                           </TouchableOpacity>
                                       ))}
                                   </ScrollView>
                               </View>
                           )
                       })}
                    </View>
                )}
            </ScrollView>
        </View>
      ) : (
        /* SHELVES MANAGEMENT VIEW */
        <View className="flex-1 p-4">
            
            {/* New shelf input */}
            <View className="p-4 rounded-3xl border mb-6 flex-row items-center gap-3" style={{
              backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(255, 255, 255, 0.65)',
              borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.8)',
              borderWidth: 1
            }}>
                <TextInput 
                  placeholder="Yeni raf adı..."
                  placeholderTextColor={isDark ? '#475569' : '#94a3b8'}
                  value={newTagName}
                  onChangeText={setNewTagName}
                  className="flex-1 h-11 rounded-xl px-3 text-[#1C1C1E] dark:text-white font-medium border"
                  style={{
                    backgroundColor: isDark ? 'rgba(0, 0, 0, 0.4)' : 'rgba(226, 232, 240, 0.5)',
                    borderColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(203, 213, 225, 0.3)',
                  }}
                />
                <TouchableOpacity 
                  onPress={handleCreateTag}
                  className="h-11 px-4 bg-[#16a085] rounded-xl justify-center active:opacity-85"
                >
                  <Text className="text-white font-bold text-sm">Oluştur</Text>
                </TouchableOpacity>
            </View>

            <Text className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3 px-2">Aktif Kütüphane Rafları ({allTags.length})</Text>

            {/* Shelves List */}
            <ScrollView contentContainerStyle={{ paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
                {allTags.length === 0 ? (
                  <View className="items-center py-10">
                      <Layers size={24} color={isDark ? '#94a3b8' : '#64748b'} style={{ opacity: 0.5 }} />
                      <Text className="text-xs text-slate-500 dark:text-slate-400 mt-2">Kayıtlı raf bulunmuyor.</Text>
                  </View>
                ) : (
                  allTags.sort().map(tag => (
                    <View key={tag} className="p-4 rounded-2xl mb-2 border flex-row justify-between items-center shadow-sm" style={{
                      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(255, 255, 255, 0.65)',
                      borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.8)',
                      borderWidth: 1
                    }}>
                      <Text className="font-bold text-sm text-slate-800 dark:text-slate-100">{tag}</Text>
                      <TouchableOpacity onPress={() => handleDeleteTag(tag)} className="w-8 h-8 rounded-full bg-rose-50 dark:bg-rose-950/30 items-center justify-center">
                        <Trash2 size={14} color="#f43f5e" />
                      </TouchableOpacity>
                    </View>
                  ))
                )}
            </ScrollView>
        </View>
      )}

      {/* MODAL: BOOK ARCHIVE DETAILS */}
      <Modal visible={isDetailModalOpen} transparent={true} animationType="slide">
          <View className="flex-1 bg-black/50 justify-end">
              <TouchableOpacity className="absolute inset-0" activeOpacity={1} onPress={() => setIsDetailModalOpen(false)} />
              <View className="bg-white dark:bg-[#1C1C1E] w-full h-[85%] rounded-t-[32px] overflow-hidden">
                  {selectedBook && (
                      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
                          {/* Blurred Cover Header */}
                          <View className="w-full h-[240px] relative items-center justify-end pb-6 bg-slate-100 dark:bg-slate-800">
                              <Image 
                                  source={{ uri: selectedBook.image || 'https://placehold.co/300x450.png' }} 
                                  className="absolute inset-0 w-full h-full opacity-50"
                                  blurRadius={20}
                              />
                              <View className="absolute inset-0 bg-black/20" />
                              
                              <View className="relative z-10 w-28 h-40 rounded shadow-2xl overflow-hidden border border-white/20">
                                  <Image source={{ uri: selectedBook.image || 'https://placehold.co/300x450.png' }} className="w-full h-full object-cover" />
                              </View>

                              {/* Close Button */}
                              <TouchableOpacity 
                                  onPress={() => setIsDetailModalOpen(false)}
                                  className="absolute top-6 right-6 w-8 h-8 rounded-full bg-black/40 items-center justify-center z-20"
                              >
                                  <X size={18} color="white" />
                              </TouchableOpacity>
                          </View>

                          <View className="p-6 pt-4 flex-col gap-4">
                              <View className="items-center">
                                  <Text className="text-xl font-bold text-center leading-tight text-slate-800 dark:text-slate-100" numberOfLines={2}>
                                      {selectedBook.title}
                                  </Text>
                                  <Text className="text-md font-medium text-[#16a085] text-center mt-1">
                                      {selectedBook.author || 'Bilinmeyen Yazar'}
                                  </Text>
                              </View>

                              {/* Info Badges */}
                              <View className="flex-row justify-center items-center py-3 border-y border-black/5 dark:border-white/5 my-1">
                                  <View className="items-center px-4 border-r border-black/5 dark:border-white/5">
                                      <Text className="text-[9px] text-slate-500 dark:text-slate-400 uppercase font-bold tracking-wider mb-1">Puan</Text>
                                      <View className="flex-row items-center gap-1">
                                          <Text className="font-bold text-sm text-slate-800 dark:text-slate-100">{selectedBook.rating || '0'}</Text>
                                          <Star size={12} color="#FF9500" fill="#FF9500" />
                                      </View>
                                  </View>
                                  
                                  <View className="items-center px-4 border-r border-black/5 dark:border-white/5">
                                      <Text className="text-[9px] text-slate-500 dark:text-slate-400 uppercase font-bold tracking-wider mb-1">Sayfa</Text>
                                      <Text className="font-bold text-sm text-slate-800 dark:text-slate-100">{selectedBook.pageCount || '-'}</Text>
                                  </View>

                                  <View className="items-center px-4">
                                      <Text className="text-[9px] text-slate-500 dark:text-slate-400 uppercase font-bold tracking-wider mb-1">Çocuk</Text>
                                      <Text className="font-bold text-sm text-slate-800 dark:text-slate-100">{selectedBook.isForChildren ? 'Evet' : 'Hayır'}</Text>
                                  </View>
                              </View>

                              {/* ASSIGN TO FAMILY MEMBERS */}
                              <View className="bg-slate-50 dark:bg-black/40 p-4 rounded-2xl border border-black/5 dark:border-white/5">
                                  <Text className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-3 uppercase tracking-wider">Okuma Listesine Ata</Text>
                                  
                                  {familyMembers.map(member => {
                                      const isAssigned = bookAssignments.get(member.id);
                                      return (
                                          <View key={member.id} className="flex-row justify-between items-center py-2 border-b border-black/5 dark:border-white/5 last:border-0">
                                              <View className="flex-row items-center">
                                                  <View className="w-5 h-5 rounded-full items-center justify-center mr-2 shadow-sm" style={{ backgroundColor: member.color }}>
                                                      <Text className="text-white text-[8px] font-bold">{member.name.charAt(0).toUpperCase()}</Text>
                                                  </View>
                                                  <Text className="font-bold text-xs text-slate-800 dark:text-slate-100">{member.name}</Text>
                                              </View>

                                              {isAssigned ? (
                                                  <View className="flex-row items-center gap-1 bg-emerald-50 dark:bg-emerald-950 px-2.5 py-1 rounded-full">
                                                      <Check size={10} color="#10b981" />
                                                      <Text className="text-emerald-700 dark:text-emerald-300 text-[10px] font-bold">Ekli</Text>
                                                  </View>
                                              ) : (
                                                  <TouchableOpacity 
                                                    onPress={() => handleAssignToMember(member.id)}
                                                    className="bg-[#16a085] px-3 py-1 rounded-full active:opacity-75"
                                                  >
                                                      <Text className="text-white text-[10px] font-bold">+ Ekle</Text>
                                                  </TouchableOpacity>
                                              )}
                                          </View>
                                      );
                                  })}
                              </View>

                              {/* ACTIONS */}
                              <View className="flex-row gap-3 mt-4">
                                  <TouchableOpacity 
                                    onPress={() => handleOpenEdit(selectedBook)}
                                    className="flex-1 h-12 border border-[#16a085] rounded-xl items-center justify-center flex-row gap-2 active:opacity-75"
                                  >
                                      <Edit size={16} color="#16a085" />
                                      <Text className="text-[#16a085] font-semibold text-sm">Düzenle</Text>
                                  </TouchableOpacity>

                                  <TouchableOpacity 
                                    onPress={() => handleDeleteBookConfirm(selectedBook.id, selectedBook.title)}
                                    className="flex-1 h-12 bg-rose-500 rounded-xl items-center justify-center flex-row gap-2 active:opacity-85"
                                  >
                                      <Trash2 size={16} color="white" />
                                      <Text className="text-white font-semibold text-sm">Veritabanından Sil</Text>
                                  </TouchableOpacity>
                              </View>
                          </View>
                      </ScrollView>
                  )}
              </View>
          </View>
      </Modal>

      {/* BOOK EDIT MODAL */}
      <Modal visible={isEditModalOpen} transparent={true} animationType="slide">
          <View className="flex-1 bg-black/50 justify-end">
              <TouchableOpacity className="absolute inset-0" activeOpacity={1} onPress={() => setIsEditModalOpen(false)} />
              <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
                <View className="bg-white dark:bg-[#1C1C1E] p-6 rounded-t-[32px] border-t border-black/5 dark:border-white/5 h-[80dvh]">
                    <View className="flex-row justify-between items-center mb-4">
                        <Text className="text-lg font-bold text-slate-800 dark:text-slate-100">Kitabı Düzenle</Text>
                        <TouchableOpacity onPress={() => setIsEditModalOpen(false)}>
                            <X size={20} color={isDark ? '#94a3b8' : '#64748b'} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView showsVerticalScrollIndicator={false} className="flex-1 mb-4 gap-4">
                        
                        <View className="items-center mb-2">
                             <TouchableOpacity 
                               onPress={pickEditImage}
                               activeOpacity={0.8}
                               className="w-28 h-40 rounded-xl bg-[#F2F2F7] dark:bg-[#2C2C2E] items-center justify-center overflow-hidden border border-black/5 dark:border-white/5 relative"
                             >
                                 {editImage && editImage !== 'https://placehold.co/300x450.png' ? (
                                    <>
                                      <Image source={{ uri: editImage }} className="w-full h-full" />
                                      <View className="absolute inset-0 bg-black/30 items-center justify-center opacity-0">
                                      </View>
                                    </>
                                 ) : (
                                    <View className="items-center">
                                       <ImagePlus size={28} color="#8E8E93" />
                                       <Text className="text-[#8E8E93] text-[10px] font-bold mt-1">Görsel Ekle</Text>
                                    </View>
                                 )}
                             </TouchableOpacity>
                        </View>

                        <View>
                            <Text className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">Kitap Adı</Text>
                            <TextInput 
                              placeholder="Kitap adını girin..."
                              placeholderTextColor={isDark ? '#475569' : '#94a3b8'}
                              value={editTitle}
                              onChangeText={setEditTitle}
                              className="h-11 bg-[#F2F2F7] dark:bg-black rounded-xl px-3 text-[#1C1C1E] dark:text-white font-medium"
                            />
                        </View>

                        <View>
                            <Text className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">Yazar</Text>
                            <TextInput 
                              placeholder="Yazarı girin..."
                              placeholderTextColor={isDark ? '#475569' : '#94a3b8'}
                              value={editAuthor}
                              onChangeText={setEditAuthor}
                              className="h-11 bg-[#F2F2F7] dark:bg-black rounded-xl px-3 text-[#1C1C1E] dark:text-white font-medium"
                            />
                        </View>

                        <View>
                            <Text className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">Sayfa Sayısı</Text>
                            <TextInput 
                              placeholder="Örn: 240"
                              placeholderTextColor={isDark ? '#475569' : '#94a3b8'}
                              keyboardType="number-pad"
                              value={editPageCount}
                              onChangeText={setEditPageCount}
                              className="h-11 bg-[#F2F2F7] dark:bg-black rounded-xl px-3 text-[#1C1C1E] dark:text-white font-medium"
                            />
                        </View>

                        <View>
                            <Text className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">Kapak Resim Linki</Text>
                            <TextInput 
                              placeholder="Kapak resmi URL'si..."
                              placeholderTextColor={isDark ? '#475569' : '#94a3b8'}
                              value={editImage}
                              onChangeText={setEditImage}
                              className="h-11 bg-[#F2F2F7] dark:bg-black rounded-xl px-3 text-[#1C1C1E] dark:text-white font-medium"
                            />
                        </View>

                        <View className="flex-row items-center justify-between py-2">
                            <Text className="text-xs font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider">Bu bir çocuk kitabı mı?</Text>
                            <Switch 
                                value={editIsForChildren}
                                onValueChange={setEditIsForChildren}
                                trackColor={{ false: '#767577', true: '#16a085' }}
                            />
                        </View>

                        <View className="mb-4">
                              <Text className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-wider">Raflar / Etiketler</Text>
                              
                              {allTags && allTags.length > 0 && (
                                <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-3">
                                   {allTags.map(tag => {
                                     if (editTags.includes(tag)) return null;
                                     return (
                                       <TouchableOpacity 
                                         key={tag} 
                                         onPress={() => setEditTags([...editTags, tag])} 
                                         className="bg-slate-200 dark:bg-[#3A3A3C] px-3 py-1.5 rounded-lg mr-2"
                                       >
                                         <Text className="text-slate-600 dark:text-slate-300 text-xs font-medium">+ {tag}</Text>
                                       </TouchableOpacity>
                                     );
                                   })}
                                </ScrollView>
                              )}

                              <View className="flex-row mb-3">
                                  <TextInput
                                    value={editTagInput}
                                    onChangeText={setEditTagInput}
                                    placeholder="Yeni raf (Örn: Fantastik)"
                                    placeholderTextColor={isDark ? '#475569' : '#94a3b8'}
                                    className="flex-1 h-11 bg-[#F2F2F7] dark:bg-black rounded-xl px-3 text-[#1C1C1E] dark:text-white font-medium mr-2"
                                  />
                                  <TouchableOpacity 
                                    onPress={() => {
                                      if (editTagInput.trim() && !editTags.includes(editTagInput.trim())) {
                                        setEditTags([...editTags, editTagInput.trim()]);
                                        setEditTagInput("");
                                      }
                                    }} 
                                    className="bg-[#16a085] h-11 w-16 items-center justify-center rounded-xl"
                                  >
                                      <Text className="text-white font-bold">Ekle</Text>
                                  </TouchableOpacity>
                              </View>

                              <View className="flex-row flex-wrap gap-2">
                                  {editTags.map(tag => (
                                      <TouchableOpacity 
                                        key={tag} 
                                        onPress={() => setEditTags(editTags.filter(t => t !== tag))} 
                                        className="bg-indigo-100 dark:bg-indigo-500/20 px-3 py-1.5 rounded-lg flex-row items-center"
                                      >
                                          <Text className="text-indigo-700 dark:text-indigo-300 font-medium mr-2">{tag}</Text>
                                          <X size={14} color={isDark ? '#a5b4fc' : '#4338ca'} />
                                      </TouchableOpacity>
                                  ))}
                              </View>
                        </View>

                        <View className="mb-4">
                            <Text className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">Açıklama / Özet</Text>
                            <TextInput 
                              placeholder="Kitap özeti girin..."
                              placeholderTextColor={isDark ? '#475569' : '#94a3b8'}
                              multiline
                              numberOfLines={4}
                              value={editDescription}
                              onChangeText={setEditDescription}
                              className="bg-[#F2F2F7] dark:bg-black rounded-xl p-3 text-[#1C1C1E] dark:text-white font-medium text-sm"
                              style={{ textAlignVertical: 'top', height: 100 }}
                            />
                        </View>
                    </ScrollView>

                    <TouchableOpacity 
                        onPress={handleSaveEdit}
                        className="h-12 bg-[#16a085] rounded-xl items-center justify-center active:opacity-85 shadow-sm shadow-[#16a085]/25"
                    >
                        <Text className="text-white font-bold text-[15px]">Kaydet</Text>
                    </TouchableOpacity>
                </View>
              </KeyboardAvoidingView>
          </View>
      </Modal>

      {/* FAB - ADD NEW BOOK */}
      <TouchableOpacity 
          onPress={() => setIsAddModalOpen(true)}
          className="absolute bottom-6 right-6 w-14 h-14 bg-[#16a085] rounded-2xl items-center justify-center shadow-lg shadow-[#16a085]/30 active:scale-95 z-50"
          style={{ transform: [{ rotate: '45deg' }] }}
      >
          <View style={{ transform: [{ rotate: '-45deg' }] }}>
              <Plus size={28} color="white" />
          </View>
      </TouchableOpacity>

      {/* BOOK ADD MODAL */}
      <Modal visible={isAddModalOpen} transparent={true} animationType="slide">
          <View className="flex-1 bg-black/50 justify-end">
              <TouchableOpacity className="absolute inset-0" activeOpacity={1} onPress={() => setIsAddModalOpen(false)} />
              <View className="bg-white dark:bg-[#1C1C1E] p-6 rounded-t-[32px] border-t border-black/5 dark:border-white/5 h-[85vh]">
                  <View className="flex-row justify-between items-center mb-4">
                      <View>
                        <Text className="text-lg font-bold text-slate-800 dark:text-slate-100">Yeni Kitap Ekle</Text>
                        <Text className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Kütüphane veritabanına yeni eser kaydedin.</Text>
                      </View>
                      <TouchableOpacity onPress={() => setIsAddModalOpen(false)}>
                          <X size={20} color={isDark ? '#94a3b8' : '#64748b'} />
                      </TouchableOpacity>
                  </View>

                  <ScrollView showsVerticalScrollIndicator={false} className="flex-1" keyboardShouldPersistTaps="handled">
                      <NewBookForm 
                          onSubmit={handleAddNewBook} 
                          onCancel={() => setIsAddModalOpen(false)} 
                          allTags={allTags}
                      />
                  </ScrollView>
              </View>
          </View>
      </Modal>

    </View>
  );
}
