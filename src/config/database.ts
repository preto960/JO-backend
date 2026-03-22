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

const isLocal = process.env.DATABASE_URL?.includes('localhost') || process.env.DATABASE_URL?.includes('database:5432');

// Strip sslmode from URL to avoid conflict with TypeORM's ssl option
const dbUrl = process.env.DATABASE_URL?.replace(/[?&]sslmode=[^&]*/g, (match, offset, str) =>
  str.indexOf('?') === offset ? '?' : ''
).replace(/\?$/, '');

export const AppDataSource = new DataSource({
  type: 'postgres',
  url: dbUrl,
  ssl: isLocal ? false : { rejectUnauthorized: false },
  synchronize: false, // EXPLICITLY DISABLED - Never auto-sync schema
  migrationsRun: false, // Don't auto-run migrations
  logging: process.env.NODE_ENV === 'development',
  entities: [User, Role, InstalledPlugin, Permission, Setting, DashboardCard, DashboardBlock, Translation, ExternalApiConnection, Tenant],
  migrations: [
    __dirname + '/../migrations/*.ts'
  ],
  subscribers: [],
  // Extra pool settings to handle Neon auto-suspend cold starts
  extra: {
    connectionTimeoutMillis: 30000, // 30s para que Neon despierte
    idleTimeoutMillis: 10000,
    max: 5, // Limitar conexiones en serverless
  },
  connectTimeoutMS: 30000,
});

// Make AppDataSource globally available for plugins
(global as any).AppDataSource = AppDataSource;