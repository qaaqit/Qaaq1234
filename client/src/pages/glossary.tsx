import React, { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import qaaqLogo from '@assets/qaaq-logo.png';

interface GlossaryEntry {
  id: string;
  question: string;
  answer: string;
  category: string;
  timestamp: string;
  attachments?: string[];
}

export function GlossaryPage() {
  const [, setLocation] = useLocation();
  const [glossaryEntries, setGlossaryEntries] = useState<GlossaryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  useEffect(() => {
    fetchGlossaryEntries();
  }, []);

  const fetchGlossaryEntries = async () => {
    try {
      const response = await fetch('/api/glossary/what-is');
      const data = await response.json();
      
      if (data.success) {
        // Sort alphabetically by the term (extract the "what is" part)
        const sortedEntries = data.entries.sort((a: GlossaryEntry, b: GlossaryEntry) => {
          const termA = extractTerm(a.question);
          const termB = extractTerm(b.question);
          return termA.localeCompare(termB);
        });
        setGlossaryEntries(sortedEntries);
      }
    } catch (error) {
      console.error('Error fetching glossary:', error);
    } finally {
      setLoading(false);
    }
  };

  const extractTerm = (question: string): string => {
    // Extract the main term from "what is..." questions
    const match = question.toLowerCase().match(/what\s+is\s+(?:a\s+|an\s+|the\s+)?(.+?)(?:\?|$)/);
    return match ? match[1].trim() : question;
  };

  const getCategories = () => {
    const cats = ['all', ...new Set(glossaryEntries.map(entry => entry.category))];
    return cats.filter(Boolean);
  };

  const filteredEntries = glossaryEntries.filter(entry => {
    const matchesSearch = entry.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         entry.answer.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || entry.category === selectedCategory;
    return matchesSearch && matchesCategory;
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
        {/* Search and Filter Controls */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex-1">
            <Input
              placeholder="Search maritime terms and definitions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="border-orange-300 focus:border-orange-500"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            {getCategories().map(category => (
              <Button
                key={category}
                variant={selectedCategory === category ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedCategory(category)}
                className={selectedCategory === category 
                  ? "bg-orange-600 hover:bg-orange-700" 
                  : "border-orange-300 text-orange-600 hover:bg-orange-50"
                }
              >
                {category === 'all' ? 'All Categories' : category}
              </Button>
            ))}
          </div>
        </div>

        {/* Statistics */}
        <div className="flex gap-4 mb-6">
          <Badge variant="secondary" className="bg-orange-100 text-orange-800 px-3 py-1">
            📚 {filteredEntries.length} Maritime Terms
          </Badge>
          <Badge variant="secondary" className="bg-blue-100 text-blue-800 px-3 py-1">
            🔤 {alphabetLetters.length} Alphabetical Groups
          </Badge>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="space-y-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i} className="border-orange-200">
                <CardHeader>
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-20 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Glossary Entries */}
        {!loading && (
          <div className="space-y-8">
            {alphabetLetters.map(letter => (
              <div key={letter} className="space-y-4">
                {/* Alphabetical Divider */}
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gradient-to-r from-red-500 to-orange-500 rounded-full flex items-center justify-center">
                    <span className="text-2xl font-bold text-white">{letter}</span>
                  </div>
                  <div className="flex-1 h-0.5 bg-gradient-to-r from-orange-300 to-transparent"></div>
                </div>

                {/* Terms for this letter */}
                <div className="grid gap-4 ml-16">
                  {groupedEntries[letter].map((entry) => (
                    <Card key={entry.id} className="border-orange-200 hover:border-orange-400 transition-colors">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <CardTitle className="text-lg text-gray-900 mb-1">
                              {extractTerm(entry.question).toUpperCase()}
                            </CardTitle>
                            <CardDescription className="text-sm text-gray-600">
                              {entry.question}
                            </CardDescription>
                          </div>
                          {entry.category && (
                            <Badge variant="outline" className="ml-2 border-orange-300 text-orange-700">
                              {entry.category}
                            </Badge>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="prose prose-sm max-w-none text-gray-700">
                          {entry.answer.split('\n').map((line, idx) => (
                            <p key={idx} className="mb-2 last:mb-0">
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
                          <div className="mt-3 pt-3 border-t border-orange-100">
                            <p className="text-xs text-gray-500 flex items-center gap-1">
                              📎 {entry.attachments.length} attachment(s)
                            </p>
                          </div>
                        )}
                        <div className="mt-3 pt-3 border-t border-orange-100">
                          <p className="text-xs text-gray-400">
                            Added: {new Date(entry.timestamp).toLocaleDateString()}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            ))}

            {/* No Results */}
            {filteredEntries.length === 0 && !loading && (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <i className="fas fa-search text-2xl text-orange-600"></i>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No Terms Found</h3>
                <p className="text-gray-600 mb-4">
                  Try adjusting your search or filter criteria.
                </p>
                <Button 
                  onClick={() => {
                    setSearchTerm('');
                    setSelectedCategory('all');
                  }}
                  variant="outline"
                  className="border-orange-300 text-orange-600 hover:bg-orange-50"
                >
                  Clear Filters
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="mt-12 pt-6 border-t border-orange-200">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-sm text-gray-600">
              Maritime dictionary powered by authentic QAAQ community questions
            </p>
            <Button
              onClick={() => setLocation('/qbot')}
              className="bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600"
            >
              Ask QBOT a Question →
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}