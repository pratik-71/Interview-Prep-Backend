const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const db = require('../db');
const AnalyticsService = require('../services/analyticsService');

// Update user progress function
async function updateUserProgress(userId, data) {
  try {
    // Check if user progress record exists
    const checkQuery = 'SELECT * FROM user_progress WHERE user_id = $1';
    const checkResult = await db.query(checkQuery, [userId]);
    
    if (checkResult.rows.length === 0) {
      // Create new user progress record
      const createQuery = `
        INSERT INTO user_progress (
          user_id, total_tests_taken, total_questions_answered,
          total_marks, best_marks, total_time_spent
        ) VALUES ($1, $2, $3, $4, $5, $6)
      `;
      
      const createValues = [
        userId, data.totalTests || 0, data.totalQuestions || 0,
        data.totalMarks || 0, data.totalMarks || 0, data.timeSpent || 0
      ];
      
      await db.query(createQuery, createValues);
    } else {
      // Update existing user progress record
      const updateQuery = `
        UPDATE user_progress SET
          total_tests_taken = total_tests_taken + $2,
          total_questions_answered = total_questions_answered + $3,
          total_marks = total_marks + $4,
          best_marks = GREATEST(best_marks, $4),
          total_time_spent = total_time_spent + $5,
          last_updated = CURRENT_TIMESTAMP
        WHERE user_id = $1
      `;
      
      const updateValues = [
        userId, data.totalTests || 0, data.totalQuestions || 0,
        data.totalMarks || 0, data.timeSpent || 0
      ];
      
      await db.query(updateQuery, updateValues);
    }
  } catch (error) {
    throw error;
  }
}

// Get user analytics summary
router.get('/summary', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Get user progress summary
    const progressQuery = `
      SELECT * FROM user_progress 
      WHERE user_id = $1
    `;
    const progressResult = await db.query(progressQuery, [userId]);
    
    // Get recent test results
    const recentTestsQuery = `
      SELECT * FROM test_results 
      WHERE user_id = $1 
      ORDER BY test_date DESC 
      LIMIT 10
    `;
    const recentTestsResult = await db.query(recentTestsQuery, [userId]);
    
    // Get technology performance
    const technologyQuery = `
      SELECT 
        technology,
        COUNT(*) as tests_taken,
        AVG(percentage_score) as avg_score,
        MAX(percentage_score) as best_score
      FROM test_results 
      WHERE user_id = $1 
      GROUP BY technology
      ORDER BY tests_taken DESC
    `;
    const technologyResult = await db.query(technologyQuery, [userId]);
    
    const analytics = {
      progress: progressResult.rows[0] || null,
      recentTests: recentTestsResult.rows,
      technologyPerformance: technologyResult.rows
    };
    
    res.json(analytics);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

// Save test results
router.post('/test-results', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      technology,
      totalQuestions,
      questionsAnswered,
      totalMarks,
      maxPossibleMarks,
      percentageScore,
      timeSpent
    } = req.body;
    
    // Insert test results
    const testQuery = `
      INSERT INTO test_results (
        user_id, technology, total_questions, questions_answered,
        total_marks, max_possible_marks, percentage_score, time_spent
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id
    `;
    
    const testValues = [
      userId, technology, totalQuestions, questionsAnswered,
      totalMarks, maxPossibleMarks, percentageScore, timeSpent
    ];
    
    const testResult = await db.query(testQuery, testValues);
    const testId = testResult.rows[0].id;
    
    // Update user progress
    await updateUserProgress(userId, {
      totalTests: 1,
      totalQuestions: questionsAnswered,
      totalMarks: totalMarks,
      timeSpent: timeSpent
    });
    
    res.json({ 
      success: true, 
      testId,
      message: 'Test results saved successfully' 
    });
    
  } catch (error) {
    res.status(500).json({ error: 'Failed to save test results' });
  }
});

// Note: Question results are stored directly in test_results table
// Individual question details are not stored separately

// Get user test history
router.get('/test-history', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { limit = 20, offset = 0 } = req.query;
    
    const query = `
      SELECT * FROM test_results 
      WHERE user_id = $1 
      ORDER BY test_date DESC 
      LIMIT $2 OFFSET $3
    `;
    
    const result = await db.query(query, [userId, limit, offset]);
    res.json(result.rows);
    
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch test history' });
  }
});

// Note: Difficulty performance is calculated from test_results table
// Individual question details are not stored separately

// Get technology performance
router.get('/technology-performance', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    
    const query = `
      SELECT 
        technology,
        COUNT(*) as tests_taken,
        AVG(percentage_score) as average_score,
        MAX(percentage_score) as best_score,
        AVG(time_spent) as average_time,
        SUM(total_questions) as total_questions
      FROM test_results 
      WHERE user_id = $1 
      GROUP BY technology
      ORDER BY tests_taken DESC
    `;
    
    const result = await db.query(query, [userId]);
    res.json(result.rows);
    
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch technology performance' });
  }
});

module.exports = router;
