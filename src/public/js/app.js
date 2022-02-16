const socket = io();

const welcome = document.getElementById("welcome");
const form = welcome.querySelector("form");

const handleRoomSubmit = (event) => {
  event.preventDefault();
  const input = form.querySelector("input");
  socket.emit("enter_room", input.value, (msg) => {
    console.log(`The backend says: ${msg}`);
  });
  input.value = "";
};
form.addEventListener("submit", handleRoomSubmit);
