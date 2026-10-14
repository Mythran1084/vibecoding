import Link from "next/link";
import ListaReservas from "../../components/ListaReservas";

// Sample data fixed in the code; it will come from the database in Session 3.
const reservas = [
  { id: 1, nomeSala: "Sala Douro", data: "2026-10-20", horaInicio: "10:00", horaFim: "11:00" },
  { id: 2, nomeSala: "Sala Atlântico", data: "2026-10-22", horaInicio: "14:30", horaFim: "16:00" },
  { id: 3, nomeSala: "Auditório", data: "2026-10-27", horaInicio: "09:00", horaFim: "11:00" },
];

export default function MinhasReservas() {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8 sm:py-12">
      <Link
        href="/"
        className="mb-4 inline-flex h-11 items-center text-base font-medium text-blue-700 hover:underline"
      >
        ← Voltar às salas
      </Link>
      <h1 className="mb-6 text-2xl font-bold text-gray-900 sm:text-3xl">As minhas reservas</h1>
      <ListaReservas reservas={reservas} />
    </main>
  );
}
