const { applyTextStyles, getMaxDepth } = require("./utils.js");
const Handlebars = require("handlebars");

const recursiveChildren = {
  key: "recursiveChildren",
  function(children, opts, parentMaxDepth = null) {
    let result = "";

    children.forEach((child) => {
      // 그래프 높이 계산
      const maxDepth = parentMaxDepth ?? getMaxDepth({ children });

      // 클래스 = Figma 레이어 이름
      const safeClassName = child.name ?? "";

      // list-items를 ul > li 태그로 전환
      if (safeClassName.includes("list-items")) {
        const characters = child.characters;
        // Figma 글자 스타일 override 맵핑 인덱스 사용
        const styles = child?.characterStyleOverrides || [];
        const overrideTable = child?.styleOverrideTable || {};
        const liClass = safeClassName
          .split(" ")
          .filter((item) => item !== "list-items" && item !== "link");

        // 줄바꿈을 기준으로 characters와 styles를 동일하게 분할
        let startIndex = 0;
        const lines = characters.split("\n").map((line) => {
          const lineLength = line.length;
          const styleSlice = styles.slice(startIndex, startIndex + lineLength);
          startIndex += lineLength + 1; // +1은 \n 문자 포함

          return { text: line, styleOverrides: styleSlice };
        });

        let href = Object.values(overrideTable).find(
          (style) => style?.hyperlink,
        )?.hyperlink?.url;

        const listItems = lines
          .map(({ text, styleOverrides }, i) => {
            const styledText = applyTextStyles({
              characters: text,
              characterStyleOverrides: styleOverrides,
              styleOverrideTable: overrideTable,
            });

            if (href && i === 0) {
              return `<li class=""><a class="link" target="_blank" href="${href}">${styledText}</a></li>`;
            }
            return `<li class="${liClass.join(" ")}">${styledText}</li>`;
          })
          .join("");

        result += `<ul class="list-items">${listItems}</ul>`;
      }

      // 텍스트 노드들 태그
      if (child.type === "TEXT" && !safeClassName.includes("list-items")) {
        let tag = "p";
        let attr = "";
        if (child.name.includes("h1")) tag = "h1";
        else if (
          child.name.includes("link") &&
          !!child?.style?.hyperlink?.url // 오버라이드 미포함
        ) {
          tag = "a";
          attr = `href="${child.style.hyperlink.url}" target="_blank"`;
        } else if (child.name.includes("h2")) tag = "h2";
        else if (child.name.includes("h3")) tag = "h3";
        else if (child.name.includes("h4")) tag = "h4";
        else if (child.name.includes("h5")) tag = "h5";
        else if (child.name.includes("bold")) tag = "strong";
        else if (child.name.includes("span")) tag = "span";

        const textStyleOverride =
          child.name !== "link" ? applyTextStyles(child) : child.characters;

        result += `<${tag} ${attr || ""} class="${child.name}">${textStyleOverride}</${tag}>`;
      }

      // COL/ROW 레이아웃 프레임 노드
      if (
        (child.type === "FRAME" || child.type === "GROUP") &&
        child.name.match(/\b(col-\d+|row-\d+)\b/g)
      ) {
        let { layoutMode, itemSpacing = 4 } = child;

        let tempClass = child.name;
        let classNames = tempClass.replace(/\b(col-\d+|row-\d+)\b/g, "").trim();
        const groupType = layoutMode === "VERTICAL" ? "col" : "row";
        let gapMatch = child.name.match(/(\d+)/);

        let styleAttrs = itemSpacing ?? 4;
        styleAttrs = gapMatch ? gapMatch[0] : styleAttrs;

        result += `<div class="${groupType}${classNames ? " " + classNames : ""}" style="gap:${styleAttrs}px">`;

        if (child.children && child.children.length > 0) {
          result += Handlebars.helpers.recursiveChildren(
            child.children,
            opts,
            maxDepth,
          );
        }
        result += `</div>`;
      } else if (
        child.type === "RECTANGLE" ||
        child.type === "ELLIPSE" ||
        child.name === "br"
      ) {
        result += `<div class="${safeClassName}"></div>`;
      }
    });

    return new Handlebars.SafeString(result);
  },
};

module.exports = { recursiveChildren };
