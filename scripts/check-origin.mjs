import assert from 'node:assert/strict';
import { isSameOrigin } from '../lib/auth/origin.ts';
const cases = [
  [{host:'localhost:3000',origin:'http://localhost:3000'},true],
  [{host:'chat.example.com',origin:'https://chat.example.com'},true],
  [{host:'chat.example.com:443',origin:'https://chat.example.com'},true],
  [{host:'localhost:3000',origin:'https://attacker.example'},false],
  [{host:'chat.example.com',origin:'null'},false],
  [{host:'chat.example.com'},false],
  [{host:'chat.example.com',origin:'http://chat.example.com','sec-fetch-site':'cross-site'},false],
  [{host:'chat.example.com',origin:'https://attacker.example','x-forwarded-host':'attacker.example'},false],
  [{host:'chat.example.com',origin:'https://chat.example.com/path'},false],
];
for (const [headers, expected] of cases) assert.equal(isSameOrigin(new Headers(headers)),expected,JSON.stringify(headers));
console.log(`${cases.length} origin regression checks passed`);
