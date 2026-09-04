@echo off
winget install --id Oracle.MySQL -e
"C:\Program Files\MySQL\MySQL Server 8.4\bin\mysqld" --initialize-insecure --console
"C:\Program Files\MySQL\MySQL Server 8.4\bin\mysqld" --install MySQL84
setx PATH "%PATH%;C:\Program Files\MySQL\MySQL Server 8.4\bin" /M
net start MySQL84
sc  start MySQL84
call mysql -u root -p12345678 -e "ALTER USER 'root'@'localhost' IDENTIFIED BY '12345678'; FLUSH PRIVILEGES;"