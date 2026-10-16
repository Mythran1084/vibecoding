// Caso de uso "Listar reservas": as reservas ordenadas pelo início, cada uma
// com o nome da sala, que é o que o ecrã "As minhas reservas" mostra.
export async function listarReservas(repositorio) {
  const [salas, reservas] = await Promise.all([
    repositorio.listarSalas(),
    repositorio.listarReservas(),
  ]);
  const nomePorSala = new Map(salas.map((sala) => [sala.id, sala.nome]));

  return reservas
    .map((reserva) => ({
      ...reserva,
      nomeSala: nomePorSala.get(reserva.salaId) ?? "Sala desconhecida",
    }))
    .sort((a, b) => a.inicio - b.inicio);
}
