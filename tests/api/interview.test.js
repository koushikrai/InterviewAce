import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import app from '../../src/server/app.js';

// Basic health check
test('GET /health should return OK', async () => {
	const res = await request(app).get('/health');
	assert.equal(res.status, 200);
	assert.equal(res.body.status, 'OK');
});

// Start interview should create a session and return questions
test('POST /interview/start should return sessionId and questions', async () => {
	const res = await request(app)
		.post('/interview/start')
		.send({ jobTitle: 'Software Engineer', mode: 'text', difficulty: 'easy', numQuestions: 3 })
		.set('Content-Type', 'application/json');
	assert.equal(res.status, 200);
	assert.ok(res.body.sessionId, 'Expected sessionId');
	assert.ok(Array.isArray(res.body.questions), 'Expected questions array');
});

// Submit answer should return feedback and session update
test('POST /interview/submit-answer should return feedback', async () => {
	// Start a session first
	const start = await request(app)
		.post('/interview/start')
		.send({ jobTitle: 'Software Engineer', mode: 'text', difficulty: 'easy', numQuestions: 1 })
		.set('Content-Type', 'application/json');
	const sessionId = start.body.sessionId;
	assert.ok(sessionId);
	const q = start.body.questions[0];
	const res = await request(app)
		.post('/interview/submit-answer')
		.send({ sessionId, question: q.question || 'Test question', answer: 'Test answer', questionCategory: 'general', difficulty: 'easy' })
		.set('Content-Type', 'application/json');
	assert.equal(res.status, 200);
	assert.equal(res.body.message, 'Answer submitted and feedback generated successfully');
	assert.ok(res.body.feedback, 'Expected feedback payload');
});
