'use client';

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
        uProgress: { value: 0 },
        uSmoothness: { value: 0.15 },
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

        void main() {
          vec4 tex = texture2D(uTexture, vUv);
          float reveal = smoothstep(uProgress - uSmoothness, uProgress, vUv.y);
          tex.a *= clamp(reveal, 0.0, 1.0);
          gl_FragColor = tex;
        }
      `,
      transparent: true,
    });

    meshRef.current.material = material;

    const triggerElement = containerRef.current;
    const tween = gsap.to(material.uniforms.uProgress, {
      value: 1,
      ease: "power2.out",
      duration: 2,
      scrollTrigger: triggerElement
        ? {
            trigger: triggerElement,
            start: "top 75%",
            end: "top 10%",
            scrub: true,
          }
        : undefined,
    });

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

          <div className="canvas-overlays">
            <div className="glow-1 animate-pulse-slow" />
            <div className="glow-2 animate-pulse-slow" />
          </div>
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

