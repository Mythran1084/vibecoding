// Verificação de segurança: `npm run verificar-ligacao`, na pasta do projeto.
// Corre só com o Node (sem Next.js). Liga com o DATABASE_URL e o DATABASE_CA_CERT do
// .env.local e mostra se a ligação está cifrada, se o certificado foi confirmado, com que
// utilizador entrou e o que esse utilizador pode fazer. Nada fica gravado nem apagado.
// Nunca mostra o endereço nem a palavra-passe.
import { criarPool, mensagemSegura } from "./ligacao.js";
import { verificarSeguranca, formatarRelatorio } from "./verificacao.js";

// Erros do pg (têm code) podem trazer segredos no texto; os nossos (criarPool) já são seguros.
function textoSeguro(erro) {
  return erro?.code ? mensagemSegura(erro) : erro.message;
}

function terminarComErro(mensagem) {
  console.error(`✗ ${mensagem}`);
  process.exitCode = 1;
}

try {
  process.loadEnvFile(".env.local");
} catch {
  terminarComErro(
    "Não encontrei o .env.local. Corra `npm run verificar-ligacao` na pasta do projeto, onde está o .env.local.",
  );
}

if (process.exitCode !== 1) {
  let pool;
  try {
    pool = criarPool();
    const cliente = await pool.connect();
    try {
      console.log("A verificar a ligação (tudo o que for gravado é anulado no fim)…");
      const resultado = await verificarSeguranca(cliente);
      console.log(formatarRelatorio(resultado));
      if (resultado.every((v) => v.ok)) {
        console.log("Ligação segura: todas as verificações passaram.");
      } else {
        terminarComErro("Há verificações que falharam (ver acima).");
      }
    } finally {
      cliente.release();
    }
  } catch (erro) {
    terminarComErro(`${textoSeguro(erro)} Nada foi alterado.`);
  } finally {
    await pool?.end();
  }
}
