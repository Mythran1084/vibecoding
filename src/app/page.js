import ListaSalas from "../components/ListaSalas";

// Sample data fixed in the code; it will come from the database in Session 3.
const salas = [
  { id: 1, nome: "Sala Atlântico", capacidade: 8 },
  { id: 2, nome: "Sala Douro", capacidade: 4 },
  { id: 3, nome: "Sala Tejo", capacidade: 12 },
  { id: 4, nome: "Auditório", capacidade: 40 },
];

export default function Home() {
  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-10">
      <h1 className="mb-6 text-2xl font-bold">Reserva de Salas</h1>
      <ListaSalas salas={salas} />
    </main>
  );
}
