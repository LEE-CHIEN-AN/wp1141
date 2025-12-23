/**
 * Navigation utilities for turn-by-turn routing
 * 
 * This module processes route polylines to generate navigation instructions
 * and matches user GPS position to the route.
 */

export type NavigationStep = {
  instruction: string;
  distance_m: number;
  bearing: number; // 0-360 degrees, 0 = North
  turn_type: 'start' | 'left' | 'right' | 'straight' | 'arrive';
  coordinates: [number, number]; // [lat, lon]
  turn_angle?: number; // degrees, positive = right, negative = left
};

export type RouteMatch = {
  stepIndex: number;
  distanceToRoute: number; // meters
  pointOnRoute: [number, number];
  progress: number; // 0-1, how far along the route
};

/**
 * Calculate bearing between two points (0-360 degrees, 0 = North)
 */
export function calculateBearing(
  point1: [number, number],
  point2: [number, number]
): number {
  const [lat1, lon1] = point1;
  const [lat2, lon2] = point2;

  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const lat1Rad = (lat1 * Math.PI) / 180;
  const lat2Rad = (lat2 * Math.PI) / 180;

  const y = Math.sin(dLon) * Math.cos(lat2Rad);
  const x =
    Math.cos(lat1Rad) * Math.sin(lat2Rad) -
    Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLon);

  let bearing = (Math.atan2(y, x) * 180) / Math.PI;
  bearing = (bearing + 360) % 360;

  return bearing;
}

/**
 * Calculate distance between two points using Haversine formula (meters)
 */
export function haversineDistance(
  point1: [number, number],
  point2: [number, number]
): number {
  const [lat1, lon1] = point1;
  const [lat2, lon2] = point2;

  const R = 6371000; // Earth radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Normalize angle to -180 to 180 range
 */
function normalizeAngle(angle: number): number {
  let normalized = angle % 360;
  if (normalized > 180) normalized -= 360;
  if (normalized < -180) normalized += 360;
  return normalized;
}

/**
 * Classify turn type based on angle change
 */
function classifyTurn(angle: number): 'left' | 'right' | 'straight' {
  const absAngle = Math.abs(angle);
  if (absAngle < 30) return 'straight';
  return angle > 0 ? 'right' : 'left';
}

/**
 * Generate instruction text for a navigation step
 */
function generateInstruction(
  turnType: NavigationStep['turn_type'],
  distance: number,
  _bearing?: number
): string {
  const distanceStr =
    distance < 1000
      ? `${Math.round(distance)} 公尺`
      : `${(distance / 1000).toFixed(1)} 公里`;

  switch (turnType) {
    case 'start':
      return `開始導航，直行 ${distanceStr}`;
    case 'left':
      return `左轉，然後直行 ${distanceStr}`;
    case 'right':
      return `右轉，然後直行 ${distanceStr}`;
    case 'straight':
      return `繼續直行 ${distanceStr}`;
    case 'arrive':
      return '抵達目的地';
    default:
      return `繼續前進 ${distanceStr}`;
  }
}

/**
 * Process polyline to generate navigation steps
 * This is a frontend-only solution that works with the current API
 */
export function generateNavigationSteps(
  polyline: [number, number][],
  turnThreshold: number = 30 // degrees
): NavigationStep[] {
  if (polyline.length < 2) return [];

  const steps: NavigationStep[] = [];

  // First step: start
  const firstBearing = calculateBearing(polyline[0], polyline[1]);
  const firstDistance = haversineDistance(polyline[0], polyline[1]);
  steps.push({
    instruction: generateInstruction('start', firstDistance, firstBearing),
    distance_m: firstDistance,
    bearing: firstBearing,
    turn_type: 'start',
    coordinates: polyline[0],
  });

  // Process intermediate points
  for (let i = 1; i < polyline.length - 1; i++) {
    const prevPoint = polyline[i - 1];
    const currentPoint = polyline[i];
    const nextPoint = polyline[i + 1];

    const bearing1 = calculateBearing(prevPoint, currentPoint);
    const bearing2 = calculateBearing(currentPoint, nextPoint);
    const turnAngle = normalizeAngle(bearing2 - bearing1);
    const distance = haversineDistance(currentPoint, nextPoint);

    // Only create a step if there's a significant turn
    if (Math.abs(turnAngle) > turnThreshold) {
      const turnType = classifyTurn(turnAngle);
      steps.push({
        instruction: generateInstruction(turnType, distance, bearing2),
        distance_m: distance,
        bearing: bearing2,
        turn_type: turnType,
        coordinates: currentPoint,
        turn_angle: turnAngle,
      });
    } else {
      // Update last step distance if continuing straight
      if (steps.length > 0) {
        const lastStep = steps[steps.length - 1];
        lastStep.distance_m += distance;
        lastStep.instruction = generateInstruction(
          lastStep.turn_type,
          lastStep.distance_m,
          lastStep.bearing
        );
      }
    }
  }

  // Final step: arrive
  const lastPoint = polyline[polyline.length - 1];
  const secondLastPoint = polyline[polyline.length - 2];
  const finalBearing = calculateBearing(secondLastPoint, lastPoint);
  steps.push({
    instruction: generateInstruction('arrive', 0, finalBearing),
    distance_m: 0,
    bearing: finalBearing,
    turn_type: 'arrive',
    coordinates: lastPoint,
  });

  return steps;
}

/**
 * Project a point onto the nearest segment of a polyline
 * Returns the projected point and its index in the polyline
 */
function projectPointToSegment(
  point: [number, number],
  segmentStart: [number, number],
  segmentEnd: [number, number]
): {
  point: [number, number];
  t: number; // 0-1, position along segment
} {
  const [px, py] = point;
  const [x1, y1] = segmentStart;
  const [x2, y2] = segmentEnd;

  // Convert to approximate local coordinates (good enough for short distances)
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lengthSq = dx * dx + dy * dy;

  if (lengthSq === 0) {
    return { point: segmentStart, t: 0 };
  }

  const t = Math.max(
    0,
    Math.min(1, ((px - x1) * dx + (py - y1) * dy) / lengthSq)
  );

  const projectedPoint: [number, number] = [x1 + t * dx, y1 + t * dy];
  return { point: projectedPoint, t };
}

/**
 * Find the nearest point on the route to the user's current position
 */
export function matchPositionToRoute(
  userPosition: [number, number],
  polyline: [number, number][],
  navigationSteps: NavigationStep[]
): RouteMatch {
  if (polyline.length < 2) {
    return {
      stepIndex: 0,
      distanceToRoute: Infinity,
      pointOnRoute: polyline[0] || userPosition,
      progress: 0,
    };
  }

  let minDistance = Infinity;
  let nearestIndex = 0;
  let nearestPoint: [number, number] = polyline[0];
  let segmentProgress = 0;

  // Check each segment
  for (let i = 0; i < polyline.length - 1; i++) {
    const projection = projectPointToSegment(
      userPosition,
      polyline[i],
      polyline[i + 1]
    );
    const distance = haversineDistance(userPosition, projection.point);

    if (distance < minDistance) {
      minDistance = distance;
      nearestIndex = i;
      nearestPoint = projection.point;
      segmentProgress = projection.t;
    }
  }

  // Calculate overall progress (0-1)
  let totalDistance = 0;
  let distanceToNearest = 0;

  for (let i = 0; i < polyline.length - 1; i++) {
    const segmentDistance = haversineDistance(polyline[i], polyline[i + 1]);
    totalDistance += segmentDistance;

    if (i < nearestIndex) {
      distanceToNearest += segmentDistance;
    } else if (i === nearestIndex) {
      distanceToNearest += segmentDistance * segmentProgress;
    }
  }

  const progress = totalDistance > 0 ? distanceToNearest / totalDistance : 0;

  // Find which navigation step we're on
  let stepIndex = 0;
  let accumulatedDistance = 0;
  for (let i = 0; i < navigationSteps.length; i++) {
    if (distanceToNearest <= accumulatedDistance + navigationSteps[i].distance_m) {
      stepIndex = i;
      break;
    }
    accumulatedDistance += navigationSteps[i].distance_m;
  }

  return {
    stepIndex: Math.min(stepIndex, navigationSteps.length - 1),
    distanceToRoute: minDistance,
    pointOnRoute: nearestPoint,
    progress: Math.max(0, Math.min(1, progress)),
  };
}

/**
 * Get distance to next turn from current position
 */
export function getDistanceToNextTurn(
  currentStepIndex: number,
  navigationSteps: NavigationStep[],
  routeMatch: RouteMatch
): number {
  if (currentStepIndex >= navigationSteps.length - 1) {
    return 0; // At or past destination
  }

  // Calculate remaining distance in current step
  const currentStep = navigationSteps[currentStepIndex];
  const stepProgress = routeMatch.progress;
  const remainingInStep = currentStep.distance_m * (1 - stepProgress);

  // Add distance from next step if it's a turn
  const nextStep = navigationSteps[currentStepIndex + 1];
  if (
    nextStep.turn_type === 'left' ||
    nextStep.turn_type === 'right'
  ) {
    return remainingInStep + nextStep.distance_m;
  }

  return remainingInStep;
}

