import { NextRequest, NextResponse } from "next/server";
import { createClient } from '../../../../utils/supabase/server'
import { cookies } from 'next/headers'

export interface RequestInfo {
  id: string;
  status: string;
}

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    const body: RequestInfo = await request.json();
    const { id, status } = body;

    const { data, error } = await supabase
      .from('purchases')
      .update({ 
        status: status
      })
      .eq('purchaseID', id)
      .select();

    if (error) {
      console.error(error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data || data.length === 0) {
      return NextResponse.json({ error: 'No purchase found with that id' }, { status: 404 });
    }

    return NextResponse.json({ status: 200 });

  } catch (err) {
    console.error('Unhandled error in /api/setStatus:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    );
  }
}