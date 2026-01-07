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

    const frameGeom = new THREE.BoxGeometry(2.4, 3.4, 1.3);
    const frameMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#0f172a'),
      emissive: new THREE.Color('#22c55e'),
      emissiveIntensity: 0.2,
      metalness: 0.7,
      roughness: 0.3,
    });
    const frameMesh = new THREE.Mesh(frameGeom, frameMat);
    fridgeGroup.add(frameMesh);

    const innerGeom = new THREE.BoxGeometry(2.0, 2.8, 0.9);
    const innerMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color('#22c55e'),
      transparent: true,
      opacity: 0.12,
    });
    const inner = new THREE.Mesh(innerGeom, innerMat);
    inner.position.z = 0.15;
    fridgeGroup.add(inner);

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

    const ambient = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambient);

    const spot = new THREE.SpotLight(0x22c55e, 2.5, 12, Math.PI / 4, 0.5, 1);
    spot.position.set(0, 3.5, 3.5);
    scene.add(spot);

    const pointLight = new THREE.PointLight(0x14b8a6, 1, 6);
    pointLight.position.set(0, 0, 2);
    scene.add(pointLight);

    type JarData = { mesh: THREE.Mesh; product: Product };
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
      jar.position.set(
        (c - (perRow - 1) / 2) * spacingX,
        0.75 - r * spacingY,
        0.38
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
        jars.push({ mesh: jar, product });
      }
    });

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    let hoverJar: THREE.Mesh | null = null;

    const updatePointer = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
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
          (hoverJar.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.6;
          canvas.style.cursor = 'pointer';
        }
      }
    };

    const handleClick = (e: PointerEvent) => {
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
          onProductSelect(jarData.product);
        }
      }
    };

    canvas.addEventListener('pointermove', handleMove);
    canvas.addEventListener('pointerdown', handleClick);

    const clock = new THREE.Clock();

    const renderLoop = () => {
      const t = clock.getElapsedTime();
      
      fridgeGroup.rotation.y = Math.sin(t * 0.15) * 0.08;
      fridgeGroup.position.y = Math.sin(t * 0.5) * 0.03;

      jars.forEach((jarData, i) => {
        const baseY = jarData.mesh.position.y;
        jarData.mesh.position.y = baseY + Math.sin(t * 0.8 + i * 0.5) * 0.008;
      });

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
    />
  );
}
