# Relatório de Levantamento Técnico — Sistema Benverde

## 1. Stack e Estrutura do Projeto
- **Framework e Versão**: Next.js (versão `16.2.1` no `package.json`, possivelmente Next.js 14/15 atualizado) utilizando a arquitetura **App Router** (todo o código está dentro de `frontend/app/`).
- **Linguagem**: TypeScript.
- **Gerenciador de Pacotes**: npm (evidenciado pela presença de `package-lock.json`).
- **Bibliotecas Principais de UI**: Tailwind CSS (`tailwindcss`) e Lucide React para ícones (`lucide-react`). Não foi identificada a presença de bibliotecas de componentes prontos como shadcn/ui, Radix ou Material UI na listagem de dependências, indicando que os componentes e estilos são construídos manualmente com Tailwind.
- **Bibliotecas de Estado**: Nenhuma biblioteca externa de gerenciamento de estado (Redux, Zustand, React Query) foi encontrada. O estado é gerido utilizando Contexto React puro e hooks padrão (`useState`, `useEffect`).
- **Backend/API**: O frontend conversa com o backend através de **API Routes** do próprio Next.js (`frontend/app/api/...`), consumindo os endpoints via `axios` configurado de forma customizada em `frontend/lib/api.ts` e com as lógicas de negócio concentradas em `frontend/lib/server/`.
- **Banco de Dados / ORM**: Utiliza Postgres serverless hospedado no Neon (`@neondatabase/serverless`). **Não há uso de ORM** (Prisma, Drizzle, etc.). As consultas são feitas diretamente com SQL bruto via chamadas à função `getClient().query()` em `frontend/lib/server/db.ts`.
- **Autenticação**: É uma solução **customizada**. Utiliza as tabelas `users` e `pending` do banco Postgres, criptografando senhas com salt. Os tokens de sessão são geridos manualmente via cookies (JWT) com lógica concentrada em `frontend/lib/server/auth.ts` e `session-token.ts`.
- **Estrutura de Pastas Resumida**:
  ```
  frontend/
  ├── app/
  │   ├── api/          (Rotas de API do backend)
  │   ├── dashboard/    (Telas protegidas da versão Desktop)
  │   ├── login/        (Telas de autenticação)
  │   └── mobile/       (SPA contendo todas as telas da versão Mobile)
  ├── components/
  │   └── mobile/       (Componentes específicos do Mobile)
  └── lib/
      ├── dashboard/    (Lógica e validações para interface)
      └── server/       (Regras de negócio, consultas SQL, APIs externas)
  ```

---

## 2. Rotas e Telas Existentes

### Rotas Desktop (Protegidas pelo `DesktopOnlyGate`)
- **Painel Principal**: `/dashboard` -> `frontend/app/dashboard/page.tsx` (Protegida)
- **Estoque de Bananas**: `/dashboard/estoque` -> `frontend/app/dashboard/estoque/page.tsx` (Protegida)
- **Caixas das Lojas**: `/dashboard/caixas` -> `frontend/app/dashboard/caixas/page.tsx` (Protegida)
- **Preços Concorrentes**: `/dashboard/precos` -> `frontend/app/dashboard/precos/page.tsx` (Protegida)
- **Lojas**: `/dashboard/lojas` -> `frontend/app/dashboard/lojas/page.tsx` (Protegida)
- **Mita AI**: `/dashboard/mita-ai` -> `frontend/app/dashboard/mita-ai/page.tsx` (Protegida)

### Rotas Mobile (Single Page Application)
- **SPA Mobile**: `/mobile` -> `frontend/app/mobile/page.tsx` (Protegida). A rota funciona como um SPA controlando os estados das telas (Home, Estoque, Preços, Lojas, Detalhe, Mita).

### Rotas Públicas
- **Login**: `/login` -> `frontend/app/login/page.tsx` (Pública)
- **Criar Conta**: `/login/criar-conta` -> `frontend/app/login/criar-conta/page.tsx` (Pública)

---

## 3. Sistema de Autenticação e Perfis
- **Distinção de Perfis/Roles?**: Sim, existe. Os usuários possuem um campo `role` (`admin` ou `operacional`) e `is_admin` (booleano) na tabela `users` do banco de dados, além de um campo `funcionalidade` que define escopos de acesso.
- **Implementação**: Implementado por validação de Token JWT customizado armazenado nos cookies (`session-token.ts`). O middleware (`frontend/proxy.ts`) intercepta as requisições e verifica o token. A interface de layout desktop (`app/dashboard/layout.tsx`) carrega a rota `/api/me` para definir a visibilidade dos menus administrativos dependendo se o usuário for `admin`.
- **Redirect pós-login**: Se o usuário acessa uma rota protegida sem estar logado, o middleware o envia para `/login`. Ao logar, a rota `/api/me` retorna a funcionalidade autorizada do usuário, e a aplicação o direciona para a página permitida via a função `getDefaultDashboardPath` (por padrão, `/dashboard` ou a respectiva área de operação).

---

## 4. Linguagem Visual Atual
- **Paleta de Cores**:
  - `benverde.base`: `#0b1f15` (Fundo Base)
  - `benverde.dark`: `#07140e` (Fundo Escuro)
  - `benverde.accent`: `#34d399` (Verde Destaque / Emerald 400)
- **Tipografia**: `Space Grotesk` (definida via CSS global em `mobile.css`) e provável fonte sem serifa padrão do Tailwind (`Inter` ou padrão do sistema).
- **Design Tokens**: **Não existe** um sistema robusto de tokens semânticos estruturados (ex: var(--primary)). As cores estão mapeadas no `tailwind.config.ts`, e todo o restante (raios de borda, sombras glassmorphism, etc) é composto usando as "utility classes" diretamente nos componentes.
- **Componentes Reutilizáveis**: Muito escassos no desktop. No mobile, foram criados alguns componentes dentro de `frontend/components/mobile/` (`ui.tsx`, `icons.tsx`, `screens/...`). Na aplicação web desktop, as views (como cards) são definidas e extraídas como funções menores dentro da própria página, ex: `GlassCard` em `EstoquePage`.
- **Modo Escuro**: **É o único modo existente**. Há um bloqueio rígido `color-scheme: dark` em `globals.css` e os backgrounds todos puxam tons bem fechados e verdes degradês (Dark Mode Native). Não há toggle.

---

## 5. Responsividade Atual
- **Mobile vs Desktop**: Há uma **separação drástica de frontend** (comportamental). Ao invés de ser totalmente responsivo utilizando breakpoints, o middleware (`frontend/proxy.ts`) detecta o `user-agent` e força o redirecionamento dos aparelhos mobile para a URL `/mobile`. As views de desktop não são exibidas no mobile através do invólucro do componente `<DesktopOnlyGate>`.
- **Registro de Estoque**: A tela de Estoque (`frontend/app/dashboard/estoque/page.tsx`) foi estruturada baseada em grids (`grid-cols-3`, `grid-cols-2`) e modais largos (`max-w-xl` ou mais). Ela acaba quebrando num celular pois o layout do modal sobreposto, as extensas tabelas de dados ("Fluxo de Movimentação") e a falta de breakpoints fluidos causam sobreposição em ecrãs pequenos. Por isso, a solução adotada recentemente no código foi uma reescrita paralela completa para mobile consumindo a mesma API, ao invés de adequar os grids do desktop.

---

## 6. Módulos Existentes
- **Início / Home**: **EXISTE**. (Desktop em `/dashboard` e Mobile em `ScreenHome`).
- **Estoque (Visualização)**: **EXISTE**. (Desktop em `/dashboard/estoque` e Mobile em `ScreenEstoque`).
- **Registro de Estoque (Formulário)**: **EXISTE**. Em Desktop é implementado como um modal (estado `modalAberto`) renderizado dentro do componente `EstoquePage`.
- **Preços (Concorrência)**: **EXISTE**. (Desktop em `/dashboard/precos` e Mobile em `ScreenPrecos`).
- **Lojas (Multi-loja)**: **EXISTE**. (Desktop em `/dashboard/lojas` e Mobile em `ScreenLojas` com toggle de agrupamento).
- **Metas / Dashboards**: **EXISTE**. A tabela `metas_local` existe e as APIs as manipulam, e são usadas para preencher as visões do `dashboard`.
- **Mita (Chat IA)**: **EXISTE**. (Integração na rota `/api/mita-ai/chat`, interface com botão de toggle fixo nas telas e view específica no mobile).

---

## 7. Fluxos de Dados Críticos
- **Estoque (Leitura e Atualização)**: O frontend carrega o saldo requisitando o endpoint `/api/estoque/saldo` via `axios`. Quando salva uma entrada/saída, a requisição em POST vai para `/api/estoque/movimentacao`, o banco Neon recebe o registro via instrução SQL executada em `lib/server/estoque.ts` e a view refaz o fetch via React effect (estado é recalibrado).
- **Mita (Integração IA)**: Integrada utilizando chamadas diretas nativas pela API REST da **X.AI (Grok)**. Em `frontend/lib/server/mita.ts`, o backend constrói o prompt, varre as seções de bancos de dados solicitadas, formata tudo no `MITA_SYSTEM_PROMPT` e injeta a call para `https://api.x.ai/v1/chat/completions` sob o modelo `grok-4-1-fast-reasoning`.
- **State Global**: **Não existe**. Cada tela de Desktop e o entrypoint principal do Mobile buscam os dados de forma isolada ao montar os componentes. O compartilhamento de "sessão" ocorre pelo payload da decodificação do cookie ao iniciar a tela.

---

## 8. Débitos Técnicos e Dores Conhecidas
- **Tamanho dos Componentes**: Telas monobloco. O arquivo `frontend/app/dashboard/estoque/page.tsx` possui quase **1000 linhas de código**, contendo desde o layout principal até modais secundários, funções embutidas, estado de formulário, exportação de canvas, entre outros.
- **Lógica de negócio misturada com UI**: Formatações intensas, cálculos de ranqueamento, e reduções de histórico ficam processadas nos próprios `useMemo` na UI. Além disso, existe chamadas API explícitas acopladas aos manipuladores dos botões (`onClick`).
- **Estilos inline / Classes de UI Extensas**: As strings do `className` da Tailwind são repetitivas e quilométricas. Exemplo: um botão contém sempre classes como `flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-500/10 px-5 py-2.5 text-sm font-semibold text-emerald-200 transition-all hover:bg-emerald-500/20`, evidenciando a falta de bibliotecas base e centralização (cui/design tokens).
- **Separação Abrupta de Aplicações**: O uso de um SPA (Single Page Application) com roteamento falso via componente root `App()` dentro da pasta Next.js para aparelhos móveis (e não usar rotas reais) anula o propósito nativo do Next.js App Router (como o SEO, link loading, caching eficiente) além de causar redundância de lógica visual.

---

## 9. Anexos Úteis

### `package.json`
```json
{
  "dependencies": {
    "@neondatabase/serverless": "^1.0.2",
    "@vercel/speed-insights": "^1.3.1",
    "axios": "^1.13.6",
    "clsx": "^2.1.1",
    "date-fns": "^4.1.0",
    "html2canvas": "^1.4.1",
    "lucide-react": "^1.7.0",
    "next": "^16.2.1",
    "react": "^19.2.4",
    "react-dom": "^19.2.4",
    "recharts": "^3.8.1",
    "tailwind-merge": "^3.5.0",
    "xlsx": "^0.18.5"
  },
  "devDependencies": {
    "@types/node": "^25.5.0",
    "@types/react": "^19.2.14",
    "@types/react-dom": "^19.2.3",
    "autoprefixer": "^10.4.20",
    "eslint": "^9.39.1",
    "eslint-config-next": "^16.2.1",
    "tailwindcss": "^3.4.17",
    "typescript": "^5.9.3"
  }
}
```

### `tailwind.config.ts`
```typescript
import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{js,ts,jsx,tsx}", "./components/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        benverde: {
          base: "#0b1f15",
          dark: "#07140e",
          accent: "#34d399",
        },
      },
    },
  },
  plugins: [],
};

export default config;
```

### `app/globals.css`
```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    color-scheme: dark;
  }

  body {
    min-height: 100vh;
    background:
      radial-gradient(circle at top, rgba(52, 211, 153, 0.12), transparent 32%),
      linear-gradient(180deg, #07140e 0%, #0b1f15 48%, #06100b 100%);
  }
}
```

### Componentes (Não há diretório focado em UI como `components/ui/`)
- A pasta `frontend/components/` contém apenas:
  - `DesktopOnlyGate.tsx`
  - `/mobile/icons.tsx`
  - `/mobile/ui.tsx`
  - `/mobile/screens/...` (Telas separadas em componentes)
