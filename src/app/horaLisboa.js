// Converte a data e a hora escritas no formulário (hora de Lisboa) num Date em UTC.
// Usa o fuso "Europe/Lisbon" do Intl, que já vem com o Node e o browser, para não
// depender do fuso horário do computador onde o código corre.

const formatoLisboa = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Europe/Lisbon",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

// Como esse instante aparece num relógio de Lisboa, ex.: "2026-10-20 10:00".
function relogioDeLisboa(instante) {
  const partes = Object.fromEntries(
    formatoLisboa.formatToParts(instante).map((parte) => [parte.type, parte.value]),
  );
  return `${partes.year}-${partes.month}-${partes.day} ${partes.hour}:${partes.minute}`;
}

/**
 * @param {string} data "AAAA-MM-DD"
 * @param {string} hora "HH:MM"
 * @returns {Date} o instante em UTC, ou uma data inválida se essa hora não existir em Lisboa
 */
export function lisboaParaUtc(data, hora) {
  const partesData = /^(\d{4})-(\d{2})-(\d{2})$/.exec(data ?? "");
  const partesHora = /^(\d{2}):(\d{2})$/.exec(hora ?? "");
  if (!partesData || !partesHora) return new Date(NaN);

  const [, ano, mes, dia] = partesData.map(Number);
  const [, horas, minutos] = partesHora.map(Number);
  const pedido = `${data} ${hora}`;
  const mesmaHoraEmUtc = Date.UTC(ano, mes - 1, dia, horas, minutos);

  // Lisboa está em UTC+1 no verão e UTC+0 no inverno. Experimenta primeiro o verão,
  // para que uma hora repetida no dia em que a hora recua use a primeira vez.
  for (const horasDeAvanco of [1, 0]) {
    const candidato = new Date(mesmaHoraEmUtc - horasDeAvanco * 60 * 60 * 1000);
    if (relogioDeLisboa(candidato) === pedido) return candidato;
  }

  // Nenhum candidato bate certo: a hora não existe (ex.: dia em que a hora avança, ou 30 de fevereiro).
  return new Date(NaN);
}
