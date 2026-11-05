#!/usr/bin/env node
/**
 * Session 80.45/80.49 — Contrast Gate Wrapper (deploy-safe).
 *
 * Wrapper um `python3 scripts/check-contrast.py`, damit der prebuild-Hook
 * NICHT in Build-Containern crasht, die kein Python3 auf PATH haben
 * (Emergent-Deploy-Node-Image). Verhalten:
 *
 *   - Python3 verfügbar → Contrast-Check läuft und blockiert bei FAIL (exit ≠ 0).
 *   - Python3 fehlt      → Warnung ausgeben, weiter mit exit 0.
 *
 * Lokale Dev + CI (mit Python3) behalten die volle strikte Regression.
 * Der Deploy-Build wird nicht mehr durch fehlendes Python3 geblockt.
 */
const { spawnSync } = require('child_process');
const path = require('path');

function hasPython3() {
  const probe = spawnSync('python3', ['--version'], { stdio: 'ignore' });
  return probe.status === 0;
}

if (!hasPython3()) {
  console.warn('⚠️  contrast:check skipped — python3 not available in this build environment.');
  console.warn('   Run `yarn contrast:check` locally or in a CI stage that has Python 3.');
  process.exit(0);
}

const scriptPath = path.join(__dirname, 'check-contrast.py');
const result = spawnSync('python3', [scriptPath], { stdio: 'inherit' });
process.exit(result.status ?? 0);
