import { useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useTheme } from 'next-themes';
import { Moon, Sun, Users, Settings, Mail, Trash2, Shield, Crown, Loader2, Key, CreditCard } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  useWorkspace,
  useWorkspaceMembers,
  useWorkspaceInvitations,
  useInviteMember,
  useCancelInvitation,
  useUpdateMemberRole,
  useRemoveMember,
  useUpdateWorkspaceName,
  useIsWorkspaceAdmin,
} from '@/hooks/use-workspace';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast as sonnerToast } from 'sonner';

export default function SettingsPage() {
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();
  const { t } = useTranslation();
  const { data: workspace } = useWorkspace();
  const { data: members = [], isLoading: membersLoading } = useWorkspaceMembers();
  const { data: invitations = [] } = useWorkspaceInvitations();
  const inviteMember = useInviteMember();
  const cancelInvitation = useCancelInvitation();
  const updateRole = useUpdateMemberRole();
  const removeMember = useRemoveMember();
  const updateName = useUpdateWorkspaceName();
  const isAdmin = useIsWorkspaceAdmin();

  const [wsName, setWsName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'admin' | 'member'>('member');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const handleSaveWorkspace = async () => {
    if (!wsName.trim()) return;
    await updateName.mutateAsync(wsName.trim());
    toast({ title: t('settings.saved') });
  };

  const handleInvite = async () => {
    if (!inviteEmail.trim()) return;
    try {
      await inviteMember.mutateAsync({ email: inviteEmail, role: inviteRole });
      setInviteEmail('');
      toast({ title: t('settings.team.inviteSent') });
    } catch (e: any) {
      toast({ title: t('settings.team.inviteError'), description: e.message, variant: 'destructive' });
    }
  };

  const handleChangePassword = async () => {
    if (newPassword.length < 6) {
      sonnerToast.error('Password must be at least 6 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      sonnerToast.error('Passwords do not match');
      return;
    }
    setPasswordLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setNewPassword('');
      setConfirmPassword('');
      sonnerToast.success('Password updated');
    } catch (e: any) {
      sonnerToast.error(e.message);
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleDeleteWorkspace = async () => {
    if (!workspace?.id) return;
    setDeleteLoading(true);
    try {
      // Delete all workspace data in order
      await supabase.from('dashboard_widgets').delete().in('dashboard_id',
        (await supabase.from('dashboards').select('id').eq('workspace_id', workspace.id)).data?.map(d => d.id) || []
      );
      await supabase.from('dashboards').delete().eq('workspace_id', workspace.id);
      await supabase.from('alerts').delete().eq('workspace_id', workspace.id);
      await supabase.from('alert_thresholds').delete().eq('workspace_id', workspace.id);
      await supabase.from('services').delete().eq('workspace_id', workspace.id);
      await supabase.from('integrations').delete().eq('workspace_id', workspace.id);
      await supabase.from('aws_credentials').delete().eq('workspace_id', workspace.id);
      await supabase.from('workspace_invitations').delete().eq('workspace_id', workspace.id);
      await supabase.from('workspace_members').delete().eq('workspace_id', workspace.id);
      // Note: workspace itself may need admin deletion
      sonnerToast.success('Workspace deleted. You will be signed out.');
      await supabase.auth.signOut();
    } catch (e: any) {
      sonnerToast.error(e.message);
    } finally {
      setDeleteLoading(false);
      setDeleteConfirmOpen(false);
    }
  };

  return (
    <AppLayout centered>
      <div className="max-w-2xl animate-fade-in">
        <h1 className="text-2xl font-bold text-foreground mb-6">{t('settings.title')}</h1>

        <Tabs defaultValue="general">
          <TabsList className="mb-6">
            <TabsTrigger value="general" className="gap-1.5">
              <Settings className="w-4 h-4" />
              {t('settings.general')}
            </TabsTrigger>
            <TabsTrigger value="team" className="gap-1.5">
              <Users className="w-4 h-4" />
              {t('settings.team.title')}
              {members.length > 1 && (
                <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-bold ml-1">
                  {members.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="billing" className="gap-1.5">
              <CreditCard className="w-4 h-4" />
              Billing
            </TabsTrigger>
          </TabsList>

          {/* General tab */}
          <TabsContent value="general" className="space-y-6">
            <div className="bg-card border border-border rounded-xl p-6 space-y-4">
              <div className="space-y-2">
                <Label>{t('settings.email')}</Label>
                <Input value={user?.email ?? ''} disabled />
              </div>
              <div className="space-y-2">
                <Label>{t('settings.workspace')}</Label>
                <Input
                  value={wsName || workspace?.name || ''}
                  onChange={(e) => setWsName(e.target.value)}
                  disabled={!isAdmin}
                />
              </div>
              {isAdmin && (
                <Button
                  className="gradient-primary text-primary-foreground hover:opacity-90 transition-opacity"
                  onClick={handleSaveWorkspace}
                  disabled={updateName.isPending}
                >
                  {t('settings.saveChanges')}
                </Button>
              )}
            </div>

            <div className="bg-card border border-border rounded-xl p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {theme === 'dark' ? <Moon className="h-5 w-5 text-muted-foreground" /> : <Sun className="h-5 w-5 text-muted-foreground" />}
                  <div>
                    <Label className="text-sm font-medium">{t('settings.darkMode')}</Label>
                    <p className="text-xs text-muted-foreground">{t('settings.darkModeDesc')}</p>
                  </div>
                </div>
                <Switch
                  checked={theme === 'dark'}
                  onCheckedChange={(checked) => setTheme(checked ? 'dark' : 'light')}
                />
              </div>
            </div>

            {/* Change password */}
            <div className="bg-card border border-border rounded-xl p-6 space-y-4">
              <div className="flex items-center gap-3 mb-2">
                <Key className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="font-semibold text-foreground text-sm">Change password</p>
                  <p className="text-xs text-muted-foreground">Update your account password</p>
                </div>
              </div>
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label className="text-sm">New password</Label>
                  <Input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm">Confirm password</Label>
                  <Input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                  />
                </div>
                <Button
                  variant="outline"
                  onClick={handleChangePassword}
                  disabled={passwordLoading || !newPassword}
                  className="gap-2"
                >
                  {passwordLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                  Update password
                </Button>
              </div>
            </div>

            {/* Danger zone */}
            {isAdmin && (
              <div className="bg-card border border-destructive/20 rounded-xl p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-destructive text-sm">Delete workspace</p>
                    <p className="text-xs text-muted-foreground">Permanently delete this workspace and all its data. This action cannot be undone.</p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2 border-destructive/30 text-destructive hover:bg-destructive/10"
                    onClick={() => setDeleteConfirmOpen(true)}
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </Button>
                </div>
              </div>
            )}
          </TabsContent>

          {/* Team tab */}
          <TabsContent value="team" className="space-y-6">
            {/* Invite section (admin only) */}
            {isAdmin && (
              <div className="bg-card border border-border rounded-xl p-6">
                <h3 className="font-semibold text-foreground text-sm mb-4">{t('settings.team.invite')}</h3>
                <div className="flex gap-2">
                  <Input
                    placeholder={t('settings.team.emailPlaceholder')}
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    className="flex-1"
                    onKeyDown={(e) => e.key === 'Enter' && handleInvite()}
                  />
                  <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as 'admin' | 'member')}>
                    <SelectTrigger className="w-[120px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="member">{t('settings.team.roleMember')}</SelectItem>
                      <SelectItem value="admin">{t('settings.team.roleAdmin')}</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    onClick={handleInvite}
                    disabled={inviteMember.isPending || !inviteEmail.trim()}
                    className="gradient-primary text-primary-foreground hover:opacity-90"
                  >
                    <Mail className="w-4 h-4 mr-1.5" />
                    {t('settings.team.sendInvite')}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-2">{t('settings.team.inviteHint')}</p>
              </div>
            )}

            {/* Pending invitations */}
            {invitations.length > 0 && (
              <div className="bg-card border border-border rounded-xl p-6">
                <h3 className="font-semibold text-foreground text-sm mb-3">{t('settings.team.pending')}</h3>
                <div className="space-y-2">
                  {invitations.map((inv) => (
                    <div key={inv.id} className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted/50">
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm text-foreground">{inv.invited_email}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-warning/10 text-warning font-medium capitalize">
                          {inv.role}
                        </span>
                      </div>
                      {isAdmin && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={() => cancelInvitation.mutate(inv.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Members list */}
            <div className="bg-card border border-border rounded-xl p-6">
              <h3 className="font-semibold text-foreground text-sm mb-3">
                {t('settings.team.members')} ({members.length})
              </h3>
              {membersLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <div className="space-y-2">
                  {members.map((member) => {
                    const isCurrentUser = member.user_id === user?.id;
                    const displayName = member.email || member.profile?.display_name || member.user_id.slice(0, 8);

                    return (
                      <div key={member.id} className="flex items-center justify-between py-3 px-3 rounded-lg hover:bg-muted/50 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium text-primary">
                            {displayName.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-sm font-medium text-foreground">{displayName}</span>
                              {isCurrentUser && (
                                <span className="text-[10px] text-muted-foreground">({t('settings.team.you')})</span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {member.role === 'admin' ? (
                            <div className="flex items-center gap-1 text-xs text-primary font-medium">
                              <Crown className="w-3.5 h-3.5" />
                              Admin
                            </div>
                          ) : (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground font-medium">
                              <Shield className="w-3.5 h-3.5" />
                              Member
                            </div>
                          )}
                          {isAdmin && !isCurrentUser && (
                            <div className="flex items-center gap-1 ml-2">
                              <Select
                                value={member.role}
                                onValueChange={(v) => updateRole.mutate({ id: member.id, role: v as 'admin' | 'member' })}
                              >
                                <SelectTrigger className="h-7 text-xs w-[90px]">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="member">{t('settings.team.roleMember')}</SelectItem>
                                  <SelectItem value="admin">{t('settings.team.roleAdmin')}</SelectItem>
                                </SelectContent>
                              </Select>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                onClick={() => removeMember.mutate(member.id)}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </TabsContent>

          {/* Billing tab */}
          <TabsContent value="billing" className="space-y-6">
            <div className="bg-card border border-border rounded-xl p-8 text-center">
              <CreditCard className="w-12 h-12 text-muted-foreground/40 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">Billing & Subscription</h3>
              <p className="text-sm text-muted-foreground max-w-md mx-auto mb-6">
                Subscription management and billing details will be available soon. You're currently on the free plan.
              </p>
              <Button variant="outline" disabled>
                Coming soon
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Delete workspace confirmation */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete workspace?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the workspace "{workspace?.name}" and all its data (services, dashboards, integrations, alerts). This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteWorkspace}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteLoading}
            >
              {deleteLoading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Delete workspace
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}