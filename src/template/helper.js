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

module.exports = { recursiveChildren };
