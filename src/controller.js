import {
  Scene,
  PerspectiveCamera,
  WebGLRenderer,
  HemisphereLight,
  DirectionalLight,
  AnimationMixer,
  Vector3,
  Color,
  Fog,
  Mesh,
  MeshPhongMaterial,
  PlaneGeometry,
  GridHelper,
  LoopOnce,
  Clock,
  sRGBEncoding,
} from "three"
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js"

let container, clock, mixer, actions, activeAction, previousAction
let camera, scene, renderer, model

const api = { state: "Idle" }

function init() {
  container = document.getElementById("preview")
  const { width, height } = container.getBoundingClientRect()

  camera = new PerspectiveCamera(45, width / height, 0.25, 100)
  camera.position.set(-5, 3, 10)
  camera.lookAt(new Vector3(0, 2, 0))

  scene = new Scene()
  scene.background = new Color(0xe0e0e0)
  scene.fog = new Fog(0xe0e0e0, 20, 100)

  clock = new Clock()

  // lights

  const hemiLight = new HemisphereLight(0xffffff, 0x444444)
  hemiLight.position.set(0, 20, 0)
  scene.add(hemiLight)

  const dirLight = new DirectionalLight(0xffffff)
  dirLight.position.set(0, 20, 10)
  scene.add(dirLight)

  // ground

  const mesh = new Mesh(
    new PlaneGeometry(2000, 2000),
    new MeshPhongMaterial({ color: 0x999999, depthWrite: false })
  )
  mesh.rotation.x = -Math.PI / 2
  scene.add(mesh)

  const grid = new GridHelper(200, 40, 0x000000, 0x000000)
  grid.material.opacity = 0.2
  grid.material.transparent = true
  scene.add(grid)

  // model

  const loader = new GLTFLoader()
  loader.load(
    "models/RobotExpressive.glb",
    function (gltf) {
      model = gltf.scene
      scene.add(model)

      createGUI(model, gltf.animations)
    },
    undefined,
    function (e) {
      console.error(e)
    }
  )

  renderer = new WebGLRenderer({ antialias: true })
  renderer.setPixelRatio(window.devicePixelRatio)
  renderer.setSize(width, height)
  renderer.outputEncoding = sRGBEncoding
  container.appendChild(renderer.domElement)

  window.addEventListener("resize", onWindowResize)
}

function createGUI(model, animations) {
  const states = [
    "Idle",
    "Walking",
    "Running",
    "Dance",
    "Death",
    "Sitting",
    "Standing",
  ]
  const emotes = ["Jump", "Yes", "No", "Wave", "Punch", "ThumbsUp"]

  mixer = new AnimationMixer(model)
  actions = {}

  for (let i = 0; i < animations.length; i++) {
    const clip = animations[i]
    const action = mixer.clipAction(clip)
    actions[clip.name] = action

    if (emotes.indexOf(clip.name) >= 0 || states.indexOf(clip.name) >= 4) {
      action.clampWhenFinished = true
      action.loop = LoopOnce
    }
  }

  activeAction = actions[api.state]
  activeAction.play()
}

function restoreState() {
  mixer.removeEventListener("finished", restoreState)
  fadeToAction(api.state, 0.2)
}

function fadeToAction(name, duration) {
  previousAction = activeAction
  activeAction = actions[name]

  if (previousAction !== activeAction) {
    previousAction.fadeOut(duration)
  }

  activeAction
    .reset()
    .setEffectiveTimeScale(1)
    .setEffectiveWeight(1)
    .fadeIn(duration)
    .play()
}

function onWindowResize() {
  const { width, height } = container.getBoundingClientRect()
  camera.aspect = width / height
  camera.updateProjectionMatrix()
  renderer.setSize(width, height)
}

//

function animate() {
  const dt = clock.getDelta()
  if (mixer) mixer.update(dt)
  requestAnimationFrame(animate)
  renderer.render(scene, camera)
}

function syncEvents(actions) {
  if (actions.length === 0) {
    return
  }

  let timingOffset = 0
  for (const { action, count } of actions) {
    for (let i = 0; i < count; i++) {
      setTimeout(() => {
        fadeToAction(action, 0.2)
        mixer.addEventListener("finished", restoreState)
      }, 1000 * timingOffset)
      timingOffset += 1
    }
  }
}

export { init, animate, syncEvents }
