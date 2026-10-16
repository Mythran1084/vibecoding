// Repositório em memória: cumpre o contrato de src/aplicacional/repositorio.js.
// Os dados vivem só enquanto o servidor está ligado; na Sessão 3 é substituído
// por um repositório PostgreSQL com os mesmos métodos.
export function criarRepositorioMemoria({ salas = [], reservas = [] } = {}) {
  // Cópias, para alterações às listas recebidas não mudarem o repositório.
  const salasGuardadas = [...salas];
  const reservasGuardadas = [...reservas];

  return {
    async listarSalas() {
      return [...salasGuardadas];
    },
    async listarReservas() {
      return [...reservasGuardadas];
    },
    async listarReservasDaSala(salaId) {
      return reservasGuardadas.filter((reserva) => reserva.salaId === salaId);
    },
    async guardarReserva(reserva) {
      reservasGuardadas.push(reserva);
      return reserva;
    },
  };
}
