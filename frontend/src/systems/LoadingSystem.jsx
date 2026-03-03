import React, { useEffect, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';

function ShieldAssembly({ progress }) {
  const groupRef = React.useRef();
  
  useFrame(() => {
    if (groupRef.current) {
      groupRef.current.rotation.y += 0.01;
      const scale = Math.min(progress / 100, 1);
      groupRef.current.scale.set(scale, scale, scale);
    }
  });
  
  return (
    <group ref={groupRef}>
      <mesh>
        <icosahedronGeometry args={[2, 1]} />
        <meshStandardMaterial 
          color="#3b82f6" 
          wireframe 
          emissive="#3b82f6"
          emissiveIntensity={0.5}
        />
      </mesh>
      
      <points>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={1000}
            array={new Float32Array(3000).map(() => (Math.random() - 0.5) * 10)}
            itemSize={3}
          />
        </bufferGeometry>
        <pointsMaterial size={0.05} color="#8b5cf6" transparent opacity={0.6} />
      </points>
    </group>
  );
}

export default function LoadingSystem({ onComplete }) {
  const [progress, setProgress] = useState(0);
  
  useEffect(() => {
    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(timer);
          setTimeout(() => {
            onComplete();
          }, 500);
          return 100;
        }
        return prev + 10;
      });
    }, 200);
    
    return () => clearInterval(timer);
  }, [onComplete]);
  
  if (progress >= 100) return null;
  
  return (
    <div className="fixed inset-0 z-50 bg-black flex items-center justify-center">
      <div className="relative w-full h-full">
        <Canvas camera={{ position: [0, 0, 8], fov: 50 }}>
          <ambientLight intensity={0.5} />
          <pointLight position={[10, 10, 10]} intensity={1} />
          <ShieldAssembly progress={progress} />
        </Canvas>
      </div>
      
      <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2 w-64">
        <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="text-white text-center mt-4 text-sm font-light">
          {progress}%
        </p>
      </div>
    </div>
  );
}