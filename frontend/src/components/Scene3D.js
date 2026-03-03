import React, { useRef, useMemo, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, MeshDistortMaterial } from '@react-three/drei';
import * as THREE from 'three';

// Floating Shield Component
function FloatingShield({ mousePosition }) {
  const meshRef = useRef();

  useFrame((state, delta) => {
    if (meshRef.current) {
      // Smooth rotation
      meshRef.current.rotation.y += delta * 0.5;
      meshRef.current.rotation.x += delta * 0.2;

      // Mouse parallax
      const targetX = (mousePosition.x - 0.5) * 0.5;
      const targetY = (mousePosition.y - 0.5) * 0.5;
      
      meshRef.current.position.x += (targetX - meshRef.current.position.x) * 0.1;
      meshRef.current.position.y += (targetY - meshRef.current.position.y) * 0.1;
    }
  });

  return (
    <Float speed={2} rotationIntensity={0.5} floatIntensity={0.5}>
      <mesh ref={meshRef} position={[0, 0, -150]}>
        <dodecahedronGeometry args={[2, 0]} />
        <meshStandardMaterial
          color="#3b82f6"
          metalness={0.8}
          roughness={0.2}
          emissive="#3b82f6"
          emissiveIntensity={0.2}
        />
      </mesh>
    </Float>
  );
}

// Particle Field Component
function ParticleField({ mousePosition }) {
  const particlesRef = useRef();
  
  const particles = useMemo(() => {
    const particleCount = 200;
    const positions = new Float32Array(particleCount * 3);
    
    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 20;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 20;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 10 - 5;
    }
    
    return positions;
  }, []);

  useFrame((state, delta) => {
    if (particlesRef.current) {
      particlesRef.current.rotation.y += delta * 0.1;
      
      // Mouse parallax
      const targetX = (mousePosition.x - 0.5) * 0.3;
      const targetY = (mousePosition.y - 0.5) * 0.3;
      
      particlesRef.current.position.x += (targetX - particlesRef.current.position.x) * 0.05;
      particlesRef.current.position.y += (targetY - particlesRef.current.position.y) * 0.05;
    }
  });

  return (
    <points ref={particlesRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={particles.length / 3}
          array={particles}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.05}
        color="#8b5cf6"
        transparent
        opacity={0.6}
        sizeAttenuation
      />
    </points>
  );
}

// Floating Orb Component
function FloatingOrb({ position, color, mousePosition }) {
  const meshRef = useRef();

  useFrame((state, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.x += delta * 0.3;
      meshRef.current.rotation.y += delta * 0.4;

      // Mouse parallax
      const targetX = (mousePosition.x - 0.5) * 0.3;
      const targetY = (mousePosition.y - 0.5) * 0.3;
      
      meshRef.current.position.x += (targetX - meshRef.current.position.x) * 0.08;
      meshRef.current.position.y += (targetY - meshRef.current.position.y) * 0.08;
    }
  });

  return (
    <Float speed={1.5} rotationIntensity={0.3} floatIntensity={0.3}>
      <mesh ref={meshRef} position={position}>
        <sphereGeometry args={[1, 32, 32]} />
        <MeshDistortMaterial
          color={color}
          attach="material"
          distort={0.3}
          speed={1.5}
          roughness={0.2}
          metalness={0.8}
        />
      </mesh>
    </Float>
  );
}

// Main Scene Component
export default function Scene3D({ mousePosition }) {
  return (
    <div className="fixed inset-0 z-0">
      <Canvas
        camera={{ position: [0, 0, 10], fov: 50 }}
        style={{ background: 'transparent' }}
      >
        <Suspense fallback={null}>
          {/* Lighting */}
          <ambientLight intensity={0.5} />
          <directionalLight position={[10, 10, 5]} intensity={1} />
          <pointLight position={[-10, -10, -5]} intensity={0.5} color="#8b5cf6" />
          
          {/* 3D Objects */}
          <FloatingShield mousePosition={mousePosition} />
          <ParticleField mousePosition={mousePosition} />
          <FloatingOrb position={[-4, 2, -100]} color="#3b82f6" mousePosition={mousePosition} />
          <FloatingOrb position={[4, -2, -120]} color="#8b5cf6" mousePosition={mousePosition} />
          
          {/* Grid Helper */}
          <gridHelper args={[20, 20, '#1e293b', '#1e293b']} position={[0, -5, -200]} />
        </Suspense>
      </Canvas>
    </div>
  );
}