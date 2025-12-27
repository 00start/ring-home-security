/**
 * Quality Test Fixtures
 *
 * Shared mock data and utilities for quality dimension testing
 */

export interface PerformanceMetrics {
  pageLoadTime: number;
  timeToFirstByte: number;
  firstContentfulPaint: number;
  largestContentfulPaint: number;
  timeToInteractive: number;
  totalBlockingTime: number;
  cumulativeLayoutShift: number;
  resourceCount: number;
  totalSize: number;
}

export interface AccessibilityReport {
  violations: AccessibilityViolation[];
  passes: AccessibilityCheck[];
  incomplete: AccessibilityCheck[];
  timestamp: string;
  url: string;
  wcagLevel: 'A' | 'AA' | 'AAA';
}

export interface AccessibilityViolation {
  id: string;
  impact: 'minor' | 'moderate' | 'serious' | 'critical';
  description: string;
  help: string;
  helpUrl: string;
  nodes: Array<{
    target: string[];
    html: string;
    failureSummary: string;
  }>;
  tags: string[];
}

export interface AccessibilityCheck {
  id: string;
  description: string;
  help: string;
  nodes: Array<{
    target: string[];
    html: string;
  }>;
}

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  version: string;
  ringApi: {
    connected: boolean;
    latency: number;
    lastSync: string;
  };
  database: {
    connected: boolean;
    connections: {
      active: number;
      idle: number;
      max: number;
    };
    migrations: {
      status: 'up-to-date' | 'pending';
      pending: number;
    };
    tables: string[];
  };
  redis: {
    connected: boolean;
    memory: {
      used: number;
      peak: number;
      percentage: number;
    };
  };
  ffmpeg: {
    available: boolean;
    version: string;
    codecs: string[];
    activeProcesses: number;
    queuedJobs: number;
    hardwareAcceleration?: string;
  };
  workers: {
    eventSync: WorkerStatus;
    recordingProcessor: WorkerStatus;
    thumbnailGenerator: WorkerStatus;
  };
  storage: {
    free: number;
    total: number;
    percentage: number;
    recordings: {
      writable: boolean;
      path: string;
    };
    logs: {
      writable: boolean;
      path: string;
    };
  };
  resources: {
    memory: {
      used: number;
      total: number;
      percentage: number;
    };
    cpu: {
      usage: number;
      loadAverage: number[];
    };
  };
}

export interface WorkerStatus {
  status: 'running' | 'stopped' | 'error';
  processedJobs: number;
  failedJobs: number;
  queueSize: number;
  errorRate: number;
  lastProcessed?: string;
}

export interface FFmpegResult {
  success: boolean;
  inputFile: string;
  outputFile: string;
  duration: number;
  codec: string;
  resolution: {
    width: number;
    height: number;
  };
  bitrate: number;
  fileSize: number;
  thumbnail?: {
    path: string;
    size: number;
  };
  processingTime: number;
  error?: string;
}

/**
 * Mock performance metrics for testing
 */
export function mockPerformanceMetrics(overrides?: Partial<PerformanceMetrics>): PerformanceMetrics {
  return {
    pageLoadTime: 1200,
    timeToFirstByte: 150,
    firstContentfulPaint: 800,
    largestContentfulPaint: 1100,
    timeToInteractive: 1500,
    totalBlockingTime: 50,
    cumulativeLayoutShift: 0.05,
    resourceCount: 45,
    totalSize: 2500000, // 2.5MB
    ...overrides,
  };
}

/**
 * Mock slow performance metrics for testing degraded scenarios
 */
export function mockSlowPerformanceMetrics(): PerformanceMetrics {
  return mockPerformanceMetrics({
    pageLoadTime: 5000,
    timeToFirstByte: 800,
    firstContentfulPaint: 3000,
    largestContentfulPaint: 4500,
    timeToInteractive: 6000,
    totalBlockingTime: 500,
    cumulativeLayoutShift: 0.25,
  });
}

/**
 * Mock accessibility report for testing
 */
export function mockAccessibilityReport(overrides?: Partial<AccessibilityReport>): AccessibilityReport {
  return {
    violations: [],
    passes: [
      {
        id: 'color-contrast',
        description: 'Elements must have sufficient color contrast',
        help: 'Ensures the contrast between foreground and background colors meets WCAG 2 AA contrast ratio thresholds',
        nodes: [
          {
            target: ['body'],
            html: '<body>',
          },
        ],
      },
      {
        id: 'image-alt',
        description: 'Images must have alternate text',
        help: 'Ensures <img> elements have alternate text or a role of none or presentation',
        nodes: [],
      },
    ],
    incomplete: [],
    timestamp: new Date().toISOString(),
    url: 'http://localhost:3000/',
    wcagLevel: 'AA',
    ...overrides,
  };
}

/**
 * Mock accessibility report with violations
 */
export function mockAccessibilityReportWithViolations(): AccessibilityReport {
  return mockAccessibilityReport({
    violations: [
      {
        id: 'color-contrast',
        impact: 'serious',
        description: 'Elements must have sufficient color contrast',
        help: 'Ensures the contrast between foreground and background colors meets WCAG 2 AA contrast ratio thresholds',
        helpUrl: 'https://dequeuniversity.com/rules/axe/4.8/color-contrast',
        nodes: [
          {
            target: ['.low-contrast-button'],
            html: '<button class="low-contrast-button">Click Me</button>',
            failureSummary: 'Expected contrast ratio of at least 4.5:1 but found 2.1:1',
          },
        ],
        tags: ['wcag2aa', 'wcag143'],
      },
      {
        id: 'button-name',
        impact: 'critical',
        description: 'Buttons must have discernible text',
        help: 'Ensures buttons have discernible text',
        helpUrl: 'https://dequeuniversity.com/rules/axe/4.8/button-name',
        nodes: [
          {
            target: ['button[data-testid="icon-button"]'],
            html: '<button data-testid="icon-button"><svg>...</svg></button>',
            failureSummary: 'Button does not have accessible text',
          },
        ],
        tags: ['wcag2a', 'wcag412'],
      },
    ],
  });
}

/**
 * Mock healthy system status
 */
export function mockHealthStatus(overrides?: Partial<HealthStatus>): HealthStatus {
  return {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: 86400, // 24 hours in seconds
    version: '1.0.0',
    ringApi: {
      connected: true,
      latency: 120,
      lastSync: new Date(Date.now() - 60000).toISOString(), // 1 minute ago
    },
    database: {
      connected: true,
      connections: {
        active: 5,
        idle: 10,
        max: 20,
      },
      migrations: {
        status: 'up-to-date',
        pending: 0,
      },
      tables: ['devices', 'events', 'recordings', 'zones', 'users'],
    },
    redis: {
      connected: true,
      memory: {
        used: 50000000, // 50MB
        peak: 60000000, // 60MB
        percentage: 25,
      },
    },
    ffmpeg: {
      available: true,
      version: 'ffmpeg version 5.1.2',
      codecs: ['h264', 'h265', 'aac', 'mp3', 'vp9'],
      activeProcesses: 2,
      queuedJobs: 5,
      hardwareAcceleration: 'cuda',
    },
    workers: {
      eventSync: {
        status: 'running',
        processedJobs: 1234,
        failedJobs: 3,
        queueSize: 10,
        errorRate: 0.002,
        lastProcessed: new Date(Date.now() - 5000).toISOString(),
      },
      recordingProcessor: {
        status: 'running',
        processedJobs: 567,
        failedJobs: 1,
        queueSize: 5,
        errorRate: 0.001,
        lastProcessed: new Date(Date.now() - 10000).toISOString(),
      },
      thumbnailGenerator: {
        status: 'running',
        processedJobs: 890,
        failedJobs: 2,
        queueSize: 3,
        errorRate: 0.002,
        lastProcessed: new Date(Date.now() - 3000).toISOString(),
      },
    },
    storage: {
      free: 100000000000, // 100GB
      total: 500000000000, // 500GB
      percentage: 80,
      recordings: {
        writable: true,
        path: '/data/recordings',
      },
      logs: {
        writable: true,
        path: '/var/log/app',
      },
    },
    resources: {
      memory: {
        used: 2000000000, // 2GB
        total: 8000000000, // 8GB
        percentage: 25,
      },
      cpu: {
        usage: 35,
        loadAverage: [0.5, 0.6, 0.7],
      },
    },
    ...overrides,
  };
}

/**
 * Mock degraded health status
 */
export function mockDegradedHealthStatus(): HealthStatus {
  return mockHealthStatus({
    status: 'degraded',
    ringApi: {
      connected: true,
      latency: 850, // High latency
      lastSync: new Date(Date.now() - 600000).toISOString(), // 10 minutes ago
    },
    workers: {
      eventSync: {
        status: 'running',
        processedJobs: 1234,
        failedJobs: 45, // Higher failure rate
        queueSize: 150, // Backed up queue
        errorRate: 0.035,
        lastProcessed: new Date(Date.now() - 30000).toISOString(),
      },
      recordingProcessor: {
        status: 'running',
        processedJobs: 567,
        failedJobs: 1,
        queueSize: 5,
        errorRate: 0.001,
        lastProcessed: new Date(Date.now() - 10000).toISOString(),
      },
      thumbnailGenerator: {
        status: 'running',
        processedJobs: 890,
        failedJobs: 2,
        queueSize: 3,
        errorRate: 0.002,
        lastProcessed: new Date(Date.now() - 3000).toISOString(),
      },
    },
    storage: {
      free: 25000000000, // 25GB - low space
      total: 500000000000,
      percentage: 95, // 95% full
      recordings: {
        writable: true,
        path: '/data/recordings',
      },
      logs: {
        writable: true,
        path: '/var/log/app',
      },
    },
  });
}

/**
 * Mock unhealthy status
 */
export function mockUnhealthyStatus(): HealthStatus {
  return mockHealthStatus({
    status: 'unhealthy',
    ringApi: {
      connected: false,
      latency: 0,
      lastSync: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
    },
    database: {
      connected: false,
      connections: {
        active: 0,
        idle: 0,
        max: 20,
      },
      migrations: {
        status: 'pending',
        pending: 3,
      },
      tables: [],
    },
    workers: {
      eventSync: {
        status: 'error',
        processedJobs: 1234,
        failedJobs: 500,
        queueSize: 1000,
        errorRate: 0.28,
        lastProcessed: new Date(Date.now() - 300000).toISOString(),
      },
      recordingProcessor: {
        status: 'stopped',
        processedJobs: 567,
        failedJobs: 100,
        queueSize: 250,
        errorRate: 0.15,
      },
      thumbnailGenerator: {
        status: 'stopped',
        processedJobs: 890,
        failedJobs: 50,
        queueSize: 100,
        errorRate: 0.05,
      },
    },
  });
}

/**
 * Mock successful FFmpeg result
 */
export function mockFFmpegResult(overrides?: Partial<FFmpegResult>): FFmpegResult {
  return {
    success: true,
    inputFile: '/data/recordings/input-123.mp4',
    outputFile: '/data/recordings/output-123.mp4',
    duration: 30.5,
    codec: 'h264',
    resolution: {
      width: 1920,
      height: 1080,
    },
    bitrate: 3000000, // 3Mbps
    fileSize: 11475000, // ~11.5MB
    thumbnail: {
      path: '/data/thumbnails/thumb-123.jpg',
      size: 45000, // 45KB
    },
    processingTime: 2500, // 2.5 seconds
    ...overrides,
  };
}

/**
 * Mock failed FFmpeg result
 */
export function mockFailedFFmpegResult(): FFmpegResult {
  return {
    success: false,
    inputFile: '/data/recordings/corrupted-456.mp4',
    outputFile: '',
    duration: 0,
    codec: '',
    resolution: {
      width: 0,
      height: 0,
    },
    bitrate: 0,
    fileSize: 0,
    processingTime: 500,
    error: 'Invalid data found when processing input',
  };
}

/**
 * Mock FFmpeg result for thumbnail generation
 */
export function mockThumbnailGeneration(): FFmpegResult {
  return mockFFmpegResult({
    outputFile: '/data/thumbnails/thumb-789.jpg',
    duration: 0, // Not applicable for thumbnail
    fileSize: 52000, // 52KB
    processingTime: 450, // Fast thumbnail generation
    thumbnail: {
      path: '/data/thumbnails/thumb-789.jpg',
      size: 52000,
    },
  });
}

/**
 * Mock device data for testing
 */
export function mockDevice(overrides?: any) {
  return {
    id: 'device-123',
    name: 'Front Door Camera',
    type: 'camera',
    batteryLevel: 85,
    batteryStatus: 'normal',
    lastSeen: new Date().toISOString(),
    online: true,
    ...overrides,
  };
}

/**
 * Mock low battery device
 */
export function mockLowBatteryDevice() {
  return mockDevice({
    id: 'device-low-battery',
    name: 'Backyard Camera',
    batteryLevel: 12,
    batteryStatus: 'low',
  });
}

/**
 * Mock charging device
 */
export function mockChargingDevice() {
  return mockDevice({
    id: 'device-charging',
    name: 'Garage Camera',
    batteryLevel: 45,
    batteryStatus: 'charging',
  });
}

/**
 * Mock event data for testing
 */
export function mockEvent(overrides?: any) {
  return {
    id: 'event-123',
    deviceId: 'device-123',
    eventType: 'motion',
    timestamp: new Date().toISOString(),
    hasRecording: true,
    zoneName: 'Front Entrance',
    ...overrides,
  };
}

/**
 * Mock recording metadata
 */
export function mockRecording(overrides?: any) {
  return {
    id: 'recording-123',
    eventId: 'event-123',
    deviceId: 'device-123',
    timestamp: new Date().toISOString(),
    duration: 30,
    filePath: '/data/recordings/rec-123.mp4',
    thumbnailPath: '/data/thumbnails/thumb-123.jpg',
    videoMetadata: {
      width: 1920,
      height: 1080,
      bitrate: 3000000,
      codec: 'h264',
    },
    ...overrides,
  };
}
