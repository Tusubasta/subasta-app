import { initializeApp } from "firebase/app";
import { getDatabase, ref, get, set } from "firebase/database";

// Pegá acá los valores que te da Firebase al crear el proyecto
// (Configuración del proyecto → tus apps → Config).
const firebaseConfig = {
  apiKey: "TU_API_KEY",
  authDomain: "TU_PROYECTO.firebaseapp.com",
  databaseURL: "https://TU_PROYECTO-default-rtdb.firebaseio.com",
  projectId: "TU_PROYECTO",
  storageBucket: "TU_PROYECTO.appspot.com",
  messagingSenderId: "000000000000",
  appId: "TU_APP_ID",
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
