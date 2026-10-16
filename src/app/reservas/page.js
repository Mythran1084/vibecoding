import Cabecalho from "../../components/Cabecalho";
import ListaReservas from "../../components/ListaReservas";

// Sample data fixed in the code; it will come from the database in Session 3.
const reservas = [
  { id: 1, nomeSala: "Sala Douro", data: "2026-10-20", horaInicio: "10:00", horaFim: "11:00" },
  { id: 2, nomeSala: "Sala Atlântico", data: "2026-10-22", horaInicio: "14:30", horaFim: "16:00" },
  { id: 3, nomeSala: "Auditório", data: "2026-10-27", horaInicio: "09:00", horaFim: "11:00" },
];

export default function MinhasReservas() {
  return (
    <>
      <Cabecalho paginaAtual="reservas" />
      <main className="mx-auto w-full max-w-5xl px-4 pb-16">
        <section className="py-6 md:py-10">
          <h1 className="text-4xl font-bold text-marinho sm:text-5xl">As minhas reservas</h1>
          <p className="text-2xl font-light text-marinho sm:text-3xl">Reservas agendadas</p>
        </section>
        <ListaReservas reservas={reservas} />
      </main>
    </>
  );
}
