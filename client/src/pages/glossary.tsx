import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation } from 'wouter';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Loader2, EyeOff, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import qaaqLogo from '@assets/qaaq-logo.png';
import LoginRoadblock from '@/components/LoginRoadblock';

interface GlossaryEntry {
  id: string;
  question: string;
  answer: string;
  category: string;
  timestamp: string;
  attachments?: string[];
}

interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  hasMore: boolean;
  totalPages: number;
}

export function GlossaryPage() {
  const [, setLocation] = useLocation();
  const [glossaryEntries, setGlossaryEntries] = useState<GlossaryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    limit: 60,
    total: 0,
    hasMore: false,
    totalPages: 0
  });
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const observer = useRef<IntersectionObserver>();

  useEffect(() => {
    // Load initial glossary entries regardless of authentication
    fetchGlossaryEntries(1, true);
  }, []);



  const fetchGlossaryEntries = async (page: number = 1, reset: boolean = false) => {
    try {
      if (page === 1) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }

      const response = await fetch(`/api/glossary/what-is?page=${page}&limit=${page === 1 ? 60 : 30}`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const responseText = await response.text();
      let data;
      
      try {
        data = JSON.parse(responseText);
      } catch (jsonError) {
        console.error('JSON parse error. Response text:', responseText.substring(0, 200));
        throw new Error('Server returned invalid response format. Please refresh the page.');
      }
      
      if (data.success) {
        // Sort alphabetically by the term (extract the "what is" part)
        const sortedEntries = data.entries.sort((a: GlossaryEntry, b: GlossaryEntry) => {
          const termA = extractTerm(a.question);
          const termB = extractTerm(b.question);
          return termA.localeCompare(termB);
        });
        
        if (reset || page === 1) {
          setGlossaryEntries(sortedEntries);
        } else {
          setGlossaryEntries(prev => [...prev, ...sortedEntries]);
        }
        
        setPagination(data.pagination);
      } else {
        console.error('API returned error:', data.message, data.error);
        throw new Error(data.message || 'Failed to fetch glossary entries');
      }
    } catch (error) {
      console.error('Error fetching glossary:', error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  // Intersection Observer callback for infinite scroll
  const lastEntryElementRef = useCallback((node: HTMLElement | null) => {
    if (loading || loadingMore) return;
    if (observer.current) observer.current.disconnect();
    
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && pagination.hasMore) {
        fetchGlossaryEntries(pagination.page + 1, false);
      }
    });
    
    if (node) observer.current.observe(node);
  }, [loading, loadingMore, pagination.hasMore, pagination.page]);

  const extractTerm = (question: string): string => {
    // Extract the main term from "what is..." questions
    const match = question.toLowerCase().match(/what\s+is\s+(?:a\s+|an\s+|the\s+)?(.+?)(?:\?|$)/);
    return match ? match[1].trim() : question;
  };

  const truncateDefinition = (text: string, wordLimit: number = 10): string => {
    const words = text.split(' ');
    if (words.length <= wordLimit) return text;
    return words.slice(0, wordLimit).join(' ') + '...';
  };

  const handleArchiveEntry = async (entryId: string, term: string) => {
    try {
      const response = await fetch(`/api/glossary/archive/${entryId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        // Remove the archived entry from the local state
        setGlossaryEntries(prev => prev.filter(entry => entry.id !== entryId));
        // Update pagination total count
        setPagination(prev => ({ ...prev, total: prev.total - 1 }));
        toast({
          title: "Entry Archived",
          description: `"${term}" has been hidden from public view.`,
        });
      } else {
        throw new Error('Failed to archive entry');
      }
    } catch (error) {
      toast({
        title: "Archive Failed", 
        description: "Could not archive the entry. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleHideDefinition = async (entryId: string, term: string, currentlyHidden: boolean = false) => {
    try {
      const response = await fetch(`/api/glossary/hide/${entryId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include', // Include cookies for Replit Auth
        body: JSON.stringify({
          hidden: !currentlyHidden,
          hidden_reason: currentlyHidden ? 'Unhidden by admin' : 'Hidden as non-technical/irrelevant'
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // Remove the hidden entry from the local state (if hiding)
        if (!currentlyHidden) {
          setGlossaryEntries(prev => prev.filter(entry => entry.id !== entryId));
          setPagination(prev => ({ ...prev, total: prev.total - 1 }));
        }
        
        toast({
          title: currentlyHidden ? "Definition Shown" : "Definition Hidden",
          description: `"${term}" has been ${currentlyHidden ? 'made visible' : 'hidden from view'}.`,
        });
      } else {
        throw new Error(data.message || 'Failed to update definition visibility');
      }
    } catch (error) {
      console.error('Hide/unhide error:', error);
      toast({
        title: "Hide/Unhide Failed", 
        description: error.message || "Could not update definition visibility. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteDefinition = async (entryId: string, term: string) => {
    // Confirm deletion
    if (!confirm(`Are you sure you want to PERMANENTLY DELETE "${term}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const response = await fetch(`/api/glossary/delete/${entryId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include', // Include cookies for Replit Auth
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // Remove the deleted entry from the local state
        setGlossaryEntries(prev => prev.filter(entry => entry.id !== entryId));
        setPagination(prev => ({ ...prev, total: prev.total - 1 }));
        
        toast({
          title: "Definition Deleted",
          description: `"${term}" has been permanently deleted from the database.`,
        });
      } else {
        throw new Error(data.message || 'Failed to delete definition');
      }
    } catch (error) {
      console.error('Delete error:', error);
      toast({
        title: "Delete Failed", 
        description: error.message || "Could not delete the definition. Please try again.",
        variant: "destructive",
      });
    }
  };

  



  // Removed category grouping function

  const filteredEntries = glossaryEntries.filter(entry => {
    // Show all entries if no search term is provided
    const matchesSearch = !searchTerm || 
                         entry.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         entry.answer.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const groupedEntries = filteredEntries.reduce((acc, entry) => {
    const term = extractTerm(entry.question);
    const firstLetter = term.charAt(0).toUpperCase();
    if (!acc[firstLetter]) {
      acc[firstLetter] = [];
    }
    acc[firstLetter].push(entry);
    return acc;
  }, {} as Record<string, GlossaryEntry[]>);

  const alphabetLetters = Object.keys(groupedEntries).sort();



  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-yellow-50">
      {/* Header */}
      <header className="bg-white text-black shadow-md relative overflow-hidden border-b-2 border-orange-400">
        <div className="absolute inset-0 bg-gradient-to-r from-red-50 via-orange-50 to-yellow-50 opacity-50"></div>
        
        <div className="relative z-10 px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <button 
                onClick={() => setLocation('/qbot')}
                className="hover:bg-white/10 rounded-lg p-2 transition-colors"
              >
                <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center overflow-hidden">
                  <img src={qaaqLogo} alt="QAAQ Logo" className="w-full h-full object-cover" />
                </div>
              </button>
              <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-red-600 to-orange-600 bg-clip-text text-transparent">Dictionary</h1>
                <p className="text-sm text-gray-600">Maritime Terms</p>
              </div>
            </div>
            <Button
              variant="outline"
              onClick={() => setLocation('/qbot')}
              className="border-orange-300 text-orange-600 hover:bg-orange-50"
            >
              ← Back to QBOT
            </Button>
          </div>
        </div>
      </header>
      {/* Main Content */}
      <div className="container mx-auto px-4 py-6">
        {/* Search Controls */}
        <div className="flex flex-col gap-4 mb-6">
          <div className="flex-1">
            <Input
              placeholder="Search maritime terms... (or browse all alphabetically below)"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="border-orange-300 focus:border-orange-500"
            />
          </div>
        </div>

        {/* Statistics */}
        <div className="mb-6">
          <Badge variant="secondary" className="bg-orange-100 text-orange-800 px-3 py-1">
            📚 {filteredEntries.length} Maritime Terms {pagination.hasMore ? `(of ${pagination.total})` : ''}
          </Badge>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="space-y-2">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-gray-100">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-3 w-48" />
              </div>
            ))}
          </div>
        )}

        {/* Minimalistic Dictionary Entries */}
        {!loading && (
          <div className="space-y-4">
            {alphabetLetters.map(letter => (
              <div key={letter}>
                {/* Letter Header */}
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 bg-gradient-to-r from-red-500 to-orange-500 rounded-full flex items-center justify-center">
                    <span className="text-lg font-bold text-white">{letter}</span>
                  </div>
                  <div className="flex-1 h-px bg-gray-200"></div>
                </div>

                {/* Terms List - Ultra Compact */}
                <div className="space-y-0 ml-11">
                  {groupedEntries[letter].map((entry, index) => {
                    const isLastEntry = letter === alphabetLetters[alphabetLetters.length - 1] && 
                                       index === groupedEntries[letter].length - 1;
                    
                    return (
                      <Dialog key={`dialog-${letter}-${entry.id}-${index}`}>
                        <DialogTrigger asChild>
                          <div 
                            ref={isLastEntry ? lastEntryElementRef : null}
                            className="py-1 border-b border-gray-50 hover:bg-orange-25 hover:border-orange-100 transition-colors cursor-pointer group relative"
                          >
                            <div className="text-sm flex items-center justify-between">
                              <div className="flex-1 min-w-0">
                                <span className="font-medium text-gray-900 group-hover:text-orange-700 transition-colors">
                                  {extractTerm(entry.question).toUpperCase()}
                                </span>
                                <span className="text-gray-600 group-hover:text-gray-800 transition-colors ml-1">
                                  {truncateDefinition(entry.answer)}
                                </span>
                              </div>
                              
                              {/* Admin Controls - Always visible for testing, check user object */}
                              {true && (
                                <div className="opacity-100 ml-2 flex space-x-1">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleHideDefinition(entry.id, extractTerm(entry.question));
                                    }}
                                    className="p-1 rounded hover:bg-yellow-100 hover:text-yellow-600 text-gray-400"
                                    title="Hide this definition"
                                  >
                                    <EyeOff className="w-3 h-3" />
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteDefinition(entry.id, extractTerm(entry.question));
                                    }}
                                    className="p-1 rounded hover:bg-red-100 hover:text-red-600 text-gray-400"
                                    title="Permanently delete this definition"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </DialogTrigger>
                      
                      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle className="text-xl font-bold text-gray-900 mb-2">
                            {extractTerm(entry.question).toUpperCase()}
                          </DialogTitle>
                        </DialogHeader>
                        
                        <div className="space-y-4">
                          <div className="text-sm text-gray-600 bg-orange-50 p-3 rounded-lg">
                            <strong>Question:</strong> {entry.question}
                          </div>
                          
                          <div className="prose prose-sm max-w-none text-gray-700">
                            {entry.answer.split('\n').map((line, idx) => (
                              <p key={`answer-${entry.id}-${idx}`} className="mb-2 last:mb-0">
                                {line.startsWith('•') ? (
                                  <span className="flex items-start gap-2">
                                    <span className="text-orange-600 font-bold">•</span>
                                    <span>{line.substring(1).trim()}</span>
                                  </span>
                                ) : line}
                              </p>
                            ))}
                          </div>
                          
                          {entry.attachments && entry.attachments.length > 0 && (
                            <div className="pt-3 border-t border-gray-200">
                              <p className="text-xs text-gray-500 flex items-center gap-1">
                                📎 {entry.attachments.length} attachment(s)
                              </p>
                            </div>
                          )}
                          
                          <div className="pt-3 border-t border-gray-200">
                            <p className="text-xs text-gray-400">
                              Added: {new Date(entry.timestamp).toLocaleDateString()}
                            </p>
                          </div>


                        </div>
                      </DialogContent>
                    </Dialog>
                    );
                  })}
                </div>
              </div>
            ))}

            {/* Loading More Indicator */}
            {loadingMore && (
              <div className="flex justify-center items-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-orange-600 mr-2" />
                <span className="text-sm text-gray-600">Loading more maritime terms...</span>
              </div>
            )}

            {/* End of Content */}
            {!pagination.hasMore && glossaryEntries.length > 0 && !loading && (
              <div className="text-center py-8">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-lg">✓</span>
                </div>
                <p className="text-sm text-gray-600">
                  You've explored all {pagination.total} maritime terms in our dictionary
                </p>
              </div>
            )}

            {/* No Results */}
            {filteredEntries.length === 0 && !loading && (
              <div className="text-center py-12">
                <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <i className="fas fa-search text-lg text-orange-600"></i>
                </div>
                <h3 className="text-base font-semibold text-gray-900 mb-2">No Terms Found</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Try adjusting your search or filter criteria.
                </p>
                <Button 
                  onClick={() => {
                    setSearchTerm('');
                  }}
                  variant="outline"
                  size="sm"
                  className="border-orange-300 text-orange-600 hover:bg-orange-50"
                >
                  Clear Search
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="mt-12 pt-6 border-t border-orange-200">
          <div className="text-center">
            <p className="text-sm text-gray-600">
              Maritime dictionary powered by authentic QAAQ community questions
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}