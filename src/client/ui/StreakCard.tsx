// The daily streak card: shown on the day's first visit with the streak so
// far, any milestone reward and a 28-day calendar. Rules in
// src/game/streak.ts; the check-in itself happens in App.tsx.

import {
  calendarFor,
  nextMilestone,
  type StreakSave,
} from "../../game/streak.ts";
import type { CheckIn } from "../../game/streak.ts";

/** The card for today's check-in; `onClose` dismisses it. */
export function StreakCard({
  streak,
  today,
  result,
  onClose,
}: {
  streak: StreakSave;
  today: number;
  result: CheckIn;
  onClose: () => void;
}) {
  const next = nextMilestone(streak.count);
  return (
    <div className="streak-card" role="dialog" aria-label="Daily streak">
      <h2>Day {streak.count} streak</h2>
      {result.froze && (
        <p>Your weekly streak freeze covered a missed day. Nothing lost!</p>
      )}
      {result.reward && (
        <p className="streak-reward">
          Day {result.milestone} reward: {result.reward.coins} coins,{" "}
          {result.reward.xp} XP
          {result.reward.item && ", and a new item for your closet"}.
        </p>
      )}
      {next && (
        <p>
          {next.day - streak.count} more{" "}
          {next.day - streak.count === 1 ? "day" : "days"} to the day-
          {next.day} reward. Best: {streak.best}.
        </p>
      )}
      <ol className="streak-calendar" aria-label="Last 28 days">
        {calendarFor(streak, today).map((c) => (
          <li key={c.day} data-state={c.state}>
            <span className="sr-only">{c.state}</span>
          </li>
        ))}
      </ol>
      <button type="button" onClick={onClose}>
        Nice
      </button>
    </div>
  );
}
