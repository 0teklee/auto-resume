function getMaxDepth(node, depth = 1) {
  if (!node.children || node.children.length === 0) return depth;
  return Math.max(
    ...node.children.map((child) => getMaxDepth(child, depth + 1)),
  );
}

/**
 * @description 텍스트 스타일 오버라이드 적용
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

  for (let i = 0; i < text.length; i++) {
    let styleKey = styles[i] || 0;
    let style = overrideTable[styleKey] || {};

    let tagStart = "";
    let tagEnd = "";

    if (style.fontWeight === 700) {
      tagStart += "<b class='bold'>";
      tagEnd = "</b>" + tagEnd;
    }
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

  return styledText;
}

/**
 * @description 리스트 노드 렌더링 = 텍스트 컨턴츠인 리프 노드를 시멘틱 html 태그로 변환
 * @param child - 노드
 * @note 맵핑 characterStyleOverrides으로 리스트 내 링크, 볼드, 밑줄 적용
 * @note link 노드는 a 태그로 변환 + href, target 속성 추가
 */
const renderListItems = (child) => {
  const characters = child.characters;
  // Figma 글자 스타일 override 맵핑 인덱스 사용
  const styles = child?.characterStyleOverrides || [];
  const overrideTable = child?.styleOverrideTable || {};
  const liClass = (child.name ?? "")
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

  const href = Object.values(overrideTable).find((style) => style?.hyperlink)
    ?.hyperlink?.url;

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
  return `<${tag} ${attr || ""} class="${child.name}">${textStyleOverride}</${tag}>`;
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

module.exports = {
  getMaxDepth,
  renderListItems,
  renderTextNode,
  renderFrameOrGroup,
};
