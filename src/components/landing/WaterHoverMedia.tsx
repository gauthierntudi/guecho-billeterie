"use client";

import {
  useEffect,
  useRef,
  useState,
  type RefObject,
} from "react";
import * as THREE from "three";
import {
  proximityFragmentShader,
  proximityVertexShader,
} from "@/components/landing/shaders/proximity-media";

type WaterHoverMediaProps = {
  variant: "image" | "video";
  src: string;
  videoRef?: RefObject<HTMLVideoElement | null>;
  autoPlayVideo?: boolean;
  isActive?: boolean;
};

const OFF_MOUSE_UV = new THREE.Vector2(99, 99);
const MOUSE_LERP = 0.12;
const mediaClass = "absolute inset-0 h-full w-full object-cover";

function usePointerHover() {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia(
      "(min-width: 992px) and (hover: hover) and (pointer: fine)",
    );
    const update = () => setEnabled(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  return enabled;
}

function VideoMedia({
  src,
  videoRef,
  autoPlayVideo,
  isActive,
}: {
  src: string;
  videoRef?: RefObject<HTMLVideoElement | null>;
  autoPlayVideo: boolean;
  isActive: boolean;
}) {
  useEffect(() => {
    const video = videoRef?.current;
    if (!video) return;

    if (isActive && autoPlayVideo) {
      void video.play().catch(() => {});
      return;
    }

    video.pause();
  }, [autoPlayVideo, isActive, videoRef]);

  return (
    <div className="absolute inset-0 z-[1] overflow-hidden">
      <video
        ref={videoRef}
        src={src}
        autoPlay={autoPlayVideo}
        muted
        loop
        playsInline
        className="h-full w-full object-cover"
      />
    </div>
  );
}

function ImageShaderMedia({ src, isActive }: { src: string; isActive: boolean }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isActiveRef = useRef(isActive);

  isActiveRef.current = isActive;

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    let disposed = false;
    let frameId = 0;
    let resizeObserver: ResizeObserver | null = null;
    let mediaWidth = 16;
    let mediaHeight = 9;

    const mouseNdc = new THREE.Vector2();
    const mouseTarget = new THREE.Vector2().copy(OFF_MOUSE_UV);
    const mouseCurrent = new THREE.Vector2().copy(OFF_MOUSE_UV);
    const raycaster = new THREE.Raycaster();
    let hovering = false;

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
    camera.position.z = 1;

    const renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
      powerPreference: "high-performance",
    });
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.NoToneMapping;

    const uniforms = {
      image: { value: null as THREE.Texture | null },
      uMouseUv: { value: mouseCurrent },
      uMediaAspect: { value: 16 / 9 },
      uViewportAspect: { value: 16 / 9 },
    };

    let geometry = new THREE.PlaneGeometry(2, 2);
    const material = new THREE.ShaderMaterial({
      uniforms,
      vertexShader: proximityVertexShader,
      fragmentShader: proximityFragmentShader,
      toneMapped: false,
      transparent: true,
    });

    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    let texture: THREE.Texture | null = null;

    const fitViewport = (mediaW: number, mediaH: number) => {
      const { width, height } = container.getBoundingClientRect();
      if (!width || !height || !mediaW || !mediaH) return;

      mediaWidth = mediaW;
      mediaHeight = mediaH;

      const viewportAspect = width / height;
      const mediaAspect = mediaW / mediaH;

      camera.left = -viewportAspect;
      camera.right = viewportAspect;
      camera.top = 1;
      camera.bottom = -1;
      camera.updateProjectionMatrix();

      geometry.dispose();
      geometry = new THREE.PlaneGeometry(2 * viewportAspect, 2);
      mesh.geometry = geometry;

      renderer.setSize(width, height, false);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

      uniforms.uMediaAspect.value = mediaAspect;
      uniforms.uViewportAspect.value = viewportAspect;
    };

    const onPointerMove = (event: PointerEvent) => {
      const rect = container.getBoundingClientRect();
      if (
        event.clientX < rect.left ||
        event.clientX > rect.right ||
        event.clientY < rect.top ||
        event.clientY > rect.bottom
      ) {
        return;
      }

      hovering = true;
      mouseNdc.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouseNdc.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouseNdc, camera);
      const hits = raycaster.intersectObject(mesh);
      if (hits[0]?.uv) {
        mouseTarget.copy(hits[0].uv);
      }
    };

    const onPointerLeave = () => {
      hovering = false;
      mouseTarget.copy(OFF_MOUSE_UV);
    };

    const tick = () => {
      frameId = window.requestAnimationFrame(tick);
      if (disposed) return;

      mouseCurrent.lerp(
        hovering && isActiveRef.current ? mouseTarget : OFF_MOUSE_UV,
        MOUSE_LERP,
      );
      material.uniforms.uMouseUv.value = mouseCurrent;

      canvas.style.opacity = hovering && isActiveRef.current ? "1" : "0";

      if (hovering && isActiveRef.current) {
        renderer.render(scene, camera);
      }
    };

    const loader = new THREE.TextureLoader();
    loader.load(
      src,
      (loaded) => {
        if (disposed) {
          loaded.dispose();
          return;
        }

        texture = loaded;
        texture.colorSpace = THREE.SRGBColorSpace;
        uniforms.image.value = texture;

        const image = loaded.image as HTMLImageElement;
        fitViewport(image.naturalWidth, image.naturalHeight);
      },
      undefined,
      () => {
        if (!disposed) {
          fitViewport(16, 9);
        }
      },
    );

    container.addEventListener("pointermove", onPointerMove);
    container.addEventListener("pointerleave", onPointerLeave);

    resizeObserver = new ResizeObserver(() => {
      fitViewport(mediaWidth, mediaHeight);
    });
    resizeObserver.observe(container);

    frameId = window.requestAnimationFrame(tick);

    return () => {
      disposed = true;
      window.cancelAnimationFrame(frameId);
      container.removeEventListener("pointermove", onPointerMove);
      container.removeEventListener("pointerleave", onPointerLeave);
      resizeObserver?.disconnect();

      geometry.dispose();
      material.dispose();
      texture?.dispose();
      renderer.dispose();
    };
  }, [src]);

  return (
    <div ref={containerRef} className="absolute inset-0 z-[1] overflow-hidden">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt=""
        className={mediaClass}
        draggable={false}
        crossOrigin="anonymous"
      />
      <canvas
        ref={canvasRef}
        className="pointer-events-none absolute inset-0 block h-full w-full opacity-0"
      />
    </div>
  );
}

export function WaterHoverMedia({
  variant,
  src,
  videoRef,
  autoPlayVideo = false,
  isActive = true,
}: WaterHoverMediaProps) {
  const canHover = usePointerHover();

  if (variant === "video") {
    return (
      <VideoMedia
        src={src}
        videoRef={videoRef}
        autoPlayVideo={autoPlayVideo}
        isActive={isActive}
      />
    );
  }

  if (!canHover) {
    return (
      <div className="absolute inset-0 z-[1] overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt="" className={mediaClass} draggable={false} />
      </div>
    );
  }

  return <ImageShaderMedia src={src} isActive={isActive} />;
}
