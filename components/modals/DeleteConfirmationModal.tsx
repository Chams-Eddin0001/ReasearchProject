import { X, Trash2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export type EntityType = 'article' | 'comment' | 'group' | 'post' | 'member';

interface DeleteConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  entityType?: EntityType;
  itemName?: string;
  isDeleting?: boolean;
  customTitle?: string;
  customDescription?: string;
}

const entityConfig: Record<EntityType, { title: string; description: string; icon: string }> = {
  article: {
    title: 'Delete Article',
    description: 'Are you sure you want to delete this article? All comments and data will be permanently removed.',
    icon: '📄'
  },
  comment: {
    title: 'Delete Comment',
    description: 'Are you sure you want to delete this comment?',
    icon: '💬'
  },
  group: {
    title: 'Delete Group',
    description: 'Are you sure you want to delete this group? All posts, members, and data will be permanently removed.',
    icon: '👥'
  },
  post: {
    title: 'Delete Post',
    description: 'Are you sure you want to delete this post? All comments and likes will be permanently removed.',
    icon: '📝'
  },
  member: {
    title: 'Remove Member',
    description: 'Are you sure you want to remove this member from the group?',
    icon: '👤'
  }
};

export default function DeleteConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  entityType = 'article',
  itemName,
  isDeleting = false,
  customTitle,
  customDescription,
}: DeleteConfirmationModalProps) {
  if (!isOpen) return null;

  const config = entityConfig[entityType];
  const title = customTitle || config.title;
  const description = customDescription || config.description;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 relative animate-in zoom-in-95 duration-200">
        <button
          onClick={onClose}
          disabled={isDeleting}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 disabled:opacity-50 transition-colors"
          aria-label="Close"
        >
          <X size={20} />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="bg-red-100 p-3 rounded-full">
            <AlertTriangle className="text-red-600" size={24} />
          </div>
          <h2 className="text-xl font-bold text-gray-900">{title}</h2>
        </div>

        <p className="text-gray-600 mb-2">{description}</p>
        
        {itemName && (
          <div className="my-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
            <p className="text-sm font-medium text-gray-800 break-words line-clamp-3">
              {config.icon} {itemName}
            </p>
          </div>
        )}
        
        <p className="text-sm text-red-600 font-medium mb-6 flex items-center gap-2">
          <Trash2 size={14} />
          This action cannot be undone.
        </p>

        <div className="flex gap-3 justify-end">
          <Button
            onClick={onClose}
            variant="outline"
            disabled={isDeleting}
          >
            No, Cancel
          </Button>
          <Button
            onClick={onConfirm}
            variant="destructive"
            disabled={isDeleting}
          >
            {isDeleting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Deleting...
              </>
            ) : (
              'Yes, Delete'
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
