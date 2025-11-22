# 🎥 Random Match Matching – Real-Time Video & Chat Platform

A lightweight, super-fast **Omegle-like random video & text chat platform** built using **WebRTC, Socket.IO, and Node.js**.
Users are connected 1-on-1 in real time for instant video + text chat — all inside the browser, no signup needed.

---

### 🔗 **Live Demo**

👉 **[https://random-match-matching.onrender.com/](https://random-match-matching.onrender.com/)**

---

## 🚀 Features

### 🎯 Real-Time Video Chat

* Peer-to-peer WebRTC connection
* Automatic camera & microphone permission handling
* Ultra-low latency streaming

### 💬 Real-Time Text Chat

* Instant messaging powered by Socket.IO
* Message delivery indicators
* "Stranger Connected" / "Stranger Disconnected" events

### 🔄 One-Click Matchmaking

* Click **Start** → search for available users
* Auto-match with a random online user
* Smooth transition between sessions

### ⚡ Fast & Lightweight

* No database required
* Fully optimized signaling layer
* Works even on low bandwidth

### 🛡️ Secure

* Direct P2P media (not routed through server)
* No chat logs
* Temporary sessions
* Backend only handles signaling, nothing more

---

## 🏗️ Tech Stack

### **Frontend**

* HTML, CSS, JavaScript
* WebRTC (media stream)
* Socket.IO client

### **Backend**

* Node.js
* Express
* Socket.IO signaling server

### **Deployment**

* Render / Vercel (frontend)
* Node server hosting (Render)

---

## 📦 Project Structure

```
📁 random-match-matching/
│
├── 📄 index.html        # UI + WebRTC logic
├── 📄 server.js         # Node.js signaling server (Socket.IO)
├── 📄 package.json
```

---

## 🔌 How It Works (Architecture)

### 1️⃣ **User clicks Start**

Client connects to the signaling server.

### 2️⃣ **Server finds another available user**

If found → pair them.
If not → put the user in “waiting”.

### 3️⃣ **WebRTC Peer Connection**

Connected users exchange:

* Offer
* Answer
* ICE candidates

### 4️⃣ **Video Call Starts**

Media streams flow directly peer-to-peer.

### 5️⃣ **Text messages**

Sent via Socket.IO while video is P2P.

---

## ▶️ Getting Started Locally

### **Clone the repo**

```bash
git clone https://github.com/rupesh-dev30/random-match-matching.git
cd random-match-matching
```

### **Install dependencies**

```bash
npm install
```

### **Start the server**

```bash
node server.js
```

### **Open in browser**

```
http://localhost:3000
```

---

## 🧪 TODO (Upcoming Features)

* 🔄 *Auto-reconnect & soft reconnection*
* 🌍 *Language-based matchmaking*
* 🧹 *Auto-clear broken sessions*
* 📱 *Mobile-responsive full-screen UI*
* 🧑‍🤝‍🧑 *Add "Interests" matching*
* 🌙 *Dark/Light themes*
* 🚫 *Block/Report system*
* 👤 *Optional user profiles (no login needed)*

---

## 🤝 Contributing

Want to improve the platform?
PRs are welcome! Feel free to open issues, propose features, or contribute directly.

---

## ⭐ Show Your Support

If you like this project, consider giving the repo a **star** ⭐
Your support motivates further development!
