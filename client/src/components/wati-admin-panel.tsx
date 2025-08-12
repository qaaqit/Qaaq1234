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

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="flex items-center space-x-2">
        <MessageSquare className="h-8 w-8 text-orange-600" />
        <h1 className="text-3xl font-bold">WATI WhatsApp Integration</h1>
        <Badge variant="secondary">Maritime Communication</Badge>
      </div>

      <Tabs defaultValue="send-message" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="send-message">Send Message</TabsTrigger>
          <TabsTrigger value="contacts">Contacts</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
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
      </Tabs>
    </div>
  );
}

export default WatiAdminPanel;