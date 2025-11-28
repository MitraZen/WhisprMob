# Location Storage Redesign for Live Whisprs

## 🎯 Goal
Optimize location storage and filtering to reduce lag in Live Whispr functionality by using geohash-based filtering at the database level.

## 📊 New Design

### Storage Strategy
**Store in `user_locations` table:**
- ✅ `latitude` (NUMERIC) - Exact latitude for distance calculations
- ✅ `longitude` (NUMERIC) - Exact longitude for distance calculations  
- ✅ `geohash_lvl2` (TEXT) - ~500km radius for broad filtering
- ✅ `geohash_lvl3` (TEXT) - ~100km radius for regional filtering

**Removed:**
- ❌ `geo_bucket` (SHA256 hash) - Cannot be decoded, adds no value

### How It Works

#### 1. **Location Updates** (`NearbyService.updateUserLocation`)
- Gets exact GPS coordinates
- Calculates geohash lvl2 and lvl3 using `GeohashUtil`
- Stores all four values in `user_locations` table

#### 2. **Real-time Subscriptions** (`WhisperFeed`)
- Fetches user's geohash lvl2/lvl3 on mount
- Uses geohash filtering in Supabase real-time subscription:
  ```typescript
  filter: `or(geohash_lvl2.eq.${userGeohash.lvl2},geohash_lvl3.eq.${userGeohash.lvl3})`
  ```
- **Performance Benefit**: Database filters at source, only relevant whisprs are sent to client

#### 3. **Distance Calculations** (`TextWhisperService`)
- Uses exact `latitude`/`longitude` for precise Haversine distance calculations
- No more failed decode attempts from geo_bucket

#### 4. **Whispr Creation** (`create_text_whispr_simplified`)
- Should calculate and store `geohash_lvl2` and `geohash_lvl3` when creating whisprs
- Enables efficient filtering in real-time subscriptions

## 🚀 Performance Improvements

### Before (geo_bucket approach):
- ❌ All whisprs sent to client, filtered client-side
- ❌ Cannot decode geo_bucket for distance calculations
- ❌ No database-level filtering
- ❌ Laggy real-time updates

### After (geohash lvl2/lvl3 approach):
- ✅ Database filters using indexed geohash columns
- ✅ Only relevant whisprs sent to client
- ✅ Exact lat/lng available for distance calculations
- ✅ Fast real-time updates with minimal data transfer

## 📝 Database Migration

Run `database/migrate-user-locations-geohash.sql` to:
1. Add `latitude`, `longitude`, `geohash_lvl2`, `geohash_lvl3` columns
2. Create indexes for efficient filtering
3. (Optional) Remove `geo_bucket` column after migration

## 🔧 Files Updated

1. **`src/modules/nearby/NearbyService.ts`**
   - Removed `createGeoBucket()` and `encodeGeohash()`
   - Added `generateGeohashLevels()` using `GeohashUtil`
   - Updated `updateUserLocation()` to store lat/lng + geohash lvl2/lvl3

2. **`src/components/liveWhispers/WhisperFeed.tsx`**
   - Added geohash fetching on mount
   - Updated real-time subscription to use geohash filtering
   - Filters at database level instead of client-side

3. **`src/services/textWhisperServiceClean.ts`**
   - Removed all `geo_bucket` decoding attempts
   - Uses `latitude`/`longitude` directly from `user_locations`

4. **`database/migrate-user-locations-geohash.sql`**
   - Migration script for database schema update

## ✅ Next Steps

1. **Run database migration** in Supabase SQL editor
2. **Update `create_text_whispr_simplified` function** to calculate and store geohash lvl2/lvl3
3. **Test real-time subscriptions** to verify geohash filtering works
4. **Monitor performance** - should see reduced lag in Live Whispr feed

## 📐 Geohash Precision Levels

- **lvl2** (~500km): For broad regional filtering
- **lvl3** (~100km): For nearby/local filtering
- **lvl4** (~25km): Available but not used yet
- **lvl5** (~6km): Available but not used yet

## 🔍 Indexes Created

```sql
CREATE INDEX idx_user_locations_geohash_lvl2 ON user_locations(geohash_lvl2);
CREATE INDEX idx_user_locations_geohash_lvl3 ON user_locations(geohash_lvl3);
CREATE INDEX idx_whisprs_geohash_lvl2 ON whisprs(geohash_lvl2);
CREATE INDEX idx_whisprs_geohash_lvl3 ON whisprs(geohash_lvl3);
```

These indexes enable fast filtering in real-time subscriptions and queries.

