// monitoring/APIMonitor.ts - FIXED AND ENHANCED
import { mongoClient } from "../data/mongo/mongo";

interface RateLimitInfo {
  limit: number;
  remaining: number;
  resetAfter: number;
  bucket: string;
  lastUpdated: number;
}

interface TimeWindow {
  startTime: number;
  calls: number;
}

interface APICallMetrics {
  totalCalls: number;
  rateLimitHits: number;
  invalidRequests: number;
  callsPerMinute: number;
  callsLast60Seconds: number;
  globalCallsPerSecond: number;
  startTime: Date;
  routeBreakdown: Record<string, number>;
  rateLimitInfo: Record<string, RateLimitInfo>;
  timeWindows: TimeWindow[];
}

// Routes that should NOT trigger low rate limit warnings
const IGNORE_LOW_RATE_LIMIT_ROUTES = [
  '/gateway/bot',           // Only used on startup
  '/oauth2/applications/@me', // Only used for app info
  '/users/@me',            // Only used occasionally
  '/applications/{id}/commands', // Only used for slash command registration
];

// Routes that are critical and SHOULD warn on low rate limits
const CRITICAL_ROUTES = [
  '/channels/{id}/messages',     // Message sending
  '/interactions/{id}/callback', // Interaction responses
  '/channels/{id}/messages/{id}', // Message editing
];

export class APIMonitor {
  private callCounts: Map<string, number> = new Map();
  private rateLimitHits: number = 0;
  private invalidRequests: number = 0;
  private startTime: Date = new Date();
  private routeRateLimits: Map<string, RateLimitInfo> = new Map();
  
  // Time-based tracking
  private callsIn60Seconds: Array<{ timestamp: number; route: string }> = [];
  private timeWindows: TimeWindow[] = [];
  private currentWindow: TimeWindow = { startTime: Date.now(), calls: 0 };

  trackAPICall(method: string, route: string, rateLimitHeaders?: any): void {
    const routeKey = `${method}:${route}`;
    const now = Date.now();
    
    // Track call count
    this.callCounts.set(routeKey, (this.callCounts.get(routeKey) || 0) + 1);
    
    // Track in 60-second sliding window
    this.callsIn60Seconds.push({ timestamp: now, route: routeKey });
    this.cleanup60SecondWindow();
    
    // Track in current time window (for per-minute stats)
    this.currentWindow.calls++;
    if (now - this.currentWindow.startTime > 60000) {
      this.timeWindows.push({ ...this.currentWindow });
      this.currentWindow = { startTime: now, calls: 1 };
      
      // Keep only last 10 windows
      if (this.timeWindows.length > 10) {
        this.timeWindows.shift();
      }
    }
    
    // Update rate limit info if headers provided
    if (rateLimitHeaders) {
      this.updateRateLimitInfo(routeKey, rateLimitHeaders);
    }
    
    // Log individual API call
    this.logIndividualCall(method, route, rateLimitHeaders);
  }

  private updateRateLimitInfo(routeKey: string, headers: any): void {
    const rateLimitInfo: RateLimitInfo = {
      limit: parseInt(headers.limit || '0'),
      remaining: parseInt(headers.remaining || '0'),
      resetAfter: parseFloat(headers.resetAfter || '0'),
      bucket: headers.bucket || 'unknown',
      lastUpdated: Date.now()
    };
    
    this.routeRateLimits.set(routeKey, rateLimitInfo);
    
    // FIXED LOGIC: Only warn for critical routes with low rate limits
    if (this.shouldWarnForRoute(routeKey, rateLimitInfo)) {
      console.warn(`⚠️ LOW RATE LIMIT: ${routeKey} has ${rateLimitInfo.remaining}/${rateLimitInfo.limit} remaining`);
    }
  }

  private shouldWarnForRoute(routeKey: string, rateLimitInfo: RateLimitInfo): boolean {
    // Don't warn if remaining > 5
    if (rateLimitInfo.remaining > 5) return false;
    
    // Don't warn for routes that naturally have low limits
    const route = routeKey.split(':')[1] || routeKey;
    if (IGNORE_LOW_RATE_LIMIT_ROUTES.some(ignoredRoute => route.includes(ignoredRoute))) {
      return false;
    }
    
    // Always warn for critical routes with very low limits
    if (CRITICAL_ROUTES.some(criticalRoute => route.includes(criticalRoute)) && rateLimitInfo.remaining <= 2) {
      return true;
    }
    
    // Warn for other routes only if remaining is 1 or 0
    return rateLimitInfo.remaining <= 1;
  }

  private logIndividualCall(method: string, route: string, rateLimitHeaders?: any): void {
    const routeKey = `${method}:${route}`;
    const callsLast60 = this.getCallsLast60Seconds();
    const globalRPS = callsLast60 / 60;
    
    console.log(`📡 API Call: ${routeKey} | 60s: ${callsLast60} calls | Global RPS: ${globalRPS.toFixed(2)}/50`);
    
    // Enhanced logging for critical routes
    if (CRITICAL_ROUTES.some(criticalRoute => route.includes(criticalRoute))) {
      const routeCalls = this.callsIn60Seconds.filter(call => call.route === routeKey).length;
      console.log(`  🔥 Critical Route: ${routeCalls} calls in last 60s`);
    }
    
    // Warn if approaching global limit
    if (globalRPS > 40) {
      console.warn(`🚨 GLOBAL RATE LIMIT WARNING: ${globalRPS.toFixed(2)}/50 RPS - SLOW DOWN!`);
    }
  }

  trackRateLimit(rateLimitData?: any): void {
    this.rateLimitHits++;
    const route = rateLimitData?.route || 'unknown';
    console.warn(`🚨 RATE LIMIT HIT: ${route} | Total hits: ${this.rateLimitHits}`);
    
    // Log rate limit event to database
    this.logRateLimitEvent(rateLimitData);
  }

  trackInvalidRequest(info: string): void {
    this.invalidRequests++;
    console.warn(`❌ Invalid Request: ${info} | Total: ${this.invalidRequests}`);
  }

  private cleanup60SecondWindow(): void {
    const sixtySecondsAgo = Date.now() - 60000;
    this.callsIn60Seconds = this.callsIn60Seconds.filter(call => call.timestamp > sixtySecondsAgo);
  }

  private getCallsLast60Seconds(): number {
    this.cleanup60SecondWindow();
    return this.callsIn60Seconds.length;
  }

  getMetrics(): APICallMetrics {
    const runtime = Date.now() - this.startTime.getTime();
    const totalCalls = Array.from(this.callCounts.values()).reduce((a, b) => a + b, 0);
    const callsLast60 = this.getCallsLast60Seconds();
    
    return {
      totalCalls,
      rateLimitHits: this.rateLimitHits,
      invalidRequests: this.invalidRequests,
      callsPerMinute: totalCalls / (runtime / 60000),
      callsLast60Seconds: callsLast60,
      globalCallsPerSecond: callsLast60 / 60,
      startTime: this.startTime,
      routeBreakdown: Object.fromEntries(this.callCounts),
      rateLimitInfo: Object.fromEntries(this.routeRateLimits),
      timeWindows: [...this.timeWindows, this.currentWindow]
    };
  }

  // Enhanced logging method
  printDetailedStats(): void {
    const metrics = this.getMetrics();
    const runtime = Date.now() - this.startTime.getTime();
    
    console.log('\n📊 === DETAILED API STATISTICS ===');
    console.log(`⏱️ Runtime: ${(runtime / 1000 / 60).toFixed(1)} minutes`);
    console.log(`📈 Total Calls: ${metrics.totalCalls}`);
    console.log(`⚡ Global RPS: ${metrics.globalCallsPerSecond.toFixed(2)}/50 (${(metrics.globalCallsPerSecond/50*100).toFixed(1)}%)`);
    console.log(`📊 Last 60s: ${metrics.callsLast60Seconds} calls`);
    console.log(`🚨 Rate Limits Hit: ${metrics.rateLimitHits}`);
    console.log(`❌ Invalid Requests: ${metrics.invalidRequests}`);
    
    console.log('\n🔥 Top API Routes (Last 60s):');
    const routeCounts = new Map<string, number>();
    this.callsIn60Seconds.forEach(call => {
      routeCounts.set(call.route, (routeCounts.get(call.route) || 0) + 1);
    });
    
    Array.from(routeCounts.entries())
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .forEach(([route, count]) => {
        console.log(`  ${route}: ${count} calls`);
      });
    
    console.log('\n⚠️ Current Rate Limit Status:');
    this.routeRateLimits.forEach((info, route) => {
      const percentage = (info.remaining / info.limit * 100).toFixed(1);
      const status = info.remaining <= 5 ? '🔴' : info.remaining <= 10 ? '🟡' : '🟢';
      // console.log(`  ${status} ${route}: ${info.remaining}/${info.limit} (${percentage}%)`);
    });
    
    console.log('=====================================\n');
  }

  private async logRateLimitEvent(data: any): Promise<void> {
    try {
      const db = mongoClient.db("Akaimnky");
      await db.collection("rate_limits").insertOne({
        route: data?.route || 'unknown',
        method: data?.method || 'unknown',
        timeToReset: data?.timeToReset || 0,
        limit: data?.limit || 0,
        global: data?.global || false,
        timestamp: new Date(),
        callsLast60Seconds: this.getCallsLast60Seconds()
      });
    } catch (error) {
      console.error('Failed to log rate limit event:', error);
    }
  }

  reset(): void {
    this.callCounts.clear();
    this.rateLimitHits = 0;
    this.invalidRequests = 0;
    this.callsIn60Seconds = [];
    this.timeWindows = [];
    this.currentWindow = { startTime: Date.now(), calls: 0 };
    this.routeRateLimits.clear();
    this.startTime = new Date();
  }
}
