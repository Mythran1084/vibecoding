"use client";

// Booking form shown as a pop-up. Nothing is saved yet: submitting only closes it.
import { useEffect } from "react";

export default function FormularioReserva({ sala, onFechar }) {
  // Esc closes the form, like most pop-ups.
  useEffect(() => {
    function fecharComEsc(event) {
      if (event.key === "Escape") onFechar();
    }
    window.addEventListener("keydown", fecharComEsc);
    return () => window.removeEventListener("keydown", fecharComEsc);
  }, [onFechar]);

  function submeter(event) {
    event.preventDefault();
    onFechar();
  }

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 p-4"
      onClick={onFechar}
    >
      <form
        onSubmit={submeter}
        // Clicks inside the form must not reach the backdrop and close it.
        onClick={(event) => event.stopPropagation()}
        className="w-full max-w-sm rounded-xl bg-white p-6 text-gray-900 shadow-xl"
      >
        <h2 className="mb-5 text-xl font-semibold">Reservar {sala.nome}</h2>

        <label className="mb-1 block text-base font-medium" htmlFor="data-reserva">
          Data da reserva
        </label>
        <input
          id="data-reserva"
          type="date"
          required
          className="mb-4 h-11 w-full rounded-lg border border-gray-300 px-3 text-base"
        />

        <label className="mb-1 block text-base font-medium" htmlFor="hora-inicio">
          Hora de início
        </label>
        <input
          id="hora-inicio"
          type="time"
          required
          className="mb-4 h-11 w-full rounded-lg border border-gray-300 px-3 text-base"
        />

        <label className="mb-1 block text-base font-medium" htmlFor="hora-fim">
          Hora de fim
        </label>
        <input
          id="hora-fim"
          type="time"
          required
          className="mb-6 h-11 w-full rounded-lg border border-gray-300 px-3 text-base"
        />

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onFechar}
            className="h-11 flex-1 rounded-lg border border-gray-300 px-4 text-base font-medium hover:bg-gray-100"
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="h-11 flex-1 rounded-lg bg-blue-600 px-4 text-base font-medium text-white hover:bg-blue-700"
          >
            Confirmar
          </button>
        </div>
      </form>
    </div>
  );
}
