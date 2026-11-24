import { describe, expect, it } from "vitest";
import { accountIdToSteam64, parseAccountId, parseSteamQuery, steam64ToAccountId } from "./steam-id";

describe("conversión SteamID32 ↔ SteamID64", () => {
  it("la cuenta de ejemplo", () => {
    expect(accountIdToSteam64(483770846)).toBe("76561198444036574");
    expect(steam64ToAccountId("76561198444036574")).toBe(483770846);
  });
  it("par real de los fixtures (steam-search)", () => {
    expect(steam64ToAccountId("76561199831362513")).toBe(1871096785);
    expect(parseSteamQuery("https://steamcommunity.com/profiles/76561199831362513/")).toMatchObject({ kind: "account", accountId: 1871096785 });
  });
  it("es reversible, también en los extremos", () => {
    for (const id of [1, 123456, 483770846, 4294967295]) expect(steam64ToAccountId(accountIdToSteam64(id))).toBe(id);
  });
  it("no pierde precisión con SteamID64 grandes (más de 2^53)", () => {
    expect(steam64ToAccountId("76561202255233023")).toBe(4294967295);
  });
});

describe("parseSteamQuery", () => {
  it("SteamID32", () => {
    expect(parseSteamQuery("483770846")).toEqual({ kind: "account", accountId: 483770846, from: "id32" });
  });
  it("SteamID64", () => {
    expect(parseSteamQuery("76561198444036574")).toEqual({ kind: "account", accountId: 483770846, from: "id64" });
  });
  it("URL de perfil con SteamID64, con y sin protocolo, www y barra final", () => {
    for (const u of [
      "https://steamcommunity.com/profiles/76561198444036574",
      "http://www.steamcommunity.com/profiles/76561198444036574/",
      "steamcommunity.com/profiles/76561198444036574?x=1",
    ]) expect(parseSteamQuery(u)).toEqual({ kind: "account", accountId: 483770846, from: "url" });
  });
  it("URL con vanity", () => {
    expect(parseSteamQuery("https://steamcommunity.com/id/heavenlydelusions/")).toEqual({ kind: "vanity", vanity: "heavenlydelusions" });
    expect(parseSteamQuery("steamcommunity.com/id/mi%20nombre")).toEqual({ kind: "vanity", vanity: "mi nombre" });
  });
  it("SteamID3 y SteamID2", () => {
    expect(parseSteamQuery("[U:1:483770846]")).toEqual({ kind: "account", accountId: 483770846, from: "steamid3" });
    expect(parseSteamQuery("STEAM_0:0:241885423")).toEqual({ kind: "account", accountId: 483770846, from: "steamid2" });
    expect(parseSteamQuery("STEAM_1:1:241885423")).toEqual({ kind: "account", accountId: 483770847, from: "steamid2" });
  });
  it("ignora espacios alrededor", () => {
    expect(parseSteamQuery("  483770846  ")).toMatchObject({ kind: "account", accountId: 483770846 });
  });
  it("un nombre normal es una búsqueda por nombre", () => {
    expect(parseSteamQuery("cosmetical")).toEqual({ kind: "name", query: "cosmetical" });
    expect(parseSteamQuery("Lady Geist 4ever")).toEqual({ kind: "name", query: "Lady Geist 4ever" });
  });
  it("números fuera de rango se tratan como nombre, no como cuenta", () => {
    expect(parseSteamQuery("0")).toEqual({ kind: "name", query: "0" });
    expect(parseSteamQuery("99999999999")).toMatchObject({ kind: "name" }); // > 2^32 y < SteamID64
    expect(parseSteamQuery("99999999999999999999")).toMatchObject({ kind: "name" });
  });
  it("vacío", () => {
    expect(parseSteamQuery("   ")).toEqual({ kind: "empty" });
  });
});

describe("parseAccountId (parámetro de ruta)", () => {
  it("acepta enteros positivos de 32 bits", () => {
    expect(parseAccountId("483770846")).toBe(483770846);
    expect(parseAccountId("1")).toBe(1);
  });
  it("rechaza todo lo demás", () => {
    for (const bad of ["0", "-5", "abc", "12.5", "4294967296", "76561198444036574", "", "1e3"]) expect(parseAccountId(bad)).toBeNull();
  });
});
