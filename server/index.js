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

let users = [];

io.on("connection", (socket) => {
  console.log("Connected:", socket.id);

  users.push(socket.id);

  // when 2 users connect → notify both
  if (users.length === 2) {
    io.to(users[0]).emit("ready", users[1]);
    io.to(users[1]).emit("ready", users[0]);
  }

  socket.on("offer", ({ offer, to }) => {
    io.to(to).emit("offer", { offer, from: socket.id });
  });

  socket.on("answer", ({ answer, to }) => {
    io.to(to).emit("answer", { answer });
  });

  socket.on("ice-candidate", ({ candidate, to }) => {
    io.to(to).emit("ice-candidate", { candidate });
  });

  socket.on("disconnect", () => {
    console.log("Disconnected:", socket.id);
    users = users.filter((id) => id !== socket.id);
  });
});

server.listen(5000, () =>
  console.log("Server running on port 5000")
);