/**
 * Position of a profession in the wheel
 */
export interface ProfessionPosition {
  x: number;
  y: number;
  angle: number;
}

/**
 * Calculate positions for professions in a circular wheel
 * @param count - Number of professions
 * @param radius - Radius of the wheel
 * @param centerX - X coordinate of the center
 * @param centerY - Y coordinate of the center
 * @returns Array of profession positions
 */
export function calculateProfessionPositions(
  count: number,
  radius: number,
  centerX: number,
  centerY: number
): ProfessionPosition[] {
  if (count <= 0) {
    return [];
  }

  const positions: ProfessionPosition[] = [];
  const angleStep = (2 * Math.PI) / count;

  for (let i = 0; i < count; i++) {
    // Start from top (-PI/2) and go clockwise
    const angle = i * angleStep - Math.PI / 2;
    const x = centerX + radius * Math.cos(angle);
    const y = centerY + radius * Math.sin(angle);

    positions.push({
      x,
      y,
      angle,
    });
  }

  return positions;
}

/**
 * Check if a point is inside a circle
 * @param px - X coordinate of the point
 * @param py - Y coordinate of the point
 * @param cx - X coordinate of the circle center
 * @param cy - Y coordinate of the circle center
 * @param radius - Radius of the circle
 * @returns True if point is inside circle, false otherwise
 */
export function isPointInCircle(
  px: number,
  py: number,
  cx: number,
  cy: number,
  radius: number
): boolean {
  const dx = px - cx;
  const dy = py - cy;
  return dx * dx + dy * dy <= radius * radius;
}

/**
 * Calculate distance between two points
 * @param x1 - X coordinate of first point
 * @param y1 - Y coordinate of first point
 * @param x2 - X coordinate of second point
 * @param y2 - Y coordinate of second point
 * @returns Distance between points
 */
export function calculateDistance(
  x1: number,
  y1: number,
  x2: number,
  y2: number
): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Calculate angle between two points
 * @param x1 - X coordinate of first point
 * @param y1 - Y coordinate of first point
 * @param x2 - X coordinate of second point
 * @param y2 - Y coordinate of second point
 * @returns Angle in radians
 */
export function calculateAngle(
  x1: number,
  y1: number,
  x2: number,
  y2: number
): number {
  return Math.atan2(y2 - y1, x2 - x1);
}

/**
 * Normalize angle to 0-2PI range
 * @param angle - Angle in radians
 * @returns Normalized angle
 */
export function normalizeAngle(angle: number): number {
  let normalized = angle % (2 * Math.PI);
  if (normalized < 0) {
    normalized += 2 * Math.PI;
  }
  return normalized;
}

/**
 * Find the closest profession index to a point
 * @param px - X coordinate of the point
 * @param py - Y coordinate of the point
 * @param positions - Array of profession positions
 * @param clickRadius - Radius for click detection
 * @returns Index of closest profession, or -1 if none found
 */
export function findClosestProfession(
  px: number,
  py: number,
  positions: ProfessionPosition[],
  clickRadius: number
): number {
  let closestIndex = -1;
  let closestDistance = clickRadius;

  for (let i = 0; i < positions.length; i++) {
    const distance = calculateDistance(px, py, positions[i].x, positions[i].y);
    if (distance < closestDistance) {
      closestDistance = distance;
      closestIndex = i;
    }
  }

  return closestIndex;
}

/**
 * Calculate the bounding box of the wheel
 * @param radius - Radius of the wheel
 * @param centerX - X coordinate of the center
 * @param centerY - Y coordinate of the center
 * @param professionRadius - Radius of each profession circle
 * @returns Bounding box { minX, minY, maxX, maxY }
 */
export function calculateWheelBoundingBox(
  radius: number,
  centerX: number,
  centerY: number,
  professionRadius: number
): { minX: number; minY: number; maxX: number; maxY: number } {
  const totalRadius = radius + professionRadius;

  return {
    minX: centerX - totalRadius,
    minY: centerY - totalRadius,
    maxX: centerX + totalRadius,
    maxY: centerY + totalRadius,
  };
}
