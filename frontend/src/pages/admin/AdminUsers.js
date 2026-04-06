import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import axios from '@/utils/api';
import { API } from '@/utils/api';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Check, X } from '@phosphor-icons/react';

export default function AdminUsers() {
  const [pendingUsers, setPendingUsers] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const [pendingRes, allRes] = await Promise.all([
        axios.get(`${API}/admin/users/pending`),
        axios.get(`${API}/admin/users`)
      ]);
      setPendingUsers(pendingRes.data);
      setAllUsers(allRes.data);
    } catch (error) {
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (userId, status) => {
    try {
      await axios.put(`${API}/admin/users/${userId}/status`, null, {
        params: { status }
      });
      toast.success(`User ${status}`);
      fetchUsers();
    } catch (error) {
      toast.error('Failed to update user status');
    }
  };

  const getRoleBadge = (role) => {
    const colors = {
      publisher: 'bg-primary/20 border-primary',
      brand: 'bg-accent/20 border-accent',
      admin: 'bg-muted border-foreground'
    };
    return colors[role] || 'border-foreground';
  };

  const getStatusBadge = (status) => {
    const colors = {
      approved: 'bg-accent border-foreground',
      pending: 'bg-background border-foreground',
      rejected: 'bg-destructive/20 border-destructive',
      suspended: 'bg-muted border-foreground'
    };
    return colors[status] || 'border-foreground';
  };

  if (loading) {
    return (
      <DashboardLayout role="admin">
        <div className="p-8">Loading...</div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role="admin">
      <div className="p-8" data-testid="admin-users-page">
        <h1 className="font-heading text-4xl font-bold mb-8">User Management</h1>

        <Tabs defaultValue="pending" className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="pending" data-testid="tab-pending">
              Pending ({pendingUsers.length})
            </TabsTrigger>
            <TabsTrigger value="all" data-testid="tab-all">
              All Users ({allUsers.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending">
            {pendingUsers.length === 0 ? (
              <div className="border border-foreground p-12 text-center">
                <p className="text-muted-foreground">No pending verifications</p>
              </div>
            ) : (
              <div className="border border-foreground">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-foreground text-left bg-muted">
                        <th className="p-4 font-medium">Email</th>
                        <th className="p-4 font-medium">Role</th>
                        <th className="p-4 font-medium">Company</th>
                        <th className="p-4 font-medium">Website</th>
                        <th className="p-4 font-medium">Registered</th>
                        <th className="p-4 font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pendingUsers.map((user) => (
                        <tr key={user.id} className="border-b border-border" data-testid={`pending-user-${user.id}`}>
                          <td className="p-4">{user.email}</td>
                          <td className="p-4">
                            <span className={`px-3 py-1 text-xs font-medium border ${getRoleBadge(user.role)}`}>
                              {user.role.toUpperCase()}
                            </span>
                          </td>
                          <td className="p-4">{user.company_name || '-'}</td>
                          <td className="p-4">
                            {user.website ? (
                              <a href={user.website} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                                Link
                              </a>
                            ) : '-'}
                          </td>
                          <td className="p-4 text-sm">
                            {new Date(user.created_at).toLocaleDateString()}
                          </td>
                          <td className="p-4">
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                onClick={() => handleStatusUpdate(user.id, 'approved')}
                                className="bg-accent text-foreground hover:bg-accent/80"
                                data-testid={`approve-${user.id}`}
                              >
                                <Check size={16} weight="bold" className="mr-1" />
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleStatusUpdate(user.id, 'rejected')}
                                className="border-destructive text-destructive hover:bg-destructive hover:text-white"
                                data-testid={`reject-${user.id}`}
                              >
                                <X size={16} weight="bold" className="mr-1" />
                                Reject
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="all">
            <div className="border border-foreground">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-foreground text-left bg-muted">
                      <th className="p-4 font-medium">Email</th>
                      <th className="p-4 font-medium">Role</th>
                      <th className="p-4 font-medium">Status</th>
                      <th className="p-4 font-medium">Company</th>
                      <th className="p-4 font-medium">Registered</th>
                      <th className="p-4 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allUsers.map((user) => (
                      <tr key={user.id} className="border-b border-border" data-testid={`user-${user.id}`}>
                        <td className="p-4">{user.email}</td>
                        <td className="p-4">
                          <span className={`px-3 py-1 text-xs font-medium border ${getRoleBadge(user.role)}`}>
                            {user.role.toUpperCase()}
                          </span>
                        </td>
                        <td className="p-4">
                          <span className={`px-3 py-1 text-xs font-medium border ${getStatusBadge(user.status)}`}>
                            {user.status.toUpperCase()}
                          </span>
                        </td>
                        <td className="p-4">{user.company_name || '-'}</td>
                        <td className="p-4 text-sm">
                          {new Date(user.created_at).toLocaleDateString()}
                        </td>
                        <td className="p-4">
                          {user.status === 'approved' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleStatusUpdate(user.id, 'suspended')}
                              className="border-foreground hover:bg-muted"
                            >
                              Suspend
                            </Button>
                          )}
                          {user.status === 'suspended' && (
                            <Button
                              size="sm"
                              onClick={() => handleStatusUpdate(user.id, 'approved')}
                              className="bg-accent text-foreground"
                            >
                              Reactivate
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
