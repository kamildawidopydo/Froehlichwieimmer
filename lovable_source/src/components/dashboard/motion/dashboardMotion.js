import { useReducedMotion } from 'framer-motion';

/** Editorial ease — matches marketing pages. */
export const DASHBOARD_EASE = [0.22, 1, 0.36, 1];

export const dashboardTransition = (duration = 0.28, delay = 0) => ({
  duration,
  delay,
  ease: DASHBOARD_EASE,
});

export const pageMotion = (reduced) =>
  reduced
    ? {
        initial: { opacity: 1 },
        animate: { opacity: 1 },
        exit: { opacity: 1 },
        transition: { duration: 0 },
      }
    : {
        initial: { opacity: 0, y: 10 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: -6 },
        transition: dashboardTransition(0.26),
      };

export const staggerContainer = (reduced, stagger = 0.055, delayChildren = 0.04) =>
  reduced
    ? { hidden: {}, visible: {} }
    : {
        hidden: {},
        visible: {
          transition: { staggerChildren: stagger, delayChildren },
        },
      };

export const staggerItem = (reduced) =>
  reduced
    ? { hidden: {}, visible: {} }
    : {
        hidden: { opacity: 0, y: 12 },
        visible: {
          opacity: 1,
          y: 0,
          transition: dashboardTransition(0.28),
        },
      };

export const panelMotion = (reduced) =>
  reduced
    ? {}
    : {
        initial: { opacity: 0, y: 10 },
        animate: { opacity: 1, y: 0 },
        transition: dashboardTransition(0.3),
      };

export const useDashboardMotion = () => {
  const reduced = useReducedMotion();
  return {
    reduced: !!reduced,
    page: pageMotion(reduced),
    container: staggerContainer(reduced),
    item: staggerItem(reduced),
    panel: panelMotion(reduced),
    stagger: reduced ? 0 : 0.055,
  };
};
