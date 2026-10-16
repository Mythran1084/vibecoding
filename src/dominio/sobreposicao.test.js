import { describe, it, expect } from "vitest";
import { criarReserva } from "./reserva";
import { temSobreposicao } from "./sobreposicao";

// Cria uma reserva no dia 20/10/2026, com horas em UTC (ex.: "10:00").
let proximoId = 1;
function reserva(salaId, inicio, fim) {
  return criarReserva({
    id: proximoId++,
    salaId,
    inicio: new Date(`2026-10-20T${inicio}:00Z`),
    fim: new Date(`2026-10-20T${fim}:00Z`),
  });
}

const SALA_A = 1;
const SALA_B = 2;

describe("temSobreposicao: uma sala não pode ter duas reservas sobrepostas", () => {
  const existente = reserva(SALA_A, "10:00", "11:00");

  it("não há sobreposição quando ainda não existem reservas", () => {
    expect(temSobreposicao(reserva(SALA_A, "10:00", "11:00"), [])).toBe(false);
  });

  it("há sobreposição com o mesmo horário na mesma sala", () => {
    expect(temSobreposicao(reserva(SALA_A, "10:00", "11:00"), [existente])).toBe(true);
  });

  it("há sobreposição quando a nova começa a meio da existente", () => {
    expect(temSobreposicao(reserva(SALA_A, "10:30", "11:30"), [existente])).toBe(true);
  });

  it("há sobreposição quando a nova acaba a meio da existente", () => {
    expect(temSobreposicao(reserva(SALA_A, "09:30", "10:30"), [existente])).toBe(true);
  });

  it("há sobreposição quando a nova está dentro da existente", () => {
    expect(temSobreposicao(reserva(SALA_A, "10:15", "10:45"), [existente])).toBe(true);
  });

  it("há sobreposição quando a nova engloba a existente", () => {
    expect(temSobreposicao(reserva(SALA_A, "09:00", "12:00"), [existente])).toBe(true);
  });

  it("reservas seguidas: começar quando a outra acaba não é sobreposição", () => {
    expect(temSobreposicao(reserva(SALA_A, "11:00", "12:00"), [existente])).toBe(false);
  });

  it("reservas seguidas: acabar quando a outra começa não é sobreposição", () => {
    expect(temSobreposicao(reserva(SALA_A, "09:00", "10:00"), [existente])).toBe(false);
  });

  it("basta 1 minuto em comum para haver sobreposição", () => {
    expect(temSobreposicao(reserva(SALA_A, "10:59", "12:00"), [existente])).toBe(true);
  });

  it("salas diferentes no mesmo horário não se sobrepõem", () => {
    expect(temSobreposicao(reserva(SALA_B, "10:00", "11:00"), [existente])).toBe(false);
  });

  it("com várias reservas, basta uma colidir", () => {
    const existentes = [
      reserva(SALA_A, "08:00", "09:00"),
      reserva(SALA_B, "10:00", "11:00"),
      reserva(SALA_A, "14:00", "15:00"),
    ];
    expect(temSobreposicao(reserva(SALA_A, "14:30", "15:30"), existentes)).toBe(true);
  });

  it("com várias reservas, nenhuma colide", () => {
    const existentes = [
      reserva(SALA_A, "08:00", "09:00"),
      reserva(SALA_B, "10:00", "11:00"),
      reserva(SALA_A, "14:00", "15:00"),
    ];
    expect(temSobreposicao(reserva(SALA_A, "10:00", "11:00"), existentes)).toBe(false);
  });
});
