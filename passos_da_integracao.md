# Passos da Integração - Benverde Mobile

## Objetivo
Conectar as telas e componentes da versão mobile (`frontend-mobile`) aos dados reais do sistema (banco de dados/APIs do projeto principal `benverde-v2`). Faremos esse processo de forma gradual, em partes, registrando aqui cada avanço.

## Plano de Ação

- [x] **Passo 0: identificação de mobile**
  - [x] nessa etapa devesse entender que a frontend-mobile e a frontend são o mesmo sistema, então devesse estar no código um identificador de se mobile ir para a frontend mobile, se for desktop ir para a frontend

- [ ] **Passo 1: Integração da Tela Home (Dashboard)**
  - [ ] Consumir APIs para exibir os KPIs gerais (Saldo em estoque, Metas ativas, % Entrega).
  - [ ] Substituir listas "mockadas" por dados dinâmicos (Top Estoque, Top Metas Ativas).

- [ ] **Passo 2: Integração da Tela de Estoque**
  - [ ] Conectar os dados de distribuição de saldo por variedade.
  - [ ] Obter e exibir o histórico real de fluxo de movimentações (entradas/saídas).

- [ ] **Passo 3: Integração das Telas de Lojas e Detalhes**
  - [ ] Substituir o array `LOJAS` por requisições para a API real, incluindo cálculos de faturamento, status e composição das caixas e produtos de cada loja.

- [ ] **Passo 4: Integração da Tela de Preços**
  - [ ] Consumir os preços reais de concorrentes do banco de dados.
  - [ ] Tornar o modal comparativo de preços totalmente dinâmico.

- [ ] **Passo 5: Integração da Mita (IA/Chat)**
  - [ ] Conectar as interações da Mita com um endpoint real que consiga ler os dados operacionais e gerar insights precisos via LLM ou heurísticas do sistema.

## Registro de Ações Realizadas
*(Registro cronológico das ações feitas durante a integração...)*
- **Data atual:** [Passo 0 Concluído] Migração da aplicação Mobile para dentro do repositório principal (`frontend`).
  - Código mobile foi movido para `frontend/app/mobile` e `frontend/components/mobile`.
  - Criado `middleware.ts` no `frontend` que intercepta requisições de celulares (baseado em User-Agent).
  - O middleware usa `NextResponse.rewrite` para redirecionar os celulares internamente para a pasta `/mobile`, **mantendo a URL inalterada no navegador** e sendo 100% parte do mesmo sistema.
- **Data atual:** Setup do plano de ação criado. Preparando para o Passo 1.
