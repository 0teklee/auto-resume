/*
## Cloudflare Pages Build Script
    목적: 최신 버전의 JSON을 R2로부터 받은 뒤, dist/index.html 생성
    실행 시점: Deploy Hook 요청 받을 시 즉시 실행.
*/
const { recursiveChildren } = require("../template/helper.js");

const fs = require("fs");
const path = require("path");
const Handlebars = require("handlebars");

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
    const resumeData = await response.json();

    // template.hbs 경로
    const templatePath = path.join(__dirname, "..", "template", "template.hbs");
    // template.hbs 로드
    const templateSource = fs.readFileSync(templatePath, "utf-8");
    Handlebars.registerHelper(
      recursiveChildren.key,
      recursiveChildren.function,
    );

    // template 컴파일
    const template = Handlebars.compile(templateSource);

    // Figma JSON을 template.hbs에 주입
    const outputHtml = template(resumeData);

    // output 경로 확인
    const distDir = path.join(__dirname, "..", "..", "dist");
    if (!fs.existsSync(distDir)) {
      fs.mkdirSync(distDir);
    }

    // 생성된 HTML을 경로 dist/index.html에 저장
    const outputPath = path.join(distDir, "index.html");
    fs.writeFileSync(outputPath, outputHtml);

    console.log("✅[BUILD]: HTML 생성 완료 dist/index.html");
  } catch (err) {
    console.error("❌[BUILD]: Build script error:", err);
    process.exit(1); // Fail the build if an error occurs
  }
})();
