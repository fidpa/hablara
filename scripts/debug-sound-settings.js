#!/usr/bin/env node

/**
 * Debug Script: Check localStorage for playStartStopSounds setting
 *
 * Run in Browser Console (not Node.js):
 * 1. Open app in browser
 * 2. Open DevTools (Cmd+Option+I)
 * 3. Go to Console tab
 * 4. Paste this code:
 */

const debugScript = `
// Check current settings
const settings = JSON.parse(localStorage.getItem('hablara-settings') || '{}');
console.log('=== Audio Settings Debug ===');
console.log('playStartStopSounds:', settings.audio?.playStartStopSounds);
console.log('soundVolume:', settings.audio?.soundVolume);
console.log('Full audio config:', settings.audio);

// Check if it matches expected
const expected = false; // Should be false if disabled
const actual = settings.audio?.playStartStopSounds;

if (actual === expected) {
  console.log('✅ Settings correct - sounds are disabled');
} else {
  console.warn('⚠️  Settings mismatch!');
  console.warn('Expected:', expected);
  console.warn('Actual:', actual);

  if (confirm('Reset audio settings to disable sounds?')) {
    settings.audio = {
      ...settings.audio,
      playStartStopSounds: false,
      soundVolume: 0.5,
    };
    localStorage.setItem('hablara-settings', JSON.stringify(settings));
    console.log('✅ Settings reset. Reload page.');
  }
}

// Check for 404 errors in network tab
console.log('\\n=== Check Network Tab ===');
console.log('1. Open Network tab');
console.log('2. Filter: "sounds"');
console.log('3. Should see NO requests if disabled');
console.log('4. If you see 404s, check browser cache');
`;

console.log(debugScript);
console.log('\n📋 Copy the code above and paste it into your Browser Console');
