import Image from 'next/image';
import Link from 'next/link';
import { SITE_LOGO, SITE_NAME } from '@/lib/config/site';
import { VERTICALS } from '@/lib/routing/verticals';
import { ThemeToggle } from '@/components/shared/theme-toggle';
import { AuthNav } from '@/components/auth/auth';

export function Header() {
  return (
    <header className="site-header">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-2.5">
        <Link href="/" className="site-logo-link shrink-0">
          <Image
            src={SITE_LOGO}
            alt={SITE_NAME}
            width={160}
            height={48}
            className="site-logo-img"
            priority
          />
        </Link>

        <div className="flex items-center gap-3 sm:gap-5">
          <nav className="flex flex-wrap gap-1 sm:gap-3">
            {VERTICALS.map((v) => (
              <Link key={v.basePath} href={v.basePath} className="site-header-link">
                {v.label}
              </Link>
            ))}
          </nav>
          <ThemeToggle />
          <AuthNav />
        </div>
      </div>
    </header>
  );
}

export function Footer() {
  return (
    <footer className="mt-auto border-t border-border bg-surface py-8">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-3 px-4 text-center text-sm text-muted-foreground">
        <Image
          src={SITE_LOGO}
          alt={SITE_NAME}
          width={120}
          height={36}
          className="site-logo-img site-logo-img--footer"
        />
        <p>
          © {new Date().getFullYear()}{' '}
          <span className="font-semibold text-primary">{SITE_NAME}</span>
        </p>
      </div>
    </footer>
  );
}
