# Calendar Feature Database Migration

## Required Schema Changes

The Calendar feature adds scheduling functionality to activities. The following database columns need to be added to the existing `items` table in Supabase:

### New Columns

Add these columns to your `items` table in Supabase:

```sql
-- Add calendar scheduling fields to items table
ALTER TABLE items 
ADD COLUMN scheduled_date DATE,
ADD COLUMN start_time VARCHAR(5), -- HH:MM format
ADD COLUMN end_time VARCHAR(5),   -- HH:MM format  
ADD COLUMN all_day BOOLEAN;
```

### Column Details

- `scheduled_date` (DATE, nullable): The date when the activity is scheduled
- `start_time` (VARCHAR(5), nullable): Start time in HH:MM format (e.g., "09:30")
- `end_time` (VARCHAR(5), nullable): End time in HH:MM format (e.g., "11:00")
- `all_day` (BOOLEAN, nullable): Whether the activity is scheduled for the entire day

### Migration Steps

1. **Backup your data** (always recommended before schema changes)
2. **Run the ALTER TABLE statements** in your Supabase SQL editor
3. **Verify the changes** by checking the table structure
4. **Test the application** to ensure calendar functionality works

### Data Compatibility

- All existing activities will have `NULL` values for the new calendar fields
- This means they will appear as "unscheduled" in the Calendar view
- Users can then drag and drop activities from the "Unscheduled" sidebar to schedule them
- The migration is backward compatible - the List and Map views continue to work unchanged

### Rollback (if needed)

If you need to remove the calendar feature:

```sql
-- Remove calendar columns (this will delete all scheduling data!)
ALTER TABLE items 
DROP COLUMN scheduled_date,
DROP COLUMN start_time,
DROP COLUMN end_time,
DROP COLUMN all_day;
```

**Warning**: This will permanently delete all scheduling information.

## Features Added

After applying this migration, users will be able to:

1. **View Calendar**: New Calendar tab in navigation
2. **Schedule Activities**: Drag activities from "Unscheduled" sidebar to calendar days
3. **All-day Events**: Activities can be marked as all-day or with specific times
4. **Day View**: Click any day to see detailed schedule
5. **Cross-view Sync**: Scheduled activities show their dates in List view and filter Map view by day
6. **Easy Unscheduling**: Remove activities from calendar back to unscheduled status

## Post-Migration Testing

1. Navigate to the Calendar tab
2. Verify unscheduled activities appear in the sidebar
3. Test drag-and-drop scheduling
4. Try the day view by clicking on a calendar date
5. Verify scheduled activities appear correctly in List and Map views

