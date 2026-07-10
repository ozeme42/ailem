import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Switch, ActivityIndicator, Alert, Image } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { BookPlus, Search, ImagePlus } from 'lucide-react-native';

interface NewBookData {
  title: string;
  author: string;
  pageCount: number;
  isForChildren: boolean;
  description: string;
  image: string;
  tags: string[];
}

interface GoogleBookResult {
  id: string;
  title: string;
  author: string;
  pageCount: string;
  description: string;
  image: string;
}

interface NewBookFormProps {
  onSubmit: (data: NewBookData) => void;
  onCancel: () => void;
  allTags?: string[];
}

export default function NewBookForm({ onSubmit, onCancel, allTags = [] }: NewBookFormProps) {
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [pageCount, setPageCount] = useState('');
  const [description, setDescription] = useState('');
  const [isForChildren, setIsForChildren] = useState(false);
  const [image, setImage] = useState('https://placehold.co/300x450.png');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<GoogleBookResult[]>([]);

  const searchBooks = async () => {
    if (!title.trim()) {
      Alert.alert('Hata', 'Aramak için lütfen kitap adını girin.');
      return;
    }
    setIsSearching(true);
    try {
      const query = encodeURIComponent(title.trim());
      const response = await fetch(`https://openlibrary.org/search.json?q=${query}&limit=5&fields=key,title,author_name,number_of_pages_median,cover_i`);
      
      if (!response.ok) {
        throw new Error(`Sunucu Hatası: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.docs && data.docs.length > 0) {
        const results = data.docs.map((item: any) => {
           return {
               id: item.key || Math.random().toString(),
               title: item.title || '',
               author: item.author_name ? item.author_name.join(', ') : '',
               pageCount: item.number_of_pages_median ? String(item.number_of_pages_median) : '',
               description: '',
               image: item.cover_i ? `https://covers.openlibrary.org/b/id/${item.cover_i}-L.jpg` : ''
           };
        });
        setSearchResults(results);
      } else {
        Alert.alert('Bilgi', 'Kitap bulunamadı. Lütfen manuel girin veya farklı bir isim deneyin.');
        setSearchResults([]);
      }
    } catch (error: any) {
      Alert.alert('Hata', `Kitap aranırken bir sorun oluştu:\n${error.message}`);
    } finally {
      setIsSearching(false);
    }
  };

  const selectSearchResult = (book: GoogleBookResult) => {
      setTitle(book.title);
      setAuthor(book.author);
      setPageCount(book.pageCount);
      setDescription(book.description);
      if (book.image) setImage(book.image);
      setSearchResults([]);
  };

  const pickImage = async () => {
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
        setImage(base64Image);
      }
    } catch (error) {
      Alert.alert("Hata", "Resim seçilirken bir hata oluştu.");
    }
  };

  const handleSubmit = () => {
    if (!title.trim()) return;

    onSubmit({
      title,
      author,
      pageCount: parseInt(pageCount) || 0,
      description,
      isForChildren,
      image,
      tags
    });
  };

  const addTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  return (
    <ScrollView className="flex-1 px-6 pt-4 pb-10" showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
      
      {/* Cover Image Preview */}
      <View className="items-center mb-8 mt-2">
          <TouchableOpacity 
            onPress={pickImage}
            activeOpacity={0.8}
            className="w-32 h-48 rounded-xl bg-slate-200 dark:bg-[#2C2C2E] items-center justify-center overflow-hidden border border-slate-300 dark:border-[#3A3A3C] shadow-sm relative"
          >
              {image && image !== 'https://placehold.co/300x450.png' ? (
                 <>
                   <Image source={{ uri: image }} className="w-full h-full" />
                   <View className="absolute inset-0 bg-black/30 items-center justify-center opacity-0">
                     {/* Transparent overlay for the image, could show edit icon on hover if React Native supported hover */}
                   </View>
                 </>
              ) : (
                 <View className="items-center">
                    <ImagePlus size={32} color="#8E8E93" />
                    <Text className="text-[#8E8E93] text-[10px] font-bold mt-2">Kapak Ekle</Text>
                 </View>
              )}
          </TouchableOpacity>
          <Text className="text-[#8E8E93] text-[10px] text-center mt-3 px-8">İnternetten aradığınızda kapak otomatik gelir veya üzerine tıklayarak galeriden seçebilirsiniz.</Text>
      </View>

      <View className="mb-6">
        <Text className="text-[#1C1C1E] dark:text-white text-sm font-semibold mb-2 ml-1">Kitap veya Yazar Adı *</Text>
        <View className="flex-row items-center gap-2">
            <TextInput
              value={title}
              onChangeText={setTitle}
              onSubmitEditing={searchBooks}
              returnKeyType="search"
              placeholder="Kitap veya yazar adını girin..."
              placeholderTextColor="#8E8E93"
              className="flex-1 h-14 bg-slate-100 dark:bg-[#2C2C2E] rounded-2xl px-4 text-[#1C1C1E] dark:text-white font-medium"
            />
            <TouchableOpacity onPress={searchBooks} disabled={isSearching} className="h-14 w-14 bg-indigo-50 dark:bg-indigo-900/30 items-center justify-center rounded-2xl border border-indigo-200 dark:border-indigo-800 shadow-sm">
                {isSearching ? <ActivityIndicator size="small" color="#6366f1" /> : <Search size={20} color="#6366f1" />}
            </TouchableOpacity>
        </View>
        {searchResults.length > 0 && (
          <View className="mt-2 bg-white dark:bg-[#1C1C1E] border border-slate-200 dark:border-[#3A3A3C] rounded-xl overflow-hidden shadow-sm">
            {searchResults.map((book, index) => (
              <TouchableOpacity 
                key={book.id + index}
                onPress={() => selectSearchResult(book)}
                className={`flex-row p-3 items-center ${index !== searchResults.length - 1 ? 'border-b border-slate-100 dark:border-[#2C2C2E]' : ''}`}
              >
                <View className="w-10 h-14 bg-slate-200 dark:bg-[#2C2C2E] rounded mr-3 overflow-hidden justify-center items-center">
                   {book.image ? <Image source={{uri: book.image}} className="w-full h-full" /> : <BookPlus size={20} color="#8E8E93" />}
                </View>
                <View className="flex-1">
                  <Text className="text-sm font-bold text-[#1C1C1E] dark:text-white" numberOfLines={1}>{book.title}</Text>
                  <Text className="text-xs text-[#8E8E93] mt-0.5" numberOfLines={1}>{book.author || 'Bilinmeyen Yazar'}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
        {searchResults.length === 0 && (
            <Text className="text-[10px] text-slate-500 mt-1.5 ml-1">Hızlıca otomatik doldurmak için adını yazıp büyüteçe basın.</Text>
        )}
      </View>

      <View className="flex-row justify-between mb-6">
        <View className="w-[48%]">
          <Text className="text-[#1C1C1E] dark:text-white text-sm font-semibold mb-2 ml-1">Yazar</Text>
          <TextInput
            value={author}
            onChangeText={setAuthor}
            placeholder="İsteğe bağlı"
            placeholderTextColor="#8E8E93"
            className="h-14 bg-slate-100 dark:bg-[#2C2C2E] rounded-2xl px-4 text-[#1C1C1E] dark:text-white font-medium"
          />
        </View>
        <View className="w-[48%]">
          <Text className="text-[#1C1C1E] dark:text-white text-sm font-semibold mb-2 ml-1">Sayfa Sayısı</Text>
          <TextInput
            value={pageCount}
            onChangeText={setPageCount}
            placeholder="Örn: 250"
            keyboardType="numeric"
            placeholderTextColor="#8E8E93"
            className="h-14 bg-slate-100 dark:bg-[#2C2C2E] rounded-2xl px-4 text-[#1C1C1E] dark:text-white font-medium"
          />
        </View>
      </View>

      <View className="mb-6">
        <Text className="text-[#1C1C1E] dark:text-white text-sm font-semibold mb-2 ml-1">Açıklama</Text>
        <TextInput
          value={description}
          onChangeText={setDescription}
          placeholder="Kitap hakkında kısa bir açıklama..."
          placeholderTextColor="#8E8E93"
          multiline
          textAlignVertical="top"
          className="h-24 bg-slate-100 dark:bg-[#2C2C2E] rounded-2xl px-4 py-3 text-[#1C1C1E] dark:text-white font-medium"
        />
      </View>

      <View className="mb-6">
        <Text className="text-[#1C1C1E] dark:text-white text-sm font-semibold mb-2 ml-1">Kategoriler / Raflar</Text>
        
        {allTags && allTags.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-3">
             {allTags.map(tag => {
               if (tags.includes(tag)) return null;
               return (
                 <TouchableOpacity 
                   key={tag} 
                   onPress={() => setTags([...tags, tag])} 
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
              value={tagInput}
              onChangeText={setTagInput}
              placeholder="Yeni raf (Örn: Fantastik)"
              placeholderTextColor="#8E8E93"
              className="flex-1 h-12 bg-slate-100 dark:bg-[#2C2C2E] rounded-xl px-4 text-[#1C1C1E] dark:text-white font-medium mr-2"
            />
            <TouchableOpacity onPress={addTag} className="bg-[#FF9500] h-12 w-16 items-center justify-center rounded-xl">
                <Text className="text-white font-bold">Ekle</Text>
            </TouchableOpacity>
        </View>
        <View className="flex-row flex-wrap gap-2">
            {tags.map(tag => (
                <TouchableOpacity key={tag} onPress={() => removeTag(tag)} className="bg-indigo-100 dark:bg-indigo-500/20 px-3 py-1.5 rounded-lg flex-row items-center">
                    <Text className="text-indigo-700 dark:text-indigo-300 font-medium mr-2">{tag}</Text>
                    <Text className="text-indigo-500 dark:text-indigo-400 text-xs font-bold">X</Text>
                </TouchableOpacity>
            ))}
        </View>
      </View>

      <View className="flex-row items-center justify-between bg-slate-100 dark:bg-[#2C2C2E] p-4 rounded-2xl mb-8">
        <View>
          <Text className="text-[#1C1C1E] dark:text-white text-base font-semibold">Çocuk Kitabı</Text>
          <Text className="text-[#8E8E93] text-xs mt-0.5">Sadece çocuklar rafında göster.</Text>
        </View>
        <Switch 
            value={isForChildren} 
            onValueChange={setIsForChildren} 
            trackColor={{ false: "#767577", true: "#FF9500" }}
            thumbColor={isForChildren ? "#f4f3f4" : "#f4f3f4"}
        />
      </View>

      <View className="flex-row gap-3 mb-10">
        <TouchableOpacity 
            onPress={onCancel}
            className="flex-1 h-14 items-center justify-center rounded-2xl bg-slate-200 dark:bg-[#3A3A3C]"
        >
            <Text className="text-[#1C1C1E] dark:text-white font-semibold text-base">İptal</Text>
        </TouchableOpacity>
        <TouchableOpacity 
            onPress={handleSubmit}
            disabled={!title.trim()}
            className={`flex-1 h-14 items-center justify-center rounded-2xl flex-row gap-2 ${title.trim() ? 'bg-[#FF9500]' : 'bg-[#FF9500]/50'}`}
        >
            <BookPlus size={20} color="white" />
            <Text className="text-white font-semibold text-base">Kitabı Ekle</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}
