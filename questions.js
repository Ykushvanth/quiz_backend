function registerQuestions(app, db) {
  app.get("/api/quiz/:quizId/questions", async (req, res) => {
    try {
      const { quizId } = req.params;
      const { sessionId } = req.query;
      
      if (sessionId) {
        const seed = parseInt(sessionId) + parseInt(quizId);
        const questions = db.prepare(
          `SELECT id as question_id, question_text FROM questions WHERE quiz_id = ? ORDER BY (id * ?) % 1000`
        ).all(quizId, seed);
        
        const questionIds = questions.map((q) => q.question_id);
        let optionsByQuestionId = new Map();

        if (questionIds.length > 0) {
          const placeholders = questionIds.map(() => "?").join(",");
          const options = db.prepare(
            `SELECT id as option_id, question_id, option_text
             FROM options
             WHERE question_id IN (${placeholders})
             ORDER BY id`
          ).all(...questionIds);
          optionsByQuestionId = options.reduce((map, row) => {
            if (!map.has(row.question_id)) map.set(row.question_id, []);
            map.get(row.question_id).push({ id: row.option_id, option_text: row.option_text });
            return map;
          }, new Map());
        }

        const result = questions.map((q) => ({
          id: q.question_id,
          question_text: q.question_text,
          options: optionsByQuestionId.get(q.question_id) || [],
        }));

        return res.json({ questions: result });
      }
      
      const questions = db.prepare(
        `SELECT id as question_id, question_text FROM questions WHERE quiz_id = ? ORDER BY RANDOM()`
      ).all(quizId);

      const questionIds = questions.map((q) => q.question_id);
      let optionsByQuestionId = new Map();

      if (questionIds.length > 0) {
        const placeholders = questionIds.map(() => "?").join(",");
        const options = db.prepare(
          `SELECT id as option_id, question_id, option_text
           FROM options
           WHERE question_id IN (${placeholders})
           ORDER BY id`
        ).all(...questionIds);
        optionsByQuestionId = options.reduce((map, row) => {
          if (!map.has(row.question_id)) map.set(row.question_id, []);
          map.get(row.question_id).push({ id: row.option_id, option_text: row.option_text });
          return map;
        }, new Map());
      }

      const result = questions.map((q) => ({
        id: q.question_id,
        question_text: q.question_text,
        options: optionsByQuestionId.get(q.question_id) || [],
      }));

      res.json({ questions: result });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to load questions" });
    }
  });

  app.post("/api/quiz/:quizId/evaluate", async (req, res) => {
    try {
      const { quizId } = req.params;
      const { answers } = req.body;

      if (!answers || typeof answers !== 'object') {
        return res.status(400).json({ error: "Invalid answers format" });
      }

      const questions = db.prepare(
        `SELECT id as question_id, question_text FROM questions WHERE quiz_id = ?`
      ).all(quizId);

      const questionIds = questions.map((q) => q.question_id);
      let correctAnswers = new Map();
      
      if (questionIds.length > 0) {
        const placeholders = questionIds.map(() => "?").join(",");
        const correctOptions = db.prepare(
          `SELECT question_id, id as option_id, option_text
           FROM options
           WHERE question_id IN (${placeholders}) AND is_correct = 1
           ORDER BY question_id`
        ).all(...questionIds);
        
        correctAnswers = correctOptions.reduce((map, row) => {
          map.set(row.question_id, {
            id: row.option_id,
            option_text: row.option_text
          });
          return map;
        }, new Map());
      }

      const results = questions.map((question) => {
        const userAnswer = answers[question.question_id];
        const correctAnswer = correctAnswers.get(question.question_id);
        const isCorrect = userAnswer && correctAnswer && userAnswer === correctAnswer.id;
        
        return {
          question_id: question.question_id,
          question_text: question.question_text,
          user_answer: userAnswer || null,
          correct_answer: correctAnswer ? correctAnswer.id : null,
          correct_answer_text: correctAnswer ? correctAnswer.option_text : null,
          is_correct: isCorrect
        };
      });

      const totalQuestions = results.length;
      const correctCount = results.filter(r => r.is_correct).length;
      const wrongCount = totalQuestions - correctCount;
      const score = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;

      res.json({
        quiz_id: parseInt(quizId),
        total_questions: totalQuestions,
        correct_answers: correctCount,
        wrong_answers: wrongCount,
        score: score,
        results: results
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to evaluate quiz" });
    }
  });
}

module.exports = { registerQuestions };


