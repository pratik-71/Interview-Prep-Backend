const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const { getSupabase } = require('../db');

// Create a new test record for each test completion
async function createTestRecord(userId, data) {
  try {
    const supabase = getSupabase();
    
    // Always create a new test record instead of updating
    const { error: createError } = await supabase
      .from('user_progress')
      .insert({
        user_id: userId,
        test_date: new Date().toISOString(),
        technology: data.technology || 'Interview Practice',
        total_questions: data.totalQuestions || 0,
        questions_answered: data.questionsAnswered || 0,
        total_marks: data.totalMarks || 0,
        max_possible_marks: data.maxPossibleMarks || 0,
        percentage_score: data.percentageScore || 0,
        time_spent: data.timeSpent || 0
      });
    
    if (createError) throw createError;
  } catch (error) {
    throw error;
  }
}

// Update user progress for individual question submissions (accumulate for same test)
async function updateUserProgress(userId, data) {
  try {
    const supabase = getSupabase();
    
    // Get the most recent test record for this user
    const { data: recentTest, error: checkError } = await supabase
      .from('user_progress')
      .select('*')
      .eq('user_id', userId)
      .order('test_date', { ascending: false })
      .limit(1)
      .single();
    
    if (checkError && checkError.code !== 'PGRST116') {
      throw checkError;
    }
    
    // If no recent test or it's from a different day, create a new record
    const now = new Date();
    const recentTestDate = recentTest ? new Date(recentTest.test_date) : null;
    const isSameDay = recentTestDate && 
      now.getDate() === recentTestDate.getDate() &&
      now.getMonth() === recentTestDate.getMonth() &&
      now.getFullYear() === recentTestDate.getFullYear();
    
    if (!recentTest || !isSameDay) {
      // Create new test record
      await createTestRecord(userId, data);
    } else {
      // Update existing test record (same day)
      const newTotalMarks = recentTest.total_marks + (data.totalMarks || 0);
      const newMaxPossibleMarks = recentTest.max_possible_marks + (data.maxPossibleMarks || 0);
      const newPercentageScore = newMaxPossibleMarks > 0 ? (newTotalMarks / newMaxPossibleMarks) * 100 : 0;
      
      const { error: updateError } = await supabase
        .from('user_progress')
        .update({
          total_questions: recentTest.total_questions + (data.totalQuestions || 0),
          questions_answered: recentTest.questions_answered + (data.questionsAnswered || 0),
          total_marks: newTotalMarks,
          max_possible_marks: newMaxPossibleMarks,
          percentage_score: newPercentageScore,
          time_spent: recentTest.time_spent + (data.timeSpent || 0)
        })
        .eq('id', recentTest.id);
      
      if (updateError) throw updateError;
    }
  } catch (error) {
    throw error;
  }
}

// Get user analytics summary
router.get('/summary', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const supabase = getSupabase();
    
    // Get user progress summary
    const { data: progress, error: progressError } = await supabase
      .from('user_progress')
      .select('*')
      .eq('user_id', userId)
      .single();
    
    if (progressError && progressError.code !== 'PGRST116') {
      throw progressError;
    }
    
    // Get recent test results - using user_progress table
    const { data: recentTests, error: testsError } = await supabase
      .from('user_progress')
      .select('*')
      .eq('user_id', userId)
      .order('test_date', { ascending: false })
      .limit(10);
    
    if (testsError) throw testsError;
    
    // Get all tests for technology performance calculation
    const { data: allTests, error: techError } = await supabase
      .from('user_progress')
      .select('technology, total_marks, time_spent, total_questions, questions_answered, percentage_score')
      .eq('user_id', userId);
    
    if (techError) throw techError;
    
    // Calculate aggregate statistics from all tests
    const totalTests = allTests?.length || 0;
    const totalQuestions = allTests?.reduce((sum, test) => sum + (test.questions_answered || 0), 0) || 0;
    const totalMarks = allTests?.reduce((sum, test) => sum + (test.total_marks || 0), 0) || 0;
    const totalMaxMarks = allTests?.reduce((sum, test) => sum + (test.max_possible_marks || 0), 0) || 0;
    const totalTime = allTests?.reduce((sum, test) => sum + (test.time_spent || 0), 0) || 0;
    const averageScore = totalMaxMarks > 0 ? (totalMarks / totalMaxMarks) * 100 : 0;
    
    // Process user progress data for analytics
    const progressStats = {
      total_tests: totalTests,
      total_questions: totalQuestions,
      total_marks: totalMarks,
      best_marks: allTests?.length > 0 ? Math.max(...allTests.map(t => t.total_marks || 0)) : 0,
      total_time: totalTime,
      average_score: averageScore
    };
    
    // Group by technology for performance stats
    const techMap = new Map();
    allTests?.forEach(test => {
      const tech = test.technology || 'Interview Practice';
      if (!techMap.has(tech)) {
        techMap.set(tech, {
          technology: tech,
          tests_taken: 0,
          total_marks: 0,
          total_max_marks: 0,
          total_time: 0,
          total_questions: 0
        });
      }
      const techData = techMap.get(tech);
      techData.tests_taken++;
      techData.total_marks += test.total_marks || 0;
      techData.total_max_marks += test.max_possible_marks || 0;
      techData.total_time += test.time_spent || 0;
      techData.total_questions += test.questions_answered || 0;
    });
    
    const technologyPerformanceArray = Array.from(techMap.values()).map(techData => ({
      technology: techData.technology,
      tests_taken: techData.tests_taken,
      average_score: techData.total_max_marks > 0 ? (techData.total_marks / techData.total_max_marks) * 100 : 0,
      best_score: techData.total_marks > 0 ? techData.total_marks : 0,
      average_time: techData.tests_taken > 0 ? techData.total_time / techData.tests_taken : 0,
      total_questions: techData.total_questions
    }));
    
    const analytics = {
      progress: progress || null,
      recentTests: recentTests || [],
      technologyPerformance: technologyPerformanceArray
    };
    
    res.json(analytics);
  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

// Save test results - using user_progress table
router.post('/test-results', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const supabase = getSupabase();
    const {
      technology,
      totalQuestions,
      questionsAnswered,
      totalMarks,
      maxPossibleMarks,
      percentageScore,
      timeSpent
    } = req.body;
    
    // Create a new test record for each test completion
    await createTestRecord(userId, {
      technology: technology || 'Interview Practice',
      totalQuestions: totalQuestions,
      questionsAnswered: questionsAnswered,
      totalMarks: totalMarks,
      maxPossibleMarks: maxPossibleMarks,
      percentageScore: percentageScore,
      timeSpent: timeSpent
    });
    
    res.json({ 
      success: true, 
      message: 'Test results saved successfully' 
    });
    
  } catch (error) {
    console.error('Save test results error:', error);
    res.status(500).json({ error: 'Failed to save test results' });
  }
});

// Get user test history - using user_progress table
router.get('/test-history', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const supabase = getSupabase();
    
    // Get all test records for this user
    const { data: testHistory, error } = await supabase
      .from('user_progress')
      .select('*')
      .eq('user_id', userId)
      .order('test_date', { ascending: false });
    
    if (error) throw error;
    
    // Format as test history - using correct schema
    const formattedHistory = (testHistory || []).map(test => ({
      id: test.id,
      user_id: test.user_id,
      test_date: test.test_date,
      technology: test.technology,
      total_questions: test.total_questions,
      questions_answered: test.questions_answered,
      total_marks: test.total_marks,
      max_possible_marks: test.max_possible_marks,
      percentage_score: test.percentage_score,
      time_spent: test.time_spent
    }));
    
    res.json(formattedHistory);
    
  } catch (error) {
    console.error('Test history error:', error);
    res.status(500).json({ error: 'Failed to fetch test history' });
  }
});

// Save individual question results - using user_progress table
router.post('/question-results', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const supabase = getSupabase();
    const {
      technology,
      difficulty_level,
      question_text,
      user_answer,
      marks_obtained,
      max_marks,
      time_spent,
      confidence_level,
      fluency_score,
      feedback,
      test_date
    } = req.body;
    
    // Normalize marks: audio answers are out of 100, text answers are out of 10
    // Normalize everything to a 10-point scale for consistency
    let normalizedMarks = marks_obtained;
    let normalizedMaxMarks = max_marks || 10;
    
    // If marks are greater than 10, it's likely an audio answer (0-100 scale)
    if (max_marks > 10) {
      normalizedMarks = (marks_obtained / max_marks) * 10;
      normalizedMaxMarks = 10;
    }
    
    // Update user progress with question data instead of separate question_results table
    await updateUserProgress(userId, {
      technology: technology || 'Interview Practice',
      totalQuestions: 1,
      questionsAnswered: 1,
      totalMarks: normalizedMarks,
      maxPossibleMarks: normalizedMaxMarks,
      percentageScore: (normalizedMarks / normalizedMaxMarks) * 100,
      timeSpent: time_spent || 0
    });
    
    res.json({ 
      success: true, 
      message: 'Question result saved successfully' 
    });
    
  } catch (error) {
    console.error('Save question result error:', error);
    res.status(500).json({ error: 'Failed to save question result' });
  }
});

// Get technology performance - using user_progress table
router.get('/technology-performance', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const supabase = getSupabase();
    
    // Get user progress data
    const { data: userProgress, error } = await supabase
      .from('user_progress')
      .select('*')
      .eq('user_id', userId)
      .single();
    
    if (error && error.code !== 'PGRST116') throw error;
    
    // Format as technology performance
    const technologyPerformance = userProgress ? [{
      technology: userProgress.technology || 'Interview Practice',
      tests_taken: 1, // Single record approach
      average_score: userProgress.percentage_score || 0,
      best_score: userProgress.total_marks || 0,
      average_time: userProgress.time_spent || 0,
      total_questions: userProgress.total_questions || 0
    }] : [];
    
    res.json(technologyPerformance);
    
  } catch (error) {
    console.error('Technology performance error:', error);
    res.status(500).json({ error: 'Failed to fetch technology performance' });
  }
});

module.exports = router;
