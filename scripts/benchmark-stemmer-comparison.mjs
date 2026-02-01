// Performance Benchmark: natural vs snowball-stemmers
import { performance } from 'perf_hooks';
import naturalPkg from 'natural';
const { PorterStemmerDe } = naturalPkg;
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

console.log(`=== Stemmer Performance Comparison ===\n`);
console.log(`Iterations: ${ITERATIONS.toLocaleString()}`);
console.log(`Words per iteration: ${testWords.length}`);
console.log(`Total words: ${totalWords.toLocaleString()}\n`);

// === BENCHMARK 1: natural (PorterStemmerDe) ===
console.log(`--- Benchmarking natural (PorterStemmerDe) ---`);

// Warmup
for (let i = 0; i < 100; i++) {
  testWords.forEach(word => PorterStemmerDe.stem(word));
}

const startNatural = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  testWords.forEach(word => PorterStemmerDe.stem(word));
}
const endNatural = performance.now();
const naturalTime = endNatural - startNatural;

console.log(`Total time: ${naturalTime.toFixed(2)}ms`);
console.log(`Average per word: ${(naturalTime / totalWords).toFixed(4)}ms`);
console.log(`Throughput: ${((totalWords / naturalTime) * 1000).toFixed(0).toLocaleString()} words/sec\n`);

// === BENCHMARK 2: snowball-stemmers ===
console.log(`--- Benchmarking snowball-stemmers (German) ---`);

// Warmup
for (let i = 0; i < 100; i++) {
  testWords.forEach(word => germanStemmer.stem(word));
}

const startSnowball = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  testWords.forEach(word => germanStemmer.stem(word));
}
const endSnowball = performance.now();
const snowballTime = endSnowball - startSnowball;

console.log(`Total time: ${snowballTime.toFixed(2)}ms`);
console.log(`Average per word: ${(snowballTime / totalWords).toFixed(4)}ms`);
console.log(`Throughput: ${((totalWords / snowballTime) * 1000).toFixed(0).toLocaleString()} words/sec\n`);

// === COMPARISON ===
const speedup = ((naturalTime / snowballTime - 1) * 100).toFixed(1);
const sign = speedup > 0 ? '+' : '';

console.log(`=== Comparison ===`);
console.log(`natural: ${naturalTime.toFixed(2)}ms`);
console.log(`snowball-stemmers: ${snowballTime.toFixed(2)}ms`);
console.log(`Performance delta: ${sign}${speedup}%`);
console.log(`Winner: ${snowballTime < naturalTime ? 'snowball-stemmers 🚀' : 'natural'}`);

// Memory
const memUsage = process.memoryUsage();
console.log(`\n=== Memory Usage (Current Process) ===`);
console.log(`Heap used: ${(memUsage.heapUsed / 1024 / 1024).toFixed(2)} MB`);
console.log(`Heap total: ${(memUsage.heapTotal / 1024 / 1024).toFixed(2)} MB`);
