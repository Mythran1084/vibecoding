"use server";

// Ficheiro de composição: o único sítio da apresentação que importa de src/persistencia/.
// Cria o repositório e entrega-o aos casos de uso. Tudo aqui corre só no servidor.
import { criarRepositorioMemoria } from "../persistencia/repositorioMemoria";
import { reservarSala } from "../aplicacional/reservarSala";
import { salas } from "./dadosExemplo";
import { lisboaParaUtc } from "./horaLisboa";

// Um só repositório enquanto o servidor estiver ligado; as reservas perdem-se ao reiniciar.
const repositorio = criarRepositorioMemoria({ salas });

// Chamada pelo formulário de reserva (useActionState): recebe o estado anterior e os campos.
// Devolve os valores escritos, para o formulário os manter quando há erro.
export async function reservarSalaAction(_estadoAnterior, formData) {
  const valores = {
    data: String(formData.get("data") ?? ""),
    horaInicio: String(formData.get("horaInicio") ?? ""),
    horaFim: String(formData.get("horaFim") ?? ""),
  };

  const resultado = await reservarSala(repositorio, {
    salaId: Number(formData.get("salaId")),
    // O formulário está em hora de Lisboa; o domínio trabalha em UTC.
    inicio: lisboaParaUtc(valores.data, valores.horaInicio),
    fim: lisboaParaUtc(valores.data, valores.horaFim),
  });

  if (!resultado.sucesso) {
    return { estado: "erro", erro: resultado.erro, valores };
  }
  return { estado: "sucesso", valores };
}
