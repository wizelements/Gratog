#!/bin/bash
# Square Catalog Sync Cron Job
# Runs daily at 2 AM to sync products from Square

LOG_FILE="/var/log/catalog-sync.log"
SCRIPT_DIR="/app"

# Change to script directory
cd $SCRIPT_DIR

# Run sync with timestamp
echo "==================================" >> $LOG_FILE
echo "Catalog Sync Started: $(date)" >> $LOG_FILE
echo "==================================" >> $LOG_FILE

# Execute sync script
node scripts/syncCatalog.js >> $LOG_FILE 2>&1

# Log completion
echo "Catalog Sync Completed: $(date)" >> $LOG_FILE
echo "" >> $LOG_FILE

# Keep log file size manageable (keep last 1000 lines)
tail -n 1000 $LOG_FILE > ${LOG_FILE}.tmp
mv ${LOG_FILE}.tmp $LOG_FILE

exit 0
