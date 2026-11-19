// The daily streak on screen: the compact HUD counter (a flame that burns
// bigger and hotter as the streak grows), the panel and celebration: the 30-day calendar, the milestone
// ladder and the weekly freeze, and a card with a burst and a chime on days 3,
// 7, 14 and 30. Loaded on demand (App.tsx, Overlay.tsx); the store is Streak.tsx.
// With prefers-reduced-motion the burst is left out (styles.css stills the rest).

import { useEffect, useRef, type CSSProperties, type JSX } from "react";
import { playStreakMilestone } from "../../audio/streakSound.ts";
import { dayOf } from "../../game/challenges.ts";
import {
  flameTier,
  liveStreak,
  STREAK_REWARDS,
  type StreakReward,
  type StreakSave,
} from "../../game/streak.ts";
import {
  calendar,
  freezeReady,
  nextMilestone,
  type DayState,
} from "../../game/streakCalendar.ts";
import { usePrefersReducedMotion } from "../motion.ts";
import { openStreak, streakDesk } from "./Streak.tsx";

/** A flame in layers; `tier` 0..5 sets its size, color and glow (CSS). */
export function Flame({ tier }: { tier: number }): JSX.Element {
  return (
    <svg
      className="streak-flame"
      data-tier={tier}
      viewBox="0 0 24 32"
      width="24"
      height="32"
      aria-hidden="true"
      focusable="false"
    >
      <path
        className="flame-outer"
        d="M12 1c1 5 8 8 8 17a8 8 0 0 1-16 0c0-4 2-6 3-8 1 2 2 3 3 3 0-4-1-8 2-12z"
      />
      <path
        className="flame-mid"
        d="M12 11c.7 3.5 5 5.5 5 10a5 5 0 0 1-10 0c0-2.5 1.5-4 2-5.5 1 1.5 2 2 2.5 2 0-2.5-.5-4 .5-6.5z"
      />
      <path
        className="flame-core"
        d="M12 19c.5 2 2.5 3 2.5 5.2a2.5 2.5 0 0 1-5 0C9.5 22 11.5 21 12 19z"
      />
    </svg>
  );
}

/** The compact HUD counter; it opens the panel. */
export function StreakChip({ streak }: { streak: StreakSave }): JSX.Element {
  const count = liveStreak(streak, dayOf(Date.now()));
  const tier = flameTier(count);
  const label =
    count > 0 ? `Daily streak: ${count} days` : "Daily streak: start one today";
  return (
    <button
      type="button"
      className="streak-chip"
      data-tier={tier}
      aria-label={label}
      onClick={openStreak}
    >
      <Flame tier={tier} />
      <span className="streak-chip-count">{count}</span>
    </button>
  );
}

const closeStreak = () => streakDesk.set({ open: false });
const endCelebration = () => streakDesk.set({ celebrate: null });

const SPARKS = 28;
const SPARK_COLORS = ["#ffb02e", "#ff2f9a", "#f7e7c6", "#d9c8ff", "#ff7a2f"];

/** Sparks that fly out from the card's center, fixed so renders agree. */
function Burst(): JSX.Element {
  return (
    <div className="streak-burst" aria-hidden="true">
      {Array.from({ length: SPARKS }, (_, i) => {
        const style: CSSProperties & Record<`--${string}`, string> = {
          "--a": `${(i * 360) / SPARKS + (i % 2) * 6}deg`,
          "--d": `${150 + (i % 4) * 46}px`,
          "--c": SPARK_COLORS[i % SPARK_COLORS.length],
          "--t": `${(i % 7) * 40}ms`,
        };
        return <i key={i} style={style} />;
      })}
    </div>
  );
}

const REWARD_TITLES: Record<number, string> = {
  3: "Three days running!",
  7: "A whole week!",
  14: "Two weeks strong!",
  30: "A month of Daydaze!",
};

/** The big card for a milestone: the burst, the flame, the haul. */
function Celebration({ reward }: { reward: StreakReward }): JSX.Element {
  const reduced = usePrefersReducedMotion();
  const done = useRef<HTMLButtonElement>(null);
  useEffect(() => done.current?.focus(), []);
  useEffect(() => {
    playStreakMilestone(reward.day / 30);
  }, [reward]);
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") endCelebration();
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, []);
  return (
    <div className="streak-celebrate">
      {!reduced && <Burst />}
      <section
        className="streak-card"
        role="dialog"
        aria-label="Streak milestone"
        data-tier={flameTier(reward.day)}
      >
        <Flame tier={flameTier(reward.day)} />
        <p className="streak-card-day">{reward.day}-day streak</p>
        <h2>{REWARD_TITLES[reward.day] ?? `${reward.day} days!`}</h2>
        <ul className="streak-haul">
          <li>+{reward.coins} coins</li>
          {reward.item && <li>A new outfit for your closet</li>}
        </ul>
        <button type="button" ref={done} onClick={endCelebration}>
          Keep it burning
        </button>
      </section>
    </div>
  );
}

const STATE_WORDS: Record<DayState, string> = {
  lit: "played",
  frozen: "freeze",
  today: "today",
  missed: "missed",
};

const dateOf = (day: number) => new Date(day * 86_400_000);
const dayLabel = (day: number) =>
  dateOf(day).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });

const WEEKDAYS = ["M", "T", "W", "T", "F", "S", "S"];

/** The calendar, milestone ladder and freeze status, plus the celebration.
 * Always mounted so a check-in at load can celebrate with the panel shut. */
export function StreakPanel({ streak }: { streak: StreakSave }): JSX.Element {
  const { open, celebrate, froze } = streakDesk.use();
  useEffect(() => {
    if (!open) return;
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeStreak();
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [open]);
  const today = dayOf(Date.now());
  const count = liveStreak(streak, today);
  const tier = flameTier(count);
  const next = nextMilestone(count);
  const cal = calendar(streak, today);
  // the grid is Monday-first: pad before the oldest day to its weekday
  const lead = (cal[0].day + 3) % 7;
  return (
    <>
      {celebrate && <Celebration reward={celebrate} />}
      {open && (
        <section
          className="home-panel streak-panel"
          role="dialog"
          aria-label="Daily streak"
          data-tier={tier}
        >
          <div className="collections-head">
            <h2>Daily streak</h2>
            <button type="button" onClick={closeStreak}>
              Close
            </button>
          </div>
          <div className="streak-hero">
            <Flame tier={tier} />
            <p className="streak-count" aria-label={`${count} days`}>
              {count}
            </p>
            <p className="streak-sub">
              {count === 0
                ? "Start a streak: come back tomorrow too."
                : `day${count === 1 ? "" : "s"} in a row · best ${streak.best}`}
            </p>
            {froze && (
              <p className="streak-saved" role="status">
                A streak freeze saved your streak!
              </p>
            )}
          </div>
          {next && (
            <div
              className="streak-next"
              role="progressbar"
              aria-label={`Next reward at day ${next.day}`}
              aria-valuemin={0}
              aria-valuemax={next.day}
              aria-valuenow={count}
            >
              <span style={{ width: `${(count / next.day) * 100}%` }} />
              <small>
                {next.day - count} to day {next.day}: {next.coins} coins
                {next.item ? " + an outfit" : ""}
              </small>
            </div>
          )}
          <h3>Last 30 days</h3>
          <ol className="streak-cal" aria-label="Last 30 days">
            {WEEKDAYS.map((w, i) => (
              <li key={`h${i}`} className="streak-cal-head" aria-hidden="true">
                {w}
              </li>
            ))}
            {Array.from({ length: lead }, (_, i) => (
              <li key={`p${i}`} className="streak-cal-pad" aria-hidden="true" />
            ))}
            {cal.map((c) => (
              <li
                key={c.day}
                className="streak-day"
                data-state={c.state}
                aria-label={`${dayLabel(c.day)}: ${STATE_WORDS[c.state]}`}
              >
                {dateOf(c.day).getUTCDate()}
              </li>
            ))}
          </ol>
          <p className="streak-freeze" data-ready={freezeReady(streak, today)}>
            {freezeReady(streak, today)
              ? "Streak freeze ready: one missed day this week is on us."
              : "Streak freeze used this week. It returns on Monday."}
          </p>
          <h3>Rewards</h3>
          <ul className="streak-ladder">
            {STREAK_REWARDS.map((r) => (
              <li key={r.day} data-done={count >= r.day}>
                <strong>Day {r.day}</strong>
                <span>
                  {r.coins} coins{r.item ? " · outfit" : ""}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
