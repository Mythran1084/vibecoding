// Regra: uma reserva tem no máximo 2 horas.
// Domínio puro: sem interface, sem base de dados, sem importar outras camadas.

const DURACAO_MAXIMA_MS = 2 * 60 * 60 * 1000;

// A duração é a diferença entre os dois instantes (não as horas do relógio),
// por isso funciona também em reservas que atravessam a meia-noite.
// Usa "<=" para que 2 horas exatas sejam permitidas.
export function duracaoPermitida(reserva) {
  return reserva.fim.getTime() - reserva.inicio.getTime() <= DURACAO_MAXIMA_MS;
}
