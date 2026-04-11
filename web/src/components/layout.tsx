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
    <div className="min-h-screen bg-gray-50">
      {/* Top nav */}
      <header className="sticky top-0 z-30 border-b border-border bg-white">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <h1 className="text-lg font-bold text-foreground">Mai Ngoi Homestay</h1>
          <nav className="flex gap-1">
            {navItems.map(({ to, icon: Icon, label }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
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

      {/* Page content */}
      <main className="mx-auto max-w-6xl p-4">
        <Outlet />
      </main>
    </div>
  )
}
