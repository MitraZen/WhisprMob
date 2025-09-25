import { FlexibleDatabaseService } from '@/services/flexibleDatabase';
import { SUPABASE_CONFIG } from '@/config/env';

export class DatabaseDiscoveryService {
  // Discover all tables in your database
  static async discoverTables(): Promise<string[]> {
    try {
      const response = await fetch(`${SUPABASE_CONFIG.url}/rest/v1/`, {
        method: 'GET',
        headers: {
          'apikey': SUPABASE_CONFIG.anonKey,
          'Authorization': `Bearer ${SUPABASE_CONFIG.anonKey}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // This will return information about available tables
      const data = await response.text();
      console.log('Database discovery response:', data);
      
      // For now, return common table names to test
      return ['user_profiles', 'users', 'profiles', 'messages', 'chats'];
    } catch (error) {
      console.error('Database discovery error:', error);
      return [];
    }
  }

  // Analyze a specific table structure
  static async analyzeTable(tableName: string): Promise<{
    exists: boolean;
    columns: string[];
    sampleData?: any;
  }> {
    try {
      // Test if table exists by trying to fetch one record
      const response = await fetch(`${SUPABASE_CONFIG.url}/rest/v1/${tableName}?limit=1`, {
        method: 'GET',
        headers: {
          'apikey': SUPABASE_CONFIG.anonKey,
          'Authorization': `Bearer ${SUPABASE_CONFIG.anonKey}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        return {
          exists: false,
          columns: [],
        };
      }

      const data = await response.json();
      const columns = data.length > 0 ? Object.keys(data[0]) : [];

      return {
        exists: true,
        columns,
        sampleData: data.length > 0 ? data[0] : null,
      };
    } catch (error) {
      console.error(`Error analyzing table ${tableName}:`, error);
      return {
        exists: false,
        columns: [],
      };
    }
  }

  // Get comprehensive database analysis
  static async getDatabaseAnalysis(): Promise<{
    tables: Array<{
      name: string;
      exists: boolean;
      columns: string[];
      sampleData?: any;
    }>;
    recommendations: string[];
  }> {
    const commonTables = ['user_profiles', 'users', 'profiles', 'messages', 'chats', 'connections'];
    const tables = [];
    const recommendations = [];

    console.log('🔍 Analyzing your database structure...');

    for (const tableName of commonTables) {
      const analysis = await this.analyzeTable(tableName);
      tables.push({
        name: tableName,
        ...analysis,
      });

      if (analysis.exists) {
        console.log(`✅ Table '${tableName}' exists with columns:`, analysis.columns);
        
        // Provide recommendations based on what we find
        if (tableName === 'user_profiles' || tableName === 'users') {
          if (analysis.columns.includes('email')) {
            recommendations.push(`✅ ${tableName} has email column - authentication ready`);
          } else {
            recommendations.push(`⚠️ ${tableName} missing email column - add for authentication`);
          }
          
          if (analysis.columns.includes('mood')) {
            recommendations.push(`✅ ${tableName} has mood column - mood selection ready`);
          } else {
            recommendations.push(`⚠️ ${tableName} missing mood column - add for mood features`);
          }
        }
      } else {
        console.log(`❌ Table '${tableName}' does not exist`);
      }
    }

    return { tables, recommendations };
  }

  // Generate SQL to align tables with mobile app needs
  static generateAlignmentSQL(analysis: {
    tables: Array<{
      name: string;
      exists: boolean;
      columns: string[];
    }>;
  }): string {
    let sql = '-- SQL to align your database with mobile app needs\n\n';
    
    const userTable = analysis.tables.find(t => t.exists && (t.name === 'user_profiles' || t.name === 'users'));
    
    if (userTable) {
      sql += `-- Working with existing table: ${userTable.name}\n`;
      
      const missingColumns = [];
      
      if (!userTable.columns.includes('email')) {
        missingColumns.push('email TEXT UNIQUE');
      }
      if (!userTable.columns.includes('mood')) {
        missingColumns.push('mood TEXT CHECK (mood IN (\'happy\', \'sad\', \'excited\', \'anxious\', \'calm\', \'angry\', \'curious\', \'lonely\', \'grateful\', \'hopeful\'))');
      }
      if (!userTable.columns.includes('is_online')) {
        missingColumns.push('is_online BOOLEAN DEFAULT false');
      }
      if (!userTable.columns.includes('last_seen')) {
        missingColumns.push('last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW()');
      }
      
      if (missingColumns.length > 0) {
        sql += `ALTER TABLE ${userTable.name} ADD COLUMN IF NOT EXISTS ${missingColumns.join(', ')};\n\n`;
      } else {
        sql += `-- All required columns already exist in ${userTable.name}\n\n`;
      }
      
      // Add indexes
      sql += `-- Add indexes for better performance\n`;
      sql += `CREATE INDEX IF NOT EXISTS idx_${userTable.name}_email ON ${userTable.name}(email);\n`;
      sql += `CREATE INDEX IF NOT EXISTS idx_${userTable.name}_mood ON ${userTable.name}(mood);\n`;
      sql += `CREATE INDEX IF NOT EXISTS idx_${userTable.name}_online ON ${userTable.name}(is_online);\n\n`;
      
      // Add RLS policies
      sql += `-- Enable Row Level Security\n`;
      sql += `ALTER TABLE ${userTable.name} ENABLE ROW LEVEL SECURITY;\n\n`;
      
      sql += `-- Create policies for anonymous access\n`;
      sql += `DROP POLICY IF EXISTS "Users can read all ${userTable.name}" ON ${userTable.name};\n`;
      sql += `DROP POLICY IF EXISTS "Users can insert own ${userTable.name}" ON ${userTable.name};\n`;
      sql += `DROP POLICY IF EXISTS "Users can update own ${userTable.name}" ON ${userTable.name};\n\n`;
      
      sql += `CREATE POLICY "Users can read all ${userTable.name}" ON ${userTable.name}\n`;
      sql += `  FOR SELECT USING (true);\n\n`;
      
      sql += `CREATE POLICY "Users can insert own ${userTable.name}" ON ${userTable.name}\n`;
      sql += `  FOR INSERT WITH CHECK (true);\n\n`;
      
      sql += `CREATE POLICY "Users can update own ${userTable.name}" ON ${userTable.name}\n`;
      sql += `  FOR UPDATE USING (true);\n`;
    } else {
      sql += '-- No existing user table found. You may need to create one.\n';
      sql += '-- Consider using your web app\'s existing table structure.\n';
    }
    
    return sql;
  }
}












