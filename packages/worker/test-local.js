import { exec } from 'child_process';
import fetch from 'node-fetch'; // if available

console.log("Starting worker...");
const child = exec('npx wrangler dev');

child.stdout.on('data', async (data) => {
  if (data.includes('Ready on')) {
    console.log("Worker ready!");
    try {
      // First, let's bypass auth by fetching a public route, or let's create a valid token manually
      const url = 'http://localhost:8787/api/health';
      const res = await fetch(url);
      console.log('Health check:', await res.json());

      // But we need to reproduce the 500 on /api/drives/f0c2.../folders/root
      // Let's modify drives.ts locally just to bypass auth for a moment so we can see the D1 error!
    } catch(e) { console.error(e) }
    
    child.kill();
    process.exit(0);
  }
});
