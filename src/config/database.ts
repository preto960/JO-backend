import { DataSource } from 'typeorm';
import { User } from '../models/User';
import { Role } from '../models/Role';
import { InstalledPlugin } from '../models/InstalledPlugin';
import { Permission } from '../models/Permission';
import { Setting } from '../models/Setting';
import { DashboardCard } from '../models/DashboardCard';
import { DashboardBlock } from '../models/DashboardBlock';
import { Translation } from '../models/Translation';
import { ExternalApiConnection } from '../models/ExternalApiConnection';
import { Tenant } from '../models/Tenant';

const isLocalDb = process.env.DATABASE_URL?.includes('localhost') || process.env.DATABASE_URL?.includes('database:5432');
const isProduction = process.env.NODE_ENV === 'production';

export const AppDataSource = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  ssl: isLocalDb ? false : { rejectUnauthorized: true },
  synchronize: false, // EXPLICITLY DISABLED - Never auto-sync schema
  migrationsRun: false, // Don't auto-run migrations
  logging: process.env.NODE_ENV === 'development',
  entities: [User, Role, InstalledPlugin, Permission, Setting, DashboardCard, DashboardBlock, Translation, ExternalApiConnection, Tenant],
  migrations: [
    __dirname + '/../migrations/*.ts'
  ],
  subscribers: [],
  // Serverless-safe pool settings
  extra: {
    max: isProduction ? 1 : 10,          // 1 connection per lambda in production
    min: 0,                               // allow pool to go idle
    idleTimeoutMillis: 10000,             // release idle connections quickly
    connectionTimeoutMillis: 10000,       // fail fast if DB unreachable
    query_timeout: 30000,                 // 30s max per query
  },
});

// Make AppDataSource globally available for plugins
(global as any).AppDataSource = AppDataSource;