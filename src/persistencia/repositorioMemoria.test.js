import { describe, it, expect } from "vitest";
import { criarSala } from "../dominio/sala";
import { criarReserva } from "../dominio/reserva";
import { METODOS_REPOSITORIO } from "../aplicacional/repositorio";
import { criarRepositorioMemoria } from "./repositorioMemoria";

const salas = [
  criarSala({ id: 1, nome: "Sala Douro", capacidade: 4 }),
  criarSala({ id: 2, nome: "Sala Tejo", capacidade: 12 }),
];

function reserva(id, salaId) {
  return criarReserva({
    id,
    salaId,
    inicio: new Date("2026-10-20T10:00:00Z"),
    fim: new Date("2026-10-20T11:00:00Z"),
  });
}

describe("criarRepositorioMemoria cumpre o contrato do repositório", () => {
  it.each(METODOS_REPOSITORIO)("tem o método %s, que devolve uma Promise", (metodo) => {
    const repositorio = criarRepositorioMemoria({ salas });
    expect(typeof repositorio[metodo]).toBe("function");
    expect(repositorio[metodo](reserva("r1", 1))).toBeInstanceOf(Promise);
  });

  it("lista as salas recebidas", async () => {
    const repositorio = criarRepositorioMemoria({ salas });
    expect(await repositorio.listarSalas()).toEqual(salas);
  });

  it("guarda uma reserva e devolve-a", async () => {
    const repositorio = criarRepositorioMemoria({ salas });
    const nova = reserva("r1", 1);
    expect(await repositorio.guardarReserva(nova)).toEqual(nova);
    expect(await repositorio.listarReservas()).toEqual([nova]);
  });

  it("lista só as reservas da sala pedida", async () => {
    const naSala1 = reserva("r1", 1);
    const naSala2 = reserva("r2", 2);
    const repositorio = criarRepositorioMemoria({ salas, reservas: [naSala1, naSala2] });
    expect(await repositorio.listarReservasDaSala(1)).toEqual([naSala1]);
    expect(await repositorio.listarReservasDaSala(3)).toEqual([]);
  });

  it("devolve cópias das listas, para ninguém alterar os dados por fora", async () => {
    const repositorio = criarRepositorioMemoria({ salas, reservas: [reserva("r1", 1)] });
    (await repositorio.listarSalas()).push("intruso");
    (await repositorio.listarReservas()).push("intruso");
    expect(await repositorio.listarSalas()).toHaveLength(2);
    expect(await repositorio.listarReservas()).toHaveLength(1);
  });

  it("não é afetado se as listas iniciais forem alteradas depois", async () => {
    const reservasIniciais = [reserva("r1", 1)];
    const repositorio = criarRepositorioMemoria({ salas, reservas: reservasIniciais });
    reservasIniciais.push(reserva("r2", 2));
    expect(await repositorio.listarReservas()).toHaveLength(1);
  });
});
