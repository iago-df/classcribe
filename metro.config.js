const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// the anthropic sdk's ESM build has a circular import that metro evaluates out of order
// ("Cannot access ... before initialization"). its CommonJS build is fine, so resolve that one.
const resolve = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  const ctx = moduleName === '@anthropic-ai/sdk' || moduleName.startsWith('@anthropic-ai/sdk/')
    ? { ...context, unstable_conditionNames: ['require', 'react-native'] }
    : context;
  return resolve ? resolve(ctx, moduleName, platform) : ctx.resolveRequest(ctx, moduleName, platform);
};

module.exports = config;
