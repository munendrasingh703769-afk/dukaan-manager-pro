import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get('authorization') || '';
    const token = authHeader.replace('Bearer ', '').trim();
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const reason = body?.reason || 'User requested account deletion';

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    if (!url || !serviceKey) return NextResponse.json({ error: 'Server Service Key missing' }, { status: 500 });

    const admin = createClient(url, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    const { data: { user }, error: userErr } = await admin.auth.getUser(token);
    if (userErr || !user) return NextResponse.json({ error: 'Invalid session' }, { status: 401 });

    const { data: prof } = await admin.from('profiles').select('*').eq('id', user.id).single();

    // 1. Save permanent audit log for Admin before deleting
    await admin.from('deleted_accounts').insert([{
      user_id: user.id,
      full_name: prof?.full_name || user.user_metadata?.full_name || 'Customer',
      email: user.email || prof?.email || '',
      phone: prof?.phone || user.phone || '',
      role: prof?.role || 'customer',
      reason
    }]);

    // 2. Notify Admin/Owner users
    const { data: admins } = await admin.from('profiles').select('id').in('role', ['admin', 'owner', 'superadmin']);
    if (Array.isArray(admins) && admins.length > 0) {
      await admin.from('notifications').insert(
        admins.map((a: any) => ({
          user_id: a.id,
          customer_id: a.id,
          title: '🚨 Customer Account Deleted',
          message: `${prof?.full_name || user.email} (${user.email}) ने अपना अकाउंट डिलीट कर दिया। कारण: ${reason}`,
          type: 'account_deleted'
        }))
      );
    }

    // 3. Delete profile row & permanently delete from Supabase Auth so same Gmail can re-register
    await admin.from('profiles').delete().eq('id', user.id);
    const { error: delErr } = await admin.auth.admin.deleteUser(user.id);
    if (delErr) return NextResponse.json({ error: delErr.message }, { status: 500 });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Delete failed' }, { status: 500 });
  }
}
