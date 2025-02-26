import * as THREE from "three"; // Importerar three.js biblioteket

var container; // HTML-container för WebGL-rendering
var camera, scene, renderer; // Globala variabler för kameran, scenen och renderaren
var mouseX = 0,
  mouseY = 0;
var windowHalfX = window.innerWidth / 2;
var windowHalfY = window.innerHeight / 2;

// Object3D ("Group") nodes and Mesh nodes
var sceneRoot = new THREE.Group(); // Rotnoden för hela scenen
var sunGroup = new THREE.Group(); // Solens rotationsgrupp
var earthOrbitGroup = new THREE.Group(); // Jordens omloppsbana runt solen
var earthTiltGroup = new THREE.Group(); // Jordens axiala lutning
var earthSpin = new THREE.Group(); // Jordens egen rotation
var moonOrbitGroup = new THREE.Group(); // Månens omloppsbana runt jorden
var marsOrbitGroup = new THREE.Group(); // Mars omloppsbana runt solen

var earthMesh, moonMesh, sunMesh, marsMesh;
var animation = true; // Variabel för att styra om animationen ska köras

// Anpassar rendering när fönstret ändras
function onWindowResize() {
  windowHalfX = window.innerWidth / 2;
  windowHalfY = window.innerHeight / 2;

  // Uppdatera kamerans bildförhållande och projektion
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  // Ändra storlek på renderaren
  renderer.setSize(window.innerWidth, window.innerHeight);
}

// Uppdaterar muskoordinater
function onDocumentMouseMove(event) {
  // mouseX, mouseY are in the range [-1, 1]
  mouseX = (event.clientX - windowHalfX) / windowHalfX;
  mouseY = (event.clientY - windowHalfY) / windowHalfY;
}

// Skapar den hierarkiska scenen
function createSceneGraph() {
  scene = new THREE.Scene(); // Skapar Three.js-scenen
  scene.add(sceneRoot);

  //  Lägg till solen i scenen
  sceneRoot.add(sunGroup);

  //  Lägg till jordens omloppsbana runt solen (5 enheter från solen)
  earthOrbitGroup.position.set(5, 0, 0);
  sunGroup.add(earthOrbitGroup);

  //  Lägg till jordens lutning (23.44°)
  earthTiltGroup.rotation.z = THREE.MathUtils.degToRad(23.44);
  earthOrbitGroup.add(earthTiltGroup);

  //  Lägg till jordens egen rotation
  earthTiltGroup.add(earthSpin);
  earthSpin.add(earthMesh);

  //  Lägg till månens omloppsbana (2 enheter från jorden)
  moonOrbitGroup.position.set(2, 0, 0);
  moonOrbitGroup.rotation.x = THREE.MathUtils.degToRad(5.15); // Månens omloppslutning
  earthSpin.add(moonOrbitGroup);
  moonOrbitGroup.add(moonMesh);

  //  Lägg till Mars och dess omloppsbana (8 enheter från solen)
  marsOrbitGroup.position.set(8, 0, 0);
  sunGroup.add(marsOrbitGroup);
  marsOrbitGroup.add(marsMesh);
}

// Initierar WebGL och laddar texturer
function init() {
  container = document.getElementById("container"); // Hämtar HTML-elementet där WebGL ritas upp

  // **Kamerainställningar**
  camera = new THREE.PerspectiveCamera(
    38,
    window.innerWidth / window.innerHeight,
    0.1,
    100
  );
  camera.position.z = 20; // Sätter kamerans position

  var texloader = new THREE.TextureLoader(); // Skapar en texturladdare

  // **Skapa solen**
  var geometrySun = new THREE.SphereGeometry(2, 32, 16); // Sfär för solen
  var materialSun = new THREE.MeshBasicMaterial({
    map: texloader.load("tex/2k_sun.jpg"),
  });
  sunMesh = new THREE.Mesh(geometrySun, materialSun);
  sunGroup.add(sunMesh);

  // **Lägg till ljuskällor**
  var sunLight = new THREE.PointLight(0xffffff, 2, 500); // Punktljus placerat i solen
  sunGroup.add(sunLight);
  var ambientLight = new THREE.AmbientLight(0x202020); // Svagt omgivande ljus
  sceneRoot.add(ambientLight);

  // **Skapa jorden med shaders**
  var geometryEarth = new THREE.SphereGeometry(1, 10, 16);
  const earthTexture = texloader.load("tex/2k_earth_daymap.jpg");
  const specularTexture = texloader.load("tex/2k_earth_specular_map.jpg");

  var uniforms = THREE.UniformsUtils.merge([
    { colorTexture: { value: earthTexture } },
    { specularTexture: { value: specularTexture } }, // Uppdatering: Specular map
    THREE.UniformsLib["lights"],
  ]);

  const shaderMaterial = new THREE.ShaderMaterial({
    uniforms: uniforms,
    vertexShader: document.getElementById("vertexShader").textContent.trim(),
    fragmentShader: document
      .getElementById("fragmentShader")
      .textContent.trim(),
    lights: true,
  });

  earthMesh = new THREE.Mesh(geometryEarth, shaderMaterial);

  // **Skapa månen**
  var geometryMoon = new THREE.SphereGeometry(0.27, 16, 8);
  const moonTexture = texloader.load("tex/2k_moon.jpg");
  var materialMoon = new THREE.MeshLambertMaterial({ map: moonTexture }); // Månen använder Lambert-material
  moonMesh = new THREE.Mesh(geometryMoon, materialMoon);

  // **Skapa Mars**
  var geometryMars = new THREE.SphereGeometry(0.53, 32, 16);
  const marsTexture = texloader.load("tex/2k_mars.jpg");
  var materialMars = new THREE.MeshLambertMaterial({ map: marsTexture }); // Mars använder Lambert-material
  marsMesh = new THREE.Mesh(geometryMars, materialMars);

  createSceneGraph();

  // ****************************************************************

  // **Initiera WebGL-renderaren**
  renderer = new THREE.WebGLRenderer();
  renderer.setClearColor(0x000000);
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  container.appendChild(renderer.domElement);

  // **Event-lyssnare för interaktion**
  document.addEventListener("mousemove", onDocumentMouseMove, false);
  window.addEventListener("resize", onWindowResize, false);

  var checkBoxAnim = document.getElementById("animation");
  animation = checkBoxAnim.checked;
  checkBoxAnim.addEventListener("change", (event) => {
    animation = event.target.checked;
  });

  var checkBoxWireframe = document.getElementById("wireframe");
  earthMesh.material.wireframe = checkBoxWireframe.checked;
  checkBoxWireframe.addEventListener("change", (event) => {
    earthMesh.material.wireframe = event.target.checked;
  });
}

// **Render-loop**
function render() {
  // Set up the camera
  // Räkna om rotationer i radianer per frame (vid 60 FPS)
  var earthRotationSpeed = THREE.MathUtils.degToRad(360 / 60); // 1 sekund för att snurra
  var moonOrbitSpeed = THREE.MathUtils.degToRad(360 / (27.3 * 60)); // 27.3 sekunder , Ser till att samma sida av månen alltid är vänd mot jorden
  var earthOrbitSpeed = THREE.MathUtils.degToRad(360 / (365 * 60)); // 365 sekunder
  var sunRotationSpeed = THREE.MathUtils.degToRad(360 / (25 * 60)); // 25 sekunder
  var marsOrbitSpeed = THREE.MathUtils.degToRad(360 / (687 * 60)); // 687 sekunder

  // Ställ in kamerans position
  camera.position.x = mouseX * 10;
  camera.position.y = -mouseY * 10;
  camera.lookAt(scene.position);

  if (animation) {
    earthSpin.rotation.y += earthRotationSpeed;
    moonOrbitGroup.rotation.y += moonOrbitSpeed;
    moonMesh.rotation.y += moonOrbitSpeed;

    earthOrbitGroup.rotation.y += earthOrbitSpeed;
    sunGroup.rotation.y += sunRotationSpeed;
    marsOrbitGroup.rotation.y += marsOrbitSpeed;
  }

  renderer.render(scene, camera);
}

// **Startar animationen**
function animate() {
  requestAnimationFrame(animate); // Request to be called again for next frame
  render();
}

init(); // Set up the scene
animate(); // Enter an infinite loop
