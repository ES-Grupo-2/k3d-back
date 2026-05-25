## Colar no arquivo .env com a senha do supabase:

*DATABASE_URL="postgresql://postgres.mwqvjenejwprabguanch:[SUA-SENHA-AQUI]@aws-1-sa-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.mwqvjenejwprabguanch:[SUA-SENHA-AQUI]@aws-1-sa-east-1.pooler.supabase.com:5432/postgres"*

## Para subir uma atualização no schema prisma
```
npx prisma migrate dev --name nome da migration
```
> Vai criar um arquivo sql na pasta prisma/migrations e automaticamente subir. 

> Se quiser apenas criar, sem subir 
```
npx prima migrate dev --create-only
```
## Para fazer deploy ou quando precisa aplicar mudanças (diferenças entre commits)
```
npx prisma migrate deploy
```

## Para rodar o arquivo seed (povoamento do db)
```
npx prisma db seed
```

## Para atualizar o seu schema para o mais atual
```
npx prisma db pull
```

## Se puder apagar o bd para fazer atualização
```
npx prisma db reset
```

## Se NÃO PUDER APAGAR (ajusta o que for possível para empurar o seu schema.prisma sem olhar o histórico de migrations)
```
npx prisma db push
```

## Testar localmente adicionar novos dados
```
npx prisma studio
```