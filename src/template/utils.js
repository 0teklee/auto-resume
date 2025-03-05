const ROOT_DOMAIN = "resume.leetekwoo.com";

function getMaxDepth(node, depth = 1) {
  if (!node.children || node.children.length === 0) return depth;
  return Math.max(
    ...node.children.map((child) => getMaxDepth(child, depth + 1)),
  );
}

/**
 * @description 텍스트 스타일 오버라이드 적용 + URL 추가
 * @param child - 노드
 * @note Text 타입 노드의 characters에만 적용 (리스트 노드 제외)
 * @note 맵핑 characterStyleOverrides으로 리스트 내 링크, 볼드, 밑줄 적용
 */
function applyTextStyles(child) {
  let text = child.characters;
  if (!text) return "";

  let styles = (child.characterStyleOverrides || []).slice(0, text.length);
  let overrideTable = child.styleOverrideTable || {};
  let styledText = "";
  let openTags = [];

  let lastStyleKey = null; // 이전 스타일 키를 저장
  let currentLink = null; // 현재 링크를 추적

  for (let i = 0; i < text.length; i++) {
    let styleKey = styles[i] || 0;
    let style = overrideTable[styleKey] || {};

    let tagStart = "";
    let tagEnd = "";

    // 하이퍼링크 스타일이 있는 경우
    const urlInLink = style?.hyperlink?.url;
    if (urlInLink && currentLink === null) {
      const attrs = getLinkAttrs(urlInLink, ROOT_DOMAIN);

      // 링크 시작
      tagStart = `<a class="link" ${{ ...attrs }} >`;
      currentLink = true;
    } else if (!urlInLink && currentLink !== null) {
      // 링크 종료
      tagEnd = "</a>";
      currentLink = null;
    }

    // 볼드 처리
    if (style.fontWeight === 700) {
      tagStart += "<b class='bold'>";
      tagEnd = "</b>" + tagEnd;
    }

    // 밑줄 처리
    if (style.textDecoration === "UNDERLINE") {
      tagStart += "<u class='underline'>";
      tagEnd = "</u>" + tagEnd;
    }

    // 스타일이 변경되었을 때만 태그를 닫고 새로 여는 방식
    if (lastStyleKey !== null && lastStyleKey !== styleKey) {
      while (openTags.length) {
        styledText += openTags.pop();
      }
    }

    // 새로운 스타일이면 태그 열기
    if (tagStart && lastStyleKey !== styleKey) {
      styledText += tagStart;
      openTags.push(tagEnd);
    }

    styledText += text[i];
    lastStyleKey = styleKey;
  }

  // 마지막으로 남아 있는 태그 닫기
  while (openTags.length) {
    styledText += openTags.pop();
  }

  // 마지막에 열린 링크를 닫아줌
  if (currentLink) {
    styledText += "</a>";
  }

  return styledText;
}

/**
 * @description 리스트 노드 렌더링 = 텍스트 컨턴츠인 리프 노드를 시멘틱 html 태그로 변환
 * @param child - 노드
 * @note 텍스트 스타일 오버라이드 기능 삭제 : applyTextStyles로 통합
 */
const renderListItems = (child) => {
  const characters = child.characters;
  const stylesOverrides = child?.characterStyleOverrides || [];
  const overrideTable = child?.styleOverrideTable || {};

  const liClass = (child.name ?? "")
    .replace("list-items", "")
    .replace("link", "");

  let startIndex = 0;

  const lines = characters.split("\n").map((line) => {
    const lineLength = line.length;
    const styleSlice = stylesOverrides.slice(
      startIndex,
      startIndex + lineLength,
    );
    startIndex += lineLength + 1; // +1은 \n 문자 포함
    return { text: line, styleSlice };
  });

  const listItems = lines
    .map(({ text, styleSlice }, i) => {
      const styledText = applyTextStyles({
        characters: text,
        characterStyleOverrides: styleSlice,
        styleOverrideTable: overrideTable,
      });

      return `<li class="${liClass}">${styledText}</li>`;
    })
    .join("");

  return `<ul class="list-items">${listItems}</ul>`;
};

/**
 * @description 텍스트 노드 렌더링 = 텍스트 컨턴츠인 리프 노드를 시멘틱 html 태그로 변환
 * @param child - 노드
 * @note child.name에 따라 태그 변경
 * @note link 노드는 a 태그로 변환 + href, target 속성 추가
 */
const renderTextNode = (child) => {
  let tag = "p";
  let attr = "";

  switch (true) {
    case child.name.includes("h1"):
      tag = "h1";
      break;
    case child.name.includes("link") && !!child?.style?.hyperlink?.url:
      tag = "a";
      const href = child.style.hyperlink.url;
      const attrs = getLinkAttrs(href, ROOT_DOMAIN);

      attr = Object.entries(attrs)
        .map(([key, attr]) => `${key}="${attr}"`)
        .join(" ");
      break;
    case child.name.includes("h2"):
      tag = "h2";
      break;
    case child.name.includes("h3"):
      tag = "h3";
      break;
    case child.name.includes("h4"):
      tag = "h4";
      break;
    case child.name.includes("h5"):
      tag = "h5";
      break;
    case child.name.includes("bold"):
      tag = "strong";
      break;
    case child.name.includes("span"):
      tag = "span";
      break;
    default:
      tag = "p"; // 기본값
      break;
  }

  let className = child.name.replace(tag, "").trim();

  const textStyleOverride =
    child.name !== "link" ? applyTextStyles(child) : child.characters;

  return `<${tag} ${attr || ""} class="${className}">${textStyleOverride}</${tag}>`;
};

/**
 * @description COL/ROW 레이아웃 프레임 노드 렌더링 (FRAME 또는 GROUP)
 * @param {Object} child - 노드
 * @param {Object} opts - 옵션
 * @param {number} maxDepth - 최대 깊이
 * @param {boolean} isRoot - 루트 여부
 * @param {Object} Handlebars - 핸들바
 * @note 이 함수 내부에서 자식 노드를 재귀 호출 (Handlebars.helpers.recursiveChildren)
 * @note isRoot param으로 페이지 루트 노드와 일반 프레임 노드를 분기함
 */
const renderFrameOrGroup = (
  child,
  opts,
  maxDepth,
  isRoot = false,
  Handlebars,
) => {
  const { layoutMode, itemSpacing = 4 } = child;
  const tempClass = child.name;
  const classNames = tempClass.replace(/\b(col-\d+|row-\d+)\b/g, "").trim();
  const groupType = layoutMode === "VERTICAL" ? "col" : "row";
  const gapMatch = child.name.match(/(\d+)/);
  let styleAttrs = itemSpacing ?? 4;
  styleAttrs = gapMatch ? gapMatch[0] : styleAttrs;

  let output = `<${isRoot ? "main" : "div"} class="${groupType}${
    classNames ? " " + classNames : ""
  }" style="gap:${styleAttrs}px">`;

  if (!isRoot) {
    if (child.children && child.children.length > 0) {
      output += Handlebars.helpers.recursiveChildren(
        child.children,
        opts,
        maxDepth,
        false,
      );
    }
    output += `</div>`;
  }

  return output;
};

function getLinkAttrs(url, root) {
  return {
    href: url,
    target: url.includes(root) ? "" : "_blank",
  };
}

module.exports = {
  getMaxDepth,
  renderListItems,
  renderTextNode,
  renderFrameOrGroup,
};
