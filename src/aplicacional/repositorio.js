// Contrato do repositório de que os casos de uso precisam.
// A camada de persistência (src/persistencia/) fornece um objeto que cumpre este
// contrato; os casos de uso recebem-no de fora e não sabem onde os dados ficam.
//
// Todos os métodos são assíncronos (devolvem uma Promise), porque a base de
// dados da Sessão 3 também o é.
//
//   listarSalas()                 -> Promise<Sala[]>
//   listarReservas()              -> Promise<Reserva[]>   todas as reservas
//   listarReservasDaSala(salaId)  -> Promise<Reserva[]>   só as dessa sala
//   guardarReserva(reserva)       -> Promise<Reserva>     devolve a reserva guardada
//
// Sala e Reserva são as entidades de src/dominio/.
export const METODOS_REPOSITORIO = [
  "listarSalas",
  "listarReservas",
  "listarReservasDaSala",
  "guardarReserva",
];
