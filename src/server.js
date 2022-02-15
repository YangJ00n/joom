import http from "http";
import WebSocket from "ws";
import express from "express";

const app = express();

const PORT = 3000;

app.set("view engine", "pug");
app.set("views", __dirname + "/views");

app.use("/public", express.static(__dirname + "/public"));

app.get("/", (_, res) => res.render("home"));
app.get("/*", (_, res) => res.redirect("/"));

const handleListen = () =>
  console.log(`✅ Listening on http://localhost:${PORT}`);

// http 서버 위에 WebSocket 서버를 만듦 -> 두 protocol이 같은 port를 공유함
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

wss.on("connection", (socket) => {
  console.log("✅ Connected to Browser");

  socket.on("close", () => {
    console.log("❌ Disconnected from the Browser");
  });
  socket.on("message", (message) => {
    console.log(message.toString());
  });

  socket.send("hello!!");
});

server.listen(3000, handleListen);
