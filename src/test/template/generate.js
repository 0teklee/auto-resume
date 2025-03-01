// Read template and JSON files
const path = require("path");
const fs = require("fs");
const Handlebars = require("handlebars");
const { if_eq, recursiveChildren } = require("../../template/helper");

function generateTest(jsonFileName = "latest.json") {
  console.info("[TEST:GEN] 1. Start Generating");
  const versionName = jsonFileName.split(".")[0];
  const templatePath = path.join(
    __dirname,
    "..",
    "..",
    "template",
    "template.hbs",
  );
  const jsonPath = path.join(__dirname, "..", "input-data", jsonFileName);

  console.info(`[TEST:GEN] 2. ver:${versionName} \n INPUT-JSON:${jsonPath}`);

  const templateSource = fs.readFileSync(templatePath, "utf-8");
  const figmaData = JSON.parse(fs.readFileSync(jsonPath, "utf-8"));

  Handlebars.registerHelper(if_eq.key, if_eq.function);
  Handlebars.registerHelper(recursiveChildren.key, recursiveChildren.function);

  const template = Handlebars.compile(templateSource);
  // Generate HTML
  const output = template(figmaData);

  console.info(`✅[TEST:GEN] 3. OUTPUT:${output.slice(0, 50)}...`);

  // 테스트 html 파일 저장
  // 이름 컨밴션: test-YYYY-MM-DD-{version}.html
  const testFileName = `test-${new Date().toISOString().split("T")[0]}-${versionName}.html`;

  const outputPath = path.join(__dirname, "result", testFileName);
  fs.writeFileSync(outputPath, output, "utf-8");

  console.info(`✅[TEST:GEN]: DONE output saved to: ${outputPath}`);
}

module.exports = { generateTest };
