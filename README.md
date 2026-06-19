# k3d-back

```bash
# 1. instalar dependências
npm install

# 2. Configurar variáveis de ambiente
cp .env.example .env
# Edite o .env se necessário

# 3. Atualizar as tabelas
npm run db:pull

# 4. Popular com dados de demonstração (opcional devido a conexão direta com supabase)
npm run db:seed

# 5. Iniciar o servidor
npm run dev
```

O servidor: `http://localhost:3000`

```
src/
├── config/         → variáveis de ambiente validadas
├── lib/            → prisma (banco) e minio (arquivos)
├── middlewares/    → verifyJWT e checkRole (RBAC)
├── modules/        → um diretório por feature
│   ├── auth/       → types · service · controller · routes
│   ├── kanban/     → types · service · controller · routes
│   ├── clients/    → types · service · controller · routes
│   ├── tags/       → types · service · controller · routes
│   ├── dashboard/  → (Fase 2)
│   └── calculator/ → (Fase 3)
├── utils/          → errors · hash · dateFilters
└── server.ts       → entry point
```