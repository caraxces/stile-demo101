"use client";

import { useEffect, useRef, type MutableRefObject } from "react";
import { Canvas, useLoader } from "@react-three/fiber";
import { OrbitControls, PerspectiveCamera } from "@react-three/drei";
import * as THREE from "three";
import { TextureLoader } from "three";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

type PlaneProps = {
  containerRef: MutableRefObject<HTMLElement | null>;
};

function Plane({ containerRef }: PlaneProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const texture = useLoader(TextureLoader, "/images/AGI2@1.jpg");

  useEffect(() => {
    if (!meshRef.current) return;

    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 8;
    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    texture.needsUpdate = true;

    const material = new THREE.ShaderMaterial({
      uniforms: {
        uTexture: { value: texture },
        uProgress: { value: 0.2 },
        uSmoothness: { value: 0.18 },
        uOffset: { value: -0.35 },
        uLineProgress: { value: 0 },
      },
      vertexShader: `
        varying vec2 vUv;

        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec2 vUv;
        uniform sampler2D uTexture;
        uniform float uProgress;
        uniform float uSmoothness;
        uniform float uOffset;
        uniform float uLineProgress;

        float lineSegment(vec2 uv, vec2 a, vec2 b, float width) {
          vec2 pa = uv - a;
          vec2 ba = b - a;
          float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
          float d = length(pa - ba * h);
          return 1.0 - smoothstep(width, width + 0.0015, d);
        }

        float rectangleOutline(vec2 uv, vec2 mn, vec2 mx, float width) {
          float l = lineSegment(uv, mn, vec2(mx.x, mn.y), width);
          float r = lineSegment(uv, vec2(mn.x, mx.y), mx, width);
          float b = lineSegment(uv, mn, vec2(mn.x, mx.y), width);
          float t = lineSegment(uv, vec2(mx.x, mn.y), mx, width);
          return max(max(l, r), max(t, b));
        }

        float arc(vec2 uv, vec2 center, float radius, vec2 quadrant, float width) {
          vec2 rel = uv - center;
          float mask = step(0.0, rel.x * quadrant.x) * step(0.0, rel.y * quadrant.y);
          float dist = abs(length(rel) - radius);
          float line = 1.0 - smoothstep(width, width + 0.0015, dist);
          return line * mask;
        }

        float triangleOutline(vec2 uv, vec2 a, vec2 b, vec2 c, float width) {
          float ab = lineSegment(uv, a, b, width);
          float bc = lineSegment(uv, b, c, width);
          float ca = lineSegment(uv, c, a, width);
          return max(ab, max(bc, ca));
        }

        void main() {
          vec2 animatedUv = vec2(vUv.x, fract(vUv.y + uOffset));
          vec4 tex = texture2D(uTexture, animatedUv);
          float reveal = smoothstep(uProgress - uSmoothness, uProgress, animatedUv.y);
          tex.a *= clamp(reveal, 0.0, 1.0);

          const float PHI = 1.61803398875;
          float lineWidth = 0.0022;

          vec2 inset = vec2(0.12, 0.1);
          float baseWidth = 0.76;
          float baseHeight = baseWidth / PHI;
          vec2 baseMin = inset;
          vec2 baseMax = inset + vec2(baseWidth, baseHeight);

          float goldenRect = rectangleOutline(vUv, baseMin, baseMax, lineWidth);

          vec2 square1Max = baseMin + vec2(baseHeight, baseHeight);
          float square1 = rectangleOutline(vUv, baseMin, square1Max, lineWidth);

          vec2 square2Min = square1Max;
          vec2 square2Max = vec2(baseMax.x, baseMin.y + baseHeight);
          float square2 = rectangleOutline(vUv, square2Min, square2Max, lineWidth);

          float spiral1 = arc(vUv, square1Max, baseHeight, vec2(-1.0, 1.0), lineWidth);
          float spiral2 = arc(vUv, vec2(baseMax.x, square2Max.y), square2Max.x - square1Max.x, vec2(-1.0, -1.0), lineWidth);
          float spiral3 = arc(vUv, vec2(square2Max.x, baseMin.y + baseHeight), baseHeight / PHI, vec2(1.0, -1.0), lineWidth);

          vec2 triA = vec2(0.2, 0.72);
          vec2 triB = vec2(0.64, 0.72);
          vec2 triC = vec2(0.2, 0.28);
          float triangle = triangleOutline(vUv, triA, triB, triC, lineWidth);

          float squareHyp = rectangleOutline(vUv, vec2(0.64, 0.52), vec2(0.88, 0.76), lineWidth);
          float squareCat = rectangleOutline(vUv, vec2(0.2, 0.74), vec2(0.46, 1.0), lineWidth);

          float geometryOverlay = goldenRect + square1 + square2 + spiral1 + spiral2 + spiral3 + triangle + squareHyp + squareCat;

          float flow = dot(normalize(vec2(0.78, 0.62)), vUv);
          float revealMask = smoothstep(uLineProgress - 0.1, uLineProgress + 0.02, flow);
          float shimmer = sin((flow - uLineProgress * 1.2) * 40.0) * 0.05;

          float overlayFactor = clamp(geometryOverlay * (revealMask + shimmer), 0.0, 1.0);
          vec3 overlayColor = mix(tex.rgb, vec3(0.88, 0.78, 0.42), 0.65);
          tex.rgb = mix(tex.rgb, overlayColor, overlayFactor);

          gl_FragColor = tex;
        }
      `,
      transparent: true,
    });

    meshRef.current.material = material;

    const triggerElement = containerRef.current;
    const tween = gsap.timeline({
      scrollTrigger: triggerElement
        ? {
            trigger: triggerElement,
            start: "top 80%",
            end: "top 5%",
            scrub: true,
          }
        : undefined,
    });

    tween.to(material.uniforms.uOffset, {
      value: 0,
      ease: "power3.out",
      duration: 2.2,
    });

    tween.to(
      material.uniforms.uProgress,
      {
        value: 1,
        ease: "power2.out",
        duration: 2,
        },
       0
    );

    tween.to(
      material.uniforms.uLineProgress,
      {
        value: 1.4,
        ease: "power1.inOut",
        duration: 2.8,
        },
      0.6
    );

    return () => {
      tween.kill();
      const st = tween.scrollTrigger;
      if (st) {
        st.kill();
      }
      material.dispose();
    };
  }, [containerRef, texture]);

  useEffect(() => {
    if (!meshRef.current || !texture.image) return;

    const { width, height } = texture.image as { width: number; height: number };
    if (width && height) {
      const aspect = height / width;
      meshRef.current.scale.set(1, aspect, 1);
    }
  }, [texture]);

  return (
    <mesh ref={meshRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
      <planeGeometry args={[10, 10]} />
    </mesh>
  );
}

export default function HeroSection() {
  const titleRef = useRef<HTMLHeadingElement>(null);
  const subtitleRef = useRef<HTMLParagraphElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    if (titleRef.current) {
      gsap.from(titleRef.current, {
        opacity: 0,
        scale: 0.9,
        duration: 1.2,
        ease: "power3.out",
      });
    }
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      const parallaxFactor = scrollY * 0.5;

      if (titleRef.current) {
        gsap.to(titleRef.current, {
          y: parallaxFactor * 0.3,
          duration: 0.3,
          ease: "power1.out",
        });
      }

      if (subtitleRef.current && scrollY > window.innerHeight * 0.1) {
        gsap.to(subtitleRef.current, {
          opacity: 1,
          y: 0,
          duration: 0.8,
          ease: "power2.out",
        });
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <main>
      <section ref={containerRef} className="hero-section">
        <div className="hero-gradient-bg" />

        <div className="canvas-wrapper">
          <Canvas>
            <PerspectiveCamera makeDefault position={[0, 5, 5]} />
            <ambientLight intensity={0.6} />
            <directionalLight position={[10, 10, 5]} intensity={1.2} />
            <pointLight position={[-10, 10, 5]} intensity={0.5} color="#fff8e1" />
            <Plane containerRef={containerRef} />
            <OrbitControls
              enableZoom={false}
              enablePan={false}
              autoRotate
              autoRotateSpeed={0.5}
            />
          </Canvas>
        </div>

        <div className="hero-content">
          <h1
            ref={titleRef}
            className="hero-title"
          >
            THE ART OF SURFACES
          </h1>
          <p
            ref={subtitleRef}
            className="hero-subtitle"
          >
            Nơi vật liệu kể câu chuyện của không gian.
          </p>
        </div>
      </section>
    </main>
  );
}
