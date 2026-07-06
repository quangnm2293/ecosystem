#!/usr/bin/env bash
# Kiểm tra env trước khi deploy production
set -euo pipefail

required=(
  NEXT_PUBLIC_SUPABASE_URL
  NEXT_PUBLIC_SUPABASE_ANON_KEY
  SUPABASE_SERVICE_ROLE_KEY
  NEXT_PUBLIC_SITE_URL
  REVALIDATE_SECRET
)

optional=(
  GROQ_API_KEY
  GEMINI_API_KEY
  FASTMOSS_CLIENT_ID
)

echo "=== Deploy preflight ==="

missing=0
for key in "${required[@]}"; do
  if [[ -z "${!key:-}" ]]; then
    echo "❌ Missing: $key"
    missing=1
  else
    echo "✅ $key"
  fi
done

for key in "${optional[@]}"; do
  if [[ -z "${!key:-}" ]]; then
    echo "⚠️  Optional: $key (not set)"
  else
    echo "✅ $key"
  fi
done

if [[ "$missing" -eq 1 ]]; then
  echo ""
  echo "Set missing vars on Vercel Dashboard → Settings → Environment Variables"
  exit 1
fi

if [[ "${NEXT_PUBLIC_SITE_URL:-}" == *localhost* ]]; then
  echo "⚠️  NEXT_PUBLIC_SITE_URL still points to localhost — update for production"
fi

echo ""
echo "Running build..."
pnpm build
echo ""
echo "✅ Ready to deploy (vercel --prod or push to GitHub connected to Vercel)"
