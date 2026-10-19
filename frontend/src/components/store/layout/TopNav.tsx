'use client';
import Link from 'next/link';
import { Search, Gift, Sparkles, User, ShoppingCart, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useCart } from '@/store';
import { SearchBar } from '@/components/store/layout/SearchBar';
import { MobileCategoryMenu } from '@/components/store/layout/MobileCategoryMenu';
import { useUI } from '@/store';

import { useState, useEffect } from 'react';
import Logo from '@/components/store/logo/Logo';

const TopNav = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { toggleCartDrawer } = useUI();

  const { totalItems } = useCart();

  useEffect(() => {
    setIsLoggedIn(!!localStorage.getItem('mobile_token'));
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 w-full border-b border-white/10 bg-slate-900/95 backdrop-blur transition-all duration-300 ${
        scrolled ? 'shadow-lg shadow-black/20' : ''
      }`}
    >
      <div className="w-full max-w-7xl mx-auto flex h-16 items-center gap-2 lg:h-20 px-2">
        {/* Mobile category menu (hamburger) */}
        <div className="lg:hidden">
          <MobileCategoryMenu />
        </div>

        {/* Logo: centered on mobile, left-aligned on desktop */}
        <div className="flex flex-1 justify-center lg:flex-none lg:justify-start">
          <Logo />
        </div>

        {/* Search + Cart buttons (mobile) */}
        <div className="xl:hidden flex items-center justify-center gap-x-2">
          <Button
            type="button"
            className="h-10 w-10 rounded-full p-0 hover:scale-105 transition-transform"
            onClick={() => setMobileSearchOpen(true)}
            aria-label="Open search"
          >
            <Search className="h-4 w-4" />
          </Button>

          <Button
            type="button"
            className="relative h-10 w-10 rounded-full p-0 hover:scale-105 transition-transform"
            onClick={toggleCartDrawer}
          >
            <ShoppingCart className="h-4 w-4" />

            <Badge
              variant="secondary"
              className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 px-0 text-xs text-white dark:bg-red-600"
            >
              {totalItems}
            </Badge>
          </Button>
        </div>

        {/* Search Bar - Desktop only */}
        <div className="hidden flex-1 max-w-xl xl:block">
          <div className="relative group">
            <SearchBar variant="desktop" commandKeyShortcut />
          </div>
        </div>

        {/* Right Actions (desktop) */}
        <div className="hidden xl:flex items-center gap-1 sm:gap-2">
          <Link
            href="/offers"
            className="group relative hidden items-center gap-2.5 rounded-xl px-3.5 py-2 text-sm font-medium text-slate-300 transition-all duration-300 hover:bg-white/10 hover:text-white sm:flex"
          >
            <div className="relative">
              <Gift className="h-4.5 w-4.5" />
              <span className="absolute -right-1 -top-1 flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-green-500"></span>
              </span>
            </div>
            <span className="hidden lg:inline">Offers</span>
            <Badge
              variant="secondary"
              className="hidden border-green-500/30 bg-green-500/10 px-1.5 py-0 text-[10px] font-medium text-green-400 lg:inline-flex"
            >
              New
            </Badge>
          </Link>

          <Link
            href="/holiday"
            className="group hidden items-center gap-2 rounded-xl bg-linear-to-r from-amber-500/10 to-orange-500/10 px-3.5 py-2 text-sm font-medium text-amber-400 transition-all duration-300 hover:from-amber-500/20 hover:to-orange-500/20 hover:text-amber-300 sm:flex"
          >
            <Sparkles className="h-4 w-4 text-amber-400 transition-transform duration-300 group-hover:rotate-12" />
            <span className="hidden lg:inline">Holiday</span>
            <span className="hidden text-[10px] font-light text-amber-400/70 lg:inline">
              Special
            </span>
          </Link>

          <div className="hidden items-center gap-2 sm:flex">
            <User className="h-5 w-5 text-slate-400" />

            {isLoggedIn ? (
              <div className="flex flex-col">
                <h1 className="text-sm font-medium text-slate-300">Account</h1>
                <div className="flex gap-2 text-xs">
                  <Link
                    href="/accounts"
                    className="text-slate-400 hover:text-amber-400"
                  >
                    Profile
                  </Link>
                  <span className="text-slate-400">|</span>
                  <button
                    type="button"
                    onClick={() => {
                      localStorage.removeItem('mobile_token');
                      document.cookie = 'token=; path=/; max-age=0';
                      window.location.reload();
                    }}
                    className="text-slate-400 hover:text-red-400"
                  >
                    Logout
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col">
                <h1 className="text-sm font-medium text-slate-300">Accounts</h1>
                <div className="flex gap-2 text-xs">
                  <Link
                    href="/login"
                    className="text-slate-400 hover:text-amber-400"
                  >
                    Login
                  </Link>
                  <span className="text-slate-400">|</span>
                  <Link
                    href="/register"
                    className="text-slate-400 hover:text-amber-400"
                  >
                    Register
                  </Link>
                </div>
              </div>
            )}
            <Button
              size={'lg'}
              nativeButton={false}
              className="mr-4 bg-linear-to-r from-amber-400 to-amber-600 hover:from-amber-500 hover:to-amber-700 transition-colors duration-300"
              render={<Link href="/pc-builders">Pc Builders</Link>}
            />
          </div>
        </div>
      </div>

      {/* Mobile Search Panel */}
      {mobileSearchOpen && (
        <div className="xl:hidden border-t border-white/10 bg-slate-900 px-3 py-2">
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <SearchBar
                variant="mobile"
                autoFocus
                onClose={() => setMobileSearchOpen(false)}
              />
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-10 w-10 shrink-0 rounded-full text-slate-400 hover:bg-white/10 hover:text-white"
              onClick={() => setMobileSearchOpen(false)}
              aria-label="Close search"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>
      )}
    </header>
  );
};

export default TopNav;
