const { execSync } = require('child_process');
const fs = require('fs');

// Write secret without any newlines
fs.writeFileSync('secret.txt', 'cratog2025', { encoding: 'utf8' });

// Remove existing
console.log('Removing CRON_SECRET...');
execSync('npx vercel env rm CRON_SECRET production --yes', { stdio: 'inherit' });

// Add new secret from file
console.log('Adding CRON_SECRET...');
const secret = fs.readFileSync('secret.txt', 'utf8');
execSync(`echo ${secret} | npx vercel env add CRON_SECRET production`, { stdio: 'inherit' });

// Cleanup
fs.unlinkSync('secret.txt');
console.log('Done!');