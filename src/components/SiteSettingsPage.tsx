import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Upload, Image, Trash2, Save, Camera, AlertTriangle, CheckCircle, Settings, BellRing, MessageSquare, X, Bot } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { siteSettingsAPI } from '../lib/siteSettingsApi';
import BlogContentManager from './BlogContentManager';

interface SiteSettingsPageProps {
  onBack: () => void;
}

const SiteSettingsPage: React.FC<SiteSettingsPageProps> = ({ onBack }) => {
  const { user } = useAuth();
  const [currentLogoUrl, setCurrentLogoUrl] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [initialLogoLoaded, setInitialLogoLoaded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error' | 'info'>('info');
  const [isAdmin, setIsAdmin] = useState(false);
  const [announcementText, setAnnouncementText] = useState('');
  const [announcementEnabled, setAnnouncementEnabled] = useState(false);
  const [savingAnnouncement, setSavingAnnouncement] = useState(false);
  const [importantMessageText, setImportantMessageText] = useState('');
  const [importantMessageEnabled, setImportantMessageEnabled] = useState(false);
  const [savingImportantMessage, setSavingImportantMessage] = useState(false);
  const [aiSupportEnabled, setAiSupportEnabled] = useState(true);
  const [savingAiSupport, setSavingAiSupport] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    checkAdminStatus();
    fetchSiteSettings();
    
    // Listen for logo updates from other parts of the app
    const handleLogoUpdate = (event: CustomEvent) => {
      console.log('SiteSettingsPage: Logo update event received:', event.detail);
      const newLogoUrl = event.detail.logoUrl;
      setCurrentLogoUrl(newLogoUrl);
      if (!selectedFile) {
        setImagePreview(newLogoUrl);
      }
    };

    const handleAnnouncementUpdate = (event: CustomEvent) => {
      console.log('SiteSettingsPage: Announcement update event received:', event.detail);
      setAnnouncementText(event.detail.text || '');
      setAnnouncementEnabled(event.detail.enabled);
    };

    const handleImportantMessageUpdate = (event: CustomEvent) => {
      console.log('SiteSettingsPage: Important message update event received:', event.detail);
      setImportantMessageText(event.detail.text || '');
      setImportantMessageEnabled(event.detail.enabled);
    };

    window.addEventListener('logoUpdated', handleLogoUpdate as EventListener);
    window.addEventListener('announcementUpdated', handleAnnouncementUpdate as EventListener);
    window.addEventListener('importantMessageUpdated', handleImportantMessageUpdate as EventListener);
    
    return () => {
      window.removeEventListener('logoUpdated', handleLogoUpdate as EventListener);
      window.removeEventListener('announcementUpdated', handleAnnouncementUpdate as EventListener);
      window.removeEventListener('importantMessageUpdated', handleImportantMessageUpdate as EventListener);
    };
  }, []);

  const checkAdminStatus = async () => {
    try {
      const adminStatus = await siteSettingsAPI.isCurrentUserSiteAdmin();
      setIsAdmin(adminStatus);
      
      if (!adminStatus) {
        setMessage('Access denied. Only site administrators can manage site settings.');
        setMessageType('error');
      }
    } catch (error) {
      console.error('Error checking admin status:', error);
      setMessage('Error verifying administrator privileges.');
      setMessageType('error');
    }
  };

  const fetchSiteSettings = async () => {
    try {
      setLoading(true);
      const [logoUrl, announcementSettings, importantMessageSettings, aiEnabled] = await Promise.all([
        siteSettingsAPI.getLogoUrl(),
        siteSettingsAPI.getAnnouncementSettings(),
        siteSettingsAPI.getImportantMessageSettings(),
        siteSettingsAPI.getAiSupportEnabled()
      ]);
      setAiSupportEnabled(aiEnabled);
      
      console.log('SiteSettingsPage: Fetched logo URL:', logoUrl);
      setCurrentLogoUrl(logoUrl);
      setAnnouncementText(announcementSettings.text || '');
      setAnnouncementEnabled(announcementSettings.enabled);
      setImportantMessageText(importantMessageSettings.text || '');
      setImportantMessageEnabled(importantMessageSettings.enabled);
      
      if (!selectedFile && !initialLogoLoaded) {
        setImagePreview(logoUrl);
        setInitialLogoLoaded(true);
      }
    } catch (error) {
      console.error('Error fetching site settings:', error);
      setMessage('Error loading site settings.');
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    console.log('File selected:', file);
    if (!file) return;

    // Validate file type
    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml'];
    if (!validTypes.includes(file.type)) {
      setMessage('Invalid file type. Please upload PNG, JPG, or SVG files only.');
      setMessageType('error');
      return;
    }

    // Validate file size (5MB limit)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      setMessage('File size must be less than 5MB.');
      setMessageType('error');
      return;
    }

    setSelectedFile(file);
    setMessage('');

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      console.log('File reader onload triggered');
      setImagePreview(e.target?.result as string);
      console.log('Image preview set to:', e.target?.result);
    };
    reader.readAsDataURL(file);
  };

  const handleUploadLogo = async () => {
    console.log('Upload logo started, selectedFile:', selectedFile);
    if (!selectedFile || !isAdmin) return;

    try {
      setUploading(true);
      setMessage('');
      
      console.log('Calling siteSettingsAPI.uploadLogo...');
      const logoUrl = await siteSettingsAPI.uploadLogo(selectedFile);
      console.log('Upload successful, logoUrl:', logoUrl);
      
      // Update local state
      setCurrentLogoUrl(logoUrl);
      setSelectedFile(null);
      setImagePreview(logoUrl);
      console.log('Local state updated, imagePreview set to:', logoUrl);
      
      setMessage('Logo uploaded successfully!');
      setMessageType('success');
      
      // Small delay before triggering logo update event
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Trigger a custom event to notify App.tsx to refresh the logo
      window.dispatchEvent(new CustomEvent('logoUpdated', { detail: { logoUrl } }));
      console.log('Logo update event dispatched');
      
      setTimeout(() => setMessage(''), 5000);
    } catch (error: any) {
      console.error('Error uploading logo:', error);
      setMessage(error.message || 'Error uploading logo. Please try again.');
      setMessageType('error');
      setTimeout(() => setMessage(''), 5000);
    } finally {
      setUploading(false);
      console.log('Upload process completed');
    }
  };

  const handleRemoveLogo = async () => {
    if (!isAdmin) return;

    if (!confirm('Are you sure you want to remove the current logo? This action cannot be undone.')) {
      return;
    }

    try {
      setRemoving(true);
      setMessage('');
      
      await siteSettingsAPI.removeLogo();
      
      // Update local state
      setCurrentLogoUrl(null);
      setImagePreview(null);
      setSelectedFile(null);
      setInitialLogoLoaded(false);
      
      setMessage('Logo removed successfully!');
      setMessageType('success');
      
      // Trigger a custom event to notify App.tsx to refresh the logo
      window.dispatchEvent(new CustomEvent('logoUpdated', { detail: { logoUrl: null } }));
      
      setTimeout(() => setMessage(''), 5000);
    } catch (error: any) {
      console.error('Error removing logo:', error);
      setMessage(error.message || 'Error removing logo. Please try again.');
      setMessageType('error');
      setTimeout(() => setMessage(''), 5000);
    } finally {
      setRemoving(false);
    }
  };

  const handleSaveAnnouncement = async () => {
    if (!isAdmin) return;

    try {
      setSavingAnnouncement(true);
      setMessage('');
      
      await siteSettingsAPI.updateAnnouncementSettings(announcementText.trim() || null, announcementEnabled);
      
      setMessage('Announcement settings updated successfully!');
      setMessageType('success');
      
      // Trigger a custom event to notify App.tsx to refresh the announcement
      window.dispatchEvent(new CustomEvent('announcementUpdated', { 
        detail: { text: announcementText.trim() || null, enabled: announcementEnabled } 
      }));
      
      setTimeout(() => setMessage(''), 5000);
    } catch (error: any) {
      console.error('Error updating announcement settings:', error);
      setMessage(error.message || 'Error updating announcement settings. Please try again.');
      setMessageType('error');
      setTimeout(() => setMessage(''), 5000);
    } finally {
      setSavingAnnouncement(false);
    }
  };

  const handleSaveImportantMessage = async () => {
    if (!isAdmin) return;

    try {
      setSavingImportantMessage(true);
      setMessage('');
      
      await siteSettingsAPI.updateImportantMessageSettings(importantMessageText.trim() || null, importantMessageEnabled);
      
      setMessage('Important message settings updated successfully!');
      setMessageType('success');
      
      window.dispatchEvent(new CustomEvent('importantMessageUpdated', { 
        detail: { text: importantMessageText.trim() || null, enabled: importantMessageEnabled } 
      }));
      
      setTimeout(() => setMessage(''), 5000);
    } catch (error: any) {
      console.error('Error updating important message settings:', error);
      setMessage(error.message || 'Error updating important message settings. Please try again.');
      setMessageType('error');
      setTimeout(() => setMessage(''), 5000);
    } finally {
      setSavingImportantMessage(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading site settings...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center max-w-md">
          <AlertTriangle size={48} className="text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-900 mb-2">Access Denied</h2>
          <p className="text-slate-600 mb-4">
            Only site administrators can access site settings. Please contact an administrator if you need to make changes.
          </p>
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

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors mb-4"
          >
            <ArrowLeft size={18} />
            Back to Home
          </button>
          
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <Settings size={20} className="text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Site Settings</h1>
              <p className="text-slate-600">Manage your site's appearance and branding</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Message Display */}
        {message && (
          <div className={`mb-6 p-4 rounded-lg border ${
            messageType === 'success' 
              ? 'bg-green-50 border-green-200 text-green-700'
              : messageType === 'error'
              ? 'bg-red-50 border-red-200 text-red-700'
              : 'bg-blue-50 border-blue-200 text-blue-700'
          }`}>
            <div className="flex items-center gap-2">
              {messageType === 'success' && <CheckCircle size={16} />}
              {messageType === 'error' && <AlertTriangle size={16} />}
              <span className="text-sm font-medium">{message}</span>
            </div>
          </div>
        )}

        {/* Logo Management Section */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-red-600 rounded-lg flex items-center justify-center">
              <Image size={16} className="text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">Site Logo</h2>
              <p className="text-slate-600">Upload and manage your site's logo</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Current Logo Display */}
            <div>
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Current Logo</h3>
              
              <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 bg-slate-50">
                <div className="text-center">
                  {imagePreview ? (
                    <div className="space-y-4">
                      <img
                        src={imagePreview}
                        alt="Site Logo"
                        className="max-w-full max-h-36 mx-auto object-contain"
                        onError={() => {
                          console.warn('Logo failed to load in Current Logo section. URL was:', imagePreview);
                          console.warn('This indicates a storage policy issue. The site-logos bucket needs public read access.');
                          console.warn('To fix: Go to Supabase Dashboard → Storage → site-logos → Policies');
                          console.warn('Create a policy: SELECT for anon role with condition: bucket_id = \'site-logos\'');
                        }}
                        onLoad={() => {
                          console.log('Logo loaded successfully in Current Logo section:', imagePreview);
                        }}
                      />
                      <p className="text-sm text-slate-600">Current site logo</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="w-16 h-16 bg-slate-200 rounded-lg mx-auto flex items-center justify-center">
                        <Image size={24} className="text-slate-400" />
                      </div>
                      <div>
                        <p className="text-lg font-semibold text-slate-900 mb-1">No Logo</p>
                        <p className="text-sm text-slate-600">Upload a logo to customize your site's branding</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Header Preview */}
              <div className="mt-6">
                <h4 className="text-md font-semibold text-slate-900 mb-3">Header Preview</h4>
                <div className="border border-slate-200 rounded-lg p-4 bg-white">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      {imagePreview ? (
                        <img
                          src={imagePreview}
                          alt="EquityTake Logo"
                          className="h-24 max-w-[432px] object-contain mr-4"
                          onError={() => {
                            console.warn('Logo failed to load in Header Preview. URL was:', imagePreview);
                            console.warn('This indicates a storage policy issue. The site-logos bucket needs public read access.');
                          }}
                          onLoad={() => {
                            console.log('Logo loaded successfully in Header Preview:', imagePreview);
                          }}
                        />
                      ) : (
                        <span className="text-xl font-semibold text-slate-400 mr-4">
                          No Logo
                        </span>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <span className="px-3 py-1 bg-slate-100 rounded text-sm text-slate-600">Sign In</span>
                      <span className="px-3 py-1 bg-orange-600 text-white rounded text-sm">Get Started</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Upload Section */}
            <div>
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Upload New Logo</h3>
              
              {/* File Upload Area */}
              <div 
                className="border-2 border-dashed border-blue-300 rounded-lg p-6 bg-blue-50 hover:bg-blue-100 transition-colors cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="text-center">
                  <div className="w-12 h-12 bg-blue-600 rounded-lg mx-auto mb-4 flex items-center justify-center">
                    <Upload size={20} className="text-white" />
                  </div>
                  <h4 className="text-lg font-semibold text-slate-900 mb-2">
                    {selectedFile ? 'File Selected' : 'Upload Logo'}
                  </h4>
                  <p className="text-sm text-slate-600 mb-2">
                    {selectedFile ? selectedFile.name : 'Click to browse or drag and drop'}
                  </p>
                  <p className="text-xs text-slate-500">
                    PNG, JPG, or SVG • Max 5MB • Recommended: 180×60px
                  </p>
                  {selectedFile && (
                    <div className="mt-2 text-xs text-blue-600">
                      Size: {formatFileSize(selectedFile.size)}
                    </div>
                  )}
                </div>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/jpg,image/svg+xml"
                onChange={handleFileSelect}
                className="hidden"
              />

              {/* Selected File Preview */}
              {selectedFile && imagePreview && (
                <div className="mt-4 p-4 border border-slate-200 rounded-lg bg-white">
                  <h4 className="text-md font-semibold text-slate-900 mb-3">Preview</h4>
                  <div className="flex items-center justify-center p-4 bg-slate-50 rounded-lg">
                    <img
                      src={imagePreview}
                      alt="Logo Preview"
                      className="max-h-36 max-w-[432px] object-contain"
                      onError={() => {
                        console.warn('Logo failed to load in Selected File Preview. URL was:', imagePreview);
                        console.warn('This indicates a storage policy issue. The site-logos bucket needs public read access.');
                      }}
                      onLoad={() => {
                        console.log('Logo loaded successfully in Selected File Preview:', imagePreview);
                      }}
                    />
                  </div>
                  <div className="mt-3 text-center">
                    <p className="text-sm text-slate-600">
                      This is how your logo will appear in the header
                    </p>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="mt-6 space-y-3">
                {selectedFile && (
                  <button
                    onClick={handleUploadLogo}
                    disabled={uploading}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {uploading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        Uploading Logo...
                      </>
                    ) : (
                      <>
                        <Save size={16} />
                        Save New Logo
                      </>
                    )}
                  </button>
                )}

                {currentLogoUrl && (
                  <button
                    onClick={handleRemoveLogo}
                    disabled={removing}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {removing ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        Removing Logo...
                      </>
                    ) : (
                      <>
                        <Trash2 size={16} />
                        Remove Current Logo
                      </>
                    )}
                  </button>
                )}

                {selectedFile && (
                  <button
                    onClick={() => {
                      setSelectedFile(null);
                      setImagePreview(currentLogoUrl);
                      setMessage('');
                    }}
                    className="w-full px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors font-medium"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Guidelines */}
          <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h4 className="font-semibold text-blue-900 mb-3">Logo Guidelines</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-blue-800">
              <div>
                <h5 className="font-medium mb-2">Recommended Specifications:</h5>
                <ul className="space-y-1">
                  <li>• Format: PNG with transparent background</li>
                  <li>• Dimensions: 180×60px (or proportional)</li>
                  <li>• File size: Under 1MB for best performance</li>
                  <li>• Resolution: High-DPI ready (2x scale)</li>
                </ul>
              </div>
              <div>
                <h5 className="font-medium mb-2">Design Tips:</h5>
                <ul className="space-y-1">
                  <li>• Use high contrast for readability</li>
                  <li>• Avoid very thin lines or small text</li>
                  <li>• Test on both light and dark backgrounds</li>
                  <li>• Keep it simple and recognizable</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Responsive Preview */}
          <div className="mt-8">
            <h4 className="text-lg font-semibold text-slate-900 mb-4">Responsive Preview</h4>
            <div className="space-y-4">
              {/* Desktop Preview */}
              <div>
                <h5 className="text-sm font-medium text-slate-700 mb-2">Desktop (max 180×60px)</h5>
                <div className="border border-slate-200 rounded-lg p-4 bg-white">
                  <div className="flex items-center">
                    {imagePreview ? (
                      <img
                        src={imagePreview}
                        alt="Desktop Logo Preview"
                        className="h-32 max-w-[576px] object-contain"
                        onError={() => {
                          console.warn('Logo failed to load in Desktop Preview. URL was:', imagePreview);
                          console.warn('This indicates a storage policy issue. The site-logos bucket needs public read access.');
                        }}
                        onLoad={() => {
                          console.log('Logo loaded successfully in Desktop Preview:', imagePreview);
                        }}
                      />
                    ) : (
                      <span className="text-xl font-semibold text-slate-400">
                        No Logo
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Tablet Preview */}
              <div>
                <h5 className="text-sm font-medium text-slate-700 mb-2">Tablet (max 120px width)</h5>
                <div className="border border-slate-200 rounded-lg p-4 bg-white">
                  <div className="flex items-center">
                    {imagePreview ? (
                      <img
                        src={imagePreview}
                        alt="Tablet Logo Preview"
                        className="h-28 max-w-[432px] object-contain"
                        onError={() => {
                          console.warn('Logo failed to load in Tablet Preview. URL was:', imagePreview);
                          console.warn('This indicates a storage policy issue. The site-logos bucket needs public read access.');
                        }}
                        onLoad={() => {
                          console.log('Logo loaded successfully in Tablet Preview:', imagePreview);
                        }}
                      />
                    ) : (
                      <span className="text-lg font-semibold text-slate-400">
                        No Logo
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Mobile Preview */}
              <div>
                <h5 className="text-sm font-medium text-slate-700 mb-2">Mobile (max 80px width)</h5>
                <div className="border border-slate-200 rounded-lg p-4 bg-white">
                  <div className="flex items-center">
                    {imagePreview ? (
                      <img
                        src={imagePreview}
                        alt="Mobile Logo Preview"
                        className="h-20 max-w-[288px] object-contain"
                        onError={() => {
                          console.warn('Logo failed to load in Mobile Preview. URL was:', imagePreview);
                          console.warn('This indicates a storage policy issue. The site-logos bucket needs public read access.');
                        }}
                        onLoad={() => {
                          console.log('Logo loaded successfully in Mobile Preview:', imagePreview);
                        }}
                      />
                    ) : (
                      <span className="text-base font-semibold text-slate-400">
                        No Logo
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Site Announcement Section */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg flex items-center justify-center">
              <BellRing size={16} className="text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">Site Announcement Banner</h2>
              <p className="text-slate-600">Configure a site-wide announcement for non-subscribers</p>
            </div>
          </div>

          <div className="space-y-6">
            {/* Announcement Text Input */}
            <div>
              <label htmlFor="announcementText" className="block mb-2 font-semibold text-sm text-slate-700">
                Announcement Text
              </label>
              <textarea
                id="announcementText"
                value={announcementText}
                onChange={(e) => setAnnouncementText(e.target.value)}
                maxLength={70}
                rows={2}
                className="w-full p-3 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 resize-none"
                placeholder="Enter your announcement here..."
              />
              <div className="flex justify-between items-center mt-1">
                <span className="text-xs text-slate-500">
                  This message will appear at the top of the page for non-subscribers
                </span>
                <span className="text-xs text-slate-500">
                  {announcementText.length}/70 characters
                </span>
              </div>
            </div>

            {/* Enable/Disable Toggle */}
            <div className="flex items-center justify-between p-4 border border-slate-200 rounded-lg">
              <div>
                <h4 className="font-semibold text-slate-900 mb-1">Enable Announcement Banner</h4>
                <p className="text-sm text-slate-600">
                  When enabled, this banner will be visible to non-subscribed users on the homepage
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={announcementEnabled}
                  onChange={(e) => setAnnouncementEnabled(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            {/* Preview */}
            {announcementText && announcementEnabled && (
              <div>
                <h4 className="text-md font-semibold text-slate-900 mb-3">Preview</h4>
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <div className="bg-blue-600 text-white text-center p-2 text-sm font-medium flex items-center justify-center relative">
                    <p className="max-w-full overflow-hidden text-ellipsis whitespace-nowrap px-4">
                      {announcementText}
                    </p>
                    <button className="absolute right-2 top-1/2 transform -translate-y-1/2 text-white hover:text-blue-100 transition-colors p-1 rounded-full">
                      <X size={16} />
                    </button>
                  </div>
                  <div className="p-3 bg-slate-50 text-center text-xs text-slate-600">
                    This is how the announcement will appear to non-subscribers
                  </div>
                </div>
              </div>
            )}

            {/* Visibility Rules */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-semibold text-blue-900 mb-3">Visibility Rules</h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Visible to all users regardless of subscription status</li>
                <li>• Visible to both authenticated and unauthenticated users</li>
                <li>• Users can dismiss the banner for their current session</li>
                <li>• Banner reappears when announcement text is updated</li>
              </ul>
            </div>

            {/* Save Button */}
            <div className="flex justify-end pt-4 border-t border-slate-200">
              <button
                onClick={handleSaveAnnouncement}
                disabled={savingAnnouncement}
                className="flex items-center gap-2 px-6 py-3 rounded-lg font-semibold bg-purple-600 text-white hover:bg-purple-700 transition-colors disabled:opacity-50"
              >
                {savingAnnouncement ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Saving Announcement...
                  </>
                ) : (
                  <>
                    <Save size={16} />
                    Save Announcement Settings
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Important Message Banner Section */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 bg-gradient-to-br from-slate-500 to-slate-700 rounded-lg flex items-center justify-center">
              <MessageSquare size={16} className="text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">Important Message Banner</h2>
              <p className="text-slate-600">Display a longer message below the announcement banner</p>
            </div>
          </div>

          <div className="space-y-6">
            {/* Important Message Text Input */}
            <div>
              <label htmlFor="importantMessageText" className="block mb-2 font-semibold text-sm text-slate-700">
                Important Message Text
              </label>
              <textarea
                id="importantMessageText"
                value={importantMessageText}
                onChange={(e) => setImportantMessageText(e.target.value)}
                maxLength={400}
                rows={4}
                className="w-full p-3 border border-slate-300 rounded-lg focus:outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-500/10 resize-none"
                placeholder="Enter an important message for your visitors (up to ~60 words)..."
              />
              <div className="flex justify-between items-center mt-1">
                <span className="text-xs text-slate-500">
                  This message appears below the announcement banner with a light grey background
                </span>
                <span className="text-xs text-slate-500">
                  {importantMessageText.length}/400 characters
                </span>
              </div>
            </div>

            {/* Enable/Disable Toggle */}
            <div className="flex items-center justify-between p-4 border border-slate-200 rounded-lg">
              <div>
                <h4 className="font-semibold text-slate-900 mb-1">Enable Important Message Banner</h4>
                <p className="text-sm text-slate-600">
                  When enabled, this message will be visible to all visitors directly below the announcement banner
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={importantMessageEnabled}
                  onChange={(e) => setImportantMessageEnabled(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-slate-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-slate-700"></div>
              </label>
            </div>

            {/* Preview */}
            {importantMessageText && importantMessageEnabled && (
              <div>
                <h4 className="text-md font-semibold text-slate-900 mb-3">Preview</h4>
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <div className="bg-slate-100 text-slate-700 text-center px-4 py-3 text-sm flex items-start justify-center relative border-b border-slate-200">
                    <p className="max-w-3xl leading-relaxed text-left sm:text-center">
                      {importantMessageText}
                    </p>
                    <button className="absolute right-2 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-full">
                      <X size={16} />
                    </button>
                  </div>
                  <div className="p-3 bg-slate-50 text-center text-xs text-slate-600">
                    This is how the important message will appear to visitors
                  </div>
                </div>
              </div>
            )}

            {/* Visibility Rules */}
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
              <h4 className="font-semibold text-slate-700 mb-3">Visibility Rules</h4>
              <ul className="text-sm text-slate-600 space-y-1">
                <li>• Visible to all users regardless of subscription status</li>
                <li>• Visible to both authenticated and unauthenticated users</li>
                <li>• Appears below the announcement banner with a light grey background</li>
                <li>• Users can dismiss the banner for their current session</li>
                <li>• Banner reappears when the message text is updated</li>
              </ul>
            </div>

            {/* Save Button */}
            <div className="flex justify-end pt-4 border-t border-slate-200">
              <button
                onClick={handleSaveImportantMessage}
                disabled={savingImportantMessage}
                className="flex items-center gap-2 px-6 py-3 rounded-lg font-semibold bg-slate-700 text-white hover:bg-slate-800 transition-colors disabled:opacity-50"
              >
                {savingImportantMessage ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Saving Important Message...
                  </>
                ) : (
                  <>
                    <Save size={16} />
                    Save Important Message
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* AI Support Toggle Section */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="flex items-center gap-3 p-6 border-b border-slate-200">
            <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-red-600 rounded-lg flex items-center justify-center">
              <Bot size={20} className="text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">AI Support Chatbot</h2>
              <p className="text-sm text-slate-600">Enable or disable the AI customer support assistant</p>
            </div>
          </div>

          <div className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-700">
                  AI Support Status: <span className={aiSupportEnabled ? 'text-green-600' : 'text-red-600'}>{aiSupportEnabled ? 'Enabled' : 'Disabled'}</span>
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  When disabled, the chat button shows a message directing users to email support.
                </p>
              </div>
              <button
                onClick={async () => {
                  try {
                    setSavingAiSupport(true);
                    const newValue = !aiSupportEnabled;
                    await siteSettingsAPI.toggleAiSupport(newValue);
                    setAiSupportEnabled(newValue);
                    setMessage(`AI support ${newValue ? 'enabled' : 'disabled'} successfully.`);
                    setMessageType('success');
                    setTimeout(() => setMessage(''), 5000);
                  } catch (error: any) {
                    setMessage(error.message || 'Error toggling AI support.');
                    setMessageType('error');
                    setTimeout(() => setMessage(''), 5000);
                  } finally {
                    setSavingAiSupport(false);
                  }
                }}
                disabled={savingAiSupport}
                className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${
                  aiSupportEnabled ? 'bg-green-500' : 'bg-slate-300'
                }`}
              >
                <span
                  className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                    aiSupportEnabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Blog & About Content Management Section */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        <BlogContentManager
          contentType="blog_post"
          title="Blog Posts"
          description="Create and manage blog posts for your site"
        />
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">
        <BlogContentManager
          contentType="about_section"
          title="About Page Sections"
          description="Create and manage content sections for your About page"
        />
      </div>
    </div>
  );
};

export default SiteSettingsPage;