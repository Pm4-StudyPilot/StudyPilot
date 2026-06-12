import '@testing-library/jest-dom/vitest';
import { configure } from '@testing-library/react';
import '../i18n';

// The default Testing Library async timeout (1000ms) is too tight for CI,
// where the full suite runs in parallel under v8 coverage. Components whose
// data renders slightly later than 1s caused intermittent `waitFor`/`findBy`
// timeouts (see KAN-241). Give async queries more headroom.
configure({ asyncUtilTimeout: 5000 });
