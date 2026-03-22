import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { AppDataSource } from './config/database';
import { errorHandler } from './middleware/errorHandler';
import { TenantResolver } from './middleware/tenantResolver';
import { settingsCache } from './services/settingsCache';
import { dataInitializer } from './services/initializeData';
import { pusherService } from './services/pusherService';
import { pluginLoaderService } from './services/pluginLoaderService';
import { expressAppService } from './services/expressAppService';
import { ExternalApiService } from './services/externalApiService';
import { authRoutes } from './routes/auth';
import { userRoutes } from './routes/users';
import { installedPluginRoutes } from './routes/installedPlugins';
import { marketRoutes } from './routes/market';
import { pluginAssetsRoutes } from './routes/pluginAssets';
import { pluginBundlesRoutes } from './routes/pluginBundles';
import permissionRoutes from './routes/permissions';
import roleRoutes from './routes/roles';
import settingRoutes from './routes/settings';
import uploadRoutes from './routes/upload';
import dashboardRoutes from './routes/dashboard';
import translationRoutes from './routes/translations';
import externalApiRoutes from './routes/externalApis';
import { tenantRoutes } from './routes/tenants';
import { performanceLogger } from './services/performanceLogger';

const app = express();
const PORT = process.env.PORT || 3001;

// Trust proxy for Vercel
app.set('trust proxy', 1);

// Rate limiting - More permissive for development
const limiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 1000, // limit each IP to 1000 requests per minute
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});


/* app.use(
  helmet({
    crossOriginResourcePolicy: false,
  })
);

app.use(cors({
  origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : ['http://localhost:3000'],
  credentials: true
})); */

app.options('*', (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Tenant-ID, X-Client-Monitor');
  res.setHeader('Access-Control-Max-Age', '86400');
  res.status(204).end();
});

app.use(
  helmet({
    crossOriginResourcePolicy: false,
    crossOriginOpenerPolicy: false,
  })
);

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Tenant-ID', 'X-Client-Monitor'],
  optionsSuccessStatus: 204
}));
app.use(limiter);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Performance monitoring middleware (camuflado)
app.use(performanceLogger.middleware());

// Health check with performance metrics
app.get('/health', (req, res) => {
  const healthData = { 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    service: 'AI Plugin Marketplace API',
    version: '1.0.0'
  };

  // Agregar métricas de performance en desarrollo
  if (process.env.NODE_ENV === 'development') {
    (healthData as any).performance = performanceLogger.getStats();
  }

  res.status(200).json(healthData);
});

// Endpoint para heartbeats del cliente (camuflado como health POST)
app.post('/health', (req, res) => {
  // Verificar si es un heartbeat del cliente
  const clientMonitorId = req.headers['x-client-monitor'];
  
  if (clientMonitorId && process.env.NODE_ENV === 'production') {
    // Procesar heartbeat del cliente de forma asíncrona
    setImmediate(() => {
      try {
        // Aquí podrías procesar los datos del cliente si necesitas
        // Por ahora solo lo loggeamos en desarrollo
        if (process.env.NODE_ENV === 'development') {
          console.debug('Client heartbeat received:', {
            clientId: clientMonitorId,
            host: req.get('host'),
            data: req.body
          });
        }
      } catch (error) {
        // Silencioso
      }
    });
  }

  // Responder como health check normal
  res.status(200).json({ 
    status: 'OK', 
    timestamp: new Date().toISOString()
  });
});

// Endpoint para eventos del cliente (camuflado)
app.post('/health/events', (req, res) => {
  const clientMonitorId = req.headers['x-client-monitor'];
  
  if (clientMonitorId && process.env.NODE_ENV === 'production') {
    setImmediate(() => {
      try {
        // Procesar evento del cliente
        if (process.env.NODE_ENV === 'development') {
          console.debug('Client event received:', {
            clientId: clientMonitorId,
            event: req.body
          });
        }
      } catch (error) {
        // Silencioso
      }
    });
  }

  res.status(200).json({ received: true });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/installed-plugins', installedPluginRoutes);
app.use('/api/market', marketRoutes);
app.use('/api/plugin-assets', pluginAssetsRoutes);
app.use('/api/plugin-bundles', pluginBundlesRoutes);
app.use('/api/permissions', permissionRoutes);
app.use('/api/roles', roleRoutes);
app.use('/api/settings', settingRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/translations', translationRoutes);
app.use('/api/external-apis', externalApiRoutes);
app.use('/api/tenants', tenantRoutes);

// Note: Plugin router proxy and error handlers will be registered after plugin initialization

// Initialize Pusher service (no HTTP server needed)

// Initialize database and start server — with retry for Neon cold-start
async function initializeWithRetry(retries = 3, delayMs = 5000): Promise<void> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(`🔄 Connecting to database (attempt ${attempt}/${retries})...`);
      await AppDataSource.initialize();
      console.log('✅ Database connected');
      return;
    } catch (error) {
      console.error(`❌ Database connection attempt ${attempt} failed:`, error);
      if (attempt < retries) {
        console.log(`⏳ Retrying in ${delayMs / 1000}s...`);
        await new Promise(res => setTimeout(res, delayMs));
      } else {
        throw error;
      }
    }
  }
}

initializeWithRetry()
  .then(async () => {
    
    // Initialize default data (tenant, settings) - DISABLED to prevent schema conflicts
    // await dataInitializer.initializeDefaultData();
    // await dataInitializer.assignUsersToDefaultTenant();
    
    // Initialize settings cache
    await settingsCache.initialize();
    console.log('✅ Settings cache initialized');
    
    // Register tenant resolution middleware AFTER database is initialized
    app.use(TenantResolver.middleware);
    console.log('✅ Tenant resolver middleware registered');
    
    // Register Express app for dynamic route mounting
    expressAppService.setApp(app);
    
    // Initialize external API service
    // const externalApiService = new ExternalApiService();
    // await externalApiService.initializeConnections();
    
    // Initialize plugin loader service
    await pluginLoaderService.initialize();
    
    // Load all active plugins
    await pluginLoaderService.loadAllActivePlugins();
    
    const pluginRouters = pluginLoaderService.getAllPluginRouters();
    
    // Register dynamic plugin router proxy AFTER plugins are loaded
    app.use('/api/plugins/:slug', (req, res, next) => {
      const { slug } = req.params;
      const router = pluginLoaderService.getPluginRouterBySlug(slug);
      
      if (!router) {
        console.error(`❌ Plugin router not found for slug: ${slug}`);
        return res.status(404).json({ message: `Plugin '${slug}' not found or not active` });
      }
      
      // Remove the /api/plugins/:slug prefix and pass to plugin router
      const originalUrl = req.url;
      req.url = originalUrl.replace(`/${slug}`, '');
      if (!req.url) req.url = '/';
      if (!req.url.startsWith('/')) req.url = '/' + req.url;
      
      
      router(req, res, next);
    });
    
    
    // Register error and 404 handlers
    app.use(errorHandler);
    app.use('*', (req, res) => {
      res.status(404).json({ message: 'Route not found' });
    });
    
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT} - Ready to go!`);
    });
  })
  .catch((error) => {
    console.error('❌ Database connection failed after all retries:', error);
    process.exit(1);
  });

export default app;