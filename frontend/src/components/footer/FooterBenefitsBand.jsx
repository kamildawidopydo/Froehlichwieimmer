import { cn } from '@/lib/utils';
import siteCopy from '@/data/siteCopy';

export default function FooterBenefitsBand({ className }) {
  const { benefits, footer } = siteCopy;

  return (
    <section
      className={cn('border-b border-bank-border bg-bank-panel text-bank-text', className)}
      aria-label={footer.benefitsAriaLabel}
    >
      <div className="mx-auto max-w-[1440px] px-5 py-12 sm:px-8 sm:py-14 lg:px-12">
        <ul className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4 lg:gap-8">
          {benefits.map(({ icon, title, body }) => (
            <li key={title} className="flex flex-col items-center text-center">
              <img
                src={icon}
                alt=""
                width={120}
                height={120}
                loading="lazy"
                decoding="async"
                className="mb-5 h-[5.5rem] w-[5.5rem] object-contain sm:h-[6rem] sm:w-[6rem]"
              />
              <h3 className="text-[1.05rem] font-semibold leading-snug text-bank-ink sm:text-[1.125rem]">
                {title}
              </h3>
              <p className="mt-2.5 max-w-[16rem] text-[13px] leading-relaxed text-bank-text-muted sm:text-[13.5px]">
                {body}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
