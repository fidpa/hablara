// Performance Benchmark: snowball-stemmers
import { performance } from 'perf_hooks';
import snowballFactory from 'snowball-stemmers';

const germanStemmer = snowballFactory.newStemmer('german');

// Test corpus: German words from Hablará context
const testWords = [
  "Emotionen", "gestresst", "Transkription", "Fallacy", "Ärger", "Freude",
  "Überzeugung", "Kommunikation", "Analyse", "Sprache", "Verarbeitung",
  "Aufnahme", "Speicherung", "Optimierung", "Performance", "Entwicklung",
  "Implementierung", "Architektur", "Dokumentation", "Evaluation",
  "Beobachtung", "Gefühle", "Bedürfnisse", "Bitten", "Reflexion",
  "Verzerrung", "Denkmuster", "Sachinhalt", "Selbstoffenbarung", "Beziehung"
];

const ITERATIONS = 10000;
const totalWords = ITERATIONS * testWords.length;

console.log(`=== Stemmer Performance Benchmark ===\n`);
console.log(`Iterations: ${ITERATIONS.toLocaleString()}`);
console.log(`Words per iteration: ${testWords.length}`);
console.log(`Total words: ${totalWords.toLocaleString()}\n`);

// Warmup (avoid JIT compilation skew)
for (let i = 0; i < 100; i++) {
  testWords.forEach(word => germanStemmer.stem(word));
}

// Benchmark
const startSnowball = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  testWords.forEach(word => germanStemmer.stem(word));
}
const endSnowball = performance.now();
const snowballTime = endSnowball - startSnowball;

console.log(`=== Results ===`);
console.log(`Total time: ${snowballTime.toFixed(2)}ms`);
console.log(`Average per word: ${(snowballTime / totalWords).toFixed(4)}ms`);
console.log(`Throughput: ${((totalWords / snowballTime) * 1000).toFixed(0).toLocaleString()} words/sec`);

// Memory usage
const memUsage = process.memoryUsage();
console.log(`\n=== Memory Usage ===`);
console.log(`Heap used: ${(memUsage.heapUsed / 1024 / 1024).toFixed(2)} MB`);
console.log(`Heap total: ${(memUsage.heapTotal / 1024 / 1024).toFixed(2)} MB`);
