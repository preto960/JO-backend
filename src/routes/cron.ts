import { Router, Request, Response } from 'express';

const router = Router();

/**
 * GET /api/cron/health
 *
 * Endpoint invocado por Vercel Cron Jobs cada minuto.
 * Protegido con CRON_SECRET para evitar llamadas externas no autorizadas.
 *
 * Vercel envía automáticamente el header:
 *   Authorization: Bearer <CRON_SECRET>
 */
router.get('/health', async (req: Request, res: Response) => {
  // --- Validación de seguridad ---
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret) {
    const authHeader = req.headers['authorization'];
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

    if (token !== cronSecret) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
  }

  // --- Lógica del cron ---
  try {
    const startTime = Date.now();

    // Ping al health endpoint de la propia app
    const healthStatus = {
      status: 'OK',
      timestamp: new Date().toISOString(),
      service: 'AI Plugin Marketplace API',
      version: '1.0.0',
      cronRun: true,
      responseTimeMs: Date.now() - startTime,
    };

    console.log(`[CRON] Health check executed at ${healthStatus.timestamp}`);

    return res.status(200).json(healthStatus);
  } catch (error) {
    console.error('[CRON] Health check failed:', error);
    return res.status(500).json({
      status: 'ERROR',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
