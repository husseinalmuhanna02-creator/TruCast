import { FirebaseAuthentication } from '@capacitor-firebase/authentication';
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore, memoryLocalCache } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

console.log("Firebase Config Initialization:", {
  hasConfig: !!firebaseConfig,
  projectId: firebaseConfig?.projectId,
  authDomain: firebaseConfig?.authDomain
});

const app = initializeApp(firebaseConfig);
const databaseId = (firebaseConfig as any).firestoreDatabaseId || '(default)';
export const db = initializeFirestore(app, {
  localCache: memoryLocalCache(),
}, databaseId);
export const auth = getAuth(app);

export const signInWithGoogle = async () => {
  return await FirebaseAuthentication.signInWithGoogle();
};

export const signInWithFacebook = async () => {
  return await FirebaseAuthentication.signInWithFacebook();
};
