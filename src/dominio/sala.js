// Sala: um espaço que pode ser reservado.
// Domínio puro: sem interface, sem base de dados, sem importar outras camadas.
export function criarSala({ id, nome, capacidade }) {
  if (id === undefined || id === null) {
    throw new Error("A sala precisa de um id");
  }
  if (typeof nome !== "string" || nome.trim() === "") {
    throw new Error("A sala precisa de um nome");
  }
  if (!Number.isInteger(capacidade) || capacidade < 1) {
    throw new Error("A capacidade tem de ser um número inteiro maior ou igual a 1");
  }
  return Object.freeze({ id, nome, capacidade });
}
