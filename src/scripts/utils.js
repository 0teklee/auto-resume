const fs = require("fs");
const path = require("path");

function getDirectoryTree(dirPath) {
  if (!fs.existsSync(dirPath)) {
    return `❌ ${dirPath} 디렉토리가 존재하지 않습니다.`;
  }

  let treeString = `📂 ${path.basename(dirPath)}\n`;

  function traverse(dir, indentLevel) {
    const files = fs.readdirSync(dir);

    files.forEach((file, index) => {
      const fullPath = path.join(dir, file);
      const isDir = fs.statSync(fullPath).isDirectory();
      const prefix = index === files.length - 1 ? "└── " : "├── ";

      treeString += indentLevel + prefix + file + "\n";

      if (isDir) {
        traverse(
          fullPath,
          indentLevel + (index === files.length - 1 ? "    " : "│   "),
        );
      }
    });
  }

  traverse(dirPath, "   ");
  return treeString;
}

module.exports = { getDirectoryTree };
