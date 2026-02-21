import React from 'react';
import { createFileRouter } from 'rn-file-routing';
import '@/i18n/i18n-setup';
import { routeTree } from '@/route-tree.gen';

import './global.css';

const Router = createFileRouter({
  routeTree,
  screenOptions: {
    headerShown: false,
  },
});

const App = () => {
  return (
    <>
      <Router />
    </>
  );
};

export default App;
