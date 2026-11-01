import { expect, type Locator } from "@playwright/test";

// An SVG group's bounding-box center need not lie on its curve. Click a real,
// unobstructed point on React Flow's pointer target, with normal actionability.
export async function clickCurve(edge: Locator) {
  await edge.scrollIntoViewIfNeeded();
  const point = await edge.evaluate((group) => {
    const path = group.querySelector<SVGPathElement>(".react-flow__edge-interaction");
    if (!path) throw new Error("Missing curve pointer target");
    const matrix = path.getScreenCTM();
    if (!matrix) throw new Error("Curve is not rendered");
    const box = group.getBoundingClientRect();
    for (const fraction of [0.5, 0.4, 0.6, 0.3, 0.7, 0.2, 0.8]) {
      const local = path.getPointAtLength(path.getTotalLength() * fraction);
      const screen = new DOMPoint(local.x, local.y).matrixTransform(matrix);
      const hit = document.elementFromPoint(screen.x, screen.y);
      if (hit && group.contains(hit)) {
        return { x: screen.x - box.left, y: screen.y - box.top };
      }
    }
    throw new Error("Curve has no unobstructed pointer target");
  });
  await edge.click({ position: point });
  await expect(edge).toHaveClass(/selected/);
}
