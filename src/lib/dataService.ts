

import { db } from './firebase';
import { collection, getDocs, doc, getDoc, addDoc, updateDoc, deleteDoc, setDoc, writeBatch, query, where, onSnapshot, arrayUnion, arrayRemove, orderBy, limit } from "firebase/firestore";
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import type { Book, Task, CalendarEvent, ShoppingList, ShoppingItem, Test, PracticeExam, MealPlan, Recipe, User, FamilyMember, UserLibrary, UserLibraryBook, BookReadingStatus, Mistake, StudyPlan, StudyAssignment, Goal, GoalSection, GoalTask, ReadingSession, AmbientSound, MemorizationItem, MemorizationProgress, Notebook, Note, NotebookSection, NoteContentBlock, PrayerProgress, Video, ShoppingNoteItem, Topic, CalorieLog, DailyTracking, TrackableItemType, QuickTestQuestion, Account, Transaction, Budget, BankQuestion, TrackedBook, TrackedBookTest, StudyPlanSubject, StudyTopic } from './data';
import { isPast, parseISO, isSameDay, subDays, format, startOfWeek, endOfWeek, subWeeks, isWithinInterval, differenceInDays, startOfMonth, endOfMonth, isFuture, subMonths } from 'date-fns';
import { migrateImage } from '@/ai/flows/migrate-image-flow';
import { getCategoryName } from '@/app/education/page';

const getCurrentFamilyId = async (): Promise<string | null> => {
    const auth = getAuth();
    const user = auth.currentUser;
    if (!user) return null;
    const userDoc = await getDoc(doc(db, 'users', user.uid));
    return userDoc.data()?.familyId || null;
}

// Helper function to recursively remove undefined properties from an object
function removeUndefined(obj: any): any {
  if (obj === null || obj === undefined) return undefined;

  if (Array.isArray(obj)) {
    return obj.map(removeUndefined);
  }

  if (typeof obj === 'object') {
    const newObj: { [key: string]: any } = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        const value = obj[key];
        if (value !== undefined) {
          const cleanedValue = removeUndefined(value);
          if (cleanedValue !== undefined) {
            newObj[key] = cleanedValue;
          }
        }
      }
    }
    return newObj;
  }
  
  return obj;
}


// Generic CRUD operations
// These need to be updated to use the familyId from the logged-in user.

const onFamilyDataUpdate = <T>(
    collectionName: string,
    callback: (data: T[]) => void,
    runOnce = false,
    orderByField?: string,
    orderByDirection?: 'desc' | 'asc'
): (() => void) => {
    const auth = getAuth();
    let unsubscribe: ReturnType<typeof onSnapshot> | null = null;
    
    const authUnsubscribe = onAuthStateChanged(auth, async (user) => {
        if (unsubscribe) {
            unsubscribe();
            unsubscribe = null;
        }

        if (user) {
            try {
                const userDoc = await getDoc(doc(db, 'users', user.uid));
                const familyId = userDoc.exists() ? userDoc.data().familyId : null;

                if (familyId) {
                    let q = query(collection(db, collectionName), where("familyId", "==", familyId));
                    if (orderByField) {
                        q = query(q, orderBy(orderByField, orderByDirection || 'asc'));
                    }

                    if (runOnce) {
                        const snapshot = await getDocs(q);
                        const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as T));
                        callback(items);
                    } else {
                        unsubscribe = onSnapshot(q, (snapshot) => {
                            const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as T));
                            callback(items);
                        }, (error) => {
                            console.error(`Error fetching ${collectionName}:`, error);
                            callback([]);
                        });
                    }
                } else {
                    callback([]);
                }
            } catch (error) {
                console.error("Error getting user document:", error);
                callback([]);
            }
        } else {
            callback([]);
        }
    });

    return () => {
        authUnsubscribe();
        if (unsubscribe) {
            unsubscribe();
        }
    };
};



// Books (mediaItems)
export const onBooksUpdate = (callback: (books: Book[]) => void, runOnce = false) => onFamilyDataUpdate<Book>('mediaItems', callback, runOnce);
export const addBook = async (data: Omit<Book, 'id' | 'familyId' | 'createdAt'>) => {
    const familyId = await getCurrentFamilyId();
    if (!familyId) throw new Error("User not in a family");
    return addDoc(collection(db, 'mediaItems'), { ...data, familyId, createdAt: new Date().toISOString() });
};
export const updateBook = async (id: string, data: Partial<Omit<Book, 'id' | 'familyId' | 'createdAt'>>) => {
    const bookRef = doc(db, 'mediaItems', id);
    const bookSnap = await getDoc(bookRef);
    const cleanedData = removeUndefined(data);
    if (bookSnap.exists() && !bookSnap.data().createdAt) {
        // If the book doesn't have a creation date, add it.
        return updateDoc(bookRef, { ...cleanedData, createdAt: new Date().toISOString() });
    }
    return updateDoc(bookRef, cleanedData);
};
export const deleteBook = (id: string) => deleteDoc(doc(db, "mediaItems", id));

// Videos
export const onVideosUpdate = (callback: (videos: Video[]) => void, runOnce = false) => onFamilyDataUpdate<Video>('videos', callback, runOnce);
export const addVideo = async (data: Omit<Video, 'id' | 'familyId' | 'createdAt'>) => {
    const familyId = await getCurrentFamilyId();
    if (!familyId) throw new Error("User not in a family");
    return addDoc(collection(db, 'videos'), { ...data, familyId, createdAt: new Date().toISOString() });
};
export const updateVideo = (id: string, data: Partial<Omit<Video, 'id' | 'familyId'>>) => updateDoc(doc(db, 'videos', id), removeUndefined(data));
export const deleteVideo = (id: string) => deleteDoc(doc(db, "videos", id));


// Reading Sessions
export const onReadingSessionsUpdate = (callback: (sessions: ReadingSession[]) => void) => onFamilyDataUpdate<ReadingSession>('readingSessions', callback);
export const addReadingSession = async (data: Omit<ReadingSession, 'id' | 'familyId'>) => {
    const familyId = await getCurrentFamilyId();
    if (!familyId) throw new Error("User not in a family");
    return addDoc(collection(db, 'readingSessions'), { ...data, familyId });
};


// Recipes
export const onRecipesUpdate = (callback: (recipes: Recipe[]) => void) => onFamilyDataUpdate<Recipe>('recipes', callback);
export const addRecipe = async (data: Omit<Recipe, 'id' | 'familyId'>) => {
    const familyId = await getCurrentFamilyId();
    if (!familyId) throw new Error("User not in a family");
    const docRef = await addDoc(collection(db, 'recipes'), { ...data, familyId });
    return docRef.id;
};
export const updateRecipe = (id: string, data: Partial<Omit<Recipe, 'id' | 'familyId'>>) => updateDoc(doc(db, 'recipes', id), data);
export const deleteRecipe = (id: string) => deleteDoc(doc(db, "recipes", id));


// One-time migration function
export const migrateOrphanBooks = async (familyId: string) => {
    const booksCollection = collection(db, 'mediaItems');
    const snapshot = await getDocs(booksCollection);
    
    // This is a simplified migration. It checks the first book. If it has no familyId, it assumes a migration is needed.
    // In a real-world scenario, you might want a more robust check.
    if (snapshot.docs.length > 0 && !snapshot.docs[0].data().familyId) {
        console.log(`Found orphan books. Migrating to family ${familyId}...`);
        const batch = writeBatch(db);
        snapshot.docs.forEach(bookDoc => {
            if (!bookDoc.data().familyId) {
                const docRef = doc(db, 'mediaItems', bookDoc.id);
                batch.update(docRef, { familyId: familyId });
            }
        });
        await batch.commit();
        console.log("Orphan books migration completed.");
        return true;
    }
    return false;
};

// User Libraries
export const onUserLibrariesUpdate = (familyId: string, callback: (libraries: UserLibrary[]) => void) => {
    if (!familyId) {
        callback([]);
        return () => {};
    }
    const q = query(collection(db, "userLibraries"), where("familyId", "==", familyId));
    return onSnapshot(q, (snapshot) => {
        const libraries = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as UserLibrary));
        callback(libraries);
    });
};

export const onSingleUserLibraryUpdate = (memberId: string, callback: (library: UserLibrary | null) => void) => {
    const auth = getAuth();
    return onAuthStateChanged(auth, async (user) => {
        if (user) {
            const familyId = await getCurrentFamilyId();
            if (familyId && memberId) {
                const libraryId = `${familyId}_${memberId}`;
                const docRef = doc(db, 'userLibraries', libraryId);
                return onSnapshot(docRef, (docSnap) => {
                    if (docSnap.exists()) {
                        callback({ id: docSnap.id, ...docSnap.data() } as UserLibrary);
                    } else {
                        callback(null);
                    }
                });
            }
        }
        callback(null);
    });
};


export const addBookToMemberLibrary = async (familyId: string, memberId: string, bookId: string) => {
    const libraryId = `${familyId}_${memberId}`;
    const libraryRef = doc(db, 'userLibraries', libraryId);
    const bookRef = doc(db, 'mediaItems', bookId);

    const newBookEntry: UserLibraryBook = {
        bookId: bookId,
        status: 'to-read',
        addedAt: new Date().toISOString(),
    };

    const librarySnap = await getDoc(libraryRef);
    if (!librarySnap.exists()) {
        await setDoc(libraryRef, {
            familyId: familyId,
            memberId: memberId,
            books: [newBookEntry]
        });
    } else {
        await updateDoc(libraryRef, {
            books: arrayUnion(newBookEntry)
        });
    }
    
    // Also update the book to track who has it.
    await updateDoc(bookRef, {
        readers: arrayUnion(memberId)
    });
};

export const updateUserBookStatus = async (familyId: string, memberId: string, bookId: string, newStatus: BookReadingStatus, progress?: number) => {
    const libraryId = `${familyId}_${memberId}`;
    const libraryRef = doc(db, 'userLibraries', libraryId);
    const librarySnap = await getDoc(libraryRef);

    if (librarySnap.exists()) {
        const library = librarySnap.data() as UserLibrary;
        const updatedBooks = library.books.map(book => {
            if (book.bookId === bookId) {
                 const updatedBook: UserLibraryBook = { ...book, status: newStatus };
                 if (newStatus === 'finished') {
                    if (!book.finishedAt) updatedBook.finishedAt = new Date().toISOString();
                    updatedBook.progress = 100;
                 } else if (newStatus === 'reading') {
                    if (!book.startedAt) updatedBook.startedAt = new Date().toISOString();
                    if(progress !== undefined) updatedBook.progress = progress;
                 } else if (newStatus === 'to-read') {
                    updatedBook.progress = 0;
                 }
                 return updatedBook;
            }
            return book;
        });
        await updateDoc(libraryRef, { books: updatedBooks });
        
        if (newStatus === 'finished') {
            const bookDetails = (await getDoc(doc(db, 'mediaItems', bookId))).data() as Book;
            await checkAndAwardBadges(memberId, familyId, { type: 'book_finished', book: bookDetails, points: 100 });
        }
    }
};

export const removeBookFromMemberLibrary = async (familyId: string, memberId: string, bookId: string) => {
    const libraryId = `${familyId}_${memberId}`;
    const libraryRef = doc(db, 'userLibraries', libraryId);
    const bookRef = doc(db, 'mediaItems', bookId);

    const librarySnap = await getDoc(libraryRef);
    if (librarySnap.exists()) {
        const library = librarySnap.data() as UserLibrary;
        const bookToRemove = library.books.find(b => b.bookId === bookId);
        if (bookToRemove) {
            await updateDoc(libraryRef, {
                books: arrayRemove(bookToRemove)
            });
        }
    }

     await updateDoc(bookRef, {
        readers: arrayRemove(memberId)
    });
};


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

type TagType = "libraryTags" | "memorizationTags" | "videoTags";

// Tags (Library Shelves are now per-family)
export const onTagsUpdate = (tagType: TagType, callback: (tags: string[]) => void) => {
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
                           callback(doc.exists() ? doc.data()[tagType] || [] : []);
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
export const updateTags = async (tagType: TagType, tags: string[]) => {
    const familyId = await getCurrentFamilyId();
    if (!familyId) throw new Error("User not in a family");
    const docRef = doc(db, 'familyManagement', familyId);
    await setDoc(docRef, { [tagType]: tags }, { merge: true });
}

export const updateBookTags = async (originalTag: string, newTag: string) => {
    const familyId = await getCurrentFamilyId();
    if (!familyId) throw new Error("User not in a family");

    const q = query(collection(db, 'mediaItems'), where('familyId', '==', familyId), where('tags', 'array-contains-any', [originalTag]));
    const snapshot = await getDocs(q);
    
    const batch = writeBatch(db);
    snapshot.forEach(docSnap => {
        const book = docSnap.data() as Book;
        const newTags = (book.tags || []).map(tag => tag.startsWith(originalTag) ? tag.replace(originalTag, newTag) : tag);
        batch.update(docSnap.ref, { tags: newTags });
    });
    
    await batch.commit();
}

type ItemType = 'book' | 'memorization' | 'video';

export const deleteTag = async (tagType: TagType, tagToDelete: string, itemType: ItemType) => {
    const familyId = await getCurrentFamilyId();
    if (!familyId) return;

    // 1. Get all tags and filter out the one to delete
    const tagsDocRef = doc(db, 'familyManagement', familyId);
    const tagsDoc = await getDoc(tagsDocRef);
    const allTags: string[] = tagsDoc.exists() ? (tagsDoc.data()[tagType] || []) : [];
    const newTags = allTags.filter(tag => !tag.startsWith(tagToDelete));
    await setDoc(tagsDocRef, { [tagType]: newTags }, { merge: true });

    // 2. Query for all items with the tag and remove it
    let collectionName;
    if (itemType === 'book') {
        collectionName = 'mediaItems';
    } else if (itemType === 'memorization') {
        collectionName = 'memorizationItems';
    } else {
        collectionName = 'videos';
    }
    const q = query(collection(db, collectionName), where("familyId", "==", familyId));
    const querySnapshot = await getDocs(q);

    const batch = writeBatch(db);
    querySnapshot.forEach(docSnap => {
        const item = docSnap.data() as Book | MemorizationItem | Video;
        if (item.tags?.some(t => t.startsWith(tagToDelete))) {
            const updatedTags = item.tags.filter(t => !t.startsWith(tagToDelete));
            batch.update(docSnap.ref, { tags: updatedTags });
        }
    });

    await batch.commit();
};


// Tasks
export const onTasksUpdate = (callback: (tasks: Task[]) => void) => onFamilyDataUpdate<Task>('tasks', callback);
export const addTask = async (data: Omit<Task, 'id' | 'familyId' | 'createdAt'>) => {
    const familyId = await getCurrentFamilyId();
    if (!familyId) throw new Error("User not in a family");
    return addDoc(collection(db, 'tasks'), { ...data, familyId, createdAt: new Date().toISOString() });
};
export const deleteTask = (id: string) => deleteDoc(doc(db, "tasks", id));

// Calendar Events
export const onCalendarEventsUpdate = (callback: (events: CalendarEvent[]) => void) => onFamilyDataUpdate<CalendarEvent>('calendarEvents', callback);
export const addCalendarEvent = async (data: Omit<CalendarEvent, 'id' | 'familyId'>) => {
    const familyId = await getCurrentFamilyId();
    if (!familyId) throw new Error("User not in a family");
    // Create a new object to avoid modifying the original data object
    const eventData: { [key: string]: any } = { ...data, familyId };

    // Remove endDate field if it is undefined, as Firestore doesn't allow it.
    if (eventData.endDate === undefined) {
        delete eventData.endDate;
    }
    
    return addDoc(collection(db, 'calendarEvents'), eventData);
};
export const updateCalendarEvent = async (id: string, data: Partial<Omit<CalendarEvent, 'id' | 'familyId'>>) => {
    const eventRef = doc(db, 'calendarEvents', id);
    return updateDoc(eventRef, removeUndefined(data));
};
export const deleteCalendarEvent = (id: string) => deleteDoc(doc(db, 'calendarEvents', id));

export const deletePastCalendarEvents = async () => {
    const familyId = await getCurrentFamilyId();
    if (!familyId) throw new Error("User not in a family");

    const q = query(collection(db, 'calendarEvents'), where("familyId", "==", familyId));
    const querySnapshot = await getDocs(q);

    const batch = writeBatch(db);
    let deletedCount = 0;

    querySnapshot.forEach((doc) => {
        const event = doc.data() as CalendarEvent;
        // For recurring events, we don't delete them, we just check if their last instance is in the past.
        // For simplicity now, we only delete one-time past events.
        if (event.recurrence === 'one-time') {
            const eventEndDate = event.endDate ? parseISO(event.endDate) : parseISO(event.startDate);
            if (isPast(eventEndDate)) {
                batch.delete(doc.ref);
                deletedCount++;
            }
        }
    });

    if (deletedCount > 0) {
        await batch.commit();
    }
    
    return deletedCount;
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
    const familyId = await getCurrentFamilyId();
    if (!familyId) throw new Error("User not in a family");
    const docRef = doc(db, "mealPlan", `${familyId}_${dayKey}`);
    await setDoc(docRef, { ...dayPlan, familyId }, { merge: true });
}

// Calorie Logs
export const onCalorieLogsUpdate = (callback: (logs: CalorieLog[]) => void) => onFamilyDataUpdate<CalorieLog>('calorieLogs', callback);
export const upsertCalorieLog = async (logData: Omit<CalorieLog, 'familyId'>) => {
    const familyId = await getCurrentFamilyId();
    if (!familyId) throw new Error("User not in a family");
    const logRef = doc(db, "calorieLogs", logData.id);
    await setDoc(logRef, { ...logData, familyId }, { merge: true });
};



// Shopping Lists
export const onShoppingListsUpdate = (callback: (lists: ShoppingList[]) => void) => onFamilyDataUpdate<ShoppingList>('shoppingLists', callback);
export const addShoppingList = async (name: string, icon: string) => {
    const familyId = await getCurrentFamilyId();
    if (!familyId) throw new Error("User not in a family");
    return addDoc(collection(db, 'shoppingLists'), { name, icon, items: [], boughtItems: [], familyId, createdAt: new Date().toISOString() });
};
export const updateShoppingList = (id: string, data: Partial<Omit<ShoppingList, 'id' | 'familyId'>>) => updateDoc(doc(db, 'shoppingLists', id), data);
export const deleteShoppingList = (id: string) => deleteDoc(doc(db, 'shoppingLists', id));

export const addShoppingListItemToList = async (listId: string, itemData: { name: string; category?: string; quantity?: string; }) => {
    const listRef = doc(db, "shoppingLists", listId);
    
    const newItem: Omit<ShoppingItem, 'isBought'> = { 
        id: Date.now().toString(), 
        name: `${itemData.quantity || ''} ${itemData.name}`.trim(), 
        createdAt: new Date().toISOString(),
        category: itemData.category || 'Diğer',
        quantity: itemData.quantity,
    };
    
    const finalItem = removeUndefined({ ...newItem, isBought: false });
    
    await updateDoc(listRef, {
        items: arrayUnion(finalItem)
    });
};


export const toggleShoppingListItemStatusInList = async (listId: string, itemId: string) => {
    const listRef = doc(db, "shoppingLists", listId);
    const listSnap = await getDoc(listRef);
    if (listSnap.exists()) {
        const list = listSnap.data() as ShoppingList;
        const newItems = (list.items || []).map(item =>
            item.id === itemId ? { ...item, isBought: !item.isBought } : item
        );
        await updateDoc(listRef, { items: newItems });
    }
};

export const moveItemToBought = async (listId: string, itemId: string) => {
    const listRef = doc(db, "shoppingLists", listId);
    const listSnap = await getDoc(listRef);
    if (listSnap.exists()) {
        const list = listSnap.data() as ShoppingList;
        const itemToMove = list.items.find(item => item.id === itemId);
        if (itemToMove && itemToMove.isBought) {
            const newItems = list.items.filter(item => item.id !== itemId);
            const newBoughtItems = [itemToMove, ...(list.boughtItems || [])];
            await updateDoc(listRef, { items: newItems, boughtItems: newBoughtItems });
        }
    }
};

export const moveItemToPending = async (listId: string, itemId: string) => {
    const listRef = doc(db, "shoppingLists", listId);
    const listSnap = await getDoc(listRef);
    if (listSnap.exists()) {
        const list = listSnap.data() as ShoppingList;
        const itemToMove = (list.boughtItems || []).find(item => item.id === itemId);
        if (itemToMove) {
            const updatedItem = { ...itemToMove, isBought: false };
            const newBoughtItems = (list.boughtItems || []).filter(item => item.id !== itemId);
            const newItems = [updatedItem, ...list.items];
            await updateDoc(listRef, { items: newItems, boughtItems: newBoughtItems });
        }
    }
};

export const deleteShoppingListItemFromList = async (listId: string, itemId: string, fromBought: boolean) => {
    const listRef = doc(db, "shoppingLists", listId);
    const listSnap = await getDoc(listRef);
    if (listSnap.exists()) {
        const list = listSnap.data() as ShoppingList;
        if (fromBought) {
            const itemToRemove = (list.boughtItems || []).find(item => item.id === itemId);
            if (itemToRemove) {
                await updateDoc(listRef, { boughtItems: arrayRemove(itemToRemove) });
            }
        } else {
             const itemToRemove = list.items.find(item => item.id === itemId);
             if (itemToRemove) {
                await updateDoc(listRef, { items: arrayRemove(itemToRemove) });
            }
        }
    }
};

export const clearBoughtItemsFromList = async (listId: string) => {
    const listRef = doc(db, "shoppingLists", listId);
    await updateDoc(listRef, { boughtItems: [] });
};

// Shopping Notes (for Needs page)
export const onShoppingNotesUpdate = (callback: (lists: ShoppingNoteList[]) => void) => onFamilyDataUpdate<ShoppingNoteList>('shoppingNotes', callback, false, 'name');
export const addShoppingNoteList = async (name: string, icon: string) => {
    const familyId = await getCurrentFamilyId();
    if (!familyId) throw new Error("User not in a family");
    return addDoc(collection(db, 'shoppingNotes'), { name, icon, items: [], familyId });
};
export const deleteShoppingNoteList = (id: string) => deleteDoc(doc(db, 'shoppingNotes', id));

export const addShoppingNoteItemToList = async (listId: string, itemName: string) => {
    const listRef = doc(db, "shoppingNotes", listId);
    const newItem: ShoppingNoteItem = { id: Date.now().toString(), name: itemName, completed: false };
    await updateDoc(listRef, { items: arrayUnion(newItem) });
};

export const deleteShoppingNoteItemFromList = async (listId: string, itemId: string) => {
    const listRef = doc(db, "shoppingNotes", listId);
    const listSnap = await getDoc(listRef);
    if (listSnap.exists()) {
        const list = listSnap.data() as ShoppingNoteList;
        const items = list.items || [];
        const itemToRemove = items.find(item => item.id === itemId);
        if (itemToRemove) {
            await updateDoc(listRef, { items: arrayRemove(itemToRemove) });
        }
    }
};

export const toggleShoppingNoteItemStatusInList = async (listId: string, itemId: string) => {
    const listRef = doc(db, "shoppingNotes", listId);
    const listSnap = await getDoc(listRef);
    if (listSnap.exists()) {
        const list = listSnap.data() as ShoppingNoteList;
        const newItems = (list.items || []).map(item => 
            item.id === itemId ? { ...item, completed: !item.completed } : item
        );
        await updateDoc(listRef, { items: newItems });
    }
};


// Education
export const onBankQuestionsUpdate = (callback: (questions: BankQuestion[]) => void, runOnce = false) => onFamilyDataUpdate<BankQuestion>('bankQuestions', callback, runOnce);
export const addBankQuestion = async (data: Partial<Omit<BankQuestion, 'id' | 'familyId' | 'createdAt'>>) => {
    const familyId = await getCurrentFamilyId();
    if (!familyId) throw new Error("User not in a family");
    return addDoc(collection(db, 'bankQuestions'), { ...data, familyId, createdAt: new Date().toISOString() });
};
export const addBulkBankQuestions = async (questionsData: Partial<BankQuestion>[]) => {
    const familyId = await getCurrentFamilyId();
    if (!familyId) throw new Error("User not in a family");

    const batch = writeBatch(db);
    for (const qData of questionsData) {
        const questionDocRef = doc(collection(db, 'bankQuestions'));
        const newQuestion: Omit<BankQuestion, 'id'> = {
            familyId,
            title: qData.title!,
            originalFilename: qData.originalFilename,
            subject: qData.subject!,
            topic: qData.topic!,
            imageUrl: qData.imageUrl!,
            options: qData.options,
            correctAnswer: qData.correctAnswer!,
            createdAt: new Date().toISOString(),
            type: qData.type,
        };
        batch.set(questionDocRef, removeUndefined(newQuestion));
    }
    await batch.commit();
};


export const updateBankQuestion = (id: string, data: Partial<Omit<BankQuestion, 'id'|'familyId'|'createdAt'>>) => {
    return updateDoc(doc(db, 'bankQuestions', id), data);
}
export const deleteBankQuestion = (id: string) => deleteDoc(doc(db, "bankQuestions", id));
export const deleteBulkBankQuestions = async (ids: string[]) => {
    const batch = writeBatch(db);
    ids.forEach(id => {
        batch.delete(doc(db, "bankQuestions", id));
    });
    await batch.commit();
}
export const onMistakesUpdate = (callback: (mistakes: Mistake[]) => void) => onFamilyDataUpdate<Mistake>('mistakes', callback, false, 'createdAt', 'desc');
export const addMistake = async (data: Partial<Omit<Mistake, 'id' | 'familyId' | 'status'>>) => {
    const familyId = await getCurrentFamilyId();
    if (!familyId) throw new Error("User not in a family");
    return addDoc(collection(db, 'mistakes'), { ...data, familyId, status: 'active' });
};
export const deleteMistake = (id: string) => deleteDoc(doc(db, "mistakes", id));
export const updateMistake = (id: string, data: Partial<Omit<Mistake, 'id'>>) => {
    const cleanedData = removeUndefined(data);
    return updateDoc(doc(db, 'mistakes', id), cleanedData);
}


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
    const familyId = await getCurrentFamilyId();
    if (!familyId) throw new Error("User not in a family");
    const docRef = doc(db, 'familyManagement', familyId);
    await setDoc(docRef, { educationSubjects: subjects }, { merge: true });
};

export const onTopicsUpdate = (callback: (topics: string[]) => void) => {
    const auth = getAuth();
    return onAuthStateChanged(auth, (user) => {
        if (user) {
             const userDocRef = doc(db, 'users', user.uid);
            onSnapshot(userDocRef, (userDoc) => {
                 if (userDoc.exists()) {
                    const familyId = userDoc.data().familyId;
                    if (familyId) {
                        const topicsDocRef = doc(db, 'familyManagement', familyId);
                        return onSnapshot(topicsDocRef, (doc) => {
                           callback(doc.exists() ? doc.data().educationTopics || [] : []);
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
export const updateTopics = async (topics: string[]) => {
    const familyId = await getCurrentFamilyId();
    if (!familyId) throw new Error("User not in a family");
    const docRef = doc(db, 'familyManagement', familyId);
    await setDoc(docRef, { educationTopics: topics }, { merge: true });
};


export const onTestsUpdate = (callback: (tests: Test[]) => void, runOnce = false) => onFamilyDataUpdate<Test>('tests', callback, runOnce);

export const addTest = async (data: Omit<Test, 'id' | 'familyId' | 'questions'>, questionsForSubcollection?: (BankQuestion | QuickTestQuestion)[]) => {
    const familyId = await getCurrentFamilyId();
    if (!familyId) throw new Error("User not in a family");

    const batch = writeBatch(db);
    const testDocRef = doc(collection(db, 'tests'));

    let isTestOpenEnded = data.openEnded || false;
    
    // Set openEnded status based on questions if provided
    if (questionsForSubcollection && questionsForSubcollection.length > 0) {
        if (questionsForSubcollection.some(q => 'type' in q && q.type === 'open_ended')) {
            isTestOpenEnded = true;
        }
    }
    
    // Prepare the main test document data, excluding the full questions array.
    const mainTestData: Omit<Test, 'id'> = {
        ...data,
        familyId,
        openEnded: isTestOpenEnded,
        gradingType: isTestOpenEnded ? 'manual' : 'auto',
    };
    
    batch.set(testDocRef, removeUndefined(mainTestData));

    // If there are questions, add them to the 'questions' subcollection
    if (questionsForSubcollection && questionsForSubcollection.length > 0) {
        const questionsCollectionRef = collection(testDocRef, 'questions');
        questionsForSubcollection.forEach((question, index) => {
            const questionDocRef = doc(questionsCollectionRef);
            const questionId = 'id' in question ? question.id : ('questionId' in question ? question.questionId : '');
            
            const questionSubDoc: QuickTestQuestion = {
                questionId: questionId,
                questionNumber: index + 1,
                imageUrl: question.imageUrl,
            };
            batch.set(questionDocRef, questionSubDoc);
        });
    }

    await batch.commit();
};


export const deleteTest = async (id: string) => {
    const batch = writeBatch(db);

    // Delete the test itself
    const testRef = doc(db, "tests", id);
    batch.delete(testRef);

    await batch.commit();
};


export const onPracticeExamsUpdate = (callback: (exams: PracticeExam[]) => void) => onFamilyDataUpdate<PracticeExam>('practiceExams', callback);
export const onSinglePracticeExamUpdate = (examId: string, callback: (exam: PracticeExam | null) => void) => {
    const examRef = doc(db, "practiceExams", examId);
    return onSnapshot(examRef, (doc) => {
        if(doc.exists()) {
            callback({id: doc.id, ...doc.data()} as PracticeExam);
        } else {
            callback(null);
        }
    });
}
export const addPracticeExam = async (data: Omit<PracticeExam, 'id' | 'familyId'>) => {
    const familyId = await getCurrentFamilyId();
    if (!familyId) throw new Error("User not in a family");
    const docRef = await addDoc(collection(db, 'practiceExams'), { ...data, familyId });
    return docRef;
};
export const updatePracticeExam = (id: string, data: Partial<Omit<PracticeExam, 'id' | 'familyId'>>) => updateDoc(doc(db, 'practiceExams', id), removeUndefined(data));
export const deletePracticeExam = (id: string) => deleteDoc(doc(db, "practiceExams", id));

// Study Plans
export const onStudyPlansUpdate = (callback: (plans: StudyPlan[]) => void) => onFamilyDataUpdate<StudyPlan>('studyPlans', callback);
export const onStudyPlanUpdate = (planId: string, callback: (plan: StudyPlan | null) => void) => {
  const docRef = doc(db, 'studyPlans', planId);
  return onSnapshot(docRef, (snapshot) => {
    if (snapshot.exists()) {
      callback({ id: snapshot.id, ...snapshot.data() } as StudyPlan);
    } else {
      callback(null);
    }
  });
};
export const addStudyPlan = async (data: Omit<StudyPlan, 'id' | 'familyId'>) => {
    const familyId = await getCurrentFamilyId();
    if (!familyId) throw new Error("User not in a family");
    return addDoc(collection(db, 'studyPlans'), { ...data, familyId });
};
export const updateStudyPlan = (id: string, data: Partial<Omit<StudyPlan, 'id' | 'familyId'>>) => {
  const planRef = doc(db, 'studyPlans', id);
  const cleanedData = removeUndefined(data);
  return setDoc(planRef, cleanedData, { merge: true });
};


export const deleteStudyPlan = async (id: string) => {
  const batch = writeBatch(db);
  const planRef = doc(db, 'studyPlans', id);
  batch.delete(planRef);

  // Delete associated assignments
  const assignmentsQuery = query(collection(db, 'studyAssignments'), where('studyPlanId', '==', id));
  const assignmentsSnapshot = await getDocs(assignmentsQuery);
  assignmentsSnapshot.forEach(doc => batch.delete(doc.ref));

  return batch.commit();
};

// Study Assignments
export const onStudyAssignmentsUpdate = (callback: (assignments: StudyAssignment[]) => void) => onFamilyDataUpdate<StudyAssignment>('studyAssignments', callback);
export const addStudyAssignment = async (data: Omit<StudyAssignment, 'id' | 'familyId'>) => {
    const familyId = await getCurrentFamilyId();
    if (!familyId) throw new Error("User not in a family");
    const assignmentData = { ...data, status: 'assigned' as const };
    return addDoc(collection(db, 'studyAssignments'), assignmentData);
};
export const updateStudyAssignment = (id: string, data: Partial<Omit<StudyAssignment, 'id' | 'familyId'>>) => {
    return updateDoc(doc(db, 'studyAssignments', id), removeUndefined(data));
};
export const deleteStudyAssignment = async (id: string) => {
  try {
    await deleteDoc(doc(db, 'studyAssignments', id));
  } catch (error) {
    console.error("Error deleting study assignment:", error);
    throw error;
  }
};


// Goals (Roadmaps)
export const onGoalsUpdate = (callback: (goals: Goal[]) => void) => onFamilyDataUpdate<Goal>('goals', callback);
export const onGoalUpdate = (goalId: string, callback: (goal: Goal | null) => void) => {
    const docRef = doc(db, 'goals', goalId);
    return onSnapshot(docRef, (snapshot) => {
        if (snapshot.exists()) {
            callback({ id: snapshot.id, ...snapshot.data() } as Goal);
        } else {
            callback(null);
        }
    });
};
export const getGoal = async (goalId: string): Promise<Goal | null> => {
    const docRef = doc(db, 'goals', goalId);
    const snapshot = await getDoc(docRef);
    if (snapshot.exists()) {
        return { id: snapshot.id, ...snapshot.data() } as Goal;
    }
    return null;
}
export const addGoal = async (data: Omit<Goal, 'id' | 'familyId' | 'createdAt' | 'status'>) => {
    const familyId = await getCurrentFamilyId();
    const auth = getAuth();
    const user = auth.currentUser;
    if (!familyId || !user) throw new Error("User not authenticated or not in a family");

    const newGoal: Omit<Goal, 'id'> = {
        ...data,
        familyId,
        creatorId: user.uid,
        createdAt: new Date().toISOString(),
        status: 'in-progress',
        sections: data.sections.map((section, index) => ({
            ...section,
            id: Date.now().toString() + index,
            status: 'unlocked',
            completedUnits: 0,
        }))
    };
    return addDoc(collection(db, 'goals'), newGoal);
};




export const updateGoal = async (id: string, data: Partial<Omit<Goal, 'id' | 'familyId' | 'creatorId' | 'createdAt'>>) => {
    const goalRef = doc(db, 'goals', id);
    const cleanedData = removeUndefined(data);

    // Recalculate section statuses if sections are being updated
    if (cleanedData.sections) {
        cleanedData.sections.forEach((section: GoalSection) => {
            if ((section.completedUnits || 0) >= section.sectionTotalUnits) {
                section.status = 'completed';
            }
        });

        const isGoalComplete = cleanedData.sections.every((s: GoalSection) => s.status === 'completed');
        if (isGoalComplete) {
            cleanedData.status = 'completed';
            await checkAndAwardBadges(cleanedData.assigneeId, (await getCurrentFamilyId())!, { type: 'goal_completed' });
        }
    }

    return updateDoc(goalRef, cleanedData);
};


export const deleteGoal = (id: string) => deleteDoc(doc(db, "goals", id));


// This needs to be called from a client component that has access to the AuthContext
export const initializeDefaultData = async (familyId: string, userId: string) => {
    const batch = writeBatch(db);

    // Helper data from data.ts
    const initialBooks: Omit<Book, 'id' | 'familyId' | 'createdAt'>[] = [
        { title: "Yerdeniz Büyücüsü", author: "Ursula K. Le Guin", image: 'https://placehold.co/300x450.png', type: "Kitap", tags: ["Fantastik"], rating: 4.5, description: "Ged'in büyücülük yolculuğu.", pageCount: 208, isForChildren: false, readers: [] },
        { title: "Küçük Prens", author: "Antoine de Saint-Exupéry", image: 'https://placehold.co/300x450.png', type: "Kitap", tags: ["Çocuk Klasikleri", "Felsefe"], rating: 4.9, description: "Bir pilot ve küçük bir prensin hikayesi.", pageCount: 96, isForChildren: true, readers: [] },
    ];

    const initialTasks: Omit<Task, 'id' | 'familyId' | 'assigneeId' | 'createdAt'>[] = [
        { title: 'Odanı Topla', points: 20, dueDate: '2024-08-15', completed: false, category: 'Ev İşleri', subtasks: [{id: 's1', title: 'Yatağını düzelt', completed: true}, {id: 's2', title: 'Oyuncakları topla', completed: false}] },
        { title: 'Matematik Ödevi', points: 50, dueDate: '2024-08-12', completed: false, category: 'Okul', subtasks: [] },
    ];

    const initialShoppingLists: Omit<ShoppingNoteList, 'id' | 'familyId'>[] = [
        {
            name: 'Haftalık Market Alışverişi',
            icon: 'ShoppingCart',
            items: [
                { id: '1', name: 'Süt', completed: true },
                { id: '2', name: 'Ekmek', completed: true },
                { id: '3', name: 'Yumurta', completed: false },
            ],
        }
    ];

    const initialCalendarEvents: Omit<CalendarEvent, 'id' | 'familyId'>[] = [
        { title: 'Doktor Randevusu', startDate: '2024-08-20', recurrence: 'one-time' },
        { title: 'Elif\'in Doğum Günü', startDate: '2024-09-05', recurrence: 'yearly' },
    ];

    const initialRecipes: Omit<Recipe, 'id'|'familyId'>[] = [
        {
            title: "Menemen",
            category: 'Kahvaltı',
            rating: 4.8,
            instructions: "Biberleri ve domatesleri doğrayın. Tereyağını tavada eritin ve biberleri kavurun. Domatesleri ekleyip suyunu çekene kadar pişirin. Yumurtaları kırın ve karıştırarak pişirin. Baharatları ekleyip servis yapın."
        },
        {
            title: "Mercimek Çorbası",
            category: 'Akşam Yemeği',
            rating: 4.9,
            instructions: "Tüm sebzeleri doğrayın. Mercimeği yıkayıp süzün. Tencerede yağı kızdırıp soğanları kavurun, salçayı ekleyin. Diğer sebzeleri ve mercimeği ekleyip üzerini geçecek kadar sıcak su koyun. Sebzeler yumuşayana kadar pişirin ve blenderdan geçirin. Baharatları ekleyip bir taşım daha kaynatın."
        }
    ];

    const initialMealPlan: MealPlan = {
      "2024-08-12": { // This key needs to be dynamic based on current week, but for initial setup it's fine
        "Kahvaltı": initialRecipes[0] as Recipe,
        "Akşam Yemeği": initialRecipes[1] as Recipe,
      },
    };

    const initialPracticeExams: Omit<PracticeExam, 'id' | 'familyId'>[] = [
         {
            name: "LGS Deneme Sınavı 1",
            subjects: [
                { id: "1", name: "Matematik", questionCount: 20 },
                { id: "2", name: "Türkçe", questionCount: 20 },
                { id: "3", name: "Fen Bilimleri", questionCount: 20 },
            ],
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
            isArchived: false,
        }
    ];


    // Initial Books
    initialBooks.forEach(book => {
        const docRef = doc(collection(db, 'mediaItems'));
        batch.set(docRef, { ...book, familyId, createdAt: new Date().toISOString() });
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
        batch.set(docRef, { ...task, familyId, assigneeId: userId, createdAt: new Date().toISOString() });
    });

    // Initial Shopping List
    initialShoppingLists.forEach(list => {
        const docRef = doc(collection(db, 'shoppingNotes'));
        batch.set(docRef, { ...list, familyId });
    });
    
    // Initial Calendar Events
    initialCalendarEvents.forEach(event => {
        const docRef = doc(collection(db, 'calendarEvents'));
        batch.set(docRef, { ...event, familyId });
    });

    // Initial Recipes
    initialRecipes.forEach(recipe => {
        const docRef = doc(collection(db, 'recipes'));
        batch.set(docRef, { ...recipe, familyId });
    });

    // Initial Meal Plan
    Object.entries(initialMealPlan).forEach(([dayKey, dayPlan]) => {
        const docRef = doc(db, "mealPlan", `${familyId}_${dayKey}`);
        batch.set(docRef, { ...dayPlan, familyId });
    });

    // Initial Education Content
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

type TriggerEvent = 
  | { type: 'task_completed', task: Task, points?: number } 
  | { type: 'test_completed', test: Test, points?: number }
  | { type: 'book_finished', book: Book, points?: number }
  | { type: 'goal_section_completed', points: number }
  | { type: 'goal_completed' }
  | { type: 'habit_streak_update', streak: number }
  | { type: 'prayer_completed', prayerCount: number }
  | { type: 'memorization_completed' };


export const checkAndAwardBadges = async (
    memberId: string, 
    familyId: string, 
    triggerEvent: TriggerEvent
) => {
    const familyRef = doc(db, "families", familyId);
    const familySnap = await getDoc(familyRef);
    if (!familySnap.exists()) return;

    const family = familySnap.data();
    const memberIndex = family.members.findIndex((m: FamilyMember) => m.id === memberId);
    if (memberIndex === -1) return;

    const member: FamilyMember = family.members[memberIndex];
    const newBadges = new Set(member.badges || []);
    let xpGained = triggerEvent.points || 0;
    
    const completedTasks = (member.completedTasks || 0) + (triggerEvent.type === 'task_completed' ? 1 : 0);
    
    // --- Badge Logic ---
    if (triggerEvent.type === 'task_completed') {
        if (completedTasks >= 1) newBadges.add('✨');
        if (completedTasks >= 10) newBadges.add('🔥');
        if (completedTasks >= 50) newBadges.add('🚀');
        if (completedTasks >= 100) newBadges.add('🏆');
    }

    if (triggerEvent.type === 'test_completed' && triggerEvent.test) {
        const testCountSnapshot = await getDocs(query(collection(db, "tests"), where("studentId", "==", memberId), where("status", "==", "Sonuçlandı")));
        const completedTestCount = testCountSnapshot.size;
        if (completedTestCount >= 1) newBadges.add('🎓');
        if (completedTestCount >= 10) newBadges.add('🧠');
        if (completedTestCount >= 25) newBadges.add('🦉');
        if ((triggerEvent.test?.score || 0) >= 90) newBadges.add('🎯');
        if ((triggerEvent.test?.score || 0) === 100) newBadges.add('💯');
    }
    
    if (triggerEvent.type === 'book_finished' && triggerEvent.book) {
        const userLibQuery = await getDoc(doc(db, "userLibraries", `${familyId}_${memberId}`));
        if (userLibQuery.exists()) {
            const finishedBooksCount = userLibQuery.data().books.filter((b: UserLibraryBook) => b.status === 'finished').length;
            if (finishedBooksCount >= 1) newBadges.add('📖');
            if (finishedBooksCount >= 10) newBadges.add('📚');
            if (finishedBooksCount >= 25) newBadges.add('🏛️');
        }
        if ((triggerEvent.book?.pageCount || 0) >= 500) newBadges.add(' marathon');
    }

    if (triggerEvent.type === 'habit_streak_update') {
        if (triggerEvent.streak >= 7) newBadges.add('🧡');
        if (triggerEvent.streak >= 30) newBadges.add('❤️‍🔥');
    }
    
    if(triggerEvent.type === 'prayer_completed') {
        const prayerProgressSnap = await getDoc(doc(db, 'prayerProgress', `${familyId}_${memberId}`));
        if(prayerProgressSnap.exists()) {
            const completions = prayerProgressSnap.data().completions || {};
            if(Object.keys(completions).length >= 1) newBadges.add('🕌');
            if(Object.keys(completions).length >= 7) newBadges.add('🌙');
        }
        if (triggerEvent.prayerCount === 5) newBadges.add('🌟');
    }
    
    if(triggerEvent.type === 'memorization_completed') {
        const progressSnap = await getDocs(query(collection(db, 'memorizationProgress'), where('memberId', '==', memberId), where('completed', '==', true)));
        if (progressSnap.size >= 1) newBadges.add('💡');
        if (progressSnap.size >= 10) newBadges.add('🧠+');
        // 'Hafız-ı Kelam' would need more complex logic to check full category completion
    }

    if(triggerEvent.type === 'goal_section_completed') newBadges.add('🗺️');
    if(triggerEvent.type === 'goal_completed') newBadges.add('🏁');


    // --- XP & Level Logic ---
    const currentXp = member.xp || 0;
    const newXp = currentXp + xpGained;
    const currentLevel = member.level || 1;
    const newLevel = Math.floor(newXp / 1000) + 1;
    
    const updatedMemberData: Partial<FamilyMember> = {
        xp: newXp,
        level: newLevel,
        completedTasks: completedTasks,
    };
    if (newBadges.size > (member.badges || []).length) {
        updatedMemberData.badges = Array.from(newBadges);
    }
    
    if (Object.keys(updatedMemberData).length > 0) {
        await updateFamilyMemberInFamily(familyId, memberId, updatedMemberData);
    }
};

export const updateTask = async (id: string, data: Partial<Task>) => {
    const taskRef = doc(db, 'tasks', id);
    const updateData = removeUndefined(data);

    if (data.completed === false) {
        const taskSnap = await getDoc(taskRef);
        if (taskSnap.exists()) {
            const task = taskSnap.data() as Task;
            const memberRef = doc(db, 'families', task.familyId);
            const familySnap = await getDoc(memberRef);
            if (familySnap.exists()) {
                const familyData = familySnap.data();
                const member = familyData.members.find((m: FamilyMember) => m.id === task.assigneeId);
                if (member) {
                     const updatedXp = Math.max(0, (member.xp || 0) - task.points);
                     await updateFamilyMemberInFamily(task.familyId, task.assigneeId, { xp: updatedXp });
                }
            }
        }
    }
    await updateDoc(taskRef, updateData);
};

export const updateTest = async (id: string, data: Partial<Omit<Test, 'id' | 'familyId'>>, questionsForSubcollection?: (BankQuestion | QuickTestQuestion)[]) => {
    const testDocRef = doc(db, 'tests', id);
    let finalData = removeUndefined(data);

    // If questions are provided, process and include them in the update
    if (questionsForSubcollection && questionsForSubcollection.length > 0) {
        const questionsForTestDoc = questionsForSubcollection.map((q, index) => {
            const questionId = 'id' in q ? q.id : ('questionId' in q ? q.questionId : '');
            return {
                questionId: questionId,
                questionNumber: index + 1,
                imageUrl: q.imageUrl,
            };
        });
        finalData = { ...finalData, questions: questionsForTestDoc };
    }

    await updateDoc(testDocRef, finalData);
};



// Ambient Sounds
export const onAmbientSoundsUpdate = (callback: (sounds: AmbientSound[]) => void, runOnce?: boolean) => onFamilyDataUpdate<AmbientSound>('ambientSounds', callback, runOnce);
export const addAmbientSound = async (data: Omit<AmbientSound, 'id' | 'familyId'>) => {
    const familyId = await getCurrentFamilyId();
    if (!familyId) throw new Error("User not in a family");
    return addDoc(collection(db, 'ambientSounds'), { ...data, familyId });
};
export const deleteAmbientSound = (id: string) => deleteDoc(doc(db, "ambientSounds", id));

// Ezber Takibi
export const onMemorizationItemsUpdate = (callback: (items: MemorizationItem[]) => void) => onFamilyDataUpdate<MemorizationItem>('memorizationItems', callback);
export const addMemorizationItem = async (data: Omit<MemorizationItem, 'id' | 'familyId'>) => {
    const familyId = await getCurrentFamilyId();
    if (!familyId) throw new Error("User not in a family");
    return addDoc(collection(db, 'memorizationItems'), { ...data, familyId });
};
export const updateMemorizationItem = (id: string, data: Partial<Omit<MemorizationItem, 'id' | 'familyId'>>) => updateDoc(doc(db, 'memorizationItems', id), data);
export const deleteMemorizationItem = async (id: string) => {
    // Also delete progress associated with this item
    const q = query(collection(db, 'memorizationProgress'), where('itemId', '==', id));
    const snapshot = await getDocs(q);
    const batch = writeBatch(db);
    snapshot.forEach(doc => batch.delete(doc.ref));
    batch.delete(doc(db, 'memorizationItems', id));
    return batch.commit();
};

export const onMemorizationProgressUpdate = (callback: (progress: MemorizationProgress[]) => void) => onFamilyDataUpdate<MemorizationProgress>('memorizationProgress', callback);
export const updateMemorizationProgress = async (itemId: string, memberId: string, completed: boolean) => {
    const familyId = await getCurrentFamilyId();
    if (!familyId) throw new Error("User not in a family");
    
    const progressId = `${itemId}_${memberId}`;
    const docRef = doc(db, 'memorizationProgress', progressId);

    const progressData: MemorizationProgress = {
        id: progressId,
        familyId,
        itemId,
        memberId,
        completed,
        completedAt: completed ? new Date().toISOString() : undefined,
    };
    
    if (completed) {
        await checkAndAwardBadges(memberId, familyId, { type: 'memorization_completed', points: 50 });
    }

    return setDoc(docRef, removeUndefined(progressData), { merge: true });
};


export const removeMemorizationProgress = async (itemId: string, memberId: string) => {
    const familyId = await getCurrentFamilyId();
    if (!familyId) throw new Error("User not in a family");
    const progressId = `${itemId}_${memberId}`;
    const docRef = doc(db, 'memorizationProgress', progressId);
    return deleteDoc(docRef);
};

export const resetAllMemorizationProgress = async () => {
    const familyId = await getCurrentFamilyId();
    if (!familyId) throw new Error("User not in a family");
    
    const q = query(collection(db, 'memorizationProgress'), where('familyId', '==', familyId));
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
        return; // No progress to delete
    }

    const batch = writeBatch(db);
    snapshot.forEach(doc => {
        batch.delete(doc.ref);
    });
    
    await batch.commit();
};

export const deleteAllMemorizationItems = async () => {
    const familyId = await getCurrentFamilyId();
    if (!familyId) throw new Error("User not in a family");
    
    const batch = writeBatch(db);

    // Delete all items
    const itemsQuery = query(collection(db, 'memorizationItems'), where('familyId', '==', familyId));
    const itemsSnapshot = await getDocs(itemsQuery);
    itemsSnapshot.forEach(doc => batch.delete(doc.ref));

    // Delete all progress
    const progressQuery = query(collection(db, 'memorizationProgress'), where('familyId', '==', familyId));
    const progressSnapshot = await getDocs(progressQuery);
    progressSnapshot.forEach(doc => batch.delete(doc.ref));
    
    await batch.commit();
};


export const updateHabitCompletion = async (taskId: string, day: Date, isCompleted: boolean) => {
    const taskRef = doc(db, 'tasks', taskId);
    const taskSnap = await getDoc(taskRef);

    if (!taskSnap.exists()) {
        console.error("Task not found for habit update:", taskId);
        return;
    }

    const taskData = taskSnap.data() as Task;
    if (!taskData.isRecurring) return;

    const dayKey = format(day, 'yyyy-MM-dd');
    const allCompletedDates = new Set(taskData.completedDates || []);

    if (isCompleted) {
        allCompletedDates.add(dayKey);
    } else {
        allCompletedDates.delete(dayKey);
    }

    const completedDates = Array.from(allCompletedDates);
    const updatePayload: Partial<Task> = {
        completedDates: completedDates,
    };
    
    let streak = 0;
    let checkDate = isCompleted && isSameDay(day, new Date()) ? new Date() : subDays(new Date(), 1);
    checkDate.setHours(0,0,0,0);
    
    if (taskData.recurrenceType === 'daily') {
        while(allCompletedDates.has(format(checkDate, 'yyyy-MM-dd'))) {
            streak++;
            checkDate = subDays(checkDate, 1);
        }

    } else if (taskData.recurrenceType === 'weekly' && taskData.recurrenceDays && taskData.recurrenceDays.length > 0) {
        let checkWeekStart = startOfWeek(checkDate, { weekStartsOn: 1 });

        const isWeekComplete = (weekStart: Date): boolean => {
            return taskData.recurrenceDays!.every(dayId => {
                const dayIndex = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].indexOf(dayId);
                const dateToCheck = addDays(weekStart, dayIndex);
                if (isFuture(dateToCheck) && !isSameDay(dateToCheck, new Date())) {
                    return true; // Ignore future required days
                }
                return allCompletedDates.has(format(dateToCheck, 'yyyy-MM-dd'));
            });
        };
        
        while(isWeekComplete(checkWeekStart)) {
            streak++;
            checkWeekStart = subWeeks(checkWeekStart, 1);
        }
    }


    updatePayload.streak = streak;
    updatePayload.bestStreak = Math.max(taskData.bestStreak || 0, streak);

    if (isCompleted) {
        if (streak > (taskData.streak || 0)) {
            await checkAndAwardBadges(taskData.assigneeId, taskData.familyId, { type: 'habit_streak_update', streak: streak, points: streak * 5 });
        }
    }
        
    await updateDoc(taskRef, updatePayload);
};


// Notes Feature
const noteColors = [
    'bg-yellow-100 border-yellow-200 text-yellow-900',
    'bg-blue-100 border-blue-200 text-blue-900',
    'bg-green-100 border-green-200 text-green-900',
    'bg-pink-100 border-pink-200 text-pink-900',
    'bg-purple-100 border-purple-200 text-purple-900',
];
export const onNotebooksUpdate = (callback: (notebooks: Notebook[]) => void) => onFamilyDataUpdate<Notebook>('notebooks', callback);
export const onNotesUpdate = (callback: (notes: Note[]) => void) => onFamilyDataUpdate<Note>('notes', callback);
export const addNotebook = async (data: Omit<Notebook, 'id' | 'familyId' | 'createdAt' | 'ownerId'>) => {
    const familyId = await getCurrentFamilyId();
    const auth = getAuth();
    const user = auth.currentUser;
    if (!familyId || !user) throw new Error("User not authenticated or not in a family");

    const newNotebook: Omit<Notebook, 'id'> = {
        ...data,
        familyId,
        ownerId: user.uid,
        createdAt: new Date().toISOString(),
    };
    return addDoc(collection(db, 'notebooks'), newNotebook);
};
export const updateNotebook = (id: string, data: Partial<Omit<Notebook, 'id' | 'familyId'>>) => {
    const cleanedData = removeUndefined(data);
    return updateDoc(doc(db, 'notebooks', id), cleanedData);
};
export const deleteNotebook = (id: string) => deleteDoc(doc(db, "notebooks", id));

// Fetches a single notebook and its associated notes
export const onNotebookDetailsUpdate = (
  notebookId: string,
  callback: (details: { notebook: Notebook; notes: Note[] } | null) => void
) => {
  const notebookRef = doc(db, 'notebooks', notebookId);

  const unsubscribeNotebook = onSnapshot(notebookRef, (notebookSnap) => {
    if (!notebookSnap.exists()) {
      callback(null);
      return;
    }
    const notebookData = { id: notebookSnap.id, ...notebookSnap.data() } as Notebook;

    const notesQuery = query(
      collection(db, 'notes'),
      where('notebookId', '==', notebookId)
    );
    
    const unsubscribeNotes = onSnapshot(notesQuery, (notesSnap) => {
      const notesData = notesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Note)).sort((a,b) => b.updatedAt.localeCompare(a.updatedAt));
      callback({ notebook: notebookData, notes: notesData });
    });

    return () => unsubscribeNotes();
  });

  return () => unsubscribeNotebook();
};


export const addSectionToNotebook = async (notebookId: string, title: string) => {
  const notebookRef = doc(db, 'notebooks', notebookId);
  const notebookSnap = await getDoc(notebookRef);

  if (notebookSnap.exists()) {
    const notebook = notebookSnap.data() as Notebook;
    const newSection: NotebookSection = {
      id: Date.now().toString(),
      title,
      order: notebook.sections.length,
      color: noteColors[notebook.sections.length % noteColors.length], // Assign a color cyclically
    };
    await updateDoc(notebookRef, {
      sections: arrayUnion(newSection),
    });
    return newSection.id;
  }
};

export const addNoteToSection = async (notebookId: string, sectionId: string, noteData: Partial<Omit<Note, 'id'| 'notebookId'|'sectionId'|'familyId'|'createdAt'|'updatedAt'>>) => {
    const familyId = await getCurrentFamilyId();
    if (!familyId) throw new Error("User not authenticated");

    const newNote: Omit<Note, 'id'> = {
        notebookId,
        sectionId,
        familyId,
        title: noteData.title || "Yeni Not",
        content: noteData.content || [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        tags: [],
        color: noteColors[Math.floor(Math.random() * noteColors.length)],
        imageUrl: noteData.imageUrl || null,
        folder: noteData.folder,
    };
    return addDoc(collection(db, 'notes'), newNote);
};

export const updateNoteInSection = (notebookId: string, noteId: string, noteData: Partial<Note>) => {
  const noteRef = doc(db, 'notes', noteId);
  return updateDoc(noteRef, { ...noteData, updatedAt: new Date().toISOString() });
};

export const deleteNoteFromSection = (noteId: string) => {
  const noteRef = doc(db, 'notes', noteId);
  return deleteDoc(noteRef);
};


// Prayer Progress
export const onPrayerProgressUpdate = (callback: (progress: PrayerProgress[]) => void) => onFamilyDataUpdate<PrayerProgress>('prayerProgress', callback);

export const onSinglePrayerProgressUpdate = (memberId: string, callback: (progress: PrayerProgress | null) => void) => {
    const auth = getAuth();
    return onAuthStateChanged(auth, async (user) => {
        if (user) {
            const familyId = await getCurrentFamilyId();
            if (familyId) {
                const docId = `${familyId}_${memberId}`;
                const docRef = doc(db, 'prayerProgress', docId);
                return onSnapshot(docRef, (doc) => {
                    callback(doc.exists() ? { id: doc.id, ...doc.data() } as PrayerProgress : null);
                });
            } else {
                 callback(null);
            }
        } else {
            callback(null);
        }
    });
};


export const updatePrayerProgress = async (memberId: string, completions: PrayerProgress['completions']) => {
    const familyId = await getCurrentFamilyId();
    if (!familyId) throw new Error("User not in a family");

    const docId = `${familyId}_${memberId}`;
    const docRef = doc(db, 'prayerProgress', docId);

    const docSnap = await getDoc(docRef);
    const existingCompletions = docSnap.exists() ? docSnap.data().completions : {};

    const updatedCompletions = { ...existingCompletions, ...completions };
    
    const updateData = {
        familyId,
        memberId,
        id: docId,
        completions: updatedCompletions
    };
    
    const todayKey = format(new Date(), 'yyyy-MM-dd');
    const todaysCompletions = updatedCompletions[todayKey] || [];
    
    if(todaysCompletions.length > 0) {
        const previousCompletions = existingCompletions[todayKey] || [];
        if (todaysCompletions.length > previousCompletions.length) {
             await checkAndAwardBadges(memberId, familyId, { type: 'prayer_completed', prayerCount: todaysCompletions.length, points: 5 });
        }
    }

    return setDoc(docRef, updateData, { merge: true });
};

// Daily Tracking
export const onDailyTrackingsUpdate = (
  familyId: string,
  memberId: string,
  callback: (trackings: DailyTracking[]) => void
) => {
  const q = query(
    collection(db, 'dailyTrackings'),
    where('familyId', '==', familyId),
    where('memberId', '==', memberId)
  );
  return onSnapshot(q, (snapshot) => {
    const trackings = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as DailyTracking));
    callback(trackings);
  });
};

export const setDailyTrackingStatus = async (
  memberId: string,
  item: { id: string; type: TrackableItemType },
  date: Date,
  isChecked: boolean
) => {
  const familyId = await getCurrentFamilyId();
  if (!familyId) throw new Error("User not in a family");

  const dateKey = format(date, 'yyyy-MM-dd');
  const trackingId = `${dateKey}_${memberId}_${item.id}`;
  const trackingRef = doc(db, 'dailyTrackings', trackingId);

  if (isChecked) {
    const trackingData: DailyTracking = {
      id: trackingId,
      familyId,
      memberId,
      itemId: item.id,
      itemType: item.type,
      date: dateKey,
    };
    await setDoc(trackingRef, trackingData);
  } else {
    await deleteDoc(trackingRef);
  }
};

// BUDGETING
// Accounts
export const onAccountsUpdate = (callback: (accounts: Account[]) => void) => onFamilyDataUpdate<Account>('accounts', callback);

export const addAccount = async (data: Omit<Account, 'id' | 'familyId' | 'balance'>) => {
    const familyId = await getCurrentFamilyId();
    if (!familyId) throw new Error("User not in a family");
    const cleanedData = removeUndefined(data);
    return addDoc(collection(db, 'accounts'), { ...cleanedData, familyId, balance: 0 });
};

export const updateAccount = async (id: string, data: Partial<Omit<Account, 'id' | 'familyId' | 'balance'>>) => {
    const cleanedData = removeUndefined(data);
    return updateDoc(doc(db, 'accounts', id), cleanedData);
};

export const deleteAccount = async (id: string) => {
    return deleteDoc(doc(db, 'accounts', id));
};

// Transactions
export const onTransactionsUpdate = (callback: (transactions: Transaction[]) => void, month: Date) => {
    const auth = getAuth();
    let unsubscribe: ReturnType<typeof onSnapshot> | null = null;

    const authUnsubscribe = onAuthStateChanged(auth, async (user) => {
        if (unsubscribe) unsubscribe();

        if (user) {
            const familyId = await getCurrentFamilyId();
            if (familyId) {
                const start = format(startOfWeek(startOfMonth(month)), 'yyyy-MM-dd');
                const end = format(endOfWeek(endOfMonth(month)), 'yyyy-MM-dd');

                const q = query(
                    collection(db, "transactions"),
                    where("familyId", "==", familyId),
                    where("date", ">=", start),
                    where("date", "<=", end),
                    orderBy("date", "desc")
                );

                unsubscribe = onSnapshot(q, (snapshot) => {
                    const transactions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Transaction));
                    callback(transactions);
                });
            } else {
                callback([]);
            }
        } else {
            callback([]);
        }
    });

    return () => {
        authUnsubscribe();
        if (unsubscribe) unsubscribe();
    };
};

const updateAccountBalance = async (accountId: string, amount: number, type: 'income' | 'expense') => {
    const accountRef = doc(db, 'accounts', accountId);
    const accountSnap = await getDoc(accountRef);
    if (accountSnap.exists()) {
        const currentBalance = accountSnap.data().balance || 0;
        const newBalance = type === 'income' ? currentBalance + amount : currentBalance - amount;
        await updateDoc(accountRef, { balance: newBalance });
    }
};

export const addTransaction = async (data: Omit<Transaction, 'id' | 'familyId'>) => {
    const familyId = await getCurrentFamilyId();
    if (!familyId) throw new Error("User not in a family");

    const batch = writeBatch(db);
    const cleanedData = removeUndefined(data);

    const newTransactionRef = doc(collection(db, 'transactions'));
    batch.set(newTransactionRef, { ...cleanedData, familyId });

    const accountRef = doc(db, 'accounts', data.accountId);
    const accountSnap = await getDoc(accountRef);
    if (accountSnap.exists()) {
        const currentBalance = accountSnap.data().balance || 0;
        const newBalance = data.type === 'income' ? currentBalance + data.amount : currentBalance - data.amount;
        batch.update(accountRef, { balance: newBalance });
    }

    return batch.commit();
};

export const updateTransaction = async (id: string, data: Partial<Omit<Transaction, 'id'>>) => {
    const transactionRef = doc(db, 'transactions', id);
    const oldTransactionSnap = await getDoc(transactionRef);
    if (!oldTransactionSnap.exists()) throw new Error("Transaction not found");

    const oldData = oldTransactionSnap.data() as Transaction;
    const batch = writeBatch(db);
    const cleanedData = removeUndefined(data);

    // Revert old balance change
    const oldAccountRef = doc(db, 'accounts', oldData.accountId);
    const oldAccountSnap = await getDoc(oldAccountRef);
    if (oldAccountSnap.exists()) {
        const oldBalance = oldAccountSnap.data().balance;
        const revertedBalance = oldData.type === 'income' ? oldBalance - oldData.amount : oldBalance + oldData.amount;
        batch.update(oldAccountRef, { balance: revertedBalance });
    }

    // Apply new balance change
    const newAccountId = data.accountId || oldData.accountId;
    const newAmount = data.amount || oldData.amount;
    const newType = data.type || oldData.type;
    const newAccountRef = doc(db, 'accounts', newAccountId);
    const newAccountSnap = await getDoc(newAccountRef);
    if (newAccountSnap.exists()) {
        let currentBalance = newAccountSnap.data().balance;
        // If account changed, old account's reverted balance is correct.
        // If account is the same, use the reverted balance for calculation.
        if (oldData.accountId === newAccountId) {
            const oldBalance = oldAccountSnap.data().balance;
            currentBalance = oldData.type === 'income' ? oldBalance - oldData.amount : oldBalance + oldData.amount;
        }
        const newBalance = newType === 'income' ? currentBalance + newAmount : currentBalance - newAmount;
        batch.update(newAccountRef, { balance: newBalance });
    }

    // Update the transaction itself
    batch.update(transactionRef, cleanedData);

    return batch.commit();
};

export const deleteTransaction = async (id: string) => {
    const transactionRef = doc(db, 'transactions', id);
    const transactionSnap = await getDoc(transactionRef);
    if (!transactionSnap.exists()) return;

    const data = transactionSnap.data() as Transaction;
    const batch = writeBatch(db);

    // Revert balance change
    const accountRef = doc(db, 'accounts', data.accountId);
    const accountSnap = await getDoc(accountRef);
    if (accountSnap.exists()) {
        const currentBalance = accountSnap.data().balance;
        const newBalance = data.type === 'income' ? currentBalance - data.amount : currentBalance - data.amount;
        batch.update(accountRef, { balance: newBalance });
    }

    // Delete transaction
    batch.delete(transactionRef);

    return batch.commit();
};


// Budgets
export const onBudgetsUpdate = (callback: (budgets: Budget[]) => void) => onFamilyDataUpdate<Budget>('budgets', callback);
export const updateBudget = async (data: Partial<Omit<Budget, 'id' | 'familyId'>>, month: string) => {
    const familyId = await getCurrentFamilyId();
    if (!familyId) throw new Error("User not in a family");

    const budgetId = `${familyId}_${month}`; // e.g., 'family123_2024-08'
    const docRef = doc(db, "budgets", budgetId);
    return setDoc(docRef, { ...removeUndefined(data), familyId }, { merge: true });
};

// Tracked Books
export const onTrackedBooksUpdate = (callback: (books: TrackedBook[]) => void, runOnce = false) => {
  return onFamilyDataUpdate<TrackedBook>('trackedBooks', async (books) => {
    const familyId = await getCurrentFamilyId();
    if (!familyId) {
      callback([]);
      return;
    }
    
    // Get all tests for the family in one go
    const allTestsQuery = query(collection(db, 'tests'), where('familyId', '==', familyId));
    const allTestsSnapshot = await getDocs(allTestsQuery);
    const allTests = allTestsSnapshot.docs.map(d => d.data() as Test);
    
    const enrichedBooks = await Promise.all(books.map(async (book) => {
      const testsQuery = query(collection(db, 'trackedBookTests'), where('bookId', '==', book.id));
      const testsSnapshot = await getDocs(testsQuery);
      const bookTests = testsSnapshot.docs.map(d => ({id: d.id, ...d.data()}) as TrackedBookTest & {id: string});
      const bookTestIds = new Set(bookTests.map(t => t.id));

      const solvedTests = allTests.filter(t => t.sourceType === 'trackedBook' && bookTestIds.has(t.sourceId!) && t.status === 'Sonuçlandı');

      return {
        ...book,
        subjectCount: new Set(bookTests.map(t => t.subjectId)).size,
        testCount: bookTests.length,
        questionCount: bookTests.reduce((sum, test) => sum + (test.questionCount || 0), 0),
        solvedTestCount: solvedTests.length,
        totalCorrectAnswers: solvedTests.reduce((sum, test) => sum + (test.correctAnswers || 0), 0),
        totalIncorrectAnswers: solvedTests.reduce((sum, test) => sum + (test.incorrectAnswers || 0), 0),
      };
    }));
    callback(enrichedBooks);
  }, runOnce);
};
export const addTrackedBook = async (data: Pick<TrackedBook, 'title' | 'publisher' | 'bookType'>) => {
    const familyId = await getCurrentFamilyId();
    if (!familyId) throw new Error("User not in a family");
    return addDoc(collection(db, 'trackedBooks'), { ...data, familyId, subjects: [], createdAt: new Date().toISOString() });
};
export const onTrackedBookUpdate = (bookId: string, callback: (book: TrackedBook | null) => void) => {
  return onSnapshot(doc(db, 'trackedBooks', bookId), (docSnap) => {
    if (docSnap.exists()) {
      callback({ id: docSnap.id, ...docSnap.data() } as TrackedBook);
    } else {
      callback(null);
    }
  });
};
export const updateTrackedBook = (id: string, data: Partial<Omit<TrackedBook, 'id' | 'familyId'>>) => {
    const docRef = doc(db, 'trackedBooks', id);
    const cleanedData = removeUndefined(data);
    return setDoc(docRef, cleanedData, { merge: true });
};
export const deleteTrackedBook = async (id: string) => {
  const batch = writeBatch(db);
  const bookRef = doc(db, 'trackedBooks', id);
  batch.delete(bookRef);

  // Delete associated tests
  const testsQuery = query(collection(db, 'trackedBookTests'), where('bookId', '==', id));
  const testsSnapshot = await getDocs(testsQuery);
  testsSnapshot.forEach(doc => batch.delete(doc.ref));

  return batch.commit();
};

// Tracked Book Tests
export const onTrackedBookTestsUpdate = (bookId: string, callback: (tests: TrackedBookTest[]) => void) => {
  const q = query(collection(db, 'trackedBookTests'), where('bookId', '==', bookId));
  return onSnapshot(q, (snapshot) => {
    const tests = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as TrackedBookTest));
    callback(tests);
  });
};
export const addTrackedBookTest = async (bookId: string, data: Omit<TrackedBookTest, 'id' | 'bookId' | 'familyId'>) => {
    const familyId = await getCurrentFamilyId();
    if (!familyId) throw new Error("User not in a family");
    return addDoc(collection(db, 'trackedBookTests'), { ...removeUndefined(data), familyId, bookId });
};
export const addBulkTrackedBookTests = async (bookId: string, subjectId: string, topicId: string, count: number, questionCount: number, prefix: string) => {
    const familyId = await getCurrentFamilyId();
    if (!familyId) throw new Error("User not in a family");

    const batch = writeBatch(db);
    for (let i = 1; i <= count; i++) {
        const testRef = doc(collection(db, 'trackedBookTests'));
        const newTest: Omit<TrackedBookTest, 'id'> = {
            familyId,
            bookId,
            subjectId,
            topicId,
            name: `${prefix} ${i}`,
            questionCount,
            answerKey: {}
        };
        batch.set(testRef, newTest);
    }
    await batch.commit();
};
export const updateTrackedBookTest = (id: string, data: Partial<Omit<TrackedBookTest, 'id'>>) => updateDoc(doc(db, 'trackedBookTests', id), removeUndefined(data));
export const deleteTrackedBookTest = (id: string) => deleteDoc(doc(db, "trackedBookTests", id));

export const deleteTrackedBookTopic = async (bookId: string, subjectId: string, topicId: string) => {
    const bookRef = doc(db, 'trackedBooks', bookId);
    const bookSnap = await getDoc(bookRef);

    if (bookSnap.exists()) {
        const book = bookSnap.data() as TrackedBook;
        const updatedSubjects = book.subjects.map(subject => {
            if (subject.id === subjectId) {
                return {
                    ...subject,
                    topics: (subject.topics || []).filter(topic => topic.id !== topicId),
                };
            }
            return subject;
        });

        const batch = writeBatch(db);
        batch.update(bookRef, { subjects: updatedSubjects });

        const testsQuery = query(collection(db, 'trackedBookTests'), where('topicId', '==', topicId));
        const testsSnapshot = await getDocs(testsQuery);
        testsSnapshot.forEach(doc => batch.delete(doc.ref));

        await batch.commit();
    }
};

export const deleteTrackedBookSubject = async (bookId: string, subjectId: string) => {
    const bookRef = doc(db, 'trackedBooks', bookId);
    const bookSnap = await getDoc(bookRef);

    if (bookSnap.exists()) {
        const book = bookSnap.data() as TrackedBook;
        
        // Find all test IDs to be deleted
        const subjectToDelete = book.subjects.find(s => s.id === subjectId);
        if (!subjectToDelete) return;
        const topicIdsToDelete = (subjectToDelete.topics || []).map(t => t.id);

        const batch = writeBatch(db);

        // Delete tests belonging to the topics of the subject
        if (topicIdsToDelete.length > 0) {
            const testsQuery = query(collection(db, 'trackedBookTests'), where('topicId', 'in', topicIdsToDelete));
            const testsSnapshot = await getDocs(testsQuery);
            testsSnapshot.forEach(doc => {
                batch.delete(doc.ref);
            });
        }
        
        // Update the book document to remove the subject
        const updatedSubjects = book.subjects.filter(s => s.id !== subjectId);
        batch.update(bookRef, { subjects: updatedSubjects });

        await batch.commit();
    }
};
    
export const updateNotebookFolder = async (notebookId: string, sectionId: string, oldFolderName: string, newFolderName: string) => {
    const notebookRef = doc(db, "notebooks", notebookId);
    const notebookSnap = await getDoc(notebookRef);

    if (notebookSnap.exists()) {
        const notebook = notebookSnap.data() as Notebook;
        const updatedSections = (notebook.sections || []).map(section => {
            if (section.id === sectionId) {
                const updatedFolders = (section.folders || []).map(folder => 
                    folder === oldFolderName ? newFolderName : folder
                );
                return { ...section, folders: updatedFolders };
            }
            return section;
        });

        const batch = writeBatch(db);
        batch.update(notebookRef, { sections: updatedSections });

        // Update all notes in that folder
        const notesQuery = query(collection(db, "notes"), 
            where("notebookId", "==", notebookId), 
            where("sectionId", "==", sectionId),
            where("folder", "==", oldFolderName)
        );
        const notesSnapshot = await getDocs(notesQuery);
        notesSnapshot.forEach(noteDoc => {
            batch.update(noteDoc.ref, { folder: newFolderName });
        });

        await batch.commit();
    }
};
    
export const onTransactionStatsUpdate = (callback: (stats: { [month: string]: { income: number, expense: number } }) => void) => {
    const auth = getAuth();
    let unsubscribe: ReturnType<typeof onSnapshot> | null = null;
    
    const authUnsubscribe = onAuthStateChanged(auth, async (user) => {
        if (unsubscribe) unsubscribe();

        if (user) {
            const familyId = await getCurrentFamilyId();
            if (familyId) {
                // Get data for the last 6 months
                const today = new Date();
                const sixMonthsAgo = subMonths(today, 5);
                const startDate = format(startOfMonth(sixMonthsAgo), 'yyyy-MM-dd');

                const q = query(
                    collection(db, "transactions"),
                    where("familyId", "==", familyId),
                    where("date", ">=", startDate)
                );

                unsubscribe = onSnapshot(q, (snapshot) => {
                    const stats: { [month: string]: { income: number, expense: number } } = {};
                    
                    // Initialize stats for the last 6 months
                    for (let i = 5; i >= 0; i--) {
                        const monthDate = subMonths(today, i);
                        const monthKey = format(monthDate, 'yyyy-MM');
                        stats[monthKey] = { income: 0, expense: 0 };
                    }

                    snapshot.docs.forEach(doc => {
                        const transaction = doc.data() as Transaction;
                        const monthKey = transaction.date.substring(0, 7); // 'YYYY-MM'
                        
                        if (stats[monthKey]) {
                             if (transaction.type === 'income') {
                                stats[monthKey].income += transaction.amount;
                            } else {
                                stats[monthKey].expense += transaction.amount;
                            }
                        }
                    });
                    
                    const formattedStats: { [month: string]: { income: number, expense: number } } = {};
                    Object.keys(stats).sort().forEach(monthKey => {
                        const [year, month] = monthKey.split('-');
                        const monthName = format(new Date(Number(year), Number(month) - 1), 'MMM', {locale: tr});
                        formattedStats[monthName] = stats[monthKey];
                    });

                    callback(formattedStats);
                });
            } else {
                callback({});
            }
        } else {
            callback({});
        }
    });

    return () => {
        authUnsubscribe();
        if (unsubscribe) unsubscribe();
    };
};