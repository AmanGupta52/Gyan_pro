import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { socket } from '@/config/socket';
import { useAuth } from '@/hooks/useAuth';
import type {
  GameSessionStatus,
  GamePlayerState,
  GameQuestionClient,
  PlayerAnswerSummary,
  GameMember,
} from '@/types';

export interface QuestionEndedPayload {
  questionIndex: number;
  correctAnswers: string[];
  explanation?: string;
  playerAnswers: PlayerAnswerSummary[];
  teamScoreSoFar: number;
}

export interface GameFinishedPayload {
  sessionId: string;
  totalScore: number;
  accuracy: number;
  correctCount: number;
  totalQuestions: number;
  durationSeconds: number;
}

export function useGameSocket(sessionId?: string) {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [sessionStatus, setSessionStatus] = useState<GameSessionStatus>('waiting');
  const [members, setMembers] = useState<GameMember[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [currentQuestion, setCurrentQuestion] = useState<GameQuestionClient | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [isAnswerLocked, setIsAnswerLocked] = useState(false);
  const [questionEndedData, setQuestionEndedData] = useState<QuestionEndedPayload | null>(null);
  const [finishedData, setFinishedData] = useState<GameFinishedPayload | null>(null);
  const [teamScore, setTeamScore] = useState(0);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const serverOffsetRef = useRef<number>(0);

  // Handle countdown interval
  useEffect(() => {
    if (countdown === null || countdown <= 0) return;
    const cdTimer = setTimeout(() => {
      setCountdown((prev) => (prev && prev > 1 ? prev - 1 : null));
    }, 1000);
    return () => clearTimeout(cdTimer);
  }, [countdown]);

  // Handle question countdown ring
  const startLocalCountdown = useCallback((deadlineStr: string, serverTime: number) => {
    if (timerRef.current) clearInterval(timerRef.current);

    serverOffsetRef.current = Date.now() - serverTime;
    const deadlineMs = new Date(deadlineStr).getTime();

    const updateTimer = () => {
      const adjustedNow = Date.now() - serverOffsetRef.current;
      const leftMs = deadlineMs - adjustedNow;
      const leftSec = Math.max(0, Math.ceil(leftMs / 1000));
      setRemainingSeconds(leftSec);

      if (leftMs <= 0 && timerRef.current) {
        clearInterval(timerRef.current);
      }
    };

    updateTimer();
    timerRef.current = setInterval(updateTimer, 500);
  }, []);

  // Listen to socket events
  useEffect(() => {
    if (!sessionId) return;

    // 1. game:joined
    socket.on('game:joined', (data) => {
      setSessionStatus(data.status as GameSessionStatus);
      setCurrentQuestionIndex(data.currentQuestionIndex);
      setTotalQuestions(data.totalQuestions);

      const mappedMembers: GameMember[] = (data.members as any[]).map((m: any) => {
        let status: GamePlayerState = 'connected';
        if (data.readyPlayers.includes(m.userId)) {
          status = 'ready';
        } else if (!data.connectedPlayers.includes(m.userId)) {
          status = 'disconnected';
        }
        return {
          ...m,
          status,
        };
      });
      setMembers(mappedMembers);
    });

    // 2. game:player-status
    socket.on('game:player-status', (data) => {
      setMembers((prev) =>
        prev.map((m) =>
          m.userId === data.userId ? { ...m, status: data.status as GamePlayerState } : m
        )
      );
    });

    // 3. game:starting
    socket.on('game:starting', (data) => {
      setSessionStatus('starting');
      setCountdown(data.countdownSeconds);
      toast.info('Tournament is starting in 3 seconds!');
    });

    // 4. game:question
    socket.on('game:question', (data) => {
      setSessionStatus('question_active');
      setCurrentQuestion(data.question);
      setCurrentQuestionIndex(data.questionIndex);
      setTotalQuestions(data.totalQuestions);
      setSelectedOptions([]);
      // After a reconnect the server tells us if this player already locked an answer
      setIsAnswerLocked(Boolean(data.alreadyAnswered));
      setQuestionEndedData(null);
      startLocalCountdown(data.deadline, data.serverTime);
    });

    // 5. game:question-ended
    socket.on('game:question-ended', (data) => {
      if (timerRef.current) clearInterval(timerRef.current);
      setSessionStatus('question_closed');
      setQuestionEndedData(data);
      setTeamScore(data.teamScoreSoFar);
    });

    // 6. game:next-question
    socket.on('game:next-question', (data) => {
      toast.info(`Get ready for Question ${data.nextQuestionIndex + 1}!`);
    });

    // 7. game:finished
    socket.on('game:finished', (data) => {
      if (timerRef.current) clearInterval(timerRef.current);
      setSessionStatus('finished');
      setFinishedData(data);
      toast.success('Tournament completed! Loading final scoreboard...');
    });

    // 8. game:error
    socket.on('game:error', (data) => {
      toast.error(data.message || 'Game error occurred');
    });

    // 9. session:superseded
    socket.on('session:superseded', (data) => {
      toast.error(data.message);
      navigate('/dashboard');
    });

    // Join the session now, and re-join automatically after every reconnect so the
    // server can restore the current question, remaining time and locked answers.
    const joinSession = () => {
      socket.emit('game:join', { sessionId }, (res: any) => {
        if (res && !res.success) {
          toast.error(res.error || 'Failed to join game lobby');
        }
      });
    };
    const handleDisconnect = (reason: string) => {
      if (reason !== 'io client disconnect' && reason !== 'io server disconnect') {
        toast.warning('Connection lost — reconnecting…');
      }
    };
    socket.on('connect', joinSession);
    socket.on('disconnect', handleDisconnect);
    if (socket.connected) joinSession();

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      socket.off('game:joined');
      socket.off('game:player-status');
      socket.off('game:starting');
      socket.off('game:question');
      socket.off('game:question-ended');
      socket.off('game:next-question');
      socket.off('game:finished');
      socket.off('game:error');
      socket.off('session:superseded');
      socket.off('connect', joinSession);
      socket.off('disconnect', handleDisconnect);
    };
  }, [sessionId, startLocalCountdown, navigate]);

  // Actions
  const toggleReady = useCallback(() => {
    if (!sessionId) return;
    socket.emit('game:ready', { sessionId }, (res: any) => {
      if (res && !res.success) {
        toast.error(res.error || 'Could not toggle ready status');
      }
    });
  }, [sessionId]);

  const startGame = useCallback(() => {
    if (!sessionId) return;
    socket.emit('game:start', { sessionId }, (res: any) => {
      if (res && !res.success) {
        toast.error(res.error || 'Could not start game');
      }
    });
  }, [sessionId]);

  const submitAnswer = useCallback(
    (questionId: string, options: string[]) => {
      if (!sessionId || isAnswerLocked || options.length === 0) return;
      setSelectedOptions(options);
      setIsAnswerLocked(true);

      socket.emit(
        'game:answer',
        {
          sessionId,
          questionId,
          selectedOptions: options,
        },
        (res: any) => {
          if (res && !res.success) {
            toast.error(res.error || 'Failed to record answer');
            setIsAnswerLocked(false);
          } else {
            toast.success('Answer locked in!');
          }
        }
      );
    },
    [sessionId, isAnswerLocked]
  );

  return {
    user,
    sessionStatus,
    members,
    currentQuestionIndex,
    totalQuestions,
    currentQuestion,
    countdown,
    remainingSeconds,
    selectedOptions,
    isAnswerLocked,
    questionEndedData,
    finishedData,
    teamScore,
    toggleReady,
    startGame,
    submitAnswer,
  };
}
