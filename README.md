# Academia Clássica Católica

Aplicativo de estudo e preparação para provas. É um PWA de um arquivo só
(`index.html`), publicado pelo GitHub Pages em
**https://jiomavj-tech.github.io/Escola-cl-ssica-cat-lica-/**

## Como publicar uma versão nova

Basta subir o arquivo. Pelo site do GitHub: **Add file › Upload files** no
`main`, arrasta o `index.html` novo e confirma. O resto é automático.

A cada envio para o `main`, a automação:

1. confere se o `index.html` chegou inteiro e se manifesto e ícones estão no lugar;
2. numera a versão (`v94` → `v95`) e carimba a data de hoje em `version.json`;
3. troca o `CACHE_NAME` do `service-worker.js` — **é isto que faz o celular de
   cada aluno baixar a versão nova em vez de continuar servindo o cache antigo**;
4. atualiza o `Vnn` do `<title>` do `index.html`;
5. comita, cria a tag `v95` e uma release com esse nome;
6. espera o GitHub Pages publicar e confere se o site no ar já responde com a
   versão nova — se em 10 minutos não responder, o workflow falha e avisa.

O commit da automação leva `[skip ci]`, então ele não dispara o processo de novo.

### Escrevendo a descrição da versão

O texto do campo `build` é o que aparece para o aluno no aviso de atualização.
Por padrão a automação usa o assunto do commit; quando o envio vem pelo site do
GitHub (mensagem "Add files via upload"), ela grava "Atualização do aplicativo".

Para escrever um texto próprio, use **Actions › Publicar nova versão › Run
workflow** e preencha a descrição — e, se quiser, um número de versão fixo.

### Definindo a versão à mão

Se você mesmo editar o `version.json` e enviar, a automação respeita o número
que você escolheu e só alinha o service worker e o título a ele.

## Rodando localmente

Precisa só do Node 20+, sem instalar nada:

```bash
node scripts/publicar.mjs --check     # confere sem alterar nada
node scripts/verificar.mjs            # confere manifesto, ícones e index.html
node scripts/publicar.mjs --sync      # alinha service worker e título ao version.json
node scripts/publicar.mjs --bump      # numera a versão seguinte e sincroniza tudo
```

Opções do `--bump`: `--versao=95`, `--descricao="texto"`, `--data=2026-09-16`.

Para abrir o app na sua máquina (um `file://` não registra service worker):

```bash
python3 -m http.server 8000   # depois abra http://localhost:8000
```

## Arquivos

| Arquivo | Para que serve |
| --- | --- |
| `index.html` | O aplicativo inteiro: conteúdo, banco de questões e código. |
| `version.json` | Versão publicada. O app compara com a que está no aparelho para avisar de atualização. |
| `service-worker.js` | Cache offline. O `CACHE_NAME` precisa mudar a cada versão. |
| `manifest.webmanifest` | Nome, cores e ícones da instalação na tela inicial. |
| `icon-*.png` | Ícones do app. |
| `sw.js` | **Não apague.** Resgata os aparelhos presos numa versão antiga — veja abaixo. |
| `scripts/` | Scripts de publicação e verificação, usados pelos workflows e à mão. |
| `.github/workflows/` | `publicar.yml` (no `main`) e `verificar.yml` (nas demais branches). |

## Por que existe um `sw.js` que não faz nada

Até a V79 o service worker se chamava `sw.js` e era *cache-first* para tudo,
inclusive para a navegação. Quando o arquivo foi renomeado para
`service-worker.js`, os aparelhos que já tinham o nome antigo registrado
ficaram presos: o navegador procura `sw.js` para atualizar, recebe 404 e por
isso mantém o worker velho vivo indefinidamente, servindo do cache o
`index.html` da V76 — com um manifesto que aponta para ícones que já não
existem. É por isso que nesses aparelhos o Chrome oferece um atalho genérico
em vez de instalar o app.

O `sw.js` de hoje devolve 200 nesse endereço só para que o navegador consiga
finalmente atualizar. Ele não serve nada: limpa os caches, se desregistra e
recarrega a página, devolvendo o aparelho ao `service-worker.js` atual. O
histórico do aluno não é afetado — fica em `localStorage`, que `caches.delete()`
não toca.

**Ele precisa continuar no repositório.** Se for apagado, volta a dar 404 e
qualquer aparelho ainda não resgatado fica preso outra vez.

Para não repetir o problema, `scripts/verificar.mjs` falha se o `index.html`
registrar um service worker cujo arquivo não exista no repositório.
