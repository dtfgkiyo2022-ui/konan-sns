import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from "firebase/auth";
import { getFirestore, collection, doc, setDoc, getDoc, getDocs, addDoc, deleteDoc, updateDoc, onSnapshot, query, orderBy, where, serverTimestamp, limit } from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";

// ★★★ ここを書き換え ★★★
const firebaseConfig = {
  apiKey: "AIzaSyCl891l6niWDqnfpBCdaFd7YRWQt45PsT4",
  authDomain: "konan-sns.firebaseapp.com",
  projectId: "konan-sns",
  storageBucket: "konan-sns.firebasestorage.app",
  messagingSenderId: "440827774262",
  appId: "1:440827774262:web:61f9fa64b28067efc81f97",
  measurementId: "G-881QFQC6SC"
};
// ★★★ ここまで ★★★

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// Auth
export const login = (email, password) => signInWithEmailAndPassword(auth, email, password);
export const logout = () => signOut(auth);
export const createUser = (email, password) => createUserWithEmailAndPassword(auth, email, password);

// Firestore
export { collection, doc, setDoc, getDoc, getDocs, addDoc, deleteDoc, updateDoc, onSnapshot, query, orderBy, where, serverTimestamp, limit };

// Storage
export const uploadFile = async (path, file) => {
  const storageRef = ref(storage, path);
  const snapshot = await uploadBytes(storageRef, file);
  return getDownloadURL(snapshot.ref);
};
