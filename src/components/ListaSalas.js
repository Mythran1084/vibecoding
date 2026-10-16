// Shows the rooms as cards with name, capacity and a "Reservar" button.
// The button tells the parent which room was chosen.
export default function ListaSalas({ salas, onReservar }) {
  return (
    <ul className="grid gap-4 sm:grid-cols-2">
      {salas.map((sala) => (
        <li
          key={sala.id}
          className="flex flex-col gap-4 rounded-2xl border border-gray-100 bg-white p-6 shadow-[0_8px_30px_rgba(19,41,75,0.08)]"
        >
          <div>
            <p className="text-lg font-semibold text-marinho">{sala.nome}</p>
            <p className="text-base text-marinho/70">Capacidade: {sala.capacidade} pessoas</p>
          </div>
          <button
            type="button"
            onClick={() => onReservar(sala)}
            className="h-11 w-full rounded-full bg-marca px-4 text-base font-semibold text-white hover:bg-marca-escuro"
          >
            Reservar
          </button>
        </li>
      ))}
    </ul>
  );
}
