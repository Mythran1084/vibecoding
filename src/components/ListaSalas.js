// Shows the rooms as cards with name, capacity and a "Reservar" button.
// The button tells the parent which room was chosen.
export default function ListaSalas({ salas, onReservar }) {
  return (
    <ul className="grid gap-4">
      {salas.map((sala) => (
        <li
          key={sala.id}
          className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-4 shadow-sm"
        >
          <div>
            <p className="font-semibold text-gray-900">{sala.nome}</p>
            <p className="text-sm text-gray-600">Capacidade: {sala.capacidade} pessoas</p>
          </div>
          <button
            type="button"
            onClick={() => onReservar(sala)}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Reservar
          </button>
        </li>
      ))}
    </ul>
  );
}
