#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const DEFAULT_EXTENSIONS = ['.tsx', '.ts', '.jsx', '.js'];

const parseArgs = argv => {
  const options = {
    routesDir: 'src/routes',
    output: null,
    indexToken: 'index',
    routeToken: 'route',
  };

  argv.forEach(arg => {
    if (arg.startsWith('--routes-dir=')) {
      options.routesDir = arg.split('=')[1];
      return;
    }
    if (arg.startsWith('--routesDir=')) {
      options.routesDir = arg.split('=')[1];
      return;
    }
    if (arg.startsWith('--output=')) {
      options.output = arg.split('=')[1];
      return;
    }
    if (arg.startsWith('--index-token=')) {
      options.indexToken = arg.split('=')[1];
      return;
    }
    if (arg.startsWith('--route-token=')) {
      options.routeToken = arg.split('=')[1];
    }
  });

  return options;
};

const toPosixPath = value => value.split(path.sep).join('/');

const splitRouteSegments = value => {
  const segments = [];
  let current = '';
  let bracketDepth = 0;

  for (const char of value) {
    if (char === '[') {
      bracketDepth += 1;
      current += char;
      continue;
    }
    if (char === ']') {
      bracketDepth = Math.max(0, bracketDepth - 1);
      current += char;
      continue;
    }
    if (char === '.' && bracketDepth === 0) {
      segments.push(current);
      current = '';
      continue;
    }
    current += char;
  }

  if (current) {
    segments.push(current);
  }

  return segments;
};

const unescapeSegment = value => value.replace(/\[([^\]]+)\]/g, '$1');

const sanitizeName = value => {
  const sanitized = value.replace(/[^a-zA-Z0-9._-]/g, '_');
  return sanitized.replace(/^_+/, 'route_');
};

const resolveImportPath = (outputPath, routesDir, routePath) => {
  const absoluteRoutePath = path.join(routesDir, routePath);
  let relative = path.relative(path.dirname(outputPath), absoluteRoutePath);
  if (!relative.startsWith('.')) {
    relative = `./${relative}`;
  }
  return toPosixPath(relative);
};

const collectRouteFiles = (routesDir, extensions) => {
  const files = [];

  const walk = dir => {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name.startsWith('.')) {
        continue;
      }
      if (entry.name.startsWith('-')) {
        continue;
      }
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
        continue;
      }
      const ext = path.extname(entry.name);
      if (!extensions.includes(ext)) {
        continue;
      }
      if (
        entry.name.includes('routeTree.gen') ||
        entry.name.includes('route-tree.gen')
      ) {
        continue;
      }
      files.push(fullPath);
    }
  };

  walk(routesDir);
  return files;
};

const parseRouteFile = (routesDir, filePath, options) => {
  const relativePath = toPosixPath(path.relative(routesDir, filePath));
  const ext = path.extname(relativePath);
  const withoutExt = relativePath.slice(0, -ext.length);
  const parts = withoutExt.split('/');
  const fileName = parts.pop();

  if (!fileName) {
    return null;
  }

  if (fileName.startsWith('-')) {
    return null;
  }

  const dirSegmentsRaw = parts.filter(Boolean);
  if (dirSegmentsRaw.some(segment => segment.startsWith('-'))) {
    return null;
  }

  const dirSegments = dirSegmentsRaw.flatMap(segment =>
    splitRouteSegments(segment),
  );
  if (dirSegments.some(segment => segment.startsWith('-'))) {
    return null;
  }

  const fileSegments = splitRouteSegments(fileName);
  let segments = [...dirSegments, ...fileSegments].map(unescapeSegment);

  if (segments.length === 0) {
    return null;
  }

  const isRoot =
    segments.length === 1 &&
    segments[0] === '__root' &&
    dirSegments.length === 0;
  if (isRoot) {
    return {
      type: 'root',
      filePath: relativePath,
      importPath: withoutExt,
    };
  }

  const lastSegment = segments[segments.length - 1];
  let isIndex = false;
  if (lastSegment === options.indexToken) {
    isIndex = true;
    segments = segments.slice(0, -1);
  } else if (lastSegment === options.routeToken) {
    segments = segments.slice(0, -1);
  }

  if (segments.length === 0 && !isIndex) {
    return null;
  }

  return {
    type: 'route',
    segments,
    isIndex,
    filePath: relativePath,
    importPath: withoutExt,
  };
};

const buildSegmentMeta = segment => {
  const isGroup = segment.startsWith('(') && segment.endsWith(')');
  let name = isGroup ? segment.slice(1, -1) : segment;

  const isPathless = name.startsWith('_') && name !== '__root';
  if (isPathless) {
    name = name.slice(1);
  }

  const isReset = name.endsWith('_') && name !== '_';
  if (isReset) {
    name = name.slice(0, -1);
  }

  const isDynamic = name.startsWith('$');
  let paramName = name;
  if (isDynamic) {
    paramName = name.slice(1);
  }
  const isSplat = name === '$';

  const idSegment = segment.replace(/\./g, '_');

  let pathSegment = null;
  if (!isGroup && !isPathless) {
    if (isDynamic) {
      pathSegment = isSplat ? '*' : `:${paramName}`;
    } else {
      pathSegment = name;
    }
  }

  return {
    raw: segment,
    idSegment,
    name,
    pathSegment,
    isGroup,
    isPathless,
    isReset,
  };
};

const insertRoute = (root, route, importName) => {
  let current = root;
  let idSegments = [];

  route.segments.forEach((segment, index) => {
    const meta = buildSegmentMeta(segment);
    if (meta.isReset) {
      current = root;
      idSegments = [];
    }

    idSegments.push(meta.idSegment);

    const childId = `${root.id}.${idSegments.join('.')}`;
    let child = current.children.find(node => node.id === childId);
    if (!child) {
      child = {
        id: childId,
        name: sanitizeName(childId),
        pathSegment: meta.pathSegment,
        children: [],
        isPathless: meta.isPathless || meta.isGroup,
      };
      current.children.push(child);
    }

    current = child;
  });

  if (route.isIndex) {
    const indexId = `${current.id}.index`;
    const existing = current.children.find(node => node.id === indexId);
    if (existing) {
      existing.component = importName;
      existing.isIndex = true;
      existing.pathSegment = '';
      return;
    }
    current.children.push({
      id: indexId,
      name: sanitizeName(indexId),
      pathSegment: '',
      children: [],
      isIndex: true,
      component: importName,
    });
    return;
  }

  current.component = importName;
};

const generateRouteTree = (routesDir, routeFiles, options, outputPath) => {
  const imports = [];
  const importMap = new Map();

  const rootNode = {
    id: '__root',
    name: '__root',
    pathSegment: '',
    children: [],
  };

  const routes = [];

  routeFiles.forEach(filePath => {
    const parsed = parseRouteFile(routesDir, filePath, options);
    if (!parsed) {
      return;
    }
    const importPath = resolveImportPath(
      outputPath,
      routesDir,
      parsed.importPath,
    );
    const importName = sanitizeName(
      `Route_${parsed.importPath.replace(/[^a-zA-Z0-9]/g, '_')}`,
    );

    importMap.set(parsed.filePath, { importName, importPath });

    routes.push({ parsed, importName });
  });

  for (const route of routes) {
    const { parsed, importName } = route;

    if (!importMap.has(parsed.filePath)) {
      continue;
    }

    const { importPath } = importMap.get(parsed.filePath);
    imports.push({ importName, importPath });

    if (parsed.type === 'root') {
      rootNode.component = importName;
      continue;
    }

    insertRoute(rootNode, parsed, importName);
  }

  return { rootNode, imports };
};

const printNode = (node, indent = 2) => {
  const pad = ' '.repeat(indent);
  const lines = ['{'];
  lines.push(`${pad}id: '${node.id}',`);
  lines.push(`${pad}name: '${node.name}',`);
  if (node.pathSegment !== undefined) {
    if (node.pathSegment === null) {
      lines.push(`${pad}pathSegment: null,`);
    } else {
      lines.push(`${pad}pathSegment: '${node.pathSegment}',`);
    }
  }
  if (node.component) {
    lines.push(`${pad}component: ${node.component},`);
  }
  if (node.isIndex) {
    lines.push(`${pad}isIndex: true,`);
  }
  if (node.isPathless) {
    lines.push(`${pad}isPathless: true,`);
  }

  if (node.children && node.children.length > 0) {
    lines.push(`${pad}children: [`);
    node.children.forEach((child, index) => {
      const childLines = printNode(child, indent + 2);
      lines.push(childLines.join('\n'));
      if (index < node.children.length - 1) {
        lines[lines.length - 1] += ',';
      }
    });
    lines.push(`${pad}],`);
  } else {
    lines.push(`${pad}children: [],`);
  }

  lines.push(`${' '.repeat(indent - 2)}}`);
  return lines;
};

let lastSignature = null;

const generateRouteTreeFile = ({
  routesDir,
  output,
  indexToken = 'index',
  routeToken = 'route',
}) => {
  const resolvedRoutesDir = path.resolve(process.cwd(), routesDir);
  const defaultOutput = path.join(
    path.dirname(resolvedRoutesDir),
    'route-tree.gen.ts',
  );
  const outputPath = path.resolve(process.cwd(), output || defaultOutput);

  if (!fs.existsSync(resolvedRoutesDir)) {
    console.error(
      `[rn-file-routing] routes directory not found: ${resolvedRoutesDir}`,
    );
    process.exit(1);
  }

  const routeFiles = collectRouteFiles(
    resolvedRoutesDir,
    DEFAULT_EXTENSIONS,
  ).sort();
  const routeStats = routeFiles.map(file => {
    const stat = fs.statSync(file);
    return { file, mtimeMs: stat.mtimeMs };
  });
  const latestMtime = routeStats.reduce(
    (max, entry) => Math.max(max, entry.mtimeMs),
    0,
  );
  const outputStat = fs.existsSync(outputPath) ? fs.statSync(outputPath) : null;
  const signature = `${latestMtime}:${routeFiles.length}`;
  if (
    outputStat &&
    outputStat.mtimeMs >= latestMtime &&
    signature === lastSignature
  ) {
    return { outputPath, skipped: true };
  }

  const { rootNode, imports } = generateRouteTree(
    resolvedRoutesDir,
    routeFiles,
    { indexToken, routeToken },
    outputPath,
  );

  if (!rootNode.component) {
    console.warn(
      '[rn-file-routing] root layout (__root.tsx) not found; rendering without a root layout.',
    );
  }

  const importLines = imports.map(
    entry => `import ${entry.importName} from '${entry.importPath}';`,
  );

  const outputLines = [
    '/* eslint-disable */',
    '// This file is generated by rn-file-routing. Do not edit manually.',
    "import type { RouteNode } from 'rn-file-routing';",
    ...importLines,
    '',
    'export const routeTree: RouteNode = ',
    ...printNode(rootNode, 2),
    ';',
    '',
  ];

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, outputLines.join('\n'));
  lastSignature = signature;

  console.log(`[rn-file-routing] generated ${outputPath}`);
  return { outputPath, skipped: false };
};

const run = () => {
  const options = parseArgs(process.argv.slice(2));
  generateRouteTreeFile(options);
};

if (require.main === module) {
  run();
}

module.exports = {
  generateRouteTreeFile,
};
