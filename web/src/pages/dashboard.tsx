import { useQuery } from '@tanstack/react-query'
import { Users, LogIn, LogOut, BedDouble, CalendarClock } from 'lucide-react'
import { dashboardApi, type Booking } from '@/lib/api'
import { Card, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ROOM_STATUS, BOOKING_STATUS } from '@/lib/constants'
import { formatVND, formatDate } from '@/lib/utils'

export function DashboardPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['dashboard'],
    queryFn: dashboardApi.today,
    refetchInterval: 30_000, // refresh every 30s
    refetchOnMount: 'always', // always refetch when navigating back to the page
    staleTime: 0, // never serve cached data without a background refetch
  })

  if (isLoading) return <p className="text-muted-foreground">Đang tải...</p>
  if (error) return <p className="text-destructive">Lỗi: {(error as Error).message}</p>
  if (!data) return null

  const { stats, rooms, arrivals, departures, inHouse, upcoming } = data

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Tổng quan hôm nay</h2>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <StatCard icon={BedDouble} label="Phòng trống" value={stats.available} color="text-emerald-600" />
        <StatCard icon={Users} label="Đang ở" value={stats.inHouseGuests} color="text-blue-600" />
        <StatCard icon={LogIn} label="Nhận phòng" value={stats.arrivalsToday} color="text-amber-600" />
        <StatCard icon={LogOut} label="Trả phòng" value={stats.departuresToday} color="text-purple-600" />
        <StatCard icon={CalendarClock} label="Sắp tới" value={stats.upcomingCount} color="text-indigo-600" />
      </div>

      {/* Room status overview */}
      <Card>
        <CardHeader><CardTitle>Trạng thái phòng</CardTitle></CardHeader>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {rooms.map((room) => {
            const status = ROOM_STATUS[room.status]
            return (
              <div key={room.id} className={`rounded-lg border p-3 ${status.bg}`}>
                <p className="font-semibold">{room.name}</p>
                <p className={`text-sm ${status.color}`}>{status.label}</p>
              </div>
            )
          })}
        </div>
      </Card>

      {/* Today's arrivals */}
      <Card>
        <CardHeader><CardTitle>Khách nhận phòng hôm nay ({arrivals.length})</CardTitle></CardHeader>
        {arrivals.length === 0 ? (
          <p className="text-sm text-muted-foreground">Không có khách nhận phòng hôm nay</p>
        ) : (
          <div className="space-y-2">
            {arrivals.map((b) => (
              <BookingRow key={b.id} booking={b} />
            ))}
          </div>
        )}
      </Card>

      {/* Today's departures */}
      <Card>
        <CardHeader><CardTitle>Khách trả phòng hôm nay ({departures.length})</CardTitle></CardHeader>
        {departures.length === 0 ? (
          <p className="text-sm text-muted-foreground">Không có khách trả phòng hôm nay</p>
        ) : (
          <div className="space-y-2">
            {departures.map((b) => (
              <BookingRow key={b.id} booking={b} />
            ))}
          </div>
        )}
      </Card>

      {/* In-house guests */}
      <Card>
        <CardHeader><CardTitle>Khách đang ở ({inHouse.length})</CardTitle></CardHeader>
        {inHouse.length === 0 ? (
          <p className="text-sm text-muted-foreground">Không có khách đang ở</p>
        ) : (
          <div className="space-y-2">
            {inHouse.map((b) => (
              <BookingRow key={b.id} booking={b} />
            ))}
          </div>
        )}
      </Card>

      {/* Upcoming bookings (next 7 days) */}
      <Card>
        <CardHeader><CardTitle>Đặt phòng sắp tới ({upcoming.length})</CardTitle></CardHeader>
        {upcoming.length === 0 ? (
          <p className="text-sm text-muted-foreground">Không có đặt phòng sắp tới</p>
        ) : (
          <div className="space-y-2">
            {upcoming.map((b) => (
              <BookingRow key={b.id} booking={b} />
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}

function StatCard({ icon: Icon, label, value, color }: {
  icon: typeof Users
  label: string
  value: number
  color: string
}) {
  return (
    <Card className="flex items-center gap-3">
      <div className={`rounded-lg bg-gray-100 p-2 ${color}`}>
        <Icon size={20} />
      </div>
      <div>
        <p className="text-2xl font-bold">{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
    </Card>
  )
}

function BookingRow({ booking }: { booking: Booking }) {
  const statusConfig = BOOKING_STATUS[booking.status]
  return (
    <div className="flex items-center justify-between rounded-md border border-border p-3">
      <div>
        <p className="font-medium">{booking.guestName}</p>
        <p className="text-sm text-muted-foreground">
          {booking.room?.name} · {formatDate(booking.checkIn)} → {formatDate(booking.checkOut)}
        </p>
      </div>
      <div className="text-right">
        <p className="text-sm font-medium">{formatVND(booking.totalRoomPrice)}</p>
        <Badge variant={statusConfig.variant}>{statusConfig.label}</Badge>
      </div>
    </div>
  )
}
