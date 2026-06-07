import { execSync } from 'child_process';

const driveId = "30cb64c4-9136-4474-8b39-2888d3c4c617"; // A mock ID
const googleFolderId = "root";

try {
  // Simulate the queries
  console.log("Checking subfolders query...");
  execSync(`npx wrangler d1 execute omnidrive --local --command "SELECT * FROM drive_folders WHERE drive_account_id = '${driveId}' AND google_parent_id IS NULL"`);
  
  console.log("Checking files query...");
  execSync(`npx wrangler d1 execute omnidrive --local --command "SELECT * FROM files WHERE drive_account_id = '${driveId}' AND google_parent_id = '${googleFolderId}'"`);
  
  console.log("Queries successful.");
} catch (e) {
  console.error(e.stdout.toString());
  console.error(e.stderr.toString());
}
