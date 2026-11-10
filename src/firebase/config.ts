import { initializeApp, getApps } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Os valores são configurados nas variáveis VITE_FIREBASE_* da Vercel.
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyBfyVj7GCoLYbXJv2vPZdQs4pxV_Tpt5kks',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'gradi-gestao.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'gradi-gestao',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'gradi-gestao.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '483471971037',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:483471971037:web:f0ac295c0e79ed9d57c134',
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || 'G-YG0F72BYK8',
};

const required = ['apiKey', 'authDomain', 'projectId', 'appId'] as const;
const missing = required.filter((key) => !firebaseConfig[key]);
if (missing.length) {
  console.warn(`Firebase não configurado. Variáveis ausentes: ${missing.join(', ')}`);
}

export const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

// Instância secundária usada pelo administrador para criar contas de lojistas
// sem encerrar a sessão do próprio administrador.
export const provisionApp = getApps().find((item) => item.name === 'gradi-user-provisioning')
  || initializeApp(firebaseConfig, 'gradi-user-provisioning');
export const provisionAuth = getAuth(provisionApp);
