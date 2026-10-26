const env = require('./src/config/env');
const app = require('./src/app');
const { connect, disconnect } = require('./src/config/db');
const { startGuestSweeper } = require('./src/services/guestCleanup');

async function main() {
  try {
    await connect(env.mongoUri);
  } catch (e) {
    console.error('MongoDB connection failed:', e.message);
    console.error('Start MongoDB first (e.g. "npm run db:up" from the project root) and check MONGO_URI in backend/.env');
    process.exit(1);
  }
  console.log('MongoDB connected');
  startGuestSweeper();
  const server = app.listen(env.port, () => console.log(`UniView API running on http://localhost:${env.port}  (health: /api/health)`));

  const stop = async sig => {
    console.log(`\n${sig} received, shutting down...`);
    server.close(async () => { await disconnect(); process.exit(0); });
    setTimeout(() => process.exit(1), 8000).unref();
  };
  process.on('SIGINT', () => stop('SIGINT'));
  process.on('SIGTERM', () => stop('SIGTERM'));
}

process.on('unhandledRejection', e => console.error('Unhandled rejection:', e));
main();
