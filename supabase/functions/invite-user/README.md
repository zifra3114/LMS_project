# Invite User Edge Function

This Supabase Edge Function handles user invitations for the LMS system.

## Setup

1. Make sure you have Supabase CLI installed:
```bash
npm install -g supabase
```

2. Link your project:
```bash
supabase link --project-ref your-project-ref
```

3. Deploy the function:
```bash
supabase functions deploy invite-user
```

4. Set required secrets:
```bash
supabase secrets set SUPABASE_URL=your-supabase-url
supabase secrets set SUPABASE_ANON_KEY=your-anon-key
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

## Environment Variables Required

- `SUPABASE_URL`: Your Supabase project URL
- `SUPABASE_ANON_KEY`: Your Supabase anon/public key
- `SUPABASE_SERVICE_ROLE_KEY`: Your Supabase service role key (keep this secret!)

## How It Works

1. Validates the requesting admin is authenticated
2. Creates a new user with the provided email and role
3. Sends an invitation email via Supabase Auth
4. Inserts a record in the appropriate table (students or teachers)
5. Returns success message

## Testing Locally

```bash
supabase functions serve invite-user
```

Then test with curl:
```bash
curl -i --location --request POST 'http://localhost:54321/functions/v1/invite-user' \
  --header 'Authorization: Bearer YOUR_ACCESS_TOKEN' \
  --header 'Content-Type: application/json' \
  --data '{"fullName":"Test User","email":"test@example.com","role":"student"}'
```

## Database Tables Required

The function assumes these tables exist:
- `students` table with columns: `user_id`, `email`, `full_name`, `course_id`, `batch_id`
- `teachers` table with columns: `user_id`, `email`, `full_name`

## Email Configuration

Make sure email templates are configured in Supabase Dashboard:
1. Go to Authentication > Email Templates
2. Customize the "Invite user" template
3. The user will receive a link to set their password
