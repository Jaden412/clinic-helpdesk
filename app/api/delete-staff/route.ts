import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  const { userId } = await req.json()

  if (!userId) {
    return NextResponse.json({ error: 'No user ID provided' }, { status: 400 })
  }

  // Delete the profile row first
  const { error: profileError } = await supabaseAdmin
    .from('profiles')
    .delete()
    .eq('id', userId)

  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 400 })
  }

  // Then delete the actual auth account
  const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId)

  if (authError) {
    return NextResponse.json({ error: authError.message }, { status: 400 })
  }

  return NextResponse.json({ success: true })
}