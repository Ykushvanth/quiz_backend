# Quiz Portal Backend

A RESTful API server for the Quiz Portal application built with Node.js, Express, and SQLite. Provides endpoints for fetching quiz questions and evaluating user answers with session-based question randomization.

## Features

- RESTful API with Express 5.x
- SQLite database with Better-sqlite3
- Session-based question randomization
- CORS enabled for frontend integration
- Answer evaluation with detailed results
- Persistent data storage
- Graceful shutdown handling
- Environment-based configuration

## Tech Stack

- **Node.js** (>= 18.0.0)
- **Express** (5.x)
- **SQL.js** (1.13.0) - SQLite in-memory operations
- **Better-sqlite3** (11.10.0) - SQLite synchronous operations
- **dotenv** - Environment variable management
- **nodemon** - Development auto-restart

## Project Structure

```
backend/
├── node_modules/            # Dependencies
├── .env                     # Environment variables
├── package.json             # Project dependencies and scripts
├── package-lock.json        # Locked dependency versions
├── README.md                # This file
├── server.js                # Main Express server
├── questions.js             # Question data and seeding logic
├── quiz_questions.db        # SQLite database file
└── query.sql                # Database schema and queries
```

## File Descriptions

### `server.js`
Main application entry point containing:
- Express app configuration
- CORS middleware setup
- API route definitions
- Database connection handling
- Graceful shutdown logic

### `questions.js`
Question management module:
- Quiz questions data
- Options with correct answer flags
- Database seeding functions
- Question insertion logic

### `quiz_questions.db`
SQLite database file storing:
- Quiz metadata
- Questions
- Answer options
- Relationships between entities

### `query.sql`
SQL schema and useful queries:
- Table creation statements
- Sample queries for testing
- Database inspection commands

## Installation

### Prerequisites

- Node.js (>= 18.0.0)
- npm (comes with Node.js)

### Setup Steps

1. **Navigate to backend directory**
```bash
cd backend
```

2. **Install dependencies**
```bash
npm install
```

3. **Create environment file**

Create a `.env` file in the backend root:
```env
PORT=3001
FRONTEND_URL=http://localhost:3000
```

4. **Initialize database** (if not exists)

The database will be automatically created and seeded on first run. If you need to reset:
```bash
# Delete existing database
rm quiz_questions.db

# Restart server to recreate
npm start
```

5. **Start the server**
```bash
# Production mode
npm start

# Development mode (with auto-restart)
npm run dev
```

Server will start at `http://localhost:3001`

## Database Schema

### Table: `quizzes`
Stores quiz metadata and configuration.

```sql
CREATE TABLE quizzes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  description TEXT,
  duration INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### Table: `questions`
Stores quiz questions.

```sql
CREATE TABLE questions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  quiz_id INTEGER NOT NULL,
  question_text TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (quiz_id) REFERENCES quizzes(id)
);
```

### Table: `options`
Stores answer options for each question.

```sql
CREATE TABLE options (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  question_id INTEGER NOT NULL,
  option_text TEXT NOT NULL,
  is_correct BOOLEAN DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (question_id) REFERENCES questions(id)
);
```

## API Endpoints

### 1. Get Quiz Questions

Retrieves all questions for a specific quiz with randomized order per session.

**Endpoint:**
```
GET /api/quiz/:quizId/questions
```

**Parameters:**
- `quizId` (path parameter) - The ID of the quiz
- `sessionId` (query parameter, optional) - Session identifier for consistent ordering

**Example Request:**
```bash
curl http://localhost:3001/api/quiz/1/questions?sessionId=abc123
```

**Response:**
```json
{
  "questions": [
    {
      "id": 5,
      "question_text": "What is the capital of France?",
      "options": [
        {
          "id": 17,
          "option_text": "London"
        },
        {
          "id": 18,
          "option_text": "Berlin"
        },
        {
          "id": 19,
          "option_text": "Paris"
        },
        {
          "id": 20,
          "option_text": "Madrid"
        }
      ]
    },
    {
      "id": 3,
      "question_text": "Which planet is known as the Red Planet?",
      "options": [
        {
          "id": 9,
          "option_text": "Venus"
        },
        {
          "id": 10,
          "option_text": "Mars"
        },
        {
          "id": 11,
          "option_text": "Jupiter"
        },
        {
          "id": 12,
          "option_text": "Saturn"
        }
      ]
    }
  ]
}
```

**Notes:**
- Questions are randomized based on `sessionId` seed
- Same `sessionId` returns same question order
- Options are returned in database order (not randomized)

### 2. Evaluate Quiz Answers

Evaluates submitted answers and returns detailed results.

**Endpoint:**
```
POST /api/quiz/:quizId/evaluate
```

**Parameters:**
- `quizId` (path parameter) - The ID of the quiz

**Request Body:**
```json
{
  "answers": {
    "1": 3,
    "2": 2,
    "3": 1,
    "4": 4,
    "5": 2
  }
}
```

**Format:** `{ "questionId": selectedOptionId }`

**Example Request:**
```bash
curl -X POST http://localhost:3001/api/quiz/1/evaluate \
  -H "Content-Type: application/json" \
  -d '{
    "answers": {
      "1": 3,
      "2": 2
    }
  }'
```

**Response:**
```json
{
  "quiz_id": 1,
  "total_questions": 10,
  "correct_answers": 8,
  "wrong_answers": 2,
  "unanswered": 0,
  "score": 80,
  "results": [
    {
      "question_id": 1,
      "question_text": "What is React?",
      "user_answer": 3,
      "user_answer_text": "A JavaScript library",
      "correct_answer": 3,
      "correct_answer_text": "A JavaScript library",
      "is_correct": true
    },
    {
      "question_id": 2,
      "question_text": "What is Node.js?",
      "user_answer": 2,
      "user_answer_text": "A database",
      "correct_answer": 1,
      "correct_answer_text": "A runtime environment",
      "is_correct": false
    }
  ]
}
```

**Response Fields:**
- `quiz_id` - The quiz identifier
- `total_questions` - Total number of questions in the quiz
- `correct_answers` - Number of correct answers
- `wrong_answers` - Number of incorrect answers
- `unanswered` - Number of questions not answered
- `score` - Percentage score (0-100)
- `results` - Array of detailed results for each question

## Key Features Explained

### 1. Session-based Question Randomization

Questions are randomized but consistent per session using a seed-based algorithm:

```javascript
const seed = sessionId ? hashCode(sessionId) : Math.floor(Math.random() * 1000);
const query = `
  SELECT * FROM questions 
  WHERE quiz_id = ? 
  ORDER BY (id * ?) % 1000
`;
```

**Benefits:**
- Same user sees same question order during their session
- Different users see different question orders
- Prevents cheating by comparing question positions

### 2. Database Persistence

The SQLite database persists data to disk (`quiz_questions.db`):
- Survives server restarts
- Data is saved on write operations
- Graceful shutdown ensures data integrity

### 3. CORS Configuration

Cross-Origin Resource Sharing is enabled for frontend:

```javascript
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
```

### 4. Error Handling

Comprehensive error handling for:
- Database errors
- Invalid quiz IDs
- Missing required fields
- Malformed requests

### 5. Graceful Shutdown

Handles process termination signals:
```javascript
process.on('SIGINT', () => {
  db.close();
  process.exit(0);
});
```

## Environment Variables

Create a `.env` file in the backend directory:

```env
# Server Configuration
PORT=3001

# Frontend URL for CORS
FRONTEND_URL=http://localhost:3000

# Database Configuration (optional)
DB_PATH=./quiz_questions.db

# Node Environment
NODE_ENV=development
```

**Variable Descriptions:**

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 3001 | Port number for the server |
| `FRONTEND_URL` | http://localhost:3000 | Frontend URL for CORS |
| `DB_PATH` | ./quiz_questions.db | Path to SQLite database file |
| `NODE_ENV` | development | Environment mode |

## NPM Scripts

```json
{
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js",
    "build": "echo 'No build step required'",
    "test": "echo 'Tests not implemented yet'"
  }
}
```

### Script Descriptions:

- **`npm start`** - Start the production server
- **`npm run dev`** - Start development server with auto-restart on file changes
- **`npm run build`** - Placeholder for future build steps
- **`npm test`** - Placeholder for test suite

## Dependencies

### Production Dependencies

```json
{
  "express": "^5.1.0",
  "sql.js": "^1.13.0",
  "better-sqlite3": "^11.10.0",
  "dotenv": "^17.2.3",
  "cors": "^2.8.5"
}
```

**Dependency Details:**

- **express** (^5.1.0) - Web framework for Node.js
- **sql.js** (^1.13.0) - SQLite compiled to JavaScript for in-memory operations
- **better-sqlite3** (^11.10.0) - Fast synchronous SQLite3 bindings
- **dotenv** (^17.2.3) - Loads environment variables from .env file
- **cors** (^2.8.5) - Enable CORS with various options

### Development Dependencies

```json
{
  "nodemon": "^3.1.10"
}
```

**Dependency Details:**

- **nodemon** (^3.1.10) - Monitor for file changes and auto-restart server

## Database Management

### Inspecting the Database

Use SQLite CLI or any SQLite browser:

```bash
# Using sqlite3 CLI
sqlite3 quiz_questions.db

# View all tables
.tables

# View table schema
.schema questions

# Query data
SELECT * FROM questions;
SELECT * FROM options WHERE question_id = 1;
```

### Database Schema Inspection

```sql
-- View table structure
PRAGMA table_info(questions);
PRAGMA table_info(options);
PRAGMA table_info(quizzes);

-- View foreign keys
PRAGMA foreign_key_list(questions);
PRAGMA foreign_key_list(options);

-- View indexes
PRAGMA index_list(questions);
```

### Common Database Queries

```sql
-- Get all questions with their options
SELECT 
  q.id,
  q.question_text,
  o.id as option_id,
  o.option_text,
  o.is_correct
FROM questions q
LEFT JOIN options o ON q.id = o.question_id
WHERE q.quiz_id = 1;

-- Count questions per quiz
SELECT 
  quiz_id,
  COUNT(*) as question_count
FROM questions
GROUP BY quiz_id;

-- Find correct answers
SELECT 
  q.question_text,
  o.option_text as correct_answer
FROM questions q
JOIN options o ON q.id = o.question_id
WHERE o.is_correct = 1;
```

### Resetting the Database

To start fresh:

```bash
# Stop the server
# Delete the database file
rm quiz_questions.db

# Restart the server
npm start

# Database will be recreated automatically
```

## Seeding Data

The `questions.js` file contains seed data. To modify questions:

1. Edit `questions.js`
2. Delete `quiz_questions.db`
3. Restart server to reseed

**Example question format:**
```javascript
{
  question: "What is React?",
  options: [
    { text: "A JavaScript library", isCorrect: true },
    { text: "A database", isCorrect: false },
    { text: "A programming language", isCorrect: false },
    { text: "An operating system", isCorrect: false }
  ]
}
```

## Error Handling

The API returns appropriate HTTP status codes:

| Status Code | Meaning |
|-------------|---------|
| 200 | Success |
| 400 | Bad Request (invalid data) |
| 404 | Not Found (quiz/question doesn't exist) |
| 500 | Internal Server Error |

**Error Response Format:**
```json
{
  "error": "Error message description"
}
```

## Testing the API

### Using cURL

**Get questions:**
```bash
curl http://localhost:3001/api/quiz/1/questions?sessionId=test123
```

**Submit answers:**
```bash
curl -X POST http://localhost:3001/api/quiz/1/evaluate \
  -H "Content-Type: application/json" \
  -d '{"answers":{"1":3,"2":2}}'
```

### Using Postman

1. Import the following collection:
```json
{
  "info": {
    "name": "Quiz Portal API"
  },
  "item": [
    {
      "name": "Get Questions",
      "request": {
        "method": "GET",
        "url": "http://localhost:3001/api/quiz/1/questions?sessionId=abc123"
      }
    },
    {
      "name": "Submit Answers",
      "request": {
        "method": "POST",
        "url": "http://localhost:3001/api/quiz/1/evaluate",
        "header": [
          {
            "key": "Content-Type",
            "value": "application/json"
          }
        ],
        "body": {
          "mode": "raw",
          "raw": "{\"answers\":{\"1\":3,\"2\":2}}"
        }
      }
    }
  ]
}
```

## Security Considerations

### Current Implementation

- CORS restricted to specified frontend URL
- Input validation for quiz IDs and answer formats
- SQL injection prevention through parameterized queries

### Recommended Enhancements

- [ ] Add authentication/authorization
- [ ] Implement rate limiting
- [ ] Add request logging
- [ ] Use HTTPS in production
- [ ] Implement session management
- [ ] Add input sanitization
- [ ] Implement API versioning

## Performance Optimization

- **Better-sqlite3** provides synchronous operations (faster than async for SQLite)
- Question ordering uses efficient modulo operation
- Database indexes on foreign keys
- Connection reuse across requests

## Deployment

### Production Checklist

- [ ] Set `NODE_ENV=production`
- [ ] Use process manager (PM2, systemd)
- [ ] Set up HTTPS/SSL
- [ ] Configure proper CORS origin
- [ ] Enable logging
- [ ] Set up monitoring
- [ ] Regular database backups
- [ ] Implement rate limiting

### Using PM2

```bash
# Install PM2
npm install -g pm2

# Start server
pm2 start server.js --name quiz-backend

# View logs
pm2 logs quiz-backend

# Monitor
pm2 monit

# Restart
pm2 restart quiz-backend
```

### Docker Deployment

Create `Dockerfile`:
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3001
CMD ["node", "server.js"]
```

Build and run:
```bash
docker build -t quiz-backend .
docker run -p 3001:3001 --env-file .env quiz-backend
```

## Troubleshooting

### Common Issues

**Issue:** `Error: Cannot find module 'better-sqlite3'`
```bash
# Solution: Rebuild native modules
npm rebuild better-sqlite3
```

**Issue:** `EADDRINUSE: address already in use`
```bash
# Solution: Change PORT in .env or kill process
lsof -ti:3001 | xargs kill -9
```

**Issue:** Database locked
```bash
# Solution: Ensure no other process is accessing the database
# Close any SQLite browser tools
```

**Issue:** CORS errors
```bash
# Solution: Verify FRONTEND_URL in .env matches your frontend URL
```

## Logging

Add logging for debugging:

```javascript
// In server.js
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});
```

## Future Enhancements

- [ ] User authentication and authorization
- [ ] Multiple quiz support with categories
- [ ] Question difficulty levels
- [ ] Time tracking per question
- [ ] Leaderboard functionality
- [ ] Quiz analytics and statistics
- [ ] Question bank management interface
- [ ] Export/import quiz data
- [ ] Media support (images, videos)
- [ ] Explanations for answers

## Contributing

Contributions are welcome! Please follow these guidelines:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Write/update tests
5. Submit a pull request

## License

MIT License

Copyright (c) 2025 Quiz Portal

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

## Support

For issues and questions:
- Open an issue on GitHub
- Email: support@quizportal.com

## Acknowledgments

- Express.js team
- Better-sqlite3 contributors
- Node.js community

---

**Note:** This backend is designed to work with the Quiz Portal React frontend. Ensure both are running for full functionality.
