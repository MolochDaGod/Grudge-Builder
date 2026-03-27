import { assetUrl } from "@/lib/assetConfig";
import { useState, useEffect, useRef, useCallback } from "react";

interface UseOptimizedImageOptions {
  src: string;
  placeholder?: string;
  lazy?: boolean;
  preload?: boolean;
  onLoad?: () => void;
  onError?: () => void;
}

interface OptimizedImageState {
  src: string;
  isLoading: boolean;
  isLoaded: boolean;
  hasError: boolean;
}

const imageCache = new Map<string, HTMLImageElement>();
const preloadQueue: string[] = [];
const MAX_CONCURRENT_PRELOADS = 3;
let activePreloads = 0;

function processPreloadQueue() {
  while (activePreloads < MAX_CONCURRENT_PRELOADS && preloadQueue.length > 0) {
    const src = preloadQueue.shift();
    if (src && !imageCache.has(src)) {
      activePreloads++;
      const img = new Image();
      img.onload = () => {
        imageCache.set(src, img);
        activePreloads--;
        processPreloadQueue();
      };
      img.onerror = () => {
        activePreloads--;
        processPreloadQueue();
      };
      img.src = src;
    }
  }
}

export function preloadImage(src: string) {
  if (!imageCache.has(src) && !preloadQueue.includes(src)) {
    preloadQueue.push(src);
    processPreloadQueue();
  }
}

export function preloadImages(srcs: string[]) {
  srcs.forEach(preloadImage);
}

export function isImageCached(src: string): boolean {
  return imageCache.has(src);
}

export function getCacheSize(): number {
  return imageCache.size;
}

export function clearImageCache() {
  imageCache.clear();
}

export function useOptimizedImage({
  src,
  placeholder = "",
  lazy = true,
  preload = false,
  onLoad,
  onError,
}: UseOptimizedImageOptions): OptimizedImageState & { ref: (el: HTMLElement | null) => void } {
  const [state, setState] = useState<OptimizedImageState>({
    src: placeholder || src,
    isLoading: !isImageCached(src),
    isLoaded: isImageCached(src),
    hasError: false,
  });

  const elementRef = useRef<HTMLElement | null>(null);
  const loadedRef = useRef(false);

  const loadImage = useCallback(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;

    if (isImageCached(src)) {
      setState({
        src,
        isLoading: false,
        isLoaded: true,
        hasError: false,
      });
      onLoad?.();
      return;
    }

    setState(prev => ({ ...prev, isLoading: true }));

    const img = new Image();
    img.onload = () => {
      imageCache.set(src, img);
      setState({
        src,
        isLoading: false,
        isLoaded: true,
        hasError: false,
      });
      onLoad?.();
    };
    img.onerror = () => {
      setState(prev => ({
        ...prev,
        isLoading: false,
        hasError: true,
      }));
      onError?.();
    };
    img.src = src;
  }, [src, onLoad, onError]);

  useEffect(() => {
    if (preload) {
      preloadImage(src);
    }
  }, [src, preload]);

  useEffect(() => {
    loadedRef.current = false;

    if (!lazy || isImageCached(src)) {
      loadImage();
      return;
    }

    if (typeof IntersectionObserver === "undefined") {
      loadImage();
      return;
    }

    const element = elementRef.current;
    if (!element) {
      loadImage();
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          loadImage();
          observer.disconnect();
        }
      },
      { rootMargin: "100px" }
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [src, lazy, loadImage]);

  const setRef = useCallback((el: HTMLElement | null) => {
    elementRef.current = el;
  }, []);

  return {
    ...state,
    ref: setRef,
  };
}

export function useSpritePreloader(sprites: Array<{ src: string }>) {
  useEffect(() => {
    const srcs = sprites.map(s => s.src).filter(Boolean);
    preloadImages(srcs);
  }, [sprites]);
}

export function useImageLazyLoad(
  imageRefs: React.RefObject<HTMLImageElement>[],
  srcs: string[]
) {
  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const img = entry.target as HTMLImageElement;
            const index = imageRefs.findIndex(ref => ref.current === img);
            if (index >= 0 && srcs[index]) {
              img.src = srcs[index];
              observer.unobserve(img);
            }
          }
        });
      },
      { rootMargin: "100px" }
    );

    imageRefs.forEach(ref => {
      if (ref.current) {
        observer.observe(ref.current);
      }
    });

    return () => observer.disconnect();
  }, [imageRefs, srcs]);
}

export function getCloudImageUrl(
  localPath: string,
  cloudBaseUrl?: string
): string {
  if (localPath.startsWith("http")) {
    return localPath;
  }

  if (cloudBaseUrl) {
    const normalized = localPath.startsWith("/") ? localPath.slice(1) : localPath;
    return `${cloudBaseUrl}/${normalized}`;
  }

  return localPath;
}

export function getSpriteSheetUrl(
  category: string,
  name: string,
  animation: string
): string {
  return assetUrl(`/sprites/${category}/${name}/${animation}.png`);
}
