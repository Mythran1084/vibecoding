import { criarSala } from "../dominio/sala";
import { testarContratoRepositorio } from "./contratoRepositorio";
import { criarRepositorioMemoria } from "./repositorioMemoria";

// Um repositório novo em cada teste: não há nada para apagar no fim.
testarContratoRepositorio("em memória", async () => {
  const salas = [
    criarSala({ id: "sala-contrato-a", nome: "Contrato A", capacidade: 4 }),
    criarSala({ id: "sala-contrato-b", nome: "Contrato B", capacidade: 8 }),
  ];
  return {
    repositorio: criarRepositorioMemoria({ salas }),
    salas,
    limpar: async () => {},
  };
});
