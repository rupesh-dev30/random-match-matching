import express from "express";
import http from "http";
import path from "path";
import { Server } from "socket.io";
import { fileURLToPath } from "url";

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.static(__dirname));

const users = new Map(); // socket.id -> username
const matchmakingQueue = []; // FIFO queue of socket ids waiting for random match
const queueSet = new Set(); // quick lookup for who's queued
const waitingTimeouts = new Map(); // socket.id -> timeoutID
const userRoom = new Map(); // socket.id -> roomId

function createRoomId() {
  return `room_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function tryMatch() {
  while (matchmakingQueue.length >= 2) {
    // POP TWO USERS
    const a = matchmakingQueue.shift();
    const b = matchmakingQueue.shift();

    // TODO: DELETE FROM QUEUE
    queueSet.delete(a);
    queueSet.delete(b);

    const socketA = io.sockets.sockets.get(a);
    const socketB = io.sockets.sockets.get(b);

    if (!socketA || !socketB || userRoom.has(a) || userRoom.has(b)) {
      if (socketA && !userRoom.has(a)) {
        // CURRENTLY QUEUEING
        matchmakingQueue.unshift(a);
        queueSet.add(a);
      }

      if (socketB && !userRoom.has(b)) {
        // CURRENTLY QUEUEING
        matchmakingQueue.unshift(b);
        queueSet.add(b);
      }

      continue;
    }

    const room = createRoomId(); // NEW ROOM ID CREATED
    socketA.join(room);
    socketB.join(room);
    userRoom.set(a, room);
    userRoom.set(b, room);

    if (waitingTimeouts.has(a)) {
      clearTimeout(waitingTimeouts.get(a));
      waitingTimeouts.delete(a);
    }

    if (waitingTimeouts.has(b)) {
      clearTimeout(waitingTimeouts.get(b));
      waitingTimeouts.delete(b);
    }

    const nameA = users.get(a) || "Anonymous";
    const nameB = users.get(b) || "Anonymous";

    socketA.emit("matched", { room, partnerId: b, partnerName: nameB });
    socketB.emit("matched", { room, partnerId: a, partnerName: nameA });

    io.to(room).emit(
      "roomNotification",
      `${nameA} and ${nameB} are now connected.`
    );
  }
}

function removeFromQueue(socketId) {
  if (!queueSet.has(socketId)) return;
  queueSet.delete(socketId);
  const idx = matchmakingQueue.indexOf(socketId);
  if (idx !== -1) matchmakingQueue.splice(idx, 1);

  if (waitingTimeouts.has(socketId)) {
    clearTimeout(waitingTimeouts.get(socketId));
    waitingTimeouts.delete(socketId);
  }
}

function cleanupRoom(room, leavingSocketId) {
  // GET ALL MEMBERS OF THE ROOM
  const clients = io.sockets.adapter.rooms.get(room);
  if (!clients) return;

  for (const clientId of clients) {
    // SKIP THE LEAVING SOCKET ITSELF
    if (clientId === leavingSocketId) continue;
    const s = io.sockets.sockets.get(clientId);

    if (s) {
      // NOTIFY THE PARTNER THAT THE OTHER LEFT
      s.emit("partnerLeft", { room, partnerId: leavingSocketId });
      // REMOVE THIS SOCKET FROM THE ROOM
      s.leave(room);
      userRoom.delete(clientId);
    }
  }

  userRoom.delete(leavingSocketId);
}

io.on("connection", (socket) => {
  console.log("Connected: ", socket.id);

  // BASIC JOIN EVENT TO REGISTER USERNAME (FROM EARLIER FEATURES)
  socket.on("join", (username) => {
    socket.data.username = username;
    users.set(socket.id, username);
    io.emit("onlineUsers", Array.from(users.values()));
  });

  // REQUEST TO JOIN RANDOM MATCHMATCHING QUEUE
  socket.on("findRandom", () => {
    // IF ALREADY IN A ROOM, IGNORE OR ASK TO LEAVE FIRST
    if (userRoom.has(socket.id)) {
      socket.emit(
        "matchError",
        "You are already in a room. Leave it first to find another."
      );
      return;
    }
    if (queueSet.has(socket.id)) {
      socket.emit("matchError", "Already searching for a partner.");
      return;
    }

    // PUSH TO QUEUE
    matchmakingQueue.push(socket.id);
    queueSet.add(socket.id);

    // NOTIFY CLIENT IT'S QUEUED
    socket.emit("queued");

    const to = setTimeout(() => {
      // IF STILL QUEUED, REMOVE AND NOTIFY
      if (queueSet.has(socket.id)) {
        removeFromQueue(socket.id);
        socket.emit(
          "noMatch",
          "No partner found in a reasonable time, Try again."
        );
      }
    }, 3000);

    waitingTimeouts.set(socket.id, to);

    tryMatch();
  });

  socket.on("next", () => {
    const room = userRoom.get(socket.id);

    if (room) {
      cleanupRoom(room, socket.id);
      socket.leave(room);
      userRoom.delete(socket.id);
    }

    // AUTOMATICALLY RE-ENTER QUEUE FOR A NEW PARTNER
    socket.emit("leftRoom");
    socket.emit("queued");
    
    if (!queueSet.has(socket.id)) {
      matchmakingQueue.push(socket.id);
      queueSet.add(socket.id);
      const to = setTimeout(() => {
        if (queueSet.has(socket.id)) {
          removeFromQueue(socket.id);
          socket.emit("noMatch", "No partner found. Try again.");
        }
      }, 30000);
      waitingTimeouts.set(socket.id, to);
      tryMatch();
    }
  });

  // CLIENT LEAVES QUEUE VOLUNATARILY
  socket.on("leaveQueue", () => {
    removeFromQueue(socket.id);
    socket.emit("leftQueue");
  });

  // ROOM BASED MESSAGING: SEND TO EVERYONE IN ROOM
  socket.on("roomMessage", ({ room, message }) => {
    const username = users.get(socket.id) || "Anonymous";
    // ENSURE SOCKET IS IN THE ROOM BEFORE BROADCASTING
    const clients = io.sockets.adapter.rooms.get(room);
    if (!clients || !clients.has(socket.id)) {
      socket.emit("matchError", "You're not in that room.");
      return;
    }
    io.to(room).emit("roomMessage", {
      user: username,
      message,
      time: Date.now(),
    });
  });

  // TYPING INDICATOR INSIDE ROOM
  socket.on("roomTyping", ({ room, isTyping }) => {
    socket.to(room).emit("roomTyping", {
      user: users.get(socket.id) || "Anonymous",
      isTyping,
    });
  });

  // WHEN SOCKET DISCONNECT WE MUST:
  // - REMOVE FROM QUEUE
  // - IF IN A ROOM, NOTIFY PARTNER AND CLEANUP
  // - REMOVE FROM USERS MAP
  socket.on("disconnect", () => {
    console.log("Disconnect:", socket.id);
    removeFromQueue(socket.id);

    // IF IN A ROOM, CLEANUP AND NOTIFY PARTNER
    const room = userRoom.get(socket.id);
    if (room) {
      cleanupRoom(room, socket.id);
    }

    users.delete(socket.id);
    userRoom.delete(socket.id);
    io.emit("onlineUsers", Array.from(users.values()));
  });
});

app.get("/", (_, res) => {
  res.sendFile(__dirname + "/index.html");
});

server.listen(3000, () => {
  console.log("Server running on http://localhost:3000");
});
