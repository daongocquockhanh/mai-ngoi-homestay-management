import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { roomsApi, type Room } from '@/lib/api'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ROOM_STATUS } from '@/lib/constants'

export function RoomsPage() {
  const queryClient = useQueryClient()
  const { data: rooms, isLoading } = useQuery({
    queryKey: ['rooms'],
    queryFn: roomsApi.list,
  })

  const mutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: Room['status'] }) =>
      roomsApi.updateStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rooms'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })

  if (isLoading) return <p className="text-muted-foreground">Đang tải...</p>

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Quản lý phòng</h2>

      <div className="grid gap-4 sm:grid-cols-2">
        {rooms?.map((room) => {
          const status = ROOM_STATUS[room.status]
          return (
            <Card key={room.id} className={`${status.bg}`}>
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold">{room.name}</h3>
                  <p className={`text-sm font-medium ${status.color}`}>{status.label}</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {room.status === 'CLEANING' && (
                  <Button
                    size="sm"
                    onClick={() => mutation.mutate({ id: room.id, status: 'AVAILABLE' })}
                    disabled={mutation.isPending}
                  >
                    Đã dọn xong
                  </Button>
                )}
                {room.status === 'AVAILABLE' && (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => mutation.mutate({ id: room.id, status: 'MAINTENANCE' })}
                    disabled={mutation.isPending}
                  >
                    Báo bảo trì
                  </Button>
                )}
                {room.status === 'MAINTENANCE' && (
                  <Button
                    size="sm"
                    onClick={() => mutation.mutate({ id: room.id, status: 'AVAILABLE' })}
                    disabled={mutation.isPending}
                  >
                    Hoàn thành bảo trì
                  </Button>
                )}
              </div>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
