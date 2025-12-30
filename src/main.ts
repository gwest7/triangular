import { BufferAttribute, BufferGeometry, DoubleSide, Mesh, MeshBasicMaterial, type HSL } from 'three/webgpu';
import './style.css'
import { Color, PerspectiveCamera, Scene, WebGLRenderer } from 'three';
import { addGlobalAngleChanges, AnimatedTriangle, genTriangles, isPointingUp, triangleBackProp, triangleTipProp, type Anchor, type Triangle } from './util';

const cols = 80;
const rows = 60;
const size = 0.05; // distance between vertices
let scene: Scene, camera: PerspectiveCamera, renderer: WebGLRenderer, geometry: BufferGeometry;
let anchors: Anchor[][];
let triangles: Triangle[];
let positions:Float32Array;
let colors:Float32Array;
let mousePos: { x: number; y: number } = { x: 0, y: 0 };

function init() {
  scene = new Scene();
  scene.background = new Color(0x000000);

  renderer = new WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

	({ anchors, triangles} = genTriangles(rows, cols, size, size * 0.1));
  addGlobalAngleChanges(triangles);

	// reference triangle neighbors and calculate vertex positions
	positions = new Float32Array(triangles.length * 9);
	colors = new Float32Array(triangles.length * 9);

  triangles.forEach((tri,i) => {
		positions.set(tri.position, i * 9);
    const colour = new Color().setRGB(0,0,0).toArray();
		colors.set([...colour, ...colour, ...colour], i * 9);
  })

  const aspect = window.innerWidth / window.innerHeight;
  camera = new PerspectiveCamera(25, aspect, 0.1, 1000);
  const lastAnchor = anchors[rows - 1][cols - 1];
  const centerX = lastAnchor.x / 2;
  const centerY = lastAnchor.y / 2;
  camera.position.set(centerX, centerY, 7);
  camera.lookAt(centerX, centerY, 0);

	geometry = new BufferGeometry();
	geometry.setAttribute('position', new BufferAttribute(positions, 3));
	geometry.setAttribute('color', new BufferAttribute(colors, 3));

	const material = new MeshBasicMaterial({
		vertexColors: true,
		side: DoubleSide
	});

	const mesh = new Mesh(geometry, material);
	scene.add(mesh);

  window.addEventListener('resize', onWindowResize);
  window.addEventListener('mousemove', onMouseMove);
	renderer.render(scene, camera);
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function onMouseMove(e:MouseEvent) {
  mousePos.x = e.clientX;
  mousePos.y = e.clientY;
}


const fadingTriangles = new Map<Triangle, AnimatedTriangle>();
let animHeads: AnimatedTriangle[] = [];
let animPrevHeads: AnimatedTriangle[] = [];
let animColor: Color;
let heads = 9;

function preAnimationSetup() {
  // let grab one random triangle to animate
  animColor = new Color().setHSL(Math.random(), 0.7, 0.5);
  for (let i = 0; i < heads; i++) {
    const idx = Math.floor(Math.random() * triangles.length);
    animHeads.push(new AnimatedTriangle(triangles[idx], idx, animColor));
  }
}

function animate(time = 0) {
  for (let h = 0; h < heads; h++) {
    // hand head off to be faded
    const animatedTriangle = animHeads[h];
    const tri = animatedTriangle.triangle;
    // pick a neigboring triangle to be the new head
    const neighborProps: (keyof Triangle)[] = ['tL', 'tR', triangleBackProp(tri)];
    const nextProps = neighborProps.map(prop => {
      const neighborTri = tri[prop] as Triangle | undefined;
      
      let baseFavour = !neighborTri ? 0 : neighborTri === animPrevHeads[h]?.triangle ? 1 : fadingTriangles.has(neighborTri) ? 2 : 20;

      // global anticlockwise favoring
      // const neighborTriGACProp = `globalAngleChange_${prop}` as keyof Triangle;
      // const neighborTriGAC = tri[neighborTriGACProp] as number | undefined;
      // if (neighborTri) {
      //   let angleDiff = neighborTriGAC ?? 0;
      //   if (angleDiff < 0) angleDiff += Math.PI * 2;
      //   // convert angleDiff (0 to 2PI) to a favour multiplier (1 to 0)
      //   const angleFavour = 1 - (angleDiff / (Math.PI * 2));
      //   baseFavour *= angleFavour;
      // }
      
      return {
        prop,
        tri: neighborTri,
        favour: baseFavour,
      };
    });

    let cumulativeFavour = 0;
    const totalFavour = nextProps.reduce((sum, np) => sum + np.favour, 0);
    nextProps.forEach(np => {
      cumulativeFavour += np.favour;
      np.favour = cumulativeFavour;
    });
    const rand = Math.random() * totalFavour;
    const selectedProp = nextProps.find(np => rand < np.favour);
    const nextNeighbor = selectedProp?.tri as Triangle;
    

    animPrevHeads[h] = animHeads[h];
    animHeads[h] = new AnimatedTriangle(nextNeighbor, nextNeighbor.i, animColor.clone().offsetHSL(0.01 * h, 0, 0));
    fadingTriangles.set(animPrevHeads[h].triangle, animPrevHeads[h]); // replace any existing to reset color
  }
  // create a new color based on the previous with a hue offset
  animColor = animColor.clone();
  animColor.offsetHSL(0.0002, 0, 0);

  fadingTriangles.forEach((anim, tri) => {
    anim.animate();

    // update triangle color in geometry
    const color = anim.color.toArray();
    colors.set([...color, ...color, ...color], anim.index * 9);

    positions.set(anim.getPositions(), tri.i * 9);

    //remove completely faded triangles
    anim.isFaded() && fadingTriangles.delete(tri);
  });

  geometry.attributes.position.needsUpdate = true;
  geometry.attributes.color.needsUpdate = true;

  const mouseX = (window.innerWidth / 2 - mousePos.x) / window.innerWidth;
  const mouseY = (window.innerHeight / 2 - mousePos.y) / window.innerHeight;
  const centerX = (anchors[rows - 1][cols - 1].x) / 2;
  const centerY = (anchors[rows - 1][cols - 1].y) / 2;
  camera.position.x = centerX + mouseX * 4;
  camera.position.y = centerY + mouseY * -4;
  camera.lookAt(centerX, centerY, 0);
  // camera.rotation.x = mouseY * 0.3;
  renderer.render(scene, camera);

  setTimeout(() => requestAnimationFrame(animate),50);
}


init();
preAnimationSetup();
animate();
