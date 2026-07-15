import type { Config } from "tailwindcss";
import tailwindcssAnimate from "tailwindcss-animate";
import typography from "@tailwindcss/typography";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
  	extend: {
  		fontSize: {
  			// Named micro tier so we avoid arbitrary text-[Npx] utilities. 11px/14px.
  			xxs: ['0.6875rem', { lineHeight: '0.875rem' }],
  		},
  		fontFamily: {
  			heading: [
  				'Plus Jakarta Sans',
  				'Inter',
  				'ui-sans-serif',
  				'system-ui',
  				'sans-serif'
  			],
  			sans: [
  				'Inter',
  				'ui-sans-serif',
  				'system-ui',
  				'sans-serif'
  			]
  		},
  		colors: {
  			background: 'hsl(var(--background))',
  			foreground: 'hsl(var(--foreground))',
  			'eli-purple': '#9B6FF4',
  			'eli-pink': '#D975EB',
  			'eli-warm-bg': 'hsl(var(--eli-warm-bg))',
  			'eli-warm-bg-foreground': 'hsl(var(--eli-warm-bg-foreground))',
  			muted: {
  				DEFAULT: 'hsl(var(--muted))',
  				foreground: 'hsl(var(--muted-foreground))'
  			},
  			border: 'hsl(var(--border))',
  			ring: 'hsl(var(--ring))',
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
  			accent: {
  				DEFAULT: 'hsl(var(--accent))',
  				foreground: 'hsl(var(--accent-foreground))'
  			},
  			destructive: {
  				DEFAULT: 'hsl(var(--destructive))',
  				foreground: 'hsl(var(--destructive-foreground))'
  			},
  			/* Semantic status tokens (from prototype-sandbox): one hue per
  			   meaning — error/warning/success/info as soft bg + fg + border. */
  			'status-error': {
  				DEFAULT: 'hsl(var(--status-error))',
  				foreground: 'hsl(var(--status-error-foreground))',
  				border: 'hsl(var(--status-error-border))'
  			},
  			'status-warning': {
  				DEFAULT: 'hsl(var(--status-warning))',
  				foreground: 'hsl(var(--status-warning-foreground))',
  				border: 'hsl(var(--status-warning-border))'
  			},
  			'status-success': {
  				DEFAULT: 'hsl(var(--status-success))',
  				foreground: 'hsl(var(--status-success-foreground))',
  				border: 'hsl(var(--status-success-border))'
  			},
  			'status-info': {
  				DEFAULT: 'hsl(var(--status-info))',
  				foreground: 'hsl(var(--status-info-foreground))',
  				border: 'hsl(var(--status-info-border))'
  			},
  			progress: 'hsl(var(--progress-indicator))',
  			input: 'hsl(var(--input))',
  			chart: {
  				'1': 'hsl(var(--chart-1))',
  				'2': 'hsl(var(--chart-2))',
  				'3': 'hsl(var(--chart-3))',
  				'4': 'hsl(var(--chart-4))',
  				'5': 'hsl(var(--chart-5))'
  			}
  		},
  		borderRadius: {
  			global: 'var(--radius)',
  			lg: 'var(--radius)',
  			md: 'calc(var(--radius) - 2px)',
  			sm: 'calc(var(--radius) - 4px)'
  		}
  	}
  },
  plugins: [tailwindcssAnimate, typography],
};

export default config;
