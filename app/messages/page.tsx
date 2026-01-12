'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { supabase, Profile } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, Send, Plus } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';

interface ConversationWithParticipant {
  id: string;
  updated_at: string;
  other_participant: Profile;
  last_message?: {
    content: string;
    created_at: string;
  };
}

interface MessageWithSender {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  sender?: Profile;
}

export default function MessagesPage() {
  const { user, profile, loading: authLoading } = useAuth();
  const router = useRouter();
  const [conversations, setConversations] = useState<ConversationWithParticipant[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [messages, setMessages] = useState<MessageWithSender[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [researchers, setResearchers] = useState<Profile[]>([]);
  const [showNewChat, setShowNewChat] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/');
      return;
    }

    if (user) {
      fetchConversations();
      fetchResearchers();
      
      // Check if there's a user parameter to start a conversation
      const searchParams = new URLSearchParams(window.location.search);
      const targetUserId = searchParams.get('user');
      if (targetUserId) {
        startNewConversation(targetUserId);
      }
    }
  }, [user, authLoading]);

  useEffect(() => {
    if (selectedConversation) {
      fetchMessages(selectedConversation);
      // Set up real-time subscription
      const subscription = supabase
        .channel(`conversation:${selectedConversation}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
            filter: `conversation_id=eq.${selectedConversation}`,
          },
          (payload) => {
            fetchMessages(selectedConversation);
          }
        )
        .subscribe();

      return () => {
        subscription.unsubscribe();
      };
    }
  }, [selectedConversation]);

  const fetchConversations = async () => {
    if (!user) return;

    const { data: participantData } = await supabase
      .from('conversation_participants')
      .select('conversation_id')
      .eq('profile_id', user.id);

    if (!participantData || participantData.length === 0) {
      setLoading(false);
      return;
    }

    // Remove duplicates
    const uniqueConversationIds = [...new Set(participantData.map((p) => p.conversation_id))];

    const { data: conversationsData } = await supabase
      .from('conversations')
      .select('*')
      .in('id', uniqueConversationIds)
      .order('updated_at', { ascending: false });

    if (conversationsData) {
      const conversationsWithParticipants = await Promise.all(
        conversationsData.map(async (conv) => {
          const { data: participants } = await supabase
            .from('conversation_participants')
            .select('profile_id')
            .eq('conversation_id', conv.id)
            .neq('profile_id', user.id);

          if (participants && participants.length > 0) {
            const { data: otherProfile } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', participants[0].profile_id)
              .maybeSingle();

            if (!otherProfile) return null;

            const { data: lastMessage } = await supabase
              .from('messages')
              .select('content, created_at')
              .eq('conversation_id', conv.id)
              .order('created_at', { ascending: false })
              .limit(1)
              .maybeSingle();

            return {
              id: conv.id,
              updated_at: conv.updated_at,
              other_participant: otherProfile,
              last_message: lastMessage || undefined,
            };
          }
          return null;
        })
      );

      setConversations(conversationsWithParticipants.filter(Boolean) as ConversationWithParticipant[]);
    }

    setLoading(false);
  };

  const fetchMessages = async (conversationId: string) => {
    const { data } = await supabase
      .from('messages')
      .select(`
        *,
        sender:profiles!sender_id(*)
      `)
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (data) {
      setMessages(data as MessageWithSender[]);
    }
  };

  const fetchResearchers = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .neq('id', user?.id || '')
      .order('full_name', { ascending: true });

    if (data) {
      setResearchers(data);
    }
  };

  const startNewConversation = async (otherUserId: string) => {
    if (!user) return;

    // Check if conversation already exists
    const { data: existingParticipants } = await supabase
      .from('conversation_participants')
      .select('conversation_id')
      .eq('profile_id', user.id);

    if (existingParticipants) {
      for (const participant of existingParticipants) {
        const { data: otherParticipants } = await supabase
          .from('conversation_participants')
          .select('*')
          .eq('conversation_id', participant.conversation_id)
          .eq('profile_id', otherUserId);

        if (otherParticipants && otherParticipants.length > 0) {
          setSelectedConversation(participant.conversation_id);
          setShowNewChat(false);
          await fetchConversations();
          return;
        }
      }
    }

    // Create new conversation
    const { data: newConversation, error } = await supabase
      .from('conversations')
      .insert({})
      .select()
      .single();

    if (error || !newConversation) {
      toast.error('Failed to create conversation');
      return;
    }

    // Add participants
    await supabase.from('conversation_participants').insert([
      { conversation_id: newConversation.id, profile_id: user.id },
      { conversation_id: newConversation.id, profile_id: otherUserId },
    ]);

    setSelectedConversation(newConversation.id);
    setShowNewChat(false);
    fetchConversations();
  };

  const sendMessage = async () => {
    if (!user || !selectedConversation || !newMessage.trim()) return;

    const { error } = await supabase.from('messages').insert({
      conversation_id: selectedConversation,
      sender_id: user.id,
      content: newMessage.trim(),
    });

    if (error) {
      toast.error('Failed to send message');
    } else {
      setNewMessage('');
      fetchMessages(selectedConversation);
      fetchConversations();
    }
  };

  const getInitials = (name: string | null) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true });
    } catch {
      return '';
    }
  };

  const filteredResearchers = researchers.filter((r) =>
    r.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-12 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-7xl mx-auto px-4">
        <div className="grid md:grid-cols-3 gap-6 h-[calc(100vh-12rem)]">
          {/* Conversations List */}
          <Card className="md:col-span-1">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Messages</CardTitle>
              <Button size="sm" onClick={() => setShowNewChat(!showNewChat)}>
                <Plus className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[calc(100vh-18rem)]">
                {showNewChat ? (
                  <div className="p-4 space-y-4">
                    <Input
                      placeholder="Search researchers..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="mb-4"
                    />
                    {filteredResearchers.map((researcher) => (
                      <div
                        key={researcher.id}
                        className="flex items-center gap-3 p-3 hover:bg-gray-100 rounded-lg cursor-pointer"
                        onClick={() => startNewConversation(researcher.id)}
                      >
                        <Avatar>
                          <AvatarImage src={researcher.avatar_url || undefined} />
                          <AvatarFallback>{getInitials(researcher.full_name)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{researcher.full_name || 'Anonymous'}</p>
                          <p className="text-sm text-gray-500">{researcher.institution}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : conversations.length === 0 ? (
                  <div className="p-8 text-center text-gray-500">
                    <p>No conversations yet</p>
                    <Button
                      size="sm"
                      variant="outline"
                      className="mt-4"
                      onClick={() => setShowNewChat(true)}
                    >
                      Start a conversation
                    </Button>
                  </div>
                ) : (
                  conversations.map((conv) => (
                    <div
                      key={conv.id}
                      className={`flex items-start gap-3 p-4 hover:bg-gray-100 cursor-pointer border-l-4 ${
                        selectedConversation === conv.id
                          ? 'bg-gray-50 border-black'
                          : 'border-transparent'
                      }`}
                      onClick={() => setSelectedConversation(conv.id)}
                    >
                      <Avatar>
                        <AvatarImage src={conv.other_participant?.avatar_url || undefined} />
                        <AvatarFallback>
                          {getInitials(conv.other_participant?.full_name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">
                          {conv.other_participant?.full_name || 'Anonymous'}
                        </p>
                        <p className="text-sm text-gray-500 truncate">
                          {conv.last_message?.content || 'No messages yet'}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          {formatDate(conv.last_message?.created_at)}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Messages */}
          <Card className="md:col-span-2">
            {selectedConversation ? (
              <>
                <CardHeader>
                  <CardTitle>
                    {conversations.find((c) => c.id === selectedConversation)?.other_participant
                      ?.full_name || 'Conversation'}
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col h-[calc(100vh-22rem)]">
                  <ScrollArea className="flex-1 pr-4">
                    <div className="space-y-4">
                      {messages.map((message) => (
                        <div
                          key={message.id}
                          className={`flex ${
                            message.sender_id === user.id ? 'justify-end' : 'justify-start'
                          }`}
                        >
                          <div
                            className={`max-w-[70%] rounded-lg p-3 ${
                              message.sender_id === user.id
                                ? 'bg-black text-white'
                                : 'bg-gray-100 text-gray-900'
                            }`}
                          >
                            <p className="text-sm">{message.content}</p>
                            <p
                              className={`text-xs mt-1 ${
                                message.sender_id === user.id
                                  ? 'text-gray-300'
                                  : 'text-gray-500'
                              }`}
                            >
                              {formatDate(message.created_at)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                  <div className="flex gap-2 mt-4">
                    <Textarea
                      placeholder="Type your message..."
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          sendMessage();
                        }
                      }}
                      rows={2}
                    />
                    <Button onClick={sendMessage} className="bg-black text-white hover:bg-gray-800">
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </>
            ) : (
              <CardContent className="flex items-center justify-center h-full">
                <p className="text-gray-500">Select a conversation to start messaging</p>
              </CardContent>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
