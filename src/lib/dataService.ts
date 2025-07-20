import { db } from './firebase';
import { collection, getDocs, doc, getDoc, addDoc, updateDoc, deleteDoc, setDoc, writeBatch, query, where, onSnapshot } from "firebase/firestore";
import type { Book, Task, CalendarEvent, ShoppingList, Test, QuestionBank, PracticeExam } from './data';

// Generic CRUD operations

const getCollection = async <T>(collectionName: string): Promise<T[]> => {
    const querySnapshot = await getDocs(collection(db, collectionName));
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as T));
};

const getDocument = async <T>(collectionName: string, id: string): Promise<T | null> => {
    const docRef = doc(db, collectionName, id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() } as T;
    }
    return null;
};

const addDocument = async <T>(collectionName: string, data: Omit<T, 'id'>) => {
    const docRef = await addDoc(collection(db, collectionName), data);
    return docRef.id;
};

const updateDocument = async <T>(collectionName: string, id: string, data: Partial<Omit<T, 'id'>>) => {
    const docRef = doc(db, collectionName, id);
    await updateDoc(docRef, data);
};

const deleteDocument = async (collectionName: string, id: string) => {
    await deleteDoc(doc(db, collectionName, id));
};

// Specific functions for the app data models

// Books (mediaItems)
export const getBooks = () => getCollection<Book>('mediaItems');
export const getBook = (id: string) => getDocument<Book>('mediaItems', id);
export const addBook = (data: Omit<Book, 'id'>) => addDocument<Book>('mediaItems', data);
export const updateBook = (id: string, data: Partial<Omit<Book, 'id'>>) => updateDocument<Book>('mediaItems', id, data);
export const deleteBook = (id: string) => deleteDocument('mediaItems', id);
export const onBooksUpdate = (callback: (books: Book[]) => void) => {
    return onSnapshot(collection(db, "mediaItems"), (snapshot) => {
        const books = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Book));
        callback(books);
    });
};

// Tags (Library Shelves)
export const getTags = async (): Promise<string[]> => {
    const docRef = doc(db, 'libraryManagement', 'tags');
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
        return docSnap.data().allTags || [];
    }
    return [];
}
export const updateTags = async (tags: string[]) => {
    const docRef = doc(db, 'libraryManagement', 'tags');
    await setDoc(docRef, { allTags: tags });
}
export const onTagsUpdate = (callback: (tags: string[]) => void) => {
    return onSnapshot(doc(db, "libraryManagement", "tags"), (doc) => {
        callback(doc.exists() ? doc.data().allTags || [] : []);
    });
};

// Tasks
export const getTasks = () => getCollection<Task>('tasks');
export const onTasksUpdate = (callback: (tasks: Task[]) => void) => {
    return onSnapshot(collection(db, "tasks"), (snapshot) => {
        const tasks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as unknown as Task));
        callback(tasks);
    });
};
export const addTask = (data: Omit<Task, 'id'>) => addDocument<Task>('tasks', data);
export const updateTask = (id: string, data: Partial<Task>) => updateDocument<Task>('tasks', id, data);

// Calendar Events
export const onCalendarEventsUpdate = (callback: (events: CalendarEvent[]) => void) => {
    return onSnapshot(collection(db, "calendarEvents"), (snapshot) => {
        const events = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as unknown as CalendarEvent));
        callback(events);
    });
};

// Shopping Lists
export const onShoppingListsUpdate = (callback: (lists: ShoppingList[]) => void) => {
    return onSnapshot(collection(db, "shoppingLists"), (snapshot) => {
        const lists = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as unknown as ShoppingList));
        callback(lists);
    });
};
export const addShoppingList = (data: Omit<ShoppingList, 'id'>) => addDocument<ShoppingList>('shoppingLists', data);
export const updateShoppingList = (id: string, data: Partial<ShoppingList>) => updateDocument<ShoppingList>('shoppingLists', id, data);


// Education
export const onTestsUpdate = (callback: (tests: Test[]) => void) => {
    return onSnapshot(collection(db, "tests"), (snapshot) => {
        const tests = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as unknown as Test));
        callback(tests);
    });
};
export const addTest = (data: Omit<Test, 'id'>) => addDocument<Test>('tests', data);
export const updateTest = (id: string, data: Partial<Omit<Test, 'id'>>) => updateDocument<Test>('tests', id, data);


export const onQuestionBanksUpdate = (callback: (banks: QuestionBank[]) => void) => {
    return onSnapshot(collection(db, "questionBanks"), (snapshot) => {
        const banks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as unknown as QuestionBank));
        callback(banks);
    });
};
export const addQuestionBank = (data: Omit<QuestionBank, 'id'>) => addDocument<QuestionBank>('questionBanks', data);
export const updateQuestionBank = (id: string, data: Partial<Omit<QuestionBank, 'id'>>) => updateDocument<QuestionBank>('questionBanks', id, data);
export const deleteQuestionBank = (id: string) => deleteDocument('questionBanks', id);


export const onPracticeExamsUpdate = (callback: (exams: PracticeExam[]) => void) => {
    return onSnapshot(collection(db, "practiceExams"), (snapshot) => {
        const exams = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as unknown as PracticeExam));
        callback(exams);
    });
};
export const addPracticeExam = (data: Omit<PracticeExam, 'id'>) => addDocument<PracticeExam>('practiceExams', data);
export const updatePracticeExam = (id: string, data: Partial<Omit<PracticeExam, 'id'>>) => updateDocument<PracticeExam>('practiceExams', id, data);
export const deletePracticeExam = (id: string) => deleteDocument('practiceExams', id);
