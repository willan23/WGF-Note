const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);

// Otimizações de desempenho do Metro
config.resolver.unstable_enablePackageExports = true;
config.transformer.getTransformOptions = async () => ({
  transform: {
    experimentalImportSupport: true,
    inlineRequires: true,
    unstable_disableES6Transforms: false,
  },
});

// Habilitar cache agressivo para desenvolvimento
config.cacheVersion = 'v2-performance-optimized';

module.exports = withNativeWind(config, {
  input: "./global.css",
  // Force write CSS to file system instead of virtual modules
  // This fixes iOS styling issues in development mode
  forceWriteFileSystem: true,
});
