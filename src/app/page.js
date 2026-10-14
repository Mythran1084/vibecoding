import Link from "next/link";
import SalasComReserva from "../components/SalasComReserva";

// Sample data fixed in the code; it will come from the database in Session 3.
const salas = [
  { id: 1, nome: "Sala Atlântico", capacidade: 8 },
  { id: 2, nome: "Sala Douro", capacidade: 4 },
  { id: 3, nome: "Sala Tejo", capacidade: 12 },
  { id: 4, nome: "Auditório", capacidade: 40 },
];

export default function Home() {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8 sm:py-12">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">Reserva de Salas</h1>
        <Link
          href="/reservas"
          className="inline-flex h-11 items-center text-base font-medium text-blue-700 hover:underline"
        >
          As minhas reservas →
        </Link>
      </div>
      <SalasComReserva salas={salas} />
    </main>
  );
}
