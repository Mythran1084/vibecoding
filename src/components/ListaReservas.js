// Shows the bookings as cards with room, date, times and a "Cancelar" button.
// The button has no action yet; cancelling comes in Session 3.

// "2026-10-20" -> "20/10/2026", without Date objects so time zones can't shift the day.
function formatarData(dataIso) {
  const [ano, mes, dia] = dataIso.split("-");
  return `${dia}/${mes}/${ano}`;
}

export default function ListaReservas({ reservas }) {
  return (
    <ul className="grid gap-4 sm:grid-cols-2">
      {reservas.map((reserva) => (
        <li
          key={reserva.id}
          className="flex flex-col gap-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm"
        >
          <div>
            <p className="text-lg font-semibold text-gray-900">{reserva.nomeSala}</p>
            <p className="text-base text-gray-600">{formatarData(reserva.data)}</p>
            <p className="text-base text-gray-600">
              {reserva.horaInicio} – {reserva.horaFim}
            </p>
          </div>
          <button
            type="button"
            className="h-11 w-full rounded-lg border border-red-300 px-4 text-base font-medium text-red-700 hover:bg-red-50"
          >
            Cancelar
          </button>
        </li>
      ))}
    </ul>
  );
}
