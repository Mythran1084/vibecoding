import Link from "next/link";

const links = [
  { id: "salas", href: "/", texto: "Salas" },
  { id: "reservas", href: "/reservas", texto: "As minhas reservas" },
];

// Top bar shared by every page: app name on the left, menu on the right.
export default function Cabecalho({ paginaAtual }) {
  return (
    <header className="mx-auto flex w-full max-w-5xl flex-wrap items-center justify-between gap-x-6 gap-y-1 px-4 py-4 sm:py-6">
      <Link href="/" className="inline-flex h-11 items-center text-2xl font-black italic tracking-tight text-marca sm:text-3xl">
        RESERVA SALAS
      </Link>
      <nav className="flex gap-2 sm:gap-6">
        {links.map((link) => {
          const ativo = link.id === paginaAtual;
          return (
            <Link
              key={link.id}
              href={link.href}
              aria-current={ativo ? "page" : undefined}
              className={`inline-flex h-11 items-center px-1 text-base font-medium ${
                ativo
                  ? "text-marca underline decoration-2 underline-offset-8"
                  : "text-marinho hover:text-marca"
              }`}
            >
              {link.texto}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
