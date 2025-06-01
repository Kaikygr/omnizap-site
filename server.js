const express = require("express");
const fs = require("fs");
const path = require("path");
const compression = require("compression");
const rateLimit = require("express-rate-limit");
const morgan = require("morgan");
require("dotenv").config();
const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, "public");

const app = express();

app.use(compression());

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(apiLimiter);

app.use(
  morgan("combined", {
    stream: {
      write: (message) => console.log(message.trim()),
    },
  })
);

app.get("/", (req, res) => {
  const filePath = path.join(PUBLIC_DIR, "index.html");
  fs.readFile(filePath, "utf8", (err, content) => {
    if (err) {
      console.log(`Erro ao ler index.html: ${err.message}`, {
        stack: err.stack,
      });
      res.status(500).send("Erro interno do servidor.");
    } else {
      res.status(200).type("text/html").send(content);
    }
  });
});

app.use(express.static(PUBLIC_DIR));

app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});
