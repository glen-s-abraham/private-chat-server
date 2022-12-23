const express = require("express");
const { v4: uuidv4 } = require('uuid');
require("dotenv");

const { InMemorySessionStore } = require("./sessionStore");
const sessionStore = new InMemorySessionStore();

const app = express();
const port = process.env.SRV_PORT || 3000;

app.get("/ping", (req, res) => res.send("alive"));

const server = app.listen(port, () =>
  console.log(`App listening on port ${port}`)
);

const io = require("socket.io")(server, {
  cors: {
    origin: "http://localhost:8080",
  },
});

io.use((socket, next) => {
  const sessionID = socket.handshake.auth.sessionID;
  if (sessionID) {
    // find existing session
    const session = sessionStore.findSession(sessionID);
    if (session) {
      socket.sessionID = sessionID;
      socket.userID = session.userID;
      socket.username = session.username;
      return next();
    }
  }
  const username = socket.handshake.auth.username;
  if (!username) {
    return next(new Error("invalid username"));
  }
  // create new session
  socket.sessionID = uuidv4();
  socket.userID = uuidv4();
  socket.username = username;
  next();
});

io.on("connection", (socket) => {

  sessionStore.saveSession(socket.sessionID, {
    userID: socket.userID,
    username: socket.username,
    connected: true,
  });

  socket.emit("session", {
    sessionID: socket.sessionID,
    userID: socket.userID,
  });

  // join the "userID" room
  socket.join(socket.userID);
  //send down list of influencers instead.
  const users = [];
  sessionStore.findAllSessions().forEach((session) => {
    users.push({
      userID: session.userID,
      username: session.username,
      connected: session.connected,
    });
  });
  socket.emit(
    "users",
    users.filter((user) => user.userID !== socket.userID)
  );
  socket.broadcast.emit("user connected", {
    userID: socket.id,
    username: socket.username,
  });
  socket.on("private message", (content, to) => {
    socket.to(to).to(socket.userID).emit("private message", {
      content,
      from: socket.username,
    });
  });
});
