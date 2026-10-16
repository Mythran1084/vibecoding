import { describe, it, expect } from "vitest";
import { criarSala } from "../dominio/sala";
import { criarReserva } from "../dominio/reserva";
import { criarRepositorioFalso } from "./repositorioFalso";
import { reservarSala } from "./reservarSala";

const salas = [
  criarSala({ id: 1, nome: "Sala Douro", capacidade: 4 }),
  criarSala({ id: 2, nome: "Sala Tejo", capacidade: 12 }),
];

// Hora em UTC no dia 20/10/2026, ex.: hora("10:00").
function hora(hhmm) {
  return new Date(`2026-10-20T${hhmm}:00Z`);
}

const existente = criarReserva({ id: "r1", salaId: 1, inicio: hora("10:00"), fim: hora("11:00") });

describe("reservarSala", () => {
  it("reserva uma sala livre e guarda a reserva", async () => {
    const repositorio = criarRepositorioFalso({ salas });
    const resultado = await reservarSala(repositorio, {
      salaId: 1,
      inicio: hora("10:00"),
      fim: hora("11:00"),
    });

    expect(resultado.sucesso).toBe(true);
    expect(resultado.reserva.salaId).toBe(1);
    expect(resultado.reserva.inicio.toISOString()).toBe("2026-10-20T10:00:00.000Z");
    expect(resultado.reserva.fim.toISOString()).toBe("2026-10-20T11:00:00.000Z");
    expect(typeof resultado.reserva.id).toBe("string");
    expect(repositorio.reservasGuardadas).toEqual([resultado.reserva]);
  });

  it("gera ids diferentes para reservas diferentes", async () => {
    const repositorio = criarRepositorioFalso({ salas });
    const primeira = await reservarSala(repositorio, { salaId: 1, inicio: hora("10:00"), fim: hora("11:00") });
    const segunda = await reservarSala(repositorio, { salaId: 1, inicio: hora("12:00"), fim: hora("13:00") });
    expect(primeira.reserva.id).not.toBe(segunda.reserva.id);
  });

  it("recusa uma sala que não existe e não guarda nada", async () => {
    const repositorio = criarRepositorioFalso({ salas });
    const resultado = await reservarSala(repositorio, {
      salaId: 99,
      inicio: hora("10:00"),
      fim: hora("11:00"),
    });
    expect(resultado).toEqual({ sucesso: false, erro: "A sala não existe" });
    expect(repositorio.reservasGuardadas).toEqual([]);
  });

  it("recusa um horário sobreposto e não guarda nada", async () => {
    const repositorio = criarRepositorioFalso({ salas, reservas: [existente] });
    const resultado = await reservarSala(repositorio, {
      salaId: 1,
      inicio: hora("10:30"),
      fim: hora("11:30"),
    });
    expect(resultado).toEqual({ sucesso: false, erro: "A sala já está reservada nesse horário" });
    expect(repositorio.reservasGuardadas).toEqual([existente]);
  });

  it("aceita uma reserva seguida a outra na mesma sala", async () => {
    const repositorio = criarRepositorioFalso({ salas, reservas: [existente] });
    const resultado = await reservarSala(repositorio, {
      salaId: 1,
      inicio: hora("11:00"),
      fim: hora("12:00"),
    });
    expect(resultado.sucesso).toBe(true);
  });

  it("aceita outra sala no mesmo horário", async () => {
    const repositorio = criarRepositorioFalso({ salas, reservas: [existente] });
    const resultado = await reservarSala(repositorio, {
      salaId: 2,
      inicio: hora("10:00"),
      fim: hora("11:00"),
    });
    expect(resultado.sucesso).toBe(true);
  });

  it("devolve o erro do domínio quando a data é inválida, sem lançar exceção", async () => {
    const repositorio = criarRepositorioFalso({ salas });
    const resultado = await reservarSala(repositorio, {
      salaId: 1,
      inicio: "amanhã",
      fim: hora("11:00"),
    });
    expect(resultado).toEqual({ sucesso: false, erro: "O início tem de ser uma data válida" });
  });

  it("não lança exceção quando o repositório falha a guardar", async () => {
    const repositorio = criarRepositorioFalso({ salas });
    repositorio.guardarReserva = async () => {
      throw new Error("ligação perdida");
    };
    const resultado = await reservarSala(repositorio, {
      salaId: 1,
      inicio: hora("10:00"),
      fim: hora("11:00"),
    });
    expect(resultado).toEqual({
      sucesso: false,
      erro: "Não foi possível fazer a reserva. Tente novamente.",
    });
  });

  it("não lança exceção quando o repositório falha a ler", async () => {
    const repositorio = criarRepositorioFalso({ salas });
    repositorio.listarSalas = async () => {
      throw new Error("ligação perdida");
    };
    const resultado = await reservarSala(repositorio, {
      salaId: 1,
      inicio: hora("10:00"),
      fim: hora("11:00"),
    });
    expect(resultado).toEqual({
      sucesso: false,
      erro: "Não foi possível fazer a reserva. Tente novamente.",
    });
  });
});
