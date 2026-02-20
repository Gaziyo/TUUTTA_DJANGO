// ELS (Enterprise Learning System) Components

// Legacy mock-based component (for reference/fallback)
export { default as ELSStudioLegacy } from './ELSStudio';

// New Firebase-integrated component
export { default as ELSStudioIntegrated } from './ELSStudioIntegrated';

// Animation components
export { FadeIn, StaggerContainer, ScrollReveal, AnimatedCounter } from './ELSAnimations';

// Default export is the integrated version
export { default } from './ELSStudioIntegrated';
