import { main } from './index.js';

const code = await main(process.argv.slice(2));
process.exitCode = code;
