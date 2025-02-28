function getMaxDepth(node, depth = 1) {
  if (!node.children || node.children.length === 0) return depth;
  return Math.max(
    ...node.children.map((child) => getMaxDepth(child, depth + 1)),
  );
}

function applyTextStyles(node) {
  let text = node.characters;
  if (!text) return "";
  let styles = node.characterStyleOverrides || [];
  let overrideTable = node.styleOverrideTable || {};
  let styledText = "";
  let openTags = [];

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

    if (openTags.length > 0 && tagStart !== openTags[openTags.length - 1]) {
      styledText += openTags.pop();
    }

    if (tagStart) {
      styledText += tagStart;
      openTags.push(tagEnd);
    }

    styledText += text[i];
  }

  while (openTags.length) {
    styledText += openTags.pop();
  }

  return styledText;
}

module.exports = {
  getMaxDepth,
  applyTextStyles,
};
