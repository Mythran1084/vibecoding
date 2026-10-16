// Caso de uso "Reservar sala".
// Usa as regras do domínio e o repositório que recebe de fora (ver repositorio.js).
// Nunca lança exceções: devolve sempre { sucesso: true, reserva } ou { sucesso: false, erro }.
import { criarReserva } from "../dominio/reserva";
import { temSobreposicao } from "../dominio/sobreposicao";
import { duracaoPermitida } from "../dominio/duracao";

const ERRO_REPOSITORIO = "Não foi possível fazer a reserva. Tente novamente.";

export async function reservarSala(repositorio, { salaId, inicio, fim } = {}) {
  let reserva;
  try {
    reserva = criarReserva({ id: crypto.randomUUID(), salaId, inicio, fim });
  } catch (erro) {
    // Dados inválidos: a mensagem do domínio já é clara para o utilizador.
    return { sucesso: false, erro: erro.message };
  }

  // Verificada antes de consultar o repositório: não depende de outras reservas.
  if (!duracaoPermitida(reserva)) {
    return { sucesso: false, erro: "A reserva não pode ter mais de 2 horas" };
  }

  try {
    const salas = await repositorio.listarSalas();
    if (!salas.some((sala) => sala.id === salaId)) {
      return { sucesso: false, erro: "A sala não existe" };
    }

    const reservasDaSala = await repositorio.listarReservasDaSala(salaId);
    if (temSobreposicao(reserva, reservasDaSala)) {
      return { sucesso: false, erro: "A sala já está reservada nesse horário" };
    }

    const guardada = await repositorio.guardarReserva(reserva);
    return { sucesso: true, reserva: guardada };
  } catch {
    // Falha técnica (ex.: base de dados indisponível): não mostrar detalhes internos.
    return { sucesso: false, erro: ERRO_REPOSITORIO };
  }
}
