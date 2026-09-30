export function splitContentToPagesByHeight(
  htmlContent: string,
  pageHeightPx = 1100,
  widthPx = 750,
  bottomMarginPx = 48
) {
  if (!htmlContent) return [""];
  const usablePageHeight = pageHeightPx - bottomMarginPx;
  const blocks =
    htmlContent.match(
      /<li[\s\S]*?<\/li>|<p[\s\S]*?<\/p>|<h[1-6][\s\S]*?<\/h[1-6]>|<div[\s\S]*?<\/div>|<ul[\s\S]*?<\/ul>|<ol[\s\S]*?<\/ol>|<br\s*\/?>|[^<]+/gi
    ) || [htmlContent];
  const temp = document.createElement("div");
  Object.assign(temp.style, {
    all: "initial",
    position: "fixed",
    left: "-99999px",
    top: "0",
    visibility: "hidden",
    width: widthPx + "px",
    fontSize: "14px",
    lineHeight: "1.5",
    fontFamily: "Arial, sans-serif",
    zIndex: "-1",
    padding: "0",
    margin: "0",
    boxSizing: "border-box"
  });
  document.body.appendChild(temp);
  const pages: string[] = [];
  let curr = "";
  function splitBlockIfNeeded(block: string) {
    temp.innerHTML = block;
    if (temp.offsetHeight > usablePageHeight) {
      const lines = block.split(/(<br\s*\/?>|\n)/i);
      let subBlock = "";
      for (const part of lines) {
        const tentative = subBlock + part;
        temp.innerHTML = tentative;
        if (temp.offsetHeight > usablePageHeight && subBlock) {
          pages.push(subBlock);
          subBlock = part;
        } else {
          subBlock += part;
        }
      }
      if (subBlock) pages.push(subBlock);
      return null;
    }
    return block;
  }
  for (let i = 0; i < blocks.length; ++i) {
    const test = curr + blocks[i];
    temp.innerHTML = test;
    if (temp.offsetHeight > usablePageHeight && curr) {
      pages.push(curr);
      const splitResult = splitBlockIfNeeded(blocks[i]);
      curr = splitResult || "";
    } else {
      curr = test;
    }
  }
  if (curr) pages.push(curr);
  document.body.removeChild(temp);
  return pages;
}
