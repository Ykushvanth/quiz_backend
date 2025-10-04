const express = require("express");
const path = require("path");
const Database = require("better-sqlite3");
const app = express();
const { registerQuestions } = require("./questions");

app.use(express.json());

const dbPath = path.join(__dirname, "quiz_questions.db");

let db = null;

const initializeDBAndServer = () => {
  try {
    db = new Database(dbPath);
    db.pragma("journal_mode = WAL");
    
    registerQuestions(app, db);

    const port = process.env.PORT || 3001;
    app.listen(port, () => {
      console.log(`Server Running at http://localhost:${port}`);
    });
  } catch (e) {
    console.log(`DB Error: ${e.message}`);
    process.exit(1);
  }
};

initializeDBAndServer();

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.sendStatus(200);
  next();
});
