import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Switch,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/FontAwesome5';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../utils/api';

interface AdminStats {
  totalUsers: number;
  onlineUsers: number;
  totalQuestions: number;
  totalGroups: number;
  botStatus: {
    qbot: boolean;
    whatsappBot: boolean;
  };
}

export default function AdminScreen() {
  const [botControlsExpanded, setBotControlsExpanded] = useState(false);
  const queryClient = useQueryClient();

  // Fetch admin stats
  const { data: stats, isLoading } = useQuery({
    queryKey: ['/api/admin/stats'],
    queryFn: () => apiRequest('/api/admin/stats'),
  });

  // Bot control mutations
  const toggleQBOTMutation = useMutation({
    mutationFn: (enabled: boolean) => 
      apiRequest('/api/admin/qbot/toggle', {
        method: 'POST',
        body: { enabled }
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/stats'] });
    },
  });

  const toggleWhatsAppBotMutation = useMutation({
    mutationFn: (enabled: boolean) => 
      apiRequest('/api/admin/whatsapp-bot/toggle', {
        method: 'POST',
        body: { enabled }
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/stats'] });
    },
  });

  const handleToggleQBOT = (enabled: boolean) => {
    Alert.alert(
      'Toggle QBOT',
      `Are you sure you want to ${enabled ? 'enable' : 'disable'} QBOT?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Confirm', 
          onPress: () => toggleQBOTMutation.mutate(enabled)
        }
      ]
    );
  };

  const handleToggleWhatsAppBot = (enabled: boolean) => {
    Alert.alert(
      'Toggle WhatsApp Bot',
      `Are you sure you want to ${enabled ? 'start' : 'stop'} the WhatsApp Bot?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Confirm', 
          onPress: () => toggleWhatsAppBotMutation.mutate(enabled)
        }
      ]
    );
  };

  const StatCard = ({ icon, title, value, color = '#0891b2' }: {
    icon: string;
    title: string;
    value: string | number;
    color?: string;
  }) => (
    <View style={styles.statCard}>
      <View style={[styles.statIcon, { backgroundColor: color }]}>
        <Icon name={icon} size={24} color="white" />
      </View>
      <View style={styles.statContent}>
        <Text style={styles.statValue}>{value}</Text>
        <Text style={styles.statTitle}>{title}</Text>
      </View>
    </View>
  );

  const ControlCard = ({ title, children }: {
    title: string;
    children: React.ReactNode;
  }) => (
    <View style={styles.controlCard}>
      <Text style={styles.controlTitle}>{title}</Text>
      {children}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Icon name="shield-alt" size={32} color="#0891b2" />
            <Text style={styles.headerTitle}>Admin Panel</Text>
          </View>
          <View style={styles.statusIndicator}>
            <View style={styles.onlineDot} />
            <Text style={styles.statusText}>System Online</Text>
          </View>
        </View>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <StatCard
            icon="users"
            title="Total Users"
            value={stats?.totalUsers || 0}
            color="#0891b2"
          />
          <StatCard
            icon="wifi"
            title="Online Users"
            value={stats?.onlineUsers || 0}
            color="#22c55e"
          />
          <StatCard
            icon="question-circle"
            title="Questions"
            value={stats?.totalQuestions || 0}
            color="#f59e0b"
          />
          <StatCard
            icon="layer-group"
            title="Groups"
            value={stats?.totalGroups || 0}
            color="#8b5cf6"
          />
        </View>

        {/* Bot Controls */}
        <ControlCard title="Bot Management">
          <View style={styles.botControl}>
            <View style={styles.botInfo}>
              <Icon name="robot" size={20} color="#0891b2" />
              <Text style={styles.botName}>QBOT AI Assistant</Text>
              <View style={[
                styles.botStatus,
                { backgroundColor: stats?.botStatus?.qbot ? '#22c55e' : '#ef4444' }
              ]}>
                <Text style={styles.botStatusText}>
                  {stats?.botStatus?.qbot ? 'Online' : 'Offline'}
                </Text>
              </View>
            </View>
            <Switch
              value={stats?.botStatus?.qbot || false}
              onValueChange={handleToggleQBOT}
              disabled={toggleQBOTMutation.isPending}
              trackColor={{ false: '#d1d5db', true: '#0891b2' }}
              thumbColor={stats?.botStatus?.qbot ? '#ffffff' : '#f3f4f6'}
            />
          </View>

          <View style={styles.botControl}>
            <View style={styles.botInfo}>
              <Icon name="whatsapp" size={20} color="#25d366" />
              <Text style={styles.botName}>WhatsApp Bot</Text>
              <View style={[
                styles.botStatus,
                { backgroundColor: stats?.botStatus?.whatsappBot ? '#22c55e' : '#ef4444' }
              ]}>
                <Text style={styles.botStatusText}>
                  {stats?.botStatus?.whatsappBot ? 'Running' : 'Stopped'}
                </Text>
              </View>
            </View>
            <Switch
              value={stats?.botStatus?.whatsappBot || false}
              onValueChange={handleToggleWhatsAppBot}
              disabled={toggleWhatsAppBotMutation.isPending}
              trackColor={{ false: '#d1d5db', true: '#25d366' }}
              thumbColor={stats?.botStatus?.whatsappBot ? '#ffffff' : '#f3f4f6'}
            />
          </View>
        </ControlCard>

        {/* Quick Actions */}
        <ControlCard title="Quick Actions">
          <View style={styles.actionGrid}>
            <TouchableOpacity style={styles.actionButton}>
              <Icon name="users-cog" size={20} color="white" />
              <Text style={styles.actionText}>User Management</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.actionButton}>
              <Icon name="edit" size={20} color="white" />
              <Text style={styles.actionText}>Bot Rules</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.actionButton}>
              <Icon name="chart-bar" size={20} color="white" />
              <Text style={styles.actionText}>Analytics</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.actionButton}>
              <Icon name="database" size={20} color="white" />
              <Text style={styles.actionText}>Database</Text>
            </TouchableOpacity>
          </View>
        </ControlCard>

        {/* System Status */}
        <ControlCard title="System Status">
          <View style={styles.systemStatus}>
            <View style={styles.statusItem}>
              <Icon name="server" size={16} color="#6b7280" />
              <Text style={styles.statusLabel}>API Server</Text>
              <View style={styles.statusGood}>
                <Text style={styles.statusValueGood}>Healthy</Text>
              </View>
            </View>
            
            <View style={styles.statusItem}>
              <Icon name="database" size={16} color="#6b7280" />
              <Text style={styles.statusLabel}>Database</Text>
              <View style={styles.statusGood}>
                <Text style={styles.statusValueGood}>Connected</Text>
              </View>
            </View>
            
            <View style={styles.statusItem}>
              <Icon name="cloud" size={16} color="#6b7280" />
              <Text style={styles.statusLabel}>Cloud Storage</Text>
              <View style={styles.statusGood}>
                <Text style={styles.statusValueGood}>Available</Text>
              </View>
            </View>
          </View>
        </ControlCard>

        {/* Recent Activity */}
        <ControlCard title="Recent Activity">
          <View style={styles.activityList}>
            <Text style={styles.activityItem}>
              <Icon name="user-plus" size={12} color="#22c55e" /> New user registered
            </Text>
            <Text style={styles.activityItem}>
              <Icon name="comment" size={12} color="#0891b2" /> QBOT responded to query
            </Text>
            <Text style={styles.activityItem}>
              <Icon name="question" size={12} color="#f59e0b" /> New question posted
            </Text>
          </View>
        </ControlCard>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginLeft: 12,
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  onlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#22c55e',
    marginRight: 6,
  },
  statusText: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '500',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    minWidth: '47%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  statContent: {
    flex: 1,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  statTitle: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  controlCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  controlTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 16,
  },
  botControl: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  botInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  botName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#374151',
    marginLeft: 12,
    flex: 1,
  },
  botStatus: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 12,
  },
  botStatusText: {
    fontSize: 12,
    color: 'white',
    fontWeight: '500',
  },
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  actionButton: {
    backgroundColor: '#0891b2',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    flex: 1,
    minWidth: '47%',
  },
  actionText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  systemStatus: {
    gap: 12,
  },
  statusItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statusLabel: {
    fontSize: 14,
    color: '#6b7280',
    marginLeft: 8,
    flex: 1,
  },
  statusGood: {
    backgroundColor: '#dcfce7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusValueGood: {
    fontSize: 12,
    color: '#166534',
    fontWeight: '500',
  },
  activityList: {
    gap: 8,
  },
  activityItem: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
  },
});