call rmdir /s /q .\prisma\migrations
call mysql -u root -pPelusa1275 -e "DROP DATABASE IF EXISTS turismo;"
call pnpm orm:generate
call pnpm orm:migrate inicial
call pnpm orm:pereza
call pnpm tsx auto/auto.js