"use client";

import { useMotionValue, motion, useMotionTemplate } from "framer-motion";
import React, { MouseEvent as ReactMouseEvent, useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import dynamic from "next/dynamic";

// Dynamically import the CanvasRevealEffect with no SSR
const CanvasRevealEffect = dynamic(
  () => import("@/components/ui/canvas-reveal-effect"),
  { ssr: false }
);

export const CardSpotlight = ({
  children,
  radius = 350,
  color = "#262626",
  className,
  ...props
}: {
  radius?: number;
  color?: string;
  children: React.ReactNode;
} & React.HTMLAttributes<HTMLDivElement>) => {
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const [isMounted, setIsMounted] = useState(false);

  // Only render client-side
  useEffect(() => {
    setIsMounted(true);
  }, []);

  function handleMouseMove({
    currentTarget,
    clientX,
    clientY,
  }: ReactMouseEvent<HTMLDivElement>) {
    let { left, top } = currentTarget.getBoundingClientRect();

    mouseX.set(clientX - left);
    mouseY.set(clientY - top);
  }

  const [isHovering, setIsHovering] = useState(false);
  const handleMouseEnter = () => setIsHovering(true);
  const handleMouseLeave = () => setIsHovering(false);
  return (
    <div
      className={cn(
        "group/spotlight p-10 rounded-md relative border border-neutral-800 bg-black dark:border-neutral-800",
        className
      )}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      {...props}
    >
      <motion.div
        className="pointer-events-none absolute z-0 -inset-px rounded-md opacity-0 transition duration-300 group-hover/spotlight:opacity-100"
        style={{
          backgroundColor: color,
          maskImage: useMotionTemplate`radial-gradient(${radius}px at ${mouseX}px ${mouseY}px, white, transparent)`,
          WebkitMaskImage: useMotionTemplate`radial-gradient(${radius}px at ${mouseX}px ${mouseY}px, white, transparent)`,
        }}
      />
      {isMounted && isHovering && (
        <CanvasRevealEffect
          containerClassName="absolute inset-0 z-0"
          colors={[[255, 255, 255]]}
          dotSize={1.5}
        />
      )}
      <div className="relative z-10">{children}</div>
    </div>
  );
};
