# QAAQ Deployment Health Guide

## Cold Start Issue Resolution

The "service unavailable" error on first load is a common issue with Replit Autoscale Deployments due to cold starts when the service scales to zero during idle periods.

### Implemented Solutions

#### 1. Health Check Endpoints
- `/health` - Basic server health status
- `/ready` - Database connectivity check

#### 2. Startup Optimizations
- Database connection warmup during boot
- Server startup time monitoring
- Improved logging for deployment diagnostics

#### 3. Keep-Alive System
- `keep-alive.js` script for production environments
- Pings health endpoint every 10 minutes
- Prevents service from scaling to zero

### Usage Instructions

#### For Development
The server includes enhanced logging to track startup performance:
```
🚀 Starting QAAQ Maritime Platform...
✅ Database connection warmed up
⚡ Server ready in XXXms
🌍 Production URL: https://qaaq.app
🔍 Health checks: /health | /ready
```

#### For Production Monitoring
Monitor these endpoints:
- `https://qaaq.app/health` - Quick health check
- `https://qaaq.app/ready` - Database connectivity verification

#### Deployment Recommendations
1. **Consider Reserved VM**: For consistent performance, upgrade to Reserved VM Deployment
2. **Monitor Cold Starts**: Track startup times using the `/health` endpoint
3. **Keep-Alive Strategy**: Run the keep-alive script to maintain warm instances

### Troubleshooting

If cold start issues persist:
1. Check server logs for startup timing
2. Verify database connectivity via `/ready` endpoint
3. Consider upgrading deployment type for critical applications
4. Monitor health check response times

### Performance Metrics
- Typical cold start: 2-5 seconds
- Warm server response: <100ms
- Database warmup: ~200ms

The health check endpoints will help Replit's infrastructure monitor your service and potentially improve cold start behavior.