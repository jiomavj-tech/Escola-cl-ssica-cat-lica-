/**
 * Deriva a descrição de uma versão a partir da mensagem do commit que
 * disparou a publicação.
 *
 * O caso que motivou este módulo: quando um pull request é mesclado, a
 * primeira linha do commit é "Merge pull request #4 from fulano/branch" —
 * inútil como descrição para quem vai ler o histórico de versões. O texto que
 * presta está no corpo, depois da linha em branco.
 */

const GENERICAS = new Set([
  "add files via upload", // envio pelo site do GitHub
  "update index.html",
  "update version.json",
  "atualização",
]);

const PADRAO = "Atualização do aplicativo";
const LIMITE = 120;

/** "Merge pull request #4 from x", "Merge branch 'main'", "Merge remote-tracking branch ..." */
function ehLinhaDeMerge(linha) {
  return /^merge (pull request #\d+ from \S+|(remote-tracking )?branch .*)$/i.test(linha.trim());
}

export function descricaoDeCommit(mensagem) {
  const linhas = String(mensagem ?? "")
    .split("\n")
    .map((l) => l.trim());

  let escolhida = linhas.find((l) => l !== "") ?? "";

  // Numa mensagem de merge, o assunto não descreve nada: vale o corpo.
  if (ehLinhaDeMerge(escolhida)) {
    const i = linhas.indexOf(escolhida);
    escolhida = linhas.slice(i + 1).find((l) => l !== "" && !ehLinhaDeMerge(l)) ?? "";
  }

  escolhida = escolhida
    .replace(/\s*\[skip ci\]\s*/gi, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!escolhida || GENERICAS.has(escolhida.toLowerCase())) return PADRAO;

  // Títulos de release muito longos ficam ilegíveis na listagem do GitHub.
  if (escolhida.length > LIMITE) {
    return escolhida.slice(0, LIMITE - 1).trimEnd() + "…";
  }
  return escolhida;
}
