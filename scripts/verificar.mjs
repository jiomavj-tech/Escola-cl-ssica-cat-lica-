#!/usr/bin/env node
/**
 * Sanidade do aplicativo antes de publicar.
 *
 * Pega os estragos que passam despercebidos num upload pelo site do GitHub:
 * manifesto incompleto, ícone faltando, index.html truncado no meio.
 * A coerência entre version.json, service worker e título fica por conta de
 * `scripts/publicar.mjs --check`.
 */

import { readFileSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const problemas = [];
const ok = [];

// ── manifest.webmanifest ────────────────────────────────────────────────────
try {
  const manifesto = JSON.parse(readFileSync(resolve(RAIZ, "manifest.webmanifest"), "utf8"));

  const faltando = ["name", "short_name", "start_url", "scope", "display", "icons"].filter(
    (campo) => !manifesto[campo],
  );
  if (faltando.length) {
    problemas.push(`manifest.webmanifest: faltam os campos ${faltando.join(", ")}.`);
  }

  for (const icone of manifesto.icons ?? []) {
    const caminho = String(icone.src ?? "").replace(/^\.\//, "");
    if (!caminho || !existsSync(resolve(RAIZ, caminho))) {
      problemas.push(`manifest.webmanifest: o ícone "${icone.src}" não existe no repositório.`);
    }
  }

  // Sem um ícone 512 o Android recusa instalar o app na tela inicial.
  const tem512 = (manifesto.icons ?? []).some((i) => String(i.sizes ?? "").includes("512x512"));
  if (!tem512) problemas.push("manifest.webmanifest: nenhum ícone de 512x512.");

  if (!problemas.length) ok.push(`manifest.webmanifest: ${manifesto.icons.length} ícones.`);
} catch (e) {
  problemas.push(`manifest.webmanifest: ${e.message}`);
}

// ── index.html ──────────────────────────────────────────────────────────────
try {
  const html = readFileSync(resolve(RAIZ, "index.html"), "utf8");

  if (html.length < 10_000) {
    problemas.push(`index.html: só ${html.length} bytes — upload provavelmente incompleto.`);
  }
  // Upload interrompido costuma cortar o arquivo no meio de um script.
  if (!/<\/html>\s*$|<\/script>\s*$/.test(html.trimEnd())) {
    problemas.push("index.html: o arquivo não termina em </html> nem em </script> — parece truncado.");
  }

  const abre = (html.match(/<script\b/gi) ?? []).length;
  const fecha = (html.match(/<\/script>/gi) ?? []).length;
  if (abre !== fecha) {
    problemas.push(`index.html: ${abre} tags <script> abertas para ${fecha} fechadas.`);
  }

  // O arquivo do service worker precisa existir com o nome exato que o
  // index.html registra. Renomeá-lo deixa órfãos os aparelhos que já tinham o
  // nome antigo: o navegador recebe 404 ao procurar a atualização e mantém o
  // worker velho vivo, servindo a versão antiga do cache para sempre.
  const mRegistro = /navigator\.serviceWorker\.register\(\s*["'`]([^"'`]+)["'`]/.exec(html);
  if (!mRegistro) {
    problemas.push("index.html: não encontrei a chamada navigator.serviceWorker.register().");
  } else {
    const arquivoSw = mRegistro[1].replace(/^\.\//, "").split("?")[0];
    if (!existsSync(resolve(RAIZ, arquivoSw))) {
      problemas.push(
        `index.html: registra o service worker "${mRegistro[1]}", que não existe no repositório.`,
      );
    } else {
      ok.push(`index.html: registra ${arquivoSw}.`);
    }
  }

  if (!problemas.some((p) => p.startsWith("index.html"))) {
    ok.push(`index.html: ${(html.length / 1024).toFixed(0)} KB, ${abre} scripts.`);
  }
} catch (e) {
  problemas.push(`index.html: ${e.message}`);
}

for (const linha of ok) console.log(`  ok: ${linha}`);
for (const p of problemas) console.error(`  ERRO: ${p}`);
process.exit(problemas.length > 0 ? 1 : 0);
