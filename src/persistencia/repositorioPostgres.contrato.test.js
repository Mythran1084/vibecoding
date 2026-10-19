// Contrato do repositório contra o PostgreSQL real (DATABASE_URL do .env.local).
// Fica desligado até existirem o DATABASE_URL, o DATABASE_CA_CERT e o ficheiro
// repositorioPostgres.js; a partir daí corre sozinho com `npm run test`.
//
// Cada teste cria duas salas próprias ("Contrato <uuid> A/B") e apaga-as no fim,
// junto com as reservas delas. As salas e reservas reais nunca são tocadas.
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { afterAll } from "vitest";
import { testarContratoRepositorio } from "./contratoRepositorio";
import { criarPool } from "./ligacao";

const temBaseDeDados = Boolean(process.env.DATABASE_URL && process.env.DATABASE_CA_CERT);
const existeRepositorio = existsSync(
  fileURLToPath(new URL("./repositorioPostgres.js", import.meta.url)),
);
const motivo = !temBaseDeDados
  ? "falta o DATABASE_URL ou o DATABASE_CA_CERT no .env.local"
  : !existeRepositorio
    ? "ainda não existe src/persistencia/repositorioPostgres.js"
    : "";

// Só importa quando o ficheiro existe, para um erro dentro dele aparecer em vez de ser escondido.
const { criarRepositorioPostgres } =
  temBaseDeDados && existeRepositorio ? await import("./repositorioPostgres.js") : {};

// Nomes das salas de teste: só estas são apagadas, nunca as salas reais.
const NOME_DE_TESTE = /^Contrato [0-9a-f-]{36} [AB]$/;
let pool;

afterAll(async () => {
  if (!pool) return;
  // Se uma execução anterior tiver parado a meio, apaga também o que tiver ficado dela.
  const { rows } = await pool.query("SELECT id, nome FROM salas WHERE nome LIKE 'Contrato %'");
  const restos = rows.filter((sala) => NOME_DE_TESTE.test(sala.nome)).map((sala) => sala.id);
  await apagarSalasDeTeste(restos);
  await pool.end();
});

async function apagarSalasDeTeste(ids) {
  if (ids.length === 0) return;
  await pool.query("DELETE FROM reservas WHERE sala_id = ANY($1::uuid[])", [ids]);
  await pool.query("DELETE FROM salas WHERE id = ANY($1::uuid[])", [ids]);
}

testarContratoRepositorio(
  "PostgreSQL",
  async () => {
    pool ??= criarPool();
    const marca = crypto.randomUUID();
    const { rows } = await pool.query(
      "INSERT INTO salas (nome, capacidade) VALUES ($1, 4), ($2, 8) RETURNING id, nome, capacidade",
      [`Contrato ${marca} A`, `Contrato ${marca} B`],
    );
    const salas = [...rows].sort((a, b) => a.nome.localeCompare(b.nome));
    return {
      repositorio: criarRepositorioPostgres(pool),
      salas,
      limpar: () => apagarSalasDeTeste(salas.map((sala) => sala.id)),
    };
  },
  { saltar: Boolean(motivo), motivo },
);
