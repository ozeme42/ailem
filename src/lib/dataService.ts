
import { db } from './firebase';
import { collection, getDocs, doc, getDoc, addDoc, updateDoc, deleteDoc, setDoc, writeBatch, query, where, onSnapshot, arrayUnion, arrayRemove } from "firebase/firestore";
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import type { Book, Task, CalendarEvent, ShoppingList, ShoppingItem, Test, QuestionBank, PracticeExam, MealPlan, Recipe, ShoppingNoteList, ShoppingNoteItem, User, FamilyMember } from './data';

const getCurrentFamilyId = (): string | null => {
    const auth = getAuth();
    const user = auth.currentUser;
    // This is a simplified way to get familyId. In a real app, you might get this from a user profile document in Firestore.
    // For now, we will rely on a custom claim or a user document fetch. This is a placeholder.
    // A more robust solution is implemented in AuthProvider. This service will assume auth state is handled.
    // As a fallback for services used outside of a user session context, this might need adjustment.
    return null; // This will be improved once user profile is fully available.
}


// Generic CRUD operations
// These need to be updated to use the familyId from the logged-in user.

const onFamilyDataUpdate = <T>(collectionName: string, callback: (data: T[]) => void) => {
    const auth = getAuth();
    return onAuthStateChanged(auth, (user) => {
        if (user) {
            const userDocRef = doc(db, 'users', user.uid);
            onSnapshot(userDocRef, (userDoc) => {
                if (userDoc.exists()) {
                    const familyId = userDoc.data().familyId;
                    if (familyId) {
                         const q = query(collection(db, collectionName), where("familyId", "==", familyId));
                         return onSnapshot(q, (snapshot) => {
                            const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as T));
                            callback(items);
                        });
                    }
                }
                callback([]);
            });
        } else {
            callback([]);
        }
    });
};


// Books (mediaItems)
export const onBooksUpdate = (callback: (books: Book[]) => void) => onFamilyDataUpdate<Book>('mediaItems', callback);
export const addBook = async (data: Omit<Book, 'id' | 'familyId'>) => {
    const familyId = (await getDoc(doc(db, 'users', getAuth().currentUser!.uid))).data()!.familyId;
    return addDoc(collection(db, 'mediaItems'), { ...data, familyId });
};
export const updateBook = (id: string, data: Partial<Omit<Book, 'id' | 'familyId'>>) => updateDoc(doc(db, 'mediaItems', id), data);
export const deleteBook = (id: string) => deleteDoc(doc(db, "mediaItems", id));

// Family Members (within the family doc)
export const updateFamilyMemberInFamily = async (familyId: string, memberId: string, memberData: Partial<FamilyMember>) => {
    const familyRef = doc(db, "families", familyId);
    const familySnap = await getDoc(familyRef);
    if (familySnap.exists()) {
        const family = familySnap.data();
        const memberIndex = family.members.findIndex((m: FamilyMember) => m.id === memberId);
        if (memberIndex > -1) {
            const updatedMembers = [...family.members];
            updatedMembers[memberIndex] = { ...updatedMembers[memberIndex], ...memberData };
            await updateDoc(familyRef, { members: updatedMembers });
        } else {
            throw new Error("Member not found in family");
        }
    } else {
        throw new Error("Family not found");
    }
}


// Tags (Library Shelves are now per-family)
export const onTagsUpdate = (callback: (tags: string[]) => void) => {
    const auth = getAuth();
    return onAuthStateChanged(auth, (user) => {
        if (user) {
             const userDocRef = doc(db, 'users', user.uid);
            onSnapshot(userDocRef, (userDoc) => {
                 if (userDoc.exists()) {
                    const familyId = userDoc.data().familyId;
                    if (familyId) {
                        const tagsDocRef = doc(db, 'familyManagement', familyId);
                        return onSnapshot(tagsDocRef, (doc) => {
                           callback(doc.exists() ? doc.data().libraryTags || [] : []);
                        });
                    }
                }
                callback([]);
            });
        } else {
            callback([]);
        }
    });
};
export const updateTags = async (tags: string[]) => {
    const familyId = (await getDoc(doc(db, 'users', getAuth().currentUser!.uid))).data()!.familyId;
    const docRef = doc(db, 'familyManagement', familyId);
    await setDoc(docRef, { libraryTags: tags }, { merge: true });
}

// Tasks
export const onTasksUpdate = (callback: (tasks: Task[]) => void) => onFamilyDataUpdate<Task>('tasks', callback);
export const addTask = async (data: Omit<Task, 'id' | 'familyId'>) => {
     const familyId = (await getDoc(doc(db, 'users', getAuth().currentUser!.uid))).data()!.familyId;
    return addDoc(collection(db, 'tasks'), { ...data, familyId });
};
export const updateTask = (id: string, data: Partial<Task>) => updateDoc(doc(db, 'tasks', id), data);

// Calendar Events
export const onCalendarEventsUpdate = (callback: (events: CalendarEvent[]) => void) => onFamilyDataUpdate<CalendarEvent>('calendarEvents', callback);
export const addCalendarEvent = async (data: Omit<CalendarEvent, 'id' | 'familyId'>) => {
    const familyId = (await getDoc(doc(db, 'users', getAuth().currentUser!.uid))).data()!.familyId;
    return addDoc(collection(db, 'calendarEvents'), { ...data, familyId });
};


// Meal Plan
export const onMealPlanUpdate = (callback: (plan: MealPlan) => void) => {
    const auth = getAuth();
    return onAuthStateChanged(auth, async (user) => {
        if (user) {
            const familyId = (await getDoc(doc(db, 'users', user.uid))).data()?.familyId;
            if (familyId) {
                const q = query(collection(db, "mealPlan"), where("familyId", "==", familyId));
                return onSnapshot(q, (snapshot) => {
                    const plan: MealPlan = {};
                    snapshot.forEach(doc => {
                        const dayKey = doc.id.replace(`${familyId}_`, '');
                        plan[dayKey] = doc.data() as { [meal: string]: Recipe | null };
                    });
                    callback(plan);
                });
            }
        }
        callback({});
    });
};

export const updateMealPlan = async (dayKey: string, dayPlan: { [meal: string]: Recipe | null }) => {
    const familyId = (await getDoc(doc(db, 'users', getAuth().currentUser!.uid))).data()!.familyId;
    const docRef = doc(db, "mealPlan", `${familyId}_${dayKey}`);
    await setDoc(docRef, { ...dayPlan, familyId }, { merge: true });
}


// Shopping Lists
export const onShoppingListsUpdate = (callback: (lists: ShoppingList[]) => void) => onFamilyDataUpdate<ShoppingList>('shoppingLists', callback);
export const addShoppingList = async (title: string, icon: string) => {
    const familyId = (await getDoc(doc(db, 'users', getAuth().currentUser!.uid))).data()!.familyId;
    return addDoc(collection(db, 'shoppingLists'), { name: title, icon: icon, items: [], familyId });
};
export const updateShoppingList = (id: string, data: Partial<Omit<ShoppingList, 'id' | 'familyId'>>) => updateDoc(doc(db, 'shoppingLists', id), data);
export const deleteShoppingList = (id: string) => deleteDoc(doc(db, 'shoppingLists', id));

export const addShoppingListItemToList = async (listId: string, itemName: string) => {
    const newItem: ShoppingItem = { id: Date.now().toString(), name: itemName, isBought: false };
    await updateDoc(doc(db, "shoppingLists", listId), {
        items: arrayUnion(newItem)
    });
};
export const toggleShoppingListItemStatusInList = async (listId: string, itemId: string) => {
    const listRef = doc(db, "shoppingLists", listId);
    const listSnap = await getDoc(listRef);
    if (listSnap.exists()) {
        const list = listSnap.data() as ShoppingList;
        const newItems = list.items.map(item => item.id === itemId ? { ...item, isBought: !item.isBought } : item);
        await updateDoc(listRef, { items: newItems });
    }
};
export const deleteShoppingListItemFromList = async (listId: string, itemId: string) => {
    const listRef = doc(db, "shoppingLists", listId);
    const listSnap = await getDoc(listRef);
    if (listSnap.exists()) {
        const list = listSnap.data() as ShoppingList;
        const itemToRemove = list.items.find(item => item.id === itemId);
        if (itemToRemove) {
            await updateDoc(listRef, { items: arrayRemove(itemToRemove) });
        }
    }
};
export const clearBoughtItemsFromList = async (listId: string) => {
    const listRef = doc(db, "shoppingLists", listId);
    const listSnap = await getDoc(listRef);
    if (listSnap.exists()) {
        const list = listSnap.data() as ShoppingList;
        const newItems = list.items.filter(item => !item.isBought);
        await updateDoc(listRef, { items: newItems });
    }
};


// Shopping Note Lists
export const onShoppingNoteListsUpdate = (callback: (lists: ShoppingNoteList[]) => void) => onFamilyDataUpdate<ShoppingNoteList>('shoppingNoteLists', callback);
export const addShoppingNoteList = async (name: string, icon: string) => {
    const familyId = (await getDoc(doc(db, 'users', getAuth().currentUser!.uid))).data()!.familyId;
    return addDoc(collection(db, 'shoppingNoteLists'), { name, icon, items: [], familyId });
};
export const deleteShoppingNoteList = (id: string) => deleteDoc(doc(db, 'shoppingNoteLists', id));

export const addNoteItemToList = async (listId: string, text: string) => {
    const newItem: ShoppingNoteItem = { id: Date.now().toString(), text: text };
    await updateDoc(doc(db, "shoppingNoteLists", listId), {
        items: arrayUnion(newItem)
    });
};
export const deleteNoteItemFromList = async (listId: string, itemId: string) => {
    const listRef = doc(db, "shoppingNoteLists", listId);
    const listSnap = await getDoc(listRef);
    if (listSnap.exists()) {
        const list = listSnap.data() as ShoppingNoteList;
        const itemToRemove = list.items.find(item => item.id === itemId);
        if (itemToRemove) {
            await updateDoc(listRef, { items: arrayRemove(itemToRemove) });
        }
    }
};
export const updateNoteItemInList = async (listId: string, itemId: string, newText: string) => {
    const listRef = doc(db, "shoppingNoteLists", listId);
    const listSnap = await getDoc(listRef);
    if (listSnap.exists()) {
        const list = listSnap.data() as ShoppingNoteList;
        const newItems = list.items.map(item => item.id === itemId ? { ...item, text: newText } : item);
        await updateDoc(listRef, { items: newItems });
    }
};


// Education
export const onSubjectsUpdate = (callback: (subjects: string[]) => void) => {
    const auth = getAuth();
    return onAuthStateChanged(auth, (user) => {
        if (user) {
             const userDocRef = doc(db, 'users', user.uid);
            onSnapshot(userDocRef, (userDoc) => {
                 if (userDoc.exists()) {
                    const familyId = userDoc.data().familyId;
                    if (familyId) {
                        const subjectsDocRef = doc(db, 'familyManagement', familyId);
                        return onSnapshot(subjectsDocRef, (doc) => {
                           callback(doc.exists() ? doc.data().educationSubjects || [] : []);
                        });
                    }
                }
                callback([]);
            });
        } else {
            callback([]);
        }
    });
};
export const updateSubjects = async (subjects: string[]) => {
    const familyId = (await getDoc(doc(db, 'users', getAuth().currentUser!.uid))).data()!.familyId;
    const docRef = doc(db, 'familyManagement', familyId);
    await setDoc(docRef, { educationSubjects: subjects }, { merge: true });
};


export const onTestsUpdate = (callback: (tests: Test[]) => void) => onFamilyDataUpdate<Test>('tests', callback);
export const addTest = async (data: Omit<Test, 'id' | 'familyId'>) => {
    const familyId = (await getDoc(doc(db, 'users', getAuth().currentUser!.uid))).data()!.familyId;
    return addDoc(collection(db, 'tests'), { ...data, familyId });
};
export const updateTest = (id: string, data: Partial<Omit<Test, 'id'>>) => updateDoc(doc(db, 'tests', id), data);
export const deleteTest = (id: string) => deleteDoc(doc(db, "tests", id));


export const onQuestionBanksUpdate = (callback: (banks: QuestionBank[]) => void) => onFamilyDataUpdate<QuestionBank>('questionBanks', callback);
export const addQuestionBank = async (data: Omit<QuestionBank, 'id' | 'familyId'>) => {
    const familyId = (await getDoc(doc(db, 'users', getAuth().currentUser!.uid))).data()!.familyId;
    return addDoc(collection(db, 'questionBanks'), { ...data, familyId });
};
export const updateQuestionBank = (id: string, data: Partial<Omit<QuestionBank, 'id'>>) => updateDoc(doc(db, 'questionBanks', id), data);
export const deleteQuestionBank = (id: string) => deleteDoc(doc(db, 'questionBanks', id));


export const onPracticeExamsUpdate = (callback: (exams: PracticeExam[]) => void) => onFamilyDataUpdate<PracticeExam>('practiceExams', callback);
export const addPracticeExam = async (data: Omit<PracticeExam, 'id'| 'familyId'>) => {
    const familyId = (await getDoc(doc(db, 'users', getAuth().currentUser!.uid))).data()!.familyId;
    return addDoc(collection(db, 'practiceExams'), { ...data, familyId });
};
export const updatePracticeExam = (id: string, data: Partial<Omit<PracticeExam, 'id'>>) => updateDoc(doc(db, 'practiceExams', id), data);
export const deletePracticeExam = (id: string) => deleteDoc(doc(db, 'practiceExams', id));

// This needs to be called from a client component that has access to the AuthContext
export const initializeDefaultData = async (familyId: string, userId: string) => {
    const batch = writeBatch(db);

    // Helper data from data.ts
    const initialBooks: Omit<Book, 'id' | 'familyId'>[] = [
        { title: "Yerdeniz Büyücüsü", author: "Ursula K. Le Guin", image: 'https://placehold.co/300x450.png', type: "Kitap", tags: ["Fantastik"], rating: 4.5, description: "Ged'in büyücülük yolculuğu.", pageCount: 208, isForChildren: false },
        { title: "Küçük Prens", author: "Antoine de Saint-Exupéry", image: 'https://placehold.co/300x450.png', type: "Kitap", tags: ["Çocuk Klasikleri", "Felsefe"], rating: 4.9, description: "Bir pilot ve küçük bir prensin hikayesi.", pageCount: 96, isForChildren: true },
    ];

    const initialTasks: Omit<Task, 'id' | 'familyId' | 'assigneeId'>[] = [
        { title: 'Odanı Topla', points: 20, dueDate: '2024-08-15', completed: false, category: 'Ev İşleri', subtasks: [{id: 's1', title: 'Yatağını düzelt', completed: true}, {id: 's2', title: 'Oyuncakları topla', completed: false}], difficulty: 'Orta' },
        { title: 'Matematik Ödevi', points: 50, dueDate: '2024-08-12', completed: false, category: 'Okul', subtasks: [], difficulty: 'Zor' },
    ];

    const initialShoppingLists: Omit<ShoppingList, 'id' | 'familyId'>[] = [
        {
            name: 'Haftalık Market Alışverişi',
            icon: 'ShoppingCart',
            items: [
                { id: '1', name: 'Süt', isBought: true },
                { id: '2', name: 'Ekmek', isBought: true },
                { id: '3', name: 'Yumurta', isBought: false },
            ],
        }
    ];

    const initialCalendarEvents: Omit<CalendarEvent, 'id' | 'familyId'>[] = [
        { title: 'Doktor Randevusu', startDate: '2024-08-20', recurrence: 'one-time' },
        { title: 'Elif\'in Doğum Günü', startDate: '2024-09-05', recurrence: 'yearly' },
    ];

    const initialRecipes: Recipe[] = [
        {
            id: 1,
            title: "Menemen",
            category: 'Kahvaltı',
            image: "https://placehold.co/400x250.png",
            prepTime: "20 dk",
            rating: 4.8,
            ingredients: ["3 adet domates", "2 adet sivri biber", "2 adet yumurta", "1 yemek kaşığı tereyağı", "Tuz, karabiber, pul biber"],
            instructions: ["Biberleri ve domatesleri doğrayın.", "Tereyağını tavada eritin ve biberleri kavurun.", "Domatesleri ekleyip suyunu çekene kadar pişirin.", "Yumurtaları kırın ve karıştırarak pişirin.", "Baharatları ekleyip servis yapın."]
        },
        {
            id: 2,
            title: "Mercimek Çorbası",
            category: 'Akşam Yemeği',
            image: "https://placehold.co/400x250.png",
            prepTime: "40 dk",
            rating: 4.9,
            ingredients: ["1 su bardağı kırmızı mercimek", "1 adet soğan", "1 adet havuç", "1 adet patates", "1 yemek kaşığı salça", "Nane, pul biber, tuz"],
            instructions: ["Tüm sebzeleri doğrayın.", "Mercimeği yıkayıp süzün.", "Tencerede yağı kızdırıp soğanları kavurun, salçayı ekleyin.", "Diğer sebzeleri ve mercimeği ekleyip üzerini geçecek kadar sıcak su koyun.", "Sebzeler yumuşayana kadar pişirin ve blenderdan geçirin.", "Baharatları ekleyip bir taşım daha kaynatın."]
        }
    ];

    const initialMealPlan: MealPlan = {
      "2024-08-12": { // This key needs to be dynamic based on current week, but for initial data it's fine
        "Kahvaltı": initialRecipes[0],
        "Akşam Yemeği": initialRecipes[1],
      },
    };

    const initialQuestionBanks: Omit<QuestionBank, 'id' | 'familyId'>[] = [
        {
            name: "5. Sınıf Matematik Soru Bankası",
            subjects: [
                {
                    id: 1,
                    name: "Matematik",
                    topics: [
                        { id: 1, name: "Doğal Sayılar", questionCount: 20, gradingType: 'auto', answerKey: {1: 'A', 2: 'B'} },
                        { id: 2, name: "Kesirler", questionCount: 20, gradingType: 'manual-text' },
                    ]
                }
            ]
        }
    ];

    const initialPracticeExams: Omit<PracticeExam, 'id' | 'familyId'>[] = [
         {
            name: "LGS Deneme Sınavı 1",
            gradingType: 'auto',
            subjects: [
                { id: 1, name: "Matematik", questionCount: 20 },
                { id: 2, name: "Türkçe", questionCount: 20 },
                { id: 3, name: "Fen Bilimleri", questionCount: 20 },
            ],
            answerKey: {1: 'A', 2: 'C', 3: 'B'}
        }
    ];

    const initialTests: Omit<Test, 'id' | 'status' | 'familyId' | 'studentId'>[] = [
        {
            title: "LGS Deneme Sınavı 1",
            subject: "Deneme Sınavı",
            questionCount: 60,
            assignedDate: "01 Ağustos 2024",
            dueDate: "15 Ağustos 2024",
            sourceType: 'exam',
            sourceId: '1',
            gradingType: 'auto',
        }
    ];


    // Initial Books
    initialBooks.forEach(book => {
        const docRef = doc(collection(db, 'mediaItems'));
        batch.set(docRef, { ...book, familyId });
    });
    
    // Initial Family Management Doc
    const allLibraryTags = new Set<string>();
    initialBooks.forEach(book => (book.tags || []).forEach(tag => allLibraryTags.add(tag)));
    const allEducationSubjects = new Set<string>(['Matematik', 'Türkçe', 'Fen Bilimleri', 'Sosyal Bilgiler', 'İngilizce']);
    const mgmtDocRef = doc(db, 'familyManagement', familyId);
    batch.set(mgmtDocRef, { 
        libraryTags: Array.from(allLibraryTags),
        educationSubjects: Array.from(allEducationSubjects)
    });

    // Initial Tasks - assign to the new user
    initialTasks.forEach(task => {
        const docRef = doc(collection(db, 'tasks'));
        batch.set(docRef, { ...task, familyId, assigneeId: userId });
    });

    // Initial Shopping List
    initialShoppingLists.forEach(list => {
        const docRef = doc(collection(db, 'shoppingLists'));
        batch.set(docRef, { ...list, familyId });
    });
    
    // Initial Calendar Events
    initialCalendarEvents.forEach(event => {
        const docRef = doc(collection(db, 'calendarEvents'));
        batch.set(docRef, { ...event, familyId });
    });

    // Initial Meal Plan
    Object.entries(initialMealPlan).forEach(([dayKey, dayPlan]) => {
        const docRef = doc(db, "mealPlan", `${familyId}_${dayKey}`);
        batch.set(docRef, { ...dayPlan, familyId });
    });

    // Initial Education Content
    initialQuestionBanks.forEach(bank => {
        const docRef = doc(collection(db, 'questionBanks'));
        batch.set(docRef, { ...bank, familyId });
    });
    initialPracticeExams.forEach(exam => {
        const docRef = doc(collection(db, 'practiceExams'));
        batch.set(docRef, { ...exam, familyId });
    });
     initialTests.forEach(test => {
        const docRef = doc(collection(db, 'tests'));
        batch.set(docRef, { ...test, familyId, studentId: userId, status: 'Atandı' });
    });
    
    // Check if default data has been initialized
    const familyDataRef = doc(db, 'families', familyId);
    batch.update(familyDataRef, { defaultDataInitialized: true });


    await batch.commit();
};

    