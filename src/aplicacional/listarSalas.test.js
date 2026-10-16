import { describe, it, expect } from "vitest";
import { criarSala } from "../dominio/sala";
import { criarRepositorioFalso } from "./repositorioFalso";
import { listarSalas } from "./listarSalas";

describe("listarSalas", () => {
  it("devolve as salas do repositório", async () => {
    const salas = [
      criarSala({ id: 1, nome: "Sala Douro", capacidade: 4 }),
      criarSala({ id: 2, nome: "Sala Tejo", capacidade: 12 }),
    ];
    const repositorio = criarRepositorioFalso({ salas });
    expect(await listarSalas(repositorio)).toEqual(salas);
  });

  it("devolve uma lista vazia quando não há salas", async () => {
    const repositorio = criarRepositorioFalso();
    expect(await listarSalas(repositorio)).toEqual([]);
  });
});
