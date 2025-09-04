import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

interface EditSystemModalProps {
  isOpen: boolean;
  onClose: () => void;
  system: {
    code: string;
    title: string;
  } | null;
}

export function EditSystemModal({ isOpen, onClose, system }: EditSystemModalProps) {
  const [title, setTitle] = useState('');
  const queryClient = useQueryClient();

  useEffect(() => {
    if (system) {
      // Remove the code prefix (e.g., "a. " from "a. Propulsion")
      const titleWithoutCode = system.title.replace(/^[a-z]\.\s*/i, '');
      setTitle(titleWithoutCode);
    }
  }, [system]);

  const updateSystemMutation = useMutation({
    mutationFn: async (data: { code: string; title: string }) => {
      return apiRequest('/api/dev/semm/update-system-title', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'System title updated successfully',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/dev/semm-cards'] });
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update system title',
        variant: 'destructive',
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!system || !title.trim()) return;
    
    updateSystemMutation.mutate({
      code: system.code,
      title: title.trim(),
    });
  };

  if (!isOpen || !system) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black bg-opacity-50" onClick={onClose} />
      <div className="relative bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-800">Edit System Title</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
            data-testid="close-modal"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              System Code
            </label>
            <input
              type="text"
              value={system.code.toUpperCase()}
              disabled
              className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600"
            />
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              System Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter system title"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              autoFocus
              data-testid="system-title-input"
            />
          </div>

          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              data-testid="cancel-button"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!title.trim() || updateSystemMutation.isPending}
              className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              data-testid="save-button"
            >
              {updateSystemMutation.isPending ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}