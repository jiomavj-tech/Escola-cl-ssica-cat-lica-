#!/usr/bin/env node
/**
 * Publicação da Academia Clássica Católica.
 *
 * Mantém em sincronia as três marcas de versão do aplicativo:
 *   - version.json        → "version", "build", "published"
 *   - service-worker.js   → CACHE_NAME (sem trocar isto o celular continua
 *                           servindo a versão antiga do cache)
 *   - index.html          → o "Vnn" do <title>
 *
 * Modos:
 *   --check   Só confere. Não escreve nada. Sai com código 1 se houver erro.
 *   --sync    Alinha service-worker.js e index.html ao version.json atual.
 *   --bump    Incrementa a versão (v94 → v95), carimba a data e sincroniza.
 *
 * Opções:
 *   --versao=95              Força o número em vez de incrementar.
 *   --descricao="texto"      Texto do campo "build".
 *   --data=2026-09-16        Data de publicação (padrão: hoje em São Paulo).
 *   --json                   Imprime o resultado como JSON (usado pelo CI).
 */

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const ARQ_VERSAO = resolve(RAIZ, "version.json");
const ARQ_SW = resolve(RAIZ, "service-worker.js");
const ARQ_HTML = resolve(RAIZ, "index.html");
const PREFIXO_CACHE = "academia-classica-v";
const FUSO = "America/Sao_Paulo";

const args = process.argv.slice(2);
const temFlag = (nome) => args.includes(`--${nome}`);
const valorDe = (nome) => {
  const achado = args.find((a) => a.startsWith(`--${nome}=`));
  return achado ? achado.slice(nome.length + 3) : null;
};

const modo = temFlag("bump") ? "bump" : temFlag("sync") ? "sync" : "check";
const comoJson = temFlag("json");

const erros = [];
const avisos = [];
const mudancas = [];

/** Data de hoje (YYYY-MM-DD) no fuso de Brasília, não no UTC do runner. */
function hojeEmSaoPaulo() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: FUSO,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

/** "2026.09.15-v94" → { data: "2026-09-15", numero: 94 } */
function lerVersao(texto) {
  const m = /^(\d{4})\.(\d{2})\.(\d{2})-v(\d+)$/.exec(String(texto ?? "").trim());
  if (!m) return null;
  return { data: `${m[1]}-${m[2]}-${m[3]}`, numero: Number(m[4]) };
}

function escreverVersao(data, numero) {
  return `${data.replace(/-/g, ".")}-v${numero}`;
}

// ── version.json ────────────────────────────────────────────────────────────
if (!existsSync(ARQ_VERSAO)) {
  console.error("version.json não encontrado.");
  process.exit(1);
}

const brutoVersao = readFileSync(ARQ_VERSAO, "utf8");
let dados;
try {
  dados = JSON.parse(brutoVersao);
} catch (e) {
  console.error(`version.json não é JSON válido: ${e.message}`);
  process.exit(1);
}

const atual = lerVersao(dados.version);
if (!atual) {
  console.error(
    `version.json: "version" = ${JSON.stringify(dados.version)} não segue o formato AAAA.MM.DD-vNN.`,
  );
  process.exit(1);
}

let numero = atual.numero;
let data = atual.data;
let descricao = String(dados.build ?? "").replace(/^V\d+\s*[—–-]\s*/, "").trim();

if (modo === "bump") {
  const forcado = valorDe("versao");
  if (forcado !== null) {
    const n = Number(forcado.replace(/^v/i, ""));
    if (!Number.isInteger(n) || n <= 0) {
      console.error(`--versao=${forcado} não é um número de versão válido.`);
      process.exit(1);
    }
    numero = n;
  } else {
    numero = atual.numero + 1;
  }

  const dataPedida = valorDe("data");
  if (dataPedida !== null) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dataPedida)) {
      console.error(`--data=${dataPedida} não segue o formato AAAA-MM-DD.`);
      process.exit(1);
    }
    data = dataPedida;
  } else {
    data = hojeEmSaoPaulo();
  }

  const descPedida = valorDe("descricao");
  if (descPedida !== null && descPedida.trim()) descricao = descPedida.trim();
  if (!descricao) descricao = "Atualização do aplicativo";
}

const versaoFinal = escreverVersao(data, numero);
const buildFinal = `V${numero} — ${descricao}`;

if (modo !== "check") {
  const novo = { ...dados, version: versaoFinal, build: buildFinal, published: data };
  const texto = `${JSON.stringify(novo, null, 2)}\n`;
  if (texto !== brutoVersao) {
    writeFileSync(ARQ_VERSAO, texto);
    mudancas.push(`version.json → ${versaoFinal}`);
  }
} else {
  if (!/^V\d+\s*[—–-]/.test(String(dados.build ?? ""))) {
    avisos.push(`version.json: "build" não começa com "V${numero} — ".`);
  } else if (Number(/^V(\d+)/.exec(dados.build)[1]) !== numero) {
    erros.push(
      `version.json: "build" diz V${/^V(\d+)/.exec(dados.build)[1]} mas "version" diz v${numero}.`,
    );
  }
  if (dados.published !== atual.data) {
    avisos.push(
      `version.json: "published" (${dados.published}) difere da data em "version" (${atual.data}).`,
    );
  }
}

// ── service-worker.js ───────────────────────────────────────────────────────
const brutoSw = readFileSync(ARQ_SW, "utf8");
const mCache = /CACHE_NAME\s*=\s*"([^"]*)"/.exec(brutoSw);
if (!mCache) {
  erros.push("service-worker.js: não encontrei a constante CACHE_NAME.");
} else if (mCache[1] !== `${PREFIXO_CACHE}${numero}`) {
  if (modo === "check") {
    erros.push(
      `service-worker.js: CACHE_NAME = "${mCache[1]}" mas a versão é v${numero}. ` +
        "Sem trocar o CACHE_NAME os aparelhos continuam servindo o cache antigo.",
    );
  } else {
    writeFileSync(
      ARQ_SW,
      brutoSw.replace(mCache[0], `CACHE_NAME="${PREFIXO_CACHE}${numero}"`),
    );
    mudancas.push(`service-worker.js → CACHE_NAME="${PREFIXO_CACHE}${numero}"`);
  }
}

// Todo arquivo listado no APP_SHELL precisa existir, senão o install do SW
// falha inteiro e o app fica sem funcionar offline.
const mShell = /APP_SHELL\s*=\s*\[([\s\S]*?)\]/.exec(brutoSw);
if (mShell) {
  for (const arquivo of mShell[1].match(/"([^"]+)"/g) ?? []) {
    const caminho = arquivo.slice(1, -1).replace(/^\.\//, "");
    if (caminho === "" || caminho.endsWith("/")) continue;
    if (!existsSync(resolve(RAIZ, caminho))) {
      erros.push(`service-worker.js: APP_SHELL aponta para "${caminho}", que não existe no repositório.`);
    }
  }
}

// ── index.html ──────────────────────────────────────────────────────────────
// Só o PRIMEIRO <title> do arquivo: há outros dentro de template strings do
// gerador de provas que não podem ser tocados.
const brutoHtml = readFileSync(ARQ_HTML, "utf8");
const mTitulo = /<title>([^<]*)<\/title>/.exec(brutoHtml);
if (!mTitulo) {
  avisos.push("index.html: não encontrei a tag <title>.");
} else if (!/V\d+/.test(mTitulo[1])) {
  avisos.push(`index.html: o <title> não traz marca de versão ("${mTitulo[1]}"); deixado como está.`);
} else {
  const tituloNovo = mTitulo[1].replace(/V\d+/, `V${numero}`);
  if (tituloNovo !== mTitulo[1]) {
    if (modo === "check") {
      avisos.push(`index.html: o <title> diz ${/V\d+/.exec(mTitulo[1])[0]} mas a versão é v${numero}.`);
    } else {
      writeFileSync(
        ARQ_HTML,
        brutoHtml.replace(mTitulo[0], `<title>${tituloNovo}</title>`),
      );
      mudancas.push(`index.html → <title> ${tituloNovo}`);
    }
  }
}

if (!/rel="manifest"/.test(brutoHtml)) {
  erros.push('index.html: falta o <link rel="manifest">; o app não instala como PWA.');
}
if (!/serviceWorker/.test(brutoHtml)) {
  erros.push("index.html: o service worker não é registrado; o app não funciona offline.");
}

// ── Saída ───────────────────────────────────────────────────────────────────
if (comoJson) {
  console.log(
    JSON.stringify({
      modo,
      versao: versaoFinal,
      numero,
      build: buildFinal,
      publicado: data,
      tag: `v${numero}`,
      mudou: mudancas.length > 0,
      mudancas,
      avisos,
      erros,
    }),
  );
} else {
  console.log(`Versão: ${versaoFinal}  (${buildFinal})`);
  for (const m of mudancas) console.log(`  alterado: ${m}`);
  if (modo !== "check" && mudancas.length === 0) console.log("  nada a alterar.");
  for (const a of avisos) console.log(`  aviso: ${a}`);
  for (const e of erros) console.error(`  ERRO: ${e}`);
}

process.exit(erros.length > 0 ? 1 : 0);
