import React from 'react';
import { TrendingUp, DollarSign, Briefcase, Calendar, CheckCircle, Clock, XCircle } from 'lucide-react';

interface EquityClaim {
  id: string;
  group_id: string;
  amount: number;
  investment_type: 'cash' | 'skills/tasks';
  status: 'pending' | 'approved' | 'rejected';
  requested_at: string;
  approved_at?: string;
  notes?: string;
  group?: {
    name: string;
  };
}

interface EquityClaimsTabProps {
  equityClaims: EquityClaim[];
  onBack: () => void;
}

const EquityClaimsTab: React.FC<EquityClaimsTabProps> = ({ equityClaims, onBack }) => {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock size={16} className="text-yellow-600" />;
      case 'approved':
        return <CheckCircle size={16} className="text-green-600" />;
      case 'rejected':
        return <XCircle size={16} className="text-red-600" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'rejected':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
      <h3 className="text-lg font-semibold text-slate-900 mb-6">
        My Equity Claims
      </h3>
      
      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-yellow-600">
            {equityClaims.filter(c => c.status === 'pending').length}
          </div>
          <div className="text-sm text-yellow-700">Pending</div>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-green-600">
            {equityClaims.filter(c => c.status === 'approved').length}
          </div>
          <div className="text-sm text-green-700">Approved</div>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-red-600">
            {equityClaims.filter(c => c.status === 'rejected').length}
          </div>
          <div className="text-sm text-red-700">Rejected</div>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-blue-600">
            {equityClaims.filter(c => c.status === 'approved').reduce((sum, c) => sum + c.amount, 0)}%
          </div>
          <div className="text-sm text-blue-700">Total Approved</div>
        </div>
      </div>

      {/* Claims List */}
      {equityClaims.length === 0 ? (
        <div className="text-center py-12">
          <TrendingUp size={48} className="text-slate-300 mx-auto mb-4" />
          <h4 className="text-lg font-semibold text-slate-900 mb-2">No equity claims yet</h4>
          <p className="text-slate-600 mb-4">
            You haven't submitted any equity claims. Join groups and claim your stake!
          </p>
          <button
            onClick={onBack}
            className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors font-medium"
          >
            Browse Groups
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {equityClaims.map((claim) => (
            <div key={claim.id} className="border border-slate-200 rounded-lg p-4 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h4 className="font-semibold text-slate-900">
                      {claim.group?.name || 'Group Not Found'}
                    </h4>
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(claim.status)}`}>
                      {getStatusIcon(claim.status)}
                      {claim.status.charAt(0).toUpperCase() + claim.status.slice(1)}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-4 text-sm text-slate-600 mb-2">
                    <div className="flex items-center gap-1">
                      {claim.investment_type === 'cash' ? (
                        <DollarSign size={14} />
                      ) : (
                        <Briefcase size={14} />
                      )}
                      <span className="capitalize">
                        {claim.investment_type === 'skills/tasks' ? 'Skills/Tasks' : 'Cash'}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar size={14} />
                      <span>Requested {new Date(claim.requested_at).toLocaleDateString()}</span>
                    </div>
                    {claim.approved_at && (
                      <div className="flex items-center gap-1">
                        <CheckCircle size={14} />
                        <span>
                          {claim.status === 'approved' ? 'Approved' : 'Processed'} {new Date(claim.approved_at).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                  </div>
                  
                  {claim.notes && claim.status === 'rejected' && (
                    <p className="text-sm text-red-700 bg-red-50 p-2 rounded border border-red-200">
                      <strong>Rejection Reason:</strong> {claim.notes}
                    </p>
                  )}
                  
                  {claim.notes && claim.status !== 'rejected' && (
                    <p className="text-sm text-slate-600 bg-slate-50 p-2 rounded">
                      <strong>Notes:</strong> {claim.notes}
                    </p>
                  )}
                </div>
                
                <div className="text-right ml-4">
                  <div className="text-xl font-bold text-slate-900">{claim.amount}%</div>
                  <div className="text-sm text-slate-600">Equity</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default EquityClaimsTab;