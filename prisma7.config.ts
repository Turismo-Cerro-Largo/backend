import { defineConfig } from "prisma/config";
export default defineConfig({schema:"prisma/schema.prisma",migrations:{path:"migrations/d1"},datasource:{url:"file:./local.db"}});
