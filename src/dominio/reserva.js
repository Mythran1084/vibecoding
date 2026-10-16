// Reserva: uma sala ocupada entre um início e um fim (Date em UTC).
// Domínio puro: sem interface, sem base de dados, sem importar outras camadas.
// As regras de negócio (fim depois do início, máximo 2 horas, sem sobreposições)
// ficam em ficheiros próprios.

function eDataValida(valor) {
  return valor instanceof Date && !Number.isNaN(valor.getTime());
}

export function criarReserva({ id, salaId, inicio, fim }) {
  if (id === undefined || id === null) {
    throw new Error("A reserva precisa de um id");
  }
  if (salaId === undefined || salaId === null) {
    throw new Error("A reserva precisa de uma sala (salaId)");
  }
  if (!eDataValida(inicio)) {
    throw new Error("O início tem de ser uma data válida");
  }
  if (!eDataValida(fim)) {
    throw new Error("O fim tem de ser uma data válida");
  }
  // Cópias: se quem chamou alterar as suas datas depois, a reserva não muda.
  return Object.freeze({
    id,
    salaId,
    inicio: new Date(inicio.getTime()),
    fim: new Date(fim.getTime()),
  });
}
