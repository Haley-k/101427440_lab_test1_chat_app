// Check if user is logged in
const userData = JSON.parse(localStorage.getItem("user"));
if (!userData) {
  // If not logged in, redirect to login page
  window.location.href = "login.html";
}

const socket = io(); // Connect to Socket.io server

// DOM Elements (Group Chat)
const roomSelect = document.getElementById("roomSelect");
const joinRoomBtn = document.getElementById("joinRoomBtn");
const leaveRoomBtn = document.getElementById("leaveRoomBtn");
const chatDiv = document.getElementById("chat");
const messageInput = document.getElementById("messageInput");
const sendBtn = document.getElementById("sendBtn");
const typingIndicator = document.getElementById("typingIndicator");
const logoutBtn = document.getElementById("logoutBtn");

// DOM Elements (Private Chat)
const privateMsgUserInput = document.getElementById("privateMsgUser");
const privateMsgInput = document.getElementById("privateMsgInput");
const privateMsgBtn = document.getElementById("privateMsgBtn");

let currentRoom = null;
const username = userData.username; // from localStorage
socket.emit("registerUser", username);

// Join room
joinRoomBtn.addEventListener("click", () => {
  const room = roomSelect.value;
  if (currentRoom) {
    // Leave current room first if user is already in a room
    socket.emit("leaveRoom", { username, room: currentRoom });
  }
  currentRoom = room;
  socket.emit("joinRoom", { username, room });
  addMessage({
    from_user: "System",
    message: `You joined ${room}`,
    date_sent: new Date(),
  });
});

// Leave room
leaveRoomBtn.addEventListener("click", () => {
  if (!currentRoom) return;
  socket.emit("leaveRoom", { username, room: currentRoom });
  addMessage({
    from_user: "System",
    message: `You left ${currentRoom}`,
    date_sent: new Date(),
  });
  currentRoom = null;
});

// Send group message
sendBtn.addEventListener("click", () => {
  sendGroupMessage();
});

messageInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") {
    sendGroupMessage();
  } else {
    // Emit typing event
    if (currentRoom) {
      socket.emit("typing", { username, room: currentRoom });
    }
  }
});

function sendGroupMessage() {
  const message = messageInput.value.trim();
  if (!message || !currentRoom) return;

  socket.emit("groupMessage", {
    from_user: username,
    room: currentRoom,
    message,
  });
  messageInput.value = "";
}

// Listen for group messages
socket.on("message", (data) => {
  addMessage(data);
});

// Typing indicator
socket.on("typing", ({ username: typingUser }) => {
  typingIndicator.innerText = `${typingUser} is typing...`;
  // Clear after 2 seconds
  setTimeout(() => {
    typingIndicator.innerText = "";
  }, 2000);
});

// Send private message
privateMsgBtn.addEventListener("click", () => {
  sendPrivateMessage();
});

function sendPrivateMessage() {
  const to_user = privateMsgUserInput.value.trim();
  const message = privateMsgInput.value.trim();
  if (!to_user || !message) return;

  socket.emit("privateMessage", { from_user: username, to_user, message });
  privateMsgInput.value = "";
}

// Listen for private messages
socket.on("privateMessage", (data) => {
  // Only show if I'm the sender or receiver
  if (data.to_user === username || data.from_user === username) {
    addMessage(data, true); // Mark as private
  }
});

// Add message to chat display
function addMessage({ from_user, message, date_sent }, isPrivate = false) {
  const msgDiv = document.createElement("div");
  msgDiv.classList.add("mb-2");

  const time = new Date(date_sent).toLocaleTimeString();
  // Show "(Private)" if isPrivate
  msgDiv.innerHTML = `<strong>${from_user}</strong> [${time}]: ${message} ${
    isPrivate ? "(Private)" : ""
  }`;

  chatDiv.appendChild(msgDiv);
  chatDiv.scrollTop = chatDiv.scrollHeight;
}

// Logout
logoutBtn.addEventListener("click", () => {
  localStorage.removeItem("user");
  window.location.href = "login.html";
});