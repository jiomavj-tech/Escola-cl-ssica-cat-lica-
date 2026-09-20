#!/usr/bin/env node
/** Testes das partes com regra de negócio própria. Roda com `node scripts/testar.mjs`. */

import { descricaoDeCommit } from "./descricao.mjs";

let falhas = 0;
function conferir(descricao, obtido, esperado) {
  if (obtido === esperado) {
    console.log(`  ok: ${descricao}`);
  } else {
    falhas++;
    console.error(`  FALHOU: ${descricao}\n    esperado: ${JSON.stringify(esperado)}\n    obtido:   ${JSON.stringify(obtido)}`);
  }
}

console.log("descricaoDeCommit:");

conferir(
  "merge de pull request usa o corpo, não o assunto",
  descricaoDeCommit("Merge pull request #4 from jiomavj-tech/claude/algo\n\nTela inicial mais curta"),
  "Tela inicial mais curta",
);
conferir(
  "merge de branch também usa o corpo",
  descricaoDeCommit("Merge branch 'main' into correcao\n\nResolve conflito no índice"),
  "Resolve conflito no índice",
);
conferir(
  "merge sem corpo cai no texto padrão",
  descricaoDeCommit("Merge pull request #7 from jiomavj-tech/claude/x"),
  "Atualização do aplicativo",
);
conferir(
  "commit comum usa a primeira linha",
  descricaoDeCommit("Corrige alternativas ilegíveis\n\nDetalhes longos aqui."),
  "Corrige alternativas ilegíveis",
);
conferir(
  "merge com squash já vem pronto",
  descricaoDeCommit("Tela de avaliação mais curta (#3)"),
  "Tela de avaliação mais curta (#3)",
);
conferir(
  "envio pelo site do GitHub vira o texto padrão",
  descricaoDeCommit("Add files via upload"),
  "Atualização do aplicativo",
);
conferir("mensagem vazia vira o texto padrão", descricaoDeCommit(""), "Atualização do aplicativo");
conferir("mensagem ausente vira o texto padrão", descricaoDeCommit(undefined), "Atualização do aplicativo");
conferir(
  "[skip ci] não vaza para a descrição",
  descricaoDeCommit("Publica V99 [skip ci]"),
  "Publica V99",
);
conferir(
  "título muito longo é encurtado",
  descricaoDeCommit("x".repeat(200)),
  "x".repeat(119) + "…",
);
conferir(
  "linhas em branco antes do texto não atrapalham",
  descricaoDeCommit("\n\n  Ajuste pontual  \n"),
  "Ajuste pontual",
);

console.log(falhas ? `\n${falhas} teste(s) falharam.` : "\nTodos os testes passaram.");
process.exit(falhas ? 1 : 0);
