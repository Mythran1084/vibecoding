import { describe, it, expect } from "vitest";
import { criarReserva } from "../dominio/reserva";
import { criarRepositorioPostgres } from "./repositorioPostgres";

// Texto malicioso: se aparecer no SQL, o repositório está a colar texto do utilizador na consulta.
const MALICIOSO = "x'; DROP TABLE reservas; --";

// Pool falso: guarda cada consulta (sql + parâmetros) e devolve as linhas pedidas.
function criarPoolFalso(linhas = []) {
  const consultas = [];
  return {
    consultas,
    async query(sql, parametros = []) {
      consultas.push({ sql, parametros });
      return { rows: linhas };
    },
  };
}

const linhaSala = { id: "6b1c0a3e-1111-4c1d-9d1e-000000000001", nome: "Sala A", capacidade: 4 };
const linhaReserva = {
  id: "6b1c0a3e-2222-4c1d-9d1e-000000000002",
  sala_id: linhaSala.id,
  inicio: new Date("2026-10-20T10:00:00.000Z"),
  fim: new Date("2026-10-20T11:00:00.000Z"),
};

describe("criarRepositorioPostgres: consultas", () => {
  it("listarSalas lê id, nome e capacidade, ordenadas pelo nome", async () => {
    const pool = criarPoolFalso([linhaSala]);
    const salas = await criarRepositorioPostgres(pool).listarSalas();
    expect(pool.consultas[0].sql).toMatch(/SELECT id, nome, capacidade FROM salas ORDER BY nome/);
    expect(salas).toEqual([linhaSala]);
    expect(Object.isFrozen(salas[0])).toBe(true);
  });

  it("listarReservas converte sala_id em salaId e mantém as datas, ordenadas pelo início", async () => {
    const pool = criarPoolFalso([linhaReserva]);
    const [reserva] = await criarRepositorioPostgres(pool).listarReservas();
    expect(pool.consultas[0].sql).toMatch(/FROM reservas ORDER BY inicio/);
    expect(reserva.salaId).toBe(linhaSala.id);
    expect(reserva).not.toHaveProperty("sala_id");
    expect(reserva.inicio.toISOString()).toBe("2026-10-20T10:00:00.000Z");
    expect(reserva.fim.toISOString()).toBe("2026-10-20T11:00:00.000Z");
  });

  it("listarReservasDaSala passa a sala como parâmetro", async () => {
    const pool = criarPoolFalso([linhaReserva]);
    await criarRepositorioPostgres(pool).listarReservasDaSala(linhaSala.id);
    expect(pool.consultas[0].sql).toMatch(/WHERE sala_id = \$1 ORDER BY inicio/);
    expect(pool.consultas[0].parametros).toEqual([linhaSala.id]);
  });

  it("guardarReserva passa os quatro valores como parâmetros e devolve a reserva guardada", async () => {
    const pool = criarPoolFalso([linhaReserva]);
    const reserva = criarReserva({
      id: linhaReserva.id,
      salaId: linhaSala.id,
      inicio: linhaReserva.inicio,
      fim: linhaReserva.fim,
    });
    const guardada = await criarRepositorioPostgres(pool).guardarReserva(reserva);

    expect(pool.consultas[0].sql).toMatch(
      /INSERT INTO reservas \(id, sala_id, inicio, fim\)\s+VALUES \(\$1, \$2, \$3, \$4\)\s+RETURNING id, sala_id, inicio, fim/,
    );
    expect(pool.consultas[0].parametros).toEqual([
      reserva.id,
      reserva.salaId,
      reserva.inicio,
      reserva.fim,
    ]);
    expect(guardada.id).toBe(reserva.id);
    expect(guardada.salaId).toBe(reserva.salaId);
  });
});

describe("criarRepositorioPostgres: nunca cola texto do utilizador no SQL", () => {
  it("um salaId malicioso vai só nos parâmetros", async () => {
    const pool = criarPoolFalso([]);
    await criarRepositorioPostgres(pool).listarReservasDaSala(MALICIOSO);
    expect(pool.consultas[0].sql).not.toContain(MALICIOSO);
    expect(pool.consultas[0].parametros).toEqual([MALICIOSO]);
  });

  it("um id e um salaId maliciosos ao guardar vão só nos parâmetros", async () => {
    const pool = criarPoolFalso([{ ...linhaReserva, id: MALICIOSO, sala_id: MALICIOSO }]);
    const reserva = criarReserva({
      id: MALICIOSO,
      salaId: MALICIOSO,
      inicio: linhaReserva.inicio,
      fim: linhaReserva.fim,
    });
    await criarRepositorioPostgres(pool).guardarReserva(reserva);
    expect(pool.consultas[0].sql).not.toContain(MALICIOSO);
    expect(pool.consultas[0].parametros.slice(0, 2)).toEqual([MALICIOSO, MALICIOSO]);
  });
});

describe("criarRepositorioPostgres: dados inválidos na base de dados", () => {
  it("recusa uma sala inválida em vez de a devolver", async () => {
    const pool = criarPoolFalso([{ ...linhaSala, capacidade: 0 }]);
    await expect(criarRepositorioPostgres(pool).listarSalas()).rejects.toThrow(
      "A capacidade tem de ser um número inteiro maior ou igual a 1",
    );
  });
});
