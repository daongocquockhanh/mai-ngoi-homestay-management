import { NavLink, Outlet } from 'react-router'
import { LayoutDashboard, BedDouble, CalendarDays, BarChart3 } from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Tổng quan' },
  { to: '/rooms', icon: BedDouble, label: 'Phòng' },
  { to: '/bookings', icon: CalendarDays, label: 'Đặt phòng' },
  { to: '/reports', icon: BarChart3, label: 'Báo cáo' },
]

export function Layout() {
  return (
    <div className="relative min-h-screen bg-background pb-16 md:pb-0">
      {/* Background watermark — seal logo, very subtle */}
      <div
        className="pointer-events-none fixed inset-0 z-0 flex items-center justify-center"
        aria-hidden="true"
      >
        <img
          src="/logo-seal.svg"
          alt=""
          className="h-[400px] w-[400px] opacity-[0.10] md:h-[600px] md:w-[600px]"
        />
      </div>

      {/* Top header */}
      <header className="sticky top-0 z-30 border-b border-[#5C3A1E] bg-[#3D2B1F] shadow-md">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <div className="flex items-center gap-1.5">
            <img src="/logo-seal.svg" alt="Mái Ngói" className="h-9 w-9 brightness-0 invert opacity-80" />
            <div className="leading-tight">
              <p className="font-['Cormorant_SC'] text-lg font-bold tracking-wider text-[#F0E4D4]">
                mái ngói
              </p>
              <p className="font-['Playfair_Display'] text-[10px] font-light italic tracking-[0.2em] text-[#C4A882]">
                homestay
              </p>
            </div>
          </div>

          {/* Desktop nav — hidden on mobile */}
          <nav className="hidden gap-1 md:flex">
            {navItems.map(({ to, icon: Icon, label }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'text-[#C4A882] hover:bg-[#5C3A1E] hover:text-[#F0E4D4]',
                  )
                }
                end={to === '/'}
              >
                <Icon size={16} />
                {label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>

      {/* Page content — above the watermark */}
      <main className="relative z-10 mx-auto max-w-6xl p-4">
        <Outlet />
      </main>

      {/* Mobile bottom tab bar — hidden on desktop */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 border-t border-[#5C3A1E] bg-[#3D2B1F] md:hidden">
        <div className="mx-auto flex max-w-md justify-around">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                cn(
                  'flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-medium transition-colors',
                  isActive
                    ? 'text-primary'
                    : 'text-[#C4A882]',
                )
              }
              end={to === '/'}
            >
              <Icon size={20} />
              {label}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}
