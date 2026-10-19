// Migração da base de dados: cria as tabelas, as salas de exemplo e as permissões
// do utilizador da app. Pode correr várias vezes: cada passo só faz o que falta.
// Corre com o utilizador administrador (DATABASE_ADMIN_URL), através de `npm run migrar`.
import { mensagemSegura } from "./ligacao.js";

// Utilizador com que a app se liga (DATABASE_URL). É criado na consola do Aiven,
// para a palavra-passe nunca passar por este script.
export const UTILIZADOR_APP = "app_reservas";

export const PASSOS = [
  {
    nome: "ativar a extensão btree_gist (necessária para impedir sobreposições)",
    sql: "CREATE EXTENSION IF NOT EXISTS btree_gist",
  },
  {
    nome: "criar a tabela salas",
    sql: `CREATE TABLE IF NOT EXISTS salas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL UNIQUE CHECK (btrim(nome) <> ''),
  capacidade integer NOT NULL CHECK (capacidade >= 1)
)`,
  },
  {
    // '[)' = o fim não conta: 10:00–11:00 e 11:00–12:00 não se sobrepõem, como no domínio.
    nome: "criar a tabela reservas",
    sql: `CREATE TABLE IF NOT EXISTS reservas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sala_id uuid NOT NULL REFERENCES salas (id) ON DELETE RESTRICT,
  inicio timestamptz NOT NULL,
  fim timestamptz NOT NULL,
  CONSTRAINT reservas_fim_depois_do_inicio CHECK (fim > inicio),
  CONSTRAINT reservas_sem_sobreposicao EXCLUDE USING gist (sala_id WITH =, tstzrange(inicio, fim, '[)') WITH &&)
)`,
  },
  {
    nome: "inserir as salas de exemplo (Sala A, Sala B, Sala C)",
    sql: `INSERT INTO salas (nome, capacidade) VALUES
  ('Sala A', 4),
  ('Sala B', 8),
  ('Sala C', 12)
ON CONFLICT (nome) DO NOTHING`,
  },
  {
    nome: "impedir que outros utilizadores criem objetos no schema public",
    sql: "REVOKE CREATE ON SCHEMA public FROM PUBLIC",
  },
  {
    // O nome da base de dados não é fixo, por isso usa-se current_database().
    nome: "impedir que outros utilizadores criem tabelas temporárias",
    sql: `DO $$ BEGIN
  EXECUTE format('REVOKE TEMPORARY ON DATABASE %I FROM PUBLIC', current_database());
END $$`,
  },
  {
    nome: `permitir que o ${UTILIZADOR_APP} se ligue à base de dados`,
    sql: `DO $$ BEGIN
  EXECUTE format('GRANT CONNECT ON DATABASE %I TO ${UTILIZADOR_APP}', current_database());
END $$`,
  },
  {
    nome: `permitir que o ${UTILIZADOR_APP} use o schema public`,
    sql: `GRANT USAGE ON SCHEMA public TO ${UTILIZADOR_APP}`,
  },
  {
    nome: `retirar ao ${UTILIZADOR_APP} permissões antigas nas tabelas`,
    sql: `REVOKE ALL ON salas, reservas FROM ${UTILIZADOR_APP}`,
  },
  {
    nome: `dar ao ${UTILIZADOR_APP} só leitura, inserção, alteração e apagamento`,
    sql: `GRANT SELECT, INSERT, UPDATE, DELETE ON salas, reservas TO ${UTILIZADOR_APP}`,
  },
];

/**
 * Corre todos os passos numa transação: ou ficam todos feitos, ou nenhum.
 * As mensagens de erro só dizem o passo e o código do erro, nunca o texto do pg.
 * @param {{ query: Function }} cliente um cliente pg já ligado (pool.connect())
 * @param {{ registar?: (texto: string) => void }} [opcoes]
 */
export async function executarMigracao(cliente, { registar = () => {} } = {}) {
  await cliente.query("BEGIN");
  let passoAtual = `confirmar que o utilizador ${UTILIZADOR_APP} existe`;
  try {
    const { rows } = await cliente.query("SELECT 1 AS existe FROM pg_roles WHERE rolname = $1", [
      UTILIZADOR_APP,
    ]);
    if (rows.length === 0) {
      await cliente.query("ROLLBACK");
      throw new ErroDeMigracao(
        `O utilizador ${UTILIZADOR_APP} não existe. Crie-o na consola do Aiven (separador Users) e corra de novo. Nada foi alterado.`,
      );
    }

    for (const passo of PASSOS) {
      passoAtual = passo.nome;
      await cliente.query(passo.sql);
      registar(`✓ ${passo.nome}`);
    }
    await cliente.query("COMMIT");
  } catch (erro) {
    if (erro instanceof ErroDeMigracao) throw erro;
    await cliente.query("ROLLBACK").catch(() => {});
    throw new ErroDeMigracao(
      `Falhou o passo "${passoAtual}": ${mensagemSegura(erro)} Nada foi alterado.`,
    );
  }
}

// Erro com uma mensagem já segura para mostrar (sem endereço, utilizador nem palavra-passe).
class ErroDeMigracao extends Error {}
