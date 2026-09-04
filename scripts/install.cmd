@echo off
where pnpm >nul 2>nul
if %errorlevel% neq 0 (
    call npm install -g pnpm
)
copy ".env copy" .env
call pnpm install
call pnpm approve-builds --all
call pnpm orm:generate
call pnpm orm:migrate inicial
pause
