import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { GripVertical, X } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface ReorderModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  items: Array<{ code: string; title: string }>;
  onReorder: (orderedCodes: string[]) => Promise<void>;
}

export function SemmReorderModal({ isOpen, onClose, title, items, onReorder }: ReorderModalProps) {
  const [orderedItems, setOrderedItems] = useState(items);
  const [draggedItem, setDraggedItem] = useState<number | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const reorderMutation = useMutation({
    mutationFn: async () => {
      const orderedCodes = orderedItems.map(item => item.code);
      await onReorder(orderedCodes);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: `${title} reordered successfully`
      });
      queryClient.invalidateQueries({ queryKey: ['/api/dev/semm-cards'] });
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: `Failed to reorder ${title.toLowerCase()}`,
        variant: "destructive"
      });
    }
  });

  const handleDragStart = (index: number) => {
    setDraggedItem(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedItem === null || draggedItem === index) return;

    const newItems = [...orderedItems];
    const draggedItemData = newItems[draggedItem];
    newItems.splice(draggedItem, 1);
    newItems.splice(index, 0, draggedItemData);
    
    setOrderedItems(newItems);
    setDraggedItem(index);
  };

  const handleDragEnd = () => {
    setDraggedItem(null);
  };

  const moveUp = (index: number) => {
    if (index === 0) return;
    const newItems = [...orderedItems];
    [newItems[index], newItems[index - 1]] = [newItems[index - 1], newItems[index]];
    setOrderedItems(newItems);
  };

  const moveDown = (index: number) => {
    if (index === orderedItems.length - 1) return;
    const newItems = [...orderedItems];
    [newItems[index], newItems[index + 1]] = [newItems[index + 1], newItems[index]];
    setOrderedItems(newItems);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            Reorder {title}
            <button
              onClick={onClose}
              className="p-1 text-gray-500 hover:text-gray-700 rounded"
              data-testid="close-reorder-modal"
            >
              <X className="w-5 h-5" />
            </button>
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-2">
          {orderedItems.map((item, index) => (
            <div
              key={item.code}
              draggable
              onDragStart={() => handleDragStart(index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDragEnd={handleDragEnd}
              className={`
                flex items-center justify-between p-3 bg-gray-50 rounded-lg border cursor-move
                ${draggedItem === index ? 'opacity-50' : ''}
                hover:bg-gray-100 transition-colors
              `}
              data-testid={`reorder-item-${item.code}`}
            >
              <div className="flex items-center space-x-3 flex-1">
                <GripVertical className="w-4 h-4 text-gray-400" />
                <div>
                  <div className="text-sm font-medium text-gray-900">
                    {item.code.toUpperCase()}
                  </div>
                  <div className="text-xs text-gray-500 truncate max-w-48">
                    {item.title}
                  </div>
                </div>
              </div>
              
              <div className="flex space-x-1">
                <button
                  onClick={() => moveUp(index)}
                  disabled={index === 0}
                  className="p-1 text-gray-500 hover:text-gray-700 disabled:opacity-30 disabled:cursor-not-allowed"
                  data-testid={`move-up-${item.code}`}
                  title="Move up"
                >
                  ↑
                </button>
                <button
                  onClick={() => moveDown(index)}
                  disabled={index === orderedItems.length - 1}
                  className="p-1 text-gray-500 hover:text-gray-700 disabled:opacity-30 disabled:cursor-not-allowed"
                  data-testid={`move-down-${item.code}`}
                  title="Move down"
                >
                  ↓
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-end space-x-3 pt-4 border-t">
          <Button
            variant="outline"
            onClick={onClose}
            data-testid="cancel-reorder"
          >
            Cancel
          </Button>
          <Button
            onClick={() => reorderMutation.mutate()}
            disabled={reorderMutation.isPending}
            data-testid="save-reorder"
          >
            {reorderMutation.isPending ? 'Saving...' : 'Save Order'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}