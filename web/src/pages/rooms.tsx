import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Pencil, Check, X } from 'lucide-react'
import { roomsApi, type Room } from '@/lib/api'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ROOM_STATUS } from '@/lib/constants'
import { formatVND } from '@/lib/utils'

export function RoomsPage() {
  const { data: rooms, isLoading } = useQuery({
    queryKey: ['rooms'],
    queryFn: roomsApi.list,
  })

  if (isLoading) return <p className="text-muted-foreground">Đang tải...</p>

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Quản lý phòng</h2>

      <div className="grid gap-4 sm:grid-cols-2">
        {rooms?.map((room) => (
          <RoomCard key={room.id} room={room} />
        ))}
      </div>
    </div>
  )
}

function RoomCard({ room }: { room: Room }) {
  const queryClient = useQueryClient()
  const [editingPrice, setEditingPrice] = useState(false)
  const [priceInput, setPriceInput] = useState(parseFloat(room.pricePerNight).toString())

  const statusStyle = ROOM_STATUS[room.status]

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: Room['status'] }) =>
      roomsApi.updateStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rooms'], refetchType: 'all' })
      queryClient.invalidateQueries({ queryKey: ['dashboard'], refetchType: 'all' })
    },
  })

  const priceMutation = useMutation({
    mutationFn: (pricePerNight: number) => roomsApi.updatePrice(room.id, pricePerNight),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rooms'], refetchType: 'all' })
      queryClient.invalidateQueries({ queryKey: ['dashboard'], refetchType: 'all' })
      setEditingPrice(false)
    },
  })

  const savePrice = () => {
    const num = parseFloat(priceInput)
    if (!Number.isFinite(num) || num < 0) return
    priceMutation.mutate(num)
  }

  return (
    <Card className={statusStyle.bg}>
      <div className="mb-3 flex items-start justify-between">
        <div>
          <h3 className="text-xl font-bold">{room.name}</h3>
          <p className={`text-sm font-medium ${statusStyle.color}`}>{statusStyle.label}</p>
        </div>
      </div>

      {/* Price */}
      <div className="mb-4 rounded-md bg-[#FFFBF7]/50 p-3 backdrop-blur-md">
        <p className="mb-1 text-xs text-muted-foreground">Giá mỗi đêm</p>
        {editingPrice ? (
          <div className="flex gap-2">
            <Input
              type="number"
              min="0"
              value={priceInput}
              onChange={(e) => setPriceInput(e.target.value)}
              autoFocus
            />
            <Button size="sm" onClick={savePrice} disabled={priceMutation.isPending}>
              <Check size={16} />
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                setEditingPrice(false)
                setPriceInput(parseFloat(room.pricePerNight).toString())
              }}
            >
              <X size={16} />
            </Button>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <p className="text-lg font-semibold">
              {parseFloat(room.pricePerNight) > 0
                ? formatVND(room.pricePerNight)
                : <span className="text-muted-foreground">Chưa đặt giá</span>}
            </p>
            <Button size="sm" variant="ghost" onClick={() => setEditingPrice(true)}>
              <Pencil size={14} /> Sửa
            </Button>
          </div>
        )}
      </div>

      {/* Status actions */}
      <div className="flex flex-wrap gap-2">
        {room.status === 'CLEANING' && (
          <Button
            size="sm"
            onClick={() => statusMutation.mutate({ id: room.id, status: 'AVAILABLE' })}
            disabled={statusMutation.isPending}
          >
            Đã dọn xong
          </Button>
        )}
        {room.status === 'AVAILABLE' && (
          <Button
            size="sm"
            variant="secondary"
            onClick={() => statusMutation.mutate({ id: room.id, status: 'MAINTENANCE' })}
            disabled={statusMutation.isPending}
          >
            Báo bảo trì
          </Button>
        )}
        {room.status === 'MAINTENANCE' && (
          <Button
            size="sm"
            onClick={() => statusMutation.mutate({ id: room.id, status: 'AVAILABLE' })}
            disabled={statusMutation.isPending}
          >
            Hoàn thành bảo trì
          </Button>
        )}
      </div>
    </Card>
  )
}
