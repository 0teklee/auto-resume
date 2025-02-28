const { applyTextStyles, getMaxDepth } = require("./utils.js");
const Handlebars = require("handlebars");

const if_eq = {
  key: "if_eq",
  function(a, b, opts) {
    if (a === b) {
      return opts.fn(this);
    }
    return opts.inverse(this);
  },
};

const recursiveChildren = {
  key: "recursiveChildren",
  function(children, opts, parentMaxDepth = null) {
    let result = "";

    children.forEach((child) => {
      // 그래프 높이 계산
      const maxDepth = parentMaxDepth ?? getMaxDepth({ children });

      // 클래스 = Figma 레이어 이름
      const safeClassName = child.name ?? "";

      // li 리스트 필터링
      if (safeClassName.includes("list-items")) {
        const lines = child.characters
          .split("\n")
          .map((line) => line.trim())
          .filter(Boolean);

        const liClass = safeClassName
          .split(" ")
          .filter((item) => item !== "list-items");

        const listItems = lines
          .map((item) => `<li class="${liClass}">${item}</li>`)
          .join("");
        result += `<ul class="list-items">${listItems}</ul>`;
      }

      // 이외의 텍스트 노드들
      if (child.type === "TEXT" && !safeClassName.includes("list-items")) {
        let tag = "p";
        if (child.name.includes("h1")) tag = "h1";
        else if (child.name.includes("h2")) tag = "h2";
        else if (child.name.includes("h3")) tag = "h3";
        else if (child.name.includes("h4")) tag = "h4";
        else if (child.name.includes("h5")) tag = "h5";
        else if (child.name.includes("bold")) tag = "strong";
        else if (child.name.includes("span")) tag = "span";

        result += `<${tag} class="${child.name}">${applyTextStyles(child)}</${tag}>`;
      }
      // br 태그

      // 레이아웃 요소들
      if (
        (child.type === "FRAME" || child.type === "GROUP") &&
        child.name.match(/\b(col-\d+|row-\d+)\b/g)
      ) {
        let tempClass = child.name;
        let classNames = tempClass.replace(/\b(col-\d+|row-\d+)\b/g, "").trim();
        let groupType = child.name.match(/(col)/) ? "col" : "row";
        let styleAttrs = 4;
        let gapMatch = child.name.match(/(\d+)/);
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

module.exports = { if_eq, recursiveChildren };
