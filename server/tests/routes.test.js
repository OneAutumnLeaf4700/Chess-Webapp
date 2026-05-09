const path = require('path');
const express = require('express');
const request = require('supertest');

const routes = require('../routes');

function buildApp() {
  const app = express();
  app.use(express.static(path.join(__dirname, '../../client')));
  routes(app);
  return app;
}

describe('routes', () => {
  let app;
  beforeAll(() => { app = buildApp(); });

  test('GET / serves the main menu HTML', async () => {
    const res = await request(app).get('/');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/html/);
  });

  test('GET /singleplayer serves the singleplayer menu HTML', async () => {
    const res = await request(app).get('/singleplayer');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/html/);
  });

  test('GET /multiplayer serves the multiplayer menu HTML', async () => {
    const res = await request(app).get('/multiplayer');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/html/);
  });

  test('GET /game/:gameId serves the game HTML for any id', async () => {
    const res = await request(app).get('/game/some-game-id-123');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/html/);
  });

  test('GET /unknown-route returns 404', async () => {
    const res = await request(app).get('/this-route-does-not-exist');
    expect(res.status).toBe(404);
  });
});
