import { Assessment, Note, ChatSession, FileUpload } from '../types';

// Types for analytics data
export interface SkillProgress {
  reading: {
    comprehension: number;
    retention: number;
    speed: number;
    totalAssessments: number;
  };
  writing: {
    structure: number;
    vocabulary: number;
    grammar: number;
    totalAssessments: number;
  };
  listening: {
    comprehension: number;
    noteAccuracy: number;
    totalAssessments: number;
  };
  speaking: {
    pronunciation: number;
    fluency: number;
    confidence: number;
    totalAssessments: number;
  };
}

export interface StudyTimeData {
  totalHours: number;
  weeklyAverage: number;
  distribution: {
    morning: number;
    afternoon: number;
    evening: number;
  };
  mostProductiveTime: string;
  sessionsPerDay: number;
}

export interface PerformanceTrends {
  readingSpeed: number[];
  comprehension: number[];
  vocabularyGrowth: number[];
  grammarAccuracy: number[];
}

export interface CompletionRates {
  readingExercises: number;
  writingAssignments: number;
  listeningTasks: number;
  speakingPractices: number;
}

export interface WeeklyComparison {
  notes: { current: number; previous: number; change: number };
  chats: { current: number; previous: number; change: number };
  files: { current: number; previous: number; change: number };
  assessments: { current: number; previous: number; change: number };
}

export interface ImprovementAreas {
  focusAreas: string[];
  progressAreas: { area: string; improvement: number }[];
  tips: string[];
}

// Helper: Get timestamp for N days ago
const getDaysAgo = (days: number): number => {
  const date = new Date();
  date.setDate(date.getDate() - days);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
};

// Helper: Categorize assessment type to skill
const _getSkillCategory = (assessmentType: string): 'reading' | 'writing' | 'listening' | 'speaking' | 'general' => {
  const type = assessmentType?.toLowerCase() || '';
  if (type.includes('reading') || type.includes('vocabulary') || type.includes('speed-reading')) {
    return 'reading';
  }
  if (type.includes('writing')) {
    return 'writing';
  }
  if (type.includes('listening')) {
    return 'listening';
  }
  if (type.includes('speaking')) {
    return 'speaking';
  }
  return 'general';
};

// Helper: Get hour of day from timestamp
const getTimeOfDay = (timestamp: number): 'morning' | 'afternoon' | 'evening' => {
  const hour = new Date(timestamp).getHours();
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 18) return 'afternoon';
  return 'evening';
};

// Calculate skill progress from assessments
export const calculateSkillProgress = (assessments: Assessment[]): SkillProgress => {
  const skillScores: Record<string, { total: number; count: number }> = {
    reading: { total: 0, count: 0 },
    writing: { total: 0, count: 0 },
    listening: { total: 0, count: 0 },
    speaking: { total: 0, count: 0 },
  };

  // Group assessments by skill type and calculate average scores
  assessments.forEach(assessment => {
    if (!assessment.completed || assessment.score === undefined) return;

    // Check assessment title/type to categorize
    const title = assessment.title?.toLowerCase() || '';
    let skill: string;

    if (title.includes('reading') || title.includes('vocabulary')) {
      skill = 'reading';
    } else if (title.includes('writing')) {
      skill = 'writing';
    } else if (title.includes('listening')) {
      skill = 'listening';
    } else if (title.includes('speaking')) {
      skill = 'speaking';
    } else {
      // For general assessments, distribute to all skills
      const score = assessment.percentage ?? assessment.score ?? 0;
      Object.keys(skillScores).forEach(key => {
        skillScores[key].total += score;
        skillScores[key].count += 1;
      });
      return;
    }

    const score = assessment.percentage ?? assessment.score ?? 0;
    skillScores[skill].total += score;
    skillScores[skill].count += 1;
  });

  // Calculate averages with fallback to 0
  const getAverage = (skill: string): number => {
    const { total, count } = skillScores[skill];
    return count > 0 ? Math.round(total / count) : 0;
  };

  // Generate varied sub-scores based on main score
  const generateSubScores = (mainScore: number): { high: number; mid: number; low: number } => {
    if (mainScore === 0) return { high: 0, mid: 0, low: 0 };
    const variance = 10;
    return {
      high: Math.min(100, mainScore + Math.floor(Math.random() * variance)),
      mid: mainScore,
      low: Math.max(0, mainScore - Math.floor(Math.random() * variance)),
    };
  };

  const readingScore = getAverage('reading');
  const writingScore = getAverage('writing');
  const listeningScore = getAverage('listening');
  const speakingScore = getAverage('speaking');

  const readingSub = generateSubScores(readingScore);
  const writingSub = generateSubScores(writingScore);
  const listeningSub = generateSubScores(listeningScore);
  const speakingSub = generateSubScores(speakingScore);

  return {
    reading: {
      comprehension: readingSub.high,
      retention: readingSub.mid,
      speed: readingScore > 0 ? 150 + Math.floor(readingScore * 1.5) : 0, // WPM based on score
      totalAssessments: skillScores.reading.count,
    },
    writing: {
      structure: writingSub.high,
      vocabulary: writingSub.mid,
      grammar: writingSub.low,
      totalAssessments: skillScores.writing.count,
    },
    listening: {
      comprehension: listeningSub.high,
      noteAccuracy: listeningSub.mid,
      totalAssessments: skillScores.listening.count,
    },
    speaking: {
      pronunciation: speakingSub.high,
      fluency: speakingSub.mid,
      confidence: speakingSub.low,
      totalAssessments: skillScores.speaking.count,
    },
  };
};

// Calculate study time from activity timestamps
export const calculateStudyTime = (
  notes: Note[],
  chatSessions: ChatSession[],
  assessments: Assessment[]
): StudyTimeData => {
  const activities: { timestamp: number; duration: number }[] = [];

  // Estimate time from notes (assume 5 min per note)
  notes.forEach(note => {
    if (note.timestamp) {
      activities.push({ timestamp: note.timestamp, duration: 5 });
    }
  });

  // Estimate time from chat sessions (2 min per message pair)
  chatSessions.forEach(session => {
    if (session.messages && session.messages.length > 0) {
      const duration = Math.ceil(session.messages.length / 2) * 2;
      activities.push({ timestamp: session.timestamp, duration });
    }
  });

  // Estimate time from assessments (10 min per assessment)
  assessments.forEach(assessment => {
    if (assessment.timestamp) {
      activities.push({ timestamp: assessment.timestamp, duration: 10 });
    }
  });

  // Calculate total hours
  const totalMinutes = activities.reduce((sum, a) => sum + a.duration, 0);
  const totalHours = Math.round(totalMinutes / 60);

  // Calculate weekly average (last 4 weeks)
  const fourWeeksAgo = getDaysAgo(28);
  const recentActivities = activities.filter(a => a.timestamp >= fourWeeksAgo);
  const recentMinutes = recentActivities.reduce((sum, a) => sum + a.duration, 0);
  const weeklyAverage = Math.round(recentMinutes / 60 / 4);

  // Calculate time distribution
  const distribution = { morning: 0, afternoon: 0, evening: 0 };
  activities.forEach(activity => {
    const timeOfDay = getTimeOfDay(activity.timestamp);
    distribution[timeOfDay] += activity.duration;
  });

  const totalDistribution = distribution.morning + distribution.afternoon + distribution.evening;
  if (totalDistribution > 0) {
    distribution.morning = Math.round((distribution.morning / totalDistribution) * 100);
    distribution.afternoon = Math.round((distribution.afternoon / totalDistribution) * 100);
    distribution.evening = Math.round((distribution.evening / totalDistribution) * 100);
  }

  // Find most productive time
  const mostProductiveTime = Object.entries(distribution)
    .sort(([, a], [, b]) => b - a)[0]?.[0] || 'afternoon';

  // Calculate sessions per day (last 7 days)
  const weekAgo = getDaysAgo(7);
  const lastWeekActivities = activities.filter(a => a.timestamp >= weekAgo);
  const uniqueDays = new Set(
    lastWeekActivities.map(a => new Date(a.timestamp).toDateString())
  ).size;
  const sessionsPerDay = uniqueDays > 0
    ? Math.round((lastWeekActivities.length / uniqueDays) * 10) / 10
    : 0;

  return {
    totalHours: totalHours || 0,
    weeklyAverage: weeklyAverage || 0,
    distribution,
    mostProductiveTime,
    sessionsPerDay,
  };
};

// Calculate performance trends from last 5 assessments
export const calculatePerformanceTrends = (assessments: Assessment[]): PerformanceTrends => {
  // Sort by timestamp descending and take last 5
  const sortedAssessments = [...assessments]
    .filter(a => a.completed && a.timestamp)
    .sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0))
    .slice(-5);

  if (sortedAssessments.length === 0) {
    return {
      readingSpeed: [0, 0, 0, 0, 0],
      comprehension: [0, 0, 0, 0, 0],
      vocabularyGrowth: [0, 0, 0, 0, 0],
      grammarAccuracy: [0, 0, 0, 0, 0],
    };
  }

  // Generate trend data based on scores
  const scores = sortedAssessments.map(a => a.percentage ?? a.score ?? 0);

  // Pad with zeros if less than 5 assessments
  while (scores.length < 5) {
    scores.unshift(0);
  }

  // Generate related metrics with some variance
  const readingSpeed = scores.map(s => s > 0 ? 150 + Math.floor(s * 1.5) : 0);
  const comprehension = scores;
  const vocabularyGrowth = scores.map((s, i) => s > 0 ? 50 + (i + 1) * 10 + Math.floor(s / 5) : 0);
  const grammarAccuracy = scores.map(s => s > 0 ? Math.max(0, s - 5 + Math.floor(Math.random() * 10)) : 0);

  return {
    readingSpeed,
    comprehension,
    vocabularyGrowth,
    grammarAccuracy,
  };
};

// Calculate completion rates
export const calculateCompletionRates = (assessments: Assessment[]): CompletionRates => {
  const _completed = assessments.filter(a => a.completed);

  const categoryCounts = {
    reading: { completed: 0, total: 0 },
    writing: { completed: 0, total: 0 },
    listening: { completed: 0, total: 0 },
    speaking: { completed: 0, total: 0 },
  };

  assessments.forEach(assessment => {
    const title = assessment.title?.toLowerCase() || '';
    let category: keyof typeof categoryCounts | null = null;

    if (title.includes('reading') || title.includes('vocabulary') || title.includes('general')) {
      category = 'reading';
    } else if (title.includes('writing')) {
      category = 'writing';
    } else if (title.includes('listening')) {
      category = 'listening';
    } else if (title.includes('speaking')) {
      category = 'speaking';
    }

    if (category) {
      categoryCounts[category].total++;
      if (assessment.completed) {
        categoryCounts[category].completed++;
      }
    }
  });

  const getRate = (category: keyof typeof categoryCounts): number => {
    const { completed, total } = categoryCounts[category];
    return total > 0 ? Math.round((completed / total) * 100) : 0;
  };

  return {
    readingExercises: getRate('reading'),
    writingAssignments: getRate('writing'),
    listeningTasks: getRate('listening'),
    speakingPractices: getRate('speaking'),
  };
};

// Calculate weekly comparison for change percentages
export const calculateWeeklyComparison = (
  notes: Note[],
  chatSessions: ChatSession[],
  files: FileUpload[],
  assessments: Assessment[]
): WeeklyComparison => {
  const weekAgo = getDaysAgo(7);
  const twoWeeksAgo = getDaysAgo(14);

  const countInRange = <T extends { timestamp?: number }>(
    items: T[],
    start: number,
    end: number
  ): number => {
    return items.filter(item => {
      const ts = item.timestamp || 0;
      return ts >= start && ts < end;
    }).length;
  };

  const now = Date.now();

  const notesThisWeek = countInRange(notes, weekAgo, now);
  const notesLastWeek = countInRange(notes, twoWeeksAgo, weekAgo);

  const chatsThisWeek = countInRange(chatSessions, weekAgo, now);
  const chatsLastWeek = countInRange(chatSessions, twoWeeksAgo, weekAgo);

  const filesThisWeek = countInRange(files, weekAgo, now);
  const filesLastWeek = countInRange(files, twoWeeksAgo, weekAgo);

  const assessmentsThisWeek = countInRange(assessments, weekAgo, now);
  const assessmentsLastWeek = countInRange(assessments, twoWeeksAgo, weekAgo);

  const calcChange = (current: number, previous: number): number => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return Math.round(((current - previous) / previous) * 100);
  };

  return {
    notes: {
      current: notesThisWeek,
      previous: notesLastWeek,
      change: calcChange(notesThisWeek, notesLastWeek),
    },
    chats: {
      current: chatsThisWeek,
      previous: chatsLastWeek,
      change: calcChange(chatsThisWeek, chatsLastWeek),
    },
    files: {
      current: filesThisWeek,
      previous: filesLastWeek,
      change: calcChange(filesThisWeek, filesLastWeek),
    },
    assessments: {
      current: assessmentsThisWeek,
      previous: assessmentsLastWeek,
      change: calcChange(assessmentsThisWeek, assessmentsLastWeek),
    },
  };
};

// Calculate improvement areas based on skill scores
export const calculateImprovementAreas = (skillProgress: SkillProgress): ImprovementAreas => {
  const skills = [
    { name: 'Reading', score: skillProgress.reading.comprehension },
    { name: 'Writing', score: skillProgress.writing.structure },
    { name: 'Listening', score: skillProgress.listening.comprehension },
    { name: 'Speaking', score: skillProgress.speaking.pronunciation },
  ];

  // Sort by score ascending to find weakest areas
  const sortedSkills = [...skills].sort((a, b) => a.score - b.score);

  // Focus on the 2 lowest scoring skills (if they have scores > 0)
  const focusAreas = sortedSkills
    .filter(s => s.score > 0 && s.score < 70)
    .slice(0, 2)
    .map(s => s.name);

  // Find areas with good progress (highest scores)
  const progressAreas = sortedSkills
    .filter(s => s.score >= 70)
    .slice(-2)
    .map(s => ({ area: s.name, improvement: Math.floor(Math.random() * 15) + 10 }));

  // Generate tips based on focus areas
  const tipMap: Record<string, string[]> = {
    Reading: ['Read daily', 'Expand vocab', 'Practice speed reading'],
    Writing: ['Essay structure', 'Grammar practice', 'Write more'],
    Listening: ['Listen actively', 'Take notes', 'Repeat audio'],
    Speaking: ['Practice daily', 'Record yourself', 'Get feedback'],
  };

  const tips: string[] = [];
  focusAreas.forEach(area => {
    const areaTips = tipMap[area] || [];
    tips.push(...areaTips.slice(0, 1));
  });

  // Add generic tips if needed
  if (tips.length < 3) {
    tips.push('Practice daily', 'Stay consistent', 'Review notes');
  }

  return {
    focusAreas: focusAreas.length > 0 ? focusAreas : ['Keep learning!'],
    progressAreas: progressAreas.length > 0 ? progressAreas : [],
    tips: tips.slice(0, 3),
  };
};
