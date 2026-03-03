import React, { useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { PerspectiveCamera, Float, Environment } from '@react-three/drei';
import { EffectComposer, Bloom, DepthOfField } from '@react-three/postprocessing';
import { useSceneStore } from '../../store/sceneStore';
import * as THREE from 'three';

function AnimatedCamera() {
  const { scrollProgress, scrollVelocity } = useSceneStore();
  const { camera } = useThree();
  
  useFrame(() => {
    const targetZ = 8 - (scrollProgress / 100) * 50;
    const targetY = 2 + Math.sin((scrollProgress / 100) * Math.PI) * 5;
    
    camera.position.z += (targetZ - camera.position.z) * 0.05;
    camera.position.y += (targetY - camera.position.y) * 0.05;
    camera.rotation.z = scrollVelocity * 0.0001;
  });
  
  return (
    <PerspectiveCamera
      makeDefault
      position={[0, 2, 8]}
      fov={50}
    />
  );
}

function HeroShield() {
  const meshRef = useRef();
  
  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y = state.clock.elapsedTime * 0.2;
      meshRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.3) * 0.1;
    }
  });
  
  return (
    <Float speed={2} rotationIntensity={0.5} floatIntensity={0.5}>
      <mesh ref={meshRef} position={[0, 0, -10]}>
        <icosahedronGeometry args={[3, 1]} />
        <meshStandardMaterial
          color="#3b82f6"
          emissive="#3b82f6"
          emissiveIntensity={0.5}
          wireframe
        />
      </mesh>
    </Float>
  );
}

function FloatingDocuments() {
  const groupRef = useRef();
  
  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.children.forEach((child, i) => {
        child.position.y = Math.sin(state.clock.elapsedTime + i) * 0.5;
        child.rotation.y = state.clock.elapsedTime * 0.1 + i;
      });
    }
  });
  
  return (
    <group ref={groupRef} position={[0, 0, -25]}>
      {[...Array(5)].map((_, i) => (
        <mesh key={i} position={[(i - 2) * 3, 0, i * -2]}>
          <planeGeometry args={[2, 3]} />
          <meshStandardMaterial 
            color="#8b5cf6" 
            transparent 
            opacity={0.8}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}
    </group>
  );
}

function RiskSphere() {
  const meshRef = useRef();
  
  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y = state.clock.elapsedTime * 0.15;
    }
  });
  
  return (
    <mesh ref={meshRef} position={[0, 0, -40]}>
      <sphereGeometry args={[4, 32, 32]} />
      <meshStandardMaterial 
        color="#ec4899" 
        wireframe 
        transparent 
        opacity={0.6}
      />
    </mesh>
  );
}

export default function MainScene() {
  const { scrollVelocity } = useSceneStore();
  
  return (
    <div className="fixed inset-0 pointer-events-none">
      <Canvas>
        <AnimatedCamera />
        
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} intensity={1} color="#3b82f6" />
        <pointLight position={[-10, -10, -10]} intensity={0.5} color="#8b5cf6" />
        
        <HeroShield />
        <FloatingDocuments />
        <RiskSphere />
        
        <points>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              count={2000}
              array={new Float32Array(6000).map(() => (Math.random() - 0.5) * 100)}
              itemSize={3}
            />
          </bufferGeometry>
          <pointsMaterial size={0.05} color="#3b82f6" transparent opacity={0.3} />
        </points>
        
        <Environment preset="night" />
        
        <EffectComposer>
          <Bloom luminanceThreshold={0.2} luminanceSmoothing={0.9} intensity={1.5} />
          <DepthOfField
            focusDistance={0}
            focalLength={0.02}
            bokehScale={Math.abs(scrollVelocity) * 0.001}
          />
        </EffectComposer>
      </Canvas>
    </div>
  );
}