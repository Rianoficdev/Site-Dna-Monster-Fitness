# Deploy de Producao - DNA Monster Fitness

## 1) Variaveis obrigatorias (`.env`)

Use no servidor de producao:

```env
NODE_ENV=production
PORT=3000
TRUST_PROXY=true

JWT_SECRET=COLOQUE_UMA_CHAVE_FORTE_COM_32+_CARACTERES
JWT_EXPIRES_IN=7d
JWT_EXPIRES_IN_SESSION=12h
JWT_EXPIRES_IN_REMEMBER=30d

CORS_ORIGINS=https://seusite.com,https://www.seusite.com

DATABASE_URL=postgresql://...
PASSWORD_RESET_TOKEN_MINUTES=30
ONLINE_PRESENCE_WINDOW_MINUTES=5
USER_DB_TIMEOUT_MS=8000
```

Regras importantes:

1. Em producao, `CORS_ORIGINS` e obrigatorio e nao aceita `*`.
2. `JWT_SECRET` precisa ter no minimo 32 caracteres e ser forte.
3. `DATABASE_URL` precisa apontar para banco com permissoes de leitura/escrita.

## 2) Frontend apontando para API correta

No `index.html`, configure:

```html
<meta name="dna-api-base-url" content="https://api.seudominio.com/api" />
```

Se frontend e backend estao no mesmo dominio com proxy `/api`, pode deixar vazio.

## 3) Aplicar migracoes SQL (obrigatorio)

No backend:

```bash
npm run db:migrate:sql
```

Esse comando aplica os arquivos de `prisma/sql` com controle de checksum e evita reaplicacao.

## 4) Rodar checklist de pre-lancamento

```bash
npm run prelaunch:full
```

Esse comando executa:

1. migracoes SQL
2. `check:rotina`
3. `test:designacao`
4. `test:concorrencia`

Flags opcionais:

```bash
SKIP_DESIGNACAO_TEST=true npm run prelaunch:full
SKIP_CONCURRENCY_TEST=true npm run prelaunch:full
```

## 5) Subir API com PM2

Instale PM2:

```bash
npm i -g pm2
```

No backend:

```bash
npm run pm2:start
```

Comandos uteis:

```bash
npm run pm2:restart
npm run pm2:logs
npm run pm2:stop
npm run pm2:delete
```

## 6) Persistir PM2 apos reboot

```bash
pm2 save
pm2 startup
```

## 7) Healthcheck

Use:

1. `GET /health`
2. `GET /api/health`

Esperado:

```json
{
  "status": "ok"
}
```

## 8) Nginx (recomendado)

Exemplo:

```nginx
location /api/ {
  proxy_pass http://127.0.0.1:3000/api/;
  proxy_http_version 1.1;
  proxy_set_header Host $host;
  proxy_set_header X-Real-IP $remote_addr;
  proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
  proxy_set_header X-Forwarded-Proto $scheme;
}
```

Assim o frontend chama `/api/...` no mesmo dominio e evita problema de CORS/mixed-content.

## 9) Escalabilidade (importante)

O `ecosystem.config.cjs` esta em 1 instancia por seguranca.

Motivo:

1. parte do estado ainda depende de `in-memory-store.json`
2. multiplas instancias podem gerar divergencia de dados nesse estado local

Antes de escalar horizontalmente:

1. migrar os modulos restantes para persistencia total em banco
2. validar novamente `test:concorrencia`
