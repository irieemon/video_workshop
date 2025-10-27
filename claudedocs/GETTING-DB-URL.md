# Getting Your Supabase Database URL

The `SUPABASE_DB_URL` is required to run database migrations. Here's how to get it:

## Option 1: From Supabase Dashboard (Recommended)

1. Go to your Supabase project dashboard: https://app.supabase.com/project/qbnkdtbqabpnkoadguez
2. Click on **Settings** (gear icon) in the sidebar
3. Navigate to **Database** section
4. Scroll down to **Connection String**
5. Select the **URI** tab
6. Copy the connection string (it will look like this):
   ```
   postgresql://postgres:[YOUR-PASSWORD]@db.qbnkdtbqabpnkoadguez.supabase.co:5432/postgres
   ```
7. Replace `[YOUR-PASSWORD]` with your actual database password

## Option 2: Construct Manually

If you have your Supabase password, the format is:

```bash
postgresql://postgres:YOUR_PASSWORD@db.qbnkdtbqabpnkoadguez.supabase.co:5432/postgres
```

Replace `YOUR_PASSWORD` with your actual Supabase database password.

## Adding to .env.local

Once you have the connection string:

```bash
echo "SUPABASE_DB_URL=postgresql://postgres:YOUR_PASSWORD@db.qbnkdtbqabpnkoadguez.supabase.co:5432/postgres" >> .env.local
```

**Or edit `.env.local` directly** and add:

```bash
SUPABASE_DB_URL=postgresql://postgres:YOUR_PASSWORD@db.qbnkdtbqabpnkoadguez.supabase.co:5432/postgres
```

## Security Note

⚠️ **IMPORTANT**:
- Never commit `.env.local` to git (it's already in `.gitignore`)
- The database URL contains your password - keep it secret
- Only use this URL for migrations and admin scripts
- Don't expose it to client-side code

## Alternative: Skip Migration for Now

If you don't have access to the database password right now, you can:

1. **Skip Phase 1 migration** - Continue to Phase 2-5 implementation
2. **Run migration later** when you have database access
3. **Test admin features** with the code in place (will need migration to actually work)

The code is ready - you just need to apply the database schema changes when you have access.

## Testing the Connection

Once you've added `SUPABASE_DB_URL`, test it:

```bash
# Test connection (should show database version)
psql "$SUPABASE_DB_URL" -c "SELECT version();"

# If successful, run the setup script
./scripts/setup-admin.sh
```

## Common Issues

**Error: "password authentication failed"**
- Double-check your password is correct
- Make sure you're using the DATABASE password, not your Supabase account password

**Error: "could not translate host name"**
- Check that the hostname is correct: `db.qbnkdtbqabpnkoadguez.supabase.co`
- Verify you have internet connection

**Error: "psql: command not found"**
- Install PostgreSQL client: `brew install postgresql` (macOS)
- Or use Supabase SQL Editor in the dashboard instead

## Using Supabase SQL Editor (No psql needed)

If you don't have `psql` installed, you can run the migration through the dashboard:

1. Go to https://app.supabase.com/project/qbnkdtbqabpnkoadguez/editor
2. Click **SQL Editor**
3. Click **New Query**
4. Copy the contents of `supabase-migrations/add-admin-role.sql`
5. Paste into the editor
6. Click **Run**
7. Manually set admin user:
   ```sql
   UPDATE profiles
   SET is_admin = TRUE
   WHERE email = 'test@example.com';
   ```

This achieves the same result as running the script!
