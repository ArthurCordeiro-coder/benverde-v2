# Levantamento Técnico: Integração Mobile — Lojas

Este documento detalha o plano para a integração completa e "complexa" das telas de Lojas no Benverde Mobile, alinhando a implementação atual com as diretrizes do documento de design `2026-04-20-painel-principal-lojas-design.md`.

## 1. Estado Atual vs. Requisitos

### O que já temos:
- ✅ Endpoints `/api/dashboard/lojas` e `/api/caixas` funcionais.
- ✅ Listagem básica de lojas com faturamento e caixas pendentes.
- ✅ Tela de detalhe com composição de produtos e resumo de caixas.
- ✅ Cálculo de massa (kg) baseado no parsing do nome do produto.
- ✅ Filtro de mês funcional.

### O que falta (Gap Analysis):
- ❌ **Grupos Geográficos:** Mapeamento fixo (Alto Tietê, Vale, etc.) não é usado para agregação.
- ❌ **Alternância de Visão:** Falta o toggle "Lojas / Grupos Geográficos" na UI.
- ❌ **Widgets de Métricas:** Ausência dos cards "Maiores Valores Unitários", "Top 5 Produtos" e "Volume de Compras".
- ❌ **Agregação por Grupo:** Visualização detalhada que soma todas as lojas de um grupo geográfico.
- ❌ **Estética Premium:** Refinar o glassmorphism e micro-animações conforme o padrão do sistema.

## 2. Planejamento da Implementação

### Parte A: Backend (`frontend/lib/server/dashboard.ts`)
1. **Mapeamento de Grupos:** Inserir a constante `GRUPOS_GEOGRAFICOS` conforme definido no design doc.
2. **Lógica de Agregação:**
   - Criar uma função para calcular o resumo dos grupos (soma de faturamento, massa e caixas das lojas pertencentes).
   - Incluir o `grupo_nome` no retorno de cada loja para facilitar o agrupamento no frontend.
3. **Métricas Globais:** Adicionar ao retorno do `getLojasData` as listas para os widgets:
   - `topValorUnitario`: Top 5 produtos por `valor_unit`.
   - `topProdutos`: Top 5 produtos por faturamento total.
   - `volumeCompras`: Total por categoria (Frutas/Legumes/Verduras) para aquela seleção.

### Parte B: Interface (`frontend/components/mobile/screens/Lojas.tsx`)
1. **Componente de Toggle:** Implementar um seletor deslizante (Lojas vs. Grupos) usando o `C.surface`.
2. **Grid de Grupos:** Criar a visualização de cards para os grupos geográficos.
3. **Widgets de Topo:** Adicionar uma seção horizontal scrollable ou grid com os novos widgets de métricas.
4. **Navegação:** Ajustar o `onSelectLoja` para suportar `onSelectGrupo`, enviando o conjunto de dados agregados.

### Parte C: Detalhe (`frontend/components/mobile/screens/LojaDetalhe.tsx`)
1. **Título Dinâmico:** Ajustar para exibir "Grupo: [Nome]" ou "Loja [ID]".
2. **Cálculos Agregados:** Garantir que todos os cálculos de massa e caixas funcionem perfeitamente para múltiplos IDs de loja (no caso de grupos).

## 3. Próximos Passos Imediatos

1. [ ] Atualizar `lib/server/dashboard.ts` com o mapeamento geográfico e agregação.
2. [ ] Modificar `ScreenLojas.tsx` para incluir o Toggle e os Widgets.
3. [ ] Testar a navegação entre Grupos e Lojas.
4. [ ] Refinar o estilo visual para o padrão Premium.

---
**Responsável:** Antigravity (AI)
**Data:** 2026-05-04
