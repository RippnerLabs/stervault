"use client";
import { cn } from "@/lib/utils";
import React, { useEffect, useState } from "react";
import type { Mesh, ShaderMaterial, Vector2, Vector3 } from "three";

// Create a simple fallback component that doesn't use Three.js
const FallbackEffect = ({ 
  containerClassName,
  colors = [[0, 255, 255]],
  showGradient = true
}: { 
  containerClassName?: string;
  colors?: number[][];
  showGradient?: boolean;
}) => {
  const color = colors[0] ? `rgb(${colors[0][0]}, ${colors[0][1]}, ${colors[0][2]})` : 'rgb(0, 255, 255)';
  
  return (
    <div className={cn("h-full relative w-full", containerClassName)}>
      <div 
        className="absolute inset-0 opacity-20"
        style={{ 
          background: `radial-gradient(circle, ${color} 0%, transparent 70%)`,
          pointerEvents: 'none'
        }}
      />
      {showGradient && (
        <div className="absolute inset-0 bg-gradient-to-t from-gray-950 to-[84%]" />
      )}
    </div>
  );
};

// Define types for the components
type CanvasRevealEffectProps = {
  animationSpeed?: number;
  opacities?: number[];
  colors?: number[][];
  containerClassName?: string;
  dotSize?: number;
  showGradient?: boolean;
};

type ShaderProps = {
  source: string;
  uniforms: {
    [key: string]: {
      value: number[] | number[][] | number;
      type: string;
    };
  };
  maxFps?: number;
};

type DotMatrixProps = {
  colors?: number[][];
  opacities?: number[];
  totalSize?: number;
  dotSize?: number;
  shader?: string;
  center?: ("x" | "y")[];
};

// This is the main exported component that safely handles Three.js dependencies
export const CanvasRevealEffect = (props: CanvasRevealEffectProps) => {
  const [isClient, setIsClient] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [ThreeJsComponent, setThreeJsComponent] = useState<React.ComponentType<CanvasRevealEffectProps> | null>(null);

  useEffect(() => {
    setIsClient(true);
    
    // Attempt to load Three.js components safely
    const loadThreeJsComponents = async () => {
      try {
        // Dynamic imports to avoid SSR issues
        const THREE = await import('three');
        const { Canvas, useFrame, useThree } = await import('@react-three/fiber');
        
        // Create the actual implementation
        const ThreeJsImplementation = (props: CanvasRevealEffectProps) => {
          try {
            const {
              animationSpeed = 0.4,
              opacities = [0.3, 0.3, 0.3, 0.5, 0.5, 0.5, 0.8, 0.8, 0.8, 1],
              colors = [[0, 255, 255]],
              containerClassName,
              dotSize,
              showGradient = true,
            } = props;

            const DotMatrix = ({
              colors = [[0, 0, 0]],
              opacities = [0.04, 0.04, 0.04, 0.04, 0.04, 0.08, 0.08, 0.08, 0.08, 0.14],
              totalSize = 4,
              dotSize = 2,
              shader = "",
              center = ["x", "y"],
            }: DotMatrixProps) => {
              const uniforms = React.useMemo(() => {
                let colorsArray = [
                  colors[0],
                  colors[0],
                  colors[0],
                  colors[0],
                  colors[0],
                  colors[0],
                ];
                if (colors.length === 2) {
                  colorsArray = [
                    colors[0],
                    colors[0],
                    colors[0],
                    colors[1],
                    colors[1],
                    colors[1],
                  ];
                } else if (colors.length === 3) {
                  colorsArray = [
                    colors[0],
                    colors[0],
                    colors[1],
                    colors[1],
                    colors[2],
                    colors[2],
                  ];
                }
            
                return {
                  u_colors: {
                    value: colorsArray.map((color) => [
                      color[0] / 255,
                      color[1] / 255,
                      color[2] / 255,
                    ]),
                    type: "uniform3fv",
                  },
                  u_opacities: {
                    value: opacities,
                    type: "uniform1fv",
                  },
                  u_total_size: {
                    value: totalSize,
                    type: "uniform1f",
                  },
                  u_dot_size: {
                    value: dotSize,
                    type: "uniform1f",
                  },
                };
              }, [colors, opacities, totalSize, dotSize]);
            
              const Shader = ({ source, uniforms, maxFps = 60 }: ShaderProps) => {
                return (
                  <Canvas className="absolute inset-0 h-full w-full">
                    <ShaderMaterial source={source} uniforms={uniforms} maxFps={maxFps} />
                  </Canvas>
                );
              };

              type UniformsType = {
                [key: string]: {
                  value: any;
                  type: string;
                };
              };
 
              const ShaderMaterial = ({
                source,
                uniforms,
                maxFps = 60,
              }: ShaderProps) => {
                const { size } = useThree();
                const ref = React.useRef<Mesh>(null);
                let lastFrameTime = 0;
              
                useFrame(({ clock }) => {
                  if (!ref.current) return;
                  const timestamp = clock.getElapsedTime();
                  if (timestamp - lastFrameTime < 1 / maxFps) {
                    return;
                  }
                  lastFrameTime = timestamp;
              
                  const material = ref.current.material as ShaderMaterial;
                  if (material && material.uniforms) {
                    const timeLocation = material.uniforms.u_time;
                    if (timeLocation) timeLocation.value = timestamp;
                  }
                });
              
                const getUniforms = () => {
                  const preparedUniforms: Record<string, any> = {};
              
                  for (const uniformName in uniforms) {
                    const uniform = uniforms[uniformName];
              
                    switch (uniform.type) {
                      case "uniform1f":
                        preparedUniforms[uniformName] = { value: uniform.value, type: "1f" };
                        break;
                      case "uniform3f":
                        preparedUniforms[uniformName] = {
                          value: new THREE.Vector3().fromArray(uniform.value as number[]),
                          type: "3f",
                        };
                        break;
                      case "uniform1fv":
                        preparedUniforms[uniformName] = { value: uniform.value, type: "1fv" };
                        break;
                      case "uniform3fv":
                        preparedUniforms[uniformName] = {
                          value: (uniform.value as number[][]).map((v) =>
                            new THREE.Vector3().fromArray(v)
                          ),
                          type: "3fv",
                        };
                        break;
                      case "uniform2f":
                        preparedUniforms[uniformName] = {
                          value: new THREE.Vector2().fromArray(uniform.value as number[]),
                          type: "2f",
                        };
                        break;
                      default:
                        console.error(`Invalid uniform type for '${uniformName}'.`);
                        break;
                    }
                  }
              
                  preparedUniforms["u_time"] = { value: 0, type: "1f" };
                  preparedUniforms["u_resolution"] = {
                    value: new THREE.Vector2(size.width * 2, size.height * 2),
                  }; 
                  return preparedUniforms;
                };
              
                // Shader material
                const material = React.useMemo(() => {
                  const materialObject = new THREE.ShaderMaterial({
                    vertexShader: `
                    precision mediump float;
                    in vec2 coordinates;
                    uniform vec2 u_resolution;
                    out vec2 fragCoord;
                    void main(){
                      float x = position.x;
                      float y = position.y;
                      gl_Position = vec4(x, y, 0.0, 1.0);
                      fragCoord = (position.xy + vec2(1.0)) * 0.5 * u_resolution;
                      fragCoord.y = u_resolution.y - fragCoord.y;
                    }
                    `,
                    fragmentShader: source,
                    uniforms: getUniforms(),
                    glslVersion: THREE.GLSL3,
                    blending: THREE.CustomBlending,
                    blendSrc: THREE.SrcAlphaFactor,
                    blendDst: THREE.OneFactor,
                  });
              
                  return materialObject;
                }, [size.width, size.height, source]);
              
                return (
                  <mesh ref={ref}>
                    <planeGeometry args={[2, 2]} />
                    <primitive object={material} attach="material" />
                  </mesh>
                );
              };
            
              return (
                <Shader
                  source={`
                    precision mediump float;
                    in vec2 fragCoord;
            
                    uniform float u_time;
                    uniform float u_opacities[10];
                    uniform vec3 u_colors[6];
                    uniform float u_total_size;
                    uniform float u_dot_size;
                    uniform vec2 u_resolution;
                    out vec4 fragColor;
                    float PHI = 1.61803398874989484820459;
                    float random(vec2 xy) {
                        return fract(tan(distance(xy * PHI, xy) * 0.5) * xy.x);
                    }
                    float map(float value, float min1, float max1, float min2, float max2) {
                        return min2 + (value - min1) * (max2 - min2) / (max1 - min1);
                    }
                    void main() {
                        vec2 st = fragCoord.xy;
                        ${
                          center.includes("x")
                            ? "st.x -= abs(floor((mod(u_resolution.x, u_total_size) - u_dot_size) * 0.5));"
                            : ""
                        }
                        ${
                          center.includes("y")
                            ? "st.y -= abs(floor((mod(u_resolution.y, u_total_size) - u_dot_size) * 0.5));"
                            : ""
                        }
                  float opacity = step(0.0, st.x);
                  opacity *= step(0.0, st.y);
            
                  vec2 st2 = vec2(int(st.x / u_total_size), int(st.y / u_total_size));
            
                  float frequency = 5.0;
                  float show_offset = random(st2);
                  float rand = random(st2 * floor((u_time / frequency) + show_offset + frequency) + 1.0);
                  opacity *= u_opacities[int(rand * 10.0)];
                  opacity *= 1.0 - step(u_dot_size / u_total_size, fract(st.x / u_total_size));
                  opacity *= 1.0 - step(u_dot_size / u_total_size, fract(st.y / u_total_size));
            
                  vec3 color = u_colors[int(show_offset * 6.0)];
            
                  ${shader}
            
                  fragColor = vec4(color, opacity);
                  fragColor.rgb *= fragColor.a;
                    }`}
                  uniforms={uniforms}
                  maxFps={60}
                />
              );
            };

            return (
              <div className={cn("h-full relative bg-white w-full", containerClassName)}>
                <div className="h-full w-full">
                  <DotMatrix
                    colors={colors ?? [[0, 255, 255]]}
                    dotSize={dotSize ?? 3}
                    opacities={
                      opacities ?? [0.3, 0.3, 0.3, 0.5, 0.5, 0.5, 0.8, 0.8, 0.8, 1]
                    }
                    shader={`
                        float animation_speed_factor = ${animationSpeed.toFixed(1)};
                        float intro_offset = distance(u_resolution / 2.0 / u_total_size, st2) * 0.01 + (random(st2) * 0.15);
                        opacity *= step(intro_offset, u_time * animation_speed_factor);
                        opacity *= clamp((1.0 - step(intro_offset + 0.1, u_time * animation_speed_factor)) * 1.25, 1.0, 1.25);
                      `}
                    center={["x", "y"]}
                  />
                </div>
                {showGradient && (
                  <div className="absolute inset-0 bg-gradient-to-t from-gray-950 to-[84%]" />
                )}
              </div>
            );
          } catch (err) {
            console.error("Error rendering Three.js component:", err);
            return <FallbackEffect {...props} />;
          }
        };

        setThreeJsComponent(() => ThreeJsImplementation);
      } catch (error) {
        console.error("Failed to load Three.js components:", error);
        console.warn('This may be due to a version mismatch between Three.js and @react-three/fiber. ' +
          'Check that your Three.js version (currently used) is compatible with your @react-three/fiber version.');
        setHasError(true);
      }
    };
    
    loadThreeJsComponents();
  }, []);

  // Show nothing during SSR
  if (!isClient) {
    return null;
  }

  // Show fallback if there was an error loading Three.js or it's still loading
  if (hasError || !ThreeJsComponent) {
    return <FallbackEffect {...props} />;
  }

  // Render the actual Three.js component with error boundary
  return (
    <ErrorBoundary fallback={<FallbackEffect {...props} />}>
      <ThreeJsComponent {...props} />
    </ErrorBoundary>
  );
};

// Simple error boundary component
class ErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode; fallback: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    console.error("Error caught by ErrorBoundary:", error);
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

export default CanvasRevealEffect;
