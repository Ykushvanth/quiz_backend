function registerQuestions(app, db) {
  app.get("/api/quiz/:quizId/questions", async (req, res) => {
    try {
      const { quizId } = req.params;
      const { sessionId } = req.query;
      
      if (sessionId) {
        const seed = parseInt(sessionId) + parseInt(quizId);
        const qResult = db.exec(
          `SELECT id as question_id, question_text FROM questions WHERE quiz_id = ${quizId} ORDER BY (id * ${seed}) % 1000`
        )[0];
        
        const questions = qResult?.values?.map(row => ({
          question_id: row[0],
          question_text: row[1]
        })) || [];
        
        const qIds = questions.map(q => q.question_id);
        let optionsMap = new Map();

        if (qIds.length > 0) {
          const ids = qIds.join(",");
          const optResult = db.exec(
            `SELECT id as option_id, question_id, option_text FROM options WHERE question_id IN (${ids}) ORDER BY id`
          )[0];
          
          const opts = optResult?.values?.map(row => ({
            option_id: row[0],
            question_id: row[1],
            option_text: row[2]
          })) || [];
          
          opts.forEach(opt => {
            if (!optionsMap.has(opt.question_id)) optionsMap.set(opt.question_id, []);
            optionsMap.get(opt.question_id).push({ id: opt.option_id, option_text: opt.option_text });
          });
        }

        const result = questions.map(q => ({
          id: q.question_id,
          question_text: q.question_text,
          options: optionsMap.get(q.question_id) || []
        }));

        return res.json({ questions: result });
      }
      
      const qResult = db.exec(
        `SELECT id as question_id, question_text FROM questions WHERE quiz_id = ${quizId} ORDER BY RANDOM()`
      )[0];
      
      const questions = qResult?.values?.map(row => ({
        question_id: row[0],
        question_text: row[1]
      })) || [];

      const qIds = questions.map(q => q.question_id);
      let optionsMap = new Map();

      if (qIds.length > 0) {
        const ids = qIds.join(",");
        const optResult = db.exec(
          `SELECT id as option_id, question_id, option_text FROM options WHERE question_id IN (${ids}) ORDER BY id`
        )[0];
        
        const opts = optResult?.values?.map(row => ({
          option_id: row[0],
          question_id: row[1],
          option_text: row[2]
        })) || [];
        
        opts.forEach(opt => {
          if (!optionsMap.has(opt.question_id)) optionsMap.set(opt.question_id, []);
          optionsMap.get(opt.question_id).push({ id: opt.option_id, option_text: opt.option_text });
        });
      }

      const result = questions.map(q => ({
        id: q.question_id,
        question_text: q.question_text,
        options: optionsMap.get(q.question_id) || []
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
        return res.status(400).json({ error: "Invalid answers" });
      }

      const qResult = db.exec(
        `SELECT id as question_id, question_text FROM questions WHERE quiz_id = ${quizId}`
      )[0];
      
      const questions = qResult?.values?.map(row => ({
        question_id: row[0],
        question_text: row[1]
      })) || [];

      const qIds = questions.map(q => q.question_id);
      let correctMap = new Map();
      
      if (qIds.length > 0) {
        const ids = qIds.join(",");
        const correctResult = db.exec(
          `SELECT question_id, id as option_id, option_text FROM options WHERE question_id IN (${ids}) AND is_correct = 1 ORDER BY question_id`
        )[0];
        
        const correctOpts = correctResult?.values?.map(row => ({
          question_id: row[0],
          option_id: row[1],
          option_text: row[2]
        })) || [];
        
        correctOpts.forEach(opt => {
          correctMap.set(opt.question_id, {
            id: opt.option_id,
            option_text: opt.option_text
          });
        });
      }

      const results = questions.map(q => {
        const userAns = answers[q.question_id];
        const correctAns = correctMap.get(q.question_id);
        const isCorrect = userAns && correctAns && userAns === correctAns.id;
        
        return {
          question_id: q.question_id,
          question_text: q.question_text,
          user_answer: userAns || null,
          correct_answer: correctAns ? correctAns.id : null,
          correct_answer_text: correctAns ? correctAns.option_text : null,
          is_correct: isCorrect
        };
      });

      const total = results.length;
      const correct = results.filter(r => r.is_correct).length;
      const wrong = total - correct;
      const score = total > 0 ? Math.round((correct / total) * 100) : 0;

      res.json({
        quiz_id: parseInt(quizId),
        total_questions: total,
        correct_answers: correct,
        wrong_answers: wrong,
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