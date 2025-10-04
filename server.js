const express = require("express");
const path = require("path");
const fs = require("fs");
const initSqlJs = require("sql.js");
const app = express();
const { registerQuestions } = require("./questions");

app.use(express.json());

// CORS configuration
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "https://quiz-frontend-delta-one.vercel.app");
  res.header("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.sendStatus(200);
  next();
});

const dbPath = path.join(__dirname, "quiz_questions.db");

let db = null;

const initializeDBAndServer = async () => {
  try {
    const SQL = await initSqlJs();
    
    let dbData;
    if (fs.existsSync(dbPath)) {
      dbData = fs.readFileSync(dbPath);
    } else {
      console.log("Database file not found, creating new one");
      dbData = new Uint8Array(0);
    }
    
    db = new SQL.Database(dbData);
    
    registerQuestions(app, db);

    const saveDatabase = () => {
      try {
        const data = db.export();
        fs.writeFileSync(dbPath, data);
      } catch (e) {
        console.log(`Error saving database: ${e.message}`);
      }
    };

    process.on('SIGINT', () => {
      saveDatabase();
      process.exit(0);
    });

    process.on('SIGTERM', () => {
      saveDatabase();
      process.exit(0);
    });

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
