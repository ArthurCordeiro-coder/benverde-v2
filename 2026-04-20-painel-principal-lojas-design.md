# Design — Painel Principal e Página de Lojas

**Data:** 2026-04-20
**Projeto:** Benverde Management System
**Escopo:** Redesign do painel "Resumo e Metas" → Painel Principal + nova Página de Lojas

---

## 1. Contexto

O sistema Benverde possui atualmente um painel chamado "Resumo e Metas". Este design o transforma no **Painel Principal** e cria uma **Página de Lojas** separada, com navegação até o detalhe de cada unidade.

### O que já está pronto
- Tabela de Metas (funcional no sistema)
- Chat Mita (funcional no sistema, será reposicionado)
- Cards de Resumo (funcional no sistema)
- Código dos 8 widgets (pronto, ainda não integrado ao sistema)

### O que será construído do zero
- Layout do Painel Principal (reorganização + integração dos widgets)
- Página de Lojas (nova)
- Página de Detalhe de Loja (nova)
- Lógica de grupos geográficos (dado + interface)

---

## 2. Arquitetura de Páginas

```
Benverde
├── Painel Principal        ← redesign do "Resumo e Metas"
├── Lojas                   ← nova página
│   └── Detalhe da Loja     ← nova página (abre ao clicar em uma loja)
└── (demais páginas existentes, sem alteração)
```

---

## 3. Painel Principal

### 3.1 Linha 1 — Cards de Resumo
Três cards de métrica lado a lado, layout horizontal:

| Card | Valor exibido |
|---|---|
| Saldo de Estoque | Número inteiro |
| Metas Ativas | Número inteiro |
| Média de Entrega | Número decimal + unidade (dias) |

### 3.2 Linha 2 — Botões de Ação
Dois botões abaixo dos cards:

| Botão | Comportamento |
|---|---|
| **Tabela de Metas** | Abre a tabela existente. Cabeçalho da tabela terá: **Importar Meta** (esquerda) e **Exportar Tabela** (direita) |
| **Chat Mita** | Abre o chat existente. Removido da barra lateral — acessível apenas por este botão |

### 3.3 Grid de Widgets
Layout em 2 colunas. Widgets agrupados em pares, com dois ocupando largura total:

| Posição | Widget | Formato |
|---|---|---|
| Col 1 | Volume de Caixas | Tabela — `Loja`, `Caixas` |
| Col 2 | Maiores Valores Unitários | Tabela top 3 — `Produto`, `Preço Médio` |
| Largura total | Volume de Compras | Gráfico — top 5 lojas |
| Col 1 | Top 5 Produtos | Tabela — `Produto`, `Qtd`, `Valor Total` |
| Col 2 | Progresso de Metas | Tabela top 5 — `Produto`, `Progresso` |
| Col 1 | Estoque de Banana | Gráfico de pizza — fração do estoque |
| Col 2 | Mais Baratos por Categoria | Tabela — `Categoria`, `Local`, `Média` |
| Largura total | Comparativo de Mercado | Gráfico de linha — Nós x Mercado (varia por login) |

**Regra de layout:** todos os widgets ficam na mesma página com scroll. Não há abas, colapsáveis ou filtros de visão/métrica.

---

## 4. Página de Lojas

### 4.1 Navegação por modo
Dois botões no topo que alternam a visão (apenas um ativo por vez):

- **Lojas** — exibe todas as unidades individualmente
- **Grupos Geográficos** — exibe os grupos de lojas por região

### 4.2 Modo: Lojas
Grid de blocos, cada bloco exibe:
- Número da loja (ex: `#01`)
- Cidade

### 4.3 Modo: Grupos Geográficos
Grid de blocos, cada bloco exibe:
- Nome do grupo (ex: "Alto Tietê")
- Quantidade de lojas no grupo

**Nota:** lojas sem região atribuída ("órfãs") não aparecem na visão de Grupos Geográficos. Os dados de região precisam ser criados — não existem no sistema atualmente.

### 4.4 Interação
- Clicar em um bloco de **loja** abre a Página de Detalhe com os dados individuais daquela unidade.
- Clicar em um bloco de **grupo** abre a Página de Detalhe com a **soma agregada** dos dados de todas as lojas pertencentes ao grupo. O layout da página é o mesmo para loja e grupo.
- Seleção múltipla não é suportada em nenhum dos modos.

---

## 5. Página de Detalhe de Loja

### 5.1 Navegação e cabeçalho
A Página de Detalhe é uma **página única com estado dinâmico** — não deve usar URLs individuais por loja (ex: `/loja/01`). A navegação é controlada por estado interno da aplicação (ex: `st.session_state` no Streamlit). O botão "← Voltar" limpa o estado e retorna à listagem.

- Botão "← Voltar para lojas"
- Título: número da loja (ex: `Loja #01`) ou nome do grupo
- Subtítulo: cidade (para loja) ou quantidade de lojas do grupo

### 5.2 Widgets (acima da tabela)
Os mesmos widgets do Painel Principal que fazem sentido no contexto de uma loja específica. Os demais são omitidos:

| Widget | Motivo para incluir |
|---|---|
| Maiores Valores Unitários | Relevante por loja |
| Top 5 Produtos | Relevante por loja |
| Volume de Compras | Histórico desta loja |

**Omitidos:** Volume de Caixas, Progresso de Metas, Estoque de Banana, Mais Baratos por Categoria, Comparativo de Mercado.

Layout: 2 colunas para Maiores Valores Unitários e Top 5 Produtos; Volume de Compras em largura total abaixo.

### 5.3 Tabela de Produtos
Tabela completa de todos os produtos já vendidos para aquela loja:

| Coluna | Tipo |
|---|---|
| Produto | Texto |
| Massa (kg) | Número decimal |
| Unidades | Número inteiro |
| Valor | Moeda (R$) |

**Linha de total** ao fim da tabela, somando Massa, Unidades e Valor de todos os produtos.

---

## 6. Decisões de Design

| Decisão | Escolha | Motivo |
|---|---|---|
| Filtros de Visão/Métrica | Removidos | Complexidade desnecessária |
| Chat Mita | Saiu da sidebar | Centralizar ações no painel |
| Seleção de lojas | Página separada | Não misturar navegação com conteúdo do painel |
| Seleção múltipla de lojas | Não suportada | Fora do escopo atual |
| Widgets por loja | Subconjunto de 3 | Apenas os que fazem sentido individualmente |
