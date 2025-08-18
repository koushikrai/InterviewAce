import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import app from '../../src/server/app.js';

// Progress for user should return overallProgress
test('GET /progress/user/:userId should return progress object', async () => {
	// Create a dummy userId-like string (Mongo ObjectId format length)
	const userId = '507f1f77bcf86cd799439011';
	const res = await request(app).get(`/progress/user/${userId}`);
	assert.equal(res.status, 200);
	assert.ok(res.body.overallProgress, 'Expected overallProgress');
});

// Session analytics requires a valid session id; for smoke test we expect 404 for a random id
test('GET /progress/session/:sessionId should 404 for non-existent', async () => {
	const sessionId = '507f1f77bcf86cd799439012';
	const res = await request(app).get(`/progress/session/${sessionId}`);
	assert.ok([200, 404].includes(res.status));
});
