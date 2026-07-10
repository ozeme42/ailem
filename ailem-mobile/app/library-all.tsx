import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Image, TextInput, Modal, KeyboardAvoidingView, Platform, Switch, Alert, Dimensions, StyleSheet } from 'react-native';
import { useColorScheme } from 'nativewind';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useEffect, useState, useMemo } from 'react';
import { useRouter, Stack, useLocalSearchParams } from 'expo-router';
import { ChevronLeft, Search, Plus, Filter, X, Star, BookOpen, Edit, Check, ImagePlus, Play } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';

import { useAuth } from '../context/auth-context';
import { 
  onBooksUpdate, 
  onTagsUpdate, 
  updateBook, 
  updateTags, 
  addBookToMemberLibrary, 
  onUserLibrariesUpdate,
  addBook
} from '../lib/dataService';
import { Book, UserLibrary } from '../lib/data';
import NewBookForm from '../components/NewBookForm';

const { width } = Dimensions.get('window');

const themeColors = {
  PAGE_BG: 'bg-[#e8f8f5] dark:bg-[#0b1b18]',
  CARD_BG: 'bg-white/60 dark:bg-white/5',
  BORDER: 'border-white/80 dark:border-white/10',
  TEXT_MAIN: 'text-slate-800 dark:text-slate-100',
  TEXT_MUTED: 'text-slate-500 dark:text-slate-400',
};

export default function LibraryAllScreen() {
  const router = useRouter();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const { familyId } = useAuth();
  const { memberId } = useLocalSearchParams(); // Active member passed from dashboard

  // Data State
  const [books, setBooks] = useState<Book[]>([]);
  const [allTags, setAllTags] = useState<string[]>([]);
  const [userLibraries, setUserLibraries] = useState<UserLibrary[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter States
  const [searchTerm, setSearchTerm] = useState("");
  const [showOnlyChildrenBooks, setShowOnlyChildrenBooks] = useState(false);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  // Modals
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Selected book for viewing / editing
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);

  // Edit Book Form State
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
      unsubscribeBooks = onBooksUpdate((allBooks) => {
        setBooks(allBooks);
        setLoading(false);
      });
      unsubscribeTags = onTagsUpdate("libraryTags", setAllTags);
      
      if (familyId) {
        unsubscribeLibraries = onUserLibrariesUpdate(familyId, setUserLibraries);
      }
    } catch (e) {
      console.log('Error loading catalog data:', e);
      setLoading(false);
    }

    return () => {
      unsubscribeBooks();
      unsubscribeTags();
      unsubscribeLibraries();
    };
  }, [familyId]);

  // Check if book is already in the member's library
  const memberBookIds = useMemo(() => {
    if (!memberId) return new Set<string>();
    const memberLib = userLibraries.find(lib => lib.memberId === memberId);
    return new Set<string>(memberLib?.books?.map(b => b.bookId) || []);
  }, [userLibraries, memberId]);

  // Filtering Logic
  const filteredBooks = useMemo(() => {
    return books.filter(book => {
      // Search term filter
      const searchLower = searchTerm.toLowerCase();
      const searchMatch = searchLower === '' ||
        book.title.toLowerCase().includes(searchLower) ||
        (book.author && book.author.toLowerCase().includes(searchLower));
      
      // Children's book filter
      const childrenMatch = book.isForChildren === showOnlyChildrenBooks;

      // Tags/shelves filter
      const tagsMatch = selectedTags.length === 0 || 
        selectedTags.every(filterTag => (book.tags || []).includes(filterTag));
      
      return searchMatch && childrenMatch && tagsMatch;
    });
  }, [books, searchTerm, showOnlyChildrenBooks, selectedTags]);

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

  const handleToggleTag = (tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const handleAddToLibrary = async (bookId: string) => {
    if (!familyId || !memberId) {
      Alert.alert("Hata", "Üye bilgisi bulunamadı.");
      return;
    }

    try {
      const res = await addBookToMemberLibrary(familyId, memberId as string, bookId);
      if (res === "added") {
        Alert.alert("Başarılı", "Kitap okuma listenize (Sıradakiler) eklendi!");
      } else {
        Alert.alert("Bilgi", "Bu kitap zaten kütüphanenizde bulunuyor.");
      }
      setIsDetailModalOpen(false);
    } catch (e) {
      Alert.alert("Hata", "Kitap eklenirken bir hata oluştu.");
    }
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
      Alert.alert("Hata", "Lütfen kitap adını boş bırakmayın.");
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

  const openBookDetail = (book: Book) => {
    setSelectedBook(book);
    setIsDetailModalOpen(true);
  };

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
            
            <Text className="text-[17px] font-semibold tracking-tight text-slate-800 dark:text-slate-100 absolute left-0 right-0 text-center pointer-events-none">
                Kitap Kataloğu
            </Text>

            <View className="w-10" />
        </View>
      </View>

      {/* SEARCH AND FILTERS */}
      <View className="px-4 py-3 gap-3" style={{
        backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(255, 255, 255, 0.65)',
        borderBottomColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.8)',
        borderBottomWidth: 1
      }}>
          {/* Search bar */}
          <View className="flex-row items-center rounded-xl px-3 py-1" style={{
            backgroundColor: isDark ? 'rgba(0, 0, 0, 0.4)' : 'rgba(226, 232, 240, 0.5)',
            borderColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(203, 213, 225, 0.3)',
            borderWidth: 1
          }}>
             <Search size={18} color={isDark ? '#94a3b8' : '#64748b'} />
             <TextInput 
               placeholder="Kitap veya yazar ara..."
               placeholderTextColor={isDark ? '#475569' : '#94a3b8'}
               value={searchTerm}
               onChangeText={setSearchTerm}
               className="flex-1 ml-2 text-[#1C1C1E] dark:text-white h-10 font-medium text-sm"
             />
             {searchTerm.length > 0 && (
               <TouchableOpacity onPress={() => setSearchTerm("")}>
                 <X size={16} color={isDark ? '#94a3b8' : '#64748b'} />
               </TouchableOpacity>
             )}
          </View>

          {/* Children switch & tag chips */}
          <View className="flex-row items-center justify-between pt-1">
              <View className="flex-row items-center gap-2">
                  <Switch 
                      value={showOnlyChildrenBooks}
                      onValueChange={setShowOnlyChildrenBooks}
                      trackColor={{ false: '#767577', true: '#16a085' }}
                      thumbColor={Platform.OS === 'android' ? '#f4f3f4' : ''}
                  />
                  <Text className="text-xs font-bold text-slate-800 dark:text-slate-100">Sadece Çocuk Kitapları</Text>
              </View>

              {selectedTags.length > 0 && (
                <TouchableOpacity onPress={() => setSelectedTags([])}>
                  <Text className="text-xs font-bold text-[#16a085]">Filtreleri Temizle</Text>
                </TouchableOpacity>
              )}
          </View>

          {/* Shelves list */}
          {allTags.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row mt-1 overflow-visible">
              {allTags.sort().map(tag => {
                const isSelected = selectedTags.includes(tag);
                return (
                  <TouchableOpacity 
                    key={tag}
                    onPress={() => handleToggleTag(tag)}
                    className="px-3 py-1.5 rounded-full mr-2 border"
                    style={isSelected 
                      ? { backgroundColor: isDark ? 'rgba(245, 158, 11, 0.1)' : 'rgba(245, 158, 11, 0.15)', borderColor: isDark ? 'rgba(245, 158, 11, 0.2)' : 'rgba(245, 158, 11, 0.35)', borderWidth: 1 }
                      : { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(255, 255, 255, 0.65)', borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.8)', borderWidth: 1 }
                    }
                  >
                    <Text className={isSelected ? "text-[11px] font-bold text-amber-700 dark:text-amber-300" : "text-[11px] font-bold text-slate-600 dark:text-slate-400"}>{tag}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}
      </View>

      {/* BOOKS LIST */}
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
         {loading ? (
           <ActivityIndicator size="large" color="#16a085" className="mt-12" />
         ) : filteredBooks.length === 0 ? (
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
         ) : (selectedTags.length > 0 || searchTerm.length > 0) ? (
           <View className="flex-row flex-wrap justify-between pt-2">
              {filteredBooks.map(book => (
                <TouchableOpacity 
                  key={book.id} 
                  activeOpacity={0.7}
                  onPress={() => openBookDetail(book)}
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
            <View className="gap-8 mt-4">
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
                                     onPress={() => openBookDetail(book)}
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

      {/* FAB - ADD NEW BOOK */}
      <TouchableOpacity 
          onPress={() => setIsAddModalOpen(true)}
          className="absolute bottom-6 right-6 w-14 h-14 rounded-full bg-[#16a085] items-center justify-center shadow-lg shadow-[#16a085]/40 z-50 active:scale-95"
      >
          <Plus size={28} color="white" />
      </TouchableOpacity>

      {/* BOOK DETAIL MODAL */}
      <Modal visible={isDetailModalOpen} transparent={true} animationType="slide">
          <View className="flex-1 bg-black/50 justify-end">
              <TouchableOpacity className="absolute inset-0" activeOpacity={1} onPress={() => setIsDetailModalOpen(false)} />
              <View className="bg-white dark:bg-[#1C1C1E] w-full h-[85%] rounded-t-[32px] overflow-hidden">
                  {selectedBook && (
                      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
                          {/* Blurred Cover Header */}
                          <View className="w-full h-[260px] relative items-center justify-end pb-6 bg-slate-100 dark:bg-slate-800">
                              <Image 
                                  source={{ uri: selectedBook.image || 'https://placehold.co/300x450.png' }} 
                                  className="absolute inset-0 w-full h-full opacity-50"
                                  blurRadius={20}
                              />
                              <View className="absolute inset-0 bg-black/20" />
                              
                              <View className="relative z-10 w-32 h-48 rounded-md shadow-2xl overflow-hidden border border-white/20">
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

                          <View className="p-6 pt-5 flex-col gap-4">
                              <View className="items-center">
                                  <Text className="text-2xl font-bold tracking-tight mb-1 text-center text-slate-800 dark:text-slate-100">
                                      {selectedBook.title}
                                  </Text>
                                  <Text className="text-lg font-medium text-[#16a085] text-center">
                                      {selectedBook.author}
                                  </Text>
                              </View>

                              {/* Info Badges */}
                              <View className="flex-row justify-center items-center py-4 border-y border-black/5 dark:border-white/5 my-2">
                                  <View className="items-center px-4 border-r border-black/5 dark:border-white/5">
                                      <Text className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-bold tracking-wider mb-1">Puan</Text>
                                      <View className="flex-row items-center gap-1">
                                          <Text className="font-bold text-[15px] text-slate-800 dark:text-slate-100">
                                              {selectedBook.rating?.toFixed(1) || '0.0'}
                                          </Text>
                                          <Star size={14} color="#FF9500" fill="#FF9500" />
                                      </View>
                                  </View>
                                  
                                  <View className="items-center px-4 border-r border-black/5 dark:border-white/5">
                                      <Text className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-bold tracking-wider mb-1">Sayfa</Text>
                                      <Text className="font-bold text-[15px] text-slate-800 dark:text-slate-100">
                                          {selectedBook.pageCount || '-'}
                                      </Text>
                                  </View>

                                  <View className="items-center px-4">
                                      <Text className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-bold tracking-wider mb-1">Tür</Text>
                                      <Text className="font-bold text-[15px] text-slate-800 dark:text-slate-100" numberOfLines={1}>
                                          {selectedBook.tags?.[0] || '-'}
                                      </Text>
                                  </View>
                              </View>

                              {/* Description */}
                              <Text className="text-[14px] leading-relaxed text-slate-800 dark:text-slate-100">
                                  {selectedBook.description || 'Bu kitap için bir açıklama bulunmuyor.'}
                              </Text>

                              {/* Actions */}
                              <View className="flex-row gap-3 mt-6">
                                  <TouchableOpacity 
                                    onPress={() => handleOpenEdit(selectedBook)}
                                    className="w-14 h-14 rounded-2xl border border-slate-200 dark:border-white/10 items-center justify-center bg-white dark:bg-[#1C1C1E] active:opacity-75"
                                  >
                                      <Edit size={22} color="#16a085" />
                                  </TouchableOpacity>

                                  {memberId ? (
                                      memberBookIds.has(selectedBook.id) ? (
                                          <TouchableOpacity 
                                            onPress={() => {
                                                setIsDetailModalOpen(false);
                                                router.push({ pathname: '/reading-session-play', params: { bookId: selectedBook.id, memberId: memberId as string } });
                                            }}
                                            className="flex-1 h-14 rounded-2xl bg-indigo-600 items-center justify-center flex-row gap-2 active:opacity-85"
                                          >
                                              <Play size={18} color="white" />
                                              <Text className="text-white font-semibold text-[16px]">Okumaya Başla</Text>
                                          </TouchableOpacity>
                                      ) : (
                                          <TouchableOpacity 
                                            onPress={() => handleAddToLibrary(selectedBook.id)}
                                            className="flex-1 h-14 rounded-2xl bg-[#16a085] items-center justify-center active:opacity-85"
                                          >
                                              <Text className="text-white font-semibold text-[16px]">Kütüphaneme Ekle</Text>
                                          </TouchableOpacity>
                                      )
                                  ) : null}
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

      {/* BOOK ADD MODAL */}
      <Modal visible={isAddModalOpen} transparent={true} animationType="slide">
          <View className="flex-1 bg-black/50 justify-end">
              <TouchableOpacity className="absolute inset-0" activeOpacity={1} onPress={() => setIsAddModalOpen(false)} />
              <KeyboardAvoidingView 
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                className="bg-white dark:bg-[#1C1C1E] rounded-t-[32px] border-t border-black/5 dark:border-white/5 h-[85vh]"
              >
                  <View className="p-6 h-full flex-1">
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
              </KeyboardAvoidingView>
          </View>
      </Modal>

    </View>
  );
}
