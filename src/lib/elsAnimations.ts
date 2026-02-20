import type { Variants } from 'framer-motion';

// Easing functions
export const easings = {
  default: [0.4, 0, 0.2, 1],
  bounce: [0.68, -0.55, 0.265, 1.55],
  smooth: [0.25, 0.1, 0.25, 1],
  easeOut: [0, 0, 0.2, 1],
  easeIn: [0.4, 0, 1, 1],
} as const;

// Duration presets
export const durations = {
  micro: 0.15,
  fast: 0.2,
  default: 0.3,
  medium: 0.4,
  slow: 0.5,
  complex: 0.8,
} as const;

// Stagger delays
export const staggerDelays = {
  fast: 0.03,
  default: 0.05,
  slow: 0.1,
} as const;

// Fade in animation
export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      duration: durations.default,
      ease: easings.default,
    },
  },
  exit: {
    opacity: 0,
    transition: {
      duration: durations.fast,
      ease: easings.easeOut,
    },
  },
};

// Fade in and slide up
export const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: durations.default,
      ease: easings.default,
    },
  },
  exit: {
    opacity: 0,
    y: -10,
    transition: {
      duration: durations.fast,
      ease: easings.easeOut,
    },
  },
};

// Fade in and slide down
export const fadeInDown: Variants = {
  hidden: { opacity: 0, y: -20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: durations.default,
      ease: easings.default,
    },
  },
  exit: {
    opacity: 0,
    y: 10,
    transition: {
      duration: durations.fast,
      ease: easings.easeOut,
    },
  },
};

// Fade in and slide from left
export const fadeInLeft: Variants = {
  hidden: { opacity: 0, x: -20 },
  visible: {
    opacity: 1,
    x: 0,
    transition: {
      duration: durations.default,
      ease: easings.default,
    },
  },
  exit: {
    opacity: 0,
    x: -10,
    transition: {
      duration: durations.fast,
      ease: easings.easeOut,
    },
  },
};

// Fade in and slide from right
export const fadeInRight: Variants = {
  hidden: { opacity: 0, x: 20 },
  visible: {
    opacity: 1,
    x: 0,
    transition: {
      duration: durations.default,
      ease: easings.default,
    },
  },
  exit: {
    opacity: 0,
    x: 10,
    transition: {
      duration: durations.fast,
      ease: easings.easeOut,
    },
  },
};

// Scale animation
export const scale: Variants = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: {
      duration: durations.default,
      ease: easings.default,
    },
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    transition: {
      duration: durations.fast,
      ease: easings.easeOut,
    },
  },
};

// Stagger container
export const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: staggerDelays.default,
      delayChildren: 0.1,
    },
  },
  exit: {
    opacity: 0,
    transition: {
      staggerChildren: staggerDelays.fast,
      staggerDirection: -1,
    },
  },
};

// Stagger item
export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: durations.default,
      ease: easings.default,
    },
  },
  exit: {
    opacity: 0,
    y: -10,
    transition: {
      duration: durations.fast,
      ease: easings.easeOut,
    },
  },
};

// Card hover animation
export const cardHover = {
  rest: {
    y: 0,
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
    transition: {
      duration: durations.fast,
      ease: easings.default,
    },
  },
  hover: {
    y: -4,
    boxShadow: '0 10px 25px rgba(0, 0, 0, 0.2)',
    transition: {
      duration: durations.fast,
      ease: easings.default,
    },
  },
};

// Button tap animation
export const buttonTap = {
  scale: 0.98,
  transition: {
    duration: durations.micro,
    ease: easings.default,
  },
};

// Page transition
export const pageTransition: Variants = {
  hidden: { opacity: 0, x: 20 },
  visible: {
    opacity: 1,
    x: 0,
    transition: {
      duration: durations.medium,
      ease: easings.default,
    },
  },
  exit: {
    opacity: 0,
    x: -20,
    transition: {
      duration: durations.fast,
      ease: easings.easeOut,
    },
  },
};

// Modal/Dialog animation
export const modalOverlay: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      duration: durations.fast,
      ease: easings.default,
    },
  },
  exit: {
    opacity: 0,
    transition: {
      duration: durations.micro,
      ease: easings.easeOut,
    },
  },
};

export const modalContent: Variants = {
  hidden: { opacity: 0, scale: 0.95, y: 10 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      duration: durations.default,
      ease: easings.default,
    },
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    y: 10,
    transition: {
      duration: durations.fast,
      ease: easings.easeOut,
    },
  },
};

// Sidebar animation
export const sidebar: Variants = {
  collapsed: {
    width: 80,
    transition: {
      duration: durations.default,
      ease: easings.default,
    },
  },
  expanded: {
    width: 280,
    transition: {
      duration: durations.default,
      ease: easings.default,
    },
  },
};

// Progress ring animation
export const progressRing: Variants = {
  hidden: { pathLength: 0, opacity: 0 },
  visible: {
    pathLength: 1,
    opacity: 1,
    transition: {
      pathLength: {
        duration: durations.slow,
        ease: easings.default,
      },
      opacity: {
        duration: durations.fast,
      },
    },
  },
};

// Pulse animation for active states
export const pulse: Variants = {
  initial: { scale: 1 },
  animate: {
    scale: [1, 1.05, 1],
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: 'easeInOut',
    },
  },
};

// Pipeline node animation
export const pipelineNode: Variants = {
  inactive: {
    scale: 1,
    boxShadow: '0 0 0 0 rgba(59, 130, 246, 0)',
  },
  active: {
    scale: 1.05,
    boxShadow: '0 0 20px 5px rgba(59, 130, 246, 0.3)',
    transition: {
      duration: durations.default,
      ease: easings.default,
    },
  },
  completed: {
    scale: 1,
    boxShadow: '0 0 0 0 rgba(16, 185, 129, 0)',
  },
};

// Chart animation
export const chartBar: Variants = {
  hidden: { scaleY: 0, originY: 1 },
  visible: {
    scaleY: 1,
    transition: {
      duration: durations.slow,
      ease: easings.default,
    },
  },
};

// Notification badge bounce
export const badgeBounce: Variants = {
  initial: { scale: 0 },
  animate: {
    scale: 1,
    transition: {
      type: 'spring',
      stiffness: 500,
      damping: 15,
    },
  },
  exit: {
    scale: 0,
    transition: {
      duration: durations.fast,
    },
  },
};

// Scroll reveal animation
export const scrollReveal: Variants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: durations.medium,
      ease: easings.default,
    },
  },
};

// Typing animation helper
export const typingCharacter: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      duration: 0.01,
    },
  },
};

// Tree expand/collapse
export const treeExpand: Variants = {
  collapsed: {
    height: 0,
    opacity: 0,
    transition: {
      height: {
        duration: durations.default,
        ease: easings.default,
      },
      opacity: {
        duration: durations.fast,
      },
    },
  },
  expanded: {
    height: 'auto',
    opacity: 1,
    transition: {
      height: {
        duration: durations.default,
        ease: easings.default,
      },
      opacity: {
        duration: durations.fast,
        delay: 0.1,
      },
    },
  },
};

// Tab indicator slide
export const tabIndicator = {
  initial: { opacity: 0 },
  animate: {
    opacity: 1,
    transition: {
      type: 'spring',
      stiffness: 500,
      damping: 30,
    },
  },
};

// Upload progress
export const uploadProgress: Variants = {
  initial: { width: 0 },
  animate: (progress: number) => ({
    width: `${progress}%`,
    transition: {
      duration: durations.fast,
      ease: easings.default,
    },
  }),
};

// AI sparkle effect
export const sparkle: Variants = {
  initial: { 
    opacity: 0, 
    scale: 0,
    rotate: 0,
  },
  animate: {
    opacity: [0, 1, 0],
    scale: [0, 1, 0],
    rotate: [0, 180, 360],
    transition: {
      duration: 1.5,
      repeat: Infinity,
      repeatDelay: 0.5,
      ease: easings.default,
    },
  },
};
