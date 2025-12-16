#!/usr/bin/env node

const bcrypt = require('bcrypt');

const password = process.argv[2];

if (!password) {
  console.error('Usage: node generate-password.js <password>');
  process.exit(1);
}

bcrypt.hash(password, 10)
  .then(hash => {
    console.log('\nPassword hash generated:');
    console.log(hash);
    console.log('\nAdd this to your .env file as ADMIN_PASSWORD_HASH');
  })
  .catch(error => {
    console.error('Error generating hash:', error);
    process.exit(1);
  });

