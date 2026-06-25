// speak-tts ships no type declarations; artyom.js ships a .d.ts that contains
// only interfaces (not a module), so neither import resolves cleanly. We use
// both behind defensively-typed `any` adapters, so loose ambient shims are fine.
declare module 'speak-tts';
declare module 'artyom.js/build/artyom.js';
