import React from 'react';
import HomeHeroNewsPreview from '@/components/home/HomeHeroNewsPreview';

const BankingHero = () => (
  <section
    data-testid="banking-hero"
    className="relative isolate overflow-x-clip border-b border-bank-border bg-bank-bg"
  >
    <div className="mx-auto w-full min-w-0 max-w-[1440px] px-5 py-8 sm:px-8 sm:py-10 lg:px-12 lg:py-12 xl:px-16">
      <HomeHeroNewsPreview />
    </div>
  </section>
);

export default BankingHero;
