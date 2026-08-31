import { supabase } from './supabase';

// --- Interfaces ---

export interface EquityAllocation {
  id: string;
  group_id: string;
  user_id: string;
  amount: number;
  investment_type: 'cash' | 'skills/tasks';
  status: 'pending' | 'approved' | 'rejected' | 'revoked';
  requested_at: string;
  approved_by?: string;
  approved_at?: string;
  notes?: string;
  phone_number?: string;
  // Optionally include user profile for display purposes
  user_profile?: {
    username: string;
    avatar_url?: string;
  };
  // Include group information for display purposes
  group?: {
    name: string;
  };
}

export interface EquityClaimRequest {
  group_id: string;
  amount: number;
  investment_type: 'cash' | 'skills/tasks';
}

// --- EquityAPI Class ---

class EquityAPI {
  /**
   * Requests a new equity claim for a group.
   * Calls the 'request_equity_claim' Supabase RPC function.
   */
  async requestEquityClaim(
    groupId: string,
    amount: number,
    investmentType: 'cash' | 'skills/tasks',
    phoneNumber?: string
  ): Promise<EquityAllocation> {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('User not authenticated');

      // Basic phone number validation
      if (phoneNumber) {
        const cleanPhone = phoneNumber.replace(/\D/g, '');
        if (cleanPhone.length < 7 || cleanPhone.length > 15) {
          throw new Error('Invalid phone number format');
        }
      }

      // Insert equity allocation directly since we need to include phone_number
      const { data, error } = await supabase
        .from('equity_allocations')
        .insert({
          group_id: groupId,
          user_id: user.user.id,
          amount,
          investment_type: investmentType,
          phone_number: phoneNumber || null,
          status: 'pending',
          requested_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      return data;
    } catch (error) {
      console.error('Error requesting equity claim:', error);
      throw error;
    }
  }

  /**
   * Fetches all equity claims for a specific user.
   */
  async getUserEquityClaims(userId: string): Promise<EquityAllocation[]> {
    try {
      const { data, error } = await supabase
        .from('equity_allocations')
        .select(`
          *,
          user_profile:profiles!equity_allocations_user_id_fkey(username, avatar_url),
          group:groups!equity_allocations_group_id_fkey(name)
        `)
        .eq('user_id', userId)
        .order('requested_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching user equity claims:', error);
      throw error;
    }
  }

  /**
   * Fetches all equity claims for a specific group.
   * Includes user profile information for display.
   */
  async getGroupEquityClaims(groupId: string): Promise<EquityAllocation[]> {
    try {
      const { data, error } = await supabase
        .from('equity_allocations')
        .select('*, user_profile:profiles!equity_allocations_user_id_fkey(username, avatar_url)')
        .eq('group_id', groupId)
        .order('requested_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching group equity claims:', error);
      throw error;
    }
  }

  /**
   * Approves a pending equity claim.
   * Updates the equity claim status to approved and reduces available equity.
   */
  async approveEquityClaim(claimId: string, approverUserId: string): Promise<void> {
    try {
      // Get the claim details first
      const { data: claim, error: claimError } = await supabase
        .from('equity_allocations')
        .select('*, groups!inner(equity_available)')
        .eq('id', claimId)
        .eq('status', 'pending')
        .single();

      if (claimError) throw claimError;
      if (!claim) throw new Error('Claim not found or already processed');

      // Check if there's enough equity available
      const availableEquity = claim.groups.equity_available;
      if (claim.amount > availableEquity) {
        throw new Error(`Insufficient equity available. Requested: ${claim.amount}%, Available: ${availableEquity}%`);
      }

      // Update the claim status
      const { error: updateError } = await supabase
        .from('equity_allocations')
        .update({
          status: 'approved',
          approved_by: approverUserId,
          approved_at: new Date().toISOString()
        })
        .eq('id', claimId);

      if (updateError) throw updateError;

      // Reduce the available equity in the group
      const { error: groupUpdateError } = await supabase
        .from('groups')
        .update({
          equity_available: availableEquity - claim.amount
        })
        .eq('id', claim.group_id);

      if (groupUpdateError) throw groupUpdateError;

    } catch (error) {
      console.error('Error approving equity claim:', error);
      throw error;
    }
  }

  /**
   * Rejects a pending equity claim.
   * Updates the equity claim status to rejected.
   */
  async rejectEquityClaim(claimId: string, rejecterUserId: string, rejectionReason?: string): Promise<void> {
    try {
      // Update the claim status to rejected
      const { error } = await supabase
        .from('equity_allocations')
        .update({
          status: 'rejected',
          approved_by: rejecterUserId,
          approved_at: new Date().toISOString(),
          notes: rejectionReason || null
        })
        .eq('id', claimId)
        .eq('status', 'pending');

      if (error) throw error;
    } catch (error) {
      console.error('Error rejecting equity claim:', error);
      throw error;
    }
  }
}

export const equityAPI = new EquityAPI();