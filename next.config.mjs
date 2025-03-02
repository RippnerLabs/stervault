/* eslint-disable import/no-extraneous-dependencies, import/extensions */
import withBundleAnalyzer from "@next/bundle-analyzer";

const bundleAnalyzer = withBundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

/** @type {import('next').NextConfig} */
export default bundleAnalyzer(
  {
    images: {
      remotePatterns: [
        {
          protocol: 'https',
          hostname: '**',
          pathname: '**',
        }
      ],
      dangerouslyAllowSVG: true, // Add this to allow SVG images
      contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    },
    eslint: {
      dirs: ["."],
    },
    poweredByHeader: false,
    reactStrictMode: true,
    experimental: {
      serverComponentsExternalPackages: ["pino", "three"],
      optimizeCss: true,
      scrollRestoration: true,
    },
    swcMinify: true,
    compiler: {
      removeConsole: process.env.NODE_ENV !== 'development',
    },
    optimizeFonts: true,
    // headers: async () => {},
    webpack: (config, { isServer }) => {
      // Exclude problematic files from webpack processing
      config.module.noParse = [
        /node_modules\/@mapbox\/node-pre-gyp\/lib\/util\/nw-pre-gyp\/index\.html$/,
      ];

      // Fixes npm packages that depend on `fs` module
      if (!isServer) {
        config.resolve.fallback = {
          ...config.resolve.fallback,
          fs: false,
        };
      }
      // config.externals is needed to resolve the following errors:
      // Module not found: Can't resolve 'bufferutil'
      // Module not found: Can't resolve 'utf-8-validate'
      config.externals.push(
        {
          bufferutil: "bufferutil",
          "utf-8-validate": "utf-8-validate",
        },
        {
          sharp: "commonjs sharp",
          net: "commonjs net",
        }
      );
     
      // firebase sdk needs this to parse the firebase npm pkg files
      config.module.rules.push({
        test: /\.node$/,
        use: "node-loader",
      });

      if (isServer) {
        // Handle Three.js and related packages on the server
        config.externals.push('three');
        config.externals.push('@react-three/fiber');
        config.externals.push('@react-three/drei');
        config.externals.push('@react-three/flex');
        config.externals.push('react-reconciler');
        
        // Add any other Three.js related packages that might be used
        config.resolve.alias = {
          ...config.resolve.alias,
          'three': 'three',
          '@react-three/fiber': '@react-three/fiber',
          '@react-three/drei': '@react-three/drei',
          '@react-three/flex': '@react-three/flex',
          'react-reconciler': 'react-reconciler',
        };
      }
      return config;
    },
  }
);