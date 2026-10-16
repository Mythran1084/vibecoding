import { describe, it, expect } from "vitest";
import { criarReserva } from "./reserva";

// Datas sempre escritas com "Z" no fim, para serem UTC.
const inicio = new Date("2026-10-20T10:00:00Z");
const fim = new Date("2026-10-20T11:00:00Z");

describe("criarReserva", () => {
  it("cria uma reserva com id, salaId, inicio e fim", () => {
    const reserva = criarReserva({ id: 1, salaId: 2, inicio, fim });
    expect(reserva.id).toBe(1);
    expect(reserva.salaId).toBe(2);
    expect(reserva.inicio.toISOString()).toBe("2026-10-20T10:00:00.000Z");
    expect(reserva.fim.toISOString()).toBe("2026-10-20T11:00:00.000Z");
  });

  it("não pode ser alterada depois de criada", () => {
    const reserva = criarReserva({ id: 1, salaId: 2, inicio, fim });
    expect(reserva.salaId).toBe(2);
    expect(Object.isFrozen(reserva)).toBe(true);
  });

  it("guarda cópias das datas, para mudanças fora não a afetarem", () => {
    const inicioOriginal = new Date("2026-10-20T10:00:00Z");
    const reserva = criarReserva({ id: 1, salaId: 2, inicio: inicioOriginal, fim });
    inicioOriginal.setUTCHours(15);
    expect(reserva.inicio.toISOString()).toBe("2026-10-20T10:00:00.000Z");
  });

  it("recusa uma reserva sem id", () => {
    expect(() => criarReserva({ salaId: 2, inicio, fim })).toThrow(
      "A reserva precisa de um id",
    );
  });

  it("recusa uma reserva sem salaId", () => {
    expect(() => criarReserva({ id: 1, inicio, fim })).toThrow(
      "A reserva precisa de uma sala (salaId)",
    );
  });

  const datasInvalidas = [
    ["texto em vez de data", "2026-10-20T10:00:00Z"],
    ["data inválida", new Date("não é data")],
    ["em falta", undefined],
  ];

  it.each(datasInvalidas)("recusa inicio: %s", (_descricao, valor) => {
    expect(() => criarReserva({ id: 1, salaId: 2, inicio: valor, fim })).toThrow(
      "O início tem de ser uma data válida",
    );
  });

  it.each(datasInvalidas)("recusa fim: %s", (_descricao, valor) => {
    expect(() => criarReserva({ id: 1, salaId: 2, inicio, fim: valor })).toThrow(
      "O fim tem de ser uma data válida",
    );
  });
});
