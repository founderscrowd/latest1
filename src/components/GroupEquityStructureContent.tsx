import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  Users, 
  DollarSign, 
  Crown, 
  Briefcase, 
  Calculator,
  Info,
  Building,
  Target,
  PieChart,
  Phone,
  Clock,
  Calendar
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { groupAPI } from '../lib/groupApi';
import { equityAPI, EquityAllocation } from '../lib/equityApi';
import { parseFundingNeeded, formatCurrency, calculateCompanyValuation, calculateEquityValue } from '../utils/currency';

interface Group {
  id: string;
  name: string;
  funding_needed: string;
  equity_available: number;
  max_members: number;
  creator_id: string;
  created_at: string;
  creator_profile?: {
    username: string;
    avatar_url?: string;
  };
}

interface GroupEquityStructureContentProps {
  groupId: string;
  isCurrentUserCreator: boolean;
  isCurrentUserAdmin: boolean;
}

interface GroupMember {
  id: string;
  user_id: string;
  role: 'admin' | 'member' | 'cofounder' | 'pending' | 'starter';
  status: 'approved' | 'pending' | 'rejected';
  joined_at: string;
  profile: {
    username: string;
    avatar_url?: string;
  };
}

interface AggregatedEquityHolder {
  user_id: string;
  username: string;
  avatar_url?: string;
  total_equity: number;
  investment_types: string[];
  is_starter: boolean;
  phone_number?: string;
}

const GroupEquityStructureContent: React.FC<GroupEquityStructureContentProps> = ({ 
  groupId, 
  isCurrentUserCreator, 
  isCurrentUserAdmin 
}) => {
  const { user } = useAuth();
  const [group, setGroup] = useState<Group | null>(null);
  const [aggregatedEquityHolders, setAggregatedEquityHolders] = useState<AggregatedEquityHolder[]>([]);
  const [pendingClaims, setPendingClaims] = useState<EquityAllocation[]>([]);
  const [groupMembers, setGroupMembers] = useState<GroupMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (groupId) {
      fetchEquityStructure();
    }
  }, [groupId]);

  const fetchEquityStructure = async () => {
    try {
      setLoading(true);
      setError('');

      const [groupData, allocations, members] = await Promise.all([
        groupAPI.getGroup(groupId),
        equityAPI.getGroupEquityClaims(groupId),
        groupAPI.getGroupMembers(groupId, 100, 0, 'approved')
      ]);

      setGroup(groupData);
      setGroupMembers(members);
      
      // Filter approved and pending allocations
      const approvedAllocations = allocations.filter(allocation => allocation.status === 'approved');
      const pendingAllocations = allocations.filter(allocation => allocation.status === 'pending');
      setPendingClaims(pendingAllocations);
      
      // Calculate starter's equity percentage
      const totalClaimedByMembers = approvedAllocations.reduce((sum, allocation) => sum + allocation.amount, 0);
      const starterEquityPercentage = 100 - groupData.equity_available - totalClaimedByMembers;
      
      // Create all allocations including starter
      const allAllocationsWithStarter = [...approvedAllocations];
      
      if (starterEquityPercentage > 0) {
        const starterAllocation: EquityAllocation = {
          id: 'starter-equity',
          group_id: groupId,
          user_id: groupData.creator_id,
          amount: starterEquityPercentage,
          investment_type: 'cash', // Use valid type
          status: 'approved',
          requested_at: groupData.created_at,
          user_profile: {
            username: groupData.creator_profile?.username || 'Group Creator',
            avatar_url: groupData.creator_profile?.avatar_url
          }
        };
        allAllocationsWithStarter.unshift(starterAllocation); // Add starter at the beginning
      }
      
      // Aggregate equity by user
      const equityByUser = new Map<string, {
        user_id: string;
        username: string;
        avatar_url?: string;
        total_equity: number;
        investment_types: Set<string>;
        is_starter: boolean;
        phone_number?: string;
      }>();
      
      allAllocationsWithStarter.forEach(allocation => {
        const userId = allocation.user_id;
        const existing = equityByUser.get(userId);
        
        if (existing) {
          existing.total_equity += allocation.amount;
          existing.investment_types.add(allocation.investment_type);
          if (allocation.phone_number) {
            existing.phone_number = allocation.phone_number;
          }
        } else {
          equityByUser.set(userId, {
            user_id: userId,
            username: allocation.user_profile?.username || 'Unknown User',
            avatar_url: allocation.user_profile?.avatar_url,
            total_equity: allocation.amount,
            investment_types: new Set([allocation.investment_type]),
            is_starter: userId === groupData.creator_id,
            phone_number: allocation.phone_number
          });
        }
      });
      
      // Convert to array and sort by equity amount
      const aggregatedHolders = Array.from(equityByUser.values()).map(holder => ({
        ...holder,
        investment_types: Array.from(holder.investment_types)
      })).sort((a, b) => b.total_equity - a.total_equity);
      
      setAggregatedEquityHolders(aggregatedHolders);
    } catch (err: any) {
      console.error('Error fetching equity structure:', err);
      setError('Failed to load equity structure. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !group) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600 mb-4">{error || 'Group not found'}</p>
        <button
          onClick={() => fetchEquityStructure()}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  // Calculate metrics
  const fundingNeeded = parseFundingNeeded(group.funding_needed);
  const totalClaimedEquity = aggregatedEquityHolders.reduce((sum, holder) => sum + holder.total_equity, 0);
  const totalEquityPool = 100; // Always 100% for complete equity structure
  const companyValuation = calculateCompanyValuation(fundingNeeded, totalEquityPool);
  
  // Get co-founder count (anyone who has equity in the company)
  const cofounderCount = aggregatedEquityHolders.length;
  
  const highestEquityAmount = aggregatedEquityHolders[0]?.total_equity || 0;

  return (
    <div className="space-y-8">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl p-4 text-white">
          <div className="flex items-center justify-between mb-2">
            <Target size={20} />
            <span className="text-blue-100 text-xs">Target</span>
          </div>
          <div className="text-2xl font-bold">{formatCurrency(fundingNeeded)}</div>
          <div className="text-blue-100 text-xs uppercase tracking-wide">Funding Needed</div>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl p-4 text-white">
          <div className="flex items-center justify-between mb-2">
            <Building size={20} />
            <span className="text-green-100 text-xs">Implied</span>
          </div>
          <div className="text-2xl font-bold">{formatCurrency(companyValuation)}</div>
          <div className="text-green-100 text-xs uppercase tracking-wide">Company Valuation</div>
        </div>

        <div className="bg-gradient-to-br from-orange-500 to-red-600 rounded-xl p-4 text-white">
          <div className="flex items-center justify-between mb-2">
            <Users size={20} />
            <span className="text-orange-100 text-xs">Capacity</span>
          </div>
          <div className="text-2xl font-bold">{group.max_members}</div>
          <div className="text-orange-100 text-xs uppercase tracking-wide">MAX MEMBERS</div>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl p-4 text-white">
          <div className="flex items-center justify-between mb-2">
            <Users size={20} />
            <span className="text-purple-100 text-xs">Current</span>
          </div>
          <div className="text-2xl font-bold">{cofounderCount}</div>
          <div className="text-purple-100 text-xs uppercase tracking-wide">CO-FOUNDERS</div>
        </div>
      </div>

      {/* Equity Allocations */}
      <div>
        <h3 className="text-xl font-semibold text-slate-900 mb-6 flex items-center gap-2">
          <Crown size={20} className="text-yellow-600" />
          Complete Equity Distribution
        </h3>

        {aggregatedEquityHolders.length === 0 ? (
          <div className="text-center py-8 bg-slate-50 rounded-lg">
            <TrendingUp size={48} className="text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500">No equity allocations found</p>
          </div>
        ) : (
          <div className="space-y-3">
            {aggregatedEquityHolders.map((holder, index) => {
              const equityValue = calculateEquityValue(holder.total_equity, companyValuation);
              const isHighest = holder.total_equity === highestEquityAmount;
              
              return (
                <div
                  key={holder.user_id}
                  className={`p-4 rounded-lg border transition-all ${
                    holder.is_starter
                      ? 'border-purple-300 bg-purple-50'
                      : isHighest 
                      ? 'border-yellow-300 bg-yellow-50' 
                      : 'border-slate-200 bg-white hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                          <span className="text-white font-semibold text-sm">
                            {holder.is_starter 
                              ? '👑' 
                              : holder.username?.charAt(0)?.toUpperCase() || 'U'
                            }
                          </span>
                        </div>
                        {holder.is_starter ? (
                          <div className="absolute -top-1 -right-1 w-5 h-5 bg-purple-500 rounded-full flex items-center justify-center">
                            <Crown size={10} className="text-white" />
                          </div>
                        ) : isHighest && (
                          <div className="absolute -top-1 -right-1 w-5 h-5 bg-yellow-500 rounded-full flex items-center justify-center">
                            <Crown size={10} className="text-white" />
                          </div>
                        )}
                      </div>
                      
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold text-slate-900">
                            {holder.username || 'Unknown User'}
                          </h4>
                          {holder.is_starter ? (
                            <span className="text-xs bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full font-medium">
                              Starter
                            </span>
                          ) : isHighest && (
                            <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full font-medium">
                              Top Holder
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                          {holder.is_starter ? (
                            <Building size={12} />
                          ) : (
                            <div className="flex items-center gap-1">
                              {holder.investment_types.map((type, i) => (
                                <React.Fragment key={type}>
                                  {i > 0 && <span className="text-slate-400">+</span>}
                                  {type === 'cash' ? (
                                    <DollarSign size={12} />
                                  ) : (
                                    <Briefcase size={12} />
                                  )}
                                </React.Fragment>
                              ))}
                            </div>
                          )}
                          <span className="capitalize">
                            {holder.is_starter 
                              ? 'Founder\'s Equity' 
                              : holder.investment_types.length > 1
                              ? 'Mixed Investments'
                              : holder.investment_types[0] === 'skills/tasks' 
                              ? 'Skills/Tasks Investment' 
                              : 'Cash Investment'
                            }
                          </span>
                          {holder.phone_number && 
                           !holder.is_starter && 
                           (isCurrentUserCreator || isCurrentUserAdmin) && (
                            <>
                              <span className="text-slate-400">•</span>
                              <Phone size={12} />
                              <span className="text-blue-600 font-medium">
                                {holder.phone_number}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-xl font-bold text-slate-900">
                        {holder.total_equity}%
                      </div>
                      <div className="text-sm font-semibold text-green-600">
                        {formatCurrency(equityValue)}
                      </div>
                      <div className="text-xs text-slate-500">
                        Estimated Value
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Pending Claims */}
      {pendingClaims.length > 0 && (
        <div>
          <h3 className="text-xl font-semibold text-slate-900 mb-6 flex items-center gap-2">
            <Clock size={20} className="text-yellow-600" />
            Pending Claims ({pendingClaims.length})
          </h3>
          
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="space-y-3">
              {pendingClaims.map((claim) => {
                const equityValue = calculateEquityValue(claim.amount, companyValuation);
                
                return (
                  <div
                    key={claim.id}
                    className="flex items-center justify-between p-3 bg-white border border-yellow-300 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-gradient-to-br from-yellow-500 to-orange-600 rounded-full flex items-center justify-center">
                        <span className="text-white font-semibold text-sm">
                          {claim.user_profile?.username?.charAt(0)?.toUpperCase() || 'U'}
                        </span>
                      </div>
                      
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold text-slate-900">
                            {claim.user_profile?.username || 'Unknown User'}
                          </h4>
                          <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full font-medium">
                            Pending Review
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                          {claim.investment_type === 'cash' ? (
                            <DollarSign size={12} />
                          ) : (
                            <Briefcase size={12} />
                          )}
                          <span className="capitalize">
                            {claim.investment_type === 'skills/tasks' ? 'Skills/Tasks' : 'Cash'} Investment
                          </span>
                          <span className="text-slate-400">•</span>
                          <Calendar size={12} />
                          <span>
                            Requested {new Date(claim.requested_at).toLocaleDateString()}
                          </span>
                          {claim.phone_number && (isCurrentUserCreator || isCurrentUserAdmin) && (
                            <>
                              <span className="text-slate-400">•</span>
                              <Phone size={12} />
                              <span className="text-blue-600 font-medium">
                                {claim.phone_number}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-lg font-bold text-yellow-700">
                        {claim.amount}%
                      </div>
                      <div className="text-sm font-semibold text-yellow-600">
                        {formatCurrency(equityValue)}
                      </div>
                      <div className="text-xs text-slate-500">
                        Requested Value
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            
            <div className="mt-4 p-3 bg-yellow-100 border border-yellow-300 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Info size={14} className="text-yellow-700" />
                <span className="text-sm font-medium text-yellow-900">About Pending Claims</span>
              </div>
              <p className="text-sm text-yellow-800">
                These equity claims are awaiting approval from group administrators. 
                Once approved, the equity will be allocated and removed from the available pool.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Available Equity */}
      {group.equity_available > 0 && (
        <div>
          <h3 className="text-xl font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <TrendingUp size={20} className="text-blue-600" />
            Available Equity
          </h3>
          
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-semibold text-blue-900">Unclaimed Equity</h4>
                <p className="text-sm text-blue-700">Available for new co-founders</p>
              </div>
              <div className="text-right">
                <div className="text-xl font-bold text-blue-900">
                  {group.equity_available}%
                </div>
                <div className="text-sm font-semibold text-blue-600">
                  {formatCurrency(calculateEquityValue(group.equity_available, companyValuation))}
                </div>
                <div className="text-xs text-blue-600">
                  Estimated Value
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Calculation Info */}
      <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-3">
          <Calculator size={16} className="text-slate-600" />
          <h4 className="font-semibold text-slate-900">How We Calculate Values</h4>
        </div>
        <div className="space-y-2 text-sm text-slate-700">
          <div className="flex items-start gap-2">
            <Info size={14} className="text-blue-600 mt-0.5 flex-shrink-0" />
            <div>
              <strong>Company Valuation:</strong> Based on funding needed ({formatCurrency(fundingNeeded)}) 
              divided by total equity pool ({totalEquityPool}%)
            </div>
          </div>
          <div className="flex items-start gap-2">
            <Info size={14} className="text-blue-600 mt-0.5 flex-shrink-0" />
            <div>
              <strong>Individual Equity Value:</strong> Member's equity percentage multiplied by company valuation
            </div>
          </div>
          <div className="flex items-start gap-2">
            <Info size={14} className="text-blue-600 mt-0.5 flex-shrink-0" />
            <div>
              <strong>Note:</strong> These are estimated values based on current funding requirements. 
              Actual values may vary based on future funding rounds and company performance.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GroupEquityStructureContent;