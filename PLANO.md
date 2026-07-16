# Plano de Implementação — EduBase

## Resumo

Adicionar funcionalidade de **cadastro de documentos** com reestruturação do banco de dados, renomeação do app de "PROFEI" para "EduBase" e criação de tela de formulário completa.

## Decisões de Design

- **Tags**: Manter tabela `documento_tags` (relação N:N)
- **Estatísticas**: Remover tabela `estatisticas` e tudo relacionado
- **Ícones**: Tabela `icone` com nome + descrição (SVG fica no JS)
- **Documentos**: Remover `tamanho` e `anopublicacao`; adicionar `iconeid`, `eixoid` direto
- **View**: Criar `documentos_completo` com tags agregadas via JSON

---

## 1. Renomear PROFEI → EduBase

| Arquivo | O que mudar |
|---------|------------|
| `index.html:6` | meta description → "EduBase - Educação Inclusiva na prática..." |
| `index.html:8` | `<title>EduBase — Educação Inclusiva</title>` |
| `404.html:6` | `<title>EduBase — Educação Inclusiva</title>` |
| `js/views.js:30` | Header com back → `EduBase` |
| `js/views.js:45` | Header sem back → `EduBase` |
| `js/views.js:99` | Hero home → `EduBase — Educação Inclusiva` |
| `js/views.js:137` | Seção → `Eixos do EduBase` |
| `css/styles.css:2` | Comentário → `EduBase — Estilos` |

---

## 2. Banco de Dados (`supabase/schema.sql`)

### Tabelas a REMOVER
- `estatisticas`
- View `documentos_com_tags`
- Função `registrar_visualizacao()`

### Tabelas a MANTER (sem alteração)
- `eixos`
- `categorias`
- `tags`
- `documento_tags`

### Tabela `icone` — NOVA
```sql
CREATE TABLE IF NOT EXISTS icone (
  id          SERIAL PRIMARY KEY,
  nome        TEXT NOT NULL UNIQUE,
  descricao   TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
```
Seed: 29 ícones do `ICONS` de `icons.js`

### Tabela `documentos` — REESTRUTURADA
```sql
CREATE TABLE IF NOT EXISTS documentos (
  id            SERIAL PRIMARY KEY,
  titulo        TEXT NOT NULL,
  descricao     TEXT,
  url           TEXT NOT NULL,
  tipo          TEXT DEFAULT 'PDF',
  autor_origem  TEXT,
  iconeid       INTEGER REFERENCES icone(id),
  eixoid        INTEGER NOT NULL REFERENCES eixos(id) ON DELETE CASCADE,
  categoriaid   INTEGER NOT NULL REFERENCES categorias(id) ON DELETE CASCADE,
  datacadastro  TIMESTAMPTZ DEFAULT NOW(),
  ativo         BOOLEAN DEFAULT TRUE
);
```

### View `documentos_completo`
```sql
CREATE OR REPLACE VIEW documentos_completo AS
SELECT
  d.*,
  c.nome  AS categoria_nome,
  e.nome  AS eixo_nome,
  e.cor   AS eixo_cor,
  e.icone AS eixo_icone,
  i.nome  AS icone_nome,
  i.descricao AS icone_descricao,
  COALESCE(
    json_agg(
      json_build_object('id', t.id, 'nome', t.nome, 'cor', t.cor)
    ) FILTER (WHERE t.id IS NOT NULL),
    '[]'::json
  ) AS tags
FROM documentos d
JOIN categorias c   ON c.id  = d.categoriaid
JOIN eixos e        ON e.id  = d.eixoid
LEFT JOIN icone i   ON i.id  = d.iconeid
LEFT JOIN documento_tags dt ON dt.documentoid = d.id
LEFT JOIN tags t    ON t.id  = dt.tagid
WHERE d.ativo = TRUE
GROUP BY d.id, c.id, e.id, i.id;
```

---

## 3. `js/icons.js` — Array auxiliar

Adicionar `ICON_DESCRIPTIONS` (mapa nome → descrição) e `ICON_LIST` (array para formulário).

## 4. `js/data.js` — Mock data

- Adicionar `MOCK_DATA.icone` (29 ícones)
- Atualizar `MOCK_DATA.documentos` (iconeid, sem tamanho/anopublicacao/destaque)

## 5. `js/api.js` — Novas funções

- `getIcones()` — busca ícones
- `createDocumento(doc)` — insere documento
- `addDocumentoTag(docId, tagId)` — insere relação N:N
- Adaptar queries para view `documentos_completo`
- **Remover** `registrarVisualizacao()`

## 6. `js/app.js` — Nova rota

- Adicionar `#/cadastrar` → `Views.renderCadastro()`
- Remover referência a `registrarVisualizacao`

## 7. `index.html` — Novo nav item

4º botão na bottom nav (ícone `+`, label "Cadastrar")

## 8. `js/views.js` — `renderCadastro()`

Tela de formulário com campos:
- Título (input text, obrigatório)
- Descrição (textarea, obrigatório)
- URL (input url, obrigatório)
- Tipo (select PDF/site, obrigatório)
- Autor/Origem (input text, obrigatório)
- Eixo (cards clicáveis, obrigatório) → filtra categorias
- Categoria (cards clicáveis, obrigatório)
- Ícone (grid SVG, obrigatório, seleção única)
- Tags (chips toggleáveis, multi-seleção)

## 9. `css/styles.css` — Novas classes

Formulário, grid de ícones, chips de tags, seletor de eixo/categoria.

---

## Ordem de Execução

1. Criar PLANO.md
2. Renomear PROFEI → EduBase
3. Reescrever schema.sql
4. Atualizar icons.js
5. Atualizar data.js
6. Atualizar api.js
7. Atualizar app.js
8. Atualizar index.html
9. Criar renderCadastro() em views.js
10. Adicionar estilos CSS
11. Atualizar README.md
