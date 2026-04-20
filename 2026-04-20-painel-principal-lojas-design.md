# Design — Correção de Bugs e Implementação de Dados: Página de Lojas

**Data:** 2026-04-20
**Projeto:** Benverde Management System
**Escopo:** Corrigir estilo da Página de Lojas + integrar dados reais do Base Data

---

## 1. Contexto

A Página de Lojas foi construída com dados simulados e estilo genérico (fundo branco, bordas finas). Este spec define as correções necessárias para alinhar a página ao restante do sistema e substituir todos os dados falsos por dados reais do Base Data.

As duas correções são independentes entre si e serão implementadas em paralelo.

---

## 2. Correção de Estilo

### 2.1 Problema
A Página de Lojas usa estilo incompatível com o restante do sistema:
- Fundo branco em vez de dark mode
- Sem efeitos de glassmorphism
- Bordas e tipografia não seguem o padrão Tailwind do sistema

### 2.2 Solução
Aplicar o mesmo padrão visual do restante do sistema:
- **Tema:** dark mode premium
- **Estilo:** glassmorphism — superfícies com transparência e efeito de desfoque (`backdrop-blur`, `bg-opacity`)
- **Framework:** Tailwind CSS, seguindo exatamente as classes já usadas nas outras páginas do sistema

### 2.3 Escopo de aplicação
Todos os elementos da Página de Lojas devem seguir o padrão:
- Blocos de loja e grupo (cards no grid)
- Botões de toggle (Lojas / Grupos Geográficos)
- Botão "← Voltar"
- Cabeçalho da página de detalhe
- Widgets (Maiores Valores Unitários, Top 5 Produtos, Volume de Compras)
- Tabela de produtos com linha de total

---

## 3. Implementação de Dados

### 3.1 Fonte de dados
Tabela **Base Data**, com as seguintes colunas relevantes:

| Coluna | Uso |
|---|---|
| `loja` | Identificador da loja no formato `loja{id}` (ex: `loja1`, `loja7`) |
| `produto` | Nome do produto — também usado para extrair peso unitário |
| `unidade` | Unidade de medida: `"KG"` ou `"UN"` |
| `quant` | Quantidade vendida |
| `valor_total` | Valor total da venda |

### 3.2 Lista de lojas
27 lojas ativas. O ID é o número da loja e não é sequencial (há lacunas):

| ID | Cidade |
|---|---|
| 1 | SUZANO |
| 4 | SÃO PAULO |
| 5 | GUAIANAZES |
| 6 | MAUA |
| 7 | MOGI DAS CRUZES |
| 8 | MOGI DAS CRUZES |
| 10 | TAUBATE |
| 11 | PINDAMONHANGABA |
| 12 | SÃO SEBASTIÃO |
| 13 | CARAGUATATUBA |
| 14 | UBATUBA |
| 16 | PINDAMONHANGABA |
| 17 | POÁ |
| 18 | TAUBATE |
| 19 | NOVA LORENA |
| 20 | GUARATINGUETA |
| 21 | BERTIOGA |
| 22 | MOGI DAS CRUZES |
| 23 | FERRAZ DE VASCONCELOS |
| 25 | SÃO SEBASTIÃO |
| 26 | UBATUBA |
| 27 | SUZANO |
| 29 | ARUJA |
| 30 | SÃO JOSÉ DOS CAMPOS |
| 31 | SUZANO |
| 32 | ITAQUAQUECETUBA |
| 33 | ITAQUAQUECETUBA |

**Regra de exibição:** lojas com o mesmo nome mas IDs diferentes são tratadas como unidades distintas. O ID é sempre exibido para diferenciá-las (ex: `#7 — MOGI DAS CRUZES` e `#8 — MOGI DAS CRUZES`).

### 3.3 Parsing da coluna `loja`
A coluna `loja` no Base Data usa o formato `loja{id}`. Para cruzar com a lista de lojas, extrair o ID com:

```python
df["loja_id"] = df["loja"].str.replace("loja", "").astype(int)
```

### 3.4 Cálculo de massa
A coluna de massa não existe no Base Data e deve ser calculada linha a linha:

**Regra:**
- Se `unidade == "KG"` → `massa = quant`
- Se `unidade == "UN"` → extrair peso do nome do produto e calcular `massa = peso_unitario × quant`

**Extração de peso do nome do produto:**
O nome do produto contém o peso no formato `{valor}{unidade}`, por exemplo:
- `CEBOLINHA HIGIENIZADO BENVERDE 100G|UN|1.0` → peso = 100g = 0,1 kg
- `BANANA PRATA 18KG|UN|6.0` → peso = 18 kg

Lógica de extração:
1. Buscar no nome do produto um padrão do tipo `(\d+(?:[.,]\d+)?)\s*(G|KG|GR)` (case-insensitive)
2. Se encontrar `G` ou `GR`: dividir por 1000 para converter em kg
3. Se encontrar `KG`: usar o valor diretamente
4. Se não encontrar: registrar `massa = None` e logar o produto para revisão

```python
import re

def extrair_peso_kg(nome_produto: str) -> float | None:
    match = re.search(r'(\d+(?:[.,]\d+)?)\s*(KG|GR|G)\b', nome_produto, re.IGNORECASE)
    if not match:
        return None
    valor = float(match.group(1).replace(",", "."))
    unidade = match.group(2).upper()
    if unidade == "KG":
        return valor
    else:  # G ou GR
        return valor / 1000

def calcular_massa(row) -> float | None:
    if row["unidade"] == "KG":
        return row["quant"]
    elif row["unidade"] == "UN":
        peso = extrair_peso_kg(row["produto"])
        if peso is not None:
            return peso * row["quant"]
    return None
```

### 3.5 Tabela de produtos (Detalhe de Loja)
Após calcular a massa, agrupar por produto para exibir na tabela:

```python
df_loja = df[df["loja_id"] == loja_id].copy()
df_loja["massa_kg"] = df_loja.apply(calcular_massa, axis=1)

tabela = df_loja.groupby("produto").agg(
    massa=("massa_kg", "sum"),
    unidades=("quant", "sum"),
    valor=("valor_total", "sum")
).reset_index()
```

A linha de total é calculada separadamente com `.sum()` nas colunas numéricas.

### 3.6 Grupos Geográficos — Mapeamento Completo

Os grupos e seus IDs de loja são fixos e definidos abaixo. Este mapeamento deve ser codificado diretamente como constante no sistema:

```python
GRUPOS_GEOGRAFICOS = {
    "Alto Tietê": [1, 27, 31, 7, 8, 22, 17, 23, 29, 32, 33],
    # SUZANO: 1, 27, 31 | MOGI DAS CRUZES: 7, 8, 22 | POÁ: 17
    # FERRAZ DE VASCONCELOS: 23 | ARUJA: 29 | ITAQUAQUECETUBA: 32, 33

    "Vale do Paraíba": [10, 18, 11, 16, 19, 20, 30],
    # TAUBATE: 10, 18 | PINDAMONHANGABA: 11, 16 | NOVA LORENA: 19
    # GUARATINGUETA: 20 | SÃO JOSÉ DOS CAMPOS: 30

    "Litoral Norte": [12, 25, 13, 14, 26, 21],
    # SÃO SEBASTIÃO: 12, 25 | CARAGUATATUBA: 13 | UBATUBA: 14, 26 | BERTIOGA: 21

    "Capital e ABC": [4, 5, 6],
    # SÃO PAULO: 4 | GUAIANAZES: 5 | MAUA: 6
}
```

**Nota:** todas as 27 lojas estão cobertas por algum grupo — não há lojas órfãs.

### 3.7 Detalhe de Grupo Geográfico
Quando o usuário abre um grupo, os dados são a soma agregada de todas as lojas do grupo. A lógica é a mesma do detalhe de loja, mas o filtro usa a lista de IDs do grupo:

```python
ids_do_grupo = GRUPOS_GEOGRAFICOS["Alto Tietê"]
df_grupo = df[df["loja_id"].isin(ids_do_grupo)].copy()
```

O restante do processamento (cálculo de massa, agrupamento por produto, totais) segue o mesmo fluxo da loja individual.

---

## 4. Navegação (sem URLs individuais)

A Página de Detalhe é uma página única com estado dinâmico via `st.session_state`. Nenhuma URL individual por loja deve ser criada.

Estrutura de estado sugerida:

```python
# Ao clicar em uma loja
st.session_state["detalhe_tipo"] = "loja"      # "loja" ou "grupo"
st.session_state["detalhe_id"] = 7             # ID da loja ou do grupo
st.session_state["detalhe_nome"] = "MOGI DAS CRUZES"

# Ao clicar em voltar
st.session_state.pop("detalhe_tipo", None)
st.session_state.pop("detalhe_id", None)
st.session_state.pop("detalhe_nome", None)
```

---

## 5. Decisões de Design

| Decisão | Escolha | Motivo |
|---|---|---|
| Ordem de implementação | Estilo e dados em paralelo | São independentes, evita duas rodadas de revisão |
| Lojas com mesmo nome | Exibir ID para diferenciar | ID é o identificador único real das unidades |
| Produto sem peso no nome | `massa = None`, logar | Evita silenciar erros de parsing |
| Navegação | `st.session_state` | Sem URLs individuais por loja |
| Grupos geográficos | Mapeamento fixo como constante no código | Grupos são estáveis e não precisam de tabela no banco |