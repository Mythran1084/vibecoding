// Script de migração: `npm run migrar`, na pasta do projeto.
// Corre só com o Node (sem Next.js). Lê o DATABASE_ADMIN_URL e o DATABASE_CA_CERT
// do .env.local e cria ou atualiza as tabelas, as salas de exemplo e as permissões.
// Todas as mensagens mostradas são seguras: nunca incluem o endereço, o utilizador
// nem a palavra-passe.
import { criarPool, mensagemSegura } from "./ligacao.js";
import { executarMigracao } from "./migracao.js";

function terminarComErro(mensagem) {
  console.error(`✗ ${mensagem}`);
  process.exitCode = 1;
}

try {
  process.loadEnvFile(".env.local");
} catch {
  terminarComErro(
    "Não encontrei o .env.local. Corra `npm run migrar` na pasta do projeto, onde está o .env.local.",
  );
}

if (process.exitCode !== 1 && !process.env.DATABASE_ADMIN_URL) {
  terminarComErro(
    "Falta o DATABASE_ADMIN_URL no .env.local (o endereço do utilizador administrador do Aiven). Nada foi alterado.",
  );
}

if (process.exitCode !== 1) {
  let pool;
  try {
    pool = criarPool({ databaseUrl: process.env.DATABASE_ADMIN_URL });
    const cliente = await pool.connect().catch((erro) => {
      throw new Error(`${mensagemSegura(erro)} Nada foi alterado.`);
    });
    try {
      console.log("A migrar a base de dados…");
      await executarMigracao(cliente, { registar: console.log });
      console.log("Migração concluída.");
    } finally {
      cliente.release();
    }
  } catch (erro) {
    // Os erros que chegam aqui já têm mensagens seguras (criarPool, ligação ou migração).
    terminarComErro(erro.message);
  } finally {
    await pool?.end();
  }
}
