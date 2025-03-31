/*
## Cloudflare Pages Build Script
    목적: 최신 버전의 JSON을 R2로부터 받은 뒤, dist/index.html 생성
    실행 시점: Deploy Hook 요청 받을 시 즉시 실행.
*/
const { recursiveChildren, generateTitle } = require("../template/helper.js");

const fs = require("fs");
const path = require("path");
const Handlebars = require("handlebars");
const { getDirectoryTree } = require("./utils.js");

Handlebars.registerHelper(recursiveChildren.key, recursiveChildren.function);
Handlebars.registerHelper(generateTitle.key, generateTitle.function);
// R2로 JSON 요청 - 즉시 실행 함수
(async () => {
  try {
    console.log("[BUILD]: Start fetching latest resume JSON from R2...");
    // 가장 최신 버전의 URL 포인터로 접근
    const response = await fetch(process.env.LATEST_FIGMA);
    if (!response.ok) {
      throw new Error(
        `❌[BUILD]: R2 request - Failed to get resume JSON : ${response.status} ${response.statusText}`,
      );
    } else {
      console.info(["[BUILD]:get latest json"]);
    }
    const figmaData = await response.json();

    // template.hbs 경로
    const templatePath = path.join(__dirname, "..", "template", "template.hbs");
    // template.hbs 로드
    const templateSource = fs.readFileSync(templatePath, "utf-8");

    // template 컴파일
    const template = Handlebars.compile(templateSource);

    // output 경로 확인
    const distDir = path.join(__dirname, "..", "..", "dist");
    if (!fs.existsSync(distDir)) {
      fs.mkdirSync(distDir, { recursive: true });
    }

    // _redirects 무시하지 않도록 설정
    const nojekyllFile = path.join(distDir, ".nojekyll");
    fs.writeFileSync(nojekyllFile, "", "utf-8");

    // _redirects 파일 경로 설정
    const redirectsFile = path.join(distDir, "_redirects");

    if (!fs.existsSync(redirectsFile)) {
      console.info("✅[BUILD]: Creating _redirects file...");
      fs.writeFileSync(redirectsFile, "", "utf-8");
    }

    // _redirects 파일을 업데이트할 배열
    const redirectsList = [];

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

    // NOTE: document의 children을 가져와 page 별로 각각 개별 HTML 생성
    if (isRootNode) {
      const totalPageLength = pagesNode.length;

      pagesNode.forEach((page, i) => {
        const pageName = page.name
          .replace(/\b(col-\d+|row-\d+)\b/g, "")
          .trim()
          .replace(/\s+/g, "-")
          .toLowerCase();

        // 개별 페이지 HTML 생성
        let outputHtml = template(page);
        const outputSubPath = i === 0 ? [distDir] : [distDir, pageName];
        const outputDir = path.join(...outputSubPath);
        const outputPath = path.join(outputDir, "index.html");

        if (!fs.existsSync(outputDir)) {
          fs.mkdirSync(outputDir, { recursive: true });
        }

        fs.writeFileSync(outputPath, outputHtml, "utf-8");

        // ✅ _redirects에 경로 추가
        redirectsList.push(`/${pageName}/* /${pageName}/:splat 200`);

        console.info(
          `✅[BUILD]: HTML 생성 완료 dist/${pageName} \n ${i + 1}/${totalPageLength} (TOTAL) `,
        );
      });
    }

    // ✅ _redirects 파일 생성 및 쓰기
    fs.writeFileSync(redirectsFile, redirectsList.join("\n"), {
      encoding: "utf-8",
      flag: "w",
    });
    console.info(
      `✅[BUILD]: _redirects 파일 생성. \n sub-paths: \n ${redirectsFile}`,
    );

    // Cloudflare Pages가 변경 감지 : dist/ 내 모든 파일 수정 시간 업데이트

    const touch = (filePath) => {
      const time = new Date();
      fs.utimesSync(filePath, time, time);
    };

    const updateFileTimestamps = (dir) => {
      const files = fs.readdirSync(dir);
      files.forEach((file) => {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
          updateFileTimestamps(fullPath);
        } else {
          touch(fullPath);
        }
      });
    };

    updateFileTimestamps(distDir);
    console.info(`✅[BUILD]: dist/ 파일 수정 시간 업데이트 완료`);

    const outputDir = getDirectoryTree(distDir);
    console.info(
      `✅[DEPLOY]: DONE output save all pages TOTAL:${pagesNode.length} \n
      save to: ${distDir} \n
      paths:
      ${outputDir}
      `,
    );

    const headersFile = path.join(distDir, "_headers");
    fs.writeFileSync(headersFile, "/*\n  Cache-Control: no-store\n", "utf-8");
    console.info(`✅[BUILD]: _headers 파일 생성 완료`);
    const files = fs.readdirSync(distDir);

    console.log("✅[BUILD]: dist/ 디렉토리 내 파일 목록: \n", files);
  } catch (err) {
    console.error("❌[BUILD]: Build script error:", err);
    process.exit(1); // Fail the build if an error occurs
  }
})();
