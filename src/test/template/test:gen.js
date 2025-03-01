const { generateTest } = require("./generate.js");

//  CLI로 args 받기
const args = process.argv.slice(2);
const jsonFileName = args[0] || "latest.json";

console.log(`[TEST:GEN]: 0 - Running generate.js with: ${jsonFileName}`);
generateTest(jsonFileName);
