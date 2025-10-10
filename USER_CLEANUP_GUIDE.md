# User Cleanup Scripts - Universal Compatibility Guide

## ✅ **Universal Database Client Support**

The cleanup scripts now work with **any database client** (Supabase Dashboard, pgAdmin, DBeaver, etc.) without requiring psql-specific commands!

## 📁 **Available Scripts**

### 1. **`cleanup-user-simple.sql`** - Manual Script
- **Usage**: Replace the email in **line 12** only
- **Location**: `WHERE up.email = 'testusr23@gmail.com' OR au.email = 'testusr23@gmail.com'`
- **Example**: Change `'testusr23@gmail.com'` to `'john.doe@example.com'`

### 2. **`generate-user-cleanup-universal.ps1`** - PowerShell Generator
- **Usage**: Run with email parameter
- **Command**: `.\generate-user-cleanup-universal.ps1 -Email "john.doe@example.com"`
- **Output**: Generates a custom SQL file with the email already set

## 🎯 **How to Use**

### **Option A: Direct SQL Script**
1. Open `cleanup-user-simple.sql`
2. Change **line 12**: `WHERE up.email = 'your-email@example.com' OR au.email = 'your-email@example.com'`
3. Run the script in **any database client**
4. Review the preview results
5. Remove the `/*` and `*/` block comments around the cleanup section to execute

### **Option B: PowerShell Generator**
1. Run: `.\generate-user-cleanup-universal.ps1 -Email "your-email@example.com"`
2. This creates a custom SQL file with the email already set
3. Run the generated SQL file in **any database client**

## 🔧 **What Changed**

### **Before** (psql-specific commands)
```sql
\set target_email 'user@example.com'  -- Only works in psql
WHERE up.email = :'target_email' OR au.email = :'target_email'
```

### **After** (Universal SQL)
```sql
WHERE up.email = 'user@example.com' OR au.email = 'user@example.com'  -- Works everywhere
-- Just replace the email string directly
```

## ⚡ **Benefits**

1. **Universal Compatibility**: Works in Supabase Dashboard, pgAdmin, DBeaver, etc.
2. **Simple String Replacement**: Just find and replace the email address
3. **No Special Commands**: Pure SQL that works everywhere
4. **Easy to Use**: Clear, straightforward approach

## 🚨 **Safety Features**

- **Preview First**: Always shows what will be deleted before execution
- **Commented DELETE**: All destructive operations are commented out by default
- **Backup Recommendations**: Includes backup creation suggestions
- **Verification**: Includes post-cleanup verification queries

## 📋 **Quick Start**

```bash
# Generate a cleanup script for specific user
.\generate-user-cleanup-universal.ps1 -Email "problematic-user@example.com"

# This creates: cleanup-user-problematic-user_example_com-20250110_153000.sql
# Open the generated file and run it in ANY database client
```

## 🔍 **Finding the Email to Replace**

In the generated SQL file, look for this line:
```sql
WHERE up.email = 'your-email@example.com' OR au.email = 'your-email@example.com'
```

Replace `'your-email@example.com'` with the actual email address.

## 🚀 **How to Execute Cleanup**

### **Step 1: Run Preview First**
The script will show you exactly what will be deleted. Always review this first!

### **Step 2: Execute Cleanup**
To actually delete the data, you need to remove the block comments:

1. **Find the cleanup section** (around line 109)
2. **Remove `/*`** at the beginning of the cleanup section
3. **Remove `*/`** at the end of the cleanup section
4. **Run the script again**

### **Example:**
```sql
-- BEFORE (safe preview only):
/*
Step 1: Create backup (recommended)
CREATE TABLE backup_user_cleanup_...
*/

-- AFTER (will actually delete):
Step 1: Create backup (recommended)
CREATE TABLE backup_user_cleanup_...
```

## ✅ **Ready to Use**

Both scripts are now updated with:
- ✅ Universal database client compatibility
- ✅ Correct column names (`sender_id`, `blocker_id`, etc.)
- ✅ Proper GROUP BY clauses
- ✅ Comprehensive cleanup coverage
- ✅ Safety features and previews
- ✅ No psql-specific commands