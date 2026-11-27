import { calculateMultipleCorrectScore } from './question.service.js';

export interface GradableQuestion {
  type: string;
  correctAnswers: string[];
  points: number;
}

export interface GradeConfig {
  /** Max extra points for answering instantly (linear to 0 at the time limit) */
  speedBonusMax: number;
  /** Points deducted for a wrong (but attempted) answer. Positive number. */
  penaltyWrong: number;
}

export interface GradeResult {
  isCorrect: boolean;
  scoreAwarded: number;
  speedBonusAwarded: number;
}

/**
 * Pure grading function for solo quizzes and practice.
 * - single_choice / true_false / image_question: exact match
 * - multiple_correct: all-or-nothing (same rule the live competitions use)
 * - speed bonus only applies to correct answers
 * - skipped/empty answers score 0 and are never penalised
 */
export function gradeAnswer(
  question: GradableQuestion,
  selected: string[],
  timeTakenSeconds: number,
  timeLimitSeconds: number,
  cfg: GradeConfig
): GradeResult {
  const picked = Array.from(new Set(selected));

  if (picked.length === 0) {
    return { isCorrect: false, scoreAwarded: 0, speedBonusAwarded: 0 };
  }

  let isCorrect: boolean;
  if (question.type === 'multiple_correct') {
    isCorrect = calculateMultipleCorrectScore(picked, question.correctAnswers, question.points, false, 0) > 0;
  } else {
    isCorrect = picked.length === 1 && picked[0] === question.correctAnswers[0];
  }

  if (!isCorrect) {
    return { isCorrect: false, scoreAwarded: cfg.penaltyWrong ? -Math.abs(cfg.penaltyWrong) : 0, speedBonusAwarded: 0 };
  }

  let speedBonusAwarded = 0;
  if (cfg.speedBonusMax > 0 && timeLimitSeconds > 0) {
    const ratio = Math.max(0, (timeLimitSeconds - timeTakenSeconds) / timeLimitSeconds);
    speedBonusAwarded = Math.round(cfg.speedBonusMax * ratio);
  }

  return {
    isCorrect: true,
    scoreAwarded: question.points + speedBonusAwarded,
    speedBonusAwarded,
  };
}

/** Totals for a finished attempt. Score never goes below zero. */
export function summariseAttempt(
  answers: Array<{ isCorrect: boolean; scoreAwarded: number; timeTakenSeconds: number }>,
  totalQuestions: number,
  passPercent: number
) {
  const totalScore = Math.max(0, answers.reduce((s, a) => s + a.scoreAwarded, 0));
  const correctCount = answers.filter((a) => a.isCorrect).length;
  const accuracy = totalQuestions > 0 ? Number((correctCount / totalQuestions).toFixed(4)) : 0;
  const durationSeconds = Math.round(answers.reduce((s, a) => s + a.timeTakenSeconds, 0));
  return {
    totalScore,
    correctCount,
    accuracy,
    durationSeconds,
    passed: accuracy * 100 >= passPercent,
  };
}
