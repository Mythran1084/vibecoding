"use client";

// Remembers which room's "Reservar" was clicked and shows the form for it.
import { useCallback, useState } from "react";
import ListaSalas from "./ListaSalas";
import FormularioReserva from "./FormularioReserva";

export default function SalasComReserva({ salas }) {
  const [salaEscolhida, setSalaEscolhida] = useState(null);
  const fecharFormulario = useCallback(() => setSalaEscolhida(null), []);

  return (
    <>
      <ListaSalas salas={salas} onReservar={setSalaEscolhida} />
      {salaEscolhida && (
        <FormularioReserva sala={salaEscolhida} onFechar={fecharFormulario} />
      )}
    </>
  );
}
