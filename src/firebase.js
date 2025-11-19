import {initializeApp} from 'firebase/app';
import {getAuth, GoogleAuthProvider, FacebookAuthProvider, signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, signInAnonymously} from 'firebase/auth';
import {getFirestore} from 'firebase/firestore';
import {getAnalytics} from 'firebase/analytics';

const firebaseConfig={apiKey:"AIzaSyDrPX6Yw9kuy_HAq8wrxBFKz_Eugci2xPA",authDomain:"aiexpensetracker-5b615.firebaseapp.com",projectId:"aiexpensetracker-5b615",storageBucket:"aiexpensetracker-5b615.firebasestorage.app",messagingSenderId:"345317959568",appId:"1:345317959568:web:f3658b9b3a30cb8ee9b515",measurementId:"G-JMX8WGDR3X"};

const app=initializeApp(firebaseConfig);
const auth=getAuth(app);
const db=getFirestore(app);
const googleProvider=new GoogleAuthProvider();
const facebookProvider=new FacebookAuthProvider();
const analytics=getAnalytics(app);

export {auth,db,googleProvider,facebookProvider,signInWithPopup,signInWithEmailAndPassword,createUserWithEmailAndPassword,signOut,signInAnonymously,analytics};