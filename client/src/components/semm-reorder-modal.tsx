import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

import { GripVertical, X, ChevronUp, ChevronDown } from 'lucide-react';
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
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const reorderMutation = useMutation({
    mutationFn: async () => {
      // Generate new alphabetical codes based on current order
      const baseChar = items[0]?.code?.[0] || 'a';
      const codeLength = items[0]?.code?.length || 2;
      
      const reorderedCodes = orderedItems.map((_, index) => {
        return baseChar + String.fromCharCode(97 + index).repeat(codeLength - 1);
      });
      
      await onReorder(reorderedCodes);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: `${title} order saved successfully`
      });
      queryClient.invalidateQueries({ queryKey: ['/api/dev/semm-cards'] });
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: `Failed to save ${title.toLowerCase()} order`,
        variant: "destructive"
      });
    }
  });



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
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between text-xl font-bold text-gray-900">
            Reorder {title}
            <button
              onClick={onClose}
              className="p-1 text-gray-500 hover:text-gray-700 rounded"
              data-testid="close-reorder-modal"
            >
              <X className="w-5 h-5" />
            </button>
          </DialogTitle>
          <DialogDescription className="text-gray-600">
            Drag equipment up or down to change their display order. The alphabetical IDs will be reassigned based on the new order.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-3">
          {orderedItems.map((item, index) => (
            <div
              key={item.code}
              className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors"
              data-testid={`reorder-item-${item.code}`}
            >
              <div className="flex items-center space-x-4 flex-1">
                <div className="text-sm font-mono text-gray-600 bg-white px-2 py-1 rounded border">
                  {item.code}.
                </div>
                
                <div className="flex-1">
                  <div className="text-lg font-medium text-gray-900">
                    {item.title}
                  </div>
                </div>
              </div>
              
              <div className="flex flex-col space-y-1">
                <button
                  onClick={() => moveUp(index)}
                  disabled={index === 0}
                  className="p-2 text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed rounded hover:bg-white transition-colors"
                  data-testid={`move-up-${item.code}`}
                  title="Move up"
                >
                  <ChevronUp className="w-4 h-4" />
                </button>
                <button
                  onClick={() => moveDown(index)}
                  disabled={index === orderedItems.length - 1}
                  className="p-2 text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed rounded hover:bg-white transition-colors"
                  data-testid={`move-down-${item.code}`}
                  title="Move down"
                >
                  <ChevronDown className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
          <Button
            variant="outline"
            onClick={onClose}
            data-testid="cancel-reorder"
            className="border-orange-300 text-orange-600 hover:bg-orange-50"
          >
            Cancel
          </Button>
          <Button
            onClick={() => reorderMutation.mutate()}
            disabled={reorderMutation.isPending}
            data-testid="save-reorder"
            className="bg-blue-500 hover:bg-blue-600 text-white"
          >
            {reorderMutation.isPending ? 'Saving...' : 'Save Order'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}