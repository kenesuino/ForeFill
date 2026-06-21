import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

// React Testing Library mounts into a shared document; unmount + clear between
// tests so DOM-querying assertions never see a previous test's tree.
afterEach(() => {
  cleanup();
});
