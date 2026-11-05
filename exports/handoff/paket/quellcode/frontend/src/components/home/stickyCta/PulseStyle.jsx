/**
 * PulseStyle — CSS-Keyframes für den dezenten Attention-Pulse.
 * Wird via `.sticky-cta-pulse` conditional aktiviert. Respektiert
 * `prefers-reduced-motion` per media query zusätzlich zum Hook-Guard
 * in useAttentionPulse.
 */
const PulseStyle = () => (
  <style>{`
    @keyframes sticky-cta-pulse-kf {
      0%   { box-shadow: 0 20px 50px -18px rgba(9,33,66,0.30), 0 0 0 0 rgba(127,175,170,0.30); transform: translateY(0) scale(1); }
      40%  { box-shadow: 0 26px 60px -18px rgba(9,33,66,0.34), 0 0 0 10px rgba(127,175,170,0.14); transform: translateY(-2px) scale(1.015); }
      100% { box-shadow: 0 20px 50px -18px rgba(9,33,66,0.30), 0 0 0 0 rgba(127,175,170,0.0); transform: translateY(0) scale(1); }
    }
    .sticky-cta-pulse { animation: sticky-cta-pulse-kf 1500ms ease-in-out 1; }
    @media (prefers-reduced-motion: reduce) { .sticky-cta-pulse { animation: none !important; } }
  `}</style>
);

export default PulseStyle;
