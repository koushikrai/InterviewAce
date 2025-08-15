#!/usr/bin/env node

/**
 * AI Services Monitoring Script
 * 
 * This script helps monitor the health of your Python AI services
 * and identifies when fallbacks are being triggered.
 * 
 * Usage:
 * node monitor-ai-services.js
 * 
 * Or add to package.json scripts:
 * "monitor:ai": "node src/server/monitor-ai-services.js"
 */

import axios from 'axios';
import { checkAIServiceHealth } from './services/aiService.js';

const API_BASE_URL = process.env.VITE_API_URL || 'http://localhost:3000';

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

const log = (message, color = colors.reset) => {
  console.log(`${color}${message}${colors.reset}`);
};

const logHeader = (title) => {
  log('\n' + '='.repeat(50), colors.bright);
  log(` ${title}`, colors.bright);
  log('='.repeat(50), colors.bright);
};

const logServiceStatus = (serviceName, isHealthy, details = '') => {
  const status = isHealthy ? '✅ HEALTHY' : '❌ UNHEALTHY';
  const color = isHealthy ? colors.green : colors.red;
  log(`  ${serviceName}: ${status}`, color);
  if (details) {
    log(`    ${details}`, colors.yellow);
  }
};

const checkServerHealth = async () => {
  try {
    logHeader('SERVER HEALTH CHECK');
    
    const response = await axios.get(`${API_BASE_URL}/health`);
    log(`  Server Status: ✅ RUNNING`, colors.green);
    log(`  Response Time: ${response.headers['x-response-time'] || 'N/A'}`);
    log(`  Timestamp: ${response.data.timestamp}`);
    
    return true;
  } catch (error) {
    log(`  Server Status: ❌ UNREACHABLE`, colors.red);
    log(`  Error: ${error.message}`, colors.red);
    return false;
  }
};

const checkAIServices = async () => {
  try {
    logHeader('AI SERVICES HEALTH CHECK');
    
    const aiHealth = await checkAIServiceHealth();
    
    logServiceStatus('Resume Parser', aiHealth.resumeParser);
    logServiceStatus('Interview Generator', aiHealth.interviewGenerator);
    logServiceStatus('Answer Feedback', aiHealth.answerFeedback);
    
    log(`\n  Overall AI Services Status:`, colors.cyan);
    const allHealthy = aiHealth.resumeParser && aiHealth.interviewGenerator && aiHealth.answerFeedback;
    
    if (allHealthy) {
      log(`    🎉 ALL SERVICES HEALTHY`, colors.green);
    } else {
      log(`    ⚠️  SOME SERVICES UNHEALTHY`, colors.yellow);
      log(`    Check your Python AI services on ports 8001, 8002, 8003`, colors.yellow);
    }
    
    return aiHealth;
  } catch (error) {
    log(`  ❌ Failed to check AI services: ${error.message}`, colors.red);
    return null;
  }
};

const checkEndpoints = async () => {
  try {
    logHeader('ENDPOINT TESTING');
    
    // Test resume upload endpoint
    try {
      const response = await axios.get(`${API_BASE_URL}/resume/test`);
      log(`  Resume Endpoint: ✅ ACCESSIBLE`, colors.green);
    } catch (error) {
      if (error.response?.status === 404) {
        log(`  Resume Endpoint: ✅ EXISTS (404 expected for test)`, colors.green);
      } else {
        log(`  Resume Endpoint: ❌ ERROR - ${error.response?.status || error.message}`, colors.red);
      }
    }
    
    // Test interview endpoint
    try {
      const response = await axios.get(`${API_BASE_URL}/interview/test`);
      log(`  Interview Endpoint: ✅ ACCESSIBLE`, colors.green);
    } catch (error) {
      if (error.response?.status === 404) {
        log(`  Interview Endpoint: ✅ EXISTS (404 expected for test)`, colors.green);
      } else {
        log(`  Interview Endpoint: ❌ ERROR - ${error.response?.status || error.message}`, colors.red);
      }
    }
    
  } catch (error) {
    log(`  ❌ Endpoint testing failed: ${error.message}`, colors.red);
  }
};

const showRecommendations = (aiHealth) => {
  logHeader('RECOMMENDATIONS');
  
  if (!aiHealth) {
    log(`  ❌ Cannot determine AI service status`, colors.red);
    return;
  }
  
  const issues = [];
  
  if (!aiHealth.resumeParser) {
    issues.push('Resume Parser service is down');
  }
  
  if (!aiHealth.interviewGenerator) {
    issues.push('Interview Generator service is down');
  }
  
  if (!aiHealth.answerFeedback) {
    issues.push('Answer Feedback service is down');
  }
  
  if (issues.length === 0) {
    log(`  🎉 All AI services are healthy!`, colors.green);
    log(`  Your application should be working with full AI capabilities.`, colors.green);
  } else {
    log(`  ⚠️  Issues detected:`, colors.yellow);
    issues.forEach(issue => log(`    • ${issue}`, colors.red));
    
    log(`\n  🔧 Troubleshooting steps:`, colors.cyan);
    log(`    1. Check if Python AI services are running:`, colors.cyan);
    log(`       - Resume Parser: http://localhost:8001/health`, colors.cyan);
    log(`       - Interview Generator: http://localhost:8002/health`, colors.cyan);
    log(`       - Answer Feedback: http://localhost:8003/health`, colors.cyan);
    log(`    2. Verify environment variables are set correctly`, colors.cyan);
    log(`    3. Check Python service logs for errors`, colors.cyan);
    log(`    4. Ensure all required Python packages are installed`, colors.cyan);
  }
};

const main = async () => {
  log('🚀 InterviewAce AI Services Monitor', colors.bright + colors.cyan);
  log(`   Checking services at: ${API_BASE_URL}`, colors.cyan);
  
  const serverHealthy = await checkServerHealth();
  
  if (!serverHealthy) {
    log(`\n❌ Cannot proceed - server is not reachable`, colors.red);
    process.exit(1);
  }
  
  const aiHealth = await checkAIServices();
  await checkEndpoints();
  showRecommendations(aiHealth);
  
  logHeader('MONITORING COMPLETE');
  log(`  Run this script regularly to monitor AI service health`, colors.cyan);
  log(`  Check server logs for detailed error information`, colors.cyan);
  log(`  Monitor fallback usage in your application logs`, colors.cyan);
};

// Run the monitoring
main().catch(error => {
  log(`\n❌ Monitoring failed: ${error.message}`, colors.red);
  process.exit(1);
});
