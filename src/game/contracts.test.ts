// Contracts board: seeded picks favor the least-played games with variety
// across ladders, completions refresh the board, rewards come from the table.
import assert from "node:assert/strict";
import test from "node:test";
import {
  BOARD_SIZE,
  CONTRACT_LADDERS,
  GAME_LADDER,
  contractXp,
  newBoard,
  pickContracts,
  recordResult,
  type History,
} from "./contracts.ts";
import { PRIZE_GAMES } from "./prizes.ts";

test("every prize game sits on a ladder", () => {
  for (const g of PRIZE_GAMES)
    assert.ok(CONTRACT_LADDERS.includes(GAME_LADDER[g]), g);
});

test("a board holds 3 to 5 contracts on different games", () => {
  assert.ok(BOARD_SIZE >= 3 && BOARD_SIZE <= 5);
  const board = newBoard(42, {});
  assert.equal(board.contracts.length, BOARD_SIZE);
  assert.equal(new Set(board.contracts.map((c) => c.game)).size, BOARD_SIZE);
});

test("the same seed and history give the same board", () => {
  assert.deepEqual(newBoard(7, {}), newBoard(7, {}));
  assert.notDeepEqual(
    newBoard(7, {}).contracts.map((c) => c.game),
    newBoard(8, {}).contracts.map((c) => c.game),
  );
});

test("boards cover every ladder", () => {
  for (let seed = 0; seed < 20; seed++) {
    const ladders = new Set(newBoard(seed, {}).contracts.map((c) => c.ladder));
    assert.equal(ladders.size, CONTRACT_LADDERS.length, `seed ${seed}`);
  }
});

test("picks favor the games played least", () => {
  const history: History = {};
  for (const g of PRIZE_GAMES) history[g] = { plays: 10, best: "S" };
  history.ramen = { plays: 0 };
  history.karaoke = { plays: 1, best: "C" };
  const games = pickContracts(3, history, [], 3).map((c) => c.game);
  assert.ok(games.includes("ramen"));
  assert.ok(games.includes("karaoke"));
});

test("an unplayed game asks for a play, a played one for a better grade", () => {
  const history: History = { ramen: { plays: 2, best: "B" } };
  const [fresh] = pickContracts(1, {}, [], 1);
  assert.deepEqual(fresh.goal, { kind: "play" });
  const mastered = pickContracts(1, { ...fullHistory(), ...history }, [], 1);
  assert.deepEqual(mastered[0].goal, { kind: "grade", grade: "A" });
});

function fullHistory(): History {
  const h: History = {};
  for (const g of PRIZE_GAMES) h[g] = { plays: 9, best: "S" };
  return h;
}

test("XP grows with the grade asked and pays the game's ladder", () => {
  const [c] = pickContracts(1, {}, [], 1);
  assert.equal(c.xp.ladder, c.ladder);
  assert.ok(
    contractXp({ kind: "grade", grade: "S" }) >
      contractXp({ kind: "grade", grade: "A" }),
  );
  assert.ok(
    contractXp({ kind: "grade", grade: "A" }) > contractXp({ kind: "play" }),
  );
});

test("a result that meets a contract completes it, pays, and refills the board", () => {
  const board = newBoard(5, {});
  const target = board.contracts[0];
  const history: History = { [target.game]: { plays: 1, best: "S" } };
  const out = recordResult(board, history, target.game, "S");
  assert.deepEqual(
    out.completed.map((c) => c.id),
    [target.id],
  );
  assert.deepEqual(out.xp, [target.xp]);
  assert.equal(out.board.contracts.length, BOARD_SIZE);
  assert.ok(!out.board.contracts.some((c) => c.id === target.id));
  assert.ok(!out.board.contracts.some((c) => c.game === target.game));
  assert.equal(out.board.serial, board.serial + 1);
});

test("a grade contract is not met by a lower grade", () => {
  const history = fullHistory();
  history.ramen = { plays: 3, best: "C" };
  const board = {
    seed: 1,
    serial: 1,
    contracts: pickContracts(1, history, [], 1),
  };
  assert.equal(board.contracts[0].game, "ramen");
  const out = recordResult(board, history, "ramen", "C");
  assert.equal(out.completed.length, 0);
  assert.equal(out.board, board);
});

test("a game with no contract changes nothing", () => {
  const board = newBoard(5, {});
  const other = PRIZE_GAMES.find(
    (g) => !board.contracts.some((c) => c.game === g),
  );
  assert.ok(other);
  const out = recordResult(board, {}, other, "S");
  assert.equal(out.board, board);
  assert.deepEqual(out.xp, []);
});

test("refills are deterministic", () => {
  const board = newBoard(11, {});
  const g = board.contracts[1].game;
  const h: History = { [g]: { plays: 1, best: "S" } };
  assert.deepEqual(
    recordResult(board, h, g, "S"),
    recordResult(board, h, g, "S"),
  );
});

test("a goal for an S reads 'an S', and one for a B reads 'a B'", () => {
  const texts = new Set<string>();
  for (let seed = 0; seed < 40; seed++)
    for (const c of pickContracts(seed, fullHistory(), [], BOARD_SIZE))
      texts.add(c.text);
  assert.ok([...texts].some((t) => t.startsWith("Get an S at ")));
  assert.ok(![...texts].some((t) => t.startsWith("Get a S at ")));
  const b = pickContracts(1, { ramen: { plays: 2, best: "B" } }, [], 40);
  assert.ok(!b.some((c) => c.text.startsWith("Get an B ")));
});

test("excluded games are skipped without counting toward the ladder spread", () => {
  const street = PRIZE_GAMES.filter((g) => GAME_LADDER[g] === "street");
  const fame = PRIZE_GAMES.filter((g) => GAME_LADDER[g] === "fame");
  const hustle = PRIZE_GAMES.filter((g) => GAME_LADDER[g] === "hustle");
  const kept = [
    ...fame
      .slice(0, 1)
      .concat(hustle.slice(0, 1))
      .map((game, i) => ({
        id: `${game}#${i}`,
        game,
        ladder: GAME_LADDER[game],
        goal: { kind: "play" as const },
        text: "",
        xp: { ladder: GAME_LADDER[game], amount: 1 },
      })),
  ];
  // street has no contract on the board; its finished game is excluded, not counted
  for (let seed = 0; seed < 20; seed++) {
    const [c] = pickContracts(seed, {}, kept, 1, 0, [street[0]]);
    assert.equal(c.ladder, "street");
    assert.notEqual(c.game, street[0]);
  }
});
