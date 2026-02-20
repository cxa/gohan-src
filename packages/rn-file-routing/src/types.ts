import type { ComponentType } from 'react';

export type RouteNode = {
  id: string;
  name: string;
  pathSegment?: string | null;
  component?: ComponentType<any>;
  children: RouteNode[];
  isIndex?: boolean;
  isPathless?: boolean;
};

export type FileRouterOptions = {
  routeTree: RouteNode;
  initialRouteName?: string;
  screenOptions?: Record<string, unknown>;
  stackOptions?: Record<string, unknown>;
  navigationContainerProps?: Record<string, unknown>;
};
