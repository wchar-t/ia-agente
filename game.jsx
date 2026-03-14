import React, { useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Play, Pause, SkipForward, RotateCcw } from "lucide-react";

const DOTS_ROWS = 5;
const DOTS_COLS = 5;
const CELL_SIZE = 88;
const MARGIN = 30;
const AUTO_MS = 420;

const PLAYERS = {
  1: {
    name: "AI 1",
    edge: "#2563eb",
    box: "rgba(37, 99, 235, 0.18)",
    text: "text-blue-600",
    badge: "bg-blue-50 text-blue-700 border-blue-200",
  },
  2: {
    name: "AI 2",
    edge: "#dc2626",
    box: "rgba(220, 38, 38, 0.18)",
    text: "text-red-600",
    badge: "bg-red-50 text-red-700 border-red-200",
  },
};

function edgeKey(orientation, r, c) {
  return `${orientation}-${r}-${c}`;
}

function cloneState(state) {
  return {
    edges: { ...state.edges },
    boxes: { ...state.boxes },
    currentPlayer: state.currentPlayer,
    scores: { ...state.scores },
    finished: state.finished,
    winner: state.winner,
    turnCount: state.turnCount,
    log: [...state.log],
  };
}

function createInitialState() {
  return {
    edges: {},
    boxes: {},
    currentPlayer: 1,
    scores: { 1: 0, 2: 0 },
    finished: false,
    winner: null,
    turnCount: 0,
    log: ["Game started. AI 1 plays first."],
  };
}

function getAllEdges() {
  const edges = [];

  for (let r = 0; r < DOTS_ROWS; r++) {
    for (let c = 0; c < DOTS_COLS - 1; c++) {
      edges.push({ orientation: "h", r, c, key: edgeKey("h", r, c) });
    }
  }

  for (let r = 0; r < DOTS_ROWS - 1; r++) {
    for (let c = 0; c < DOTS_COLS; c++) {
      edges.push({ orientation: "v", r, c, key: edgeKey("v", r, c) });
    }
  }

  return edges;
}

function getBoxEdgeKeys(r, c) {
  return [
    edgeKey("h", r, c),
    edgeKey("h", r + 1, c),
    edgeKey("v", r, c),
    edgeKey("v", r, c + 1),
  ];
}

function getAdjacentBoxesForEdge(edge) {
  const boxes = [];

  if (edge.orientation === "h") {
    if (edge.r > 0) boxes.push({ r: edge.r - 1, c: edge.c });
    if (edge.r < DOTS_ROWS - 1) boxes.push({ r: edge.r, c: edge.c });
  } else {
    if (edge.c > 0) boxes.push({ r: edge.r, c: edge.c - 1 });
    if (edge.c < DOTS_COLS - 1) boxes.push({ r: edge.r, c: edge.c });
  }

  return boxes.filter((b) => b.r >= 0 && b.r < DOTS_ROWS - 1 && b.c >= 0 && b.c < DOTS_COLS - 1);
}

function countBoxEdges(state, r, c) {
  return getBoxEdgeKeys(r, c).reduce((acc, key) => acc + (state.edges[key] ? 1 : 0), 0);
}

function wouldCreateThirdEdge(state, edge) {
  const adjacent = getAdjacentBoxesForEdge(edge);
  return adjacent.some((box) => countBoxEdges(state, box.r, box.c) === 2);
}

function wouldCompleteBox(state, edge) {
  const adjacent = getAdjacentBoxesForEdge(edge);
  return adjacent.some((box) => countBoxEdges(state, box.r, box.c) === 3);
}

function getAvailableEdges(state) {
  return getAllEdges().filter((e) => !state.edges[e.key]);
}

function pickGreedyMove(state) {
  const available = getAvailableEdges(state);
  if (available.length === 0) return null;

  const completing = available.filter((e) => wouldCompleteBox(state, e));
  if (completing.length) return completing[0];

  const safe = available.filter((e) => !wouldCreateThirdEdge(state, e));
  if (safe.length) {
    const centerR = (DOTS_ROWS - 1) / 2;
    const centerC = (DOTS_COLS - 1) / 2;
    safe.sort((a, b) => {
      const da = Math.abs(a.r - centerR) + Math.abs(a.c - centerC);
      const db = Math.abs(b.r - centerR) + Math.abs(b.c - centerC);
      return da - db;
    });
    return safe[0];
  }

  const risky = [...available].sort((a, b) => {
    const aAdj = getAdjacentBoxesForEdge(a).reduce((sum, box) => sum + countBoxEdges(state, box.r, box.c), 0);
    const bAdj = getAdjacentBoxesForEdge(b).reduce((sum, box) => sum + countBoxEdges(state, box.r, box.c), 0);
    return aAdj - bAdj;
  });

  return risky[0];
}

function pickTricksterMove(state) {
  const available = getAvailableEdges(state);
  if (available.length === 0) return null;

  const completing = available.filter((e) => wouldCompleteBox(state, e));
  if (completing.length) {
    const multiBox = completing
      .map((edge) => ({
        edge,
        value: getAdjacentBoxesForEdge(edge).filter((box) => countBoxEdges(state, box.r, box.c) === 3).length,
      }))
      .sort((a, b) => b.value - a.value);
    return multiBox[0].edge;
  }

  const safe = available.filter((e) => !wouldCreateThirdEdge(state, e));
  if (safe.length) {
    const ranked = safe.map((edge) => {
      const adjacent = getAdjacentBoxesForEdge(edge);
      const pressure = adjacent.reduce((sum, box) => sum + countBoxEdges(state, box.r, box.c), 0);
      const centrality = adjacent.reduce(
        (sum, box) => sum + Math.abs(box.r - (DOTS_ROWS - 2) / 2) + Math.abs(box.c - (DOTS_COLS - 2) / 2),
        0
      );
      return { edge, pressure, centrality };
    });

    ranked.sort((a, b) => {
      if (a.pressure !== b.pressure) return b.pressure - a.pressure;
      return a.centrality - b.centrality;
    });

    const topBand = ranked.filter((item) => item.pressure === ranked[0].pressure);
    return topBand[Math.floor(Math.random() * topBand.length)].edge;
  }

  const risky = available.map((edge) => {
    const danger = getAdjacentBoxesForEdge(edge).reduce((sum, box) => {
      const edges = countBoxEdges(state, box.r, box.c);
      return sum + (edges === 2 ? 3 : edges === 1 ? 1 : 0);
    }, 0);
    return { edge, danger };
  });

  risky.sort((a, b) => a.danger - b.danger);
  const best = risky.filter((item) => item.danger === risky[0].danger);
  return best[Math.floor(Math.random() * best.length)].edge;
}

function pickMoveForPlayer(state) {
  return state.currentPlayer === 1 ? pickGreedyMove(state) : pickTricksterMove(state);
}

function applyMove(prevState, edge) {
  const state = cloneState(prevState);
  const player = state.currentPlayer;
  state.edges[edge.key] = player;
  state.turnCount += 1;

  let completed = 0;
  const claimedBoxes = [];

  for (const box of getAdjacentBoxesForEdge(edge)) {
    const boxKey = `${box.r}-${box.c}`;
    if (!state.boxes[boxKey] && countBoxEdges(state, box.r, box.c) === 4) {
      state.boxes[boxKey] = player;
      state.scores[player] += 1;
      completed += 1;
      claimedBoxes.push(boxKey);
    }
  }

  const p = PLAYERS[player].name;
  const edgeLabel = `${edge.orientation === "h" ? "H" : "V"}(${edge.r},${edge.c})`;
  if (completed > 0) {
    state.log.unshift(`${p} played ${edgeLabel} and closed ${completed} box${completed > 1 ? "es" : ""}.`);
  } else {
    state.log.unshift(`${p} played ${edgeLabel}.`);
    state.currentPlayer = player === 1 ? 2 : 1;
  }

  const totalBoxes = (DOTS_ROWS - 1) * (DOTS_COLS - 1);
  const claimedCount = Object.keys(state.boxes).length;
  if (claimedCount === totalBoxes) {
    state.finished = true;
    if (state.scores[1] > state.scores[2]) state.winner = 1;
    else if (state.scores[2] > state.scores[1]) state.winner = 2;
    else state.winner = 0;
    if (state.winner === 0) state.log.unshift("Game finished in a draw.");
    else state.log.unshift(`${PLAYERS[state.winner].name} wins.`);
  }

  return state;
}

function stepGame(state) {
  if (state.finished) return state;
  const move = pickMoveForPlayer(state);
  if (!move) return { ...state, finished: true, winner: 0 };
  return applyMove(state, move);
}

function BoxLayer({ state }) {
  const cells = [];
  for (let r = 0; r < DOTS_ROWS - 1; r++) {
    for (let c = 0; c < DOTS_COLS - 1; c++) {
      const key = `${r}-${c}`;
      const owner = state.boxes[key];
      cells.push(
        <rect
          key={key}
          x={MARGIN + c * CELL_SIZE + 10}
          y={MARGIN + r * CELL_SIZE + 10}
          width={CELL_SIZE - 20}
          height={CELL_SIZE - 20}
          rx={16}
          fill={owner ? PLAYERS[owner].box : "transparent"}
        />
      );
    }
  }
  return <>{cells}</>;
}

function EdgeLayer({ state }) {
  const edges = [];

  for (let r = 0; r < DOTS_ROWS; r++) {
    for (let c = 0; c < DOTS_COLS - 1; c++) {
      const key = edgeKey("h", r, c);
      const owner = state.edges[key];
      const x1 = MARGIN + c * CELL_SIZE;
      const y1 = MARGIN + r * CELL_SIZE;
      const x2 = MARGIN + (c + 1) * CELL_SIZE;
      const y2 = y1;
      edges.push(
        <line
          key={key}
          x1={x1}
          y1={y1}
          x2={x2}
          y2={y2}
          stroke={owner ? PLAYERS[owner].edge : "#d1d5db"}
          strokeWidth={owner ? 10 : 6}
          strokeLinecap="round"
        />
      );
    }
  }

  for (let r = 0; r < DOTS_ROWS - 1; r++) {
    for (let c = 0; c < DOTS_COLS; c++) {
      const key = edgeKey("v", r, c);
      const owner = state.edges[key];
      const x1 = MARGIN + c * CELL_SIZE;
      const y1 = MARGIN + r * CELL_SIZE;
      const x2 = x1;
      const y2 = MARGIN + (r + 1) * CELL_SIZE;
      edges.push(
        <line
          key={key}
          x1={x1}
          y1={y1}
          x2={x2}
          y2={y2}
          stroke={owner ? PLAYERS[owner].edge : "#d1d5db"}
          strokeWidth={owner ? 10 : 6}
          strokeLinecap="round"
        />
      );
    }
  }

  return <>{edges}</>;
}

function DotLayer() {
  const dots = [];
  for (let r = 0; r < DOTS_ROWS; r++) {
    for (let c = 0; c < DOTS_COLS; c++) {
      dots.push(
        <circle
          key={`${r}-${c}`}
          cx={MARGIN + c * CELL_SIZE}
          cy={MARGIN + r * CELL_SIZE}
          r={7}
          fill="#111827"
        />
      );
    }
  }
  return <>{dots}</>;
}

function PlayerCard({ playerId, score, isCurrent }) {
  const p = PLAYERS[playerId];
  return (
    <div className={`rounded-2xl border p-4 shadow-sm transition-all ${isCurrent ? "ring-2 ring-slate-300 bg-white" : "bg-slate-50/70"}`}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="h-4 w-4 rounded-full" style={{ background: p.edge }} />
          <div>
            <div className="text-sm font-medium text-slate-500">Agent</div>
            <div className={`text-lg font-semibold ${p.text}`}>{p.name}</div>
          </div>
        </div>
        <div className="text-3xl font-bold text-slate-800">{score}</div>
      </div>
      <div className="mt-3">
        {isCurrent ? <Badge className={p.badge}>Current turn</Badge> : <Badge variant="outline">Waiting</Badge>}
      </div>
    </div>
  );
}

export default function DotsAndBoxesAIDemo() {
  const [state, setState] = useState(createInitialState);
  const [autoplay, setAutoplay] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    if (!autoplay || state.finished) {
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = null;
      return;
    }

    timerRef.current = setInterval(() => {
      setState((prev) => stepGame(prev));
    }, AUTO_MS);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = null;
    };
  }, [autoplay, state.finished]);

  const boardWidth = MARGIN * 2 + (DOTS_COLS - 1) * CELL_SIZE;
  const boardHeight = MARGIN * 2 + (DOTS_ROWS - 1) * CELL_SIZE;

  const totalEdges = useMemo(() => getAllEdges().length, []);
  const playedEdges = Object.keys(state.edges).length;

  const statusText = state.finished
    ? state.winner === 0
      ? "Draw"
      : `${PLAYERS[state.winner].name} wins`
    : `${PLAYERS[state.currentPlayer].name} is thinking`;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-100 via-slate-50 to-white p-6 text-slate-900">
      <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[1.25fr_420px]">
        <Card className="rounded-3xl border-slate-200 shadow-xl shadow-slate-200/60">
          <CardHeader className="pb-3">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <CardTitle className="text-3xl font-semibold tracking-tight">Dots and Boxes — AI vs AI</CardTitle>
                <p className="mt-2 max-w-2xl text-sm text-slate-600">
                  Minimal intelligent-agents demo: two agents act in the same environment, observe the board state, choose actions, and compete for reward by closing boxes.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  onClick={() => setState((prev) => stepGame(prev))}
                  disabled={state.finished}
                  className="rounded-2xl"
                >
                  <SkipForward className="mr-2 h-4 w-4" />
                  Step
                </Button>
                <Button
                  variant={autoplay ? "secondary" : "default"}
                  onClick={() => setAutoplay((v) => !v)}
                  disabled={state.finished}
                  className="rounded-2xl"
                >
                  {autoplay ? <Pause className="mr-2 h-4 w-4" /> : <Play className="mr-2 h-4 w-4" />}
                  {autoplay ? "Pause" : "Autoplay"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setAutoplay(false);
                    setState(createInitialState());
                  }}
                  className="rounded-2xl"
                >
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Reset
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="mb-6 grid gap-4 md:grid-cols-3">
              <div className="rounded-2xl border bg-white p-4 shadow-sm">
                <div className="text-sm text-slate-500">Status</div>
                <div className="mt-1 text-xl font-semibold">{statusText}</div>
              </div>
              <div className="rounded-2xl border bg-white p-4 shadow-sm">
                <div className="text-sm text-slate-500">Move count</div>
                <div className="mt-1 text-xl font-semibold">{state.turnCount}</div>
              </div>
              <div className="rounded-2xl border bg-white p-4 shadow-sm">
                <div className="text-sm text-slate-500">Edges played</div>
                <div className="mt-1 text-xl font-semibold">{playedEdges} / {totalEdges}</div>
              </div>
            </div>

            <div className="overflow-auto rounded-3xl border bg-white p-4 shadow-inner shadow-slate-100">
              <svg
                viewBox={`0 0 ${boardWidth} ${boardHeight}`}
                className="mx-auto w-full max-w-[620px]"
              >
                <BoxLayer state={state} />
                <EdgeLayer state={state} />
                <DotLayer />
              </svg>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="rounded-3xl border-slate-200 shadow-lg shadow-slate-200/50">
            <CardHeader>
              <CardTitle className="text-xl">Agents</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <PlayerCard playerId={1} score={state.scores[1]} isCurrent={!state.finished && state.currentPlayer === 1} />
              <PlayerCard playerId={2} score={state.scores[2]} isCurrent={!state.finished && state.currentPlayer === 2} />
            </CardContent>
          </Card>

          <Card className="rounded-3xl border-slate-200 shadow-lg shadow-slate-200/50">
            <CardHeader>
              <CardTitle className="text-xl">Why this fits Intelligent Agents</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm leading-6 text-slate-700">
              <p>
                Yes — this is suitable for an Intelligent Agents subject. The board is the <span className="font-semibold">environment</span>, each AI is an <span className="font-semibold">agent</span>, each turn is an <span className="font-semibold">action selection</span>, and the score/closed boxes form the <span className="font-semibold">reward signal</span>.
              </p>
              <p>
                It is simpler than a navigation world, but conceptually it still has the classic loop: <span className="font-semibold">perceive state → choose action → affect environment → receive outcome</span>.
              </p>
              <p>
                For a university demo, this is actually nice because the environment is small, fully observable, deterministic, and easy to explain live.
              </p>
            </CardContent>
          </Card>

          <Card className="rounded-3xl border-slate-200 shadow-lg shadow-slate-200/50">
            <CardHeader>
              <CardTitle className="text-xl">Decision policy used</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm leading-6 text-slate-700">
              <p>The agents now use different policies:</p>
              <ul className="list-disc space-y-1 pl-5">
                <li><span className="font-semibold">AI 1</span>: greedy heuristic — closes boxes immediately, avoids risky moves, and otherwise picks the safest edge.</li>
                <li><span className="font-semibold">AI 2</span>: opportunistic heuristic with randomness — closes boxes with preference for bigger gains, prefers higher-pressure safe moves, and breaks ties randomly.</li>
              </ul>
              <p>
                This makes repeated matches less rigid and gives the demo a better multi-agent flavor without requiring a heavy search algorithm such as minimax.
              </p>
            </CardContent>
          </Card>

          <Card className="rounded-3xl border-slate-200 shadow-lg shadow-slate-200/50">
            <CardHeader>
              <CardTitle className="text-xl">Recent actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="max-h-[260px] space-y-2 overflow-auto rounded-2xl bg-slate-50 p-3 text-sm text-slate-700">
                {state.log.map((entry, idx) => (
                  <div key={idx} className="rounded-xl border bg-white px-3 py-2 shadow-sm">
                    {entry}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
