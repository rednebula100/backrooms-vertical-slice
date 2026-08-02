import assert from "node:assert/strict";
import test from "node:test";
import { analyzeMaskSet, deriveMobileRegion, insertPointOnNearestEdge, polygonArea } from "../src/editor-geometry.mjs";

const asset = { width: 1448, height: 1086 };

test("polygonArea returns the area of a simple route rectangle", () => {
  assert.equal(polygonArea([[10, 10], [110, 10], [110, 60], [10, 60]]), 5000);
});

test("deriveMobileRegion expands narrow desktop masks to a 44px touch span", () => {
  const mobile = deriveMobileRegion([[700, 300], [760, 300], [760, 620], [700, 620]], asset);
  const xs = mobile.map(([x]) => x);
  const widthAt320 = (Math.max(...xs) - Math.min(...xs)) * (320 / asset.width);
  assert.ok(widthAt320 >= 44);
  assert.ok(mobile.every(([x, y]) => x >= 0 && y >= 0 && x <= asset.width && y <= asset.height));
});

test("insertPointOnNearestEdge preserves polygon order", () => {
  const result = insertPointOnNearestEdge([[0, 0], [100, 0], [100, 100], [0, 100]], [50, 3]);
  assert.deepEqual(result, [[0, 0], [50, 3], [100, 0], [100, 100], [0, 100]]);
});

test("analyzeMaskSet warns when masks substantially overlap", () => {
  const masks = [
    { id: "A", regions: { desktop: [[0, 0], [200, 0], [200, 300], [0, 300]] } },
    { id: "B", regions: { desktop: [[40, 20], [190, 20], [190, 280], [40, 280]] } },
  ];
  assert.ok(analyzeMaskSet(masks, asset).some((warning) => warning.includes("많이 겹침")));
});
