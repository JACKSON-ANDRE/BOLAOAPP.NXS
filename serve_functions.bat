@echo off
echo Starting Supabase Edge Functions locally...
echo Please leave this window OPEN while testing the payment button.
echo.
npx supabase functions serve --no-verify-jwt --env-file .env.local
pause
