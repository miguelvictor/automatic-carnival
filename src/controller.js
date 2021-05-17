import {
  Scene,
  PerspectiveCamera,
  WebGLRenderer,
  AmbientLight,
  DirectionalLight,
  AnimationMixer,
  Vector3,
  Quaternion,
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

import { fov, near, far } from "./constants"

export class PreviewController {
  constructor() {
    // query canvas element and its width and height
    this.canvas = document.getElementById("preview")
    const { width, height } = this.canvas.getBoundingClientRect()

    // setup three.js renderer
    this.renderer = new WebGLRenderer({ antialias: true, canvas: this.canvas })
    this.renderer.setPixelRatio(window.devicePixelRatio)
    this.renderer.setSize(width, height)
    this.renderer.outputEncoding = sRGBEncoding

    // setup three.js scene
    this.scene = new Scene()
    this.scene.background = new Color(0xe0e0e0)
    this.scene.fog = new Fog(0xe0e0e0, 20, 100)

    // setup three.js camera
    const aspectRatio = width / height
    this.camera = new PerspectiveCamera(fov, aspectRatio, near, far)
    this.camera.position.set(-5, 3, 10)
    this.camera.lookAt(new Vector3(0, 2, 0))

    // react to window resize events
    window.addEventListener("resize", () => this.onWindowResize(), false)

    // aux variables
    this._clock = new Clock()
    this._mixer = null
    this._actions = {}

    // load models, animations, etc.
    this.addGroundAndLightings()
    this.loadCharacterIdle()
  }

  onWindowResize() {
    const { width, height } = this.canvas.getBoundingClientRect()
    this.camera.aspect = width / height
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(width, height)
  }

  loadCharacterIdle() {
    // load GLTF model
    const loader = new GLTFLoader()
    loader.load("models/RobotExpressive.glb", (gltf) => {
      const model = gltf.scene
      this.scene.add(model)
      this._mixer = new AnimationMixer(model)

      // setup timmy controls
      this._controls = new BasicCharacterControls({
        target: model,
        camera: this.camera,
      })

      // load gltf animations
      for (let i = 0; i < gltf.animations.length; i++) {
        const clip = gltf.animations[i]
        const action = this._mixer.clipAction(clip)
        this._actions[clip.name] = action

        if (clip.name !== "Idle") {
          action.clampWhenFinished = true
          action.loop = LoopOnce
        }
      }

      // start playing idle action
      this._activeAction = this._actions["Idle"]
      this._activeAction.play()
    })

    document.addEventListener(
      "keydown",
      (event) => {
        if (event.key === " ") {
          this._mixer.addEventListener("finished", () => this.restoreState)
          this.fadeToAction("Jump", 0.2)
        }
      },
      false
    )
  }

  addGroundAndLightings() {
    const mesh = new Mesh(
      new PlaneGeometry(2000, 2000),
      new MeshPhongMaterial({ color: 0x999999, depthWrite: false })
    )
    mesh.rotation.x = -Math.PI / 2
    this.scene.add(mesh)

    const grid = new GridHelper(200, 40, 0x000000, 0x000000)
    grid.material.opacity = 0.2
    grid.material.transparent = true
    this.scene.add(grid)

    // add ambient light
    const light1 = new AmbientLight(0x404040, 2.5)
    this.scene.add(light1)

    // add directional light
    const light2 = new DirectionalLight(0xffffff)
    light2.position.set(0, 20, 10)
    light2.castShadow = true
    this.scene.add(light2)
  }

  restoreState() {
    this._mixer.removeEventListener("finished", this.restoreState)
    this.fadeToAction("idle", 0.2)
  }

  fadeToAction(name, duration) {
    const previousAction = this._activeAction
    this._activeAction = this._actions[name]

    if (previousAction !== this._activeAction) {
      previousAction.fadeOut(duration)
    }

    this._activeAction
      .reset()
      .setEffectiveTimeScale(1)
      .setEffectiveWeight(1)
      .fadeIn(duration)
      .play()
  }

  render() {
    const dt = this._clock.getDelta()
    if (this._mixer !== null) {
      this._mixer.update(dt)
    }
    if (this._controls) {
      this._controls.Update(dt)
    }

    requestAnimationFrame(() => this.render())
    this.renderer.render(this.scene, this.camera)
  }
}

class BasicCharacterControls {
  constructor(params) {
    this._Init(params)
  }

  _Init(params) {
    this._params = params
    this._move = {
      forward: false,
      backward: false,
      left: false,
      right: false,
    }
    this._decceleration = new Vector3(-0.0005, -0.0001, -5.0)
    this._acceleration = new Vector3(1, 0.25, 50.0)
    this._velocity = new Vector3(0, 0, 0)

    document.addEventListener("keydown", (e) => this._onKeyDown(e), false)
    document.addEventListener("keyup", (e) => this._onKeyUp(e), false)
  }

  _onKeyDown(event) {
    switch (event.keyCode) {
      case 87: // w
        this._move.forward = true
        break
      case 65: // a
        this._move.left = true
        break
      case 83: // s
        this._move.backward = true
        break
      case 68: // d
        this._move.right = true
        break
      case 38: // up
      case 37: // left
      case 40: // down
      case 39: // right
        break
    }
  }

  _onKeyUp(event) {
    switch (event.keyCode) {
      case 87: // w
        this._move.forward = false
        break
      case 65: // a
        this._move.left = false
        break
      case 83: // s
        this._move.backward = false
        break
      case 68: // d
        this._move.right = false
        break
      case 38: // up
      case 37: // left
      case 40: // down
      case 39: // right
        break
    }
  }

  Update(timeInSeconds) {
    const velocity = this._velocity
    const frameDecceleration = new Vector3(
      velocity.x * this._decceleration.x,
      velocity.y * this._decceleration.y,
      velocity.z * this._decceleration.z
    )
    frameDecceleration.multiplyScalar(timeInSeconds)
    frameDecceleration.z =
      Math.sign(frameDecceleration.z) *
      Math.min(Math.abs(frameDecceleration.z), Math.abs(velocity.z))

    velocity.add(frameDecceleration)

    const controlObject = this._params.target
    const _Q = new Quaternion()
    const _A = new Vector3()
    const _R = controlObject.quaternion.clone()

    if (this._move.forward) {
      velocity.z += this._acceleration.z * timeInSeconds
    }
    if (this._move.backward) {
      velocity.z -= this._acceleration.z * timeInSeconds
    }
    if (this._move.left) {
      _A.set(0, 1, 0)
      _Q.setFromAxisAngle(_A, Math.PI * timeInSeconds * this._acceleration.y)
      _R.multiply(_Q)
    }
    if (this._move.right) {
      _A.set(0, 1, 0)
      _Q.setFromAxisAngle(_A, -Math.PI * timeInSeconds * this._acceleration.y)
      _R.multiply(_Q)
    }

    controlObject.quaternion.copy(_R)

    const oldPosition = new Vector3()
    oldPosition.copy(controlObject.position)

    const forward = new Vector3(0, 0, 1)
    forward.applyQuaternion(controlObject.quaternion)
    forward.normalize()

    const sideways = new Vector3(1, 0, 0)
    sideways.applyQuaternion(controlObject.quaternion)
    sideways.normalize()

    sideways.multiplyScalar(velocity.x * timeInSeconds)
    forward.multiplyScalar(velocity.z * timeInSeconds)

    controlObject.position.add(forward)
    controlObject.position.add(sideways)

    oldPosition.copy(controlObject.position)
  }
}
