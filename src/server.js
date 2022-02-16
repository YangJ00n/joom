import http from "http";
import SocketIO from "socket.io";
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

// http 서버 위에 SocketIO 서버를 만듦 -> 두 protocol이 같은 port를 공유함
const httpServer = http.createServer(app);
const wsServer = SocketIO(httpServer);

wsServer.on("connection", (socket) => {
  socket.on("enter_room", (roomName, done) => {
    console.log(roomName);
    setTimeout(() => {
      done("hello from the backend!");
    }, 3000);
  });
});

httpServer.listen(3000, handleListen);
