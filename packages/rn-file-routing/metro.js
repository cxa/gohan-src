const fs = require('fs');
const path = require('path');
const { generateRouteTreeFile } = require('./bin/generate');

const withFileRouterConfig = (metroConfig, options = {}) => {
  const routesDir = options.routesDir || 'src/routes';
  const output = options.output;
  const indexToken = options.indexToken || 'index';
  const routeToken = options.routeToken || 'route';

  const resolvedRoutesDir = path.resolve(process.cwd(), routesDir);

  const generate = () => {
    if (!fs.existsSync(resolvedRoutesDir)) {
      return;
    }
    try {
      generateRouteTreeFile({
        routesDir: resolvedRoutesDir,
        output,
        indexToken,
        routeToken,
      });
    } catch (error) {
      console.warn(
        `[rn-file-routing] route generation failed: ${error.message}`,
      );
    }
  };

  generate();

  const previousEnhance = metroConfig?.server?.enhanceMiddleware;

  return {
    ...metroConfig,
    watchFolders: Array.from(
      new Set([...(metroConfig.watchFolders || []), resolvedRoutesDir]),
    ),
    server: {
      ...metroConfig.server,
      enhanceMiddleware: (middleware, server) => {
        const next = previousEnhance
          ? previousEnhance(middleware, server)
          : middleware;
        return (req, res, nextFn) => {
          if (req?.url && req.url.includes('.bundle')) {
            generate();
          }
          return next(req, res, nextFn);
        };
      },
    },
  };
};

module.exports = { withFileRouterConfig };
