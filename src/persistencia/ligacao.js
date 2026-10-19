// Ligação ao PostgreSQL no Aiven. Só para o servidor (e para testes e scripts):
// nunca importar este ficheiro em código que corre no browser.
//
// Regras de segurança:
// - a ligação é sempre cifrada e confirma o certificado do Aiven (rejectUnauthorized: true);
// - o endereço, o utilizador e a palavra-passe nunca aparecem em mensagens nem em registos.
import pg from "pg";

const PROTOCOLOS_ACEITES = ["postgres:", "postgresql:"];

// Mensagens fixas por código de erro: nunca se mostra o texto original do pg,
// porque pode trazer o utilizador, o servidor ou o endereço.
const MENSAGENS_POR_CODIGO = {
  "28P01": "A base de dados recusou o utilizador ou a palavra-passe.",
  28000: "A base de dados recusou o utilizador ou a palavra-passe.",
  "3D000": "A base de dados indicada no DATABASE_URL não existe.",
  ENOTFOUND: "Não foi possível encontrar o servidor da base de dados.",
  EAI_AGAIN: "Não foi possível encontrar o servidor da base de dados.",
  ECONNREFUSED: "Não foi possível contactar a base de dados.",
  ETIMEDOUT: "Não foi possível contactar a base de dados.",
  ECONNRESET: "Não foi possível contactar a base de dados.",
};

const CODIGOS_DE_CERTIFICADO = [
  "SELF_SIGNED_CERT_IN_CHAIN",
  "DEPTH_ZERO_SELF_SIGNED_CERT",
  "UNABLE_TO_VERIFY_LEAF_SIGNATURE",
  "UNABLE_TO_GET_ISSUER_CERT_LOCALLY",
  "ERR_TLS_CERT_ALTNAME_INVALID",
  "CERT_HAS_EXPIRED",
];

function mensagemSegura(erro) {
  const codigo = erro?.code;
  if (CODIGOS_DE_CERTIFICADO.includes(codigo)) {
    return "Não foi possível confirmar o certificado da base de dados (verifique o DATABASE_CA_CERT).";
  }
  if (MENSAGENS_POR_CODIGO[codigo]) return MENSAGENS_POR_CODIGO[codigo];
  return `Erro na ligação à base de dados (código ${codigo ?? "desconhecido"}).`;
}

// Valida o endereço e retira os parâmetros de SSL: se lá ficassem, o pg podia usá-los
// em vez do certificado que lhe passamos.
function prepararEndereco(databaseUrl) {
  let endereco;
  try {
    endereco = new URL(databaseUrl);
  } catch {
    // Não reaproveitar o erro original: a mensagem dele inclui o endereço completo.
    throw new Error("O DATABASE_URL não é um endereço válido. A ligação não foi criada.");
  }
  if (!PROTOCOLOS_ACEITES.includes(endereco.protocol)) {
    throw new Error(
      "O DATABASE_URL tem de começar por postgres:// ou postgresql://. A ligação não foi criada.",
    );
  }
  for (const parametro of [...endereco.searchParams.keys()]) {
    if (parametro.toLowerCase().startsWith("ssl") || parametro === "uselibpqcompat") {
      endereco.searchParams.delete(parametro);
    }
  }
  return endereco.toString();
}

// O certificado é um texto com várias linhas; no .env costuma ficar numa só linha com \n.
function prepararCertificado(caCert) {
  const certificado = caCert.replaceAll("\\n", "\n").trim();
  if (!certificado.startsWith("-----BEGIN CERTIFICATE-----")) {
    throw new Error(
      "O DATABASE_CA_CERT não parece um certificado em formato PEM (deve começar por -----BEGIN CERTIFICATE-----). A ligação não foi criada.",
    );
  }
  return certificado;
}

/**
 * Cria um pool de ligações. Não liga logo: só quando for feita a primeira consulta.
 * @param {{ databaseUrl?: string, caCert?: string }} [opcoes] por omissão, DATABASE_URL e DATABASE_CA_CERT
 */
export function criarPool({
  databaseUrl = process.env.DATABASE_URL,
  caCert = process.env.DATABASE_CA_CERT,
} = {}) {
  if (!databaseUrl) {
    throw new Error(
      "Falta o DATABASE_URL: defina-o no .env.local ou passe o endereço ao módulo. A ligação não foi criada.",
    );
  }
  if (!caCert) {
    throw new Error(
      "Falta o DATABASE_CA_CERT (certificado CA do Aiven, em formato PEM): defina-o no .env.local. A ligação não foi criada.",
    );
  }

  const pool = new pg.Pool({
    connectionString: prepararEndereco(databaseUrl),
    ssl: { ca: prepararCertificado(caCert), rejectUnauthorized: true },
  });

  // Sem isto, uma ligação parada que falhe lança um erro que derruba o servidor.
  pool.on("error", (erro) => {
    console.error(`[base de dados] ${mensagemSegura(erro)}`);
  });

  return pool;
}

/**
 * Um só pool por servidor. Fica em globalThis para o recarregamento do `next dev`
 * não criar um pool novo a cada alteração.
 */
export function obterPool() {
  globalThis.__poolReservaSalas ??= criarPool();
  return globalThis.__poolReservaSalas;
}

/**
 * Confirma que a base de dados responde. Nunca lança exceções.
 * @returns {Promise<{ ok: true } | { ok: false, erro: string }>}
 */
export async function verificarLigacao(pool) {
  try {
    await pool.query("SELECT 1");
    return { ok: true };
  } catch (erro) {
    return { ok: false, erro: mensagemSegura(erro) };
  }
}
