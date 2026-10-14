// Shows the rooms as cards with name, capacity and a "Reservar" button.
// The button tells the parent which room was chosen.
export default function ListaSalas({ salas, onReservar }) {
  return (
    <ul className="grid gap-4 sm:grid-cols-2">
      {salas.map((sala) => (
        <li
          key={sala.id}
          className="flex flex-col gap-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm"
        >
          <div>
            <p className="text-lg font-semibold text-gray-900">{sala.nome}</p>
            <p className="text-base text-gray-600">Capacidade: {sala.capacidade} pessoas</p>
          </div>
          <button
            type="button"
            onClick={() => onReservar(sala)}
            className="h-11 w-full rounded-lg bg-blue-600 px-4 text-base font-medium text-white hover:bg-blue-700"
          >
            Reservar
          </button>
        </li>
      ))}
    </ul>
  );
}
