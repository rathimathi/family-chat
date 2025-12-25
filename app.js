
// app.js (use ES modules)
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-app.js";
import {
  getAuth, onAuthStateChanged,
  signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js";
import {
  getFirestore, collection, addDoc, serverTimestamp,
  query, orderBy, limit, onSnapshot
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";


// 1) Paste your Firebase config here
const firebaseConfig = {
    apiKey: "AIzaSyDqsuTeyV8JtU75Ni3q7iCJ8AfEgPEyq0g",
    authDomain: "family-chat-f165e.firebaseapp.com",
    projectId: "family-chat-f165e",
    storageBucket: "family-chat-f165e.firebasestorage.app",
    messagingSenderId: "154131560292",
    appId: "1:154131560292:web:4bb8e9ac016209054bac71",
    measurementId: "G-FK2GTHVCH1"
  };

// 2) Init Firebase services
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// 3) UI elements
const userEmailEl = document.getElementById("user-email");
const signoutBtn = document.getElementById("signout-btn");

const authSection = document.getElementById("auth-section");
const chatSection = document.getElementById("chat-section");
const messagesList = document.getElementById("messages");
const messageForm = document.getElementById("message-form");
const messageInput = document.getElementById("message-input");

const loginEmail = document.getElementById("login-email");
const loginPassword = document.getElementById("login-password");
const loginBtn = document.getElementById("login-btn");

const signupEmail = document.getElementById("signup-email");
const signupPassword = document.getElementById("signup-password");
const signupBtn = document.getElementById("signup-btn");

const authError = document.getElementById("auth-error");

// 4) Auth handlers
loginBtn.addEventListener("click", async () => {
  authError.textContent = "";
  try {
    await signInWithEmailAndPassword(auth, loginEmail.value, loginPassword.value);
    loginEmail.value = ""; loginPassword.value = "";
  } catch (err) {
    authError.textContent = "Login failed: " + (err?.message || err);
  }
});

signupBtn.addEventListener("click", async () => {
  authError.textContent = "";
  try {
    await createUserWithEmailAndPassword(auth, signupEmail.value, signupPassword.value);
    signupEmail.value = ""; signupPassword.value = "";
  } catch (err) {
    authError.textContent = "Signup failed: " + (err?.message || err);
  }
});

signoutBtn.addEventListener("click", async () => {
  await signOut(auth);
});

// 5) Real-time messages listener (once authenticated)
let unsubMessages = null;

onAuthStateChanged(auth, (user) => {
  if (user) {
    userEmailEl.textContent = user.email;
    signoutBtn.style.display = "inline-block";
    authSection.style.display = "none";
    chatSection.style.display = "block";

    // Subscribe to latest 100 messages, ordered by timestamp
    const messagesRef = collection(db, "messages");
    const q = query(messagesRef, orderBy("createdAt", "asc"), limit(100));

    // Unsubscribe old listener if any
    if (typeof unsubMessages === "function") unsubMessages();

    unsubMessages = onSnapshot(q, (snapshot) => {
      messagesList.innerHTML = ""; // Clear and re-render (simple approach)
      snapshot.forEach((doc) => {
        const m = doc.data();
        const li = document.createElement("li");
        li.innerHTML = `
          <div>${escapeHTML(m.text || "")}</div>
          <div class="meta">${m.displayName || m.uid || "Unknown"} · ${formatTS(m.createdAt)}</div>
        `;
        messagesList.appendChild(li);
        messagesList.scrollTop = messagesList.scrollHeight; // auto-scroll
      });
    });

  } else {
    userEmailEl.textContent = "";
    signoutBtn.style.display = "none";
    chatSection.style.display = "none";
    authSection.style.display = "block";

    if (typeof unsubMessages === "function") unsubMessages();
    messagesList.innerHTML = "";
  }
});

// 6) Send a message
messageForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const user = auth.currentUser;
  if (!user) return;

  const text = messageInput.value.trim();
  if (!text) return;

  try {
    await addDoc(collection(db, "messages"), {
      text,
      uid: user.uid,
      displayName: maskEmail(user.email),
      createdAt: serverTimestamp()
    });
    messageInput.value = "";
  } catch (err) {
    console.error("Failed to send message:", err);
  }
});

// Helpers
function formatTS(ts) {
  try {
    if (!ts) return "";
    const date = ts.toDate();
    return date.toLocaleString();
  } catch { return ""; }
}

function escapeHTML(str) {
  return str.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
  );
}

function maskEmail(email) {
  if (!email || !email.includes("@")) return "User";
  const [local, domain] = email.split("@");
  if (local.length <= 2) {
    return local[0] + "***@" + domain;
  }

  // Show first 2 chars, mask the rest of local part
  return local.slice(0, 2) + "***@" + domain;
}
