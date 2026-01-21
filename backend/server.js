import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import axios from 'axios';
import db, { saveDatabase } from './database.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Helper function to convert sql.js result to objects
function queryToObjects(result) {
  if (!result || result.length === 0) return [];
  const columns = result[0].columns;
  const values = result[0].values;
  return values.map(row => {
    const obj = {};
    columns.forEach((col, i) => {
      obj[col] = row[i];
    });
    return obj;
  });
}

function queryToObject(result) {
  const objects = queryToObjects(result);
  return objects.length > 0 ? objects[0] : null;
}

// Middleware to verify admin password
const verifyAdmin = (req, res, next) => {
  const { password } = req.body;
  if (password === process.env.ADMIN_PASSWORD) {
    next();
  } else {
    res.status(401).json({ error: 'Invalid admin password' });
  }
};

// ============== ADMIN ENDPOINTS ==============

// Verify admin password
app.post('/api/admin/verify', (req, res) => {
  const { password } = req.body;
  if (password === process.env.ADMIN_PASSWORD) {
    res.json({ success: true });
  } else {
    res.status(401).json({ error: 'Invalid password' });
  }
});

// Add a new question
app.post('/api/admin/questions', verifyAdmin, (req, res) => {
  const { question, correct_answer, deadline, character_limit } = req.body;
  
  try {
    db.run('INSERT INTO questions (question, correct_answer, deadline, character_limit) VALUES (?, ?, ?, ?)', 
      [question, correct_answer, deadline, character_limit || null]);
    const result = db.exec('SELECT last_insert_rowid() as id');
    const id = result[0].values[0][0];
    saveDatabase();
    res.json({ id, message: 'Question added successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all questions (admin view)
app.post('/api/admin/questions/list', verifyAdmin, (req, res) => {
  try {
    const questions = queryToObjects(db.exec(`
      SELECT q.*, 
        (SELECT COUNT(*) FROM user_responses WHERE question_id = q.id) as response_count,
        (SELECT COUNT(*) FROM user_responses WHERE question_id = q.id AND score IS NOT NULL) > 0 as has_scored_responses
      FROM questions q
      ORDER BY q.created_at DESC
    `));
    res.json(questions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Toggle question enabled status
app.post('/api/admin/questions/:id/toggle', verifyAdmin, (req, res) => {
  const { id } = req.params;
  
  try {
    const question = queryToObject(db.exec('SELECT enabled FROM questions WHERE id = ?', [id]));
    const newStatus = question.enabled ? 0 : 1;
    db.run('UPDATE questions SET enabled = ? WHERE id = ?', [newStatus, id]);
    saveDatabase();
    res.json({ message: 'Question status updated', enabled: newStatus });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get responses for a specific question
app.post('/api/admin/questions/:id/responses', verifyAdmin, (req, res) => {
  const { id } = req.params;
  
  try {
    const responses = queryToObjects(db.exec(`
      SELECT * FROM user_responses 
      WHERE question_id = ? 
      ORDER BY submitted_at DESC
    `, [id]));
    res.json(responses);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Score responses using AI
app.post('/api/admin/questions/:id/score', verifyAdmin, async (req, res) => {
  const { id } = req.params;
  
  try {
    // Get question and correct answer
    const question = queryToObject(db.exec('SELECT * FROM questions WHERE id = ?', [id]));
    if (!question) {
      return res.status(404).json({ error: 'Question not found' });
    }

    // Get all unscored responses
    const responses = queryToObjects(db.exec(`
      SELECT * FROM user_responses 
      WHERE question_id = ? AND score IS NULL
    `, [id]));

    if (responses.length === 0) {
      return res.json({ message: 'No new responses to score' });
    }

    // Prepare AI prompt
    const prompt = `You are grading open-ended quiz responses. 

IMPORTANT: Detect the language of the question and provide all feedback in the SAME language as the question.

Question: "${question.question}"
Correct Answer: "${question.correct_answer}"

Grade each of the following student responses on a scale of 0-100, where:
- 100 = Perfect answer, matches the correct answer completely
- 75-99 = Very good answer, captures the main points
- 50-74 = Acceptable answer, partially correct
- 25-49 = Poor answer, minimal understanding
- 0-24 = Wrong or irrelevant answer

Student Responses:
${responses.map((r, i) => `${i + 1}. ${r.username}: "${r.answer}"`).join('\n')}

Respond in JSON format with an array of objects. IMPORTANT: Write the "feedback" field in the SAME language as the question above.

Format:
[
  {"response_id": 1, "score": 85, "feedback": "Good answer that captures the main concept."},
  {"response_id": 2, "score": 60, "feedback": "Partially correct but missing key details."}
]

Remember: Use the SAME language as the question for the feedback!`;

    // Call OpenRouter API
    const aiResponse = await axios.post(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        model: process.env.OPENROUTER_MODEL || 'openai/gpt-4o-mini',
        messages: [
          { role: 'user', content: prompt }
        ]
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: 120000, // 2 minutes timeout
        httpsAgent: new (require('https').Agent)({
          rejectUnauthorized: true,
          keepAlive: true
        })
      }
    );

    const aiContent = aiResponse.data.choices[0].message.content;
    
    // Parse AI response (extract JSON from markdown if needed)
    let scores;
    try {
      const jsonMatch = aiContent.match(/\[[\s\S]*\]/);
      scores = JSON.parse(jsonMatch ? jsonMatch[0] : aiContent);
    } catch (e) {
      return res.status(500).json({ error: 'Failed to parse AI response', aiContent });
    }

    // Update scores in database
    scores.forEach((score, index) => {
      if (responses[index]) {
        db.run('UPDATE user_responses SET score = ?, ai_feedback = ? WHERE id = ?', 
          [score.score, score.feedback, responses[index].id]);
      }
    });

    // Record scoring event
    db.run('INSERT INTO scoring_results (question_id, total_responses, ai_model) VALUES (?, ?, ?)', 
      [id, responses.length, process.env.OPENROUTER_MODEL || 'openai/gpt-4o-mini']);
    
    saveDatabase();

    res.json({ 
      message: 'Responses scored successfully', 
      scored_count: responses.length,
      scores 
    });
  } catch (error) {
    console.error('Scoring error:', error);
    let errorMessage = error.message;
    
    if (error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT') {
      errorMessage = 'Network connection timeout. Please try again.';
    } else if (error.response?.data) {
      errorMessage = `API Error: ${JSON.stringify(error.response.data)}`;
    }
    
    res.status(500).json({ error: errorMessage });
  }
});

// Delete a question
app.post('/api/admin/questions/:id/delete', verifyAdmin, (req, res) => {
  const { id } = req.params;
  
  try {
    db.run('DELETE FROM user_responses WHERE question_id = ?', [id]);
    db.run('DELETE FROM scoring_results WHERE question_id = ?', [id]);
    db.run('DELETE FROM questions WHERE id = ?', [id]);
    saveDatabase();
    res.json({ message: 'Question deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============== USER ENDPOINTS ==============

// Get enabled questions that haven't passed deadline
app.get('/api/questions', (req, res) => {
  try {
    const questions = queryToObjects(db.exec(`
      SELECT id, question, deadline, character_limit, created_at 
      FROM questions 
      WHERE enabled = 1
      ORDER BY created_at DESC
    `));
    res.json(questions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Submit a user response
app.post('/api/questions/:id/respond', (req, res) => {
  const { id } = req.params;
  const { user_id, username, answer } = req.body;
  
  if (!user_id || !username || !answer) {
    return res.status(400).json({ error: 'User ID, username and answer are required' });
  }

  try {
    // Check if question exists and is enabled
    const question = queryToObject(db.exec(`
      SELECT * FROM questions 
      WHERE id = ? AND enabled = 1
    `, [id]));

    if (!question) {
      return res.status(404).json({ error: 'Question not found or deadline passed' });
    }
    
    // Check deadline if it exists
    if (question.deadline) {
      const now = new Date();
      const deadline = new Date(question.deadline);
      if (deadline <= now) {
        return res.status(400).json({ error: 'Question deadline has passed' });
      }
    }

    // Check if user already responded (by user_id)
    const existing = queryToObject(db.exec(`
      SELECT id FROM user_responses 
      WHERE question_id = ? AND user_id = ?
    `, [id, user_id]));

    if (existing) {
      return res.status(400).json({ error: 'You have already answered this question' });
    }

    // Insert response
    db.run('INSERT INTO user_responses (question_id, user_id, username, answer) VALUES (?, ?, ?, ?)', [id, user_id, username, answer]);
    const result = db.exec('SELECT last_insert_rowid() as id');
    const responseId = result[0].values[0][0];
    saveDatabase();
    
    res.json({ 
      id: responseId, 
      message: 'Response submitted successfully' 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Check if user has already responded to a question
app.get('/api/questions/:id/check/:user_id', (req, res) => {
  const { id, user_id } = req.params;
  
  try {
    const response = queryToObject(db.exec(`
      SELECT id FROM user_responses 
      WHERE question_id = ? AND user_id = ?
    `, [id, user_id]));
    
    res.json({ hasResponded: !!response });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
