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

export const AppDataSource = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('localhost') || process.env.DATABASE_URL?.includes('database:5432') ? false : { rejectUnauthorized: false },
  synchronize: false, // EXPLICITLY DISABLED - Never auto-sync schema
  migrationsRun: false, // Don't auto-run migrations
  logging: process.env.NODE_ENV === 'development',
  entities: [User, Role, InstalledPlugin, Permission, Setting, DashboardCard, DashboardBlock, Translation, ExternalApiConnection, Tenant],
  migrations: [
    __dirname + '/../migrations/*.ts'
  ],
  subscribers: [],
});

// Make AppDataSource globally available for plugins
(global as any).AppDataSource = AppDataSource;