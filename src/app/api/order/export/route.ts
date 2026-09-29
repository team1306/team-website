import { createClient } from '../../../../../utils/supabase/server'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

interface ItemData {
    ItemName?: string
    ItemCost?: number
    ItemQuantity?: number
}

const HEADERS = [
    'Order ID',
    'Order Name',
    'Budget Category',
    'Status',
    'Items',
    'Vendor',
    'Total Cost',
]

const PAGE_SIZE = 1000

function escapeCell(value: unknown): string {
    let text = value === null || value === undefined ? '' : String(value)
    if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`
    if (/[",\n\r]/.test(text)) text = `"${text.replace(/"/g, '""')}"`
    return text
}

function formatItems(items: ItemData[] | null): string {
    return (items ?? [])
        .map((item) => {
            const name = item.ItemName ?? 'Unnamed'
            const qty = item.ItemQuantity ?? 1
            const cost =
                item.ItemCost !== undefined ? ` ($${Number(item.ItemCost).toFixed(2)} ea)` : ''
            return `${name} x${qty}${cost}`
        })
        .join('; ')
}

export async function GET() {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    const rows: any[] = []
    let from = 0

    while (true) {
        const { data, error } = await supabase
            .from('purchases')
            .select('purchaseID, requestName, catagory, status, items, vendor, cost')
            .order('purchaseID', { ascending: true })
            .range(from, from + PAGE_SIZE - 1)

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        rows.push(...(data ?? []))
        if (!data || data.length < PAGE_SIZE) break
        from += PAGE_SIZE
    }

    const lines = rows.map((row) =>
        [
            row.purchaseID,
            row.requestName,
            row.catagory,
            row.status,
            formatItems(row.items),
            row.vendor,
            Number(row.cost).toFixed(2),
        ]
            .map(escapeCell)
            .join(',')
    )

    const csv = '\uFEFF' + [HEADERS.map(escapeCell).join(','), ...lines].join('\r\n')
    const stamp = new Date().toISOString().slice(0, 10)

    return new NextResponse(csv, {
        status: 200,
        headers: {
            'Content-Type': 'text/csv; charset=utf-8',
            'Content-Disposition': `attachment; filename="purchases-${stamp}.csv"`,
            'Cache-Control': 'no-store',
        },
    })
}