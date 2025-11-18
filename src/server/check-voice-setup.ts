#!/usr/bin/env npx tsx
/**
 * Voice Interview Setup Diagnostics
 * 
 * This script verifies that the voice-to-text (STT) service is properly configured
 * and can communicate with the Whisper model.
 * 
 * Usage:
 *   npm run check:voice
 *   npx tsx src/server/check-voice-setup.ts
 */

import axios from 'axios';
import { execSync } from 'child_process';

interface CheckResult {
  name: string;
  status: 'pass' | 'fail' | 'warn';
  message: string;
}

const results: CheckResult[] = [];

console.log('\n' + '='.repeat(60));
console.log('🔍 Voice Interview Setup Diagnostics');
console.log('='.repeat(60) + '\n');

// Check 1: Voice Service Port
console.log('1️⃣  Checking Voice Service (port 5000)...');
try {
  const response = await axios.get('http://localhost:5000/health', {
    timeout: 3000,
  });
  console.log('   ✅ Voice service is running');
  console.log(`   Model: ${response.data.model}`);
  console.log(`   Status: ${response.data.status}`);
  results.push({
    name: 'Voice Service',
    status: response.data.status === 'ok' ? 'pass' : 'warn',
    message: response.data.status === 'ok' 
      ? 'Service running and model loaded' 
      : 'Service running but model not yet loaded'
  });
} catch (error) {
  console.log('   ❌ Voice service NOT running on port 5000');
  console.log('   Quick fix: npm run start-apis');
  results.push({
    name: 'Voice Service',
    status: 'fail',
    message: 'Not running on port 5000. Run: npm run start-apis'
  });
}

// Check 2: Whisper Model
console.log('\n2️⃣  Checking Whisper Installation...');
try {
  const output = execSync('pip show openai-whisper').toString();
  const version = output.match(/Version: ([^\n]+)/)?.[1];
  console.log(`   ✅ Whisper installed (${version})`);
  results.push({
    name: 'Whisper Package',
    status: 'pass',
    message: `Installed version ${version}`
  });
} catch {
  console.log('   ❌ Whisper not installed');
  console.log('   Fix: pip install openai-whisper');
  results.push({
    name: 'Whisper Package',
    status: 'fail',
    message: 'Not installed. Run: pip install openai-whisper'
  });
}

// Check 3: FFmpeg
console.log('\n3️⃣  Checking FFmpeg...');
try {
  execSync('ffmpeg -version 2>/dev/null', { stdio: 'pipe' });
  console.log('   ✅ FFmpeg installed');
  results.push({
    name: 'FFmpeg',
    status: 'pass',
    message: 'Installed and available'
  });
} catch {
  console.log('   ⚠️  FFmpeg NOT found (optional)');
  console.log('   WebM files will be processed without conversion');
  console.log('   Install: brew install ffmpeg (Mac) or choco install ffmpeg (Windows)');
  results.push({
    name: 'FFmpeg',
    status: 'warn',
    message: 'Not installed (optional). WebM processing will work but slower.'
  });
}

// Check 4: Python Version
console.log('\n4️⃣  Checking Python Version...');
try {
  const version = execSync('python --version').toString().trim();
  console.log(`   ✅ ${version}`);
  results.push({
    name: 'Python Version',
    status: 'pass',
    message: version
  });
} catch {
  console.log('   ❌ Python not found');
  results.push({
    name: 'Python Version',
    status: 'fail',
    message: 'Python not found in PATH'
  });
}

// Check 5: Network connectivity to port 5000
console.log('\n5️⃣  Checking Network...');
try {
  const start = Date.now();
  await axios.get('http://localhost:5000/health', { timeout: 1000 });
  const latency = Date.now() - start;
  console.log(`   ✅ Port 5000 accessible (${latency}ms latency)`);
  results.push({
    name: 'Network Latency',
    status: latency < 100 ? 'pass' : 'warn',
    message: `${latency}ms latency to voice service`
  });
} catch {
  console.log('   ⚠️  Port 5000 not accessible');
  results.push({
    name: 'Network Latency',
    status: 'warn',
    message: 'Voice service not responding'
  });
}

// Summary
console.log('\n' + '='.repeat(60));
console.log('📋 Summary\n');

let passCount = 0;
let failCount = 0;
let warnCount = 0;

results.forEach(result => {
  const icon = result.status === 'pass' ? '✅' : result.status === 'fail' ? '❌' : '⚠️';
  console.log(`${icon} ${result.name.padEnd(25)} ${result.message}`);
  if (result.status === 'pass') passCount++;
  else if (result.status === 'fail') failCount++;
  else warnCount++;
});

console.log('\n' + '-'.repeat(60));
console.log(`✅ Passed: ${passCount}  ❌ Failed: ${failCount}  ⚠️  Warnings: ${warnCount}`);
console.log('-'.repeat(60));

// Recommendations
console.log('\n💡 Recommendations:\n');

if (failCount === 0) {
  console.log('🎉 All critical checks passed! Voice interview is ready to use.');
  console.log('\nNext steps:');
  console.log('1. Go to Mock Interview page');
  console.log('2. Select "Voice Mode"');
  console.log('3. Click the microphone button');
  console.log('4. Speak your answer');
  console.log('5. Transcript should appear in 5-30 seconds\n');
} else {
  console.log('Please fix the failed checks above:');
  results.filter(r => r.status === 'fail').forEach(r => {
    console.log(`- ${r.name}: ${r.message}`);
  });
  console.log();
}

if (warnCount > 0) {
  console.log('⚠️  Warnings (optional but recommended):');
  results.filter(r => r.status === 'warn').forEach(r => {
    console.log(`- ${r.name}: ${r.message}`);
  });
  console.log();
}

console.log('='.repeat(60) + '\n');

// Exit with appropriate code
process.exit(failCount > 0 ? 1 : 0);
