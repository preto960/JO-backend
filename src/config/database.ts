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
  // Let the URL's ?sslmode= param handle SSL entirely.
  // Setting ssl here AND in the URL causes a double-negotiation that terminates the connection.
  ssl: isLocalDb ? false : undefined,
  synchronize: false,
  migrationsRun: false,
  logging: !isProduction,
  entities: [User, Role, InstalledPlugin, Permission, Setting, DashboardCard, DashboardBlock, Translation, ExternalApiConnection, Tenant],
  migrations: [
    __dirname + '/../migrations/*.ts'
  ],
  subscribers: [],
  extra: {
    // Neon free tier can take 3-10s to wake from auto-suspend.
    // Keep the timeout generous so Vercel lambdas survive the cold start.
    connectionTimeoutMillis: 30000,   // 30s — enough for Neon cold start
    idleTimeoutMillis: 10000,         // release idle connections quickly on serverless
    query_timeout: 30000,             // 30s per query max
    // Cap the pool: each Vercel lambda is independent, so 2 is plenty.
    // Neon's pooler plan limits total concurrent connections.
    max: isProduction ? 2 : 10,
    min: 0,
  },
});

// Make AppDataSource globally available for plugins
(global as any).AppDataSource = AppDataSource;