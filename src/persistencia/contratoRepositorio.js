// Testes de contrato do repositório: as mesmas verificações para qualquer implementação
// (em memória, PostgreSQL, ...). Só é usado pelos ficheiros *.contrato.test.js.
//
// preparar() é chamado antes de cada teste e devolve:
//   { repositorio, salas: [salaA, salaB], limpar }
// salaA e salaB são duas salas que já existem no repositório e não têm reservas.
// limpar() corre sempre no fim de cada teste e apaga os dados de teste.
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { criarReserva } from "../dominio/reserva";

export function testarContratoRepositorio(nome, preparar, { saltar = false, motivo = "" } = {}) {
  const descrever = saltar ? describe.skip : describe;

  descrever(`Contrato do repositório: ${nome}${saltar ? ` (desligado: ${motivo})` : ""}`, () => {
    let repositorio;
    let salaA;
    let salaB;
    let limpar;

    beforeEach(async () => {
      ({ repositorio, salas: [salaA, salaB], limpar } = await preparar());
    });

    afterEach(async () => {
      await limpar?.();
    });

    function novaReserva(sala, inicioIso, fimIso) {
      return criarReserva({
        id: crypto.randomUUID(),
        salaId: sala.id,
        inicio: new Date(inicioIso),
        fim: new Date(fimIso),
      });
    }

    it("lista as salas, incluindo as de teste, com nome e capacidade", async () => {
      const salas = await repositorio.listarSalas();
      for (const esperada of [salaA, salaB]) {
        const lida = salas.find((sala) => sala.id === esperada.id);
        expect(lida, `sala ${esperada.nome}`).toBeDefined();
        expect(lida.nome).toBe(esperada.nome);
        expect(lida.capacidade).toBe(esperada.capacidade);
      }
    });

    it("guardarReserva devolve a reserva guardada", async () => {
      const reserva = novaReserva(salaA, "2026-10-20T10:00:00.000Z", "2026-10-20T11:00:00.000Z");
      const guardada = await repositorio.guardarReserva(reserva);
      expect(guardada.id).toBe(reserva.id);
      expect(guardada.salaId).toBe(salaA.id);
      expect(guardada.inicio.getTime()).toBe(reserva.inicio.getTime());
      expect(guardada.fim.getTime()).toBe(reserva.fim.getTime());
    });

    it("uma reserva guardada pode ser lida outra vez", async () => {
      const reserva = novaReserva(salaA, "2026-10-20T10:00:00.000Z", "2026-10-20T11:00:00.000Z");
      await repositorio.guardarReserva(reserva);

      const lida = (await repositorio.listarReservas()).find((r) => r.id === reserva.id);
      expect(lida).toBeDefined();
      expect(lida.salaId).toBe(salaA.id);
      expect(lida.inicio.getTime()).toBe(reserva.inicio.getTime());
      expect(lida.fim.getTime()).toBe(reserva.fim.getTime());
    });

    it("listarReservasDaSala devolve só as reservas dessa sala", async () => {
      const naSalaA = novaReserva(salaA, "2026-10-20T10:00:00.000Z", "2026-10-20T11:00:00.000Z");
      const naSalaB = novaReserva(salaB, "2026-10-20T10:00:00.000Z", "2026-10-20T11:00:00.000Z");
      await repositorio.guardarReserva(naSalaA);
      await repositorio.guardarReserva(naSalaB);

      const idsDaA = (await repositorio.listarReservasDaSala(salaA.id)).map((r) => r.id);
      const idsDaB = (await repositorio.listarReservasDaSala(salaB.id)).map((r) => r.id);
      expect(idsDaA).toEqual([naSalaA.id]);
      expect(idsDaB).toEqual([naSalaB.id]);
    });

    it("uma sala sem reservas devolve uma lista vazia", async () => {
      expect(await repositorio.listarReservasDaSala(salaB.id)).toEqual([]);
    });

    // Milissegundos diferentes de zero, para apanhar arredondamentos.
    it.each([
      ["inverno (Lisboa em UTC+0)", "2026-01-15T10:00:00.123Z", "2026-01-15T11:00:00.123Z"],
      ["verão (Lisboa em UTC+1)", "2026-07-15T09:30:00.456Z", "2026-07-15T10:30:00.456Z"],
      ["hora repetida no dia em que a hora recua", "2026-10-25T00:30:00.789Z", "2026-10-25T01:30:00.789Z"],
      ["logo antes de a hora avançar", "2026-03-29T00:15:00.001Z", "2026-03-29T00:59:59.999Z"],
    ])("a hora lida é exatamente a guardada: %s", async (_descricao, inicioIso, fimIso) => {
      const reserva = novaReserva(salaA, inicioIso, fimIso);
      await repositorio.guardarReserva(reserva);

      // As duas formas de ler têm de devolver exatamente a mesma hora.
      const [daSala] = await repositorio.listarReservasDaSala(salaA.id);
      const deTodas = (await repositorio.listarReservas()).find((r) => r.id === reserva.id);
      for (const lida of [daSala, deTodas]) {
        expect(lida.inicio).toBeInstanceOf(Date);
        expect(lida.fim).toBeInstanceOf(Date);
        expect(lida.inicio.toISOString()).toBe(inicioIso);
        expect(lida.fim.toISOString()).toBe(fimIso);
      }
    });
  });
}
