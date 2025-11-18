// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAQ3Uob61382F1FPHcXE5iwvSIlKfdMn58",
  authDomain: "lime-game.firebaseapp.com",
  databaseURL: "https://lime-game-default-rtdb.firebaseio.com",
  projectId: "lime-game",
  storageBucket: "lime-game.firebasestorage.app",
  messagingSenderId: "109036292430",
  appId: "1:109036292430:web:28b173ae5a222021dd761f",
  measurementId: "G-0S9XSW6F56"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
export { database, ref, set, onValue, push };