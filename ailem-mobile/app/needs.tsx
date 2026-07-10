import { View, Text, ScrollView, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useEffect, useState } from 'react';
import { ShoppingBag, ChevronLeft, Plus, CheckCircle2, Circle, Trash2, MoreHorizontal } from 'lucide-react-native';
import { useRouter, Stack } from 'expo-router';
import { useAuth } from '../context/auth-context';
import { collection, query, where, onSnapshot, addDoc, updateDoc, doc, deleteDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

interface Need {
  id: string;
  name: string;
  isUrgent: boolean;
  isPurchased: boolean;
  addedBy: string;
}

export default function NeedsScreen() {
  const [needs, setNeeds] = useState<Need[]>([]);
  const [loading, setLoading] = useState(true);
  const [newNeed, setNewNeed] = useState('');
  const [isUrgent, setIsUrgent] = useState(false);
  const router = useRouter();
  const { familyId, user } = useAuth();

  useEffect(() => {
    if (!familyId) return;

    const q = query(collection(db, 'needs'), where('familyId', '==', familyId));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data: Need[] = [];
      snapshot.forEach((d) => {
        data.push({ id: d.id, ...d.data() } as Need);
      });
      setNeeds(data.sort((a, b) => (a.isPurchased === b.isPurchased) ? 0 : a.isPurchased ? 1 : -1));
      setLoading(false);
    }, (error) => {
      console.log('Error fetching needs:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [familyId]);

  const handleAdd = async () => {
    if (!newNeed.trim() || !familyId || !user) return;
    try {
      await addDoc(collection(db, 'needs'), {
        name: newNeed,
        isUrgent,
        isPurchased: false,
        addedBy: user.uid,
        familyId,
        createdAt: new Date().toISOString()
      });
      setNewNeed('');
      setIsUrgent(false);
    } catch (e) {
      console.error(e);
    }
  };

  const toggleStatus = async (need: Need) => {
    await updateDoc(doc(db, 'needs', need.id), { isPurchased: !need.isPurchased });
  };

  const deleteNeed = async (id: string) => {
    await deleteDoc(doc(db, 'needs', id));
  };

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center" style={{ backgroundColor: '#ebf9eb' }}>
        <ActivityIndicator size="large" color="#84b045" />
      </View>
    );
  }

  return (
    <View className="flex-1" style={{ backgroundColor: '#ebf9eb' }}>
      <Stack.Screen options={{ headerShown: false }} />
      
      {/* Green Header Section */}
      <View style={{ backgroundColor: '#84b045', paddingBottom: 16, paddingTop: 12, paddingHorizontal: 16, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 }}>
        <SafeAreaView edges={['top']} className="m-0 p-0" />
        <View className="flex-row justify-between items-center">
          <TouchableOpacity onPress={() => router.back()} className="w-8 h-8 rounded-full bg-white/20 items-center justify-center">
            <Text className="text-white font-extrabold text-lg">←</Text>
          </TouchableOpacity>
          <View className="items-center">
            <Text className="text-white font-extrabold text-lg">Alışveriş Listesi</Text>
            <Text className="text-white/80 text-xxs font-medium">İhtiyaçları ve listeleri takip edin</Text>
          </View>
          <View className="flex-row gap-2">
            <TouchableOpacity onPress={handleAdd} className="w-8 h-8 bg-emerald-800/30 rounded-lg items-center justify-center">
              <Plus size={18} color="white" />
            </TouchableOpacity>
            <TouchableOpacity className="w-8 h-8 bg-transparent rounded-lg items-center justify-center">
              <MoreHorizontal size={18} color="white" />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
         
         {/* Add New Need Box */}
         <View className="bg-white rounded-3xl p-5 mb-5 shadow-sm border border-emerald-100/50">
            <Text className="font-extrabold text-slate-700 text-sm mb-3">Yeni İhtiyaç Ekle</Text>
            <View className="flex-row items-center mb-3">
               <TextInput 
                 className="flex-1 bg-slate-50 border border-slate-200/50 p-3 rounded-2xl text-slate-900 text-sm mr-3 font-semibold"
                 placeholder="Örn: Süt, Yumurta, Meyve..."
                 placeholderTextColor="#94a3b8"
                 value={newNeed}
                 onChangeText={setNewNeed}
               />
               <TouchableOpacity onPress={handleAdd} className="w-12 h-12 rounded-2xl items-center justify-center shadow-sm" style={{ backgroundColor: '#84b045' }}>
                  <Plus size={24} color="white" />
               </TouchableOpacity>
            </View>
            <TouchableOpacity onPress={() => setIsUrgent(!isUrgent)} className="flex-row items-center">
               <View className={`w-5 h-5 rounded border items-center justify-center mr-2 ${isUrgent ? 'bg-rose-500 border-rose-500' : 'border-slate-300'}`}>
                  {isUrgent && <CheckCircle2 size={14} color="white" />}
               </View>
               <Text className="text-slate-600 font-bold text-xs">Acil İhtiyaç</Text>
            </TouchableOpacity>
         </View>

         {/* Needs List */}
         {needs.length === 0 ? (
           <View className="items-center justify-center mt-10">
             <View className="w-20 h-20 bg-emerald-50 rounded-full items-center justify-center mb-4 border border-emerald-100">
                <ShoppingBag size={40} color="#84b045" />
             </View>
             <Text className="text-slate-500 text-lg font-medium text-center">İhtiyaç listesi boş.</Text>
           </View>
         ) : (
           needs.map(need => (
             <View 
               key={need.id} 
               style={{
                 backgroundColor: need.isPurchased ? '#ebf5eb' : 'white',
                 borderRadius: 22,
                 padding: 16,
                 marginBottom: 12,
                 borderWidth: 1,
                 borderColor: need.isPurchased ? '#d5edd5' : '#d5f5e3/30',
                 opacity: need.isPurchased ? 0.7 : 1,
                 flexDirection: 'row',
                 alignItems: 'center',
                 justifyContent: 'space-between',
                 shadowColor: '#000',
                 shadowOffset: { width: 0, height: 1 },
                 shadowOpacity: 0.02,
                 shadowRadius: 2,
                 elevation: 1,
               }}
             >
                <TouchableOpacity onPress={() => toggleStatus(need)} className="mr-3">
                   {need.isPurchased ? <CheckCircle2 size={24} color="#27ae60" /> : <Circle size={24} color="#bdc3c7" />}
                </TouchableOpacity>
                <View className="flex-1">
                   <Text style={{ fontSize: 15, fontWeight: 'bold', textDecorationLine: need.isPurchased ? 'line-through' : 'none', color: need.isPurchased ? '#95a5a6' : '#2c3e50' }}>
                     {need.name}
                   </Text>
                   {need.isUrgent && !need.isPurchased && (
                     <View className="bg-rose-50 self-start px-2 py-0.5 rounded-md mt-1">
                       <Text className="text-rose-600 text-[9px] font-extrabold uppercase">ACİL</Text>
                     </View>
                   )}
                </View>
                <TouchableOpacity onPress={() => deleteNeed(need.id)} className="p-2">
                   <Trash2 size={18} color="#ef4444" />
                </TouchableOpacity>
             </View>
           ))
         )}
      </ScrollView>
    </View>
  );
}

