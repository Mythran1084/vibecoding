// Regra: uma sala não pode ter duas reservas sobrepostas.
// Domínio puro: sem interface, sem base de dados, sem importar outras camadas.

// Duas reservas colidem quando cada uma começa antes de a outra acabar.
// Usa "<" e não "<=", para que reservas seguidas (10:00–11:00 e 11:00–12:00) sejam permitidas.
function colidem(a, b) {
  return a.inicio < b.fim && b.inicio < a.fim;
}

export function temSobreposicao(novaReserva, reservasExistentes) {
  return reservasExistentes.some(
    (existente) => existente.salaId === novaReserva.salaId && colidem(novaReserva, existente),
  );
}
