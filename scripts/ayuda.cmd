call rmdir /s /q .\prisma\migrations
call mysql -u root -p12345678 -e "DROP DATABASE IF EXISTS turismo;"
call pnpm install
call pnpm approve-builds --all
call pnpm orm:generate
call pnpm orm:migrate inicial
call pnpm orm:pereza