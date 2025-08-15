# AI Services Monitoring & Troubleshooting Guide

## Overview

This guide helps you monitor the health of your Python AI services and identify when fallbacks are being triggered, which can cause inaccurate results.

## 🚨 Why Fallbacks Cause Accuracy Issues

Your application uses a hybrid AI architecture:
- **Frontend**: TypeScript/GenKit for UI interactions
- **Backend**: Python microservices for heavy AI processing

When Python AI services fail, the system falls back to hardcoded dummy data, resulting in:
- Generic, non-personalized interview questions
- Standard feedback instead of AI-generated insights
- Inconsistent user experience

## 📊 Monitoring Your AI Services

### 1. Quick Health Check

Run the monitoring script to check all AI services:

```bash
npm run monitor:ai
```

This will show you:
- ✅ Which services are healthy
- ❌ Which services are down
- 🔧 Troubleshooting recommendations

### 2. Manual Health Checks

Check individual Python AI services:

```bash
# Resume Parser Service
curl http://localhost:8001/health

# Interview Generator Service  
curl http://localhost:8002/health

# Answer Feedback Service
curl http://localhost:8003/health
```

### 3. Server Health Endpoints

Your Node.js server now provides health monitoring:

```bash
# Overall server health
curl http://localhost:3000/health

# AI services health
curl http://localhost:3000/health/ai
```

## 🔍 Identifying Fallback Usage

### 1. Check Server Logs

Look for these log patterns in your server console:

```
[AI Service - RESUME_PARSER] FALLBACK_USED: {
  "reason": "Service unavailable or failed",
  "fallbackData": { ... }
}

[AI Service - INTERVIEW_GENERATOR] FALLBACK_USED: {
  "reason": "Service unavailable or failed", 
  "fallbackQuestions": [ ... ]
}
```

### 2. Monitor Retry Attempts

Watch for retry patterns:

```
[AI Service - RESUME_PARSER] RETRY_ATTEMPT: {
  "attempt": 1,
  "maxRetries": 3,
  "delay": 1000,
  "error": "connect ECONNREFUSED 127.0.0.1:8001"
}
```

### 3. Check Final Failures

Look for when all retries are exhausted:

```
[AI Service - RESUME_PARSER] FINAL_RETRY_FAILED: {
  "attempt": 3,
  "maxRetries": 3,
  "error": "connect ECONNREFUSED 127.0.0.1:8001"
}
```

## 🛠️ Troubleshooting Common Issues

### Issue 1: Python Services Not Running

**Symptoms:**
- All AI services show as unhealthy
- Frequent fallback usage
- Connection refused errors

**Solution:**
```bash
# Start all Python AI services
npm run start-apis

# Or start individually:
uvicorn resume_parser:app --host 0.0.0.0 --port 8001
uvicorn interview_generator:app --host 0.0.0.0 --port 8002  
uvicorn answer_feedback:app --host 0.0.0.0 --port 8003
```

### Issue 2: Environment Variables Missing

**Symptoms:**
- Services show as unhealthy
- Connection timeouts

**Check your `.env` file:**
```env
RESUME_PARSER_URL=http://localhost:8001
INTERVIEW_GENERATOR_URL=http://localhost:8002
ANSWER_FEEDBACK_URL=http://localhost:8003
```

### Issue 3: Python Dependencies Missing

**Symptoms:**
- Import errors in Python services
- Services crash on startup

**Solution:**
```bash
cd src/ai-services
pip install -r requirements.txt
```

### Issue 4: Port Conflicts

**Symptoms:**
- "Address already in use" errors
- Services can't start

**Solution:**
```bash
# Check what's using the ports
netstat -ano | findstr :8001
netstat -ano | findstr :8002
netstat -ano | findstr :8003

# Kill conflicting processes or change ports
```

## 📈 Performance Monitoring

### 1. Response Times

Monitor how long AI services take to respond:

```
[AI Service - RESUME_PARSER] SUCCESS: {
  "responseStatus": 200,
  "dataKeys": ["name", "skills", "projects", "education"]
}
```

### 2. Success Rates

Track successful vs. failed AI service calls:

```
[AI Service - INTERVIEW_GENERATOR] SUCCESS: {
  "responseStatus": 200,
  "questionsGenerated": 4,
  "questions": [ ... ]
}
```

### 3. Fallback Frequency

Monitor how often fallbacks are used:

```
[AI Service - ANSWER_FEEDBACK] FALLBACK_USED: {
  "reason": "Service unavailable or failed",
  "fallbackFeedback": { ... }
}
```

## 🔧 Advanced Configuration

### 1. Retry Settings

Adjust retry behavior in `src/server/services/aiService.ts`:

```typescript
const RETRY_CONFIG = {
  maxRetries: 3,        // Number of retry attempts
  baseDelay: 1000,      // Initial delay in milliseconds
  maxDelay: 10000,      // Maximum delay in milliseconds
  timeout: 15000,       // Request timeout in milliseconds
};
```

### 2. Health Check Intervals

The health check endpoint (`/health/ai`) can be called:
- On application startup
- Periodically (every 5-10 minutes)
- Before critical AI operations
- When users report issues

### 3. Logging Levels

The monitoring system provides three log levels:
- **INFO**: Normal operations, success events
- **WARN**: Retry attempts, fallback usage
- **ERROR**: Service failures, connection errors

## 🚀 Best Practices

### 1. Regular Monitoring

- Run `npm run monitor:ai` daily
- Check server logs for fallback patterns
- Monitor Python service logs

### 2. Proactive Maintenance

- Restart Python services if they become unresponsive
- Check Python service logs for memory leaks
- Monitor system resources (CPU, memory)

### 3. User Communication

- Inform users when AI services are degraded
- Provide fallback content gracefully
- Set expectations about AI capabilities

### 4. Backup Strategies

- Consider multiple AI service instances
- Implement circuit breakers for failing services
- Cache successful AI responses

## 📞 Getting Help

If you continue to experience issues:

1. **Check the monitoring script output** for specific error details
2. **Review server logs** for fallback patterns
3. **Verify Python services** are running and accessible
4. **Check environment variables** are set correctly
5. **Ensure all dependencies** are installed

## 🔄 Continuous Improvement

The monitoring system helps you:
- Identify patterns in AI service failures
- Optimize retry strategies
- Improve fallback content quality
- Maintain high AI service reliability

Remember: **Healthy AI services = Accurate results = Better user experience**
