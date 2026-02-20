# rn-file-routing

A lightweight file-based router for React Native CLI projects, built on top of React Navigation.

## Install

```bash
npm install rn-file-routing
```

## Generate routes

By default, route files live under `src/routes` and the generator writes `route-tree.gen.ts` next to that folder (for example, `src/route-tree.gen.ts`).

```bash
npx rn-file-routing --routes-dir=src/routes
```

Custom output path:

```bash
npx rn-file-routing --routes-dir=src/routes --output=src/route-tree.gen.ts
```

## Usage

```ts
import { createFileRouter } from 'rn-file-routing';
import { routeTree } from './route-tree.gen';

export const AppRouter = createFileRouter({
  routeTree,
});
```

```tsx
import { AppRouter } from './AppRouter';

export default function App() {
  return <AppRouter />;
}
```

## Metro plugin (auto-generate routes)

```js
const path = require('path');
const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');
const { withFileRouterConfig } = require('rn-file-routing/metro');

const projectRoot = __dirname;

const config = {};

const mergedConfig = mergeConfig(getDefaultConfig(projectRoot), config);

module.exports = withFileRouterConfig(mergedConfig, {
  routesDir: path.join(projectRoot, 'src', 'routes'),
  output: path.join(projectRoot, 'src', 'route-tree.gen.ts'),
});
```

## File-based routing conventions

The naming rules match the TanStack Router file-based routing's default conventions:

- `__root.tsx` defines the root layout.
- `index.tsx` defines the index route for a segment.
- `.route` files define layout routes (e.g. `posts.route.tsx` or `posts/route.tsx`).
- Route segments are separated with dots (`posts.$postId.edit.tsx`).
- Dots in folder names also split segments (`_auth.home/index.tsx`).
- Dynamic segments start with `$` (`$postId`).
- `$` by itself is a splat segment.
- Pathless layouts start with `_` (`_auth.tsx`).
- Groups are wrapped in parentheses (`(auth)`).
- Trailing `_` resets nesting (`posts_.edit.tsx`).
- Prefix `-` to ignore files or folders.

Layouts should render their children.

## Generator flags

- `--routes-dir=src/routes`
- `--output=src/route-tree.gen.ts`
- `--index-token=index`
- `--route-token=route`

## Requirements

- React Navigation (`@react-navigation/native` + `@react-navigation/native-stack`)
- React Native
