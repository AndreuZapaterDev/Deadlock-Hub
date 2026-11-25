import { describe, expect, it } from "vitest";
import { badgeToRank, classifyStatuses, cumulativeWinRate, isWin, matchesPerDay, matchModeLabel, rankSeries, summarize } from "./player-stats";
import type { MatchHistoryRow } from "./types";

const DAY = 86400;
const row = (o: Partial<MatchHistoryRow> = {}): MatchHistoryRow => ({
  match_id: 1, hero_id: 1, start_time: 1_700_000_000, player_kills: 5, player_deaths: 2, player_assists: 5, net_worth: 30000,
  match_duration_s: 1800, match_result: 1, player_team: 1, ...o,
});

describe("isWin", () => {
  it("gana quien está en el equipo ganador", () => {
    expect(isWin(row({ match_result: 1, player_team: 1 }))).toBe(true);
    expect(isWin(row({ match_result: 0, player_team: 0 }))).toBe(true);
    expect(isWin(row({ match_result: 1, player_team: 0 }))).toBe(false);
    expect(isWin(row({ match_result: 0, player_team: 1 }))).toBe(false);
  });
});

describe("summarize", () => {
  it("historial vacío: todo a cero sin dividir por cero", () => {
    expect(summarize([])).toEqual({ matches: 0, wins: 0, winRate: 0, kda: 0, soulsPerMin: 0, avgDuration: 0 });
  });
  it("calcula win rate, KDA y almas/min sobre totales", () => {
    const s = summarize([row(), row({ match_result: 0 })]);
    expect(s.matches).toBe(2);
    expect(s.winRate).toBe(0.5);
    expect(s.kda).toBe(5); // (10+10)/(2+2)
    expect(s.soulsPerMin).toBe(1000); // 60000 almas / 60 min
    expect(s.avgDuration).toBe(1800);
  });
  it("KDA con 0 muertes no es infinito", () => {
    expect(summarize([row({ player_deaths: 0 })]).kda).toBe(10);
  });
});

describe("cumulativeWinRate", () => {
  it("es acumulado y cronológico aunque el historial venga del más reciente al más antiguo", () => {
    const h = [row({ start_time: 1_700_000_000 + 2 * DAY, match_result: 0 }), row({ start_time: 1_700_000_000 + DAY }), row({ start_time: 1_700_000_000 })];
    const s = cumulativeWinRate(h, 10);
    expect(s.map((p) => p.value)).toEqual([100, 100, 66.7]);
  });
  it("muestrea sin perder el último punto", () => {
    const h = Array.from({ length: 1000 }, (_, i) => row({ start_time: 1_700_000_000 + i * 600, match_result: i % 2 }));
    const s = cumulativeWinRate(h, 50);
    expect(s.length).toBeLessThanOrEqual(60);
    expect(s.at(-1)!.value).toBe(50);
  });
  it("con muchas partidas no dibuja las primeras (muestra mínima), pero sí la última", () => {
    const h = Array.from({ length: 200 }, (_, i) => row({ start_time: 1_700_000_000 + i * 600, match_result: i === 0 ? 0 : 1 }));
    const s = cumulativeWinRate(h, 200, 30);
    expect(s).toHaveLength(171); // de la partida 30 a la 200
    expect(s[0].value).toBeGreaterThan(90); // 29 victorias de 30, no el 0 % de la primera partida
    expect(s.at(-1)!.value).toBe(99.5);
  });
  it("vacío", () => expect(cumulativeWinRate([])).toEqual([]));
});

describe("matchesPerDay", () => {
  it("cuenta por día contando desde la partida más reciente, con ceros en los días sin partidas", () => {
    const base = 1_700_000_000 - (1_700_000_000 % DAY); // inicio de un día UTC
    const out = matchesPerDay([row({ start_time: base + 100 }), row({ start_time: base + 200 }), row({ start_time: base - 2 * DAY + 5 })], 5);
    expect(out).toHaveLength(5);
    expect(out.map((d) => d.value)).toEqual([0, 0, 1, 0, 2]);
  });
  it("ignora lo que queda fuera de la ventana", () => {
    const base = 1_700_000_000;
    const out = matchesPerDay([row({ start_time: base }), row({ start_time: base - 100 * DAY })], 7);
    expect(out.reduce((a, d) => a + d.value, 0)).toBe(1);
  });
});

describe("rango", () => {
  it("badge = tier*10 + subrango", () => expect(badgeToRank(116)).toEqual({ tier: 11, sub: 6 }));
  it("la serie solo usa partidas con rango", () => {
    const s = rankSeries([row({ ranked_display_badge: 116, start_time: 2 }), row({ start_time: 1 }), row({ ranked_display_badge: 21, start_time: 0 })]);
    expect(s.map((p) => p.value)).toEqual([2, 11.83]);
  });
});

describe("classifyStatuses", () => {
  it("todo 200 → ok", () => expect(classifyStatuses([200, 200])).toBe("ok"));
  it("403 → privado (tiene prioridad)", () => expect(classifyStatuses([200, 403, 503])).toBe("private"));
  it("429, 503 y 504 → API ocupada", () => {
    for (const s of [429, 503, 504]) expect(classifyStatuses([200, s])).toBe("busy");
  });
  it("404 → no existe", () => expect(classifyStatuses([404, 200])).toBe("notfound"));
  it("otros 4xx/5xx → error", () => expect(classifyStatuses([500])).toBe("error"));
});

describe("modos", () => {
  it("decodifica los enteros del OpenAPI", () => {
    expect(matchModeLabel(4)).toBe("Ranked");
    expect(matchModeLabel(99)).toBe("Modo 99");
    expect(matchModeLabel(null)).toBe("—");
  });
});

import { filterHistory, recentForm, streaks } from "./player-stats";

describe("forma reciente y rachas", () => {
  const m = (t: number, win: boolean, hero = 1) => ({ match_id: t, hero_id: hero, start_time: t, player_kills: 0, player_deaths: 0, player_assists: 0, net_worth: 0, match_duration_s: 60, match_result: win ? 0 : 1, player_team: 0 });
  const h = [m(1, true), m(2, true), m(3, true), m(4, false), m(5, true, 2), m(6, true, 2)];

  it("recentForm: más reciente primero", () => expect(recentForm(h, 3)).toEqual([true, true, false]));
  it("streaks: actual y mejor", () => expect(streaks(h)).toEqual({ current: 2, bestWin: 3 }));
  it("streaks: racha de derrotas negativa y vacío", () => {
    expect(streaks([m(1, true), m(2, false), m(3, false)]).current).toBe(-2);
    expect(streaks([])).toEqual({ current: 0, bestWin: 0 });
  });
  it("filterHistory", () => {
    expect(filterHistory(h, { result: "loss" })).toHaveLength(1);
    expect(filterHistory(h, { heroId: 2 })).toHaveLength(2);
    expect(filterHistory(h, { result: "win", heroId: 2 })).toHaveLength(2);
    expect(filterHistory(h, {})).toHaveLength(6);
  });
});
