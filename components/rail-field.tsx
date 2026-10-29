"use client"

import { useEffect, useRef } from "react"

// A field of dots seen from a low camera: railway tracks run in from every side of the
// foreground and converge on one point at the horizon, with trains moving along them.
// All motion happens in the vertex shader; the CPU only updates a handful of uniforms.

type RailFieldProps = {
  className?: string
  /** Colours are read from these CSS custom properties on the host element. */
  groundVar?: string
  inkVar?: string
  trainVar?: string
  dotVar?: string
  /** World-space x of the convergence point; shifts the vanishing point right or left. */
  convergeX?: number
  tracks?: number
}

const vertexShader = /* glsl */ `
  uniform float uTime;
  uniform vec3 uMouse;
  uniform float uMouseAmt;
  uniform float uPixelRatio;
  uniform float uTracks;
  uniform float uConvergeX;
  uniform vec3 uGround;
  uniform vec3 uInk;
  uniform vec3 uTrain;
  uniform vec3 uDot;

  attribute float aKind;   // 0 terrain, 1 rail
  attribute float aT;      // progress along the track, 0 near .. 1 far
  attribute float aTrack;
  attribute float aSide;   // -1 / 1 rail of the pair
  attribute float aSeed;

  varying vec3 vColor;
  varying float vAlpha;

  const float NEAR_Z = 8.0;
  const float FAR_Z = -64.0;

  float terrain(vec2 p) {
    return 0.34 * sin(p.x * 0.23 + uTime * 0.32) * cos(p.y * 0.17 - uTime * 0.21)
         + 0.18 * sin((p.x + p.y) * 0.09 + uTime * 0.15);
  }

  vec2 trackPoint(float i, float t) {
    float spread = (i / max(uTracks - 1.0, 1.0) - 0.5) * 34.0;
    float bend = 1.0 - pow(1.0 - t, 2.2);
    float x = mix(spread, uConvergeX, bend) + sin(t * 5.0 + i * 1.7) * 1.1 * (1.0 - t);
    return vec2(x, mix(NEAR_Z, FAR_Z, t));
  }

  void main() {
    vec3 pos = position;
    float size = 3.0;
    vec3 col = uDot;
    float alpha = 0.6 + aSeed * 0.25;

    if (aKind > 0.5) {
      vec2 a = trackPoint(aTrack, aT);
      vec2 b = trackPoint(aTrack, aT + 0.002);
      vec2 dir = normalize(b - a);
      vec2 nrm = vec2(-dir.y, dir.x);
      float gauge = 0.26;
      pos.xz = a + nrm * aSide * gauge;
      col = uInk;
      size = 3.4;
      alpha = 1.0;

      // Trains: short packets sliding toward the horizon at per-track speeds
      float speed = 0.035 + fract(aTrack * 0.618) * 0.03;
      float phase = fract(aT * 2.4 - uTime * speed + fract(aTrack * 0.37));
      float train = smoothstep(0.0, 0.01, phase) * (1.0 - smoothstep(0.07, 0.085, phase));
      col = mix(col, uTrain, train);
      size += train * 4.0;
    }

    pos.y = terrain(pos.xz) + (aKind > 0.5 ? 0.03 : 0.0);

    // Cursor lifts the ground under it and parts the dots slightly
    vec2 toM = pos.xz - uMouse.xz;
    float d2 = dot(toM, toM);
    float lift = uMouseAmt * exp(-d2 / 7.5);
    pos.y += lift * 1.5;
    pos.xz += normalize(toM + 1e-4) * lift * 0.35;
    size += lift * 1.6;

    vec4 mv = modelViewMatrix * vec4(pos, 1.0);
    float depth = -mv.z;
    gl_Position = projectionMatrix * mv;
    gl_PointSize = size * uPixelRatio * (11.0 / depth);

    // Fade into the ground colour toward the horizon, and thin out right at the lens
    float fog = smoothstep(16.0, 66.0, depth);
    vColor = mix(col, uGround, fog * 0.92);
    vAlpha = alpha * (1.0 - fog * 0.85) * smoothstep(1.2, 4.0, depth);
  }
`

const fragmentShader = /* glsl */ `
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    vec2 c = gl_PointCoord - 0.5;
    float r = length(c);
    float edge = 1.0 - smoothstep(0.38, 0.5, r);
    if (edge <= 0.0) discard;
    gl_FragColor = vec4(vColor, vAlpha * edge);
  }
`

// Resolve a CSS custom property to rgb() through the browser, so any CSS colour syntax works
const CAMERA_Y = 3.1
const CAMERA_Z = 10

function readColor(el: HTMLElement, name: string, fallback: string) {
  const probe = document.createElement("span")
  probe.style.color = `var(${name}, ${fallback})`
  probe.style.display = "none"
  el.appendChild(probe)
  const rgb = getComputedStyle(probe).color
  probe.remove()
  return rgb || fallback
}

export function RailField({
  className,
  groundVar = "--rail-ground",
  inkVar = "--rail-ink",
  trainVar = "--rail-train",
  dotVar = "--rail-dot",
  convergeX = 7,
  tracks,
}: RailFieldProps) {
  const hostRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const host = hostRef.current
    if (!host) return
    let disposed = false
    let cleanup = () => {}

    import("three").then((THREE) => {
      if (disposed) return

      let renderer: InstanceType<typeof THREE.WebGLRenderer>
      try {
        renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true, powerPreference: "high-performance" })
      } catch {
        return // No WebGL: the section keeps its flat ground colour
      }

      const small = window.matchMedia("(max-width: 768px)").matches
      const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches
      const pixelRatio = Math.min(window.devicePixelRatio || 1, small ? 1.5 : 1.75)
      renderer.setPixelRatio(pixelRatio)
      renderer.setClearColor(0x000000, 0)
      renderer.domElement.style.display = "block"
      renderer.domElement.setAttribute("aria-hidden", "true")
      host.appendChild(renderer.domElement)

      const scene = new THREE.Scene()
      const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 120)
      const lookAt = new THREE.Vector3(convergeX * 0.35, 0, -34)

      // Geometry: a jittered terrain grid plus paired rails for each track
      const trackCount = tracks ?? (small ? 7 : 11)
      const spacing = small ? 0.7 : 0.48
      const railDots = small ? 700 : 1200
      const pos: number[] = []
      const kind: number[] = []
      const tAttr: number[] = []
      const track: number[] = []
      const side: number[] = []
      const seed: number[] = []

      for (let z = 8; z > -64; z -= spacing) {
        for (let x = -34; x < 34; x += spacing) {
          const s = Math.random()
          pos.push(x + (Math.random() - 0.5) * spacing * 0.5, 0, z + (Math.random() - 0.5) * spacing * 0.5)
          kind.push(0); tAttr.push(0); track.push(0); side.push(0); seed.push(s)
        }
      }
      for (let i = 0; i < trackCount; i++) {
        for (let j = 0; j < railDots; j++) {
          // Denser near the camera, where each step of t covers the most screen
          const t = Math.pow(j / railDots, 1.35) * 0.995
          for (const sd of [-1, 1]) {
            pos.push(0, 0, 0)
            kind.push(1); tAttr.push(t); track.push(i); side.push(sd); seed.push(Math.random())
          }
        }
      }

      const geometry = new THREE.BufferGeometry()
      geometry.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3))
      geometry.setAttribute("aKind", new THREE.Float32BufferAttribute(kind, 1))
      geometry.setAttribute("aT", new THREE.Float32BufferAttribute(tAttr, 1))
      geometry.setAttribute("aTrack", new THREE.Float32BufferAttribute(track, 1))
      geometry.setAttribute("aSide", new THREE.Float32BufferAttribute(side, 1))
      geometry.setAttribute("aSeed", new THREE.Float32BufferAttribute(seed, 1))
      geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0, -28), 80)

      const uniforms = {
        uTime: { value: 0 },
        uMouse: { value: new THREE.Vector3(0, 0, 200) },
        uMouseAmt: { value: 0 },
        uPixelRatio: { value: pixelRatio },
        uTracks: { value: trackCount },
        uConvergeX: { value: convergeX },
        uGround: { value: new THREE.Color(readColor(host, groundVar, "#f4c20d")) },
        uInk: { value: new THREE.Color(readColor(host, inkVar, "#141414")) },
        uTrain: { value: new THREE.Color(readColor(host, trainVar, "#1f4fa3")) },
        uDot: { value: new THREE.Color(readColor(host, dotVar, "#8a6a00")) },
      }
      const material = new THREE.ShaderMaterial({
        uniforms,
        vertexShader,
        fragmentShader,
        transparent: true,
        depthWrite: false,
      })
      const points = new THREE.Points(geometry, material)
      scene.add(points)

      // Pointer: raycast onto the ground plane, ease the lift in and out
      const raycaster = new THREE.Raycaster()
      const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)
      const ndc = new THREE.Vector2()
      const hit = new THREE.Vector3()
      const target = { x: 0, y: 0, amt: 0 }
      const eased = { x: 0, y: 0 }
      const interactive = host.parentElement ?? host

      const onMove = (e: PointerEvent) => {
        const r = host.getBoundingClientRect()
        ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1)
        target.x = ndc.x
        target.y = ndc.y
        raycaster.setFromCamera(ndc, camera)
        if (raycaster.ray.intersectPlane(plane, hit)) {
          uniforms.uMouse.value.copy(hit)
          target.amt = 1
        } else {
          target.amt = 0
        }
        if (reduceMotion) render()
      }
      const onLeave = () => {
        target.amt = 0
        target.x = 0
        target.y = 0
      }
      interactive.addEventListener("pointermove", onMove)
      interactive.addEventListener("pointerleave", onLeave)

      const resize = () => {
        const w = host.clientWidth
        const h = host.clientHeight
        if (!w || !h) return
        renderer.setSize(w, h, false)
        renderer.domElement.style.width = "100%"
        renderer.domElement.style.height = "100%"
        const aspect = w / h
        camera.aspect = aspect
        // Hold the horizontal view near 80° so wide, short canvases don't stretch the tracks
        const hHalf = (aspect < 1 ? 62 : 40) * (Math.PI / 180)
        camera.fov = (2 * Math.atan(Math.tan(hHalf) / aspect) * 180) / Math.PI
        camera.updateProjectionMatrix()
        // Tilt down so the horizon sits just under the top edge of the canvas
        const pitch = (camera.fov / 2) * 0.86 * (Math.PI / 180)
        lookAt.y = CAMERA_Y - Math.tan(pitch) * (CAMERA_Z - lookAt.z)
        render()
      }

      const render = () => {
        camera.position.set(eased.x * 1.2, CAMERA_Y + eased.y * 0.25, CAMERA_Z)
        camera.lookAt(lookAt)
        renderer.render(scene, camera)
      }

      let raf = 0
      let running = false
      let last = performance.now()
      const tick = (now: number) => {
        const dt = Math.min((now - last) / 1000, 0.05)
        last = now
        uniforms.uTime.value += dt
        uniforms.uMouseAmt.value += (target.amt - uniforms.uMouseAmt.value) * Math.min(dt * 5, 1)
        eased.x += (target.x - eased.x) * Math.min(dt * 2.5, 1)
        eased.y += (target.y - eased.y) * Math.min(dt * 2.5, 1)
        render()
        raf = requestAnimationFrame(tick)
      }
      const start = () => {
        if (running || reduceMotion || document.hidden) return
        running = true
        last = performance.now()
        raf = requestAnimationFrame(tick)
      }
      const stop = () => {
        running = false
        cancelAnimationFrame(raf)
      }

      // Only animate while the field is on screen and the tab is visible
      let onScreen = true
      const io = new IntersectionObserver(([entry]) => {
        onScreen = entry.isIntersecting
        onScreen ? start() : stop()
      })
      io.observe(host)
      const onVisibility = () => (document.hidden || !onScreen ? stop() : start())
      document.addEventListener("visibilitychange", onVisibility)
      const ro = new ResizeObserver(resize)
      ro.observe(host)

      uniforms.uTime.value = reduceMotion ? 12 : 0
      resize()
      start()

      cleanup = () => {
        stop()
        io.disconnect()
        ro.disconnect()
        document.removeEventListener("visibilitychange", onVisibility)
        interactive.removeEventListener("pointermove", onMove)
        interactive.removeEventListener("pointerleave", onLeave)
        geometry.dispose()
        material.dispose()
        renderer.dispose()
        renderer.domElement.remove()
      }
    })

    return () => {
      disposed = true
      cleanup()
    }
  }, [groundVar, inkVar, trainVar, dotVar, convergeX, tracks])

  return <div ref={hostRef} className={className} />
}
