import GUI from 'lil-gui'
import * as THREE from 'three/webgpu'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { TransformControls } from 'three/addons/controls/TransformControls.js'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { pass, uniform, color, fog, rangeFogFactor } from 'three/tsl'
import { gaussianBlur } from 'three/addons/tsl/display/GaussianBlurNode.js'
import gridMaterial from './GridMaterial.js'

/**
 * Base
 */
// Debug
const debugObject = {}
const gui = new GUI({
    width: 400
})

// Canvas
const canvas = document.querySelector('canvas.webgl')

// Scene
const scene = new THREE.Scene()

// Loaders
const gltfLoader = new GLTFLoader()

/**
 * Sizes
 */
const sizes = {
    width: window.innerWidth,
    height: window.innerHeight
}

window.addEventListener('resize', () =>
{
    // Update sizes
    sizes.width = window.innerWidth
    sizes.height = window.innerHeight

    // Update camera
    camera.aspect = sizes.width / sizes.height
    camera.updateProjectionMatrix()

    // Update renderer
    renderer.setSize(sizes.width, sizes.height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
})

/**
 * Camera
 */
// Base camera
const camera = new THREE.PerspectiveCamera(15, sizes.width / sizes.height, 0.1, 100)
camera.position.x = 5
camera.position.y = 2
camera.position.z = 6
scene.add(camera)

// Controls
const cameraControls = new OrbitControls(camera, canvas)
cameraControls.enableDamping = true

/**
 * Renderer
 */
const renderer = new THREE.WebGPURenderer({
    canvas: canvas,
    antialias: true
})
renderer.setSize(sizes.width, sizes.height)
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
renderer.setClearColor('#1b191f')

debugObject.clearColor = '#19191f'
renderer.setClearColor(debugObject.clearColor)
gui
    .addColor(debugObject, 'clearColor')
    .onChange(() =>
    {
        renderer.setClearColor(debugObject.clearColor)
    })

/**
 * Focus point
 */
const focusPoint = new THREE.Object3D()
scene.add(focusPoint)

const focusPointControls = new TransformControls(camera, renderer.domElement)
focusPointControls.attach(focusPoint)
scene.add(focusPointControls.getHelper())

focusPointControls.addEventListener('change', (event) =>
{
    focusDistance.value = camera.position.distanceTo(focusPoint.position)
})

focusPointControls.addEventListener('dragging-changed', (event) =>
{
    cameraControls.enabled = !event.value
})

/**
 * Post processing
 */
const postProcessing = new THREE.RenderPipeline(renderer)

// Color
const colorPass = pass(scene, camera)

// Depth
const depthPass = colorPass.getLinearDepthNode()
const absoluteDepth = depthPass.mul(camera.far - camera.near)
const colorPassNode = colorPass.getTextureNode();

// Focus blur
const focusDistance = uniform(camera.position.distanceTo(focusPoint.position))
const focusAmplitude = uniform(5)
const focusStart = uniform(1)
const blurMax = uniform(3)
const blurMultiplier = uniform(1.5)

const focus = absoluteDepth.sub(focusDistance).abs().smoothstep(focusStart, focusStart.add(focusAmplitude))
const blur = focus.mul(blurMultiplier).min(blurMax)
const focusBlurPass = gaussianBlur(colorPassNode, blur, 4)

// Output
postProcessing.outputNode = focusBlurPass

gui.add(focusStart, 'value', 0, 10, 0.001).name('focusStart')
gui.add(focusAmplitude, 'value', 0, 10, 0.001).name('focusAmplitude')
gui.add(blurMax, 'value', 0, 10, 0.001).name('blurMax')
gui.add(blurMultiplier, 'value', 0, 10, 0.001).name('blurMultiplier')

/**
 * Scenery
 */
const sceneryMaterial = new THREE.MeshStandardNodeMaterial()
const sceneryGeoemtry = new THREE.BoxGeometry(1, 1, 1)
sceneryGeoemtry.translate(0, 0.5, 0)
const cubeA = new THREE.Mesh(sceneryGeoemtry, sceneryMaterial)
cubeA.scale.setScalar(0.5)

const cubeB = new THREE.Mesh(sceneryGeoemtry, sceneryMaterial)
cubeB.scale.setScalar(0.75)
cubeB.position.set(-0.5, 0, -1)

const cubeC = new THREE.Mesh(sceneryGeoemtry, sceneryMaterial)
cubeC.scale.setScalar(0.25)
cubeC.position.set(2, 0, 2)

const cubeD = new THREE.Mesh(sceneryGeoemtry, sceneryMaterial)
cubeD.scale.setScalar(0.5)
cubeD.position.set(0.5, 0, 1.5)

scene.add(cubeA, cubeB, cubeC, cubeD)

/**
 * Lights
 */
const directionalLight = new THREE.DirectionalLight('#ffffff', 3)
directionalLight.position.set(3, 2, 1)
scene.add(directionalLight)

const ambientLight = new THREE.AmbientLight('#ffffff', 0.5)
scene.add(ambientLight)

/**
 * Floor
 */
const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(100, 100),
    gridMaterial
)
floor.rotation.x = - Math.PI * 0.5
floor.position.y = 0
scene.add(floor)

scene.fogNode = fog(color('#1b191f'), rangeFogFactor(20, 30))

/**
 * Animate
 */
const clock = new THREE.Timer()

const tick = () =>
{
    // Update camera controls
    cameraControls.update()

    // Render
    // renderer.renderAsync(scene, camera)
    postProcessing.render()

    // Call tick again on the next frame
    window.requestAnimationFrame(tick)
}

await renderer.init()
tick()
