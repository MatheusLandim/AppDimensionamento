# Catálogo de Equipamentos — API interna (Fase 1)

Serviço standalone (Next.js + Supabase) para a base de equipamentos Daikin/LG.
Fundação do pipeline: **catálogo → memorial (Fase 2) → extração DWG (Fase 3)**.

## Setup

1. Criar um projeto **novo** no Supabase (não reusar o do app interno).
2. No SQL Editor, rodar `supabase/schema.sql`.
3. `cp .env.example .env.local` e preencher as chaves.
4. `npm install`
5. `npm run dev` → API em `http://localhost:3000/api/catalogo`

## Endpoints

| Método | Rota | Função |
|--------|------|--------|
| GET | `/api/catalogo/ue` | Lista condensadoras. Filtros: `fabricante`, `cap_min`, `cap_max` |
| POST | `/api/catalogo/ue` | Cadastra condensadora |
| GET/PATCH/DELETE | `/api/catalogo/ue/[id]` | Lê / edita / desativa (soft delete) |
| GET | `/api/catalogo/ui` | Lista evaporadoras. Filtros: `fabricante`, `tipo`, `cap_min`, `cap_max` |
| POST | `/api/catalogo/ui` | Cadastra evaporadora |
| GET/PATCH/DELETE | `/api/catalogo/ui/[id]` | Lê / edita / desativa |
| POST | `/api/catalogo/selecionar` | **Seleção em lote** — contrato consumido pela Fase 2 |

### Exemplo — seleção em lote

```bash
curl -X POST http://localhost:3000/api/catalogo/selecionar \
  -H "Content-Type: application/json" \
  -d '{
    "ambientes": [
      { "nome": "Suíte Cecília", "cargaBtu": 27000 },
      { "nome": "Home Theater",  "cargaBtu": 34000 }
    ],
    "filtros": { "fabricante": "Daikin" }
  }'
```

Retorna a UI escolhida por ambiente (menor que atende a carga), a soma e as
UEs compatíveis ordenadas pela taxa de conexão mais próxima de 100%.

## Decisões de arquitetura

- **Sem versionamento** (`/api/catalogo`, não `/api/v1`): consumidor único.
- **Escrita só via `service_role`** (server-side); leitura respeita RLS.
- **`lib/selecao.ts` é lógica pura** — sem I/O, testável, e é exatamente o que
  o gerador de memorial importa direto na Fase 2 sem repassar pela rede.
- **Soft delete**: desativar preserva o histórico de projetos que usaram o modelo.

## Próximo (Fase 2)

Tabelas de projeto (`projetos`, `projeto_ambientes`, `projeto_ui`, `projeto_ue`),
motor de cálculo NBR 16401-1 e export das 6 abas — consumindo este catálogo.
