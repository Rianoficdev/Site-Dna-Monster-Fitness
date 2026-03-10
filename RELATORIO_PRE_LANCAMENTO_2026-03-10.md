# Relatorio de Pre-Lancamento - DNA Monster Fitness

Data da auditoria: 10/03/2026  
Ambiente auditado: workspace local (frontend estatico + API Node/Express + Prisma/Postgres)

## 1. Resumo executivo

Status geral: **PRONTO PARA LANCAMENTO CONTROLADO (1 INSTANCIA)**.

O sistema passou nos testes principais de API, fluxo de treino e concorrencia sem falhas de requisicao.  
Foram adicionados scripts de migracao SQL idempotente e checklist unico de pre-lancamento para reduzir risco operacional no go-live.

Ponto estrutural remanescente para escala horizontal:

1. Persistencia ainda mista em partes do dominio (banco + store local), exigindo 1 instancia ate a migracao completa desses modulos para banco.

## 2. Verificacoes executadas

### 2.1 Check automatizado da rotina

Comando executado:

```bash
npm.cmd run check:rotina
```

Resultado:

1. Sintaxe JS: OK (51 arquivos validados).
2. Prisma schema: OK.
3. Smoke HTTP: OK (`/health` e `/api/health` = 200; rotas protegidas sem 404).
4. Assets locais em `index.html`: OK (14 referencias, 0 ausentes).
5. Logs: `api-run.log` sem alerta padrao; `api-dev.log` com alertas historicos para revisao.

### 2.2 Fluxo de designacao de treino (instrutor -> aluno)

Comando executado:

```bash
npm.cmd run test:designacao
```

Resultado: **OK**.

Fluxo validado de ponta a ponta:

1. Criacao de usuarios de teste.
2. Login instrutor/aluno.
3. Criacao de treino com dias da semana.
4. Atualizacao dos dias.
5. Desativacao.
6. Exclusao.
7. Treino deixa de aparecer para o aluno apos desativacao.

### 2.3 Comunicacao frontend x backend (mapeamento de rotas)

Comparacao automatica:

1. Paths usados no frontend (`requestStudentApi`): 47.
2. Paths expostos no backend: 55.
3. Divergencia encontrada: `/workouts/:param/deactivate` (path de fallback no frontend).

Observacao: o fluxo principal usa `/instructor/workouts/:id/deactivate`, que existe. Divergencia atual e de fallback.

### 2.4 Fluxo de usuarios (admin)

Teste funcional realizado:

1. Desabilitar aluno: **OK** (200).
2. Excluir aluno desabilitado sem senha admin: **falha esperada** (`ADMIN_PASSWORD_REQUIRED`).
3. Excluir aluno desabilitado com senha admin: **OK** (200).

Conclusao: o backend exige senha do admin geral para exclusao (comportamento de seguranca ativo).

### 2.5 Fluxo de suporte com arquivamento

Teste funcional realizado:

1. Criar chamado publico: **OK**.
2. Resolver chamado no admin: **OK**.
3. Arquivar chamado: **OK**.
4. Listar arquivados (`archived=only`) contendo o ticket: **OK**.

## 3. Snapshot atual de dados

### 3.1 Banco (Prisma/Postgres)

Snapshot no momento da auditoria:

1. Usuarios: 4 (`ADMIN_GERAL:1`, `INSTRUTOR:1`, `ALUNO:2`).
2. Workouts (banco): 0.
3. Templates (banco): 0.
4. Exercises (banco): 111.
5. Support tickets (banco): 0.
6. Workout completions: 0.
7. Weekly checks: 0.

### 3.2 Store local (`data/in-memory-store.json`)

Snapshot no momento da auditoria:

1. Workouts: 5.
2. Exercises: 23.
3. Library exercises: 111.
4. Support tickets: 11.
5. Progress records: 6.

Conclusao: existe divergencia natural entre banco e store local por desenho atual de persistencia.

## 4. Fluxo geral atual do sistema

## 4.1 Arquitetura de requisicao

1. Frontend (`index.html` + `script.js`) chama API por `requestStudentApi`.
2. API base vem de:
   1. `window.DNA_API_BASE_URL`, ou
   2. `<meta name="dna-api-base-url">`, ou
   3. fallback por origem/localhost.
3. Backend Express (`src/app.js`) monta `/api` por modulos:
   1. auth
   2. users
   3. workouts
   4. exercises
   5. progress
   6. library
   7. uploads
   8. admin
   9. support
4. Erros sao normalizados no `errorMiddleware`.

### 4.2 Persistencia por modulo

1. `users`: banco (Prisma).
2. `library`: banco + sincronizacao com memoria.
3. `support`: banco com fallback para memoria.
4. `progress`: parte banco (`weekly checks`/`completions`) e parte memoria (`body metrics`).
5. `workouts` e `workout templates`: memoria (`in-memory-store.json`), nao banco.

## 5. Principais riscos antes do go-live

## 5.1 Criticos

1. Persistencia mista para treinos/progresso:
   1. Em ambiente com mais de 1 instancia, dados em memoria/arquivo podem divergir.
   2. Reinicio sem storage persistente pode causar perda parcial de estado local.
2. Implicacao direta:
   1. Go-live recomendado em instancia unica ate concluir migracao dos modulos restantes para banco.

## 5.2 Altos

1. Login sob carga simultanea ainda tem p95 elevado (~5.7s no teste mais recente), embora sem erros.
2. Recomendacao:
   1. monitorar latencia de autenticacao nas primeiras 24h
   2. planejar evolucao de hash de senha para aumentar throughput de login

## 5.3 Medios

1. Fallback de path de desativacao no frontend (`/workouts/:id/deactivate`) nao existe no backend dedicado; hoje nao quebra fluxo principal, mas pode gerar chamadas extras/falso ruido.
2. `api-dev.log` contem alertas historicos e deve ter baseline limpo apos subir producao.

## 6. Itens funcionais confirmados nesta rodada

1. Validacao de sintaxe e rotas principais.
2. Healthcheck publico da API.
3. Fluxo completo de designacao de treino (criar, atualizar, desativar, excluir).
4. Fluxo admin de desabilitar/excluir aluno (com senha de confirmacao).
5. Fluxo de suporte com status e arquivamento.
6. Formulario de lead com mensagem WhatsApp estruturada (nome, telefone, objetivo).
7. Campos de biblioteca com series, calorias estimadas, intensidade, musculos trabalhados, tutorial e preview de imagem/video presentes no frontend.
8. Limpeza de dados temporarios de auditoria concluida (tickets @example.com removidos).

## 7. Checklist de liberacao recomendada (ordem pratica)

1. Definir `.env` de producao:
   1. `NODE_ENV=production`
   2. `JWT_SECRET` forte (>=32)
   3. `CORS_ORIGINS` com dominios reais
   4. `DATABASE_URL` final

2. Aplicar SQL no banco de producao com:
   1. `npm run db:migrate:sql`

3. Padronizar persistencia antes de escalar:
   1. Prioridade alta: migrar `workouts/workout templates` para banco.
   2. Reduzir dependencias de estado em arquivo local.

4. Rodar checklist completo:
   1. `npm run prelaunch:full`

5. Subir com PM2 e validar:
   1. `/health`
   2. `/api/health`
   3. login de cada perfil
   4. criacao de treino real e execucao por aluno
   5. abertura e arquivamento de suporte

6. Monitorar primeiras 24h com log centralizado e alerta de erro 5xx.

## 8. Conclusao

O produto esta funcional e com boa cobertura de fluxos principais no ambiente auditado.  
Com os scripts e validacoes adicionados nesta rodada, o sistema esta apto para lancamento em producao controlada (1 instancia), mantendo monitoramento reforcado de autenticacao e erros 5xx.

## 9. Atualizacao de prontidao (10/03/2026)

Itens adicionados para deixar o lancamento mais seguro e repetivel:

1. Script de migracao SQL idempotente com controle de checksum:
   1. `npm run db:migrate:sql`
2. Script unico de checklist de pre-lancamento:
   1. `npm run prelaunch:full`
3. Teste de concorrencia formalizado:
   1. `npm run test:concorrencia`
4. Timeout de DB em login ajustado para producao (default 8000ms):
   1. `USER_DB_TIMEOUT_MS` no `.env`
5. Guia de deploy de producao refeito com fluxo completo e sem problema de encoding.

Resultado da rodada de concorrencia (1020 requests):

1. Falhas de requisicao: 0.
2. Rotas autenticadas de uso continuo (workouts/listagens/overview/suporte): p95 ~148ms a ~277ms.
3. Login simultaneo em pico: p95 alto (~5.7s), sem erro.
4. Recomendacao: monitorar login em producao e planejar troca de `bcryptjs` por `bcrypt` nativo para aumentar throughput de autenticacao.

## 10. Fechamento de persistencia em banco (10/03/2026)

Ajustes aplicados para garantir salvamento em banco dos fluxos principais:

1. `workouts` e `workout templates` migrados para repositorio Prisma/Postgres.
2. `workout_exercise` migrado para Prisma/Postgres (incluindo `observation`).
3. `progress` migrado para Postgres:
   1. `progress_record`
   2. `body_metric`
   3. `weekly_training_check` e `workout_completion` mantidos no banco.
4. `support_ticket` sem fallback para arquivo local (somente banco).
5. Container atualizado para injetar repositórios DB (`workouts`, `exercises`, `progress`, `support`).
6. Scripts de seed/purge ajustados para fluxo assíncrono DB.

Validacoes executadas apos ajustes:

1. `npm run db:migrate:sql`: OK (migration `2026-03-10-persist-workout-metadata-and-progress.sql` aplicada).
2. `npm run check:rotina`: OK.
3. `npm run test:designacao`: OK.
4. `npm run test:concorrencia`: OK (0 falhas em 1020 requests).
5. `npm run prelaunch:full`: OK (checklist completo aprovado).

