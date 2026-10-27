import { runCountEmulatorSuite } from './run-count-emulator-tests.mjs';
// Preserve the existing public command while sharing the purpose-specific,
// isolated no-secrets harness and serialized root-bootstrap lifecycle.
process.exitCode = await runCountEmulatorSuite('admin');
