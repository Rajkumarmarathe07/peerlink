const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();
app.use(cors());

const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: "*" }
});

let waitingUserId = null;
const peers = new Map();

function removeFromMatchmaking(socketId) {
  if (waitingUserId === socketId) {
    waitingUserId = null;
  }

  const peerId = peers.get(socketId);
  if (peerId) {
    peers.delete(peerId);
    io.to(peerId).emit("peer-disconnected");
  }

  peers.delete(socketId);
}

io.on("connection", (socket) => {
  console.log("Connected:", socket.id);

  if (waitingUserId && waitingUserId !== socket.id) {
    const otherId = waitingUserId;
    waitingUserId = null;

    peers.set(socket.id, otherId);
    peers.set(otherId, socket.id);

    io.to(socket.id).emit("paired", { peerId: otherId, initiator: false });
    io.to(otherId).emit("paired", { peerId: socket.id, initiator: true });
  } else {
    waitingUserId = socket.id;
    io.to(socket.id).emit("waiting");
  }

  socket.on("offer", ({ offer, to }) => {
    io.to(to).emit("offer", { offer, from: socket.id });
  });

  socket.on("answer", ({ answer, to }) => {
    io.to(to).emit("answer", { answer, from: socket.id });
  });

  socket.on("ice-candidate", ({ candidate, to }) => {
    io.to(to).emit("ice-candidate", { candidate, from: socket.id });
  });

  socket.on("disconnect", () => {
    console.log("Disconnected:", socket.id);
    removeFromMatchmaking(socket.id);
  });
});

server.listen(5000, () =>
  console.log("Server running on port 5000")
);
