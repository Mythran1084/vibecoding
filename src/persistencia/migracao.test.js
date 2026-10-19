import { describe, it, expect } from "vitest";
import { executarMigracao, PASSOS, UTILIZADOR_APP } from "./migracao";

// Cliente falso: guarda as consultas e responde como o pg.
// existeUtilizador: se o app_reservas existe; falharNoPasso: texto que faz uma consulta falhar.
function criarClienteFalso({ existeUtilizador = true, falharNoPasso } = {}) {
  const consultas = [];
  return {
    consultas,
    async query(sql, parametros) {
      consultas.push(sql);
      if (sql.includes("pg_roles")) {
        expect(parametros).toEqual([UTILIZADOR_APP]);
        return { rows: existeUtilizador ? [{ existe: 1 }] : [] };
      }
      if (falharNoPasso && sql.includes(falharNoPasso)) {
        // Mensagem com segredos, para confirmar que nunca é mostrada.
        throw Object.assign(new Error('falhou para o utilizador "avnadmin" com a palavra-passe segredo123'), {
          code: "0A000",
        });
      }
      return { rows: [] };
    },
  };
}

const todoOSql = PASSOS.map((passo) => passo.sql).join("\n");

describe("executarMigracao: transação", () => {
  it("abre a transação, confirma o utilizador, corre todos os passos e confirma no fim", async () => {
    const cliente = criarClienteFalso();
    await executarMigracao(cliente);
    expect(cliente.consultas[0]).toBe("BEGIN");
    expect(cliente.consultas[1]).toContain("pg_roles");
    expect(cliente.consultas.slice(2, -1)).toEqual(PASSOS.map((passo) => passo.sql));
    expect(cliente.consultas.at(-1)).toBe("COMMIT");
  });

  it("para e desfaz tudo se o app_reservas não existir, explicando o que fazer", async () => {
    const cliente = criarClienteFalso({ existeUtilizador: false });
    await expect(executarMigracao(cliente)).rejects.toThrow(
      "O utilizador app_reservas não existe",
    );
    expect(cliente.consultas).toEqual(["BEGIN", expect.stringContaining("pg_roles"), "ROLLBACK"]);
  });

  it("se um passo falhar, desfaz tudo e diz qual foi o passo, sem mostrar o erro original", async () => {
    const cliente = criarClienteFalso({ falharNoPasso: "btree_gist" });
    const erro = await executarMigracao(cliente).catch((e) => e);
    expect(erro.message).toContain("btree_gist");
    expect(erro.message).toContain("0A000");
    expect(erro.message).toContain("Nada foi alterado");
    expect(erro.message).not.toContain("avnadmin");
    expect(erro.message).not.toContain("segredo123");
    expect(cliente.consultas.at(-1)).toBe("ROLLBACK");
    expect(cliente.consultas).not.toContain("COMMIT");
  });

  it("regista o nome de cada passo concluído", async () => {
    const registos = [];
    await executarMigracao(criarClienteFalso(), { registar: (texto) => registos.push(texto) });
    expect(registos).toHaveLength(PASSOS.length);
    expect(PASSOS.length).toBeGreaterThan(0);
    for (const passo of PASSOS) {
      expect(registos.some((texto) => texto.includes(passo.nome))).toBe(true);
    }
  });
});

describe("tabelas", () => {
  it("cria as tabelas salas e reservas com UUID gerado pela base de dados", () => {
    expect(todoOSql).toMatch(/CREATE TABLE IF NOT EXISTS salas/);
    expect(todoOSql).toMatch(/CREATE TABLE IF NOT EXISTS reservas/);
    expect(todoOSql.match(/id uuid PRIMARY KEY DEFAULT gen_random_uuid\(\)/g)).toHaveLength(2);
  });

  it("guarda o início e o fim com fuso horário (TIMESTAMPTZ)", () => {
    expect(todoOSql).toMatch(/inicio timestamptz NOT NULL/);
    expect(todoOSql).toMatch(/fim timestamptz NOT NULL/);
  });

  it("liga cada reserva a uma sala existente", () => {
    expect(todoOSql).toMatch(/sala_id uuid NOT NULL REFERENCES salas \(id\)/);
  });

  it("a base de dados recusa reservas com o fim antes do início", () => {
    expect(todoOSql).toMatch(/CHECK \(fim > inicio\)/);
  });

  it("a base de dados recusa reservas sobrepostas na mesma sala, mas aceita reservas seguidas", () => {
    expect(todoOSql).toMatch(/CREATE EXTENSION IF NOT EXISTS btree_gist/);
    expect(todoOSql).toMatch(
      /EXCLUDE USING gist \(sala_id WITH =, tstzrange\(inicio, fim, '\[\)'\) WITH &&\)/,
    );
  });
});

describe("pode correr várias vezes", () => {
  it("todos os CREATE usam IF NOT EXISTS", () => {
    const creates = todoOSql.match(/CREATE (TABLE|EXTENSION|INDEX)[^\n]*/g);
    expect(creates.length).toBeGreaterThan(0);
    for (const linha of creates) expect(linha).toContain("IF NOT EXISTS");
  });

  it("insere as salas A, B e C sem as repetir", () => {
    const passo = PASSOS.find((p) => p.sql.includes("INSERT INTO salas"));
    expect(passo.sql).toContain("'Sala A'");
    expect(passo.sql).toContain("'Sala B'");
    expect(passo.sql).toContain("'Sala C'");
    expect(passo.sql).toMatch(/ON CONFLICT \(nome\) DO NOTHING/);
    expect(todoOSql).toMatch(/nome text NOT NULL UNIQUE/);
  });
});

describe("permissões do app_reservas", () => {
  const sqlDoUtilizador = PASSOS.map((p) => p.sql).filter((sql) => sql.includes(UTILIZADOR_APP));

  it("só pode ler, inserir, alterar e apagar nas tabelas salas e reservas", () => {
    expect(todoOSql).toContain(
      `GRANT SELECT, INSERT, UPDATE, DELETE ON salas, reservas TO ${UTILIZADOR_APP}`,
    );
  });

  it("primeiro perde qualquer permissão antiga nessas tabelas", () => {
    const indiceRevoke = PASSOS.findIndex((p) => p.sql === `REVOKE ALL ON salas, reservas FROM ${UTILIZADOR_APP}`);
    const indiceGrant = PASSOS.findIndex((p) => p.sql.startsWith("GRANT SELECT"));
    expect(indiceRevoke).toBeGreaterThanOrEqual(0);
    expect(indiceRevoke).toBeLessThan(indiceGrant);
  });

  it("nunca recebe ALL, TRUNCATE, REFERENCES, TRIGGER, CREATE nem TEMPORARY", () => {
    const grants = sqlDoUtilizador.filter((s) => s.startsWith("GRANT") || s.includes("'GRANT"));
    expect(grants.length).toBeGreaterThanOrEqual(3);
    for (const sql of grants) {
      expect(sql).not.toMatch(/\b(ALL|TRUNCATE|REFERENCES|TRIGGER|CREATE|TEMPORARY|TEMP)\b/);
    }
  });

  it("ninguém além do dono pode criar objetos no schema public nem tabelas temporárias", () => {
    expect(todoOSql).toContain("REVOKE CREATE ON SCHEMA public FROM PUBLIC");
    expect(todoOSql).toMatch(/REVOKE TEMPORARY ON DATABASE %I FROM PUBLIC/);
  });

  it("pode ligar-se à base de dados e usar o schema public", () => {
    expect(todoOSql).toContain(`GRANT USAGE ON SCHEMA public TO ${UTILIZADOR_APP}`);
    expect(todoOSql).toMatch(/GRANT CONNECT ON DATABASE %I TO app_reservas/);
  });
});
