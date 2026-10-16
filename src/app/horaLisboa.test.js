import { describe, it, expect } from "vitest";
import { lisboaParaUtc } from "./horaLisboa";

function utc(data, hora) {
  return lisboaParaUtc(data, hora).toISOString();
}

function eInvalida(data, hora) {
  return Number.isNaN(lisboaParaUtc(data, hora).getTime());
}

describe("lisboaParaUtc", () => {
  it("no inverno, Lisboa está em UTC+0", () => {
    expect(utc("2026-01-15", "10:00")).toBe("2026-01-15T10:00:00.000Z");
  });

  it("no verão, Lisboa está em UTC+1", () => {
    expect(utc("2026-07-15", "10:00")).toBe("2026-07-15T09:00:00.000Z");
  });

  it("no verão, uma hora de Lisboa logo depois da meia-noite fica no dia anterior em UTC", () => {
    expect(utc("2026-07-15", "00:30")).toBe("2026-07-14T23:30:00.000Z");
  });

  describe("dia em que a hora avança (29/03/2026, 01:00 passa a 02:00)", () => {
    it("antes da mudança ainda é UTC+0", () => {
      expect(utc("2026-03-29", "00:30")).toBe("2026-03-29T00:30:00.000Z");
    });

    it("depois da mudança já é UTC+1", () => {
      expect(utc("2026-03-29", "02:30")).toBe("2026-03-29T01:30:00.000Z");
    });

    it("recusa uma hora que não existe nesse dia", () => {
      expect(eInvalida("2026-03-29", "01:30")).toBe(true);
    });
  });

  describe("dia em que a hora recua (25/10/2026, 02:00 volta a 01:00)", () => {
    it("antes da mudança ainda é UTC+1", () => {
      expect(utc("2026-10-25", "00:30")).toBe("2026-10-24T23:30:00.000Z");
    });

    it("uma hora repetida usa a primeira vez (ainda hora de verão)", () => {
      expect(utc("2026-10-25", "01:30")).toBe("2026-10-25T00:30:00.000Z");
    });

    it("depois da mudança já é UTC+0", () => {
      expect(utc("2026-10-25", "02:30")).toBe("2026-10-25T02:30:00.000Z");
    });
  });

  it.each([
    ["dia que não existe", "2026-02-30", "10:00"],
    ["hora que não existe", "2026-10-20", "25:00"],
    ["data vazia", "", "10:00"],
    ["hora vazia", "2026-10-20", ""],
    ["texto sem formato", "amanhã", "às dez"],
  ])("devolve uma data inválida para %s", (_descricao, data, hora) => {
    expect(eInvalida(data, hora)).toBe(true);
  });
});
