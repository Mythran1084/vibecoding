// Só para testes: persistência simulada com arrays, que cumpre o contrato de repositorio.js.
// reservasGuardadas fica exposto para os testes verificarem o que foi guardado.
export function criarRepositorioFalso({ salas = [], reservas = [] } = {}) {
  const reservasGuardadas = [...reservas];
  return {
    reservasGuardadas,
    async listarSalas() {
      return [...salas];
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
