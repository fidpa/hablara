// Semantic Quality: natural vs snowball stem comparison
import naturalPkg from 'natural';
const { PorterStemmerDe } = naturalPkg;
import snowballFactory from 'snowball-stemmers';

const germanStemmer = snowballFactory.newStemmer('german');

// Test corpus: German words from Hablará domain + morphological variants
const testCases = [
  // Nouns with variants
  { base: "Emotion", variants: ["Emotionen", "emotionaler", "emotional"] },
  { base: "Gefühl", variants: ["Gefühle", "gefühlvoll", "gefühlsmäßig"] },
  { base: "Stress", variants: ["stressig", "gestresst", "Stresssituation"] },
  { base: "Freude", variants: ["freudig", "freudvoll", "erfreut"] },
  { base: "Ärger", variants: ["ärgerlich", "verärgert", "Verärgerung"] },

  // Verbs
  { base: "sprechen", variants: ["spreche", "spricht", "gesprochen", "Sprecher"] },
  { base: "denken", variants: ["denke", "denkt", "gedacht", "Gedanke"] },
  { base: "fühlen", variants: ["fühle", "fühlt", "gefühlt", "Gefühl"] },

  // RAG-relevant keywords
  { base: "Transkription", variants: ["Transkriptionen", "transkribieren", "transkribiert"] },
  { base: "Analyse", variants: ["Analysen", "analysieren", "analysiert"] },
  { base: "Kommunikation", variants: ["Kommunikationen", "kommunikativ", "kommunizieren"] },
];

console.log("=== Stem Quality Comparison: natural vs snowball ===\n");

let identicalStems = 0;
let totalWords = 0;
let identicalVariantGroups = 0;

testCases.forEach(({ base, variants }) => {
  const allWords = [base, ...variants];

  console.log(`Base word: "${base}"`);
  console.log("  Word                 → natural     | snowball");
  console.log("  " + "─".repeat(60));

  const naturalStems = [];
  const snowballStems = [];

  allWords.forEach(word => {
    const naturalStem = PorterStemmerDe.stem(word.toLowerCase());
    const snowballStem = germanStemmer.stem(word.toLowerCase());

    naturalStems.push(naturalStem);
    snowballStems.push(snowballStem);

    const match = naturalStem === snowballStem ? '✅' : '❌';
    console.log(`  ${word.padEnd(20)} → ${naturalStem.padEnd(12)} | ${snowballStem.padEnd(12)} ${match}`);

    totalWords++;
    if (naturalStem === snowballStem) identicalStems++;
  });

  // Check variant consistency
  const naturalUnique = new Set(naturalStems);
  const snowballUnique = new Set(snowballStems);

  const naturalConsistent = naturalUnique.size === 1;
  const snowballConsistent = snowballUnique.size === 1;

  console.log(`\n  Consistency:`);
  console.log(`    natural:  ${naturalConsistent ? '✅' : '⚠️'} (${naturalUnique.size} unique stems)`);
  console.log(`    snowball: ${snowballConsistent ? '✅' : '⚠️'} (${snowballUnique.size} unique stems)`);

  if (naturalConsistent && snowballConsistent && naturalStems[0] === snowballStems[0]) {
    console.log(`  → Both consistent AND identical ✅`);
    identicalVariantGroups++;
  }

  console.log();
});

console.log("=== Summary ===");
console.log(`Identical Stems: ${identicalStems}/${totalWords} (${(identicalStems/totalWords*100).toFixed(1)}%)`);
console.log(`Identical Variant Groups: ${identicalVariantGroups}/${testCases.length} (${(identicalVariantGroups/testCases.length*100).toFixed(1)}%)`);

if (identicalStems / totalWords >= 0.95) {
  console.log("\nVerdict: ✅ EXCELLENT - Near-identical stemming behavior");
} else if (identicalStems / totalWords >= 0.80) {
  console.log("\nVerdict: ✅ GOOD - Minor differences, unlikely to affect RAG");
} else if (identicalStems / totalWords >= 0.60) {
  console.log("\nVerdict: ⚠️ MODERATE - Some differences, may affect edge cases");
} else {
  console.log("\nVerdict: ❌ POOR - Significant differences, may affect search quality");
}
