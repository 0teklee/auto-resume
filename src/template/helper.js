const {
  getMaxDepth,
  renderListItems,
  renderTextNode,
  renderFrameOrGroup,
} = require("./utils.js");
const Handlebars = require("handlebars");

const recursiveChildren = {
  key: "recursiveChildren",
  function(children, opts, parentMaxDepth = null, isRoot = true) {
    // NOTE: rootStringHTML = Figma의 Page 레이어, 문서의 단위
    let rootStringHTML = "";

    if (isRoot) {
      const rootNode = opts.data.root;
      const mainTagOpen = renderFrameOrGroup(
        rootNode,
        opts,
        parentMaxDepth,
        isRoot,
      );

      rootStringHTML += mainTagOpen;
    }

    // 내부 컨텐츠 렌더링: Root 노드의 children 재귀 호출
    children.forEach((child) => {
      // childStringHTML = 자식 노드 HTML 문자열
      let childStringHTML = "";
      // 그래프 높이 계산 - 자식 노드마다 업데이트
      const maxDepth = parentMaxDepth ?? getMaxDepth({ children });

      // 클래스 = Figma 레이어 이름
      const safeClassName = child.name ?? "";

      // list-items를 ul > li 태그로 전환
      const isListType = safeClassName.includes("list-items");
      if (isListType) {
        const listTag = renderListItems(child);
        childStringHTML += listTag;
      }

      // 텍스트 노드 태그 렌더링
      const isTextType = child.type === "TEXT" && !isListType;
      if (isTextType) {
        const textTag = renderTextNode(child);
        childStringHTML += textTag;
      }

      // COL/ROW 레이아웃 프레임 노드
      const isFrameLayoutType =
        (child.type === "FRAME" || child.type === "GROUP") &&
        child.name.match(/\b(col-\d+|row-\d+)\b/g);
      if (isFrameLayoutType) {
        // NOTE: renderFrameOrGroup 함수 내부에서 재귀 호출
        const frameTag = renderFrameOrGroup(
          child,
          opts,
          maxDepth,
          false,
          Handlebars,
        );

        childStringHTML += frameTag;
      }
      // br이나 그래픽 태그 타입
      const isGraphicType =
        !isListType &&
        !isTextType &&
        (child.type === "RECTANGLE" ||
          child.type === "ELLIPSE" ||
          child.name === "br");
      if (isGraphicType) {
        childStringHTML += `<div class="${safeClassName}"></div>`;
      }
      rootStringHTML += childStringHTML;
    });

    if (isRoot && !rootStringHTML.includes("</main")) {
      rootStringHTML += `</main>`;
    }

    return new Handlebars.SafeString(rootStringHTML);
  },
};

const findTitleNode = (nodes) => {
  for (const node of nodes) {
    // 'h1' = 문서의 타이틀.
    if (node.type === "TEXT" && node.name === "h1") {
      return node.characters; // 찾으면 해당 노드의 characters 반환
    }
    // h1이 캔버스 > ... 몇 단계 안에 있으므로 재귀적으로 탐색
    if (node.children && node.children.length > 0) {
      const found = findTitleNode(node.children);
      if (found) return found;
    }
  }
  return null;
};

const generateTitle = {
  key: "generateTitle",
  function(context) {
    // Handlebars 템플릿의 최상위 컨텍스트(this)에서 document를 가져옴.
    const document = context.children[0];
    if (!document || !document.children) {
      return "이택우 이력서 - TEKWOO LEE"; // 못찾을 시 기본값 반환
    }
    // findTitleNode를 통해 재귀 탐색 후 타이틀 반환
    const title = findTitleNode(document.children);
    return title ? `${title} - DEV. TEKWOO LEE ` : "이택우 이력서 - TEKWOO LEE"; // 못찾을 시 Fallback 타이틀 반환
  },
};

module.exports = { recursiveChildren, generateTitle };
