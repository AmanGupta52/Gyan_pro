import { BookOpen, Clock, Lock, Target, Trophy, Users, Zap } from 'lucide-react';
import { Card } from '@/components/ui/Card';

const sections = [
  { Icon: Users, title: 'Teams', points: ['A team can register only when its member count equals the competition team size (1, 2, 4 or 6).', 'A player can be in one team per competition. Only the leader can start the game.'] },
  { Icon: Clock, title: 'Timing', points: ['Every question has a server-side timer. The countdown on your screen follows the server clock.', 'Answers after the deadline are rejected (a short latency grace applies).', 'If you disconnect, the timer keeps running. Reconnect to continue from the current question.'] },
  { Icon: Lock, title: 'Answers', points: ['Each player answers for themselves. An answer is locked after you submit it.', 'Correct answers are shown only after the question closes. Teammates’ choices stay hidden until then.'] },
  { Icon: Zap, title: 'Scoring', points: ['Correct answer: base points. A speed bonus may be added based on server-recorded response time.', 'Wrong or unanswered: 0 points. Team score is the sum of all player scores.', 'Accuracy = correct answers ÷ total questions. Score and accuracy are different measures.'] },
  { Icon: Trophy, title: 'Ranking', points: ['Teams are ranked by score; ties are broken by the competition’s tie-break rule.', 'Ranks are provisional until the competition is marked Completed.'] },
  { Icon: Target, title: 'Fair play', points: ['Only one active connection per account is allowed; a new login replaces the old one.', 'Repeated disconnects are logged as a suspicious-activity signal.'] },
];

export function InstructionsPage() {
  return (
    <div className="space-y-6">
      <header className="flex items-center gap-3">
        <span className="grid h-12 w-12 place-items-center rounded-2xl bg-electric-500/15 text-electric-600 dark:text-sky-200">
          <BookOpen className="h-6 w-6" aria-hidden />
        </span>
        <div>
          <h1 className="font-display text-2xl font-extrabold text-slate-900 dark:text-white">Instructions</h1>
          <p className="text-sm text-slate-600 dark:text-slate-300">Read this once — then play with confidence.</p>
        </div>
      </header>
      <div className="grid gap-4 md:grid-cols-2">
        {sections.map(({ Icon, title, points }) => (
          <Card key={title} className="space-y-3">
            <div className="flex items-center gap-2.5">
              <Icon className="h-5 w-5 text-electric-500" aria-hidden />
              <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">{title}</h2>
            </div>
            <ul className="space-y-2 text-sm text-slate-700 dark:text-slate-200">
              {points.map((p) => (
                <li key={p} className="flex gap-2">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-electric-500" aria-hidden />
                  {p}
                </li>
              ))}
            </ul>
          </Card>
        ))}
      </div>
    </div>
  );
}

export default InstructionsPage;
