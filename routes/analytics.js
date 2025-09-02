const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const { getSupabase } = require('../db');

// Update user progress function - using actual database schema
async function updateUserProgress(userId, data) {
  try {
    const supabase = getSupabase();
    
    // Check if user progress record exists
    const { data: existingProgress, error: checkError } = await supabase
      .from('user_progress')
      .select('*')
      .eq('user_id', userId)
      .single();
    
    if (checkError && checkError.code !== 'PGRST116') { // PGRST116 is "not found"
      throw checkError;
    }
    
    if (!existingProgress) {
             // Create new user progress record - using correct schema
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
    } else {
             // Update existing user progress record - using correct schema
       const { error: updateError } = await supabase
         .from('user_progress')
         .update({
           test_date: new Date().toISOString(),
           technology: data.technology || 'Interview Practice',
           total_questions: existingProgress.total_questions + (data.totalQuestions || 0),
           questions_answered: existingProgress.questions_answered + (data.questionsAnswered || 0),
           total_marks: existingProgress.total_marks + (data.totalMarks || 0),
           max_possible_marks: existingProgress.max_possible_marks + (data.maxPossibleMarks || 0),
           percentage_score: existingProgress.questions_answered > 0 ? (existingProgress.total_marks + (data.totalMarks || 0)) / (existingProgress.questions_answered + (data.questionsAnswered || 0)) * 10 : 0,
           time_spent: existingProgress.time_spent + (data.timeSpent || 0)
         })
         .eq('user_id', userId);
      
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
    
    // Get technology performance - using user_progress table
    const { data: technologyPerformance, error: techError } = await supabase
      .from('user_progress')
      .select('total_marks, time_spent, total_questions, questions_answered, percentage_score')
      .eq('user_id', userId);
    
    if (techError) throw techError;
    
    // Process user progress data for analytics - using correct schema
    const progressStats = {
      total_tests: 1, // Since we're using a single record approach
      total_questions: progress?.total_questions || 0,
      total_marks: progress?.total_marks || 0,
      best_marks: progress?.total_marks || 0, // Use total_marks as best_marks
      total_time: progress?.time_spent || 0,
      average_score: progress?.percentage_score || 0
    };
    
    const technologyPerformanceArray = [{
      technology: progress?.technology || 'Interview Practice',
      tests_taken: 1,
      average_score: progress?.percentage_score || 0,
      best_score: progress?.total_marks || 0,
      average_time: progress?.time_spent || 0,
      total_questions: progress?.total_questions || 0
    }];
    
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
    
    // Update user progress directly (no separate test_results table)
    await updateUserProgress(userId, {
      technology: technology || 'Interview Practice',
      totalQuestions: questionsAnswered,
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
    
    // Get user progress as test history
    const { data: userProgress, error } = await supabase
      .from('user_progress')
      .select('*')
      .eq('user_id', userId)
      .single();
    
    if (error && error.code !== 'PGRST116') throw error;
    
         // Format as test history - using correct schema
     const testHistory = userProgress ? [{
       id: userProgress.id,
       user_id: userProgress.user_id,
       test_date: userProgress.test_date,
       technology: userProgress.technology,
       total_questions: userProgress.total_questions,
       questions_answered: userProgress.questions_answered,
       total_marks: userProgress.total_marks,
       max_possible_marks: userProgress.max_possible_marks,
       percentage_score: userProgress.percentage_score,
       time_spent: userProgress.time_spent
     }] : [];
    
    res.json(testHistory);
    
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
    
    // Update user progress with question data instead of separate question_results table
    await updateUserProgress(userId, {
      technology: technology || 'Interview Practice',
      totalQuestions: 1,
      totalMarks: marks_obtained,
      maxPossibleMarks: max_marks || 10,
      percentageScore: (marks_obtained / (max_marks || 10)) * 10, // Convert to 10-point scale
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
