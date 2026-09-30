import { NextResponse } from 'next/server'
import { createHash, timingSafeEqual } from 'crypto'
import { createClient } from '@supabase/supabase-js'
import { google, sheets_v4 } from 'googleapis'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const COLUMNS = [
    'purchaseID',
    'cost',
    'requestor',
    'catagory',
    'status',
    'items',
    'vendor',
    'reason',
    'requestName',
    'approvers',
    'expidited',
    'slack-thread-id',
    'vendorOrderNumber',
]

const PAGE_SIZE = 1000
const LATEST_TAB = 'Latest'
const TIME_ZONE = 'America/Chicago'

function sha256(value: string): Buffer {
    return createHash('sha256').update(value).digest()
}

function isAuthorized(request: Request): boolean {
    const secret = process.env.CRON_SECRET
    if (!secret || secret.length < 16) return false

    const header = request.headers.get('authorization') ?? ''
    const expected = `Bearer ${secret}`

    return timingSafeEqual(sha256(header), sha256(expected))
}

function toCell(value: unknown): string | number {
    if (value === null || value === undefined) return ''
    if (typeof value === 'number') return value
    if (typeof value === 'object') return JSON.stringify(value)
    return String(value)
}

function toRow(row: Record<string, unknown>): (string | number)[] {
    return COLUMNS.map((column) => {
        if (column === 'cost') {
            return row.cost === null || row.cost === undefined ? '' : Number(row.cost)
        }
        return toCell(row[column])
    })
}

async function fetchAllPurchases(): Promise<Record<string, unknown>[]> {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.SUPABASE_SECRET_KEY

    if (!url || !key) {
        throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY')
    }

    const supabase = createClient(url, key, {
        auth: { persistSession: false, autoRefreshToken: false },
    })

    const rows: Record<string, unknown>[] = []
    let from = 0

    while (true) {
        const { data, error } = await supabase
            .from('purchases')
            .select('*')
            .order('purchaseID', { ascending: true })
            .range(from, from + PAGE_SIZE - 1)

        if (error) throw new Error(`Supabase error: ${error.message}`)

        rows.push(...(data ?? []))
        if (!data || data.length < PAGE_SIZE) break
        from += PAGE_SIZE
    }

    return rows
}

async function ensureTab(
    sheets: sheets_v4.Sheets,
    spreadsheetId: string,
    title: string
): Promise<void> {
    const meta = await sheets.spreadsheets.get({
        spreadsheetId,
        fields: 'sheets.properties.title',
    })

    const exists = (meta.data.sheets ?? []).some(
        (sheet) => sheet.properties?.title === title
    )

    if (exists) return

    await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
            requests: [{ addSheet: { properties: { title } } }],
        },
    })
}

async function writeTab(
    sheets: sheets_v4.Sheets,
    spreadsheetId: string,
    title: string,
    values: (string | number)[][]
): Promise<void> {
    await ensureTab(sheets, spreadsheetId, title)

    await sheets.spreadsheets.values.clear({
        spreadsheetId,
        range: `'${title}'`,
    })

    await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `'${title}'!A1`,
        valueInputOption: 'RAW',
        requestBody: { values },
    })
}

export async function GET(request: Request) {
    if (!isAuthorized(request)) {
        return NextResponse.json(
            { error: 'Unauthorized' },
            { status: 401, headers: { 'Cache-Control': 'no-store' } }
        )
    }

    try {
        const rows = await fetchAllPurchases()
        const values: (string | number)[][] = [COLUMNS, ...rows.map(toRow)]

        const auth = new google.auth.JWT({
            email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
            key: process.env.GOOGLE_PRIVATE_KEY!.replace(/\\n/g, '\n'),
            scopes: ['https://www.googleapis.com/auth/spreadsheets'],
        })

        const sheets = google.sheets({ version: 'v4', auth })
        const spreadsheetId = process.env.GOOGLE_SHEET_ID!

        const stamp = new Date().toLocaleDateString('en-CA', { timeZone: TIME_ZONE })
        const snapshotTab = `Backup ${stamp}`

        await writeTab(sheets, spreadsheetId, LATEST_TAB, values)
        await writeTab(sheets, spreadsheetId, snapshotTab, values)

        return NextResponse.json(
            { ok: true, rows: rows.length, tabs: [LATEST_TAB, snapshotTab] },
            { headers: { 'Cache-Control': 'no-store' } }
        )
    } catch (err) {
        console.error('Purchases backup failed:', err)
        return NextResponse.json(
            { error: 'Backup failed' },
            { status: 500, headers: { 'Cache-Control': 'no-store' } }
        )
    }
}