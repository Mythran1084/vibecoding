import { describe, it, expect } from "vitest";
import { verificarSeguranca, formatarRelatorio } from "./verificacao";

const SEGREDOS = ["palavra-secreta", "utilizador-secreto", "servidor-secreto.aivencloud.com"];

function erroDoPg(code) {
  // Mensagem com segredos, para confirmar que nunca aparece no relatório.
  return Object.assign(
    new Error(`erro para "utilizador-secreto" com palavra-secreta em servidor-secreto.aivencloud.com`),
    { code },
  );
}

// Cliente falso que responde como o pg. Cada opção muda um aspeto da ligação.
function criarClienteFalso({
  tls = { protocolo: "TLSv1.3", cifra: "TLS_AES_256_GCM_SHA384", autorizado: true },
  sslServidor = { ssl: true, version: "TLSv1.3", cipher: "TLS_AES_256_GCM_SHA384" },
  utilizador = "app_reservas",
  haSalas = true,
  insert = "ok", // "ok" ou um código de erro
  drop = "42501", // "aceite" ou um código de erro
  truncate = "42501",
  reservasQueFicaram = 0,
} = {}) {
  const consultas = [];
  const stream = tls
    ? {
        getProtocol: () => tls.protocolo,
        getCipher: () => ({ name: tls.cifra }),
        authorized: tls.autorizado,
        authorizationError: tls.autorizado ? null : "SELF_SIGNED_CERT_IN_CHAIN",
      }
    : {}; // ligação sem TLS: o stream é um socket normal

  return {
    consultas,
    connection: { stream },
    async query(sql) {
      consultas.push(sql);
      const responder = (rows) => ({ rows });
      if (sql === "SELECT 1") return responder([{}]);
      if (sql.includes("pg_stat_ssl")) return responder([sslServidor]);
      if (sql.includes("current_user")) return responder([{ utilizador }]);
      if (sql.includes("FROM salas")) return responder(haSalas ? [{ id: "sala-1" }] : []);
      if (sql.startsWith("INSERT INTO reservas")) {
        if (insert === "ok") return responder([{ id: "reserva-de-teste" }]);
        throw erroDoPg(insert);
      }
      if (sql.startsWith("DROP TABLE")) {
        if (drop === "aceite") return responder([]);
        throw erroDoPg(drop);
      }
      if (sql.startsWith("TRUNCATE")) {
        if (truncate === "aceite") return responder([]);
        throw erroDoPg(truncate);
      }
      if (sql.includes("count(")) return responder([{ n: reservasQueFicaram }]);
      return responder([]);
    },
  };
}

function item(resultado, inicioDoNome) {
  const encontrado = resultado.find((v) => v.nome.startsWith(inicioDoNome));
  expect(encontrado, `verificação "${inicioDoNome}"`).toBeDefined();
  return encontrado;
}

describe("verificarSeguranca: tudo bem configurado", () => {
  it("todas as verificações passam e mostram a cifra e o utilizador", async () => {
    const resultado = await verificarSeguranca(criarClienteFalso());
    expect(resultado.every((v) => v.ok)).toBe(true);
    expect(item(resultado, "Ligação cifrada (lado da app)").detalhe).toContain("TLSv1.3");
    expect(item(resultado, "Ligação cifrada (lado da app)").detalhe).toContain("TLS_AES_256_GCM_SHA384");
    expect(item(resultado, "Ligação cifrada (lado do servidor)").detalhe).toContain("TLSv1.3");
    expect(item(resultado, "Utilizador").detalhe).toContain("app_reservas");
  });

  it("faz tudo dentro de uma transação que é sempre anulada, e nunca confirma", async () => {
    const cliente = criarClienteFalso();
    await verificarSeguranca(cliente);
    const indiceBegin = cliente.consultas.indexOf("BEGIN");
    const indiceRollback = cliente.consultas.lastIndexOf("ROLLBACK");
    const indiceInsert = cliente.consultas.findIndex((sql) => sql.startsWith("INSERT"));
    expect(indiceBegin).toBeGreaterThanOrEqual(0);
    expect(indiceInsert).toBeGreaterThan(indiceBegin);
    expect(indiceRollback).toBeGreaterThan(indiceInsert);
    expect(cliente.consultas).not.toContain("COMMIT");
  });

  it("tenta apagar e esvaziar a tabela, cada uma num ponto de retorno desfeito logo a seguir", async () => {
    const cliente = criarClienteFalso();
    await verificarSeguranca(cliente);
    for (const comando of ["DROP TABLE reservas", "TRUNCATE reservas"]) {
      const indice = cliente.consultas.indexOf(comando);
      expect(indice).toBeGreaterThan(0);
      expect(cliente.consultas[indice - 1]).toMatch(/^SAVEPOINT /);
      expect(cliente.consultas[indice + 1]).toMatch(/^ROLLBACK TO SAVEPOINT /);
    }
  });

  it("depois de anular, confirma fora da transação que a reserva de teste não ficou gravada", async () => {
    const cliente = criarClienteFalso();
    const resultado = await verificarSeguranca(cliente);
    const indiceRollback = cliente.consultas.lastIndexOf("ROLLBACK");
    const indiceContagem = cliente.consultas.findIndex((sql) => sql.includes("count("));
    expect(indiceContagem).toBeGreaterThan(indiceRollback);
    expect(item(resultado, "Nada ficou gravado nem apagado").ok).toBe(true);
  });
});

describe("verificarSeguranca: deteta problemas", () => {
  it("ligação sem cifra: as duas verificações de cifra e a do certificado falham", async () => {
    const resultado = await verificarSeguranca(
      criarClienteFalso({ tls: null, sslServidor: { ssl: false, version: null, cipher: null } }),
    );
    expect(item(resultado, "Ligação cifrada (lado da app)").ok).toBe(false);
    expect(item(resultado, "Ligação cifrada (lado do servidor)").ok).toBe(false);
    expect(item(resultado, "Certificado confirmado").ok).toBe(false);
  });

  it("certificado não confirmado: falha e diz o motivo", async () => {
    const resultado = await verificarSeguranca(
      criarClienteFalso({ tls: { protocolo: "TLSv1.3", cifra: "X", autorizado: false } }),
    );
    const certificado = item(resultado, "Certificado confirmado");
    expect(certificado.ok).toBe(false);
    expect(certificado.detalhe).toContain("SELF_SIGNED_CERT_IN_CHAIN");
  });

  it("entrou com outro utilizador (ex.: o administrador): falha e diz qual era o esperado", async () => {
    const resultado = await verificarSeguranca(criarClienteFalso({ utilizador: "avnadmin" }));
    const utilizador = item(resultado, "Utilizador");
    expect(utilizador.ok).toBe(false);
    expect(utilizador.detalhe).toContain("avnadmin");
    expect(utilizador.detalhe).toContain("app_reservas");
  });

  it("se conseguir apagar a tabela, falha (e a transação anula o apagamento)", async () => {
    const cliente = criarClienteFalso({ drop: "aceite" });
    const resultado = await verificarSeguranca(cliente);
    expect(item(resultado, "Não consegue apagar a tabela").ok).toBe(false);
    expect(cliente.consultas).not.toContain("COMMIT");
    expect(cliente.consultas).toContain("ROLLBACK");
  });

  it("se conseguir esvaziar a tabela, falha", async () => {
    const resultado = await verificarSeguranca(criarClienteFalso({ truncate: "aceite" }));
    expect(item(resultado, "Não consegue esvaziar a tabela").ok).toBe(false);
  });

  it("se apagar for recusado por outro motivo que não falta de permissão, não conta como prova", async () => {
    const resultado = await verificarSeguranca(criarClienteFalso({ drop: "2BP01" }));
    const apagar = item(resultado, "Não consegue apagar a tabela");
    expect(apagar.ok).toBe(false);
    expect(apagar.detalhe).toContain("2BP01");
  });

  it("se não conseguir gravar, falha mas continua as outras verificações e anula tudo", async () => {
    const cliente = criarClienteFalso({ insert: "42501" });
    const resultado = await verificarSeguranca(cliente);
    expect(item(resultado, "Consegue gravar uma reserva").ok).toBe(false);
    expect(item(resultado, "Não consegue apagar a tabela").ok).toBe(true);
    expect(cliente.consultas).toContain("ROLLBACK");
  });

  it("sem salas, explica que é preciso correr a migração", async () => {
    const resultado = await verificarSeguranca(criarClienteFalso({ haSalas: false }));
    const gravar = item(resultado, "Consegue gravar uma reserva");
    expect(gravar.ok).toBe(false);
    expect(gravar.detalhe).toContain("npm run migrar");
  });

  it("se a reserva de teste tiver ficado gravada, falha", async () => {
    const resultado = await verificarSeguranca(criarClienteFalso({ reservasQueFicaram: 1 }));
    expect(item(resultado, "Nada ficou gravado nem apagado").ok).toBe(false);
  });
});

describe("formatarRelatorio", () => {
  it("mostra uma linha ✓ ou ✗ por verificação", () => {
    const texto = formatarRelatorio([
      { nome: "A", ok: true, detalhe: "bem" },
      { nome: "B", ok: false, detalhe: "mal" },
    ]);
    expect(texto).toBe("✓ A: bem\n✗ B: mal");
  });

  it("nunca mostra segredos, mesmo quando tudo falha", async () => {
    const resultado = await verificarSeguranca(
      criarClienteFalso({ insert: "42501", drop: "XX000", truncate: "XX000" }),
    );
    const texto = formatarRelatorio(resultado);
    expect(texto.split("\n").length).toBe(resultado.length);
    expect(texto).toContain("✗ Consegue gravar uma reserva");
    for (const segredo of SEGREDOS) expect(texto).not.toContain(segredo);
  });
});
