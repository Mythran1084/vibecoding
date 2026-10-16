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
          className="flex flex-col gap-4 rounded-2xl border border-gray-100 bg-white p-6 shadow-[0_8px_30px_rgba(19,41,75,0.08)]"
        >
          <div>
            <p className="text-lg font-semibold text-marinho">{reserva.nomeSala}</p>
            <p className="text-base text-marinho/70">{formatarData(reserva.data)}</p>
            <p className="text-base text-marinho/70">
              {reserva.horaInicio} – {reserva.horaFim}
            </p>
          </div>
          <button
            type="button"
            className="h-11 w-full rounded-full border-2 border-marca px-4 text-base font-semibold text-marca hover:bg-marca/5"
          >
            Cancelar
          </button>
        </li>
      ))}
    </ul>
  );
}
