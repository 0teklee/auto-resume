function getMaxDepth(node, depth = 1) {
  if (!node.children || node.children.length === 0) return depth;
  return Math.max(
    ...node.children.map((child) => getMaxDepth(child, depth + 1)),
  );
}

function applyTextStyles(node) {
  let text = node.characters;
  if (!text) return "";
  let styles = (node.characterStyleOverrides || []).slice(0, text.length);
  let overrideTable = node.styleOverrideTable || {};
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

module.exports = {
  getMaxDepth,
  applyTextStyles,
};
