import { Router } from 'express';
import { glossaryAutoUpdater } from '../glossary-auto-update';
import { getGlossaryStats } from '../setup-glossary-db';
import { isAuthenticated } from '../replitAuth';

const router = Router();

/**
 * Admin endpoint to manually trigger glossary update
 */
router.post('/api/admin/glossary/update', isAuthenticated, async (req, res) => {
  try {
    console.log('🔧 Manual glossary update triggered by admin');
    await glossaryAutoUpdater.manualUpdate();
    
    res.json({
      success: true,
      message: 'Glossary update completed successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Manual glossary update failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update glossary',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Admin endpoint to get glossary update status
 */
router.get('/api/admin/glossary/status', isAuthenticated, async (req, res) => {
  try {
    const status = glossaryAutoUpdater.getStatus();
    const stats = await getGlossaryStats();
    
    res.json({
      success: true,
      status: {
        ...status,
        statistics: stats
      }
    });
  } catch (error) {
    console.error('❌ Failed to get glossary status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get glossary status'
    });
  }
});

export default router;