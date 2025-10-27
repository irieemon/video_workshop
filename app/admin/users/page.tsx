'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Search, MoreVertical, Shield, ShieldOff, Crown, ChevronLeft, ChevronRight } from 'lucide-react'
import type { AdminUserSummary } from '@/lib/types/admin.types'

interface UsersResponse {
  users: AdminUserSummary[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUserSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [tier, setTier] = useState<string>('')
  const [adminOnly, setAdminOnly] = useState(false)
  const [page, setPage] = useState(1)
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 0,
  })

  useEffect(() => {
    fetchUsers()
  }, [page, search, tier, adminOnly])

  const fetchUsers = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '50',
        ...(search && { search }),
        ...(tier && { tier }),
        ...(adminOnly && { adminOnly: 'true' }),
      })

      const response = await fetch(`/api/admin/users?${params}`)

      if (!response.ok) {
        throw new Error('Failed to fetch users')
      }

      const data: UsersResponse = await response.json()
      setUsers(data.users)
      setPagination(data.pagination)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load users')
    } finally {
      setLoading(false)
    }
  }

  const updateUser = async (userId: string, updates: Record<string, unknown>) => {
    try {
      const response = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, updates }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update user')
      }

      // Refresh user list
      fetchUsers()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update user')
    }
  }

  const toggleAdmin = async (user: AdminUserSummary) => {
    const newStatus = !user.is_admin
    const message = newStatus
      ? `Grant admin privileges to ${user.email}?`
      : `Revoke admin privileges from ${user.email}?`

    if (confirm(message)) {
      await updateUser(user.id, { is_admin: newStatus })
    }
  }

  const changeTier = async (user: AdminUserSummary, newTier: 'free' | 'premium') => {
    if (confirm(`Change ${user.email} to ${newTier} tier?`)) {
      await updateUser(user.id, { subscription_tier: newTier })
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">User Management</h1>
        <p className="text-muted-foreground">Manage users and their permissions</p>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by email or name..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value)
                  setPage(1) // Reset to first page on search
                }}
                className="pl-9"
              />
            </div>

            <Select
              value={tier}
              onValueChange={(value) => {
                setTier(value === 'all' ? '' : value)
                setPage(1)
              }}
            >
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="All tiers" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All tiers</SelectItem>
                <SelectItem value="free">Free</SelectItem>
                <SelectItem value="premium">Premium</SelectItem>
              </SelectContent>
            </Select>

            <Button
              variant={adminOnly ? 'default' : 'outline'}
              onClick={() => {
                setAdminOnly(!adminOnly)
                setPage(1)
              }}
              className="w-full sm:w-auto"
            >
              <Shield className="h-4 w-4 mr-2" />
              {adminOnly ? 'Admins Only' : 'All Users'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center">
              <p className="text-muted-foreground">Loading users...</p>
            </div>
          ) : error ? (
            <div className="p-8 text-center">
              <p className="text-destructive">{error}</p>
            </div>
          ) : users.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-muted-foreground">No users found</p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Tier</TableHead>
                    <TableHead>Admin</TableHead>
                    <TableHead className="text-right">Videos</TableHead>
                    <TableHead className="text-right">Quota</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{user.full_name || 'No name'}</div>
                          <div className="text-sm text-muted-foreground">{user.email}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={user.subscription_tier === 'premium' ? 'default' : 'secondary'}>
                          {user.subscription_tier === 'premium' ? (
                            <Crown className="h-3 w-3 mr-1" />
                          ) : null}
                          {user.subscription_tier}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {user.is_admin ? (
                          <Badge variant="default">
                            <Shield className="h-3 w-3 mr-1" />
                            Admin
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-sm">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {user.usage_current?.videos_this_month || 0}
                      </TableCell>
                      <TableCell className="text-right">
                        <span
                          className={
                            user.usage_current?.videos_this_month >=
                            user.usage_quota?.videos_per_month
                              ? 'text-destructive font-medium'
                              : ''
                          }
                        >
                          {user.usage_current?.videos_this_month || 0} /{' '}
                          {user.usage_quota?.videos_per_month || 10}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => toggleAdmin(user)}>
                              {user.is_admin ? (
                                <>
                                  <ShieldOff className="h-4 w-4 mr-2" />
                                  Revoke Admin
                                </>
                              ) : (
                                <>
                                  <Shield className="h-4 w-4 mr-2" />
                                  Grant Admin
                                </>
                              )}
                            </DropdownMenuItem>
                            {user.subscription_tier === 'free' && (
                              <DropdownMenuItem onClick={() => changeTier(user, 'premium')}>
                                <Crown className="h-4 w-4 mr-2" />
                                Upgrade to Premium
                              </DropdownMenuItem>
                            )}
                            {user.subscription_tier === 'premium' && (
                              <DropdownMenuItem onClick={() => changeTier(user, 'free')}>
                                Downgrade to Free
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              <div className="flex items-center justify-between px-6 py-4 border-t">
                <div className="text-sm text-muted-foreground">
                  Showing {((page - 1) * pagination.limit) + 1} to{' '}
                  {Math.min(page * pagination.limit, pagination.total)} of{' '}
                  {pagination.total} users
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(page - 1)}
                    disabled={page === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </Button>

                  <div className="text-sm">
                    Page {page} of {pagination.totalPages}
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(page + 1)}
                    disabled={page === pagination.totalPages}
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
