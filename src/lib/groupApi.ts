import { supabase } from './supabase';
import { chatAPI } from './chatApi';

export interface Group {
  id: string;
  name: string;
  slug: string;
  description: string;
  tags: string[];
  equity_available: number;
  funding_needed: string;
  industry: string;
  max_members: number;
  stage: string;
  created_at: string;
  creator_id: string;
  cover_image?: string;
  is_public: boolean;
  status: 'active' | 'inactive' | 'pending';
  location_type?: string;
  country?: string;
  city?: string;
  legal_structure?: string;
  organisation_type?: string;
  creator_subscription_active?: boolean;
}

export interface GroupMember {
  id: string;
  user_id: string;
  group_id: string;
  role: 'admin' | 'member' | 'cofounder' | 'pending' | 'starter';
  status: 'approved' | 'pending' | 'rejected';
  joined_at: string;
  profile?: {
    username: string;
    avatar_url?: string;
  };
  subscription_active?: boolean;
}

export interface CreateGroupData {
  name: string;
  description: string;
  tags: string[];
  equity_available: number;
  funding_needed: string;
  industry: string;
  max_members: number;
  stage: string;
  is_public?: boolean;
  location_type: 'worldwide' | 'location_based';
  country?: string;
  city?: string;
  legal_structure?: string;
  organisation_type?: string;
}

// Fetch subscription status for a list of user IDs and return a Set of inactive user IDs
async function fetchInactiveUserIds(userIds: string[]): Promise<Set<string>> {
  if (userIds.length === 0) return new Set();
  try {
    const { data, error } = await supabase
      .rpc('get_batch_subscription_status', { user_ids: userIds });
    if (error || !data) return new Set();
    const inactive = new Set<string>();
    for (const row of data) {
      if (row.subscription_status !== 'active') {
        inactive.add(row.user_id);
      }
    }
    return inactive;
  } catch {
    return new Set();
  }
}

class GroupAPI {
  // Get all groups with proper filtering for visibility
  async getGroups(filters?: {
    industry?: string;
    stage?: string;
    search?: string;
    limit?: number;
    offset?: number;
  }) {
    console.log('=== GROUPAPI.GETGROUPS START ===');
    console.log('Filters:', filters);
    try {
      console.log('Creating Supabase query...');
      let query = supabase
        .from('groups')
        .select('*');

      console.log('Query created, applying filters...');
      // Apply filters
      if (filters?.industry) {
        query = query.eq('industry', filters.industry);
      }
      
      if (filters?.stage) {
        query = query.eq('stage', filters.stage);
      }
      
      if (filters?.search) {
        query = query.or(`name.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
      }

      // Apply pagination
      const limit = filters?.limit || 50;
      const offset = filters?.offset || 0;
      query = query
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      console.log('About to execute Supabase query...');
      const { data, error } = await query;

      console.log('Supabase query completed');
      console.log('Data:', data);
      console.log('Error:', error);
      if (error) {
        console.error('Error fetching groups:', error);
        console.error('Error details:', error.message, error.details, error.hint);
        throw error;
      }

      // Fetch creator profiles and member counts separately
      const groupsWithDetails = await Promise.all(
        (data || []).map(async (group) => {
          // Get creator profile
          const { data: creatorProfile } = await supabase
            .from('profiles')
            .select('username, avatar_url')
            .eq('id', group.creator_id)
            .maybeSingle();

          // Get member count
          const { data: memberData } = await supabase
            .from('group_members')
            .select('id')
            .eq('group_id', group.id)
            .eq('status', 'approved');

          const memberCount = memberData?.length || 0;

          return {
            ...group,
            creator_profile: creatorProfile,
            member_count: [{ count: memberCount }]
          };
        })
      );

      // Fetch subscription status for all group creators
      const creatorIds = groupsWithDetails.map(g => g.creator_id).filter(Boolean);
      const inactiveCreatorIds = await fetchInactiveUserIds(creatorIds);
      const groupsWithCreatorSubStatus = groupsWithDetails.map(g => ({
        ...g,
        creator_subscription_active: !inactiveCreatorIds.has(g.creator_id)
      }));

      return groupsWithCreatorSubStatus;
    } catch (error) {
      console.error('Error in getGroups:', error);
      throw error;
    }
  }

  // Get single group with full details
  async getGroup(groupId: string) {
    try {
      const { data: groupData, error: groupError } = await supabase
        .from('groups')
        .select('*')
        .eq('id', groupId)
        .single();

      if (groupError) throw groupError;

      // Get creator profile separately
      const { data: creatorProfile } = await supabase
        .from('profiles')
        .select('username, avatar_url')
        .eq('id', groupData.creator_id)
        .maybeSingle();

      // Get member count separately
       const { data: memberData } = await supabase
        .from('group_members')
        .select('id')
        .eq('group_id', groupId)
        .eq('status', 'approved');

      const memberCount = memberData?.length || 0;

      // Check creator's subscription status
      const inactiveCreatorIds = await fetchInactiveUserIds([groupData.creator_id]);

      return {
        ...groupData,
        creator_profile: creatorProfile,
        member_count: [{ count: memberCount }],
        creator_subscription_active: !inactiveCreatorIds.has(groupData.creator_id)
      };
    } catch (error) {
      console.error('Error fetching group:', error);
      throw error;
    }
  }

  // Get single group by slug with full details
  async getGroupBySlug(slug: string) {
    try {
      const { data: groupData, error: groupError } = await supabase
        .from('groups')
        .select('*')
        .eq('slug', slug)
        .maybeSingle();

      if (groupError) throw groupError;
      if (!groupData) return null;

      // Get creator profile separately
      const { data: creatorProfile } = await supabase
        .from('profiles')
        .select('username, avatar_url')
        .eq('id', groupData.creator_id)
        .maybeSingle();

      // Get member count separately
      const { data: memberData } = await supabase
        .from('group_members')
        .select('id')
        .eq('group_id', groupData.id)
        .eq('status', 'approved');

      const memberCount = memberData?.length || 0;

      // Check creator's subscription status
      const inactiveCreatorIds = await fetchInactiveUserIds([groupData.creator_id]);

      return {
        ...groupData,
        creator_profile: creatorProfile,
        member_count: [{ count: memberCount }],
        creator_subscription_active: !inactiveCreatorIds.has(groupData.creator_id)
      };
    } catch (error) {
      console.error('Error fetching group by slug:', error);
      throw error;
    }
  }

  // Get groups created by a specific user
  async getUserCreatedGroups(userId: string) {
    try {
      const { data, error } = await supabase
        .from('groups')
        .select('*')
        .eq('creator_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching user created groups:', error);
      throw error;
    }
  }

  // Get groups where user is a member
  async getUserJoinedGroups(userId: string) {
    try {
      const { data, error } = await supabase
        .from('group_members')
        .select(`
          *,
          group:groups!inner(
            *,
            member_count:group_members(count)
          )
        `)
        .eq('user_id', userId)
        .in('status', ['approved', 'pending'])
        .neq('role', 'starter')
        .neq('group.creator_id', userId)
        .order('joined_at', { ascending: false });

      if (error) throw error;
      return (data || []).map(item => ({
        ...item.group,
        membership_status: item.status
      })).filter(Boolean);
    } catch (error) {
      console.error('Error fetching user joined groups:', error);
      throw error;
    }
  }

  // Create a new group
  async createGroup(groupData: CreateGroupData, userId: string) {
    try {
      const { data, error } = await supabase
        .from('groups')
        .insert({
          ...groupData,
          creator_id: userId,
          status: 'active',
          is_public: groupData.is_public ?? true
        })
        .select()
        .single();

      if (error) throw error;

      // Add creator as starter member with proper error handling
      const { error: memberError } = await supabase
        .from('group_members')
        .insert({
          group_id: data.id,
          user_id: userId,
          role: 'starter',
          status: 'approved'
        })
        .select()
        .single();

      if (memberError) {
        console.error('Error adding creator as starter member:', memberError);
        // If member creation fails, clean up the group to prevent orphaned groups
        await supabase.from('groups').delete().eq('id', data.id);
        throw new Error('Failed to set up group membership. Please try again.');
      }

      console.log('✅ Group created successfully with starter member added');

      return data;
    } catch (error) {
      console.error('Error creating group:', error);
      throw error;
    }
  }

  // Update group
  async updateGroup(groupId: string, updates: Partial<Group>, userId: string) {
    try {
      // Check if user is admin or starter
      const { data: membership } = await supabase
        .from('group_members')
        .select('role')
        .eq('group_id', groupId)
        .eq('user_id', userId)
        .maybeSingle();

      const { data: group } = await supabase
        .from('groups')
        .select('creator_id')
        .eq('id', groupId)
        .maybeSingle();

      if (!['admin', 'starter'].includes(membership?.role || '') && group?.creator_id !== userId) {
        throw new Error('Unauthorized: Only admins and starters can update groups');
      }

      const { data, error } = await supabase
        .from('groups')
        .update(updates)
        .eq('id', groupId)
        .select()
        .single();

      if (error) throw error;

      if (updates.name) {
        try {
          await supabase
            .from('conversations')
            .update({ name: updates.name, updated_at: new Date().toISOString() })
            .eq('group_id', groupId)
            .eq('type', 'group');
        } catch (conversationError) {
          console.warn('Could not sync group conversation name:', conversationError);
        }
      }

      return data;
    } catch (error) {
      console.error('Error updating group:', error);
      throw error;
    }
  }

  // Delete group
  async deleteGroup(groupId: string, userId: string) {
    try {
      // Check if user is creator
      const { data: group } = await supabase
        .from('groups')
        .select('creator_id')
        .eq('id', groupId)
        .maybeSingle();

      if (group?.creator_id !== userId) {
        throw new Error('Unauthorized: Only group creators can delete groups');
      }

      const { error } = await supabase
        .from('groups')
        .delete()
        .eq('id', groupId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error deleting group:', error);
      throw error;
    }
  }

  // Join group
  async joinGroup(groupId: string, userId: string) {
    try {
      // First, check if the group requires approval
      const { data: groupData, error: groupError } = await supabase
        .from('groups')
        .select('require_approval')
        .eq('id', groupId)
        .maybeSingle();

      if (groupError) {
        console.error('Error fetching group approval settings:', groupError);
        throw groupError;
      }

      // Determine the initial status based on group settings
      const initialStatus = groupData?.require_approval ? 'pending' : 'approved';

      const { data, error } = await supabase
        .from('group_members')
        .insert({
          group_id: groupId,
          user_id: userId,
          role: 'member',
          status: initialStatus
        })
        .select()
        .single();

      if (error) throw error;

      // If user is immediately approved, add them to the group conversation
      if (initialStatus === 'approved') {
        try {
          const conversation = await chatAPI.getGroupConversation(groupId);
          if (conversation) {
            // Get the user's actual role from group_members
            const { data: memberData } = await supabase
              .from('group_members')
              .select('role')
              .eq('group_id', groupId)
              .eq('user_id', userId)
              .single();

            await supabase
              .from('conversation_participants')
              .upsert({
                conversation_id: conversation.id,
                user_id: userId,
                role: memberData?.role || 'member',
                joined_at: new Date().toISOString(),
                last_read_at: new Date().toISOString(),
                left_at: null, // Explicitly set to null for active participation
                is_muted: false,
                notification_settings: { mentions: true, all_messages: true }
              }, {
                onConflict: 'conversation_id,user_id'
              });
          }
        } catch (chatError) {
          console.warn('Could not add user to group conversation:', chatError);
          // Don't throw error as group membership was successful
        }
      }

      return data;
    } catch (error) {
      console.error('Error joining group:', error);
      throw error;
    }
  }

  // Leave group
  async leaveGroup(groupId: string, userId: string) {
    try {
      // First, get the group conversation to update chat participation
      try {
        const conversation = await chatAPI.getGroupConversation(groupId);
        if (conversation) {
          // Mark user as having left the conversation
          await supabase
            .from('conversation_participants')
            .update({ 
              left_at: new Date().toISOString()
            })
            .eq('conversation_id', conversation.id)
            .eq('user_id', userId);
        }
      } catch (chatError) {
        console.warn('Could not update chat participation when leaving group:', chatError);
        // Don't throw error as group membership removal should still proceed
      }

      // Then remove from group
      const { error } = await supabase
        .from('group_members')
        .delete()
        .eq('group_id', groupId)
        .eq('user_id', userId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error leaving group:', error);
      throw error;
    }
  }

  // Get group members
  async getGroupMembers(groupId: string, limit = 20, offset = 0, statusFilter: 'approved' | 'pending' | 'rejected' | 'all' = 'approved') {
    try {
      console.log('🔍 Fetching group members for group:', groupId, 'with filter:', statusFilter);
      
      // First, get group members
      let query = supabase
        .from('group_members')
        .select('*')
        .eq('group_id', groupId)
        .order('joined_at', { ascending: true })
        .range(offset, offset + limit - 1);

      // Apply status filter
      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data: membersData, error: membersError } = await query;

      if (membersError) {
        console.error('Error fetching group members:', membersError);
        return [];
      }

      if (!membersData || membersData.length === 0) {
        console.log('⚠️ No members found for group:', groupId, 'with filter:', statusFilter);
        return [];
      }

      console.log('📋 Found members:', membersData.length, 'for group:', groupId);
      
      // Get unique user IDs
      const userIds = membersData.map(member => member.user_id);

      // Fetch profiles for these users
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, username, avatar_url')
        .in('id', userIds);

      if (profilesError) {
        console.error('Error fetching profiles:', profilesError);
        // Return members without profile data
        return membersData.map(member => ({
          ...member,
          profile: { username: 'Member', avatar_url: null }
        }));
      }
      // Combine members with their profiles
      const membersWithProfiles = membersData.map(member => {
        const profile = profilesData?.find(p => p.id === member.user_id);
        return {
          ...member,
          profile: profile ? {
            username: profile.username || 'Member',
            avatar_url: profile.avatar_url
          } : { username: 'Member', avatar_url: null }
        };
      });

      // Fetch subscription status for all members
      const inactiveUserIds = await fetchInactiveUserIds(userIds);
      const membersWithSubStatus = membersWithProfiles.map(member => ({
        ...member,
        subscription_active: !inactiveUserIds.has(member.user_id)
      }));

      console.log('✅ Returning members with profiles:', membersWithSubStatus.length);
      return membersWithSubStatus;
    } catch (error) {
      console.error('Error fetching group members:', error);
      return [];
    }
  }

  // Update member status (approve/reject pending members)
  async updateGroupMemberStatus(groupId: string, memberId: string, newStatus: 'approved' | 'pending' | 'rejected', actingUserId: string) {
    try {
      // Check if acting user is admin or starter
      const { data: actingMember } = await supabase
        .from('group_members')
        .select('role')
        .eq('group_id', groupId)
        .eq('user_id', actingUserId)
        .eq('status', 'approved')
        .maybeSingle();

      const { data: group } = await supabase
        .from('groups')
        .select('creator_id')
        .eq('id', groupId)
        .maybeSingle();

      if ((!actingMember || !['admin', 'starter'].includes(actingMember.role)) && group?.creator_id !== actingUserId) {
        throw new Error('Unauthorized: Only group admins and starters can update member status');
      }

      // Get the member being updated to get their user_id
      const { data: memberData } = await supabase
        .from('group_members')
        .select('user_id')
        .eq('id', memberId)
        .eq('group_id', groupId)
        .maybeSingle();

      if (!memberData) {
        throw new Error('Member not found');
      }

      // Update the member status
      const { data, error } = await supabase
        .from('group_members')
        .update({ status: newStatus })
        .eq('id', memberId)
        .eq('group_id', groupId)
        .select()
        .single();

      if (error) throw error;

      // If member is being approved, add them to the group conversation
      if (newStatus === 'approved') {
        try {
          const conversation = await chatAPI.getGroupConversation(groupId);
          if (conversation) {
            // Get the user's actual role from group_members
            const { data: memberData } = await supabase
              .from('group_members')
              .select('role')
              .eq('id', memberId)
              .single();

            await supabase
              .from('conversation_participants')
              .upsert({
                conversation_id: conversation.id,
                user_id: memberData.user_id,
                role: memberData?.role || 'member',
                joined_at: new Date().toISOString(),
                last_read_at: new Date().toISOString(),
                left_at: null, // Explicitly set to null for active participation
                is_muted: false,
                notification_settings: { mentions: true, all_messages: true }
              }, {
                onConflict: 'conversation_id,user_id'
              });
          }
        } catch (chatError) {
          console.warn('Could not add approved member to group conversation:', chatError);
          // Don't throw error as member approval was successful
        }
      } else if (newStatus === 'rejected') {
        // If member is being rejected, mark them as having left the conversation
        try {
          const conversation = await chatAPI.getGroupConversation(groupId);
          if (conversation) {
            await supabase
              .from('conversation_participants')
              .update({ 
                left_at: new Date().toISOString()
              })
              .eq('conversation_id', conversation.id)
              .eq('user_id', memberData.user_id);
          }
        } catch (chatError) {
          console.warn('Could not update chat participation for rejected member:', chatError);
          // Don't throw error as member rejection was successful
        }
      }

      return data;
    } catch (error) {
      console.error('Error updating member status:', error);
      throw error;
    }
  }

  // Update member role
  async updateGroupMemberRole(groupId: string, memberId: string, newRole: 'admin' | 'member' | 'cofounder', actingUserId: string) {
    try {
      // Get the member being updated
      const { data: memberToUpdate } = await supabase
        .from('group_members')
        .select('role')
        .eq('id', memberId)
        .eq('group_id', groupId)
        .maybeSingle();

      // Prevent changing starter role
      if (memberToUpdate?.role === 'starter') {
        throw new Error('Cannot change the role of the group starter');
      }

      // Check if acting user is admin or starter
      const { data: actingMember } = await supabase
        .from('group_members')
        .select('role')
        .eq('group_id', groupId)
        .eq('user_id', actingUserId)
        .eq('status', 'approved')
        .maybeSingle();

      if (!actingMember || !['admin', 'starter'].includes(actingMember.role)) {
        throw new Error('Unauthorized: Only group admins and starters can change member roles');
      }

      // If trying to demote an admin to member or cofounder, check if they're the last admin
      if ((memberToUpdate?.role === 'admin' || memberToUpdate?.role === 'starter') && (newRole === 'member' || newRole === 'cofounder')) {
        const { data: adminCount } = await supabase
          .from('group_members')
          .select('id')
          .eq('group_id', groupId)
          .in('role', ['admin', 'starter'])
          .eq('status', 'approved');

        if (adminCount && adminCount.length <= 1) {
          throw new Error('Cannot demote the last admin/starter. Assign another admin first.');
        }
      }

      // Update the member role
      const { data, error } = await supabase
        .from('group_members')
        .update({ role: newRole })
        .eq('id', memberId)
        .eq('group_id', groupId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating member role:', error);
      throw error;
    }
  }

  // Remove member from group
  async removeGroupMember(groupId: string, memberId: string, actingUserId: string) {
    try {
      // Get member details to check if they're a starter
      const { data: memberToRemove } = await supabase
        .from('group_members')
        .select('role, user_id')
        .eq('id', memberId)
        .eq('group_id', groupId)
        .maybeSingle();

      if (!memberToRemove) {
        throw new Error('Member not found');
      }

      // Prevent removing starter
      if (memberToRemove.role === 'starter') {
        throw new Error('Cannot remove the group starter');
      }

      // Check if acting user is admin or starter
      const { data: actingMember } = await supabase
        .from('group_members')
        .select('role')
        .eq('group_id', groupId)
        .eq('user_id', actingUserId)
        .eq('status', 'approved')
        .maybeSingle();

      if (!actingMember || !['admin', 'starter'].includes(actingMember.role)) {
        throw new Error('Unauthorized: Only group admins and starters can remove members');
      }

      // If removing an admin, check if they're the last admin/starter
      if (memberToRemove.role === 'admin' || memberToRemove.role === 'starter') {
        const { data: adminCount } = await supabase
          .from('group_members')
          .select('id')
          .eq('group_id', groupId)
          .in('role', ['admin', 'starter'])
          .eq('status', 'approved');

        if (adminCount && adminCount.length <= 1) {
          throw new Error('Cannot remove the last admin/starter. Assign another admin first.');
        }
      }

      // Update chat participation before removing from group
      try {
        const conversation = await chatAPI.getGroupConversation(groupId);
        if (conversation) {
          // Mark user as having left the conversation
          await supabase
            .from('conversation_participants')
            .update({ 
              left_at: new Date().toISOString()
            })
            .eq('conversation_id', conversation.id)
            .eq('user_id', memberToRemove.user_id);
        }
      } catch (chatError) {
        console.warn('Could not update chat participation when removing member:', chatError);
        // Don't throw error as member removal should still proceed
      }
      // Remove the member
      const { error } = await supabase
        .from('group_members')
        .delete()
        .eq('id', memberId)
        .eq('group_id', groupId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error removing member:', error);
      throw error;
    }
  }

  // Get user membership status for a group
  async getUserMembership(groupId: string, userId: string) {
    if (!userId) {
      return null;
    }
    
    try {
      const { data, error } = await supabase
        .from('group_members')
        .select('*')
        .eq('group_id', groupId)
        .eq('user_id', userId)
        .maybeSingle();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching user membership:', error);
      return null;
    }
  }
}

export const groupAPI = new GroupAPI();

export type ProfitStatus = 'for_profit' | 'non_profit' | 'not_yet_decided';

export interface StructureOption {
  value: string;
  label: string;
}

export const FOR_PROFIT_STRUCTURES: StructureOption[] = [
  { value: 'planning_to_incorporate', label: 'Planning to incorporate' },
  { value: 'private_company_ltd', label: 'Private Company / Ltd' },
  { value: 'llc', label: 'LLC' },
  { value: 'corporation_inc', label: 'Corporation / Inc.' },
  { value: 'partnership', label: 'Partnership' },
  { value: 'cooperative', label: 'Cooperative' },
  { value: 'other', label: 'Other' },
  { value: 'not_yet_decided', label: 'Not yet decided' },
];

export const NON_PROFIT_STRUCTURES: StructureOption[] = [
  { value: 'nonprofit_organisation', label: 'Non-profit organisation' },
  { value: 'charity', label: 'Charity' },
  { value: 'foundation', label: 'Foundation' },
  { value: 'association', label: 'Association' },
  { value: 'cooperative', label: 'Cooperative' },
  { value: 'social_enterprise', label: 'Social enterprise' },
  { value: 'other', label: 'Other' },
  { value: 'not_yet_decided', label: 'Not yet decided' },
];

export const UNDECIDED_STRUCTURES: StructureOption[] = [
  { value: 'not_yet_decided', label: 'Not yet decided' },
];

export function getStructuresForProfitStatus(profitStatus: string | null | undefined): StructureOption[] {
  switch (profitStatus) {
    case 'for_profit': return FOR_PROFIT_STRUCTURES;
    case 'non_profit': return NON_PROFIT_STRUCTURES;
    default: return UNDECIDED_STRUCTURES;
  }
}

export function isValidStructureForProfitStatus(profitStatus: string | null | undefined, structure: string | null | undefined): boolean {
  const options = getStructuresForProfitStatus(profitStatus);
  return options.some(o => o.value === structure);
}

export function formatLegalStructure(value?: string | null): string {
  switch (value) {
    case 'planning_to_incorporate': return 'Planning to incorporate';
    case 'private_company_ltd': return 'Private Company / Ltd';
    case 'llc': return 'LLC';
    case 'corporation_inc': return 'Corporation / Inc.';
    case 'partnership': return 'Partnership';
    case 'cooperative': return 'Cooperative';
    case 'nonprofit_organisation': return 'Non-profit organisation';
    case 'charity': return 'Charity';
    case 'foundation': return 'Foundation';
    case 'association': return 'Association';
    case 'social_enterprise': return 'Social enterprise';
    case 'other': return 'Other';
    case 'not_yet_decided': return 'Not yet decided';
    default: return 'Not yet decided';
  }
}

export function formatOrganisationType(value?: string | null): string {
  switch (value) {
    case 'for_profit': return 'For-profit';
    case 'non_profit': return 'Non-profit';
    case 'not_yet_decided': return 'Not yet decided';
    default: return 'Not yet decided';
  }
}