"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.prisma = void 0;
const client_1 = require("@prisma/client");
const adapter_libsql_1 = require("@prisma/adapter-libsql");
const adapter = new adapter_libsql_1.PrismaLibSql({ url: 'file:./dev.db' });
exports.prisma = new client_1.PrismaClient({ adapter });
