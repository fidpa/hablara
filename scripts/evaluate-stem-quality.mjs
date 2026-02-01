// Semantic Performance: Stem Quality Analysis
import snowballFactory from 'snowball-stemmers';

const germanStemmer = snowballFactory.newStemmer('german');

// Test corpus: German morphology from Hablará domain
const testCases = [
  // Nouns (Substantive)
  { word: "Emotion", stem: "emot", variants: ["Emotionen", "Emotion", "emotionaler"] },
  { word: "Gefühl", stem: "gefuhl", variants: ["Gefühle", "Gefühl", "gefühlvoll"] },
  { word: "Stress", stem: "stress", variants: ["Stress", "stressig", "gestresst"] },
  { word: "Freude", stem: "freud", variants: ["Freude", "freudig", "freudvoll"] },
  { word: "Ärger", stem: "arg", variants: ["Ärger", "ärgerlich", "verärgert"] },

  // Verbs (Verben)
  { word: "sprechen", stem: "sprech", variants: ["spreche", "spricht", "gesprochen", "Sprechen"] },
  { word: "denken", stem: "denk", variants: ["denke", "denkt", "gedacht", "Denken"] },
  { word: "fühlen", stem: "fuhl", variants: ["fühle", "fühlt", "gefühlt", "Fühlen"] },

  // Adjectives (Adjektive)
  { word: "ruhig", stem: "ruhig", variants: ["ruhig", "ruhiger", "ruhigsten"] },
  { word: "gestresst", stem: "gestresst", variants: ["gestresst", "gestresster"] },

  // Composites (Komposita) - German specialty
  { word: "Kommunikation", stem: "kommun", variants: ["Kommunikation", "Kommunikationen", "kommunikativ"] },
  { word: "Selbstoffenbarung", stem: "selbstoffenbar", variants: ["Selbstoffenbarung", "Selbstoffenbarungen"] },

  // RAG-specific keywords
  { word: "Transkription", stem: "transkript", variants: ["Transkription", "Transkriptionen", "transkribieren"] },
  { word: "Analyse", stem: "analys", variants: ["Analyse", "Analysen", "analysieren"] },
];

console.log("=== Stem Quality Analysis ===\n");

let totalTests = 0;
let correctStems = 0;
let variantMatches = 0;
let totalVariants = 0;

testCases.forEach(({ word, stem: expectedStem, variants }) => {
  const actualStem = germanStemmer.stem(word.toLowerCase());
  const isCorrect = actualStem === expectedStem;

  totalTests++;
  if (isCorrect) correctStems++;

  console.log(`Word: ${word}`);
  console.log(`  Expected stem: ${expectedStem}`);
  console.log(`  Actual stem:   ${actualStem} ${isCorrect ? '✅' : '❌'}`);

  // Test morphological variants (should all stem to same root)
  const variantStems = variants.map(v => germanStemmer.stem(v.toLowerCase()));
  const uniqueStems = new Set(variantStems);

  console.log(`  Variants (${variants.length}):`);
  variants.forEach((v, i) => {
    console.log(`    "${v}" → "${variantStems[i]}"`);
    totalVariants++;
    if (variantStems[i] === actualStem) variantMatches++;
  });

  const allMatch = uniqueStems.size === 1;
  console.log(`  Consistency: ${allMatch ? '✅ All variants map to same stem' : '⚠️ Inconsistent stems'}`);
  console.log();
});

console.log("=== Summary ===");
console.log(`Stem Correctness: ${correctStems}/${totalTests} (${(correctStems/totalTests*100).toFixed(1)}%)`);
console.log(`Variant Consistency: ${variantMatches}/${totalVariants} (${(variantMatches/totalVariants*100).toFixed(1)}%)`);

// Calculate overall semantic quality score
const semanticQuality = (correctStems/totalTests * 0.5 + variantMatches/totalVariants * 0.5) * 100;
console.log(`\nSemantic Quality Score: ${semanticQuality.toFixed(1)}%`);

if (semanticQuality >= 90) {
  console.log("Verdict: ✅ EXCELLENT - High linguistic accuracy");
} else if (semanticQuality >= 75) {
  console.log("Verdict: ✅ GOOD - Acceptable for RAG search");
} else {
  console.log("Verdict: ⚠️ MEDIOCRE - May affect search quality");
}
