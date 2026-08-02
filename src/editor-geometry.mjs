export function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, value));
}

export function polygonArea(points) {
  if (!Array.isArray(points) || points.length < 3) return 0;
  return Math.abs(points.reduce((sum, [x, y], index) => {
    const [nextX, nextY] = points[(index + 1) % points.length];
    return sum + x * nextY - nextX * y;
  }, 0) / 2);
}

export function boundsFor(points) {
  if (!points?.length) return { left: 0, top: 0, right: 0, bottom: 0, width: 0, height: 0 };
  const xs = points.map(([x]) => x);
  const ys = points.map(([, y]) => y);
  const left = Math.min(...xs);
  const top = Math.min(...ys);
  const right = Math.max(...xs);
  const bottom = Math.max(...ys);
  return { left, top, right, bottom, width: right - left, height: bottom - top };
}

export function deriveMobileRegion(points, asset, expansion = 1.18) {
  if (!Array.isArray(points) || points.length < 3) return points ?? [];
  const center = points.reduce((sum, [x, y]) => [sum[0] + x / points.length, sum[1] + y / points.length], [0, 0]);
  let derived = points.map(([x, y]) => [
    clamp(center[0] + (x - center[0]) * expansion, 0, asset.width),
    clamp(center[1] + (y - center[1]) * expansion, 0, asset.height),
  ]);

  const minimumAssetSpan = 44 / (320 / asset.width);
  const bounds = boundsFor(derived);
  const scaleX = bounds.width ? Math.max(1, minimumAssetSpan / bounds.width) : 1;
  const scaleY = bounds.height ? Math.max(1, minimumAssetSpan / bounds.height) : 1;
  if (scaleX > 1 || scaleY > 1) {
    derived = derived.map(([x, y]) => [
      clamp(center[0] + (x - center[0]) * scaleX, 0, asset.width),
      clamp(center[1] + (y - center[1]) * scaleY, 0, asset.height),
    ]);
  }
  return derived.map(([x, y]) => [Math.round(x), Math.round(y)]);
}

function intersectionArea(first, second) {
  const width = Math.max(0, Math.min(first.right, second.right) - Math.max(first.left, second.left));
  const height = Math.max(0, Math.min(first.bottom, second.bottom) - Math.max(first.top, second.top));
  return width * height;
}

export function analyzeMaskSet(masks, asset, viewport = "desktop") {
  const warnings = [];
  for (const mask of masks) {
    const points = mask.regions?.[viewport] ?? [];
    const bounds = boundsFor(points);
    if (points.length < 3) warnings.push(`${mask.id}: 점이 3개보다 적음`);
    if (polygonArea(points) < 1200) warnings.push(`${mask.id}: 영역이 너무 작음`);
    if (points.some(([x, y]) => x < 0 || y < 0 || x > asset.width || y > asset.height)) {
      warnings.push(`${mask.id}: 이미지 밖의 점이 있음`);
    }
    if (viewport === "mobile") {
      const scale = 320 / asset.width;
      if (bounds.width * scale < 44 || bounds.height * scale < 44) warnings.push(`${mask.id}: 모바일 터치 영역이 44px보다 작음`);
    }
  }
  for (let firstIndex = 0; firstIndex < masks.length; firstIndex += 1) {
    const first = boundsFor(masks[firstIndex].regions?.[viewport] ?? []);
    for (let secondIndex = firstIndex + 1; secondIndex < masks.length; secondIndex += 1) {
      const second = boundsFor(masks[secondIndex].regions?.[viewport] ?? []);
      const overlap = intersectionArea(first, second);
      const smaller = Math.min(first.width * first.height, second.width * second.height);
      if (smaller > 0 && overlap / smaller > 0.35) warnings.push(`${masks[firstIndex].id} ↔ ${masks[secondIndex].id}: 많이 겹침`);
    }
  }
  return warnings;
}

export function insertPointOnNearestEdge(points, point) {
  if (points.length < 2) return [...points, point];
  let bestIndex = 0;
  let bestDistance = Number.POSITIVE_INFINITY;
  for (let index = 0; index < points.length; index += 1) {
    const start = points[index];
    const end = points[(index + 1) % points.length];
    const dx = end[0] - start[0];
    const dy = end[1] - start[1];
    const lengthSquared = dx * dx + dy * dy || 1;
    const t = clamp(((point[0] - start[0]) * dx + (point[1] - start[1]) * dy) / lengthSquared, 0, 1);
    const projection = [start[0] + t * dx, start[1] + t * dy];
    const distance = Math.hypot(point[0] - projection[0], point[1] - projection[1]);
    if (distance < bestDistance) {
      bestDistance = distance;
      bestIndex = index + 1;
    }
  }
  const result = [...points];
  result.splice(bestIndex, 0, point);
  return result;
}
