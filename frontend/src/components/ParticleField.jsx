import { useEffect } from "react";
import * as THREE from "three";

// Slowly rotating star dust around the landing page globe.
export default function ParticleField({ globe }) {
  useEffect(() => {
    const scene = globe.scene();
    const count = 1450;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const color = new THREE.Color();
    for (let index = 0; index < count; index += 1) {
      const radius = 165 + Math.random() * 120;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);
      const offset = index * 3;
      positions[offset] = radius * Math.sin(phi) * Math.cos(theta);
      positions[offset + 1] = radius * Math.cos(phi);
      positions[offset + 2] = radius * Math.sin(phi) * Math.sin(theta);
      color.setHSL(0.55 + Math.random() * 0.12, 0.68, 0.55 + Math.random() * 0.3);
      colors[offset] = color.r;
      colors[offset + 1] = color.g;
      colors[offset + 2] = color.b;
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    const material = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      uniforms: { pointSize: { value: 1.5 } },
      vertexShader:
        "attribute vec3 color; varying vec3 pointColor; uniform float pointSize; void main(){ pointColor=color; vec4 mvPosition=modelViewMatrix*vec4(position,1.0); gl_PointSize=pointSize*(260.0/-mvPosition.z); gl_Position=projectionMatrix*mvPosition; }",
      fragmentShader:
        "varying vec3 pointColor; void main(){ float distanceFromCenter=distance(gl_PointCoord,vec2(.5)); if(distanceFromCenter>.5) discard; float glow=1.0-smoothstep(.05,.5,distanceFromCenter); gl_FragColor=vec4(pointColor,glow*.62); }",
    });
    const particles = new THREE.Points(geometry, material);
    scene.add(particles);
    let frame;
    const animate = () => {
      particles.rotation.y += 0.00018;
      particles.rotation.x = Math.sin(Date.now() * 0.00012) * 0.025;
      frame = requestAnimationFrame(animate);
    };
    animate();
    return () => {
      cancelAnimationFrame(frame);
      scene.remove(particles);
      geometry.dispose();
      material.dispose();
    };
  }, [globe]);
  return null;
}
