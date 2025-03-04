// Read template and JSON files
const path = require("path");
const fs = require("fs");
const Handlebars = require("handlebars");
const { recursiveChildren } = require("../../template/helper");

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

  console.info(`[TEST:GEN] 2. ver:${versionName}`);

  const templateSource = fs.readFileSync(templatePath, "utf-8");
  const figmaData = JSON.parse(fs.readFileSync(jsonPath, "utf-8"));

  Handlebars.registerHelper(recursiveChildren.key, recursiveChildren.function);

  const template = Handlebars.compile(templateSource);

  // output 경로 확인
  const distDir = path.join(__dirname, "result", `dist-${versionName}`);
  if (!fs.existsSync(distDir)) {
    fs.mkdirSync(distDir, { recursive: true });
  }
  /* root = Document 객체 > 피그마 파일 최상단
   *  canvas = root의 children. CANVAS 타입으로 작업 공간 자체를 가리킴
   *  pagesNode = canvas의 children. 페이지별로 문서 단위로 나뉘어짐
   * */
  const rootNodeName = "truth-resume";
  const pagesNode = figmaData?.document?.children[0]?.children;

  const isRootNode =
    figmaData.document &&
    figmaData.document.children?.length > 0 &&
    figmaData.document.children[0]?.name === rootNodeName &&
    !!pagesNode;

  if (isRootNode) {
    const totalPageLength = pagesNode.length;
    // NOTE: document의 children을 가져와 page 별로 각각 개별 HTML 생성
    pagesNode.forEach((child, i) => {
      const pageName = child.name
        .replace(/\b(col-\d+|row-\d+)\b/g, "")
        .trim()
        .replace(/\s+/g, "-")
        .toLowerCase();

      let outputHtml = template(child);
      outputHtml = outputHtml.replace(
        `href="./template.css"`,
        `href="/dist/template.css"`,
      );

      const outputSubPath = i === 0 ? [distDir] : [distDir, pageName];
      const outputDir = path.join(...outputSubPath);
      const outputPath = path.join(outputDir, "index.html");

      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      fs.writeFileSync(outputPath, outputHtml, "utf-8");
      console.info(
        `✅[BUILD]: HTML 생성 완료 dist/${pageName} \n ${i + 1}/${totalPageLength} (TOTAL) `,
      );
    });
  }

  console.info(`✅[TEST:GEN]: DONE output save all pages in ${distDir}`);
}

module.exports = { generateTest };
