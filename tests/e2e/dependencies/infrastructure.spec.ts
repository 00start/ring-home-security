import { test, expect } from '@playwright/test';

/**
 * Dependency Tests: Infrastructure & System Health
 *
 * @dependency Infrastructure
 * @type system
 * @critical true
 * @requirements [BO-1, BR-2]
 * @description Tests for system health, Docker, workers, and database integrity
 */
test.describe('Dependency: Infrastructure', () => {
  test.describe('Health Endpoint Comprehensive', () => {
    test('health endpoint responds successfully', async ({ request }) => {
      const response = await request.get('/api/health');

      expect(response.ok()).toBe(true);
      expect(response.status()).toBe(200);

      const health = await response.json();
      expect(health).toBeDefined();
    });

    test('health check includes all critical dependencies', async ({ request }) => {
      const response = await request.get('/api/health');
      const health = await response.json();

      // Must report on all critical dependencies
      expect(health.ringApi).toBeDefined();
      expect(health.database).toBeDefined();
      expect(health.redis).toBeDefined();
      expect(health.ffmpeg).toBeDefined();

      // Each dependency should have status
      expect(health.ringApi.connected).toBeDefined();
      expect(health.database.connected).toBeDefined();
    });

    test('health check reports overall system status', async ({ request }) => {
      const response = await request.get('/api/health');
      const health = await response.json();

      // Should have overall status indicator
      expect(health.status).toBeDefined();
      expect(['healthy', 'degraded', 'unhealthy']).toContain(health.status);
    });

    test('health check includes timestamp', async ({ request }) => {
      const response = await request.get('/api/health');
      const health = await response.json();

      expect(health.timestamp).toBeDefined();

      const timestamp = new Date(health.timestamp);
      const now = new Date();

      // Timestamp should be recent (within last minute)
      const diff = Math.abs(now.getTime() - timestamp.getTime());
      expect(diff).toBeLessThan(60000); // 1 minute
    });

    test('health check reports uptime', async ({ request }) => {
      const response = await request.get('/api/health');
      const health = await response.json();

      if (health.uptime !== undefined) {
        expect(health.uptime).toBeGreaterThan(0);
        expect(typeof health.uptime).toBe('number');
      }
    });

    test('health check reports version information', async ({ request }) => {
      const response = await request.get('/api/health');
      const health = await response.json();

      // Should include version for debugging
      expect(health.version || health.buildInfo).toBeDefined();
    });

    test('health check completes quickly', async ({ request }) => {
      const startTime = Date.now();
      const response = await request.get('/api/health');
      const elapsed = Date.now() - startTime;

      // Health check should be fast
      expect(elapsed).toBeLessThan(1000);
      expect(response.ok()).toBe(true);
    });

    test('health check includes resource usage metrics', async ({ request }) => {
      const response = await request.get('/api/health');
      const health = await response.json();

      // Optional but useful: CPU, memory usage
      if (health.resources) {
        expect(health.resources.memory).toBeDefined();
        expect(health.resources.cpu).toBeDefined();

        // Memory should be reasonable
        if (health.resources.memory.percentage) {
          expect(health.resources.memory.percentage).toBeLessThan(95);
        }
      }
    });
  });

  test.describe('Docker Compose Validation', () => {
    test('all required containers are running', async ({ request }) => {
      const response = await request.get('/api/health');
      const health = await response.json();

      if (health.containers) {
        const containers = health.containers;

        // Required services
        expect(containers.app).toBeDefined();
        expect(containers.app.status).toBe('running');

        if (containers.redis) {
          expect(containers.redis.status).toBe('running');
        }

        if (containers.postgres) {
          expect(containers.postgres.status).toBe('running');
        }
      }
    });

    test('container health checks are passing', async ({ request }) => {
      const response = await request.get('/api/health');
      const health = await response.json();

      if (health.containers) {
        Object.values(health.containers).forEach((container: any) => {
          if (container.health !== undefined) {
            expect(['healthy', 'starting']).toContain(container.health);
          }
        });
      }
    });

    test('no containers are in restart loop', async ({ request }) => {
      const response = await request.get('/api/health');
      const health = await response.json();

      if (health.containers) {
        Object.values(health.containers).forEach((container: any) => {
          if (container.restartCount !== undefined) {
            // Should not be constantly restarting
            expect(container.restartCount).toBeLessThan(5);
          }
        });
      }
    });

    test('network connectivity between containers', async ({ request }) => {
      const response = await request.get('/api/health');
      const health = await response.json();

      // App should be able to reach database and Redis
      expect(health.database.connected).toBe(true);
      expect(health.redis.connected).toBe(true);
    });
  });

  test.describe('Worker Process Status', () => {
    test('background workers are running', async ({ request }) => {
      const response = await request.get('/api/health');
      const health = await response.json();

      if (health.workers) {
        const workers = health.workers;

        // Check for key workers
        if (workers.eventSync) {
          expect(workers.eventSync.status).toBe('running');
        }

        if (workers.recordingProcessor) {
          expect(workers.recordingProcessor.status).toBe('running');
        }

        if (workers.thumbnailGenerator) {
          expect(workers.thumbnailGenerator.status).toBe('running');
        }
      }
    });

    test('workers are processing jobs', async ({ request }) => {
      const response1 = await request.get('/api/health');
      const health1 = await response1.json();

      // Wait a bit
      await new Promise((r) => setTimeout(r, 2000));

      const response2 = await request.get('/api/health');
      const health2 = await response2.json();

      if (health1.workers && health2.workers) {
        // Workers should show activity (processed count increasing)
        // This is informational, not strict requirement
        console.log('Worker activity check completed');
      }
    });

    test('worker queue is not backed up', async ({ request }) => {
      const response = await request.get('/api/health');
      const health = await response.json();

      if (health.workers) {
        Object.values(health.workers).forEach((worker: any) => {
          if (worker.queueSize !== undefined) {
            // Queue should not grow unbounded
            expect(worker.queueSize).toBeLessThan(1000);
          }
        });
      }
    });

    test('no failed jobs accumulating', async ({ request }) => {
      const response = await request.get('/api/health');
      const health = await response.json();

      if (health.workers) {
        Object.values(health.workers).forEach((worker: any) => {
          if (worker.failedJobs !== undefined) {
            // Should not accumulate failures
            expect(worker.failedJobs).toBeLessThan(50);
          }
        });
      }
    });

    test('worker error rate is acceptable', async ({ request }) => {
      const response = await request.get('/api/health');
      const health = await response.json();

      if (health.workers) {
        Object.values(health.workers).forEach((worker: any) => {
          if (worker.errorRate !== undefined) {
            // Error rate should be low (< 5%)
            expect(worker.errorRate).toBeLessThan(0.05);
          }
        });
      }
    });
  });

  test.describe('Database Migration Integrity', () => {
    test('database schema is up to date', async ({ request }) => {
      const response = await request.get('/api/health');
      const health = await response.json();

      if (health.database?.migrations) {
        expect(health.database.migrations.status).toBe('up-to-date');
        expect(health.database.migrations.pending).toBe(0);
      }
    });

    test('all required tables exist', async ({ request }) => {
      const response = await request.get('/api/health');
      const health = await response.json();

      if (health.database?.tables) {
        const tables = health.database.tables;

        // Required tables
        expect(tables).toContain('devices');
        expect(tables).toContain('events');
        expect(tables).toContain('recordings');
        expect(tables).toContain('zones');
      }
    });

    test('database connections are pooled efficiently', async ({ request }) => {
      const response = await request.get('/api/health');
      const health = await response.json();

      if (health.database?.connections) {
        const { active, idle, max } = health.database.connections;

        // Should not exhaust connection pool
        expect(active).toBeLessThan(max);

        // Should have some idle connections available
        expect(idle).toBeGreaterThan(0);
      }
    });

    test('no database connection leaks', async ({ request }) => {
      // Make several requests
      for (let i = 0; i < 5; i++) {
        await request.get('/api/devices');
        await request.get('/api/events?limit=10');
      }

      // Check connection pool
      const healthResponse = await request.get('/api/health');
      const health = await healthResponse.json();

      if (health.database?.connections) {
        const { active, max } = health.database.connections;

        // Active connections should not grow unbounded
        expect(active).toBeLessThan(max);
      }
    });

    test('database foreign key constraints are valid', async ({ request }) => {
      const response = await request.get('/api/health');
      const health = await response.json();

      if (health.database?.integrity) {
        expect(health.database.integrity.foreignKeys).toBe('valid');
      }
    });

    test('database has appropriate indexes', async ({ request }) => {
      const response = await request.get('/api/health');
      const health = await response.json();

      if (health.database?.indexes) {
        // Should have indexes on commonly queried fields
        expect(health.database.indexes.length).toBeGreaterThan(5);
      }
    });
  });

  test.describe('File System & Storage', () => {
    test('storage has sufficient free space', async ({ request }) => {
      const response = await request.get('/api/health');
      const health = await response.json();

      if (health.storage) {
        const { free, total, percentage } = health.storage;

        // Should have at least 10% free space
        expect(percentage).toBeLessThan(90);

        // Should have at least 1GB free
        if (free) {
          expect(free).toBeGreaterThan(1024 * 1024 * 1024);
        }
      }
    });

    test('recordings directory is writable', async ({ request }) => {
      const response = await request.get('/api/health');
      const health = await response.json();

      if (health.storage?.recordings) {
        expect(health.storage.recordings.writable).toBe(true);
      }
    });

    test('logs directory is writable', async ({ request }) => {
      const response = await request.get('/api/health');
      const health = await response.json();

      if (health.storage?.logs) {
        expect(health.storage.logs.writable).toBe(true);
      }
    });

    test('no orphaned files consuming space', async ({ request }) => {
      // System should periodically clean up orphaned recordings
      test.skip(true, 'Requires orphan detection implementation');
    });
  });

  test.describe('Network & Connectivity', () => {
    test('external API endpoints are reachable', async ({ request }) => {
      const response = await request.get('/api/health');
      const health = await response.json();

      // Ring API should be reachable
      expect(health.ringApi.connected).toBe(true);
    });

    test('DNS resolution is working', async ({ request }) => {
      const response = await request.get('/api/health');
      const health = await response.json();

      if (health.network?.dns) {
        expect(health.network.dns.status).toBe('ok');
      }
    });

    test('no network latency issues', async ({ request }) => {
      const response = await request.get('/api/health');
      const health = await response.json();

      if (health.network?.latency) {
        // Latency to Ring API should be reasonable
        expect(health.network.latency.ringApi).toBeLessThan(1000);
      }
    });
  });

  test.describe('Logging & Monitoring', () => {
    test('application logs are being written', async ({ request }) => {
      const response = await request.get('/api/health');
      const health = await response.json();

      if (health.logging) {
        expect(health.logging.enabled).toBe(true);

        if (health.logging.lastWrite) {
          const lastWrite = new Date(health.logging.lastWrite);
          const now = new Date();

          // Logs should be recent (within last 5 minutes)
          const diff = now.getTime() - lastWrite.getTime();
          expect(diff).toBeLessThan(5 * 60 * 1000);
        }
      }
    });

    test('error logs are accessible', async ({ request }) => {
      // System should track recent errors for debugging
      test.skip(true, 'Requires error log endpoint');
    });

    test('audit log is functioning', async ({ request }) => {
      // If system has audit logging, verify it's working
      test.skip(true, 'Requires audit log implementation');
    });
  });

  test.describe('Security & Authentication', () => {
    test('authentication tokens are valid', async ({ request }) => {
      const response = await request.get('/api/health');
      const health = await response.json();

      if (health.auth?.ringToken) {
        expect(health.auth.ringToken.valid).toBe(true);
        expect(health.auth.ringToken.expiresIn).toBeGreaterThan(0);
      }
    });

    test('no security vulnerabilities in dependencies', async ({ request }) => {
      const response = await request.get('/api/health');
      const health = await response.json();

      if (health.security?.vulnerabilities) {
        // Should not have critical vulnerabilities
        expect(health.security.vulnerabilities.critical).toBe(0);
      }
    });

    test('SSL certificates are valid', async ({ request }) => {
      // If using HTTPS, certificates should be valid
      test.skip(true, 'Requires HTTPS setup');
    });
  });
});
