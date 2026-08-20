/** @type {import('tailwindcss').Config} */
module.exports = {
    darkMode: ["class"],
    content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./public/index.html"
  ],
  theme: {
  	container: {
  		center: true,
  		padding: {
  			DEFAULT: '1.25rem',
  			sm: '2rem',
  			lg: '3rem',
  			xl: '3.5rem',
  		},
  		screens: {
  			'2xl': '1440px',
  		},
  	},
  	extend: {
  		zIndex: {
  			modal: '200',
  			toast: '210',
  		},
  		fontFamily: {
  			sans: ['"IBM Plex Sans"', 'system-ui', 'sans-serif'],
  			display: ['Newsreader', 'Georgia', 'serif'],
  			mono: ['"IBM Plex Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
  		},
  		fontSize: {
  			'display-sm': ['clamp(2rem, 4vw + 0.5rem, 2.875rem)', { lineHeight: '1.12', letterSpacing: '-0.015em' }],
  			'display-md': ['clamp(2.5rem, 5vw + 0.5rem, 3.75rem)', { lineHeight: '1.1', letterSpacing: '-0.018em' }],
  			'display-lg': ['clamp(3rem, 6.5vw + 0.5rem, 5rem)', { lineHeight: '1.06', letterSpacing: '-0.02em' }],
  			'display-xl': ['clamp(3.5rem, 8vw + 0.5rem, 6.5rem)', { lineHeight: '1.04', letterSpacing: '-0.022em' }],
  		},
  		borderRadius: {
  			lg: 'var(--radius)',
  			md: 'calc(var(--radius) - 2px)',
  			sm: 'calc(var(--radius) - 4px)'
  		},
  		colors: {
  			bank: {
  				primary: 'rgb(var(--bank-primary) / <alpha-value>)',
  				'primary-hover': 'rgb(var(--bank-primary-hover) / <alpha-value>)',
  				secondary: 'rgb(var(--bank-secondary) / <alpha-value>)',
  				accent: 'rgb(var(--bank-accent) / <alpha-value>)',
  				'accent-strong': 'rgb(var(--bank-accent-strong) / <alpha-value>)',
  				gold: 'rgb(var(--bank-gold) / <alpha-value>)',
  				'gold-soft': 'rgb(var(--bank-gold-soft) / <alpha-value>)',
  				bg: 'rgb(var(--bank-bg) / <alpha-value>)',
  				surface: 'rgb(var(--bank-surface) / <alpha-value>)',
  				'surface-elev': 'rgb(var(--bank-surface-elev) / <alpha-value>)',
  				border: 'rgb(var(--bank-border) / <alpha-value>)',
  				text: 'rgb(var(--bank-text) / <alpha-value>)',
  				'text-muted': 'rgb(var(--bank-text-muted) / <alpha-value>)',
  				success: 'rgb(var(--bank-success) / <alpha-value>)',
  				signature: 'rgb(var(--bank-signature) / <alpha-value>)',
  				'signature-hover': 'rgb(var(--bank-signature-hover) / <alpha-value>)',
  				error: 'rgb(var(--bank-error) / <alpha-value>)',
  				ink: 'rgb(var(--bank-ink) / <alpha-value>)',
  				'ink-hover': 'rgb(var(--bank-ink-hover) / <alpha-value>)',
  				'ink-soft': 'rgb(var(--bank-ink-soft) / <alpha-value>)',
  				'ink-elev': 'rgb(var(--bank-ink-elev) / <alpha-value>)',
  				'on-ink': 'rgb(var(--bank-on-ink) / <alpha-value>)',
  			},
  			background: 'hsl(var(--background))',
  			foreground: 'hsl(var(--foreground))',
  			card: {
  				DEFAULT: 'hsl(var(--card))',
  				foreground: 'hsl(var(--card-foreground))'
  			},
  			popover: {
  				DEFAULT: 'hsl(var(--popover))',
  				foreground: 'hsl(var(--popover-foreground))'
  			},
  			primary: {
  				DEFAULT: 'hsl(var(--primary))',
  				foreground: 'hsl(var(--primary-foreground))'
  			},
  			secondary: {
  				DEFAULT: 'hsl(var(--secondary))',
  				foreground: 'hsl(var(--secondary-foreground))'
  			},
  			muted: {
  				DEFAULT: 'hsl(var(--muted))',
  				foreground: 'hsl(var(--muted-foreground))'
  			},
  			accent: {
  				DEFAULT: 'hsl(var(--accent))',
  				foreground: 'hsl(var(--accent-foreground))'
  			},
  			destructive: {
  				DEFAULT: 'hsl(var(--destructive))',
  				foreground: 'hsl(var(--destructive-foreground))'
  			},
  			border: 'hsl(var(--border))',
  			input: 'hsl(var(--input))',
  			ring: 'hsl(var(--ring))',
  			chart: {
  				'1': 'hsl(var(--chart-1))',
  				'2': 'hsl(var(--chart-2))',
  				'3': 'hsl(var(--chart-3))',
  				'4': 'hsl(var(--chart-4))',
  				'5': 'hsl(var(--chart-5))'
  			}
  		},
  		boxShadow: {
  			'bank-card':       '0 1px 2px rgba(15, 23, 42, 0.04), 0 4px 16px rgba(15, 23, 42, 0.06)',
  			'bank-card-hover': '0 4px 12px rgba(15, 23, 42, 0.08)',
  			'editorial-sm':    '0 1px 2px rgba(15, 23, 42, 0.05), 0 4px 12px rgba(15, 23, 42, 0.06)',
  			'editorial-md':    '0 4px 16px rgba(15, 23, 42, 0.08), 0 12px 32px rgba(15, 23, 42, 0.06)',
  			'editorial-lg':    '0 8px 24px rgba(15, 23, 42, 0.10), 0 20px 48px rgba(15, 23, 42, 0.08)',
  			'accent-glow':     '0 0 0 1px rgba(76, 124, 186, 0.24), 0 4px 16px rgba(76, 124, 186, 0.12)',
  			'brass-glow':      '0 0 0 1px rgba(76, 124, 186, 0.28), 0 4px 16px rgba(76, 124, 186, 0.10)',
  			'inset-hairline':  'inset 0 1px 0 rgba(255, 255, 255, 0.06), inset 0 -1px 0 rgba(76, 124, 186, 0.04)',
  		},
  		backgroundImage: {
  			'mesh-navy': 'radial-gradient(120% 80% at 18% 12%, rgb(var(--bank-accent) / 0.28), transparent 55%), radial-gradient(90% 70% at 82% 88%, rgb(var(--bank-accent-strong) / 0.14), transparent 60%), radial-gradient(140% 100% at 50% 50%, rgb(var(--bank-ink)) 0%, rgb(var(--bank-ink)) 60%, rgb(var(--bank-ink-hover)) 100%)',
  			'mesh-soft': 'radial-gradient(80% 60% at 18% 18%, rgb(var(--bank-accent) / 0.12), transparent 60%), radial-gradient(60% 50% at 82% 78%, rgb(var(--bank-accent-strong) / 0.08), transparent 65%)',
  			'accent-rule': 'linear-gradient(to right, rgb(var(--bank-accent-strong) / 0.55), transparent)',
  			'gold-rule': 'linear-gradient(to right, rgb(var(--bank-gold) / 0.55), transparent)',
  		},
  		keyframes: {
  			'accordion-down': {
  				from: { height: '0' },
  				to:   { height: 'var(--radix-accordion-content-height)' }
  			},
  			'accordion-up': {
  				from: { height: 'var(--radix-accordion-content-height)' },
  				to:   { height: '0' }
  			},
  			'reveal-up': {
  				from: { opacity: '0', transform: 'translateY(16px)' },
  				to:   { opacity: '1', transform: 'translateY(0)' }
  			},
  			'fade-in': {
  				from: { opacity: '0' },
  				to:   { opacity: '1' }
  			},
  		},
  		animation: {
  			'accordion-down': 'accordion-down 0.2s ease-out',
  			'accordion-up':   'accordion-up 0.2s ease-out',
  			'reveal-up':      'reveal-up 0.6s cubic-bezier(0.22, 1, 0.36, 1) both',
  			'fade-in':        'fade-in 0.5s ease-out both',
  		},
  		transitionTimingFunction: {
  			'editorial': 'cubic-bezier(0.22, 1, 0.36, 1)',
  		},
  		transitionDuration: {
  			1200: '1200ms',
  		},
  	}
  },
  plugins: [require("tailwindcss-animate")],
};
