import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

// Accept or reject friend request
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await currentUser();
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { action } = await request.json();
    const params = await context.params;
    const friendshipId = params.id;

    if (!['accept', 'reject'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action' },
        { status: 400 }
      );
    }

    // Get the friendship
    const { data: friendship, error: fetchError } = await supabaseAdmin
      .from('friendships')
      .select('*')
      .eq('id', friendshipId)
      .single();

    if (fetchError || !friendship) {
      return NextResponse.json(
        { error: 'Friend request not found' },
        { status: 404 }
      );
    }

    // Only the addressee can accept/reject
    if (friendship.addressee_id !== user.id) {
      return NextResponse.json(
        { error: 'Not authorized to modify this request' },
        { status: 403 }
      );
    }

    const newStatus = action === 'accept' ? 'accepted' : 'rejected';

    // Update friendship status
    const { data: updated, error: updateError } = await supabaseAdmin
      .from('friendships')
      .update({ status: newStatus })
      .eq('id', friendshipId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating friendship:', updateError);
      return NextResponse.json(
        { error: 'Failed to update friend request' },
        { status: 500 }
      );
    }

    // Create notification if accepted
    if (action === 'accept') {
      await supabaseAdmin.from('notifications').insert({
        user_id: friendship.requester_id,
        actor_id: user.id,
        type: 'friend_accept',
        content: 'accepted your friend request',
        link: `/profile/${user.id}`,
      });
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error processing friend request:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Remove friend or cancel request
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await currentUser();
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const params = await context.params;
    const friendshipId = params.id;

    // Get the friendship
    const { data: friendship, error: fetchError } = await supabaseAdmin
      .from('friendships')
      .select('*')
      .eq('id', friendshipId)
      .single();

    if (fetchError || !friendship) {
      return NextResponse.json(
        { error: 'Friendship not found' },
        { status: 404 }
      );
    }

    // Only the people involved can delete
    if (friendship.requester_id !== user.id && friendship.addressee_id !== user.id) {
      return NextResponse.json(
        { error: 'Not authorized' },
        { status: 403 }
      );
    }

    // Delete friendship
    const { error: deleteError } = await supabaseAdmin
      .from('friendships')
      .delete()
      .eq('id', friendshipId);

    if (deleteError) {
      console.error('Error deleting friendship:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete friendship' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting friendship:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
