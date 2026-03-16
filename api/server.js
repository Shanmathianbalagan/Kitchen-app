const express = require('express');
const { MongoClient, ObjectId } = require('mongodb');
const client = require('prom-client');
const crypto = require('crypto');

const app = express();
app.use(express.json());
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});
const register = new client.Registry();
client.collectDefaultMetrics({ register });

const httpRequestsTotal = new client.Counter({ name: 'http_requests_total', help: 'Total number of HTTP requests', labelNames: ['method', 'route', 'status_code'], registers: [register] });
const httpRequestDurationSeconds = new client.Histogram({ name: 'http_request_duration_seconds', help: 'HTTP request duration in seconds', labelNames: ['method', 'route', 'status_code'], buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5], registers: [register] });
const kitchenOrdersCreatedTotal = new client.Counter({ name: 'kitchen_orders_created_total', help: 'Total number of kitchen orders created', registers: [register] });

let ordersCollection = null;
let recipesCollection = null;
let usersCollection = null;
let sessionsCollection = null;
let orderStatusWorkerStarted = false;
const ENABLE_ORDER_SIMULATION = process.env.ENABLE_ORDER_SIMULATION !== 'false' && process.env.NODE_ENV !== 'test';
const REQUIRE_AUTH = process.env.REQUIRE_AUTH !== 'false';
const ORDER_STATUS_FLOW = { pending: { next: 'preparing', afterMs: 5000 }, preparing: { next: 'ready', afterMs: 5000 }, ready: { next: 'served', afterMs: 5000 } };
const RECIPES = [
  { id: 'r1', title: 'Citrus grain bowl', description: 'Bright, high-protein bowls with chickpeas and tahini drizzle.', prepMinutes: 12, calories: 520, tags: ['high protein', '30-minute meals'], image: 'assets/recipe-1.svg' },
  { id: 'r2', title: 'Harissa roasted chicken', description: 'Juicy thighs with quick-pickled onions and warm spices.', prepMinutes: 18, calories: 610, tags: ['family friendly', 'batch cook'], image: 'assets/recipe-2.svg' },
  { id: 'r3', title: 'Herb pesto gnocchi', description: 'Comforting and fast, with fresh pesto and shaved parmesan.', prepMinutes: 15, calories: 540, tags: ['vegetarian', 'quick'], image: 'assets/recipe-3.svg' },
  { id: 'r4', title: 'Toasted veggie stew', description: 'Slow-roasted vegetables with warm broth and herbs.', prepMinutes: 25, calories: 430, tags: ['low waste', 'seasonal'], image: 'assets/recipe-1.svg' },
  { id: 'r5', title: 'Lemon herb salmon', description: 'Simple, bright flavors with olive oil and seasonal greens.', prepMinutes: 20, calories: 580, tags: ['high protein'], image: 'assets/recipe-2.svg' },
  { id: 'r6', title: 'Spicy soba salad', description: 'Chilled noodles with sesame, lime, and crunchy veg.', prepMinutes: 14, calories: 490, tags: ['seasonal', 'quick'], image: 'assets/recipe-3.svg' }
];

function makeSalt() {
  return crypto.randomBytes(16).toString('hex');
}

function hashPassword(password, salt) {
  return crypto.createHash('sha256').update(`${salt}:${password}`).digest('hex');
}

function makeToken() {
  return crypto.randomBytes(24).toString('hex');
}

function startOrderStatusWorker() {
  if (!ENABLE_ORDER_SIMULATION || orderStatusWorkerStarted || !ordersCollection) return;
  orderStatusWorkerStarted = true;
  const interval = setInterval(async () => {
    try {
      const now = new Date();
      const unscheduled = await ordersCollection.find({ status: { $in: Object.keys(ORDER_STATUS_FLOW) }, $or: [{ nextStatus: { $exists: false } }, { nextStatusAt: { $exists: false } }] }).limit(25).toArray();
      for (const order of unscheduled) {
        const flow = ORDER_STATUS_FLOW[order?.status];
        if (!flow) continue;
        await ordersCollection.updateOne({ _id: order._id, status: order.status, nextStatus: { $exists: false } }, { $set: { nextStatus: flow.next, nextStatusAt: new Date(now.getTime() + flow.afterMs) } });
      }
      const due = await ordersCollection.find({ nextStatusAt: { $lte: now }, nextStatus: { $type: 'string' } }).limit(25).toArray();
      for (const order of due) {
        const newStatus = order?.nextStatus;
        if (!newStatus) continue;
        const next = ORDER_STATUS_FLOW[newStatus];
        const update = next ? { $set: { status: newStatus, statusUpdatedAt: now, nextStatus: next.next, nextStatusAt: new Date(now.getTime() + next.afterMs) } } : { $set: { status: newStatus, statusUpdatedAt: now }, $unset: { nextStatus: '', nextStatusAt: '' } };
        await ordersCollection.updateOne({ _id: order._id }, update);
      }
    } catch (e) { console.error('Order simulation worker error:', e.message); }
  }, 1000);
  if (typeof interval.unref === 'function') interval.unref();
}

function normalizeRoute(path) {
  if (path === '/metrics' || path === '/health' || path === '/ready') return path;
  if (path === '/orders' || path.startsWith('/orders')) return '/orders';
  return path;
}
app.use((req, res, next) => {
  const start = Date.now();
  const route = normalizeRoute(req.route?.path || req.path);
  res.on('finish', () => {
    const status = String(res.statusCode);
    const duration = (Date.now() - start) / 1000;
    httpRequestsTotal.inc({ method: req.method, route, status_code: status });
    httpRequestDurationSeconds.observe({ method: req.method, route, status_code: status }, duration);
  });
  next();
});

async function seedRecipes() {
  if (!recipesCollection) return;
  const count = await recipesCollection.countDocuments();
  if (count === 0) {
    const now = new Date();
    await recipesCollection.insertMany(RECIPES.map((recipe) => ({ ...recipe, createdAt: now })));
  }
}

async function connectDb() {
  const uri = process.env.MONGO_URI || 'mongodb://localhost:27017';
  try {
    const mongo = await MongoClient.connect(uri);
    const db = mongo.db('kitchen');
    ordersCollection = db.collection('orders');
    recipesCollection = db.collection('recipes');
    usersCollection = db.collection('users');
    sessionsCollection = db.collection('sessions');
    startOrderStatusWorker();
    await seedRecipes();
    return true;
  } catch {
    return false;
  }
}

async function authRequired(req, res, next) {
  if (!REQUIRE_AUTH) return next();
  if (!sessionsCollection || !usersCollection) return res.status(503).json({ error: 'Database not connected' });
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Missing token' });
  const session = await sessionsCollection.findOne({ token });
  if (!session) return res.status(401).json({ error: 'Invalid token' });
  const user = await usersCollection.findOne({ _id: new ObjectId(session.userId) });
  if (!user) return res.status(401).json({ error: 'User not found' });
  req.user = user;
  next();
}

app.get('/health', (req, res) => res.json({ status: 'ok', db: ordersCollection ? 'connected' : 'disconnected' }));
app.get('/ready', (req, res) => res.status(200).send('OK'));
app.get('/metrics', async (req, res) => { res.set('Content-Type', register.contentType); res.end(await register.metrics()); });

app.get('/recipes', async (req, res) => {
  if (!recipesCollection) return res.status(503).json({ error: 'Database not connected' });
  const recipes = await recipesCollection.find({}).toArray();
  res.json(recipes);
});
app.get('/recipes/:id', async (req, res) => {
  if (!recipesCollection) return res.status(503).json({ error: 'Database not connected' });
  const recipe = await recipesCollection.findOne({ id: req.params.id });
  if (!recipe) return res.status(404).json({ error: 'Recipe not found' });
  res.json(recipe);
});

app.post('/auth/signup', async (req, res) => {
  const name = req.body?.name;
  const email = req.body?.email;
  const password = req.body?.password;
  if (!usersCollection || !sessionsCollection) return res.status(503).json({ error: 'Database not connected' });
  if (!name || !email || !password) return res.status(400).json({ error: 'Missing fields' });
  const existing = await usersCollection.findOne({ email });
  if (existing) return res.status(409).json({ error: 'Account already exists' });
  const salt = makeSalt();
  const passwordHash = hashPassword(password, salt);
  const doc = { name, email, passwordHash, passwordSalt: salt, createdAt: new Date() };
  const result = await usersCollection.insertOne(doc);
  const token = makeToken();
  await sessionsCollection.insertOne({ token, userId: result.insertedId.toString(), createdAt: new Date() });
  res.status(201).json({ token, user: { name, email } });
});

app.post('/auth/login', async (req, res) => {
  const email = req.body?.email;
  const password = req.body?.password;
  if (!usersCollection || !sessionsCollection) return res.status(503).json({ error: 'Database not connected' });
  if (!email || !password) return res.status(400).json({ error: 'Missing fields' });
  const user = await usersCollection.findOne({ email });
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });
  const passwordHash = hashPassword(password, user.passwordSalt);
  if (passwordHash !== user.passwordHash) return res.status(401).json({ error: 'Invalid credentials' });
  const token = makeToken();
  await sessionsCollection.insertOne({ token, userId: user._id.toString(), createdAt: new Date() });
  res.json({ token, user: { name: user.name, email: user.email } });
});

app.get('/me', authRequired, async (req, res) => {
  const user = req.user;
  res.json({ name: user.name, email: user.email });
});

app.get('/orders', authRequired, async (req, res) => {
  if (!ordersCollection) return res.status(503).json({ error: 'Database not connected' });
  const orders = await ordersCollection.find({}).toArray();
  res.json(orders);
});
app.post('/orders', authRequired, async (req, res) => {
  if (!ordersCollection) return res.status(503).json({ error: 'Database not connected' });
  const dish = req.body?.dish;
  if (!dish) return res.status(400).json({ error: 'Missing dish' });
  const now = new Date();
  const doc = { dish, status: 'pending', createdAt: now, statusUpdatedAt: now };
  if (ENABLE_ORDER_SIMULATION) {
    doc.nextStatus = ORDER_STATUS_FLOW.pending.next;
    doc.nextStatusAt = new Date(now.getTime() + ORDER_STATUS_FLOW.pending.afterMs);
  }
  const result = await ordersCollection.insertOne(doc);
  kitchenOrdersCreatedTotal.inc();
  res.status(201).json({ _id: result.insertedId, ...doc });
});

const PORT = Number(process.env.PORT) || 3000;
async function start() { await connectDb(); app.listen(PORT, () => console.log(`Kitchen API listening on port ${PORT}`)); }
if (require.main === module) start().catch(console.error);
module.exports = app;
module.exports.connectDb = connectDb;
