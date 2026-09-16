/* Resgate dos aparelhos presos na V76.

   Até a V79 o service worker deste app se chamava "sw.js" e era cache-first
   para tudo — inclusive para a própria navegação. Quando o arquivo foi
   renomeado para "service-worker.js", os aparelhos que já tinham "sw.js"
   registrado ficaram órfãos: o navegador procura o arquivo antigo para
   atualizar, recebe 404, e por isso mantém o worker velho vivo para sempre.
   Resultado: esses aparelhos continuam abrindo o index.html da V76 guardado
   no cache, com um manifesto que aponta para ícones ("icone-192.png" e
   companhia) que não existem mais — e é por isso que o Chrome oferece um
   atalho genérico em vez de instalar o app.

   Este arquivo devolve um 200 nesse endereço para que o navegador consiga
   finalmente atualizar. Ele não serve nada: só limpa os caches, se
   desregistra e recarrega a página, devolvendo o aparelho ao
   "service-worker.js" atual.

   O histórico do aluno fica intacto: está em localStorage (chaves
   "classica_*"), que não é tocado por caches.delete(). */

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      for (const nome of await caches.keys()) {
        await caches.delete(nome);
      }
      await self.registration.unregister();
      // Recarrega as abas abertas para que o index.html novo seja buscado da
      // rede e registre o service worker correto.
      for (const cliente of await self.clients.matchAll({ type: "window" })) {
        cliente.navigate(cliente.url);
      }
    })(),
  );
});

// Sem "fetch": sem este handler o navegador vai direto à rede enquanto este
// worker ainda estiver ativo.
