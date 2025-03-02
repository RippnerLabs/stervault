"use client";
import { cn } from "@/lib/utils";
import React, { useEffect, useState } from "react";

// Create a simple fallback component that doesn't use Three.js
const FallbackEffect = ({ 
  containerClassName,
  colors = [[0, 255, 255]]
}: { 
  containerClassName?: string;
  colors?: number[][];
}) => {
  const color = colors[0] ? `rgb(${colors[0][0]}, ${colors[0][1]}, ${colors[0][2]})` : 'rgb(0, 255, 255)';
  
  return (
    <div 
      className={cn("absolute inset-0 opacity-20", containerClassName)}
      style={{ 
        background: `radial-gradient(circle, ${color} 0%, transparent 70%)`,
        pointerEvents: 'none'
      }}
    />
  );
};

// Main component that conditionally renders Three.js or fallback
export const CanvasRevealEffect = (props: {
  animationSpeed?: number;
  opacities?: number[];
  colors?: number[][];
  containerClassName?: string;
  dotSize?: number;
  showGradient?: boolean;
}) => {
  const [isClient, setIsClient] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [ThreeJsComponent, setThreeJsComponent] = useState<React.ComponentType<any> | null>(null);

  useEffect(() => {
    setIsClient(true);
    
    // Dynamically import Three.js components only on client
    const loadThreeJsComponent = async () => {
      try {
        // We'll use dynamic import to load the actual Three.js implementation
        const ThreeJsImplementation = (await import('./canvas-reveal-effect-impl')).default;
        setThreeJsComponent(() => ThreeJsImplementation);
      } catch (error) {
        console.error("Failed to load Three.js component:", error);
        setHasError(true);
      }
    };
    
    loadThreeJsComponent();
  }, []);

  // Show nothing during SSR
  if (!isClient) {
    return null;
  }

  // Show fallback if there was an error loading Three.js
  if (hasError || !ThreeJsComponent) {
    return <FallbackEffect {...props} />;
  }

  // Render the actual Three.js component if available
  return <ThreeJsComponent {...props} />;
};

export default CanvasRevealEffect;
