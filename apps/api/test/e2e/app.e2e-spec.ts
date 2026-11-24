import { INestApplication } from '@nestjs/common';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { ADMIN, FakeStorage, createTestApp } from '../create-app';

const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);

describe('ImgUrl API', () => {
  let app: INestApplication;
  let storage: FakeStorage;
  let mongo: MongoMemoryServer;
  let http: Awaited<ReturnType<typeof createTestApp>>['http'];
  let cookie: string;
  let pngId: string;
  let apiKey: string;

  beforeAll(async () => {
    ({ app, storage, mongo, http } = await createTestApp());
    const login = await http().post('/api/auth/login').send(ADMIN).expect(200);
    cookie = login.headers['set-cookie'][0].split(';')[0];
  });

  afterAll(async () => {
    await app.close();
    await mongo.stop();
  });

  it('reports health', async () => {
    const res = await http().get('/health').expect(200);
    expect(res.body).toEqual({ ok: true, mongo: 'up' });
  });

  it('sets an HttpOnly session cookie on login', () => {
    expect(cookie).toMatch(/^sid=/);
  });

  it('rejects a wrong password', async () => {
    await http().post('/api/auth/login').send({ ...ADMIN, password: 'wrongpass' }).expect(401);
  });

  it('rejects the file list without a cookie', async () => {
    await http().get('/api/files').expect(401);
  });

  it('uploads a png, sniffs its real type and returns a public url', async () => {
    const res = await http()
      .post('/api/files')
      .set('Cookie', cookie)
      .attach('file', PNG, { filename: 'x.png', contentType: 'text/html' })
      .expect(201);

    expect(res.body.kind).toBe('image');
    expect(res.body.mime).toBe('image/png');
    expect(res.body.url).toMatch(/^http:\/\/localhost\/f\/[A-Za-z0-9]{10}$/);
    pngId = res.body.id;
    expect(storage.objects.size).toBe(1);
  });

  it('rejects a pdf', async () => {
    await http()
      .post('/api/files')
      .set('Cookie', cookie)
      .attach('file', Buffer.from('%PDF-1.4\n%test'), 'doc.pdf')
      .expect(400);
  });

  it('rejects a file over 50MB with 413', async () => {
    await http()
      .post('/api/files')
      .set('Cookie', cookie)
      .attach('file', Buffer.alloc(51 * 1024 * 1024), 'big.bin')
      .expect(413);
  });

  it('redirects /f/:id to a presigned url without caching it', async () => {
    const res = await http().get(`/f/${pngId}`).expect(302);
    expect(res.headers.location).toContain('X-Amz-Signature=');
    expect(res.headers['cache-control']).toBe('no-store');
  });

  it('404s an unknown id', async () => {
    await http().get('/f/doesnotexist').expect(404);
  });

  it('counts views', async () => {
    await http().get(`/f/${pngId}`).expect(302);
    const list = await http().get('/api/files').set('Cookie', cookie).expect(200);
    expect(list.body.items[0].views).toBe(2);
  });

  it('paginates newest first', async () => {
    for (const name of ['a.png', 'b.png']) {
      await http().post('/api/files').set('Cookie', cookie).attach('file', PNG, name).expect(201);
    }
    const first = await http().get('/api/files?limit=2').set('Cookie', cookie).expect(200);
    expect(first.body.items).toHaveLength(2);
    expect(first.body.next).toBeTruthy();

    const second = await http()
      .get(`/api/files?limit=2&cursor=${first.body.next}`)
      .set('Cookie', cookie)
      .expect(200);
    expect(second.body.items).toHaveLength(1);
    expect(second.body.next).toBeUndefined();
  });

  it('counts the whole library on the first page only', async () => {
    const first = await http().get('/api/files?limit=1').set('Cookie', cookie).expect(200);
    expect(typeof first.body.total).toBe('number');
    expect(first.body.total).toBeGreaterThan(1);

    const second = await http()
      .get(`/api/files?limit=1&cursor=${first.body.next}`)
      .set('Cookie', cookie)
      .expect(200);
    expect(second.body.total).toBeUndefined();
  });

  it('treats a malformed cursor as the first page instead of failing', async () => {
    const res = await http().get('/api/files?cursor=not-base-64').set('Cookie', cookie).expect(200);
    expect(res.body.items.length).toBeGreaterThan(0);
  });

  it('deletes the object and the row, then 404s the link', async () => {
    await http().delete(`/api/files/${pngId}`).set('Cookie', cookie).expect(204);
    expect(storage.removed.length).toBeGreaterThan(0);
    await http().get(`/f/${pngId}`).expect(404);
    const list = await http().get('/api/files').set('Cookie', cookie).expect(200);
    expect(list.body.items.map((item: { id: string }) => item.id)).not.toContain(pngId);
  });

  it('still deletes the row when B2 refuses the delete', async () => {
    const created = await http()
      .post('/api/files')
      .set('Cookie', cookie)
      .attach('file', PNG, 'keep.png')
      .expect(201);

    storage.failRemove = true;
    await http().delete(`/api/files/${created.body.id}`).set('Cookie', cookie).expect(204);
    storage.failRemove = false;

    await http().get(`/f/${created.body.id}`).expect(404);
  });

  it('creates an api key and uploads with it', async () => {
    const created = await http()
      .post('/api/keys')
      .set('Cookie', cookie)
      .send({ name: 'bot' })
      .expect(201);
    apiKey = created.body.key;
    expect(apiKey).toMatch(/^ik_/);

    const res = await http()
      .post('/api/v1/files')
      .set('Authorization', `bearer ${apiKey}`)
      .attach('file', PNG, 'bot.png')
      .expect(201);
    expect(res.body.id).toHaveLength(10);
  });

  it('404s deleting a key that does not exist', async () => {
    await http().delete('/api/keys/does-not-exist').set('Cookie', cookie).expect(404);
  });

  it('rejects a revoked key', async () => {
    const list = await http().get('/api/keys').set('Cookie', cookie).expect(200);
    const keyId = list.body.items.find((item: { name: string }) => item.name === 'bot').id;
    await http().delete(`/api/keys/${keyId}`).set('Cookie', cookie).expect(204);

    await http()
      .post('/api/v1/files')
      .set('Authorization', `Bearer ${apiKey}`)
      .attach('file', PNG, 'bot.png')
      .expect(401);
  });
});
