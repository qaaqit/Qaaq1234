import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { GripVertical, X, Edit3 } from 'lucide-react';
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
  const [editingCodes, setEditingCodes] = useState<Record<string, string>>({});
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const reorderMutation = useMutation({
    mutationFn: async () => {
      // Apply any pending code edits to the items
      const updatedItems = orderedItems.map(item => ({
        ...item,
        code: editingCodes[item.code] || item.code
      }));
      
      const orderedCodes = updatedItems.map(item => item.code);
      await onReorder(orderedCodes);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: `${title} reordered successfully`
      });
      queryClient.invalidateQueries({ queryKey: ['/api/dev/semm-cards'] });
      setEditingCodes({});
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

  const handleCodeEdit = (originalCode: string, newCode: string) => {
    setEditingCodes(prev => ({
      ...prev,
      [originalCode]: newCode
    }));
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
          <DialogDescription>
            Edit code values and reorder items. Changes will be saved to update the {title.toLowerCase()} hierarchy.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-3">
          <div className="text-sm text-gray-600 bg-orange-50 p-3 rounded-lg border border-orange-200">
            <Edit3 className="w-4 h-4 text-orange-600 inline mr-2" />
            Edit codes directly to reorder. Modified codes will be saved with new positions.
          </div>
          
          {orderedItems.map((item, index) => (
            <div
              key={item.code}
              className="flex items-center justify-between p-4 bg-white rounded-lg border border-gray-200 hover:border-orange-300 transition-colors"
              data-testid={`reorder-item-${item.code}`}
            >
              <div className="flex items-center space-x-4 flex-1">
                <GripVertical className="w-4 h-4 text-gray-400" />
                
                <div className="flex items-center space-x-3 flex-1">
                  <div className="w-20">
                    <Input
                      value={editingCodes[item.code] || item.code}
                      onChange={(e) => handleCodeEdit(item.code, e.target.value.toLowerCase())}
                      className="text-sm font-mono text-center bg-orange-50 border-orange-200 focus:border-orange-400 focus:ring-orange-200"
                      placeholder="Code"
                      data-testid={`edit-code-${item.code}`}
                    />
                  </div>
                  
                  <div className="flex-1">
                    <div className="text-sm font-medium text-gray-900">
                      {item.title}
                    </div>
                    <div className="text-xs text-gray-500">
                      Original: {item.code.toUpperCase()}
                      {editingCodes[item.code] && editingCodes[item.code] !== item.code && (
                        <span className="text-orange-600 ml-2">
                          → {editingCodes[item.code].toUpperCase()}
                        </span>
                      )}
                    </div>
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

        <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
          <Button
            variant="outline"
            onClick={onClose}
            data-testid="cancel-reorder"
            className="border-gray-300 text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </Button>
          <Button
            onClick={() => reorderMutation.mutate()}
            disabled={reorderMutation.isPending}
            data-testid="save-reorder"
            className="bg-orange-500 hover:bg-orange-600 text-white"
          >
            {reorderMutation.isPending ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}