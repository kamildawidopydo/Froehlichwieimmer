import React from 'react';
import { cn } from '@/lib/utils';

/**
 * Aluminium tablet frame with a slight 3D pop-out perspective.
 * Wraps showcase content (e.g. DashboardShowcase) inside the screen area.
 */
const TabletMockup = ({ children, className }) => (
  <div
    className={cn('relative mx-auto flex w-full max-w-[620px] flex-col overflow-visible', className)}
    style={{ perspective: '1400px', perspectiveOrigin: '50% 42%' }}
  >
    {/* Luminous halo — the lit screen glowing into the dark room */}
    <span
      aria-hidden
      className="pointer-events-none absolute left-1/2 top-[52%] h-[82%] w-[88%] -translate-x-1/2 -translate-y-1/2 rounded-[44px] bg-sky-400/14 blur-[36px] sm:w-[92%] sm:blur-[48px]"
    />

    <div
      className="relative overflow-visible lg:[transform:translateZ(24px)_rotateX(2deg)_rotateY(2deg)] lg:[transform-style:preserve-3d]"
    >
      {/* Power button on the right aluminium edge */}
      <span
        aria-hidden
        className="absolute -right-[2px] top-[20%] h-9 w-[3px] rounded-r-[2px] bg-gradient-to-r from-[#9aa3b2] to-[#c8d0db] shadow-[1px_0_2px_rgba(0,0,0,0.15)]"
      />

      {/* ───── ALUMINIUM BODY ───── */}
      <div className="relative rounded-[26px] bg-gradient-to-br from-[#f4f6fa] via-[#dbe1ea] to-[#b6bfce] p-[3px] shadow-[0_28px_64px_-18px_rgba(90,150,255,0.42),0_10px_28px_-12px_rgba(150,190,255,0.32),0_36px_72px_-28px_rgba(0,0,0,0.5)]">
        {/* Top edge highlight */}
        <span
          aria-hidden
          className="absolute inset-x-10 top-0 h-px rounded-full bg-white/85"
        />
        {/* Side edge rim lights */}
        <span
          aria-hidden
          className="absolute inset-y-10 left-0 w-px rounded-full bg-white/55"
        />
        <span
          aria-hidden
          className="absolute inset-y-10 right-0 w-px rounded-full bg-white/25"
        />

        {/* Black bezel */}
        <div className="relative rounded-[23px] bg-gradient-to-b from-[#15191f] to-[#0a0d12] p-[10px] ring-1 ring-black/40">
          {/* Front camera — centered on top bezel */}
          <span className="absolute left-1/2 top-[4px] z-10 flex h-[5px] w-[5px] -translate-x-1/2 items-center justify-center rounded-full bg-[#2a3340] ring-1 ring-black/50">
            <span className="h-[2px] w-[2px] rounded-full bg-sky-300/40" />
          </span>

          {/* Active screen */}
          <div className="relative aspect-[16/12] overflow-hidden rounded-[11px] bg-bank-bg shadow-[inset_0_0_0_1px_rgba(0,0,0,0.55)]">
            <div className="absolute inset-0">{children}</div>
            {/* Screen glare — diagonal glass sheen */}
            <span
              aria-hidden
              className="pointer-events-none absolute inset-0 z-10"
              style={{
                background:
                  'linear-gradient(118deg, rgba(255,255,255,0.22) 0%, rgba(255,255,255,0.08) 9%, rgba(255,255,255,0.02) 18%, transparent 30%)',
              }}
            />
          </div>
        </div>
      </div>
    </div>
  </div>
);

export default TabletMockup;
