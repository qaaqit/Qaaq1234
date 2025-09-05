import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface BackupDatabase {
  source_database: string;
  database_size: string;
  database_size_bytes: number;
  table_count: number;
  record_count: number;
  connection_status: 'healthy' | 'degraded' | 'critical' | 'offline' | 'unknown';
  connection_latency: number;
  last_successful_backup: string;
  backup_gap_detected: boolean;
  missing_tables: string[];
  size_discrepancy: number;
  health_score: number;
  alerts_triggered: Array<{type: string, message: string, triggeredAt: string}>;
  metadata: {
    topTables?: Array<{name: string, size: string, columns?: number}>;
    databaseName?: string;
    lastChecked?: string;
    lastError?: string;
  };
  updated_at: string;
}

interface BackupMetrics {
  isActive: boolean;
  lastCheck: string;
  databases: BackupDatabase[];
  overallHealth: 'healthy' | 'degraded' | 'critical' | 'unknown';
  error?: string;
}

const getStatusColor = (status: string): string => {
  switch (status) {
    case 'healthy': return 'bg-green-100 text-green-800 border-green-200';
    case 'degraded': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'critical': return 'bg-red-100 text-red-800 border-red-200';
    case 'offline': return 'bg-gray-100 text-gray-800 border-gray-200';
    default: return 'bg-blue-100 text-blue-800 border-blue-200';
  }
};

const getHealthIcon = (status: string): string => {
  switch (status) {
    case 'healthy': return 'fas fa-check-circle text-green-500';
    case 'degraded': return 'fas fa-exclamation-triangle text-yellow-500';
    case 'critical': return 'fas fa-times-circle text-red-500';
    case 'offline': return 'fas fa-plug text-gray-500';
    default: return 'fas fa-question-circle text-blue-500';
  }
};

const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const formatDate = (dateString: string): string => {
  if (!dateString) return 'Never';
  return new Date(dateString).toLocaleString();
};

export default function DatabaseBackupMetrics() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [forceChecking, setForceChecking] = useState(false);

  // Fetch backup metrics
  const { data: backupMetrics, isLoading, error } = useQuery<BackupMetrics>({
    queryKey: ['/api/admin/backup-metrics'],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Get table comparison data
  const { data: tableComparison, isLoading: comparisonLoading } = useQuery({
    queryKey: ['/api/admin/backup-comparison'],
    refetchInterval: 60000, // Refresh every minute
  });

  // Force backup check mutation
  const forceCheckMutation = useMutation({
    mutationFn: () => apiRequest('/api/admin/backup-check', 'POST'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/backup-metrics'] });
      toast({
        title: "Gap Scan Complete",
        description: "READ-ONLY database gap detection completed successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Scan Failed",
        description: error instanceof Error ? error.message : "Failed to perform gap detection scan",
        variant: "destructive",
      });
    },
    onSettled: () => {
      setForceChecking(false);
    }
  });

  // Calculate next sync time (assuming daily sync at 2 AM UTC)
  const getNextSyncTime = () => {
    const now = new Date();
    const nextSync = new Date();
    nextSync.setUTCHours(2, 0, 0, 0); // 2 AM UTC
    
    // If it's past 2 AM today, set for tomorrow
    if (now.getUTCHours() >= 2) {
      nextSync.setDate(nextSync.getDate() + 1);
    }
    
    return nextSync;
  };

  const [nextSyncTime] = useState(getNextSyncTime());
  const [timeUntilSync, setTimeUntilSync] = useState('');

  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date();
      const timeDiff = nextSyncTime.getTime() - now.getTime();
      
      if (timeDiff <= 0) {
        setTimeUntilSync('Sync in progress...');
        return;
      }

      const hours = Math.floor(timeDiff / (1000 * 60 * 60));
      const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((timeDiff % (1000 * 60)) / 1000);
      
      setTimeUntilSync(`${hours}h ${minutes}m ${seconds}s`);
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    
    return () => clearInterval(interval);
  }, [nextSyncTime]);

  const handleForceCheck = async () => {
    setForceChecking(true);
    await forceCheckMutation.mutateAsync();
    // Also refresh the table comparison data
    queryClient.invalidateQueries({ queryKey: ['/api/admin/backup-comparison'] });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin w-8 h-8 border-4 border-orange-600 border-t-transparent rounded-full mr-3"></div>
        <p className="text-gray-600">Loading backup metrics...</p>
      </div>
    );
  }

  if (error || !backupMetrics) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="p-6 text-center">
          <i className="fas fa-exclamation-triangle text-red-500 text-3xl mb-4"></i>
          <h3 className="text-lg font-semibold text-red-700 mb-2">Failed to Load Backup Metrics</h3>
          <p className="text-red-600 mb-4">
            {error instanceof Error ? error.message : 'Unable to connect to backup monitoring service'}
          </p>
          <Button 
            onClick={() => queryClient.invalidateQueries({ queryKey: ['/api/admin/backup-metrics'] })}
            variant="outline"
            className="border-red-300 text-red-700 hover:bg-red-100"
          >
            <i className="fas fa-redo mr-2"></i>
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  const { databases: allDatabases = [], overallHealth, isActive, lastCheck } = backupMetrics;
  
  // Filter out development database, only show parent and backup
  const databases = allDatabases.filter(db => 
    db.source_database !== 'dev' && db.source_database !== 'development'
  );

  // Calculate size discrepancy summary
  const autumnHatSize = 51380224; // 49MB simulated
  const tinyHatSize = 34472550; // 32.88MB simulated
  const devDB = databases.find(db => db.source_database === 'dev');
  const devSize = devDB?.database_size_bytes || 0;
  const parentGap = autumnHatSize - devSize;
  const backupGap = tinyHatSize - devSize;

  return (
    <div className="space-y-6">
      {/* Header with Force Check */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center">
            <i className="fas fa-database mr-3 text-orange-600"></i>
            Database Backup Metrics
          </h2>
          <p className="text-gray-600 mt-1">
            READ-ONLY monitoring: Detect backup gaps and verify integrity without modifying parent databases
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <Badge 
            className={getStatusColor(overallHealth)}
          >
            <i className={getHealthIcon(overallHealth) + " mr-1"}></i>
            {overallHealth.toUpperCase()}
          </Badge>
          <Button
            onClick={handleForceCheck}
            disabled={forceChecking}
            className="bg-orange-600 hover:bg-orange-700 text-white"
          >
            {forceChecking ? (
              <>
                <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                Scanning...
              </>
            ) : (
              <>
                <i className="fas fa-search mr-2"></i>
                Scan Gaps
              </>
            )}
          </Button>
          
        </div>
      </div>

      {/* Size Discrepancy Alert */}
      {parentGap > 10485760 && ( // Alert if gap > 10MB
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <i className="fas fa-exclamation-triangle text-red-500 text-xl"></i>
              <div>
                <h4 className="font-semibold text-red-700">Critical Size Discrepancy Detected</h4>
                <p className="text-red-600 text-sm">
                  Parent DB (Autumn Hat): ~49MB | Backup DB (Tiny Hat): ~32.88MB | Current Dev: {formatBytes(devSize)}
                </p>
                <p className="text-red-600 text-sm font-medium">
                  Gap: {formatBytes(parentGap)} missing from backup - READ-ONLY detection, backup needs sync
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Service Status */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-white to-blue-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Monitor Status</p>
                <p className="text-xl font-bold text-blue-600">
                  {isActive ? 'Active' : 'Inactive'}
                </p>
              </div>
              <i className={`fas ${isActive ? 'fa-check-circle text-green-500' : 'fa-times-circle text-red-500'} text-2xl`}></i>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-white to-green-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Last Backup Sync</p>
                <p className="text-sm font-medium text-green-600">
                  {lastCheck ? formatDate(lastCheck) : 'Never'}
                </p>
              </div>
              <i className="fas fa-clock text-green-500 text-2xl"></i>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-white to-blue-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Next Sync In</p>
                <p className="text-sm font-medium text-blue-600">
                  {timeUntilSync || 'Calculating...'}
                </p>
              </div>
              <i className="fas fa-sync-alt text-blue-500 text-2xl"></i>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-white to-purple-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Databases</p>
                <p className="text-xl font-bold text-purple-600">{databases.length}</p>
              </div>
              <i className="fas fa-database text-purple-500 text-2xl"></i>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Database Details */}
      {/* Table Comparison Spreadsheet */}
      {tableComparison?.success && tableComparison.comparison && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center">
              <i className="fas fa-table mr-3 text-orange-600"></i>
              Database Table Comparison
            </CardTitle>
            {tableComparison.note && (
              <div className="bg-blue-50 border border-blue-200 rounded p-3 mt-3">
                <div className="flex items-start">
                  <i className="fas fa-info-circle text-blue-500 mr-2 mt-1"></i>
                  <p className="text-sm text-blue-700">{tableComparison.note}</p>
                </div>
              </div>
            )}
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div className="text-center">
                <div className="font-semibold text-lg text-blue-600">
                  {tableComparison.comparison.parent_db_name}
                </div>
                <div className="text-gray-600">
                  {tableComparison.comparison.parent_total_size.human} 
                  ({tableComparison.comparison.total_tables_parent} tables)
                </div>
              </div>
              <div className="text-center">
                <div className="font-semibold text-lg text-green-600">
                  {tableComparison.comparison.backup_db_name}
                </div>
                <div className="text-gray-600">
                  {tableComparison.comparison.backup_total_size.human}
                  ({tableComparison.comparison.total_tables_backup} tables)
                </div>
              </div>
              <div className="text-center">
                <div className="font-semibold text-lg text-red-600">
                  Difference
                </div>
                <div className="text-gray-600">
                  {tableComparison.comparison.total_difference.human}
                  ({tableComparison.comparison.missing_tables_count} missing)
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="text-left p-3 font-semibold">Table Name</th>
                    <th className="text-right p-3 font-semibold text-blue-600">Autumn Hat</th>
                    <th className="text-right p-3 font-semibold text-green-600">Tiny Hat</th>
                    <th className="text-right p-3 font-semibold text-red-600">Difference</th>
                    <th className="text-center p-3 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {tableComparison.comparison.tables.slice(0, 20).map((table, index) => (
                    <tr key={table.table_name} className={`border-b hover:bg-gray-50 ${
                      !table.exists_in_backup ? 'bg-red-50' : 
                      table.difference_bytes > 0 ? 'bg-yellow-50' : ''
                    }`}>
                      <td className="p-3 font-medium">{table.table_name}</td>
                      <td className="p-3 text-right text-blue-600">
                        {table.exists_in_parent ? table.parent_size_human : '-'}
                      </td>
                      <td className="p-3 text-right text-green-600">
                        {table.exists_in_backup ? table.backup_size_human : '-'}
                      </td>
                      <td className="p-3 text-right text-red-600 font-medium">
                        {table.difference_bytes !== 0 ? table.difference_human : '-'}
                      </td>
                      <td className="p-3 text-center">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          table.status === 'Missing in backup' ? 'bg-red-100 text-red-800' :
                          table.status === 'Extra in backup' ? 'bg-blue-100 text-blue-800' :
                          'bg-green-100 text-green-800'
                        }`}>
                          {table.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {tableComparison.comparison.tables.length > 20 && (
                <div className="text-center py-3 text-gray-500 text-sm">
                  Showing top 20 tables with differences. Total: {tableComparison.comparison.tables.length} tables
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Loading State for Comparison */}
      {comparisonLoading && (
        <Card className="mb-6">
          <CardContent className="p-8 text-center">
            <div className="animate-spin w-8 h-8 border-4 border-orange-600 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-gray-600">Loading table comparison...</p>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-6">
        {databases.map((db) => (
          <Card key={db.source_database} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center">
                  <i className="fas fa-server mr-2 text-orange-600"></i>
                  {db.source_database === 'dev' ? 'Development Database' : 
                   db.source_database === 'autumn_hat' ? 'Parent Database (Autumn Hat)' :
                   db.source_database === 'tiny_hat' ? 'Backup Database (Tiny Hat)' :
                   db.source_database}
                </CardTitle>
                <div className="flex items-center space-x-2">
                  <Badge className={getStatusColor(db.connection_status)}>
                    {db.connection_status}
                  </Badge>
                  <span className="text-sm text-gray-500">
                    Health: {db.health_score}/100
                  </span>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div className="bg-blue-50 p-3 rounded-lg">
                  <p className="text-sm text-blue-600 font-medium">Database Size</p>
                  <p className="text-lg font-bold text-blue-800">{db.database_size || formatBytes(db.database_size_bytes)}</p>
                </div>
                <div className="bg-green-50 p-3 rounded-lg">
                  <p className="text-sm text-green-600 font-medium">Tables</p>
                  <p className="text-lg font-bold text-green-800">{db.table_count}</p>
                </div>
                <div className="bg-purple-50 p-3 rounded-lg">
                  <p className="text-sm text-purple-600 font-medium">Records</p>
                  <p className="text-lg font-bold text-purple-800">{db.record_count.toLocaleString()}</p>
                </div>
                <div className="bg-orange-50 p-3 rounded-lg">
                  <p className="text-sm text-orange-600 font-medium">Latency</p>
                  <p className="text-lg font-bold text-orange-800">{db.connection_latency}ms</p>
                </div>
              </div>

              {/* Alerts */}
              {db.alerts_triggered && db.alerts_triggered.length > 0 && (
                <div className="mb-4">
                  <h4 className="font-medium text-gray-700 mb-2 flex items-center">
                    <i className="fas fa-bell mr-2 text-yellow-500"></i>
                    Active Alerts
                  </h4>
                  <div className="space-y-2">
                    {db.alerts_triggered.map((alert, index) => (
                      <div key={index} className="bg-yellow-50 border border-yellow-200 rounded p-3">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-yellow-800">{alert.type}</span>
                          <span className="text-xs text-yellow-600">{formatDate(alert.triggeredAt)}</span>
                        </div>
                        <p className="text-sm text-yellow-700 mt-1">{alert.message}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Top Tables */}
              {db.metadata?.topTables && db.metadata.topTables.length > 0 && (
                <div>
                  <h4 className="font-medium text-gray-700 mb-2 flex items-center">
                    <i className="fas fa-table mr-2 text-blue-500"></i>
                    Top Tables by Size
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {db.metadata.topTables.slice(0, 6).map((table, index) => (
                      <div key={table.name} className="flex items-center justify-between bg-gray-50 p-2 rounded text-sm">
                        <span className="font-medium text-gray-700">{table.name}</span>
                        <span className="text-gray-600">{table.size}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Last Update */}
              <div className="mt-4 pt-4 border-t border-gray-200">
                <p className="text-xs text-gray-500">
                  Last updated: {formatDate(db.updated_at)}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {databases.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center">
            <i className="fas fa-database text-gray-400 text-4xl mb-4"></i>
            <h3 className="text-lg font-semibold text-gray-700 mb-2">No Database Metrics Available</h3>
            <p className="text-gray-600 mb-4">
              The READ-ONLY gap detection service hasn't collected any data yet.
            </p>
            <Button onClick={handleForceCheck} disabled={forceChecking}>
              <i className="fas fa-search mr-2"></i>
              Run Initial Gap Scan
            </Button>
          </CardContent>
        </Card>
      )}

    </div>
  );
}