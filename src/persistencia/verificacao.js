// Verificação de segurança da ligação da app (DATABASE_URL), usada por `npm run verificar-ligacao`.
// Confirma a cifra, o certificado, o utilizador e as permissões. As tentativas de gravar,
// apagar e esvaziar correm dentro de uma transação que é SEMPRE anulada: nada fica gravado
// nem apagado. As mensagens nunca incluem o endereço nem a palavra-passe.
import { mensagemSegura } from "./ligacao.js";
import { UTILIZADOR_APP } from "./migracao.js";

const SEM_PERMISSAO = "42501";

// Corre uma verificação; se a consulta falhar, a verificação falha com uma mensagem segura.
async function verificar(nome, funcao) {
  try {
    return { nome, ...(await funcao()) };
  } catch (erro) {
    return { nome, ok: false, detalhe: mensagemSegura(erro) };
  }
}

// Tenta um comando e desfaz logo o que ele fez, para o próximo comando partir do mesmo ponto
// (e para um erro não estragar o resto da transação).
async function tentarEDesfazer(cliente, sql, parametros) {
  await cliente.query("SAVEPOINT verificacao");
  try {
    return { conseguiu: true, resultado: await cliente.query(sql, parametros) };
  } catch (erro) {
    return { conseguiu: false, erro };
  } finally {
    await cliente.query("ROLLBACK TO SAVEPOINT verificacao");
  }
}

// Um comando destrutivo só está bem bloqueado se for recusado por falta de permissão.
function avaliarBloqueio(tentativa, acao) {
  if (tentativa.conseguiu) {
    return { ok: false, detalhe: `o utilizador conseguiu ${acao} (foi anulado no fim)` };
  }
  if (tentativa.erro?.code === SEM_PERMISSAO) {
    return { ok: true, detalhe: "recusado por falta de permissão" };
  }
  return {
    ok: false,
    detalhe: `recusado por outro motivo, por isso não prova a permissão (código ${tentativa.erro?.code ?? "desconhecido"})`,
  };
}

/**
 * @param {object} cliente um cliente pg já ligado (pool.connect())
 * @returns {Promise<Array<{ nome: string, ok: boolean, detalhe: string }>>}
 */
export async function verificarSeguranca(cliente) {
  const resultado = [];
  // A ligação TLS do pg. Se a ligação não for cifrada, é um socket normal sem getCipher.
  const stream = cliente.connection?.stream ?? {};
  const temTls = typeof stream.getCipher === "function";

  resultado.push(
    await verificar("Ligação à base de dados", async () => {
      await cliente.query("SELECT 1");
      return { ok: true, detalhe: "a base de dados respondeu" };
    }),
  );

  resultado.push(
    await verificar("Ligação cifrada (lado da app)", async () =>
      temTls
        ? { ok: true, detalhe: `${stream.getProtocol()}, cifra ${stream.getCipher()?.name}` }
        : { ok: false, detalhe: "a ligação não está cifrada" },
    ),
  );

  resultado.push(
    await verificar("Ligação cifrada (lado do servidor)", async () => {
      const { rows } = await cliente.query(
        "SELECT ssl, version, cipher FROM pg_stat_ssl WHERE pid = pg_backend_pid()",
      );
      const sessao = rows[0];
      return sessao?.ssl
        ? { ok: true, detalhe: `${sessao.version}, cifra ${sessao.cipher}` }
        : { ok: false, detalhe: "o servidor diz que esta sessão não está cifrada" };
    }),
  );

  resultado.push(
    await verificar("Certificado confirmado", async () => {
      if (!temTls) return { ok: false, detalhe: "sem cifra, não há certificado para confirmar" };
      return stream.authorized === true
        ? { ok: true, detalhe: "validado contra o DATABASE_CA_CERT" }
        : { ok: false, detalhe: `não confirmado (${stream.authorizationError ?? "motivo desconhecido"})` };
    }),
  );

  resultado.push(
    await verificar("Utilizador", async () => {
      const { rows } = await cliente.query("SELECT current_user AS utilizador");
      const utilizador = rows[0]?.utilizador;
      return utilizador === UTILIZADOR_APP
        ? { ok: true, detalhe: utilizador }
        : { ok: false, detalhe: `entrou como ${utilizador}, mas devia ser ${UTILIZADOR_APP}` };
    }),
  );

  let idDeTeste = null;
  await cliente.query("BEGIN");
  try {
    resultado.push(
      await verificar("Consegue gravar uma reserva", async () => {
        const { rows: salas } = await cliente.query("SELECT id FROM salas LIMIT 1");
        if (salas.length === 0) {
          return { ok: false, detalhe: "não há salas; corra primeiro npm run migrar" };
        }
        // Daqui a 100 anos, para nunca chocar com reservas reais.
        const tentativa = await tentarEDesfazer(
          cliente,
          `INSERT INTO reservas (sala_id, inicio, fim)
VALUES ($1, now() + interval '100 years', now() + interval '100 years 1 hour')
RETURNING id`,
          [salas[0].id],
        );
        if (!tentativa.conseguiu) return { ok: false, detalhe: mensagemSegura(tentativa.erro) };
        idDeTeste = tentativa.resultado.rows[0]?.id ?? null;
        return { ok: true, detalhe: "reserva de teste gravada (anulada no fim)" };
      }),
    );

    resultado.push(
      await verificar("Não consegue apagar a tabela de reservas (DROP)", async () =>
        avaliarBloqueio(await tentarEDesfazer(cliente, "DROP TABLE reservas"), "apagar a tabela"),
      ),
    );

    resultado.push(
      await verificar("Não consegue esvaziar a tabela de reservas (TRUNCATE)", async () =>
        avaliarBloqueio(await tentarEDesfazer(cliente, "TRUNCATE reservas"), "esvaziar a tabela"),
      ),
    );
  } finally {
    // Sempre anulada, aconteça o que acontecer.
    await cliente.query("ROLLBACK");
  }

  resultado.push(
    await verificar("Nada ficou gravado nem apagado", async () => {
      // Fora da transação: a tabela tem de continuar a existir e sem a reserva de teste.
      const { rows } = await cliente.query(
        "SELECT count(*)::int AS n FROM reservas WHERE id = $1",
        [idDeTeste ?? "00000000-0000-0000-0000-000000000000"],
      );
      return rows[0]?.n === 0
        ? { ok: true, detalhe: "a tabela continua lá e a reserva de teste não ficou gravada" }
        : { ok: false, detalhe: "a reserva de teste ficou gravada" };
    }),
  );

  return resultado;
}

export function formatarRelatorio(resultado) {
  return resultado.map((v) => `${v.ok ? "✓" : "✗"} ${v.nome}: ${v.detalhe}`).join("\n");
}
