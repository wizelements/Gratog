'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';

type Product = {
  id?: string;
  slug?: string;
  name: string;
  price: number;
  category?: string;
  [key: string]: unknown;
};

type Props = {
  products: Product[];
  loading: boolean;
  onProductSelect: (product: Product) => void;
};

export default function FridgeCanvas({ products, loading, onProductSelect }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    if (!canvasRef.current || typeof window === 'undefined') return;

    const prefersReduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    const canvas = canvasRef.current;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#020617');

    const camera = new THREE.PerspectiveCamera(
      40,
      canvas.clientWidth / canvas.clientHeight,
      0.1,
      100
    );
    camera.position.set(0, 1.2, 4.5);

    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);

    const resize = () => {
      const { clientWidth, clientHeight } = canvas;
      if (!clientWidth || !clientHeight) return;
      renderer.setSize(clientWidth, clientHeight, false);
      camera.aspect = clientWidth / clientHeight;
      camera.updateProjectionMatrix();
    };
    resize();
    window.addEventListener('resize', resize);

    const fridgeGroup = new THREE.Group();
    scene.add(fridgeGroup);

    // Fridge frame (outer shell)
    const frameGeom = new THREE.BoxGeometry(2.4, 3.4, 1.3);
    const frameMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#0f172a'),
      emissive: new THREE.Color('#22c55e'),
      emissiveIntensity: 0.15,
      metalness: 0.7,
      roughness: 0.3,
    });
    const frameMesh = new THREE.Mesh(frameGeom, frameMat);
    fridgeGroup.add(frameMesh);

    // Interior glow
    const innerGeom = new THREE.BoxGeometry(2.0, 2.8, 0.9);
    const innerMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color('#22c55e'),
      transparent: true,
      opacity: 0.15,
    });
    const inner = new THREE.Mesh(innerGeom, innerMat);
    inner.position.z = 0.15;
    fridgeGroup.add(inner);

    // Interior mist effect (condensation feel)
    const mistGeom = new THREE.PlaneGeometry(1.9, 2.5);
    const mistMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color('#a7f3d0'),
      transparent: true,
      opacity: 0.05,
    });
    const mist = new THREE.Mesh(mistGeom, mistMat);
    mist.position.set(0, 0.2, 0.28);
    fridgeGroup.add(mist);

    // Shelves
    const shelfGeom = new THREE.BoxGeometry(1.9, 0.03, 0.7);
    const shelfMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#1e293b'),
      metalness: 0.5,
      roughness: 0.4,
    });
    [-0.4, 0.5].forEach((y) => {
      const shelf = new THREE.Mesh(shelfGeom, shelfMat);
      shelf.position.set(0, y, 0.2);
      fridgeGroup.add(shelf);
    });

    // Door group (opens on load)
    const doorGroup = new THREE.Group();
    
    const doorGeom = new THREE.BoxGeometry(2.1, 3.2, 0.06);
    const doorMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#020617'),
      metalness: 0.8,
      roughness: 0.2,
    });
    const door = new THREE.Mesh(doorGeom, doorMat);
    door.position.set(0, 0, 0.7);
    doorGroup.add(door);

    // Door handle
    const handleGeom = new THREE.CylinderGeometry(0.025, 0.025, 0.45, 16);
    const handleMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#e5e7eb'),
      metalness: 0.7,
      roughness: 0.25,
    });
    const handle = new THREE.Mesh(handleGeom, handleMat);
    handle.rotation.z = Math.PI / 2;
    handle.position.set(0.9, 0, 0.75);
    doorGroup.add(handle);

    // Brand plate on door
    const logoGeom = new THREE.PlaneGeometry(0.7, 0.14);
    const logoMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color('#22c55e'),
      transparent: true,
      opacity: 0.8,
    });
    const logo = new THREE.Mesh(logoGeom, logoMat);
    logo.position.set(0, 1.35, 0.74);
    doorGroup.add(logo);

    // Pivot the door from the left edge
    doorGroup.position.x = -1.05;
    fridgeGroup.add(doorGroup);

    // Lighting
    const ambient = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambient);

    const spot = new THREE.SpotLight(0x22c55e, 2.5, 12, Math.PI / 4, 0.5, 1);
    spot.position.set(0, 3.5, 3.5);
    scene.add(spot);

    const pointLight = new THREE.PointLight(0x14b8a6, 1.2, 6);
    pointLight.position.set(0, 0, 2);
    scene.add(pointLight);

    // Interior light (only visible when door opens)
    const fridgeLight = new THREE.PointLight(0x22c55e, 0.8, 3);
    fridgeLight.position.set(0, 1, 0.3);
    fridgeGroup.add(fridgeLight);

    // Jars data with stored base positions
    type JarData = { mesh: THREE.Mesh; product: Product; baseY: number; baseZ: number };
    const jars: JarData[] = [];

    const jarGeom = new THREE.CylinderGeometry(0.16, 0.19, 0.5, 20);
    const capGeom = new THREE.CylinderGeometry(0.18, 0.18, 0.06, 20);

    const jarColors = ['#bbf7d0', '#a7f3d0', '#99f6e4', '#d1fae5', '#ccfbf1', '#ecfdf5'];
    
    const rows = 2;
    const perRow = Math.min(4, products.length || 4);
    const spacingX = 0.55;
    const spacingY = 0.95;

    const list = products.length
      ? products.slice(0, rows * perRow)
      : new Array(rows * perRow).fill(null);

    list.forEach((product, index) => {
      const r = Math.floor(index / perRow);
      const c = index % perRow;

      const colorHex = jarColors[index % jarColors.length];
      const jarMat = new THREE.MeshStandardMaterial({
        color: product ? new THREE.Color(colorHex) : new THREE.Color('#475569'),
        emissive: new THREE.Color('#22c55e'),
        emissiveIntensity: product ? 0.35 : 0.1,
        roughness: 0.15,
        metalness: 0.1,
        transparent: true,
        opacity: 0.92,
      });

      const jar = new THREE.Mesh(jarGeom, jarMat);
      const yPos = 0.75 - r * spacingY;
      const zPos = 0.38;
      jar.position.set(
        (c - (perRow - 1) / 2) * spacingX,
        yPos,
        zPos
      );

      const capMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color('#0f172a'),
        metalness: 0.85,
        roughness: 0.15,
      });
      const cap = new THREE.Mesh(capGeom, capMat);
      cap.position.set(jar.position.x, jar.position.y + 0.3, jar.position.z);

      fridgeGroup.add(jar, cap);

      if (product) {
        jars.push({ mesh: jar, product, baseY: yPos, baseZ: zPos });
      }
    });

    // Raycasting for hover/click
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    const pointerState = { x: 0, y: 0 };
    let hoverJar: THREE.Mesh | null = null;

    const updatePointer = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      const nx = (e.clientX - rect.left) / rect.width - 0.5;
      const ny = (e.clientY - rect.top) / rect.height - 0.5;
      pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      pointerState.x = nx;
      pointerState.y = ny;
    };

    const handleMove = (e: PointerEvent) => {
      updatePointer(e);
      raycaster.setFromCamera(pointer, camera);
      const intersects = raycaster.intersectObjects(
        jars.map((j) => j.mesh),
        false
      );

      if (hoverJar && (!intersects.length || intersects[0].object !== hoverJar)) {
        hoverJar.scale.set(1, 1, 1);
        (hoverJar.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.35;
        hoverJar = null;
        canvas.style.cursor = 'default';
      }

      if (intersects.length) {
        const mesh = intersects[0].object as THREE.Mesh;
        if (mesh !== hoverJar) {
          hoverJar = mesh;
          hoverJar.scale.set(1.15, 1.15, 1.15);
          (hoverJar.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.65;
          canvas.style.cursor = 'pointer';
        }
      }
    };

    // Jar pull-out animation state
    let selectingJar: JarData | null = null;
    let selectProgress = 0;

    const handleClick = (e: PointerEvent) => {
      if (selectingJar) return; // Already animating

      updatePointer(e);
      raycaster.setFromCamera(pointer, camera);
      const intersects = raycaster.intersectObjects(
        jars.map((j) => j.mesh),
        false
      );
      if (intersects.length) {
        const mesh = intersects[0].object as THREE.Mesh;
        const jarData = jars.find((j) => j.mesh === mesh);
        if (jarData && jarData.product) {
          selectingJar = jarData;
          selectProgress = 0;
        }
      }
    };

    canvas.addEventListener('pointermove', handleMove);
    canvas.addEventListener('pointerdown', handleClick);

    const clock = new THREE.Clock();

    // Door animation state
    let doorOpenProgress = 0;

    // Smooth tilt lerp
    const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

    const renderLoop = () => {
      const t = clock.getElapsedTime();
      
      // Door opening animation (ease-out over ~1.5s)
      if (doorOpenProgress < 1) {
        doorOpenProgress = Math.min(1, doorOpenProgress + 0.012);
        const eased = 1 - Math.pow(1 - doorOpenProgress, 3);
        doorGroup.rotation.y = eased * Math.PI * 0.38; // ~68 degrees open
      }

      if (!prefersReduced) {
        // Cursor-following tilt
        const targetRotY = pointerState.x * 0.2;
        const targetRotX = -pointerState.y * 0.1;
        fridgeGroup.rotation.y = lerp(fridgeGroup.rotation.y, targetRotY, 0.06);
        fridgeGroup.rotation.x = lerp(fridgeGroup.rotation.x, targetRotX, 0.06);
        
        // Gentle float
        fridgeGroup.position.y = Math.sin(t * 0.4) * 0.025;

        // Jar bob animation (uses stored baseY to prevent drift)
        jars.forEach((jarData, i) => {
          jarData.mesh.position.y = jarData.baseY + Math.sin(t * 0.7 + i * 0.6) * 0.008;
        });

        // Mist pulse
        mistMat.opacity = 0.04 + Math.sin(t * 0.3) * 0.015;
      }

      // Jar pull-out selection animation
      if (selectingJar) {
        selectProgress += 0.06;
        const eased = 1 - Math.pow(1 - Math.min(selectProgress, 1), 3);
        selectingJar.mesh.position.z = selectingJar.baseZ + eased * 0.2;
        selectingJar.mesh.scale.setScalar(1 + eased * 0.2);
        (selectingJar.mesh.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.35 + eased * 0.4;

        if (selectProgress >= 1.2) {
          // Reset and trigger callback
          selectingJar.mesh.position.z = selectingJar.baseZ;
          selectingJar.mesh.scale.set(1, 1, 1);
          (selectingJar.mesh.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.35;
          onProductSelect(selectingJar.product);
          selectingJar = null;
          selectProgress = 0;
        }
      }

      renderer.render(scene, camera);
      frameRef.current = requestAnimationFrame(renderLoop);
    };
    renderLoop();

    return () => {
      window.removeEventListener('resize', resize);
      canvas.removeEventListener('pointermove', handleMove);
      canvas.removeEventListener('pointerdown', handleClick);
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
      renderer.dispose();
      scene.traverse((obj) => {
        const mesh = obj as THREE.Mesh;
        if (mesh.geometry) mesh.geometry.dispose();
        if (mesh.material) {
          const m = mesh.material;
          if (Array.isArray(m)) m.forEach((mm) => mm.dispose());
          else m.dispose();
        }
      });
    };
  }, [products, onProductSelect]);

  return (
    <canvas 
      ref={canvasRef} 
      className="w-full h-full block touch-none"
      aria-label="Interactive 3D fridge with sea moss products. Hover over jars to highlight, click to select."
    />
  );
}
