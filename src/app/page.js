import Link from "next/link";
import Cabecalho from "../components/Cabecalho";
import SalasComReserva from "../components/SalasComReserva";
import { salas } from "./dadosExemplo";

export default function Home() {
  return (
    <>
      <Cabecalho paginaAtual="salas" />
      <main className="mx-auto w-full max-w-5xl px-4 pb-16">
        <section className="grid items-center gap-8 py-6 md:grid-cols-2 md:py-12">
          <div>
            <h1 className="text-4xl font-bold text-marinho sm:text-5xl">Reserva de Salas</h1>
            <p className="text-2xl font-light text-marinho sm:text-3xl">Simples e rápido</p>
            <p className="mt-6 max-w-md text-lg leading-relaxed text-marinho/80">
              Escolha uma sala, indique a data e o horário e faça a sua reserva em poucos
              segundos.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <a
                href="#salas"
                className="inline-flex h-12 items-center justify-center rounded-full bg-marca px-8 text-base font-semibold text-white hover:bg-marca-escuro"
              >
                Ver salas
              </a>
              <Link
                href="/reservas"
                className="inline-flex h-12 items-center justify-center rounded-full border-2 border-marca px-8 text-base font-semibold text-marca hover:bg-marca/5"
              >
                As minhas reservas
              </Link>
            </div>
          </div>

          {/* Decorative shapes, only on wider screens. */}
          <div aria-hidden="true" className="relative hidden h-72 md:block">
            <div className="absolute bottom-2 right-28 h-40 w-80 -rotate-12 rounded-[50%] bg-lima/70" />
            <div className="absolute right-8 top-4 h-64 w-64 rounded-full bg-marca" />
            <div className="absolute right-44 top-16 h-28 w-28 rounded-full bg-white/20" />
            <div className="absolute right-0 top-0 h-6 w-6 rounded-full border-2 border-marca/40" />
            <div className="absolute left-10 top-8 h-4 w-4 rounded-full border-2 border-lima" />
          </div>
        </section>

        <h2 id="salas" className="mb-4 scroll-mt-4 text-2xl font-bold text-marinho">
          Salas disponíveis
        </h2>
        <SalasComReserva salas={salas} />
      </main>
    </>
  );
}
