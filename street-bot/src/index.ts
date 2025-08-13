import 'dotenv/config';
import { startBot } from './bot.js';

startBot().catch(err => {
  console.error('FATAL startBot', err);
  process.exit(1);
});