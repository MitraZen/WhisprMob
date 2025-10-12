# SQL Files Archive

This directory contains archived SQL files that are no longer actively used in the project but are preserved for historical reference and potential future use.

## 📁 **Directory Structure**

### **debug/** (6 files)
Debug scripts used during development to troubleshoot specific issues.
- `debug-anonymous-buddy.sql`
- `debug-anonymous-user.sql`
- `debug-buddy-creation-step-by-step.sql`
- `debug-buddy-creation.sql`
- `debug-existing-buddy-issue.sql`
- `debug-new-note.sql`

### **testing/** (28 files)
Test scripts and verification queries used during development and testing phases.
- `basic-database-check.sql`
- `test-*.sql` files (various test scenarios)
- `check-*.sql` files (verification queries)
- `verify-*.sql` files (function verification)

### **cleanup/** (10 files)
Cleanup scripts used to remove test data, orphaned records, and temporary data.
- `cleanup-*.sql` files (various cleanup operations)
- `clean-*.sql` files (database cleaning)

### **fixes/** (25 files)
Fix scripts that addressed specific bugs and issues during development.
- `fix-*.sql` files (various bug fixes)
- `permanent-*.sql` files (permanent fixes)
- `complete-fix-*.sql` files (comprehensive fixes)

### **legacy-functions/** (13 files)
Legacy function definitions that have been replaced or are no longer used.
- `create-*-function.sql` files (old function definitions)
- `update-*.sql` files (function updates)

### **analysis/** (8 files)
Analysis scripts used for performance optimization and database analysis.
- `database-egress-analysis.sql`
- `comprehensive-performance-optimization.sql`
- `optimize-*.sql` files (optimization scripts)

## 🔍 **How to Use This Archive**

### **Finding Specific Files**
1. **By Category**: Check the appropriate subdirectory based on the file's purpose
2. **By Name Pattern**: Use your IDE's search function to find files by name
3. **By Date**: Check file modification dates to find recent changes

### **Referencing Historical Fixes**
1. **Bug Fixes**: Check `fixes/` directory for solutions to specific issues
2. **Performance Issues**: Check `analysis/` directory for optimization scripts
3. **Function Changes**: Check `legacy-functions/` for function evolution

### **Restoring Files**
If you need to restore a file from the archive:
1. Copy the file from the appropriate archive subdirectory
2. Place it in the root directory
3. Update any references or dependencies
4. Test thoroughly before using in production

## ⚠️ **Important Notes**

- **Do not modify files in this archive** - they are preserved for historical reference
- **Test any restored files** before using them in production
- **Check for dependencies** when restoring files
- **Update documentation** if you restore files to active use

## 📅 **Archive Date**
Files were archived on: **January 12, 2025**

## 🔄 **Maintenance**
This archive should be reviewed periodically to:
- Remove files that are no longer needed
- Reorganize if new categories emerge
- Update this README if structure changes

---

*This archive preserves the complete history of database development while keeping the active project clean and organized.*
