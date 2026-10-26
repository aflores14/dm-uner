module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    // Solo agrega plugins si usas librerías específicas que lo exijan (ej: Reanimated)
  };
};