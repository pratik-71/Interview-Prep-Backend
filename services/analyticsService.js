const db = require('../db');

class AnalyticsService {
  // Calculate user progress statistics
  static async calculateUserProgress(userId) {
    try {
      // Get total test statistics
      const testStatsQuery = `
        SELECT 
          COUNT(*) as total_tests,
          AVG(percentage_score) as avg_score,
          MAX(percentage_score) as best_score,
          SUM(time_spent) as total_time,
          COUNT(DISTINCT technology) as technologies_used
        FROM test_results 
        WHERE user_id = $1
      `;
      
      const testStats = await db.query(testStatsQuery, [userId]);
      
      // Get difficulty performance
      const difficultyQuery = `
        SELECT 
          difficulty_level,
          COUNT(*) as question_count,
          AVG(marks_obtained) as avg_marks,
          SUM(time_spent) as total_time
        FROM question_results 
        WHERE user_id = $1 
        GROUP BY difficulty_level
      `;
      
      const difficultyStats = await db.query(difficultyQuery, [userId]);
      
      // Get recent performance trend
      const trendQuery = `
        SELECT 
          DATE(test_date) as test_date,
          AVG(percentage_score) as daily_avg_score,
          COUNT(*) as tests_taken
        FROM test_results 
        WHERE user_id = $1 
        AND test_date >= CURRENT_DATE - INTERVAL '30 days'
        GROUP BY DATE(test_date)
        ORDER BY test_date DESC
      `;
      
      const trendStats = await db.query(trendQuery, [userId]);
      
      // Calculate improvement rate
      let improvementRate = 0;
      if (trendStats.rows.length > 1) {
        const recentAvg = trendStats.rows[0]?.daily_avg_score || 0;
        const olderAvg = trendStats.rows[trendStats.rows.length - 1]?.daily_avg_score || 0;
        if (olderAvg > 0) {
          improvementRate = ((recentAvg - olderAvg) / olderAvg) * 100;
        }
      }
      
      return {
        testStats: testStats.rows[0] || {},
        difficultyStats: difficultyStats.rows,
        trendStats: trendStats.rows,
        improvementRate: Math.round(improvementRate * 100) / 100
      };
      
    } catch (error) {
      throw error;
    }
  }
  
  // Generate performance insights
  static async generateInsights(userId) {
    try {
      const insights = [];
      
      // Get weak areas
      const weakAreasQuery = `
        SELECT 
          difficulty_level,
          AVG(marks_obtained) as avg_marks,
          COUNT(*) as question_count
        FROM question_results 
        WHERE user_id = $1 
        GROUP BY difficulty_level 
        HAVING AVG(marks_obtained) < 7.0
        ORDER BY avg_marks ASC
      `;
      
      const weakAreas = await db.query(weakAreasQuery, [userId]);
      
      if (weakAreas.rows.length > 0) {
        insights.push({
          type: 'weak_area',
          message: `Focus on ${weakAreas.rows[0].difficulty_level} level questions. Your average score is ${weakAreas.rows[0].avg_marks.toFixed(1)}/10.`,
          priority: 'high'
        });
      }
      
      // Get improvement opportunities
      const improvementQuery = `
        SELECT 
          technology,
          AVG(percentage_score) as avg_score,
          COUNT(*) as tests_taken
        FROM test_results 
        WHERE user_id = $1 
        GROUP BY technology 
        HAVING AVG(percentage_score) < 70
        ORDER BY avg_score ASC
      `;
      
      const improvements = await db.query(improvementQuery, [userId]);
      
      if (improvements.rows.length > 0) {
        insights.push({
          type: 'improvement',
          message: `Consider practicing more ${improvements.rows[0].technology} questions. Your average score is ${improvements.rows[0].avg_score.toFixed(1)}%.`,
          priority: 'medium'
        });
      }
      
      // Get strengths
      const strengthsQuery = `
        SELECT 
          difficulty_level,
          AVG(marks_obtained) as avg_marks,
          COUNT(*) as question_count
        FROM question_results 
        WHERE user_id = $1 
        GROUP BY difficulty_level 
        HAVING AVG(marks_obtained) >= 8.0
        ORDER BY avg_marks DESC
      `;
      
      const strengths = await db.query(strengthsQuery, [userId]);
      
      if (strengths.rows.length > 0) {
        insights.push({
          type: 'strength',
          message: `Great job on ${strengths.rows[0].difficulty_level} questions! Your average score is ${strengths.rows[0].avg_marks.toFixed(1)}/10.`,
          priority: 'low'
        });
      }
      
      return insights;
      
    } catch (error) {
      throw error;
    }
  }
  
  // Get study recommendations
  static async getStudyRecommendations(userId) {
    try {
      const recommendations = [];
      
      // Get question distribution
      const distributionQuery = `
        SELECT 
          difficulty_level,
          COUNT(*) as question_count
        FROM question_results 
        WHERE user_id = $1 
        GROUP BY difficulty_level
        ORDER BY question_count ASC
      `;
      
      const distribution = await db.query(distributionQuery, [userId]);
      
      // Recommend more practice in underrepresented areas
      const totalQuestions = distribution.rows.reduce((sum, row) => sum + parseInt(row.question_count), 0);
      
      distribution.rows.forEach(row => {
        const percentage = (row.question_count / totalQuestions) * 100;
        if (percentage < 25 && totalQuestions > 10) {
          recommendations.push({
            type: 'practice_balance',
            message: `Practice more ${row.difficulty_level} questions. Currently only ${percentage.toFixed(1)}% of your practice.`,
            priority: 'medium'
          });
        }
      });
      
      // Get time-based recommendations
      const timeQuery = `
        SELECT 
          AVG(time_spent) as avg_time_per_question
        FROM question_results 
        WHERE user_id = $1
      `;
      
      const timeStats = await db.query(timeQuery, [userId]);
      const avgTime = timeStats.rows[0]?.avg_time_per_question || 0;
      
      if (avgTime > 120) { // More than 2 minutes per question
        recommendations.push({
          type: 'time_management',
          message: 'Consider practicing time management. Your average time per question is high.',
          priority: 'medium'
        });
      }
      
      return recommendations;
      
    } catch (error) {
      throw error;
    }
  }
}

module.exports = AnalyticsService;
