const express = require("express");
const mongoose = require("mongoose");
const socketIO = require("socket.io");
const http = require("http");
const path = require("path");

const User = require("./model/User");
const GroupMessage = require("./model/GroupMessage");
const PrivateMessage = require("./model/PrivateMessage");

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

const connectionString =
  "mongodb+srv://Cluster63457:amNdcFFocEVN@cluster63457.lpf9y.mongodb.net/labTest1?retryWrites=true&w=majority";

mongoose
  .connect(connectionString, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.log("MongoDB connection error:", err));

app.use(express.static(path.join(__dirname, "public")));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Sign up
app.post("/api/signup", async (req, res) => {
  try {
    const { username, firstname, lastname, password } = req.body;

    const existUser = await User.findOne({ username });
    if (existUser) {
      return res.status(400).json({ error: "User already exist" });
    }

    const newUser = new User({ username, firstname, lastname, password });
    await newUser.save();
    res.json({ message: "Signup successful" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error during signup" });
  }
});

// Login
app.post("/api/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    const user = await User.findOne({ username });
    if (!user || user.password !== password) {
      return res.status(401).json({ error: "Invalid username or password" });
    }

    return res.json({
      username: user.username,
      firstname: user.firstname,
      lastname: user.lastname,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error during login" });
  }
});

const connectedUsers = {};
function getSocketIdByUsername(username) {
  return connectedUsers[username];
}

// socket.io
io.on("connection", (socket) => {
  console.log("New client connected:", socket.id);

  // When a user logs in or identifies themselves, store their socket ID
  socket.on("registerUser", (username) => {
    connectedUsers[username] = socket.id;
  });

  // On disconnect remove them
  socket.on("disconnect", () => {
    // Find which username had this socket id, remove from connectedUsers
    for (const [user, id] of Object.entries(connectedUsers)) {
      if (id === socket.id) {
        delete connectedUsers[user];
        break;
      }
    }
    console.log("Client disconnected:", socket.id);
  });

  // Join a room
  socket.on("joinRoom", async ({ username, room }) => {
    socket.join(room);
    console.log(`${username} joined room ${room}`);

    // Broadcast to other users in the room
    socket.to(room).emit("message", {
      from_user: "System",
      message: `${username} has joined the room.`,
      date_sent: new Date(),
    });
  });

  // Leave a room
  socket.on("leaveRoom", ({ username, room }) => {
    socket.leave(room);
    console.log(`${username} left room ${room}`);

    // Broadcast to the room
    socket.to(room).emit("message", {
      from_user: "System",
      message: `${username} has left the room.`,
      date_sent: new Date(),
    });
  });

  // Group message
  socket.on("groupMessage", async ({ from_user, room, message }) => {
    // Save the message to the database
    const msg = new GroupMessage({
      from_user,
      room,
      message,
    });
    await msg.save();

    // Broadcast message to everyone in the room
    io.to(room).emit("message", {
      from_user,
      message,
      date_sent: msg.date_sent,
    });
  });

  // Private message
  socket.on("privateMessage", async ({ from_user, to_user, message }) => {
    const privateMsg = new PrivateMessage({
      from_user,
      to_user,
      message,
    });
    await privateMsg.save();

    // Send only to "to_user"
    const toUserSocketId = getSocketIdByUsername(to_user);
    if (toUserSocketId) {
      io.to(toUserSocketId).emit("privateMessage", {
        from_user,
        to_user,
        message,
        date_sent: privateMsg.date_sent,
      });
    }

    // Send to the sender so they can see their own message
    const fromUserSocketId = getSocketIdByUsername(from_user);
    if (fromUserSocketId) {
      io.to(fromUserSocketId).emit("privateMessage", {
        from_user,
        to_user,
        message,
        date_sent: privateMsg.date_sent,
      });
    }
  });

  // Typing indicator
  socket.on("typing", ({ username, room }) => {
    socket.to(room).emit("typing", { username });
  });

  // Handle disconnect
  socket.on("disconnect", () => {
    console.log("Client disconnected:", socket.id);
  });
});

// --- Start the Server ---
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});