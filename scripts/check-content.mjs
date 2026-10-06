// Content gate. Runs before every build and fails it on:
//  - a sourced fact (status other than personal / general-knowledge) without sourceUrl / retrievedOn
//  - a bubble over 35 words, a bubble range under 60vh, or two ranges overlapping
//  - a time that does not parse, or race splits more than 2% off the PR they belong to
// It warns (does not fail) on entries still marked placeholder, so a draft site can be built.
import { readFileSync } from 'node:fs';
import { toSec, fmt } from './time.mjs';

const read = (f) => JSON.parse(readFileSync(new URL(`../src/content/${f}`, import.meta.url)));
const { bubbles } = read('bubbles.json');
const { prs } = read('prs.json');
const { race, notes } = read('race.json');
const { projects } = read('projects.json');
const errors = [];
const warnings = [];

for (const b of bubbles) {
  const where = `bubble ${b.id}`;
  if (b.status === 'draft') errors.push(`${where}: status is draft`);
  if (!['personal', 'general-knowledge'].includes(b.status)) {
    if (!b.sourceUrl) errors.push(`${where}: sourceUrl is empty`);
    if (!b.retrievedOn) errors.push(`${where}: retrievedOn is empty`);
  }
  const words = b.text.trim().split(/\s+/).length;
  if (words > 35) errors.push(`${where}: ${words} words (max 35)`);
  const span = b.scrollRange.to - b.scrollRange.from;
  if (span < 60) errors.push(`${where}: scroll range ${span}vh (min 60vh)`);
}
const sorted = [...bubbles].sort((a, b) => a.scrollRange.from - b.scrollRange.from);
for (let i = 1; i < sorted.length; i++) {
  if (sorted[i].scrollRange.from < sorted[i - 1].scrollRange.to) {
    errors.push(`${sorted[i - 1].id} and ${sorted[i].id} overlap; cut one`);
  }
}

for (const p of prs) {
  try {
    toSec(p.time);
  } catch (e) {
    errors.push(`pr ${p.id}: ${e.message}`);
  }
  if (p.placeholder) warnings.push(`pr ${p.id}: ${p.time} is a placeholder`);
}

const pr = prs.find((p) => p.id === race.prId);
if (!pr) errors.push(`race: prId "${race.prId}" is not in prs.json`);
else {
  const sum = race.splits.reduce((a, s) => a + toSec(s), 0);
  const off = Math.abs(sum - toSec(pr.time));
  if (off > toSec(pr.time) * 0.02) {
    errors.push(`race: splits add up to ${fmt(sum)} but the ${pr.label} PR is ${pr.time}`);
  } else if (off > 0) {
    warnings.push(`race: splits add up to ${fmt(sum)}, the official ${pr.label} time is ${pr.time}; the clock is scaled to finish on ${pr.time}`);
  }
}
if (race.placeholder) warnings.push('race: splits and notes are placeholders');
for (const n of notes) if (!(n.at >= 0 && n.at <= 1)) errors.push(`race note ${n.id}: at must be 0..1`);
for (const p of projects) if (!/^https?:\/\//.test(p.url)) errors.push(`project ${p.id}: url must be http(s)`);

if (warnings.length) console.warn(`Content warnings:\n  ${warnings.join('\n  ')}`);
if (errors.length) {
  console.error(`Content check failed:\n  ${errors.join('\n  ')}`);
  process.exit(1);
}
console.log(`Content check passed (${bubbles.length} bubbles, ${prs.length} PRs, ${race.splits.length} splits, ${projects.length} projects).`);
