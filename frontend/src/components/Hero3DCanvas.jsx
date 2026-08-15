import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

export default function Hero3DCanvas() {
  const mountRef = useRef(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // Scene, Camera, Renderer
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 1000);
    camera.position.z = 5.5;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    container.appendChild(renderer.domElement);

    // 1. Morphing Organic Noise Sphere Geometry
    const geometry = new THREE.IcosahedronGeometry(1.6, 64);
    const originalPositions = geometry.attributes.position.clone();

    // High-end Dark Matte / Smoked Obsidian Material with Velvet Lighting
    const material = new THREE.MeshStandardMaterial({
      color: 0x111622,
      roughness: 0.28,
      metalness: 0.85,
      flatShading: false,
    });

    const sphereMesh = new THREE.Mesh(geometry, material);
    scene.add(sphereMesh);

    // 2. Cosmic Floating Starfield Particles
    const particleCount = 700;
    const particleGeo = new THREE.BufferGeometry();
    const particlePositions = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount * 3; i += 3) {
      particlePositions[i] = (Math.random() - 0.5) * 14;
      particlePositions[i + 1] = (Math.random() - 0.5) * 14;
      particlePositions[i + 2] = (Math.random() - 0.5) * 14;
    }

    particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
    const particleMat = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.025,
      transparent: true,
      opacity: 0.55,
      blending: THREE.AdditiveBlending,
    });

    const particles = new THREE.Points(particleGeo, particleMat);
    scene.add(particles);

    // 3. Studio Lighting Rig
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    // Key Light (Cool Ice White / Cyan)
    const keyLight = new THREE.DirectionalLight(0x7dd3fc, 2.2);
    keyLight.position.set(5, 5, 4);
    scene.add(keyLight);

    // Rim Light (Verdant Lime Accent)
    const rimLight = new THREE.DirectionalLight(0xb8f032, 1.8);
    rimLight.position.set(-5, -3, -3);
    scene.add(rimLight);

    // Fill Light (Deep Indigo)
    const fillLight = new THREE.PointLight(0x6366f1, 2.5, 12);
    fillLight.position.set(0, -4, 2);
    scene.add(fillLight);

    // Mouse Interaction
    let mouseX = 0;
    let mouseY = 0;
    let targetX = 0;
    let targetY = 0;

    const handleMouseMove = (e) => {
      const rect = container.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5;
      const y = (e.clientY - rect.top) / rect.height - 0.5;
      targetX = x * 1.5;
      targetY = y * 1.5;
    };

    window.addEventListener('mousemove', handleMouseMove);

    // Simple 3D Noise Vertex Displacement
    const simplexDistort = (x, y, z, time) => {
      return (
        Math.sin(x * 2.2 + time * 1.2) * 0.22 +
        Math.cos(y * 2.5 + time * 1.0) * 0.18 +
        Math.sin(z * 2.0 + time * 1.4) * 0.15 +
        Math.sin((x + y + z) * 1.5 + time * 0.8) * 0.12
      );
    };

    // Animation Loop
    let animationFrameId;
    let clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const time = clock.getElapsedTime();

      // Smooth mouse follow interpolation
      mouseX += (targetX - mouseX) * 0.05;
      mouseY += (targetY - mouseY) * 0.05;

      sphereMesh.rotation.y = time * 0.18 + mouseX * 0.8;
      sphereMesh.rotation.x = time * 0.12 + mouseY * 0.8;

      particles.rotation.y = time * 0.03;
      particles.rotation.x = time * 0.02;

      // Deform sphere vertices dynamically
      const pos = geometry.attributes.position;
      const orig = originalPositions;

      for (let i = 0; i < pos.count; i++) {
        const u = orig.getX(i);
        const v = orig.getY(i);
        const w = orig.getZ(i);

        const length = Math.sqrt(u * u + v * v + w * w);
        const dirX = u / length;
        const dirY = v / length;
        const dirZ = w / length;

        const displacement = simplexDistort(u, v, w, time);
        const newRadius = 1.6 + displacement;

        pos.setXYZ(i, dirX * newRadius, dirY * newRadius, dirZ * newRadius);
      }

      pos.needsUpdate = true;
      geometry.computeVertexNormals();

      renderer.render(scene, camera);
    };

    animate();

    // Resize Handler
    const handleResize = () => {
      if (!container) return;
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', handleResize);
      if (container && renderer.domElement) {
        container.removeChild(renderer.domElement);
      }
      geometry.dispose();
      material.dispose();
      particleGeo.dispose();
      particleMat.dispose();
      renderer.dispose();
    };
  }, []);

  return (
    <div 
      ref={mountRef} 
      className="absolute inset-0 w-full h-full pointer-events-none z-0 overflow-hidden"
    />
  );
}
