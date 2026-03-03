import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { PerspectiveCamera, Line } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import { useSceneStore } from '../../store/sceneStore';
import * as THREE from 'three';

// ── Scene configuration ──────────────────────────────────────────────────────
const HUB = new THREE.Vector3(0, 0, -18);

const VENDORS = [
  { id: 0, pos: new THREE.Vector3(9,   3,  -14), risk: 'high',   color: '#ef4444', emissiveIntensity: 1.5, size: 0.55 },
  { id: 1, pos: new THREE.Vector3(-8,  2,  -17), risk: 'low',    color: '#22c55e', emissiveIntensity: 0.9, size: 0.40 },
  { id: 2, pos: new THREE.Vector3(7,  -4,  -21), risk: 'medium', color: '#f59e0b', emissiveIntensity: 1.1, size: 0.45 },
  { id: 3, pos: new THREE.Vector3(-9, -3,  -15), risk: 'low',    color: '#22c55e', emissiveIntensity: 0.9, size: 0.38 },
  { id: 4, pos: new THREE.Vector3(10,  0,  -12), risk: 'high',   color: '#ef4444', emissiveIntensity: 1.5, size: 0.50 },
  { id: 5, pos: new THREE.Vector3(-10, 1,  -20), risk: 'medium', color: '#f59e0b', emissiveIntensity: 1.1, size: 0.43 },
  { id: 6, pos: new THREE.Vector3(3,   6,  -24), risk: 'low',    color: '#22c55e', emissiveIntensity: 0.9, size: 0.35 },
  { id: 7, pos: new THREE.Vector3(-4, -5,  -23), risk: 'medium', color: '#f59e0b', emissiveIntensity: 1.1, size: 0.42 },
];

// ── Camera Controller ────────────────────────────────────────────────────────
function CameraController() {
  const { camera } = useThree();
  const scrollProgress = useSceneStore((s) => s.scrollProgress);
  const scrollVelocity = useSceneStore((s) => s.scrollVelocity);

  useFrame(() => {
    const targetZ = 14 - (scrollProgress / 100) * 45;
    const targetY = Math.sin((scrollProgress / 100) * Math.PI * 1.5) * 4;
    camera.position.z += (targetZ - camera.position.z) * 0.04;
    camera.position.y += (targetY - camera.position.y) * 0.03;
    camera.position.x += (0 - camera.position.x) * 0.02;
    camera.rotation.z += scrollVelocity * 0.00003;
    camera.rotation.z *= 0.95;
  });

  return <PerspectiveCamera makeDefault position={[0, 0, 14]} fov={70} />;
}

// ── Company Hub ──────────────────────────────────────────────────────────────
function CompanyHub() {
  const ring1 = useRef();
  const ring2 = useRef();
  const ring3 = useRef();
  const core  = useRef();

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (ring1.current) { ring1.current.rotation.z = t * 0.30; ring1.current.rotation.x = t * 0.20; }
    if (ring2.current) { ring2.current.rotation.z = -t * 0.20; ring2.current.rotation.y = t * 0.35; }
    if (ring3.current) { ring3.current.rotation.x = t * 0.25; ring3.current.rotation.y = -t * 0.15; }
    if (core.current)  { core.current.scale.setScalar(1 + Math.sin(t * 2.5) * 0.04); }
  });

  return (
    <group position={HUB.toArray()}>
      {/* Outer glow shell */}
      <mesh>
        <sphereGeometry args={[4, 16, 16]} />
        <meshBasicMaterial color="#3b82f6" transparent opacity={0.025} side={THREE.BackSide} />
      </mesh>

      {/* Core sphere */}
      <mesh ref={core}>
        <sphereGeometry args={[1.4, 32, 32]} />
        <meshStandardMaterial
          color="#dbeafe" metalness={0.95} roughness={0.05}
          emissive="#3b82f6" emissiveIntensity={1.4}
        />
      </mesh>

      {/* Inner glow */}
      <mesh>
        <sphereGeometry args={[2.0, 16, 16]} />
        <meshBasicMaterial color="#60a5fa" transparent opacity={0.06} side={THREE.BackSide} />
      </mesh>

      {/* Orbital ring 1 – equatorial */}
      <mesh ref={ring1}>
        <torusGeometry args={[2.9, 0.05, 16, 80]} />
        <meshStandardMaterial color="#60a5fa" metalness={1} roughness={0} emissive="#3b82f6" emissiveIntensity={1.8} />
      </mesh>

      {/* Orbital ring 2 – tilted 60° */}
      <mesh ref={ring2} rotation={[Math.PI / 3, 0, 0]}>
        <torusGeometry args={[3.3, 0.04, 16, 80]} />
        <meshStandardMaterial color="#818cf8" metalness={1} roughness={0} emissive="#6d28d9" emissiveIntensity={1.4} />
      </mesh>

      {/* Orbital ring 3 – perpendicular */}
      <mesh ref={ring3} rotation={[0, 0, Math.PI / 2]}>
        <torusGeometry args={[2.6, 0.03, 16, 80]} />
        <meshStandardMaterial color="#a5b4fc" metalness={1} roughness={0} emissive="#8b5cf6" emissiveIntensity={1.2} transparent opacity={0.75} />
      </mesh>
    </group>
  );
}

// ── Risk Pulse Ring (single expanding ring for high-risk vendors) ─────────────
function PulseRing({ offset, color }) {
  const ref = useRef();

  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = ((clock.elapsedTime * 0.4 + offset) % 1);
    ref.current.scale.setScalar(0.5 + t * 5);
    ref.current.material.opacity = (1 - t) * 0.55;
  });

  return (
    <mesh ref={ref} rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[0.6, 0.85, 32]} />
      <meshBasicMaterial color={color} transparent opacity={0.55} side={THREE.DoubleSide} depthWrite={false} />
    </mesh>
  );
}

// ── Vendor Node ───────────────────────────────────────────────────────────────
function VendorNode({ vendor, index }) {
  const groupRef = useRef();
  const baseY = vendor.pos.y;

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    const t = clock.elapsedTime + index * 1.1;
    groupRef.current.position.y = baseY + Math.sin(t * 0.35) * 0.4;
    groupRef.current.rotation.y += 0.004;
  });

  return (
    <group ref={groupRef} position={[vendor.pos.x, vendor.pos.y, vendor.pos.z]}>
      {/* Core */}
      <mesh>
        <sphereGeometry args={[vendor.size, 20, 20]} />
        <meshStandardMaterial
          color={vendor.color} metalness={0.6} roughness={0.4}
          emissive={vendor.color} emissiveIntensity={vendor.emissiveIntensity}
        />
      </mesh>
      {/* Glow */}
      <mesh>
        <sphereGeometry args={[vendor.size * 2.1, 12, 12]} />
        <meshBasicMaterial color={vendor.color} transparent opacity={0.05} side={THREE.BackSide} />
      </mesh>
      {/* High-risk pulse rings */}
      {vendor.risk === 'high' && (
        <>
          <PulseRing offset={0}    color={vendor.color} />
          <PulseRing offset={0.33} color={vendor.color} />
          <PulseRing offset={0.66} color={vendor.color} />
        </>
      )}
    </group>
  );
}

// ── Data Packet (moves from vendor → hub along connection) ───────────────────
function DataPacket({ from, to, color, offset, speed }) {
  const ref = useRef();
  const startVec = useMemo(() => from.clone(), [from]);
  const endVec   = useMemo(() => to.clone(),   [to]);

  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = (clock.elapsedTime * speed + offset) % 1;
    ref.current.position.lerpVectors(startVec, endVec, t);
    ref.current.material.opacity = Math.sin(t * Math.PI) * 0.95;
  });

  return (
    <mesh ref={ref}>
      <sphereGeometry args={[0.07, 6, 6]} />
      <meshBasicMaterial color={color} transparent opacity={0} />
    </mesh>
  );
}

// ── Vendor Network (all vendors + lines + packets) ───────────────────────────
function VendorNetwork() {
  return (
    <>
      {VENDORS.map((v, i) => (
        <group key={v.id}>
          <VendorNode vendor={v} index={i} />

          {/* Glowing connection line */}
          <Line
            points={[v.pos.toArray(), HUB.toArray()]}
            color={v.color}
            lineWidth={v.risk === 'high' ? 1.2 : 0.7}
            opacity={v.risk === 'high' ? 0.40 : 0.22}
          />

          {/* 3 staggered data packets */}
          <DataPacket from={v.pos} to={HUB} color={v.color} offset={0}    speed={0.22} />
          <DataPacket from={v.pos} to={HUB} color={v.color} offset={0.33} speed={0.22} />
          <DataPacket from={v.pos} to={HUB} color={v.color} offset={0.66} speed={0.22} />
        </group>
      ))}
    </>
  );
}

// ── AI Scan Beam (sweeping horizontal plane = "AI scanning") ──────────────────
function ScanBeam() {
  const ref = useRef();

  useFrame(({ clock }) => {
    if (!ref.current) return;
    ref.current.position.y = Math.sin(clock.elapsedTime * 0.45) * 7;
    ref.current.material.opacity = 0.07 + Math.abs(Math.sin(clock.elapsedTime * 0.45)) * 0.05;
  });

  return (
    <mesh ref={ref} position={[0, 0, -18]}>
      <planeGeometry args={[70, 0.07]} />
      <meshBasicMaterial color="#22d3ee" transparent opacity={0.07} side={THREE.DoubleSide} depthWrite={false} />
    </mesh>
  );
}

// ── Secondary scan beam (vertical, slower) ───────────────────────────────────
function ScanBeamVertical() {
  const ref = useRef();

  useFrame(({ clock }) => {
    if (!ref.current) return;
    ref.current.position.x = Math.sin(clock.elapsedTime * 0.25) * 12;
    ref.current.material.opacity = 0.04 + Math.abs(Math.sin(clock.elapsedTime * 0.25)) * 0.03;
  });

  return (
    <mesh ref={ref} position={[0, 0, -18]} rotation={[0, 0, Math.PI / 2]}>
      <planeGeometry args={[40, 0.05]} />
      <meshBasicMaterial color="#a78bfa" transparent opacity={0.04} side={THREE.DoubleSide} depthWrite={false} />
    </mesh>
  );
}

// ── Background Particle Field ─────────────────────────────────────────────────
function ParticleField() {
  const ref = useRef();
  const scrollVelocity = useSceneStore((s) => s.scrollVelocity);

  const count = 1800;
  const positions = useMemo(() => {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count * 3; i += 3) {
      pos[i]     = (Math.random() - 0.5) * 130;
      pos[i + 1] = (Math.random() - 0.5) * 90;
      pos[i + 2] = -8 - Math.random() * 85;
    }
    return pos;
  }, []);

  useFrame(() => {
    if (!ref.current) return;
    ref.current.rotation.y += 0.00008;
    ref.current.rotation.x += scrollVelocity * 0.000004;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={count} array={positions} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial
        size={0.055} color="#60a5fa" transparent opacity={0.22}
        sizeAttenuation blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

// ── Scene Root ────────────────────────────────────────────────────────────────
export default function UnifiedScene() {
  return (
    <div className="fixed inset-0 pointer-events-none">
      <Canvas>
        <CameraController />

        <ambientLight intensity={0.15} />
        {/* Hub light – strong blue */}
        <pointLight position={HUB.toArray()} intensity={4} color="#3b82f6" distance={35} />
        {/* Side accent lights */}
        <pointLight position={[12, 6, -10]}  intensity={2.0} color="#8b5cf6" distance={28} />
        <pointLight position={[-12, -6, -15]} intensity={1.5} color="#22c55e" distance={22} />
        <pointLight position={[0, 8, -5]}    intensity={1.0} color="#60a5fa" distance={20} />

        <CompanyHub />
        <VendorNetwork />
        <ScanBeam />
        <ScanBeamVertical />
        <ParticleField />

        <EffectComposer>
          <Bloom luminanceThreshold={0.08} luminanceSmoothing={0.85} intensity={2.8} />
        </EffectComposer>
      </Canvas>
    </div>
  );
}
