#!/usr/bin/env node

/**
 * Script to create the first admin user
 * Usage: node scripts/create-first-admin.js
 */

import { createAdminUser } from '../lib/admin-auth.js';
import readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function main() {
  console.log('\n🔐 Taste of Gratitude - Admin User Setup\n');
  console.log('This script will create your first admin user.\n');

  try {
    const email = await question('Admin Email: ');
    const name = await question('Admin Name: ');
    const password = await question('Admin Password: ');
    const confirmPassword = await question('Confirm Password: ');

    // Validation
    if (!email || !email.includes('@')) {
      console.error('❌ Invalid email address');
      process.exit(1);
    }

    if (!name || name.trim().length === 0) {
      console.error('❌ Name is required');
      process.exit(1);
    }

    if (password.length < 8) {
      console.error('❌ Password must be at least 8 characters');
      process.exit(1);
    }

    if (password !== confirmPassword) {
      console.error('❌ Passwords do not match');
      process.exit(1);
    }

    console.log('\n⏳ Creating admin user...\n');

    const admin = await createAdminUser(email.trim(), password, name.trim());

    console.log('✅ Admin user created successfully!\n');
    console.log(`ID: ${admin.id}`);
    console.log(`Email: ${admin.email}`);
    console.log(`Name: ${admin.name}`);
    console.log(`\n🎉 You can now login at: ${process.env.NEXT_PUBLIC_BASE_URL}/admin/login\n`);

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error creating admin user:', error.message);
    process.exit(1);
  } finally {
    rl.close();
  }
}

main();
