import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Save, Trash2, AlertTriangle, Users, Settings, Info, Shield, Globe, Lock, Image, Camera, Upload, X as XIcon, Coins, Sprout } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { groupAPI, getStructuresForProfitStatus, isValidStructureForProfitStatus } from '../lib/groupApi';
import { supabase } from '../lib/supabase';
import ConfirmationModal from './ConfirmationModal';

interface Group {
  id: string;
  name: string;
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
  require_approval?: boolean;
  legal_structure?: string;
  organisation_type?: string;
}

interface GroupMember {
  id: string;
  user_id: string;
  group_id: string;
  role: 'admin' | 'member' | 'cofounder' | 'pending' | 'starter';
  status: 'approved' | 'pending' | 'rejected';
  joined_at: string;
  profile: {
    username: string;
    avatar_url?: string;
  };
}

interface GroupSettingsPageProps {
  groupId: string;
  onBack: () => void;
  onGroupUpdated: (group: Group) => void;
}

const GroupSettingsPage: React.FC<GroupSettingsPageProps> = ({ groupId, onBack, onGroupUpdated }) => {
  const { user } = useAuth();
  const [group, setGroup] = useState<Group | null>(null);
  const [approvedMembers, setApprovedMembers] = useState<GroupMember[]>([]);
  const [pendingMembers, setPendingMembers] = useState<GroupMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('basic');
  const [message, setMessage] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);
  
  // Remove member confirmation states
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);
  const [removeConfirmMessage, setRemoveConfirmMessage] = useState('');
  const [memberToRemove, setMemberToRemove] = useState<string | null>(null);
  const [removing, setRemoving] = useState(false);
  
  // Cover image upload states
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imageUploadMessage, setImageUploadMessage] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    tags: '',
    equity_available: '',
    funding_needed: '',
    industry: '',
    max_members: '',
    stage: '',
    is_public: true,
    location_type: 'worldwide',
    country: '',
    city: '',
    require_approval: false,
    legal_structure: 'not_yet_decided',
    organisation_type: ''
  });

  useEffect(() => {
    fetchGroupData();
    if (activeTab === 'members') {
      fetchMembers();
    }
  }, [groupId, activeTab]);

  const fetchGroupData = async () => {
    try {
      const groupData = await groupAPI.getGroup(groupId);
      setGroup(groupData);
      
      // Populate form data
      setFormData({
        name: groupData.name,
        description: groupData.description,
        tags: groupData.tags.join(', '),
        equity_available: groupData.equity_available.toString(),
        funding_needed: groupData.funding_needed,
        industry: groupData.industry,
        max_members: groupData.max_members.toString(),
        stage: groupData.stage,
        is_public: groupData.is_public,
        location_type: groupData.location_type || 'worldwide',
        country: groupData.country || '',
        city: groupData.city || '',
        require_approval: groupData.require_approval || false,
        legal_structure: groupData.legal_structure || 'not_yet_decided',
        organisation_type: groupData.organisation_type || 'not_yet_decided'
      });
      
      // Set initial image preview
      setImagePreview(groupData.cover_image || null);
    } catch (error) {
      console.error('Error fetching group:', error);
      setMessage('Error loading group data');
    } finally {
      setLoading(false);
    }
  };

  const fetchMembers = async () => {
    try {
      // Fetch approved members
      const approvedMembersData = await groupAPI.getGroupMembers(groupId, 20, 0, 'approved');
      setApprovedMembers(approvedMembersData);

      // Fetch pending members
      const pendingMembersData = await groupAPI.getGroupMembers(groupId, 20, 0, 'pending');
      setPendingMembers(pendingMembersData);
    } catch (error) {
      console.error('Error fetching members:', error);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = type === 'checkbox' ? (e.target as HTMLInputElement).checked : undefined;

    setFormData(prev => {
      const next: typeof prev = {
        ...prev,
        [name]: checked !== undefined ? checked : value,
      };

      if (name === 'organisation_type') {
        if (!isValidStructureForProfitStatus(value, prev.legal_structure)) {
          next.legal_structure = 'not_yet_decided';
        }
      }

      return next;
    });
  };

  const handleOrgTypeClick = (value: string) => {
    setFormData(prev => {
      const next: typeof prev = { ...prev, organisation_type: value };
      if (!isValidStructureForProfitStatus(value, prev.legal_structure)) {
        next.legal_structure = 'not_yet_decided';
      }
      return next;
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['image/jpeg', 'image/png'];
    if (!validTypes.includes(file.type)) {
      setImageUploadMessage('Please select a valid image format: JPG or PNG');
      return;
    }

    // Validate file size (5MB limit)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      setImageUploadMessage('File size must be less than 5MB');
      return;
    }

    setSelectedFile(file);
    setImageUploadMessage('');

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setImagePreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    if (!user || !group) return;

    setSaving(true);
    setMessage('');
    setImageUploadMessage('');

    try {
      let coverImageUrl = group.cover_image;

      // Handle image upload if a new file is selected
      if (selectedFile) {
        setUploadingImage(true);
        
        try {
          const bucketName = 'group-covers';
          
          // Create unique filename
          const fileExt = selectedFile.name.split('.').pop();
          const fileName = `${group.id}/cover.${fileExt}`;

          // Delete old image if exists
          if (group.cover_image) {
            const oldPath = group.cover_image.split('/').pop();
            if (oldPath) {
              await supabase.storage
                .from(bucketName)
                .remove([`${group.id}/${oldPath}`]);
            }
          }

          // Upload new image
          const { error: uploadError } = await supabase.storage
            .from(bucketName)
            .upload(fileName, selectedFile, { upsert: true });

          if (uploadError) {
            throw uploadError;
          }

          // Get public URL
          const { data: { publicUrl } } = supabase.storage
            .from(bucketName)
            .getPublicUrl(fileName);

          coverImageUrl = publicUrl;
          setImageUploadMessage('Cover image uploaded successfully!');
        } catch (imageError) {
          console.error('Error uploading image:', imageError);
          setImageUploadMessage('Error uploading image. Please try again.');
          setUploadingImage(false);
          setSaving(false);
          return;
        } finally {
          setUploadingImage(false);
        }
      }

      const updates = {
        name: formData.name,
        description: formData.description,
        tags: formData.tags.split(',').map(tag => tag.trim()).filter(Boolean),
        equity_available: parseInt(formData.equity_available),
        funding_needed: formData.funding_needed,
        industry: formData.industry,
        max_members: parseInt(formData.max_members),
        stage: formData.stage,
        is_public: formData.is_public,
        location_type: formData.location_type,
        country: formData.country,
        city: formData.city,
        require_approval: formData.require_approval,
        legal_structure: formData.legal_structure,
        organisation_type: formData.organisation_type,
        cover_image: coverImageUrl
      };

      const updatedGroup = await groupAPI.updateGroup(group.id, updates, user.id);
      setGroup(updatedGroup);
      onGroupUpdated(updatedGroup);
      
      // Reset file selection after successful save
      setSelectedFile(null);
      setImagePreview(updatedGroup.cover_image || null);
      
      setMessage('Group updated successfully!');
      setTimeout(() => setMessage(''), 10000);
    } catch (error: any) {
      setMessage(error.message || 'Failed to update group');
      setTimeout(() => setMessage(''), 10000);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteGroup = async () => {
    if (!user || !group || deleteConfirmText !== group.name) return;

    setDeleting(true);
    try {
      await groupAPI.deleteGroup(group.id, user.id);
      onBack(); // Navigate back after successful deletion
    } catch (error: any) {
      setMessage(error.message || 'Failed to delete group');
      setTimeout(() => setMessage(''), 5000);
    } finally {
      setDeleting(false);
      setShowDeleteConfirm(false);
      setDeleteConfirmText('');
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!user) return;

    // Get member details to check if they have equity
    const memberToRemove = approvedMembers.find(m => m.id === memberId);
    if (!memberToRemove) return;

    // Check if member has any approved equity claims
    let hasEquity = false;
    let equityAmount = 0;
    
    try {
      const { data: equityClaims } = await supabase
        .from('equity_allocations')
        .select('amount')
        .eq('group_id', groupId)
        .eq('user_id', memberToRemove.user_id)
        .eq('status', 'approved');
      
      if (equityClaims && equityClaims.length > 0) {
        hasEquity = true;
        equityAmount = equityClaims.reduce((sum, claim) => sum + claim.amount, 0);
      }
    } catch (error) {
      console.error('Error checking member equity claims:', error);
    }

    const warningMessage = hasEquity 
      ? `⚠️ WARNING: ${memberToRemove.profile?.username || 'This member'} currently has ${equityAmount}% approved equity in this group.

If you remove them, they will LOSE ALL their equity claims (${equityAmount}%) and the equity will be returned to the group's available equity pool.

This action cannot be undone.

Are you sure you want to remove this member and revoke their equity?`
      : `Are you sure you want to remove ${memberToRemove.profile?.username || 'this member'} from the group?`;

    setRemoveConfirmMessage(warningMessage);
    setMemberToRemove(memberId);
    setShowRemoveConfirm(true);
  };

  const handleConfirmRemoveMember = async () => {
    if (!user || !memberToRemove) return;

    // Get member details again for the success message
    const memberData = approvedMembers.find(m => m.id === memberToRemove);
    if (!memberData) return;

    // Check equity one more time for the success message
    let hasEquity = false;
    let equityAmount = 0;
    
    try {
      const { data: equityClaims } = await supabase
        .from('equity_allocations')
        .select('amount')
        .eq('group_id', groupId)
        .eq('user_id', memberData.user_id)
        .eq('status', 'approved');
      
      if (equityClaims && equityClaims.length > 0) {
        hasEquity = true;
        equityAmount = equityClaims.reduce((sum, claim) => sum + claim.amount, 0);
      }
    } catch (error) {
      console.error('Error checking member equity claims:', error);
    }

    try {
      setRemoving(true);
      await groupAPI.removeGroupMember(groupId, memberToRemove, user.id);
      setApprovedMembers(prev => prev.filter(m => m.id !== memberToRemove));
      setShowRemoveConfirm(false);
      setMemberToRemove(null);
      
      // Re-fetch group data to get updated member count
      try {
        const updatedGroup = await groupAPI.getGroup(groupId);
        onGroupUpdated(updatedGroup);
      } catch (groupFetchError) {
        console.warn('Could not refresh group data after member removal:', groupFetchError);
      }
      
      if (hasEquity) {
        setMessage(`Member removed successfully. ${equityAmount}% equity has been returned to the available pool.`);
      } else {
        setMessage('Member removed successfully');
      }
      setTimeout(() => setMessage(''), 10000);
    } catch (error: any) {
      setMessage(error.message || 'Failed to remove member');
      setTimeout(() => setMessage(''), 10000);
    } finally {
      setRemoving(false);
    }
  };

  const handleChangeRole = async (memberId: string, newRole: 'admin' | 'member') => {
    if (!user) return;

    try {
      await groupAPI.updateGroupMemberRole(groupId, memberId, newRole as 'admin' | 'member' | 'cofounder', user.id);
      setApprovedMembers(prev => prev.map(m => 
        m.id === memberId ? { ...m, role: newRole } : m
      ));
      setMessage(`Member role updated to ${newRole}`);
      setTimeout(() => setMessage(''), 10000);
    } catch (error: any) {
      setMessage(error.message || 'Failed to update member role');
      setTimeout(() => setMessage(''), 10000);
    }
  };

  const handleApproveMember = async (memberId: string) => {
    if (!user) return;

    try {
      await groupAPI.updateGroupMemberStatus(groupId, memberId, 'approved', user.id);
      
      // Move member from pending to approved
      const approvedMember = pendingMembers.find(m => m.id === memberId);
      if (approvedMember) {
        setPendingMembers(prev => prev.filter(m => m.id !== memberId));
        setApprovedMembers(prev => [...prev, { ...approvedMember, status: 'approved' }]);
      }
      
      // Re-fetch group data to get updated member count
      try {
        const updatedGroup = await groupAPI.getGroup(groupId);
        onGroupUpdated(updatedGroup);
      } catch (groupFetchError) {
        console.warn('Could not refresh group data after member approval:', groupFetchError);
      }
      
      setMessage('Member approved successfully');
      setTimeout(() => setMessage(''), 10000);
    } catch (error: any) {
      setMessage(error.message || 'Failed to approve member');
      setTimeout(() => setMessage(''), 10000);
    }
  };

  const handleRejectMember = async (memberId: string) => {
    if (!user) return;

    try {
      await groupAPI.updateGroupMemberStatus(groupId, memberId, 'rejected', user.id);
      
      // Remove member from pending list
      setPendingMembers(prev => prev.filter(m => m.id !== memberId));
      
      // Re-fetch group data to get updated member count (in case rejection affects count)
      try {
        const updatedGroup = await groupAPI.getGroup(groupId);
        onGroupUpdated(updatedGroup);
      } catch (groupFetchError) {
        console.warn('Could not refresh group data after member rejection:', groupFetchError);
      }
      
      setMessage('Member request rejected');
      setTimeout(() => setMessage(''), 10000);
    } catch (error: any) {
      setMessage(error.message || 'Failed to reject member');
      setTimeout(() => setMessage(''), 10000);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading group settings...</p>
        </div>
      </div>
    );
  }

  if (!group) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-600 mb-4">Group not found</p>
          <button
            onClick={onBack}
            className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const isCreator = group.creator_id === user?.id;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex justify-between items-start mb-4">
            <button
              onClick={onBack}
              className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors"
            >
              <ArrowLeft size={20} />
              Back to Group
            </button>
            
            {/* Top Save Button - Only show for basic and privacy tabs */}
            {(activeTab === 'basic' || activeTab === 'privacy') && (
              <button 
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-6 py-3 rounded-lg font-semibold bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                <Save size={16} />
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            )}
          </div>
          
          {message && (
            <div className={`mb-4 p-3 rounded-lg ${
              message.includes('Error') || message.includes('Failed')
                ? 'bg-red-50 border border-red-200 text-red-700'
                : 'bg-green-50 border border-green-200 text-green-700'
            } text-sm`}>
              {message}
            </div>
          )}
          
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Group Settings</h1>
            <p className="text-slate-600">Manage your group settings and members</p>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Navigation Tabs */}
        <div className="flex gap-6 mb-6 border-b border-slate-200">
          <button
            onClick={() => setActiveTab('basic')}
            className={`pb-3 px-1 text-sm font-semibold transition-colors flex items-center gap-2 ${
              activeTab === 'basic'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Info size={16} />
            Basic Information
          </button>
          <button
            onClick={() => setActiveTab('privacy')}
            className={`pb-3 px-1 text-sm font-semibold transition-colors flex items-center gap-2 ${
              activeTab === 'privacy'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Shield size={16} />
            Privacy
          </button>
          <button
            onClick={() => setActiveTab('members')}
            className={`pb-3 px-1 text-sm font-semibold transition-colors flex items-center gap-2 ${
              activeTab === 'members'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Users size={16} />
            Member Management
          </button>
        </div>

        {/* Basic Information Tab */}
        {activeTab === 'basic' && (
          <div className="space-y-6">
            {/* Group Details Form */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Group Details</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block mb-1 font-semibold text-sm text-slate-700">
                    Group Name *
                  </label>
                  <input 
                    type="text" 
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className="w-full p-3 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10"
                    placeholder="Enter your startup name" 
                    required 
                  />
                </div>
                
                <div>
                  <label className="block mb-1 font-semibold text-sm text-slate-700">
                    Description *
                  </label>
                  <textarea 
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    className="w-full p-3 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 resize-vertical min-h-[100px]"
                    placeholder="Describe your startup idea, vision, and goals..." 
                    required 
                  />
                </div>
                
                <div>
                  <label className="block mb-1 font-semibold text-sm text-slate-700">
                    Tags
                  </label>
                  <input 
                    type="text" 
                    name="tags"
                    value={formData.tags}
                    onChange={handleInputChange}
                    className="w-full p-3 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10"
                    placeholder="e.g., AI, SaaS, Mobile App (comma-separated)" 
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block mb-1 font-semibold text-sm text-slate-700">
                      Max Co-founders *
                    </label>
                    <input 
                      type="number" 
                      name="max_members"
                      value={formData.max_members}
                      onChange={handleInputChange}
                      className="w-full p-3 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10"
                      placeholder="e.g., 5" 
                      min="2" 
                      max="1000" 
                      required 
                    />
                  </div>
                  
                  <div>
                    <label className="block mb-1 font-semibold text-sm text-slate-700">
                      Equity Available % *
                    </label>
                    <input 
                      type="number" 
                      name="equity_available"
                      value={formData.equity_available}
                      onChange={handleInputChange}
                      className="w-full p-3 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10"
                      placeholder="e.g., 20" 
                      min="1" 
                      max="100" 
                      required 
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block mb-1 font-semibold text-sm text-slate-700">
                      Funding Required ($) *
                    </label>
                    <input 
                      type="text" 
                      name="funding_needed"
                      value={formData.funding_needed}
                      onChange={handleInputChange}
                      className="w-full p-3 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10"
                      placeholder="e.g., $250K or 250000" 
                      required 
                    />
                  </div>
                  
                  <div>
                    <label className="block mb-1 font-semibold text-sm text-slate-700">
                      Industry *
                    </label>
                    <select 
                      name="industry"
                      value={formData.industry}
                      onChange={handleInputChange}
                      className="w-full p-3 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10" 
                      required
                    >
                      <option value="">Select industry</option>
                      {['Technology', 'Healthcare', 'Finance', 'Education', 'Retail', 'Manufacturing', 'Construction', 'Automotive', 'Restaurants', 'Hotels', 'Real Estate', 'Beauty', 'Cleaning', 'Consulting', 'Legal', 'Accounting', 'Marketing', 'Media', 'Government', 'Agriculture', 'Energy', 'Transportation', 'Music', 'Arts', 'Design', 'Other'].map(industry => (
                        <option key={industry} value={industry}>{industry}</option>
                      ))}
                    </select>
                  </div>
                </div>
                
                <div>
                  <label className="block mb-1 font-semibold text-sm text-slate-700">
                    Stage *
                  </label>
                  <select 
                    name="stage"
                    value={formData.stage}
                    onChange={handleInputChange}
                    className="w-full p-3 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10" 
                    required
                  >
                    <option value="">Select stage</option>
                    <option value="pre-incorporation">Pre-incorporation Stage</option>
                    <option value="funding">Funding Stage</option>
                  </select>
                </div>
                
                <div>
                  <label className="block mb-1 font-semibold text-sm text-slate-700">
                    Location Preference *
                  </label>
                  <select 
                    name="location_type"
                    value={formData.location_type}
                    onChange={handleInputChange}
                    className="w-full p-3 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10" 
                    required
                  >
                    <option value="worldwide">Worldwide (co-founders can be from anywhere)</option>
                    <option value="location_based">Location-based startup (specific country/city)</option>
                  </select>
                </div>
                
                {formData.location_type === 'location_based' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block mb-1 font-semibold text-sm text-slate-700">
                        Country *
                      </label>
                      <input 
                        type="text" 
                        name="country"
                        value={formData.country}
                        onChange={handleInputChange}
                        className="w-full p-3 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10"
                        placeholder="e.g., United States" 
                        required={formData.location_type === 'location_based'}
                      />
                    </div>
                    
                    <div>
                      <label className="block mb-1 font-semibold text-sm text-slate-700">
                        City *
                      </label>
                      <input 
                        type="text" 
                        name="city"
                        value={formData.city}
                        onChange={handleInputChange}
                        className="w-full p-3 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10"
                        placeholder="e.g., San Francisco" 
                        required={formData.location_type === 'location_based'}
                      />
                    </div>
                  </div>
                )}

                {/* Organisation Section */}
                <div className="border-t border-slate-200 pt-4">
                  <h4 className="font-bold text-sm text-slate-900 mb-1">Organisation</h4>
                  <p className="text-xs text-slate-500 mb-3">
                    Tell potential co-founders what type of venture you are creating and what organisation structure you are considering.
                  </p>

                  <label className="block mb-1 font-semibold text-sm text-slate-700">
                    Organisation Type *
                  </label>
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <button
                      type="button"
                      onClick={() => handleOrgTypeClick('for_profit')}
                      className={`flex items-center gap-2 p-3 rounded-lg border-2 transition-all text-sm font-medium ${
                        formData.organisation_type === 'for_profit'
                          ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                          : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                      }`}
                    >
                      <Coins size={18} className="shrink-0" />
                      For-profit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOrgTypeClick('non_profit')}
                      className={`flex items-center gap-2 p-3 rounded-lg border-2 transition-all text-sm font-medium ${
                        formData.organisation_type === 'non_profit'
                          ? 'border-teal-500 bg-teal-50 text-teal-700'
                          : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                      }`}
                    >
                      <Sprout size={18} className="shrink-0" />
                      Non-profit
                    </button>
                  </div>

                  {(formData.organisation_type === 'for_profit' || formData.organisation_type === 'non_profit') && (
                    <div>
                      <label className="block mb-1 font-semibold text-sm text-slate-700">
                        {formData.organisation_type === 'for_profit' ? 'For-profit' : 'Non-profit'} Organisation Structure *
                      </label>
                      <select
                        name="legal_structure"
                        value={formData.legal_structure}
                        onChange={handleInputChange}
                        className="w-full p-3 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10"
                        required
                      >
                        {getStructuresForProfitStatus(formData.organisation_type).map(opt => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                      <p className="text-xs text-slate-500 mt-1">
                        You can change this later as your startup develops.
                      </p>
                    </div>
                  )}

                  {formData.organisation_type === 'non_profit' && parseInt(formData.equity_available) > 0 && (
                    <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
                      Some non-profit structures may not use conventional equity ownership. Make sure your proposed structure is appropriate for your organisation and jurisdiction.
                    </div>
                  )}

                  <p className="text-xs text-slate-500 mt-2">
                    Organisation structures vary by country. These options are provided for general planning purposes and are not legal advice. Please check the requirements in your country before forming an organisation.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="is_public"
                    name="is_public"
                    checked={formData.is_public}
                    onChange={handleInputChange}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <label htmlFor="is_public" className="text-sm text-slate-700">
                    Make this group publicly visible
                  </label>
                </div>
              </div>

              <div className="flex justify-end pt-6 border-t border-slate-200 mt-6">
                <button 
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center gap-2 px-6 py-3 rounded-lg font-semibold bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  <Save size={16} />
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>

            {/* Danger Zone - Now in Basic Information */}
            {isCreator && (
              <div className="bg-white rounded-xl p-6 shadow-sm border border-red-200">
                <div className="flex items-center gap-2 mb-4">
                  <AlertTriangle size={20} className="text-red-600" />
                  <h3 className="text-lg font-semibold text-red-900">Danger Zone</h3>
                </div>
                
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                  <h4 className="font-semibold text-red-900 mb-2">Delete Group</h4>
                  <p className="text-sm text-red-700 mb-4">
                    Once you delete this group, there is no going back. This action cannot be undone.
                    All group data, members, and discussions will be permanently removed.
                  </p>
                  
                  {!showDeleteConfirm ? (
                    <button
                      onClick={() => setShowDeleteConfirm(true)}
                      className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-semibold"
                    >
                      <Trash2 size={16} />
                      Delete Group
                    </button>
                  ) : (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-semibold text-red-900 mb-2">
                          Type "{group.name}" to confirm deletion:
                        </label>
                        <input
                          type="text"
                          value={deleteConfirmText}
                          onChange={(e) => setDeleteConfirmText(e.target.value)}
                          className="w-full p-3 border border-red-300 rounded-lg focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/10"
                          placeholder={group.name}
                        />
                      </div>
                      
                      <div className="flex gap-3">
                        <button
                          onClick={handleDeleteGroup}
                          disabled={deleteConfirmText !== group.name || deleting}
                          className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Trash2 size={16} />
                          {deleting ? 'Deleting...' : 'I understand, delete this group'}
                        </button>
                        <button
                          onClick={() => {
                            setShowDeleteConfirm(false);
                            setDeleteConfirmText('');
                          }}
                          className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors font-semibold"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Privacy Tab */}
        {activeTab === 'privacy' && (
          <div className="space-y-6">
            {/* Privacy Settings */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
              <div className="flex items-center gap-2 mb-6">
                <Shield size={20} className="text-blue-600" />
                <h3 className="text-lg font-semibold text-slate-900">Group Privacy</h3>
              </div>
              
              <p className="text-slate-600 mb-6">
                Control who can see your group's content and member information.
              </p>

              <div className="space-y-4">
                {/* Public Option */}
                <div 
                  className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                    formData.is_public 
                      ? 'border-green-500 bg-green-50' 
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                  onClick={() => setFormData(prev => ({ ...prev, is_public: true }))}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex items-center mt-1">
                      <input
                        type="radio"
                        name="privacy"
                        checked={formData.is_public}
                        onChange={() => setFormData(prev => ({ ...prev, is_public: true }))}
                        className="w-4 h-4 text-green-600 border-slate-300 focus:ring-green-500"
                      />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Globe size={18} className="text-green-600" />
                        <h4 className="font-semibold text-slate-900">Public</h4>
                      </div>
                      <p className="text-sm text-slate-600 leading-relaxed">
                        This group's content, including its members and event details, is visible to the public.
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs font-medium">
                          Discoverable in search
                        </span>
                        <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs font-medium">
                          Public member list
                        </span>
                        <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs font-medium">
                          Visible group details
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Private Option */}
                <div 
                  className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                    !formData.is_public 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                  onClick={() => setFormData(prev => ({ ...prev, is_public: false }))}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex items-center mt-1">
                      <input
                        type="radio"
                        name="privacy"
                        checked={!formData.is_public}
                        onChange={() => setFormData(prev => ({ ...prev, is_public: false }))}
                        className="w-4 h-4 text-blue-600 border-slate-300 focus:ring-blue-500"
                      />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Lock size={18} className="text-blue-600" />
                        <h4 className="font-semibold text-slate-900">Private</h4>
                      </div>
                      <p className="text-sm text-slate-600 leading-relaxed">
                        Only members of this group can see its full content, including details about its members and events. Some information about the group is public.
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium">
                          Hidden member list
                        </span>
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium">
                          Private discussions
                        </span>
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium">
                          Basic info visible
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Additional Privacy Info */}
              <div className="mt-6 p-4 bg-slate-50 rounded-lg border border-slate-200">
                <h5 className="font-semibold text-slate-900 mb-2">What's always visible:</h5>
                <ul className="text-sm text-slate-600 space-y-1">
                  <li>• Group name and description</li>
                  <li>• Industry and stage information</li>
                  <li>• Equity and funding details</li>
                  <li>• Location (if specified)</li>
                  <li>• Number of members (but not their identities for private groups)</li>
                </ul>
              </div>

              <div className="flex justify-end pt-6 border-t border-slate-200 mt-6">
                <button 
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center gap-2 px-6 py-3 rounded-lg font-semibold bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  <Save size={16} />
                  {saving ? 'Saving Privacy Settings...' : 'Save Privacy Settings'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Member Management Tab */}
        {activeTab === 'members' && (
          <div className="space-y-6">
            {/* Pending Member Requests */}
            {formData.require_approval && (
              <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
                <h3 className="text-lg font-semibold text-slate-900 mb-4">
                  Pending Member Requests ({pendingMembers.length})
                </h3>
                
                {pendingMembers.length === 0 ? (
                  <div className="text-center py-8">
                    <Users size={48} className="text-slate-300 mx-auto mb-4" />
                    <p className="text-slate-500">No pending requests</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {pendingMembers.map((member) => (
                      <div key={member.id} className="flex items-center justify-between p-4 border border-orange-200 bg-orange-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-red-600 rounded-full flex items-center justify-center">
                            <span className="text-white font-semibold">
                              {member.profile?.username?.charAt(0)?.toUpperCase() || 'M'}
                            </span>
                          </div>
                          <div>
                            <h4 className="font-semibold text-slate-900">
                              {member.profile?.username || 'Unknown User'}
                            </h4>
                            <p className="text-sm text-slate-600">
                              Applied {new Date(member.joined_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleApproveMember(member.id)}
                            className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-semibold hover:bg-green-700 transition-colors"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleRejectMember(member.id)}
                            className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-semibold hover:bg-red-700 transition-colors"
                          >
                            Reject
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Member Settings */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Member Settings</h3>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border border-slate-200 rounded-lg">
                  <div>
                    <h4 className="font-semibold text-slate-900 mb-1">Require approval for new members</h4>
                    <p className="text-sm text-slate-600">
                      When enabled, new members will need approval from an admin before they can join the group.
                    </p>
                  </div>
                  <div className="flex items-center">
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        name="require_approval"
                        checked={formData.require_approval}
                        onChange={handleInputChange}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end pt-4 border-t border-slate-200 mt-4">
                <button 
                  onClick={handleSave}
                  disabled={saving || uploadingImage}
                  className="flex items-center gap-2 px-6 py-3 rounded-lg font-semibold bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  <Save size={16} />
                  {uploadingImage ? 'Uploading Image...' : saving ? 'Saving...' : 'Save Settings'}
                </button>
              </div>
            </div>

            {/* Group Members */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">
                Approved Members ({approvedMembers.length})
              </h3>
              
              {approvedMembers.length === 0 ? (
                <div className="text-center py-8">
                  <Users size={48} className="text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-500">No approved members found</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {approvedMembers.map((member) => (
                    <div key={member.id} className="flex items-center justify-between p-4 border border-slate-200 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                          <span className="text-white font-semibold">
                            {member.profile?.username?.charAt(0)?.toUpperCase() || 'M'}
                          </span>
                        </div>
                        <div>
                          <h4 className="font-semibold text-slate-900">
                            {member.profile?.username || 'Unknown User'}
                          </h4>
                          <p className="text-sm text-slate-600">
                            {member.user_id === group?.creator_id ? 'Starter' : (member.role === 'starter' ? 'Starter' : member.role.charAt(0).toUpperCase() + member.role.slice(1))} • Joined {new Date(member.joined_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      
                      {isCreator && member.user_id !== user?.id && (
                        <div className="flex items-center gap-2">
                          {member.user_id === group?.creator_id || member.role === 'starter' ? (
                            <div className="flex items-center gap-2">
                              <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded text-sm font-semibold">
                                Starter (Protected)
                              </span>
                            </div>
                          ) : (
                            <>
                              <select
                                value={member.role}
                                onChange={(e) => handleChangeRole(member.id, e.target.value as 'admin' | 'member' | 'cofounder')}
                                className="px-3 py-1 border border-slate-300 rounded text-sm focus:outline-none focus:border-blue-500"
                              >
                                <option value="member">Member</option>
                                <option value="cofounder">Cofounder</option>
                                <option value="admin">Admin</option>
                              </select>
                              <button
                                onClick={() => handleRemoveMember(member.id)}
                                className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700 transition-colors"
                              >
                                Remove
                              </button>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Remove Member Confirmation Modal */}
      <ConfirmationModal
        isOpen={showRemoveConfirm}
        onClose={() => {
          setShowRemoveConfirm(false);
          setMemberToRemove(null);
        }}
        onConfirm={handleConfirmRemoveMember}
        title="Remove Member"
        message={removeConfirmMessage}
        confirmText="Yes, Remove Member"
        cancelText="Cancel"
        isDestructive={true}
        loading={removing}
      />
    </div>
  );
};

export default GroupSettingsPage;