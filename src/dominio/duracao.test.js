import { describe, it, expect } from "vitest";
import { criarReserva } from "./reserva";
import { duracaoPermitida } from "./duracao";

// Reserva na sala 1 no dia 20/10/2026, com horas em UTC (ex.: "10:00").
function reserva(inicio, fim) {
  return criarReserva({
    id: 1,
    salaId: 1,
    inicio: new Date(`2026-10-20T${inicio}:00Z`),
    fim: new Date(`2026-10-20T${fim}:00Z`),
  });
}

describe("duracaoPermitida: uma reserva tem no máximo 2 horas", () => {
  it("30 minutos são permitidos", () => {
    expect(duracaoPermitida(reserva("10:00", "10:30"))).toBe(true);
  });

  it("exatamente 2 horas são permitidas", () => {
    expect(duracaoPermitida(reserva("10:00", "12:00"))).toBe(true);
  });

  it("2 horas e 1 minuto são recusados", () => {
    expect(duracaoPermitida(reserva("10:00", "12:01"))).toBe(false);
  });
});
