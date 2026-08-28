import { initializeApp } from "firebase/app";
import { getDatabase, ref, get, set } from "firebase/database";

// Pegá acá los valores que te da Firebase al crear el proyecto
// (Configuración del proyecto → tus apps → Config).
const firebaseConfig = {
  apiKey: "AIzaSyD8YUvjJfGTMFXJ9OgUhUl8FoBgMRHIaYU",
  authDomain: "lasubastaa-4525f.firebaseapp.com",
  projectId: "lasubastaa-4525f",
  storageBucket: "lasubastaa-4525f.firebasestorage.app",
  databaseURL: "https://lasubastaa-4525f-default-rtdb.firebaseio.com/",
  messagingSenderId: "388157788700",
  appId: "1:388157788700:web:773c616e4b7c5d58f4c5d9",
  measurementId: "G-8T39WT4WHN"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// Mismo contrato que window.storage: get/set por clave, con "shared" implícito
// (todas las claves de esta app son de sala, así que siempre son compartidas).
export async function sGet(key) {
  try {
    const snap = await get(ref(db, key));
    return snap.exists() ? snap.val() : null;
  } catch (e) {
    return null;
  }
}

export async function sSet(key, valor) {
  try {
    await set(ref(db, key), valor);
    return true;
  } catch (e) {
    return false;
  }
}
