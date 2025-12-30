import type { Color, HSL } from "three";

export interface Anchor {
	x: number;
	y: number;
  aL?: Anchor; // left neighbor
  aR?: Anchor; // right neighbor
  aTL?: Anchor; // top left neighbor
  aTR?: Anchor; // top right neighbor
  aBL?: Anchor; // bottom left neighbor
  aBR?: Anchor; // bottom right neighbor
  tT?: Triangle; // Top triangle
  tB?: Triangle; // Bottom triangle
  tLT?: Triangle; // Left Top triangle
  tRT?: Triangle; // Right Top triangle
  tLB?: Triangle; // Left Bottom triangle
  tRB?: Triangle; // Right Bottom triangle
}

export interface Triangle {
	/**
	 * Left anchor
	 */
  aL: Anchor;

	/**
	 * Right anchor
	 */
  aR: Anchor;

	/**
	 * Top anchor (for triangles pointing down)
	 */
  aT?: Anchor;

	/**
	 * Bottom anchor (for triangles pointing down)
	 */
  aB?: Anchor;

	/**
	 * Index of the triangle in the triangles array
	 */
	i: number;

	/**
	 * Left neighbor triangle
	 */
  tL: Triangle;

	/**
	 * Right neighbor triangle
	 */
  tR: Triangle;

	/**
	 * Top neighbor triangle (for pointing up triangles)
	 */
  tT?: Triangle;

	/**
	 * Bottom neighbor triangle (for pointing up triangles)
	 */
  tB?: Triangle;

	/**
	 * Base position of the triangle's vertices
	 */
  position: number[];

	/**
	 * Center X coordinate of the triangle
	 */
	centerX: number;

	/**
	 * Center Y coordinate of the triangle
	 */
	centerY: number;

	/**
	 * The value centerX is offset relative to global center X
	 */
	globalOffsetX: number;

	/**
	 * The value centerY is offset relative to global center Y
	 */
	globalOffsetY: number;

	/**
	 * The angle of the triangle relative to the global center. 0 means the triangle is right (east) of global center. Math.PI or -Math.PI means it is left (west) of global center. +Math.PI/2 means it is above (north) of global center. -Math.PI/2 means it is below (south) of global center
	 */
	globalAngle?: number;

	/**
	 * The angle of the tT neighbor triangle relative to the global center. 0 means the tL neighbor is further away from the gobal center. Math.PI or -Math.PI means it is closer to the global center. +Math.PI/2 means it's global angle is 90 degrees counterclockwise from this triangle's global angle. -Math.PI/2 means it's global angle is 90 degrees clockwise from this triangle's global angle
	 */
	globalAngleChange_tL?: number;

	/**
	 * The angle of the tR neighbor triangle relative to the global center. 0 means the tL neighbor is further away from the gobal center. Math.PI or -Math.PI means it is closer to the global center. +Math.PI/2 means it's global angle is 90 degrees counterclockwise from this triangle's global angle. -Math.PI/2 means it's global angle is 90 degrees clockwise from this triangle's global angle
	 */
	globalAngleChange_tR?: number;

	/**
	 * The angle of the tB neighbor triangle relative to the global center. 0 means the tL neighbor is further away from the gobal center. Math.PI or -Math.PI means it is closer to the global center. +Math.PI/2 means it's global angle is 90 degrees counterclockwise from this triangle's global angle. -Math.PI/2 means it's global angle is 90 degrees clockwise from this triangle's global angle
	 */
	globalAngleChange_tB?: number;

	/**
	 * The angle of the tT neighbor triangle relative to the global center. 0 means the tL neighbor is further away from the gobal center. Math.PI or -Math.PI means it is closer to the global center. +Math.PI/2 means it's global angle is 90 degrees counterclockwise from this triangle's global angle. -Math.PI/2 means it's global angle is 90 degrees clockwise from this triangle's global angle
	 */
	globalAngleChange_tT?: number;
}

export function isPointingUp(tri: Triangle): boolean {
  return typeof tri.aT !== 'undefined';
}

export function triangleTipProp(tri: Triangle) {
	return isPointingUp(tri) ? 'aT' : 'aB';
}

export function triangleBackProp(tri: Triangle) {
	return isPointingUp(tri) ? 'tB' : 'tT';
}

/**
 * Creates a grid of anchor points arranged in a triangular lattice and establishes neighbor relationships between
 * anchors and triangles, and calculates triangle vertex positions
 * @param rows Number of horizontal rows of anchor points
 * @param cols Number of vertical columns of anchor points
 * @param distance The distance between adjacent anchor points
 * @param padding The open space between triangles
 * @returns A 2D array of Anchor points
 */
export function genTriangles(rows: number, cols: number, distance = 0.05, padding = 0) {
	const anchors: Pick<Anchor, 'x' | 'y'>[][] = [];
	let deg60 = Math.PI / 3; // 60 degrees
	const colInc = Math.cos(deg60) * distance;
	const rowInc = Math.sin(deg60) * distance;
	for (let row = 0; row < rows; row++) {
		anchors[row] = [];
		for (let col = 0; col < cols; col++) {
			anchors[row][col] = { x: col * distance + (row % 2) * colInc, y: row * rowInc };
		}
	}

	// now establish anchor neighbors
	for (let row = 0; row < anchors.length; row++) {
		const cols = anchors[row].length;
		for (let col = 0; col < cols; col++) {
			const colAnchorLeft = (row % 2 === 0) ? col - 1 : col;
			const colAnchorRight = (row % 2 === 0) ? col : col + 1;
			const anchor = anchors[row][col] as Anchor;
			// connect to left neighbor
			if (col > 0) anchor.aL = anchors[row][col - 1];
			// connect to right neighbor
			if (col < cols - 1) anchor.aR = anchors[row][col + 1];
			if (row > 0) {
				// connect to bottom left neighbor
				if (colAnchorLeft >= 0) anchor.aBL = anchors[row - 1][colAnchorLeft];
				// connect to bottom right neighbor
				if (colAnchorRight < cols) anchor.aBR = anchors[row - 1][colAnchorRight];
			}
			if (row < rows - 1) { 
				// connect to top left neighbor
				if (colAnchorLeft >= 0) anchor.aTL = anchors[row + 1][colAnchorLeft];
				// connect to top right neighbor
				if (colAnchorRight < cols) anchor.aTR = anchors[row + 1][colAnchorRight];
			}
		}
	}

	// now establish triangles and their anchor relationships
	const triangles:Triangle[] = [];
	for (let row = 0; row < rows; row++) {
		for (let col = 0; col < anchors[row].length; col++) {
			const a = anchors[row][col] as Anchor;
			if (!a.tT && a.aTL && a.aTR) { // Top (T) triangle
				triangles.push(a.tT = a.aTL.tRB = a.aTR.tLB = { aB: a, aL: a.aTL, aR: a.aTR } as Triangle);
			}
			if (!a.tB && a.aBL && a.aBR) { // Bottom (B) triangle
				triangles.push(a.tB = a.aBL.tRT = a.aBR.tLT = { aT: a, aL: a.aBL, aR: a.aBR } as Triangle);
			}
			if (!a.tLT && a.aL && a.aTL) { // Left Top Triangle
				triangles.push(a.tLT = a.aL.tRT = a.aTL.tB = { aR: a, aL: a.aL, aT: a.aTL } as Triangle);
			}
			if (!a.tRT && a.aR && a.aTR) { // Right Top Triangle
				triangles.push(a.tRT = a.aR.tLT = a.aTR.tB = { aL: a, aR: a.aR, aT: a.aTR } as Triangle);
			}
			if (!a.tLB && a.aL && a.aBL) { // Left Bottom Triangle
				triangles.push(a.tLB = a.aL.tRB = a.aBL.tT = { aR: a, aL: a.aL, aB: a.aBL } as Triangle);
			}
			if (!a.tRB && a.aR && a.aBR) { // Right Bottom Triangle
				triangles.push(a.tRB = a.aR.tLB = a.aBR.tT = { aL: a, aR: a.aR, aB: a.aBR } as Triangle);
			}
		}
	}

	// now establish triangle neighbors and calculate a base set of vertex positions
	const deg30 = Math.PI / 6; // 30 degrees
	const anchorPadX = Math.cos(deg30) * padding;
	const anchorPadY = Math.sin(deg30) * padding;
	const globalCenterX = (anchors[rows - 1][cols - 1].x) / 2;
	const globalCenterY = (anchors[rows - 1][cols - 1].y) / 2;
	triangles.forEach((tri,i) => {
		tri.i = i;

		if (isPointingUp(tri)) {
			tri.tL = tri.aL.tT as Triangle;
			tri.tR = tri.aR.tT as Triangle;
			tri.tB = tri.aR.tLB;
			tri.position = [
				tri.aT?.x ?? 0, (tri.aT?.y ?? 0) - padding, 0,
				tri.aR.x - anchorPadX, tri.aR.y + anchorPadY, 0,
				tri.aL.x + anchorPadX, tri.aL.y + anchorPadY, 0
			];
		} else {
			tri.tL = tri.aL.tB as Triangle;
			tri.tR = tri.aR.tB as Triangle;
			tri.tT = tri.aR.tLT;
			tri.position = [
				tri.aB?.x ?? 0, (tri.aB?.y ?? 0) + padding, 0,
				tri.aL.x + anchorPadX, tri.aL.y - anchorPadY, 0,
				tri.aR.x - anchorPadX, tri.aR.y - anchorPadY, 0
			];
		}
		// calculate center point triangle
		tri.centerX = (tri.position[0] + tri.position[3] + tri.position[6]) / 3;
		tri.centerY = (tri.position[1] + tri.position[4] + tri.position[7]) / 3;
		tri.globalOffsetX = tri.centerX - globalCenterX;
		tri.globalOffsetY = tri.centerY - globalCenterY;
	});

	

	// const debugAnchor = anchors[Math.ceil(rows/2)][1] as Anchor;
	// // const debugAnchor = anchors[rows - 1][Math.floor(cols/2)] as Anchor;
	// // const debugAnchor = anchors[0][Math.floor(cols/2)] as Anchor;
	// const debugTriangle = debugAnchor.tLB;
	// if (debugTriangle?.globalAngle) {
	// 	console.log('global anngle:', debugTriangle.globalAngle * (180 / Math.PI));
	// 	const pointingUp = isPointingUp(debugTriangle);
	// 	console.log("pointing:", pointingUp ? "up" : "down");
	// 	console.log('anticlockwise direction:', 1 - Math.abs(debugTriangle.globalAngle_tT! * 180 / Math.PI)); //0.4999999999999956
	// 	const tT = debugTriangle.tT!;
	// 	console.log('clockwise direction:', 1 - Math.abs(tT.globalAngle_tB! * 180 / Math.PI)); // -0.5000000000000044
	// 	console.log('factor:', )
	// }

	return {triangles, anchors: anchors as Anchor[][]};
}

export function addGlobalAngleChanges(triangles: Triangle[]) {
	triangles.forEach((tri) => {
		tri.globalAngle = Math.atan2(tri.globalOffsetY, tri.globalOffsetX);
		if (tri.tT) {
			tri.globalAngleChange_tT = Math.atan2(tri.tT.centerY - tri.centerY, tri.tT.centerX - tri.centerX) - tri.globalAngle!;
		}
		if (tri.tB) {
			tri.globalAngleChange_tB = Math.atan2(tri.tB.centerY - tri.centerY, tri.tB.centerX - tri.centerX) - tri.globalAngle!;
		}
		if (tri.tL) {
			tri.globalAngleChange_tL = Math.atan2(tri.tL.centerY - tri.centerY, tri.tL.centerX - tri.centerX) - tri.globalAngle!;
		}
		if (tri.tR) {
			tri.globalAngleChange_tR = Math.atan2(tri.tR.centerY - tri.centerY, tri.tR.centerX - tri.centerX) - tri.globalAngle!;
		}
	});
}

const fadeInc = 0.001

export class AnimatedTriangle {

	triangle: Triangle;
	index: number;
	color: Color;

	constructor(triangle: Triangle, index:number, color: Color) {
		this.triangle = triangle;
		this.index = index;
		this.color = color;
	}

	animate() {
		// darken the color
		this.color.offsetHSL(0, 0, -fadeInc);
		// if close to faded turn black completely
		if (this.isFaded()) {
			this.color.setRGB(0, 0, 0);
		}
	}

	isFaded(): boolean {
		const hsl = {} as HSL;
		this.color.getHSL(hsl);
		return hsl.l < fadeInc;
	}
}
