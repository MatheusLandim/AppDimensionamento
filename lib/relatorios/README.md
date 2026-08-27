# Geradores de relatório

Duas saídas a partir do resultado do motor (lib/calculo.ts):

- **Memorial XLSX (6+1 abas, fórmulas vivas)** — `scripts/gera_memorial_xlsx.py`
  openpyxl. As abas Condições/Coeficientes/Cálculo recalculam sozinhas no Excel
  (psicrometria e correção de altitude inclusas). Verificado com recalc.py: 0 erros.

- **Memorial DOCX** — via `docx` (npm), roda no route handler do Next.js (Node).

## Como ligar no app (Vercel)

- DOCX: gerar direto no route handler `/api/projetos/[id]/memorial.docx` (Node, lib `docx`).
- XLSX: como openpyxl é Python, publicar `gera_memorial_xlsx.py` como Vercel Python
  Function em `/api/relatorio-xlsx.py`. O route handler Next.js junta os dados do
  projeto (autenticado, Supabase) e faz POST do JSON para essa função, que devolve o arquivo.

Ambos recebem o MESMO JSON (projeto + ambientes + ues), então há uma só fonte de verdade.
