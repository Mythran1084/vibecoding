"use server";

// Ficheiro de composição: o único sítio da apresentação que importa de src/persistencia/.
// Cria o repositório e entrega-o aos casos de uso. Tudo aqui corre só no servidor.
import { obterPool, mensagemSegura } from "../persistencia/ligacao";
import { criarRepositorioPostgres } from "../persistencia/repositorioPostgres";
import { reservarSala } from "../aplicacional/reservarSala";
import { listarSalas } from "../aplicacional/listarSalas";
import { lisboaParaUtc } from "./horaLisboa";

// O repositório só é criado quando um pedido precisa dele, e não ao carregar o ficheiro:
// assim o build (por exemplo na Vercel) não precisa do DATABASE_URL.
// O pool é partilhado entre pedidos (obterPool guarda um só por servidor).
function obterRepositorio() {
  return criarRepositorioPostgres(obterPool());
}

// Regista o problema no servidor sem segredos (os erros do pg passam por mensagemSegura).
function registarErro(contexto, erro) {
  console.error(`[${contexto}] ${erro?.code ? mensagemSegura(erro) : erro?.message}`);
}

// Salas para a página principal. Nunca lança exceções.
export async function listarSalasDaBaseDeDados() {
  try {
    const salas = await listarSalas(obterRepositorio());
    return { sucesso: true, salas };
  } catch (erro) {
    registarErro("listar salas", erro);
    return { sucesso: false, erro: "Não foi possível carregar as salas. Tente novamente mais tarde." };
  }
}

// Chamada pelo formulário de reserva (useActionState): recebe o estado anterior e os campos.
// Devolve os valores escritos, para o formulário os manter quando há erro.
export async function reservarSalaAction(_estadoAnterior, formData) {
  const valores = {
    data: String(formData.get("data") ?? ""),
    horaInicio: String(formData.get("horaInicio") ?? ""),
    horaFim: String(formData.get("horaFim") ?? ""),
  };

  let repositorio;
  try {
    repositorio = obterRepositorio();
  } catch (erro) {
    // Ex.: falta o DATABASE_URL ou o DATABASE_CA_CERT neste servidor.
    registarErro("reservar sala", erro);
    return { estado: "erro", erro: "Não foi possível fazer a reserva. Tente novamente.", valores };
  }

  const resultado = await reservarSala(repositorio, {
    // Os ids das salas na base de dados são UUID (texto).
    salaId: String(formData.get("salaId") ?? ""),
    // O formulário está em hora de Lisboa; o domínio trabalha em UTC.
    inicio: lisboaParaUtc(valores.data, valores.horaInicio),
    fim: lisboaParaUtc(valores.data, valores.horaFim),
  });

  if (!resultado.sucesso) {
    return { estado: "erro", erro: resultado.erro, valores };
  }
  return { estado: "sucesso", valores };
}
