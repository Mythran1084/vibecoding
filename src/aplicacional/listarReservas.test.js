import { describe, it, expect } from "vitest";
import { criarSala } from "../dominio/sala";
import { criarReserva } from "../dominio/reserva";
import { criarRepositorioFalso } from "./repositorioFalso";
import { listarReservas } from "./listarReservas";

const salas = [
  criarSala({ id: 1, nome: "Sala Douro", capacidade: 4 }),
  criarSala({ id: 2, nome: "Sala Tejo", capacidade: 12 }),
];

function reserva(id, salaId, inicioIso, fimIso) {
  return criarReserva({ id, salaId, inicio: new Date(inicioIso), fim: new Date(fimIso) });
}

describe("listarReservas", () => {
  it("devolve as reservas com o nome da sala, ordenadas pelo início", async () => {
    const repositorio = criarRepositorioFalso({
      salas,
      reservas: [
        reserva("r2", 2, "2026-10-22T14:00:00Z", "2026-10-22T15:00:00Z"),
        reserva("r1", 1, "2026-10-20T10:00:00Z", "2026-10-20T11:00:00Z"),
      ],
    });

    const lista = await listarReservas(repositorio);

    expect(lista.map((r) => r.id)).toEqual(["r1", "r2"]);
    expect(lista.map((r) => r.nomeSala)).toEqual(["Sala Douro", "Sala Tejo"]);
    expect(lista[0].salaId).toBe(1);
    expect(lista[0].inicio.toISOString()).toBe("2026-10-20T10:00:00.000Z");
    expect(lista[0].fim.toISOString()).toBe("2026-10-20T11:00:00.000Z");
  });

  it("indica 'Sala desconhecida' quando a sala da reserva já não existe", async () => {
    const repositorio = criarRepositorioFalso({
      salas,
      reservas: [reserva("r9", 99, "2026-10-20T10:00:00Z", "2026-10-20T11:00:00Z")],
    });
    const [unica] = await listarReservas(repositorio);
    expect(unica.nomeSala).toBe("Sala desconhecida");
  });

  it("devolve uma lista vazia quando não há reservas", async () => {
    const repositorio = criarRepositorioFalso({ salas });
    expect(await listarReservas(repositorio)).toEqual([]);
  });
});
