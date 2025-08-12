import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Send, MessageSquare, Users, FileText, Phone } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface WatiContact {
  whatsappNumber: string;
  name?: string;
  customParams?: Array<{ name: string; value: string }>;
}

interface WatiTemplate {
  id: string;
  name: string;
  language: string;
  status: string;
  components?: any[];
}

export function WatiAdminPanel() {
  const [contacts, setContacts] = useState<WatiContact[]>([]);
  const [templates, setTemplates] = useState<WatiTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  const { toast } = useToast();

  // Message sending state
  const [messageForm, setMessageForm] = useState({
    whatsappNumber: '',
    message: '',
    messageType: 'session'
  });

  // Welcome message state
  const [welcomeForm, setWelcomeForm] = useState({
    whatsappNumber: '',
    userName: '',
    shipName: ''
  });

  // New contact state
  const [contactForm, setContactForm] = useState({
    whatsappNumber: '',
    name: '',
    maritimeRank: '',
    shipName: ''
  });

  // Export state
  const [exportData, setExportData] = useState<any>(null);
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    loadContacts();
    loadTemplates();
  }, []);

  const loadContacts = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/wati/contacts', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('qaaq_token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setContacts(data.contacts?.contacts || []);
      } else {
        throw new Error('Failed to load contacts');
      }
    } catch (error) {
      console.error('Error loading contacts:', error);
      toast({
        title: "Error",
        description: "Failed to load WATI contacts",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const loadTemplates = async () => {
    try {
      const response = await fetch('/api/wati/templates', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('qaaq_token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setTemplates(data.templates?.templates || []);
      } else {
        throw new Error('Failed to load templates');
      }
    } catch (error) {
      console.error('Error loading templates:', error);
      toast({
        title: "Error",
        description: "Failed to load WATI templates",
        variant: "destructive"
      });
    }
  };

  const sendMessage = async () => {
    if (!messageForm.whatsappNumber || !messageForm.message) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    try {
      setSendingMessage(true);
      const response = await fetch('/api/wati/send-message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('qaaq_token')}`
        },
        body: JSON.stringify({
          whatsappNumber: messageForm.whatsappNumber,
          message: messageForm.message,
          messageType: messageForm.messageType
        })
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "Message sent successfully"
        });
        setMessageForm({ whatsappNumber: '', message: '', messageType: 'session' });
      } else {
        throw new Error('Failed to send message');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive"
      });
    } finally {
      setSendingMessage(false);
    }
  };

  const sendMaritimeWelcome = async () => {
    if (!welcomeForm.whatsappNumber || !welcomeForm.userName) {
      toast({
        title: "Error",
        description: "WhatsApp number and user name are required",
        variant: "destructive"
      });
      return;
    }

    try {
      setSendingMessage(true);
      const response = await fetch('/api/wati/send-maritime-welcome', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('qaaq_token')}`
        },
        body: JSON.stringify(welcomeForm)
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "Maritime welcome message sent successfully"
        });
        setWelcomeForm({ whatsappNumber: '', userName: '', shipName: '' });
      } else {
        throw new Error('Failed to send welcome message');
      }
    } catch (error) {
      console.error('Error sending welcome message:', error);
      toast({
        title: "Error",
        description: "Failed to send welcome message",
        variant: "destructive"
      });
    } finally {
      setSendingMessage(false);
    }
  };

  const addContact = async () => {
    if (!contactForm.whatsappNumber) {
      toast({
        title: "Error",
        description: "WhatsApp number is required",
        variant: "destructive"
      });
      return;
    }

    try {
      setSendingMessage(true);
      const customParams = [];
      if (contactForm.maritimeRank) {
        customParams.push({ name: 'maritime_rank', value: contactForm.maritimeRank });
      }
      if (contactForm.shipName) {
        customParams.push({ name: 'ship_name', value: contactForm.shipName });
      }
      customParams.push({ name: 'platform', value: 'qaaqconnect' });
      customParams.push({ name: 'industry', value: 'maritime' });

      const response = await fetch('/api/wati/contacts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('qaaq_token')}`
        },
        body: JSON.stringify({
          whatsappNumber: contactForm.whatsappNumber,
          name: contactForm.name,
          customParams
        })
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "Contact added successfully"
        });
        setContactForm({ whatsappNumber: '', name: '', maritimeRank: '', shipName: '' });
        loadContacts(); // Refresh contacts list
      } else {
        throw new Error('Failed to add contact');
      }
    } catch (error) {
      console.error('Error adding contact:', error);
      toast({
        title: "Error",
        description: "Failed to add contact",
        variant: "destructive"
      });
    } finally {
      setSendingMessage(false);
    }
  };

  const exportUsersToWati = async () => {
    try {
      setExporting(true);
      const response = await fetch('/api/wati/export-users', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('qaaq_token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setExportData(data);
        
        toast({
          title: "Export Ready",
          description: `Exported ${data.contacts?.length || 0} maritime contacts`
        });
      } else {
        throw new Error('Failed to export users');
      }
    } catch (error) {
      toast({
        title: "Export Error",
        description: "Failed to export users to WATI format",
        variant: "destructive"
      });
    } finally {
      setExporting(false);
    }
  };

  const downloadCSV = () => {
    if (!exportData?.csvData) return;
    
    const blob = new Blob([exportData.csvData], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `qaaq_maritime_contacts_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  const downloadVCF = () => {
    if (!exportData?.vcfData) return;
    
    const blob = new Blob([exportData.vcfData], { type: 'text/vcard' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `qaaq_maritime_contacts_${new Date().toISOString().split('T')[0]}.vcf`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  const bulkImportToWati = async () => {
    if (!exportData?.contacts) return;

    try {
      setImporting(true);
      const response = await fetch('/api/wati/bulk-import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('qaaq_token')}`
        },
        body: JSON.stringify({
          contacts: exportData.contacts
        })
      });

      if (response.ok) {
        const result = await response.json();
        toast({
          title: "Import Complete",
          description: `Successfully imported ${result.successful}/${result.total} contacts to WATI`
        });
        loadContacts(); // Refresh contacts list
      } else {
        throw new Error('Failed to import contacts');
      }
    } catch (error) {
      toast({
        title: "Import Error",
        description: "Failed to import contacts to WATI",
        variant: "destructive"
      });
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="flex items-center space-x-2">
        <MessageSquare className="h-8 w-8 text-orange-600" />
        <h1 className="text-3xl font-bold">WATI WhatsApp Integration</h1>
        <Badge variant="secondary">Maritime Communication</Badge>
      </div>

      <Tabs defaultValue="send-message" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="send-message">Send Message</TabsTrigger>
          <TabsTrigger value="contacts">Contacts</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="export">Export/Import</TabsTrigger>
          <TabsTrigger value="maritime-tools">Maritime Tools</TabsTrigger>
        </TabsList>

        <TabsContent value="send-message" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Send className="h-5 w-5" />
                <span>Send WhatsApp Message</span>
              </CardTitle>
              <CardDescription>
                Send messages to maritime professionals via WATI
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">WhatsApp Number</label>
                <Input
                  placeholder="e.g., +919876543210"
                  value={messageForm.whatsappNumber}
                  onChange={(e) => setMessageForm(prev => ({ ...prev, whatsappNumber: e.target.value }))}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Message</label>
                <Textarea
                  placeholder="Enter your message for the maritime professional..."
                  rows={4}
                  value={messageForm.message}
                  onChange={(e) => setMessageForm(prev => ({ ...prev, message: e.target.value }))}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Message Type</label>
                <select 
                  className="w-full p-2 border rounded-md"
                  value={messageForm.messageType}
                  onChange={(e) => setMessageForm(prev => ({ ...prev, messageType: e.target.value }))}
                >
                  <option value="session">Session Message (24hr window)</option>
                  <option value="template">Template Message</option>
                </select>
              </div>

              <Button 
                onClick={sendMessage} 
                disabled={sendingMessage}
                className="w-full"
              >
                {sendingMessage ? 'Sending...' : 'Send Message'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="contacts" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Users className="h-5 w-5" />
                  <span>Add New Contact</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Input
                  placeholder="WhatsApp Number (e.g., +919876543210)"
                  value={contactForm.whatsappNumber}
                  onChange={(e) => setContactForm(prev => ({ ...prev, whatsappNumber: e.target.value }))}
                />
                <Input
                  placeholder="Name"
                  value={contactForm.name}
                  onChange={(e) => setContactForm(prev => ({ ...prev, name: e.target.value }))}
                />
                <Input
                  placeholder="Maritime Rank (e.g., Captain, Chief Engineer)"
                  value={contactForm.maritimeRank}
                  onChange={(e) => setContactForm(prev => ({ ...prev, maritimeRank: e.target.value }))}
                />
                <Input
                  placeholder="Ship Name (optional)"
                  value={contactForm.shipName}
                  onChange={(e) => setContactForm(prev => ({ ...prev, shipName: e.target.value }))}
                />
                <Button onClick={addContact} disabled={sendingMessage} className="w-full">
                  Add Maritime Contact
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>WATI Contacts ({contacts.length})</CardTitle>
                <Button onClick={loadContacts} disabled={loading} size="sm">
                  {loading ? 'Loading...' : 'Refresh'}
                </Button>
              </CardHeader>
              <CardContent>
                <div className="max-h-96 overflow-y-auto space-y-2">
                  {contacts.length === 0 ? (
                    <p className="text-muted-foreground text-center py-4">No contacts found</p>
                  ) : (
                    contacts.map((contact, index) => (
                      <div key={index} className="p-3 border rounded-lg">
                        <div className="flex items-center space-x-2">
                          <Phone className="h-4 w-4 text-green-600" />
                          <span className="font-medium">{contact.whatsappNumber}</span>
                        </div>
                        {contact.name && (
                          <p className="text-sm text-muted-foreground mt-1">{contact.name}</p>
                        )}
                        {contact.customParams && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {contact.customParams.map((param, idx) => (
                              <Badge key={idx} variant="outline" className="text-xs">
                                {param.name}: {param.value}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="templates" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <FileText className="h-5 w-5" />
                <span>Message Templates ({templates.length})</span>
              </CardTitle>
              <Button onClick={loadTemplates} disabled={loading} size="sm">
                {loading ? 'Loading...' : 'Refresh Templates'}
              </Button>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {templates.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8 col-span-full">
                    No templates found. Create templates in your WATI dashboard.
                  </p>
                ) : (
                  templates.map((template) => (
                    <Card key={template.id} className="border-2">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium">{template.name}</h4>
                          <Badge 
                            variant={template.status === 'APPROVED' ? 'default' : 'secondary'}
                          >
                            {template.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">
                          Language: {template.language}
                        </p>
                        {template.components && (
                          <p className="text-xs text-muted-foreground">
                            {template.components.length} component(s)
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="maritime-tools" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Maritime Welcome Message</CardTitle>
              <CardDescription>
                Send personalized welcome messages to new maritime professionals
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                placeholder="WhatsApp Number (e.g., +919876543210)"
                value={welcomeForm.whatsappNumber}
                onChange={(e) => setWelcomeForm(prev => ({ ...prev, whatsappNumber: e.target.value }))}
              />
              <Input
                placeholder="User Name"
                value={welcomeForm.userName}
                onChange={(e) => setWelcomeForm(prev => ({ ...prev, userName: e.target.value }))}
              />
              <Input
                placeholder="Ship Name (optional)"
                value={welcomeForm.shipName}
                onChange={(e) => setWelcomeForm(prev => ({ ...prev, shipName: e.target.value }))}
              />
              <Button onClick={sendMaritimeWelcome} disabled={sendingMessage} className="w-full">
                Send Maritime Welcome
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="export" className="space-y-4">
          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <FileText className="h-5 w-5" />
                  <span>Export Maritime Contacts</span>
                </CardTitle>
                <CardDescription>
                  Export all maritime professionals from QaaqConnect to WATI format
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button 
                  onClick={exportUsersToWati}
                  disabled={exporting}
                  className="w-full"
                >
                  {exporting ? 'Exporting...' : 'Export All Users to WATI Format'}
                </Button>
                
                {exportData && (
                  <div className="mt-6 p-4 border rounded-lg bg-green-50">
                    <h3 className="font-semibold text-green-800 mb-3">
                      Export Complete: {exportData.contacts?.length || 0} Maritime Contacts
                    </h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <Button 
                        variant="outline" 
                        onClick={downloadCSV}
                        className="w-full"
                      >
                        <FileText className="h-4 w-4 mr-2" />
                        Download CSV
                      </Button>
                      
                      <Button 
                        variant="outline" 
                        onClick={downloadVCF}
                        className="w-full"
                      >
                        <Phone className="h-4 w-4 mr-2" />
                        Download VCF
                      </Button>
                      
                      <Button 
                        onClick={bulkImportToWati}
                        disabled={importing}
                        className="w-full bg-orange-600 hover:bg-orange-700"
                      >
                        {importing ? 'Importing...' : 'Import to WATI'}
                      </Button>
                    </div>
                    
                    <div className="mt-4 text-sm text-green-700">
                      <p>• CSV: Spreadsheet format for external use</p>
                      <p>• VCF: Contact cards for phone/email apps</p>
                      <p>• WATI Import: Direct upload to WhatsApp platform</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {exportData && exportData.contacts && (
              <Card>
                <CardHeader>
                  <CardTitle>Export Preview</CardTitle>
                  <CardDescription>
                    Preview of maritime contacts to be exported ({exportData.contacts.length} total)
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="max-h-60 overflow-y-auto">
                    <div className="grid gap-2">
                      {exportData.contacts.slice(0, 10).map((contact: any, index: number) => (
                        <div key={index} className="flex items-center justify-between p-2 border rounded">
                          <div>
                            <span className="font-medium">{contact.name || 'Unknown'}</span>
                            <span className="text-sm text-gray-500 ml-2">+{contact.whatsappNumber}</span>
                          </div>
                          <div className="text-xs text-gray-400">
                            {contact.customParams?.find((p: any) => p.name === 'maritime_rank')?.value || 'No rank'}
                            {contact.customParams?.find((p: any) => p.name === 'ship_name')?.value && 
                              ' • ' + contact.customParams.find((p: any) => p.name === 'ship_name').value}
                          </div>
                        </div>
                      ))}
                      {exportData.contacts.length > 10 && (
                        <div className="text-center text-sm text-gray-500 py-2">
                          ... and {exportData.contacts.length - 10} more maritime professionals
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

      </Tabs>
    </div>
  );
}

export default WatiAdminPanel;