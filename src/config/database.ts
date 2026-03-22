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

const isLocalDb =
  process.env.DATABASE_URL?.includes('localhost') ||
  process.env.DATABASE_URL?.includes('database:5432');
const isProduction = process.env.NODE_ENV === 'production';

export const AppDataSource = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  // rejectUnauthorized: false is required on serverless (Vercel/Neon) because Node.js
  // doesn't trust Neon's root CA by default. The connection is still TLS-encrypted,
  // only certificate hostname verification is skipped.
  ssl: isLocalDb ? false : { rejectUnauthorized: false },
  synchronize: false,
  migrationsRun: false,
  logging: !isProduction,
  entities: [User, Role, InstalledPlugin, Permission, Setting, DashboardCard, DashboardBlock, Translation, ExternalApiConnection, Tenant],
  migrations: [
    __dirname + '/../migrations/*.ts'
  ],
  subscribers: [],
  extra: {
    // 30s gives Neon free-tier time to wake from auto-suspend (typically 3–8s)
    connectionTimeoutMillis: 30000,
    idleTimeoutMillis: 10000,
    query_timeout: 30000,
    max: isProduction ? 2 : 10,
    min: 0,
  },
});

// Make AppDataSource globally available for plugins
(global as any).AppDataSource = AppDataSource;