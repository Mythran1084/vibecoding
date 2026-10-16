import { describe, it, expect } from "vitest";
import { criarSala } from "./sala";

describe("criarSala", () => {
  it("cria uma sala com id, nome e capacidade", () => {
    const sala = criarSala({ id: 1, nome: "Sala Douro", capacidade: 4 });
    expect(sala).toEqual({ id: 1, nome: "Sala Douro", capacidade: 4 });
  });

  it("não pode ser alterada depois de criada", () => {
    const sala = criarSala({ id: 1, nome: "Sala Douro", capacidade: 4 });
    expect(sala.nome).toBe("Sala Douro");
    expect(Object.isFrozen(sala)).toBe(true);
  });

  it("recusa uma sala sem id", () => {
    expect(() => criarSala({ nome: "Sala Douro", capacidade: 4 })).toThrow(
      "A sala precisa de um id",
    );
  });

  it.each([undefined, "", "   ", 42])("recusa o nome %j", (nome) => {
    expect(() => criarSala({ id: 1, nome, capacidade: 4 })).toThrow(
      "A sala precisa de um nome",
    );
  });

  it.each([0, -3, 2.5, "4", undefined])("recusa a capacidade %j", (capacidade) => {
    expect(() => criarSala({ id: 1, nome: "Sala Douro", capacidade })).toThrow(
      "A capacidade tem de ser um número inteiro maior ou igual a 1",
    );
  });
});
