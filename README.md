# EquityTake - Real-time Chat System

A comprehensive real-time chat system built with React, TypeScript, and Supabase, featuring group discussions and private messaging capabilities.

## Features

### 🚀 Real-time Communication
- **WebSocket-based messaging** using Supabase Realtime
- **Instant message delivery** with typing indicators
- **Online/offline presence** tracking
- **Message read receipts** and status tracking

### 💬 Chat Capabilities
- **Group discussions** for startup teams
- **Private messaging** between users
- **Message reactions** with emoji support
- **File attachments** (images, documents)
- **Message editing and deletion**
- **Reply to messages** functionality

### 🎯 Message Organization
- **Advanced search** across all conversations
- **Message filtering** (unread, archived, starred)
- **Conversation management** with archiving
- **Bulk message operations**
- **Smart categorization** and sorting

### 🔒 Security & Privacy
- **Row Level Security (RLS)** policies
- **End-to-end message encryption** support
- **User authorization** and access control
- **Private conversation** protection
- **File upload security** with type validation

## Technology Stack

### Backend
- **Supabase** (PostgreSQL + Realtime + Storage)
- **PostgreSQL** with advanced indexing
- **Row Level Security** for data protection
- **Supabase Functions** for complex operations

### Frontend
- **React 18** with TypeScript
- **Tailwind CSS** for styling
- **Lucide React** for icons
- **Custom hooks** for state management
- **Real-time subscriptions** with Supabase client

## Database Schema

### Core Tables
- `conversations` - Chat rooms (group/private)
- `messages` - Individual messages with metadata
- `conversation_participants` - User participation tracking
- `message_reactions` - Emoji reactions
- `message_attachments` - File attachments
- `message_read_status` - Read receipt tracking
- `user_presence` - Online/offline status

### Key Features
- **Foreign key relationships** for data integrity
- **Optimized indexes** for performance
- **Check constraints** for data validation
- **Soft delete** support for messages
- **JSONB metadata** for extensibility

## API Documentation

### Chat API (`src/lib/chatApi.ts`)

#### Conversations
```typescript
// Get user conversations
await chatAPI.getConversations(limit?, offset?)

// Create private conversation
await chatAPI.createPrivateConversation(targetUserId)

// Create group conversation
await chatAPI.createGroupConversation(groupId, name?)

// Get group conversation
await chatAPI.getGroupConversation(groupId)
```

#### Messages
```typescript
// Get messages for conversation
await chatAPI.getMessages(conversationId, limit?, before?)

// Send message
await chatAPI.sendMessage(conversationId, content, type?, replyToId?, attachments?)

// Edit message
await chatAPI.editMessage(messageId, content)

// Delete message
await chatAPI.deleteMessage(messageId)

// Add reaction
await chatAPI.addReaction(messageId, emoji)

// Mark messages as read
await chatAPI.markMessagesAsRead(conversationId, upToMessageId?)
```

#### Real-time Subscriptions
```typescript
// Subscribe to conversation updates
const unsubscribe = chatAPI.subscribeToConversation(conversationId, {
  onMessage: (message) => { /* handle new message */ },
  onMessageUpdate: (message) => { /* handle message edit */ },
  onMessageDelete: (messageId) => { /* handle message deletion */ },
  onReaction: (reaction) => { /* handle reaction */ }
});
```

## Component Architecture

### Core Components
- `ChatWindow` - Main chat interface
- `MessageOrganizer` - Advanced message management
- `GroupProfilePage` - Integration with group features

### Key Features
- **Responsive design** for all screen sizes
- **Infinite scroll** for message history
- **File drag & drop** support
- **Emoji picker** integration
- **Typing indicators** and presence
- **Message threading** with replies

## Installation & Setup

### 1. Database Setup
Run the migration file to create the chat system tables:
```sql
-- Execute the contents of supabase/migrations/create_chat_system.sql
-- in your Supabase SQL editor
```

### 2. Environment Variables
Ensure your `.env` file contains:
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 3. Storage Setup
The system automatically creates the `chat-attachments` bucket with proper policies.

### 4. Install Dependencies
```bash
npm install
```

### 5. Start Development Server
```bash
npm run dev
```

## Usage Examples

### Basic Group Chat Integration
```typescript
import ChatWindow from './components/chat/ChatWindow';

// In your group component
const [conversationId, setConversationId] = useState<string | null>(null);

// Initialize group chat
useEffect(() => {
  const initChat = async () => {
    const id = await chatAPI.createGroupConversation(groupId);
    setConversationId(id);
  };
  initChat();
}, [groupId]);

// Render chat
return (
  <div className="h-96">
    <ChatWindow conversationId={conversationId} />
  </div>
);
```

### Message Organizer Integration
```typescript
import MessageOrganizer from './components/chat/MessageOrganizer';

const [showOrganizer, setShowOrganizer] = useState(false);

// Open message organizer
const handleMessageOrganizer = () => {
  setShowOrganizer(true);
};

// Render organizer
{showOrganizer && (
  <MessageOrganizer
    onClose={() => setShowOrganizer(false)}
    initialConversationId={conversationId}
  />
)}
```

## Performance Optimizations

### Database
- **Composite indexes** on frequently queried columns
- **Partial indexes** for active conversations
- **Connection pooling** via Supabase
- **Query optimization** with proper joins

### Frontend
- **Virtual scrolling** for large message lists
- **Message pagination** with infinite scroll
- **Debounced search** to reduce API calls
- **Optimistic updates** for better UX
- **Memoized components** to prevent re-renders

## Security Considerations

### Row Level Security Policies
- Users can only access conversations they participate in
- Message visibility based on conversation membership
- File access restricted to conversation participants
- Admin controls for group conversation management

### File Upload Security
- **File type validation** on client and server
- **File size limits** (10MB for attachments)
- **Virus scanning** (can be added via Supabase functions)
- **Access control** via storage policies

## Testing Strategy

### Unit Tests
- API functions with mocked Supabase client
- Component rendering and user interactions
- Utility functions and data transformations

### Integration Tests
- Real-time subscription handling
- File upload and download flows
- Message delivery and read receipts

### E2E Tests
- Complete chat workflows
- Multi-user conversation scenarios
- Cross-browser compatibility

## Deployment Guide

### Production Checklist
1. **Database migrations** applied
2. **Storage buckets** configured
3. **RLS policies** enabled
4. **Environment variables** set
5. **File upload limits** configured
6. **Real-time subscriptions** tested

### Monitoring
- **Message delivery rates**
- **Connection stability**
- **File upload success rates**
- **Database performance metrics**

## Future Enhancements

### Planned Features
- **Voice messages** support
- **Video calling** integration
- **Message encryption** at rest
- **Advanced search** with full-text indexing
- **Message scheduling**
- **Custom emoji** support
- **Thread conversations**
- **Message templates**

### Scalability Improvements
- **Message archiving** for old conversations
- **CDN integration** for file attachments
- **Database sharding** for large deployments
- **Caching layer** for frequently accessed data

## Contributing

1. Fork the repository
2. Create a feature branch
3. Implement changes with tests
4. Submit a pull request

## License

MIT License - see LICENSE file for details.