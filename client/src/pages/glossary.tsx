import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation } from 'wouter';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Archive, AlertTriangle, Merge, Eraser, Loader2 } from 'lucide-react';
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
      const data = await response.json();
      
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

  const handleMergeDuplicates = async () => {
    try {
      const response = await fetch('/api/glossary/merge-duplicates', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // Refresh the glossary entries after merge
        fetchGlossaryEntries(1, true);
        toast({
          title: "Duplicates Merged Successfully",
          description: `Processed ${data.summary.termsProcessed} terms, archived ${data.summary.duplicatesArchived} duplicates. Dictionary now has ${data.summary.finalUniqueTerms} unique terms.`,
        });
      } else {
        throw new Error(data.message || 'Failed to merge duplicates');
      }
    } catch (error) {
      toast({
        title: "Merge Failed", 
        description: "Could not merge duplicate entries. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleCleanupDefinitions = async () => {
    try {
      const response = await fetch('/api/glossary/cleanup-definitions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // Refresh the glossary entries after cleanup
        fetchGlossaryEntries(1, true);
        toast({
          title: "Definitions Cleaned Successfully",
          description: `Removed redundant phrases from ${data.summary.definitionsCleaned} definitions to save space.`,
        });
      } else {
        throw new Error(data.message || 'Failed to cleanup definitions');
      }
    } catch (error) {
      toast({
        title: "Cleanup Failed", 
        description: "Could not cleanup definition phrases. Please try again.",
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
                <h1 className="text-xl font-bold bg-gradient-to-r from-red-600 to-orange-600 bg-clip-text text-transparent">
                  Shipping Dictionary
                </h1>
                <p className="text-sm text-gray-600">Maritime Terms & Definitions</p>
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

        {/* Statistics and Admin Controls */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex gap-4">
            <Badge variant="secondary" className="bg-orange-100 text-orange-800 px-3 py-1">
              📚 {filteredEntries.length} Maritime Terms {pagination.hasMore ? `(of ${pagination.total})` : ''}
            </Badge>
            <Badge variant="secondary" className="bg-blue-100 text-blue-800 px-3 py-1">
              🔤 {alphabetLetters.length} Alphabetical Groups
            </Badge>
          </div>

          {/* Admin Controls */}
          {user?.isAdmin && (
            <div className="flex gap-2">
              <Button
                onClick={handleMergeDuplicates}
                variant="outline"
                size="sm"
                className="border-blue-300 text-blue-600 hover:bg-blue-50 hover:border-blue-400"
              >
                <Merge className="w-4 h-4 mr-2" />
                Merge Duplicates
              </Button>
              <Button
                onClick={handleCleanupDefinitions}
                variant="outline"
                size="sm"
                className="border-green-300 text-green-600 hover:bg-green-50 hover:border-green-400"
              >
                <Eraser className="w-4 h-4 mr-2" />
                Clean Phrases
              </Button>
            </div>
          )}
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
                            className="py-1 border-b border-gray-50 hover:bg-orange-25 hover:border-orange-100 transition-colors cursor-pointer group"
                          >
                            <div className="text-sm">
                              <span className="font-medium text-gray-900 group-hover:text-orange-700 transition-colors">
                                {extractTerm(entry.question).toUpperCase()}
                              </span>
                              <span className="text-gray-600 group-hover:text-gray-800 transition-colors ml-1">
                                {truncateDefinition(entry.answer)}
                              </span>
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

                          {/* Admin Actions */}
                          {user?.isAdmin && (
                            <div className="pt-3 border-t border-gray-200 space-y-2">
                              <Button
                                onClick={() => handleArchiveEntry(entry.id, extractTerm(entry.question))}
                                variant="outline"
                                size="sm"
                                className="w-full border-red-300 text-red-600 hover:bg-red-50 hover:border-red-400"
                              >
                                <Archive className="w-4 h-4 mr-2" />
                                Archive (Hide from Public)
                              </Button>
                              <p className="text-xs text-red-500 mt-1 text-center">
                                <AlertTriangle className="w-3 h-3 inline mr-1" />
                                This will hide the entry from all users
                              </p>
                            </div>
                          )}
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