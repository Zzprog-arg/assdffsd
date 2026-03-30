const express = require("express");
const http = require("http");
const path = require("path");
const fs = require("fs");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: "*" }
});

const PORT = process.env.PORT || 3000;
const musicDir = path.join(__dirname, "music");

app.use(express.static(path.join(__dirname, "public")));
app.use("/music", express.static(musicDir));

app.get("/api/health", (req, res) => {
  res.json({ ok: true });
});

app.get("/api/music", async (req, res) => {
  try {
    const entries = await fs.promises.readdir(musicDir, { withFileTypes: true });
    const files = entries
      .filter((entry) => entry.isFile())
      .map((entry) => entry.name)
      .filter((name) => /\.(mp3|wav|ogg|m4a|aac|flac)$/i.test(name))
      .sort((a, b) => a.localeCompare(b, "es", { sensitivity: "base" }))
      .map((name) => ({
        name,
        url: `/music/${encodeURIComponent(name)}`
      }));

    res.json({ files });
  } catch (error) {
    if (error.code === "ENOENT") {
      return res.json({ files: [] });
    }

    console.error("Error leyendo carpeta music:", error);
    res.status(500).json({ error: "No se pudo leer la carpeta music" });
  }
});

let emisorId = null;
const oyentes = new Set();

io.on("connection", (socket) => {
  console.log("Conectado:", socket.id);

  socket.on("join-role", (role) => {
    socket.data.role = role;

    if (role === "emisor") {
      emisorId = socket.id;
      console.log("Emisor registrado:", socket.id);
    }

    if (role === "oyente") {
      oyentes.add(socket.id);
      console.log("Oyente registrado:", socket.id);

      if (emisorId) {
        io.to(emisorId).emit("listener-joined", { listenerId: socket.id });
      }
    }
  });

  socket.on("offer", ({ targetId, offer }) => {
    if (!targetId) return;
    io.to(targetId).emit("offer", {
      fromId: socket.id,
      offer
    });
  });

  socket.on("answer", ({ targetId, answer }) => {
    if (!targetId) return;
    io.to(targetId).emit("answer", {
      fromId: socket.id,
      answer
    });
  });

  socket.on("ice-candidate", ({ targetId, candidate }) => {
    if (!targetId) return;
    io.to(targetId).emit("ice-candidate", {
      fromId: socket.id,
      candidate
    });
  });

  socket.on("disconnect", () => {
    console.log("Desconectado:", socket.id);

    if (socket.id === emisorId) {
      emisorId = null;
    }

    oyentes.delete(socket.id);
  });
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Servidor en puerto ${PORT}`);
});
