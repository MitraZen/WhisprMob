import { SUPABASE_CONFIG } from '@/config/env';
import { FlexibleDatabaseService } from '@/services/flexibleDatabase';
import { DatabaseDiscoveryService } from '@/utils/databaseDiscovery';

// Comprehensive test function to analyze your database and align with web app
export const testSupabaseConnection = async () => {
  console.log('🔍 Testing Supabase connection and analyzing database structure...');
  
  try {
    // Test 1: Check Supabase configuration
    console.log('Test 1: Checking Supabase configuration');
    
    if (!SUPABASE_CONFIG.url || !SUPABASE_CONFIG.anonKey) {
      return { success: false, error: 'Supabase configuration missing' };
    }
    
    console.log('Test 1 passed: Supabase configuration loaded');
    
    // Test 2: Test basic HTTP connection
    console.log('Test 2: Testing direct HTTP connection');
    try {
      const response = await fetch(`${SUPABASE_CONFIG.url}/rest/v1/`, {
        method: 'GET',
        headers: {
          'apikey': SUPABASE_CONFIG.anonKey,
          'Authorization': `Bearer ${SUPABASE_CONFIG.anonKey}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        console.log('Test 2 passed: Direct HTTP connection successful');
      } else {
        console.log('Test 2: HTTP connection failed, but continuing...', response.status);
      }
    } catch (httpError) {
      console.log('Test 2: HTTP test failed, but continuing...', httpError);
    }
    
    // Test 3: Discover and analyze database structure
    console.log('Test 3: Analyzing database structure');
    const analysis = await DatabaseDiscoveryService.getDatabaseAnalysis();
    
    console.log('📊 Database Analysis Results:');
    analysis.tables.forEach(table => {
      if (table.exists) {
        console.log(`✅ Table '${table.name}' exists with columns:`, table.columns);
      } else {
        console.log(`❌ Table '${table.name}' does not exist`);
      }
    });
    
    console.log('💡 Recommendations:');
    analysis.recommendations.forEach(rec => console.log(rec));
    
    // Test 4: Test flexible database service
    console.log('Test 4: Testing flexible database service');
    const connectionTest = await FlexibleDatabaseService.testConnection();
    
    if (!connectionTest) {
      console.log('Test 4: Flexible database service failed');
      return { 
        success: false, 
        error: 'No compatible user table found',
        analysis,
        sql: DatabaseDiscoveryService.generateAlignmentSQL(analysis)
      };
    }
    
    console.log('Test 4 passed: Flexible database service working');
    
    // Generate alignment SQL
    const alignmentSQL = DatabaseDiscoveryService.generateAlignmentSQL(analysis);
    
    return { 
      success: true, 
      message: 'Database analysis complete! Check recommendations below.',
      analysis,
      sql: alignmentSQL
    };
    
  } catch (error) {
    console.error('Connection test error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
};

export default testSupabaseConnection;