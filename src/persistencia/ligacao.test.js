import { describe, it, expect, afterEach, vi } from "vitest";
import { criarPool, obterPool, verificarLigacao } from "./ligacao";

// Valores falsos, escolhidos para ser fácil procurá-los nas mensagens de erro.
const UTILIZADOR = "utilizador-secreto";
const PALAVRA_PASSE = "palavra-secreta";
const SERVIDOR = "servidor-secreto.aivencloud.com";
const ENDERECO = `postgres://${UTILIZADOR}:${PALAVRA_PASSE}@${SERVIDOR}:12345/defaultdb`;
const CERTIFICADO = "-----BEGIN CERTIFICATE-----\nABC123\n-----END CERTIFICATE-----";

function semSegredos(texto) {
  expect(texto).not.toContain(PALAVRA_PASSE);
  expect(texto).not.toContain(UTILIZADOR);
  expect(texto).not.toContain(SERVIDOR);
}

// Corre a função e devolve a mensagem do erro que ela lançou.
function mensagemDoErro(funcao) {
  try {
    funcao();
  } catch (erro) {
    return erro.message;
  }
  throw new Error("Esperava-se um erro, mas a função não lançou nenhum");
}

const poolsCriados = [];
function criar(opcoes) {
  const pool = criarPool(opcoes);
  poolsCriados.push(pool);
  return pool;
}

afterEach(async () => {
  vi.unstubAllEnvs();
  await Promise.all(poolsCriados.splice(0).map((pool) => pool.end()));
});

describe("criarPool: não liga sem os dados necessários", () => {
  it("não liga sem endereço e explica porquê", () => {
    vi.stubEnv("DATABASE_URL", "");
    const mensagem = mensagemDoErro(() => criarPool({ caCert: CERTIFICADO }));
    expect(mensagem).toContain("Falta o DATABASE_URL");
  });

  it("não liga sem certificado e explica porquê, sem mostrar o endereço", () => {
    vi.stubEnv("DATABASE_CA_CERT", "");
    const mensagem = mensagemDoErro(() => criarPool({ databaseUrl: ENDERECO }));
    expect(mensagem).toContain("Falta o DATABASE_CA_CERT");
    semSegredos(mensagem);
  });

  it("não liga com um certificado que não está em formato PEM", () => {
    const mensagem = mensagemDoErro(() =>
      criarPool({ databaseUrl: ENDERECO, caCert: "isto não é um certificado" }),
    );
    expect(mensagem).toContain("DATABASE_CA_CERT");
    expect(mensagem).toContain("PEM");
  });

  it.each([
    ["um texto que não é endereço", `isto-nao-e-um-endereco ${PALAVRA_PASSE} ${UTILIZADOR}@${SERVIDOR}`],
    ["um protocolo errado", `mysql://${UTILIZADOR}:${PALAVRA_PASSE}@${SERVIDOR}:3306/db`],
  ])("não liga com %s, e a mensagem não mostra segredos", (_descricao, endereco) => {
    const mensagem = mensagemDoErro(() => criarPool({ databaseUrl: endereco, caCert: CERTIFICADO }));
    expect(mensagem).toContain("DATABASE_URL");
    semSegredos(mensagem);
  });
});

describe("criarPool: ligação sempre cifrada e com o certificado confirmado", () => {
  it("usa o certificado recebido e nunca desliga a verificação", () => {
    const pool = criar({ databaseUrl: ENDERECO, caCert: CERTIFICADO });
    expect(pool.options.ssl).toEqual({ ca: CERTIFICADO, rejectUnauthorized: true });
  });

  it.each(["require", "no-verify", "disable", "prefer", "verify-full"])(
    "retira sslmode=%s do endereço e mantém a verificação ligada",
    (modo) => {
      const pool = criar({
        databaseUrl: `${ENDERECO}?sslmode=${modo}&application_name=reserva-salas`,
        caCert: CERTIFICADO,
      });
      expect(pool.options.connectionString).not.toContain("sslmode");
      expect(pool.options.connectionString).toContain("application_name=reserva-salas");
      expect(pool.options.ssl.rejectUnauthorized).toBe(true);
    },
  );

  it("retira também outros parâmetros de SSL do endereço", () => {
    const pool = criar({
      databaseUrl: `${ENDERECO}?sslrootcert=/tmp/ca.pem&sslcert=a&sslkey=b&ssl=false`,
      caCert: CERTIFICADO,
    });
    expect(pool.options.connectionString).not.toMatch(/ssl/i);
  });

  it("converte um certificado com \\n escritos à letra em quebras de linha", () => {
    const certificadoNumaLinha = CERTIFICADO.replaceAll("\n", "\\n");
    const pool = criar({ databaseUrl: ENDERECO, caCert: certificadoNumaLinha });
    expect(pool.options.ssl.ca).toBe(CERTIFICADO);
  });
});

describe("criarPool: de onde vêm os valores", () => {
  it("usa DATABASE_URL e DATABASE_CA_CERT quando não recebe valores", () => {
    vi.stubEnv("DATABASE_URL", ENDERECO);
    vi.stubEnv("DATABASE_CA_CERT", CERTIFICADO);
    const pool = criar();
    expect(pool.options.connectionString).toContain(SERVIDOR);
    expect(pool.options.ssl.ca).toBe(CERTIFICADO);
  });

  it("o endereço passado ao módulo tem prioridade sobre o DATABASE_URL", () => {
    vi.stubEnv("DATABASE_URL", "postgres://outro:outra@outro-servidor:5432/outra");
    const pool = criar({ databaseUrl: ENDERECO, caCert: CERTIFICADO });
    expect(pool.options.connectionString).toContain(SERVIDOR);
    expect(pool.options.connectionString).not.toContain("outro-servidor");
  });

  it("regista um tratamento de erros, para uma ligação parada que falha não derrubar o servidor", () => {
    const pool = criar({ databaseUrl: ENDERECO, caCert: CERTIFICADO });
    expect(pool.listenerCount("error")).toBeGreaterThan(0);
  });
});

describe("obterPool", () => {
  it("devolve sempre o mesmo pool no mesmo servidor", () => {
    vi.stubEnv("DATABASE_URL", ENDERECO);
    vi.stubEnv("DATABASE_CA_CERT", CERTIFICADO);
    const primeiro = obterPool();
    poolsCriados.push(primeiro);
    expect(obterPool()).toBe(primeiro);
  });
});

describe("verificarLigacao: nunca mostra segredos nem lança exceções", () => {
  function poolQueFalha(mensagem, code) {
    return {
      async query() {
        throw Object.assign(new Error(mensagem), { code });
      },
    };
  }

  it("devolve ok quando a base de dados responde", async () => {
    const pool = { query: async () => ({ rows: [{ "?column?": 1 }] }) };
    expect(await verificarLigacao(pool)).toEqual({ ok: true });
  });

  it.each([
    ["autenticação recusada", `password authentication failed for user "${UTILIZADOR}"`, "28P01", "utilizador ou a palavra-passe"],
    ["servidor inexistente", `getaddrinfo ENOTFOUND ${SERVIDOR}`, "ENOTFOUND", "encontrar o servidor"],
    ["ligação recusada", `connect ECONNREFUSED ${SERVIDOR}:12345`, "ECONNREFUSED", "contactar a base de dados"],
    ["certificado recusado", `self-signed certificate in certificate chain ${SERVIDOR}`, "SELF_SIGNED_CERT_IN_CHAIN", "certificado"],
    ["erro desconhecido", `algo correu mal em ${ENDERECO}`, "XX000", "XX000"],
  ])("%s: mensagem clara e sem segredos", async (_descricao, mensagemOriginal, code, esperado) => {
    const resultado = await verificarLigacao(poolQueFalha(mensagemOriginal, code));
    expect(resultado.ok).toBe(false);
    expect(resultado.erro).toContain(esperado);
    semSegredos(resultado.erro);
  });
});
