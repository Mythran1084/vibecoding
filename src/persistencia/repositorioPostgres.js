// Repositório PostgreSQL: cumpre o contrato de src/aplicacional/repositorio.js.
// Recebe o pool do módulo de ligação segura (criarPool / obterPool em ligacao.js).
// Todas as consultas usam parâmetros ($1, $2, ...): os valores nunca são colados no SQL.
import { criarSala } from "../dominio/sala";
import { criarReserva } from "../dominio/reserva";

const COLUNAS_RESERVA = "id, sala_id, inicio, fim";

// O pg já devolve TIMESTAMPTZ como Date. Passar pelo domínio garante que os dados lidos
// são válidos e que o formato é igual ao do repositório em memória.
function paraSala(linha) {
  return criarSala({ id: linha.id, nome: linha.nome, capacidade: linha.capacidade });
}

function paraReserva(linha) {
  return criarReserva({ id: linha.id, salaId: linha.sala_id, inicio: linha.inicio, fim: linha.fim });
}

export function criarRepositorioPostgres(pool) {
  return {
    async listarSalas() {
      const { rows } = await pool.query("SELECT id, nome, capacidade FROM salas ORDER BY nome");
      return rows.map(paraSala);
    },

    async listarReservas() {
      const { rows } = await pool.query(`SELECT ${COLUNAS_RESERVA} FROM reservas ORDER BY inicio`);
      return rows.map(paraReserva);
    },

    async listarReservasDaSala(salaId) {
      const { rows } = await pool.query(
        `SELECT ${COLUNAS_RESERVA} FROM reservas WHERE sala_id = $1 ORDER BY inicio`,
        [salaId],
      );
      return rows.map(paraReserva);
    },

    async guardarReserva(reserva) {
      const { rows } = await pool.query(
        `INSERT INTO reservas (${COLUNAS_RESERVA})
VALUES ($1, $2, $3, $4)
RETURNING ${COLUNAS_RESERVA}`,
        [reserva.id, reserva.salaId, reserva.inicio, reserva.fim],
      );
      return paraReserva(rows[0]);
    },
  };
}
