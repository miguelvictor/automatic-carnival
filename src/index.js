import { parse as acornParse } from "acorn"
import {
  Scene,
  PerspectiveCamera,
  WebGLRenderer,
  AmbientLight,
  DirectionalLight,
  AnimationMixer,
  Vector3,
  Quaternion,
} from "three"
import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader.js"
import { WEBGL } from "./warning"

// main entry point
function setupScene() {
  // setup three.js scene
  const scene = new Scene()

  // setup three.js renderer
  const canvas = document.getElementById("preview")
  const renderer = new WebGLRenderer({ antialias: true, canvas })
  renderer.setClearColor(0x9a9a9a)
  renderer.setSize(canvas.clientWidth, canvas.clientHeight)

  // setup three.js camera
  const aspectRatio = canvas.clientWidth / canvas.clientHeight
  const camera = new PerspectiveCamera(50, aspectRatio, 0.1, 1000)
  camera.position.x = 0
  camera.position.y = 100
  camera.position.z = 400

  // react to window resize events
  window.addEventListener("resize", () => {
    const { width, height } = canvas.getBoundingClientRect()
    camera.aspect = width / height
    camera.updateProjectionMatrix()
    renderer.setSize(width, height)
  })

  // aux variables
  const decelaration = new Vector3(-0.0005, -0.0001, -5.0)
  const acceleration = new Vector3(1, 0.25, 50.0)
  const velocity = new Vector3(0, 0, 0)
  const _mixers = []
  let _previousRAF = null
  let isWalking = false

  // add ambient light
  const light1 = new AmbientLight(0x404040, 5)
  scene.add(light1)
  const light2 = new DirectionalLight(0xffffff, 2)
  light2.position.set(500, 500, 500)
  light2.castShadow = true
  scene.add(light2)

  // load FBX model
  const loader = new FBXLoader()
  let target = null
  loader.setPath("models/")
  loader.load("tpose-timmy.fbx", (fbx) => {
    // fbx.scale.setScalar(0.1)
    fbx.traverse((c) => (c.castShadow = true))

    // load walk animation
    const anim = new FBXLoader()
    anim.setPath("models/")
    anim.load("anim-breathing-idle.fbx", (anim) => {
      const mixer = new AnimationMixer(fbx)
      _mixers.push(mixer)
      const idle = mixer.clipAction(anim.animations[0])
      idle.play()
    })

    scene.add(fbx)
    target = fbx
  })

  // start rendering pipeline
  const _update = (timeInSeconds) => {
    const frameDeceleration = new Vector3(
      velocity.x * decelaration.x,
      velocity.y * decelaration.y,
      velocity.z * decelaration.z
    )
    frameDeceleration.multiplyScalar(timeInSeconds)
    frameDeceleration.z =
      Math.sign(frameDeceleration.z) *
      Math.min(Math.abs(frameDeceleration.z), Math.abs(velocity.z))

    velocity.add(frameDeceleration)
    const _Q = new Quaternion()
    const _A = new Vector3()
    const _R = target.quaternion.clone()

    if (isWalking) {
      velocity.z += acceleration.z * timeInSeconds
    }

    target.quaternion.copy(_R)
    const oldPosition = new Vector3()
    oldPosition.copy(target.position)

    const forward = new Vector3(0, 0, 1)
    forward.applyQuaternion(target.quaternion)
    forward.normalize()

    const sideways = new Vector3(1, 0, 0)
    sideways.applyQuaternion(target.quaternion)
    sideways.normalize()

    sideways.multiplyScalar(velocity.x * timeInSeconds)
    forward.multiplyScalar(velocity.z * timeInSeconds)

    target.position.add(forward)
    target.position.add(sideways)

    oldPosition.copy(target.position)
  }
  const _step = (timeElapsed) => {
    const timeElapsedSeconds = timeElapsed / 1000

    if (_mixers.length !== 0) {
      _mixers.map((m) => m.update(timeElapsedSeconds))
    }

    if (target !== null) {
      _update(timeElapsedSeconds)
    }
  }
  const _raf = () => {
    requestAnimationFrame((t) => {
      if (_previousRAF === null) {
        _previousRAF = t
      }

      _raf()
      renderer.render(scene, camera)
      _step(t - _previousRAF)
      _previousRAF = t
    })
  }
  _raf()
}

window.addEventListener("DOMContentLoaded", () => {
  const codeEditor = document.getElementById("code-editor")
  const btnRunCode = document.getElementById("btn-run-code")

  btnRunCode.addEventListener("click", () => {
    const code = codeEditor.value

    try {
      const ast = acornParse(code, { ecmaVersion: "latest" })
      alert("nice!")
    } catch (e) {
      alert("invalid javascript code")
    }
  })

  // webGL support detection
  if (!WEBGL.isWebGLAvailable()) {
    const warning = WEBGL.getWebGLErrorMessage()
    document.getElementById("container").appendChild(warning)
  } else {
    setupScene()
  }
})
