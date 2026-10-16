"use client";

// Booking form shown as a pop-up. Submitting calls the "Reservar sala" use case
// on the server through the Server Action in src/app/actions.js.
import { useActionState, useEffect } from "react";
import { reservarSalaAction } from "../app/actions";

const ESTADO_INICIAL = { estado: "inicial" };

const classeCampo =
  "h-11 w-full rounded-lg border border-gray-300 px-3 text-base focus:border-marca focus:outline-none focus:ring-2 focus:ring-marca/30";
const classeBotaoPrincipal =
  "h-11 flex-1 rounded-full bg-marca px-4 text-base font-semibold text-white hover:bg-marca-escuro disabled:opacity-60";
const classeBotaoSecundario =
  "h-11 flex-1 rounded-full border-2 border-marca px-4 text-base font-semibold text-marca hover:bg-marca/5";

// "2026-10-20" -> "20/10/2026"
function formatarData(dataIso) {
  const [ano, mes, dia] = dataIso.split("-");
  return `${dia}/${mes}/${ano}`;
}

export default function FormularioReserva({ sala, onFechar }) {
  const [resultado, enviar, aEnviar] = useActionState(reservarSalaAction, ESTADO_INICIAL);
  // After an error the form is reset by React, so the typed values come back from the action.
  const valores = resultado.valores ?? {};

  // Esc closes the form, like most pop-ups.
  useEffect(() => {
    function fecharComEsc(event) {
      if (event.key === "Escape") onFechar();
    }
    window.addEventListener("keydown", fecharComEsc);
    return () => window.removeEventListener("keydown", fecharComEsc);
  }, [onFechar]);

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-marinho/60 p-4"
      onClick={onFechar}
    >
      <div
        // Clicks inside the pop-up must not reach the backdrop and close it.
        onClick={(event) => event.stopPropagation()}
        className="w-full max-w-sm rounded-2xl bg-white p-6 text-marinho shadow-xl"
      >
        <h2 className="mb-5 text-xl font-bold">Reservar {sala.nome}</h2>

        {resultado.estado === "sucesso" ? (
          <div>
            <p className="mb-6 rounded-lg bg-green-50 p-3 text-base text-green-800" role="status">
              Reserva confirmada: {formatarData(valores.data)}, das {valores.horaInicio} às{" "}
              {valores.horaFim}.
            </p>
            <div className="flex">
              <button type="button" onClick={onFechar} className={classeBotaoPrincipal}>
                Fechar
              </button>
            </div>
          </div>
        ) : (
          <form action={enviar}>
            <input type="hidden" name="salaId" value={sala.id} />

            <label className="mb-1 block text-base font-medium" htmlFor="data-reserva">
              Data da reserva
            </label>
            <input
              id="data-reserva"
              name="data"
              type="date"
              required
              defaultValue={valores.data}
              className={`mb-4 ${classeCampo}`}
            />

            <label className="mb-1 block text-base font-medium" htmlFor="hora-inicio">
              Hora de início
            </label>
            <input
              id="hora-inicio"
              name="horaInicio"
              type="time"
              required
              defaultValue={valores.horaInicio}
              className={`mb-4 ${classeCampo}`}
            />

            <label className="mb-1 block text-base font-medium" htmlFor="hora-fim">
              Hora de fim
            </label>
            <input
              id="hora-fim"
              name="horaFim"
              type="time"
              required
              defaultValue={valores.horaFim}
              className={`mb-6 ${classeCampo}`}
            />

            {resultado.estado === "erro" && (
              <p className="mb-4 rounded-lg bg-red-50 p-3 text-base text-red-700" role="alert">
                {resultado.erro}
              </p>
            )}

            <div className="flex gap-3">
              <button type="button" onClick={onFechar} className={classeBotaoSecundario}>
                Cancelar
              </button>
              <button type="submit" disabled={aEnviar} className={classeBotaoPrincipal}>
                {aEnviar ? "A reservar…" : "Confirmar"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
