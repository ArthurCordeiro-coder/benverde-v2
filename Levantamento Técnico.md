# Levantamento Técnico — Sistema Benverde

Você é um agente de análise de código. Sua tarefa é fazer um levantamento completo do estado atual deste projeto e gerar um relatório em Markdown que será lido por outro assistente (Claude) para continuar um trabalho de redesign de UI/arquitetura.

NÃO modifique nenhum arquivo. Apenas leia, analise e reporte.

## Saída esperada

Crie um arquivo `LEVANTAMENTO_BENVERDE.md` na raiz do projeto contendo as seções abaixo. Seja factual e específico — cite caminhos de arquivos, nomes de componentes, e trechos de código relevantes. Evite generalidades.

---

### 1. Stack e estrutura do projeto
- Framework e versão (Next.js? versão? App Router ou Pages Router?)
- Linguagem (TypeScript? JavaScript?)
- Gerenciador de pacotes (npm/pnpm/yarn/bun)
- Bibliotecas principais de UI (Tailwind? shadcn/ui? Radix? Material? CSS Modules? styled-components?)
- Bibliotecas de estado (Zustand, Redux, Context puro, React Query/TanStack, SWR?)
- Backend/API: como o frontend conversa com o backend? (Server Actions, API routes, fetch direto a backend externo, tRPC?)
- Banco de dados / ORM, se visível
- Autenticação: existe? qual lib? (NextAuth, Clerk, Supabase Auth, custom?)
- Estrutura de pastas resumida (árvore de até 3 níveis dentro de `src/` ou equivalente)

### 2. Rotas e telas existentes
Liste TODAS as rotas/páginas atuais com:
- Caminho da URL
- Caminho do arquivo
- Propósito (1 linha)
- Se é pública ou protegida
- Se tem variação mobile/desktop ou é uma só

### 3. Sistema de autenticação e perfis
- Existe distinção de perfis/roles hoje? (admin vs operador, etc)
- Se sim: como é implementada? (campo no banco, JWT claim, middleware, etc)
- Se não: o que existiria precisaria ser construído do zero?
- Como funciona o redirect pós-login hoje?

### 4. Linguagem visual atual
- Paleta de cores: liste as cores principais usadas (extraia de `tailwind.config`, variáveis CSS, ou tokens). Inclua hex/HSL.
- Tipografia: famílias de fonte usadas, escalas de tamanho
- Existe um sistema de design tokens? (cores semânticas tipo `--color-primary`, espaçamentos, raios, etc)
- Componentes reutilizáveis existentes: liste os principais em `components/` com nome e propósito
- Existe modo escuro? É o único modo? Tem toggle?

### 5. Responsividade atual
- Como o projeto trata mobile vs desktop hoje? (breakpoints Tailwind, media queries, componentes diferentes?)
- Existem componentes que claramente quebram em alguma largura? Liste os que você identificar.
- A tela de Registro de Estoque especificamente: aponte o(s) arquivo(s), descreva como ela está estruturada hoje (grid? flex? tabela? cards?), e identifique por que ela quebra no mobile.

### 6. Módulos existentes
Para cada um dos módulos abaixo, indique se EXISTE no código, em qual rota mora, e quais componentes principais o compõem:
- Início / Home (dashboard com saldo kg, metas, Mita preview)
- Estoque (visualização)
- Registro de Estoque (formulário de movimentação)
- Preços (concorrência/precificação)
- Lojas (multi-loja)
- Metas / Dashboards
- Mita (chat IA)

### 7. Fluxos de dados críticos
- Como dados de estoque são lidos e atualizados?
- Como a Mita é integrada? (API própria, OpenAI direto, Anthropic, n8n, outro?)
- Existe state global compartilhado entre telas? Como?

### 8. Débitos técnicos e dores conhecidas
Liste o que você identificar como problemático olhando o código:
- Componentes muito grandes (>300 linhas)
- Lógica de negócio misturada com UI
- Estilos inline excessivos ou duplicados
- Falta de tipagem em pontos críticos
- Qualquer TODO/FIXME/HACK explícito no código
- Inconsistências de naming, padrões, ou estrutura entre módulos similares

### 9. Anexos úteis
- Cole o conteúdo de `package.json` (apenas dependencies/devDependencies)
- Cole o conteúdo de `tailwind.config.{js,ts}` se existir
- Cole o conteúdo de qualquer arquivo `globals.css` ou equivalente que tenha tokens
- Liste o conteúdo da pasta `components/ui/` ou equivalente (só nomes de arquivo)

---

## Instruções finais
- Seja exaustivo nas seções 1, 2, 4 e 6 — são as mais importantes pro próximo passo.
- Se algo não existir, diga explicitamente "não existe" em vez de pular a seção.
- Não invente: se não conseguir determinar algo com certeza, escreva "não foi possível determinar" e explique por quê.
- Salve o arquivo final em `LEVANTAMENTO_BENVERDE.md` na raiz do projeto.