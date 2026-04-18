import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';

const WebGLHand = ({ landmarks, width, height }) => {
  const mountRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const rendererRef = useRef(null);
  const pointsRef = useRef(null);
  const linesRef = useRef(null);
  const animationIdRef = useRef(null);

  useEffect(() => {
    if (!mountRef.current) return;

    // Setup scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);
    sceneRef.current = scene;

    // Setup camera
    const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    camera.position.z = 2;
    cameraRef.current = camera;

    // Setup renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setSize(width, height);
    renderer.setClearColor(0x000000, 1);
    mountRef.current.innerHTML = '';
    mountRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Create point cloud
    const pointGeometry = new THREE.BufferGeometry();
    const pointMaterial = new THREE.PointsMaterial({ color: 0x00ff00, size: 0.02 });
    const points = new THREE.Points(pointGeometry, pointMaterial);
    scene.add(points);
    pointsRef.current = points;

    // Create lines for connections
    const lineMaterial = new THREE.LineBasicMaterial({ color: 0x00ff00 });
    const lines = new THREE.LineSegments(new THREE.BufferGeometry(), lineMaterial);
    scene.add(lines);
    linesRef.current = lines;

    // Animation loop
    const animate = () => {
      animationIdRef.current = requestAnimationFrame(animate);
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
      }
      if (rendererRef.current) {
        rendererRef.current.dispose();
      }
      if (mountRef.current) {
        mountRef.current.innerHTML = '';
      }
    };
  }, [width, height]);

  useEffect(() => {
    if (!landmarks || !pointsRef.current || !linesRef.current) return;

    // Update points
    const positions = [];
    landmarks.forEach((landmark) => {
      // Convert from screen coordinates to 3D space
      const x = (landmark.x - 0.5) * 2;
      const y = -(landmark.y - 0.5) * 2;
      const z = -landmark.z;
      positions.push(x, y, z);
    });

    const pointGeometry = new THREE.BufferGeometry();
    pointGeometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(positions), 3));
    pointsRef.current.geometry.dispose();
    pointsRef.current.geometry = pointGeometry;

    // Define connections between landmarks
    const connections = [
      // Thumb
      0, 1, 1, 2, 2, 3, 3, 4,
      // Index finger
      0, 5, 5, 6, 6, 7, 7, 8,
      // Middle finger
      0, 9, 9, 10, 10, 11, 11, 12,
      // Ring finger
      0, 13, 13, 14, 14, 15, 15, 16,
      // Pinky
      0, 17, 17, 18, 18, 19, 19, 20,
      // Palm connections
      5, 9, 9, 13, 13, 17, 17, 0, 0, 5
    ];

    const linePositions = [];
    connections.forEach((idx) => {
      const landmark = landmarks[idx];
      const x = (landmark.x - 0.5) * 2;
      const y = -(landmark.y - 0.5) * 2;
      const z = -landmark.z;
      linePositions.push(x, y, z);
    });

    const lineGeometry = new THREE.BufferGeometry();
    lineGeometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(linePositions), 3));
    linesRef.current.geometry.dispose();
    linesRef.current.geometry = lineGeometry;
  }, [landmarks]);

  return <div ref={mountRef} style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0 }} />;
};

export default WebGLHand;