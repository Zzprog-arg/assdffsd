const express = require("express");
const http = require("http");
const path = require("path");
const os = require("os");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" }
});

const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, "public")));

app.get("/api/health", (req, res) => {
  res.json({ ok: true });
});

function getLocalIP() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === "IPv4" && !iface.internal) {
        return iface.address;
      }
    }
  }
  return "localhost";
}

io.on("connection", (socket) => {
  console.log("Conectado:", socket.id);

  socket.on("offer", (offer) => {
    console.log("Offer recibida");
    socket.broadcast.emit("offer", offer);
  });

  socket.on("answer", (answer) => {
    console.log("Answer recibida");
    socket.broadcast.emit("answer", answer);
  });

  socket.on("ice-candidate", (candidate) => {
    socket.broadcast.emit("ice-candidate", candidate);
  });

  socket.on("disconnect", () => {
    console.log("Desconectado:", socket.id);
  });
});

server.listen(PORT, "0.0.0.0", () => {
  const ip = getLocalIP();
  console.log("=================================");
  console.log(`Servidor: http://localhost:${PORT}`);
  console.log(`Red:      http://${ip}:${PORT}`);
  console.log(`Emisor:   http://${ip}:${PORT}/emisor.html`);
  console.log(`Oyente:   http://${ip}:${PORT}/oyente.html`);
  console.log("=================================");
});