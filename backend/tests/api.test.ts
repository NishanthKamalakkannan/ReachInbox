import request from 'supertest';
import { createApp } from '../src/app';

describe('API Core & Error Handling', () => {
  const app = createApp();

  it('GET /health should return 200 with service status', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.service).toBe('reachinbox-scheduler-api');
    expect(res.body.timestamp).toBeDefined();
  });

  it('GET /api/emails/scheduled without auth should return 401 UNAUTHORIZED', async () => {
    const res = await request(app).get('/api/emails/scheduled');
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('POST /api/emails/schedule without auth should return 401 UNAUTHORIZED', async () => {
    const res = await request(app).post('/api/emails/schedule').send({});
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });
});
