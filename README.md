# k3d-back

```bash
# 1. instalar dependências
npm install

# 2. Configurar variáveis de ambiente
cp .env.example .env
# Edite o .env se necessário

# 3. Criar tabelas 
npm run db:migrate

# 4. Popular com dados de demonstração
npm run db:seed

# 6. Iniciar o servidor
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