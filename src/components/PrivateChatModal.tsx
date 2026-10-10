import React, { useState, useEffect } from 'react';
import { X, MessageSquare } from 'lucide-react';
import ChatWindow from './chat/ChatWindow';
import { chatAPI, Conversation } from '../lib/chatApi';

interface PrivateChatModalProps {
  targetUserId: string;
  targetUsername: string;
  onClose: () => void;
}

const PrivateChatModal: React.FC<PrivateChatModalProps> = ({
  targetUserId,
  targetUsername,
  onClose,
}) => {
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initPrivateChat = async () => {
      try {
        setLoading(true);
        setError(null);
        const convId = await chatAPI.createPrivateConversation(targetUserId);
        setConversationId(convId);

        const conv = await chatAPI.getConversation(convId);
        setConversation(conv || null);
      } catch (err) {
        console.error('Error creating private conversation:', err);
        setError('Could not open conversation. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    initPrivateChat();
  }, [targetUserId]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-full h-full max-w-3xl mx-auto bg-white rounded-none sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden sm:h-[85vh] sm:max-h-700">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-sky-600 rounded-full flex items-center justify-center">
              <MessageSquare size={18} className="text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 text-sm">
                Private message
              </h3>
              <p className="text-xs text-slate-500">
                {targetUsername}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            title="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-full gap-3">
              <p className="text-slate-600 text-sm">{error}</p>
              <button
                onClick={onClose}
                className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors text-sm"
              >
                Close
              </button>
            </div>
          ) : conversationId ? (
            <ChatWindow
              conversationId={conversationId}
              conversation={conversation || undefined}
              onClose={onClose}
              className="h-full"
            />
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default PrivateChatModal;
