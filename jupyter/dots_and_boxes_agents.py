
from __future__ import annotations
from dataclasses import dataclass, field
import random
from typing import Dict, List, Optional

DOTS_ROWS = 5
DOTS_COLS = 5

PLAYERS = {
    1: {
        "name": "AI 1",
        "edge": "#2563eb",
        "box_rgba": "rgba(37, 99, 235, 0.18)",
        "box_hex": "#dbeafe",
        "text": "#2563eb",
        "badge_bg": "#eff6ff",
        "badge_text": "#1d4ed8",
        "badge_border": "#bfdbfe",
    },
    2: {
        "name": "AI 2",
        "edge": "#dc2626",
        "box_rgba": "rgba(220, 38, 38, 0.18)",
        "box_hex": "#fee2e2",
        "text": "#dc2626",
        "badge_bg": "#fef2f2",
        "badge_text": "#b91c1c",
        "badge_border": "#fecaca",
    },
}

def edge_key(orientation: str, r: int, c: int) -> str:
    return f"{orientation}-{r}-{c}"

def create_initial_state():
    return {
        "edges": {},
        "boxes": {},
        "currentPlayer": 1,
        "scores": {1: 0, 2: 0},
        "finished": False,
        "winner": None,
        "turnCount": 0,
        "log": ["Jogo iniciado. AI 1 joga primeiro."],
    }

def get_all_edges():
    edges = []
    for r in range(DOTS_ROWS):
        for c in range(DOTS_COLS - 1):
            edges.append({"orientation": "h", "r": r, "c": c, "key": edge_key("h", r, c)})
    for r in range(DOTS_ROWS - 1):
        for c in range(DOTS_COLS):
            edges.append({"orientation": "v", "r": r, "c": c, "key": edge_key("v", r, c)})
    return edges

def get_box_edge_keys(r: int, c: int):
    return [
        edge_key("h", r, c),
        edge_key("h", r + 1, c),
        edge_key("v", r, c),
        edge_key("v", r, c + 1),
    ]

def get_adjacent_boxes_for_edge(edge):
    boxes = []
    if edge["orientation"] == "h":
        if edge["r"] > 0:
            boxes.append({"r": edge["r"] - 1, "c": edge["c"]})
        if edge["r"] < DOTS_ROWS - 1:
            boxes.append({"r": edge["r"], "c": edge["c"]})
    else:
        if edge["c"] > 0:
            boxes.append({"r": edge["r"], "c": edge["c"] - 1})
        if edge["c"] < DOTS_COLS - 1:
            boxes.append({"r": edge["r"], "c": edge["c"]})
    return [b for b in boxes if 0 <= b["r"] < DOTS_ROWS - 1 and 0 <= b["c"] < DOTS_COLS - 1]

def count_box_edges(state, r: int, c: int) -> int:
    return sum(1 for key in get_box_edge_keys(r, c) if state["edges"].get(key))

def would_create_third_edge(state, edge) -> bool:
    return any(count_box_edges(state, box["r"], box["c"]) == 2 for box in get_adjacent_boxes_for_edge(edge))

def would_complete_box(state, edge) -> bool:
    return any(count_box_edges(state, box["r"], box["c"]) == 3 for box in get_adjacent_boxes_for_edge(edge))

def get_available_edges(state):
    return [e for e in get_all_edges() if not state["edges"].get(e["key"])]

def pick_greedy_move(state):
    available = get_available_edges(state)
    if not available:
        return None

    completing = [e for e in available if would_complete_box(state, e)]
    if completing:
        return completing[0]

    safe = [e for e in available if not would_create_third_edge(state, e)]
    if safe:
        center_r = (DOTS_ROWS - 1) / 2
        center_c = (DOTS_COLS - 1) / 2
        safe.sort(key=lambda e: abs(e["r"] - center_r) + abs(e["c"] - center_c))
        return safe[0]

    risky = list(available)
    risky.sort(key=lambda e: sum(count_box_edges(state, box["r"], box["c"]) for box in get_adjacent_boxes_for_edge(e)))
    return risky[0]

def pick_trickster_move(state):
    available = get_available_edges(state)
    if not available:
        return None

    completing = [e for e in available if would_complete_box(state, e)]
    if completing:
        multi = []
        for edge in completing:
            value = sum(1 for box in get_adjacent_boxes_for_edge(edge) if count_box_edges(state, box["r"], box["c"]) == 3)
            multi.append((value, edge))
        multi.sort(key=lambda x: x[0], reverse=True)
        return multi[0][1]

    safe = [e for e in available if not would_create_third_edge(state, e)]
    if safe:
        ranked = []
        for edge in safe:
            adjacent = get_adjacent_boxes_for_edge(edge)
            pressure = sum(count_box_edges(state, box["r"], box["c"]) for box in adjacent)
            centrality = sum(abs(box["r"] - (DOTS_ROWS - 2) / 2) + abs(box["c"] - (DOTS_COLS - 2) / 2) for box in adjacent)
            ranked.append((pressure, -centrality, edge))
        ranked.sort(reverse=True, key=lambda x: (x[0], x[1]))
        best_pressure = ranked[0][0]
        top_band = [edge for pressure, centrality, edge in ranked if pressure == best_pressure]
        return random.choice(top_band)

    risky = []
    for edge in available:
        danger = 0
        for box in get_adjacent_boxes_for_edge(edge):
            edges = count_box_edges(state, box["r"], box["c"])
            danger += 3 if edges == 2 else (1 if edges == 1 else 0)
        risky.append((danger, edge))
    risky.sort(key=lambda x: x[0])
    best = [edge for danger, edge in risky if danger == risky[0][0]]
    return random.choice(best)

def pick_move_for_player(state):
    return pick_greedy_move(state) if state["currentPlayer"] == 1 else pick_trickster_move(state)

def apply_move(prev_state, edge):
    state = {
        "edges": dict(prev_state["edges"]),
        "boxes": dict(prev_state["boxes"]),
        "currentPlayer": prev_state["currentPlayer"],
        "scores": dict(prev_state["scores"]),
        "finished": prev_state["finished"],
        "winner": prev_state["winner"],
        "turnCount": prev_state["turnCount"],
        "log": list(prev_state["log"]),
    }

    player = state["currentPlayer"]
    state["edges"][edge["key"]] = player
    state["turnCount"] += 1

    completed = 0
    for box in get_adjacent_boxes_for_edge(edge):
        box_key = f'{box["r"]}-{box["c"]}'
        if not state["boxes"].get(box_key) and count_box_edges(state, box["r"], box["c"]) == 4:
            state["boxes"][box_key] = player
            state["scores"][player] += 1
            completed += 1

    p_name = PLAYERS[player]["name"]
    edge_label = f'{"H" if edge["orientation"] == "h" else "V"}({edge["r"]},{edge["c"]})'
    if completed > 0:
        state["log"].insert(0, f"{p_name} jogou {edge_label} e fechou {completed} caixa(s).")
    else:
        state["log"].insert(0, f"{p_name} jogou {edge_label}.")
        state["currentPlayer"] = 2 if player == 1 else 1

    total_boxes = (DOTS_ROWS - 1) * (DOTS_COLS - 1)
    if len(state["boxes"]) == total_boxes:
        state["finished"] = True
        if state["scores"][1] > state["scores"][2]:
            state["winner"] = 1
        elif state["scores"][2] > state["scores"][1]:
            state["winner"] = 2
        else:
            state["winner"] = 0
        if state["winner"] == 0:
            state["log"].insert(0, "Jogo encerrado em empate.")
        else:
            state["log"].insert(0, f'{PLAYERS[state["winner"]]["name"]} venceu.')

    return state

def step_game(state):
    if state["finished"]:
        return state
    move = pick_move_for_player(state)
    if move is None:
        state = dict(state)
        state["finished"] = True
        state["winner"] = 0
        return state
    return apply_move(state, move)
