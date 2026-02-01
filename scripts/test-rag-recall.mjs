// RAG Recall Test: Does snowball find the same chunks as natural?
import naturalPkg from 'natural';
const { PorterStemmerDe } = naturalPkg;
import snowballFactory from 'snowball-stemmers';

const germanStemmer = snowballFactory.newStemmer('german');

// Simplified RAG search simulation
function searchWithStemmer(query, documents, stemmer) {
  const queryTokens = query.toLowerCase().split(/\s+/)
    .map(token => stemmer.stem ? stemmer.stem(token) : PorterStemmerDe.stem(token));

  return documents.map((doc, idx) => {
    const docTokens = doc.content.toLowerCase().split(/\s+/)
      .map(token => stemmer.stem ? stemmer.stem(token) : PorterStemmerDe.stem(token));

    // Simple match count
    const matches = queryTokens.filter(qt => docTokens.includes(qt)).length;
    const score = matches / queryTokens.length;

    return { id: doc.id, title: doc.title, score, matches };
  })
  .filter(result => result.score > 0)
  .sort((a, b) => b.score - a.score);
}

// Mock knowledge base (subset of Hablará chunks)
const knowledgeBase = [
  {
    id: "emotion_stress",
    title: "Emotion: Stress",
    content: "Stress ist eine Emotion die durch hohe Anforderungen entsteht. Gestresst fühlen sich Menschen bei Überforderung."
  },
  {
    id: "emotion_joy",
    title: "Emotion: Freude",
    content: "Freude ist eine positive Emotion. Freudig, freudvoll, erfreut - all diese Varianten beschreiben Glück."
  },
  {
    id: "transcription",
    title: "Transkription",
    content: "Transkription wandelt Audio zu Text. Transkriptionen werden mit whisper.cpp erstellt. Transkribieren ist der Prozess."
  },
  {
    id: "analysis",
    title: "Analyse",
    content: "Analyse von Emotionen. Analysen werden durchgeführt. Analysieren bedeutet untersuchen."
  },
  {
    id: "communication",
    title: "Kommunikation",
    content: "Kommunikation ist Austausch. Kommunikationen können verschieden sein. Kommunikativ bedeutet gesprächig."
  }
];

// Test queries
const testQueries = [
  "Wie funktioniert Stress Emotion?",
  "Freude und Glück Gefühle",
  "Transkriptionen erstellen",
  "Emotionen analysieren",
  "Kommunikation verbessern"
];

console.log("=== RAG Recall Test: natural vs snowball ===\n");

let totalQueries = 0;
let identicalResults = 0;
let identicalTopResult = 0;

testQueries.forEach(query => {
  console.log(`Query: "${query}"`);

  const naturalResults = searchWithStemmer(query, knowledgeBase, PorterStemmerDe);
  const snowballResults = searchWithStemmer(query, knowledgeBase, germanStemmer);

  console.log("  natural  results:");
  naturalResults.slice(0, 3).forEach((r, i) => {
    console.log(`    ${i+1}. ${r.title} (score: ${r.score.toFixed(2)}, matches: ${r.matches})`);
  });

  console.log("  snowball results:");
  snowballResults.slice(0, 3).forEach((r, i) => {
    console.log(`    ${i+1}. ${r.title} (score: ${r.score.toFixed(2)}, matches: ${r.matches})`);
  });

  // Compare results
  const naturalIds = naturalResults.map(r => r.id);
  const snowballIds = snowballResults.map(r => r.id);

  const sameOrder = JSON.stringify(naturalIds) === JSON.stringify(snowballIds);
  const sameTopResult = naturalIds[0] === snowballIds[0];

  console.log(`  Match: ${sameOrder ? '✅ Identical ranking' : '⚠️ Different ranking'}`);
  console.log(`  Top Result: ${sameTopResult ? '✅ Same' : '⚠️ Different'}\n`);

  totalQueries++;
  if (sameOrder) identicalResults++;
  if (sameTopResult) identicalTopResult++;
});

console.log("=== Summary ===");
console.log(`Identical Result Rankings: ${identicalResults}/${totalQueries} (${(identicalResults/totalQueries*100).toFixed(0)}%)`);
console.log(`Identical Top Results: ${identicalTopResult}/${totalQueries} (${(identicalTopResult/totalQueries*100).toFixed(0)}%)`);

if (identicalResults === totalQueries) {
  console.log("\nVerdict: ✅ PERFECT - Zero RAG search quality degradation");
} else if (identicalTopResult === totalQueries) {
  console.log("\nVerdict: ✅ EXCELLENT - Top results identical, minor ranking differences");
} else if (identicalTopResult / totalQueries >= 0.8) {
  console.log("\nVerdict: ✅ GOOD - Most queries return same top result");
} else {
  console.log("\nVerdict: ⚠️ MODERATE - Search quality may be affected");
}
